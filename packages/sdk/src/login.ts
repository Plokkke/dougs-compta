import { DougsApiError, DougsAuthError } from './errors';
import type { HttpClient } from './http';
import { sessionFromSetCookie, type Session } from './session';

export type MfaChallenge = { type: 'email' };

export type MfaHandler = (challenge: MfaChallenge) => Promise<string>;

export type LoginContext = { http: HttpClient; now: () => number; onMfaChallenge?: MfaHandler };

const MFA_REQUIRED =
  'Dougs requires the verification code sent by email: provide onMfaChallenge, or reuse a browser session token';

/**
 * Logging in sets `auth_session` right away, but the session stays unauthenticated until the emailed code is
 * verified. The login response does not say so, hence the probe on `/users/me`.
 */
export async function login(context: LoginContext, email: string, password: string): Promise<Session> {
  const { http, now, onMfaChallenge } = context;
  const response = await http.request('POST', '/auth/api/login', { json: { email, password }, anonymous: true });
  const session = sessionFromSetCookie(response.headers.getSetCookie(), now());
  if (await isAuthenticated(http, session)) {
    return session;
  }
  if (!onMfaChallenge) {
    throw new DougsAuthError(MFA_REQUIRED);
  }
  const code = (await onMfaChallenge({ type: 'email' })).trim();
  return verify(context, session, code);
}

async function verify({ http, now }: LoginContext, session: Session, code: string): Promise<Session> {
  const response = await rejectedAsAuthError(
    http.request('POST', '/auth/api/mfa/verify', {
      json: { token: code, type: 'email' },
      anonymous: true,
      headers: cookieOf(session),
    }),
  );
  const cookies = response.headers.getSetCookie();
  return cookies.some((cookie) => cookie.startsWith('auth_session=')) ? sessionFromSetCookie(cookies, now()) : session;
}

async function isAuthenticated(http: HttpClient, session: Session): Promise<boolean> {
  try {
    await http.request('GET', '/users/me', { anonymous: true, headers: cookieOf(session) });
    return true;
  } catch (error) {
    if (error instanceof DougsApiError && error.status === 401) {
      return false;
    }
    throw error;
  }
}

async function rejectedAsAuthError(request: Promise<Response>): Promise<Response> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof DougsApiError && error.status >= 400 && error.status < 500) {
      throw new DougsAuthError(`Dougs rejected the verification code (HTTP ${error.status})`);
    }
    throw error;
  }
}

const cookieOf = ({ token }: Session) => ({ Cookie: `auth_session=${token}` });
