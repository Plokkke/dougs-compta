import { describe, expect, it } from 'vitest';

import { DougsClient } from '../src/client';
import { DougsApiError, DougsAuthError, DougsSchemaError } from '../src/errors';
import { DEFAULT_RETRY_POLICY, HttpClient } from '../src/http';
import { json, noSleep, scriptedFetch, status, type Reply } from './fake-fetch';
import { operation, vendorInvoice } from './fixtures';

const loginReply = () => new Response('{}', { headers: [['Set-Cookie', 'auth_session=s; Max-Age=60']] });

function dougs(...replies: Reply[]) {
  const api = scriptedFetch(...replies);
  const client = new DougsClient({ auth: { email: 'a@b.c', password: 'p' }, fetch: api.fetch, sleep: noSleep });
  const sent = () => api.requests.map((r) => `${r.method} ${r.url.origin}${r.url.pathname}`);
  return { client, requests: api.requests, sent };
}

describe('request contract with app.dougs.fr', () => {
  it('logs in anonymously against the production host by default', async () => {
    const { client, requests, sent } = dougs(loginReply());

    await client.sessionToken();
    expect(sent()).toEqual(['POST https://app.dougs.fr/auth/api/login']);
    expect(requests[0]?.headers).toEqual({
      Accept: 'application/json',
      Origin: 'https://app.dougs.fr',
      'Content-Type': 'application/json',
    });
  });

  it('reads then posts back the same operation, retrying the full-state update on 5xx', async () => {
    const { client, sent } = dougs(loginReply(), json(operation(9)), status(503), json(operation(9)));

    await client.validateOperation(42, 9);
    expect(sent().slice(1)).toEqual([
      'GET https://app.dougs.fr/companies/42/operations/9',
      'POST https://app.dougs.fr/companies/42/operations/9',
      'POST https://app.dougs.fr/companies/42/operations/9',
    ]);
  });

  it('pages on the operations endpoint', async () => {
    const { client, sent } = dougs(loginReply(), json([]));

    await client.listOperations(42);
    expect(sent()[1]).toBe('GET https://app.dougs.fr/companies/42/operations');
  });

  it('uploads the file bytes as an attachment', async () => {
    const { client, requests, sent } = dougs(loginReply(), json(vendorInvoice));

    await client.uploadVendorInvoice(42, 'invoice.pdf', new Uint8Array([37, 80, 68, 70]));
    const form = requests[1]?.body as FormData;
    const file = form.get('file') as File;
    expect(sent()[1]).toBe('POST https://app.dougs.fr/companies/42/vendor-invoices');
    expect(requests[1]?.url.searchParams.get('type')).toBe('attachment');
    expect(requests[1]?.headers['Content-Type']).toBeUndefined();
    expect([file.name, file.type, [...new Uint8Array(await file.arrayBuffer())]]).toEqual([
      'invoice.pdf',
      'application/pdf',
      [37, 80, 68, 70],
    ]);
  });

  it('downloads files with a GET', async () => {
    const { client, sent } = dougs(loginReply(), new Response('x'));

    await client.downloadFile('/files/1/actions/download');
    expect(sent()[1]).toBe('GET https://app.dougs.fr/files/1/actions/download');
  });
});

describe('HttpClient requests', () => {
  const http = (...replies: Reply[]) => {
    const api = scriptedFetch(...replies);
    return {
      requests: api.requests,
      client: new HttpClient({
        baseUrl: 'https://x.test',
        fetch: api.fetch,
        retry: DEFAULT_RETRY_POLICY,
        sleep: noSleep,
      }),
    };
  };

  it('sends no body nor content type without a JSON payload', async () => {
    const { client, requests } = http(json({}));

    await client.request('GET', '/x');
    expect(requests[0]?.headers).toEqual({ Accept: 'application/json', Origin: 'https://x.test' });
    expect(requests[0]?.body).toBeUndefined();
  });

  it.each(['PUT', 'DELETE', 'HEAD'])('retries %s on 5xx', async (method) => {
    const { client, requests } = http(status(503), status(204));

    await client.request(method, '/x');
    expect(requests).toHaveLength(2);
  });

  it('returns undefined for an empty body', async () => {
    const { client } = http(status(204));

    await expect(client.json('DELETE', '/x')).resolves.toBeUndefined();
  });
});

describe('errors', () => {
  it('describes an HTTP failure with a bounded excerpt of the body', () => {
    const error = new DougsApiError('GET', '/x', 500, 'e'.repeat(300));
    expect(error.message).toBe(`GET /x -> HTTP 500: ${'e'.repeat(200)}`);
    expect(error.name).toBe('DougsApiError');
    expect(new DougsApiError('GET', '/x', 404, '').message).toBe('GET /x -> HTTP 404');
  });

  it('lists every schema issue with its path', () => {
    const issues = [
      { code: 'custom', path: [], message: 'bad root', input: 1 },
      { code: 'custom', path: [0, 'amount'], message: 'bad amount', input: 1 },
    ] as unknown as ConstructorParameters<typeof DougsSchemaError>[1];
    const error = new DougsSchemaError('/ops', issues);
    expect(error.message).toBe('Unexpected response shape from /ops: <root>: bad root; 0.amount: bad amount');
    expect(error.name).toBe('DougsSchemaError');
  });

  it('names authentication errors', () => {
    expect(new DougsAuthError('x').name).toBe('DougsAuthError');
  });
});
