import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DougsAuth } from '@plokkke/dougs-compta';

export const CREDENTIALS_FILE = '.dougs.json';

type Env = Record<string, string | undefined>;

export function loadAuth(env: Env = process.env, cwd = process.cwd()): DougsAuth {
  const auth =
    fromSource(env.DOUGS_SESSION, env.DOUGS_EMAIL, env.DOUGS_PASSWORD) ?? fromFile(join(cwd, CREDENTIALS_FILE));
  if (!auth) {
    throw new Error(
      `No Dougs credentials found. Set DOUGS_SESSION, or DOUGS_EMAIL and DOUGS_PASSWORD, ` +
        `or create ${CREDENTIALS_FILE} with {"email","password"} or {"sessionToken"}.`,
    );
  }
  return auth;
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

function fromFile(path: string): DougsAuth | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  const content: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const file = typeof content === 'object' && content !== null ? (content as Record<string, unknown>) : {};
  return fromSource(file.sessionToken, file.email, file.password);
}
