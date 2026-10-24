import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useResignedStaff } from '@/hooks/useResignedStaff';
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
import { CalendarDays, Download, FileText, Users, ClipboardList, UserCheck, Pencil, Loader2, Plus, BookOpen, Briefcase, Check, Search, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import {
  parseDutyRemarks,
  encodeDutyRemarks,
  DUTY_PRESETS,
  DutyReportDetails,
  isStaffResignedForReport,
} from '@/lib/staffDutyReportHelper';
import {
  sortStaffByDepartment,
  getDepartmentLabel,
  getStaffCategoryKey,
} from '@/lib/staffOrderHelper';
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
  { key: 'administrative', label_bn: 'প্রশাসন বিভাগ', label_en: 'Administrative' },
  { key: 'teacher', label_bn: 'শিক্ষা বিভাগ', label_en: 'Education Department' },
  { key: 'support', label_bn: 'অফিস বিভাগ', label_en: 'Office Department' },
  { key: 'general', label_bn: 'সাধারণ বিভাগ', label_en: 'General Department' },
];

const AdminStaffReports = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings: ws } = useWebsiteSettings();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') === 'duty' ? 'duty' : 'attendance');

  // ================== ATTENDANCE FILTERS ==================
  const [attStaffStatus, setAttStaffStatus] = useState<'active' | 'resigned' | 'all'>('active');
  const [category, setCategory] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>(firstOfMonth());
  const [toDate, setToDate] = useState<string>(todayISO());

  // Resigned staff hook to accurately identify staff with issued resignation letters or inactive status
  const { isResignedOnDate, getResignDate, resignedStaffIds } = useResignedStaff();

  const isStaffResigned = useCallback((s: any, refDate?: string) => {
    return isStaffResignedForReport(s, refDate || todayISO(), {
      isResignedOnDate,
      getResignDate,
      resignedStaffIds,
    });
  }, [isResignedOnDate, getResignDate, resignedStaffIds]);

  // ================== DUTY FILTERS ==================
  const [dutyDate, setDutyDate] = useState<string>(todayISO());
  const [dutyCategory, setDutyCategory] = useState<string>('all');
  const [dutySearch, setDutySearch] = useState<string>('');
  const [dutyStatusFilter, setDutyStatusFilter] = useState<string>('all');

  // Master designations and categories for department hierarchy
  const { data: masterDesignations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('designations')
        .select('id, name, name_bn, staff_category, sort_order')
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const { data: staffCategories = [] } = useQuery({
    queryKey: ['staff_categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_categories')
        .select('key, name, name_bn, sort_order')
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  // Fetch all active staff and sort strictly by department serial
  const { data: staffRaw = [] } = useQuery({
    queryKey: ['staff-reports-staff'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, staff_id, name_bn, name_en, designation, department, staff_category, phone, status, joining_date, salary_order, staff_data')
        .neq('status', 'deleted');
      return data || [];
    },
  });

  const staff = useMemo(() => {
    return sortStaffByDepartment(staffRaw, {
      categories: staffCategories,
      designations: masterDesignations,
      bn,
    });
  }, [staffRaw, staffCategories, masterDesignations, bn]);

  const filteredStaff = useMemo(() => {
    let list = staff;

    if (attStaffStatus === 'active') {
      list = list.filter((s: any) => !isStaffResigned(s, toDate) && s.status !== 'inactive' && s.status !== 'resigned');
    } else if (attStaffStatus === 'resigned') {
      list = list.filter((s: any) => isStaffResigned(s, toDate) || s.status === 'inactive' || s.status === 'resigned');
    }

    if (category === 'all') return list;
    return list.filter((s: any) => getStaffCategoryKey(s, masterDesignations) === category || s.staff_category === category);
  }, [staff, category, masterDesignations, attStaffStatus, isStaffResigned, toDate]);

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
    // Strictly exclude resigned or inactive staff on dutyDate
    const active = staff.filter((s: any) => s.status === 'active' && !isStaffResigned(s, dutyDate));
    if (dutyCategory === 'all') return active;
    return active.filter((s: any) => getStaffCategoryKey(s, masterDesignations) === dutyCategory || s.staff_category === dutyCategory);
  }, [staff, dutyCategory, masterDesignations, isStaffResigned, dutyDate]);

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
    const recMap: Record<string, any[]> = {};
    dutyRecords.forEach((r: any) => {
      if (!recMap[r.entity_id]) recMap[r.entity_id] = [];
      recMap[r.entity_id].push(r);
    });

    return dutyStaff.map((s: any) => {
      const records: any[] = recMap[s.id] || [];
      // Pick attendance record from Attendance Page:
      // Prefer full_day or record with status !== 'no_record', or the one with check_in_time
      const attRecord =
        records.find(r => r.shift === 'full_day' && r.status) ||
        records.find(r => r.status && r.status !== 'no_record') ||
        records.find(r => r.check_in_time) ||
        records[0];

      // Find any record that has remarks (teaching/duty log)
      const reportRecord = records.find(r => r.remarks && r.remarks.trim()) || attRecord;
      const parsed = parseDutyRemarks(reportRecord?.remarks);

      return {
        ...s,
        record_id: attRecord?.id || reportRecord?.id,
        att_status: attRecord?.status || 'no_record',
        raw_check_in: attRecord?.check_in_time || '',
        raw_check_out: attRecord?.check_out_time || '',
        check_in: formatTimeDisplay(attRecord?.check_in_time, bn),
        check_out: formatTimeDisplay(attRecord?.check_out_time, bn),
        shift: attRecord?.shift || reportRecord?.shift || 'full_day',
        raw_remarks: reportRecord?.remarks || '',
        teaching: parsed.teaching,
        duties: parsed.duties || [],
        duty_notes: parsed.duty_notes || '',
        notes: parsed.notes || '',
        has_teaching: !!parsed.teaching?.trim(),
        has_duties: Array.isArray(parsed.duties) && parsed.duties.length > 0,
        has_report: !!(parsed.teaching?.trim() || (parsed.duties && parsed.duties.length > 0) || parsed.duty_notes?.trim() || parsed.notes?.trim()),
      };
    });
  }, [dutyStaff, dutyRecords, bn]);

  const filteredDutyData = useMemo(() => {
    return dutyData.filter((d: any) => {
      if (dutySearch.trim()) {
        const q = dutySearch.toLowerCase().trim();
        const matchName = (d.name_bn && d.name_bn.toLowerCase().includes(q)) || (d.name_en && d.name_en.toLowerCase().includes(q));
        const matchId = d.staff_id && d.staff_id.toLowerCase().includes(q);
        const matchDesig = d.designation && d.designation.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDesig) return false;
      }
      if (dutyStatusFilter === 'present') return d.att_status === 'present';
      if (dutyStatusFilter === 'absent') return d.att_status === 'absent';
      if (dutyStatusFilter === 'late') return d.att_status === 'late';
      if (dutyStatusFilter === 'with_teaching') return d.has_teaching;
      if (dutyStatusFilter === 'with_duty') return d.has_duties;
      if (dutyStatusFilter === 'with_report') return d.has_report;
      if (dutyStatusFilter === 'without_report') return !d.has_report;
      return true;
    });
  }, [dutyData, dutySearch, dutyStatusFilter]);

  const dutyStats = useMemo(() => {
    const present = dutyData.filter(d => d.att_status === 'present').length;
    const absent = dutyData.filter(d => d.att_status === 'absent').length;
    const late = dutyData.filter(d => d.att_status === 'late').length;
    const noRec = dutyData.filter(d => d.att_status === 'no_record').length;
    const withTeaching = dutyData.filter(d => d.has_teaching).length;
    const withDuties = dutyData.filter(d => d.has_duties).length;
    const withReport = dutyData.filter(d => d.has_report).length;
    return {
      total: dutyData.length,
      present,
      absent,
      late,
      noRec,
      withTeaching,
      withDuties,
      withReport,
    };
  }, [dutyData]);

  // ================== DUTY REPORT MODAL ==================
  const [dutyModalOpen, setDutyModalOpen] = useState(false);
  const [dutyTargetStaff, setDutyTargetStaff] = useState<any | null>(null);
  const [dutyTargetStaffId, setDutyTargetStaffId] = useState<string>('');
  const [dutyFormDate, setDutyFormDate] = useState<string>(todayISO());
  const [dutyFormStatus, setDutyFormStatus] = useState<string>('present');
  const [dutyFormShift, setDutyFormShift] = useState<string>('full_day');
  const [dutyFormCheckIn, setDutyFormCheckIn] = useState<string>('');
  const [dutyFormCheckOut, setDutyFormCheckOut] = useState<string>('');
  const [dutyFormTeaching, setDutyFormTeaching] = useState<string>('');
  const [dutyFormDuties, setDutyFormDuties] = useState<string[]>([]);
  const [dutyFormDutyNotes, setDutyFormDutyNotes] = useState<string>('');
  const [dutyFormNotes, setDutyFormNotes] = useState<string>('');
  const [savingDuty, setSavingDuty] = useState(false);

  const openDutyModal = (d?: any) => {
    if (d) {
      setDutyTargetStaff(d);
      setDutyTargetStaffId(d.id);
      setDutyFormDate(dutyDate);
      setDutyFormStatus(d.att_status && d.att_status !== 'no_record' ? d.att_status : 'present');
      setDutyFormShift(d.shift && d.shift !== '-' ? d.shift : 'full_day');
      setDutyFormCheckIn(d.raw_check_in || '');
      setDutyFormCheckOut(d.raw_check_out || '');
      setDutyFormTeaching(d.teaching || '');
      setDutyFormDuties(Array.isArray(d.duties) ? d.duties : []);
      setDutyFormDutyNotes(d.duty_notes || '');
      setDutyFormNotes(d.notes || '');
    } else {
      const firstStaff = dutyStaff[0];
      setDutyTargetStaff(null);
      setDutyTargetStaffId(firstStaff?.id || '');
      setDutyFormDate(dutyDate);
      const found = firstStaff ? dutyData.find(x => x.id === firstStaff.id) : null;
      setDutyFormStatus(found?.att_status && found.att_status !== 'no_record' ? found.att_status : 'present');
      setDutyFormShift(found?.shift && found.shift !== '-' ? found.shift : 'full_day');
      setDutyFormCheckIn(found?.raw_check_in || '');
      setDutyFormCheckOut(found?.raw_check_out || '');
      setDutyFormTeaching(found?.teaching || '');
      setDutyFormDuties(Array.isArray(found?.duties) ? found.duties : []);
      setDutyFormDutyNotes(found?.duty_notes || '');
      setDutyFormNotes(found?.notes || '');
    }
    setDutyModalOpen(true);
  };

  const handleSelectStaffInModal = (staffId: string) => {
    setDutyTargetStaffId(staffId);
    const found = dutyData.find(d => d.id === staffId);
    if (found) {
      setDutyFormStatus(found.att_status && found.att_status !== 'no_record' ? found.att_status : 'present');
      setDutyFormShift(found.shift && found.shift !== '-' ? found.shift : 'full_day');
      setDutyFormCheckIn(found.raw_check_in || '');
      setDutyFormCheckOut(found.raw_check_out || '');
      setDutyFormTeaching(found.teaching || '');
      setDutyFormDuties(Array.isArray(found.duties) ? found.duties : []);
      setDutyFormDutyNotes(found.duty_notes || '');
      setDutyFormNotes(found.notes || '');
    }
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
        .select('id, shift')
        .eq('entity_type', 'staff')
        .eq('entity_id', dutyTargetStaffId)
        .eq('attendance_date', dutyFormDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const encodedRemarks = encodeDutyRemarks({
        teaching: dutyFormTeaching,
        duties: dutyFormDuties,
        duty_notes: dutyFormDutyNotes,
        notes: dutyFormNotes,
      });

      const payload = {
        entity_type: 'staff',
        entity_id: dutyTargetStaffId,
        attendance_date: dutyFormDate,
        status: dutyFormStatus,
        shift: dutyFormShift || existing?.shift || 'full_day',
        check_in_time: dutyFormCheckIn || null,
        check_out_time: dutyFormCheckOut || null,
        remarks: encodedRemarks || null,
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

      toast.success(bn ? 'ডিউটি ও পাঠদান রিপোর্ট সংরক্ষিত হয়েছে' : 'Duty and teaching report saved successfully');
      setDutyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-duty-records'] });
      queryClient.invalidateQueries({ queryKey: ['staff-att-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-duty-records'] });
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
      const stLabel = attStaffStatus === 'resigned'
        ? (bn ? 'পদত্যাগকৃত কর্মী' : 'Resigned Staff')
        : attStaffStatus === 'all'
        ? (bn ? 'সকল কর্মী' : 'All Staff')
        : (bn ? 'সক্রিয় কর্মী' : 'Active Staff');

      generateBilingualReport(
        {
          ...reportMeta,
          report_title_bn: attStaffStatus === 'resigned' ? 'পদত্যাগকৃত স্টাফ উপস্থিতি রিপোর্ট' : 'স্টাফ উপস্থিতি রিপোর্ট',
          report_title_en: attStaffStatus === 'resigned' ? 'Resigned Staff Attendance Report' : 'Staff Attendance Report',
          period_label_bn: `${catLabel(category)} • ${stLabel} • ${fromDate} → ${toDate}`,
          period_label_en: `${catLabel(category)} • ${stLabel} • ${fromDate} → ${toDate}`,
        },
        [{
          title_bn: `${catLabel(category)} (${stLabel}) — ${attendanceSummary.length} জন স্টাফ`,
          title_en: `${catLabel(category)} (${stLabel}) — ${attendanceSummary.length} Staff`,
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
      const stLabel = attStaffStatus === 'resigned'
        ? (bn ? 'পদত্যাগকৃত কর্মী' : 'Resigned Staff')
        : attStaffStatus === 'all'
        ? (bn ? 'সকল কর্মী' : 'All Staff')
        : (bn ? 'সক্রিয় কর্মী' : 'Active Staff');

      const xlsxMod: any = await import('xlsx-js-style');
      const XLSX: any = xlsxMod.default || xlsxMod;
      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [];

      wsData.push([ws.institution_name || '']);
      wsData.push([ws.address || '']);
      wsData.push([`${bn ? 'ফোন' : 'Phone'}: ${ws.phone || ''} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email || ''}`]);
      wsData.push([]);
      wsData.push([bn ? (attStaffStatus === 'resigned' ? 'পদত্যাগকৃত স্টাফ উপস্থিতি রিপোর্ট' : 'স্টাফ উপস্থিতি রিপোর্ট') : (attStaffStatus === 'resigned' ? 'Resigned Staff Attendance Report' : 'Staff Attendance Report')]);
      wsData.push([`${bn ? 'ডিপার্টমেন্ট' : 'Department'}: ${catLabel(category)} | ${bn ? 'অবস্থা' : 'Status'}: ${stLabel} | ${bn ? 'সময়কাল' : 'Period'}: ${fromDate} → ${toDate}`]);
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
      if (!filteredDutyData.length) {
        toast.error(bn ? 'রিপোর্ট তৈরির জন্য কোনো ডেটা নেই' : 'No data available to generate report');
        return;
      }
      const statusLabel = (s: string) => {
        if (s === 'present') return bn ? 'উপস্থিত' : 'Present';
        if (s === 'absent') return bn ? 'অনুপস্থিত' : 'Absent';
        if (s === 'late') return bn ? 'দেরি' : 'Late';
        if (s === 'leave') return bn ? 'ছুটি' : 'Leave';
        if (s === 'half_day') return bn ? 'অর্ধদিন' : 'Half Day';
        return bn ? 'রেকর্ড নেই' : 'No Record';
      };
      generateBilingualReport(
        {
          ...reportMeta,
          report_title_bn: 'দৈনিক পাঠদান ও ডিউটি রিপোর্ট',
          report_title_en: 'Daily Teaching & Duty Report',
          period_label_bn: `${catLabel(dutyCategory)} • ${dutyDate}`,
          period_label_en: `${catLabel(dutyCategory)} • ${dutyDate}`,
        },
        [{
          title_bn: `${catLabel(dutyCategory)} — ${filteredDutyData.length} জন স্টাফ`,
          title_en: `${catLabel(dutyCategory)} — ${filteredDutyData.length} Staff`,
          headers: [
            { bn: 'ক্রম', en: 'No.' },
            { bn: 'স্টাফ আইডি', en: 'Staff ID' },
            { bn: 'নাম ও পদবি', en: 'Name & Designation' },
            { bn: 'উপস্থিতি (হাজিরা পেজ)', en: 'Attendance' },
            { bn: 'ইন - আউট সময়', en: 'In - Out Time' },
            { bn: 'পাঠদান বিবরণ', en: 'Teaching Log' },
            { bn: 'দায়িত্ব পালন বিবরণ', en: 'Duties Performed' },
            { bn: 'মন্তব্য', en: 'Remarks' },
          ],
          rows: filteredDutyData.map((d, i) => [
            i + 1,
            d.staff_id || '-',
            `${bn ? (d.name_bn || d.name_en || '-') : (d.name_en || d.name_bn || '-')}\n(${d.designation || '-'})`,
            statusLabel(d.att_status),
            (d.check_in !== '-' || d.check_out !== '-') ? `${d.check_in} - ${d.check_out}` : '-',
            d.teaching || '-',
            (d.duties && d.duties.length > 0)
              ? (d.duties.join(', ') + (d.duty_notes ? `\n(${d.duty_notes})` : ''))
              : (d.duty_notes || '-'),
            d.notes || '-',
          ]),
        }],
        [
          { label_bn: 'মোট স্টাফ', label_en: 'Total Staff', value: dutyStats.total, tone: 'accent' },
          { label_bn: 'উপস্থিত', label_en: 'Present', value: dutyStats.present, tone: 'positive' },
          { label_bn: 'অনুপস্থিত', label_en: 'Absent', value: dutyStats.absent, tone: 'negative' },
          { label_bn: 'দেরি', label_en: 'Late', value: dutyStats.late },
          { label_bn: 'পাঠদান সম্পন্ন', label_en: 'Teaching Log', value: dutyStats.withTeaching },
          { label_bn: 'ডিউটি সম্পন্ন', label_en: 'Duties Done', value: dutyStats.withDuties },
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
      if (!filteredDutyData.length) {
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
        if (s === 'leave') return bn ? 'ছুটি' : 'Leave';
        if (s === 'half_day') return bn ? 'অর্ধদিন' : 'Half Day';
        return bn ? 'রেকর্ড নেই' : 'No Record';
      };

      wsData.push([ws.institution_name || '']);
      wsData.push([ws.address || '']);
      wsData.push([`${bn ? 'ফোন' : 'Phone'}: ${ws.phone || ''} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email || ''}`]);
      wsData.push([]);
      wsData.push([bn ? 'দৈনিক পাঠদান ও ডিউটি রিপোর্ট' : 'Daily Teaching & Duty Report']);
      wsData.push([`${bn ? 'তারিখ' : 'Date'}: ${dutyDate} | ${bn ? 'ডিপার্টমেন্ট' : 'Department'}: ${catLabel(dutyCategory)}`]);
      wsData.push([`${bn ? 'মোট' : 'Total'}: ${dutyStats.total} | ${bn ? 'উপস্থিত' : 'Present'}: ${dutyStats.present} | ${bn ? 'অনুপস্থিত' : 'Absent'}: ${dutyStats.absent} | ${bn ? 'দেরি' : 'Late'}: ${dutyStats.late} | ${bn ? 'পাঠদান এন্ট্রি' : 'Teaching'}: ${dutyStats.withTeaching} | ${bn ? 'ডিউটি এন্ট্রি' : 'Duties'}: ${dutyStats.withDuties}`]);
      wsData.push([]);

      const headers = [
        bn ? 'ক্রম' : 'No.',
        bn ? 'স্টাফ আইডি' : 'Staff ID',
        bn ? 'নাম' : 'Name',
        bn ? 'পদবি' : 'Designation',
        bn ? 'উপস্থিতি (হাজিরা পেজ)' : 'Attendance (Page)',
        bn ? 'ইন সময়' : 'Check-in',
        bn ? 'আউট সময়' : 'Check-out',
        bn ? 'পাঠদান বিবরণ' : 'Classes/Topics Taught',
        bn ? 'দায়িত্ব পালন বিবরণ' : 'Duties Performed',
        bn ? 'মন্তব্য' : 'Remarks',
      ];
      wsData.push(headers);
      filteredDutyData.forEach((d, i) => wsData.push([
        i + 1,
        d.staff_id || '-',
        bn ? (d.name_bn || d.name_en || '-') : (d.name_en || d.name_bn || '-'),
        d.designation || '-',
        statusLabel(d.att_status),
        d.check_in,
        d.check_out,
        d.teaching || '-',
        (d.duties && d.duties.length > 0)
          ? (d.duties.join(', ') + (d.duty_notes ? ` (${d.duty_notes})` : ''))
          : (d.duty_notes || '-'),
        d.notes || '-',
      ]));

      const sheet = XLSX.utils.aoa_to_sheet(wsData);
      sheet['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 24 },
        { wch: 20 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 35 },
        { wch: 30 },
        { wch: 22 },
      ];

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

      XLSX.utils.book_append_sheet(wb, sheet, bn ? 'ডিউটি ও পাঠদান' : 'Duty & Teaching');
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
    if (s === 'leave') return <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">{bn ? 'ছুটি' : 'Leave'}</Badge>;
    if (s === 'half_day') return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">{bn ? 'অর্ধদিন' : 'Half Day'}</Badge>;
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'কর্মীর অবস্থা (স্ট্যাটাস)' : 'Staff Status'}
                    </label>
                    <Select value={attStaffStatus} onValueChange={(v: any) => setAttStaffStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{bn ? 'সক্রিয় কর্মী (ডিফল্ট)' : 'Active Staff Only'}</SelectItem>
                        <SelectItem value="resigned">{bn ? 'পদত্যাগকৃত কর্মী' : 'Resigned Staff'}</SelectItem>
                        <SelectItem value="all">{bn ? 'সকল কর্মী (সক্রিয় ও পদত্যাগকৃত)' : 'All Staff'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    <p className="text-sm">
                      {bn
                        ? (attStaffStatus === 'resigned' ? 'কোনো পদত্যাগকৃত স্টাফের রেকর্ড পাওয়া যায়নি' : 'কোনো স্টাফ পাওয়া যায়নি')
                        : (attStaffStatus === 'resigned' ? 'No resigned staff found' : 'No staff found')}
                    </p>
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
                            <TableCell className="font-medium">
                              <span>{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</span>
                              {isStaffResigned(s, toDate) && (
                                <Badge variant="outline" className="ml-2 text-[10px] bg-red-500/10 text-red-600 border-red-200 dark:border-red-900">
                                  {bn ? 'পদত্যাগকৃত' : 'Resigned'}
                                </Badge>
                              )}
                            </TableCell>
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
                  {bn ? 'দৈনিক পাঠদান ও ডিউটি ফিল্টার' : 'Daily Teaching & Duty Filter'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'অনুসন্ধান' : 'Search Staff'}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={dutySearch}
                        onChange={e => setDutySearch(e.target.value)}
                        placeholder={bn ? 'নাম বা আইডি দিয়ে খুঁজুন...' : 'Search by name or ID...'}
                        className="pl-8 h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {bn ? 'অবস্থা ফিল্টার' : 'Filter by Status'}
                    </label>
                    <Select value={dutyStatusFilter} onValueChange={setDutyStatusFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{bn ? 'সকল অবস্থা' : 'All Status'}</SelectItem>
                        <SelectItem value="present">{bn ? 'উপস্থিত' : 'Present'}</SelectItem>
                        <SelectItem value="absent">{bn ? 'অনুপস্থিত' : 'Absent'}</SelectItem>
                        <SelectItem value="late">{bn ? 'দেরি' : 'Late'}</SelectItem>
                        <SelectItem value="with_teaching">{bn ? 'পাঠদান সম্পন্ন' : 'With Teaching'}</SelectItem>
                        <SelectItem value="with_duty">{bn ? 'ডিউটি সম্পন্ন' : 'With Duties'}</SelectItem>
                        <SelectItem value="with_report">{bn ? 'রিপোর্ট জমা হয়েছে' : 'Report Submitted'}</SelectItem>
                        <SelectItem value="without_report">{bn ? 'রিপোর্ট বাকি' : 'No Report Yet'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <div className="text-[11px] text-muted-foreground">{bn ? 'মোট স্টাফ' : 'Total'}</div>
                    <div className="text-base font-bold">{dutyStats.total}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400">{bn ? 'উপস্থিত' : 'Present'}</div>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">{dutyStats.present}</div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-2 text-center">
                    <div className="text-[11px] text-red-700 dark:text-red-400">{bn ? 'অনুপস্থিত' : 'Absent'}</div>
                    <div className="text-base font-bold text-red-700 dark:text-red-400">{dutyStats.absent}</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">{bn ? 'দেরি' : 'Late'}</div>
                    <div className="text-base font-bold text-amber-700 dark:text-amber-400">{dutyStats.late}</div>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-2 text-center">
                    <div className="text-[11px] text-blue-700 dark:text-blue-400">{bn ? 'পাঠদান এন্ট্রি' : 'Teaching'}</div>
                    <div className="text-base font-bold text-blue-700 dark:text-blue-400">{dutyStats.withTeaching}</div>
                  </div>
                  <div className="rounded-lg bg-purple-500/10 p-2 text-center">
                    <div className="text-[11px] text-purple-700 dark:text-purple-400">{bn ? 'ডিউটি এন্ট্রি' : 'Duties'}</div>
                    <div className="text-base font-bold text-purple-700 dark:text-purple-400">{dutyStats.withDuties}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                  <Button size="sm" onClick={() => openDutyModal(null)} className="btn-primary-gradient h-8 text-xs flex items-center gap-1.5 shadow-sm">
                    <Plus className="h-3.5 w-3.5" /> {bn ? 'নতুন ডিউটি ও পাঠদান এন্ট্রি' : 'New Teaching & Duty Entry'}
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDutyPDF} disabled={!filteredDutyData.length}>
                      <FileText className="h-4 w-4 mr-1" />PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDutyExcel} disabled={!filteredDutyData.length}>
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
                ) : filteredDutyData.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{bn ? 'কোনো স্টাফের রেকর্ড পাওয়া যায়নি' : 'No staff record found'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-12 text-center">{bn ? 'ক্রম' : 'No.'}</TableHead>
                          <TableHead className="w-24">{bn ? 'স্টাফ আইডি' : 'Staff ID'}</TableHead>
                          <TableHead className="min-w-[180px]">{bn ? 'শিক্ষক / স্টাফ' : 'Teacher / Staff'}</TableHead>
                          <TableHead className="min-w-[160px] text-center">{bn ? 'উপস্থিতি (হাজিরা পেজ)' : 'Attendance (Page)'}</TableHead>
                          <TableHead className="min-w-[220px]">{bn ? 'পাঠদান বিবরণ' : 'Teaching Log (Classes & Topics)'}</TableHead>
                          <TableHead className="min-w-[200px]">{bn ? 'দায়িত্ব পালন বিবরণ' : 'Duties & Responsibilities'}</TableHead>
                          <TableHead className="min-w-[140px]">{bn ? 'মন্তব্য' : 'Remarks'}</TableHead>
                          <TableHead className="text-center w-16">{bn ? 'সম্পাদনা' : 'Edit'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDutyData.map((d: any, i: number) => (
                          <TableRow key={d.id} className="hover:bg-muted/30">
                            <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{d.staff_id || '-'}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm text-foreground">
                                {bn ? (d.name_bn || d.name_en) : (d.name_en || d.name_bn)}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span>{d.designation || '-'}</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-muted/60 text-muted-foreground">
                                  {getDepartmentLabel(getStaffCategoryKey(d, masterDesignations), bn, staffCategories)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                {statusBadge(d.att_status)}
                                {(d.check_in !== '-' || d.check_out !== '-') ? (
                                  <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3 opacity-60" />
                                    <span>{d.check_in}</span>
                                    <span>-</span>
                                    <span>{d.check_out}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/60 italic">
                                    {bn ? 'সময় এন্ট্রি নেই' : 'No time'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {d.teaching ? (
                                <div className="space-y-1">
                                  <div className="flex items-start gap-1.5 text-xs text-foreground font-medium">
                                    <BookOpen className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                    <div className="whitespace-pre-wrap line-clamp-3 text-xs leading-relaxed">
                                      {d.teaching}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">
                                  {bn ? '— পাঠদান এন্ট্রি নেই —' : '— No teaching entry —'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {d.duties && d.duties.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {d.duties.map((dt: string) => (
                                      <Badge
                                        key={dt}
                                        variant="secondary"
                                        className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0.5 px-1.5 font-medium"
                                      >
                                        {dt}
                                      </Badge>
                                    ))}
                                  </div>
                                  {d.duty_notes && (
                                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                                      {d.duty_notes}
                                    </p>
                                  )}
                                </div>
                              ) : d.duty_notes ? (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                  {d.duty_notes}
                                </p>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">
                                  {bn ? '— কোনো ডিউটি নেই —' : '— No duty entry —'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {d.notes ? (
                                <div className="line-clamp-2 whitespace-pre-wrap">{d.notes}</div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                onClick={() => openDutyModal(d)}
                                title={bn ? 'ডিউটি ও পাঠদান সম্পাদন' : 'Edit Duty & Teaching'}
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

        {/* Full Duty & Teaching Report Dialog */}
        <Dialog open={dutyModalOpen} onOpenChange={setDutyModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {dutyTargetStaff
                  ? (bn ? 'ডিউটি ও পাঠদান রিপোর্ট সম্পাদনা' : 'Edit Duty & Teaching Report')
                  : (bn ? 'নতুন দৈনিক ডিউটি ও পাঠদান এন্ট্রি' : 'Create Teaching & Duty Entry')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-1">
              {/* Staff header / selector */}
              {dutyTargetStaff ? (
                <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {bn ? (dutyTargetStaff.name_bn || dutyTargetStaff.name_en) : (dutyTargetStaff.name_en || dutyTargetStaff.name_bn)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {dutyTargetStaff.staff_id ? `আইডি: ${dutyTargetStaff.staff_id} • ` : ''}
                      {dutyTargetStaff.designation || '-'}
                      {dutyTargetStaff.department ? ` (${dutyTargetStaff.department})` : ''}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {dutyTargetStaff.staff_category || 'staff'}
                  </Badge>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {bn ? 'স্টাফ / শিক্ষক নির্বাচন করুন' : 'Select Staff / Teacher'}
                  </label>
                  <Select value={dutyTargetStaffId} onValueChange={handleSelectStaffInModal}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={bn ? 'স্টাফ সিলেক্ট করুন' : 'Select Staff'} /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {dutyStaff.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)} {s.staff_id ? `(${s.staff_id})` : ''} - {s.designation || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date & Shift */}
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
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_day">{bn ? 'পূর্ণকালীন (সারাদিন)' : 'Full Day'}</SelectItem>
                      <SelectItem value="morning">{bn ? 'সকাল' : 'Morning'}</SelectItem>
                      <SelectItem value="evening">{bn ? 'বিকাল' : 'Evening'}</SelectItem>
                      <SelectItem value="night">{bn ? 'নৈশকালীন' : 'Night'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attendance section (Synced with Attendance Page) */}
              <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-blue-50/60 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-300">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {bn ? 'উপস্থিতি তথ্য (উপস্থিতি পেজ থেকে প্রাপ্ত)' : 'Attendance Record (Synced from Attendance Page)'}
                  </div>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                    {bn ? 'উপস্থিতি পেজের সাথে সংযুক্ত' : 'Live Sync'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {bn ? 'হাজিরার অবস্থা' : 'Status'}
                    </label>
                    <Select value={dutyFormStatus} onValueChange={setDutyFormStatus}>
                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
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
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {bn ? 'ইন টাইম (প্রবেশ)' : 'Check-In Time'}
                    </label>
                    <TimePicker
                      value={dutyFormCheckIn}
                      onChange={(v) => setDutyFormCheckIn(v)}
                      className="h-8 text-xs bg-background"
                      clearable
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {bn ? 'আউট টাইম (প্রস্থান)' : 'Check-Out Time'}
                    </label>
                    <TimePicker
                      value={dutyFormCheckOut}
                      onChange={(v) => setDutyFormCheckOut(v)}
                      className="h-8 text-xs bg-background"
                      clearable
                    />
                  </div>
                </div>
              </div>

              {/* Teaching section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {bn ? 'শ্রেণি ও পাঠদান বিবরণ (বিষয় ও আলোচিত পাঠ)' : 'Classes & Subjects Taught Today'}
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {bn ? 'পাঠদান বিবরণ' : 'Teaching Log'}
                  </span>
                </div>
                <Textarea
                  value={dutyFormTeaching}
                  onChange={(e) => setDutyFormTeaching(e.target.value)}
                  placeholder={bn
                    ? 'আজকে গৃহীত ক্লাস এবং পাঠদানের বিস্তারিত বিবরণ লিখুন...\nউদাহরণ:\n• ৫ম শ্রেণি - কুরআন মাজিদ (সূরা ফাতিহা ও ইখলাস হিফয)\n• ৮ম শ্রেণি - গণিত (অধ্যায় ৩: বীজগণিতীয় সূত্রাবলি অনুশীলন)\n• ৯ম শ্রেণি - বাংলা ১ম পত্র (কবিতা: বঙ্গবাণী)'
                    : 'Enter classes taken, subjects, chapters, and topics taught...'}
                  rows={3}
                  className="text-xs"
                />
              </div>

              {/* Duty section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-primary" />
                    {bn ? 'সম্পাদিত দায়িত্ব ও ডিউটি (প্রযোজ্য দায়িত্বসমূহ নির্বাচন করুন)' : 'Duties Performed (Select all that apply)'}
                  </label>
                  {dutyFormDuties.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDutyFormDuties([])}
                      className="text-[11px] text-muted-foreground hover:text-destructive underline"
                    >
                      {bn ? 'সব মুছুন' : 'Clear all'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl border bg-muted/20">
                  {DUTY_PRESETS.map((dp) => {
                    const isSelected = dutyFormDuties.includes(dp.label_bn);
                    return (
                      <button
                        key={dp.id}
                        type="button"
                        onClick={() => {
                          setDutyFormDuties(prev =>
                            isSelected ? prev.filter(x => x !== dp.label_bn) : [...prev, dp.label_bn]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                            : 'bg-background hover:bg-muted/60 border-muted text-muted-foreground'
                        }`}
                      >
                        <span className="text-sm">{dp.icon}</span>
                        <span className="truncate flex-1">{bn ? dp.label_bn : dp.label_en}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <Input
                  value={dutyFormDutyNotes}
                  onChange={(e) => setDutyFormDutyNotes(e.target.value)}
                  placeholder={bn ? 'ডিউটির অতিরিক্ত বিবরণ বা স্থান (যেমন: ২য় তলার হোস্টেল, হল রুম ৩...)' : 'Additional duty details (e.g. 2nd floor hostel, Hall 3...)'}
                  className="h-8 text-xs"
                />
              </div>

              {/* Remarks section */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {bn ? 'সাধারণ মন্তব্য (যদি থাকে)' : 'General Remarks (Optional)'}
                </label>
                <Input
                  value={dutyFormNotes}
                  onChange={(e) => setDutyFormNotes(e.target.value)}
                  placeholder={bn ? 'অতিরিক্ত মন্তব্য বা পর্যবেক্ষণ...' : 'Any remarks or observations...'}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
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
