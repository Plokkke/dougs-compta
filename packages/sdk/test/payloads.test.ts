import { describe, expect, it } from 'vitest';

import { expensePayload, mergeDeep, mileagePayload, uploadMimeType } from '../src/payloads';

const expense = { date: '2026-03-31', memo: 'Train', amountCents: 1250, categoryId: 77, partnerId: 5 };

describe('expensePayload', () => {
  it('converts cents to the euro amounts Dougs expects and books the partner as counterpart', () => {
    expect(expensePayload(expense)).toEqual({
      type: 'expense',
      date: '2026-03-31',
      memo: 'Train',
      amount: 12.5,
      attachments: [],
      breakdowns: [
        { amount: 12.5, categoryId: 77 },
        { amount: 0, categoryId: -1, isCounterpart: true, associationData: { partnerId: 5 } },
      ],
    });
  });

  it('zeroes VAT on an exempt expense and passes the exemption reason', () => {
    const [breakdown] = expensePayload({
      ...expense,
      vatExemption: 'exemption:outbound:outsideEuropeanUnion',
    }).breakdowns;
    expect(breakdown).toMatchObject({
      vatRate: null,
      vatAmount: 0,
      amountExcludingTaxesWithRecoverageRate: 12.5,
      associationData: { vatExemptionReason: 'exemption:outbound:outsideEuropeanUnion' },
    });
  });

  it('rejects fractional cents and non calendar dates before anything is sent', () => {
    expect(() => expensePayload({ ...expense, amountCents: 12.5 })).toThrow(/integer number of cents/);
    expect(() => expensePayload({ ...expense, date: '2026-03-31T22:00:00Z' })).toThrow(/YYYY-MM-DD/);
    expect(() => expensePayload({ ...expense, date: '2026-02-30' })).toThrow(/YYYY-MM-DD/);
  });
});

describe('mileagePayload', () => {
  it('records the distance and optional car', () => {
    expect(mileagePayload({ date: '2026-03-31', distanceKm: 38, carId: 3 }).breakdowns[0]?.associationData).toEqual({
      kilometers: 38,
      carId: 3,
    });
  });

  it('rejects a non positive or fractional distance', () => {
    expect(() => mileagePayload({ date: '2026-03-31', distanceKm: 0 })).toThrow(RangeError);
    expect(() => mileagePayload({ date: '2026-03-31', distanceKm: 1.5 })).toThrow(RangeError);
  });
});

describe('mergeDeep', () => {
  it('merges nested objects, replaces arrays and leaves the original untouched', () => {
    const original = { validated: false, meta: { a: 1, b: 2 }, tags: [1, 2] };
    const merged = mergeDeep(original, { validated: true, meta: { b: 3 }, tags: [9] });

    expect(merged).toEqual({ validated: true, meta: { a: 1, b: 3 }, tags: [9] });
    expect(original.meta.b).toBe(2);
  });
});

describe('uploadMimeType', () => {
  it('accepts the document types Dougs stores, whatever the extension case', () => {
    expect(uploadMimeType('scan.JPG')).toBe('image/jpeg');
    expect(uploadMimeType('invoice.pdf')).toBe('application/pdf');
  });

  it('rejects anything else', () => {
    expect(() => uploadMimeType('invoice.docx')).toThrow(/Unsupported invoice file/);
    expect(() => uploadMimeType('README')).toThrow(RangeError);
  });
});
