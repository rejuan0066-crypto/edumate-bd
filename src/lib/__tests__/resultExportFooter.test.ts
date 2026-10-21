import { describe, it, expect } from 'vitest';
import { getResultSheetHtml, DEFAULT_PRINT_MARGINS } from '@/lib/resultExport';

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

const makeMarks = (students: any[]) => {
  const map: Record<string, number> = {};
  students.forEach((st) => baseSubjects.forEach((sub) => (map[`${st.id}_${sub.id}`] = 75)));
  return map;
};

const getOverallGrade = () => ({ grade: 'A', gpa: '5.00', title: 'Excellent', title_bn: 'চমৎকার', hasFail: false });

const build = (o: any = {}) => {
  const students = o.students ?? makeStudents(20);
  return getResultSheetHtml({
    title: 'Test Result',
    students,
    subjects: baseSubjects,
    marksMap: makeMarks(students),
    getOverallGrade,
    bn: o.bn ?? false,
    institutionName: 'Test Institution',
    signatories: o.signatories,
    orientation: o.orientation ?? 'landscape',
    showPageNumbers: true,
    showFooterInstitution: o.showFooterInstitution ?? true,
    margins: DEFAULT_PRINT_MARGINS,
  } as any);
};

const countRows = (html: string): number => {
  const bodies: string[] = html.match(/<tbody[\s\S]*?<\/tbody>/g) ?? [];
  let n = 0;
  for (const tb of bodies) n += (tb.match(/<tr\b/g) ?? []).length;
  return n;
};

describe('getResultSheetHtml — pagination & footer', () => {
  it('shows "Page X / Y" in English (11 rows per landscape page)', () => {
    const html = build({ students: makeStudents(23) });
    expect(html).toContain('Page 1 / 3');
    expect(html).toContain('Page 3 / 3');
  });

  it('uses Bengali label and digits when bn=true', () => {
    const html = build({ bn: true, students: makeStudents(23) });
    expect(html).toContain('পৃষ্ঠা ১ / ৩');
  });

  it('portrait fits 14 rows per page', () => {
    const html = build({ orientation: 'portrait', students: makeStudents(28) });
    expect(html).toContain('Page 2 / 2');
    expect(html).not.toContain('Page 3 /');
  });

  it('renders every student row (no truncation)', () => {
    expect(countRows(build({ students: makeStudents(250) }))).toBeGreaterThanOrEqual(250);
  });

  it('shows / hides institution name in footer', () => {
    expect(build()).toMatch(/class="footer[^"]*">\s*<div[^>]*>Test Institution</);
    expect(build({ showFooterInstitution: false })).not.toMatch(/class="footer[^"]*">\s*<div[^>]*>Test Institution</);
  });

  it('keeps rows from splitting across pages and sets A4 orientation', () => {
    const html = build({ orientation: 'portrait' });
    expect(html).toMatch(/tbody tr\s*\{[^}]*page-break-inside:\s*avoid/);
    expect(html).toMatch(/@page\s*\{[^}]*size:\s*A4\s+portrait/);
  });

  it('excludes disabled signatories when show_name or enabled is false', () => {
    const customSignatories = [
      { title_bn: 'শ্রেণি শিক্ষক', name_bn: '', show_name: false },
      { title_bn: 'পরীক্ষা নিয়ন্ত্রক', name_bn: '', show_name: false },
      { title_bn: 'নাজিম', name_bn: 'মাওলানাঃ ফারহান হোসাইন', show_name: true },
      { title_bn: 'প্রতিষ্ঠাতা ও প্রিন্সিপাল', name_bn: 'আলহাজ্ব আব্দুছ ছোবহান', show_name: true },
    ];
    const html = build({ bn: true, signatories: customSignatories });
    expect(html).not.toContain('শ্রেণি শিক্ষক');
    expect(html).not.toContain('পরীক্ষা নিয়ন্ত্রক');
    expect(html).toContain('নাজিম');
    expect(html).toContain('মাওলানাঃ ফারহান হোসাইন');
    expect(html).toContain('প্রতিষ্ঠাতা ও প্রিন্সিপাল');
    expect(html).toContain('আলহাজ্ব আব্দুছ ছোবহান');
  });
});
