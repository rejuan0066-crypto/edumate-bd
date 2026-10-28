import { safeRows, csvCell, safeCell } from '@/lib/spreadsheetSafe';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, Printer, Search, Calendar, Users, CheckCircle2,
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
  return String(val).replace(/[0-9]/g, d => bnDigits[parseInt(d, 10)]);
};

export default function FulltimeMonthlyAttendanceSheetDialog({
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
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
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

  const { isResignedOnDate, getResignDate } = useResignedStaff();

  // 1. Fetch staff categories
  const { data: staffCategories = [] } = useQuery({
    queryKey: ['staff-categories-monthly-sheet'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_categories')
        .select('key, name, name_bn')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return (data || []) as any[];
    },
    enabled: open,
  });

  // 2. Fetch all active staff
  const { data: staffList = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ['staff-for-fulltime-monthly'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, designation, department, staff_category, status, residence_type, salary_order')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('salary_order', { ascending: true });
      return sortStaffByDepartment((data || []) as any[], { deduplicate: true });
    },
    enabled: open,
  });

  // 3. Fetch all staff attendance records for full_day shift in this month
  const { data: attendanceRecords = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['fulltime-attendance-month', monthYearStr],
    queryFn: async () => {
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endDate = `${selectedYear}-${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('entity_type', 'staff')
        .eq('shift', 'full_day')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: open,
  });

  // Attendance lookup: Map<`${staff_id}_${date}`, record>
  const attMap = useMemo(() => {
    const map = new Map<string, any>();
    attendanceRecords.forEach(att => {
      map.set(`${att.entity_id}_${att.attendance_date}`, att);
    });
    return map;
  }, [attendanceRecords]);

  const monthEndDate = useMemo(() => {
    return `${selectedYear}-${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth, daysInMonth]);

  // Exclude resigned & inactive staff
  const activeStaffList = useMemo(() => {
    return staffList.filter((st: any) => {
      // Must have active status
      if (st.status && st.status !== 'active') return false;
      // Must not be resigned
      const isResigned = isResignedOnDate(st.id, monthEndDate) || !!getResignDate(st.id);
      if (isResigned) return false;
      return true;
    });
  }, [staffList, isResignedOnDate, getResignDate, monthEndDate]);

  // Filter staff by department and search
  const filteredStaff = useMemo(() => {
    let list = activeStaffList;
    if (departmentFilter !== 'all') {
      list = list.filter(st => st.staff_category === departmentFilter || st.department === departmentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(st => {
        const nameBn = (st.name_bn || '').toLowerCase();
        const nameEn = (st.name_en || '').toLowerCase();
        const desig = (st.designation || '').toLowerCase();
        return nameBn.includes(q) || nameEn.includes(q) || desig.includes(q);
      });
    }
    return list;
  }, [activeStaffList, departmentFilter, searchQuery]);

  // Compute per-staff statistics
  const staffStats = useMemo(() => {
    const map = new Map<string, {
      present: number;
      late: number;
      halfDay: number;
      absent: number;
      leave: number;
      excused: number;
      medical: number;
      unmarked: number;
      effectivePresent: number;
    }>();

    activeStaffList.forEach(st => {
      let p = 0, l = 0, h = 0, a = 0, lv = 0, e = 0, m = 0, u = 0;
      daysList.forEach(day => {
        const att = attMap.get(`${st.id}_${day.isoDate}`);
        if (!att || !att.status) {
          u++;
        } else {
          switch (att.status) {
            case 'present': p++; break;
            case 'late': l++; break;
            case 'half_day': h++; break;
            case 'absent': a++; break;
            case 'leave': lv++; break;
            case 'excused': e++; break;
            case 'medical': m++; break;
            default: u++; break;
          }
        }
      });
      const effectivePresent = p + l + (h * 0.5);
      map.set(st.id, {
        present: p,
        late: l,
        halfDay: h,
        absent: a,
        leave: lv,
        excused: e,
        medical: m,
        unmarked: u,
        effectivePresent,
      });
    });

    return map;
  }, [activeStaffList, daysList, attMap]);

  // Overall totals across filtered staff
  const overallTotals = useMemo(() => {
    let totP = 0, totL = 0, totH = 0, totA = 0, totLv = 0;
    filteredStaff.forEach(st => {
      const s = staffStats.get(st.id);
      if (s) {
        totP += s.present;
        totL += s.late;
        totH += s.halfDay;
        totA += s.absent;
        totLv += s.leave;
      }
    });
    return { totP, totL, totH, totA, totLv };
  }, [filteredStaff, staffStats]);

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
  const currentDeptLabel = departmentFilter === 'all'
    ? (bn ? 'সকল বিভাগ' : 'All Departments')
    : (staffCategories.find(c => c.key === departmentFilter)?.name_bn || departmentFilter);

  // ── Excel Export ──
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const institutionName = instInfo?.name || 'মাদরাসা / প্রতিষ্ঠান';
      const sheetTitle = `${bn ? 'ফুল টাইম মাসিক স্টাফ হাজিরা শিট' : 'Full-Time Monthly Staff Attendance Sheet'} - ${currentMonthLabel} ${selectedYear} (${currentDeptLabel})`;

      const headers: string[] = [
        bn ? 'ক্রম' : 'SL',
        bn ? 'নাম' : 'Name',
        bn ? 'পদবী' : 'Designation',
        bn ? 'বিভাগ' : 'Department',
      ];

      daysList.forEach(day => {
        headers.push(`${day.dayNum} ${day.weekdayBn}`);
      });

      headers.push(
        bn ? 'উপস্থিত (P)' : 'Present',
        bn ? 'বিলম্ব (L)' : 'Late',
        bn ? 'অর্ধদিন (H)' : 'Half Day',
        bn ? 'ছুটি (Lv)' : 'Leave',
        bn ? 'অনুপস্থিত (A)' : 'Absent',
        bn ? 'কার্যকর উপস্থিতি' : 'Effective Present'
      );

      const rows: any[][] = [];
      rows.push([institutionName]);
      rows.push([sheetTitle]);
      rows.push([]);
      rows.push(headers);

      filteredStaff.forEach((st, idx) => {
        const stats = staffStats.get(st.id);
        const deptObj = staffCategories.find(c => c.key === st.staff_category);
        const deptName = deptObj ? (bn ? deptObj.name_bn || deptObj.name : deptObj.name) : (st.department || '-');

        const row: any[] = [
          idx + 1,
          formatStaffName(st.name_bn, st.name_en, bn),
          st.designation || '-',
          deptName,
        ];

        daysList.forEach(day => {
          const att = attMap.get(`${st.id}_${day.isoDate}`);
          let statusText = '—';
          if (att?.status) {
            switch (att.status) {
              case 'present': statusText = 'P'; break;
              case 'late': statusText = 'L'; break;
              case 'half_day': statusText = 'H'; break;
              case 'absent': statusText = 'A'; break;
              case 'leave': statusText = 'Lv'; break;
              case 'excused': statusText = 'E'; break;
              case 'medical': statusText = 'M'; break;
              default: statusText = '—'; break;
            }
          }
          row.push(statusText);
        });

        row.push(
          stats?.present || 0,
          stats?.late || 0,
          stats?.halfDay || 0,
          stats?.leave || 0,
          stats?.absent || 0,
          stats?.effectivePresent || 0
        );

        rows.push(row);
      });

      // Bottom totals row
      rows.push([]);
      const summaryRow: any[] = [
        bn ? 'মোট উপস্থিত' : 'Total Present',
        '',
        '',
        '',
      ];

      daysList.forEach(day => {
        let presCount = 0;
        filteredStaff.forEach(st => {
          const att = attMap.get(`${st.id}_${day.isoDate}`);
          if (att?.status === 'present' || att?.status === 'late') presCount++;
        });
        summaryRow.push(presCount);
      });

      summaryRow.push(
        overallTotals.totP,
        overallTotals.totL,
        overallTotals.totH,
        overallTotals.totLv,
        overallTotals.totA,
        ''
      );
      rows.push(summaryRow);

      const ws = XLSX.utils.aoa_to_sheet(safeRows(rows));

      // Auto-fit column widths
      ws['!cols'] = [
        { wch: 5 },  // SL
        { wch: 22 }, // Name
        { wch: 18 }, // Designation
        { wch: 15 }, // Dept
        ...daysList.map(() => ({ wch: 6 })),
        { wch: 8 },  // P
        { wch: 8 },  // L
        { wch: 8 },  // H
        { wch: 8 },  // Lv
        { wch: 8 },  // A
        { wch: 12 }, // Eff
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'FullTime Attendance');
      XLSX.writeFile(wb, `Fulltime_Attendance_${monthYearStr}.xlsx`);
      toast.success(bn ? 'এক্সেল ফাইল সফলভাবে ডাউনলোড হয়েছে' : 'Excel downloaded successfully');
    } catch (e: any) {
      console.error(e);
      toast.error(bn ? 'এক্সেল তৈরিতে সমস্যা হয়েছে' : 'Failed to export Excel');
    }
  };

  // ── HTML generator for Print & PDF ──
  const generatePrintAndPdfHtml = (forPdf = false) => {
    const institutionName = instInfo?.name || 'মাদরাসা / প্রতিষ্ঠান';
    const instNameEn = instInfo?.name_en || '';
    const instAddress = instInfo?.address || '';
    const instPhone = instInfo?.phone || '';
    const instEmail = instInfo?.email || '';
    const logoUrl = instInfo?.logo_url || '';
    const estYear = instInfo?.established_year ? (bn ? toBnDigits(instInfo.established_year) : instInfo.established_year) : '';
    const title = `${bn ? 'ফুল টাইম মাসিক স্টাফ হাজিরা শিট' : 'Full-Time Monthly Staff Attendance Sheet'} — ${currentMonthLabel} ${selectedYear}`;
    const subtitle = `${currentDeptLabel} • ${bn ? `মোট স্টাফ: ${toBnDigits(filteredStaff.length)} জন` : `Total Staff: ${filteredStaff.length}`}`;

    // Smart pagination: If <= 22 staff (e.g. 17 staff), keep all on ONE single page!
    // If > 22 staff, evenly split across pages so no page is left with just 1-3 rows.
    const totalStaff = filteredStaff.length;
    let pageSize = 20;
    if (totalStaff <= 22) {
      pageSize = Math.max(1, totalStaff);
    } else {
      const numPages = Math.ceil(totalStaff / 20);
      pageSize = Math.ceil(totalStaff / numPages);
    }

    const pages: any[][] = [];
    for (let i = 0; i < totalStaff; i += pageSize) {
      pages.push(filteredStaff.slice(i, i + pageSize));
    }
    if (pages.length === 0) pages.push([]);

    const totalPages = pages.length;

    let pagesHtml = '';

    pages.forEach((pageStaff, pageIdx) => {
      let tableRowsHtml = '';
      pageStaff.forEach((st, idx) => {
        const globalIdx = pageIdx * pageSize + idx + 1;
        const stats = staffStats.get(st.id);
        const deptObj = staffCategories.find(c => c.key === st.staff_category);
        const deptName = deptObj ? (bn ? deptObj.name_bn || deptObj.name : deptObj.name) : (st.department || '-');

        tableRowsHtml += `<tr>
          <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-size:9px;width:24px;">${bn ? toBnDigits(globalIdx) : globalIdx}</td>
          <td style="border:1px solid #cbd5e1;padding:2px 4px;font-weight:600;font-size:9.5px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:130px;">
            ${formatStaffName(st.name_bn, st.name_en, bn)}
          </td>
          <td style="border:1px solid #cbd5e1;padding:2px 4px;font-size:8.5px;color:#475569;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:95px;">
            ${st.designation || '-'}
          </td>
        `;

        daysList.forEach(day => {
          const att = attMap.get(`${st.id}_${day.isoDate}`);
          let badge = '<span style="color:#cbd5e1;">·</span>';
          let bg = day.isFriday ? '#fff1f2' : '#ffffff';

          if (att?.status) {
            switch (att.status) {
              case 'present':
                badge = '<span style="color:#16a34a;font-weight:bold;">P</span>';
                break;
              case 'late':
                badge = '<span style="color:#d97706;font-weight:bold;">L</span>';
                bg = '#fef3c7';
                break;
              case 'half_day':
                badge = '<span style="color:#ea580c;font-weight:bold;">H</span>';
                bg = '#ffedd5';
                break;
              case 'absent':
                badge = '<span style="color:#dc2626;font-weight:bold;">A</span>';
                bg = '#fee2e2';
                break;
              case 'leave':
                badge = '<span style="color:#2563eb;font-weight:bold;">Lv</span>';
                bg = '#eff6ff';
                break;
              case 'excused':
                badge = '<span style="color:#4f46e5;font-weight:bold;">E</span>';
                break;
              case 'medical':
                badge = '<span style="color:#9333ea;font-weight:bold;">M</span>';
                break;
              default:
                badge = '<span style="color:#cbd5e1;">·</span>';
                break;
            }
          }

          tableRowsHtml += `
            <td style="border:1px solid #cbd5e1;padding:2px 0px;text-align:center;font-size:9px;background:${bg};width:21px;">
              ${badge}
            </td>
          `;
        });

        tableRowsHtml += `
          <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-weight:bold;color:#16a34a;font-size:9px;width:24px;">${bn ? toBnDigits(stats?.present || 0) : (stats?.present || 0)}</td>
          <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-weight:bold;color:#d97706;font-size:9px;width:22px;">${bn ? toBnDigits(stats?.late || 0) : (stats?.late || 0)}</td>
          <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-weight:bold;color:#ea580c;font-size:9px;width:22px;">${bn ? toBnDigits(stats?.halfDay || 0) : (stats?.halfDay || 0)}</td>
          <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-weight:bold;color:#2563eb;font-size:9px;width:24px;">${bn ? toBnDigits(stats?.leave || 0) : (stats?.leave || 0)}</td>
          <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-weight:bold;color:#dc2626;font-size:9px;width:22px;">${bn ? toBnDigits(stats?.absent || 0) : (stats?.absent || 0)}</td>
          <td style="border:1px solid #cbd5e1;padding:2px;text-align:center;font-weight:extrabold;color:#0f172a;font-size:9.5px;background:#f8fafc;width:32px;">${bn ? toBnDigits(stats?.effectivePresent || 0) : (stats?.effectivePresent || 0)}</td>
        </tr>`;
      });

      // Headers for this page
      let tableHeadersHtml = `
        <tr>
          <th style="border:1px solid #94a3b8;padding:3px 2px;background:#f1f5f9;font-size:9px;width:24px;">#</th>
          <th style="border:1px solid #94a3b8;padding:3px 4px;background:#f1f5f9;font-size:9.5px;width:130px;text-align:left;">${bn ? 'শিক্ষক/স্টাফের নাম' : 'Name'}</th>
          <th style="border:1px solid #94a3b8;padding:3px 4px;background:#f1f5f9;font-size:9px;width:95px;text-align:left;">${bn ? 'পদবী' : 'Designation'}</th>
      `;

      daysList.forEach(day => {
        tableHeadersHtml += `
          <th style="border:1px solid #94a3b8;padding:2px 0px;background:${day.isFriday ? '#fee2e2' : '#f8fafc'};font-size:8.5px;text-align:center;width:21px;">
            ${bn ? toBnDigits(day.dayNum) : day.dayNum}<br/><span style="font-size:7px;color:#64748b;">${day.weekdayBn}</span>
          </th>
        `;
      });

      tableHeadersHtml += `
          <th style="border:1px solid #94a3b8;padding:2px;background:#f1f5f9;font-size:8.5px;color:#16a34a;width:24px;" title="উপস্থিত">P</th>
          <th style="border:1px solid #94a3b8;padding:2px;background:#f1f5f9;font-size:8.5px;color:#d97706;width:22px;" title="বিলম্ব">L</th>
          <th style="border:1px solid #94a3b8;padding:2px;background:#f1f5f9;font-size:8.5px;color:#ea580c;width:22px;" title="অর্ধদিন">H</th>
          <th style="border:1px solid #94a3b8;padding:2px;background:#f1f5f9;font-size:8.5px;color:#2563eb;width:24px;" title="ছুটি">Lv</th>
          <th style="border:1px solid #94a3b8;padding:2px;background:#f1f5f9;font-size:8.5px;color:#dc2626;width:22px;" title="অনুপস্থিত">A</th>
          <th style="border:1px solid #94a3b8;padding:2px;background:#e2e8f0;font-size:9px;font-weight:bold;width:32px;" title="মোট উপস্থিতি">মোট</th>
        </tr>
      `;

      pagesHtml += `
        <div class="attendance-page" style="page-break-after: ${pageIdx < totalPages - 1 ? 'always' : 'auto'}; break-after: ${pageIdx < totalPages - 1 ? 'page' : 'auto'};">
          <div class="page-inner">
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
              <div class="meta-sub">
                <span><strong>${currentDeptLabel}</strong> • ${bn ? `মোট স্টাফ: ${toBnDigits(filteredStaff.length)} জন` : `Total Staff: ${filteredStaff.length}`}</span>
                <span class="page-num">${totalPages > 1 ? `পৃষ্ঠা ${toBnDigits(pageIdx + 1)} / ${toBnDigits(totalPages)}` : ''}</span>
              </div>
            </div>

            <table class="att-table">
              <thead>${tableHeadersHtml}</thead>
              <tbody>${tableRowsHtml}</tbody>
            </table>

            <div class="legend">
              <span><strong style="color:#16a34a;">P</strong> = উপস্থিত (Present)</span>
              <span><strong style="color:#d97706;">L</strong> = বিলম্ব (Late)</span>
              <span><strong style="color:#ea580c;">H</strong> = অর্ধদিন (Half Day)</span>
              <span><strong style="color:#2563eb;">Lv</strong> = ছুটি (Leave)</span>
              <span><strong style="color:#dc2626;">A</strong> = অনুপস্থিত (Absent)</span>
              <span><strong style="color:#cbd5e1;">·</strong> = অচিহ্নিত</span>
            </div>

            <div class="footer-signs">
              <div class="sign-box">${bn ? 'হাজিরা গ্রহণকারী' : 'Attendance In-charge'}</div>
              <div class="sign-box">${bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal'}</div>
            </div>
          </div>
        </div>
      `;
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
          @page { size: A4 landscape; margin: 4mm 6mm; }
          html, body {
            font-family: 'Kalpurush', 'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif !important;
            background: #ffffff;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .attendance-page {
            width: 100%;
            box-sizing: border-box;
            background: #ffffff;
            padding: 6px 8px;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .attendance-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .page-inner {
            width: 100%;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #059669;
            padding-bottom: 3px;
            margin-bottom: 4px;
          }
          .header-main {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            position: relative;
          }
          .logo-box {
            width: 48px;
            height: 48px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo-box img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .header-titles {
            flex: 1;
            text-align: center;
          }
          .inst-name {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            line-height: 1.2;
          }
          .inst-en {
            font-size: 10.5px;
            font-weight: 600;
            color: #475569;
            margin-top: 1px;
          }
          .inst-details {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            font-size: 9px;
            color: #475569;
            margin: 1.5px 0;
          }
          .sheet-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #059669;
            margin: 2px 0 0 0;
            line-height: 1.2;
          }
          .meta-sub {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #475569;
            margin-top: 2px;
            padding: 0 4px;
          }
          .page-num {
            font-weight: 600;
            color: #059669;
          }
          table.att-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .legend {
            display: flex;
            gap: 12px;
            margin-top: 4px;
            font-size: 8.5px;
            justify-content: center;
            font-weight: 500;
            padding: 2.5px 0;
            border-top: 1px dashed #cbd5e1;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .footer-signs {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            margin-bottom: 2px;
            padding: 0 40px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .sign-box {
            text-align: center;
            border-top: 1px dashed #64748b;
            padding-top: 3px;
            width: 160px;
            font-size: 10px;
            font-weight: 600;
            color: #334155;
          }
          @media print {
            body { padding: 0 !important; background: #fff !important; }
            .attendance-page { padding: 2mm 4mm !important; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; }
            .attendance-page:last-child { page-break-after: auto; break-after: auto; }
            .footer-signs { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;
  };

  // ── Print ──
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(bn ? 'পপআপ ব্লক হয়েছে, ব্রাউজারে অনুমতি দিন' : 'Popup blocked, please allow popups');
      return;
    }

    const html = generatePrintAndPdfHtml(false);
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
      const html = generatePrintAndPdfHtml(true);
      const filename = `Fulltime_Attendance_${monthYearStr}.pdf`;
      await downloadSheetAsPdf(html, filename, null, 'landscape', 'download');
      toast.success(bn ? 'পিডিএফ ডাউনলোড সম্পন্ন হয়েছে' : 'PDF downloaded successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(bn ? 'পিডিএফ ডাউনলোড করতে সমস্যা হয়েছে' : 'Failed to download PDF');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] xl:max-w-7xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Top Header */}
        <DialogHeader className="p-4 border-b bg-card/60 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>{bn ? 'ফুল টাইম মাসিক স্টাফ হাজিরা শিট' : 'Full-Time Monthly Staff Attendance Sheet'}</span>
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {currentMonthLabel} {selectedYear}
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn ? 'পুরো মাসের দৈনন্দিন পূর্ণকালীন হাজিরা নিরীক্ষণ, প্রিন্ট ও পিডিএফ ডাউনলোড' : 'Monitor, print and download complete monthly full-time staff attendance'}
                </p>
              </div>
            </div>

            {/* Month & Year Selectors with Next/Prev navigation */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-7 text-xs w-[110px] font-semibold border-none shadow-none bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {bn ? m.bn : m.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-7 text-xs w-[80px] font-semibold border-none shadow-none bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentTzParts.year - 2, currentTzParts.year - 1, currentTzParts.year, currentTzParts.year + 1].map(y => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {bn ? toBnDigits(y) : y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar: Filters and Export Action Buttons */}
        <div className="px-4 py-2.5 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={bn ? 'নাম বা পদবী দিয়ে খুঁজুন...' : 'Search name or designation...'}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            {/* Department Filter */}
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px] sm:w-[160px] bg-background">
                <SelectValue placeholder={bn ? 'বিভাগ নির্বাচন' : 'Department'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{bn ? 'সকল বিভাগ' : 'All Departments'}</SelectItem>
                {staffCategories.map((c: any) => (
                  <SelectItem key={c.key} value={c.key} className="text-xs">
                    {bn ? c.name_bn || c.name : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Staff Count Badge */}
            <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-background border">
              {bn ? `স্টাফ: ${toBnDigits(filteredStaff.length)} জন` : `Staff: ${filteredStaff.length}`}
            </div>
          </div>

          {/* Action Buttons: Print, PDF, Excel */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8 bg-background border-border/80 hover:bg-muted font-medium"
              onClick={handleExportExcel}
              disabled={filteredStaff.length === 0}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>{bn ? 'এক্সেল ডাউনলোড' : 'Excel'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8 bg-background border-border/80 hover:bg-muted font-medium"
              onClick={handlePrint}
              disabled={filteredStaff.length === 0}
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
            </Button>

            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
              onClick={handleDownloadPdf}
              disabled={filteredStaff.length === 0 || isPdfGenerating}
            >
              {isPdfGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{bn ? 'তৈরি হচ্ছে...' : 'Generating...'}</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>{bn ? 'PDF ডাউনলোড' : 'Download PDF'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Legend / Status Codes */}
        <div className="px-4 py-1.5 bg-muted/10 border-b flex flex-wrap items-center gap-3 text-[11px] shrink-0">
          <span className="font-semibold text-muted-foreground">{bn ? 'চিহ্ন সংকেত:' : 'Legend:'}</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded text-center text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">P</span>
            <span>{bn ? 'উপস্থিত' : 'Present'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded text-center text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">L</span>
            <span>{bn ? 'বিলম্ব' : 'Late'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded text-center text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">H</span>
            <span>{bn ? 'অর্ধদিন' : 'Half Day'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded text-center text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Lv</span>
            <span>{bn ? 'ছুটি' : 'Leave'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded text-center text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">A</span>
            <span>{bn ? 'অনুপস্থিত' : 'Absent'}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="inline-block w-4 h-4 rounded text-center text-[10px] font-bold bg-muted">·</span>
            <span>{bn ? 'অচিহ্নিত' : 'Unmarked'}</span>
          </span>
          <span className="ml-auto text-muted-foreground text-[10px] hidden md:inline">
            {bn ? '* শুক্রবার লাল রঙে চিহ্নিত' : '* Fridays highlighted in soft red'}
          </span>
        </div>

        {/* Scrollable Data Table Container */}
        <div className="flex-1 overflow-auto p-4">
          {isStaffLoading || isAttendanceLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">{bn ? 'হাজিরা তথ্য লোড হচ্ছে...' : 'Loading attendance data...'}</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">{bn ? 'কোনো স্টাফ পাওয়া যায়নি' : 'No staff found'}</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-xs bg-card">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/70 text-foreground border-b border-border/80">
                    <th className="py-2 px-2 text-center font-bold w-10 sticky left-0 bg-muted/95 z-20 border-r">#</th>
                    <th className="py-2 px-3 text-left font-bold min-w-[140px] sticky left-10 bg-muted/95 z-20 border-r shadow-xs">
                      {bn ? 'শিক্ষক/স্টাফের নাম' : 'Staff Name'}
                    </th>
                    <th className="py-2 px-2 text-left font-bold min-w-[100px] border-r">
                      {bn ? 'পদবী' : 'Designation'}
                    </th>

                    {/* Days 1..daysInMonth */}
                    {daysList.map(day => (
                      <th
                        key={day.isoDate}
                        className={`py-1.5 px-1 text-center font-bold min-w-[28px] border-r transition-colors ${
                          day.isFriday ? 'bg-rose-100/60 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' : ''
                        }`}
                      >
                        <div className="text-[11px] leading-tight">{bn ? toBnDigits(day.dayNum) : day.dayNum}</div>
                        <div className="text-[9px] font-normal text-muted-foreground">{day.weekdayBn}</div>
                      </th>
                    ))}

                    {/* Summary columns */}
                    <th className="py-2 px-1 text-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-r w-9" title="উপস্থিত">P</th>
                    <th className="py-2 px-1 text-center font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border-r w-9" title="বিলম্ব">L</th>
                    <th className="py-2 px-1 text-center font-bold text-orange-700 dark:text-orange-300 bg-orange-500/10 border-r w-9" title="অর্ধদিন">H</th>
                    <th className="py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 border-r w-9" title="ছুটি">Lv</th>
                    <th className="py-2 px-1 text-center font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 border-r w-9" title="অনুপস্থিত">A</th>
                    <th className="py-2 px-2 text-center font-extrabold bg-muted/80 text-foreground w-12" title="কার্যকর উপস্থিতি">
                      {bn ? 'মোট' : 'Tot'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStaff.map((st, idx) => {
                    const stats = staffStats.get(st.id);
                    return (
                      <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 px-2 text-center text-muted-foreground font-mono text-[11px] sticky left-0 bg-card z-10 border-r">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-foreground sticky left-10 bg-card z-10 border-r shadow-xs truncate max-w-[180px]">
                          {formatStaffName(st.name_bn, st.name_en, bn)}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground border-r truncate max-w-[120px]">
                          {st.designation || '-'}
                        </td>

                        {/* Attendance cells for each day */}
                        {daysList.map(day => {
                          const att = attMap.get(`${st.id}_${day.isoDate}`);
                          let content = <span className="text-muted-foreground/30 font-bold">·</span>;
                          let cellBg = day.isFriday ? 'bg-rose-50/40 dark:bg-rose-950/20' : '';

                          if (att?.status) {
                            switch (att.status) {
                              case 'present':
                                content = <span className="font-bold text-emerald-600 dark:text-emerald-400">P</span>;
                                cellBg = 'bg-emerald-500/10';
                                break;
                              case 'late':
                                content = <span className="font-bold text-amber-600 dark:text-amber-400">L</span>;
                                cellBg = 'bg-amber-500/15';
                                break;
                              case 'half_day':
                                content = <span className="font-bold text-orange-600 dark:text-orange-400">H</span>;
                                cellBg = 'bg-orange-500/15';
                                break;
                              case 'absent':
                                content = <span className="font-bold text-rose-600 dark:text-rose-400">A</span>;
                                cellBg = 'bg-rose-500/15';
                                break;
                              case 'leave':
                                content = <span className="font-bold text-blue-600 dark:text-blue-400">Lv</span>;
                                cellBg = 'bg-blue-500/15';
                                break;
                              case 'excused':
                                content = <span className="font-bold text-indigo-600">E</span>;
                                break;
                              case 'medical':
                                content = <span className="font-bold text-purple-600">M</span>;
                                break;
                            }
                          }

                          return (
                            <td
                              key={day.isoDate}
                              className={`py-1 px-0.5 text-center border-r font-mono text-[11px] ${cellBg}`}
                            >
                              {content}
                            </td>
                          );
                        })}

                        {/* Summary cells */}
                        <td className="py-1.5 px-1 text-center font-bold text-emerald-600 border-r bg-emerald-50/30 dark:bg-emerald-950/20">
                          {stats?.present || 0}
                        </td>
                        <td className="py-1.5 px-1 text-center font-bold text-amber-600 border-r bg-amber-50/30 dark:bg-amber-950/20">
                          {stats?.late || 0}
                        </td>
                        <td className="py-1.5 px-1 text-center font-bold text-orange-600 border-r bg-orange-50/30 dark:bg-orange-950/20">
                          {stats?.halfDay || 0}
                        </td>
                        <td className="py-1.5 px-1 text-center font-bold text-blue-600 border-r bg-blue-50/30 dark:bg-blue-950/20">
                          {stats?.leave || 0}
                        </td>
                        <td className="py-1.5 px-1 text-center font-bold text-rose-600 border-r bg-rose-50/30 dark:bg-rose-950/20">
                          {stats?.absent || 0}
                        </td>
                        <td className="py-1.5 px-2 text-center font-extrabold text-foreground bg-muted/40">
                          {stats?.effectivePresent || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
