import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { eurosToCents, VAT_EXEMPTION_REASONS, type VatExemptionReason } from '@plokkke/dougs-compta';

export type FieldProperty = Omit<INodeProperties, 'displayOptions'>;

export type Field<T> = { property: FieldProperty; read: (context: IExecuteFunctions, item: number) => T };

const raw = (context: IExecuteFunctions, name: string, item: number): unknown =>
  context.getNodeParameter(name, item, undefined, { extractValue: true });

function field<T>(property: FieldProperty, parse: (value: unknown) => T): Field<T> {
  return { property, read: (context, item) => parse(raw(context, property.name, item)) };
}

function toId(name: string) {
  return (value: unknown): number => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new RangeError(`${name} must be a positive integer id, got "${String(value)}"`);
    }
    return id;
  };
}

function locator(name: string, displayName: string, searchListMethod: string, searchable = false): FieldProperty {
  return {
    displayName,
    name,
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    modes: [
      { displayName: 'From List', name: 'list', type: 'list', typeOptions: { searchListMethod, searchable } },
      { displayName: 'By ID', name: 'id', type: 'string', placeholder: 'e.g. 12345' },
    ],
  };
}

/** Keeps the calendar day typed in the n8n date picker, whatever the timezone of the instance. */
const toCalendarDate = (value: unknown): string => String(value ?? '').slice(0, 10);

const VAT_OPTIONS = [
  { name: 'No Exemption', value: 'none' },
  { name: 'Exempt', value: 'exempt' },
  { name: 'Purchase Outside EU', value: VAT_EXEMPTION_REASONS[0] },
];

function toVatExemption(value: unknown): boolean | VatExemptionReason {
  if (value === 'none' || value === undefined) {
    return false;
  }
  return value === 'exempt' ? true : (value as VatExemptionReason);
}

export const fields = {
  companyId: field(locator('companyId', 'Company', 'getCompanies'), toId('Company')),
  date: field({ displayName: 'Date', name: 'date', type: 'dateTime', default: '', required: true }, toCalendarDate),
  memo: field({ displayName: 'Memo', name: 'memo', type: 'string', default: '' }, (v) => String(v ?? '') || undefined),
  amount: field(
    {
      displayName: 'Amount (EUR)',
      name: 'amount',
      type: 'number',
      default: 0,
      required: true,
      typeOptions: { numberPrecision: 2 },
    },
    (v) => eurosToCents(Number(v)),
  ),
  categoryId: field(locator('categoryId', 'Category', 'getCategories', true), toId('Category')),
  partnerId: field(locator('partnerId', 'Partner', 'getPartners'), toId('Partner')),
  vatExemption: field(
    { displayName: 'VAT Exemption', name: 'vatExemption', type: 'options', default: 'none', options: VAT_OPTIONS },
    toVatExemption,
  ),
  distance: field({ displayName: 'Distance (Km)', name: 'distance', type: 'number', default: 0, required: true }, (v) =>
    Math.round(Number(v)),
  ),
  carId: field({ ...locator('carId', 'Car', 'getCars'), required: false }, (v) => (v ? toId('Car')(v) : undefined)),
  operationId: field(
    { displayName: 'Operation ID', name: 'operationId', type: 'number', default: 0, required: true },
    toId('Operation ID'),
  ),
  binaryPropertyName: field(
    {
      displayName: 'Input Binary Field',
      name: 'binaryPropertyName',
      type: 'string',
      default: 'data',
      required: true,
      hint: 'The name of the input binary field containing the invoice file',
    },
    (v) => String(v),
  ),
};

export type FieldName = keyof typeof fields;
