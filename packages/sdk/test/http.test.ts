import { describe, expect, it } from 'vitest';

import { DougsApiError } from '../src/errors';
import { buildUrl, DEFAULT_RETRY_POLICY, HttpClient, type Authenticator } from '../src/http';
import { json, scriptedFetch, status } from './fake-fetch';

function client(fetch: ReturnType<typeof scriptedFetch>['fetch'], auth?: Authenticator) {
  const sleeps: number[] = [];
  const sleep = async (ms: number) => void sleeps.push(ms);
  const http = new HttpClient({ baseUrl: 'https://dougs.test', fetch, retry: DEFAULT_RETRY_POLICY, sleep, auth });
  return { http, sleeps };
}

describe('HttpClient retries', () => {
  it('retries an idempotent request on transient errors with a growing backoff', async () => {
    const api = scriptedFetch(status(503), status(502), json({ ok: true }));
    const { http, sleeps } = client(api.fetch);

    await expect(http.json('GET', '/x')).resolves.toEqual({ ok: true });
    expect(sleeps).toEqual([500, 1000]);
  });

  it('gives up after the retry budget and reports the last failure', async () => {
    const api = scriptedFetch(...Array.from({ length: 5 }, () => status(500)));
    const { http } = client(api.fetch);

    await expect(http.request('GET', '/x')).rejects.toMatchObject({ status: 500, method: 'GET', path: '/x' });
    expect(api.requests).toHaveLength(5);
  });

  it('never replays a POST after a 5xx, which could book the same operation twice', async () => {
    const api = scriptedFetch(status(502));
    const { http } = client(api.fetch);

    await expect(http.request('POST', '/operations', { json: {} })).rejects.toBeInstanceOf(DougsApiError);
    expect(api.requests).toHaveLength(1);
  });

  it('replays a POST rejected by rate limiting, honouring Retry-After', async () => {
    const api = scriptedFetch(status(429, { 'Retry-After': '3' }), json({ id: 1 }));
    const { http, sleeps } = client(api.fetch);

    await expect(http.json('POST', '/operations', { json: {} })).resolves.toEqual({ id: 1 });
    expect(sleeps).toEqual([3000]);
  });

  it('lets the caller declare a POST idempotent', async () => {
    const api = scriptedFetch(status(503), json({ id: 1 }));
    const { http } = client(api.fetch);

    await expect(http.json('POST', '/operations/1', { json: {}, idempotent: true })).resolves.toEqual({ id: 1 });
  });

  it('does not retry client errors', async () => {
    const api = scriptedFetch(status(400));
    const { http } = client(api.fetch);

    await expect(http.request('GET', '/x')).rejects.toMatchObject({ status: 400 });
    expect(api.requests).toHaveLength(1);
  });
});

describe('HttpClient authentication', () => {
  const renewingAuth = (renewed: boolean) => {
    let generation = 0;
    return {
      cookie: async () => `auth_session=token-${generation}`,
      renew: async () => (renewed ? ((generation += 1), true) : false),
    };
  };

  it('renews the session once on 401 and replays the request with the new cookie', async () => {
    const api = scriptedFetch(status(401), json({ ok: true }));
    const { http } = client(api.fetch, renewingAuth(true));

    await expect(http.json('GET', '/x')).resolves.toEqual({ ok: true });
    expect(api.requests.map((r) => r.headers.Cookie)).toEqual(['auth_session=token-0', 'auth_session=token-1']);
  });

  it('surfaces the 401 when the session cannot be renewed', async () => {
    const api = scriptedFetch(status(401));
    const { http } = client(api.fetch, renewingAuth(false));

    await expect(http.request('GET', '/x')).rejects.toMatchObject({ status: 401 });
  });

  it('sends no cookie on anonymous requests', async () => {
    const api = scriptedFetch(json({}));
    const { http } = client(api.fetch, renewingAuth(true));

    await http.request('POST', '/auth/api/login', { json: {}, anonymous: true });
    expect(api.requests[0]?.headers.Cookie).toBeUndefined();
  });
});

describe('buildUrl', () => {
  it('drops undefined query values and keeps the others as strings', () => {
    const url = buildUrl('https://dougs.test', '/ops', { limit: 500, validated: false, search: undefined });
    expect(url.toString()).toBe('https://dougs.test/ops?limit=500&validated=false');
  });
});
