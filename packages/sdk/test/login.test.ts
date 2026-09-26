import { describe, expect, it } from 'vitest';

import { DougsClient } from '../src/client';
import { DougsAuthError } from '../src/errors';
import { json, noSleep, scriptedFetch, status, type Reply } from './fake-fetch';
import { user } from './fixtures';

const sessionCookie = (token: string) =>
  new Response('{}', { headers: [['Set-Cookie', `auth_session=${token}; Domain=dougs.fr; Path=/; Max-Age=2592000`]] });

function dougs(onMfaChallenge: (() => Promise<string>) | undefined, ...replies: Reply[]) {
  const api = scriptedFetch(...replies);
  const client = new DougsClient({
    auth: { email: 'jane@example.com', password: 'secret' },
    baseUrl: 'https://dougs.test',
    fetch: api.fetch,
    sleep: noSleep,
    onMfaChallenge,
  });
  const sent = () => api.requests.map((r) => `${r.method} ${r.url.pathname}`);
  return { client, requests: api.requests, sent };
}

describe('login with a second factor', () => {
  it('uses the session straight away when Dougs does not ask for a code', async () => {
    const { client, sent } = dougs(undefined, sessionCookie('abc'), json(user));

    await expect(client.sessionToken()).resolves.toBe('abc');
    expect(sent()).toEqual(['POST /auth/api/login', 'GET /users/me']);
  });

  it('verifies the emailed code with the pending session, then uses the verified session', async () => {
    const challenges: unknown[] = [];
    const onMfa = async () => (challenges.push('email'), ' 517261 ');
    const { client, requests, sent } = dougs(
      onMfa,
      sessionCookie('pending'),
      status(401),
      sessionCookie('verified'),
      json(user),
    );

    await expect(client.getMe()).resolves.toMatchObject({ id: 1 });
    expect(sent()).toEqual(['POST /auth/api/login', 'GET /users/me', 'POST /auth/api/mfa/verify', 'GET /users/me']);
    expect(requests[2]).toMatchObject({
      body: { token: '517261', type: 'email' },
      headers: { Cookie: 'auth_session=pending' },
    });
    expect(requests[3]?.headers.Cookie).toBe('auth_session=verified');
    expect(challenges).toHaveLength(1);
  });

  it('keeps the pending token when verification does not set a new cookie', async () => {
    const { client } = dougs(async () => '1', sessionCookie('same'), status(401), json({}));

    await expect(client.sessionToken()).resolves.toBe('same');
  });

  it('explains how to proceed when a code is required but cannot be asked', async () => {
    const { client } = dougs(undefined, sessionCookie('pending'), status(401));

    await expect(client.sessionToken()).rejects.toThrow(/verification code sent by email/);
  });

  it('reports a rejected code as an authentication error', async () => {
    const { client } = dougs(async () => '000000', sessionCookie('pending'), status(401), status(400));

    await expect(client.sessionToken()).rejects.toBeInstanceOf(DougsAuthError);
  });

  it('does not mistake an outage for a missing second factor', async () => {
    const { client } = dougs(undefined, sessionCookie('abc'), ...Array.from({ length: 5 }, () => status(503)));

    await expect(client.sessionToken()).rejects.toMatchObject({ status: 503 });
  });

  it('starts from a saved session and falls back to credentials when it has expired', async () => {
    const api = scriptedFetch(status(401), sessionCookie('fresh'), json(user), json(user));
    const client = new DougsClient({
      auth: { email: 'jane@example.com', password: 'secret', sessionToken: 'saved' },
      baseUrl: 'https://dougs.test',
      fetch: api.fetch,
      sleep: noSleep,
    });

    await client.getMe();
    expect(api.requests.map((r) => r.headers.Cookie)).toEqual([
      'auth_session=saved',
      undefined,
      'auth_session=fresh',
      'auth_session=fresh',
    ]);
  });
});
