import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CREDENTIALS_FILE, loadAuth, saveSession, SESSION_FILE } from '../src/credentials';

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

  it('resumes the session saved by a previous run, keeping credentials to log in again', () => {
    const dir = dirWith({ email: 'a@b.c', password: 'p' });
    saveSession('saved', dir);

    expect(loadAuth({}, dir)).toEqual({ email: 'a@b.c', password: 'p', sessionToken: 'saved' });
  });

  it('keeps the saved session file private to its owner', () => {
    const dir = dirWith();
    saveSession('saved', dir);

    expect(statSync(join(dir, SESSION_FILE)).mode & 0o077).toBe(0);
  });

  it('prefers an explicit session token over a saved one', () => {
    const dir = dirWith();
    saveSession('saved', dir);

    expect(loadAuth({ DOUGS_SESSION: 'explicit' }, dir)).toEqual({ sessionToken: 'explicit' });
  });
});
