import { DougsApiError, DougsAuthError, DougsMfaRequiredError } from './errors';
import { connection, HttpClient, type ConnectionOptions } from './http';
import { sessionFromSetCookie, type Session } from './session';

export type MfaChallenge = { type: 'email' };

export type MfaHandler = (challenge: MfaChallenge) => Promise<string>;

export type LoginContext = { http: HttpClient; now: () => number; onMfaChallenge?: MfaHandler };

export type LoginCodeRequest = {
  /** Session opened by the login: usable as is when no code is required, pending otherwise. */
  sessionToken: string;
  codeRequired: boolean;
  expiresAt?: number;
};

const MFA_REQUIRED =
  'Dougs requires the verification code sent by email: provide onMfaChallenge, or a session token obtained with it';

/**
 * Logging in sets `auth_session` right away, but the session stays unauthenticated until a code, whose email must be
 * requested explicitly, is verified. The login response does not say so, hence the probe on `/users/me`.
 */
export async function login(context: LoginContext, email: string, password: string): Promise<Session> {
  const { session, codeRequired } = await openSession(context, email, password);
  if (!codeRequired) {
    return session;
  }
  if (!context.onMfaChallenge) {
    throw new DougsMfaRequiredError(MFA_REQUIRED);
  }
  await sendCode(context.http, session);
  const code = await context.onMfaChallenge({ type: 'email' });
  return verify(context, session, code);
}

/** First half of a login driven by someone else (e.g. an n8n workflow): logs in and has the code emailed. */
export async function requestLoginCode(
  credentials: { email: string; password: string },
  options?: ConnectionOptions & { now?: () => number },
): Promise<LoginCodeRequest> {
  const context = standalone(options);
  const { session, codeRequired } = await openSession(context, credentials.email, credentials.password);
  if (codeRequired) {
    await sendCode(context.http, session);
  }
  return { sessionToken: session.token, codeRequired, expiresAt: session.expiresAt };
}

/** Second half: turns the pending session into an authenticated one. */
export async function verifyLoginCode(
  pendingSessionToken: string,
  code: string,
  options?: ConnectionOptions & { now?: () => number },
): Promise<Session> {
  return verify(standalone(options), { token: pendingSessionToken }, code);
}

function standalone(options: ConnectionOptions & { now?: () => number } = {}): LoginContext {
  return { http: new HttpClient(connection(options)), now: options.now ?? Date.now };
}

async function openSession({ http, now }: LoginContext, email: string, password: string) {
  const response = await http.request('POST', '/auth/api/login', { json: { email, password }, anonymous: true });
  const session = sessionFromSetCookie(response.headers.getSetCookie(), now());
  return { session, codeRequired: !(await isAuthenticated(http, session)) };
}

async function sendCode(http: HttpClient, session: Session): Promise<void> {
  await http.request('POST', '/auth/api/mfa/send-email', { anonymous: true, headers: cookieOf(session) });
}

async function verify({ http, now }: LoginContext, session: Session, code: string): Promise<Session> {
  const response = await rejectedAsAuthError(
    http.request('POST', '/auth/api/mfa/verify', {
      json: { token: code.trim(), type: 'email' },
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
