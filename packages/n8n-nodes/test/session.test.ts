import { DougsApiError, DougsMfaRequiredError } from '@plokkke/dougs-compta';
import { NodeApiError, NodeOperationError, type IExecuteFunctions, type INode } from 'n8n-workflow';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toNodeError } from '../nodes/Dougs/errors';
import { findOperation } from '../nodes/Dougs/operations';
import type { DougsClient } from '@plokkke/dougs-compta';

const node = { name: 'Dougs', type: 'dougs', typeVersion: 1, position: [0, 0], parameters: {} } as unknown as INode;

const cookie = (token: string) =>
  new Response('{}', {
    headers: [['Set-Cookie', `auth_session=${token}; Path=/; Expires=Tue, 27 Oct 2026 05:04:01 GMT`]],
  });

function context(parameters: Record<string, unknown> = {}) {
  return {
    getNodeParameter: (name: string) => parameters[name],
    getCredentials: async () => ({ username: 'jane@example.com', password: 'secret' }),
  } as unknown as IExecuteFunctions;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session operations', () => {
  it('requests the code and hands the pending session to the next node', async () => {
    const replies = [cookie('pending'), new Response('', { status: 401 }), new Response('', { status: 201 })];
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: URL) => (calls.push(url.pathname), replies.shift()));

    const result = await findOperation('session', 'requestCode')?.run({} as DougsClient, context(), 0);

    expect(result).toMatchObject({
      sessionToken: 'pending',
      codeRequired: true,
      expiresAt: '2026-10-27T05:04:01.000Z',
    });
    expect(calls).toEqual(['/auth/api/login', '/users/me', '/auth/api/mfa/send-email']);
  });

  it('verifies the code and returns the session to store in the credentials', async () => {
    vi.stubGlobal('fetch', async () => cookie('verified'));

    const result = await findOperation('session', 'verifyCode')?.run(
      {} as DougsClient,
      context({ pendingSessionToken: 'pending', code: '517261' }),
      0,
    );

    expect(result).toEqual({ sessionToken: 'verified', expiresAt: '2026-10-27T05:04:01.000Z' });
  });
});

describe('toNodeError', () => {
  it('reports API failures with their HTTP status', () => {
    const error = toNodeError(node, new DougsApiError('GET', '/users/me', 503, 'down'), 2);

    expect(error).toBeInstanceOf(NodeApiError);
    expect(error).toMatchObject({ httpCode: '503' });
  });

  it('tells how to renew an expired session', () => {
    const error = toNodeError(node, new DougsMfaRequiredError('code required'), 0);

    expect(error).toBeInstanceOf(NodeOperationError);
    expect(error.description).toMatch(/Request Code, then Verify Code/);
  });

  it('keeps other errors as operation errors', () => {
    expect(toNodeError(node, new RangeError('bad date'), 0).message).toBe('bad date');
  });
});
