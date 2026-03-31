import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Wallet, Users, Search, Save, Download, Printer, Settings2,
  CheckCircle2, Clock, AlertCircle, ChevronDown, Edit2, Eye,
  Calculator, Plus, Trash2, DollarSign, FileText, Timer
} from 'lucide-react';

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

// Helper: parse "HH:MM" to total minutes from midnight
const timeToMinutes = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime12h = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const AdminSalary = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialog, setEditDialog] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [dutyDialog, setDutyDialog] = useState<any>(null);

  const monthYear = `${selectedYear}-${selectedMonth}`;

  // Fetch active staff
  const { data: staff = [] } = useQuery({
    queryKey: ['salary-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').eq('status', 'active').order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  // Fetch salary records for selected month
  const { data: salaryRecords = [] } = useQuery({
    queryKey: ['salary-records', monthYear],
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_records').select('*').eq('month_year', monthYear);
      if (error) throw error;
      return data;
    },
  });

  // Fetch attendance data for the month
  const { data: attendanceData = [] } = useQuery({
    queryKey: ['salary-attendance', monthYear],
    queryFn: async () => {
      const startDate = `${monthYear}-01`;
      const endDate = `${monthYear}-31`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('entity_type', 'staff')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch salary settings
  const { data: settings = [] } = useQuery({
    queryKey: ['salary-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_settings').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch salary formulas from formula builder
  const { data: salaryFormulas = [] } = useQuery({
    queryKey: ['salary-formulas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('formulas').select('*').eq('module', 'salary').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Get setting value helper
  const getSetting = (key: string) => {
    const s = settings.find((st: any) => st.setting_key === key);
    return s?.setting_value as any || {};
  };

  // Calculate attendance stats with per-minute tracking
  const getAttendanceStats = (staffMember: any) => {
    const records = attendanceData.filter((a: any) => a.entity_id === staffMember.id);
    const present = records.filter((r: any) => r.status === 'present').length;
    const absent = records.filter((r: any) => r.status === 'absent').length;
    const late = records.filter((r: any) => r.status === 'late').length;
    const halfDay = records.filter((r: any) => r.status === 'half_day').length;

    // Per-minute calculation
    const dutyStart = timeToMinutes(staffMember.duty_start_time || '08:00');
    const dutyEnd = timeToMinutes(staffMember.duty_end_time || '17:00');
    const scheduledMinutesPerDay = dutyEnd - dutyStart;

    let totalMissedMinutes = 0;
    let totalOvertimeMinutes = 0;

    records.forEach((r: any) => {
      if (r.status === 'absent') return; // full day deduction handled separately
      const checkIn = r.check_in_time ? timeToMinutes(r.check_in_time) : dutyStart;
      const checkOut = r.check_out_time ? timeToMinutes(r.check_out_time) : dutyEnd;

      // Late arrival minutes
      const lateMinutes = Math.max(0, checkIn - dutyStart);
      // Early exit minutes
      const earlyExitMinutes = Math.max(0, dutyEnd - checkOut);
      // Overtime (stayed after duty end)
      const overtimeMinutes = Math.max(0, checkOut - dutyEnd);

      totalMissedMinutes += lateMinutes + earlyExitMinutes;
      totalOvertimeMinutes += overtimeMinutes;
    });

    return { present, absent, late, halfDay, total: records.length, totalMissedMinutes, totalOvertimeMinutes, scheduledMinutesPerDay };
  };

  // Evaluate a formula expression safely
  const evaluateFormula = (formulaStr: string, vars: Record<string, number>): number => {
    try {
      let expr = formulaStr;
      for (const [key, val] of Object.entries(vars)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val));
      }
      if (/^[\d\s+\-*/().]+$/.test(expr)) {
        const result = new Function(`return (${expr})`)();
        return isNaN(result) || !isFinite(result) ? 0 : Math.round(result);
      }
      return 0;
    } catch { return 0; }
  };

  // Get formula by result_field
  const getFormula = (resultField: string) => {
    return salaryFormulas.find((f: any) => {
      const expr = f.expression as any;
      return expr?.result_field === resultField;
    });
  };

  // Calculate salary for a staff member using per-minute logic
  const calculateSalary = (staffMember: any) => {
    const baseSalary = Number(staffMember.salary) || 0;
    const attStats = getAttendanceStats(staffMember);
    const lateDeductionSetting = getSetting('late_deduction_per_day');
    const defaultLateRate = Number(lateDeductionSetting?.amount) || 50;
    const calcMode = getSetting('calculation_mode')?.mode || 'per_minute';

    const year = Number(selectedYear);
    const month = Number(selectedMonth);
    const workingDays = new Date(year, month, 0).getDate();

    const dailyRate = baseSalary / 30;
    const perMinuteRate = attStats.scheduledMinutesPerDay > 0 ? dailyRate / attStats.scheduledMinutesPerDay : 0;

    // Build variables context
    const ctx: Record<string, number> = {
      base_salary: baseSalary,
      working_days: workingDays,
      present_days: attStats.present,
      absent_days: attStats.absent,
      late_days: attStats.late,
      half_days: attStats.halfDay,
      late_rate: defaultLateRate,
      daily_rate: Math.round(dailyRate),
      per_minute_rate: Math.round(perMinuteRate * 100) / 100,
      missed_minutes: attStats.totalMissedMinutes,
      overtime_minutes: attStats.totalOvertimeMinutes,
      scheduled_minutes: attStats.scheduledMinutesPerDay,
      percentage: 100,
      bonus: 0, overtime: 0, other_allowance: 0, advance_deduction: 0,
    };

    // Calculate deductions based on mode
    if (calcMode === 'per_minute') {
      // Per-minute: absence = full day, late/early = per minute
      ctx.absence_deduction = Math.round(attStats.absent * dailyRate);
      ctx.late_deduction = Math.round(attStats.totalMissedMinutes * perMinuteRate);
      ctx.overtime = Math.round(attStats.totalOvertimeMinutes * perMinuteRate);
    } else {
      // Legacy fixed-rate mode
      const absFormula = getFormula('absence_deduction');
      if (absFormula) {
        const expr = (absFormula.expression as any)?.formula;
        ctx.absence_deduction = evaluateFormula(expr, ctx);
      } else {
        ctx.absence_deduction = Math.round(attStats.absent * (baseSalary / workingDays));
      }

      const lateFormula = getFormula('late_deduction');
      if (lateFormula) {
        const expr = (lateFormula.expression as any)?.formula;
        ctx.late_deduction = evaluateFormula(expr, ctx);
      } else {
        ctx.late_deduction = attStats.late * defaultLateRate;
      }
    }

    // Half day deduction
    ctx.other_deduction = Math.round(attStats.halfDay * (baseSalary / workingDays / 2));

    // Apply net salary formula
    const netFormula = getFormula('net_salary');
    if (netFormula) {
      const expr = (netFormula.expression as any)?.formula;
      ctx.net_salary = Math.max(0, evaluateFormula(expr, ctx));
    } else {
      ctx.net_salary = Math.max(0, baseSalary + ctx.overtime + ctx.bonus + ctx.other_allowance
        - ctx.absence_deduction - ctx.late_deduction - ctx.other_deduction - ctx.advance_deduction);
    }

    return {
      base_salary: baseSalary,
      working_days: workingDays,
      present_days: attStats.present,
      absent_days: attStats.absent,
      late_days: attStats.late,
      absence_deduction: ctx.absence_deduction,
      late_deduction: ctx.late_deduction,
      other_deduction: ctx.other_deduction,
      bonus: ctx.bonus,
      overtime: ctx.overtime,
      other_allowance: ctx.other_allowance,
      advance_deduction: ctx.advance_deduction,
      net_salary: ctx.net_salary,
    };
  };

  // Generate salary sheet mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const records = staff.map((s: any) => {
        const existing = salaryRecords.find((r: any) => r.staff_id === s.id);
        if (existing) return null;
        const calc = calculateSalary(s);
        return { staff_id: s.id, month_year: monthYear, ...calc, status: 'pending' };
      }).filter(Boolean);

      if (records.length === 0) {
        toast.info(bn ? 'ইতোমধ্যে সব বেতন জেনারেট হয়েছে' : 'All salaries already generated');
        return;
      }

      const { error } = await supabase.from('salary_records').insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      toast.success(bn ? 'বেতন শিট জেনারেট হয়েছে' : 'Salary sheet generated');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error generating salary'),
  });

  // Update single salary record
  const updateMutation = useMutation({
    mutationFn: async (record: any) => {
      const { staffName, ...cleanRecord } = record;
      const ctx: Record<string, number> = {
        base_salary: Number(cleanRecord.base_salary || 0),
        bonus: Number(cleanRecord.bonus || 0),
        overtime: Number(cleanRecord.overtime || 0),
        other_allowance: Number(cleanRecord.other_allowance || 0),
        late_deduction: Number(cleanRecord.late_deduction || 0),
        absence_deduction: Number(cleanRecord.absence_deduction || 0),
        advance_deduction: Number(cleanRecord.advance_deduction || 0),
        other_deduction: Number(cleanRecord.other_deduction || 0),
      };
      const netFormula = getFormula('net_salary');
      let netSalary: number;
      if (netFormula) {
        const expr = (netFormula.expression as any)?.formula;
        netSalary = Math.max(0, evaluateFormula(expr, ctx));
      } else {
        netSalary = ctx.base_salary + ctx.bonus + ctx.overtime + ctx.other_allowance
          - ctx.late_deduction - ctx.absence_deduction - ctx.advance_deduction - ctx.other_deduction;
      }
      const { error } = await supabase.from('salary_records')
        .update({ ...cleanRecord, net_salary: Math.max(0, netSalary), updated_at: new Date().toISOString() })
        .eq('id', cleanRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      setEditDialog(null);
      toast.success(bn ? 'আপডেট হয়েছে' : 'Updated');
    },
  });

  // Mark as paid
  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('salary_records')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      toast.success(bn ? 'পরিশোধিত হিসেবে চিহ্নিত' : 'Marked as paid');
    },
  });

  // Update duty time for a staff member
  const updateDutyMutation = useMutation({
    mutationFn: async ({ staffId, dutyStart, dutyEnd }: { staffId: string; dutyStart: string; dutyEnd: string }) => {
      const { error } = await supabase.from('staff')
        .update({ duty_start_time: dutyStart, duty_end_time: dutyEnd, updated_at: new Date().toISOString() })
        .eq('id', staffId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-staff'] });
      setDutyDialog(null);
      toast.success(bn ? 'ডিউটি সময় আপডেট হয়েছে' : 'Duty time updated');
    },
  });

  // Save settings
  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const existing = settings.find((s: any) => s.setting_key === key);
      if (existing) {
        const { error } = await supabase.from('salary_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('salary_settings')
          .insert({ setting_key: key, setting_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-settings'] });
      toast.success(bn ? 'সেটিংস সেভ হয়েছে' : 'Settings saved');
    },
  });

  // Filter staff
  const filtered = staff.filter((s: any) => {
    const q = searchQuery.toLowerCase();
    return (s.name_bn + (s.name_en || '') + (s.designation || '')).toLowerCase().includes(q);
  });

  // Get record for a staff
  const getRecord = (staffId: string) => salaryRecords.find((r: any) => r.staff_id === staffId);

  // Stats
  const stats = useMemo(() => {
    const totalBase = salaryRecords.reduce((s: number, r: any) => s + Number(r.base_salary || 0), 0);
    const totalNet = salaryRecords.reduce((s: number, r: any) => s + Number(r.net_salary || 0), 0);
    const totalDeduction = salaryRecords.reduce((s: number, r: any) => s + Number(r.late_deduction || 0) + Number(r.absence_deduction || 0) + Number(r.advance_deduction || 0) + Number(r.other_deduction || 0), 0);
    const paid = salaryRecords.filter((r: any) => r.status === 'paid').length;
    const pending = salaryRecords.filter((r: any) => r.status === 'pending').length;
    return { totalBase, totalNet, totalDeduction, paid, pending };
  }, [salaryRecords]);

  // Export CSV
  const exportCSV = () => {
    const BOM = '\uFEFF';
    const headers = [bn ? 'নাম' : 'Name', bn ? 'পদবি' : 'Designation', bn ? 'মূল বেতন' : 'Base Salary',
      bn ? 'বোনাস' : 'Bonus', bn ? 'ওভারটাইম' : 'Overtime', bn ? 'কর্তন' : 'Deductions', bn ? 'অগ্রিম' : 'Advance', bn ? 'নিট বেতন' : 'Net Salary', bn ? 'স্ট্যাটাস' : 'Status'];
    const rows = filtered.map((s: any) => {
      const rec = getRecord(s.id);
      return [
        s.name_bn, s.designation || '-',
        rec?.base_salary || s.salary || 0, rec?.bonus || 0, rec?.overtime || 0,
        (Number(rec?.late_deduction || 0) + Number(rec?.absence_deduction || 0) + Number(rec?.other_deduction || 0)),
        rec?.advance_deduction || 0,
        rec?.net_salary || 0, rec?.status || 'not_generated'
      ].join(',');
    });
    const csv = BOM + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `salary_${monthYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF via edge function
  const [pdfLoading, setPdfLoading] = useState(false);
  const exportPDF = async () => {
    setPdfLoading(true);
    try {
      const monthName = MONTHS.find(m => m.value === selectedMonth);
      const payload = {
        monthYear,
        monthLabel: bn ? monthName?.bn : monthName?.en,
        year: selectedYear,
        language: bn ? 'bn' : 'en',
        staff: filtered.map((s: any) => {
          const rec = getRecord(s.id);
          const totalDed = rec ? Number(rec.late_deduction || 0) + Number(rec.absence_deduction || 0) +
            Number(rec.advance_deduction || 0) + Number(rec.other_deduction || 0) : 0;
          return {
            name: s.name_bn,
            designation: s.designation || '-',
            base_salary: Number(rec?.base_salary || s.salary || 0),
            present: rec?.present_days || 0,
            absent: rec?.absent_days || 0,
            late: rec?.late_days || 0,
            bonus: Number(rec?.bonus || 0),
            overtime: Number(rec?.overtime || 0),
            deductions: totalDed,
            advance: Number(rec?.advance_deduction || 0),
            net_salary: Number(rec?.net_salary || 0),
            status: rec?.status || 'not_generated',
          };
        }),
        totals: { base: stats.totalBase, net: stats.totalNet, deductions: stats.totalDeduction },
      };

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/salary-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const html = await res.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Wait for fonts to load then trigger print
        setTimeout(() => printWindow.print(), 1000);
      }
      toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error(bn ? 'PDF তৈরি করতে সমস্যা' : 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // Print salary slip
  const printSlip = (staffMember: any, record: any) => {
    const totalDeduction = Number(record.late_deduction || 0) + Number(record.absence_deduction || 0) +
      Number(record.advance_deduction || 0) + Number(record.other_deduction || 0);
    const totalAllowance = Number(record.bonus || 0) + Number(record.overtime || 0) + Number(record.other_allowance || 0);
    const monthName = MONTHS.find(m => m.value === selectedMonth);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Salary Slip</title>
    <style>body{font-family:'Noto Sans Bengali',sans-serif;padding:30px;max-width:700px;margin:auto}
    .header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}
    h2{margin:0;font-size:18px}p{margin:4px 0;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:15px 0}
    th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}
    th{background:#f5f5f5}
    .total{font-weight:bold;background:#f0f9f0}
    .sig{display:flex;justify-content:space-between;margin-top:60px;font-size:13px}
    .sig div{text-align:center;border-top:1px solid #333;padding-top:5px;min-width:150px}
    @media print{body{padding:20px}}</style></head><body>
    <div class="header">
      <h2>${bn ? 'বেতন স্লিপ' : 'Salary Slip'}</h2>
      <p>${bn ? 'মাস' : 'Month'}: ${bn ? monthName?.bn : monthName?.en} ${selectedYear}</p>
    </div>
    <table>
      <tr><th>${bn ? 'নাম' : 'Name'}</th><td>${staffMember.name_bn}</td>
          <th>${bn ? 'পদবি' : 'Designation'}</th><td>${staffMember.designation || '-'}</td></tr>
      <tr><th>${bn ? 'বিভাগ' : 'Department'}</th><td>${staffMember.department || '-'}</td>
          <th>${bn ? 'কর্মদিবস' : 'Working Days'}</th><td>${record.working_days}</td></tr>
      <tr><th>${bn ? 'উপস্থিত' : 'Present'}</th><td>${record.present_days}</td>
          <th>${bn ? 'অনুপস্থিত' : 'Absent'}</th><td>${record.absent_days}</td></tr>
      <tr><th>${bn ? 'ডিউটি সময়' : 'Duty Time'}</th><td>${formatTime12h(staffMember.duty_start_time || '08:00')} - ${formatTime12h(staffMember.duty_end_time || '17:00')}</td>
          <th>${bn ? 'বিলম্ব দিন' : 'Late Days'}</th><td>${record.late_days || 0}</td></tr>
    </table>
    <table>
      <tr><th colspan="2" style="text-align:center">${bn ? 'আয়' : 'Earnings'}</th>
          <th colspan="2" style="text-align:center">${bn ? 'কর্তন' : 'Deductions'}</th></tr>
      <tr><td>${bn ? 'মূল বেতন' : 'Base Salary'}</td><td>৳${Number(record.base_salary).toLocaleString()}</td>
          <td>${bn ? 'বিলম্ব কর্তন' : 'Late/Time Ded.'}</td><td>৳${Number(record.late_deduction || 0).toLocaleString()}</td></tr>
      <tr><td>${bn ? 'বোনাস' : 'Bonus'}</td><td>৳${Number(record.bonus || 0).toLocaleString()}</td>
          <td>${bn ? 'অনুপস্থিতি কর্তন' : 'Absence Ded.'}</td><td>৳${Number(record.absence_deduction || 0).toLocaleString()}</td></tr>
      <tr><td>${bn ? 'ওভারটাইম' : 'Overtime'}</td><td>৳${Number(record.overtime || 0).toLocaleString()}</td>
          <td>${bn ? 'অগ্রিম কর্তন' : 'Advance Ded.'}</td><td>৳${Number(record.advance_deduction || 0).toLocaleString()}</td></tr>
      <tr><td>${bn ? 'অন্যান্য ভাতা' : 'Other Allowance'}</td><td>৳${Number(record.other_allowance || 0).toLocaleString()}</td>
          <td>${bn ? 'অন্যান্য কর্তন' : 'Other Ded.'}</td><td>৳${Number(record.other_deduction || 0).toLocaleString()}</td></tr>
      <tr class="total"><td>${bn ? 'মোট আয়' : 'Total Earnings'}</td><td>৳${(Number(record.base_salary) + totalAllowance).toLocaleString()}</td>
          <td>${bn ? 'মোট কর্তন' : 'Total Deductions'}</td><td>৳${totalDeduction.toLocaleString()}</td></tr>
    </table>
    <table><tr class="total"><td style="text-align:center;font-size:16px" colspan="4">
      ${bn ? 'নিট বেতন' : 'Net Salary'}: ৳${Number(record.net_salary).toLocaleString()}</td></tr></table>
    <div class="sig">
      <div>${bn ? 'প্রাপকের স্বাক্ষর' : "Recipient's Signature"}</div>
      <div>${bn ? 'হিসাবরক্ষক' : 'Accountant'}</div>
      <div>${bn ? 'প্রিন্সিপাল' : 'Principal'}</div>
    </div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              <Wallet className="inline h-6 w-6 mr-2" />
              {bn ? 'বেতন ব্যবস্থাপনা' : 'Salary Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'Per-Minute হিসাবসহ মাসিক বেতন, কর্তন ও স্লিপ' : 'Per-minute salary calculation, deductions & slips'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> {bn ? 'সেটিংস' : 'Settings'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: bn ? 'মোট মূল বেতন' : 'Total Base', value: `৳${stats.totalBase.toLocaleString()}`, color: 'bg-primary/10 text-primary' },
            { label: bn ? 'মোট নিট বেতন' : 'Total Net', value: `৳${stats.totalNet.toLocaleString()}`, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: bn ? 'মোট কর্তন' : 'Total Deductions', value: `৳${stats.totalDeduction.toLocaleString()}`, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            { label: bn ? 'পরিশোধিত' : 'Paid', value: stats.paid, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: bn ? 'বকেয়া' : 'Pending', value: stats.pending, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <Badge className={`${s.color} text-[10px] mt-1`}>{s.label}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center flex-wrap">
              <div className="flex gap-2 items-center shrink-0">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{bn ? m.bn : m.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                  className="w-20 h-8 text-sm" min="2020" max="2040" />
              </div>

              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-8 text-sm" placeholder={bn ? 'নাম বা পদবি দিয়ে খুঁজুন...' : 'Search by name or designation...'}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              <div className="flex gap-2 shrink-0 flex-wrap">
                <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  <Calculator className="h-3 w-3 mr-1" /> {bn ? 'জেনারেট' : 'Generate'}
                </Button>
                <Button size="sm" variant="outline" onClick={exportCSV}>
                  <Download className="h-3 w-3 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={exportPDF} disabled={pdfLoading}>
                  <FileText className="h-3 w-3 mr-1" /> {pdfLoading ? '...' : 'PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'নাম' : 'Name'}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'পদবি' : 'Designation'}</th>
                    <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'ডিউটি' : 'Duty'}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মূল বেতন' : 'Base'}</th>
                    <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'উপ/অনু/বি' : 'P/A/L'}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'কর্তন' : 'Ded.'}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'ওভারটাইম' : 'OT'}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-emerald-600">{bn ? 'নিট বেতন' : 'Net'}</th>
                    <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: any, idx: number) => {
                    const rec = getRecord(s.id);
                    const attStats = getAttendanceStats(s);
                    const totalDed = rec ? Number(rec.late_deduction || 0) + Number(rec.absence_deduction || 0) +
                      Number(rec.advance_deduction || 0) + Number(rec.other_deduction || 0) : 0;

                    return (
                      <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{bn ? s.name_bn : (s.name_en || s.name_bn)}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{s.designation || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => setDutyDialog({ id: s.id, name: s.name_bn, duty_start_time: s.duty_start_time || '08:00', duty_end_time: s.duty_end_time || '17:00' })}
                            className="text-[10px] text-primary hover:underline">
                            <Timer className="h-3 w-3 inline mr-0.5" />
                            {formatTime12h(s.duty_start_time || '08:00')}-{formatTime12h(s.duty_end_time || '17:00')}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">৳{Number(rec?.base_salary || s.salary || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-emerald-600">{attStats.present}</span>/
                          <span className="text-red-500">{attStats.absent}</span>/
                          <span className="text-yellow-600">{attStats.late}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-red-500">
                          {rec ? `৳${totalDed.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600">
                          {rec ? `৳${Number(rec.overtime || 0).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {rec ? `৳${Number(rec.net_salary).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {rec ? (
                            <Badge className={rec.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}>
                              {rec.status === 'paid' ? (bn ? 'পরিশোধিত' : 'Paid') : (bn ? 'বকেয়া' : 'Pending')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">{bn ? 'জেনারেট হয়নি' : 'Not Generated'}</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex gap-1 justify-center">
                            {rec && (
                              <>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditDialog({ ...rec, staffName: s.name_bn })}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => printSlip(s, rec)}>
                                  <Printer className="h-3 w-3" />
                                </Button>
                                {rec.status !== 'paid' && (
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={() => markPaidMutation.mutate(rec.id)}>
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {salaryRecords.length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/50 font-bold">
                      <td colSpan={4} className="px-3 py-2">{bn ? 'মোট' : 'Total'}</td>
                      <td className="px-3 py-2 text-right">৳{stats.totalBase.toLocaleString()}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right text-red-500">৳{stats.totalDeduction.toLocaleString()}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400">৳{stats.totalNet.toLocaleString()}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{bn ? 'কোনো সক্রিয় স্টাফ পাওয়া যায়নি' : 'No active staff found'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duty Time Dialog */}
        <Dialog open={!!dutyDialog} onOpenChange={() => setDutyDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle><Timer className="inline h-5 w-5 mr-2" />{bn ? 'ডিউটি সময় সেট করুন' : 'Set Duty Time'}</DialogTitle>
            </DialogHeader>
            {dutyDialog && (
              <div className="space-y-4">
                <p className="text-sm font-medium">{dutyDialog.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{bn ? 'শুরু' : 'Start Time'}</Label>
                    <Input type="time" value={dutyDialog.duty_start_time}
                      onChange={e => setDutyDialog({ ...dutyDialog, duty_start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'শেষ' : 'End Time'}</Label>
                    <Input type="time" value={dutyDialog.duty_end_time}
                      onChange={e => setDutyDialog({ ...dutyDialog, duty_end_time: e.target.value })} />
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p><strong>{bn ? 'মোট ডিউটি:' : 'Total Duty:'}</strong> {timeToMinutes(dutyDialog.duty_end_time) - timeToMinutes(dutyDialog.duty_start_time)} {bn ? 'মিনিট' : 'minutes'}
                    ({Math.floor((timeToMinutes(dutyDialog.duty_end_time) - timeToMinutes(dutyDialog.duty_start_time)) / 60)}h {(timeToMinutes(dutyDialog.duty_end_time) - timeToMinutes(dutyDialog.duty_start_time)) % 60}m)
                  </p>
                </div>
                <Button className="w-full" onClick={() => updateDutyMutation.mutate({
                  staffId: dutyDialog.id, dutyStart: dutyDialog.duty_start_time, dutyEnd: dutyDialog.duty_end_time
                })}>
                  <Save className="h-4 w-4 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Salary Dialog */}
        <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{bn ? 'বেতন সম্পাদনা' : 'Edit Salary'} - {editDialog?.staffName}</DialogTitle>
            </DialogHeader>
            {editDialog && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{bn ? 'মূল বেতন' : 'Base Salary'}</Label>
                    <Input type="number" value={editDialog.base_salary} onChange={e => setEditDialog({ ...editDialog, base_salary: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'বোনাস' : 'Bonus'}</Label>
                    <Input type="number" value={editDialog.bonus || 0} onChange={e => setEditDialog({ ...editDialog, bonus: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'ওভারটাইম' : 'Overtime'}</Label>
                    <Input type="number" value={editDialog.overtime || 0} onChange={e => setEditDialog({ ...editDialog, overtime: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'অন্যান্য ভাতা' : 'Other Allowance'}</Label>
                    <Input type="number" value={editDialog.other_allowance || 0} onChange={e => setEditDialog({ ...editDialog, other_allowance: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <Label className="text-xs font-semibold text-red-500">{bn ? 'কর্তনসমূহ' : 'Deductions'}</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs">{bn ? 'বিলম্ব/সময় কর্তন' : 'Late/Time Ded.'}</Label>
                      <Input type="number" value={editDialog.late_deduction || 0} onChange={e => setEditDialog({ ...editDialog, late_deduction: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অনুপস্থিতি কর্তন' : 'Absence Ded.'}</Label>
                      <Input type="number" value={editDialog.absence_deduction || 0} onChange={e => setEditDialog({ ...editDialog, absence_deduction: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অগ্রিম/ডিপোজিট কর্তন' : 'Advance/Deposit Ded.'}</Label>
                      <Input type="number" value={editDialog.advance_deduction || 0} onChange={e => setEditDialog({ ...editDialog, advance_deduction: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অন্যান্য কর্তন' : 'Other Ded.'}</Label>
                      <Input type="number" value={editDialog.other_deduction || 0} onChange={e => setEditDialog({ ...editDialog, other_deduction: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'মন্তব্য' : 'Remarks'}</Label>
                  <Textarea value={editDialog.remarks || ''} onChange={e => setEditDialog({ ...editDialog, remarks: e.target.value })} rows={2} />
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">{bn ? 'নিট বেতন' : 'Net Salary'}</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    ৳{Math.max(0, (editDialog.base_salary || 0) + (editDialog.bonus || 0) + (editDialog.overtime || 0) + (editDialog.other_allowance || 0)
                      - (editDialog.late_deduction || 0) - (editDialog.absence_deduction || 0) - (editDialog.advance_deduction || 0) - (editDialog.other_deduction || 0)).toLocaleString()}
                  </p>
                </div>
                <Button className="w-full" onClick={() => updateMutation.mutate(editDialog)}>
                  <Save className="h-4 w-4 mr-1" /> {bn ? 'সেভ করুন' : 'Save Changes'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle><Settings2 className="inline h-5 w-5 mr-2" />{bn ? 'বেতন সেটিংস' : 'Salary Settings'}</DialogTitle>
            </DialogHeader>
            <Tabs value={settingsTab} onValueChange={setSettingsTab}>
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">{bn ? 'সাধারণ' : 'General'}</TabsTrigger>
                <TabsTrigger value="formula" className="flex-1">{bn ? 'ফর্মুলা' : 'Formula'}</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <Label>{bn ? 'হিসাব পদ্ধতি' : 'Calculation Mode'}</Label>
                  <Select
                    value={getSetting('calculation_mode')?.mode || 'per_minute'}
                    onValueChange={v => saveSettingMutation.mutate({ key: 'calculation_mode', value: { mode: v } })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_minute">{bn ? 'Per-Minute (মিনিট ভিত্তিক)' : 'Per-Minute Rate'}</SelectItem>
                      <SelectItem value="fixed_rate">{bn ? 'Fixed Rate (নির্দিষ্ট হার)' : 'Fixed Rate'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {bn ? 'Per-Minute: মাসিক বেতন ÷ ৩০ দিন ÷ দৈনিক ডিউটি মিনিট = প্রতি মিনিটের হার' : 'Per-Minute: Monthly ÷ 30 days ÷ duty minutes = rate/minute'}
                  </p>
                </div>
                <div>
                  <Label>{bn ? 'প্রতি বিলম্বের দিনে কর্তন (৳) - Fixed মোডে' : 'Late Deduction Per Day (৳) - Fixed mode'}</Label>
                  <Input type="number" defaultValue={getSetting('late_deduction_per_day')?.amount || 50}
                    onBlur={e => saveSettingMutation.mutate({ key: 'late_deduction_per_day', value: { amount: Number(e.target.value) } })} />
                </div>
              </TabsContent>
              <TabsContent value="formula" className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <h4 className="font-semibold">{bn ? 'Per-Minute ফর্মুলা' : 'Per-Minute Formula'}</h4>
                  <div className="space-y-1 text-muted-foreground text-xs">
                    <p>• <strong>{bn ? 'দৈনিক হার' : 'Daily Rate'}</strong> = {bn ? 'মাসিক বেতন ÷ ৩০' : 'Monthly Salary ÷ 30'}</p>
                    <p>• <strong>{bn ? 'প্রতি মিনিট হার' : 'Per-Minute Rate'}</strong> = {bn ? 'দৈনিক হার ÷ ডিউটি মিনিট' : 'Daily Rate ÷ Duty Minutes'}</p>
                    <p>• <strong>{bn ? 'অনুপস্থিতি কর্তন' : 'Absence Ded.'}</strong> = {bn ? 'অনুপস্থিত দিন × দৈনিক হার' : 'Absent Days × Daily Rate'}</p>
                    <p>• <strong>{bn ? 'বিলম্ব কর্তন' : 'Late/Time Ded.'}</strong> = {bn ? 'মিসড মিনিট × প্রতি মিনিট হার' : 'Missed Minutes × Per-Minute Rate'}</p>
                    <p>• <strong>{bn ? 'ওভারটাইম' : 'Overtime'}</strong> = {bn ? 'অতিরিক্ত মিনিট × প্রতি মিনিট হার' : 'Extra Minutes × Per-Minute Rate'}</p>
                    <p>• <strong>{bn ? 'নিট বেতন' : 'Net Salary'}</strong> = {bn ? 'মূল + ওভারটাইম + বোনাস - সকল কর্তন' : 'Base + OT + Bonus - All Deductions'}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <Label className="font-semibold">{bn ? 'কাস্টম ফর্মুলা' : 'Custom Formulas'}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{bn ? 'ফর্মুলা বিল্ডারে গিয়ে কাস্টম সূত্র তৈরি করুন' : 'Create custom formulas in Formula Builder'}</p>
                  {salaryFormulas.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-2 p-2 border rounded bg-muted/30 mb-1">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1">{bn ? f.name_bn : f.name}</span>
                      <Badge variant="outline" className="text-[10px]">{(f.expression as any)?.result_field}</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminSalary;
