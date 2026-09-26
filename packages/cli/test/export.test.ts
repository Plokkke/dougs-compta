import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ApiRecord, CompanyCollection, VendorInvoice } from '@plokkke/dougs-compta';
import { describe, expect, it } from 'vitest';

import { exportCompany, type ExportSource } from '../src/export';
import { downloadInvoices, invoiceFileName } from '../src/files';

const invoice: VendorInvoice = {
  id: '3f0b3e1c-6a3d-4c52-9a55-2d1f7b1e2a10',
  fileName: 'scan.pdf',
  fileType: 'application/pdf',
  filePath: '/files/3f0b3e1c/actions/download',
  date: '2026-03-01',
  supplierName: 'Rail Co',
  amount: 12.5,
  amountTva: 1.14,
  currency: 'EUR',
  paymentStatus: 'paid',
  companyId: 42,
};

const operation = {
  id: 9,
  companyId: 42,
  type: 'expense',
  amount: 12.5,
  date: '2026-03-31',
  wording: 'Train',
  hasVat: true,
  vatRate: 0.1,
  vatAmount: 1.14,
  totalAmount: 12.5,
  memo: null,
  validated: true,
  transaction: { accountId: 3 },
  breakdowns: [
    { id: 1, amount: 11.36, categoryId: 77 },
    { id: 2, amount: 12.5, isCounterpart: true, associationData: { partnerId: 5 } },
  ],
};

const collections: Partial<Record<CompanyCollection, ApiRecord[]>> = {
  accounts: [{ id: 3, name: 'Main account' }],
  partners: [{ id: 5, naturalPerson: { fullName: 'Jane Doe' } }],
  declarations: [{ id: 1, type: 'vat', label: 'TVA mars' }],
};

const source: ExportSource = {
  getMe: async () => ({ id: 1, email: 'jane@example.com', company: { id: 42, brandName: 'Acme' }, companies: [] }),
  getCompany: async () => ({ id: 42 }),
  listCollection: async (_, name) => collections[name] ?? [],
  listCategories: async (_, type) =>
    type === 'expense' ? [{ id: 77, wording: 'Train', keywords: [], description: '', accountingNumber: '625100' }] : [],
  listOperations: async () => [operation],
  listVendorInvoices: async () => [invoice],
};

describe('exportCompany', () => {
  it('writes lossless raw JSON, enriched CSV and a manifest', async () => {
    const out = mkdtempSync(join(tmpdir(), 'dougs-export-'));

    const { manifest } = await exportCompany(source, out, () => undefined);

    expect(JSON.parse(readFileSync(join(out, 'raw', 'operations.json'), 'utf8'))).toEqual([operation]);
    const breakdowns = readFileSync(join(out, 'operations-breakdowns.csv'), 'utf8').split('\n');
    expect(breakdowns[1]).toContain('625100');
    expect(breakdowns[2]).toContain('Jane Doe');
    expect(readFileSync(join(out, 'operations.csv'), 'utf8')).toContain('Main account');
    expect(manifest).toMatchObject({
      company: { id: 42, brandName: 'Acme' },
      counts: { operations: 1, accounts: 1, declarations: 1 },
      operationsDateRange: { from: '2026-03-31', to: '2026-03-31' },
    });
  });
});

describe('downloadInvoices', () => {
  it('names files after date, supplier and id, and skips the ones already downloaded', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dougs-files-'));
    const other = { ...invoice, id: 'aaaaaaaa-6a3d-4c52-9a55-2d1f7b1e2a10', supplierName: 'Café / Bar' };
    writeFileSync(join(dir, invoiceFileName(invoice)), 'already there');

    const report = await downloadInvoices({ downloadFile: async () => new Uint8Array([1]) }, [invoice, other], dir);

    expect(report).toEqual({ downloaded: 1, skipped: 1, failed: [] });
    expect(invoiceFileName(other)).toBe('2026-03-01_Caf_Bar_aaaaaaaa.pdf');
    expect(existsSync(join(dir, invoiceFileName(other)))).toBe(true);
  });

  it('reports failed downloads without stopping the others', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dougs-files-'));
    const client = {
      downloadFile: async () => {
        throw new Error('HTTP 404');
      },
    };

    const report = await downloadInvoices(client, [invoice], dir);

    expect(report.failed).toEqual([`${invoice.id}: Error: HTTP 404`]);
  });
});
