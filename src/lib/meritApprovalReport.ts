import { generateBilingualReport, type ReportMeta, type ReportSection, type ReportSummaryStat } from '@/lib/reportPdfGenerator';

export interface MeritApprovalReportInput {
  institution: {
    name: string;
    name_en?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logo_url?: string | null;
  };
  academicYear: string;
  examSession: string;
  className: string;
  approval: {
    status: 'pending' | 'approved' | 'rejected' | 'none';
    decided_at?: string | null;
    submitted_at?: string | null;
    rejection_reason?: string | null;
    decided_by_name?: string | null;
    submitted_by_name?: string | null;
  };
  rankings: Array<{
    rank: number;
    name: string;
    rollNumber: number | null;
    totalMarks: number;
    grade: string;
    gpa: string;
    hasFail: boolean;
  }>;
  bn?: boolean;
}

export const generateMeritApprovalReport = (input: MeritApprovalReportInput) => {
  const { institution, academicYear, examSession, className, approval, rankings, bn = true } = input;

  const passing = rankings.filter(r => !r.hasFail);
  const failing = rankings.filter(r => r.hasFail);
  const total = rankings.length;
  const passRate = total > 0 ? ((passing.length / total) * 100).toFixed(1) + '%' : '—';
  const avgScore = total > 0
    ? (rankings.reduce((s, r) => s + r.totalMarks, 0) / total).toFixed(2)
    : '—';

  const statusLabel = (() => {
    switch (approval.status) {
      case 'approved': return bn ? 'অনুমোদিত' : 'Approved';
      case 'rejected': return bn ? 'প্রত্যাখ্যাত' : 'Rejected';
      case 'pending': return bn ? 'অনুমোদনের অপেক্ষায়' : 'Pending';
      default: return bn ? 'জমা দেওয়া হয়নি' : 'Not Submitted';
    }
  })();

  const meta: ReportMeta = {
    institution_name: institution.name,
    institution_name_en: institution.name_en || institution.name,
    address: institution.address || '',
    phone: institution.phone || '',
    email: institution.email || '',
    logo_url: institution.logo_url || undefined,
    report_title_bn: 'মেধা তালিকা অনুমোদন প্রতিবেদন',
    report_title_en: 'Merit List Approval Report',
    period_label_bn: `${academicYear} • ${examSession} • ${className}`,
    period_label_en: `${academicYear} • ${examSession} • ${className}`,
  };

  const summary: ReportSummaryStat[] = [
    { label_bn: 'মোট শিক্ষার্থী', label_en: 'Total Students', value: total, tone: 'neutral' },
    { label_bn: 'উত্তীর্ণ', label_en: 'Passed', value: passing.length, tone: 'positive' },
    { label_bn: 'অনুত্তীর্ণ', label_en: 'Failed', value: failing.length, tone: 'negative' },
    { label_bn: 'পাশের হার', label_en: 'Pass Rate', value: passRate, tone: 'accent' },
    { label_bn: 'গড় মোট নম্বর', label_en: 'Avg. Total', value: avgScore, tone: 'neutral' },
    { label_bn: 'অনুমোদন স্ট্যাটাস', label_en: 'Approval Status', value: statusLabel,
      tone: approval.status === 'approved' ? 'positive' : approval.status === 'rejected' ? 'negative' : 'accent' },
  ];

  const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleString() : '—';

  const decisionSection: ReportSection = {
    title_bn: 'অনুমোদনের সিদ্ধান্ত ও কারণ',
    title_en: 'Approval Decision & Reason',
    headers: [
      { bn: 'বিবরণ', en: 'Field' },
      { bn: 'মান', en: 'Value' },
    ],
    rows: [
      [bn ? 'স্ট্যাটাস' : 'Status', statusLabel],
      [bn ? 'জমা দিয়েছেন' : 'Submitted By', approval.submitted_by_name || '—'],
      [bn ? 'জমার সময়' : 'Submitted At', fmtDate(approval.submitted_at)],
      [bn ? 'সিদ্ধান্ত গ্রহণকারী' : 'Decided By', approval.decided_by_name || '—'],
      [bn ? 'সিদ্ধান্তের সময়' : 'Decided At', fmtDate(approval.decided_at)],
      [bn ? 'কারণ / মন্তব্য' : 'Reason / Remarks',
        approval.rejection_reason || (approval.status === 'approved'
          ? (bn ? 'অনুমোদিত — কোনো আপত্তি নেই' : 'Approved — no objections')
          : '—')],
    ],
  };

  const rankingsSection: ReportSection = {
    title_bn: 'মেধা তালিকা (র‍্যাংক অনুসারে)',
    title_en: 'Merit Ranking (by Rank)',
    headers: [
      { bn: 'র‍্যাংক', en: 'Rank' },
      { bn: 'নাম', en: 'Name' },
      { bn: 'রোল', en: 'Roll' },
      { bn: 'মোট নম্বর', en: 'Total' },
      { bn: 'গ্রেড', en: 'Grade' },
      { bn: 'জিপিএ', en: 'GPA' },
      { bn: 'ফলাফল', en: 'Result' },
    ],
    rows: rankings.map(r => [
      r.hasFail ? '—' : r.rank,
      r.name,
      r.rollNumber ?? '—',
      r.totalMarks,
      r.grade,
      r.gpa,
      r.hasFail ? (bn ? 'অনুত্তীর্ণ' : 'Failed') : (bn ? 'উত্তীর্ণ' : 'Passed'),
    ]),
    totals: [
      { bn: 'মোট শিক্ষার্থী', en: 'Total Students', value: total },
    ],
  };

  generateBilingualReport(meta, [decisionSection, rankingsSection], summary);
};
