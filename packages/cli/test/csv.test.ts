import { describe, expect, it } from 'vitest';

import { formatEuros } from '../src/amounts';
import { csvCell, toCsv } from '../src/csv';

describe('csvCell', () => {
  it('quotes separators, quotes and new lines', () => {
    expect(csvCell('Rail Co, Paris')).toBe('"Rail Co, Paris"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a;b')).toBe('"a;b"');
  });

  it('neutralises spreadsheet formulas but keeps negative numbers numeric', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-12.50')).toBe('-12.50');
  });

  it('writes empty cells for missing values and JSON for objects', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell({ partnerId: 5 })).toBe('"{""partnerId"":5}"');
  });
});

describe('toCsv', () => {
  it('writes a header and one line per row', () => {
    const csv = toCsv(
      [{ id: 1, name: 'x' }],
      [
        ['id', (r) => r.id],
        ['name', (r) => r.name],
      ],
    );
    expect(csv).toBe('id,name\n1,x\n');
  });
});

describe('formatEuros', () => {
  it.each([
    [12.5, '12.50'],
    [0.1 + 0.2, '0.30'],
    [-0.05, '-0.05'],
    [1234567.891, '1234567.89'],
    [0, '0.00'],
  ])('formats %d as %s', (euros, expected) => {
    expect(formatEuros(euros)).toBe(expected);
  });

  it('leaves non numeric values empty', () => {
    expect(formatEuros(null)).toBe('');
  });
});
