import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  COMPANY_COLLECTIONS,
  type ApiRecord,
  type DougsClient,
  type Operation,
  type VendorInvoice,
} from '@plokkke/dougs-compta';

import * as columns from './columns';
import { toCsv } from './csv';

export type ExportSource = Pick<
  DougsClient,
  'getMe' | 'getCompany' | 'listCollection' | 'listCategories' | 'listOperations' | 'listVendorInvoices'
>;

export type Log = (message: string) => void;

type Dataset = ApiRecord[];

export async function exportCompany(client: ExportSource, outDir: string, log: Log) {
  const me = await client.getMe();
  const companyId = me.company.id;
  log(`Exporting ${me.company.brandName} (company ${companyId})`);

  const raw = new RawWriter(join(outDir, 'raw'));
  await raw.write('company', await client.getCompany(companyId));
  const collections = await fetchCollections(client, companyId, raw, log);
  const categories = await fetchCategories(client, companyId, raw);
  const operations = await raw.write('operations', await client.listOperations(companyId));
  const vendorInvoices = await raw.write('vendor-invoices', await client.listVendorInvoices(companyId));
  log(`  operations: ${operations.length}`);

  const lookups = buildLookups(collections, categories);
  await writeCsvFiles(outDir, { operations, vendorInvoices, collections, lookups });
  const manifest = buildManifest(me.company, operations, { ...countOf(collections), operations: operations.length });
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { companyId, vendorInvoices, manifest };
}

class RawWriter {
  constructor(private readonly dir: string) {}

  async write<T>(name: string, data: T): Promise<T> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, `${name}.json`), JSON.stringify(data, null, 2));
    return data;
  }
}

async function fetchCollections(client: ExportSource, companyId: number, raw: RawWriter, log: Log) {
  const entries: [string, Dataset][] = [];
  for (const collection of COMPANY_COLLECTIONS.filter((name) => name !== 'vendor-invoices')) {
    const rows = await raw.write(collection, await client.listCollection(companyId, collection));
    log(`  ${collection}: ${rows.length}`);
    entries.push([collection, rows]);
  }
  return Object.fromEntries(entries);
}

async function fetchCategories(client: ExportSource, companyId: number, raw: RawWriter): Promise<Dataset> {
  const expense = await raw.write('categories-expense', await client.listCategories(companyId, 'expense'));
  const revenue = await raw.write('categories-revenue', await client.listCategories(companyId, 'revenue'));
  return [...expense, ...revenue];
}

function lookup(rows: Dataset | undefined, label: (row: ApiRecord) => unknown) {
  const byId = new Map((rows ?? []).map((row) => [row.id, label(row)]));
  return (id: unknown) => String(byId.get(id) ?? '');
}

function buildLookups(collections: Record<string, Dataset>, categories: Dataset): columns.Lookups {
  return {
    accountName: lookup(collections.accounts, (a) => a.name ?? a.bankName ?? a.id),
    accountingNumber: lookup(categories, (c) => c.accountingNumber),
    partnerName: lookup(
      collections.partners,
      (p) => columns.pick(p, 'naturalPerson', 'fullName') ?? columns.pick(p, 'legalPerson', 'name'),
    ),
  };
}

type CsvInput = {
  operations: Operation[];
  vendorInvoices: VendorInvoice[];
  collections: Record<string, Dataset>;
  lookups: columns.Lookups;
};

async function writeCsvFiles(outDir: string, { operations, vendorInvoices, collections, lookups }: CsvInput) {
  const breakdowns = operations.flatMap((operation) =>
    operation.breakdowns.map((breakdown) => ({ operation, breakdown })),
  );
  const files: [string, string][] = [
    ['operations.csv', toCsv(operations, columns.operationColumns(lookups))],
    ['operations-breakdowns.csv', toCsv(breakdowns, columns.breakdownColumns(lookups))],
    ['vendor-invoices.csv', toCsv(vendorInvoices, columns.vendorInvoiceColumns)],
    ['accounts.csv', toCsv(collections.accounts ?? [], columns.accountColumns)],
    ['declarations.csv', toCsv(collections.declarations ?? [], columns.declarationColumns)],
  ];
  await Promise.all(files.map(([name, content]) => writeFile(join(outDir, name), content)));
}

const countOf = (collections: Record<string, Dataset>) =>
  Object.fromEntries(Object.entries(collections).map(([name, rows]) => [name, rows.length]));

function buildManifest(company: ApiRecord, operations: Operation[], counts: Record<string, number>) {
  const dates = operations.map((operation) => operation.date).sort();
  return {
    exportedAt: new Date().toISOString(),
    company: { id: company.id, brandName: company.brandName },
    counts,
    operationsDateRange: { from: dates[0] ?? null, to: dates.at(-1) ?? null },
  };
}
