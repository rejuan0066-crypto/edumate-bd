import { useState, useMemo, useEffect } from 'react';
import { useTimeFormat, formatTimeDisplay } from '@/hooks/useTimeFormat';
import { useAppTimezone } from '@/hooks/useAppTimezone';
import { toIsoDateInTz, getDatePartsInTz } from '@/lib/timezone';
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
import ConfirmDialog from '@/components/ConfirmDialog';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { numberToBanglaWords } from '@/lib/amountInWords';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { toast } from 'sonner';
import XLSX from 'xlsx-js-style';
import { useCommitteeStaffIds } from '@/hooks/useCommitteeStaffIds';
import CommitteeExclusionNotice from '@/components/CommitteeExclusionNotice';
import SalaryWorkflowPanel from '@/components/admin/SalaryWorkflowPanel';
import BulkSalaryWorkflowDialog from '@/components/admin/BulkSalaryWorkflowDialog';
import {
  Wallet, Users, Search, Save, Download, Printer, Settings2,
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Edit2, Eye,
  Calculator, Plus, Trash2, DollarSign, FileText, Timer, FolderOpen,
  PiggyBank, Landmark, RefreshCw
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
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/salary');
  const { timeFormat } = useTimeFormat();
  const fmt = (t: string) => formatTimeDisplay(t, timeFormat);
  const { settings: webSettings } = useWebsiteSettings();
  const { tz: appTz } = useAppTimezone();

  // Use app-timezone "now" so the default month/year don't drift before midnight in BD
  const tzParts = getDatePartsInTz(new Date(), appTz);
  const [selectedMonth, setSelectedMonth] = useState(String(tzParts.month + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(tzParts.year));
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialog, setEditDialog] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [dutyDialog, setDutyDialog] = useState<any>(null);
  const [attendanceDetailDialog, setAttendanceDetailDialog] = useState<any>(null);
  const [savingsDialog, setSavingsDialog] = useState<any>(null);
  const [savingsLedgerOpen, setSavingsLedgerOpen] = useState(false);
  const [mainTab, setMainTab] = useState('salary');
  const [bonusYear, setBonusYear] = useState(String(tzParts.year));
  const [bonusPercent, setBonusPercent] = useState(100);
  const [unpaidConfirmId, setUnpaidConfirmId] = useState<string | null>(null);
  const [paidConfirmId, setPaidConfirmId] = useState<string | null>(null);
  const [ungenerateConfirmId, setUngenerateConfirmId] = useState<string | null>(null);
  const [deleteSavingsId, setDeleteSavingsId] = useState<string | null>(null);
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'not_generated' | 'pending' | 'paid'>('all');
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  const monthYear = `${selectedYear}-${selectedMonth}`;

  // Auto-refresh salary records when the auto-attendance trigger inserts new rows for this month
  useEffect(() => {
    const channel = supabase
      .channel(`salary-records-${monthYear}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'salary_records', filter: `month_year=eq.${monthYear}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
          queryClient.invalidateQueries({ queryKey: ['salary-generation-log', monthYear] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [monthYear, queryClient]);

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

  const committeeInfo = useCommitteeStaffIds();
  const [showCommitteeStaff, setShowCommitteeStaff] = useState(false);
  const { data: staffRaw = [] } = useQuery({
    queryKey: ['salary-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('status', 'active')
        .order('salary_order', { ascending: true, nullsFirst: false })
        .order('name_bn', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const staff = showCommitteeStaff
    ? (staffRaw as any[])
    : (staffRaw as any[]).filter((s: any) => !committeeInfo.ids.has(s.id));
  const committeeHiddenCount = (staffRaw as any[]).filter((s: any) => committeeInfo.ids.has(s.id)).length;

  // Reorder staff in salary list — supports neighbor-swap OR jump-to-position
  const reorderStaffMutation = useMutation({
    mutationFn: async (
      args:
        | { direction: 'up' | 'down'; currentId: string }
        | { targetPosition: number; currentId: string }
    ) => {
      const list = (staffRaw as any[]).filter((s: any) => showCommitteeStaff || !committeeInfo.ids.has(s.id));
      const idx = list.findIndex((s) => s.id === args.currentId);
      if (idx === -1) return;

      // Jump-to-position mode: rewrite salary_order for the whole list
      if ('targetPosition' in args) {
        const target = Math.max(1, Math.min(list.length, Math.floor(args.targetPosition)));
        const targetIdx = target - 1;
        if (targetIdx === idx) return;
        const reordered = [...list];
        const [moved] = reordered.splice(idx, 1);
        reordered.splice(targetIdx, 0, moved);
        // Assign sequential 10,20,30… so future single-step swaps stay clean
        const updates = reordered.map((s: any, i: number) =>
          supabase.from('staff').update({ salary_order: (i + 1) * 10 }).eq('id', s.id)
        );
        const results = await Promise.all(updates);
        const firstErr = results.find((r: any) => r.error);
        if (firstErr?.error) throw firstErr.error;
        return;
      }

      // Neighbor swap mode (up/down arrows)
      const swapIdx = args.direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= list.length) return;
      const a = list[idx];
      const b = list[swapIdx];
      const aOrder = a.salary_order ?? (idx + 1) * 10;
      const bOrder = b.salary_order ?? (swapIdx + 1) * 10;
      const newA = bOrder;
      const newB = aOrder === bOrder ? aOrder + (args.direction === 'up' ? 1 : -1) : aOrder;
      const { error: e1 } = await supabase.from('staff').update({ salary_order: newA }).eq('id', a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('staff').update({ salary_order: newB }).eq('id', b.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-staff'] });
      toast.success(bn ? 'সিরিয়াল আপডেট হয়েছে' : 'Order updated');
    },
    onError: (err: any) => {
      toast.error(bn ? 'সিরিয়াল পরিবর্তন ব্যর্থ' : 'Reorder failed', { description: err?.message });
    },
  });

  // Inline editing state for the serial-number cell
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [serialDraft, setSerialDraft] = useState<string>('');

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

  // Fetch category shift times (synced with AdminAttendance settings)
  const { data: categoryShiftTimes = {} } = useQuery({
    queryKey: ['category-shift-times-salary'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'category_shift_times').maybeSingle();
      return (data?.value as Record<string, { start: string; end: string }>) || {};
    },
  });

  // Helper: resolve duty time for a staff member — prefers category shift, falls back to staff record
  const getDutyTime = (staffMember: any): { start: string; end: string } => {
    return getDutyTimeWithSource(staffMember);
  };
  const getDutyTimeWithSource = (staffMember: any): { start: string; end: string; source: 'category' | 'staff' | 'default' } => {
    const catKey = staffMember?.staff_category;
    if (catKey && (categoryShiftTimes as any)[catKey]) {
      const t = (categoryShiftTimes as any)[catKey];
      if (t.start && t.end) return { start: t.start, end: t.end, source: 'category' };
    }
    if (staffMember?.duty_start_time && staffMember?.duty_end_time) {
      return { start: staffMember.duty_start_time, end: staffMember.duty_end_time, source: 'staff' };
    }
    return { start: '08:00', end: '17:00', source: 'default' };
  };
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

  // Recalculate ALL existing salary records using latest settings (only pending ones, paid stays untouched)
  const recalculateAllMutation = useMutation({
    mutationFn: async () => {
      let updated = 0;
      let skipped = 0;
      for (const existing of salaryRecords) {
        if (existing.status === 'paid') { skipped++; continue; }
        const staffMember = staff.find((s: any) => s.id === existing.staff_id);
        if (!staffMember) { skipped++; continue; }
        const calc = calculateSalary(staffMember);
        const activeSavings = getActiveSavings(existing.staff_id);
        const savingsDed = activeSavings ? activeSavings.amount : 0;
        const baseNet = Number(calc.net_salary || 0);
        const extras = Number(existing.bonus || 0) + Number(existing.other_allowance || 0);
        const manualDeds = Number(existing.advance_deduction || 0) + savingsDed;
        const netSalary = Math.max(0, baseNet + extras - manualDeds);
        const { error } = await supabase.from('salary_records').update({
          ...calc,
          bonus: Number(existing.bonus || 0),
          other_allowance: Number(existing.other_allowance || 0),
          advance_deduction: Number(existing.advance_deduction || 0),
          savings_deduction: savingsDed,
          net_salary: netSalary,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) throw error;
        updated++;
      }
      return { updated, skipped };
    },
    onSuccess: ({ updated, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      const msg = bn
        ? `${toBnDigits(updated)} জন রিক্যালকুলেট${skipped > 0 ? ` • ${toBnDigits(skipped)} পরিশোধিত বাদ` : ''}`
        : `${updated} recalculated${skipped > 0 ? ` • ${skipped} paid skipped` : ''}`;
      toast.success(msg);
    },
    onError: (e: any) => toast.error(e?.message || (bn ? 'রিক্যালকুলেট সমস্যা' : 'Recalculate failed')),
  });

  // Generate salary for a single staff (per-row generate)
  const generateSingleMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const s = staff.find((x: any) => x.id === staffId);
      if (!s) throw new Error('Staff not found');
      const sName = s.name_bn || s.name_en;
      const requireAttendance = getSetting('require_attendance')?.enabled !== false;
      if (requireAttendance) {
        const hasAttendance = attendanceData.some((a: any) => a.entity_id === s.id);
        if (!hasAttendance) {
          const reason = bn ? 'এই স্টাফের উপস্থিতি রেকর্ড নেই' : 'No attendance records for this staff';
          await logSalaryGeneration({ staff_id: s.id, staff_name: sName, action: 'generate', source: 'manual', success: false, reason });
          throw new Error(reason);
        }
      }
      const existing = salaryRecords.find((r: any) => r.staff_id === s.id);
      if (existing) {
        const reason = bn ? 'এই মাসে ইতোমধ্যে জেনারেট করা হয়েছে' : 'Already generated for this month';
        await logSalaryGeneration({ staff_id: s.id, staff_name: sName, action: 'generate', source: 'manual', success: false, reason });
        throw new Error(reason);
      }
      const calc = calculateSalary(s);
      const { error } = await supabase.from('salary_records').insert({
        staff_id: s.id, month_year: monthYear, ...calc, status: 'pending',
      });
      if (error) {
        await logSalaryGeneration({ staff_id: s.id, staff_name: sName, action: 'generate', source: 'manual', success: false, reason: error.message });
        throw error;
      }

      // Savings ledger
      const activeSavings = getActiveSavings(s.id);
      if (activeSavings && activeSavings.amount > 0) {
        const exists = savingsLedger.find((l: any) =>
          l.savings_id === activeSavings.config.id && l.month_year === monthYear
        );
        if (!exists) {
          await supabase.from('salary_savings_ledger').insert({
            savings_id: activeSavings.config.id,
            staff_id: s.id,
            month_year: monthYear,
            amount: activeSavings.amount,
          });
          await supabase.from('salary_savings').update({
            total_saved: Number(activeSavings.config.total_saved || 0) + activeSavings.amount,
            updated_at: new Date().toISOString(),
          }).eq('id', activeSavings.config.id);
        }
      }
      await logSalaryGeneration({
        staff_id: s.id, staff_name: sName, action: 'generate', source: 'manual',
        success: true, net_salary: Number(calc.net_salary || 0),
      });
      return sName;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['salary-generation-log', monthYear] });
      toast.success(bn ? `${name} এর বেতন জেনারেট হয়েছে` : `Salary generated for ${name}`);
    },
    onError: (e: any) => toast.error(e?.message || (bn ? 'জেনারেট সমস্যা' : 'Generate failed')),
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
    // Main attendance only (exclude morning/evening duty shifts which are handled separately as overtime)
    const rawRecords = attendanceData.filter((a: any) =>
      a.entity_id === staffMember.id &&
      a.shift !== 'morning' && a.shift !== 'evening'
    );
    // Deduplicate: একই দিনের একাধিক রেকর্ড থাকলে শুধুমাত্র একটি গণনা হবে।
    // অগ্রাধিকার: present > late > half_day > leave > absent (ইতিবাচক স্ট্যাটাস জিতবে)
    const statusPriority: Record<string, number> = {
      present: 5, late: 4, half_day: 3, leave: 2, absent: 1,
    };
    const byDate = new Map<string, any>();
    for (const r of rawRecords) {
      const existing = byDate.get(r.attendance_date);
      const curPri = statusPriority[r.status] ?? 0;
      const exPri = existing ? (statusPriority[existing.status] ?? 0) : -1;
      if (!existing || curPri > exPri) {
        byDate.set(r.attendance_date, r);
      }
    }
    const records = Array.from(byDate.values()).sort((a, b) =>
      a.attendance_date.localeCompare(b.attendance_date)
    );

    const present = records.filter((r: any) => r.status === 'present').length;
    const absent = records.filter((r: any) => r.status === 'absent').length;
    const late = records.filter((r: any) => r.status === 'late').length;
    const halfDay = records.filter((r: any) => r.status === 'half_day').length;
    const leave = records.filter((r: any) => r.status === 'leave').length;

    const dutyTime = getDutyTime(staffMember);
    const dutyStart = timeToMinutes(dutyTime.start);
    let dutyEnd = timeToMinutes(dutyTime.end);
    const isOvernight = dutyEnd <= dutyStart;
    if (isOvernight) dutyEnd += 24 * 60; // shift end into next day
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
        // ছুটি = বেতনসহ ছুটি (paid leave)। পূর্ণ দিনের বেতন গণ্য হবে, কোনো কর্তন নয়।
        entry.dailyEarning = Math.round(dailyRate);
        totalDailyEarnings += entry.dailyEarning;
        dailyBreakdown.push(entry);
        return;
      }

      if (r.status === 'half_day') {
        entry.dailyEarning = Math.round(dailyRate / 2);
        entry.deduction = Math.round(dailyRate / 2);
      } else {
        entry.dailyEarning = Math.round(dailyRate);
      }

      let checkIn = r.check_in_time ? timeToMinutes(r.check_in_time) : dutyStart;
      let checkOut = r.check_out_time ? timeToMinutes(r.check_out_time) : dutyEnd;

      if (isOvernight) {
        // Check-in: if clock time precedes start (e.g. 02:00 < 17:00), it belongs to next day
        if (checkIn < dutyStart) checkIn += 24 * 60;
        // Check-out is almost always the next day for overnight shifts
        if (checkOut <= checkIn) checkOut += 24 * 60;
      }

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

  // Calculate salary using TRUE additive per-day logic.
  // Net = সকল উপস্থিত দিনের আয় (অনুপস্থিতি/দেরি ইতিমধ্যে বাদ) + ওভারটাইম + বোনাস − অগ্রিম − জমা
  const calculateSalary = (staffMember: any) => {
    const baseSalary = Number(staffMember.salary) || 0;
    const attStats = getAttendanceStats(staffMember);

    const year = Number(selectedYear);
    const month = Number(selectedMonth);
    const workingDays = new Date(year, month, 0).getDate();

    const bonus = 0;
    const otherAllowance = 0;
    const advanceDeduction = 0;

    // Subtractive model: পূর্ণ মাসিক বেতন থেকে অনুপস্থিতি/দেরি/হাফ-ডে কাটা হয়।
    // এতে সাপ্তাহিক ছুটি/সরকারি ছুটি (যেদিন কোনো রেকর্ড নেই) স্বয়ংক্রিয়ভাবে বেতনসহ ছুটি হিসেবে গণ্য হয়।
    const absenceDeduction = Math.round(attStats.absent * attStats.dailyRate);
    const lateDeduction = Math.round(attStats.totalMissedMinutes * attStats.perMinuteRate);
    const otherDeduction = Math.round(attStats.halfDay * (attStats.dailyRate / 2));

    // Calculation basis toggle: 'subtractive' (default — পূর্ণ মাসিক বেতন − কর্তন; ছুটির দিনসহ)
    // অথবা 'additive' (শুধু উপস্থিত দিনের আয় যোগ; ছুটির দিনে বেতন নেই)
    const calcBasis = getSetting('salary_calc_basis')?.mode || 'subtractive';
    let earnedFromAttendance = calcBasis === 'additive'
      ? Math.round(attStats.totalDailyEarnings)
      : Math.max(0, baseSalary - absenceDeduction - lateDeduction - otherDeduction);
    let overtime = Math.round(attStats.totalOvertimeMinutes * attStats.perMinuteRate);

    if (dutySettings?.extra_duty_enabled && dutySettings?.extra_duty_rate > 0) {
      // extra_duty_rate এখন প্রতি শিফটের মাসিক মোট বেতন।
      // প্রতিটি শিফটে প্রকৃত উপস্থিত দিনের অনুপাতে আনুপাতিক বেতন প্রদান করা হবে।
      const staffDutyRecords = dutyAttendanceData.filter((a: any) => a.entity_id === staffMember.id);
      const morningPresent = staffDutyRecords.filter((r: any) => r.shift === 'morning' && ['present', 'late'].includes(r.status)).length;
      const eveningPresent = staffDutyRecords.filter((r: any) => r.shift === 'evening' && ['present', 'late'].includes(r.status)).length;
      const morningScheduled = Math.max(1, Number(dutySettings.morning_days || 0));
      const eveningScheduled = Math.max(1, Number(dutySettings.evening_days || 0));
      const monthlyRatePerShift = Number(dutySettings.extra_duty_rate);
      const morningEarning = (morningPresent / morningScheduled) * monthlyRatePerShift;
      const eveningEarning = (eveningPresent / eveningScheduled) * monthlyRatePerShift;
      const dutyOvertime = morningEarning + eveningEarning;
      overtime += Math.round(dutyOvertime);
    }

    // Subtractive মডেলে overtime আলাদাভাবে যোগ হয় (earnedFromAttendance এ অন্তর্ভুক্ত নয়)।
    // overtime = per-minute overtime + extra_duty earning (যদি এনাবল থাকে)।

    // Get savings deduction for this month
    const activeSavings = getActiveSavings(staffMember.id);
    const savingsDeduction = activeSavings ? activeSavings.amount : 0;

    // additive মডেলে per-minute overtime ইতিমধ্যে totalDailyEarnings-এ যোগ আছে — double-count এড়াতে বাদ দিই
    const overtimeForNet = calcBasis === 'additive'
      ? overtime - Math.round(attStats.totalOvertimeMinutes * attStats.perMinuteRate)
      : overtime;

    const netSalary = Math.max(0,
      earnedFromAttendance + overtimeForNet + bonus + otherAllowance
      - advanceDeduction - savingsDeduction
    );

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
            await logSalaryGeneration({
              staff_id: s.id, staff_name: s.name_bn || s.name_en, action: 'bulk_generate', source: 'bulk',
              success: false, reason: bn ? 'উপস্থিতি রেকর্ড নেই' : 'No attendance records',
            });
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
        const activeSavings = getActiveSavings(updateData.staff_id);
        const savingsDed = activeSavings ? activeSavings.amount : 0;
        // calculateSalary already returns the correct additive net_salary.
        // Add manual extras (bonus / other_allowance) and subtract advance + savings on top.
        const baseNet = Number(updateData.net_salary || 0);
        const extras = Number(updateData.bonus || 0) + Number(updateData.other_allowance || 0);
        const manualDeds = Number(updateData.advance_deduction || 0) + savingsDed;
        const netSalary = Math.max(0, baseNet + extras - manualDeds);
        updateData.net_salary = netSalary;
        updateData.savings_deduction = savingsDed;
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
        for (const rec of newRecords) {
          const sm = staff.find((x: any) => x.id === rec.staff_id);
          await logSalaryGeneration({
            staff_id: rec.staff_id, staff_name: sm?.name_bn || sm?.name_en,
            action: 'bulk_generate', source: 'bulk', success: true,
            net_salary: Number(rec.net_salary || 0),
          });
        }
      }
      for (const rec of updateRecords) {
        const sm = staff.find((x: any) => x.id === rec.staff_id);
        await logSalaryGeneration({
          staff_id: rec.staff_id, staff_name: sm?.name_bn || sm?.name_en,
          action: 'recalculate', source: 'bulk', success: true,
          net_salary: Number(rec.net_salary || 0),
        });
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
      queryClient.invalidateQueries({ queryKey: ['salary-generation-log', monthYear] });
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error generating salary'),
  });

  // Update single salary record (manual edit)
  const updateMutation = useMutation({
    mutationFn: async (record: any) => {
      const { staffName, ...cleanRecord } = record;
      const activeSavings = getActiveSavings(cleanRecord.staff_id);
      const savingsDed = activeSavings ? activeSavings.amount : 0;
      const netSalary = Math.max(0,
        Number(cleanRecord.base_salary || 0) +
        Number(cleanRecord.bonus || 0) +
        Number(cleanRecord.overtime || 0) +
        Number(cleanRecord.other_allowance || 0) -
        Number(cleanRecord.late_deduction || 0) -
        Number(cleanRecord.absence_deduction || 0) -
        Number(cleanRecord.advance_deduction || 0) -
        Number(cleanRecord.other_deduction || 0) -
        savingsDed
      );
      cleanRecord.savings_deduction = savingsDed;
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

        // Use payment date's month for expense categorization (in app timezone)
        const todayParts = getDatePartsInTz(new Date(), appTz);
        const paymentMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const expenseMonthYear = `${paymentMonthNames[todayParts.month]}-${todayParts.year}`;
        const { error: expError } = await supabase.from('expenses').insert({
          institution_id: projectId,
          category_id: categoryId,
          month_year: expenseMonthYear,
          expense_date: toIsoDateInTz(new Date(), appTz),
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

  // Ungenerate (delete) a salary record so it can be regenerated cleanly
  const ungenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = salaryRecords.find((r: any) => r.id === id);
      if (!record) throw new Error('Record not found');

      // If paid, soft-delete the corresponding expense entry first
      if (record.status === 'paid') {
        const staffMember = staff.find((s: any) => s.id === record.staff_id);
        const staffName = staffMember?.name_bn || staffMember?.name_en || 'Staff';
        await supabase.from('expenses')
          .update({ deleted_at: new Date().toISOString() })
          .like('description', `%${staffName}%`)
          .eq('amount', Number(record.net_salary))
          .is('deleted_at', null);
      }

      // Remove savings ledger entry for this month if exists
      const activeSavings = getActiveSavings(record.staff_id);
      if (activeSavings) {
        const ledgerEntry = savingsLedger.find((l: any) =>
          l.savings_id === activeSavings.config.id && l.month_year === record.month_year
        );
        if (ledgerEntry) {
          await supabase.from('salary_savings_ledger').delete().eq('id', ledgerEntry.id);
          await supabase.from('salary_savings').update({
            total_saved: Math.max(0, Number(activeSavings.config.total_saved || 0) - Number(ledgerEntry.amount || 0)),
            updated_at: new Date().toISOString(),
          }).eq('id', activeSavings.config.id);
        }
      }

      const { error } = await supabase.from('salary_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      toast.success(bn ? 'বেতন রেকর্ড মুছে ফেলা হয়েছে' : 'Salary record removed');
    },
    onError: (e: any) => toast.error(bn ? `সমস্যা: ${e.message}` : `Error: ${e.message}`),
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

  // Filter staff (search + eligibility/status filter)
  const filtered = staff.filter((s: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (s.name_bn + (s.name_en || '') + (s.designation || '')).toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (eligibilityFilter === 'all') return true;
    const rec = salaryRecords.find((r: any) => r.staff_id === s.id);
    const requireAttendance = (settings.find((st: any) => st.setting_key === 'require_attendance')?.setting_value as any)?.enabled !== false;
    const hasAttendance = attendanceData.some((a: any) => a.entity_id === s.id);
    const isEligible = (!requireAttendance || hasAttendance) && Number(s.salary || 0) > 0;
    if (eligibilityFilter === 'eligible') return !rec && isEligible;
    if (eligibilityFilter === 'not_generated') return !rec;
    if (eligibilityFilter === 'pending') return rec && rec.status === 'pending';
    if (eligibilityFilter === 'paid') return rec && rec.status === 'paid';
    return true;
  });

  // Get record for a staff
  const getRecord = (staffId: string) => salaryRecords.find((r: any) => r.staff_id === staffId);

  // Eligibility check: returns null if eligible, or a human reason why generation would fail
  const getEligibilityReason = (s: any): string | null => {
    const requireAttendance = getSetting('require_attendance')?.enabled !== false;
    if (requireAttendance) {
      const hasAttendance = attendanceData.some((a: any) => a.entity_id === s.id);
      if (!hasAttendance) return bn ? 'উপস্থিতি রেকর্ড নেই' : 'No attendance records';
    }
    if (!s.salary || Number(s.salary) <= 0) {
      return bn ? 'মূল বেতন নির্ধারিত নেই' : 'Base salary not set';
    }
    const dt = getDutyTimeWithSource(s);
    if (dt.source === 'default') {
      // Not strictly blocking, but flag it as a warning reason for users
      return bn ? 'ডিউটি সময় ডিফল্ট (০৮:০০–১৭:০০) — সেট করুন' : 'Duty time using default — please set';
    }
    return null;
  };

  // Audit log query
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['salary-generation-log', monthYear],
    enabled: auditLogOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_generation_log' as any)
        .select('*')
        .eq('month_year', monthYear)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Helper: write to salary generation audit log (best-effort, never throws)
  const logSalaryGeneration = async (entry: {
    staff_id?: string | null;
    staff_name?: string | null;
    action: 'generate' | 'auto_generate' | 'recalculate' | 'ungenerate' | 'bulk_generate';
    source: 'manual' | 'bulk' | 'auto_attendance';
    success: boolean;
    reason?: string | null;
    net_salary?: number | null;
    metadata?: Record<string, any>;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userName: string | null = null;
      if (user?.id) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        userName = prof?.full_name || user.email || null;
      }
      await supabase.from('salary_generation_log' as any).insert({
        generated_by: user?.id || null,
        generated_by_name: userName,
        staff_id: entry.staff_id || null,
        staff_name: entry.staff_name || null,
        month_year: monthYear,
        action: entry.action,
        source: entry.source,
        success: entry.success,
        reason: entry.reason || null,
        net_salary: entry.net_salary ?? null,
        metadata: entry.metadata || {},
      });
    } catch (e) {
      console.error('audit log failed', e);
    }
  };

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
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [sigPreparedBy, setSigPreparedBy] = useState('');
  const [sigPreparedRole, setSigPreparedRole] = useState('');
  const [sigVerifiedBy, setSigVerifiedBy] = useState('');
  const [sigVerifiedRole, setSigVerifiedRole] = useState('');
  const [sigApprovedBy, setSigApprovedBy] = useState('');
  const [sigApprovedRole, setSigApprovedRole] = useState('');
  const exportPDF = async (sigOverride?: {
    prepared_by?: string; prepared_by_role?: string;
    verified_by?: string; verified_by_role?: string;
    approved_by?: string; approved_by_role?: string;
    paid_by?: string; paid_by_role?: string;
  }) => {
    setPdfLoading(true);
    try {
      const monthName = MONTHS.find(m => m.value === selectedMonth);
      const sig = sigOverride || {
        prepared_by: sigPreparedBy.trim() || undefined,
        prepared_by_role: sigPreparedRole.trim() || undefined,
        verified_by: sigVerifiedBy.trim() || undefined,
        verified_by_role: sigVerifiedRole.trim() || undefined,
        approved_by: sigApprovedBy.trim() || undefined,
        approved_by_role: sigApprovedRole.trim() || undefined,
      };
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
        ...sig,
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
  const printSlip = async (staffMember: any, record: any) => {
    const activeSavings = getActiveSavings(staffMember.id);
    const savingsAmt = activeSavings ? activeSavings.amount : 0;

    // Earned-from-attendance = base − absence − late − other (প্রকৃত উপস্থিতি ভিত্তিক আয়)
    const attendanceDeductions = Number(record.absence_deduction || 0)
      + Number(record.late_deduction || 0)
      + Number(record.other_deduction || 0);
    const earnedFromAttendance = Math.max(0, Number(record.base_salary || 0) - attendanceDeductions);

    const totalAllowance = Number(record.bonus || 0) + Number(record.overtime || 0) + Number(record.other_allowance || 0);
    const totalEarnings = earnedFromAttendance + totalAllowance;

    // স্লিপের কর্তন কলামে শুধুমাত্র "অতিরিক্ত" কর্তন (অগ্রিম + জমা) দেখাবে।
    // উপস্থিতি কর্তন (absence/late/other) ইতিমধ্যে আয় থেকে বাদ গেছে — তাই ওগুলো আয়ের অংশে দেখানো হয়েছে।
    const totalDed = Number(record.advance_deduction || 0) + savingsAmt;
    const monthName = MONTHS.find(m => m.value === selectedMonth);

    // Per-shift breakdown for residential / extra duty
    let dutyBreakdown: { rate: number; morningPresent: number; morningScheduled: number; morningEarning: number; eveningPresent: number; eveningScheduled: number; eveningEarning: number } | null = null;
    if (dutySettings?.extra_duty_enabled && dutySettings?.extra_duty_rate > 0) {
      const staffDutyRecords = dutyAttendanceData.filter((a: any) => a.entity_id === staffMember.id);
      const morningPresent = staffDutyRecords.filter((r: any) => r.shift === 'morning' && ['present', 'late'].includes(r.status)).length;
      const eveningPresent = staffDutyRecords.filter((r: any) => r.shift === 'evening' && ['present', 'late'].includes(r.status)).length;
      const morningScheduled = Math.max(1, Number(dutySettings.morning_days || 0));
      const eveningScheduled = Math.max(1, Number(dutySettings.evening_days || 0));
      const rate = Number(dutySettings.extra_duty_rate);
      dutyBreakdown = {
        rate,
        morningPresent, morningScheduled,
        morningEarning: Math.round((morningPresent / morningScheduled) * rate),
        eveningPresent, eveningScheduled,
        eveningEarning: Math.round((eveningPresent / eveningScheduled) * rate),
      };
    }

    const slipNum = (n: number) => bn ? toBnDigits(n.toLocaleString()) : n.toLocaleString();
    const netSalary = Number(record.net_salary);
    const inWords = bn
      ? `${numberToBanglaWords(Math.floor(netSalary))} টাকা মাত্র`
      : `${netSalary.toLocaleString()} Taka Only`;


    const instName = bn
      ? (webSettings?.institution_name || 'প্রতিষ্ঠানের নাম')
      : (webSettings?.institution_name_en || webSettings?.institution_name || 'Institution Name');
    const instAddr = webSettings?.address || '';
    const instPhone = webSettings?.phone || '';
    const instEmail = webSettings?.email || '';
    const logoUrl = webSettings?.logo_url || '';
    // Names: priority is institutions table → website_settings → fallback
    const { data: instRow } = await supabase
      .from('institutions')
      .select('principal_name, accountant_name, verifier_name')
      .eq('is_default', true)
      .maybeSingle();
    const principalName =
      (instRow?.principal_name && String(instRow.principal_name).trim()) ||
      (bn ? webSettings?.principal_name : (webSettings?.principal_name_en || webSettings?.principal_name)) ||
      (bn ? 'প্রিন্সিপাল' : 'Principal');

    const slipId = `SL-${selectedYear}${selectedMonth}-${String(record.id).slice(0, 6).toUpperCase()}`;
    const issueDate = new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB');

    const fontHref = `${window.location.origin}/fonts/Kalpurush.ttf`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${bn ? 'বেতন স্লিপ' : 'Salary Slip'} - ${staffMember.name_bn}</title>
    <link rel="preload" as="font" type="font/ttf" href="${fontHref}" crossorigin="anonymous">
    <style>
      @font-face{font-family:"Kalpurush";src:url("${fontHref}") format("truetype");font-display:block;}
      *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
      html,body{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
      body{font-family:'Kalpurush','Noto Sans Bengali','Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:24px;line-height:1.5}
      .slip{max-width:780px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px -15px rgba(15,23,42,.18);position:relative}
      .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}
      .watermark span{font-size:140px;color:rgba(13,148,136,.06);font-weight:900;letter-spacing:8px;transform:rotate(-28deg);white-space:nowrap}
      .header{background:linear-gradient(135deg,#0d9488 0%,#0f766e 60%,#115e59 100%);color:#fff;padding:24px 32px;position:relative;overflow:hidden}
      .header::after{content:"";position:absolute;right:-60px;top:-60px;width:240px;height:240px;background:radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 70%);border-radius:50%}
      .head-row{display:flex;align-items:center;gap:16px;position:relative;z-index:1}
      .logo-wrap{width:64px;height:64px;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);border-radius:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;backdrop-filter:blur(8px)}
      .logo-wrap img{width:100%;height:100%;object-fit:contain}
      .logo-fallback{font-size:28px;font-weight:800}
      .inst-info{flex:1}
      .inst-name{font-size:22px;font-weight:800;letter-spacing:.3px;margin-bottom:2px}
      .inst-meta{font-size:11.5px;opacity:.92;line-height:1.55}
      .slip-tag{position:absolute;right:32px;top:24px;z-index:2;text-align:right}
      .slip-tag .badge{background:rgba(255,255,255,.95);color:#0f766e;font-weight:700;padding:5px 14px;border-radius:999px;font-size:11px;letter-spacing:1.5px;display:inline-block}
      .slip-tag .id{color:#fff;font-size:10.5px;margin-top:6px;opacity:.92;font-family:monospace}
      .month-bar{background:linear-gradient(90deg,#f0fdfa 0%,#ccfbf1 50%,#f0fdfa 100%);padding:12px 32px;border-bottom:1px solid #ccfbf1;display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:#0f766e;font-weight:600;position:relative;z-index:1}
      .month-bar .month{font-size:15px;font-weight:800;color:#115e59}
      .body{padding:24px 32px;position:relative;z-index:1}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:18px}
      .info-cell{padding:10px 14px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12.5px}
      .info-cell:nth-last-child(-n+2){border-bottom:none}
      .info-cell:nth-child(odd){border-right:1px solid #e2e8f0}
      .info-cell .lbl{color:#64748b;font-weight:500}
      .info-cell .val{color:#0f172a;font-weight:700}
      .columns{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
      .col{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
      .col-head{padding:10px 14px;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#fff}
      .col.earn .col-head{background:linear-gradient(90deg,#10b981,#059669)}
      .col.ded .col-head{background:linear-gradient(90deg,#f59e0b,#d97706)}
      .col-body{padding:0}
      .ln{display:flex;justify-content:space-between;padding:9px 14px;font-size:12.5px;border-bottom:1px dashed #e2e8f0}
      .ln:last-child{border-bottom:none}
      .ln .l{color:#475569}
      .ln .v{color:#0f172a;font-weight:600;font-variant-numeric:tabular-nums}
      .ln.savings{background:#eff6ff;color:#1e40af}
      .ln.savings .l,.ln.savings .v{color:#1e40af}
      .col-foot{padding:11px 14px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;border-top:2px solid;font-variant-numeric:tabular-nums}
      .col.earn .col-foot{background:#ecfdf5;color:#065f46;border-color:#10b981}
      .col.ded .col-foot{background:#fffbeb;color:#92400e;border-color:#f59e0b}
      .net-box{background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border-radius:14px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:6px;box-shadow:0 8px 24px -8px rgba(13,148,136,.45)}
      .net-box .lbl{font-size:13px;font-weight:600;opacity:.95;letter-spacing:.4px;text-transform:uppercase}
      .net-box .amt{font-size:26px;font-weight:900;font-variant-numeric:tabular-nums}
      .words{margin-top:10px;padding:9px 14px;background:#f8fafc;border-left:3px solid #0d9488;border-radius:6px;font-size:12px;color:#334155;font-style:italic}
      .words strong{color:#0f766e;font-style:normal;font-weight:700}
      .signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:55px;padding:0 8px}
      .sig{text-align:center;font-size:11.5px;color:#475569}
      .sig .sig-name{font-size:12px;font-weight:700;color:#0f172a;min-height:18px;padding:0 6px 4px}
      .sig .line{border-top:1.5px solid #94a3b8;padding-top:6px;margin-top:0}
      .sig .role{font-weight:700;color:#0f172a;font-size:12px}
      .footer{background:#f1f5f9;padding:10px 32px;text-align:center;font-size:10.5px;color:#64748b;border-top:1px solid #e2e8f0;margin-top:30px}
      .footer .gen{color:#94a3b8;font-size:9.5px;margin-top:3px}
      @media print{
        *,*::before,*::after{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
        body{background:#fff;padding:0}
        .slip{box-shadow:none;border-radius:0;max-width:100%}
        @page{size:A4;margin:8mm}
      }
    </style></head><body>
    <div class="slip">
      <div class="watermark"><span>${bn ? 'বেতন স্লিপ' : 'SALARY'}</span></div>
      <div class="header">
        <div class="slip-tag">
          <div class="badge">${bn ? 'বেতন স্লিপ' : 'PAY SLIP'}</div>
          <div class="id">${slipId}</div>
        </div>
        <div class="head-row">
          <div class="logo-wrap">
            ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : `<div class="logo-fallback">${(instName || 'A').charAt(0)}</div>`}
          </div>
          <div class="inst-info">
            <div class="inst-name">${instName}</div>
            <div class="inst-meta">
              ${instAddr ? `${instAddr}` : ''}
              ${instPhone ? ` &nbsp;•&nbsp; 📞 ${bn ? toBnDigits(instPhone) : instPhone}` : ''}
              ${instEmail ? ` &nbsp;•&nbsp; ✉ ${instEmail}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="month-bar">
        <span>${bn ? 'বেতন মাস' : 'Salary Period'}: <span class="month">${bn ? monthName?.bn : monthName?.en} ${bn ? toBnDigits(selectedYear) : selectedYear}</span></span>
        <span>${bn ? 'ইস্যু তারিখ' : 'Issue Date'}: <strong>${issueDate}</strong></span>
      </div>

      <div class="body">
        <div class="info-grid">
          <div class="info-cell"><span class="lbl">${bn ? 'নাম' : 'Name'}</span><span class="val">${staffMember.name_bn}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'স্টাফ আইডি' : 'Staff ID'}</span><span class="val">${staffMember.staff_id || '-'}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'পদবি' : 'Designation'}</span><span class="val">${getDesignation(staffMember.designation)}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'বিভাগ' : 'Department'}</span><span class="val">${staffMember.department || '-'}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'ডিউটি সময়' : 'Duty Hours'}</span><span class="val">${(() => {
            const t = getDutyTimeWithSource(staffMember);
            const srcLabel = t.source === 'category'
              ? (bn ? 'ক্যাটাগরি শিফট' : 'Category Shift')
              : t.source === 'staff' ? (bn ? 'স্টাফ ব্যক্তিগত' : 'Staff Personal') : (bn ? 'ডিফল্ট' : 'Default');
            return `${fmt(t.start)} – ${fmt(t.end)} <span style="font-size:9px;color:#6b7280;font-weight:500">(${srcLabel})</span>`;
          })()}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'কর্মদিবস' : 'Working Days'}</span><span class="val">${bn ? toBnDigits(record.working_days) : record.working_days}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'উপস্থিত' : 'Present'}</span><span class="val" style="color:#059669">${bn ? toBnDigits(record.present_days) : record.present_days}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'অনুপস্থিত' : 'Absent'}</span><span class="val" style="color:#dc2626">${bn ? toBnDigits(record.absent_days) : record.absent_days}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'বিলম্ব দিন' : 'Late Days'}</span><span class="val" style="color:#d97706">${bn ? toBnDigits(record.late_days || 0) : (record.late_days || 0)}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'স্ট্যাটাস' : 'Status'}</span><span class="val" style="color:${record.status === 'paid' ? '#059669' : '#d97706'}">${record.status === 'paid' ? (bn ? '✓ পরিশোধিত' : '✓ PAID') : (bn ? '⏱ বকেয়া' : '⏱ PENDING')}</span></div>
        </div>

        <div class="columns">
          <div class="col earn">
            <div class="col-head">${bn ? '＋ আয়' : '＋ Earnings'}</div>
            <div class="col-body">
              <div class="ln"><span class="l">${bn ? 'মূল বেতন' : 'Base Salary'}</span><span class="v">৳${slipNum(Number(record.base_salary))}</span></div>
              ${Number(record.absence_deduction || 0) > 0 ? `<div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'অনুপস্থিতি কর্তন' : 'Absence Deduction'} (${bn ? toBnDigits(record.absent_days || 0) : (record.absent_days || 0)} ${bn ? 'দিন' : 'd'})</span><span class="v">৳${slipNum(Number(record.absence_deduction))}</span></div>` : ''}
              ${Number(record.late_deduction || 0) > 0 ? `<div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'বিলম্ব কর্তন' : 'Late Deduction'}</span><span class="v">৳${slipNum(Number(record.late_deduction))}</span></div>` : ''}
              ${Number(record.other_deduction || 0) > 0 ? `<div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'অন্যান্য কর্তন' : 'Other Deduction'}</span><span class="v">৳${slipNum(Number(record.other_deduction))}</span></div>` : ''}
              <div class="ln" style="border-top:1px dashed #94a3b8;padding-top:6px;margin-top:4px"><span class="l"><strong>${bn ? 'উপস্থিতি ভিত্তিক আয়' : 'Earned from Attendance'}</strong></span><span class="v"><strong>৳${slipNum(earnedFromAttendance)}</strong></span></div>
              <div class="ln"><span class="l">${bn ? 'বোনাস' : 'Bonus'}</span><span class="v">৳${slipNum(Number(record.bonus || 0))}</span></div>
              <div class="ln"><span class="l">${bn ? 'ওভারটাইম' : 'Overtime'}</span><span class="v">৳${slipNum(Number(record.overtime || 0))}</span></div>
              ${dutyBreakdown ? `
                <div class="ln" style="background:#f0f9ff;color:#0369a1;font-size:11px"><span class="l">↳ ${bn ? 'সকাল ডিউটি' : 'Morning Duty'}: ${bn ? toBnDigits(dutyBreakdown.morningPresent) : dutyBreakdown.morningPresent}/${bn ? toBnDigits(dutyBreakdown.morningScheduled) : dutyBreakdown.morningScheduled} ${bn ? 'দিন × ৳' : 'd × ৳'}${slipNum(dutyBreakdown.rate)}</span><span class="v">৳${slipNum(dutyBreakdown.morningEarning)}</span></div>
                <div class="ln" style="background:#f0f9ff;color:#0369a1;font-size:11px"><span class="l">↳ ${bn ? 'সন্ধ্যা ডিউটি' : 'Evening Duty'}: ${bn ? toBnDigits(dutyBreakdown.eveningPresent) : dutyBreakdown.eveningPresent}/${bn ? toBnDigits(dutyBreakdown.eveningScheduled) : dutyBreakdown.eveningScheduled} ${bn ? 'দিন × ৳' : 'd × ৳'}${slipNum(dutyBreakdown.rate)}</span><span class="v">৳${slipNum(dutyBreakdown.eveningEarning)}</span></div>
              ` : ''}
              <div class="ln"><span class="l">${bn ? 'অন্যান্য ভাতা' : 'Other Allowance'}</span><span class="v">৳${slipNum(Number(record.other_allowance || 0))}</span></div>
            </div>
            <div class="col-foot"><span>${bn ? 'মোট আয়' : 'Total'}</span><span>৳${slipNum(totalEarnings)}</span></div>
          </div>
          <div class="col ded">
            <div class="col-head">${bn ? '－ কর্তন' : '－ Deductions'}</div>
            <div class="col-body">
              <div class="ln"><span class="l">${bn ? 'অগ্রিম কর্তন' : 'Advance Deduction'}</span><span class="v">৳${slipNum(Number(record.advance_deduction || 0))}</span></div>
              ${savingsAmt > 0 ? `<div class="ln savings"><span class="l">${bn ? '⊕ বেতন জমা' : '⊕ Salary Savings'}</span><span class="v">৳${slipNum(savingsAmt)}</span></div>` : ''}
            </div>
            <div class="col-foot"><span>${bn ? 'মোট কর্তন' : 'Total'}</span><span>৳${slipNum(totalDed)}</span></div>
          </div>
        </div>

        <div class="net-box">
          <span class="lbl">${bn ? 'নিট বেতন (প্রদেয়)' : 'Net Salary (Payable)'}</span>
          <span class="amt">৳ ${slipNum(netSalary)}</span>
        </div>
        <div class="words">${bn ? 'কথায়' : 'In Words'}: <strong>${inWords}</strong></div>

        <div class="signatures">
          <div class="sig">
            <div class="sig-name">${staffMember.name_bn || ''}</div>
            <div class="line">
              <div class="role">${bn ? 'প্রাপকের স্বাক্ষর' : "Recipient's Signature"}</div>
            </div>
          </div>
          <div class="sig">
            <div class="sig-name">&nbsp;</div>
            <div class="line">
              <div class="role">${bn ? 'হিসাবরক্ষক' : 'Accountant'}</div>
            </div>
          </div>
          <div class="sig">
            <div class="sig-name">${principalName}</div>
            <div class="line">
              <div class="role">${bn ? 'অনুমোদনকারী (প্রিন্সিপাল)' : 'Approved by (Principal)'}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        ${bn ? 'এটি কম্পিউটার-জেনারেটেড একটি অফিসিয়াল বেতন স্লিপ। স্বাক্ষর ছাড়াও বৈধ।' : 'This is a computer-generated official salary slip. Valid without signature.'}
        <div class="gen">${bn ? 'জেনারেটর' : 'Generated by'}: ${instName} • ${issueDate}</div>
      </div>
    </div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      const doPrint = () => {
        const fonts = (w.document as any).fonts;
        if (fonts && fonts.ready) {
          fonts.ready.then(() => setTimeout(() => w.print(), 200));
        } else {
          setTimeout(() => w.print(), 1200);
        }
      };
      if (w.document.readyState === 'complete') doPrint();
      else w.addEventListener('load', doPrint);
    }
  };

  // Helper: get month name from month_year string
  const getMonthLabel = (my: string) => {
    const [y, m] = my.split('-');
    const mo = MONTHS.find(mm => mm.value === m);
    return bn ? `${mo?.bn} ${toBnDigits(y)}` : `${mo?.en} ${y}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Premium Banking-style Header */}
        <div className="relative overflow-hidden rounded-[32px] border border-emerald-900/10 dark:border-emerald-400/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white shadow-[0_20px_60px_-20px_rgba(6,78,59,0.5)]">
          {/* Decorative gold ornaments */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

          <div className="relative z-10 px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-emerald-950 grid place-items-center shadow-lg ring-1 ring-amber-200/50">
                <Wallet className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-[0.2em] uppercase text-amber-200">
                    {bn ? 'অর্থ বিভাগ' : 'Finance Division'}
                  </span>
                </div>
                <h1 className="text-[26px] sm:text-[28px] font-display font-extrabold tracking-tight leading-none">
                  {bn ? 'বেতন ব্যবস্থাপনা' : 'Salary Management'}
                </h1>
                <p className="text-[13px] text-emerald-100/80 mt-1.5">
                  {bn ? 'প্রতি-মিনিট ভিত্তিক বেতন হিসাব, কর্তন ও পেমেন্ট লেজার' : 'Per-minute payroll computation, deductions & payment ledger'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right pr-3 border-r border-white/15">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">{bn ? 'বিলিং পিরিয়ড' : 'Billing Period'}</div>
                <div className="text-sm font-bold text-amber-200 mt-0.5 font-mono">
                  {bn ? toBnDigits(`${selectedMonth}/${selectedYear}`) : `${selectedMonth}/${selectedYear}`}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white backdrop-blur-sm">
                <Settings2 className="h-4 w-4 mr-1.5" /> {bn ? 'সেটিংস' : 'Settings'}
              </Button>
            </div>
          </div>
        </div>


        {/* Premium Stats Cards — Banking grade */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: bn ? 'মোট মূল বেতন' : 'Total Base', value: `৳${bn ? toBnDigits(stats.totalBase.toLocaleString()) : stats.totalBase.toLocaleString()}`, accent: 'from-slate-600 to-slate-800', text: 'text-slate-700 dark:text-slate-300', icon: Wallet },
            { label: bn ? 'মোট নিট বেতন' : 'Total Net', value: `৳${bn ? toBnDigits(stats.totalNet.toLocaleString()) : stats.totalNet.toLocaleString()}`, accent: 'from-emerald-500 to-emerald-700', text: 'text-emerald-700 dark:text-emerald-400', icon: DollarSign },
            { label: bn ? 'মোট কর্তন' : 'Total Deductions', value: `৳${bn ? toBnDigits(stats.totalDeduction.toLocaleString()) : stats.totalDeduction.toLocaleString()}`, accent: 'from-rose-500 to-rose-700', text: 'text-rose-700 dark:text-rose-400', icon: RefreshCw },
            { label: bn ? 'মোট জমা' : 'Total Savings', value: `৳${bn ? toBnDigits(stats.totalSavings.toLocaleString()) : stats.totalSavings.toLocaleString()}`, accent: 'from-blue-500 to-blue-700', text: 'text-blue-700 dark:text-blue-400', icon: PiggyBank },
            { label: bn ? 'পরিশোধিত' : 'Paid', value: bn ? toBnDigits(stats.paid) : stats.paid, accent: 'from-emerald-500 to-teal-600', text: 'text-emerald-700 dark:text-emerald-400', icon: FileText },
            { label: bn ? 'বকেয়া' : 'Pending', value: bn ? toBnDigits(stats.pending) : stats.pending, accent: 'from-amber-500 to-orange-600', text: 'text-amber-700 dark:text-amber-400', icon: Calculator },
          ].map((s, i) => (
            <div key={i}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] hover:border-emerald-300/50">
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${s.accent}`} />
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"
                style={{ background: `linear-gradient(135deg, currentColor, transparent)` }} />
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[10px] font-bold tracking-[0.12em] uppercase ${s.text}`}>
                  {s.label}
                </span>
                <s.icon className={`h-3.5 w-3.5 ${s.text} opacity-60`} />
              </div>
              <p className="text-xl font-extrabold tabular-nums text-foreground tracking-tight leading-none">
                {s.value}
              </p>
            </div>
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

              <Select value={eligibilityFilter} onValueChange={(v: any) => setEligibilityFilter(v)}>
                <SelectTrigger className="w-44 h-8 text-sm shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সব স্টাফ' : 'All staff'}</SelectItem>
                  <SelectItem value="eligible">{bn ? 'শুধু যোগ্য (জেনারেটের জন্য)' : 'Eligible only'}</SelectItem>
                  <SelectItem value="not_generated">{bn ? 'জেনারেট হয়নি' : 'Not generated'}</SelectItem>
                  <SelectItem value="pending">{bn ? 'বকেয়া' : 'Pending'}</SelectItem>
                  <SelectItem value="paid">{bn ? 'পরিশোধিত' : 'Paid'}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 shrink-0 flex-wrap">
                {canAddItem && <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  <Calculator className="h-3 w-3 mr-1" /> {bn ? 'জেনারেট' : 'Generate'}
                </Button>}
                {canAddItem && salaryRecords.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => recalculateAllMutation.mutate()}
                    disabled={recalculateAllMutation.isPending}
                    title={bn ? 'সর্বশেষ সেটিং দিয়ে সব বকেয়া বেতন আবার হিসাব করুন' : 'Recalculate all pending salaries with latest settings'}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${recalculateAllMutation.isPending ? 'animate-spin' : ''}`} />
                    {bn ? 'পুনরায় হিসাব' : 'Recalculate'}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setAuditLogOpen(true)} title={bn ? 'বেতন জেনারেশন অডিট লগ' : 'Salary generation audit log'}>
                  <FileText className="h-3 w-3 mr-1" /> {bn ? 'অডিট লগ' : 'Audit Log'}
                </Button>
                <Button size="sm" variant="outline" onClick={exportExcel}>
                  <Download className="h-3 w-3 mr-1" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSigDialogOpen(true)} disabled={pdfLoading}>
                  <FileText className="h-3 w-3 mr-1" /> {pdfLoading ? '...' : 'PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Approval Workflow */}
        {mainTab === 'salary' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <BulkSalaryWorkflowDialog />
            </div>
            <SalaryWorkflowPanel
              monthYear={monthYear}
              monthLabel={(bn ? MONTHS.find(m => m.value === selectedMonth)?.bn : MONTHS.find(m => m.value === selectedMonth)?.en) || ''}
              year={selectedYear}
              records={salaryRecords as any[]}
              eligibleIds={(salaryRecords as any[]).map((r: any) => r.id)}
              onChanged={() => queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] })}
              onPrintWithWorkflow={(sig) => exportPDF(sig)}
            />
          </div>
        )}

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
                        const eligibilityReason = !rec ? getEligibilityReason(s) : null;
                        const isHardBlocked = !rec && eligibilityReason !== null && (
                          eligibilityReason.includes('উপস্থিতি') ||
                          eligibilityReason.toLowerCase().includes('attendance') ||
                          eligibilityReason.includes('মূল বেতন') ||
                          eligibilityReason.toLowerCase().includes('base salary')
                        );

                        return (
                          <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-2 py-2 text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    onClick={() => reorderStaffMutation.mutate({ direction: 'up', currentId: s.id })}
                                    disabled={idx === 0 || reorderStaffMutation.isPending}
                                    className="text-muted-foreground hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                                    title={bn ? 'উপরে নিন' : 'Move up'}
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => reorderStaffMutation.mutate({ direction: 'down', currentId: s.id })}
                                    disabled={idx === filtered.length - 1 || reorderStaffMutation.isPending}
                                    className="text-muted-foreground hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                                    title={bn ? 'নিচে নিন' : 'Move down'}
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {editingSerialId === s.id ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    min={1}
                                    max={filtered.length}
                                    value={serialDraft}
                                    onChange={(e) => setSerialDraft(e.target.value)}
                                    onBlur={() => {
                                      const n = parseInt(serialDraft, 10);
                                      if (!isNaN(n) && n >= 1 && n <= filtered.length && n !== idx + 1) {
                                        reorderStaffMutation.mutate({ targetPosition: n, currentId: s.id });
                                      }
                                      setEditingSerialId(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                      if (e.key === 'Escape') setEditingSerialId(null);
                                    }}
                                    className="w-12 h-6 px-1 text-xs text-center border border-emerald-400 rounded outline-none focus:ring-2 focus:ring-emerald-200"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setEditingSerialId(s.id); setSerialDraft(String(idx + 1)); }}
                                    className="text-xs px-1.5 py-0.5 rounded hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                    title={bn ? 'ক্লিক করে নতুন সিরিয়াল লিখুন' : 'Click to set new position'}
                                  >
                                    {bn ? toBnDigits(idx + 1) : idx + 1}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{bn ? s.name_bn : (s.name_en || s.name_bn)}</p>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.staff_id || '-'}</td>
                            <td className="px-3 py-2 text-muted-foreground">{getDesignation(s.designation)}</td>
                            <td className="px-3 py-2 text-center">
                              {(() => {
                                const t = getDutyTimeWithSource(s);
                                const sourceLabel = t.source === 'category'
                                  ? (bn ? 'উৎস: ক্যাটাগরি শিফট সেটিংস' : 'Source: Category shift settings')
                                  : t.source === 'staff'
                                    ? (bn ? 'উৎস: স্টাফের ব্যক্তিগত সময়' : 'Source: Staff personal time')
                                    : (bn ? 'উৎস: ডিফল্ট (০৮:০০–১৭:০০)' : 'Source: Default (08:00–17:00)');
                                const dot = t.source === 'category' ? 'text-emerald-600' : t.source === 'staff' ? 'text-blue-600' : 'text-muted-foreground';
                                return (
                                  <button onClick={() => setDutyDialog({ id: s.id, name: s.name_bn, duty_start_time: t.start, duty_end_time: t.end })}
                                    className="text-[10px] text-primary hover:underline"
                                    title={sourceLabel}>
                                    <Timer className="h-3 w-3 inline mr-0.5" />
                                    {bn ? toBnDigits(`${fmt(t.start)}-${fmt(t.end)}`) : `${fmt(t.start)}-${fmt(t.end)}`}
                                    <span className={`ml-1 text-[8px] ${dot}`}>●</span>
                                  </button>
                                );
                              })()}
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
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className="text-[10px]">{bn ? 'জেনারেট হয়নি' : 'Not Generated'}</Badge>
                                  {eligibilityReason && (
                                    <span
                                      className={`text-[9px] leading-tight ${isHardBlocked ? 'text-red-600' : 'text-amber-600'}`}
                                      title={eligibilityReason}
                                    >
                                      <AlertCircle className="h-2.5 w-2.5 inline mr-0.5" />
                                      {eligibilityReason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex gap-1 justify-center">
                                {!rec && canAddItem && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-emerald-600 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 disabled:opacity-40"
                                    title={isHardBlocked
                                      ? (bn ? `জেনারেট করা যাবে না: ${eligibilityReason}` : `Cannot generate: ${eligibilityReason}`)
                                      : (bn ? 'এই স্টাফের বেতন জেনারেট করুন' : 'Generate salary')}
                                    disabled={generateSingleMutation.isPending || isHardBlocked}
                                    onClick={() => generateSingleMutation.mutate(s.id)}
                                  >
                                    <Calculator className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {rec && (
                                  <>
                                    {canEditItem && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditDialog({ ...rec, staffName: s.name_bn })}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>}
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => printSlip(s, rec)}>
                                      <Printer className="h-3 w-3" />
                                    </Button>
                                    {rec.status !== 'paid' ? (
                                      <Button size="icon" variant="ghost" className="h-6 w-6 text-yellow-600 hover:bg-yellow-100/60 dark:hover:bg-yellow-900/30" title={bn ? 'পরিশোধিত করুন' : 'Mark Paid'} onClick={() => setPaidConfirmId(rec.id)}>
                                        <Clock className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30" title={bn ? 'অপরিশোধিত করুন' : 'Mark Unpaid'} onClick={() => setUnpaidConfirmId(rec.id)}>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    {canDeleteItem && (
                                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:bg-red-100/60 dark:hover:bg-red-900/30" title={bn ? 'আনজেনারেট (মুছুন)' : 'Ungenerate'} onClick={() => setUngenerateConfirmId(rec.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
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
                <div className="p-3 bg-muted/50 rounded-lg text-sm flex items-center justify-between gap-2">
                  {(() => {
                    const sM = timeToMinutes(dutyDialog.duty_start_time);
                    const eM = timeToMinutes(dutyDialog.duty_end_time);
                    const raw = eM - sM;
                    const overnight = !!dutyDialog.duty_start_time && !!dutyDialog.duty_end_time && eM <= sM;
                    const total = (!dutyDialog.duty_start_time || !dutyDialog.duty_end_time)
                      ? 0
                      : (raw > 0 ? raw : (sM === eM ? 24 * 60 : raw + 24 * 60));
                    return (
                      <>
                        <p>
                          <strong>{bn ? 'মোট ডিউটি:' : 'Total Duty:'}</strong>{' '}
                          {total} {bn ? 'মিনিট' : 'minutes'} ({Math.floor(total / 60)}h {total % 60}m)
                        </p>
                        {overnight && total > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium whitespace-nowrap">
                            {bn ? 'ওভারনাইট ⏵ পরের দিন' : 'Overnight ⏵ next day'}
                          </span>
                        )}
                      </>
                    );
                  })()}
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

        <ConfirmDialog
          open={!!paidConfirmId}
          onOpenChange={(o) => { if (!o) setPaidConfirmId(null); }}
          onConfirm={() => {
            if (paidConfirmId) {
              markPaidMutation.mutate(paidConfirmId);
              setPaidConfirmId(null);
            }
          }}
          title={bn ? 'পরিশোধিত করতে চান?' : 'Mark as paid?'}
          description={bn ? 'এই বেতন রেকর্ডটি পরিশোধিত হিসেবে চিহ্নিত হবে এবং খরচে যুক্ত হবে।' : 'This salary record will be marked as paid and added to expenses.'}
          confirmLabel={bn ? 'হ্যাঁ, পরিশোধ করুন' : 'Yes, Mark Paid'}
          isPending={markPaidMutation.isPending}
          variant="success"
        />

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
          confirmLabel={bn ? 'হ্যাঁ, অপরিশোধিত করুন' : 'Yes, Mark Unpaid'}
          isPending={markUnpaidMutation.isPending}
        />

        <DeleteConfirmDialog
          open={!!ungenerateConfirmId}
          onOpenChange={(o) => { if (!o) setUngenerateConfirmId(null); }}
          onConfirm={() => {
            if (ungenerateConfirmId) {
              ungenerateMutation.mutate(ungenerateConfirmId);
              setUngenerateConfirmId(null);
            }
          }}
          title={bn ? 'বেতন রেকর্ড মুছবেন?' : 'Ungenerate salary record?'}
          description={bn ? 'এই বেতন রেকর্ডটি সম্পূর্ণভাবে মুছে ফেলা হবে। পরিশোধিত হলে সংশ্লিষ্ট খরচ ও জমা এন্ট্রিও সরানো হবে। আপনি পুনরায় জেনারেট করতে পারবেন।' : 'This salary record will be permanently deleted. Linked expense and savings entries will also be removed. You can regenerate it later.'}
          confirmLabel={bn ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
          isPending={ungenerateMutation.isPending}
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

        {/* Salary Generation Audit Log Dialog */}
        <Dialog open={auditLogOpen} onOpenChange={setAuditLogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                {bn ? 'বেতন জেনারেশন অডিট লগ' : 'Salary Generation Audit Log'}
                <span className="text-xs text-muted-foreground font-normal">
                  ({MONTHS.find(m => m.value === selectedMonth)?.[bn ? 'bn' : 'en']} {bn ? toBnDigits(selectedYear) : selectedYear})
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              {auditLogs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {bn ? 'এই মাসের জন্য কোন লগ এন্ট্রি নেই' : 'No log entries for this month'}
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left font-medium">{bn ? 'সময়' : 'Time'}</th>
                      <th className="px-2 py-2 text-left font-medium">{bn ? 'স্টাফ' : 'Staff'}</th>
                      <th className="px-2 py-2 text-left font-medium">{bn ? 'কে করেছেন' : 'By'}</th>
                      <th className="px-2 py-2 text-left font-medium">{bn ? 'অ্যাকশন' : 'Action'}</th>
                      <th className="px-2 py-2 text-left font-medium">{bn ? 'উৎস' : 'Source'}</th>
                      <th className="px-2 py-2 text-center font-medium">{bn ? 'ফলাফল' : 'Result'}</th>
                      <th className="px-2 py-2 text-right font-medium">{bn ? 'নিট বেতন' : 'Net'}</th>
                      <th className="px-2 py-2 text-left font-medium">{bn ? 'মন্তব্য' : 'Note'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="border-b hover:bg-muted/30">
                        <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-2 py-1.5">{log.staff_name || '—'}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{log.generated_by_name || (log.source === 'auto_attendance' ? (bn ? 'সিস্টেম (অটো)' : 'System (auto)') : '—')}</td>
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{log.source}</td>
                        <td className="px-2 py-1.5 text-center">
                          {log.success ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                              {bn ? 'সফল' : 'Success'}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
                              {bn ? 'ব্যর্থ' : 'Failed'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {log.net_salary != null ? `৳${bn ? toBnDigits(Number(log.net_salary).toLocaleString()) : Number(log.net_salary).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground max-w-[240px] truncate" title={log.reason || ''}>{log.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Signature Override Dialog for PDF */}
        <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
          <DialogContent className="max-w-lg rounded-[38px]">
            <DialogHeader>
              <DialogTitle>{bn ? 'স্বাক্ষরকারীর তথ্য' : 'Signatory Information'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                {bn ? 'খালি রাখলে সেটিংস থেকে ডিফল্ট নাম ব্যবহার হবে।' : 'Leave empty to use defaults from settings.'}
              </p>

              <div className="space-y-2 p-3 rounded-2xl border bg-muted/30">
                <Label className="text-sm font-semibold">{bn ? 'প্রস্তুতকারী' : 'Prepared by'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={bn ? 'নাম' : 'Name'} value={sigPreparedBy} onChange={(e) => setSigPreparedBy(e.target.value)} />
                  <Input placeholder={bn ? 'পদবি' : 'Designation'} value={sigPreparedRole} onChange={(e) => setSigPreparedRole(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-2xl border bg-muted/30">
                <Label className="text-sm font-semibold">{bn ? 'যাচাইকারী' : 'Verified by'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={bn ? 'নাম' : 'Name'} value={sigVerifiedBy} onChange={(e) => setSigVerifiedBy(e.target.value)} />
                  <Input placeholder={bn ? 'পদবি' : 'Designation'} value={sigVerifiedRole} onChange={(e) => setSigVerifiedRole(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-2xl border bg-muted/30">
                <Label className="text-sm font-semibold">{bn ? 'অনুমোদনকারী' : 'Approved by'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={bn ? 'নাম' : 'Name'} value={sigApprovedBy} onChange={(e) => setSigApprovedBy(e.target.value)} />
                  <Input placeholder={bn ? 'পদবি' : 'Designation'} value={sigApprovedRole} onChange={(e) => setSigApprovedRole(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSigDialogOpen(false)}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button onClick={() => { setSigDialogOpen(false); exportPDF(); }} disabled={pdfLoading}>
                  <FileText className="h-3 w-3 mr-1" /> {bn ? 'PDF তৈরি করুন' : 'Generate PDF'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
};

export default AdminSalary;
