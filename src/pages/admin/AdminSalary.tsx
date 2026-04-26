import { useState, useMemo } from 'react';
import { useTimeFormat, formatTimeDisplay } from '@/hooks/useTimeFormat';
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
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { toast } from 'sonner';
import XLSX from 'xlsx-js-style';
import {
  Wallet, Users, Search, Save, Download, Printer, Settings2,
  CheckCircle2, Clock, AlertCircle, ChevronDown, Edit2, Eye,
  Calculator, Plus, Trash2, DollarSign, FileText, Timer, FolderOpen,
  PiggyBank, Landmark
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

// Convert English digits to Bengali digits
const toBnDigits = (val: string | number): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, d => bnDigits[parseInt(d)]);
};

// Helper: parse "HH:MM" to total minutes from midnight
const timeToMinutes = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Helper: check if a month_year falls within savings range
const isMonthInSavingsRange = (monthYear: string, startMonth: string, durationMonths: number): boolean => {
  const [year, month] = monthYear.split('-').map(Number);
  const [startYear, startMo] = startMonth.split('-').map(Number);
  const current = year * 12 + month;
  const start = startYear * 12 + startMo;
  const end = start + durationMonths - 1;
  return current >= start && current <= end;
};

// Helper: get months elapsed since start
const getMonthsElapsed = (currentMonthYear: string, startMonth: string): number => {
  const [cy, cm] = currentMonthYear.split('-').map(Number);
  const [sy, sm] = startMonth.split('-').map(Number);
  return (cy * 12 + cm) - (sy * 12 + sm) + 1;
};

const AdminSalary = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem } = usePagePermissions('/admin/salary');
  const { timeFormat } = useTimeFormat();
  const fmt = (t: string) => formatTimeDisplay(t, timeFormat);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialog, setEditDialog] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [dutyDialog, setDutyDialog] = useState<any>(null);
  const [attendanceDetailDialog, setAttendanceDetailDialog] = useState<any>(null);
  const [savingsDialog, setSavingsDialog] = useState<any>(null);
  const [savingsLedgerOpen, setSavingsLedgerOpen] = useState(false);
  const [mainTab, setMainTab] = useState('salary');
  const [bonusYear, setBonusYear] = useState(String(now.getFullYear()));
  const [bonusPercent, setBonusPercent] = useState(100);
  const [unpaidConfirmId, setUnpaidConfirmId] = useState<string | null>(null);
  const [deleteSavingsId, setDeleteSavingsId] = useState<string | null>(null);

  const monthYear = `${selectedYear}-${selectedMonth}`;

  // Fetch designations for Bengali name lookup
  const { data: designationsList = [] } = useQuery({
    queryKey: ['designations-list'],
    queryFn: async () => {
      const { data } = await supabase.from('designations').select('name, name_bn').eq('is_active', true);
      return data || [];
    },
  });

  // Helper to get designation in correct language
  const getDesignation = (desig: string | null) => {
    if (!desig) return '-';
    if (bn) {
      const match = designationsList.find((d: any) => d.name === desig || d.name_bn === desig);
      return match?.name_bn || desig;
    } else {
      const match = designationsList.find((d: any) => d.name === desig || d.name_bn === desig);
      return match?.name || desig;
    }
  };

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

  // Fetch attendance data for the month (only full_day shift for salary)
  const { data: attendanceData = [] } = useQuery({
    queryKey: ['salary-attendance', monthYear],
    queryFn: async () => {
      const year = Number(selectedYear);
      const month = Number(selectedMonth);
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${monthYear}-01`;
      const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('entity_type', 'staff')
        .eq('shift', 'full_day')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch residential duty settings
  const { data: dutySettings } = useQuery({
    queryKey: ['residential-duty-times-salary'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'residential_duty_times').maybeSingle();
      return data?.value as any;
    },
  });

  // Fetch morning/evening duty attendance for overtime calculation
  const { data: dutyAttendanceData = [] } = useQuery({
    queryKey: ['salary-duty-attendance', monthYear],
    enabled: !!dutySettings?.extra_duty_enabled,
    queryFn: async () => {
      const year = Number(selectedYear);
      const month = Number(selectedMonth);
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${monthYear}-01`;
      const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('entity_type', 'staff')
        .in('shift', ['morning', 'evening'])
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

  // Fetch expense projects for salary→expense integration
  const { data: expenseInstitutions = [] } = useQuery({
    queryKey: ['expense-institutions-salary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_institutions').select('*').eq('is_active', true).order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  // Fetch expense categories for salary→expense integration
  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expense-categories-salary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  // ========== SAVINGS QUERIES ==========
  const { data: savingsConfigs = [] } = useQuery({
    queryKey: ['salary-savings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_savings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: savingsLedger = [] } = useQuery({
    queryKey: ['salary-savings-ledger'],
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_savings_ledger').select('*').order('month_year', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all salary records for bonus year
  const { data: bonusYearRecords = [] } = useQuery({
    queryKey: ['bonus-year-records', bonusYear],
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_records').select('*')
        .gte('month_year', `${bonusYear}-01`)
        .lte('month_year', `${bonusYear}-12`);
      if (error) throw error;
      return data;
    },
  });


  const getActiveSavings = (staffId: string): { amount: number; config: any } | null => {
    const configs = savingsConfigs.filter((c: any) => c.staff_id === staffId && c.is_active);
    for (const cfg of configs) {
      if (isMonthInSavingsRange(monthYear, cfg.start_month, cfg.duration_months)) {
        return { amount: Number(cfg.monthly_amount), config: cfg };
      }
    }
    return null;
  };

  // Save savings config mutation
  const saveSavingsMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { error } = await supabase.from('salary_savings').update({
          monthly_amount: data.monthly_amount,
          duration_months: data.duration_months,
          start_month: data.start_month,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('salary_savings').insert({
          staff_id: data.staff_id,
          monthly_amount: data.monthly_amount,
          duration_months: data.duration_months,
          start_month: data.start_month,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      setSavingsDialog(null);
      toast.success(bn ? 'জমা সেটিংস সেভ হয়েছে' : 'Savings settings saved');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error saving'),
  });

  const deleteSavingsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('salary_savings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
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
    const leave = records.filter((r: any) => r.status === 'leave').length;

    const dutyStart = timeToMinutes(staffMember.duty_start_time || '08:00');
    const dutyEnd = timeToMinutes(staffMember.duty_end_time || '17:00');
    const scheduledMinutesPerDay = dutyEnd - dutyStart;

    let totalLateArrivalMinutes = 0;
    let totalEarlyExitMinutes = 0;
    let totalOvertimeMinutes = 0;

    const dailyBreakdown: Array<{
      date: string; status: string; checkIn: string; checkOut: string;
      lateMin: number; earlyMin: number; overtimeMin: number;
      deduction: number; addition: number; dailyEarning: number;
    }> = [];

    const baseSalary = Number(staffMember.salary) || 0;
    const dailyRate = baseSalary / 30;
    const perMinuteRate = scheduledMinutesPerDay > 0 ? dailyRate / scheduledMinutesPerDay : 0;

    let totalDailyEarnings = 0;

    records.forEach((r: any) => {
      const entry: any = {
        date: r.attendance_date, status: r.status,
        checkIn: r.check_in_time || '', checkOut: r.check_out_time || '',
        lateMin: 0, earlyMin: 0, overtimeMin: 0, deduction: 0, addition: 0, dailyEarning: 0,
      };

      if (r.status === 'absent') {
        entry.deduction = Math.round(dailyRate);
        entry.dailyEarning = 0;
        dailyBreakdown.push(entry);
        return;
      }
      
      if (r.status === 'leave') {
        entry.dailyEarning = 0;
        dailyBreakdown.push(entry);
        return;
      }

      if (r.status === 'half_day') {
        entry.dailyEarning = Math.round(dailyRate / 2);
        entry.deduction = Math.round(dailyRate / 2);
      } else {
        entry.dailyEarning = Math.round(dailyRate);
      }

      const checkIn = r.check_in_time ? timeToMinutes(r.check_in_time) : dutyStart;
      const checkOut = r.check_out_time ? timeToMinutes(r.check_out_time) : dutyEnd;

      const lateMinutes = Math.max(0, checkIn - dutyStart);
      const earlyExitMinutes = Math.max(0, dutyEnd - checkOut);
      const overtimeMinutes = Math.max(0, checkOut - dutyEnd);

      totalLateArrivalMinutes += lateMinutes;
      totalEarlyExitMinutes += earlyExitMinutes;
      totalOvertimeMinutes += overtimeMinutes;

      entry.lateMin = lateMinutes;
      entry.earlyMin = earlyExitMinutes;
      entry.overtimeMin = overtimeMinutes;
      
      const timeDeduction = Math.round((lateMinutes + earlyExitMinutes) * perMinuteRate);
      entry.deduction += timeDeduction;
      entry.dailyEarning = Math.max(0, entry.dailyEarning - timeDeduction);
      
      entry.addition = Math.round(overtimeMinutes * perMinuteRate);
      entry.dailyEarning += entry.addition;

      totalDailyEarnings += entry.dailyEarning;
      dailyBreakdown.push(entry);
    });

    const totalMissedMinutes = totalLateArrivalMinutes + totalEarlyExitMinutes;

    return {
      present, absent, late, halfDay, leave, total: records.length,
      totalLateArrivalMinutes, totalEarlyExitMinutes, totalMissedMinutes, totalOvertimeMinutes,
      scheduledMinutesPerDay, dailyBreakdown, perMinuteRate, dailyRate, totalDailyEarnings,
    };
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

  // Calculate salary for a staff member using additive per-day logic
  const calculateSalary = (staffMember: any) => {
    const baseSalary = Number(staffMember.salary) || 0;
    const attStats = getAttendanceStats(staffMember);

    const year = Number(selectedYear);
    const month = Number(selectedMonth);
    const workingDays = new Date(year, month, 0).getDate();

    const totalEarned = attStats.totalDailyEarnings;
    const bonus = 0;
    const otherAllowance = 0;
    const advanceDeduction = 0;

    const absenceDeduction = Math.round(attStats.absent * attStats.dailyRate);
    const lateDeduction = Math.round(attStats.totalMissedMinutes * attStats.perMinuteRate);
    const otherDeduction = Math.round(attStats.halfDay * (attStats.dailyRate / 2));
    let overtime = Math.round(attStats.totalOvertimeMinutes * attStats.perMinuteRate);

    if (dutySettings?.extra_duty_enabled && dutySettings?.extra_duty_rate > 0) {
      const staffDutyRecords = dutyAttendanceData.filter((a: any) => a.entity_id === staffMember.id);
      const morningPresent = staffDutyRecords.filter((r: any) => r.shift === 'morning' && ['present', 'late'].includes(r.status)).length;
      const eveningPresent = staffDutyRecords.filter((r: any) => r.shift === 'evening' && ['present', 'late'].includes(r.status)).length;
      const dutyOvertime = (morningPresent + eveningPresent) * Number(dutySettings.extra_duty_rate);
      overtime += Math.round(dutyOvertime);
    }

    // Get savings deduction for this month
    const activeSavings = getActiveSavings(staffMember.id);
    const savingsDeduction = activeSavings ? activeSavings.amount : 0;

    const netSalary = Math.max(0, totalEarned + bonus + otherAllowance + overtime - advanceDeduction - savingsDeduction);

    return {
      base_salary: baseSalary,
      working_days: workingDays,
      present_days: attStats.present,
      absent_days: attStats.absent,
      late_days: attStats.late,
      absence_deduction: absenceDeduction,
      late_deduction: lateDeduction,
      other_deduction: otherDeduction,
      bonus,
      overtime,
      other_allowance: otherAllowance,
      advance_deduction: advanceDeduction,
      savings_deduction: savingsDeduction,
      net_salary: netSalary,
    };
  };

  // Generate salary sheet mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const requireAttendance = getSetting('require_attendance')?.enabled !== false;
      const skippedNames: string[] = [];
      const newRecords: any[] = [];
      const updateRecords: any[] = [];

      for (const s of staff) {
        const existing = salaryRecords.find((r: any) => r.staff_id === s.id);

        if (requireAttendance) {
          const hasAttendance = attendanceData.some((a: any) => a.entity_id === s.id);
          if (!hasAttendance) {
            skippedNames.push(s.name_bn || s.name_en || 'Unknown');
            continue;
          }
        }

        const calc = calculateSalary(s);

        if (existing) {
          if (existing.status === 'pending') {
            updateRecords.push({
              id: existing.id,
              ...calc,
              bonus: Number(existing.bonus || 0),
              other_allowance: Number(existing.other_allowance || 0),
              advance_deduction: Number(existing.advance_deduction || 0),
              remarks: existing.remarks,
            });
          }
        } else {
          newRecords.push({ staff_id: s.id, month_year: monthYear, ...calc, status: 'pending' });
        }
      }

      if (skippedNames.length > 0) {
        toast.warning(
          bn ? `${skippedNames.length} জন স্টাফের উপস্থিতি নেই, বেতন যোগ হয়নি: ${skippedNames.join(', ')}`
             : `${skippedNames.length} staff skipped (no attendance): ${skippedNames.join(', ')}`,
          { duration: 6000 }
        );
      }

      for (const rec of updateRecords) {
        const { id, ...updateData } = rec;
        const netSalary = Math.max(0,
          Number(updateData.net_salary) +
          Number(updateData.bonus || 0) +
          Number(updateData.other_allowance || 0) -
          Number(updateData.advance_deduction || 0)
        );
        updateData.net_salary = netSalary;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase.from('salary_records').update(updateData).eq('id', id);
        if (error) throw error;
      }

      if (newRecords.length === 0 && updateRecords.length === 0 && skippedNames.length === 0) {
        toast.info(bn ? 'ইতোমধ্যে সব বেতন জেনারেট হয়েছে' : 'All salaries already generated');
        return;
      }

      if (newRecords.length > 0) {
        const { error } = await supabase.from('salary_records').insert(newRecords);
        if (error) throw error;
      }

      // Record savings ledger entries for new records
      for (const rec of newRecords) {
        const activeSavings = getActiveSavings(rec.staff_id);
        if (activeSavings && activeSavings.amount > 0) {
          // Check if ledger entry already exists
          const existing = savingsLedger.find((l: any) => 
            l.savings_id === activeSavings.config.id && l.month_year === monthYear
          );
          if (!existing) {
            await supabase.from('salary_savings_ledger').insert({
              savings_id: activeSavings.config.id,
              staff_id: rec.staff_id,
              month_year: monthYear,
              amount: activeSavings.amount,
            });
            // Update total_saved
            await supabase.from('salary_savings').update({
              total_saved: Number(activeSavings.config.total_saved || 0) + activeSavings.amount,
              updated_at: new Date().toISOString(),
            }).eq('id', activeSavings.config.id);
          }
        }
      }

      const msgs: string[] = [];
      if (newRecords.length > 0) msgs.push(bn ? `${newRecords.length} জন নতুন জেনারেট` : `${newRecords.length} new generated`);
      if (updateRecords.length > 0) msgs.push(bn ? `${updateRecords.length} জন রিক্যালকুলেট` : `${updateRecords.length} recalculated`);
      toast.success(msgs.join(', '));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error generating salary'),
  });

  // Update single salary record (manual edit)
  const updateMutation = useMutation({
    mutationFn: async (record: any) => {
      const { staffName, ...cleanRecord } = record;
      const staffMember = staff.find((s: any) => s.id === cleanRecord.staff_id);
      let netSalary: number;
      if (staffMember) {
        const attStats = getAttendanceStats(staffMember);
        const activeSavings = getActiveSavings(cleanRecord.staff_id);
        const savingsDed = activeSavings ? activeSavings.amount : 0;
        netSalary = Math.max(0,
          attStats.totalDailyEarnings +
          Number(cleanRecord.overtime || 0) +
          Number(cleanRecord.bonus || 0) +
          Number(cleanRecord.other_allowance || 0) -
          Number(cleanRecord.advance_deduction || 0) -
          savingsDed
        );
      } else {
        netSalary = Math.max(0,
          Number(cleanRecord.base_salary || 0) +
          Number(cleanRecord.bonus || 0) +
          Number(cleanRecord.overtime || 0) +
          Number(cleanRecord.other_allowance || 0) -
          Number(cleanRecord.late_deduction || 0) -
          Number(cleanRecord.absence_deduction || 0) -
          Number(cleanRecord.advance_deduction || 0) -
          Number(cleanRecord.other_deduction || 0)
        );
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

  // Mark as paid + auto-create expense
  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = salaryRecords.find((r: any) => r.id === id);
      if (!record) throw new Error('Record not found');

      const { error } = await supabase.from('salary_records')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      const expenseConfig = getSetting('expense_location');
      const projectId = expenseConfig?.institution_id;
      const categoryId = expenseConfig?.category_id;

      if (projectId && categoryId) {
        const staffMember = staff.find((s: any) => s.id === record.staff_id);
        const monthName = MONTHS.find(m => m.value === selectedMonth);
        const description = `${bn ? 'বেতন' : 'Salary'}: ${staffMember?.name_bn || 'Staff'} - ${bn ? monthName?.bn : monthName?.en} ${selectedYear}`;

        const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const pdfUrl = `https://${projectRef}.supabase.co/functions/v1/salary-pdf`;

        // Use payment date's month for expense categorization
        const today = new Date();
        const paymentMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const expenseMonthYear = `${paymentMonthNames[today.getMonth()]}-${today.getFullYear()}`;
        const { error: expError } = await supabase.from('expenses').insert({
          institution_id: projectId,
          category_id: categoryId,
          month_year: expenseMonthYear,
          expense_date: today.toISOString().split('T')[0],
          amount: Number(record.net_salary),
          description,
          has_receipt: true,
          receipt_url: pdfUrl,
        });
        if (expError) {
          console.error('Expense creation error:', expError);
          toast.warning(bn ? 'বেতন পরিশোধিত হয়েছে কিন্তু খরচে সেভ হয়নি' : 'Marked paid but expense save failed');
          return;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      toast.success(bn ? 'পরিশোধিত ও খরচে সেভ হয়েছে' : 'Marked as paid & saved to expenses');
    },
  });

  // Mark as unpaid + remove expense entry
  const markUnpaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = salaryRecords.find((r: any) => r.id === id);
      const { error } = await supabase.from('salary_records')
        .update({ status: 'pending', paid_at: null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      // Remove the corresponding expense entry (soft delete)
      if (record) {
        const staffMember = staff.find((s: any) => s.id === record.staff_id);
        const staffName = staffMember?.name_bn || staffMember?.name_en || 'Staff';
        // Match by description pattern and amount
        const { error: delError } = await supabase.from('expenses')
          .update({ deleted_at: new Date().toISOString() })
          .like('description', `%${staffName}%`)
          .eq('amount', Number(record.net_salary))
          .is('deleted_at', null);
        if (delError) console.error('Expense removal error:', delError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      toast.success(bn ? 'অপরিশোধিত ও খরচ থেকে সরানো হয়েছে' : 'Marked as unpaid & expense removed');
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
    
    // Total savings this month
    const totalSavings = filtered.reduce((sum: number, s: any) => {
      const active = getActiveSavings(s.id);
      return sum + (active ? active.amount : 0);
    }, 0);
    
    return { totalBase, totalNet, totalDeduction, paid, pending, totalSavings };
  }, [salaryRecords, filtered, savingsConfigs, monthYear]);

  // Export Excel with proper Bengali support
  const exportExcel = () => {
    const monthName = MONTHS.find(m => m.value === selectedMonth);
    const title = bn ? `বেতন শিট — ${monthName?.bn} ${selectedYear}` : `Salary Sheet — ${monthName?.en} ${selectedYear}`;
    
    const wb = XLSX.utils.book_new();
    const sheetData: any[][] = [];
    
    sheetData.push([title]);
    sheetData.push([`${bn ? 'তৈরির তারিখ' : 'Generated'}: ${new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-US')}`]);
    sheetData.push([]);
    
    const headers = [
      '#', bn ? 'নাম' : 'Name', bn ? 'স্টাফ আইডি' : 'Staff ID', bn ? 'পদবি' : 'Designation',
      bn ? 'মূল বেতন' : 'Base Salary', bn ? 'বোনাস' : 'Bonus',
      bn ? 'ওভারটাইম' : 'Overtime', bn ? 'কর্তন' : 'Deductions',
      bn ? 'জমা' : 'Savings', bn ? 'অগ্রিম' : 'Advance',
      bn ? 'নিট বেতন' : 'Net Salary', bn ? 'স্ট্যাটাস' : 'Status'
    ];
    sheetData.push(headers);
    
    const fmtNum = (n: number) => bn ? toBnDigits(n.toLocaleString()) : n;
    const fmtIdx = (n: number) => bn ? toBnDigits(n) : n;
    
    filtered.forEach((s: any, idx: number) => {
      const rec = getRecord(s.id);
      const totalDed = Number(rec?.late_deduction || 0) + Number(rec?.absence_deduction || 0) + Number(rec?.other_deduction || 0);
      const activeSavings = getActiveSavings(s.id);
      const savingsAmt = activeSavings ? activeSavings.amount : 0;
      const status = rec?.status === 'paid' ? (bn ? 'পরিশোধিত' : 'Paid') : 
                     rec ? (bn ? 'বকেয়া' : 'Pending') : (bn ? 'জেনারেট হয়নি' : 'Not Generated');
      sheetData.push([
        fmtIdx(idx + 1),
        s.name_bn,
        s.staff_id || '-',
        getDesignation(s.designation),
        fmtNum(Number(rec?.base_salary || s.salary || 0)),
        fmtNum(Number(rec?.bonus || 0)),
        fmtNum(Number(rec?.overtime || 0)),
        fmtNum(totalDed),
        fmtNum(savingsAmt),
        fmtNum(Number(rec?.advance_deduction || 0)),
        fmtNum(Number(rec?.net_salary || 0)),
        status,
      ]);
    });
    
    sheetData.push([]);
    
    const summaryRowIdx = sheetData.length;
    sheetData.push([
      '', bn ? 'মোট' : 'Total', bn ? toBnDigits(`${filtered.length} জন`) : `${filtered.length} staff`,
      fmtNum(stats.totalBase), '', '', fmtNum(stats.totalDeduction), fmtNum(stats.totalSavings), '', fmtNum(stats.totalNet), ''
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const totalCols = headers.length;
    
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    ];
    
    ws['!cols'] = [
      { wch: 5 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
    ];
    
    ws['!rows'] = Array.from({ length: sheetData.length }, (_, i) => {
      if (i === 0) return { hpt: 32 };
      if (i === 1) return { hpt: 22 };
      return { hpt: 25 };
    });
    
    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
    };
    
    const headerRowIdx = 3;
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        const cell = ws[cellRef];
        if (!cell.s) cell.s = {};
        
        cell.s.font = { name: 'SutonnyOMJ', sz: 11, color: { rgb: 'FF1E293B' } };
        cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
        cell.s.border = thinBorder;
        
        if (r === 0) {
          cell.s.font = { name: 'SutonnyOMJ', sz: 16, bold: true, color: { rgb: 'FF064E3B' } };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.border = {};
        }
        if (r === 1) {
          cell.s.font = { name: 'SutonnyOMJ', sz: 10, color: { rgb: 'FF64748B' } };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.border = {};
        }
        if (r === 2) { cell.s.border = {}; }
        
        if (r === headerRowIdx) {
          cell.s.fill = { fgColor: { rgb: 'FF059669' } };
          cell.s.font = { name: 'SutonnyOMJ', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        }
        
        if (r > headerRowIdx && r < summaryRowIdx) {
          if (c === 1 || c === 2) {
            cell.s.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
          }
          if ((r - headerRowIdx - 1) % 2 === 1) {
            cell.s.fill = { fgColor: { rgb: 'FFF8FAFC' } };
          }
          if (c === 10) {
            const val = String(cell.v || '');
            if (val === 'পরিশোধিত' || val === 'Paid') {
              cell.s.font = { ...cell.s.font, color: { rgb: 'FF16A34A' }, bold: true };
            } else if (val === 'বকেয়া' || val === 'Pending') {
              cell.s.font = { ...cell.s.font, color: { rgb: 'FFEA580C' }, bold: true };
            }
          }
          if (c === 6 || c === 8) {
            const numVal = Number(cell.v || 0);
            if (numVal > 0) cell.s.font = { ...cell.s.font, color: { rgb: 'FFDC2626' } };
          }
          // Savings column - blue
          if (c === 7) {
            const numVal = Number(cell.v || 0);
            if (numVal > 0) cell.s.font = { ...cell.s.font, color: { rgb: 'FF2563EB' } };
          }
          if (c === 9) {
            cell.s.font = { ...cell.s.font, color: { rgb: 'FF059669' }, bold: true };
          }
        }
        
        if (r >= summaryRowIdx) {
          cell.s.fill = { fgColor: { rgb: 'FFF1F5F9' } };
          cell.s.font = { name: 'SutonnyOMJ', sz: 11, bold: true, color: { rgb: 'FF0F172A' } };
          cell.s.border = {
            top: { style: 'medium', color: { rgb: 'FF94A3B8' } },
            bottom: { style: 'medium', color: { rgb: 'FF94A3B8' } },
            left: { style: 'medium', color: { rgb: 'FF94A3B8' } },
            right: { style: 'medium', color: { rgb: 'FF94A3B8' } },
          };
        }
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, (bn ? 'বেতন শিট' : 'Salary Sheet').slice(0, 31));
    XLSX.writeFile(wb, `salary_${monthYear}.xlsx`, { bookType: 'xlsx', cellStyles: true });
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
            staff_id: s.staff_id || '-',
            designation: getDesignation(s.designation),
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

      let html = await res.text();
      const fontUrl = `${window.location.origin}/fonts/SutonnyOMJ.ttf`;
      const fontFace = `@font-face{font-family:"SutonnyOMJ";src:url("${fontUrl}") format("truetype");font-display:swap;}`;
      html = html.replace('</style>', `${fontFace}</style>`);
      html = html.replace(/font-family:\s*'Noto Sans Bengali'/g, `font-family:'SutonnyOMJ','Noto Sans Bengali'`);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 1500);
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
    const activeSavings = getActiveSavings(staffMember.id);
    const savingsAmt = activeSavings ? activeSavings.amount : 0;
    const totalAllowance = Number(record.bonus || 0) + Number(record.overtime || 0) + Number(record.other_allowance || 0);
    const monthName = MONTHS.find(m => m.value === selectedMonth);

    const slipNum = (n: number) => bn ? toBnDigits(n.toLocaleString()) : n.toLocaleString();

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Salary Slip</title><style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style>
    <style>body{font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:30px;max-width:700px;margin:auto}
    .header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}
    h2{margin:0;font-size:18px}p{margin:4px 0;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:15px 0}
    th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}
    th{background:#f5f5f5}
    .total{font-weight:bold;background:#f0f9f0}
    .savings-row{background:#eff6ff;color:#1e40af}
    .sig{display:flex;justify-content:space-between;margin-top:60px;font-size:13px}
    .sig div{text-align:center;border-top:1px solid #333;padding-top:5px;min-width:150px}
    @media print{body{padding:20px}}</style></head><body>
    <div class="header">
      <h2>${bn ? 'বেতন স্লিপ' : 'Salary Slip'}</h2>
      <p>${bn ? 'মাস' : 'Month'}: ${bn ? monthName?.bn : monthName?.en} ${bn ? toBnDigits(selectedYear) : selectedYear}</p>
    </div>
    <table>
      <tr><th>${bn ? 'নাম' : 'Name'}</th><td>${staffMember.name_bn}</td>
          <th>${bn ? 'স্টাফ আইডি' : 'Staff ID'}</th><td>${staffMember.staff_id || '-'}</td></tr>
      <tr><th>${bn ? 'পদবি' : 'Designation'}</th><td>${getDesignation(staffMember.designation)}</td>
      <tr><th>${bn ? 'বিভাগ' : 'Department'}</th><td>${staffMember.department || '-'}</td>
          <th>${bn ? 'কর্মদিবস' : 'Working Days'}</th><td>${bn ? toBnDigits(record.working_days) : record.working_days}</td></tr>
      <tr><th>${bn ? 'উপস্থিত' : 'Present'}</th><td>${bn ? toBnDigits(record.present_days) : record.present_days}</td>
          <th>${bn ? 'অনুপস্থিত' : 'Absent'}</th><td>${bn ? toBnDigits(record.absent_days) : record.absent_days}</td></tr>
      <tr><th>${bn ? 'ডিউটি সময়' : 'Duty Time'}</th><td>${fmt(staffMember.duty_start_time || '08:00')} - ${fmt(staffMember.duty_end_time || '17:00')}</td>
          <th>${bn ? 'বিলম্ব উপস্থিত দিন' : 'Late Present Days'}</th><td>${bn ? toBnDigits(record.late_days || 0) : (record.late_days || 0)}</td></tr>
    </table>
    <table>
      <tr><th colspan="2" style="text-align:center">${bn ? 'আয়' : 'Earnings'}</th>
          <th colspan="2" style="text-align:center">${bn ? 'কর্তন' : 'Deductions'}</th></tr>
      <tr><td>${bn ? 'মূল বেতন' : 'Base Salary'}</td><td>৳${slipNum(Number(record.base_salary))}</td>
          <td>${bn ? 'বিলম্ব উপস্থিত কর্তন' : 'Late Present Ded.'}</td><td>৳${slipNum(Number(record.late_deduction || 0))}</td></tr>
      <tr><td>${bn ? 'বোনাস' : 'Bonus'}</td><td>৳${slipNum(Number(record.bonus || 0))}</td>
          <td>${bn ? 'অনুপস্থিতি কর্তন' : 'Absence Ded.'}</td><td>৳${slipNum(Number(record.absence_deduction || 0))}</td></tr>
      <tr><td>${bn ? 'ওভারটাইম' : 'Overtime'}</td><td>৳${slipNum(Number(record.overtime || 0))}</td>
          <td>${bn ? 'অগ্রিম কর্তন' : 'Advance Ded.'}</td><td>৳${slipNum(Number(record.advance_deduction || 0))}</td></tr>
      <tr><td>${bn ? 'অন্যান্য ভাতা' : 'Other Allowance'}</td><td>৳${slipNum(Number(record.other_allowance || 0))}</td>
          <td>${bn ? 'অন্যান্য কর্তন' : 'Other Ded.'}</td><td>৳${slipNum(Number(record.other_deduction || 0))}</td></tr>
      ${savingsAmt > 0 ? `<tr class="savings-row"><td colspan="2"></td><td>${bn ? 'বেতন জমা' : 'Salary Savings'}</td><td>৳${slipNum(savingsAmt)}</td></tr>` : ''}
      <tr class="total"><td>${bn ? 'মোট আয়' : 'Total Earnings'}</td><td>৳${slipNum(Number(record.base_salary) + totalAllowance)}</td>
          <td>${bn ? 'মোট কর্তন' : 'Total Deductions'}</td><td>৳${slipNum(totalDeduction + savingsAmt)}</td></tr>
    </table>
    <table><tr class="total"><td style="text-align:center;font-size:16px" colspan="4">
      ${bn ? 'নিট বেতন' : 'Net Salary'}: ৳${slipNum(Number(record.net_salary))}</td></tr></table>
    <div class="sig">
      <div>${bn ? 'প্রাপকের স্বাক্ষর' : "Recipient's Signature"}</div>
      <div>${bn ? 'হিসাবরক্ষক' : 'Accountant'}</div>
      <div>${bn ? 'প্রিন্সিপাল' : 'Principal'}</div>
    </div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // Helper: get month name from month_year string
  const getMonthLabel = (my: string) => {
    const [y, m] = my.split('-');
    const mo = MONTHS.find(mm => mm.value === m);
    return bn ? `${mo?.bn} ${toBnDigits(y)}` : `${mo?.en} ${y}`;
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: bn ? 'মোট মূল বেতন' : 'Total Base', value: `৳${bn ? toBnDigits(stats.totalBase.toLocaleString()) : stats.totalBase.toLocaleString()}`, color: 'bg-primary/10 text-primary' },
            { label: bn ? 'মোট নিট বেতন' : 'Total Net', value: `৳${bn ? toBnDigits(stats.totalNet.toLocaleString()) : stats.totalNet.toLocaleString()}`, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: bn ? 'মোট কর্তন' : 'Total Deductions', value: `৳${bn ? toBnDigits(stats.totalDeduction.toLocaleString()) : stats.totalDeduction.toLocaleString()}`, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            { label: bn ? 'মোট জমা' : 'Total Savings', value: `৳${bn ? toBnDigits(stats.totalSavings.toLocaleString()) : stats.totalSavings.toLocaleString()}`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: bn ? 'পরিশোধিত' : 'Paid', value: bn ? toBnDigits(stats.paid) : stats.paid, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: bn ? 'বকেয়া' : 'Pending', value: bn ? toBnDigits(stats.pending) : stats.pending, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
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
                {canAddItem && <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  <Calculator className="h-3 w-3 mr-1" /> {bn ? 'জেনারেট' : 'Generate'}
                </Button>}
                <Button size="sm" variant="outline" onClick={exportExcel}>
                  <Download className="h-3 w-3 mr-1" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={exportPDF} disabled={pdfLoading}>
                  <FileText className="h-3 w-3 mr-1" /> {pdfLoading ? '...' : 'PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs: Floating Segmented Control */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <SegmentedTabs
            tabs={[
              { key: 'salary', label: bn ? 'বেতন তালিকা' : 'Salary Sheet', icon: Wallet },
              { key: 'bonus', label: bn ? 'বাৎসরিক বোনাস শিট' : 'Annual Bonus Sheet', icon: DollarSign },
              { key: 'savings', label: bn ? 'জমার তালিকা' : 'Savings Ledger', icon: PiggyBank },
            ]}
            value={mainTab}
            onChange={setMainTab}
            className="mb-3"
          />

          <TabsContent value="salary">
            {/* Salary Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'নাম' : 'Name'}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'স্টাফ আইডি' : 'Staff ID'}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'পদবি' : 'Designation'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'ডিউটি' : 'Duty'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মূল বেতন' : 'Base'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'উপ/অনু/বি' : 'P/A/L'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'কর্তন' : 'Ded.'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'ওভারটাইম' : 'OT'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-blue-600">{bn ? 'জমা' : 'Savings'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-emerald-600">{bn ? 'নিট বেতন' : 'Net'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s: any, idx: number) => {
                        const rec = getRecord(s.id);
                        const attStats = getAttendanceStats(s);
                        const autoCalc = calculateSalary(s);
                        const totalDed = rec
                          ? Number(rec.late_deduction || 0) + Number(rec.absence_deduction || 0) +
                            Number(rec.advance_deduction || 0) + Number(rec.other_deduction || 0)
                          : Number(autoCalc.late_deduction || 0) + Number(autoCalc.absence_deduction || 0) +
                            Number(autoCalc.advance_deduction || 0) + Number(autoCalc.other_deduction || 0);
                        const displayOvertime = rec ? Number(rec.overtime || 0) : Number(autoCalc.overtime || 0);
                        const displayNet = rec ? Number(rec.net_salary) : Number(autoCalc.net_salary || 0);
                        const activeSavings = getActiveSavings(s.id);
                        const savingsAmt = activeSavings ? activeSavings.amount : 0;

                        return (
                          <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground">{bn ? toBnDigits(idx + 1) : idx + 1}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{bn ? s.name_bn : (s.name_en || s.name_bn)}</p>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.staff_id || '-'}</td>
                            <td className="px-3 py-2 text-muted-foreground">{getDesignation(s.designation)}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => setDutyDialog({ id: s.id, name: s.name_bn, duty_start_time: s.duty_start_time || '08:00', duty_end_time: s.duty_end_time || '17:00' })}
                                className="text-[10px] text-primary hover:underline">
                                <Timer className="h-3 w-3 inline mr-0.5" />
                                {bn ? toBnDigits(`${fmt(s.duty_start_time || '08:00')}-${fmt(s.duty_end_time || '17:00')}`) : `${fmt(s.duty_start_time || '08:00')}-${fmt(s.duty_end_time || '17:00')}`}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right">৳{bn ? toBnDigits(Number(rec?.base_salary || s.salary || 0).toLocaleString()) : Number(rec?.base_salary || s.salary || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => setAttendanceDetailDialog({ staff: s, stats: attStats })}
                                className="hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                                title={bn ? 'বিস্তারিত দেখুন' : 'View details'}
                              >
                                <span className="text-emerald-600">{bn ? toBnDigits(attStats.present) : attStats.present}</span>/
                                <span className="text-red-500">{bn ? toBnDigits(attStats.absent) : attStats.absent}</span>/
                                <span className="text-yellow-600">{bn ? toBnDigits(attStats.late) : attStats.late}</span>
                                {attStats.totalLateArrivalMinutes > 0 && (
                                  <span className="text-[9px] text-yellow-600 ml-1">({bn ? toBnDigits(attStats.totalLateArrivalMinutes) : attStats.totalLateArrivalMinutes}{bn ? 'মি.' : 'm'})</span>
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right text-red-500">
                              ৳{bn ? toBnDigits(totalDed.toLocaleString()) : totalDed.toLocaleString()}{!rec && totalDed > 0 ? <span className="text-[8px] ml-0.5 opacity-60">~</span> : ''}
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600">
                              ৳{bn ? toBnDigits(displayOvertime.toLocaleString()) : displayOvertime.toLocaleString()}{!rec && displayOvertime > 0 ? <span className="text-[8px] ml-0.5 opacity-60">~</span> : ''}
                            </td>
                            {/* Savings Column */}
                            <td className="px-3 py-2 text-right">
                              {savingsAmt > 0 ? (
                                <button onClick={() => {
                                  const existingConfig = savingsConfigs.find((c: any) => c.staff_id === s.id && c.is_active);
                                  setSavingsDialog({
                                    staff_id: s.id,
                                    staff_name: s.name_bn,
                                    ...(existingConfig || { monthly_amount: 0, duration_months: 6, start_month: monthYear }),
                                    id: existingConfig?.id,
                                  });
                                }}>
                                  <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 cursor-pointer text-[10px]">
                                    ৳{bn ? toBnDigits(savingsAmt.toLocaleString()) : savingsAmt.toLocaleString()}
                                  </Badge>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSavingsDialog({
                                    staff_id: s.id, staff_name: s.name_bn,
                                    monthly_amount: 0, duration_months: 6, start_month: monthYear,
                                  })}
                                  className="text-[10px] text-muted-foreground hover:text-blue-600 transition-colors"
                                >
                                  <Plus className="h-3 w-3 inline" />
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                              ৳{bn ? toBnDigits(displayNet.toLocaleString()) : displayNet.toLocaleString()}{!rec ? <span className="text-[8px] ml-0.5 opacity-60">~</span> : ''}
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
                                    {canEditItem && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditDialog({ ...rec, staffName: s.name_bn })}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>}
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => printSlip(s, rec)}>
                                      <Printer className="h-3 w-3" />
                                    </Button>
                                    {rec.status !== 'paid' ? (
                                      <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" title={bn ? 'পরিশোধিত' : 'Mark Paid'} onClick={() => markPaidMutation.mutate(rec.id)}>
                                        <CheckCircle2 className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <Button size="icon" variant="ghost" className="h-6 w-6 text-yellow-600" title={bn ? 'অপরিশোধিত করুন' : 'Mark Unpaid'} onClick={() => setUnpaidConfirmId(rec.id)}>
                                        <AlertCircle className="h-3 w-3" />
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
                          <td className="px-3 py-2 text-right">৳{bn ? toBnDigits(stats.totalBase.toLocaleString()) : stats.totalBase.toLocaleString()}</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-right text-red-500">৳{bn ? toBnDigits(stats.totalDeduction.toLocaleString()) : stats.totalDeduction.toLocaleString()}</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-right text-blue-600">৳{bn ? toBnDigits(stats.totalSavings.toLocaleString()) : stats.totalSavings.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400">৳{bn ? toBnDigits(stats.totalNet.toLocaleString()) : stats.totalNet.toLocaleString()}</td>
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
          </TabsContent>

          {/* ========== ANNUAL BONUS SHEET TAB ========== */}
          <TabsContent value="bonus">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                    {bn ? 'বাৎসরিক বোনাস তৈরি শিট' : 'Annual Bonus Sheet'}
                  </CardTitle>
                  <div className="flex gap-2 items-center">
                    <Label className="text-xs shrink-0">{bn ? 'বছর' : 'Year'}</Label>
                    <Input type="number" className="w-24 h-8 text-sm" value={bonusYear}
                      onChange={e => setBonusYear(e.target.value)} min="2020" max="2040" />
                    <Button size="sm" variant="outline" onClick={() => {
                      const bData = staff.map((s: any, i: number) => {
                        const staffRecords = bonusYearRecords.filter((r: any) => r.staff_id === s.id);
                        const monthsPaid = staffRecords.length;
                        const baseSalary = Number(s.salary || 0);
                        const perMonthBonus = Math.round(baseSalary / 12);
                        const bonusAmount = perMonthBonus * monthsPaid;
                        return [
                          i + 1, s.name_bn || s.name_en || '-', getDesignation(s.designation),
                          baseSalary, perMonthBonus, monthsPaid, bonusAmount
                        ];
                      });
                      const headers = ['#', bn ? 'নাম' : 'Name', bn ? 'পদবি' : 'Designation',
                        bn ? 'মূল বেতন' : 'Base Salary', bn ? 'প্রতি মাস (বেতন÷১২)' : 'Per Month (Base÷12)',
                        bn ? 'কর্মরত মাস' : 'Months Worked', bn ? 'বোনাস পরিমাণ' : 'Bonus Amount'];
                      const ws = XLSX.utils.aoa_to_sheet([
                        [bn ? `বাৎসরিক বোনাস শিট — ${toBnDigits(bonusYear)}` : `Annual Bonus Sheet — ${bonusYear}`],
                        [], headers, ...bData
                      ]);
                      ws['!cols'] = headers.map(() => ({ wch: 16 }));
                      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
                      const titleCell = ws['A1'];
                      if (titleCell) { titleCell.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } }; }
                      headers.forEach((_, ci) => {
                        const cell = ws[XLSX.utils.encode_cell({ r: 2, c: ci })];
                        if (cell) { cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'center' } }; }
                      });
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, bn ? 'বোনাস শিট' : 'Bonus Sheet');
                      XLSX.writeFile(wb, `bonus_${bonusYear}.xlsx`);
                      toast.success(bn ? 'বোনাস শিট ডাউনলোড হয়েছে' : 'Bonus sheet downloaded');
                    }}>
                      <Download className="h-3 w-3 mr-1" /> Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-amber-50/50 dark:bg-amber-900/10">
                        <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'নাম' : 'Name'}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'পদবি' : 'Designation'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মূল বেতন' : 'Base Salary'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'প্রতি মাস (বেতন÷১২)' : 'Per Month'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'কর্মরত মাস' : 'Months'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'বোনাস পরিমাণ' : 'Bonus Amount'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let grandTotalBonus = 0;
                        return (
                          <>
                            {staff.map((s: any, idx: number) => {
                              const staffRecords = bonusYearRecords.filter((r: any) => r.staff_id === s.id);
                              const monthsPaid = staffRecords.length;
                              const baseSalary = Number(s.salary || 0);
                              const perMonthBonus = Math.round(baseSalary / 12);
                              const bonusAmount = perMonthBonus * monthsPaid;
                              grandTotalBonus += bonusAmount;
                              const fN = (n: number) => bn ? toBnDigits(n.toLocaleString()) : n.toLocaleString();
                              return (
                                <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                                  <td className="px-3 py-2 text-muted-foreground">{bn ? toBnDigits(idx + 1) : idx + 1}</td>
                                  <td className="px-3 py-2 font-medium">{s.name_bn || s.name_en || '-'}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{getDesignation(s.designation)}</td>
                                  <td className="px-3 py-2 text-right">৳{fN(baseSalary)}</td>
                                  <td className="px-3 py-2 text-right text-blue-600">৳{fN(perMonthBonus)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <Badge variant="outline" className="text-[10px]">{bn ? toBnDigits(monthsPaid) : monthsPaid}/{bn ? '১২' : '12'}</Badge>
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-amber-700 dark:text-amber-400">৳{fN(bonusAmount)}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-muted/50 font-bold border-t-2">
                              <td colSpan={3} className="px-3 py-2">{bn ? 'মোট' : 'Total'} ({bn ? toBnDigits(staff.length) : staff.length} {bn ? 'জন' : 'staff'})</td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-400">৳{bn ? toBnDigits(grandTotalBonus.toLocaleString()) : grandTotalBonus.toLocaleString()}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                {staff.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{bn ? 'কোনো স্টাফ পাওয়া যায়নি' : 'No staff found'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== SAVINGS LEDGER TAB ========== */}
          <TabsContent value="savings">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Landmark className="h-5 w-5 text-blue-600" />
                  {bn ? 'জমার তালিকা (Savings Ledger)' : 'Savings Ledger'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-blue-50/50 dark:bg-blue-900/10">
                        <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'নাম' : 'Staff Name'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মাসিক জমা' : 'Monthly'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'সময়কাল' : 'Duration'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'শুরু' : 'Start'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মোট জমা' : 'Total Saved'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'বাকি মাস' : 'Remaining'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'মাসভিত্তিক বিবরণ' : 'Monthly Breakdown'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savingsConfigs.length === 0 ? (
                        <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                          <PiggyBank className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>{bn ? 'কোনো জমা সেটআপ নেই' : 'No savings configured yet'}</p>
                          <p className="text-xs mt-1">{bn ? 'বেতন তালিকায় "+" বাটনে ক্লিক করে জমা সেটআপ করুন' : 'Click "+" in salary table to set up savings'}</p>
                        </td></tr>
                      ) : savingsConfigs.map((cfg: any, idx: number) => {
                        const staffMember = staff.find((s: any) => s.id === cfg.staff_id);
                        const ledgerEntries = savingsLedger.filter((l: any) => l.savings_id === cfg.id);
                        const elapsed = getMonthsElapsed(monthYear, cfg.start_month);
                        const remaining = Math.max(0, cfg.duration_months - Math.max(0, elapsed));
                        const isComplete = elapsed > cfg.duration_months;
                        const isActive = cfg.is_active && !isComplete;

                        return (
                          <tr key={cfg.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground">{bn ? toBnDigits(idx + 1) : idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{staffMember?.name_bn || '-'}</td>
                            <td className="px-3 py-2 text-right text-blue-700 font-semibold">
                              ৳{bn ? toBnDigits(Number(cfg.monthly_amount).toLocaleString()) : Number(cfg.monthly_amount).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {bn ? toBnDigits(cfg.duration_months) : cfg.duration_months} {bn ? 'মাস' : 'months'}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">{getMonthLabel(cfg.start_month)}</td>
                            <td className="px-3 py-2 text-right font-bold text-blue-700">
                              ৳{bn ? toBnDigits(Number(cfg.total_saved || 0).toLocaleString()) : Number(cfg.total_saved || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isComplete ? (
                                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{bn ? 'সম্পূর্ণ' : 'Complete'}</Badge>
                              ) : (
                                <span>{bn ? toBnDigits(remaining) : remaining} {bn ? 'মাস' : 'mo'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge className={isActive 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]'
                                : 'bg-muted text-muted-foreground text-[10px]'}>
                                {isActive ? (bn ? 'চলমান' : 'Active') : isComplete ? (bn ? 'সম্পূর্ণ' : 'Done') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1 max-w-[250px]">
                                {ledgerEntries.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">{bn ? 'এখনো কোনো কর্তন হয়নি' : 'No deductions yet'}</span>
                                ) : ledgerEntries.slice(0, 6).map((entry: any) => (
                                  <Badge key={entry.id} variant="outline" className="text-[9px] bg-blue-50/50 dark:bg-blue-900/10">
                                    {getMonthLabel(entry.month_year)} - ৳{bn ? toBnDigits(Number(entry.amount).toLocaleString()) : Number(entry.amount).toLocaleString()}
                                  </Badge>
                                ))}
                                {ledgerEntries.length > 6 && (
                                  <Badge variant="outline" className="text-[9px]">+{ledgerEntries.length - 6}</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSavingsDialog({
                                  ...cfg, staff_name: staffMember?.name_bn || '-',
                                })}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setDeleteSavingsId(cfg.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Savings Setup Dialog */}
        <Dialog open={!!savingsDialog} onOpenChange={() => setSavingsDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-blue-600" />
                {bn ? 'বেতন জমা সেটিংস' : 'Retainment Setup'}
              </DialogTitle>
            </DialogHeader>
            {savingsDialog && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{savingsDialog.staff_name}</p>
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'মাসিক জমা (৳)' : 'Monthly Savings Amount (৳)'}</Label>
                  <Input type="number" value={savingsDialog.monthly_amount || ''}
                    onChange={e => setSavingsDialog({ ...savingsDialog, monthly_amount: Number(e.target.value) })}
                    placeholder="1000" />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'সময়কাল (মাস)' : 'Duration (Months)'}</Label>
                  <Input type="number" value={savingsDialog.duration_months || ''}
                    onChange={e => setSavingsDialog({ ...savingsDialog, duration_months: Number(e.target.value) })}
                    placeholder="6" min="1" max="60" />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'শুরু মাস (YYYY-MM)' : 'Start Month (YYYY-MM)'}</Label>
                  <Input type="month" value={savingsDialog.start_month || ''}
                    onChange={e => setSavingsDialog({ ...savingsDialog, start_month: e.target.value })} />
                </div>
                {savingsDialog.monthly_amount > 0 && savingsDialog.duration_months > 0 && (
                  <div className="p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'মোট জমা হবে' : 'Total will be saved'}</span>
                      <span className="font-bold text-blue-700">
                        ৳{bn ? toBnDigits((savingsDialog.monthly_amount * savingsDialog.duration_months).toLocaleString()) 
                             : (savingsDialog.monthly_amount * savingsDialog.duration_months).toLocaleString()}
                      </span>
                    </div>
                    {savingsDialog.id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{bn ? 'এখন পর্যন্ত জমা' : 'Saved so far'}</span>
                        <span className="font-bold text-emerald-600">
                          ৳{bn ? toBnDigits(Number(savingsDialog.total_saved || 0).toLocaleString()) 
                               : Number(savingsDialog.total_saved || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {savingsDialog.id && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label className="text-xs">{bn ? 'সক্রিয়' : 'Active'}</Label>
                    <Switch
                      checked={savingsDialog.is_active !== false}
                      onCheckedChange={v => setSavingsDialog({ ...savingsDialog, is_active: v })}
                    />
                  </div>
                )}
                <Button className="w-full" onClick={() => saveSavingsMutation.mutate(savingsDialog)}
                  disabled={saveSavingsMutation.isPending || !savingsDialog.monthly_amount || !savingsDialog.duration_months}>
                  <Save className="h-4 w-4 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                      <Label className="text-xs">{bn ? 'বিলম্ব উপস্থিত কর্তন' : 'Late Present Ded.'}</Label>
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
                <TabsTrigger value="expense" className="flex-1">{bn ? 'খরচ সংযোগ' : 'Expense Link'}</TabsTrigger>
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
                      <SelectItem value="attendance_based">{bn ? 'উপস্থিতি ভিত্তিক (Attendance Based)' : 'Attendance Based'}</SelectItem>
                      <SelectItem value="per_minute">{bn ? 'Per-Minute (মিনিট ভিত্তিক)' : 'Per-Minute Rate'}</SelectItem>
                      <SelectItem value="fixed_rate">{bn ? 'Fixed Rate (নির্দিষ্ট হার)' : 'Fixed Rate'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {(() => {
                      const mode = getSetting('calculation_mode')?.mode || 'per_minute';
                      if (mode === 'attendance_based') return bn ? 'উপস্থিতি ভিত্তিক: নিট বেতন = (উপস্থিত দিন / কর্মদিবস) × মূল বেতন' : 'Attendance Based: Net = (Present Days / Working Days) × Base Salary';
                      if (mode === 'per_minute') return bn ? 'Per-Minute: মাসিক বেতন ÷ ৩০ দিন ÷ দৈনিক ডিউটি মিনিট = প্রতি মিনিটের হার' : 'Per-Minute: Monthly ÷ 30 days ÷ duty minutes = rate/minute';
                      return bn ? 'Fixed Rate: নির্দিষ্ট হারে কর্তন' : 'Fixed Rate: Fixed deduction rates';
                    })()}
                  </p>
                </div>
                <div>
                  <Label>{bn ? 'প্রতি বিলম্ব উপস্থিত দিনে কর্তন (৳) - Fixed মোডে' : 'Late Present Deduction Per Day (৳) - Fixed mode'}</Label>
                  <Input type="number" defaultValue={getSetting('late_deduction_per_day')?.amount || 50}
                    onBlur={e => saveSettingMutation.mutate({ key: 'late_deduction_per_day', value: { amount: Number(e.target.value) } })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{bn ? 'উপস্থিতি বাধ্যতামূলক' : 'Require Attendance'}</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {bn ? 'উপস্থিতি না দিলে বেতন জেনারেট হবে না' : 'Salary won\'t generate without attendance records'}
                    </p>
                  </div>
                  <Switch
                    checked={getSetting('require_attendance')?.enabled !== false}
                    onCheckedChange={v => saveSettingMutation.mutate({ key: 'require_attendance', value: { enabled: v } })}
                  />
                </div>
              </TabsContent>

              {/* Expense Link Settings */}
              <TabsContent value="expense" className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <FolderOpen className="h-4 w-4 inline mr-1 text-primary" />
                  <span className="font-semibold">{bn ? 'খরচে অটো-সেভ সেটিংস' : 'Auto-Save to Expenses Settings'}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bn ? 'বেতন পরিশোধ করলে স্বয়ংক্রিয়ভাবে খরচ ব্যবস্থাপনায় সেভ হবে। প্রতিষ্ঠান ও ক্যাটাগরি নির্বাচন করুন।' 
                         : 'When salary is paid, it will auto-save to expense management. Select institution & category.'}
                  </p>
                </div>

                <div>
                  <Label>{bn ? 'প্রতিষ্ঠান (Institution)' : 'Expense Institution'}</Label>
                  <Select
                    value={getSetting('expense_location')?.institution_id || ''}
                    onValueChange={v => {
                      const current = getSetting('expense_location') || {};
                      saveSettingMutation.mutate({ key: 'expense_location', value: { ...current, institution_id: v } });
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'প্রতিষ্ঠান নির্বাচন করুন' : 'Select institution'} /></SelectTrigger>
                    <SelectContent>
                      {expenseInstitutions.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{bn ? 'ক্যাটাগরি (Category)' : 'Expense Category'}</Label>
                  <Select
                    value={getSetting('expense_location')?.category_id || ''}
                    onValueChange={v => {
                      const current = getSetting('expense_location') || {};
                      saveSettingMutation.mutate({ key: 'expense_location', value: { ...current, category_id: v } });
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select category'} /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories
                        .filter((c: any) => {
                          const selectedInstitution = getSetting('expense_location')?.institution_id;
                          return !selectedInstitution || c.institution_id === selectedInstitution;
                        })
                        .map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {getSetting('expense_location')?.institution_id && getSetting('expense_location')?.category_id ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4 inline mr-1 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {bn ? 'সক্রিয়: বেতন পেইড হলে অটো-সেভ হবে' : 'Active: Auto-save on salary paid'}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-1 text-yellow-600" />
                    <span className="text-yellow-700 dark:text-yellow-400">
                      {bn ? 'প্রতিষ্ঠান ও ক্যাটাগরি নির্বাচন করুন অটো-সেভ চালু করতে' : 'Select institution & category to enable auto-save'}
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="formula" className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <h4 className="font-semibold">{bn ? 'Per-Minute ফর্মুলা' : 'Per-Minute Formula'}</h4>
                  <div className="space-y-1 text-muted-foreground text-xs">
                    <p>• <strong>{bn ? 'দৈনিক হার' : 'Daily Rate'}</strong> = {bn ? 'মাসিক বেতন ÷ ৩০' : 'Monthly Salary ÷ 30'}</p>
                    <p>• <strong>{bn ? 'প্রতি মিনিট হার' : 'Per-Minute Rate'}</strong> = {bn ? 'দৈনিক হার ÷ ডিউটি মিনিট' : 'Daily Rate ÷ Duty Minutes'}</p>
                    <p>• <strong>{bn ? 'অনুপস্থিতি কর্তন' : 'Absence Ded.'}</strong> = {bn ? 'অনুপস্থিত দিন × দৈনিক হার' : 'Absent Days × Daily Rate'}</p>
                    <p>• <strong>{bn ? 'বিলম্ব উপস্থিত কর্তন' : 'Late Present Ded.'}</strong> = {bn ? 'মিসড মিনিট × প্রতি মিনিট হার' : 'Missed Minutes × Per-Minute Rate'}</p>
                    <p>• <strong>{bn ? 'ওভারটাইম' : 'Overtime'}</strong> = {bn ? 'অতিরিক্ত মিনিট × প্রতি মিনিট হার' : 'Extra Minutes × Per-Minute Rate'}</p>
                    <p>• <strong>{bn ? 'নিট বেতন' : 'Net Salary'}</strong> = {bn ? 'মূল + ওভারটাইম + বোনাস - সকল কর্তন - জমা' : 'Base + OT + Bonus - All Deductions - Savings'}</p>
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

        {/* Attendance Detail Dialog */}
        <Dialog open={!!attendanceDetailDialog} onOpenChange={() => setAttendanceDetailDialog(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <Users className="h-5 w-5 inline mr-2" />
                {attendanceDetailDialog?.staff?.name_bn} - {bn ? 'মাসিক উপস্থিতি' : 'Monthly Attendance'}
              </DialogTitle>
            </DialogHeader>
            {attendanceDetailDialog && (() => {
              const staffId = attendanceDetailDialog.staff.id;
              const stats = attendanceDetailDialog.stats;
              const breakdown = stats.dailyBreakdown || [];
              const totalDeduction = breakdown.reduce((s: number, d: any) => s + d.deduction, 0);
              const totalAddition = breakdown.reduce((s: number, d: any) => s + d.addition, 0);
              
              const STATUS_LABEL: Record<string, { bn: string; en: string; color: string }> = {
                present: { bn: 'উপস্থিত', en: 'Present', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                absent: { bn: 'অনুপস্থিত', en: 'Absent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                late: { bn: 'বিলম্ব উপস্থিত', en: 'Late Present', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
                half_day: { bn: 'অর্ধদিন', en: 'Half Day', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
                leave: { bn: 'ছুটি', en: 'Leave', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
              };

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: bn ? 'উপস্থিত' : 'Present', value: stats.present, color: 'text-emerald-600' },
                      { label: bn ? 'অনুপস্থিত' : 'Absent', value: stats.absent, color: 'text-red-500' },
                      { label: bn ? 'বিলম্ব উপস্থিত' : 'Late Present', value: stats.late, color: 'text-yellow-600' },
                      { label: bn ? 'অর্ধদিন' : 'Half Day', value: stats.halfDay, color: 'text-orange-600' },
                      { label: bn ? 'ছুটি' : 'Leave', value: stats.leave || 0, color: 'text-blue-600' },
                    ].map((s, i) => (
                      <div key={i} className="text-center p-2 border rounded-lg">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 border rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-red-600">{bn ? 'কর্তন বিবরণ' : 'Deductions'}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bn ? 'লেইট আসা' : 'Late Arrival'}</span>
                        <span>{stats.totalLateArrivalMinutes} {bn ? 'মি.' : 'min'} = ৳{Math.round(stats.totalLateArrivalMinutes * stats.perMinuteRate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bn ? 'আগাম যাওয়া' : 'Early Exit'}</span>
                        <span>{stats.totalEarlyExitMinutes} {bn ? 'মি.' : 'min'} = ৳{Math.round(stats.totalEarlyExitMinutes * stats.perMinuteRate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bn ? 'অনুপস্থিতি' : 'Absence'}</span>
                        <span>{stats.absent} {bn ? 'দিন' : 'days'} = ৳{Math.round(stats.absent * stats.dailyRate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bn ? 'অর্ধদিন' : 'Half Day'}</span>
                        <span>{stats.halfDay} {bn ? 'দিন' : 'days'} = ৳{Math.round(stats.halfDay * stats.dailyRate / 2).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-t pt-1 text-red-600">
                        <span>{bn ? 'মোট কর্তন' : 'Total Ded.'}</span>
                        <span>৳{totalDeduction.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="p-2 border rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-emerald-600">{bn ? 'যোগ বিবরণ' : 'Additions'}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bn ? 'ওভারটাইম' : 'Overtime'}</span>
                        <span>{stats.totalOvertimeMinutes} {bn ? 'মি.' : 'min'} = ৳{Math.round(stats.totalOvertimeMinutes * stats.perMinuteRate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-t pt-1 text-emerald-600 mt-auto">
                        <span>{bn ? 'মোট যোগ' : 'Total Add.'}</span>
                        <span>৳{totalAddition.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                    <Calculator className="h-3 w-3 inline mr-1" />
                    {bn ? 'প্রতি মিনিট রেট' : 'Per-min rate'}: ৳{stats.perMinuteRate.toFixed(2)} | 
                    {bn ? ' দৈনিক রেট' : ' Daily rate'}: ৳{Math.round(stats.dailyRate).toLocaleString()}
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-2 py-2 text-left text-xs">{bn ? 'তারিখ' : 'Date'}</th>
                          <th className="px-2 py-2 text-center text-xs">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                          <th className="px-2 py-2 text-center text-xs">{bn ? 'ইন/আউট' : 'In/Out'}</th>
                          <th className="px-2 py-2 text-center text-xs">{bn ? 'লেইট/আগাম' : 'Late/Early'}</th>
                          <th className="px-2 py-2 text-right text-xs text-red-500">{bn ? 'কর্তন' : 'Ded.'}</th>
                          <th className="px-2 py-2 text-right text-xs text-emerald-600">{bn ? 'যোগ' : 'Add.'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.length === 0 ? (
                          <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                            {bn ? 'এই মাসে কোনো রেকর্ড নেই' : 'No records this month'}
                          </td></tr>
                        ) : (
                          breakdown
                            .sort((a: any, b: any) => a.date.localeCompare(b.date))
                            .map((d: any, i: number) => {
                              const sl = STATUS_LABEL[d.status] || { bn: d.status, en: d.status, color: 'bg-muted' };
                              return (
                                <tr key={i} className="border-b hover:bg-muted/30">
                                  <td className="px-2 py-1.5 text-xs">{new Date(d.date).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' })}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    <Badge className={`${sl.color} text-[9px]`}>{bn ? sl.bn : sl.en}</Badge>
                                  </td>
                                  <td className="px-2 py-1.5 text-center text-[10px]">
                                    {d.status === 'absent' ? '-' : (
                                      <>{d.checkIn ? fmt(d.checkIn) : '-'} / {d.checkOut ? fmt(d.checkOut) : '-'}</>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-center text-[10px]">
                                    {d.status === 'absent' ? (
                                      <span className="text-red-500">{bn ? 'পুরো দিন' : 'Full day'}</span>
                                    ) : (
                                      <>
                                        {d.lateMin > 0 && <span className="text-yellow-600">{d.lateMin}{bn ? 'মি↓' : 'm↓'} </span>}
                                        {d.earlyMin > 0 && <span className="text-orange-600">{d.earlyMin}{bn ? 'মি↑' : 'm↑'} </span>}
                                        {d.lateMin === 0 && d.earlyMin === 0 && d.status !== 'half_day' && <span className="text-emerald-500">✓</span>}
                                        {d.status === 'half_day' && <span className="text-orange-500">{bn ? '½দিন' : '½day'}</span>}
                                      </>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-xs text-red-500">
                                    {d.deduction > 0 ? `৳${d.deduction.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-xs text-emerald-600">
                                    {d.addition > 0 ? `৳${d.addition.toLocaleString()}` : '-'}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                      {breakdown.length > 0 && (
                        <tfoot>
                          <tr className="bg-muted/50 font-semibold">
                            <td colSpan={4} className="px-2 py-2 text-xs text-right">{bn ? 'মোট' : 'Total'}</td>
                            <td className="px-2 py-2 text-right text-xs text-red-600">৳{totalDeduction.toLocaleString()}</td>
                            <td className="px-2 py-2 text-right text-xs text-emerald-600">৳{totalAddition.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={!!unpaidConfirmId}
          onOpenChange={(o) => { if (!o) setUnpaidConfirmId(null); }}
          onConfirm={() => {
            if (unpaidConfirmId) {
              markUnpaidMutation.mutate(unpaidConfirmId);
              setUnpaidConfirmId(null);
            }
          }}
          title={bn ? 'অপরিশোধিত করতে চান?' : 'Mark as unpaid?'}
          description={bn ? 'এই বেতন রেকর্ডটি অপরিশোধিত হিসেবে চিহ্নিত হবে এবং সংশ্লিষ্ট খরচ থেকে সরানো হবে।' : 'This salary record will be marked as unpaid and removed from expenses.'}
          isPending={markUnpaidMutation.isPending}
        />

        <DeleteConfirmDialog
          open={!!deleteSavingsId}
          onOpenChange={(o) => { if (!o) setDeleteSavingsId(null); }}
          onConfirm={() => {
            if (deleteSavingsId) {
              deleteSavingsMutation.mutate(deleteSavingsId);
              setDeleteSavingsId(null);
            }
          }}
          title={bn ? 'জমা সেটআপ মুছবেন?' : 'Delete savings config?'}
          description={bn ? 'এই জমা সেটআপটি মুছে ফেলা হবে।' : 'This savings configuration will be deleted.'}
          isPending={deleteSavingsMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminSalary;
