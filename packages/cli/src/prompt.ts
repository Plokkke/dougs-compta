import { stdin, stderr } from 'node:process';
import { createInterface } from 'node:readline/promises';

import type { MfaHandler } from '@plokkke/dougs-compta';

export const askVerificationCode: MfaHandler = async () => {
  const terminal = createInterface({ input: stdin, output: stderr });
  try {
    return await terminal.question('Dougs sent a verification code by email. Code: ');
  } finally {
    terminal.close();
  }
};
