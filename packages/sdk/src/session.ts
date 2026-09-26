import { DougsAuthError } from './errors';
import type { Authenticator } from './http';

/** Credentials let the client log in again on its own; a session token alone lives until it expires. */
export type DougsAuth = { email: string; password: string; sessionToken?: string } | { sessionToken: string };

export type Session = { token: string; expiresAt?: number };

export type LoginFn = (email: string, password: string) => Promise<Session>;

/** Renew this long before the cookie expiry, so a request never leaves with a dying session. */
const EXPIRY_MARGIN_MS = 30_000;

export class SessionAuthenticator implements Authenticator {
  private session?: Session;

  constructor(
    private readonly auth: DougsAuth,
    private readonly login: LoginFn,
    private readonly now: () => number = Date.now,
  ) {
    if (auth.sessionToken) {
      this.session = { token: auth.sessionToken };
    }
  }

  async cookie(): Promise<string> {
    return `auth_session=${await this.token()}`;
  }

  async token(): Promise<string> {
    if (!this.session || this.isExpiring(this.session)) {
      this.session = await this.openSession();
    }
    return this.session.token;
  }

  async renew(): Promise<boolean> {
    if (!('email' in this.auth)) {
      return false;
    }
    this.session = await this.openSession();
    return true;
  }

  private isExpiring({ expiresAt }: Session): boolean {
    return expiresAt !== undefined && expiresAt - this.now() < EXPIRY_MARGIN_MS;
  }

  private openSession(): Promise<Session> {
    if (!('email' in this.auth)) {
      throw new DougsAuthError('Session token expired and no email/password available to log in again');
    }
    return this.login(this.auth.email, this.auth.password);
  }
}

export function sessionFromSetCookie(setCookies: string[], now: number): Session {
  const cookie = setCookies.map(parseSetCookie).find(({ name }) => name === 'auth_session');
  if (!cookie?.value) {
    throw new DougsAuthError('Login response did not set an auth_session cookie');
  }
  return { token: cookie.value, expiresAt: expiryOf(cookie.attributes, now) };
}

type SetCookie = { name: string; value: string; attributes: Map<string, string> };

export function parseSetCookie(header: string): SetCookie {
  const [pair = '', ...rest] = header.split(';').map((part) => part.trim());
  const [name = '', value = ''] = splitOnce(pair);
  const attributes = new Map(rest.map((attribute) => splitOnce(attribute)).map(([k, v]) => [k.toLowerCase(), v]));
  return { name, value, attributes };
}

function expiryOf(attributes: Map<string, string>, now: number): number | undefined {
  const maxAge = attributes.get('max-age');
  if (maxAge !== undefined && Number.isFinite(Number(maxAge))) {
    return now + Number(maxAge) * 1000;
  }
  const expires = Date.parse(attributes.get('expires') ?? '');
  return Number.isNaN(expires) ? undefined : expires;
}

function splitOnce(text: string): [string, string] {
  const index = text.indexOf('=');
  return index === -1 ? [text, ''] : [text.slice(0, index), text.slice(index + 1)];
}
