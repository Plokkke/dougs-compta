import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { DougsClient } from '@plokkke/dougs-compta';

import { loadAuth, saveSession } from './credentials';
import { exportCompany } from './export';
import { downloadInvoices } from './files';
import { askVerificationCode } from './prompt';

const USAGE = `Usage: dougs export [--out <dir>] [--files]

Exports every operation, ledger breakdown, invoice and declaration of your Dougs company
to raw JSON (lossless) and CSV. --files also downloads the invoice documents.

Credentials: DOUGS_SESSION, or DOUGS_EMAIL + DOUGS_PASSWORD, or a .dougs.json file.
When Dougs emails a verification code, it is asked here; the session is then kept in .dougs-session.json.`;

async function main(argv: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: 'string', default: 'export' },
      files: { type: 'boolean', default: false },
      help: { type: 'boolean' },
    },
  });
  if (values.help || positionals[0] !== 'export') {
    console.log(USAGE);
    process.exitCode = values.help ? 0 : 1;
    return;
  }

  const outDir = resolve(values.out);
  const auth = loadAuth();
  const client = new DougsClient({ auth, onMfaChallenge: askVerificationCode });
  const { vendorInvoices, manifest } = await exportCompany(client, outDir, console.log);
  console.log(`Exported ${manifest.counts.operations} operations to ${outDir}`);
  if ('email' in auth) {
    saveSession(await client.sessionToken());
  }

  if (values.files) {
    const report = await downloadInvoices(client, vendorInvoices, join(outDir, 'files', 'vendor-invoices'));
    console.log(
      `Invoices: ${report.downloaded} downloaded, ${report.skipped} already present, ${report.failed.length} failed`,
    );
    report.failed.forEach((failure) => console.error(`  ${failure}`));
    process.exitCode = report.failed.length ? 2 : 0;
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
