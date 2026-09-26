import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DougsAuth } from '@plokkke/dougs-compta';

export const CREDENTIALS_FILE = '.dougs.json';

/** Written by the CLI after a login, so the emailed verification code is only needed when the session expires. */
export const SESSION_FILE = '.dougs-session.json';

type Env = Record<string, string | undefined>;

type Json = Record<string, unknown>;

export function loadAuth(env: Env = process.env, cwd = process.cwd()): DougsAuth {
  const file = readJson(join(cwd, CREDENTIALS_FILE));
  const auth =
    fromSource(env.DOUGS_SESSION, env.DOUGS_EMAIL, env.DOUGS_PASSWORD) ??
    fromSource(file.sessionToken, file.email, file.password);
  if (!auth) {
    throw new Error(
      `No Dougs credentials found. Set DOUGS_SESSION, or DOUGS_EMAIL and DOUGS_PASSWORD, ` +
        `or create ${CREDENTIALS_FILE} with {"email","password"} or {"sessionToken"}.`,
    );
  }
  const saved = readJson(join(cwd, SESSION_FILE)).sessionToken;
  return 'email' in auth && typeof saved === 'string' && saved ? { ...auth, sessionToken: saved } : auth;
}

export function saveSession(token: string, cwd = process.cwd()): void {
  writeFileSync(join(cwd, SESSION_FILE), JSON.stringify({ sessionToken: token }), { mode: 0o600 });
}

function fromSource(sessionToken?: unknown, email?: unknown, password?: unknown): DougsAuth | undefined {
  if (typeof sessionToken === 'string' && sessionToken) {
    return { sessionToken };
  }
  if (typeof email === 'string' && email && typeof password === 'string' && password) {
    return { email, password };
  }
  return undefined;
}

function readJson(path: string): Json {
  if (!existsSync(path)) {
    return {};
  }
  const content: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return typeof content === 'object' && content !== null ? (content as Json) : {};
}
