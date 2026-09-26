import { z } from 'zod';

import { assertCents, centsToEuros, type Cents } from './money';

export const VAT_EXEMPTION_REASONS = ['exemption:outbound:outsideEuropeanUnion'] as const;

export type VatExemptionReason = (typeof VAT_EXEMPTION_REASONS)[number];

/** Calendar dates travel as `YYYY-MM-DD` strings, never as instants: no timezone can shift a booking. */
export type IsoDate = string;

export type ExpenseInput = {
  date: IsoDate;
  memo?: string;
  amountCents: Cents;
  categoryId: number;
  partnerId: number;
  /** `true` for a plain exemption, or the reason Dougs expects. */
  vatExemption?: boolean | VatExemptionReason;
};

export type MileageInput = {
  date: IsoDate;
  memo?: string;
  distanceKm: number;
  carId?: number;
};

/** Dougs books the counterpart of a breakdown with this placeholder category. */
const COUNTERPART_CATEGORY_ID = -1;

const isoDate = z.iso.date();

export function assertIsoDate(date: string): IsoDate {
  if (!isoDate.safeParse(date).success) {
    throw new RangeError(`date must be a calendar date formatted YYYY-MM-DD, got "${date}"`);
  }
  return date;
}

export function expensePayload(expense: ExpenseInput) {
  const amount = centsToEuros(assertCents(expense.amountCents, 'amountCents'));
  return {
    type: 'expense',
    date: assertIsoDate(expense.date),
    memo: expense.memo,
    amount,
    attachments: [],
    breakdowns: [
      { amount, categoryId: expense.categoryId, ...vatExemptionFields(amount, expense.vatExemption) },
      {
        amount: 0,
        categoryId: COUNTERPART_CATEGORY_ID,
        isCounterpart: true,
        associationData: { partnerId: expense.partnerId },
      },
    ],
  };
}

function vatExemptionFields(amount: number, exemption: ExpenseInput['vatExemption']) {
  if (!exemption) {
    return {};
  }
  return {
    amountExcludingTaxesWithRecoverageRate: amount,
    vatRate: null,
    vatAmount: 0,
    manualVatAmount: 0,
    ...(typeof exemption === 'string' && { associationData: { vatExemptionReason: exemption } }),
  };
}

export function mileagePayload(mileage: MileageInput) {
  if (!Number.isInteger(mileage.distanceKm) || mileage.distanceKm <= 0) {
    throw new RangeError(`distanceKm must be a positive integer, got ${mileage.distanceKm}`);
  }
  return {
    type: 'kilometricIndemnity',
    date: assertIsoDate(mileage.date),
    memo: mileage.memo,
    breakdowns: [
      {
        amount: 0,
        categoryId: COUNTERPART_CATEGORY_ID,
        associationData: { kilometers: mileage.distanceKm, ...(mileage.carId && { carId: mileage.carId }) },
      },
    ],
  };
}

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Deep merge for plain objects; arrays and scalars in `patch` replace the original value. */
export function mergeDeep(original: Plain, patch: Plain): Plain {
  return Object.entries(patch).reduce<Plain>(
    (merged, [key, value]) => {
      const current = merged[key];
      merged[key] = isPlain(current) && isPlain(value) ? mergeDeep(current, value) : value;
      return merged;
    },
    { ...original },
  );
}

const UPLOAD_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export function uploadMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = UPLOAD_MIME_TYPES[extension];
  if (!mimeType) {
    throw new RangeError(
      `Unsupported invoice file "${fileName}": expected one of ${Object.keys(UPLOAD_MIME_TYPES).join(', ')}`,
    );
  }
  return mimeType;
}
