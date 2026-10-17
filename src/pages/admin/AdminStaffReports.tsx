import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays, Download, FileText, Users, ClipboardList, UserCheck, Pencil, Loader2, Plus } from 'lucide-react';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';
import { toast } from 'sonner';

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const formatTimeDisplay = (timeStr: string | null | undefined, bn: boolean) => {
  if (!timeStr) return '-';
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    const parts = timeStr.split(':').map(Number);
    const h = parts[0];
    const m = parts[1];
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const res = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    return bn ? res.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]) : res;
  }
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString(bn ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch {}
  return timeStr;
};

const STAFF_CATEGORIES = [
  { key: 'all', label_bn: 'সকল', label_en: 'All' },
  { key: 'teacher', label_bn: 'শিক্ষক', label_en: 'Teacher' },
  { key: 'administrative', label_bn: 'প্রশাসনিক', label_en: 'Administrative' },
  { key: 'support', label_bn: 'সহায়ক', label_en: 'Support' },
  { key: 'general', label_bn: 'সাধারণ', label_en: 'General' },
];

const AdminStaffReports = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings: ws } = useWebsiteSettings();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') === 'duty' ? 'duty' : 'attendance');

  // ================== ATTENDANCE FILTERS ==================
  const [category, setCategory] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>(firstOfMonth());
  const [toDate, setToDate] = useState<string>(todayISO());

  // ================== DUTY FILTERS ==================
  const [dutyDate, setDutyDate] = useState<string>(todayISO());
  const [dutyCategory, setDutyCategory] = useState<string>('all');

  // Fetch all active staff
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-reports-staff'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, staff_id, name_bn, name_en, designation, department, staff_category, phone, status, joining_date')
        .neq('status', 'deleted')
        .order('name_bn', { ascending: true });
      return data || [];
    },
  });

  const filteredStaff = useMemo(() => {
    if (category === 'all') return staff;
    return staff.filter((s: any) => s.staff_category === category);
  }, [staff, category]);

  const staffIds = useMemo(() => filteredStaff.map((s: any) => s.id), [filteredStaff]);

  // ================== ATTENDANCE DATA ==================
  const { data: attendance = [], isLoading: attLoading } = useQuery({
    queryKey: ['staff-att-records', staffIds, fromDate, toDate],
    enabled: staffIds.length > 0 && !!fromDate && !!toDate,
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('id, entity_id, status, attendance_date, check_in_time, check_out_time, shift, remarks')
        .eq('entity_type', 'staff')
        .in('entity_id', staffIds)
        .gte('attendance_date', fromDate)
        .lte('attendance_date', toDate);
      return data || [];
    },
  });

  const attendanceSummary = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    filteredStaff.forEach((s: any) => {
      map[s.id] = { present: 0, absent: 0, late: 0, total: 0 };
    });
    attendance.forEach((r: any) => {
      const slot = map[r.entity_id];
      if (!slot) return;
      slot.total++;
      if (r.status === 'present') slot.present++;
      else if (r.status === 'absent') slot.absent++;
      else if (r.status === 'late') slot.late++;
    });
    return filteredStaff.map((s: any) => ({
      ...s,
      ...map[s.id],
      rate: map[s.id].total > 0 ? ((map[s.id].present / map[s.id].total) * 100).toFixed(1) + '%' : '-',
    }));
  }, [filteredStaff, attendance]);

  const attTotals = useMemo(() => {
    const present = attendanceSummary.reduce((s, r) => s + r.present, 0);
    const absent = attendanceSummary.reduce((s, r) => s + r.absent, 0);
    const late = attendanceSummary.reduce((s, r) => s + r.late, 0);
    const total = present + absent + late;
    return { present, absent, late, total, rate: total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '-' };
  }, [attendanceSummary]);

  // ================== DUTY DATA ==================
  const dutyStaff = useMemo(() => {
    if (dutyCategory === 'all') return staff.filter((s: any) => s.status === 'active');
    return staff.filter((s: any) => s.status === 'active' && s.staff_category === dutyCategory);
  }, [staff, dutyCategory]);

  const dutyStaffIds = useMemo(() => dutyStaff.map((s: any) => s.id), [dutyStaff]);

  const { data: dutyRecords = [], isLoading: dutyLoading } = useQuery({
    queryKey: ['staff-duty-records', dutyStaffIds, dutyDate],
    enabled: dutyStaffIds.length > 0 && !!dutyDate,
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('id, entity_id, status, attendance_date, check_in_time, check_out_time, shift, remarks')
        .eq('entity_type', 'staff')
        .eq('attendance_date', dutyDate)
        .in('entity_id', dutyStaffIds);
      return data || [];
    },
  });

  const dutyData = useMemo(() => {
    const recMap: Record<string, any> = {};
    dutyRecords.forEach((r: any) => { recMap[r.entity_id] = r; });
    return dutyStaff.map((s: any) => {
      const r = recMap[s.id];
      return {
        ...s,
        att_status: r?.status || 'no_record',
        raw_check_in: r?.check_in_time || '',
        raw_check_out: r?.check_out_time || '',
        check_in: formatTimeDisplay(r?.check_in_time, bn),
        check_out: formatTimeDisplay(r?.check_out_time, bn),
        shift: r?.shift || '-',
        remarks: r?.remarks || '-',
      };
    });
  }, [dutyStaff, dutyRecords, bn]);

  const dutyStats = useMemo(() => {
    const present = dutyData.filter(d => d.att_status === 'present').length;
    const absent = dutyData.filter(d => d.att_status === 'absent').length;
    const late = dutyData.filter(d => d.att_status === 'late').length;
    const noRec = dutyData.filter(d => d.att_status === 'no_record').length;
    return { total: dutyData.length, present, absent, late, noRec };
  }, [dutyData]);

  // ================== DUTY REPORT MODAL ==================
  const [dutyModalOpen, setDutyModalOpen] = useState(false);
  const [dutyTargetStaff, setDutyTargetStaff] = useState<any | null>(null);
  const [dutyTargetStaffId, setDutyTargetStaffId] = useState<string>('');
  const [dutyFormDate, setDutyFormDate] = useState<string>(todayISO());
  const [dutyFormStatus, setDutyFormStatus] = useState<string>('present');
  const [dutyFormShift, setDutyFormShift] = useState<string>('morning');
  const [dutyFormCheckIn, setDutyFormCheckIn] = useState<string>('');
  const [dutyFormCheckOut, setDutyFormCheckOut] = useState<string>('');
  const [dutyFormRemarks, setDutyFormRemarks] = useState<string>('');
  const [savingDuty, setSavingDuty] = useState(false);

  const openDutyModal = (d?: any) => {
    if (d) {
      setDutyTargetStaff(d);
      setDutyTargetStaffId(d.id);
      setDutyFormDate(dutyDate);
      setDutyFormStatus(d.att_status && d.att_status !== 'no_record' ? d.att_status : 'present');
      setDutyFormShift(d.shift && d.shift !== '-' ? d.shift : 'morning');
      setDutyFormCheckIn(d.raw_check_in || (d.check_in && d.check_in !== '-' ? d.check_in : ''));
      setDutyFormCheckOut(d.raw_check_out || (d.check_out && d.check_out !== '-' ? d.check_out : ''));
      setDutyFormRemarks(d.remarks && d.remarks !== '-' ? d.remarks : '');
    } else {
      setDutyTargetStaff(null);
      setDutyTargetStaffId(dutyStaff[0]?.id || '');
      setDutyFormDate(dutyDate);
      setDutyFormStatus('present');
      setDutyFormShift('morning');
      setDutyFormCheckIn('');
      setDutyFormCheckOut('');
      setDutyFormRemarks('');
    }
    setDutyModalOpen(true);
  };

  const saveDutyReport = async () => {
    if (!dutyTargetStaffId) {
      toast.error(bn ? 'স্টাফ নির্বাচন করুন' : 'Please select staff');
      return;
    }
    setSavingDuty(true);
    try {
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('entity_type', 'staff')
        .eq('entity_id', dutyTargetStaffId)
        .eq('attendance_date', dutyFormDate)
        .maybeSingle();

      const payload = {
        entity_type: 'staff',
        entity_id: dutyTargetStaffId,
        attendance_date: dutyFormDate,
        status: dutyFormStatus,
        shift: dutyFormShift,
        check_in_time: dutyFormCheckIn || null,
        check_out_time: dutyFormCheckOut || null,
        remarks: dutyFormRemarks || null,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('attendance_records')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('attendance_records')
          .insert(payload);
        if (error) throw error;
      }

      toast.success(bn ? 'ডিউটি রিপোর্ট সংরক্ষিত হয়েছে' : 'Duty report saved successfully');
      setDutyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-duty-records'] });
      queryClient.invalidateQueries({ queryKey: ['staff-att-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'সংরক্ষণে ত্রুটি' : 'Failed to save duty report'));
    } finally {
      setSavingDuty(false);
    }
  };

  // ================== EXPORT HELPERS ==================
  const reportMeta = {
    institution_name: ws.institution_name || '',
    institution_name_en: ws.institution_name_en || '',
    address: ws.address || '',
    phone: ws.phone || '',
    email: ws.email || '',
    logo_url: ws.logo_url,
  };

  const catLabel = (key: string) => {
    const c = STAFF_CATEGORIES.find(x => x.key === key);
    return bn ? (c?.label_bn || key) : (c?.label_en || key);
  };

  // -------- Attendance PDF --------
  const handleAttendancePDF = () => {
    try {
      if (!attendanceSummary.length) {
        toast.error(bn ? 'রিপোর্ট তৈরির জন্য কোনো ডেটা নেই' : 'No data available to generate report');
        return;
      }
      generateBilingualReport(
        {
          ...reportMeta,
          report_title_bn: 'স্টাফ উপস্থিতি রিপোর্ট',
          report_title_en: 'Staff Attendance Report',
          period_label_bn: `${catLabel(category)} • ${fromDate} → ${toDate}`,
          period_label_en: `${catLabel(category)} • ${fromDate} → ${toDate}`,
        },
        [{
          title_bn: `${catLabel(category)} — ${attendanceSummary.length} জন স্টাফ`,
          title_en: `${catLabel(category)} — ${attendanceSummary.length} Staff`,
          headers: [
            { bn: 'ক্রম', en: 'No.' },
            { bn: 'স্টাফ আইডি', en: 'Staff ID' },
            { bn: 'নাম', en: 'Name' },
            { bn: 'পদবি', en: 'Designation' },
            { bn: 'উপস্থিত', en: 'Present' },
            { bn: 'অনুপস্থিত', en: 'Absent' },
            { bn: 'দেরি', en: 'Late' },
            { bn: 'মোট', en: 'Total' },
            { bn: 'হার', en: 'Rate' },
          ],
          rows: attendanceSummary.map((s, i) => [
            i + 1,
            s.staff_id || '-',
            bn ? (s.name_bn || s.name_en || '-') : (s.name_en || s.name_bn || '-'),
            s.designation || '-',
            s.present, s.absent, s.late, s.total, s.rate,
          ]),
        }],
        [
          { label_bn: 'মোট স্টাফ', label_en: 'Total Staff', value: attendanceSummary.length, tone: 'accent' },
          { label_bn: 'উপস্থিত', label_en: 'Present', value: attTotals.present, tone: 'positive' },
          { label_bn: 'অনুপস্থিত', label_en: 'Absent', value: attTotals.absent, tone: 'negative' },
          { label_bn: 'দেরি', label_en: 'Late', value: attTotals.late },
          { label_bn: 'উপস্থিতি হার', label_en: 'Attendance Rate', value: attTotals.rate, tone: 'accent' },
        ],
      );
    } catch (err: any) {
      console.error('Attendance PDF generation error:', err);
      toast.error(bn ? 'PDF তৈরিতে সমস্যা হয়েছে' : 'Failed to generate PDF report');
    }
  };

  // -------- Attendance Excel --------
  const handleAttendanceExcel = async () => {
    try {
      if (!attendanceSummary.length) {
        toast.error(bn ? 'রিপোর্ট তৈরির জন্য কোনো ডেটা নেই' : 'No data available to generate report');
        return;
      }
      const xlsxMod: any = await import('xlsx-js-style');
      const XLSX: any = xlsxMod.default || xlsxMod;
      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [];

      wsData.push([ws.institution_name || '']);
      wsData.push([ws.address || '']);
      wsData.push([`${bn ? 'ফোন' : 'Phone'}: ${ws.phone || ''} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email || ''}`]);
      wsData.push([]);
      wsData.push([bn ? 'স্টাফ উপস্থিতি রিপোর্ট' : 'Staff Attendance Report']);
      wsData.push([`${bn ? 'ডিপার্টমেন্ট' : 'Department'}: ${catLabel(category)} | ${bn ? 'সময়কাল' : 'Period'}: ${fromDate} → ${toDate}`]);
      wsData.push([`${bn ? 'মোট স্টাফ' : 'Total Staff'}: ${attendanceSummary.length} | ${bn ? 'উপস্থিতি হার' : 'Rate'}: ${attTotals.rate}`]);
      wsData.push([]);

      const headers = [
        bn ? 'ক্রম' : 'No.', bn ? 'স্টাফ আইডি' : 'Staff ID', bn ? 'নাম' : 'Name',
        bn ? 'পদবি' : 'Designation', bn ? 'উপস্থিত' : 'Present', bn ? 'অনুপস্থিত' : 'Absent',
        bn ? 'দেরি' : 'Late', bn ? 'মোট' : 'Total', bn ? 'হার' : 'Rate',
      ];
      wsData.push(headers);
      attendanceSummary.forEach((s, i) => wsData.push([
        i + 1, s.staff_id || '-',
        bn ? (s.name_bn || s.name_en || '-') : (s.name_en || s.name_bn || '-'),
        s.designation || '-', s.present, s.absent, s.late, s.total, s.rate,
      ]));

      const sheet = XLSX.utils.aoa_to_sheet(wsData);
      sheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];

      const headerRowIdx = 8;
      headers.forEach((_, c) => {
        const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
        if (sheet[ref]) {
          sheet[ref].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { fgColor: { rgb: '0F766E' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
          };
        }
      });
      [0, 4].forEach(r => {
        const ref = XLSX.utils.encode_cell({ r, c: 0 });
        if (sheet[ref]) sheet[ref].s = { font: { bold: true, sz: r === 0 ? 14 : 12, color: { rgb: '0F766E' } } };
      });

      XLSX.utils.book_append_sheet(wb, sheet, bn ? 'উপস্থিতি' : 'Attendance');
      XLSX.writeFile(wb, `staff_attendance_${category}_${fromDate}_${toDate}.xlsx`);
    } catch (err: any) {
      console.error('Attendance Excel generation error:', err);
      toast.error(bn ? 'এক্সেল ফাইল তৈরিতে সমস্যা হয়েছে' : 'Failed to generate Excel file');
    }
  };

  // -------- Duty PDF --------
  const handleDutyPDF = () => {
    try {
      if (!dutyData.length) {
        toast.error(bn ? 'রিপোর্ট তৈরির জন্য কোনো ডেটা নেই' : 'No data available to generate report');
        return;
      }
      const statusLabel = (s: string) => {
        if (s === 'present') return bn ? 'উপস্থিত' : 'Present';
        if (s === 'absent') return bn ? 'অনুপস্থিত' : 'Absent';
        if (s === 'late') return bn ? 'দেরি' : 'Late';
        return bn ? 'রেকর্ড নেই' : 'No Record';
      };
      generateBilingualReport(
        {
          ...reportMeta,
          report_title_bn: 'প্রতিদিনের ডিউটি রিপোর্ট',
          report_title_en: 'Daily Duty Report',
          period_label_bn: `${catLabel(dutyCategory)} • ${dutyDate}`,
          period_label_en: `${catLabel(dutyCategory)} • ${dutyDate}`,
        },
        [{
          title_bn: `${catLabel(dutyCategory)} — ${dutyData.length} জন স্টাফ`,
          title_en: `${catLabel(dutyCategory)} — ${dutyData.length} Staff`,
          headers: [
            { bn: 'ক্রম', en: 'No.' },
            { bn: 'স্টাফ আইডি', en: 'Staff ID' },
            { bn: 'নাম', en: 'Name' },
            { bn: 'পদবি', en: 'Designation' },
            { bn: 'অবস্থা', en: 'Status' },
            { bn: 'ইন', en: 'Check-in' },
            { bn: 'আউট', en: 'Check-out' },
            { bn: 'শিফট', en: 'Shift' },
            { bn: 'মন্তব্য', en: 'Remarks' },
          ],
          rows: dutyData.map((d, i) => [
            i + 1, d.staff_id || '-',
            bn ? (d.name_bn || d.name_en || '-') : (d.name_en || d.name_bn || '-'),
            d.designation || '-', statusLabel(d.att_status),
            d.check_in, d.check_out, d.shift, d.remarks,
          ]),
        }],
        [
          { label_bn: 'মোট স্টাফ', label_en: 'Total Staff', value: dutyStats.total, tone: 'accent' },
          { label_bn: 'উপস্থিত', label_en: 'Present', value: dutyStats.present, tone: 'positive' },
          { label_bn: 'অনুপস্থিত', label_en: 'Absent', value: dutyStats.absent, tone: 'negative' },
          { label_bn: 'দেরি', label_en: 'Late', value: dutyStats.late },
          { label_bn: 'রেকর্ড নেই', label_en: 'No Record', value: dutyStats.noRec },
        ],
      );
    } catch (err: any) {
      console.error('Duty PDF generation error:', err);
      toast.error(bn ? 'PDF তৈরিতে সমস্যা হয়েছে' : 'Failed to generate PDF report');
    }
  };

  // -------- Duty Excel --------
  const handleDutyExcel = async () => {
    try {
      if (!dutyData.length) {
        toast.error(bn ? 'রিপোর্ট তৈরির জন্য কোনো ডেটা নেই' : 'No data available to generate report');
        return;
      }
      const xlsxMod: any = await import('xlsx-js-style');
      const XLSX: any = xlsxMod.default || xlsxMod;
      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [];

      const statusLabel = (s: string) => {
        if (s === 'present') return bn ? 'উপস্থিত' : 'Present';
        if (s === 'absent') return bn ? 'অনুপস্থিত' : 'Absent';
        if (s === 'late') return bn ? 'দেরি' : 'Late';
        return bn ? 'রেকর্ড নেই' : 'No Record';
      };

      wsData.push([ws.institution_name || '']);
      wsData.push([ws.address || '']);
      wsData.push([`${bn ? 'ফোন' : 'Phone'}: ${ws.phone || ''} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email || ''}`]);
      wsData.push([]);
      wsData.push([bn ? 'প্রতিদিনের ডিউটি রিপোর্ট' : 'Daily Duty Report']);
      wsData.push([`${bn ? 'তারিখ' : 'Date'}: ${dutyDate} | ${bn ? 'ডিপার্টমেন্ট' : 'Department'}: ${catLabel(dutyCategory)}`]);
      wsData.push([`${bn ? 'উপস্থিত' : 'Present'}: ${dutyStats.present} | ${bn ? 'অনুপস্থিত' : 'Absent'}: ${dutyStats.absent} | ${bn ? 'দেরি' : 'Late'}: ${dutyStats.late}`]);
      wsData.push([]);

      const headers = [
        bn ? 'ক্রম' : 'No.', bn ? 'স্টাফ আইডি' : 'Staff ID', bn ? 'নাম' : 'Name',
        bn ? 'পদবি' : 'Designation', bn ? 'অবস্থা' : 'Status',
        bn ? 'ইন' : 'Check-in', bn ? 'আউট' : 'Check-out',
        bn ? 'শিফট' : 'Shift', bn ? 'মন্তব্য' : 'Remarks',
      ];
      wsData.push(headers);
      dutyData.forEach((d, i) => wsData.push([
        i + 1, d.staff_id || '-',
        bn ? (d.name_bn || d.name_en || '-') : (d.name_en || d.name_bn || '-'),
        d.designation || '-', statusLabel(d.att_status),
        d.check_in, d.check_out, d.shift, d.remarks,
      ]));

      const sheet = XLSX.utils.aoa_to_sheet(wsData);
      sheet['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];

      const headerRowIdx = 8;
      headers.forEach((_, c) => {
        const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
        if (sheet[ref]) {
          sheet[ref].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { fgColor: { rgb: '0F766E' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
          };
        }
      });
      [0, 4].forEach(r => {
        const ref = XLSX.utils.encode_cell({ r, c: 0 });
        if (sheet[ref]) sheet[ref].s = { font: { bold: true, sz: r === 0 ? 14 : 12, color: { rgb: '0F766E' } } };
      });

      XLSX.utils.book_append_sheet(wb, sheet, bn ? 'ডিউটি' : 'Duty');
      XLSX.writeFile(wb, `staff_duty_${dutyDate}_${dutyCategory}.xlsx`);
    } catch (err: any) {
      console.error('Duty Excel generation error:', err);
      toast.error(bn ? 'এক্সেল ফাইল তৈরিতে সমস্যা হয়েছে' : 'Failed to generate Excel file');
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'present') return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">{bn ? 'উপস্থিত' : 'Present'}</Badge>;
    if (s === 'absent') return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">{bn ? 'অনুপস্থিত' : 'Absent'}</Badge>;
    if (s === 'late') return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">{bn ? 'দেরি' : 'Late'}</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">{bn ? 'রেকর্ড নেই' : 'No Record'}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              {bn ? 'স্টাফ রিপোর্ট' : 'Staff Reports'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'স্টাফদের উপস্থিতি ও দৈনিক ডিউটি বিশ্লেষণ' : 'Staff attendance and daily duty analysis'}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="attendance">
              <CalendarDays className="h-4 w-4 mr-2" />
              {bn ? 'উপস্থিতি' : 'Attendance'}
            </TabsTrigger>
            <TabsTrigger value="duty">
              <ClipboardList className="h-4 w-4 mr-2" />
              {bn ? 'দৈনিক ডিউটি' : 'Daily Duty'}
            </TabsTrigger>
          </TabsList>

          {/* ================ ATTENDANCE TAB ================ */}
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {bn ? 'উপস্থিতি ফিল্টার' : 'Attendance Filter'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'ডিপার্টমেন্ট' : 'Department'}
                    </label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAFF_CATEGORIES.map(c => (
                          <SelectItem key={c.key} value={c.key}>{bn ? c.label_bn : c.label_en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'শুরুর তারিখ' : 'From Date'}
                    </label>
                    <DatePicker value={fromDate} onChange={setFromDate} bengali={bn} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'শেষ তারিখ' : 'To Date'}
                    </label>
                    <DatePicker value={toDate} onChange={setToDate} bengali={bn} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    {attLoading ? (bn ? 'লোড হচ্ছে...' : 'Loading...') : (
                      <span>
                        <strong className="text-foreground">{attendanceSummary.length}</strong>{' '}
                        {bn ? 'জন স্টাফ' : 'staff'} • {bn ? 'মোট রেকর্ড' : 'Records'}:{' '}
                        <strong className="text-foreground">{attendance.length}</strong> •{' '}
                        {bn ? 'হার' : 'Rate'}: <strong className="text-foreground">{attTotals.rate}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleAttendancePDF} disabled={!attendanceSummary.length}>
                      <FileText className="h-4 w-4 mr-1" />PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleAttendanceExcel} disabled={!attendanceSummary.length}>
                      <Download className="h-4 w-4 mr-1" />{bn ? 'এক্সেল' : 'Excel'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {attendanceSummary.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{bn ? 'কোনো স্টাফ পাওয়া যায়নি' : 'No staff found'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-12 text-center">{bn ? 'ক্রম' : 'No.'}</TableHead>
                          <TableHead>{bn ? 'স্টাফ আইডি' : 'Staff ID'}</TableHead>
                          <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                          <TableHead>{bn ? 'পদবি' : 'Designation'}</TableHead>
                          <TableHead className="text-center">{bn ? 'উপস্থিত' : 'Present'}</TableHead>
                          <TableHead className="text-center">{bn ? 'অনুপস্থিত' : 'Absent'}</TableHead>
                          <TableHead className="text-center">{bn ? 'দেরি' : 'Late'}</TableHead>
                          <TableHead className="text-center">{bn ? 'মোট' : 'Total'}</TableHead>
                          <TableHead className="text-center">{bn ? 'হার' : 'Rate'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceSummary.map((s: any, i: number) => (
                          <TableRow key={s.id} className="hover:bg-muted/30">
                            <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{s.staff_id || '-'}</TableCell>
                            <TableCell className="font-medium">{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</TableCell>
                            <TableCell className="text-sm">{s.designation || '-'}</TableCell>
                            <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{s.present}</TableCell>
                            <TableCell className="text-center text-red-600 dark:text-red-400 font-semibold">{s.absent}</TableCell>
                            <TableCell className="text-center text-amber-600 dark:text-amber-400">{s.late}</TableCell>
                            <TableCell className="text-center font-semibold">{s.total}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px]">{s.rate}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================ DUTY TAB ================ */}
          <TabsContent value="duty" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {bn ? 'দৈনিক ডিউটি ফিল্টার' : 'Daily Duty Filter'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'তারিখ' : 'Date'}
                    </label>
                    <DatePicker value={dutyDate} onChange={setDutyDate} bengali={bn} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'ডিপার্টমেন্ট' : 'Department'}
                    </label>
                    <Select value={dutyCategory} onValueChange={setDutyCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAFF_CATEGORIES.map(c => (
                          <SelectItem key={c.key} value={c.key}>{bn ? c.label_bn : c.label_en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <div className="text-xs text-muted-foreground">{bn ? 'মোট' : 'Total'}</div>
                    <div className="text-lg font-bold">{dutyStats.total}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">{bn ? 'উপস্থিত' : 'Present'}</div>
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{dutyStats.present}</div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-2 text-center">
                    <div className="text-xs text-red-700 dark:text-red-400">{bn ? 'অনুপস্থিত' : 'Absent'}</div>
                    <div className="text-lg font-bold text-red-700 dark:text-red-400">{dutyStats.absent}</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                    <div className="text-xs text-amber-700 dark:text-amber-400">{bn ? 'দেরি' : 'Late'}</div>
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{dutyStats.late}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <div className="text-xs text-muted-foreground">{bn ? 'রেকর্ড নেই' : 'No Record'}</div>
                    <div className="text-lg font-bold">{dutyStats.noRec}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                  <Button size="sm" onClick={() => openDutyModal(null)} className="btn-primary-gradient h-8 text-xs flex items-center gap-1.5 shadow-sm">
                    <Plus className="h-3.5 w-3.5" /> {bn ? 'নতুন ডিউটি রিপোর্ট তৈরি' : 'Create Duty Report'}
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDutyPDF} disabled={!dutyData.length}>
                      <FileText className="h-4 w-4 mr-1" />PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDutyExcel} disabled={!dutyData.length}>
                      <Download className="h-4 w-4 mr-1" />{bn ? 'এক্সেল' : 'Excel'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {dutyLoading ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
                ) : dutyData.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{bn ? 'কোনো স্টাফ পাওয়া যায়নি' : 'No staff found'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-12 text-center">{bn ? 'ক্রম' : 'No.'}</TableHead>
                          <TableHead>{bn ? 'স্টাফ আইডি' : 'Staff ID'}</TableHead>
                          <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                          <TableHead>{bn ? 'পদবি' : 'Designation'}</TableHead>
                          <TableHead className="text-center">{bn ? 'অবস্থা' : 'Status'}</TableHead>
                          <TableHead className="text-center">{bn ? 'ইন' : 'Check-in'}</TableHead>
                          <TableHead className="text-center">{bn ? 'আউট' : 'Check-out'}</TableHead>
                          <TableHead className="text-center">{bn ? 'শিফট' : 'Shift'}</TableHead>
                          <TableHead>{bn ? 'মন্তব্য' : 'Remarks'}</TableHead>
                          <TableHead className="text-center w-16">{bn ? 'সম্পাদনা' : 'Edit'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dutyData.map((d: any, i: number) => (
                          <TableRow key={d.id} className="hover:bg-muted/30">
                            <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{d.staff_id || '-'}</TableCell>
                            <TableCell className="font-medium">{bn ? (d.name_bn || d.name_en) : (d.name_en || d.name_bn)}</TableCell>
                            <TableCell className="text-sm">{d.designation || '-'}</TableCell>
                            <TableCell className="text-center">{statusBadge(d.att_status)}</TableCell>
                            <TableCell className="text-center text-sm font-mono">{d.check_in}</TableCell>
                            <TableCell className="text-center text-sm font-mono">{d.check_out}</TableCell>
                            <TableCell className="text-center text-sm">{d.shift}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs">
                              <div className="line-clamp-2 whitespace-pre-wrap">{d.remarks}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                onClick={() => openDutyModal(d)}
                                title={bn ? 'ডিউটি রিপোর্ট সম্পাদন' : 'Edit Duty Report'}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Full Duty Report Dialog */}
        <Dialog open={dutyModalOpen} onOpenChange={setDutyModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {dutyTargetStaff ? (bn ? 'ডিউটি রিপোর্ট সম্পাদন' : 'Edit Duty Report') : (bn ? 'নতুন ডিউটি রিপোর্ট তৈরি' : 'Create Duty Report')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 py-1">
              {/* Select Staff if creating new, or show badge if editing */}
              {dutyTargetStaff ? (
                <div className="rounded-xl bg-muted/40 p-3 space-y-1">
                  <div className="text-sm font-semibold">
                    {bn ? (dutyTargetStaff.name_bn || dutyTargetStaff.name_en) : (dutyTargetStaff.name_en || dutyTargetStaff.name_bn)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dutyTargetStaff.staff_id || '-'} • {dutyTargetStaff.designation || '-'}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {bn ? 'স্টাফ / শিক্ষক নির্বাচন করুন' : 'Select Staff / Teacher'}
                  </label>
                  <Select value={dutyTargetStaffId} onValueChange={setDutyTargetStaffId}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'স্টাফ সিলেক্ট করুন' : 'Select Staff'} /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {dutyStaff.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)} {s.staff_id ? `(${s.staff_id})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {bn ? 'তারিখ' : 'Date'}
                  </label>
                  <DatePicker value={dutyFormDate} onChange={setDutyFormDate} bengali={bn} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {bn ? 'শিফট' : 'Shift'}
                  </label>
                  <Select value={dutyFormShift} onValueChange={setDutyFormShift}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">{bn ? 'সকাল' : 'Morning'}</SelectItem>
                      <SelectItem value="evening">{bn ? 'বিকাল' : 'Evening'}</SelectItem>
                      <SelectItem value="full_day">{bn ? 'সারাদিন' : 'Full Day'}</SelectItem>
                      <SelectItem value="night">{bn ? 'নৈশকালীন' : 'Night'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {bn ? 'অবস্থা' : 'Status'}
                  </label>
                  <Select value={dutyFormStatus} onValueChange={setDutyFormStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">{bn ? 'উপস্থিত' : 'Present'}</SelectItem>
                      <SelectItem value="late">{bn ? 'দেরি' : 'Late'}</SelectItem>
                      <SelectItem value="absent">{bn ? 'অনুপস্থিত' : 'Absent'}</SelectItem>
                      <SelectItem value="leave">{bn ? 'ছুটি' : 'Leave'}</SelectItem>
                      <SelectItem value="half_day">{bn ? 'অর্ধদিন' : 'Half Day'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {bn ? 'ইন টাইম' : 'In Time'}
                  </label>
                  <TimePicker
                    value={dutyFormCheckIn}
                    onChange={(v) => setDutyFormCheckIn(v)}
                    className="h-9 text-xs"
                    clearable
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {bn ? 'আউট টাইম' : 'Out Time'}
                  </label>
                  <TimePicker
                    value={dutyFormCheckOut}
                    onChange={(v) => setDutyFormCheckOut(v)}
                    className="h-9 text-xs"
                    clearable
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {bn ? 'ডিউটি বিবরণ ও সম্পন্ন কাজের রিপোর্ট' : 'Duty activities & remarks'}
                </label>
                <Textarea
                  value={dutyFormRemarks}
                  onChange={(e) => setDutyFormRemarks(e.target.value)}
                  placeholder={bn ? 'আজকের ক্লাসের বিবরণ, গার্ড ডিউটি বা সম্পন্ন কাজের রিপোর্ট লিখুন...' : 'Enter classes taken, duty activities, or remarks...'}
                  rows={4}
                  className="text-xs"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setDutyModalOpen(false)} disabled={savingDuty}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button onClick={saveDutyReport} disabled={savingDuty} className="btn-primary-gradient">
                {savingDuty && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {bn ? 'সংরক্ষণ করুন' : 'Save Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffReports;
