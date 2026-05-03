/**
 * Bulk CSV import validator for designations / roles / departments.
 *
 * Goals:
 *  - Parse CSV safely (quotes, commas, newlines, BOM)
 *  - Reject UNSAFE rows (formula injection, control chars, oversized,
 *    invalid characters, missing required columns)
 *  - Flag Bangla spelling issues using the canonical dictionary
 *  - Detect duplicates within the file AND against existing rows
 *
 * Output is a per-row report; the caller decides whether to insert.
 */
import { checkBanglaDesignation, normalizeBn } from './banglaDesignationSpellCheck';

export type ImportRowStatus = 'ok' | 'warn' | 'error';

export interface ImportRowReport {
  line: number;          // 1-indexed (excluding header)
  raw: Record<string, string>;
  name?: string;         // English name
  nameBn?: string;       // Bangla name (auto-corrected if suggestion applied)
  staffCategory?: string;
  status: ImportRowStatus;
  issues: string[];      // human-readable
  suggestion?: string;   // proposed corrected nameBn
}

export interface ImportSummary {
  rows: ImportRowReport[];
  totalRows: number;
  okRows: number;
  warnRows: number;
  errorRows: number;
}

// ─── Hard limits ─────────────────────────────────────────────────────────
const MAX_ROWS = 500;
const MAX_FIELD_LEN = 120;
const MAX_FILE_BYTES = 256 * 1024; // 256 KB

// Disallow common formula-injection prefixes (Excel/Sheets RCE risk)
const FORMULA_INJECTION = /^[=+\-@\t\r]/;

// Reject control characters except \t (we already strip CR/LF in fields)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// Allowed staff_category keys must be ascii_snake (defensive)
const VALID_CATEGORY_KEY = /^[a-z][a-z0-9_]{0,40}$/;

// Allowed English name characters
const VALID_NAME_EN = /^[A-Za-z0-9 .&'/\-()]{1,120}$/;

// ─── Tiny RFC-4180 CSV parser ───────────────────────────────────────────
function parseCsv(text: string): string[][] {
  // Strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else { cell += ch; }
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface ValidateOptions {
  /** Existing Bangla designation names — used for duplicate detection. */
  existingNamesBn?: string[];
  /** Allowed staff_category keys. If provided, unknown keys → error. */
  allowedCategoryKeys?: string[];
}

/**
 * Validate raw CSV text for a designations bulk import.
 * Required columns (header row, case-insensitive): name, name_bn
 * Optional: staff_category, description, sort_order, is_active
 */
export function validateDesignationCsv(
  csvText: string,
  opts: ValidateOptions = {}
): ImportSummary {
  const summary: ImportSummary = {
    rows: [], totalRows: 0, okRows: 0, warnRows: 0, errorRows: 0,
  };

  if (csvText.length > MAX_FILE_BYTES) {
    return {
      ...summary,
      rows: [{
        line: 0, raw: {}, status: 'error',
        issues: [`ফাইল অনেক বড় (${MAX_FILE_BYTES} bytes এর বেশি)। File too large.`],
      }],
      totalRows: 1, errorRows: 1,
    };
  }

  const grid = parseCsv(csvText);
  if (grid.length < 2) {
    return {
      ...summary,
      rows: [{
        line: 0, raw: {}, status: 'error',
        issues: ['হেডার সহ অন্তত একটি ডেটা রো প্রয়োজন। Need header + at least one data row.'],
      }],
      totalRows: 1, errorRows: 1,
    };
  }

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const iName = idx('name');
  const iNameBn = idx('name_bn');
  if (iName < 0 || iNameBn < 0) {
    return {
      ...summary,
      rows: [{
        line: 0, raw: {}, status: 'error',
        issues: ['"name" এবং "name_bn" কলাম আবশ্যক। Required columns: name, name_bn.'],
      }],
      totalRows: 1, errorRows: 1,
    };
  }
  const iCat = idx('staff_category');
  const iDesc = idx('description');

  const dataRows = grid.slice(1, MAX_ROWS + 1);
  if (grid.length - 1 > MAX_ROWS) {
    summary.rows.push({
      line: 0, raw: {}, status: 'warn',
      issues: [`শুধু প্রথম ${MAX_ROWS}টি রো প্রসেস করা হয়েছে। Truncated to first ${MAX_ROWS} rows.`],
    });
    summary.warnRows++;
  }

  const seenInFile = new Map<string, number>();
  const existingNorm = new Set(
    (opts.existingNamesBn || []).map((n) => normalizeBn(n).toLowerCase())
  );

  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r];
    const issues: string[] = [];
    let status: ImportRowStatus = 'ok';

    const get = (i: number) => (i >= 0 && i < cells.length ? (cells[i] ?? '').trim() : '');
    const name = get(iName);
    const nameBn = normalizeBn(get(iNameBn));
    const staffCategory = iCat >= 0 ? get(iCat) : '';
    const description = iDesc >= 0 ? get(iDesc) : '';

    const raw: Record<string, string> = { name, name_bn: nameBn };
    if (staffCategory) raw.staff_category = staffCategory;
    if (description) raw.description = description;

    // ── Hard safety checks (always error) ──────────────────────────────
    for (const [k, v] of Object.entries(raw)) {
      if (v.length > MAX_FIELD_LEN) {
        issues.push(`"${k}" অনেক বড় (>${MAX_FIELD_LEN}). Field too long.`);
        status = 'error';
      }
      if (CONTROL_CHARS.test(v)) {
        issues.push(`"${k}"-এ অনুমতিহীন কন্ট্রোল ক্যারেক্টার। Control char in field.`);
        status = 'error';
      }
      if (FORMULA_INJECTION.test(v)) {
        issues.push(`"${k}" শুরু হয়েছে =/+/-/@ দিয়ে — formula-injection ঝুঁকি।`);
        status = 'error';
      }
    }

    // ── Required values ────────────────────────────────────────────────
    if (!name) { issues.push('name (English) ফাঁকা।'); status = 'error'; }
    if (!nameBn) { issues.push('name_bn (Bangla) ফাঁকা।'); status = 'error'; }

    // ── English name format ────────────────────────────────────────────
    if (name && !VALID_NAME_EN.test(name)) {
      issues.push('name-এ অনুমতিহীন অক্ষর (শুধু A-Z, 0-9, . & \' / - ( )).');
      status = 'error';
    }

    // ── Category key whitelist ─────────────────────────────────────────
    if (staffCategory) {
      if (!VALID_CATEGORY_KEY.test(staffCategory)) {
        issues.push('staff_category কী invalid (a-z, 0-9, _).');
        status = 'error';
      } else if (
        opts.allowedCategoryKeys &&
        !opts.allowedCategoryKeys.includes(staffCategory)
      ) {
        issues.push(`staff_category "${staffCategory}" সিস্টেমে নেই।`);
        status = 'error';
      }
    }

    // ── Bangla spell check (warn/error) ────────────────────────────────
    let suggestion: string | undefined;
    if (nameBn && status !== 'error') {
      const sc = checkBanglaDesignation(nameBn, opts.existingNamesBn || []);
      if (!sc.ok) {
        if (sc.level === 'error') status = 'error';
        else if (status === 'ok') status = 'warn';
        if (sc.message) issues.push(sc.message);
        suggestion = sc.suggestion;
      }
    }

    // ── Duplicate detection ────────────────────────────────────────────
    const dupKey = nameBn.toLowerCase();
    if (dupKey) {
      if (seenInFile.has(dupKey)) {
        issues.push(`একই name_bn ফাইলেই লাইন ${seenInFile.get(dupKey)}-এ আছে।`);
        status = 'error';
      } else {
        seenInFile.set(dupKey, r + 2); // +2 = header + 1-index
      }
      if (existingNorm.has(normalizeBn(nameBn).toLowerCase())) {
        issues.push('এই name_bn ইতিমধ্যেই ডাটাবেসে আছে।');
        status = 'error';
      }
    }

    summary.rows.push({
      line: r + 2,
      raw,
      name,
      nameBn: suggestion || nameBn,
      staffCategory: staffCategory || undefined,
      status,
      issues,
      suggestion,
    });

    if (status === 'ok') summary.okRows++;
    else if (status === 'warn') summary.warnRows++;
    else summary.errorRows++;
  }

  summary.totalRows = summary.rows.length;
  return summary;
}
