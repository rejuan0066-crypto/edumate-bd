import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ChevronDown, ChevronUp, Printer, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useDashboardSession } from '@/contexts/DashboardSessionContext';

type FeeCategory = 'monthly' | 'exam' | 'admission';

type GroupItem = {
  label: string;
  sortOrder: number | null;
  serial: number | null;
  total: number;
  paid: any[];
  unpaid: any[];
};

interface FeeSectionProps {
  category: FeeCategory;
  titleBn: string;
  titleEn: string;
  icon?: React.ReactNode;
}

const toEnglishDigits = (value: string) =>
  value.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));

const extractClassSerial = (label?: string | null) => {
  if (!label) return null;
  const match = toEnglishDigits(label).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
};

const compareAcademicOrder = (
  a: { label?: string | null; sortOrder?: number | null; serial?: number | null },
  b: { label?: string | null; sortOrder?: number | null; serial?: number | null },
) => {
  const aSerial = a.serial ?? Number.MAX_SAFE_INTEGER;
  const bSerial = b.serial ?? Number.MAX_SAFE_INTEGER;
  if (aSerial !== bSerial) return aSerial - bSerial;
  const aSortOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const bSortOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (aSortOrder !== bSortOrder) return aSortOrder - bSortOrder;
  return (a.label || '').localeCompare(b.label || '', 'bn', { numeric: true, sensitivity: 'base' });
};

const DashboardFeeSection = ({ category, titleBn, titleEn, icon }: FeeSectionProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { selectedSessionId, selectedSession } = useDashboardSession();
  const [expanded, setExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [listType, setListType] = useState<'paid' | 'unpaid'>('paid');
  const [reportMonth, setReportMonth] = useState<string | null>(null);

  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_BN: Record<string, string> = {
    January: 'জানুয়ারি', February: 'ফেব্রুয়ারি', March: 'মার্চ', April: 'এপ্রিল',
    May: 'মে', June: 'জুন', July: 'জুলাই', August: 'আগস্ট',
    September: 'সেপ্টেম্বর', October: 'অক্টোবর', November: 'নভেম্বর', December: 'ডিসেম্বর',
  };

  // Years that fall within selected session range
  const sessionYearList = useMemo(() => {
    if (!selectedSession?.start_date || !selectedSession?.end_date) return null;
    const sy = new Date(selectedSession.start_date).getFullYear();
    const ey = new Date(selectedSession.end_date).getFullYear();
    const arr: number[] = [];
    for (let y = sy; y <= ey; y++) arr.push(y);
    return arr;
  }, [selectedSession]);

  const { data: payments = [] } = useQuery({
    queryKey: ['dashboard-fee-payments', category, selectedSessionId],
    queryFn: async () => {
      let q = supabase
        .from('fee_payments')
        .select('*, students(id, name_bn, roll_number, division_id, class_id, session_id, divisions(name_bn), classes(name_bn, sort_order)), fee_types(name_bn, fee_category, name, amount, session_id)')
        .eq('fee_types.fee_category', category)
        .order('created_at', { ascending: false });
      if (sessionYearList && sessionYearList.length > 0) q = q.in('year', sessionYearList);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []).filter((p: any) => p.fee_types?.fee_category === category);
      if (selectedSessionId) {
        rows = rows.filter((p: any) =>
          (p.fee_types?.session_id ? p.fee_types.session_id === selectedSessionId : true) &&
          (p.students?.session_id ? p.students.session_id === selectedSessionId : true)
        );
      }
      return rows;
    },
    refetchOnWindowFocus: true, staleTime: 0,
  });

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['dashboard-fee-types', category, selectedSessionId],
    queryFn: async () => {
      let q = supabase
        .from('fee_types')
        .select('id, name_bn, name, fee_category, amount, division_id, class_id, session_id, payment_frequency, applicable_months, academic_sessions:session_id(name, name_bn, start_date, end_date)')
        .eq('fee_category', category)
        .eq('is_active', true)
        .is('deleted_at', null);
      if (selectedSessionId) q = q.eq('session_id', selectedSessionId);
      const { data } = await q;
      return data || [];
    },
    refetchOnWindowFocus: true, staleTime: 0,
  });

  const sessionLabel = useMemo(() => {
    const sessions = new Set<string>();
    feeTypes.forEach((ft: any) => {
      if (ft.academic_sessions) {
        sessions.add(bn ? (ft.academic_sessions.name_bn || ft.academic_sessions.name) : ft.academic_sessions.name);
      }
    });
    return Array.from(sessions).join(', ');
  }, [feeTypes, bn]);

  const { data: students = [] } = useQuery({
    queryKey: ['dashboard-students-for-fees', selectedSessionId],
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select('id, name_bn, roll_number, division_id, class_id, session_id, is_free, admission_date, deleted_at, divisions(name_bn), classes(name_bn, sort_order)')
        .eq('status', 'active')
        .is('deleted_at', null);
      if (selectedSessionId) q = q.eq('session_id', selectedSessionId);
      const { data } = await q;
      return data || [];
    },
    refetchOnWindowFocus: true, staleTime: 0,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['dashboard-classes-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name_bn, name, sort_order, division_id, divisions(name_bn)')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  const classMap = useMemo(() => {
    const map: Record<string, { label: string; sort_order: number | null; serial: number | null }> = {};
    classes.forEach((c: any) => {
      const label = c.name_bn || c.name || '';
      map[c.id] = { label, sort_order: c.sort_order ?? null, serial: extractClassSerial(label) };
    });
    return map;
  }, [classes]);

  // Map fee_type_id -> session name
  const feeTypeSessionMap = useMemo(() => {
    const map: Record<string, string> = {};
    feeTypes.forEach((ft: any) => {
      if (ft.academic_sessions) {
        map[ft.id] = bn ? (ft.academic_sessions.name_bn || ft.academic_sessions.name) : ft.academic_sessions.name;
      }
    });
    return map;
  }, [feeTypes, bn]);

  const compareFeeItems = (a: any, b: any) => {
    const aClassId = a.students?.class_id || 'unknown';
    const bClassId = b.students?.class_id || 'unknown';
    const aLabel = a.students?.classes?.name_bn || classMap[aClassId]?.label || '';
    const bLabel = b.students?.classes?.name_bn || classMap[bClassId]?.label || '';
    const classComparison = compareAcademicOrder(
      { label: aLabel, sortOrder: a.students?.classes?.sort_order ?? classMap[aClassId]?.sort_order ?? null, serial: classMap[aClassId]?.serial ?? extractClassSerial(aLabel) },
      { label: bLabel, sortOrder: b.students?.classes?.sort_order ?? classMap[bClassId]?.sort_order ?? null, serial: classMap[bClassId]?.serial ?? extractClassSerial(bLabel) },
    );
    if (classComparison !== 0) return classComparison;
    const rollA = Number.parseInt(toEnglishDigits(String(a.students?.roll_number || '0')), 10) || 0;
    const rollB = Number.parseInt(toEnglishDigits(String(b.students?.roll_number || '0')), 10) || 0;
    if (rollA !== rollB) return rollA - rollB;
    return (a.students?.name_bn || '').localeCompare(b.students?.name_bn || '', 'bn', { numeric: true, sensitivity: 'base' });
  };

  // Build groups
  const enrichedGroups = useMemo(() => {
    const groups: Record<string, GroupItem> = {};
    const now0 = new Date();
    const currentMonthIdx = now0.getMonth();

    if (category === 'monthly') {
      const curMIdx = currentMonthIdx;
      const validSessionMonths = new Set<string>();
      feeTypes.forEach((ft: any) => {
        if (ft.payment_frequency !== 'monthly') return;
        let startM = 0, endM = 11;
        if (ft.academic_sessions?.start_date) startM = new Date(ft.academic_sessions.start_date).getMonth();
        if (ft.academic_sessions?.end_date) endM = new Date(ft.academic_sessions.end_date).getMonth();
        const indices: number[] = [];
        if (startM <= endM) { for (let i = startM; i <= endM; i++) indices.push(i); }
        else { for (let i = startM; i < 12; i++) indices.push(i); for (let i = 0; i <= endM; i++) indices.push(i); }
        const curPos = indices.indexOf(curMIdx);
        const running = curPos >= 0 ? indices.slice(0, curPos + 1) : indices.filter(i => i >= startM && i <= curMIdx);
        running.forEach(i => validSessionMonths.add(MONTHS_EN[i]));
      });

      payments.forEach((p: any) => {
        const monthKey = p.month || 'N/A';
        if (validSessionMonths.size > 0 && !validSessionMonths.has(monthKey)) return;
        const monthLabel = bn ? (MONTHS_BN[monthKey] || monthKey) : monthKey;
        const sortIdx = MONTHS_EN.indexOf(monthKey);
        if (!groups[monthKey]) groups[monthKey] = { label: monthLabel, sortOrder: sortIdx >= 0 ? sortIdx : 999, serial: null, total: 0, paid: [], unpaid: [] };
        const amount = p.paid_amount || p.amount || 0;
        if (p.status === 'paid' || p.status === 'pending') {
          groups[monthKey].paid.push(p);
          groups[monthKey].total += Number(amount);
        }
      });

      feeTypes.forEach((ft: any) => {
        if (ft.payment_frequency !== 'monthly') return;
        let sessionStartMonth = 0, sessionEndMonth = 11;
        if (ft.academic_sessions?.start_date) sessionStartMonth = new Date(ft.academic_sessions.start_date).getMonth();
        if (ft.academic_sessions?.end_date) sessionEndMonth = new Date(ft.academic_sessions.end_date).getMonth();

        const applicableStudents = students.filter((s: any) => {
          if (s.is_free) return false;
          if (ft.division_id && ft.division_id !== s.division_id) return false;
          if (ft.class_id && ft.class_id !== s.class_id) return false;
          if (ft.session_id && ft.session_id !== s.session_id) return false;
          return true;
        });

        const applicableMonths: string[] = ft.applicable_months && Array.isArray(ft.applicable_months) ? (ft.applicable_months as string[]) : MONTHS_EN;
        const monthIndices: number[] = [];
        if (sessionStartMonth <= sessionEndMonth) { for (let mi = sessionStartMonth; mi <= sessionEndMonth; mi++) monthIndices.push(mi); }
        else { for (let mi = sessionStartMonth; mi < 12; mi++) monthIndices.push(mi); for (let mi = 0; mi <= sessionEndMonth; mi++) monthIndices.push(mi); }
        const currentPos = monthIndices.indexOf(currentMonthIdx);
        const runningMonths = currentPos >= 0 ? monthIndices.slice(0, currentPos + 1) : monthIndices.filter(mi => mi <= currentMonthIdx && mi >= sessionStartMonth);

        runningMonths.forEach((mi) => {
          const monthName = MONTHS_EN[mi];
          if (!applicableMonths.includes(monthName)) return;
          const monthLabel = bn ? (MONTHS_BN[monthName] || monthName) : monthName;
          if (!groups[monthName]) groups[monthName] = { label: monthLabel, sortOrder: monthIndices.indexOf(mi), serial: null, total: 0, paid: [], unpaid: [] };
          const paidForMonth = new Set(
            payments.filter((p: any) => p.fee_type_id === ft.id && p.month === monthName && (p.status === 'paid' || p.status === 'pending')).map((p: any) => p.student_id)
          );
          applicableStudents.forEach((s: any) => {
            if (s.deleted_at) return;
            // Respect student's admission date: if this running month is before their admission date, skip!
            if (s.admission_date) {
              const admDate = new Date(s.admission_date);
              const admMonthStart = new Date(admDate.getFullYear(), admDate.getMonth(), 1);
              const runningYear = ft.academic_sessions?.start_date ? new Date(ft.academic_sessions.start_date).getFullYear() : now0.getFullYear();
              const runningMonthStart = new Date(runningYear, mi, 1);
              if (runningMonthStart < admMonthStart) return;
            }

            if (!paidForMonth.has(s.id)) {
              const alreadyAdded = groups[monthName].unpaid.some((u: any) => u._studentId === s.id && u._feeTypeId === ft.id);
              if (!alreadyAdded) {
                groups[monthName].unpaid.push({
                  id: `unpaid-${s.id}-${ft.id}-${monthName}`, _studentId: s.id, _feeTypeId: ft.id,
                  students: s, fee_types: ft, amount: ft.amount, month: monthName, status: 'unpaid',
                  _sessionName: ft.academic_sessions ? (bn ? ft.academic_sessions.name_bn || ft.academic_sessions.name : ft.academic_sessions.name) : '',
                });
              }
            }
          });
        });
      });
    } else {
      payments.forEach((p: any) => {
        const classId = p.students?.class_id || 'unknown';
        const className = p?.students?.classes?.name_bn || (bn ? 'অনির্ধারিত' : 'Unassigned');
        const classInfo = classMap[classId];
        if (!groups[classId]) groups[classId] = { label: className, sortOrder: classInfo?.sort_order ?? null, serial: classInfo?.serial ?? extractClassSerial(className), total: 0, paid: [], unpaid: [] };
        const amount = p.paid_amount || p.amount || 0;
        if (p.status === 'paid' || p.status === 'pending') { groups[classId].paid.push(p); groups[classId].total += Number(amount); }
      });

      feeTypes.forEach((ft: any) => {
        if (ft.payment_frequency === 'monthly') return;
        // If applicable_months is set, only show as due/unpaid if the month has arrived
        if (Array.isArray(ft.applicable_months) && ft.applicable_months.length > 0) {
          const hasReached = ft.applicable_months.some((m: string) => {
            const mName = m.split('-')[0];
            const idx = MONTHS_EN.indexOf(mName);
            return idx >= 0 && idx <= currentMonthIdx;
          });
          if (!hasReached) return;
        }
        const applicableStudents = students.filter((s: any) => {
          if (s.is_free) return false;
          if (ft.division_id && ft.division_id !== s.division_id) return false;
          if (ft.class_id && ft.class_id !== s.class_id) return false;
          if (ft.session_id && ft.session_id !== s.session_id) return false;
          return true;
        });
        const paidStudentIds = new Set(
          payments.filter((p: any) => p.fee_type_id === ft.id && (p.status === 'paid' || p.status === 'pending')).map((p: any) => p.student_id)
        );

        applicableStudents.forEach((s: any) => {
          if (!paidStudentIds.has(s.id)) {
            const classId = s.class_id || 'unknown';
            const className = s.classes?.name_bn || (bn ? 'অনির্ধারিত' : 'Unassigned');
            const classInfo = classMap[classId];
            if (!groups[classId]) groups[classId] = { label: className, sortOrder: classInfo?.sort_order ?? null, serial: classInfo?.serial ?? extractClassSerial(className), total: 0, paid: [], unpaid: [] };
            const alreadyAdded = groups[classId].unpaid.some((u: any) => u._studentId === s.id && u._feeTypeId === ft.id);
            if (!alreadyAdded) {
              groups[classId].unpaid.push({
                id: `unpaid-${s.id}-${ft.id}`, _studentId: s.id, _feeTypeId: ft.id,
                students: s, fee_types: ft, amount: ft.amount, status: 'unpaid',
                _sessionName: ft.academic_sessions ? (bn ? ft.academic_sessions.name_bn || ft.academic_sessions.name : ft.academic_sessions.name) : '',
              });
            }
          }
        });
      });
    }

    const values = Object.values(groups);
    if (category === 'monthly') return values.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    return values.sort((a, b) => compareAcademicOrder(a, b));
  }, [payments, feeTypes, students, category, bn, classMap, MONTHS_EN, MONTHS_BN]);

  const totalAmount = enrichedGroups.reduce((s, g) => s + g.total, 0);
  const totalUnpaid = enrichedGroups.reduce((s, g) => s + g.unpaid.reduce((ss: number, u: any) => ss + (u.amount || 0), 0), 0);
  const totalExpected = totalAmount + totalUnpaid;
  const totalPaidCount = enrichedGroups.reduce((s, g) => s + g.paid.length, 0);
  const totalUnpaidCount = enrichedGroups.reduce((s, g) => s + g.unpaid.length, 0);
  const collectionPercent = totalExpected > 0 ? Math.round((totalAmount / totalExpected) * 100) : 0;

  // For monthly category: build per-class monthly breakdown
  const classMonthlyBreakdown = useMemo(() => {
    if (category !== 'monthly') return null;
    // For non-monthly (admission/exam), we show class-wise month table inside expansion
    // For monthly, group by class → then show month-wise summary per class
    const classGroups: Record<string, {
      label: string; sortOrder: number | null; serial: number | null;
      months: Record<string, { paidCount: number; paidAmount: number; unpaidCount: number; unpaidAmount: number }>;
      totalPaid: number; totalUnpaid: number; totalPaidCount: number; totalUnpaidCount: number;
    }> = {};

    // Collect all months from enrichedGroups
    const allMonths = enrichedGroups.map(g => {
      // Find the English month key
      const enKey = Object.entries(MONTHS_BN).find(([, v]) => v === g.label)?.[0] || g.label;
      return { key: enKey, label: g.label, sortOrder: g.sortOrder };
    });

    // Process each group (month)
    enrichedGroups.forEach((g) => {
      const monthEnKey = Object.entries(MONTHS_BN).find(([, v]) => v === g.label)?.[0] || g.label;

      // Process paid
      g.paid.forEach((p: any) => {
        const classId = p.students?.class_id || 'unknown';
        const className = p.students?.classes?.name_bn || (bn ? 'অনির্ধারিত' : 'Unassigned');
        const ci = classMap[classId];
        if (!classGroups[classId]) {
          classGroups[classId] = {
            label: className, sortOrder: ci?.sort_order ?? null, serial: ci?.serial ?? extractClassSerial(className),
            months: {}, totalPaid: 0, totalUnpaid: 0, totalPaidCount: 0, totalUnpaidCount: 0,
          };
        }
        if (!classGroups[classId].months[monthEnKey]) classGroups[classId].months[monthEnKey] = { paidCount: 0, paidAmount: 0, unpaidCount: 0, unpaidAmount: 0 };
        classGroups[classId].months[monthEnKey].paidCount++;
        classGroups[classId].months[monthEnKey].paidAmount += Number(p.paid_amount || p.amount || 0);
        classGroups[classId].totalPaid += Number(p.paid_amount || p.amount || 0);
        classGroups[classId].totalPaidCount++;
      });

      // Process unpaid
      g.unpaid.forEach((u: any) => {
        const classId = u.students?.class_id || 'unknown';
        const className = u.students?.classes?.name_bn || (bn ? 'অনির্ধারিত' : 'Unassigned');
        const ci = classMap[classId];
        if (!classGroups[classId]) {
          classGroups[classId] = {
            label: className, sortOrder: ci?.sort_order ?? null, serial: ci?.serial ?? extractClassSerial(className),
            months: {}, totalPaid: 0, totalUnpaid: 0, totalPaidCount: 0, totalUnpaidCount: 0,
          };
        }
        if (!classGroups[classId].months[monthEnKey]) classGroups[classId].months[monthEnKey] = { paidCount: 0, paidAmount: 0, unpaidCount: 0, unpaidAmount: 0 };
        classGroups[classId].months[monthEnKey].unpaidCount++;
        classGroups[classId].months[monthEnKey].unpaidAmount += Number(u.amount || 0);
        classGroups[classId].totalUnpaid += Number(u.amount || 0);
        classGroups[classId].totalUnpaidCount++;
      });
    });

    const sortedClasses = Object.entries(classGroups)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => compareAcademicOrder(a, b));

    return { allMonths, classes: sortedClasses };
  }, [category, enrichedGroups, classMap, bn, MONTHS_BN]);

  const openDetailedReport = (monthKey: string) => {
    // Find the group matching this month
    const group = enrichedGroups.find(g => {
      const enKey = Object.entries(MONTHS_BN).find(([, v]) => v === g.label)?.[0] || g.label;
      return enKey === monthKey;
    });
    if (group) {
      setSelectedGroup(group);
      setListType('unpaid');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedGroup) return;
    const list = listType === 'paid' ? selectedGroup.paid : selectedGroup.unpaid;
    const sorted = [...list].sort(compareFeeItems);

    printWindow.document.write(`<html><head><title>Print</title><style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><style>
      body{font-family:'SutonnyOMJ',Arial,sans-serif;padding:20px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
      th{background:#f5f5f5}
      h2{margin:0}
      .session-tag{display:inline-block;background:#059669;color:#fff;padding:3px 10px;border-radius:999px;font-size:12px;margin-left:8px;font-family:Arial,sans-serif}
    </style></head><body>
      <h2>${bn ? titleBn : titleEn} - ${selectedGroup.label} ${selectedSession ? `<span class="session-tag">${bn ? 'সেশন: ' : 'Session: '}${bn ? (selectedSession.name_bn || selectedSession.name) : selectedSession.name}</span>` : ''}</h2>
      <p>${listType === 'paid' ? (bn ? 'পরিশোধিত তালিকা' : 'Paid List') : (bn ? 'অপরিশোধিত তালিকা' : 'Unpaid List')}</p>
      <table><thead><tr>
        <th>#</th><th>${bn ? 'নাম' : 'Name'}</th><th>${bn ? 'রোল' : 'Roll'}</th>
        <th>${bn ? 'শ্রেণী' : 'Class'}</th>
        ${category === 'monthly' ? `<th>${bn ? 'মাস' : 'Month'}</th>` : ''}
        <th>${bn ? 'সেশন' : 'Year'}</th>
        <th>${listType === 'paid' ? (bn ? 'পরিশোধিত' : 'Paid') : (bn ? 'বকেয়া' : 'Due')}</th>
      </tr></thead><tbody>
      ${sorted.map((p: any, i: number) => `<tr>
        <td>${i + 1}</td>
        <td>${p.students?.name_bn || '-'}</td>
        <td>${p.students?.roll_number || '-'}</td>
        <td>${p.students?.classes?.name_bn || '-'}</td>
        ${category === 'monthly' ? `<td>${p.month || '-'}</td>` : ''}
        <td>${p._sessionName || feeTypeSessionMap[p.fee_type_id] || p.year || '-'}</td>
        <td>${listType === 'paid' ? `৳${p.paid_amount || p.amount}` : `৳${p.amount || 0}`}</td>
      </tr>`).join('')}
      </tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadCSV = () => {
    if (!selectedGroup) return;
    const list = listType === 'paid' ? selectedGroup.paid : selectedGroup.unpaid;
    const sorted = [...list].sort(compareFeeItems);
    const headers = [bn ? 'নাম' : 'Name', bn ? 'রোল' : 'Roll', bn ? 'শ্রেণী' : 'Class', bn ? 'সেশন' : 'Year', listType === 'paid' ? (bn ? 'পরিশোধিত' : 'Amount') : (bn ? 'বকেয়া' : 'Due')];
    const rows = sorted.map((p: any) => [p.students?.name_bn || '-', p.students?.roll_number || '-', p.students?.classes?.name_bn || '-', p._sessionName || feeTypeSessionMap[p.fee_type_id] || p.year || '-', listType === 'paid' ? (p.paid_amount || p.amount) : (p.amount || 0)]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}_${selectedGroup.label}_${listType}.csv`;
    a.click();
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center justify-between hover:bg-accent/20 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            {icon || <CreditCard className="w-6 h-6 text-primary" />}
          </div>
          <div className="text-left">
            <h3 className="font-display font-bold text-foreground text-lg">{bn ? titleBn : titleEn}</h3>
            {sessionLabel && <span className="text-sm text-muted-foreground">{sessionLabel}</span>}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-xl font-bold text-primary">
              <span className="text-2xl">৳</span> {totalAmount.toLocaleString()}
            </div>
            <div className="flex items-center gap-4 text-sm mt-1">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">✓ {totalPaidCount} {bn ? 'জন' : ''}</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">✗ {totalUnpaidCount} {bn ? 'জন' : ''} (<span className="font-bold">৳{totalUnpaid.toLocaleString()}</span>)</span>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-6 h-6 text-muted-foreground" /> : <ChevronDown className="w-6 h-6 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {enrichedGroups.length === 0 && (
            <p className="text-base text-muted-foreground text-center py-6">{bn ? 'কোনো রেকর্ড নেই' : 'No records'}</p>
          )}

          {/* ========== MONTHLY: Show class-wise with month breakdown table ========== */}
          {category === 'monthly' && classMonthlyBreakdown && classMonthlyBreakdown.classes.length > 0 && (
            <div className="space-y-4">
              {classMonthlyBreakdown.classes.map((cls) => {
                const clsExpected = cls.totalPaid + cls.totalUnpaid;
                const clsPercent = clsExpected > 0 ? Math.round((cls.totalPaid / clsExpected) * 100) : 0;
                return (
                  <div key={cls.id} className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-lg overflow-hidden" style={{ boxShadow: 'var(--shadow-soft)' }}>
                    {/* Class header */}
                    <div className="p-5 flex items-center justify-between">
                      <span className="text-base font-bold text-foreground">{cls.label}</span>
                      <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base">
                            <span className="text-lg">৳</span>{cls.totalPaid.toLocaleString()}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span></span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
                            <span className="text-lg">৳</span>{cls.totalUnpaid.toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Month-wise summary table */}
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse', borderSpacing: '0' }}>
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="px-6 py-4 text-left text-sm font-bold text-foreground">{bn ? 'মাস' : 'Month'}</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-emerald-700 dark:text-emerald-400">{bn ? 'পরিশোধিত' : 'Paid'}</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-rose-600 dark:text-rose-400">{bn ? 'বকেয়া' : 'Due'}</th>
                            <th className="px-6 py-4 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {classMonthlyBreakdown.allMonths.map((m, mIdx) => {
                            const md = cls.months[m.key];
                            if (!md) return null;
                            return (
                              <tr key={m.key} className={`hover:bg-primary/[0.04] transition-all duration-200 ${mIdx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                                <td className="px-6 py-5 text-base font-semibold text-foreground">{m.label}</td>
                                <td className="px-6 py-5 text-right">
                                  <span className="inline-flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-base">{md.paidCount} {bn ? 'জন' : ''}</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold text-base">· <span className="text-lg">৳</span>{md.paidAmount.toLocaleString()}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <span className="inline-flex items-center gap-2">
                                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold text-base">{md.unpaidCount} {bn ? 'জন' : ''}</span>
                                    <span className="text-rose-600 dark:text-rose-400 font-bold text-base">· <span className="text-lg">৳</span>{md.unpaidAmount.toLocaleString()}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  {md.unpaidCount > 0 && (
                                    <button
                                      onClick={() => openDetailedReport(m.key)}
                                      className="text-xs px-4 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors font-semibold"
                                    >
                                      {bn ? 'বিস্তারিত' : 'Details'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Class summary pills */}
                    <div className="px-6 py-4 bg-muted/20 border-t border-border/30 flex flex-wrap items-center gap-6 text-sm">
                      <span className="text-muted-foreground font-medium">{bn ? 'মোট সম্ভাব্য:' : 'Expected:'} <span className="font-bold text-foreground text-base"><span className="text-lg">৳</span>{clsExpected.toLocaleString()}</span></span>
                      <span className="text-muted-foreground font-medium">{bn ? 'সংগৃহীত:' : 'Collected:'} <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base"><span className="text-lg">৳</span>{cls.totalPaid.toLocaleString()}</span></span>
                      <span className="text-muted-foreground font-medium">{bn ? 'বকেয়া:' : 'Due:'} <span className="font-bold text-rose-600 dark:text-rose-400 text-base"><span className="text-lg">৳</span>{cls.totalUnpaid.toLocaleString()}</span></span>
                      <div className="flex items-center gap-2 ml-auto">
                        <Progress value={clsPercent} className="w-24 h-2" />
                        <span className="font-bold text-foreground text-sm">{clsPercent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========== NON-MONTHLY (admission/exam): Show class-wise rows ========== */}
          {category !== 'monthly' && enrichedGroups.map((g, i) => {
            const unpaidAmt = g.unpaid.reduce((s: number, u: any) => s + (u.amount || 0), 0);
            return (
              <div key={i}
                onClick={() => setSelectedGroup(g)}
                className={`flex items-center justify-between p-5 rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300 cursor-pointer group ${i % 2 === 1 ? 'bg-muted/10' : 'bg-card/50'}`}
                style={{ boxShadow: 'var(--shadow-soft)' }}>
                <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{g.label}</span>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400">{g.paid.length} {bn ? 'জন' : ''} · <span className="font-bold text-lg">৳</span><span className="font-bold">{g.total.toLocaleString()}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span></span>
                    <span className="text-base font-semibold text-rose-600 dark:text-rose-400">{g.unpaid.length} {bn ? 'জন' : ''} · <span className="font-bold text-lg">৳</span><span className="font-bold">{unpaidAmt.toLocaleString()}</span></span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedGroup(g); setListType('unpaid'); }}
                    className="text-xs px-4 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5 inline mr-1" />{bn ? 'রিপোর্ট' : 'Report'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* ========== FINANCIAL SUMMARY PILLS ========== */}
          <div className="rounded-2xl border border-border/40 bg-gradient-to-r from-muted/40 to-muted/20 p-5 space-y-3" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">{bn ? 'মোট সম্ভাব্য আদায়:' : 'Expected Total:'}</span>
                <span className="font-bold text-foreground text-lg"><span className="text-xl">৳</span>{totalExpected.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">{bn ? 'মোট সংগৃহীত:' : 'Total Collected:'}</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-lg"><span className="text-xl">৳</span>{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">{bn ? 'মোট বকেয়া:' : 'Total Outstanding:'}</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-lg"><span className="text-xl">৳</span>{totalUnpaid.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={collectionPercent} className="flex-1 h-2.5" />
              <span className="text-sm font-bold text-foreground min-w-[40px] text-right">{collectionPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 flex-wrap">
              <span>{bn ? titleBn : titleEn} - {selectedGroup?.label}</span>
              {selectedSession && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-600 text-white font-semibold">
                  {bn ? 'সেশন: ' : 'Session: '}{bn ? (selectedSession.name_bn || selectedSession.name) : selectedSession.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setListType('paid')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${listType === 'paid' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
              {bn ? 'পরিশোধিত' : 'Paid'} ({selectedGroup?.paid?.length || 0})
            </button>
            <button onClick={() => setListType('unpaid')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${listType === 'unpaid' ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
              {bn ? 'অপরিশোধিত' : 'Unpaid'} ({selectedGroup?.unpaid?.length || 0})
            </button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />{bn ? 'প্রিন্ট' : 'Print'}</Button>
              <Button size="sm" variant="outline" onClick={handleDownloadCSV}><Download className="w-4 h-4 mr-1" />{bn ? 'ডাউনলোড' : 'Download'}</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', borderSpacing: '0' }}>
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-bold text-foreground">#</th>
                  <th className="px-5 py-4 text-left text-sm font-bold text-foreground">{bn ? 'নাম' : 'Name'}</th>
                  <th className="px-5 py-4 text-left text-sm font-bold text-foreground">{bn ? 'রোল' : 'Roll'}</th>
                  <th className="px-5 py-4 text-left text-sm font-bold text-foreground">{bn ? 'শ্রেণী' : 'Class'}</th>
                  {category === 'monthly' && <th className="px-5 py-4 text-left text-sm font-bold text-foreground">{bn ? 'মাস' : 'Month'}</th>}
                  {category === 'exam' && <th className="px-5 py-4 text-left text-sm font-bold text-foreground">{bn ? 'পরীক্ষা সেশন' : 'Exam Session'}</th>}
                  <th className="px-5 py-4 text-left text-sm font-bold text-foreground">{bn ? 'সেশন' : 'Year'}</th>
                  <th className="px-5 py-4 text-left text-sm font-bold text-foreground">{listType === 'paid' ? (bn ? 'পরিশোধিত' : 'Amount') : (bn ? 'বকেয়া' : 'Due')}</th>
                </tr>
              </thead>
              <tbody>
                {((() => {
                  const list = listType === 'paid' ? (selectedGroup?.paid || []) : (selectedGroup?.unpaid || []);
                  return [...list].sort(compareFeeItems);
                })()).map((p: any, i: number) => (
                  <tr key={p.id} className={`hover:bg-primary/[0.04] transition-all duration-200 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                    <td className="px-5 py-4 text-base text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-4 text-base font-semibold text-foreground">{p.students?.name_bn || '-'}</td>
                    <td className="px-5 py-4 text-base text-muted-foreground">{p.students?.roll_number || '-'}</td>
                    <td className="px-5 py-4 text-base text-muted-foreground">{p.students?.classes?.name_bn || '-'}</td>
                    {category === 'monthly' && <td className="px-5 py-4 text-base text-muted-foreground">{p.month || '-'}</td>}
                    {category === 'exam' && <td className="px-5 py-4 text-base text-muted-foreground">{p.fee_types?.name_bn || '-'}</td>}
                    <td className="px-5 py-4 text-base text-muted-foreground">{p._sessionName || feeTypeSessionMap[p.fee_type_id] || p.year || '-'}</td>
                    <td className="px-5 py-4">
                      {listType === 'paid' ? (
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base"><span className="text-lg">৳</span> {p.paid_amount || p.amount}</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"><span className="text-base">৳</span> {p.amount || 0}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {((listType === 'paid' ? selectedGroup?.paid : selectedGroup?.unpaid) || []).length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-base text-muted-foreground">{bn ? 'কোনো রেকর্ড নেই' : 'No records'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardFeeSection;
