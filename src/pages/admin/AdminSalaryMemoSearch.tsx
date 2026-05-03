import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, Download, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const toBnDigits = (val: string | number): string => {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, d => bn[parseInt(d)]);
};

const MONTH_NAMES_BN = ['', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const MONTH_NAMES_EN = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface MemoResult {
  memo_no: string;
  month_year: string;
  created_at: string;
  records: any[];
  staff: Record<string, { name_bn: string; name_en: string; staff_id: string }>;
}

const MEMO_REGEX = /^SS-\d{4}-\d{4}$/i;

const AdminSalaryMemoSearch = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MemoResult | null>(null);

  const fmtNum = (n: any) => {
    const v = Number(n) || 0;
    return bn ? toBnDigits(v.toLocaleString('en-US')) : v.toLocaleString('en-US');
  };

  const handleSearch = async () => {
    const memo = query.trim().toUpperCase();
    setError(null);
    setResult(null);
    if (!memo) {
      setError(bn ? 'স্মারক নম্বর লিখুন' : 'Please enter a memo number');
      return;
    }
    if (!MEMO_REGEX.test(memo)) {
      setError(bn ? 'সঠিক ফরম্যাট: SS-YYYY-NNNN (যেমন SS-2024-0001)' : 'Format must be SS-YYYY-NNNN (e.g. SS-2024-0001)');
      return;
    }
    setLoading(true);
    try {
      const { data: memoRow, error: memoErr } = await supabase
        .from('salary_sheet_memos')
        .select('memo_no, month_year, created_at')
        .eq('memo_no', memo)
        .maybeSingle();
      if (memoErr) throw memoErr;
      if (!memoRow) {
        setError(bn ? 'এই স্মারক নম্বরে কোনো রেকর্ড পাওয়া যায়নি' : 'No record found for this memo number');
        return;
      }

      const { data: records, error: recErr } = await supabase
        .from('salary_records')
        .select('*')
        .eq('month_year', memoRow.month_year)
        .is('deleted_at', null);
      if (recErr) throw recErr;

      const staffIds = Array.from(new Set((records || []).map((r: any) => r.staff_id).filter(Boolean)));
      let staffMap: Record<string, any> = {};
      if (staffIds.length) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id, name_bn, name_en, staff_id')
          .in('id', staffIds);
        staffMap = Object.fromEntries((staff || []).map((s: any) => [s.id, s]));
      }

      setResult({
        memo_no: memoRow.memo_no,
        month_year: memoRow.month_year,
        created_at: memoRow.created_at,
        records: records || [],
        staff: staffMap,
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || (bn ? 'ত্রুটি হয়েছে' : 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!result) return;
    try {
      const { data, error } = await supabase.functions.invoke('salary-pdf', {
        body: { monthYear: result.month_year },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else if (data?.pdfBase64) {
        const blob = new Blob([Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
        window.open(URL.createObjectURL(blob), '_blank');
      } else {
        toast.success(bn ? 'PDF জেনারেট হয়েছে' : 'PDF generated');
      }
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'PDF ডাউনলোড ব্যর্থ' : 'PDF download failed'));
    }
  };

  const monthLabel = (my: string) => {
    const [y, m] = my.split('-');
    const idx = parseInt(m, 10);
    const name = bn ? MONTH_NAMES_BN[idx] : MONTH_NAMES_EN[idx];
    return bn ? `${name} ${toBnDigits(y)}` : `${name} ${y}`;
  };

  const totals = result ? result.records.reduce((acc: any, r: any) => {
    acc.base += Number(r.base_salary) || 0;
    acc.ot += Number(r.overtime) || 0;
    acc.bonus += Number(r.bonus) || 0;
    acc.allow += Number(r.other_allowance) || 0;
    acc.absD += Number(r.absence_deduction) || 0;
    acc.lateD += Number(r.late_deduction) || 0;
    acc.advD += Number(r.advance_deduction) || 0;
    acc.savD += Number(r.savings_deduction) || 0;
    acc.othD += Number(r.other_deduction) || 0;
    acc.net += Number(r.net_salary) || 0;
    return acc;
  }, { base: 0, ot: 0, bonus: 0, allow: 0, absD: 0, lateD: 0, advD: 0, savD: 0, othD: 0, net: 0 }) : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {bn ? 'স্মারক নম্বর সার্চ' : 'Memo Number Search'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'SS-YYYY-NNNN ফরম্যাটে মাসিক বেতন শিটের স্মারক খুঁজুন' : 'Search monthly salary sheet by SS-YYYY-NNNN memo'}
            </p>
          </div>
        </div>

        <Card className="rounded-[45px] backdrop-blur-xl bg-card/60 border-border/40">
          <CardHeader>
            <CardTitle className="text-base">{bn ? 'স্মারক নম্বর দিয়ে খুঁজুন' : 'Search by Memo Number'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="SS-2024-0001"
                className="flex-1 font-mono uppercase tracking-wider"
              />
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {bn ? 'অনুসন্ধান' : 'Search'}
              </Button>
            </div>
            {error && (
              <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-2xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card className="rounded-[45px] backdrop-blur-xl bg-card/60 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-base px-3 py-1">{result.memo_no}</Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/20">{monthLabel(result.month_year)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bn ? 'মোট স্টাফ: ' : 'Total staff: '}{fmtNum(result.records.length)}
                </p>
              </div>
              <Button variant="outline" onClick={downloadPdf} className="gap-2">
                <Download className="w-4 h-4" />
                {bn ? 'PDF ডাউনলোড' : 'Download PDF'}
              </Button>
            </CardHeader>
            <CardContent>
              {result.records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {bn ? 'এই মাসে কোনো বেতন রেকর্ড নেই' : 'No salary records for this month'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'স্টাফ' : 'Staff'}</TableHead>
                        <TableHead className="text-right">{bn ? 'মূল' : 'Base'}</TableHead>
                        <TableHead className="text-right">{bn ? 'ওটি' : 'OT'}</TableHead>
                        <TableHead className="text-right">{bn ? 'বোনাস' : 'Bonus'}</TableHead>
                        <TableHead className="text-right">{bn ? 'ভাতা' : 'Allow'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অনুপস্থিতি' : 'Absent'}</TableHead>
                        <TableHead className="text-right">{bn ? 'বিলম্ব' : 'Late'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অগ্রিম' : 'Advance'}</TableHead>
                        <TableHead className="text-right">{bn ? 'জমা' : 'Savings'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অন্যান্য' : 'Other'}</TableHead>
                        <TableHead className="text-right font-bold">{bn ? 'নিট' : 'Net'}</TableHead>
                        <TableHead>{bn ? 'অবস্থা' : 'Status'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.records.map((r: any) => {
                        const s = result.staff[r.staff_id];
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="font-medium">{s ? (bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)) : '—'}</div>
                              <div className="text-xs text-muted-foreground font-mono">{s?.staff_id || ''}</div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{fmtNum(r.base_salary)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtNum(r.overtime)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtNum(r.bonus)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtNum(r.other_allowance)}</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{fmtNum(r.absence_deduction)}</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{fmtNum(r.late_deduction)}</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{fmtNum(r.advance_deduction)}</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{fmtNum(r.savings_deduction)}</TableCell>
                            <TableCell className="text-right tabular-nums text-destructive">{fmtNum(r.other_deduction)}</TableCell>
                            <TableCell className="text-right tabular-nums font-bold">{fmtNum(r.net_salary)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{r.workflow_stage || r.status || '—'}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {totals && (
                        <TableRow className="font-bold bg-muted/30">
                          <TableCell>{bn ? 'মোট' : 'Total'}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(totals.base)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(totals.ot)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(totals.bonus)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(totals.allow)}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">{fmtNum(totals.absD)}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">{fmtNum(totals.lateD)}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">{fmtNum(totals.advD)}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">{fmtNum(totals.savD)}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">{fmtNum(totals.othD)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(totals.net)}</TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSalaryMemoSearch;
