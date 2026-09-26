import { describe, expect, it } from 'vitest';

import { DougsAuthError } from '../src/errors';
import { parseSetCookie, SessionAuthenticator, sessionFromSetCookie } from '../src/session';

const NOW = Date.parse('2026-01-01T00:00:00Z');

describe('sessionFromSetCookie', () => {
  it('reads the auth_session cookie and its Max-Age', () => {
    const session = sessionFromSetCookie(['other=1', 'auth_session=abc=; Path=/; Max-Age=3600; HttpOnly'], NOW);
    expect(session).toEqual({ token: 'abc=', expiresAt: NOW + 3_600_000 });
  });

  it('falls back to Expires', () => {
    const session = sessionFromSetCookie(['auth_session=abc; Expires=Thu, 01 Jan 2026 01:00:00 GMT'], NOW);
    expect(session.expiresAt).toBe(NOW + 3_600_000);
  });

  it('fails when the login did not set a session', () => {
    expect(() => sessionFromSetCookie(['auth_session=; Path=/'], NOW)).toThrow(DougsAuthError);
  });

  it('parses attribute names case-insensitively', () => {
    expect(parseSetCookie('a=b; SameSite=Lax; secure').attributes).toEqual(
      new Map([
        ['samesite', 'Lax'],
        ['secure', ''],
      ]),
    );
  });
});

describe('SessionAuthenticator', () => {
  const credentials = { email: 'jane@example.com', password: 'secret' };

  it('logs in lazily and reuses the session while it is valid', async () => {
    let logins = 0;
    const auth = new SessionAuthenticator(
      credentials,
      async () => ({ token: `t${++logins}`, expiresAt: NOW + 60_000 }),
      () => NOW,
    );

    expect(await auth.cookie()).toBe('auth_session=t1');
    expect(await auth.cookie()).toBe('auth_session=t1');
    expect(logins).toBe(1);
  });

  it('logs in again shortly before the session expires', async () => {
    let now = NOW;
    let logins = 0;
    const auth = new SessionAuthenticator(
      credentials,
      async () => ({ token: `t${++logins}`, expiresAt: NOW + 60_000 }),
      () => now,
    );

    await auth.token();
    now = NOW + 45_000;
    expect(await auth.token()).toBe('t2');
  });

  it('uses a provided session token and cannot renew it', async () => {
    const auth = new SessionAuthenticator({ sessionToken: 'given' }, async () => {
      throw new Error('must not log in');
    });

    expect(await auth.token()).toBe('given');
    expect(await auth.renew()).toBe(false);
  });
});
