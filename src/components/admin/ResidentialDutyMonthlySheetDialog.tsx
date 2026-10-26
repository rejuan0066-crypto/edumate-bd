import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Download, Printer, Search, Calendar, Sun, Moon, Users, CheckCircle2,
  XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import XLSX from 'xlsx-js-style';
import { useAppTimezone } from '@/hooks/useAppTimezone';
import { getDatePartsInTz } from '@/lib/timezone';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { sortStaffByDepartment } from '@/lib/staffOrderHelper';
import { formatStaffName } from '@/lib/nameFormatter';
import { downloadSheetAsPdf } from '@/lib/salarySlipPdf';
import { useResignedStaff } from '@/hooks/useResignedStaff';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMonth?: string; // '01' - '12'
  initialYear?: string;  // 'YYYY'
}

const MONTHS = [
  { value: '01', bn: 'জানুয়ারি', en: 'January' },
  { value: '02', bn: 'ফেব্রুয়ারি', en: 'February' },
  { value: '03', bn: 'মার্চ', en: 'March' },
  { value: '04', bn: 'এপ্রিল', en: 'April' },
  { value: '05', bn: 'মে', en: 'May' },
  { value: '06', bn: 'জুন', en: 'June' },
  { value: '07', bn: 'জুলাই', en: 'July' },
  { value: '08', bn: 'আগস্ট', en: 'August' },
  { value: '09', bn: 'সেপ্টেম্বর', en: 'September' },
  { value: '10', bn: 'অক্টোবর', en: 'October' },
  { value: '11', bn: 'নভেম্বর', en: 'November' },
  { value: '12', bn: 'ডিসেম্বর', en: 'December' },
];

const WEEKDAY_NAMES_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const WEEKDAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Convert digits to Bengali
const toBnDigits = (val: string | number): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, d => bnDigits[parseInt(d)]);
};

export default function ResidentialDutyMonthlySheetDialog({
  open,
  onOpenChange,
  initialMonth,
  initialYear,
}: Props) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { tz: appTz } = useAppTimezone();
  const currentTzParts = getDatePartsInTz(new Date(), appTz);
  const { data: instInfo } = useInstitutionInfo();

  const [selectedYear, setSelectedYear] = useState<string>(initialYear || String(currentTzParts.year));
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonth || String(currentTzParts.month + 1).padStart(2, '0')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const monthYearStr = `${selectedYear}-${selectedMonth}`;
  const daysInMonth = useMemo(() => {
    const y = parseInt(selectedYear, 10);
    const m = parseInt(selectedMonth, 10);
    return new Date(y, m, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Array of days for the selected month [1, 2, ..., daysInMonth]
  const daysList = useMemo(() => {
    const y = parseInt(selectedYear, 10);
    const m = parseInt(selectedMonth, 10) - 1;
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateObj = new Date(y, m, dayNum);
      const isoDate = `${selectedYear}-${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
      const weekday = dateObj.getDay();
      return {
        dayNum,
        isoDate,
        weekday,
        weekdayBn: WEEKDAY_NAMES_BN[weekday],
        weekdayEn: WEEKDAY_NAMES_EN[weekday],
        isFriday: weekday === 5,
      };
    });
  }, [selectedYear, selectedMonth, daysInMonth]);

  // 1. Fetch duty shifts
  const { data: dutyShifts = [] } = useQuery({
    queryKey: ['duty-shifts-monthly'],
    queryFn: async () => {
      const { data } = await supabase
        .from('duty_shifts')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      return (data || []) as any[];
    },
    enabled: open,
  });

  const morningShift = useMemo(() => dutyShifts.find((s: any) => s.code === 'morning'), [dutyShifts]);
  const eveningShift = useMemo(() => dutyShifts.find((s: any) => s.code === 'evening'), [dutyShifts]);

  const { isResignedOnDate, getResignDate } = useResignedStaff();

  // 2. Fetch all staff
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-for-duty-monthly'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, designation, department, staff_category, status, residence_type, salary_order')
        .eq('status', 'active')
        .is('deleted_at', null);
      return sortStaffByDepartment((data || []) as any[], { deduplicate: true });
    },
    enabled: open,
  });

  // 3. Fetch duty templates (weekly recurring)
  const { data: dutyTemplates = [] } = useQuery({
    queryKey: ['duty-weekly-templates-monthly'],
    queryFn: async () => {
      const { data } = await supabase
        .from('duty_weekly_template')
        .select('staff_id, shift_id, weekday')
        .eq('is_active', true);
      return (data || []) as any[];
    },
    enabled: open,
  });

  // 4. Fetch duty roster overrides for the entire selected month
  const { data: dutyRosters = [] } = useQuery({
    queryKey: ['duty-roster-month', monthYearStr],
    queryFn: async () => {
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endDate = `${selectedYear}-${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;
      const { data } = await supabase
        .from('duty_roster')
        .select('staff_id, shift_id, duty_date')
        .gte('duty_date', startDate)
        .lte('duty_date', endDate);
      return (data || []) as any[];
    },
    enabled: open,
  });

  // 5. Fetch all staff attendance records for morning & evening in this month
  const { data: attendanceRecords = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['duty-attendance-month', monthYearStr],
    queryFn: async () => {
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endDate = `${selectedYear}-${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('entity_type', 'staff')
        .in('shift', ['morning', 'evening'])
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: open,
  });

  // Helper map: check if staff was rostered on a given date for morning or evening
  // returns { morningRostered: boolean, eveningRostered: boolean }
  const rosterMap = useMemo(() => {
    const map = new Map<string, { morning: boolean; evening: boolean }>();
    if (!morningShift && !eveningShift) return map;

    daysList.forEach(day => {
      const date = day.isoDate;
      const weekday = day.weekday;
      const dayOverrides = (dutyRosters as any[]).filter(r => r.duty_date === date);
      const overriddenStaff = new Set(dayOverrides.map(r => r.staff_id));

      staffList.forEach(st => {
        const key = `${st.id}_${date}`;
        let morning = false;
        let evening = false;

        // Check override first
        if (overriddenStaff.has(st.id)) {
          morning = dayOverrides.some(r => r.staff_id === st.id && r.shift_id === morningShift?.id);
          evening = dayOverrides.some(r => r.staff_id === st.id && r.shift_id === eveningShift?.id);
        } else {
          // Template fallback
          morning = (dutyTemplates as any[]).some(
            t => t.staff_id === st.id && t.weekday === weekday && t.shift_id === morningShift?.id
          );
          evening = (dutyTemplates as any[]).some(
            t => t.staff_id === st.id && t.weekday === weekday && t.shift_id === eveningShift?.id
          );
        }

        if (morning || evening) {
          map.set(key, { morning, evening });
        }
      });
    });

    return map;
  }, [daysList, dutyRosters, dutyTemplates, staffList, morningShift, eveningShift]);

  // Attendance lookup: Map<`${staff_id}_${date}_${shift}`, record>
  const attMap = useMemo(() => {
    const map = new Map<string, any>();
    attendanceRecords.forEach(att => {
      map.set(`${att.entity_id}_${att.attendance_date}_${att.shift}`, att);
    });
    return map;
  }, [attendanceRecords]);

  const monthEndDate = useMemo(() => {
    return `${selectedYear}-${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth, daysInMonth]);

  // Filter staff: only include active, non-resigned staff who have at least 1 duty rostered or 1 attendance record in this month
  const rosteredStaffList = useMemo(() => {
    return staffList.filter(st => {
      // Must be active and not resigned
      if (st.status && st.status !== 'active') return false;
      const isResigned = isResignedOnDate(st.id, monthEndDate) || !!getResignDate(st.id);
      if (isResigned) return false;

      // Check if st has any roster in this month
      let hasRosterOrAtt = false;
      for (const day of daysList) {
        const r = rosterMap.get(`${st.id}_${day.isoDate}`);
        if (r && (r.morning || r.evening)) {
          hasRosterOrAtt = true;
          break;
        }
        if (attMap.has(`${st.id}_${day.isoDate}_morning`) || attMap.has(`${st.id}_${day.isoDate}_evening`)) {
          hasRosterOrAtt = true;
          break;
        }
      }
      return hasRosterOrAtt;
    });
  }, [staffList, daysList, rosterMap, attMap, isResignedOnDate, getResignDate, monthEndDate]);

  // Filtered by search query
  const filteredStaff = useMemo(() => {
    let list = rosteredStaffList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        st =>
          (st.name_bn && st.name_bn.toLowerCase().includes(q)) ||
          (st.name_en && st.name_en.toLowerCase().includes(q)) ||
          (st.designation && st.designation.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rosteredStaffList, searchQuery]);

  // Per-staff summary stats
  const staffStats = useMemo(() => {
    const stats = new Map<string, {
      morningRostered: number;
      morningPresent: number;
      morningAbsent: number;
      morningLate: number;
      eveningRostered: number;
      eveningPresent: number;
      eveningAbsent: number;
      eveningLate: number;
      totalPresent: number;
      totalRostered: number;
    }>();

    filteredStaff.forEach(st => {
      let mRostered = 0, mPres = 0, mAbs = 0, mLate = 0;
      let eRostered = 0, ePres = 0, eAbs = 0, eLate = 0;

      daysList.forEach(day => {
        const r = rosterMap.get(`${st.id}_${day.isoDate}`);
        const mAtt = attMap.get(`${st.id}_${day.isoDate}_morning`);
        const eAtt = attMap.get(`${st.id}_${day.isoDate}_evening`);

        if (r?.morning || mAtt) {
          mRostered++;
          if (mAtt?.status === 'present') mPres++;
          else if (mAtt?.status === 'late') { mPres++; mLate++; }
          else if (mAtt?.status === 'absent') mAbs++;
        }

        if (r?.evening || eAtt) {
          eRostered++;
          if (eAtt?.status === 'present') ePres++;
          else if (eAtt?.status === 'late') { ePres++; eLate++; }
          else if (eAtt?.status === 'absent') eAbs++;
        }
      });

      stats.set(st.id, {
        morningRostered: mRostered,
        morningPresent: mPres,
        morningAbsent: mAbs,
        morningLate: mLate,
        eveningRostered: eRostered,
        eveningPresent: ePres,
        eveningAbsent: eAbs,
        eveningLate: eLate,
        totalPresent: mPres + ePres,
        totalRostered: mRostered + eRostered,
      });
    });

    return stats;
  }, [filteredStaff, daysList, rosterMap, attMap]);

  // Overall totals
  const overallTotals = useMemo(() => {
    let totalMorningPres = 0, totalMorningRostered = 0;
    let totalEveningPres = 0, totalEveningRostered = 0;

    staffStats.forEach(st => {
      totalMorningPres += st.morningPresent;
      totalMorningRostered += st.morningRostered;
      totalEveningPres += st.eveningPresent;
      totalEveningRostered += st.eveningRostered;
    });

    return {
      staffCount: filteredStaff.length,
      morningPres: totalMorningPres,
      morningRostered: totalMorningRostered,
      eveningPres: totalEveningPres,
      eveningRostered: totalEveningRostered,
      totalPres: totalMorningPres + totalEveningPres,
      totalRostered: totalMorningRostered + totalEveningRostered,
    };
  }, [filteredStaff, staffStats]);

  // Status renderer badge
  const renderStatusBadge = (att: any, isRostered: boolean) => {
    if (!isRostered && !att) {
      return <span className="text-muted-foreground/20 text-[10px] select-none">·</span>;
    }
    if (!att) {
      return (
        <span className="text-[10px] font-bold text-muted-foreground/50 bg-muted/40 px-1 py-0.5 rounded" title={bn ? 'হাজিরা দেওয়া হয়নি' : 'Unmarked'}>
          —
        </span>
      );
    }

    const s = att.status;
    if (s === 'present') {
      return (
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1 py-0.2 rounded" title={bn ? 'উপস্থিত' : 'Present'}>
          P
        </span>
      );
    }
    if (s === 'absent') {
      return (
        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/20 border border-rose-500/30 px-1 py-0.2 rounded" title={bn ? 'অনুপস্থিত' : 'Absent'}>
          A
        </span>
      );
    }
    if (s === 'late') {
      return (
        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 rounded" title={bn ? 'বিলম্ব' : 'Late'}>
          L
        </span>
      );
    }
    if (s === 'half_day') {
      return (
        <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300 bg-orange-500/20 border border-orange-500/30 px-1 py-0.2 rounded" title={bn ? 'অর্ধদিন' : 'Half Day'}>
          H
        </span>
      );
    }
    if (s === 'leave') {
      return (
        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/20 border border-blue-500/30 px-1 py-0.2 rounded" title={bn ? 'ছুটি' : 'Leave'}>
          Lv
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1 py-0.2 rounded">
        {s?.slice(0, 1)?.toUpperCase() || '·'}
      </span>
    );
  };

  // Month navigation
  const handlePrevMonth = () => {
    let m = parseInt(selectedMonth, 10) - 1;
    let y = parseInt(selectedYear, 10);
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const handleNextMonth = () => {
    let m = parseInt(selectedMonth, 10) + 1;
    let y = parseInt(selectedYear, 10);
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const currentMonthLabel = (bn ? MONTHS.find(m => m.value === selectedMonth)?.bn : MONTHS.find(m => m.value === selectedMonth)?.en) || '';

  // ── Excel (.xlsx) Export ──
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const institutionName = instInfo?.name || 'মাদরাসা / প্রতিষ্ঠান';
      const sheetTitle = `${bn ? 'আবাসিক ডিউটি মাসিক হাজিরা শিট' : 'Residential Duty Monthly Attendance Sheet'} - ${currentMonthLabel} ${selectedYear}`;

      // Build header row: SL, Name, Designation, Day 1(M), Day 1(E), Day 2(M), Day 2(E)...
      const headers: string[] = [
        bn ? 'ক্রম' : 'SL',
        bn ? 'নাম' : 'Name',
        bn ? 'পদবী' : 'Designation',
      ];

      daysList.forEach(day => {
        headers.push(`${day.dayNum} ${day.weekdayBn} (${bn ? 'সকাল' : 'M'})`);
        headers.push(`${day.dayNum} ${day.weekdayBn} (${bn ? 'সন্ধ্যা' : 'E'})`);
      });

      headers.push(
        bn ? 'সকাল উপস্থিত' : 'Morning Present',
        bn ? 'সন্ধ্যা উপস্থিত' : 'Evening Present',
        bn ? 'সর্বমোট উপস্থিত' : 'Total Present',
        bn ? 'সর্বমোট রোস্টার' : 'Total Duty Days'
      );

      const rows: any[][] = [];
      // Row 1: Institution name
      rows.push([institutionName]);
      // Row 2: Title & Month
      rows.push([sheetTitle]);
      // Row 3: Empty spacer
      rows.push([]);
      // Row 4: Column headers
      rows.push(headers);

      // Staff rows
      filteredStaff.forEach((st, idx) => {
        const stats = staffStats.get(st.id);
        const row: any[] = [
          idx + 1,
          formatStaffName(st.name_bn, st.name_en, bn),
          st.designation || '-',
        ];

        daysList.forEach(day => {
          const r = rosterMap.get(`${st.id}_${day.isoDate}`);
          const mAtt = attMap.get(`${st.id}_${day.isoDate}_morning`);
          const eAtt = attMap.get(`${st.id}_${day.isoDate}_evening`);

          // Morning status string
          const mStatus = mAtt?.status ? mAtt.status.toUpperCase() : r?.morning ? (bn ? 'চিহ্নিত হয়নি' : 'Unmarked') : '—';
          // Evening status string
          const eStatus = eAtt?.status ? eAtt.status.toUpperCase() : r?.evening ? (bn ? 'চিহ্নিত হয়নি' : 'Unmarked') : '—';

          row.push(mStatus);
          row.push(eStatus);
        });

        row.push(
          stats?.morningPresent || 0,
          stats?.eveningPresent || 0,
          stats?.totalPresent || 0,
          stats?.totalRostered || 0
        );

        rows.push(row);
      });

      // Bottom totals row
      rows.push([]);
      const summaryRow: any[] = [
        bn ? 'মোট উপস্থিত' : 'Total Present',
        '',
        '',
      ];

      daysList.forEach(day => {
        let mPresCount = 0;
        let ePresCount = 0;
        filteredStaff.forEach(st => {
          const mAtt = attMap.get(`${st.id}_${day.isoDate}_morning`);
          const eAtt = attMap.get(`${st.id}_${day.isoDate}_evening`);
          if (mAtt?.status === 'present' || mAtt?.status === 'late') mPresCount++;
          if (eAtt?.status === 'present' || eAtt?.status === 'late') ePresCount++;
        });
        summaryRow.push(mPresCount);
        summaryRow.push(ePresCount);
      });

      summaryRow.push(
        overallTotals.morningPres,
        overallTotals.eveningPres,
        overallTotals.totalPres,
        overallTotals.totalRostered
      );
      rows.push(summaryRow);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Auto cell merges for title
      const totalCols = headers.length;
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Duty');
      const filename = `Residential_Duty_${selectedYear}_${selectedMonth}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(bn ? 'মাসিক ডিউটি এক্সেল ডাউনলোড হয়েছে!' : 'Monthly duty Excel downloaded!');
    } catch (err) {
      console.error(err);
      toast.error(bn ? 'এক্সেল তৈরি করতে ত্রুটি হয়েছে' : 'Failed to export Excel');
    }
  };

  // ── HTML generator for Print & PDF ──
  const generatePrintAndPdfHtml = () => {
    const institutionName = instInfo?.name || 'মাদরাসা / প্রতিষ্ঠান';
    const instNameEn = instInfo?.name_en || '';
    const instAddress = instInfo?.address || '';
    const instPhone = instInfo?.phone || '';
    const instEmail = instInfo?.email || '';
    const logoUrl = instInfo?.logo_url || '';
    const estYear = instInfo?.established_year ? (bn ? toBnDigits(instInfo.established_year) : instInfo.established_year) : '';
    const shiftLabel = shiftFilter === 'morning' ? ` (${bn ? 'সকাল শিফট' : 'Morning Shift'})` : shiftFilter === 'evening' ? ` (${bn ? 'সন্ধ্যা শিফট' : 'Evening Shift'})` : '';
    const title = `${bn ? 'আবাসিক ডিউটি মাসিক হাজিরা শিট' : 'Residential Duty Monthly Attendance Sheet'} — ${currentMonthLabel} ${selectedYear}${shiftLabel}`;

    const isAll = shiftFilter === 'all';
    const isMorningOnly = shiftFilter === 'morning';
    const isEveningOnly = shiftFilter === 'evening';

    let tableHeadersHtml = `
      <tr>
        <th ${isAll ? 'rowspan="2"' : ''} style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9;font-size:10px;width:28px;">#</th>
        <th ${isAll ? 'rowspan="2"' : ''} style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9;font-size:11px;min-width:120px;text-align:left;">${bn ? 'শিক্ষক/স্টাফের নাম' : 'Name'}</th>
        <th ${isAll ? 'rowspan="2"' : ''} style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9;font-size:10px;text-align:left;">${bn ? 'পদবী' : 'Designation'}</th>
    `;

    daysList.forEach(day => {
      tableHeadersHtml += `
        <th ${isAll ? 'colspan="2"' : ''} style="border:1px solid #cbd5e1;padding:3px 2px;background:${day.isFriday ? '#fee2e2' : '#f8fafc'};font-size:10px;text-align:center;">
          ${day.dayNum}<br/><span style="font-size:8.5px;color:#64748b;">${day.weekdayBn}</span>
        </th>
      `;
    });

    if (isAll) {
      tableHeadersHtml += `
          <th rowspan="2" style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9;font-size:10px;color:#059669;">${bn ? 'সকাল' : 'M'}</th>
          <th rowspan="2" style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9;font-size:10px;color:#0284c7;">${bn ? 'সন্ধ্যা' : 'E'}</th>
          <th rowspan="2" style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9;font-size:10px;font-weight:bold;">${bn ? 'মোট' : 'Tot'}</th>
        </tr>
        <tr>
      `;
      daysList.forEach(() => {
        tableHeadersHtml += `
          <th style="border:1px solid #cbd5e1;padding:2px;font-size:9px;color:#059669;text-align:center;">${bn ? 'স' : 'M'}</th>
          <th style="border:1px solid #cbd5e1;padding:2px;font-size:9px;color:#0284c7;text-align:center;">${bn ? 'ব' : 'E'}</th>
        `;
      });
      tableHeadersHtml += `</tr>`;
    } else {
      tableHeadersHtml += `
        <th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9;font-size:10px;font-weight:bold;text-align:center;">${bn ? 'মোট উপস্থিত' : 'Total'}</th>
      </tr>`;
    }

    let tableRowsHtml = '';
    filteredStaff.forEach((st, idx) => {
      const stats = staffStats.get(st.id);
      tableRowsHtml += `<tr>
        <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-size:10px;">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:3px 5px;font-weight:600;font-size:11px;text-align:left;">${formatStaffName(st.name_bn, st.name_en, bn)}</td>
        <td style="border:1px solid #cbd5e1;padding:3px 5px;font-size:10px;color:#475569;text-align:left;">${st.designation || '-'}</td>
      `;

      daysList.forEach(day => {
        const r = rosterMap.get(`${st.id}_${day.isoDate}`);
        const mAtt = attMap.get(`${st.id}_${day.isoDate}_morning`);
        const eAtt = attMap.get(`${st.id}_${day.isoDate}_evening`);

        const mBadge = mAtt?.status === 'present' ? '<span style="color:#16a34a;font-weight:bold;">P</span>' : mAtt?.status === 'late' ? '<span style="color:#d97706;font-weight:bold;">L</span>' : mAtt?.status === 'absent' ? '<span style="color:#dc2626;font-weight:bold;">A</span>' : r?.morning ? '<span style="color:#94a3b8;">—</span>' : '<span style="color:#e2e8f0;">·</span>';
        const eBadge = eAtt?.status === 'present' ? '<span style="color:#16a34a;font-weight:bold;">P</span>' : eAtt?.status === 'late' ? '<span style="color:#d97706;font-weight:bold;">L</span>' : eAtt?.status === 'absent' ? '<span style="color:#dc2626;font-weight:bold;">A</span>' : r?.evening ? '<span style="color:#94a3b8;">—</span>' : '<span style="color:#e2e8f0;">·</span>';

        if (isAll) {
          tableRowsHtml += `
            <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-size:10px;background:${day.isFriday ? '#fff1f2' : '#ffffff'};">${mBadge}</td>
            <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-size:10px;background:${day.isFriday ? '#fff1f2' : '#ffffff'};">${eBadge}</td>
          `;
        } else if (isMorningOnly) {
          tableRowsHtml += `
            <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-size:11px;background:${day.isFriday ? '#fff1f2' : '#ffffff'};">${mBadge}</td>
          `;
        } else {
          tableRowsHtml += `
            <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-size:11px;background:${day.isFriday ? '#fff1f2' : '#ffffff'};">${eBadge}</td>
          `;
        }
      });

      if (isAll) {
        tableRowsHtml += `
          <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-weight:bold;color:#059669;font-size:10px;">${stats?.morningPresent || 0}</td>
          <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-weight:bold;color:#0284c7;font-size:10px;">${stats?.eveningPresent || 0}</td>
          <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-weight:bold;font-size:11px;">${stats?.totalPresent || 0}</td>
        </tr>`;
      } else if (isMorningOnly) {
        tableRowsHtml += `
          <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-weight:bold;color:#059669;font-size:11px;">${stats?.morningPresent || 0}</td>
        </tr>`;
      } else {
        tableRowsHtml += `
          <td style="border:1px solid #cbd5e1;padding:3px;text-align:center;font-weight:bold;color:#0284c7;font-size:11px;">${stats?.eveningPresent || 0}</td>
        </tr>`;
      }
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @font-face {
            font-family: 'Kalpurush';
            src: url('/fonts/Kalpurush.ttf') format('truetype'),
                 url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf') format('truetype');
            font-display: block;
          }
          @font-face {
            font-family: 'SolaimanLipi';
            src: url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/solaiman-lipi/solaimanlipi-normal-v1.0.ttf') format('truetype');
            font-display: block;
          }
          * { margin:0; padding:0; box-sizing:border-box; }
          @page { size: A4 landscape; margin: 6mm 8mm; }
          body {
            font-family: 'Kalpurush', 'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif !important;
            margin: 0;
            padding: 8px 10px;
            color: #1e293b;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header { text-align: center; margin-bottom: 6px; border-bottom: 2px solid #059669; padding-bottom: 4px; }
          .header-main { display: flex; align-items: center; justify-content: center; gap: 12px; }
          .logo-box { width: 48px; height: 48px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .header-titles { flex: 1; text-align: center; }
          .inst-name { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.2; }
          .inst-en { font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 1px; }
          .inst-details { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; font-size: 9px; color: #475569; margin: 2px 0; }
          .sheet-title { margin: 2px 0 0 0; font-size: 11.5px; font-weight: 700; color: #059669; line-height: 1.2; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          .legend { display: flex; gap: 14px; margin-top: 6px; font-size: 9px; justify-content: center; font-weight: 500; padding: 2px 0; }
          .footer-signs { display: flex; justify-content: space-between; margin-top: 18px; padding: 0 40px; page-break-inside: avoid; break-inside: avoid; }
          .sign-box { text-align: center; border-top: 1px dashed #64748b; padding-top: 3px; width: 160px; font-size: 10px; font-weight: 600; color: #334155; }
          @media print {
            body { padding:0 !important; background: #fff !important; }
            .footer-signs { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-main">
            ${logoUrl ? `<div class="logo-box"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
            <div class="header-titles">
              <h1 class="inst-name">${institutionName}</h1>
              ${instNameEn ? `<div class="inst-en">${instNameEn}</div>` : ''}
              <div class="inst-details">
                ${instAddress ? `<span>📍 ${instAddress}</span>` : ''}
                ${instPhone ? `<span>📞 ${bn ? toBnDigits(instPhone) : instPhone}</span>` : ''}
                ${instEmail ? `<span>✉️ ${instEmail}</span>` : ''}
                ${estYear ? `<span>স্থাপিত: ${estYear} খ্রিঃ</span>` : ''}
              </div>
              <h2 class="sheet-title">${title}</h2>
            </div>
            ${logoUrl ? `<div class="logo-box" style="visibility:hidden;" aria-hidden="true"></div>` : ''}
          </div>
        </div>
        <div class="legend">
          <span><strong style="color:#16a34a;">P</strong> = উপস্থিত (Present)</span>
          <span><strong style="color:#dc2626;">A</strong> = অনুপস্থিত (Absent)</span>
          <span><strong style="color:#d97706;">L</strong> = বিলম্ব (Late)</span>
          <span><strong style="color:#94a3b8;">—</strong> = ডিউটি নির্ধারিত</span>
          <span><strong style="color:#cbd5e1;">·</strong> = ডিউটি নেই</span>
          ${isAll ? '<span><strong style="color:#059669;">স</strong> = সকাল</span><span><strong style="color:#0284c7;">ব</strong> = সন্ধ্যা</span>' : ''}
        </div>
        <table>
          <thead>${tableHeadersHtml}</thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
        <div class="footer-signs">
          <div class="sign-box">${bn ? 'হাজিরা গ্রহণকারী' : 'Attendance In-charge'}</div>
          <div class="sign-box">${bn ? 'আবাসিক ইন-চার্জ' : 'Residential In-charge'}</div>
          <div class="sign-box">${bn ? 'মুহতামিম / প্রিন্সিপাল' : 'Principal'}</div>
        </div>
      </body>
      </html>
    `;
  };

  // ── Print ──
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(bn ? 'পপআপ ব্লক হয়েছে, অনুমতি দিন' : 'Popup blocked, please allow popups');
      return;
    }
    const html = generatePrintAndPdfHtml();
    printWindow.document.write(html);
    printWindow.document.close();

    const doPrint = () => {
      printWindow.focus();
      printWindow.print();
    };

    if (printWindow.document.fonts && printWindow.document.fonts.ready) {
      printWindow.document.fonts.ready.then(() => {
        setTimeout(doPrint, 150);
      }).catch(() => {
        setTimeout(doPrint, 400);
      });
    } else {
      setTimeout(doPrint, 500);
    }
  };

  // ── PDF Download ──
  const handleDownloadPdf = async () => {
    try {
      setIsPdfGenerating(true);
      toast.info(bn ? 'পিডিএফ প্রস্তুত হচ্ছে...' : 'Generating PDF...');
      const html = generatePrintAndPdfHtml();
      await downloadSheetAsPdf(html, `Residential_Duty_${monthYearStr}.pdf`, null, 'landscape', 'download');
      toast.success(bn ? 'পিডিএফ ডাউনলোড সম্পন্ন' : 'PDF downloaded');
    } catch (e: any) {
      console.error(e);
      toast.error(bn ? 'পিডিএফ ডাউনলোডে ত্রুটি' : 'Failed to download PDF');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold text-foreground">
                {bn ? 'আবাসিক ডিউটি মাসিক হাজিরা শিট' : 'Residential Duty Monthly Attendance Sheet'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn ? 'পুরো মাসের সকাল ও সন্ধ্যার ডিউটি উপস্থিতি, রুটিন এবং রিপোর্ট' : 'Full month morning and evening duty attendance report'}
              </p>
            </div>
          </div>

          {/* Month / Year Navigator & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/50 rounded-xl p-1 border">
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={handlePrevMonth} title={bn ? 'পূর্ববর্তী মাস' : 'Previous Month'}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 px-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-semibold focus:ring-0 shadow-none px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {bn ? m.bn : m.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-semibold focus:ring-0 shadow-none px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <SelectItem key={y} value={String(y)}>
                        {toBnDigits(y)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={handleNextMonth} title={bn ? 'পরবর্তী মাস' : 'Next Month'}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleExportExcel} disabled={filteredStaff.length === 0}>
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              {bn ? 'এক্সেল ডাউনলোড' : 'Export Excel'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handlePrint} disabled={filteredStaff.length === 0}>
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              {bn ? 'প্রিন্ট' : 'Print'}
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={handleDownloadPdf} disabled={filteredStaff.length === 0 || isPdfGenerating}>
              {isPdfGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {bn ? 'PDF ডাউনলোড' : 'Download PDF'}
            </Button>
          </div>
        </DialogHeader>

        {/* Summary Badges & Search Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b shrink-0 bg-muted/20 px-2 rounded-xl mt-2">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-background border-border/50">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{bn ? 'মোট শিক্ষক:' : 'Total Staff:'} <strong>{toBnDigits(overallTotals.staffCount)}</strong></span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
              <Sun className="h-3.5 w-3.5" />
              <span>{bn ? 'সকাল উপস্থিত:' : 'Morning Present:'} <strong>{toBnDigits(overallTotals.morningPres)}</strong> / {toBnDigits(overallTotals.morningRostered)}</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20">
              <Moon className="h-3.5 w-3.5" />
              <span>{bn ? 'সন্ধ্যা উপস্থিত:' : 'Evening Present:'} <strong>{toBnDigits(overallTotals.eveningPres)}</strong> / {toBnDigits(overallTotals.eveningRostered)}</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{bn ? 'সর্বমোট উপস্থিতি:' : 'Total Present:'} <strong>{toBnDigits(overallTotals.totalPres)}</strong> / {toBnDigits(overallTotals.totalRostered)}</span>
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={bn ? 'নাম বা পদবী খুঁজুন...' : 'Search staff...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground py-1 px-2 border-b">
          <span className="font-semibold text-foreground">{bn ? 'চিহ্নসমূহ:' : 'Legend:'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> P = {bn ? 'উপস্থিত' : 'Present'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> A = {bn ? 'অনুপস্থিত' : 'Absent'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> L = {bn ? 'বিলম্ব' : 'Late'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Lv = {bn ? 'ছুটি' : 'Leave'}</span>
          <span className="flex items-center gap-1 text-muted-foreground"><span className="font-bold">—</span> = {bn ? 'অচিহ্নিত' : 'Unmarked'}</span>
          <span className="flex items-center gap-1 text-muted-foreground/50">· = {bn ? 'ডিউটি নেই' : 'No Duty'}</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {bn ? 'প্রতিটি দিনে: উপরে 🌅 সকাল | নিচে 🌙 সন্ধ্যা' : 'Each Day: Top 🌅 Morning | Bottom 🌙 Evening'}
          </span>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto border rounded-xl mt-2 relative">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-md shadow-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-muted px-2 py-2 text-center border-r border-b w-10 font-bold">#</th>
                <th className="sticky left-10 z-30 bg-muted px-3 py-2 text-left border-r border-b min-w-[160px] font-bold">
                  {bn ? 'শিক্ষক / স্টাফ' : 'Staff Name'}
                </th>
                <th className="sticky left-[200px] z-30 bg-muted px-2 py-2 text-left border-r border-b min-w-[110px] font-bold">
                  {bn ? 'পদবী' : 'Designation'}
                </th>

                {/* Days Columns */}
                {daysList.map(day => (
                  <th
                    key={day.dayNum}
                    className={`px-1 py-1 text-center border-r border-b min-w-[42px] max-w-[48px] ${
                      day.isFriday ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold' : ''
                    }`}
                  >
                    <div className="text-[11px] font-bold leading-tight">{day.dayNum}</div>
                    <div className="text-[9px] font-normal opacity-70 leading-none mt-0.5">{day.weekdayBn}</div>
                  </th>
                ))}

                {/* Right Summary Columns */}
                <th className="px-2 py-2 text-center border-r border-b min-w-[70px] bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold">
                  {bn ? 'সকাল' : 'Morning'}
                </th>
                <th className="px-2 py-2 text-center border-r border-b min-w-[70px] bg-sky-500/10 text-sky-800 dark:text-sky-300 font-bold">
                  {bn ? 'সন্ধ্যা' : 'Evening'}
                </th>
                <th className="px-2 py-2 text-center border-b min-w-[75px] bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 font-bold">
                  {bn ? 'মোট উপস্থিত' : 'Total'}
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={daysList.length + 6} className="text-center py-16 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {bn ? 'এই মাসে কোনো আবাসিক ডিউটি রুটিন বা রেকর্ড পাওয়া যায়নি' : 'No residential duty records found for this month'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((st, idx) => {
                  const stats = staffStats.get(st.id);
                  return (
                    <tr key={st.id} className="hover:bg-muted/30 transition-colors border-b">
                      <td className="sticky left-0 z-10 bg-background px-2 py-2 text-center border-r font-medium text-muted-foreground text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="sticky left-10 z-10 bg-background px-3 py-2 border-r font-semibold text-foreground text-xs truncate max-w-[160px]">
                        {formatStaffName(st.name_bn, st.name_en, bn)}
                      </td>
                      <td className="sticky left-[200px] z-10 bg-background px-2 py-2 border-r text-muted-foreground text-[11px] truncate max-w-[110px]">
                        {st.designation || '-'}
                      </td>

                      {/* Day cells */}
                      {daysList.map(day => {
                        const r = rosterMap.get(`${st.id}_${day.isoDate}`);
                        const mAtt = attMap.get(`${st.id}_${day.isoDate}_morning`);
                        const eAtt = attMap.get(`${st.id}_${day.isoDate}_evening`);

                        return (
                          <td
                            key={day.dayNum}
                            className={`px-0.5 py-1 text-center border-r ${
                              day.isFriday ? 'bg-rose-500/5' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              {/* Morning Badge */}
                              <div className="flex items-center justify-center h-4 w-full" title={bn ? `সকাল: ${mAtt?.status || (r?.morning ? 'চিহ্নিত হয়নি' : 'ডিউটি নেই')}` : `Morning: ${mAtt?.status || (r?.morning ? 'Unmarked' : 'No Duty')}`}>
                                {renderStatusBadge(mAtt, !!r?.morning)}
                              </div>
                              {/* Evening Badge */}
                              <div className="flex items-center justify-center h-4 w-full" title={bn ? `সন্ধ্যা: ${eAtt?.status || (r?.evening ? 'চিহ্নিত হয়নি' : 'ডিউটি নেই')}` : `Evening: ${eAtt?.status || (r?.evening ? 'Unmarked' : 'No Duty')}`}>
                                {renderStatusBadge(eAtt, !!r?.evening)}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Right stats */}
                      <td className="px-2 py-1.5 text-center border-r font-semibold text-emerald-600 bg-emerald-500/5 text-xs">
                        {toBnDigits(stats?.morningPresent || 0)} / {toBnDigits(stats?.morningRostered || 0)}
                      </td>
                      <td className="px-2 py-1.5 text-center border-r font-semibold text-sky-600 bg-sky-500/5 text-xs">
                        {toBnDigits(stats?.eveningPresent || 0)} / {toBnDigits(stats?.eveningRostered || 0)}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold text-foreground bg-indigo-500/5 text-xs">
                        {toBnDigits(stats?.totalPresent || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
