/**
 * Formula injection and CSV export sanitization utilities.
 * Neutralizes values starting with '=', '+', '-', '@', '\t', '\r' which could be
 * executed as formulas when exported to spreadsheets (Excel, Google Sheets, LibreOffice).
 */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Strips dangerous formula injection prefixes from raw user input strings before saving to database.
 */
export function sanitizeFormulaInput(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (FORMULA_PREFIX.test(str)) {
    return str.replace(/^[=+\-@\t\r]+/, '').trim();
  }
  return str;
}

/**
 * Prepares a cell value for safe CSV export.
 * Prepends a single quote if the cell begins with formula injection characters.
 */
export function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (FORMULA_PREFIX.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
