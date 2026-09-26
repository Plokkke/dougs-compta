/** Integer number of euro cents. The Dougs API speaks euros as floats; this SDK never does. */
export type Cents = number;

export function assertCents(value: number, label = 'amount'): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be an integer number of cents, got ${value}`);
  }
  return value;
}

export function centsToEuros(cents: Cents): number {
  return assertCents(cents) / 100;
}

export function eurosToCents(euros: number): Cents {
  if (!Number.isFinite(euros)) {
    throw new RangeError(`euros must be a finite number, got ${euros}`);
  }
  return Math.round(euros * 100);
}
