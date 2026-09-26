import type { ApiRecord, Operation, VendorInvoice } from '@plokkke/dougs-compta';

import { formatEuros } from './amounts';
import type { Column } from './csv';

/** Safe path lookup into loosely typed API records. */
export function pick(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>(
    (current, key) => (typeof current === 'object' && current !== null ? (current as ApiRecord)[key] : undefined),
    value,
  );
}

export type Lookups = {
  accountName: (id: unknown) => string;
  accountingNumber: (categoryId: unknown) => string;
  partnerName: (id: unknown) => string;
};

export type BreakdownRow = { operation: Operation; breakdown: ApiRecord };

const direction = (row: unknown) => (pick(row, 'isInbound') ? 'credit' : 'debit');

export const operationColumns = (lookups: Lookups): Column<Operation>[] => [
  ['id', (o) => o.id],
  ['date', (o) => o.date],
  ['type', (o) => o.type],
  ['direction', direction],
  ['amount', (o) => formatEuros(o.amount)],
  ['totalAmount', (o) => formatEuros(o.totalAmount)],
  ['hasVat', (o) => o.hasVat],
  ['vatRate', (o) => o.vatRate],
  ['vatAmount', (o) => formatEuros(o.vatAmount)],
  ['validated', (o) => o.validated],
  ['validatedAt', (o) => pick(o, 'validatedAt')],
  ['account', (o) => lookups.accountName(pick(o, 'transaction', 'accountId'))],
  ['wording', (o) => o.wording],
  ['memo', (o) => o.memo],
  ['breakdowns', (o) => o.breakdowns.length],
  ['transactionId', (o) => pick(o, 'transactionId')],
];

const categoryOf = (b: ApiRecord) => pick(b, 'resolvedCategoryId') ?? pick(b, 'categoryId');

export const breakdownColumns = (lookups: Lookups): Column<BreakdownRow>[] => [
  ['operationId', ({ operation }) => operation.id],
  ['operationDate', ({ operation }) => operation.date],
  ['operationType', ({ operation }) => operation.type],
  ['breakdownId', ({ breakdown }) => pick(breakdown, 'id')],
  ['amount', ({ breakdown }) => formatEuros(pick(breakdown, 'amount'))],
  ['direction', ({ breakdown }) => direction(breakdown)],
  ['isCounterpart', ({ breakdown }) => pick(breakdown, 'isCounterpart')],
  ['categoryId', ({ breakdown }) => categoryOf(breakdown)],
  ['accountingNumber', ({ breakdown }) => lookups.accountingNumber(categoryOf(breakdown))],
  ['categoryWording', ({ breakdown }) => pick(breakdown, 'categoryWording')],
  ['vatRate', ({ breakdown }) => pick(breakdown, 'vatRate')],
  ['vatAmount', ({ breakdown }) => formatEuros(pick(breakdown, 'vatAmount'))],
  ['amountExclTax', ({ breakdown }) => formatEuros(pick(breakdown, 'amountExcludingTaxesWithRecoverageRate'))],
  ['partner', ({ breakdown }) => lookups.partnerName(pick(breakdown, 'associationData', 'partnerId'))],
  ['account', ({ breakdown }) => lookups.accountName(pick(breakdown, 'associationData', 'accountId'))],
  ['wording', ({ breakdown }) => pick(breakdown, 'wording')],
];

export const vendorInvoiceColumns: Column<VendorInvoice>[] = [
  ['id', (v) => v.id],
  ['date', (v) => v.date],
  ['supplierName', (v) => v.supplierName],
  ['amount', (v) => formatEuros(v.amount)],
  ['amountTva', (v) => formatEuros(v.amountTva)],
  ['currency', (v) => v.currency],
  ['paymentStatus', (v) => v.paymentStatus],
  ['fileName', (v) => v.fileName],
  ['filePath', (v) => v.filePath],
];

const recordColumns = (...fields: string[]): Column<ApiRecord>[] =>
  fields.map((field) => [field, (row) => pick(row, field)] as const);

export const accountColumns = recordColumns('id', 'type', 'subType', 'name', 'bankName', 'closed');

export const declarationColumns = recordColumns('id', 'type', 'label', 'group', 'filledAt', 'confirmedAt', 'skipped');
