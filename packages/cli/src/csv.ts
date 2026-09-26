export type Column<T> = readonly [header: string, value: (row: T) => unknown];

const NUMERIC = /^-?\d+(\.\d+)?$/;
/** Leading characters a spreadsheet would evaluate as a formula (CSV injection). */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const safe = FORMULA_TRIGGER.test(text) && !NUMERIC.test(text) ? `'${text}` : text;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv<T>(rows: readonly T[], columns: readonly Column<T>[]): string {
  const header = columns.map(([name]) => csvCell(name)).join(',');
  const lines = rows.map((row) => columns.map(([, value]) => csvCell(value(row))).join(','));
  return [header, ...lines].join('\n') + '\n';
}
