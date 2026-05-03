import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printResultSheet, DEFAULT_PRINT_MARGINS } from '@/lib/resultExport';

// Capture the HTML passed to Blob (printResultSheet builds an HTML string,
// wraps it in a Blob, opens a new window and triggers print()).
let capturedHtml = '';

beforeEach(() => {
  capturedHtml = '';
  const OriginalBlob = globalThis.Blob;
  // @ts-expect-error – stub Blob to capture HTML payload
  globalThis.Blob = function (parts: any[], opts: any) {
    capturedHtml = (parts || []).join('');
    return new OriginalBlob(parts, opts);
  } as any;

  // @ts-expect-error – stub URL APIs used by printResultSheet
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  // @ts-expect-error
  globalThis.URL.revokeObjectURL = vi.fn();

  // Stub window.open so printResultSheet doesn't try to actually print.
  vi.spyOn(window, 'open').mockReturnValue({
    onload: null,
    print: vi.fn(),
    close: vi.fn(),
  } as any);
});

const baseSubjects = [
  { id: 's1', name: 'Math', name_bn: 'গণিত' },
  { id: 's2', name: 'English', name_bn: 'ইংরেজি' },
  { id: 's3', name: 'Science', name_bn: 'বিজ্ঞান' },
];

const makeStudents = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `st${i + 1}`,
    roll_number: i + 1,
    name_en: `Student ${i + 1}`,
    name_bn: `ছাত্র ${i + 1}`,
  }));

const makeMarks = (students: any[], subjects: any[]) => {
  const map: Record<string, number> = {};
  students.forEach((st) => subjects.forEach((sub) => (map[`${st.id}_${sub.id}`] = 75)));
  return map;
};

const getOverallGrade = () => ({ grade: 'A', gpa: '5.00', title: 'Excellent', title_bn: 'চমৎকার', hasFail: false });

const callPrint = (overrides: any = {}) =>
  printResultSheet({
    title: 'Test Result',
    students: overrides.students ?? makeStudents(120),
    subjects: overrides.subjects ?? baseSubjects,
    marksMap: overrides.marksMap ?? makeMarks(overrides.students ?? makeStudents(120), baseSubjects),
    getOverallGrade,
    bn: overrides.bn ?? false,
    institutionName: 'Test Institution',
    orientation: overrides.orientation ?? 'landscape',
    showPageNumbers: overrides.showPageNumbers ?? true,
    showFooterInstitution: overrides.showFooterInstitution ?? true,
    margins: overrides.margins ?? DEFAULT_PRINT_MARGINS,
    ...overrides,
  });

describe('printResultSheet — footer & page numbering', () => {
  it('emits CSS Paged Media counters for Page X of Y in English', () => {
    callPrint({ bn: false, showPageNumbers: true });
    expect(capturedHtml).toMatch(/@bottom-right\s*\{[^}]*"Page "\s*counter\(page\)\s*" of "\s*counter\(pages\)/);
  });

  it('uses Bengali labels and bengali counter style when bn=true', () => {
    callPrint({ bn: true, showPageNumbers: true });
    expect(capturedHtml).toMatch(/"পৃষ্ঠা "\s*counter\(page,\s*bengali\)\s*" এর "\s*counter\(pages,\s*bengali\)/);
  });

  it('emits an empty footer string when showPageNumbers=false', () => {
    callPrint({ showPageNumbers: false });
    // @bottom-right should resolve to empty content
    const m = capturedHtml.match(/@bottom-right\s*\{([^}]*)\}/);
    expect(m).toBeTruthy();
    expect(m![1]).toMatch(/content:\s*""/);
    expect(m![1]).not.toMatch(/counter\(page/);
  });

  it('shows / hides institution name in @bottom-left based on showFooterInstitution', () => {
    callPrint({ showFooterInstitution: true });
    expect(capturedHtml).toMatch(/@bottom-left\s*\{[^}]*"Test Institution"/);

    callPrint({ showFooterInstitution: false });
    const m = capturedHtml.match(/@bottom-left\s*\{([^}]*)\}/);
    expect(m![1]).toMatch(/content:\s*""/);
  });

  it('renders all rows for a long list (no client-side truncation)', () => {
    const students = makeStudents(250);
    callPrint({ students, marksMap: makeMarks(students, baseSubjects) });
    const rowCount = (capturedHtml.match(/<tr(?:\s|>)/g) || []).length;
    // 1 header row + 250 data rows
    expect(rowCount).toBeGreaterThanOrEqual(251);
  });

  it('declares page-break rules so rows split cleanly across pages', () => {
    callPrint();
    // tbody rows must avoid breaking inside
    expect(capturedHtml).toMatch(/tbody tr\s*\{[^}]*page-break-inside:\s*avoid/);
    // header must repeat on every page
    expect(capturedHtml).toMatch(/thead\s*\{[^}]*display:\s*table-header-group/);
    // table itself allows auto breaks between rows
    expect(capturedHtml).toMatch(/table\s*\{[^}]*page-break-inside:\s*auto/);
  });

  it('honors custom margins in the @page rule', () => {
    callPrint({ margins: { top: 7, right: 8, bottom: 12, left: 9 } });
    expect(capturedHtml).toMatch(/@page\s*\{[^}]*margin:\s*7mm\s+8mm\s+12mm\s+9mm/);
  });

  it('keeps orientation in the @page rule', () => {
    callPrint({ orientation: 'portrait' });
    expect(capturedHtml).toMatch(/@page\s*\{[^}]*size:\s*A4\s+portrait/);
  });
});
