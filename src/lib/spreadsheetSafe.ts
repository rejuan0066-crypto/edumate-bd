// Neutralize values that a spreadsheet would interpret as formulas (CSV/XLSX injection).
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function safeCell<T>(v: T): T | string {
  if (typeof v !== 'string') return v;
  if (v === '-' || PLAIN_NUMBER.test(v)) return v;
  return FORMULA_PREFIX.test(v) ? `'${v}` : v;
}

export function safeRows(rows: any[][]): any[][] {
  return rows.map((r) => (Array.isArray(r) ? r.map(safeCell) : r));
}

/** Quote a value for CSV after neutralizing formula prefixes. */
export function csvCell(v: unknown): string {
  const s = String(safeCell(v == null ? '' : String(v)));
  return `"${s.replace(/"/g, '""')}"`;
}
