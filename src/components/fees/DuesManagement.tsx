import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Search, Bell, AlertTriangle, Download, CalendarRange, CreditCard, Banknote, CheckCircle2, Calendar, MessageSquare } from 'lucide-react';
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
  // Default to cumulative calculation up to current month (চলতি মাস পর্যন্ত)
  const [isCumulative, setIsCumulative] = useState(true);

  const { data: sessions = [] } = useQuery({
    queryKey: ['dues-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_sessions')
        .select('id, name, name_bn, start_date, end_date, is_active')
        .order('start_date', { ascending: false, nullsFirst: false });
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
    queryKey: ['dues-students', selectedSessionId],
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select('id, name_bn, name_en, student_id, roll_number, class_id, division_id, session_id, phone, guardian_phone, status, admission_date, deleted_at, classes(name, name_bn), divisions(name, name_bn)')
        .eq('status', 'active')
        .is('deleted_at', null);
      if (selectedSessionId) {
        q = q.eq('session_id', selectedSessionId);
      }
      const { data } = await q;
      return data || [];
    },
  });

  // Fee types scoped to the selected session
  const { data: feeTypes = [] } = useQuery({
    queryKey: ['dues-fee-types', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const { data } = await supabase.from('fee_types').select('*').eq('is_active', true);
      return (data || []).filter((ft: any) => !ft.session_id || ft.session_id === selectedSessionId);
    },
  });

  // All session fee payments for calculating both cumulative and month-specific dues & paid amounts
  const { data: allSessionPayments = [] } = useQuery({
    queryKey: ['dues-all-session-payments', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const { data } = await supabase
        .from('fee_payments')
        .select('id, student_id, fee_type_id, status, paid_amount, amount, month, year, paid_at')
        .eq('status', 'paid');
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

  // Filter fee types applicable up to or in the selected month
  const applicableFeeTypesForMonth = useMemo(() => {
    const [selectedMonthName, selectedYearStr] = selectedMonth.split('-');
    const selectedMonthIdx = MONTHS.indexOf(selectedMonthName);
    const selectedYear = parseInt(selectedYearStr) || now.getFullYear();
    const targetDate = new Date(selectedYear, selectedMonthIdx, 1);

    return feeTypes.filter((ft: any) => {
      const months = Array.isArray(ft.applicable_months) ? ft.applicable_months : [];
      if (months.length === 0) return true;

      if (!isCumulative) {
        return months.includes(selectedMonthName) || months.includes(`${selectedMonthName}-${selectedYearStr}`) || months.includes(selectedMonth);
      }

      return months.some((mStr: string) => {
        const [mName, yStr] = mStr.split('-');
        const mIdx = MONTHS.indexOf(mName);
        const mYear = yStr ? parseInt(yStr) : selectedYear;
        if (mIdx === -1) return true;
        const appDate = new Date(mYear, mIdx, 1);
        return appDate <= targetDate;
      });
    });
  }, [feeTypes, selectedMonth, isCumulative, now]);

  // Per-student per-fee-type breakdown (supports cumulative up to selected month or single month)
  const computeBreakdown = useCallback((s: any) => {
    const [selMonthName, selYearStr] = selectedMonth.split('-');
    const selMonthIdx = MONTHS.indexOf(selMonthName);
    const selYear = parseInt(selYearStr) || now.getFullYear();
    const targetMonthDate = new Date(selYear, selMonthIdx, 1);

    const session = sessions.find((ses: any) => ses.id === selectedSessionId);
    const sessionStart = session?.start_date ? new Date(session.start_date) : new Date(selYear, 0, 1);
    const admDate = s.admission_date ? new Date(s.admission_date) : sessionStart;
    const effectiveStart = admDate > sessionStart ? admDate : sessionStart;
    const startMonthDate = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);

    const applicable = applicableFeeTypesForMonth.filter((ft: any) => {
      if (ft.session_id && s.session_id && ft.session_id !== s.session_id) return false;
      if (ft.division_id && s.division_id && ft.division_id !== s.division_id) return false;
      if (ft.class_id && s.class_id && ft.class_id !== s.class_id) return false;
      return true;
    });

    const studentPayments = allSessionPayments.filter((p: any) => p.student_id === s.id);
    const studentWaivers = waivers.filter((w: any) => w.student_id === s.id);

    // Build array of months from admission / session start up to the selected month
    const monthsInRange: { month: string; year: number }[] = [];
    if (isCumulative) {
      const cur = new Date(startMonthDate);
      while (cur <= targetMonthDate) {
        monthsInRange.push({ month: MONTHS[cur.getMonth()], year: cur.getFullYear() });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      if (targetMonthDate >= startMonthDate) {
        monthsInRange.push({ month: selMonthName, year: selYear });
      }
    }

    return applicable.map((ft: any) => {
      const waiver = studentWaivers.find((w: any) => w.fee_type_id === ft.id);
      const waiverPct = waiver?.waiver_percent || 0;
      const baseAmount = Number(ft.amount) || 0;
      const discountedAmount = baseAmount * (1 - waiverPct / 100);
      const isFullyWaived = waiverPct >= 100;

      let feeDue = 0;
      let feePaid = 0;
      let dueMonthsCount = 0;
      let paidMonthsCount = 0;

      if (ft.payment_frequency === 'monthly') {
        const eligibleMonths = monthsInRange.filter(m => {
          if (!ft.applicable_months || ft.applicable_months.length === 0) return true;
          return ft.applicable_months.includes(m.month) || ft.applicable_months.includes(`${m.month}-${m.year}`);
        });

        eligibleMonths.forEach(m => {
          const paidRec = studentPayments.find((p: any) => p.fee_type_id === ft.id && p.month === m.month && p.year === m.year);
          if (paidRec) {
            feePaid += Number(paidRec.paid_amount || paidRec.amount || baseAmount);
            paidMonthsCount++;
          } else if (isFullyWaived) {
            // Waived
          } else {
            feeDue += discountedAmount;
            dueMonthsCount++;
          }
        });

        return {
          feeTypeId: ft.id,
          due: feeDue,
          paid: feePaid,
          dueMonthsCount,
          paidMonthsCount,
          totalMonths: eligibleMonths.length,
          isMonthly: true,
          isPaid: feeDue === 0 && feePaid > 0,
          isFullyWaived: isFullyWaived && eligibleMonths.length > 0,
          beforeAdmission: eligibleMonths.length === 0,
        };
      } else {
        // One-time / yearly fee
        let applies = true;
        if (ft.applicable_months && Array.isArray(ft.applicable_months) && ft.applicable_months.length > 0) {
          applies = ft.applicable_months.some((appM: string) => {
            const [mName, yStr] = appM.split('-');
            const mIdx = MONTHS.indexOf(mName);
            const mYear = yStr ? parseInt(yStr) : selYear;
            if (mIdx === -1) return true;
            const appDate = new Date(mYear, mIdx, 1);
            return isCumulative ? appDate <= targetMonthDate : (mIdx === selMonthIdx && mYear === selYear);
          });
        }

        if (!applies) {
          return { feeTypeId: ft.id, due: 0, paid: 0, isMonthly: false, isPaid: false, isFullyWaived: false, beforeAdmission: true };
        }

        const paidRec = studentPayments.find((p: any) => p.fee_type_id === ft.id);
        if (paidRec) {
          feePaid += Number(paidRec.paid_amount || paidRec.amount || baseAmount);
        } else if (isFullyWaived) {
          // Waived
        } else {
          feeDue += discountedAmount;
        }

        return {
          feeTypeId: ft.id,
          due: feeDue,
          paid: feePaid,
          isMonthly: false,
          isPaid: feeDue === 0 && feePaid > 0,
          isFullyWaived,
          beforeAdmission: false,
        };
      }
    });
  }, [selectedMonth, sessions, selectedSessionId, applicableFeeTypesForMonth, allSessionPayments, waivers, isCumulative, now]);

  // Students admitted on or before the selected month who are active and not deleted
  const enrolledStudentsInMonth = useMemo(() => {
    const [selMonthName, selYearStr] = selectedMonth.split('-');
    const selMonthIdx = MONTHS.indexOf(selMonthName);
    const selYear = parseInt(selYearStr) || now.getFullYear();
    const selDate = new Date(selYear, selMonthIdx, 1);

    return students.filter((s: any) => {
      if (s.deleted_at) return false;
      if (s.status !== 'active') return false;
      if (!s.admission_date) return true;
      const admDate = new Date(s.admission_date);
      const admMonthStart = new Date(admDate.getFullYear(), admDate.getMonth(), 1);
      return selDate >= admMonthStart;
    });
  }, [students, selectedMonth, now]);

  const computeStudentDue = useCallback((s: any) => {
    return computeBreakdown(s).reduce((sum: number, b: any) => sum + b.due, 0);
  }, [computeBreakdown]);

  const computeStudentPaid = useCallback((s: any) => {
    return computeBreakdown(s).reduce((sum: number, b: any) => sum + b.paid, 0);
  }, [computeBreakdown]);

  const dueStudents = useMemo(() => {
    return enrolledStudentsInMonth
      .filter((s: any) => {
        const breakdown = computeBreakdown(s);
        if (breakdown.length === 0) return false;
        return breakdown.some((b: any) => b.due > 0);
      })
      .filter((s: any) => {
        if (classFilter !== 'all' && s.class_id !== classFilter) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          return (s.name_bn?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.roll_number?.includes(q));
        }
        return true;
      });
  }, [enrolledStudentsInMonth, computeBreakdown, classFilter, searchText]);

  const filteredEnrolled = useMemo(() => {
    return classFilter === 'all'
      ? enrolledStudentsInMonth
      : enrolledStudentsInMonth.filter((s: any) => s.class_id === classFilter);
  }, [enrolledStudentsInMonth, classFilter]);

  const paidCount = useMemo(() => {
    if (filteredEnrolled.length === 0) return 0;
    return Math.max(0, filteredEnrolled.length - dueStudents.length);
  }, [filteredEnrolled, dueStudents]);

  const totalDueAmount = useMemo(() => {
    return dueStudents.reduce((sum: number, s: any) => sum + computeStudentDue(s), 0);
  }, [dueStudents, computeStudentDue]);

  const totalPaidAmount = useMemo(() => {
    return filteredEnrolled.reduce((sum: number, s: any) => sum + computeStudentPaid(s), 0);
  }, [filteredEnrolled, computeStudentPaid]);

  // Per-fee-type column totals
  const feeTypeColumnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    applicableFeeTypesForMonth.forEach((ft: any) => { totals[ft.id] = 0; });
    dueStudents.forEach((s: any) => {
      computeBreakdown(s).forEach((b: any) => {
        totals[b.feeTypeId] = (totals[b.feeTypeId] || 0) + b.due;
      });
    });
    return totals;
  }, [dueStudents, applicableFeeTypesForMonth, computeBreakdown]);

  const handleSendReminder = (student: any) => {
    const dueAmt = computeStudentDue(student);
    const phone = student.guardian_phone || student.phone;
    if (!phone) {
      toast.error(bn ? 'অভিভাবকের ফোন নম্বর নেই' : 'No phone number found');
      return;
    }
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('01')) clean = '88' + clean;

    const msg = `আসসালামু আলাইকুম, অভিভাবক মহোদয়। আল আরাবিয়া সুবহানিয়া মাদ্রাসায় আপনার সন্তান ${student.name_bn || student.name_en}-এর মোট বকেয়া ফি ৳${dueAmt.toLocaleString('en-IN')}। অনুগ্রহ করে দ্রুত পরিশোধের জন্য বিনীত অনুরোধ করা হচ্ছে।`;
    const waUrl = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    toast.success(bn ? `${student.name_bn}-এর WhatsApp মেসেজ ওপেন হয়েছে` : `Opened WhatsApp for ${student.name_en || student.name_bn}`);
  };

  const handlePay = (student: any) => {
    navigate(`/admin/students-fees?tab=collection&studentId=${student.id}`);
  };

  const handleExportCSV = () => {
    const monthLabel = selectedMonth;
    const headers = [
      '#',
      bn ? 'নাম' : 'Name',
      bn ? 'আইডি' : 'ID',
      bn ? 'রোল' : 'Roll',
      bn ? 'শ্রেণী' : 'Class'
    ];
    applicableFeeTypesForMonth.forEach((ft: any) => headers.push(bn ? ft.name_bn : ft.name));
    headers.push(
      bn ? (isCumulative ? 'মোট পরিশোধ (চলতি মাস পর্যন্ত)' : 'মোট পরিশোধ') : 'Total Paid',
      bn ? (isCumulative ? 'মোট বকেয়া (চলতি মাস পর্যন্ত)' : 'মোট বকেয়া') : 'Total Due',
      bn ? 'ফোন' : 'Phone'
    );

    const rows = [
      headers,
      ...dueStudents.map((s: any, i: number) => {
        const breakdown = computeBreakdown(s);
        const breakdownMap = new Map(breakdown.map((b: any) => [b.feeTypeId, b]));
        const cells = [String(i + 1), s.name_bn, s.student_id, s.roll_number || '-', s.classes?.name_bn || '-'];
        applicableFeeTypesForMonth.forEach((ft: any) => {
          const b = breakdownMap.get(ft.id) as any;
          if (!b) cells.push('—');
          else if (b.beforeAdmission) cells.push('—');
          else if (b.isPaid) cells.push(bn ? `পরিশোধিত (৳${b.paid})` : `Paid (৳${b.paid})`);
          else if (b.isFullyWaived) cells.push(bn ? 'মওকুফ' : 'Waived');
          else if (b.isMonthly && b.dueMonthsCount > 0) cells.push(`৳${b.due} (${b.dueMonthsCount} মাস)`);
          else cells.push(`৳${b.due}`);
        });
        cells.push(`৳${computeStudentPaid(s)}`, `৳${computeStudentDue(s)}`, s.guardian_phone || s.phone || '-');
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
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Due Students */}
        <Card className="border-orange-200/40 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{bn ? 'বকেয়া ছাত্র সংখ্যা' : 'Students with Dues'}</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                {dueStudents.length} <span className="text-xs font-normal text-muted-foreground">{bn ? 'জন' : ''}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Due */}
        <Card className="border-rose-200/40 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {bn ? (isCumulative ? 'চলতি মাস পর্যন্ত মোট বকেয়া' : 'এই মাসের মোট বকেয়া') : 'Total Due Amount'}
                </p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-400">৳{totalDueAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
            {applicableFeeTypesForMonth.some((ft: any) => (feeTypeColumnTotals[ft.id] || 0) > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-rose-200/40">
                {applicableFeeTypesForMonth
                  .filter((ft: any) => (feeTypeColumnTotals[ft.id] || 0) > 0)
                  .sort((a: any, b: any) => (feeTypeColumnTotals[b.id] || 0) - (feeTypeColumnTotals[a.id] || 0))
                  .map((ft: any) => (
                    <span
                      key={ft.id}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
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

        {/* Card 3: Total Paid / Collected */}
        <Card className="border-emerald-200/40 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {bn ? (isCumulative ? 'চলতি মাস পর্যন্ত মোট পরিশোধ' : 'এই মাসের মোট পরিশোধ') : 'Total Paid Amount'}
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                ৳{totalPaidAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Paid Students */}
        <Card className="border-blue-200/40 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{bn ? 'পরিশোধিত ছাত্র সংখ্যা' : 'Students Fully Paid'}</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {paidCount}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  / {filteredEnrolled.length} {bn ? 'জন' : ''}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar with Mode Switcher */}
      <div className="flex flex-col gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          {/* Mode Switcher */}
          <div className="inline-flex items-center p-1 bg-muted rounded-lg border border-border/70 text-xs">
            <button
              type="button"
              onClick={() => setIsCumulative(true)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                isCumulative
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              {bn ? 'চলতি মাস পর্যন্ত (ক্রমপুঞ্জিত বকেয়া)' : 'Up to Current Month (Cumulative)'}
            </button>
            <button
              type="button"
              onClick={() => setIsCumulative(false)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                !isCumulative
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {bn ? 'শুধুমাত্র এই মাস' : 'Single Month Only'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/admin/guardian-notify')}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {bn ? 'বকেয়াদের বাল্ক WhatsApp' : 'Bulk WhatsApp Dues'}
            </Button>
            {isFeatureAllowed('action_export_dues') !== false && (
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
                <Download className="w-3.5 h-3.5" />
                {bn ? 'এক্সপোর্ট CSV' : 'Export CSV'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2.5 sm:gap-3 lg:items-center">
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="w-full lg:w-[190px] gap-2">
              <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder={bn ? 'সেশন' : 'Session'} />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {bn ? s.name_bn : s.name}
                  {s.is_active && (bn ? ' (চলমান)' : ' (Active)')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {bn ? c.name_bn : c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full lg:flex-1 lg:min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'নাম, আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, ID or roll...'}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
      </div>

      {/* Table - Matrix view showing fee columns, Total Paid, and Total Due */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto sm:overflow-y-auto sm:max-h-[580px]" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="min-w-[840px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[170px]">{bn ? 'নাম' : 'Name'}</TableHead>
                    <TableHead>{bn ? 'আইডি' : 'ID'}</TableHead>
                    <TableHead>{bn ? 'শ্রেণী' : 'Class'}</TableHead>
                    {applicableFeeTypesForMonth.map((ft: any) => (
                      <TableHead key={ft.id} className="text-right whitespace-nowrap">
                        {bn ? ft.name_bn : ft.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {bn ? 'পরিশোধ' : 'Paid'}
                    </TableHead>
                    <TableHead className="text-right font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                      {bn ? (isCumulative ? 'মোট বকেয়া' : 'বকেয়া') : 'Due'}
                    </TableHead>
                    <TableHead className="text-center w-28">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicableFeeTypesForMonth.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {bn ? 'এই সেশন বা মাসের জন্য কোনো প্রযোজ্য ফি নেই' : 'No fee types applicable'}
                      </TableCell>
                    </TableRow>
                  ) : filteredEnrolled.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7 + applicableFeeTypesForMonth.length} className="text-center py-8 text-muted-foreground">
                        {bn ? 'এই মাসে কোনো শিক্ষার্থী ভর্তি ছিল না' : 'No students enrolled'}
                      </TableCell>
                    </TableRow>
                  ) : dueStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7 + applicableFeeTypesForMonth.length} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-1.5">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          <p className="font-semibold text-foreground">
                            {bn ? (isCumulative ? 'চলতি মাস পর্যন্ত কোনো বকেয়া নেই!' : 'এই মাসে কোনো বকেয়া নেই!') : 'No dues found!'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {bn ? 'সকল শিক্ষার্থীর ফি সম্পূর্ণ পরিশোধিত।' : 'All fees are up to date.'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    dueStudents.map((s: any, i: number) => {
                      const breakdown = computeBreakdown(s);
                      const breakdownMap = new Map(breakdown.map((b: any) => [b.feeTypeId, b]));
                      const studentDue = computeStudentDue(s);
                      const studentPaid = computeStudentPaid(s);

                      return (
                        <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="font-medium text-foreground">{s.name_bn}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs font-medium">
                              {s.student_id}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.classes?.name_bn || '-'}</TableCell>

                          {applicableFeeTypesForMonth.map((ft: any) => {
                            const b = breakdownMap.get(ft.id) as any;
                            if (!b || b.beforeAdmission) {
                              return (
                                <TableCell key={ft.id} className="text-right text-muted-foreground/30 text-xs">
                                  —
                                </TableCell>
                              );
                            }
                            if (b.isPaid) {
                              return (
                                <TableCell key={ft.id} className="text-right">
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold">
                                    ✓ {bn ? 'পরিশোধিত' : 'Paid'}
                                  </Badge>
                                </TableCell>
                              );
                            }
                            if (b.isFullyWaived) {
                              return (
                                <TableCell key={ft.id} className="text-right">
                                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-semibold">
                                    {bn ? 'মওকুফ' : 'Waived'}
                                  </Badge>
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell key={ft.id} className="text-right">
                                <div className="flex flex-col items-end">
                                  <span className="font-semibold text-rose-600">
                                    ৳{b.due.toLocaleString('en-IN')}
                                  </span>
                                  {isCumulative && b.isMonthly && b.dueMonthsCount > 1 && (
                                    <span className="text-[10px] text-muted-foreground/80 font-normal">
                                      ({b.dueMonthsCount} {bn ? 'মাস' : 'mo'})
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}

                          {/* Student Total Paid */}
                          <TableCell className="text-right font-bold text-emerald-600">
                            {studentPaid > 0 ? `৳${studentPaid.toLocaleString('en-IN')}` : '৳০'}
                          </TableCell>

                          {/* Student Total Due */}
                          <TableCell className="text-right font-black text-rose-600 text-sm">
                            ৳{studentDue.toLocaleString('en-IN')}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handlePay(s)}
                                className="h-7 px-2.5 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-none"
                              >
                                <CreditCard className="w-3 h-3" />
                                {bn ? 'পরিশোধ' : 'Pay'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendReminder(s)}
                                className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                title={bn ? 'রিমাইন্ডার পাঠান' : 'Send Reminder'}
                              >
                                <Bell className="w-3 h-3" />
                                <span className="hidden xl:inline">{bn ? 'রিমাইন্ডার' : 'Remind'}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>

                {applicableFeeTypesForMonth.length > 0 && dueStudents.length > 0 && (
                  <TableFooter className="bg-muted/50 border-t-2 font-bold">
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold text-foreground">
                        {bn ? (isCumulative ? 'কলাম মোট (চলতি মাস পর্যন্ত):' : 'কলাম মোট:') : 'Column Total:'}
                      </TableCell>
                      {applicableFeeTypesForMonth.map((ft: any) => (
                        <TableCell key={ft.id} className="text-right font-bold text-rose-700 dark:text-rose-400">
                          ৳{(feeTypeColumnTotals[ft.id] || 0).toLocaleString('en-IN')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-black text-emerald-700 dark:text-emerald-400">
                        ৳{totalPaidAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-black text-rose-700 dark:text-rose-400 text-base">
                        ৳{totalDueAmount.toLocaleString('en-IN')}
                      </TableCell>
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
