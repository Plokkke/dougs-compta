import { eurosToCents } from '@plokkke/dougs-compta';

/** Formats an API euro amount through integer cents, so `0.1 + 0.2` is written `0.30`, never `0.30000000000000004`. */
export function formatEuros(euros: unknown): string {
  if (typeof euros !== 'number') {
    return '';
  }
  const cents = eurosToCents(euros);
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}
