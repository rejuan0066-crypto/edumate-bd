import { describe, it, expect } from 'vitest';
import { validateDesignationCsv } from '@/lib/bulkDesignationImport';

const HEADER = 'name,name_bn,staff_category';

describe('validateDesignationCsv — happy path', () => {
  it('accepts clean canonical rows', () => {
    const csv = `${HEADER}\nTreasurer,কোষাধ্যক্ষ,management\nPrincipal,প্রিন্সিপাল,management`;
    const r = validateDesignationCsv(csv);
    expect(r.errorRows).toBe(0);
    expect(r.okRows).toBe(2);
  });
});

describe('validateDesignationCsv — Bangla spelling', () => {
  it('flags known misspellings as error and suggests fix', () => {
    const csv = `${HEADER}\nTreasurer,কোষাধ্যক,management`;
    const r = validateDesignationCsv(csv);
    expect(r.errorRows).toBe(1);
    expect(r.rows[0].suggestion).toBe('কোষাধ্যক্ষ');
  });

  it('rejects non-Bangla in name_bn', () => {
    const csv = `${HEADER}\nTreasurer,Treasurer,management`;
    const r = validateDesignationCsv(csv);
    expect(r.errorRows).toBe(1);
  });
});

describe('validateDesignationCsv — safety', () => {
  it('rejects formula-injection prefixes', () => {
    const csv = `${HEADER}\n=cmd|'/c calc'!A1,কোষাধ্যক্ষ,management`;
    const r = validateDesignationCsv(csv);
    expect(r.errorRows).toBe(1);
    expect(r.rows[0].issues.join(' ')).toMatch(/formula/i);
  });

  it('rejects oversized fields', () => {
    const long = 'A'.repeat(200);
    const csv = `${HEADER}\n${long},কোষাধ্যক্ষ,management`;
    const r = validateDesignationCsv(csv);
    expect(r.errorRows).toBe(1);
  });

  it('rejects invalid English name characters', () => {
    const csv = `${HEADER}\n<script>,কোষাধ্যক্ষ,management`;
    const r = validateDesignationCsv(csv);
    expect(r.errorRows).toBe(1);
  });

  it('rejects unknown category when allowlist provided', () => {
    const csv = `${HEADER}\nPrincipal,প্রিন্সিপাল,evil_cat`;
    const r = validateDesignationCsv(csv, { allowedCategoryKeys: ['management', 'teacher'] });
    expect(r.errorRows).toBe(1);
  });
});

describe('validateDesignationCsv — duplicates', () => {
  it('flags in-file duplicates', () => {
    const csv = `${HEADER}\nA,কোষাধ্যক্ষ,management\nB,কোষাধ্যক্ষ,management`;
    const r = validateDesignationCsv(csv);
    expect(r.errorRows).toBe(1);
    expect(r.okRows).toBe(1);
  });

  it('flags duplicates against existing DB rows', () => {
    const csv = `${HEADER}\nTreasurer,কোষাধ্যক্ষ,management`;
    const r = validateDesignationCsv(csv, { existingNamesBn: ['কোষাধ্যক্ষ'] });
    expect(r.errorRows).toBe(1);
  });
});

describe('validateDesignationCsv — header errors', () => {
  it('rejects missing required headers', () => {
    const r = validateDesignationCsv('foo,bar\n1,2');
    expect(r.errorRows).toBe(1);
    expect(r.rows[0].issues[0]).toMatch(/name/i);
  });
});
