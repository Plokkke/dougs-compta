import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { DougsClient, VendorInvoice } from '@plokkke/dougs-compta';

import { mapPool } from './pool';

const EXTENSION_BY_MIME: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

const slug = (text: string) => text.replace(/[^\w.@-]+/g, '_').slice(0, 60);

export function invoiceFileName(invoice: VendorInvoice): string {
  const extension = EXTENSION_BY_MIME[invoice.fileType] ?? invoice.fileName.split('.').pop() ?? 'bin';
  const label = [invoice.date, invoice.supplierName, invoice.id.slice(0, 8)].filter(Boolean).join('_');
  return `${slug(label)}.${extension}`;
}

export type DownloadReport = { downloaded: number; skipped: number; failed: string[] };

/** Idempotent: files already on disk are kept, so an interrupted run can simply be restarted. */
export async function downloadInvoices(
  client: Pick<DougsClient, 'downloadFile'>,
  invoices: readonly VendorInvoice[],
  dir: string,
  concurrency = 6,
): Promise<DownloadReport> {
  await mkdir(dir, { recursive: true });
  const targets = invoices
    .filter((invoice) => invoice.filePath)
    .map((invoice) => ({ invoice, path: join(dir, invoiceFileName(invoice)) }));
  const { ok, failed } = await mapPool(targets, concurrency, async ({ path, invoice }) => {
    if (existsSync(path)) {
      return 'skipped';
    }
    await writeFile(path, await client.downloadFile(invoice.filePath));
    return 'downloaded';
  });
  return {
    downloaded: ok.filter((status) => status === 'downloaded').length,
    skipped: ok.filter((status) => status === 'skipped').length,
    failed: failed.map(({ index, error }) => `${targets[index]?.invoice.id}: ${String(error)}`),
  };
}
