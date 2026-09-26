import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CREDENTIALS_FILE, loadAuth } from '../src/credentials';

const dirWith = (content?: unknown) => {
  const dir = mkdtempSync(join(tmpdir(), 'dougs-'));
  if (content !== undefined) {
    writeFileSync(join(dir, CREDENTIALS_FILE), JSON.stringify(content));
  }
  return dir;
};

describe('loadAuth', () => {
  it('prefers a session token from the environment', () => {
    const env = { DOUGS_SESSION: 'tok', DOUGS_EMAIL: 'a@b.c', DOUGS_PASSWORD: 'p' };
    expect(loadAuth(env, dirWith({ sessionToken: 'file' }))).toEqual({ sessionToken: 'tok' });
  });

  it('uses email and password from the environment', () => {
    expect(loadAuth({ DOUGS_EMAIL: 'a@b.c', DOUGS_PASSWORD: 'p' }, dirWith())).toEqual({
      email: 'a@b.c',
      password: 'p',
    });
  });

  it('falls back to the credentials file', () => {
    expect(loadAuth({}, dirWith({ email: 'a@b.c', password: 'p' }))).toEqual({ email: 'a@b.c', password: 'p' });
  });

  it('ignores an incomplete configuration and explains what is expected', () => {
    expect(() => loadAuth({ DOUGS_EMAIL: 'a@b.c' }, dirWith({ email: 'a@b.c' }))).toThrow(/No Dougs credentials/);
  });
});
