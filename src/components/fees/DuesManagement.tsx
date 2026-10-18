import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Bell, AlertTriangle, Download, CalendarRange, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_BN = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

const DuesManagement = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { isFeatureAllowed } = usePagePermissions('/admin/students-fees');
  const navigate = useNavigate();
  const now = new Date();
  const currentMonthKey = `${MONTHS[now.getMonth()]}-${now.getFullYear()}`;

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [searchText, setSearchText] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const { data: sessions = [] } = useQuery({
    queryKey: ['dues-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('id, name, name_bn, start_date, end_date, is_active').order('start_date', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      const active = sessions.find((s: any) => s.is_active) || sessions[0];
      setSelectedSessionId(active.id);
    }
  }, [sessions, selectedSessionId]);

  const { data: students = [] } = useQuery({
    queryKey: ['dues-students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, name_bn, name_en, student_id, roll_number, class_id, phone, guardian_phone, status, admission_date, classes(name, name_bn)').eq('status', 'active');
      return data || [];
    },
  });

  // Fee types scoped to the selected session (or session-less i.e. global) — include ALL frequencies
  const { data: feeTypes = [] } = useQuery({
    queryKey: ['dues-fee-types', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const { data } = await supabase.from('fee_types').select('*').eq('is_active', true);
      return (data || []).filter((ft: any) => !ft.session_id || ft.session_id === selectedSessionId);
    },
  });

  // Monthly payments for the selected month/year
  const { data: feePayments = [] } = useQuery({
    queryKey: ['dues-fee-payments', selectedMonth],
    queryFn: async () => {
      const parts = selectedMonth.split('-');
      const month = parts[0];
      const year = parseInt(parts[1]);
      const { data } = await supabase.from('fee_payments').select('student_id, fee_type_id, status, paid_amount, amount').eq('month', month).eq('year', year).eq('status', 'paid');
      return data || [];
    },
  });

  // One-time / non-monthly payments — any time within the selected session
  const { data: oneTimePayments = [] } = useQuery({
    queryKey: ['dues-onetime-payments', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments').select('student_id, fee_type_id, status').eq('status', 'paid');
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['dues-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: waivers = [] } = useQuery({
    queryKey: ['dues-waivers'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_waivers').select('student_id, fee_type_id, waiver_percent').eq('is_active', true);
      return data || [];
    },
  });

  // Filter fee types applicable to the selected month
  // - monthly: respect applicable_months (empty = all months)
  // - one-time / yearly / others: show in every month so they remain visible until paid
  const applicableFeeTypesForMonth = useMemo(() => {
    const selectedMonthName = selectedMonth.split('-')[0];
    return feeTypes.filter(ft => {
      if (ft.payment_frequency !== 'monthly') return true;
      const months = Array.isArray(ft.applicable_months) ? ft.applicable_months : [];
      if (months.length === 0) return true;
      return months.includes(selectedMonthName);
    });
  }, [feeTypes, selectedMonth]);

  // Per-student per-fee-type breakdown for the selected month
  const computeBreakdown = (s: any) => {
    const [selMonthName, selYearStr] = selectedMonth.split('-');
    const selMonthIdx = MONTHS.indexOf(selMonthName);
    const selYear = parseInt(selYearStr);
    const selDate = new Date(selYear, selMonthIdx, 1);
    const admDate = s.admission_date ? new Date(s.admission_date) : null;
    const admMonthStart = admDate ? new Date(admDate.getFullYear(), admDate.getMonth(), 1) : null;

    const applicable = applicableFeeTypesForMonth.filter(ft => !ft.class_id || ft.class_id === s.class_id);
    const monthlyPaidIds = new Set(feePayments.filter(fp => fp.student_id === s.id).map(fp => fp.fee_type_id));
    const oneTimePaidIds = new Set(oneTimePayments.filter(fp => fp.student_id === s.id).map(fp => fp.fee_type_id));
    const studentWaivers = waivers.filter(w => w.student_id === s.id);
    return applicable.map(ft => {
      const waiver = studentWaivers.find(w => w.fee_type_id === ft.id);
      const waiverPct = waiver?.waiver_percent || 0;
      // Skip fees for months before student's admission month (e.g. admission fee for March
      // when student was admitted in April should not show in March's view).
      const beforeAdmission = admMonthStart ? selDate < admMonthStart : false;
      // Monthly fees → check this month's payments. Non-monthly (one-time/yearly) → any payment counts.
      const isPaid = ft.payment_frequency === 'monthly' ? monthlyPaidIds.has(ft.id) : oneTimePaidIds.has(ft.id);
      const isFullyWaived = waiverPct >= 100;
      const due = (beforeAdmission || isPaid || isFullyWaived) ? 0 : ft.amount * (1 - waiverPct / 100);
      return { feeTypeId: ft.id, due, isPaid, isFullyWaived, beforeAdmission };
    });
  };

  const dueStudents = useMemo(() => {
    return students
      .filter(s => {
        const breakdown = computeBreakdown(s);
        if (breakdown.length === 0) return false;
        return breakdown.some(b => b.due > 0);
      })
      .filter(s => {
        if (classFilter !== 'all' && s.class_id !== classFilter) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          return (s.name_bn?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.roll_number?.includes(q));
        }
        return true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, feePayments, applicableFeeTypesForMonth, waivers, classFilter, searchText]);

  const computeStudentDue = (s: any) => computeBreakdown(s).reduce((sum, b) => sum + b.due, 0);

  const totalDueAmount = useMemo(() => {
    return dueStudents.reduce((sum, s) => sum + computeStudentDue(s), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueStudents, applicableFeeTypesForMonth, feePayments, waivers]);

  // Per-fee-type column totals
  const feeTypeColumnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    applicableFeeTypesForMonth.forEach(ft => { totals[ft.id] = 0; });
    dueStudents.forEach(s => {
      computeBreakdown(s).forEach(b => {
        totals[b.feeTypeId] = (totals[b.feeTypeId] || 0) + b.due;
      });
    });
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueStudents, applicableFeeTypesForMonth, feePayments, waivers]);

  const handleSendReminder = (student: any) => {
    toast.info(bn ? `${student.name_bn} এর জন্য রিমাইন্ডার পাঠানো হবে (এসএমএস এপিআই যুক্ত হলে)` : `Reminder will be sent to ${student.name_en || student.name_bn} (when SMS API is connected)`);
  };

  const handlePay = (student: any) => {
    navigate(`/admin/students-fees?tab=collection&studentId=${student.id}`);
  };

  const handleExportCSV = () => {
    const monthLabel = selectedMonth;
    const headers = ['#', bn ? 'নাম' : 'Name', bn ? 'আইডি' : 'ID', bn ? 'রোল' : 'Roll', bn ? 'শ্রেণী' : 'Class'];
    applicableFeeTypesForMonth.forEach(ft => headers.push(bn ? ft.name_bn : ft.name));
    headers.push(bn ? 'মোট বকেয়া' : 'Total Due', bn ? 'ফোন' : 'Phone');

    const rows = [
      headers,
      ...dueStudents.map((s, i) => {
        const breakdown = computeBreakdown(s);
        const breakdownMap = new Map(breakdown.map(b => [b.feeTypeId, b]));
        const cells = [String(i + 1), s.name_bn, s.student_id, s.roll_number || '-', (s as any).classes?.name_bn || '-'];
        applicableFeeTypesForMonth.forEach(ft => {
          const b = breakdownMap.get(ft.id);
          if (!b) cells.push('—');
          else if (b.isPaid) cells.push(bn ? 'পরিশোধিত' : 'Paid');
          else if (b.isFullyWaived) cells.push(bn ? 'মওকুফ' : 'Waived');
          else cells.push(`৳${b.due}`);
        });
        cells.push(`৳${computeStudentDue(s)}`, s.guardian_phone || s.phone || '-');
        return cells;
      })
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dues_list_${monthLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(bn ? 'ডাউনলোড হয়েছে' : 'Downloaded');
  };

  // Generate month options based on session window if available
  const monthOptions = useMemo(() => {
    const session = sessions.find((s: any) => s.id === selectedSessionId);
    const opts: { key: string; label: string }[] = [];
    if (session?.start_date && session?.end_date) {
      const start = new Date(session.start_date);
      const end = new Date(session.end_date);
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const key = `${MONTHS[cur.getMonth()]}-${cur.getFullYear()}`;
        opts.push({ key, label: bn ? `${MONTHS_BN[cur.getMonth()]} ${cur.getFullYear()}` : `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}` });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
        opts.push({ key, label: bn ? `${MONTHS_BN[d.getMonth()]} ${d.getFullYear()}` : `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
      }
    }
    return opts;
  }, [sessions, selectedSessionId, bn, now]);

  // If selected month not in session window, default to first option
  useEffect(() => {
    if (monthOptions.length > 0 && !monthOptions.find(o => o.key === selectedMonth)) {
      setSelectedMonth(monthOptions[0].key);
    }
  }, [monthOptions, selectedMonth]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-orange-200/30 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{bn ? 'বকেয়া ছাত্র সংখ্যা' : 'Students with Dues'}</p>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{dueStudents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200/30 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{bn ? 'মোট বকেয়া' : 'Total Due Amount'}</p>
                <p className="text-lg font-bold text-red-700 dark:text-red-400">৳{totalDueAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
            {applicableFeeTypesForMonth.some(ft => (feeTypeColumnTotals[ft.id] || 0) > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-red-200/30">
                {applicableFeeTypesForMonth
                  .filter(ft => (feeTypeColumnTotals[ft.id] || 0) > 0)
                  .sort((a, b) => (feeTypeColumnTotals[b.id] || 0) - (feeTypeColumnTotals[a.id] || 0))
                  .map(ft => (
                    <span
                      key={ft.id}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
                      title={bn ? ft.name_bn : ft.name}
                    >
                      <span className="font-medium truncate max-w-[80px]">{bn ? ft.name_bn : ft.name}</span>
                      <span className="font-bold">৳{(feeTypeColumnTotals[ft.id] || 0).toLocaleString('en-IN')}</span>
                    </span>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-emerald-200/30 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{bn ? 'পরিশোধিত ছাত্র' : 'Students Paid'}</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{students.length - dueStudents.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - stack vertically on mobile, row on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3 lg:items-center">
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-full lg:w-[180px] gap-2"><CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" /><SelectValue placeholder={bn ? 'সেশন' : 'Session'} /></SelectTrigger>
          <SelectContent>
            {sessions.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}{s.is_active && (bn ? ' (চলমান)' : ' (Active)')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full lg:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-full lg:w-[150px]"><SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative w-full lg:flex-1 lg:min-w-[200px] sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={bn ? 'নাম, আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, ID or roll...'} value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9 w-full" />
        </div>
        {isFeatureAllowed('action_export_dues') !== false && (
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 w-full lg:w-auto sm:col-span-2 lg:col-span-1">
            <Download className="w-4 h-4" />{bn ? 'এক্সপোর্ট' : 'Export CSV'}
          </Button>
        )}
      </div>

      {/* Table - matrix view (horizontal scroll on mobile) */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto sm:overflow-y-auto sm:max-h-[560px]" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="min-w-[720px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[160px]">{bn ? 'নাম' : 'Name'}</TableHead>
                  <TableHead>{bn ? 'আইডি' : 'ID'}</TableHead>
                  <TableHead>{bn ? 'শ্রেণী' : 'Class'}</TableHead>
                  {applicableFeeTypesForMonth.map(ft => (
                    <TableHead key={ft.id} className="text-right whitespace-nowrap">
                      {bn ? ft.name_bn : ft.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">{bn ? 'মোট' : 'Total'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicableFeeTypesForMonth.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{bn ? 'এই মাসের জন্য কোনো প্রযোজ্য মাসিক ফি নেই' : 'No monthly fee types applicable for this month'}</TableCell></TableRow>
                ) : dueStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={6 + applicableFeeTypesForMonth.length} className="text-center py-8 text-muted-foreground">{bn ? 'এই মাসে কোনো বকেয়া নেই' : 'No dues for this month'}</TableCell></TableRow>
                ) : dueStudents.map((s, i) => {
                  const breakdown = computeBreakdown(s);
                  const breakdownMap = new Map(breakdown.map(b => [b.feeTypeId, b]));
                  const total = computeStudentDue(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.name_bn}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{s.student_id}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(s as any).classes?.name_bn || '-'}</TableCell>
                      {applicableFeeTypesForMonth.map(ft => {
                        const b = breakdownMap.get(ft.id);
                        if (!b) return <TableCell key={ft.id} className="text-right text-muted-foreground/40">—</TableCell>;
                        if ((b as any).beforeAdmission) return <TableCell key={ft.id} className="text-right text-muted-foreground/40" title={bn ? 'ভর্তির আগে' : 'Before admission'}>—</TableCell>;
                        if (b.isPaid) return <TableCell key={ft.id} className="text-right"><Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">{bn ? '✓ পরিশোধিত' : '✓ Paid'}</Badge></TableCell>;
                        if (b.isFullyWaived) return <TableCell key={ft.id} className="text-right"><Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">{bn ? 'মওকুফ' : 'Waived'}</Badge></TableCell>;
                        return <TableCell key={ft.id} className="text-right font-semibold text-rose-600">৳{b.due.toLocaleString('en-IN')}</TableCell>;
                      })}
                      <TableCell className="text-right font-bold text-red-600">৳{total.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handlePay(s)}
                            className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CreditCard className="w-3 h-3" />{bn ? 'পরিশোধ' : 'Pay'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleSendReminder(s)} className="gap-1 text-xs">
                            <Bell className="w-3 h-3" />{bn ? 'রিমাইন্ডার' : 'Remind'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {applicableFeeTypesForMonth.length > 0 && dueStudents.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold text-right">{bn ? 'কলাম মোট' : 'Column Total'}</TableCell>
                    {applicableFeeTypesForMonth.map(ft => (
                      <TableCell key={ft.id} className="text-right font-bold text-rose-700">৳{(feeTypeColumnTotals[ft.id] || 0).toLocaleString('en-IN')}</TableCell>
                    ))}
                    <TableCell className="text-right font-black text-red-700">৳{totalDueAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DuesManagement;
