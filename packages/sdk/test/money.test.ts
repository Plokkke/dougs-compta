import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { assertCents, centsToEuros, eurosToCents } from '../src/money';

describe('money', () => {
  it('round-trips every cent amount through the euro representation used by the API', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e12, max: 1e12 }), (cents) => {
        expect(eurosToCents(centsToEuros(cents))).toBe(cents);
      }),
    );
  });

  it('rejects amounts that are not integer cents', () => {
    expect(() => assertCents(10.5)).toThrow(RangeError);
    expect(() => centsToEuros(Number.NaN)).toThrow(RangeError);
    expect(() => eurosToCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('absorbs binary floating point noise from API amounts', () => {
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
    expect(eurosToCents(1.15)).toBe(115);
  });
});
