// @ts-nocheck -- generated DB types are stricter than these legacy dynamic shapes
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePersistentTab } from '@/hooks/usePersistentTab';
import { useTimeFormat, formatTimeDisplay } from '@/hooks/useTimeFormat';
import { useResignedStaff } from '@/hooks/useResignedStaff';
import { useAppTimezone } from '@/hooks/useAppTimezone';
import { toIsoDateInTz, getDatePartsInTz, formatDateTimeInTz, formatDateInTz, formatTimeInTz } from '@/lib/timezone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { numberToBanglaWords } from '@/lib/amountInWords';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import XLSX from 'xlsx-js-style';
import { useCommitteeStaffIds } from '@/hooks/useCommitteeStaffIds';
import CommitteeExclusionNotice from '@/components/CommitteeExclusionNotice';
import { logAccountsAudit } from '@/lib/accountsAudit';
import SalaryWorkflowPanel from '@/components/admin/SalaryWorkflowPanel';
import BulkSalaryWorkflowDialog from '@/components/admin/BulkSalaryWorkflowDialog';
import { recomputeNetSalary, computeManualOverrideNet } from '@/lib/salaryNet';
import { dedupeAttendanceRecords } from '@/lib/attendanceDedup';
import { useAttendanceDuplicateRule } from '@/hooks/useAttendanceDuplicateRule';
import { sortStaffByDepartment } from '@/lib/staffOrderHelper';
import {
  calcDutyDeduction,
  type DeductionResult,
  type DutyDay,
  type DutyAttendance,
} from '@/lib/dutyShiftDeduction';
import { shouldApplyThursdayHalfDay, effectiveDutyEndForThursday, parseHalfDayEndMinutes, parseClockMinutes, getSpecialDayDeductionRateMode, getScheduleForDay } from '@/lib/thursdayHalfDay';
import { resolveStaffShift, fetchSpecialShifts, fetchDepartmentSchedules } from '@/lib/shiftResolution';
import { downloadSlipAsPdf, downloadSheetAsPdf, printSalarySlipHtml, shareSlipPdf, viewSlipPdfInNewTab, isMobileOrPwa } from '@/lib/salarySlipPdf';
import { DatePicker } from '@/components/ui/date-picker';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import {
  Wallet, Users, Search, Save, Download, Printer, Settings2,
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Edit2, Eye,
  Calculator, Plus, Trash2, DollarSign, FileText, FolderOpen,
  PiggyBank, Landmark, RefreshCw, Minus, Share2, Camera, FileCheck2, Upload,
  History, UserMinus, Building2, Layers, Loader2
} from 'lucide-react';
import {
  useSignedSalaryDocs,
  SignedSalaryDocsHubDialog,
  SignedSlipUploadDialog,
  SignedSlipViewerDialog,
} from '@/components/admin/SignedSalaryDocsManager';
import {
  SalarySavingsLedgerDialog,
  type StaffSavingsGroup,
  getJoiningMonth,
  formatMonthLabel,
} from '@/components/admin/SalarySavingsLedgerDialog';
import {
  getEndMonthFromStart,
  getDurationFromRange,
  isMonthInSavingsRange,
} from '@/lib/salarySavingsHelper';

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

const VALID_MAIN_TABS = ['salary', 'bonus', 'savings'] as const;
type MainSalaryTabType = typeof VALID_MAIN_TABS[number];

const VALID_SAVINGS_FILTERS = ['all', 'active', 'resigned'] as const;
type SavingsFilterType = typeof VALID_SAVINGS_FILTERS[number];

// Helper: parse "HH:MM" to total minutes from midnight
const timeToMinutes = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Helper: get months elapsed since start
const getMonthsElapsed = (currentMonthYear: string, startMonth: string): number => {
  const [cy, cm] = currentMonthYear.split('-').map(Number);
  const [sy, sm] = startMonth.split('-').map(Number);
  return (cy * 12 + cm) - (sy * 12 + sm) + 1;
};

const getExpenseMonthYearFromDate = (dateStr: string): string => {
  const [year, month] = dateStr.split('-');
  const monthIndex = Math.max(0, Math.min(11, (Number(month) || 1) - 1));
  const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${monthNamesEn[monthIndex]}-${year}`;
};

const getExpenseMonthYearFromSalaryMonth = (salaryMonthYear: string): string => {
  const [year, month] = salaryMonthYear.split('-');
  const monthIndex = Math.max(0, Math.min(11, Number(month) - 1));
  const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${monthNamesEn[monthIndex]}-${year}`;
};

const AdminSalary = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem, isFeatureAllowed } = usePagePermissions('/admin/salary');
  const { checkApproval, isRecordPending } = useApprovalCheck('/admin/salary', 'salary_records');
  const { timeFormat } = useTimeFormat();
  const fmt = (t: string) => formatTimeDisplay(t, timeFormat);
  const { settings: webSettings } = useWebsiteSettings();
  const { tz: appTz } = useAppTimezone();
  // একই দিনের একাধিক হাজিরা এন্ট্রি থাকলে কোনটি গণনা হবে (অ্যাডমিন সেটিংস)
  const duplicateRule = useAttendanceDuplicateRule();

  const [searchParams, setSearchParams] = useSearchParams();

  // Use app-timezone "now" so the default month/year don't drift before midnight in BD
  const tzParts = getDatePartsInTz(new Date(), appTz);

  // Month & Year persistence: URL query params > sessionStorage > localStorage > current date
  const getInitialMonth = () => {
    const qm = searchParams.get('month');
    if (qm && /^(0[1-9]|1[0-2])$/.test(qm)) return qm;
    try {
      const stored = sessionStorage.getItem('edumate_salary_month') || localStorage.getItem('edumate_salary_month');
      if (stored && /^(0[1-9]|1[0-2])$/.test(stored)) return stored;
    } catch {}
    return String(tzParts.month + 1).padStart(2, '0');
  };

  const getInitialYear = () => {
    const qy = searchParams.get('year');
    if (qy && /^\d{4}$/.test(qy)) return qy;
    try {
      const stored = sessionStorage.getItem('edumate_salary_year') || localStorage.getItem('edumate_salary_year');
      if (stored && /^\d{4}$/.test(stored)) return stored;
    } catch {}
    return String(tzParts.year);
  };

  const [selectedMonth, setSelectedMonthState] = useState<string>(getInitialMonth);
  const [selectedYear, setSelectedYearState] = useState<string>(getInitialYear);

  // Synced setters that update React state, URL query params, and browser storage
  const setSelectedMonth = useCallback((m: string) => {
    setSelectedMonthState(m);
    try {
      sessionStorage.setItem('edumate_salary_month', m);
      localStorage.setItem('edumate_salary_month', m);
    } catch {}
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('month', m);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSelectedYear = useCallback((y: string) => {
    setSelectedYearState(y);
    try {
      sessionStorage.setItem('edumate_salary_year', y);
      localStorage.setItem('edumate_salary_year', y);
    } catch {}
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('year', y);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Keep storage in sync whenever selectedMonth or selectedYear changes
  useEffect(() => {
    try {
      sessionStorage.setItem('edumate_salary_month', selectedMonth);
      localStorage.setItem('edumate_salary_month', selectedMonth);
      sessionStorage.setItem('edumate_salary_year', selectedYear);
      localStorage.setItem('edumate_salary_year', selectedYear);
    } catch {}
  }, [selectedMonth, selectedYear]);

  // Ensure URL search params always reflect the active month & year on initial mount
  useEffect(() => {
    const qm = searchParams.get('month');
    const qy = searchParams.get('year');
    if (!qm || !qy) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        let changed = false;
        if (!next.get('month')) {
          next.set('month', selectedMonth);
          changed = true;
        }
        if (!next.get('year')) {
          next.set('year', selectedYear);
          changed = true;
        }
        return changed ? next : prev;
      }, { replace: true });
    }
  }, []);

  // Sync if URL search params change externally (e.g. browser back/forward buttons)
  useEffect(() => {
    const qm = searchParams.get('month');
    const qy = searchParams.get('year');
    if (qm && /^(0[1-9]|1[0-2])$/.test(qm) && qm !== selectedMonth) {
      setSelectedMonthState(qm);
    }
    if (qy && /^\d{4}$/.test(qy) && qy !== selectedYear) {
      setSelectedYearState(qy);
    }
  }, [searchParams, selectedMonth, selectedYear]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialog, setEditDialog] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [attendanceDetailDialog, setAttendanceDetailDialog] = useState<any>(null);
  const [savingsDialog, setSavingsDialog] = useState<any>(null);
  const [savingsLedgerOpen, setSavingsLedgerOpen] = useState(false);
  const [mainTab, setMainTab] = usePersistentTab<MainSalaryTabType>('salary', {
    paramName: 'tab',
    validTabs: VALID_MAIN_TABS,
    storageKey: 'edumate_salary_tab',
  });
  const [bonusYear, setBonusYear] = useState(String(tzParts.year));
  const [bonusPercent, setBonusPercent] = useState(100);
  const [unpaidConfirmId, setUnpaidConfirmId] = useState<string | null>(null);
  const [paidConfirmId, setPaidConfirmId] = useState<string | null>(null);
  const [ungenerateConfirmId, setUngenerateConfirmId] = useState<string | null>(null);
  const [deleteSavingsId, setDeleteSavingsId] = useState<string | null>(null);
  const [disburseDialog, setDisburseDialog] = useState<any>(null);
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'not_generated' | 'pending' | 'paid'>('all');
  const [savingsFilter, setSavingsFilter] = usePersistentTab<SavingsFilterType>('all', {
    paramName: 'savings_filter',
    validTabs: VALID_SAVINGS_FILTERS,
    storageKey: 'edumate_salary_savings_filter',
  });
  const [savingsSearch, setSavingsSearch] = useState('');
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const monthYear = `${selectedYear}-${selectedMonth}`;
  const signedDocsManager = useSignedSalaryDocs(monthYear);
  const [signedHubOpen, setSignedHubOpen] = useState(false);
  const [directUploadStaff, setDirectUploadStaff] = useState<any | null>(null);
  const [directViewStaff, setDirectViewStaff] = useState<any | null>(null);
  const [selectedLedgerStaffId, setSelectedLedgerStaffId] = useState<string | null>(null);
  const [payAddToExpense, setPayAddToExpense] = useState(true);
  const [expenseSyncModalOpen, setExpenseSyncModalOpen] = useState(false);

  // Pre-fetch default institution for instant synchronous salary slip printing
  const { data: defaultInstData } = useQuery({
    queryKey: ['institution-default-salary-sig'],
    queryFn: async () => {
      const { data } = await supabase
        .from('institutions')
        .select('principal_name, accountant_name, verifier_name')
        .eq('is_default', true)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [slipModal, setSlipModal] = useState<{
    staff: any;
    record: any;
    html: string;
    filename: string;
    slipId: string;
    monthLabel: string;
  } | null>(null);
  const [slipModalLoading, setSlipModalLoading] = useState<'download' | 'share' | 'view' | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-refresh salary records when the auto-attendance trigger inserts new rows for this month
  useEffect(() => {
    const channelName = `salary-records-${monthYear}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let channel: any = null;
    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'salary_records', filter: `month_year=eq.${monthYear}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
            queryClient.invalidateQueries({ queryKey: ['salary-generation-log', monthYear] });
          })
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'staff' },
          () => {
            // Refresh staff list when duty times / salary / category etc. change
            queryClient.invalidateQueries({ queryKey: ['salary-staff'] });
          })
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'website_settings' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['category-shift-times-salary'] });
          })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error in AdminSalary:', e);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
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

  // Dynamic staff categories (for department label translation & ordering)
  const { data: staffCategoriesList = [] } = useQuery({
    queryKey: ['staff-categories-salary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_categories')
        .select('key, name, name_bn, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const { data: staffRaw = [] } = useQuery({
    queryKey: ['salary-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .is('deleted_at', null)
        // Inactive / resigned staff must stay visible for history and deposit ledger
        .in('status', ['active', 'inactive', 'resigned'])
        .order('salary_order', { ascending: true, nullsFirst: false })
        .order('name_bn', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const staff = useMemo(() => {
    const base = showCommitteeStaff
      ? (staffRaw as any[])
      : (staffRaw as any[]).filter((s: any) => !committeeInfo.ids.has(s.id));
    return sortStaffByDepartment(base, { categories: staffCategoriesList as any[], bn, deduplicate: true });
  }, [staffRaw, showCommitteeStaff, committeeInfo.ids, staffCategoriesList, bn]);

  const committeeHiddenCount = (staffRaw as any[]).filter((s: any) => committeeInfo.ids.has(s.id)).length;
  // Only currently-active staff (used by bonus sheet & serial ordering).
  const activeStaff = useMemo(() => (staff as any[]).filter((s: any) => s.status === 'active'), [staff]);

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
    // Attendance can be edited on the Attendance page at any time; always pull
    // the freshest records so salary never shows stale/incorrect attendance.
    staleTime: 0,
    refetchOnMount: 'always',
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


  const getDepartmentLabel = (dept: any): string => {
    const d = (dept || '').toString().trim();
    if (!d) return '-';
    const found = (staffCategoriesList as any[]).find(
      (c) => c.key?.toLowerCase() === d.toLowerCase()
    );
    if (found) return (bn ? (found.name_bn || found.name) : (found.name || found.name_bn)) || d;
    return d;
  };

  // Date-ranged special shifts query
  const { data: specialShifts = [] } = useQuery({
    queryKey: ['staff_special_shifts'],
    queryFn: async () => fetchSpecialShifts(supabase),
    staleTime: 60000,
  });

  // Date-ranged department schedules query
  const { data: departmentSchedules = [] } = useQuery({
    queryKey: ['department_shift_schedules'],
    queryFn: async () => fetchDepartmentSchedules(supabase),
    staleTime: 60000,
  });

  // Helper: resolve duty time for a staff member — prefers special shift > staff-specific time > department schedule > category shift > default
  const getDutyTime = (staffMember: any, targetDate?: string): { start: string; end: string } => {
    return getDutyTimeWithSource(staffMember, targetDate);
  };
  const getDutyTimeWithSource = (staffMember: any, targetDate?: string): { start: string; end: string; source: 'special' | 'category' | 'staff' } => {
    const effectiveDate = targetDate || `${monthYear}-15`;
    const res = resolveStaffShift({
      staffId: staffMember?.id,
      staffCategory: staffMember?.staff_category,
      targetDate: effectiveDate,
      profileDuty: {
        start: staffMember?.duty_start_time,
        end: staffMember?.duty_end_time,
      },
      specialShifts,
      departmentSchedules,
      categoryTimes: categoryShiftTimes,
    });

    return {
      start: res.start,
      end: res.end,
      source: res.source === 'special' ? 'special' : res.source === 'profile' ? 'staff' : 'category',
    };
  };
  // Fetch morning/evening duty attendance for overtime calculation
  const { data: dutyAttendanceData = [] } = useQuery({
    queryKey: ['salary-duty-attendance', monthYear],
    enabled: !!dutySettings?.extra_duty_enabled,
    staleTime: 0,
    refetchOnMount: 'always',
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

  // Fetch holidays for the selected month (paid holidays only affect calculations)
  const { data: monthHolidays = [] } = useQuery({
    queryKey: ['staff-holidays-month', monthYear],
    queryFn: async () => {
      const y = Number(selectedYear); const m = Number(selectedMonth);
      const lastDay = new Date(y, m, 0).getDate();
      const start = `${monthYear}-01`;
      const end = `${monthYear}-${String(lastDay).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('staff_holidays' as any)
        .select('holiday_date, is_paid')
        .gte('holiday_date', start)
        .lte('holiday_date', end);
      if (error) return [] as any[];
      return (data || []) as any[];
    },
  });
  const paidHolidaySet = useMemo(() => new Set(
    monthHolidays.filter((h: any) => h.is_paid).map((h: any) => h.holiday_date)
  ), [monthHolidays]);
  const holidaySet = useMemo(() => new Set(
    monthHolidays.map((h: any) => h.holiday_date)
  ), [monthHolidays]);

  // ── আবাসিক ডিউটি কর্তন (অনুপস্থিতি / বিলম্ব) ───────────────────────────────
  const monthRange = useMemo(() => {
    const y = Number(selectedYear); const m = Number(selectedMonth);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${monthYear}-01`,
      end: `${monthYear}-${String(lastDay).padStart(2, '0')}`,
      lastDay,
    };
  }, [monthYear, selectedYear, selectedMonth]);

  const { data: dutyShiftDefs = [] } = useQuery({
    queryKey: ['salary-duty-shifts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('duty_shifts')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true);
      return (data || []) as any[];
    },
  });

  const { data: dutyTemplateRows = [] } = useQuery({
    queryKey: ['salary-duty-template'],
    queryFn: async () => {
      const { data } = await supabase
        .from('duty_weekly_template')
        .select('staff_id, shift_id, weekday, is_active')
        .eq('is_active', true);
      return (data || []) as any[];
    },
  });

  const { data: dutyRosterRows = [] } = useQuery({
    queryKey: ['salary-duty-roster', monthYear],
    queryFn: async () => {
      const { data } = await supabase
        .from('duty_roster')
        .select('staff_id, shift_id, duty_date')
        .gte('duty_date', monthRange.start)
        .lte('duty_date', monthRange.end);
      return (data || []) as any[];
    },
  });

  const { data: dutyShiftAttRows = [] } = useQuery({
    queryKey: ['salary-duty-shift-attendance', monthYear],
    staleTime: 0,
    queryFn: async () => {
      // আবাসিক ডিউটি হাজিরা attendance_records টেবিলে shift কোড (morning/evening) দিয়ে জমা হয়
      const { data } = await supabase
        .from('attendance_records')
        .select('entity_id, shift, attendance_date, status, check_in_time, check_out_time')
        .eq('entity_type', 'staff')
        .in('shift', ['morning', 'evening'])
        .gte('attendance_date', monthRange.start)
        .lte('attendance_date', monthRange.end);
      return (data || []) as any[];
    },
  });

  /** staffId → { total, lines } — রোস্টার-নির্ধারিত শিফটভিত্তিক কর্তন */
  const dutyDeductionByStaff = useMemo(() => {
    const map = new Map<string, DeductionResult>();
    const configured = dutyShiftDefs.filter(
      (s: any) => Number(s.absent_deduction_amount) > 0 || s.late_deduction_enabled,
    );
    if (configured.length === 0) return map;

    const todayISO = new Date().toISOString().slice(0, 10);
    const dates: string[] = [];
    for (let d = 1; d <= monthRange.lastDay; d++) {
      dates.push(`${monthYear}-${String(d).padStart(2, '0')}`);
    }
    const weekdayOf = (iso: string) => {
      const [y, m, dd] = iso.split('-').map(Number);
      return new Date(y, m - 1, dd).getDay();
    };

    // মূল উপস্থিতিতে স্টাফ যেদিন অনুপস্থিত (absent), সেদিন ডিউটি কর্তন হবে না (দ্বৈত কর্তনমুক্ত)
    const generalAbsentSetByStaff = new Map<string, Set<string>>();
    (attendanceData || []).forEach((a: any) => {
      if (a.shift === 'morning' || a.shift === 'evening') return;
      if (a.status === 'absent') {
        if (!generalAbsentSetByStaff.has(a.entity_id)) {
          generalAbsentSetByStaff.set(a.entity_id, new Set());
        }
        generalAbsentSetByStaff.get(a.entity_id)!.add(a.attendance_date);
      }
    });

    const byStaffDays = new Map<string, DutyDay[]>();
    const push = (staffId: string, day: DutyDay) => {
      const isGeneralAbsent = generalAbsentSetByStaff.get(staffId)?.has(day.date) ?? false;
      const arr = byStaffDays.get(staffId) || [];
      arr.push({
        ...day,
        isGeneralAbsent,
      });
      byStaffDays.set(staffId, arr);
    };

    // Weekly template → every matching weekday of the month
    dutyTemplateRows.forEach((t: any) => {
      dates.forEach((iso) => {
        if (weekdayOf(iso) !== Number(t.weekday)) return;
        push(t.staff_id, {
          date: iso,
          shiftId: t.shift_id,
          isHoliday: holidaySet.has(iso),
          isFuture: iso > todayISO,
        });
      });
    });
    // Explicit daily roster overrides / extras
    dutyRosterRows.forEach((r: any) => {
      push(r.staff_id, {
        date: r.duty_date,
        shiftId: r.shift_id,
        isHoliday: holidaySet.has(r.duty_date),
        isFuture: r.duty_date > todayISO,
      });
    });

    // shift কোড (morning/evening) → duty_shifts.id ম্যাপিং
    const shiftCodeToId = new Map<string, string>();
    dutyShiftDefs.forEach((s: any) => {
      if (s.code) shiftCodeToId.set(String(s.code).toLowerCase(), s.id);
    });

    const attByStaff = new Map<string, DutyAttendance[]>();
    dutyShiftAttRows.forEach((a: any) => {
      const shiftId = shiftCodeToId.get(String(a.shift || '').toLowerCase());
      if (!shiftId) return;
      const arr = attByStaff.get(a.entity_id) || [];
      arr.push({
        date: a.attendance_date,
        shiftId,
        status: a.status,
        check_in_time: a.check_in_time,
        check_out_time: a.check_out_time,
      });
      attByStaff.set(a.entity_id, arr);
    });

    byStaffDays.forEach((days, staffId) => {
      map.set(staffId, calcDutyDeduction(configured as any, days, attByStaff.get(staffId) || [], { skipUnmarked: true }));
    });
    return map;
  }, [dutyShiftDefs, dutyTemplateRows, dutyRosterRows, dutyShiftAttRows, holidaySet, monthYear, monthRange.lastDay, attendanceData]);

  const getDutyDeduction = (staffId: string): DeductionResult =>
    dutyDeductionByStaff.get(staffId) || { total: 0, lines: [], absentCount: 0, lateCount: 0 };

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

  // Fetch expenses for current salary month to track which salaries are linked to expenses
  const expenseMonthYear = getExpenseMonthYearFromSalaryMonth(monthYear);
  const { data: monthSalaryExpenses = [] } = useQuery({
    queryKey: ['salary-expenses-for-month', expenseMonthYear, monthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .is('deleted_at', null)
        .or(`month_year.eq.${expenseMonthYear},description.like.%[salary_month:${monthYear}]%`);
      if (error) throw error;
      return data || [];
    },
  });

  // Check if a staff member's salary is currently recorded in expenses
  const getStaffExpense = useCallback((staffId: string, staffName?: string) => {
    return monthSalaryExpenses.find((e: any) => {
      if (e.description?.includes(`[staff_id:${staffId}]`)) return true;
      if (staffName && e.description?.includes(staffName) && (e.description?.startsWith('বেতন:') || e.description?.startsWith('Salary:'))) return true;
      return false;
    });
  }, [monthSalaryExpenses]);

  // Check if a consolidated monthly total exists in expenses
  const consolidatedExpense = useMemo(() => {
    return monthSalaryExpenses.find((e: any) =>
      e.description?.includes('[salary_bulk_total]') ||
      e.description?.startsWith('মোট বেতন') ||
      e.description?.startsWith('মোট শিক্ষক-স্টাফ বেতন') ||
      e.description?.startsWith('Total Staff Salary')
    );
  }, [monthSalaryExpenses]);

  // Total salary expense currently in expenses table for this month
  const totalSalaryInExpenses = useMemo(() => {
    if (consolidatedExpense) {
      return Number(consolidatedExpense.amount || 0);
    }
    return monthSalaryExpenses
      .filter((e: any) => e.description?.includes('বেতন') || e.description?.includes('Salary'))
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  }, [monthSalaryExpenses, consolidatedExpense]);

  // Hook for resignation-aware queries
  const { isResignedBeforeMonth, isResignedInMonth, resignDateByStaff, getResignDate, resignedStaffIds } = useResignedStaff();

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

  // Grouped savings by staff: shows ALL staff and teachers, with resigned staff clearly marked & separated
  const groupedSavings = useMemo(() => {
    const map = new Map<string, StaffSavingsGroup>();
    for (const cfg of savingsConfigs as any[]) {
      const staffId = cfg.staff_id;
      if (!staffId) continue;
      const staffMember = (staff as any[]).find((s: any) => s.id === staffId) || (staffRaw as any[]).find((s: any) => s.id === staffId);
      const staffLedgers = (savingsLedger as any[]).filter(
        (l: any) => l.staff_id === staffId || l.savings_id === cfg.id
      );
      const joiningMonth = getJoiningMonth(staffMember?.joining_date);
      const effectiveStartMonth = cfg.start_month || joiningMonth || monthYear;

      if (!map.has(staffId)) {
        map.set(staffId, {
          staff_id: staffId,
          staffMember,
          primaryConfig: cfg,
          allConfigs: [cfg],
          totalSaved: 0,
          ledgerEntries: staffLedgers,
          depositedMonthsCount: 0,
          isActive: Boolean(cfg.is_active),
          isComplete: false,
          monthlyAmount: Number(cfg.monthly_amount || 0),
          durationMonths: Number(cfg.duration_months || 0),
          startMonth: effectiveStartMonth,
        });
      } else {
        const existing = map.get(staffId)!;
        existing.allConfigs.push(cfg);
        existing.ledgerEntries = [...existing.ledgerEntries, ...staffLedgers];
        if (cfg.is_active && !existing.primaryConfig?.is_active) {
          existing.primaryConfig = cfg;
          existing.monthlyAmount = Number(cfg.monthly_amount || 0);
          existing.durationMonths = Number(cfg.duration_months || 0);
          existing.startMonth = effectiveStartMonth;
        }
      }
    }

    // Include any staff who have ledger entries even if configs are missing
    for (const l of savingsLedger as any[]) {
      const staffId = l.staff_id;
      if (!staffId || map.has(staffId)) continue;
      const staffMember = (staff as any[]).find((s: any) => s.id === staffId) || (staffRaw as any[]).find((s: any) => s.id === staffId);
      const staffLedgers = (savingsLedger as any[]).filter((x: any) => x.staff_id === staffId);
      const joiningMonth = getJoiningMonth(staffMember?.joining_date);
      const effectiveStartMonth = l.month_year || joiningMonth || monthYear;

      map.set(staffId, {
        staff_id: staffId,
        staffMember,
        primaryConfig: { id: l.savings_id || '', staff_id: staffId, monthly_amount: l.amount || 0, duration_months: 12, start_month: effectiveStartMonth, total_saved: 0, is_active: false },
        allConfigs: [],
        totalSaved: 0,
        ledgerEntries: staffLedgers,
        depositedMonthsCount: 0,
        isActive: false,
        isComplete: false,
        monthlyAmount: Number(l.amount || 0),
        durationMonths: 12,
        startMonth: effectiveStartMonth,
      });
    }

    // Include ALL other staff and teachers who don't have savings setup yet
    const staffPool = (staffRaw as any[]).length > 0 ? (staffRaw as any[]) : (staff as any[]);
    for (const s of staffPool) {
      if (!s.id || map.has(s.id)) continue;
      const joiningMonth = getJoiningMonth(s.joining_date);
      const effectiveStartMonth = joiningMonth || monthYear;
      map.set(s.id, {
        staff_id: s.id,
        staffMember: s,
        primaryConfig: null,
        allConfigs: [],
        totalSaved: 0,
        ledgerEntries: [],
        depositedMonthsCount: 0,
        isActive: false,
        isComplete: false,
        monthlyAmount: 0,
        durationMonths: 0,
        startMonth: effectiveStartMonth,
      });
    }

    return Array.from(map.values())
      .map((item) => {
        const uniqueLedgers = Array.from(
          new Map(item.ledgerEntries.map((l: any) => [l.month_year || l.id, l])).values()
        ).sort((a: any, b: any) => (a.month_year > b.month_year ? -1 : 1));

        const ledgerSum = uniqueLedgers.reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0);
        const totalSaved = Math.max(ledgerSum, Number(item.primaryConfig?.total_saved || 0));
        const elapsed = getMonthsElapsed(monthYear, item.startMonth);
        const isComplete = (item.durationMonths > 0 && elapsed > item.durationMonths) || (item.durationMonths > 0 && uniqueLedgers.length >= item.durationMonths);

        const staffObj = item.staffMember;
        const isResigned = Boolean(
          (staffObj && (staffObj.status === 'resigned' || staffObj.status === 'inactive')) ||
          resignedStaffIds.has(item.staff_id)
        );
        const resignDate = getResignDate(item.staff_id);

        return {
          ...item,
          ledgerEntries: uniqueLedgers,
          totalSaved,
          depositedMonthsCount: uniqueLedgers.length,
          isComplete,
          isActive: Boolean(item.primaryConfig?.is_active && !isComplete),
          isResigned,
          resignDate,
        };
      })
      .sort((a, b) => {
        // 1. Current / active staff first, resigned staff last
        if (a.isResigned !== b.isResigned) {
          return a.isResigned ? 1 : -1;
        }
        // 2. Staff with active savings or deposited balance first
        const aHasSavings = a.monthlyAmount > 0 || a.totalSaved > 0 ? 1 : 0;
        const bHasSavings = b.monthlyAmount > 0 || b.totalSaved > 0 ? 1 : 0;
        if (aHasSavings !== bHasSavings) {
          return bHasSavings - aHasSavings;
        }
        // 3. Sort by salary_order if configured
        const orderA = a.staffMember?.salary_order ?? 999999;
        const orderB = b.staffMember?.salary_order ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        // 4. Alphabetical by name
        const nameA = a.staffMember?.name_bn || a.staffMember?.name_en || '';
        const nameB = b.staffMember?.name_bn || b.staffMember?.name_en || '';
        return nameA.localeCompare(nameB, 'bn');
      });
  }, [savingsConfigs, savingsLedger, staff, staffRaw, monthYear, resignedStaffIds, getResignDate]);

  const activeLedgerGroup = useMemo(() => {
    if (!selectedLedgerStaffId) return null;
    return groupedSavings.find((g) => g.staff_id === selectedLedgerStaffId) || null;
  }, [groupedSavings, selectedLedgerStaffId]);

  // Savings counts and filtered list for the deposit page
  const activeSavingsCount = useMemo(() => groupedSavings.filter((g) => !g.isResigned).length, [groupedSavings]);
  const resignedSavingsCount = useMemo(() => groupedSavings.filter((g) => g.isResigned).length, [groupedSavings]);
  const totalSavingsCount = groupedSavings.length;

  const displayedSavings = useMemo(() => {
    return groupedSavings.filter((item) => {
      // 1. Resignation filter
      if (savingsFilter === 'active' && item.isResigned) return false;
      if (savingsFilter === 'resigned' && !item.isResigned) return false;

      // 2. Search query
      if (savingsSearch.trim()) {
        const q = savingsSearch.toLowerCase().trim();
        const nameBn = (item.staffMember?.name_bn || '').toLowerCase();
        const nameEn = (item.staffMember?.name_en || '').toLowerCase();
        const sId = (item.staffMember?.staff_id || item.staffMember?.staff_id_custom || '').toLowerCase();
        const desig = (item.staffMember?.designation || '').toLowerCase();
        return nameBn.includes(q) || nameEn.includes(q) || sId.includes(q) || desig.includes(q);
      }
      return true;
    });
  }, [groupedSavings, savingsFilter, savingsSearch]);

  // Salary change history — used to apply increases/decreases only from their effective month.
  const { data: salaryChanges = [] } = useQuery({
    queryKey: ['salary-changes-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_salary_changes')
        .select('staff_id, old_salary, new_salary, effective_date')
        .is('deleted_at', null)
        .order('effective_date', { ascending: true });
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
        // Use shared helper — guarded by src/lib/__tests__/salaryNet.test.ts
        // against the savings/advance double-deduction regression.
        const keptOther = Number(existing.other_deduction || 0);
        const netSalary = Math.max(0, recomputeNetSalary(calc, {
          overtime: calc.overtime_for_net,
          bonus: existing.bonus,
          other_allowance: existing.other_allowance,
          advance_deduction: existing.advance_deduction,
          savings_deduction: savingsDed,
        }) - keptOther);
        const { error } = await supabase.from('salary_records').update({
          ...calc,
          bonus: Number(existing.bonus || 0),
          other_allowance: Number(existing.other_allowance || 0),
          other_allowance_note: existing.other_allowance_note ?? null,
          advance_deduction: Number(existing.advance_deduction || 0),
          // Manually entered extras must survive a recalculation
          other_deduction: keptOther,
          other_deduction_note: existing.other_deduction_note ?? null,
          overtime_reason: existing.overtime_reason ?? null,
          remarks: existing.remarks ?? null,
          savings_deduction: savingsDed,
          net_salary: netSalary,
          manual_override: false,
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

  // Recalculate a SINGLE existing pending salary record (e.g. after editing joining/date info)
  const recalculateSingleMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const staffMember = staff.find((s: any) => s.id === staffId);
      if (!staffMember) throw new Error('Staff not found');
      const sName = staffMember.name_bn || staffMember.name_en;
      const existing = salaryRecords.find((r: any) => r.staff_id === staffId);
      if (!existing) {
        throw new Error(bn ? 'এই মাসে কোনো বেতন রেকর্ড নেই' : 'No salary record for this month');
      }
      if (existing.status === 'paid') {
        throw new Error(bn ? 'পরিশোধিত বেতন পুনরায় হিসাব করা যাবে না' : 'Cannot recalculate a paid salary');
      }
      const calc = calculateSalary(staffMember);
      const activeSavings = getActiveSavings(staffId);
      const savingsDed = activeSavings ? activeSavings.amount : 0;
      const keptOther = Number(existing.other_deduction || 0);
      const netSalary = Math.max(0, recomputeNetSalary(calc, {
        overtime: calc.overtime_for_net,
        bonus: existing.bonus,
        other_allowance: existing.other_allowance,
        advance_deduction: existing.advance_deduction,
        savings_deduction: savingsDed,
      }) - keptOther);
      const { error } = await supabase.from('salary_records').update({
        ...calc,
        bonus: Number(existing.bonus || 0),
        other_allowance: Number(existing.other_allowance || 0),
        other_allowance_note: existing.other_allowance_note ?? null,
        advance_deduction: Number(existing.advance_deduction || 0),
        // Manually entered extras must survive a recalculation
        other_deduction: keptOther,
        other_deduction_note: existing.other_deduction_note ?? null,
        overtime_reason: existing.overtime_reason ?? null,
        remarks: existing.remarks ?? null,
        savings_deduction: savingsDed,
        net_salary: netSalary,
        manual_override: false,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) throw error;
      await logSalaryGeneration({
        staff_id: staffId, staff_name: sName, action: 'recalculate', source: 'manual',
        success: true, net_salary: Number(netSalary || 0),
      });
      return sName;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['salary-generation-log', monthYear] });
      toast.success(bn ? `${name} এর বেতন পুনরায় হিসাব হয়েছে` : `Salary recalculated for ${name}`);
    },
    onError: (e: any) => toast.error(e?.message || (bn ? 'রিক্যালকুলেট সমস্যা' : 'Recalculate failed')),
  });

  // Generate salary for a single staff (per-row generate)
  const generateSingleMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const s = staff.find((x: any) => x.id === staffId);
      if (!s) throw new Error('Staff not found');
      const sName = s.name_bn || s.name_en;
      const isResignMonth = isResignedInMonth(s.id, monthYear);
      if (s.status === 'inactive' && !isResignMonth && !salaryRecords.some((r: any) => r.staff_id === s.id)) {
        throw new Error(bn ? `${sName} নিষ্ক্রিয় — এই মাসে বেতন তৈরি করা যাবে না` : `${sName} is inactive — cannot generate salary for this month`);
      }
      if (!hasJoinedByMonth(s)) {
        const jdLabel = s.joining_date ? String(s.joining_date).slice(0, 10) : '';
        throw new Error(bn
          ? `${sName} এই মাসের আগে যোগদান করেননি (যোগদান: ${jdLabel})`
          : `${sName} had not joined before this month (joined: ${jdLabel})`);
      }
      if (isResignedBeforeMonth(s.id, monthYear) && !salaryRecords.some((r: any) => r.staff_id === s.id)) {
        throw new Error(bn
          ? `${sName} এই মাস শুরুর আগে পদত্যাগ করেছেন — এই মাসে বেতন তৈরি করা যাবে না`
          : `${sName} resigned before this month started — cannot generate salary for this month`);
      }
      const requireAttendance = getSetting('require_attendance')?.enabled !== false;
      // Hard validation — block on any data error
      const v = getAttendanceValidation(s);
      if (v.hasErrors) {
        const reason = v.errors.join(' • ');
        await logSalaryGeneration({ staff_id: s.id, staff_name: sName, action: 'generate', source: 'manual', success: false, reason });
        throw new Error(reason);
      }
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
    const sMember = (staff as any[]).find((s: any) => s.id === staffId) || (staffRaw as any[]).find((s: any) => s.id === staffId);
    const configs = savingsConfigs.filter((c: any) => c.staff_id === staffId && c.is_active);
    for (const cfg of configs) {
      const effStart = cfg.start_month || getJoiningMonth(sMember?.joining_date);
      if (effStart && isMonthInSavingsRange(monthYear, effStart, cfg.duration_months)) {
        return { amount: Number(cfg.monthly_amount), config: cfg };
      }
    }
    return null;
  };

  // Display-time salary snapshot: pending records must reflect the freshest
  // attendance immediately. Only paid records stay locked to their saved snapshot.
  const getSalaryDisplaySnapshot = (staffMember: any, record?: any | null) => {
    const liveStats = getAttendanceStats(staffMember);
    const liveCalc = calculateSalary(staffMember);
    const activeSavings = getActiveSavings(staffMember.id);
    const activeSavingsAmount = activeSavings ? activeSavings.amount : 0;
    const isPaid = !!record && record.status === 'paid';

    if (isPaid) {
      const savedRecord = { ...liveCalc, ...record };
      return {
        record: savedRecord,
        stats: {
          ...liveStats,
          present: Number(record.present_days ?? liveStats.present),
          absent: Number(record.absent_days ?? liveStats.absent),
          late: Number(record.late_days ?? liveStats.late),
        },
        isPaid: true,
        isAdditive: ((record.calc_basis ?? liveCalc.calc_basis) === 'additive'),
        savingsDisplay: Number(record.savings_deduction ?? activeSavingsAmount),
        isLive: false,
      };
    }

    const manualBonus = Number(record?.bonus || 0);
    const manualAllow = Number(record?.other_allowance || 0);
    const manualAdvance = Number(record?.advance_deduction || 0);
    const savingsForNet = Number(liveCalc.savings_deduction || 0);
    const liveRecord = {
      ...(record || {}),
      ...liveCalc,
      id: record?.id,
      staff_id: staffMember.id,
      month_year: monthYear,
      status: record?.status || 'not_generated',
      bonus: manualBonus,
      other_allowance: manualAllow,
      other_allowance_note: record?.other_allowance_note,
      advance_deduction: manualAdvance,
      other_deduction_note: record?.other_deduction_note,
      overtime_reason: record?.overtime_reason,
      remarks: record?.remarks,
      savings_deduction: savingsForNet,
      net_salary: recomputeNetSalary(liveCalc, {
        overtime: liveCalc.overtime_for_net,
        bonus: manualBonus,
        other_allowance: manualAllow,
        advance_deduction: manualAdvance,
        savings_deduction: savingsForNet,
      }),
    };

    // Manual override: admin edited deductions/allowances by hand from the
    // edit dialog — keep the saved values instead of the live recalculation.
    if (record?.manual_override) {
      const ovBase = Number(record.base_salary ?? liveCalc.base_salary ?? 0);
      const ovLate = Number(record.late_deduction || 0);
      const ovAbsence = Number(record.absence_deduction || 0);
      const ovOther = Number(record.other_deduction || 0);
      const ovOvertime = Number(record.overtime || 0);
      const ovSavings = Number(record.savings_deduction ?? savingsForNet);
      const ovDuty = Number(record.duty_deduction ?? liveCalc.duty_deduction ?? 0);
      Object.assign(liveRecord, {
        manual_override: true,
        base_salary: ovBase,
        late_deduction: ovLate,
        absence_deduction: ovAbsence,
        other_deduction: ovOther,
        duty_deduction: ovDuty,
        overtime: ovOvertime,
        overtime_for_net: ovOvertime,
        earned_from_attendance: ovBase,
        savings_deduction: ovSavings,
        net_salary: computeManualOverrideNet({
          base_salary: ovBase, bonus: manualBonus, overtime: ovOvertime, other_allowance: manualAllow,
          late_deduction: ovLate, absence_deduction: ovAbsence, advance_deduction: manualAdvance,
          other_deduction: ovOther, savings_deduction: ovSavings, duty_deduction: ovDuty,
        }),
      });
    }

    return {
      record: liveRecord,
      stats: liveStats,
      isPaid: false,
      isAdditive: (liveCalc.calc_basis || getSetting('salary_calc_basis')?.mode || 'subtractive') === 'additive',
      savingsDisplay: activeSavingsAmount,
      isLive: true,
    };
  };

  const getAdditiveAttendanceDeduction = (record: any): number => {
    return Number(record?.late_deduction || 0) + Number(record?.absence_deduction || 0) + Number(record?.other_deduction || 0);
  };

  const getSalaryDisplayTotalDeduction = (snapshot: ReturnType<typeof getSalaryDisplaySnapshot>): number => {
    const r = snapshot.record;
    return Math.round(
      Number(r.late_deduction || 0)
      + Number(r.absence_deduction || 0)
      + Number(r.advance_deduction || 0)
      + Number(r.other_deduction || 0)
      + Number(r.duty_deduction || 0)
    );
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
    onError: (err: any) => toast.error(err?.message || (bn ? 'সমস্যা হয়েছে' : 'Error saving')),
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

  // Disburse savings -> create expense entry
  const disburseSavingsMutation = useMutation({
    mutationFn: async (payload: { config: any; amount: number; categoryId: string; institutionId: string; note?: string }) => {
      const { config, amount, categoryId, institutionId, note } = payload;
      const staffMember = staff.find((x: any) => x.id === config.staff_id);
      const sName = staffMember?.name_bn || staffMember?.name_en || 'Staff';
      const todayParts = getDatePartsInTz(new Date(), appTz);
      const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const expenseMonthYear = `${monthNamesEn[todayParts.month]}-${todayParts.year}`;
      const description = `${bn ? 'জমা পরিশোধ' : 'Savings disbursement'}: ${sName}${note ? ' — ' + note : ''} [unit:none]`;

      const { data: expData, error: expErr } = await supabase.from('expenses').insert({
        institution_id: institutionId,
        category_id: categoryId,
        month_year: expenseMonthYear,
        expense_date: toIsoDateInTz(new Date(), appTz),
        amount,
        quantity: 1,
        description,
      }).select('id').single();
      if (expErr) throw expErr;

      const { error: updErr } = await supabase.from('salary_savings').update({
        is_active: false,
        disbursed_at: new Date().toISOString(),
        disbursed_amount: amount,
        expense_id: expData?.id,
        expense_category_id: categoryId,
        expense_institution_id: institutionId,
        updated_at: new Date().toISOString(),
      }).eq('id', config.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      setDisburseDialog(null);
      toast.success(bn ? 'পরিশোধ সম্পন্ন এবং হিসাবে যোগ হয়েছে' : 'Disbursed & added to expenses');
    },
    onError: (e: any) => toast.error(bn ? `সমস্যা: ${e.message}` : `Error: ${e.message}`),
  });

  // (expense categories/institutions queries are declared earlier in this file)

  // Get setting value helper
  const getSetting = (key: string) => {
    const s = settings.find((st: any) => st.setting_key === key);
    return s?.setting_value as any || {};
  };

  // উপস্থিতির "শেষ আপডেট" — এই স্টাফের চলতি মাসের রেকর্ডগুলোর সর্বশেষ updated_at/created_at।
  const getAttendanceLastUpdated = (staffMember: any): Date | null => {
    let latest: number | null = null;
    for (const a of attendanceData as any[]) {
      if (a.entity_id !== staffMember.id) continue;
      if (a.shift === 'morning' || a.shift === 'evening') continue;
      const ts = a.updated_at || a.created_at;
      if (!ts) continue;
      const t = new Date(ts).getTime();
      if (!isNaN(t) && (latest === null || t > latest)) latest = t;
    }
    return latest === null ? null : new Date(latest);
  };



  // Joining-date guard: a staff is only relevant for a salary month if they had
  // already joined by the END of that month. New staff must NOT appear in months
  // before their joining month, and their pay is counted from the joining date.
  const monthEndDate = (() => {
    const [yy, mm] = monthYear.split('-').map(Number);
    const lastDay = new Date(yy, mm, 0).getDate();
    return `${monthYear}-${String(lastDay).padStart(2, '0')}`;
  })();
  const hasJoinedByMonth = useCallback((s: any): boolean => {
    const jd = s?.joining_date ? String(s.joining_date).slice(0, 10) : '';
    if (!jd) return true; // unknown joining date → always include (legacy data)
    return jd <= monthEndDate;
  }, [monthEndDate]);
  // Inactive (resigned/left) staff should still appear in the months where a
  // salary record already exists, but never in future months after resignation.
  // In the month they resigned, they MUST appear so their final salary up to resign date can be processed.
  const isInMonthRoster = useCallback((s: any): boolean => {
    if (!hasJoinedByMonth(s)) return false;
    const rd = getResignDate(s?.id);
    if (rd) {
      const resignMonth = rd.slice(0, 7);
      // Strictly after the resign month: only show if salary record already exists (history)
      if (monthYear > resignMonth) {
        return salaryRecords.some((r: any) => r.staff_id === s.id);
      }
      // In the resign month: include so salary can be generated up to the resign date
      return true;
    }
    // Inactive staff with no known resign date: only show if record exists
    if (s?.status === 'inactive' || s?.status === 'resigned') {
      return salaryRecords.some((r: any) => r.staff_id === s.id);
    }
    return true;
  }, [hasJoinedByMonth, getResignDate, monthYear, salaryRecords]);
  // First day this staff is counted within the selected month (joining date if
  // they joined mid-month, otherwise the 1st).
  const joinedFromDay = (s: any): number => {
    const jd = s?.joining_date ? String(s.joining_date).slice(0, 10) : '';
    if (!jd) return 1;
    if (jd <= `${monthYear}-01`) return 1;
    if (jd > monthEndDate) return 32; // hasn't joined this month at all
    return Number(jd.slice(8, 10)) || 1;
  };
  // Last day this staff is counted within the selected month (resign date if
  // they resigned mid-month, otherwise the month's last counted day). Days
  // AFTER the resign date earn nothing — pay is prorated up to resign_date.
  const resignedUntilDay = (s: any): number => {
    const rd = getResignDate(s?.id);
    if (!rd) return 32; // no resignation → counted through month end
    const resignMonth = rd.slice(0, 7);
    if (resignMonth < monthYear) return 0; // resigned before this month started
    if (resignMonth > monthYear) return 32; // resigns in a later month
    // Resigned in this month: count strictly up to the day of resignation!
    return Number(rd.slice(8, 10)) || 32;
  };

  // Effective base salary for the SELECTED month.
  // A salary change applies only from its effective month onward; months BEFORE
  // the effective date keep the old (pre-change) salary, so a raise effective
  // June 1 does NOT inflate May's salary.
  const getEffectiveSalary = (staffMember: any): number => {
    const current = Number(staffMember?.salary) || 0;
    const changes = (salaryChanges as any[]).filter((c) => c.staff_id === staffMember?.id);
    if (changes.length === 0) return current;
    // monthYear = "YYYY-MM"; compare against effective month "YYYY-MM".
    // Find the latest change whose effective month is <= selected month.
    let effective: number | null = null;
    for (const c of changes) {
      const effMonth = String(c.effective_date).slice(0, 7);
      if (effMonth <= monthYear) {
        effective = Number(c.new_salary);
      } else {
        // This change is in the future relative to the selected month.
        // The salary for the selected month is the old_salary of the earliest future change.
        if (effective === null) effective = Number(c.old_salary);
        break;
      }
    }
    return effective === null ? current : effective;
  };


  // Calculate attendance stats with per-minute tracking
  const getAttendanceStats = (staffMember: any) => {
    const resignLastDay = resignedUntilDay(staffMember);
    const firstCountedDay = joinedFromDay(staffMember);

    // Main attendance only (exclude morning/evening duty shifts which are handled separately as overtime)
    // AND strictly exclude any attendance dated AFTER resignation date or BEFORE joining date
    // Match by staff ID OR any linked duplicate ID of the same person
    const personNormName = (staffMember?.name_bn || '')
      .replace(/[:ঃ\.,\-\(\)]/g, ' ')
      .replace(/\b(মাওলানা|মুয়াল্লিম|মুআল্লিম|হাফেজ|হাফিজ|মাষ্টার|মাস্টার|জনাব|মোঃ|মো|মুহাদ্দিস|মুফতি)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const relatedStaffIds = new Set<string>();
    if (staffMember?.id) relatedStaffIds.add(staffMember.id);
    if (personNormName && Array.isArray(staffRaw)) {
      staffRaw.forEach((s: any) => {
        const sNorm = (s?.name_bn || '')
          .replace(/[:ঃ\.,\-\(\)]/g, ' ')
          .replace(/\b(মাওলানা|মুয়াল্লিম|মুআল্লিম|হাফেজ|হাফিজ|মাষ্টার|মাস্টার|জনাব|মোঃ|মো|মুহাদ্দিস|মুফতি)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        if (sNorm && sNorm === personNormName && s?.id) relatedStaffIds.add(s.id);
      });
    }

    const rawRecords = attendanceData.filter((a: any) => {
      if (!relatedStaffIds.has(a.entity_id)) return false;
      if (a.shift === 'morning' || a.shift === 'evening') return false;
      const dayNum = Number(String(a.attendance_date).slice(8, 10));
      if (dayNum > resignLastDay) return false;
      if (dayNum < firstCountedDay) return false;
      return true;
    });
    // Deduplicate: একই দিনের একাধিক রেকর্ড থাকলে অ্যাডমিন-নির্ধারিত নিয়ম (নতুন/পুরোনো) অনুযায়ী একটিই গণনা হবে।
    const records = dedupeAttendanceRecords(
      rawRecords as any[],
      duplicateRule,
      (r: any) => r.attendance_date,
    ).sort((a: any, b: any) => a.attendance_date.localeCompare(b.attendance_date));

    // Treat absent records on paid holidays as paid leave (no deduction)
    // ছুটি (leave) = পূর্ণ দিনের বেতন, তাই উপস্থিতের সাথে গণনা হয় (অর্থাৎ ফুল ডে/উপস্থিত)।
    // উপস্থিত দিন কখনো মাসের প্রকৃত দিনসংখ্যার বেশি গণনা হবে না (অতিরিক্ত দিন বাদ)।
    const [presYy, presMm] = monthYear.split('-').map(Number);
    const daysInMonthForPresent = Math.min(new Date(presYy, presMm, 0).getDate(), 30);
    let present = 0;
    const recordedAbsent = records.filter((r: any) => r.status === 'absent' && !paidHolidaySet.has(r.attendance_date)).length;
    let late = 0;
    const halfDay = records.filter((r: any) => r.status === 'half_day').length;
    const leave = records.filter((r: any) => r.status === 'leave').length;
    const holidayCovered = records.filter((r: any) => r.status === 'absent' && paidHolidaySet.has(r.attendance_date)).length;

    const dutyInfo = getDutyTimeWithSource(staffMember);
    const dutyTime = { start: dutyInfo.start, end: dutyInfo.end };
    const fallbackDutyTime = (() => {
      const catKey = staffMember?.staff_category;
      const categoryTime = catKey ? (categoryShiftTimes as any)[catKey] : null;
      return categoryTime?.start && categoryTime?.end
        ? { start: categoryTime.start, end: categoryTime.end }
        : { start: '08:00', end: '17:00' };
    })();
    const dutyStart = timeToMinutes(dutyTime.start);
    let dutyEnd = timeToMinutes(dutyTime.end);
    const dutyEndClock = timeToMinutes(dutyTime.end);
    const isOvernight = dutyEnd <= dutyStart;
    if (isOvernight) dutyEnd += 24 * 60; // shift end into next day
    const scheduledMinutesPerDay = dutyEnd - dutyStart;

    let totalLateArrivalMinutes = 0;
    let totalEarlyExitMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalLateArrivalDeduction = 0;
    let totalEarlyExitDeduction = 0;

    const dailyBreakdown: Array<{
      date: string; status: string; checkIn: string; checkOut: string;
      lateMin: number; earlyMin: number; overtimeMin: number;
      deduction: number; addition: number; dailyEarning: number;
      lateDeduction?: number; earlyDeduction?: number;
    }> = [];

    const baseSalary = getEffectiveSalary(staffMember);
    // দৈনিক হার = মাসিক বেতন ÷ ৩০ (সর্বোচ্চ)। ৩১ দিনের মাস ৩০ দিন ধরা হয়;
    // ফেব্রুয়ারি (২৮/২৯) প্রকৃত দিনে থাকে যাতে পূর্ণ হাজিরায় পূর্ণ বেতন হয়।
    const [statYy, statMm] = monthYear.split('-').map(Number);
    const daysInSelectedMonth = Math.min(new Date(statYy, statMm, 0).getDate(), 30);
    const dailyRate = baseSalary / daysInSelectedMonth;
    const perMinuteRate = scheduledMinutesPerDay > 0 ? dailyRate / scheduledMinutesPerDay : 0;

    let totalDailyEarnings = 0;

    records.forEach((r: any) => {
      const entry: any = {
        date: r.attendance_date, status: r.status,
        checkIn: r.check_in_time || '', checkOut: r.check_out_time || '',
        lateMin: 0, earlyMin: 0, overtimeMin: 0, deduction: 0, addition: 0, dailyEarning: 0,
      };

      if (r.status === 'absent') {
        // If this absent date is a paid holiday, treat as paid (no deduction)
        if (paidHolidaySet.has(r.attendance_date)) {
          entry.status = 'holiday';
          entry.dailyEarning = Math.round(dailyRate);
          // Accumulate UNROUNDED so full attendance sums to exactly the base
          // salary (per-day rounding was silently dropping a few taka).
          totalDailyEarnings += dailyRate;
          dailyBreakdown.push(entry);
          return;
        }
        entry.deduction = Math.round(dailyRate);
        entry.dailyEarning = 0;
        dailyBreakdown.push(entry);
        return;
      }
      
      if (r.status === 'leave' || r.status === 'excused') {
        // ছুটি / অনুমতিপ্রাপ্ত উপস্থিতি (excused) = বেতনসহ পূর্ণ দিন। কোনো কর্তন নয়।
        // তবে UI/রিপোর্টে "উপস্থিত" ও "ছুটি" আলাদা কলাম, তাই leave-কে present কাউন্টে
        // যোগ করা যাবে না — নাহলে জুনের মতো মাসে present+leave দ্বিগুণ দেখায়।
        entry.dailyEarning = Math.round(dailyRate);
        totalDailyEarnings += dailyRate;
        dailyBreakdown.push(entry);
        return;
      }

      if (r.status === 'half_day') {
        // অর্ধদিন (Half Day): দিন গণনায় এটি উপস্থিতির অংশ (উপস্থিতি +১), কিন্তু দৈনিক বেতনের ৫০% প্রাপ্য এবং ৫০% কর্তন।
        // একই দিনের জন্য আলাদা করে লেইট বা আগাম বের হওয়ার মিনিট কর্তন দ্বৈত (ডাবল) হবে না।
        entry.dailyEarning = Math.round(dailyRate / 2);
        entry.deduction = Math.round(dailyRate / 2);
        totalDailyEarnings += dailyRate / 2;
        present += 1;
        dailyBreakdown.push(entry);
        return;
      }

      const baseDayRaw = dailyRate;
      entry.dailyEarning = Math.round(dailyRate);


      // Map a clock time (minutes from midnight) onto the duty window timeline.
      // Day shift  (e.g. 09:00–17:00): timeline = [dutyStart .. dutyEnd], same-day.
      // Night shift (e.g. 17:00–05:00): timeline = [dutyStart .. dutyEnd+1440].
      //   - Times >= dutyStart    → same-day evening segment (as-is)
      //   - Times <= dutyEndClock → next-day morning segment (+1440)
      //   - Otherwise (e.g. 08:00) → outside shift window; clamp to nearest edge.
      const mapToTimeline = (clockMin: number): number => {
        if (!isOvernight) return clockMin;
        if (clockMin >= dutyStart) return clockMin;
        if (clockMin <= dutyEndClock) return clockMin + 24 * 60;
        // Outside the night-shift window — pick whichever edge is closer
        const distToStart = dutyStart - clockMin;
        const distToEnd = (clockMin + 24 * 60) - dutyEnd;
        return distToStart <= distToEnd ? dutyStart : dutyEnd;
      };

      // বারভিত্তিক বিশেষ শিফট / অর্ধদিন:
      // ডিপার্টমেন্টভিত্তিক বিশেষ শিফট সেটিংস (categoryShiftTimes[catKey]?.specialDay) আগে দেখা হয়।
      // না থাকলে fallback হিসেবে পুরনো thursday_half_day_education সেটিংস কাজ করবে।
      const catKey = staffMember?.staff_category;
      const deptSpecial = catKey ? (categoryShiftTimes as any)?.[catKey]?.specialDay : null;
      const thuHalfSetting = getSetting('thursday_half_day_education');
      const effectiveSpecialSetting = (deptSpecial && deptSpecial.enabled)
        ? {
            enabled: true,
            categories: [catKey],
            days: deptSpecial.days || (deptSpecial.daySchedules ? Object.keys(deptSpecial.daySchedules).map(Number) : [4]),
            start_time: deptSpecial.start || null,
            end_time: deptSpecial.end || '14:00',
            deduction_rate_mode: deptSpecial.rateMode || 'regular_duty_rate',
            daySchedules: deptSpecial.daySchedules || null,
          }
        : thuHalfSetting;

      const dayOfWeek = new Date(r.attendance_date + 'T00:00:00').getDay();
      const daySched = getScheduleForDay(effectiveSpecialSetting, dayOfWeek);

      const hasPersonalDuty = !!(staffMember?.duty_start_time && staffMember?.duty_end_time) || dutyInfo.source === 'special' || dutyInfo.source === 'staff';
      const applyThuHalf = !hasPersonalDuty && shouldApplyThursdayHalfDay({
        setting: effectiveSpecialSetting,
        staffCategory: catKey,
        attendanceDate: r.attendance_date,
        isOvernight,
      });
      const { effDutyStart, effDutyEnd, effScheduledMinutes } = effectiveDutyEndForThursday({
        applies: applyThuHalf,
        dutyStart,
        dutyEnd,
        startMinutes: parseClockMinutes(daySched?.start ?? (effectiveSpecialSetting as any)?.start_time) ?? undefined,
        endMinutes: parseHalfDayEndMinutes(daySched?.end ?? (effectiveSpecialSetting as any)?.end_time),
      });
      // মিনিট কর্তনের হার নির্ধারণ:
      // সেটিংসে 'special_day_rate' সিলেক্ট থাকলে বিশেষ দিনের মোট মিনিট দিয়ে ভাগ হবে (dailyRate / effScheduledMinutes)।
      // অন্যথায় (ডিফল্ট) ডিপার্টমেন্টের নিয়মিত ডিউটি রেটে (perMinuteRate) কর্তন হবে।
      const rateMode = daySched ? daySched.rateMode : getSpecialDayDeductionRateMode(effectiveSpecialSetting);
      const effPerMinuteRate = (applyThuHalf && rateMode === 'special_day_rate' && effScheduledMinutes > 0)
        ? dailyRate / effScheduledMinutes
        : perMinuteRate;

      const checkIn = r.check_in_time ? mapToTimeline(timeToMinutes(r.check_in_time)) : effDutyStart;
      let checkOutRaw = r.check_out_time ? timeToMinutes(r.check_out_time) : effDutyEnd;
      // Smart 12h AM/PM resolution: if daytime shift ends in afternoon (>=12:00 PM),
      // and check-out was entered as e.g. 03:30 (AM), treat as 15:30 (PM)
      if (!isOvernight && effDutyEnd >= 12 * 60 && checkOutRaw < 12 * 60 && Math.abs((checkOutRaw + 12 * 60) - effDutyEnd) < Math.abs(checkOutRaw - effDutyEnd)) {
        checkOutRaw += 12 * 60;
      }
      const checkOut = r.check_out_time ? mapToTimeline(checkOutRaw) : effDutyEnd;

      const lateMinutes = Math.max(0, checkIn - effDutyStart);
      const earlyExitMinutes = Math.max(0, effDutyEnd - checkOut);
      // ওভারটাইম: শুধুমাত্র স্বাভাবিক পূর্ণ ডিউটি শেষ সময় (dutyEnd) অতিক্রম করলে এবং স্বয়ংক্রিয় ওভারটাইম অন থাকলে ওভারটাইম হবে।
      // বৃহস্পতিবার ২টায় আগে বের হওয়ার ছাড় দেওয়া হলেও ৩:৩০ পর্যন্ত স্বাভাবিক সময় — তাই ২টা থেকে ৩:৩০ কোনো ওভারটাইম নয়।
      const autoOvertimeEnabled = getSetting('auto_overtime_pay')?.enabled === true;
      const regularDutyEnd = isOvernight ? dutyEnd : Math.max(dutyEnd, effDutyEnd);
      const overtimeMinutes = autoOvertimeEnabled ? Math.max(0, checkOut - regularDutyEnd) : 0;

      // Missed-time days must come from the real time as well as manual status.
      // Example: status stays "present" but check-in is late OR check-out is early
      // => count it in the late/early bucket and apply the minute deduction.
      // Example: user clicked "late" but did not adjust time yet => keep late day visible.
      // বিলম্ব দিন হিসেবে গণনা হবে শুধুমাত্র যদি অ্যাডমিন বা হাজিরাতে স্ট্যাটাস 'late' দেওয়া থাকে।
      // সাধারণ উপস্থিতিতে সামান্য মিনিট পার্থক্য থাকলে মিনিট কর্তন প্রযোজ্য হতে পারে কিন্তু উপস্থিতির স্ট্যাটাস বিলম্ব হবে না।
      const isExplicitLate = r.status === 'late';
      if (isExplicitLate) late += 1;
      if (r.status === 'present' || isExplicitLate) present += 1;

      totalLateArrivalMinutes += lateMinutes;
      totalEarlyExitMinutes += earlyExitMinutes;
      totalOvertimeMinutes += overtimeMinutes;

      entry.lateMin = lateMinutes;
      entry.earlyMin = earlyExitMinutes;
      entry.overtimeMin = overtimeMinutes;
      
      const lateDeductionRaw = lateMinutes * effPerMinuteRate;
      const earlyDeductionRaw = earlyExitMinutes * effPerMinuteRate;
      totalLateArrivalDeduction += lateDeductionRaw;
      totalEarlyExitDeduction += earlyDeductionRaw;

      const timeDeduction = Math.round(lateDeductionRaw + earlyDeductionRaw);
      entry.deduction += timeDeduction;
      entry.lateDeduction = Math.round(lateDeductionRaw);
      entry.earlyDeduction = Math.round(earlyDeductionRaw);
      entry.dailyEarning = Math.max(0, entry.dailyEarning - timeDeduction);
      
      // স্বয়ংক্রিয় ওভারটাইম টাকা গণনা সেটিংস (ডিফল্ট: বন্ধ/false — শুধু সময় প্রদর্শিত হবে, টাকা নয়)
      const overtimeAdditionRaw = autoOvertimeEnabled ? overtimeMinutes * effPerMinuteRate : 0;
      entry.addition = Math.round(overtimeAdditionRaw);
      entry.dailyEarning += entry.addition;

      // Accumulate the UNROUNDED daily earning to avoid cumulative rounding drift.
      const rawEarn = Math.max(
        0,
        baseDayRaw - (lateMinutes + earlyExitMinutes) * effPerMinuteRate + overtimeAdditionRaw,
      );
      totalDailyEarnings += rawEarn;

      dailyBreakdown.push(entry);
    });

    present = Math.min(present, daysInMonthForPresent);
    const totalMissedMinutes = totalLateArrivalMinutes + totalEarlyExitMinutes;

    // হাজিরা পেজ অনুযায়ীই কেবল বেতন নির্ধারিত হবে।
    // কোনো কাল্পনিক দিন বা অনুপস্থিত ছুটির দিন অতিরিক্ত যোগ হবে না।
    const recordedDates = new Set(records.map((r: any) => r.attendance_date));
    let untouchedHolidayDays = 0;

    // যে দিনগুলোতে কোনো হাজিরা রেকর্ড নেই (সাপ্তাহিক ছুটি/সরকারি ছুটি বাদে),
    // default হিসেবে সেগুলো অনুপস্থিত ধরা হবে — যাতে হাজিরা না দিলে মূল বেতন
    // নিট বেতনে না চলে আসে। Admin চাইলে setting ON করে পুরোনো paid-unmarked আচরণ নিতে পারবেন।
    // Days BEFORE the staff's joining date are tracked separately (preJoinDays)
    // so pay is prorated from joining. For the CURRENT month only days up to today count.
    const [yy, mm] = monthYear.split('-').map(Number);
    // ৩১ দিনের মাস ৩০ দিন ধরা হয় — ৩১তারিখ বেতন হিসাবের বাইরে।
    const lastDay = Math.min(new Date(yy, mm, 0).getDate(), 30);
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === yy && (now.getMonth() + 1) === mm;
    const isFutureMonth = (yy > now.getFullYear()) || (yy === now.getFullYear() && mm > (now.getMonth() + 1));
    // যেকোনো মাসের জন্যই সার্বজনীন নিয়ম:
    // ১. ভবিষ্যৎ মাসের ক্ষেত্রে কোনো দিনই অচিহ্নিত হিসেবে গণনা হবে না (lastCountedDay = 0)।
    // ২. চলতি মাসের ক্ষেত্রে আজকের চলমান দিন বা ভবিষ্যতের কোনো দিনকে অচিহ্নিত বা অনুপস্থিত গণ্য করা হবে না (lastCountedDay = গতকাল পর্যন্ত)।
    // ৩. বিগত মাসের ক্ষেত্রে পুরো মাসের দিনগুলো দেখা হবে।
    // এবং যেকোনো মাস বা তারিখের জন্য: অচিহ্নিত কোনো দিন কখনোই অনুপস্থিত বা কর্তন হবে না (absent = recordedAbsent)।
    const lastCountedDay = isFutureMonth
      ? 0
      : (isCurrentMonth ? Math.max(0, Math.min(lastDay, now.getDate() - 1)) : lastDay);
    let untrackedPaidDays = 0;
    let preJoinDays = 0;
    let postResignDays = 0;
    for (let d = 1; d <= lastDay; d++) {
      if (d < firstCountedDay) { preJoinDays += 1; continue; }
      if (d > resignLastDay) { postResignDays += 1; continue; } // after resign date
      if (d > lastCountedDay) continue; // future day of ongoing month
      const dateStr = `${monthYear}-${String(d).padStart(2, '0')}`;
      if (recordedDates.has(dateStr)) continue;
      if (paidHolidaySet.has(dateStr)) continue;
      untrackedPaidDays += 1;
    }
    // যে দিনগুলোতে কোনো হাজিরা রেকর্ড নেই (অচিহ্নিত দিন বা চলতি মাসের বাকি দিন):
    // কোনো অবস্থাতেই অচিহ্নিত দিনকে অনুপস্থিত গণ্য করা হবে না।
    // শুধুমাত্র অ্যাডমিন সুস্পষ্টভাবে 'absent' মার্ক করলেই অনুপস্থিতি গণনা ও কর্তন হবে।
    const untrackedUnmarkedDays = untrackedPaidDays;
    const absent = recordedAbsent;
    const regularPresent = Math.max(0, present - late - halfDay);

    return {
      present, regularPresent, absent, late, halfDay, leave, holidayCovered, untouchedHolidayDays,
      untrackedAbsentDays: untrackedUnmarkedDays, untrackedPaidDays, recordedAbsent, preJoinDays, postResignDays, firstCountedDay,
      total: records.length,
      totalLateArrivalMinutes, totalEarlyExitMinutes, totalMissedMinutes, totalOvertimeMinutes,
      totalLateArrivalDeduction, totalEarlyExitDeduction,
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
    const baseSalary = getEffectiveSalary(staffMember);
    const attStats = getAttendanceStats(staffMember);

    const year = Number(selectedYear);
    const month = Number(selectedMonth);
    // কর্মদিবস সর্বোচ্চ ৩০ — ৩১ দিনের মাস ৩০ দিন ধরা হয়।
    const daysInMonth = Math.min(new Date(year, month, 0).getDate(), 30);
    // Pre-joining days are excluded from this month's working days so a mid-month
    // joiner is paid only from the joining date onward.
    const preJoinDays = attStats.preJoinDays || 0;
    const postResignDays = attStats.postResignDays || 0;
    // Days after the resign date are excluded too — a mid-month resignee is
    // paid only up to the resign date.
    const workingDays = Math.max(0, daysInMonth - preJoinDays - postResignDays);

    const bonus = 0;
    const otherAllowance = 0;
    const advanceDeduction = 0;

    // Subtractive model: পূর্ণ মাসিক বেতন থেকে অনুপস্থিতি/দেরি/হাফ-ডে কাটা হয়।
    // এতে সাপ্তাহিক ছুটি/সরকারি ছুটি (যেদিন কোনো রেকর্ড নেই) স্বয়ংক্রিয়ভাবে বেতনসহ ছুটি হিসেবে গণ্য হয়।
    const absenceDeduction = Math.round(attStats.absent * attStats.dailyRate);
    const lateDeduction = Math.round(
      Number(attStats.totalLateArrivalDeduction || 0) + Number(attStats.totalEarlyExitDeduction || 0)
    );
    const otherDeduction = Math.round(attStats.halfDay * (attStats.dailyRate / 2));
    // Proration for the joining month: deduct the value of days before joining.
    const preJoinDeduction = Math.round(preJoinDays * attStats.dailyRate);
    // Proration for the resign month: deduct the value of days after resigning.
    const postResignDeduction = Math.round(postResignDays * attStats.dailyRate);

    // Calculation basis toggle: 'subtractive' (default — পূর্ণ মাসিক বেতন − কর্তন; ছুটির দিনসহ)
    // অথবা 'additive' (শুধু উপস্থিত দিনের আয় যোগ; ছুটির দিনে বেতন নেই)
    const calcBasis = getSetting('salary_calc_basis')?.mode || 'subtractive';
    // দৈনিক হার = মাসিক বেতন ÷ ৩০। তাই ৩১ দিনের মাসে পূর্ণ হাজিরায় আয় ৩১/৩০ গুণ হয়ে
    // মাসিক বেতনের বেশি হয়ে যেত। মাসের সর্বোচ্চ কার্যদিবস ৩০ ধরে হাজিরাভিত্তিক আয়
    // মাসিক বেতনে সীমাবদ্ধ রাখা হয় (ওভারটাইম আলাদাভাবে যোগ হয়)।
    const autoOvertimeEnabled = getSetting('auto_overtime_pay')?.enabled === true;
    const includedOvertime = autoOvertimeEnabled
      ? Math.round(attStats.totalOvertimeMinutes * attStats.perMinuteRate)
      : 0;
    const attendanceEarningsWithoutOvertime = Math.max(0, Math.round(attStats.totalDailyEarnings) - includedOvertime);
    // Prorate maximum base salary for the month up to the resignation date / joining date
    const maxPayableBaseSalary = Math.round(baseSalary * (Math.max(0, workingDays) / daysInMonth));
    let earnedFromAttendance = calcBasis === 'additive'
      ? Math.min(maxPayableBaseSalary, attendanceEarningsWithoutOvertime)
      : Math.max(0, baseSalary - absenceDeduction - lateDeduction - otherDeduction - preJoinDeduction - postResignDeduction);
    let overtime = includedOvertime;

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

    // Overtime সবসময় আলাদা লাইন আইটেম হিসেবে যোগ হয়।
    // earned_from_attendance এ overtime অন্তর্ভুক্ত নয়, ফলে স্লিপ/শিটে double-count হওয়ার সুযোগ নেই।

    // Get savings deduction for this month
    const activeSavings = getActiveSavings(staffMember.id);
    const savingsDeduction = activeSavings ? activeSavings.amount : 0;

    const overtimeForNet = overtime;

    // জমা কর্তন ও অন্যান্য কর্তন (অগ্রিম) কেবল তখনই নিট বেতন থেকে বাদ যাবে যখন
    // মাসের সম্পূর্ণ হাজিরা দেওয়া হয়ে গেছে (অথবা মাসটি শেষ)। চলতি মাসে হাজিরা
    // অসম্পূর্ণ থাকলে এই কর্তনগুলো স্থগিত থাকে — বেতন জেনারেট/সেভ করার পর প্রযোজ্য হবে।
    const nowRef = new Date();
    const isCurrentMonthCalc = nowRef.getFullYear() === year && (nowRef.getMonth() + 1) === month;
    const allAttendanceGiven = !isCurrentMonthCalc || (attStats.untrackedAbsentDays === 0);
    const effAdvanceDeduction = allAttendanceGiven ? advanceDeduction : 0;
    const effSavingsDeduction = allAttendanceGiven ? savingsDeduction : 0;

    // আবাসিক ডিউটি কর্তন — রোস্টার অনুযায়ী অনুপস্থিত/বিলম্ব শিফটের জন্য।
    // এটি ঠিক একবারই নিট থেকে বাদ যায় এবং আলাদা ফিল্ড হিসেবে সংরক্ষিত হয়।
    const dutyDeduction = Math.round(getDutyDeduction(staffMember.id).total);

    const netSalary = Math.max(0,
      earnedFromAttendance + overtimeForNet + bonus + otherAllowance
      - effAdvanceDeduction - effSavingsDeduction - dutyDeduction
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
      duty_deduction: dutyDeduction,
      bonus,
      overtime,
      other_allowance: otherAllowance,
      advance_deduction: effAdvanceDeduction,
      savings_deduction: effSavingsDeduction,
      net_salary: netSalary,
      calc_basis: calcBasis,
      earned_from_attendance: earnedFromAttendance,
      overtime_for_net: overtimeForNet,
      deductions_deferred: !allAttendanceGiven,
    };
  };


  // Generate salary sheet mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const requireAttendance = getSetting('require_attendance')?.enabled !== false;
      const skippedNames: string[] = [];
      const errorList: { name: string; reasons: string[] }[] = [];
      const newRecords: any[] = [];
      const updateRecords: any[] = [];

      for (const s of staff) {
        const existing = salaryRecords.find((r: any) => r.staff_id === s.id);
        const sName = s.name_bn || s.name_en || 'Unknown';

        // Skip staff who had not joined by this month (don't generate for past months).
        if (!hasJoinedByMonth(s)) continue;
        // Skip staff who resigned before this month started.
        if (isResignedBeforeMonth(s.id, monthYear) && !existing) continue;
        const isResignMonth = isResignedInMonth(s.id, monthYear);
        if (s.status === 'inactive' && !isResignMonth && !existing) continue;



        // Hard validation — skip on any error (don't generate corrupt data)
        const v = getAttendanceValidation(s);
        if (v.hasErrors) {
          errorList.push({ name: sName, reasons: v.errors });
          await logSalaryGeneration({
            staff_id: s.id, staff_name: sName, action: 'bulk_generate', source: 'bulk',
            success: false, reason: v.errors.join(' • '),
          });
          continue;
        }

        if (requireAttendance) {
          const hasAttendance = attendanceData.some((a: any) => a.entity_id === s.id);
          if (!hasAttendance) {
            skippedNames.push(sName);
            await logSalaryGeneration({
              staff_id: s.id, staff_name: sName, action: 'bulk_generate', source: 'bulk',
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

      if (errorList.length > 0) {
        toast.error(
          bn
            ? `${toBnDigits(errorList.length)} জনের ডেটা ভুল — বেতন তৈরি বন্ধ`
            : `${errorList.length} staff have invalid attendance data — salary skipped`,
          {
            description: errorList.slice(0, 4).map(e => `• ${e.name}: ${e.reasons[0]}`).join('\n')
              + (errorList.length > 4 ? (bn ? `\n…আরও ${toBnDigits(errorList.length - 4)} জন` : `\n…and ${errorList.length - 4} more`) : ''),
            duration: 9000,
          }
        );
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
        // Use shared helper — guarded by src/lib/__tests__/salaryNet.test.ts
        // against the savings/advance double-deduction regression.
        const netSalary = recomputeNetSalary(
          { net_salary: updateData.net_salary, savings_deduction: updateData.savings_deduction },
          {
            overtime: updateData.overtime_for_net,
            bonus: updateData.bonus,
            other_allowance: updateData.other_allowance,
            advance_deduction: updateData.advance_deduction,
            savings_deduction: savingsDed,
          },
        );
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
      const activeSavings = getActiveSavings(record.staff_id);
      const savingsDed = activeSavings ? activeSavings.amount : 0;
      const num = (v: any) => Number(v || 0);
      const dutyDed = num(record.duty_deduction ?? getDutyDeduction(record.staff_id).total);
      const netSalary = computeManualOverrideNet({
        base_salary: record.base_salary, bonus: record.bonus, overtime: record.overtime,
        other_allowance: record.other_allowance, late_deduction: record.late_deduction,
        absence_deduction: record.absence_deduction, advance_deduction: record.advance_deduction,
        other_deduction: record.other_deduction, savings_deduction: savingsDed, duty_deduction: dutyDed,
      });
      // Whitelist only real columns — the dialog can be seeded from a live
      // display snapshot that carries extra computed fields.
      const payload: Record<string, any> = {
        base_salary: num(record.base_salary),
        bonus: num(record.bonus),
        overtime: num(record.overtime),
        overtime_for_net: num(record.overtime),
        overtime_reason: record.overtime_reason ?? null,
        other_allowance: num(record.other_allowance),
        other_allowance_note: record.other_allowance_note ?? null,
        late_deduction: num(record.late_deduction),
        absence_deduction: num(record.absence_deduction),
        advance_deduction: num(record.advance_deduction),
        other_deduction: num(record.other_deduction),
        other_deduction_note: record.other_deduction_note ?? null,
        duty_deduction: dutyDed,
        savings_deduction: savingsDed,
        earned_from_attendance: num(record.base_salary),
        working_days: record.working_days ?? null,
        present_days: record.present_days ?? null,
        absent_days: record.absent_days ?? null,
        late_days: record.late_days ?? null,
        remarks: record.remarks ?? null,
        manual_override: true,
        net_salary: netSalary,
        updated_at: new Date().toISOString(),
      };
      if (await checkApproval('edit', { ...payload, staff_id: record.staff_id, month_year: record.month_year }, record.id, `বেতন সংশোধন: ${record.staff_id} (${record.month_year})`)) return;
      const { error } = await supabase.from('salary_records').update(payload).eq('id', record.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      setEditDialog(null);
      toast.success(bn ? 'আপডেট হয়েছে' : 'Updated');
    },
  });

  // Mark as paid + optional expense creation
  const markPaidMutation = useMutation({
    mutationFn: async (arg: string | { id: string; addToExpense?: boolean }) => {
      const id = typeof arg === 'string' ? arg : arg.id;
      const addToExpense = typeof arg === 'object' && arg.addToExpense !== undefined ? arg.addToExpense : true;
      const record = salaryRecords.find((r: any) => r.id === id);
      if (!record) throw new Error('Record not found');
      const staffMember = staff.find((s: any) => s.id === record.staff_id);
      const payableRecord = staffMember ? getSalaryDisplaySnapshot(staffMember, record).record : record;

      const { error } = await supabase.from('salary_records')
        .update({
          base_salary: payableRecord.base_salary,
          working_days: payableRecord.working_days,
          present_days: payableRecord.present_days,
          absent_days: payableRecord.absent_days,
          late_days: payableRecord.late_days,
          absence_deduction: payableRecord.absence_deduction,
          late_deduction: payableRecord.late_deduction,
          other_deduction: payableRecord.other_deduction,
          overtime: payableRecord.overtime,
          overtime_reason: payableRecord.overtime_reason,
          bonus: payableRecord.bonus,
          other_allowance: payableRecord.other_allowance,
          advance_deduction: payableRecord.advance_deduction,
          savings_deduction: payableRecord.savings_deduction,
          net_salary: payableRecord.net_salary,
          calc_basis: payableRecord.calc_basis,
          earned_from_attendance: payableRecord.earned_from_attendance,
          overtime_for_net: payableRecord.overtime_for_net,
          deductions_deferred: payableRecord.deductions_deferred,
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      if (addToExpense) {
        const expenseConfig = getSetting('expense_location');
        const projectId = expenseConfig?.institution_id;
        const categoryId = expenseConfig?.category_id;

        if (projectId && categoryId) {
          const monthName = MONTHS.find(m => m.value === selectedMonth);
          const staffName = staffMember?.name_bn || staffMember?.name_en || 'Staff';
          const description = `${bn ? 'বেতন' : 'Salary'}: ${staffName} - ${bn ? monthName?.bn : monthName?.en} ${selectedYear} [staff_id:${staffMember?.id}]`;

          const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
          const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const pdfUrl = supabaseUrl
            ? `${supabaseUrl}/functions/v1/salary-pdf`
            : (projectRef ? `https://${projectRef}.supabase.co/functions/v1/salary-pdf` : null);

          // বেতন যে তারিখে ও মাসে পরিশোধ হয়েছে, খরচের লেজারে সেই পরিশোধের চলতি মাসেই (payment date month) রেকর্ড হবে
          const paymentDate = record.payment_date || toIsoDateInTz(new Date(), appTz);
          const paymentMonthYear = getExpenseMonthYearFromDate(paymentDate);
          const salaryMonthTag = ` [salary_month:${record.month_year || monthYear}] [unit:মাস]`;
          const finalDesc = description.includes('[salary_month:') ? description : `${description}${salaryMonthTag}`;
          const targetSalaryMonth = record.month_year || monthYear;

          // ডুপ্লিকেট এন্ট্রি রোধ: উক্ত শিক্ষক ও মাসের জন্য ইতিমধ্যে কোনো খরচ এন্ট্রি আছে কিনা চেক করা
          const { data: existingExp } = await supabase
            .from('expenses')
            .select('id')
            .ilike('description', `%[staff_id:${staffMember?.id}]%`)
            .ilike('description', `%[salary_month:${targetSalaryMonth}]%`)
            .is('deleted_at', null)
            .maybeSingle();

          if (existingExp?.id) {
            const { error: expError } = await supabase.from('expenses').update({
              institution_id: projectId,
              category_id: categoryId,
              month_year: paymentMonthYear,
              expense_date: paymentDate,
              amount: Number(payableRecord.net_salary),
              quantity: 1,
              description: finalDesc,
              has_receipt: true,
              receipt_url: pdfUrl,
            }).eq('id', existingExp.id);
            if (expError) {
              console.error('Expense update error:', expError);
              toast.warning(bn ? 'বেতন পরিশোধিত হয়েছে কিন্তু হিসাব আপডেট হয়নি' : 'Marked paid but expense update failed');
              return;
            }
          } else {
            const { error: expError } = await supabase.from('expenses').insert({
              institution_id: projectId,
              category_id: categoryId,
              month_year: paymentMonthYear,
              expense_date: paymentDate,
              amount: Number(payableRecord.net_salary),
              quantity: 1,
              description: finalDesc,
              has_receipt: true,
              receipt_url: pdfUrl,
            });
            if (expError) {
              console.error('Expense creation error:', expError);
              toast.warning(bn ? 'বেতন পরিশোধিত হয়েছে কিন্তু হিসাবে সেভ হয়নি' : 'Marked paid but expense save failed');
              return;
            }
          }
        }
      }
    },
    onSuccess: (_, arg) => {
      const added = typeof arg === 'object' && arg.addToExpense !== undefined ? arg.addToExpense : true;
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-expenses-for-month', expenseMonthYear] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all_expenses'] });
      if (added) {
        toast.success(bn ? 'পরিশোধিত ও হিসাবে সেভ হয়েছে' : 'Marked as paid & saved to expenses');
      } else {
        toast.success(bn ? 'বেতন পরিশোধিত হয়েছে (হিসাবে যোগ করা হয়নি)' : 'Marked as paid (not added to expenses)');
      }
    },
  });

  // Add single paid staff to expenses
  const addStaffExpenseMutation = useMutation({
    mutationFn: async ({ staffId, recordId }: { staffId: string; recordId: string }) => {
      const record = salaryRecords.find((r: any) => r.id === recordId);
      if (!record) throw new Error('Record not found');
      const staffMember = staff.find((s: any) => s.id === staffId);
      const payableRecord = staffMember ? getSalaryDisplaySnapshot(staffMember, record).record : record;

      const expenseConfig = getSetting('expense_location') || {};
      const projectId = expenseConfig?.institution_id;
      const categoryId = expenseConfig?.category_id;

      if (!projectId || !categoryId) {
        throw new Error(bn ? 'অনুগ্রহ করে বেতন সেটিংস ➔ হিসাব লিঙ্ক থেকে প্রতিষ্ঠান ও ব্যয় খাত নির্বাচন করুন' : 'Please select expense institution & expense head in salary settings');
      }

      const monthName = MONTHS.find(m => m.value === selectedMonth);
      const staffName = staffMember?.name_bn || staffMember?.name_en || 'Staff';
      const paymentDate = record.payment_date || toIsoDateInTz(new Date(), appTz);
      const paymentMonthYear = getExpenseMonthYearFromDate(paymentDate);
      const description = `${bn ? 'বেতন' : 'Salary'}: ${staffName} - ${bn ? monthName?.bn : monthName?.en} ${selectedYear} [staff_id:${staffId}] [salary_month:${record.month_year || monthYear}] [unit:মাস]`;

      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const pdfUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1/salary-pdf`
        : (projectRef ? `https://${projectRef}.supabase.co/functions/v1/salary-pdf` : null);

      const { data: existingExp } = await supabase
        .from('expenses')
        .select('id')
        .ilike('description', `%[staff_id:${staffId}]%`)
        .ilike('description', `%[salary_month:${record.month_year || monthYear}]%`)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingExp?.id) {
        const { error: expError } = await supabase.from('expenses').update({
          institution_id: projectId,
          category_id: categoryId,
          month_year: paymentMonthYear,
          expense_date: paymentDate,
          amount: Number(payableRecord.net_salary),
          quantity: 1,
          description,
          has_receipt: true,
          receipt_url: pdfUrl,
        }).eq('id', existingExp.id);
        if (expError) throw expError;
      } else {
        const { error: expError } = await supabase.from('expenses').insert({
          institution_id: projectId,
          category_id: categoryId,
          month_year: paymentMonthYear,
          expense_date: paymentDate,
          amount: Number(payableRecord.net_salary),
          quantity: 1,
          description,
          has_receipt: true,
          receipt_url: pdfUrl,
        });
        if (expError) throw expError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-expenses-for-month', expenseMonthYear] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all_expenses'] });
      toast.success(bn ? 'হিসাব ব্যবস্থাপনায় খরচ যোগ হয়েছে' : 'Added to expenses');
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'ত্রুটি হয়েছে' : 'Error')),
  });

  // Remove single staff from expenses without unpaying
  const removeStaffExpenseMutation = useMutation({
    mutationFn: async ({ staffId, staffName }: { staffId: string; staffName: string }) => {
      const expenseMonthYear = getExpenseMonthYearFromSalaryMonth(monthYear);
      const { error } = await supabase.from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .or(`description.like.%[staff_id:${staffId}]%,description.like.%${staffName}%`)
        .eq('month_year', expenseMonthYear)
        .is('deleted_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-expenses-for-month', expenseMonthYear] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all_expenses'] });
      toast.success(bn ? 'হিসাব থেকে বাদ দেওয়া হয়েছে' : 'Removed from expenses');
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'ত্রুটি হয়েছে' : 'Error')),
  });

  // Batch sync: individual per staff, consolidated single total, or remove all
  const syncMonthExpensesMutation = useMutation({
    mutationFn: async (mode: 'individual' | 'consolidated' | 'remove_all') => {
      const expenseMonthYear = getExpenseMonthYearFromSalaryMonth(monthYear);
      const expenseConfig = getSetting('expense_location') || {};
      const projectId = expenseConfig?.institution_id;
      const categoryId = expenseConfig?.category_id;

      if (mode !== 'remove_all' && (!projectId || !categoryId)) {
        throw new Error(bn ? 'অনুগ্রহ করে বেতন সেটিংস ➔ হিসাব লিঙ্ক থেকে প্রতিষ্ঠান ও ব্যয় খাত নির্বাচন করুন' : 'Please select expense institution & expense head in salary settings');
      }

      // First clean up all existing salary expenses for this month to guarantee clean sync
      const { error: cleanErr } = await supabase.from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('month_year', expenseMonthYear)
        .or(`description.like.%বেতন%,description.like.%Salary%`)
        .is('deleted_at', null);
      if (cleanErr) throw cleanErr;

      if (mode === 'remove_all') {
        return;
      }

      const paidRecords = salaryRecords.filter((r: any) => r.status === 'paid');
      if (paidRecords.length === 0) {
        throw new Error(bn ? 'এই মাসে কোনো পরিশোধিত বেতন রেকর্ড নেই' : 'No paid salary records for this month');
      }

      const monthName = MONTHS.find(m => m.value === selectedMonth);
      const monthLabel = `${bn ? monthName?.bn : monthName?.en} ${selectedYear}`;

      if (mode === 'individual') {
        const inserts = paidRecords.map((r: any) => {
          const staffMember = staff.find((s: any) => s.id === r.staff_id);
          const payable = staffMember ? getSalaryDisplaySnapshot(staffMember, r).record : r;
          const sName = staffMember?.name_bn || staffMember?.name_en || 'Staff';
          const sDesig = staffMember?.designation ? ` (${staffMember.designation})` : '';
          const paymentDate = r.payment_date || toIsoDateInTz(new Date(), appTz);
          const paymentMonthYear = getExpenseMonthYearFromDate(paymentDate);
          return {
            institution_id: projectId,
            category_id: categoryId,
            month_year: paymentMonthYear,
            expense_date: paymentDate,
            amount: Number(payable.net_salary),
            quantity: 1,
            description: `${bn ? 'বেতন' : 'Salary'}: ${sName}${sDesig} - ${monthLabel} [staff_id:${r.staff_id}] [salary_month:${monthYear}] [unit:মাস]`,
            has_receipt: true,
          };
        });

        const { error: insErr } = await supabase.from('expenses').insert(inserts);
        if (insErr) throw insErr;
      } else if (mode === 'consolidated') {
        const totalPaidNet = paidRecords.reduce((sum: number, r: any) => {
          const staffMember = staff.find((s: any) => s.id === r.staff_id);
          const payable = staffMember ? getSalaryDisplaySnapshot(staffMember, r).record : r;
          return sum + Number(payable.net_salary || 0);
        }, 0);

        const paymentDate = toIsoDateInTz(new Date(), appTz);
        const paymentMonthYear = getExpenseMonthYearFromDate(paymentDate);
        const description = `${bn ? 'মোট শিক্ষক-স্টাফ বেতন' : 'Total Staff Salary'}: ${monthLabel} (${toBnDigits(paidRecords.length)} জন) [salary_bulk_total] [salary_month:${monthYear}] [unit:জন]`;

        const { error: insErr } = await supabase.from('expenses').insert({
          institution_id: projectId,
          category_id: categoryId,
          month_year: paymentMonthYear,
          expense_date: paymentDate,
          amount: totalPaidNet,
          quantity: paidRecords.length,
          description,
          has_receipt: true,
        });
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_, mode) => {
      queryClient.invalidateQueries({ queryKey: ['salary-expenses-for-month', expenseMonthYear] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all_expenses'] });
      if (mode === 'remove_all') {
        toast.success(bn ? 'এই মাসের সকল বেতন হিসাব থেকে বাদ দেওয়া হয়েছে' : 'Removed all salary expenses for this month');
      } else if (mode === 'consolidated') {
        toast.success(bn ? 'মাসের মোট বেতন একবারে হিসাবে যুক্ত হয়েছে' : 'Added monthly total salary to expenses');
      } else {
        toast.success(bn ? 'সবার নাম সহ পৃথক পৃথক বেতন হিসাবে যুক্ত হয়েছে' : 'Added individual staff salaries to expenses');
      }
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'ত্রুটি হয়েছে' : 'Error')),
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
        const expenseMonthYear = getExpenseMonthYearFromSalaryMonth(record.month_year || monthYear);
        // Match the same staff + same salary month only; never touch another month's salary expense.
        const { error: delError } = await supabase.from('expenses')
          .update({ deleted_at: new Date().toISOString() })
          .or(`description.like.%[staff_id:${record.staff_id}]%,description.like.%${staffName}%`)
          .eq('month_year', expenseMonthYear)
          .is('deleted_at', null);
        if (delError) console.error('Expense removal error:', delError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-expenses-for-month', expenseMonthYear] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all_expenses'] });
      toast.success(bn ? 'অপরিশোধিত ও হিসাব থেকে সরানো হয়েছে' : 'Marked as unpaid & expense removed');
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
        const expenseMonthYear = getExpenseMonthYearFromSalaryMonth(record.month_year || monthYear);
        await supabase.from('expenses')
          .update({ deleted_at: new Date().toISOString() })
          .or(`description.like.%[staff_id:${record.staff_id}]%,description.like.%${staffName}%`)
          .eq('month_year', expenseMonthYear)
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
      queryClient.invalidateQueries({ queryKey: ['salary-expenses-for-month', expenseMonthYear] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      toast.success(bn ? 'বেতন রেকর্ড মুছে ফেলা হয়েছে' : 'Salary record removed');
    },
    onError: (e: any) => toast.error(bn ? `সমস্যা: ${e.message}` : `Error: ${e.message}`),
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
  const filtered = useMemo(() => {
    return staff.filter((s: any) => {
      // Hide staff who had not yet joined by the selected month.
      if (!isInMonthRoster(s)) return false;
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
  }, [staff, isInMonthRoster, searchQuery, eligibilityFilter, salaryRecords, settings, attendanceData]);

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
      return bn ? 'ডিউটি সময় ডিফল্ট (০৮:০০–১৭:০০) ব্যবহার হচ্ছে' : 'Duty time is using default (08:00–17:00)';
    }
    return null;
  };

  // Comprehensive attendance validation — detects missing/inconsistent data
  // Returns { errors: string[], warnings: string[], hasErrors, hasWarnings }
  // errors → block salary generation. warnings → allow but show alert.
  const getAttendanceValidation = (s: any): { errors: string[]; warnings: string[]; hasErrors: boolean; hasWarnings: boolean } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requireAttendance = getSetting('require_attendance')?.enabled !== false;

    const records = attendanceData.filter((a: any) =>
      a.entity_id === s.id && a.shift !== 'morning' && a.shift !== 'evening'
    );

    if (requireAttendance && records.length === 0) {
      errors.push(bn ? 'এই মাসে কোনো উপস্থিতি রেকর্ড নেই' : 'No attendance records this month');
    }

    if (records.length > 0) {
      const stats = getAttendanceStats(s);
      const [yy, mm] = monthYear.split('-').map(Number);
      const lastDay = new Date(yy, mm, 0).getDate();

      // 1. Duplicate per-day records (same date)
      const dateCount = new Map<string, number>();
      for (const r of records) dateCount.set(r.attendance_date, (dateCount.get(r.attendance_date) || 0) + 1);
      const dupDates = Array.from(dateCount.entries()).filter(([, c]) => c > 1).map(([d]) => d);
      if (dupDates.length > 0) {
        warnings.push(bn
          ? `${toBnDigits(dupDates.length)} দিনে একাধিক রেকর্ড (${dupDates.slice(0, 3).join(', ')}${dupDates.length > 3 ? '…' : ''})`
          : `${dupDates.length} day(s) have duplicate records (${dupDates.slice(0, 3).join(', ')}${dupDates.length > 3 ? '…' : ''})`);
      }

      // 2. Untracked days (past working days without attendance record).
      // শুধুমাত্র যদি সেটিংসে 'সম্পূর্ণ উপস্থিতি বাধ্যতামূলক' চালু থাকে, তখনই সতর্কবার্তা দেখাবে।
      const requireCompleteAttendance = getSetting('require_complete_attendance')?.enabled === true;
      if (requireCompleteAttendance && stats.untrackedAbsentDays > 0) {
        warnings.push(bn
          ? `${toBnDigits(stats.untrackedAbsentDays)} দিনের হাজিরা এন্ট্রি করা হয়নি`
          : `${stats.untrackedAbsentDays} day(s) missing attendance entry`);
      }


      // 3. Late/half_day/present without check-in time
      const missingTime = records.filter((r: any) =>
        ['present', 'late', 'half_day'].includes(r.status) && !r.check_in_time
      );
      if (missingTime.length > 0) {
        errors.push(bn
          ? `${toBnDigits(missingTime.length)} দিনে চেক-ইন সময় নেই — কর্তন সঠিক হবে না`
          : `${missingTime.length} day(s) missing check-in time — deductions will be wrong`);
      }

      // 4. Check-out before check-in (corrupt timing)
      const reversed = records.filter((r: any) => {
        if (!r.check_in_time || !r.check_out_time) return false;
        const ci = timeToMinutes(r.check_in_time);
        const co = timeToMinutes(r.check_out_time);
        return co < ci && co < 60; // negative window, not overnight tail
      });
      if (reversed.length > 0) {
        errors.push(bn
          ? `${toBnDigits(reversed.length)} দিনে চেক-আউট চেক-ইনের আগে`
          : `${reversed.length} day(s) check-out before check-in`);
      }

      // 5. Future-dated records
      const todayStr = new Date().toISOString().slice(0, 10);
      const future = records.filter((r: any) => r.attendance_date > todayStr);
      if (future.length > 0) {
        warnings.push(bn
          ? `${toBnDigits(future.length)} দিনের ভবিষ্যৎ তারিখের রেকর্ড আছে`
          : `${future.length} record(s) dated in the future`);
      }

      // 6. Records outside the selected month
      const outOfMonth = records.filter((r: any) => !r.attendance_date.startsWith(monthYear));
      if (outOfMonth.length > 0) {
        warnings.push(bn
          ? `${toBnDigits(outOfMonth.length)} রেকর্ড নির্বাচিত মাসের বাইরে`
          : `${outOfMonth.length} record(s) outside selected month`);
      }

      // 7. Absent count > working days (impossible)
      if (stats.absent > lastDay) {
        errors.push(bn
          ? 'অনুপস্থিতির সংখ্যা মাসের দিনের চেয়ে বেশি'
          : 'Absent count exceeds days in month');
      }

      // 8. Salary missing
      if (!s.salary || Number(s.salary) <= 0) {
        errors.push(bn ? 'মূল বেতন নির্ধারিত নেই' : 'Base salary not set');
      }

      // 9. Duty time using default
      const dt = getDutyTimeWithSource(s);
      if (dt.source === 'default') {
        warnings.push(bn ? 'ডিউটি সময় ডিফল্ট (০৮:০০–১৭:০০) ব্যবহার হচ্ছে' : 'Using default duty time (08:00–17:00)');
      }
    } else if (!s.salary || Number(s.salary) <= 0) {
      errors.push(bn ? 'মূল বেতন নির্ধারিত নেই' : 'Base salary not set');
    }

    return { errors, warnings, hasErrors: errors.length > 0, hasWarnings: warnings.length > 0 };
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
    const generatedStaff = filtered.filter((s: any) => getRecord(s.id));
    const displaySnapshots = generatedStaff.map((s: any) => getSalaryDisplaySnapshot(s, getRecord(s.id)));
    const totalBase = displaySnapshots.reduce((sum: number, snap: any) => sum + Number(snap.record.base_salary || 0), 0);
    const totalNet = displaySnapshots.reduce((sum: number, snap: any) => sum + Number(snap.record.net_salary || 0), 0);
    const totalDeduction = displaySnapshots.reduce((sum: number, snap: any) => sum + getSalaryDisplayTotalDeduction(snap), 0);
    const paid = salaryRecords.filter((r: any) => r.status === 'paid').length;
    const pending = salaryRecords.filter((r: any) => r.status === 'pending').length;
    
    // Total savings this month
    const totalSavings = filtered.reduce((sum: number, s: any) => {
      const active = getActiveSavings(s.id);
      return sum + (active ? active.amount : 0);
    }, 0);
    
    return { totalBase, totalNet, totalDeduction, paid, pending, totalSavings };
  }, [salaryRecords, filtered, savingsConfigs, monthYear, attendanceData, dutyAttendanceData, settings, salaryChanges, monthHolidays]);

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
      bn ? 'ওভারটাইম/বোনাস' : 'Overtime/Bonus', bn ? 'কর্তন' : 'Deductions',
      bn ? 'জমা' : 'Savings', bn ? 'অগ্রিম' : 'Advance',
      bn ? 'নিট বেতন' : 'Net Salary', bn ? 'স্ট্যাটাস' : 'Status'
    ];
    sheetData.push(headers);
    
    const fmtNum = (n: number) => bn ? toBnDigits(n.toLocaleString()) : n;
    const fmtIdx = (n: number) => bn ? toBnDigits(n) : n;
    
    filtered.forEach((s: any, idx: number) => {
      const rec = getRecord(s.id);
      const snap = getSalaryDisplaySnapshot(s, rec);
      const displayRecord = snap.record;
      const totalDed = rec ? getSalaryDisplayTotalDeduction(snap) : 0;
      const status = rec?.status === 'paid' ? (bn ? 'পরিশোধিত' : 'Paid') : 
                     rec ? (bn ? 'বকেয়া' : 'Pending') : (bn ? 'জেনারেট হয়নি' : 'Not Generated');
      sheetData.push([
        fmtIdx(idx + 1),
        s.name_bn,
        s.staff_id || '-',
        getDesignation(s.designation),
        fmtNum(Number(displayRecord?.base_salary ?? getEffectiveSalary(s))),
        fmtNum(Number(displayRecord?.bonus || 0)),
        fmtNum(Number(displayRecord?.overtime || 0) + Number(displayRecord?.bonus || 0)),
        fmtNum(totalDed),
        fmtNum(snap.savingsDisplay),
        fmtNum(Number(displayRecord?.advance_deduction || 0)),
        fmtNum(Number(rec ? displayRecord?.net_salary : 0)),
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

  // Salary-sheet date (ISO yyyy-mm-dd). Defaults to the LAST day of the selected
  // salary month, and admins can edit it before generating the PDF.
  const [sheetDate, setSheetDate] = useState('');
  useEffect(() => {
    const y = Number(selectedYear);
    const m = Number(selectedMonth);
    if (!y || !m) return;
    const lastDay = new Date(y, m, 0).getDate();
    setSheetDate(`${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`);
  }, [selectedYear, selectedMonth]);
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [sigPreparedBy, setSigPreparedBy] = useState('');
  const [sigPreparedRole, setSigPreparedRole] = useState('');
  const [sigVerifiedBy, setSigVerifiedBy] = useState('');
  const [sigVerifiedRole, setSigVerifiedRole] = useState('');
  const [sigApprovedBy, setSigApprovedBy] = useState('');
  const [sigApprovedRole, setSigApprovedRole] = useState('');

  // Load dynamic signatories (name + designation) from salary_workflow_settings
  const { data: workflowSignatories = [] } = useQuery({
    queryKey: ['salary-workflow-signatories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('salary_workflow_settings')
        .select('role, display_name, designation, is_active, sort_order, is_default')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });
  const pickSig = (role: 'treasurer' | 'verifier' | 'approver') =>
    (workflowSignatories as any[]).find((r) => r.role === role) || null;

  // Current logged-in user (used as preparer fallback)
  const { data: currentUserName = '' } = useQuery({
    queryKey: ['current-user-name-salary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return '';
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return prof?.full_name || user.email || '';
    },
  });

  // Auto-fill signatory inputs as soon as settings/user load (even if dialog is open)
  useEffect(() => {
    const prep = pickSig('treasurer');
    const ver = pickSig('verifier');
    const apr = pickSig('approver');
    const prepName = prep?.display_name || currentUserName;
    const prepRole = prep?.designation || (bn ? 'প্রস্তুতকারী' : 'Prepared by');
    if (!sigPreparedBy && prepName) setSigPreparedBy(prepName);
    if (!sigPreparedRole && prepRole) setSigPreparedRole(prepRole);
    if (!sigVerifiedBy && ver?.display_name) setSigVerifiedBy(ver.display_name);
    if (!sigVerifiedRole && ver?.designation) setSigVerifiedRole(ver.designation);
    if (!sigApprovedBy && apr?.display_name) setSigApprovedBy(apr.display_name);
    if (!sigApprovedRole && apr?.designation) setSigApprovedRole(apr.designation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowSignatories, currentUserName, bn]);

  const exportPDF = async (sigOverride?: {
    prepared_by?: string; prepared_by_role?: string;
    verified_by?: string; verified_by_role?: string;
    approved_by?: string; approved_by_role?: string;
    paid_by?: string; paid_by_role?: string;
  }) => {
    setPdfLoading(true);
    try {
      const monthName = MONTHS.find(m => m.value === selectedMonth);
      const sig = sigOverride || (() => {
        const prep = pickSig('treasurer');
        const ver = pickSig('verifier');
        const apr = pickSig('approver');
        return {
          prepared_by: sigPreparedBy.trim() || prep?.display_name || currentUserName || undefined,
          prepared_by_role: sigPreparedRole.trim() || prep?.designation || undefined,
          verified_by: sigVerifiedBy.trim() || ver?.display_name || undefined,
          verified_by_role: sigVerifiedRole.trim() || ver?.designation || undefined,
          approved_by: sigApprovedBy.trim() || apr?.display_name || undefined,
          approved_by_role: sigApprovedRole.trim() || apr?.designation || undefined,
        };
      })();
       const staffRows = filtered.map((s: any) => {
          const rec = getRecord(s.id);
          const snap = getSalaryDisplaySnapshot(s, rec);
          const displayRecord = snap.record;
          const st = snap.stats;
          const totalDed = getSalaryDisplayTotalDeduction(snap);
          const net_salary = Number(displayRecord.net_salary || 0);
          return {
            name: s.name_bn,
            staff_id: s.staff_id || '-',
            designation: getDesignation(s.designation),
            base_salary: Number(displayRecord?.base_salary ?? getEffectiveSalary(s)),
            present: st.present ?? 0,
            absent: st.absent ?? 0,
            late: st.late ?? 0,
            leave: st.leave || 0,
            bonus: Number(displayRecord?.bonus || 0),
            // PDF-এর ওভারটাইম কলামে বোনাসও যুক্ত হয়ে আসবে
            overtime: Number(displayRecord?.overtime || 0) + Number(displayRecord?.bonus || 0),
            overtime_reason: displayRecord?.overtime_reason,
            deductions: totalDed,
            advance: Number(displayRecord?.advance_deduction || 0),
            savings: snap.savingsDisplay,
            net_salary,
            status: rec?.status || 'not_generated',
            // বিলম্ব উপস্থিতির বিস্তারিত (তারিখ • প্রবেশ → বাহির • কত মিনিট = বিলম্ব + আগাম প্রস্থান)
            lateDetails: (st.dailyBreakdown || [])
              .filter((d: any) => ((Number(d.lateMin) || 0) + (Number(d.earlyMin) || 0)) > 0)
              .map((d: any) => ({ date: d.date, checkIn: d.checkIn, checkOut: d.checkOut, lateMin: (Number(d.lateMin) || 0) + (Number(d.earlyMin) || 0), deduction: Number(d.deduction) || 0 })),
            // অনুপস্থিতির বিস্তারিত (তারিখ • কর্তন)
            absentDetails: (st.dailyBreakdown || [])
              .filter((d: any) => d.status === 'absent')
              .map((d: any) => ({ date: d.date, deduction: Number(d.deduction) || 0 })),
            // আবাসিক ডিউটি কর্তনের বিস্তারিত (তারিখ • শিফট • কারণ • টাকা)
            dutyDeduction: Number(displayRecord?.duty_deduction || 0),
            dutyDetails: getDutyDeduction(s.id).lines.map((l) => ({
              date: l.date,
              shift: l.shiftName,
              reason: l.reason,
              note: l.note,
              amount: l.amount,
            })),
          };
        });

       const issueDate = sheetDate
         ? new Date(`${sheetDate}T00:00:00`).toLocaleDateString(bn ? 'bn-BD' : 'en-GB')
         : undefined;
       const payload = {
         monthYear,
         monthLabel: bn ? monthName?.bn : monthName?.en,
         year: selectedYear,
         issueDate,
         language: bn ? 'bn' : 'en',
         staff: staffRows,
         totals: {
           base: staffRows.reduce((s: number, r: any) => s + Number(r.base_salary || 0), 0),
           net: staffRows.reduce((s: number, r: any) => s + Number(r.net_salary || 0), 0),
           deductions: staffRows.reduce((s: number, r: any) => s + Number(r.deductions || 0), 0),
           savings: staffRows.reduce((s: number, r: any) => s + Number(r.savings || 0), 0),
           overtime: staffRows.reduce((s: number, r: any) => s + Number(r.overtime || 0), 0),
         },
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

      // Always produce a real .pdf FILE download (no print dialog / print page),
      // on desktop AND mobile browsers alike.
      const fname = `salary-sheet-${selectedYear}${selectedMonth}.pdf`;
      toast.info(bn ? 'বেতন শিট PDF তৈরি হচ্ছে…' : 'Generating salary sheet PDF…');
      await downloadSheetAsPdf(html, fname, null, 'landscape', 'download');
      toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error(bn ? 'PDF তৈরি করতে সমস্যা' : 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // Build salary slip HTML and metadata synchronously
  const buildSalarySlip = (staffMember: any, record: any) => {
    const slipSnapshot = getSalaryDisplaySnapshot(staffMember, record);
    record = slipSnapshot.record;
    const savingsAmt = slipSnapshot.savingsDisplay;
    const slipStats = slipSnapshot.stats;
    const leaveDays = slipStats.leave || 0;

    // বিলম্ব উপস্থিতির বিস্তারিত (তারিখ • প্রবেশ → বাহির • কত মিনিট) — স্লিপে দেখানোর জন্য
    const slipLateDetails = (slipStats.dailyBreakdown || [])
      .filter((d: any) => ((Number(d.lateMin) || 0) + (Number(d.earlyMin) || 0)) > 0)
      .map((d: any) => ({ date: d.date, checkIn: d.checkIn, checkOut: d.checkOut, lateMin: (Number(d.lateMin) || 0) + (Number(d.earlyMin) || 0) }));
    const fmtSlipDate = (d: string) => {
      if (!d) return '-';
      const [y, mo, da] = d.split('-');
      const out = `${da}/${mo}/${y}`;
      return bn ? toBnDigits(out) : out;
    };
    const fmtSlip12 = (t: string) => {
      if (!t) return '-';
      const [hStr, mStr] = t.split(':');
      let h = parseInt(hStr, 10); const m = mStr || '00';
      const ap = h >= 12 ? (bn ? 'PM' : 'PM') : 'AM';
      h = h % 12; if (h === 0) h = 12;
      const out = `${h}:${m} ${ap}`;
      return bn ? toBnDigits(out) : out;
    };
    const fmtSlipMins = (mins: number) => {
      const h = Math.floor(mins / 60); const m = mins % 60;
      const parts: string[] = [];
      if (h > 0) parts.push(`${bn ? toBnDigits(h) : h} ${bn ? 'ঘণ্টা' : 'h'}`);
      parts.push(`${bn ? toBnDigits(m) : m} ${bn ? 'মিনিট' : 'min'}`);
      return parts.join(' ');
    };
    const lateDetailHtml = slipLateDetails.length > 0 ? `
      <div style="margin:14px 0 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#fff7ed;color:#9a3412;font-weight:700;padding:7px 12px;font-size:12px">
          ${bn ? 'বিলম্ব উপস্থিতির বিবরণ' : 'Late Attendance Details'}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="background:#f1f5f9;color:#334155">
              <th style="border:0.5px solid #cbd5e1;padding:4px 8px;text-align:left">${bn ? 'তারিখ' : 'Date'}</th>
              <th style="border:0.5px solid #cbd5e1;padding:4px 8px;text-align:center">${bn ? 'প্রবেশ' : 'Check-in'}</th>
              <th style="border:0.5px solid #cbd5e1;padding:4px 8px;text-align:center">${bn ? 'বাহির' : 'Check-out'}</th>
              <th style="border:0.5px solid #cbd5e1;padding:4px 8px;text-align:right">${bn ? 'বিলম্ব' : 'Late by'}</th>
            </tr>
          </thead>
          <tbody>
            ${slipLateDetails.map((d: any) => `
              <tr>
                <td style="border:0.5px solid #e2e8f0;padding:4px 8px">${fmtSlipDate(d.date)}</td>
                <td style="border:0.5px solid #e2e8f0;padding:4px 8px;text-align:center">${fmtSlip12(d.checkIn)}</td>
                <td style="border:0.5px solid #e2e8f0;padding:4px 8px;text-align:center">${fmtSlip12(d.checkOut)}</td>
                <td style="border:0.5px solid #e2e8f0;padding:4px 8px;text-align:right;font-weight:600;color:#b45309">${fmtSlipMins(Number(d.lateMin) || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    // Earned-from-attendance = live/persisted attendance result for the selected month.
    const attendanceDeductions = Number(record.absence_deduction || 0)
      + Number(record.late_deduction || 0)
      + Number(record.other_deduction || 0);
    // ম্যানুয়াল এডিটে earned_from_attendance = মূল বেতন হিসেবে রাখা হয়,
    // তাই স্লিপে কর্তনগুলো আলাদা করে বাদ দিতে হবে — নাহলে স্লিপে কর্তন দেখা যায় না।
    const earnedFromAttendance = record.manual_override
      ? Math.max(0, Number(record.base_salary || 0) - attendanceDeductions)
      : (Number.isFinite(Number(record.earned_from_attendance))
        ? Number(record.earned_from_attendance)
        : Math.max(0, Number(record.base_salary || 0) - attendanceDeductions));

    const totalAllowance = Number(record.bonus || 0) + Number(record.overtime || 0) + Number(record.other_allowance || 0);
    const totalEarnings = earnedFromAttendance + totalAllowance;

    // স্লিপের কর্তন কলামে শুধুমাত্র "অতিরিক্ত" কর্তন (অগ্রিম + জমা) দেখাবে।
    // উপস্থিতি কর্তন (absence/late/other) ইতিমধ্যে আয় থেকে বাদ গেছে — তাই ওগুলো আয়ের অংশে দেখানো হয়েছে।
    const dutyDed = Number(record.duty_deduction || 0);
    const dutyDedInfo = getDutyDeduction(staffMember.id);
    const totalDed = Number(record.advance_deduction || 0) + savingsAmt + dutyDed;
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
    // Net = মোট বেতন − মোট কর্তন (ডায়নামিক, যাতে slip সবসময় totals-এর সাথে মেলে)
    const netSalary = Math.max(0, totalEarnings - totalDed);
    const inWords = bn
      ? numberToBanglaWords(Math.floor(netSalary))
      : `${netSalary.toLocaleString()} Taka Only`;

    const instName = bn
      ? (webSettings?.institution_name || 'প্রতিষ্ঠানের নাম')
      : (webSettings?.institution_name_en || webSettings?.institution_name || 'Institution Name');
    const instAddr = webSettings?.address || '';
    const instPhone = webSettings?.phone || '';
    const instEmail = webSettings?.email || '';
    const logoUrl = webSettings?.logo_url || '';

    // Default institution data pre-fetched via useQuery for instant sync generation
    const instRow = defaultInstData;
    const principalName =
      (instRow?.principal_name && String(instRow.principal_name).trim()) ||
      (bn ? webSettings?.principal_name : (webSettings?.principal_name_en || webSettings?.principal_name)) ||
      (bn ? 'প্রিন্সিপাল' : 'Principal');

    // Dynamic signatories from salary workflow settings (with fallbacks)
    const _prep = pickSig('treasurer');
    const _ver = pickSig('verifier');
    const _apr = pickSig('approver');
    const accountantName = (sigVerifiedBy?.trim() || _ver?.display_name || instRow?.accountant_name || (bn ? '' : '')).toString();
    const accountantRole = (sigVerifiedRole?.trim() || _ver?.designation || (bn ? 'হিসাবরক্ষক' : 'Accountant')).toString();
    const approverName = (sigApprovedBy?.trim() || _apr?.display_name || principalName).toString();
    const approverRole = (sigApprovedRole?.trim() || _apr?.designation || (bn ? 'অনুমোদনকারী (প্রিন্সিপাল)' : 'Approved by (Principal)')).toString();
    const recipientName = staffMember.name_bn || '';
    const recipientRole = bn ? 'প্রাপকের স্বাক্ষর' : "Recipient's Signature";

    const slipId = `SL-${selectedYear}${selectedMonth}-${String(record.id).slice(0, 6).toUpperCase()}`;
    const issueDate = new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB');

    const fontHref = `${window.location.origin}/fonts/Kalpurush.ttf`;
    const fname = `salary-slip-${(staffMember.name_en || staffMember.name_bn || 'staff').replace(/\s+/g, '_')}-${selectedYear}${selectedMonth}.pdf`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=794">
    <title>${bn ? 'বেতন স্লিপ' : 'Salary Slip'} - ${staffMember.name_bn}</title>
    <link rel="preload" as="font" type="font/ttf" href="${fontHref}" crossorigin="anonymous">
    <style>
      @font-face{font-family:"Kalpurush";src:url("${fontHref}") format("truetype");font-display:block;}
      *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
      html,body{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;width:100%;max-width:100%;overflow-x:hidden}
      body{font-family:'Kalpurush','Noto Sans Bengali','Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:16px;line-height:1.5}
      .slip{max-width:780px;width:100%;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px -15px rgba(15,23,42,.18);position:relative;box-sizing:border-box}
      .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;overflow:hidden}
      .watermark span{font-size:140px;color:rgba(13,148,136,.06);font-weight:900;letter-spacing:8px;transform:rotate(-28deg);white-space:nowrap}
      .header{background:linear-gradient(135deg,#0d9488 0%,#0f766e 60%,#115e59 100%);color:#fff;padding:22px 28px;position:relative;overflow:hidden}
      .header::after{content:"";position:absolute;right:-60px;top:-60px;width:240px;height:240px;background:radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 70%);border-radius:50%}
      .head-row{display:flex;align-items:center;gap:16px;position:relative;z-index:1}
      .logo-wrap{width:64px;height:64px;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);border-radius:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;backdrop-filter:blur(8px)}
      .logo-wrap img{width:100%;height:100%;object-fit:contain}
      .logo-fallback{font-size:28px;font-weight:800}
      .inst-info{flex:1}
      .inst-name{font-size:22px;font-weight:800;letter-spacing:.3px;margin-bottom:2px}
      .inst-meta{font-size:11.5px;opacity:.92;line-height:1.55}
      .slip-tag{position:absolute;right:28px;top:22px;z-index:2;text-align:right}
      .slip-tag .badge{background:rgba(255,255,255,.95);color:#0f766e;font-weight:700;padding:5px 14px;border-radius:999px;font-size:11px;letter-spacing:1.5px;display:inline-block}
      .slip-tag .id{color:#fff;font-size:10.5px;margin-top:6px;opacity:.92;font-family:monospace}
      .month-bar{background:linear-gradient(90deg,#f0fdfa 0%,#ccfbf1 50%,#f0fdfa 100%);padding:12px 28px;border-bottom:1px solid #ccfbf1;display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:#0f766e;font-weight:600;position:relative;z-index:1}
      .month-bar .month{font-size:15px;font-weight:800;color:#115e59}
      .body{padding:22px 28px;position:relative;z-index:1}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:18px}
      .info-cell{padding:10px 14px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12.5px}
      .info-cell:last-child{border-bottom:none}
      .info-cell:nth-child(odd){border-right:1px solid #e2e8f0}
      .info-cell .lbl{color:#64748b;font-weight:500}
      .info-cell .val{color:#0f172a;font-weight:700}
      .columns,.single-col{display:block;margin-bottom:14px}
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
      .col-foot{display:none}
      .net-box{background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border-radius:14px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:6px;box-shadow:0 8px 24px -8px rgba(13,148,136,.45)}
      .net-box .lbl{font-size:13px;font-weight:600;opacity:.95;letter-spacing:.4px;text-transform:uppercase}
      .net-box .amt{font-size:26px;font-weight:900;font-variant-numeric:tabular-nums}
      .words{margin-top:10px;padding:9px 14px;background:#f8fafc;border-left:3px solid #0d9488;border-radius:6px;font-size:12px;color:#334155;font-style:italic}
      .words strong{color:#0f766e;font-style:normal;font-weight:700}
      .signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:45px;padding:0 8px}
      .sig{text-align:center;font-size:11.5px;color:#475569}
      .sig .line{border-top:1.5px solid #94a3b8;margin:0 6px;height:0}
      .sig .sig-name{font-size:12px;font-weight:700;color:#0f172a;padding-top:6px;min-height:18px}
      .sig .role{font-weight:600;color:#475569;font-size:11px;margin-top:2px}
      .footer{background:#f1f5f9;padding:10px 28px;text-align:center;font-size:10.5px;color:#64748b;border-top:1px solid #e2e8f0;margin-top:25px}
      .footer .gen{color:#94a3b8;font-size:9.5px;margin-top:3px}
      @page{size:A4 portrait;margin:0}
      @media print{
        *,*::before,*::after{
          -webkit-print-color-adjust:exact !important;
          print-color-adjust:exact !important;
          color-adjust:exact !important;
          box-sizing:border-box !important;
        }
        html,body{
          background:#fff !important;
          padding:0 !important;
          margin:0 !important;
          width:210mm !important;
          min-width:210mm !important;
          max-width:210mm !important;
          height:auto !important;
          overflow:visible !important;
        }
        .slip{
          box-shadow:none !important;
          border-radius:0 !important;
          border:none !important;
          width:210mm !important;
          min-width:210mm !important;
          max-width:210mm !important;
          margin:0 auto !important;
          padding:8mm 10mm !important;
          overflow:visible !important;
          height:auto !important;
          max-height:none !important;
          box-sizing:border-box !important;
          page-break-inside:avoid !important;
          break-inside:avoid !important;
        }
        .header::after{display:none !important}
        .watermark{display:none !important}
        .print-actions-bar,.no-print{display:none !important;visibility:hidden !important}

        /* Compact for single-page A4 */
        .header{padding:10px 18px !important;width:100% !important;box-sizing:border-box !important}
        .logo-wrap{width:44px !important;height:44px !important;border-radius:8px !important}
        .logo-fallback{font-size:20px !important}
        .inst-name{font-size:17px !important}
        .inst-meta{font-size:10px !important;line-height:1.35 !important}
        .slip-tag{right:18px !important;top:10px !important}
        .slip-tag .badge{padding:3px 8px !important;font-size:9px !important}
        .slip-tag .id{font-size:8.5px !important;margin-top:2px !important}
        .month-bar{padding:6px 18px !important;font-size:11px !important;width:100% !important;box-sizing:border-box !important}
        .month-bar .month{font-size:12.5px !important}
        .body{padding:10px 18px !important;width:100% !important;box-sizing:border-box !important}
        .info-grid{margin-bottom:6px !important;border-radius:8px !important;width:100% !important;box-sizing:border-box !important}
        .info-cell{padding:4px 8px !important;font-size:10px !important}
        .columns,.single-col{margin-bottom:6px !important;width:100% !important;box-sizing:border-box !important}
        .col{border-radius:8px !important;width:100% !important;box-sizing:border-box !important}
        .col-head{padding:5px 10px !important;font-size:10.5px !important}
        .ln{padding:3.5px 10px !important;font-size:10px !important}
        .col-foot{display:none !important}
        .net-box{padding:7px 12px !important;border-radius:8px !important;margin-top:4px !important;width:100% !important;box-sizing:border-box !important}
        .net-box .lbl{font-size:10.5px !important}
        .net-box .amt{font-size:17px !important}
        .words{margin-top:4px !important;padding:4px 10px !important;font-size:10px !important;width:100% !important;box-sizing:border-box !important}
        .signatures{margin-top:22px !important;gap:14px !important;padding:0 4px !important;width:100% !important;box-sizing:border-box !important}
        .sig{font-size:9.5px !important}
        .sig .sig-name{font-size:10px !important;font-weight:700 !important;padding-top:3px !important;min-height:14px !important}
        .sig .role{font-size:9px !important}
        .footer{padding:5px 18px !important;margin-top:10px !important;font-size:9px !important;width:100% !important;box-sizing:border-box !important}
        .footer .gen{font-size:8px !important;margin-top:1px !important}
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
          <div class="info-cell"><span class="lbl">${bn ? 'বিভাগ' : 'Department'}</span><span class="val">${getDepartmentLabel(staffMember.staff_category || staffMember.department)}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'ক্লাসের সময়' : 'Class Hours'}</span><span class="val">${(() => {
            const t = getDutyTimeWithSource(staffMember);
            return `${fmt(t.start)} – ${fmt(t.end)}`;
          })()}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'কর্মদিবস' : 'Working Days'}</span><span class="val">${bn ? toBnDigits(record.working_days) : record.working_days}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'উপস্থিত' : 'Present'}</span><span class="val" style="color:#059669">${bn ? toBnDigits(record.present_days) : record.present_days}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'ছুটি' : 'Leave'}</span><span class="val" style="color:#2563eb">${bn ? toBnDigits(leaveDays) : leaveDays}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'অনুপস্থিত' : 'Absent'}</span><span class="val" style="color:#dc2626">${bn ? toBnDigits(record.absent_days) : record.absent_days}</span></div>
          <div class="info-cell"><span class="lbl">${bn ? 'বিলম্ব দিন' : 'Late Days'}</span><span class="val" style="color:#d97706">${bn ? toBnDigits(record.late_days || 0) : (record.late_days || 0)}</span></div>
          <div class="info-cell" style="grid-column:1 / -1;border-right:none"><span class="lbl">${bn ? 'স্ট্যাটাস' : 'Status'}</span><span class="val" style="color:${record.status === 'paid' ? '#059669' : '#d97706'}">${record.status === 'paid' ? (bn ? '✓ পরিশোধিত' : '✓ PAID') : (bn ? '⏱ বকেয়া' : '⏱ PENDING')}</span></div>
        </div>

        <div class="single-col">
          <div class="col earn">
            <div class="col-head">${bn ? 'বেতন বিবরণ' : 'Salary Details'}</div>
            <div class="col-body">
              <!-- ১. মূল বেতন -->
              <div class="ln" style="background:#f8fafc;font-weight:700"><span class="l">${bn ? '১। মূল বেতন' : '1. Base Salary'}</span><span class="v">৳${slipNum(Number(record.base_salary || 0))}</span></div>

              <!-- ২. উপস্থিতি ও ডিউটি কর্তন -->
              <div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'অনুপস্থিতি কর্তন' : 'Absence Deduction'} (${bn ? toBnDigits(record.absent_days || 0) : (record.absent_days || 0)} ${bn ? 'দিন' : 'd'})</span><span class="v">৳${slipNum(Number(record.absence_deduction || 0))}</span></div>
              <div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'বিলম্ব কর্তন' : 'Late Deduction'}</span><span class="v">৳${slipNum(Number(record.late_deduction || 0))}</span></div>
              ${dutyDed > 0 ? `<div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'আবাসিক ডিউটি কর্তন' : 'Residential Duty Deduction'} <span style="color:#64748b;font-weight:400">(${bn ? toBnDigits(dutyDedInfo.lines.length) : dutyDedInfo.lines.length} ${bn ? 'শিফট' : 'shifts'}${dutyDedInfo.absentCount ? ` • ${bn ? 'অনুপস্থিত' : 'absent'} ${bn ? toBnDigits(dutyDedInfo.absentCount) : dutyDedInfo.absentCount}` : ''}${dutyDedInfo.lateCount ? ` • ${bn ? 'বিলম্ব' : 'late'} ${bn ? toBnDigits(dutyDedInfo.lateCount) : dutyDedInfo.lateCount}` : ''})</span></span><span class="v">৳${slipNum(dutyDed)}</span></div>` : ''}

              <!-- সাবটোটাল: উপস্থিতি ভিত্তিক বেতন -->
              <div class="ln" style="border-top:1px dashed #94a3b8;padding-top:6px;margin-top:4px;background:#f0fdf4;color:#065f46"><span class="l"><strong>${bn ? '= উপস্থিতি ভিত্তিক বেতন' : '= Earned from Attendance'}</strong></span><span class="v"><strong>৳${slipNum(earnedFromAttendance)}</strong></span></div>

              <!-- ৩. অগ্রিম, অন্যান্য কর্তন ও সঞ্চয় জমা -->
              ${Number(record.advance_deduction || 0) > 0 ? `<div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'অগ্রিম কর্তন' : 'Advance Deduction'}</span><span class="v">৳${slipNum(Number(record.advance_deduction || 0))}</span></div>` : ''}
              ${Number(record.other_deduction || 0) > 0 ? `<div class="ln" style="color:#dc2626"><span class="l">− ${bn ? 'অন্যান্য কর্তন' : 'Other Deduction'}${record.other_deduction_note ? ` <span style="color:#64748b;font-weight:400">(${record.other_deduction_note})</span>` : ''}</span><span class="v">৳${slipNum(Number(record.other_deduction || 0))}</span></div>` : ''}
              ${savingsAmt > 0 ? `<div class="ln savings" style="color:#1d4ed8;background:#eff6ff;padding:4px 6px;border-radius:4px"><span class="l" style="font-weight:600">🏦 ${bn ? 'বেতন সঞ্চয় (ডিপোজিট)' : 'Salary Savings (Deposit)'}</span><span class="v" style="font-weight:700">৳${slipNum(savingsAmt)}</span></div>` : ''}

              <!-- ৪. বোনাস / ওভারটাইম / ভাতা -->
              <div class="ln" style="color:#047857"><span class="l">＋ ${bn ? 'বোনাস' : 'Bonus'}</span><span class="v">৳${slipNum(Number(record.bonus || 0))}</span></div>
              <div class="ln" style="color:#047857"><span class="l">＋ ${bn ? 'ওভারটাইম' : 'Overtime'}${record.overtime_reason ? ` <span style="color:#64748b;font-weight:400">(${record.overtime_reason})</span>` : ''}</span><span class="v">৳${slipNum(Number(record.overtime || 0))}</span></div>
              <div class="ln" style="color:#047857"><span class="l">＋ ${bn ? 'অন্যান্য ডিউটি' : 'Other Duty'}${record.other_allowance_note ? ` <span style="color:#64748b;font-weight:400">(${record.other_allowance_note})</span>` : ''}</span><span class="v">৳${slipNum(Number(record.other_allowance || 0))}</span></div>

              <!-- যাচাই লাইন hidden by request — শুধু চূড়ান্ত যোগফল দেখাও -->
              <div class="ln" style="border-top:2px solid #0f172a;margin-top:6px;padding-top:8px;background:#fefce8;color:#713f12;font-weight:700">
                <span class="l">${bn ? 'মোট বেতন (নিট প্রদেয়)' : 'Total (Net Payable)'}</span>
                <span class="v">৳${slipNum(netSalary)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="net-box">
          <span class="lbl">${bn ? 'নিট বেতন (প্রদেয়)' : 'Net Salary (Payable)'}</span>
          <span class="amt">৳ ${slipNum(netSalary)}</span>
        </div>
        <div class="words">${bn ? 'কথায়' : 'In Words'}: <strong>${inWords}</strong></div>

        ${lateDetailHtml}

        <div class="signatures">
          <div class="sig">
            <div class="line"></div>
            <div class="sig-name">${recipientName}</div>
            <div class="role">${recipientRole}</div>
          </div>
          <div class="sig">
            <div class="line"></div>
            <div class="sig-name">${accountantName || '&nbsp;'}</div>
            <div class="role">${accountantRole}</div>
          </div>
          <div class="sig">
            <div class="line"></div>
            <div class="sig-name">${approverName}</div>
            <div class="role">${approverRole}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        ${bn ? 'এটি কম্পিউটার-জেনারেটেড একটি অফিসিয়াল বেতন স্লিপ। স্বাক্ষর ছাড়াও বৈধ।' : 'This is a computer-generated official salary slip. Valid without signature.'}
        <div class="gen">${bn ? 'জেনারেটর' : 'Generated by'}: ${instName} • ${issueDate}</div>
      </div>
    </div>
    </body></html>`;

    return {
      html,
      fname,
      slipId,
      record,
      staffMember,
      netSalary,
    };
  };

  // Open salary slip preview & print modal (instant on mobile and desktop)
  const printSlip = (staffMember: any, record: any) => {
    try {
      const data = buildSalarySlip(staffMember, record);
      setSlipModal({
        staff: staffMember,
        record: data.record,
        html: data.html,
        filename: data.fname,
        slipId: data.slipId,
        monthLabel: getMonthLabel(`${selectedYear}-${selectedMonth}`),
      });
    } catch (err) {
      console.error('Failed to generate salary slip preview', err);
      toast.error(bn ? 'স্লিপ তৈরিতে সমস্যা হয়েছে' : 'Failed to generate salary slip');
    }
  };

  // Triggers print: on desktop, prints the preview iframe directly. On mobile, opens the dedicated 210mm A4 printable window.
  const handlePrintSlip = () => {
    if (!slipModal) return;
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    if (!isMobile) {
      try {
        const ifr = previewIframeRef.current;
        if (ifr && ifr.contentWindow) {
          ifr.contentWindow.focus();
          ifr.contentWindow.print();
          return;
        }
      } catch (err) {
        console.warn('Direct iframe print failed, falling back to standalone print', err);
      }
    }
    const returnUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?year=${selectedYear}&month=${selectedMonth}`
      : undefined;
    printSalarySlipHtml(slipModal.html, slipModal.staff?.name_en || slipModal.staff?.name_bn, returnUrl);
  };

  // Helper: get month name from month_year string
  const getMonthLabel = (my: string) => {
    const [y, m] = my.split('-');
    const mo = MONTHS.find(mm => mm.value === m);
    return bn ? `${mo?.bn} ${toBnDigits(y)}` : `${mo?.en} ${y}`;
  };

  return (
    <>
      <div className="space-y-5">
        {/* Unified Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold tracking-wider uppercase">
                {bn ? 'অর্থ বিভাগ' : 'Finance'}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {bn ? toBnDigits(`${selectedMonth}/${selectedYear}`) : `${selectedMonth}/${selectedYear}`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
              {bn ? 'বেতন ব্যবস্থাপনা' : 'Salary Management'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {bn ? 'প্রতি-মিনিট ভিত্তিক বেতন হিসাব, কর্তন ও পেমেন্ট লেজার' : 'Per-minute payroll computation, deductions & payment ledger'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" /> {bn ? 'সেটিংস' : 'Settings'}
            </Button>
          </div>
        </div>

        {/* KPI Stats Cards — Linear/SaaS Minimalist */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: bn ? 'মোট মূল বেতন' : 'Total Base', value: `৳${bn ? toBnDigits(stats.totalBase.toLocaleString()) : stats.totalBase.toLocaleString()}`, icon: Wallet, color: 'text-foreground' },
            { label: bn ? 'মোট নিট বেতন' : 'Total Net', value: `৳${bn ? toBnDigits(stats.totalNet.toLocaleString()) : stats.totalNet.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: bn ? 'মোট কর্তন' : 'Total Deductions', value: `৳${bn ? toBnDigits(stats.totalDeduction.toLocaleString()) : stats.totalDeduction.toLocaleString()}`, icon: Minus, color: 'text-rose-600 dark:text-rose-400' },
            { label: bn ? 'মোট জমা' : 'Total Savings', value: `৳${bn ? toBnDigits(stats.totalSavings.toLocaleString()) : stats.totalSavings.toLocaleString()}`, icon: Plus, color: 'text-blue-600 dark:text-blue-400' },
            { label: bn ? 'পরিশোধিত' : 'Paid', value: bn ? toBnDigits(stats.paid) : stats.paid, icon: FileText, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: bn ? 'বকেয়া' : 'Pending', value: bn ? toBnDigits(stats.pending) : stats.pending, icon: Calculator, color: 'text-amber-600 dark:text-amber-400' },
          ].map((s, i) => (
            <div key={i}
              className="rounded-xl border border-border/70 bg-card p-4 transition-all duration-150 hover:border-border hover:shadow-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </span>
                <s.icon className={`h-3.5 w-3.5 ${s.color} opacity-70`} />
              </div>
              <p className={`text-xl font-bold tabular-nums tracking-tight leading-none ${s.color}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Committee Staff Exclusion Banner & Toggle */}
        {committeeHiddenCount > 0 && (
          <div className="flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl px-4 py-2.5">
            <CommitteeExclusionNotice
              count={committeeHiddenCount}
              info={committeeInfo}
              hiddenStaff={staffRaw}
              showAll={showCommitteeStaff}
              onToggleShowAll={setShowCommitteeStaff}
            />
          </div>
        )}

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
                <Input type="number" value={selectedYear || ''} onChange={e => setSelectedYear(e.target.value)}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ['salary-attendance'] }),
                      queryClient.invalidateQueries({ queryKey: ['salary-duty-attendance'] }),
                    ]);
                    toast.success(bn ? 'সর্বশেষ উপস্থিতি লোড হয়েছে' : 'Latest attendance loaded');
                  }}
                  title={bn ? 'ক্যাশ উপেক্ষা করে সর্বশেষ উপস্থিতি লোড করুন' : 'Bypass cache and load the latest attendance'}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {bn ? 'উপস্থিতি রিফ্রেশ' : 'Refresh Attendance'}
                </Button>
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
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-400/80 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50 font-medium"
                  onClick={() => setSignedHubOpen(true)}
                  title={bn ? 'স্বাক্ষরিত মূল শীট ও সকল স্টাফের স্লিপ সংরক্ষণ কেন্দ্র' : 'Signed Slips & Master Sheet Vault'}
                >
                  <FileCheck2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  {bn ? 'স্বাক্ষরিত কপি সংরক্ষণ' : 'Signed Docs'}
                  {signedDocsManager.signedCount > 0 && (
                    <Badge className="ml-1.5 px-1.5 py-0 text-[10px] bg-emerald-600 text-white font-mono">
                      {bn ? toBnDigits(signedDocsManager.signedCount) : signedDocsManager.signedCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-400/80 bg-blue-50/80 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/50 font-medium"
                  onClick={() => setExpenseSyncModalOpen(true)}
                  title={bn ? 'হিসাব ব্যবস্থাপনায় (খরচ) বেতন যুক্ত বা বাদ দেওয়ার নিয়ন্ত্রণ' : 'Manage & Sync Salary in Expense Accounts'}
                >
                  <Landmark className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  {bn ? 'হিসাব লিঙ্ক' : 'Expense Sync'}
                  {totalSalaryInExpenses > 0 && (
                    <Badge className="ml-1.5 px-1.5 py-0 text-[10px] bg-blue-600 text-white font-mono">
                      ৳{bn ? toBnDigits(totalSalaryInExpenses.toLocaleString()) : totalSalaryInExpenses.toLocaleString()}
                    </Badge>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={exportExcel}>
                  <Download className="h-3 w-3 mr-1" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportPDF()} disabled={pdfLoading} title={bn ? 'সরাসরি PDF ডাউনলোড করুন' : 'Download PDF directly'}>
                  <Download className="h-3 w-3 mr-1" /> {pdfLoading ? '...' : (bn ? 'PDF ডাউনলোড' : 'Download PDF')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSigDialogOpen(true)} disabled={pdfLoading} title={bn ? 'স্বাক্ষর কাস্টমাইজ করে PDF' : 'PDF with custom signatures'}>
                  <FileText className="h-3 w-3" />
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
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainSalaryTabType)}>
          <SegmentedTabs
            tabs={[
              ...(isFeatureAllowed('tab_salary_disburse') !== false ? [{ key: 'salary', label: bn ? 'বেতন তালিকা' : 'Salary Sheet', icon: Wallet }] : []),
              ...(isFeatureAllowed('tab_bonus') !== false ? [{
                key: 'bonus',
                label: bn ? 'বাৎসরিক বোনাস শিট' : 'Annual Bonus Sheet',
                icon: ((props: any) => (
                  <span className={`inline-flex items-center font-extrabold leading-none ${props.className || ''}`}>
                    <span>৳</span><Plus className="h-3 w-3 -ml-0.5" strokeWidth={3} />
                  </span>
                )) as any,
              }] : []),
              ...(isFeatureAllowed('tab_savings_fund') !== false ? [{
                key: 'savings',
                label: bn ? 'জমার তালিকা' : 'Savings Ledger',
                icon: ((props: any) => (
                  <span className={`inline-flex items-center font-extrabold leading-none ${props.className || ''}`}>
                    <span>৳</span><Plus className="h-3 w-3 -ml-0.5" strokeWidth={3} />
                  </span>
                )) as any,
              }] : []),
            ]}
            value={mainTab}
            onChange={(v) => setMainTab(v as MainSalaryTabType)}
            className="mb-3"
          />

          <TabsContent value="salary">
            {/* Attendance Validation Banner */}
            {(() => {
              const issues = filtered
                .filter((s: any) => !getRecord(s.id))
                .map((s: any) => ({ s, v: getAttendanceValidation(s) }))
                .filter(x => x.v.hasErrors || x.v.hasWarnings);
              if (issues.length === 0) return null;
              const errCount = issues.filter(x => x.v.hasErrors).length;
              const warnCount = issues.length - errCount;
              return (
                <div className={`mb-3 rounded-2xl border p-3 backdrop-blur-sm ${
                  errCount > 0
                    ? 'border-red-300/50 bg-red-50/70 dark:bg-red-950/20 dark:border-red-900/40'
                    : 'border-amber-300/50 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/40'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${errCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${errCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {bn
                          ? `উপস্থিতি ডেটা পরীক্ষা: ${errCount > 0 ? `${toBnDigits(errCount)} জনের ত্রুটি (বেতন বন্ধ)` : ''}${errCount > 0 && warnCount > 0 ? ' • ' : ''}${warnCount > 0 ? `${toBnDigits(warnCount)} জনের সতর্কতা` : ''}`
                          : `Attendance check: ${errCount > 0 ? `${errCount} have errors (blocked)` : ''}${errCount > 0 && warnCount > 0 ? ' • ' : ''}${warnCount > 0 ? `${warnCount} warnings` : ''}`}
                      </div>
                      <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground max-h-28 overflow-y-auto">
                        {issues.slice(0, 6).map(({ s, v }) => (
                          <li key={s.id} className="truncate">
                            <span className={`font-semibold ${v.hasErrors ? 'text-red-600' : 'text-amber-600'}`}>
                              {bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}:
                            </span>{' '}
                            {[...v.errors, ...v.warnings].slice(0, 2).join(' • ')}
                          </li>
                        ))}
                        {issues.length > 6 && (
                          <li className="italic opacity-70">
                            {bn ? `…আরও ${toBnDigits(issues.length - 6)} জন` : `…and ${issues.length - 6} more`}
                          </li>
                        )}
                      </ul>
                      <div className="mt-1.5 text-[10px] text-muted-foreground italic">
                        {bn
                          ? 'ত্রুটি থাকা স্টাফদের বেতন স্বয়ংক্রিয়ভাবে স্কিপ হবে। আগে উপস্থিতি ঠিক করুন।'
                          : 'Staff with errors will be skipped automatically. Fix attendance data first.'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Salary Table */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-card to-transparent rounded-r-2xl z-10" />
                  <div className="w-full overflow-x-auto scrollbar-thin pb-2 salary-table-scroll">
                  <table className="w-full min-w-[1100px] text-sm">

                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40">
                        <th className="px-3.5 py-3 text-left text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'নাম' : 'Name'}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'স্টাফ আইডি' : 'Staff ID'}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'পদবি' : 'Designation'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'ডিউটি' : 'Duty'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মূল বেতন' : 'Base'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'উপ/অনু/বি/ছু' : 'P/A/L/Lv'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'কর্তন' : 'Ded.'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'ওভারটাইম/বোনাস' : 'OT/Bonus'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-blue-600">{bn ? 'জমা' : 'Savings'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-emerald-600">{bn ? 'নিট বেতন' : 'Net'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'স্বাক্ষরিত স্লিপ' : 'Signed Slip'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'পেন্ডিং অবস্থা' : 'Pending Status'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'অ্যাকশন' : 'Actions'}</th>

                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s: any, idx: number) => {
                        const rec = getRecord(s.id);
                        const snap = getSalaryDisplaySnapshot(s, rec);
                        const attStats = snap.stats;
                        const displayRecord = snap.record;
                        const isPaid = snap.isPaid;
                        const isAdditive = snap.isAdditive;
                        const totalDed = getSalaryDisplayTotalDeduction(snap);
                        // ওভারটাইম কলামে বোনাসও অন্তর্ভুক্ত — কাউকে বোনাস দিলে এখানেই দেখাবে
                        const displayOvertime = Number(displayRecord.overtime || 0) + Number(displayRecord.bonus || 0);
                        const displayNet = Number(displayRecord.net_salary || 0);

                        const validation = !rec ? getAttendanceValidation(s) : null;
                        const eligibilityReason = !rec
                          ? (validation?.errors[0] || validation?.warnings[0] || getEligibilityReason(s))
                          : null;
                        const isHardBlocked = !rec && (validation?.hasErrors ?? false);

                        return (
                          <tr key={s.id} className="border-b border-border/40 hover:bg-muted/35 transition-colors duration-150">
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
                                    value={serialDraft || ''}
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
                                const sourceLabel = t.source === 'special'
                                  ? (bn ? 'উৎস: বিশেষ ডিউটি শিফট' : 'Source: Special duty shift')
                                  : (bn ? 'উৎস: ডিপার্টমেন্ট শিফট' : 'Source: Department shift');
                                const dot = t.source === 'special' ? 'text-purple-600' : 'text-emerald-600';
                                return (
                                  <span className="text-[10px] text-primary" title={sourceLabel}>
                                    {bn ? toBnDigits(`${fmt(t.start)}-${fmt(t.end)}`) : `${fmt(t.start)}-${fmt(t.end)}`}
                                    <span className={`ml-1 text-[8px] ${dot}`}>●</span>
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2 text-right">৳{bn ? toBnDigits(Number(displayRecord?.base_salary ?? getEffectiveSalary(s)).toLocaleString()) : Number(displayRecord?.base_salary ?? getEffectiveSalary(s)).toLocaleString()}</td>
                            <td className="px-3 py-2 text-center">
                              {(() => {
                                // Pending rows use live attendance; paid rows use the saved snapshot.
                                const dispPresent = attStats.present;
                                const dispAbsent = attStats.absent;
                                const dispLate = attStats.late;
                                 const dispLeave = attStats.leave || 0;
                                 const lastUpd = getAttendanceLastUpdated(s);
                                 const upTitle = lastUpd
                                   ? (bn ? 'উপস্থিতি শেষ আপডেট' : 'Attendance last updated') + ': ' +
                                       formatDateTimeInTz(lastUpd, appTz)
                                   : (bn ? 'এই মাসে কোনো উপস্থিতি রেকর্ড নেই' : 'No attendance records this month');
                                 const upShort = lastUpd
                                   ? formatDateInTz(lastUpd, appTz, { day: '2-digit', month: '2-digit' }) + ' ' +
                                       formatTimeInTz(lastUpd, appTz, { hour: '2-digit', minute: '2-digit', hour12: false })
                                   : '';
                                 return (
                                   <div className="flex flex-col items-center gap-0.5">
                                   <button
                                     onClick={() => setAttendanceDetailDialog({ staff: s, stats: attStats })}
                                     className="hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                                     title={bn ? 'বিস্তারিত দেখুন' : 'View details'}
                                   >
                                     <span className="text-emerald-600">{bn ? toBnDigits(dispPresent) : dispPresent}</span>/
                                     <span className="text-red-500">{bn ? toBnDigits(dispAbsent) : dispAbsent}</span>/
                                     <span className="text-yellow-600">{bn ? toBnDigits(dispLate) : dispLate}</span>/
                                     <span className="text-blue-600">{bn ? toBnDigits(dispLeave) : dispLeave}</span>
                                     {attStats.halfDay > 0 && (
                                       <span className="text-[9px] text-orange-600 ml-1 font-medium" title={bn ? 'অর্ধদিন' : 'Half day'}>½{bn ? toBnDigits(attStats.halfDay) : attStats.halfDay}</span>
                                     )}
                                     {attStats.totalLateArrivalMinutes > 0 && (
                                       <span className="text-[9px] text-yellow-600 ml-1" title={bn ? 'লেইট আসা' : 'Late arrival'}>↓{bn ? toBnDigits(attStats.totalLateArrivalMinutes) : attStats.totalLateArrivalMinutes}{bn ? 'মি.' : 'm'}</span>
                                     )}
                                     {attStats.totalEarlyExitMinutes > 0 && (
                                       <span className="text-[9px] text-orange-600 ml-0.5" title={bn ? 'আগাম যাওয়া' : 'Early exit'}>↑{bn ? toBnDigits(attStats.totalEarlyExitMinutes) : attStats.totalEarlyExitMinutes}{bn ? 'মি.' : 'm'}</span>
                                     )}
                                   </button>
                                   <span className={`text-[8px] leading-none ${lastUpd ? 'text-muted-foreground' : 'text-amber-500'}`} title={upTitle}>
                                     {lastUpd
                                       ? (bn ? 'আপডেট: ' + toBnDigits(upShort) : 'Upd: ' + upShort)
                                       : (bn ? 'রেকর্ড নেই' : 'No data')}
                                   </span>
                                   </div>
                                 );
                              })()}
                            </td>
                            <td className="px-3 py-2 text-right text-red-500">
                              {(() => {
                                const advD = Number(displayRecord?.advance_deduction || 0);
                                const savD = Number(snap.savingsDisplay || 0);
                                const bonusV = Number(displayRecord?.bonus || 0);
                                const otherA = Number(displayRecord?.other_allowance || 0);
                                const baseV = Number(displayRecord?.base_salary ?? getEffectiveSalary(s));
                                const otV = Number(displayRecord?.overtime || 0);
                                 // Always surface the REAL absence/late amounts so they are
                                 // visible in the breakdown. In additive mode they are already
                                 // baked into the lower "earned" figure, so they must NOT be
                                 // re-added to the money-removed total (sumDed) — otherwise the
                                 // deduction total would exceed the base salary.
                                 const absD = Number(displayRecord?.absence_deduction || 0);
                                 const lateD = Number(displayRecord?.late_deduction || 0);
                                 const otherD = Number(displayRecord?.other_deduction || 0);
                                 const dutyD = Number(displayRecord?.duty_deduction || 0);
                                 const earnedV = Number((displayRecord as any).earned_from_attendance || 0);
                                 const unearnedV = isAdditive ? Math.max(0, baseV - earnedV) : 0;
                                 const sumDed = totalDed;
                                const expectedNet = isAdditive
                                  ? displayNet
                                   : Math.max(0, baseV - absD - lateD - otherD - dutyD + otV + bonusV + otherA - advD - savD);
                                const mismatch = Math.abs(expectedNet - displayNet) > 1;
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        className={`hover:underline decoration-dotted underline-offset-2 ${mismatch ? 'ring-1 ring-red-400 rounded px-1' : ''}`}
                                        title={bn ? 'কর্তন ব্রেকডাউন দেখুন' : 'View deduction breakdown'}
                                      >
                                        ৳{bn ? toBnDigits(totalDed.toLocaleString()) : totalDed.toLocaleString()}
                                        {snap.isLive && totalDed > 0 ? <span className="text-[8px] ml-0.5 opacity-60">~</span> : ''}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-72 p-0 rounded-2xl overflow-hidden">
                                      <div className="px-4 py-2.5 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 border-b">
                                        <div className="text-xs font-bold text-red-700 dark:text-red-300">
                                          {bn ? 'কর্তন ব্রেকডাউন' : 'Deduction Breakdown'}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">{bn ? s.name_bn : (s.name_en || s.name_bn)}</div>
                                      </div>
                                      <div className="px-4 py-3 space-y-1.5 text-xs">
                                        {[
                                          { lbl: bn ? 'অনুপস্থিতি' : 'Absence', v: absD, k: 'abs' },
                                          { lbl: bn ? 'বিলম্ব (মিনিট)' : 'Late (min)', v: lateD, k: 'late' },
                                          { lbl: bn ? 'ডিউটি শিফট' : 'Duty Shift', v: dutyD, k: 'duty' },
                                          { lbl: bn ? 'অগ্রিম' : 'Advance', v: advD, k: 'adv' },
                                          { lbl: bn ? 'সঞ্চয় (জমা)' : 'Savings', v: savD, k: 'sav', blue: true },
                                          { lbl: bn ? 'ম্যানুয়াল/অন্যান্য' : 'Manual / Other', v: otherD, k: 'other' },
                                        ].map(row => (
                                          <div key={row.k} className="flex justify-between items-center">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                              <Minus className="h-2.5 w-2.5 opacity-60" />{row.lbl}
                                              {row.info && row.v > 0 && (
                                                <span className="text-[9px] text-amber-600">{bn ? '(অনার্জিত)' : '(unearned)'}</span>
                                              )}
                                            </span>
                                            <span className={`font-mono ${row.v > 0 ? (row.blue ? 'text-blue-600' : 'text-red-600') : 'text-muted-foreground/50'}`}>
                                              ৳{bn ? toBnDigits(row.v.toLocaleString()) : row.v.toLocaleString()}
                                            </span>
                                          </div>
                                        ))}
                                        <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t font-bold">
                                          <span>{bn ? 'মোট কর্তন' : 'Total Deduction'}</span>
                                          <span className="font-mono text-red-700">৳{bn ? toBnDigits(sumDed.toLocaleString()) : sumDed.toLocaleString()}</span>
                                        </div>
                                      </div>
                                      <div className="px-4 py-2.5 bg-muted/40 border-t space-y-1 text-[11px]">
                                        <div className="flex justify-between"><span className="text-muted-foreground">{bn ? 'মূল বেতন' : 'Base'}</span><span className="font-mono">৳{bn ? toBnDigits(baseV.toLocaleString()) : baseV.toLocaleString()}</span></div>
                                        {isAdditive && unearnedV > 0 && (
                                          <>
                                            <div className="flex justify-between text-amber-600">
                                              <span className="text-muted-foreground">− {bn ? 'অনার্জিত (হাজিরা নেই/অনুপস্থিত দিন)' : 'Unearned (no attendance / absent days)'}</span>
                                              <span className="font-mono">৳{bn ? toBnDigits(unearnedV.toLocaleString()) : unearnedV.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-emerald-700">
                                              <span className="text-muted-foreground">= {bn ? 'অর্জিত (উপস্থিত দিনের আয়)' : 'Earned (present days)'}</span>
                                              <span className="font-mono">৳{bn ? toBnDigits(earnedV.toLocaleString()) : earnedV.toLocaleString()}</span>
                                            </div>
                                          </>
                                        )}
                                        {(otV > 0 || bonusV > 0 || otherA > 0) && (
                                          <div className="flex justify-between text-emerald-700">
                                            <span className="text-muted-foreground">+ {bn ? 'ওভারটাইম/বোনাস/ভাতা' : 'OT / Bonus / Allow'}</span>
                                            <span className="font-mono">৳{bn ? toBnDigits((otV + bonusV + otherA).toLocaleString()) : (otV + bonusV + otherA).toLocaleString()}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between text-red-600">
                                          <span className="text-muted-foreground">− {bn ? 'মোট কর্তন' : 'Total Ded.'}</span>
                                          <span className="font-mono">৳{bn ? toBnDigits(sumDed.toLocaleString()) : sumDed.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t mt-1 font-bold">
                                          <span>{bn ? 'প্রত্যাশিত নিট' : 'Expected Net'}</span>
                                          <span className="font-mono text-emerald-700">৳{bn ? toBnDigits(expectedNet.toLocaleString()) : expectedNet.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">{bn ? 'প্রদর্শিত নিট' : 'Shown Net'}</span>
                                          <span className={`font-mono ${mismatch ? 'text-red-600 font-bold' : 'text-emerald-700'}`}>
                                            ৳{bn ? toBnDigits(displayNet.toLocaleString()) : displayNet.toLocaleString()}
                                          </span>
                                        </div>
                                        {mismatch && (
                                          <div className="mt-1.5 px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {bn ? 'সম্ভাব্য ডাবল-কাট! Recalculate চাপুন।' : 'Possible double-deduction! Click Recalculate.'}
                                          </div>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                );
                              })()}
                            </td>

                            <td className="px-3 py-2 text-right text-blue-600">
                              ৳{bn ? toBnDigits(displayOvertime.toLocaleString()) : displayOvertime.toLocaleString()}{snap.isLive && displayOvertime > 0 ? <span className="text-[8px] ml-0.5 opacity-60">~</span> : ''}
                            </td>
                            {/* Savings Column */}
                            <td className="px-3 py-2 text-right">
                              {snap.savingsDisplay > 0 ? (
                                <button onClick={() => {
                                  const existingConfig = savingsConfigs.find((c: any) => c.staff_id === s.id && c.is_active);
                                  const rawStart = existingConfig?.start_month || monthYear;
                                  setSavingsDialog({
                                    staff_id: s.id,
                                    staff_name: s.name_bn || s.name_en,
                                    staff_joining_date: s.joining_date,
                                    ...(existingConfig || { monthly_amount: 0, duration_months: 6 }),
                                    start_month: rawStart,
                                    id: existingConfig?.id,
                                  });
                                }}>
                                  <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 cursor-pointer text-[10px]">
                                    ৳{bn ? toBnDigits(snap.savingsDisplay.toLocaleString()) : snap.savingsDisplay.toLocaleString()}
                                  </Badge>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSavingsDialog({
                                      staff_id: s.id,
                                      staff_name: s.name_bn || s.name_en,
                                      staff_joining_date: s.joining_date,
                                      monthly_amount: 0,
                                      duration_months: 6,
                                      start_month: monthYear,
                                    });
                                  }}
                                  className="text-[10px] text-muted-foreground hover:text-blue-600 transition-colors"
                                >
                                  <Plus className="h-3 w-3 inline" />
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                              {!rec && Number(attStats.total || 0) === 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-amber-300 text-amber-600 dark:text-amber-400"
                                  title={bn
                                    ? 'এই মাসে এই স্টাফের কোনো হাজিরা এন্ট্রি নেই, তাই বেতন হিসাব হয়নি।'
                                    : 'No attendance entries for this staff this month, so no salary is computed.'}
                                >
                                  {bn ? 'উপস্থিতি নেই' : 'No attendance'}
                                </Badge>
                              ) : (
                                <>৳{bn ? toBnDigits(displayNet.toLocaleString()) : displayNet.toLocaleString()}{!rec ? <span className="text-[8px] ml-0.5 opacity-60">~</span> : ''}</>
                              )}
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
                            <td className="px-2 py-2 text-center">
                              {(() => {
                                const slip = signedDocsManager.getStaffSlip(s.id);
                                if (slip) {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold gap-1 rounded-full shadow-sm"
                                      title={bn ? 'স্বাক্ষরিত স্লিপ দেখুন / ডাউনলোড করুন' : 'View / Download Signed Slip'}
                                      onClick={() => setDirectViewStaff(s)}
                                    >
                                      <FileCheck2 className="h-3 w-3 text-emerald-600" />
                                      <span>{bn ? 'সংরক্ষিত' : 'Saved'}</span>
                                    </Button>
                                  );
                                }
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 text-muted-foreground font-normal gap-1 rounded-full"
                                    title={bn ? 'স্বাক্ষর নেয়ার পর স্ক্যান বা ছবি আপলোড করুন' : 'Upload / Scan Signed Slip'}
                                    onClick={() => setDirectUploadStaff(s)}
                                  >
                                    <Camera className="h-2.5 w-2.5 text-slate-500 hover:text-emerald-600" />
                                    <span>{bn ? 'আপলোড' : 'Upload'}</span>
                                  </Button>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {rec && isRecordPending(rec.id) && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse text-[10px]">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {bn ? 'অ্যাডমিন অনুমোদনের অপেক্ষায়' : 'Awaiting Admin Approval'}
                                </Badge>
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
                                    {canEditItem && (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className={`h-6 w-6 ${isRecordPending(rec.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                                        disabled={isRecordPending(rec.id)}
                                        onClick={() => setEditDialog({ ...displayRecord, id: rec.id, staffName: s.name_bn })}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {canEditItem && rec.status !== 'paid' && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-indigo-600 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 disabled:opacity-40"
                                        title={bn ? 'তারিখ/যোগদান পরিবর্তনের পর শুধু এই স্টাফের বেতন পুনরায় হিসাব করুন' : 'Recalculate salary for this staff only'}
                                        disabled={recalculateSingleMutation.isPending}
                                        onClick={() => recalculateSingleMutation.mutate(s.id)}
                                      >
                                        <RefreshCw className={`h-3 w-3 ${recalculateSingleMutation.isPending ? 'animate-spin' : ''}`} />
                                      </Button>
                                    )}
                                    {isFeatureAllowed('action_payslip_print') !== false && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                        title={bn ? 'বেতন স্লিপ দেখুন, প্রিন্ট ও ডাউনলোড করুন' : 'View, Print & Download Salary Slip'}
                                        onClick={() => printSlip(s, rec)}
                                      >
                                        <Printer className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {rec.status !== 'paid' ? (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className={`h-6 w-6 text-yellow-600 hover:bg-yellow-100/60 dark:hover:bg-yellow-900/30 ${isRecordPending(rec.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                                        disabled={isRecordPending(rec.id)}
                                        title={bn ? 'পরিশোধিত করুন' : 'Mark Paid'} 
                                        onClick={() => {
                                          setPaidConfirmId(rec.id);
                                          setPayAddToExpense(getSetting('expense_location')?.auto_add_to_expenses !== false);
                                        }}
                                      >
                                        <Clock className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className={`h-6 w-6 text-emerald-600 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 ${isRecordPending(rec.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                                        disabled={isRecordPending(rec.id)}
                                        title={bn ? 'অপরিশোধিত করুন' : 'Mark Unpaid'} 
                                        onClick={() => setUnpaidConfirmId(rec.id)}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    {rec.status === 'paid' && (() => {
                                      const staffExpense = getStaffExpense(s.id, s.name_bn || s.name_en);
                                      if (staffExpense) {
                                        return (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-emerald-600 hover:text-red-600 hover:bg-red-100/60 dark:hover:bg-red-950/30"
                                            title={bn ? 'হিসাব ব্যবস্থাপনায় খরচ যুক্ত আছে। ক্লিক করলে হিসাব থেকে বাদ দেওয়া হবে।' : 'Linked in expenses. Click to remove from expenses.'}
                                            disabled={removeStaffExpenseMutation.isPending}
                                            onClick={() => removeStaffExpenseMutation.mutate({ staffId: s.id, staffName: s.name_bn || s.name_en || 'Staff' })}
                                          >
                                            <Landmark className="h-3 w-3" />
                                          </Button>
                                        );
                                      }
                                      if (consolidatedExpense) {
                                        return (
                                          <span
                                            title={bn ? 'মাসের মোট বেতনের একক ভাউচারে হিসাবভুক্ত' : 'Included in monthly total salary expense voucher'}
                                            className="inline-flex items-center text-[10px] text-blue-600 dark:text-blue-400 px-1 font-mono font-medium"
                                          >
                                            <Building2 className="h-3 w-3 mr-0.5" />
                                          </span>
                                        );
                                      }
                                      return (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 text-amber-600 hover:text-emerald-700 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/30"
                                          title={bn ? 'হিসাবে এখনো যুক্ত হয়নি। ক্লিক করে হিসাব ব্যবস্থাপনায় খরচ যোগ করুন।' : 'Not in expenses. Click to add to expenses.'}
                                          disabled={addStaffExpenseMutation.isPending}
                                          onClick={() => addStaffExpenseMutation.mutate({ staffId: s.id, recordId: rec.id })}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      );
                                    })()}
                                    {canDeleteItem && isFeatureAllowed('action_delete_salary') !== false && (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className={`h-6 w-6 text-red-600 hover:bg-red-100/60 dark:hover:bg-red-900/30 ${isRecordPending(rec.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                                        disabled={isRecordPending(rec.id)}
                                        title={bn ? 'আনজেনারেট (মুছুন)' : 'Ungenerate'} 
                                        onClick={() => setUngenerateConfirmId(rec.id)}
                                      >
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
                          <td colSpan={5} className="px-3 py-2">{bn ? 'মোট' : 'Total'}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">৳{bn ? toBnDigits(stats.totalBase.toLocaleString()) : stats.totalBase.toLocaleString()}</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-right text-red-500 whitespace-nowrap tabular-nums">৳{bn ? toBnDigits(stats.totalDeduction.toLocaleString()) : stats.totalDeduction.toLocaleString()}</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-right text-blue-600 whitespace-nowrap tabular-nums">৳{bn ? toBnDigits(stats.totalSavings.toLocaleString()) : stats.totalSavings.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap tabular-nums">৳{bn ? toBnDigits(stats.totalNet.toLocaleString()) : stats.totalNet.toLocaleString()}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  </div>
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
                    <Input type="number" className="w-24 h-8 text-sm" value={bonusYear || ''}
                      onChange={e => setBonusYear(e.target.value)} min="2020" max="2040" />
                    <Button size="sm" variant="outline" onClick={() => {
                      const bData = activeStaff.map((s: any, i: number) => {
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
                            {activeStaff.map((s: any, idx: number) => {
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
                              <td colSpan={3} className="px-3 py-2">{bn ? 'মোট' : 'Total'} ({bn ? toBnDigits(activeStaff.length) : activeStaff.length} {bn ? 'জন' : 'staff'})</td>
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
                {activeStaff.length === 0 && (
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
              <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Landmark className="h-5 w-5 text-blue-600" />
                    {bn ? 'জমার তালিকা ও লেজার (Savings Ledger)' : 'Savings Ledger'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn
                      ? `সর্বমোট ${toBnDigits(totalSavingsCount)} জন স্টাফ ও শিক্ষক (${toBnDigits(activeSavingsCount)} জন বর্তমান, ${toBnDigits(resignedSavingsCount)} জন পদত্যাগকৃত)`
                      : `Total ${totalSavingsCount} staff & teachers (${activeSavingsCount} active, ${resignedSavingsCount} resigned)`}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  onClick={() => setSavingsDialog({
                    staff_id: '',
                    staff_name: '',
                    monthly_amount: 1000,
                    duration_months: 6,
                    start_month: monthYear,
                    is_active: true,
                  })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {bn ? 'নতুন জমা সেটআপ' : 'New Savings Setup'}
                </Button>
              </CardHeader>

              {/* Sub-filters & Search Toolbar */}
              <div className="px-4 py-2.5 border-b bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSavingsFilter('all')}
                    className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                      savingsFilter === 'all'
                        ? 'bg-white dark:bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {bn ? `সকল স্টাফ (${toBnDigits(totalSavingsCount)})` : `All (${totalSavingsCount})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingsFilter('active')}
                    className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                      savingsFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {bn ? `বর্তমান কর্মরত (${toBnDigits(activeSavingsCount)})` : `Active (${activeSavingsCount})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingsFilter('resigned')}
                    className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                      savingsFilter === 'resigned'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🚪 {bn ? `পদত্যাগকৃত (${toBnDigits(resignedSavingsCount)})` : `Resigned (${resignedSavingsCount})`}
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={bn ? 'নাম বা আইডি দিয়ে খুঁজুন...' : 'Search by name or ID...'}
                    value={savingsSearch}
                    onChange={(e) => setSavingsSearch(e.target.value)}
                    className="h-8 text-xs pl-8 pr-3 bg-white dark:bg-card"
                  />
                </div>
              </div>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-blue-50/50 dark:bg-blue-900/10">
                        <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'নাম' : 'Staff Name'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মাসিক জমা' : 'Monthly'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'মেয়াদ (শুরু – শেষ)' : 'Period (Start – End)'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'সময়কাল' : 'Duration'}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium">{bn ? 'মোট জমা' : 'Total Saved'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'বাকি মাস' : 'Remaining'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">{bn ? 'মাসভিত্তিক বিবরণ' : 'Monthly Breakdown'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedSavings.length === 0 ? (
                        <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                          <PiggyBank className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>{bn ? 'কোনো স্টাফ বা শিক্ষক পাওয়া যায়নি' : 'No staff or teachers found'}</p>
                          <p className="text-xs mt-1">
                            {savingsSearch
                              ? (bn ? 'অনুসন্ধানের সাথে কোনো মিল পাওয়া যায়নি' : 'No matching results')
                              : (bn ? 'উপরে "নতুন জমা সেটআপ" বাটনে ক্লিক করে জমা চালু করতে পারেন' : 'Click "New Savings Setup" above to start savings')}
                          </p>
                        </td></tr>
                      ) : displayedSavings.map((item, idx: number) => {
                        const remaining = Math.max(0, item.durationMonths - item.depositedMonthsCount);

                        return (
                          <tr
                            key={item.staff_id}
                            className={`border-b transition-colors ${
                              item.isResigned
                                ? 'bg-red-50/25 dark:bg-red-950/10 hover:bg-red-50/50 dark:hover:bg-red-950/20 border-l-4 border-l-red-500'
                                : 'hover:bg-muted/30'
                            }`}
                          >
                            <td className="px-3 py-2 text-muted-foreground">{bn ? toBnDigits(idx + 1) : idx + 1}</td>
                            <td className="px-3 py-2 font-medium">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLedgerStaffId(item.staff_id)}
                                  className="group inline-flex items-center gap-1.5 text-left text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline"
                                  title={bn ? 'ক্লিক করে জমার বিস্তারিত লেজার ও মিসিং মাস দেখুন' : 'Click to view deposit ledger and missing months'}
                                >
                                  <span>{item.staffMember?.name_bn || item.staffMember?.name_en || '-'}</span>
                                  <History className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </button>
                                {item.isResigned && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-red-100/80 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300 font-semibold gap-1 py-0 px-1.5"
                                  >
                                    <UserMinus className="h-2.5 w-2.5" />
                                    {bn ? 'পদত্যাগকৃত' : 'Resigned'}
                                    {item.resignDate ? ` (${item.resignDate})` : ''}
                                  </Badge>
                                )}
                              </div>
                              {item.staffMember?.designation && (
                                <div className="text-[11px] text-muted-foreground font-normal">
                                  {item.staffMember.designation} {item.staffMember?.staff_id ? `• ${item.staffMember.staff_id}` : ''}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {item.monthlyAmount > 0 ? (
                                <span className="text-blue-700 dark:text-blue-400 font-semibold">
                                  ৳{bn ? toBnDigits(Number(item.monthlyAmount).toLocaleString()) : Number(item.monthlyAmount).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                              {item.primaryConfig?.start_month ? (
                                <span className="font-medium text-foreground">
                                  {getMonthLabel(item.startMonth)} – {getMonthLabel(getEndMonthFromStart(item.startMonth, item.durationMonths))}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                              {item.durationMonths > 0 ? (
                                <span>{bn ? toBnDigits(item.durationMonths) : item.durationMonths} {bn ? 'মাস' : 'months'}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              {item.totalSaved > 0 ? (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  ৳{bn ? toBnDigits(item.totalSaved.toLocaleString()) : item.totalSaved.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-normal">৳০</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                              {item.durationMonths > 0 ? (
                                item.isComplete ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
                                    {bn ? 'সম্পূর্ণ' : 'Complete'}
                                  </Badge>
                                ) : (
                                  <span>{bn ? toBnDigits(remaining) : remaining} {bn ? 'মাস' : 'mo'}</span>
                                )
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {item.isResigned ? (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 text-[10px]">
                                    🚪 {bn ? 'অব্যাহতি' : 'Left'}
                                  </Badge>
                                ) : item.primaryConfig ? (
                                  <Badge className={item.isActive 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]'
                                    : item.isComplete
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]'
                                    : 'bg-muted text-muted-foreground text-[10px]'}>
                                    {item.isActive ? (bn ? 'চলমান' : 'Active') : item.isComplete ? (bn ? 'সম্পূর্ণ' : 'Done') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground border-dashed text-[10px]">
                                    {bn ? 'সেটআপ নেই' : 'No Setup'}
                                  </Badge>
                                )}
                                {item.primaryConfig && isRecordPending(item.primaryConfig?.id) && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse text-[9px] px-1 py-0">
                                    <Clock className="w-2.5 h-2.5 mr-0.5" />
                                    {bn ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval'}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1.5 max-w-[280px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge 
                                    variant="secondary" 
                                    className="cursor-pointer bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 text-[11px] font-semibold py-0.5 px-2"
                                    onClick={() => setSelectedLedgerStaffId(item.staff_id)}
                                    title={bn ? 'লেজার খুলুন' : 'Open ledger'}
                                  >
                                    <PiggyBank className="h-3 w-3 mr-1 text-blue-600" />
                                    {bn ? `${toBnDigits(item.depositedMonthsCount)} মাস জমা` : `${item.depositedMonthsCount} months deposited`}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5 text-[10px] text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                    onClick={() => setSelectedLedgerStaffId(item.staff_id)}
                                    title={bn ? 'মিসিং মাস চেক করুন বা নতুন ডিপোজিট যোগ করুন' : 'Check missing months or add deposit'}
                                  >
                                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                                    {bn ? 'মিসিং / যোগ' : 'Missing / Add'}
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {item.ledgerEntries.length === 0 ? (
                                    <span className="text-xs text-muted-foreground">{bn ? 'এখনো কোনো কর্তন হয়নি' : 'No deductions yet'}</span>
                                  ) : (
                                    item.ledgerEntries.slice(0, 5).map((entry: any) => (
                                      <Badge key={entry.id} variant="outline" className="text-[9px] bg-blue-50/50 dark:bg-blue-900/10">
                                        {getMonthLabel(entry.month_year)}
                                      </Badge>
                                    ))
                                  )}
                                  {item.ledgerEntries.length > 5 && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-[9px] cursor-pointer hover:bg-muted"
                                      onClick={() => setSelectedLedgerStaffId(item.staff_id)}
                                    >
                                      +{bn ? toBnDigits(item.ledgerEntries.length - 5) : item.ledgerEntries.length - 5} {bn ? 'আরো' : 'more'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex gap-1 justify-center items-center flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[10px] text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800"
                                  onClick={() => setSelectedLedgerStaffId(item.staff_id)}
                                  title={bn ? 'বিস্তারিত লেজার ও মিসিং মাস' : 'View Ledger'}
                                >
                                  <History className="h-3 w-3 mr-1" /> {bn ? 'লেজার' : 'Ledger'}
                                </Button>
                                {item.totalSaved > 0 && !item.primaryConfig?.disbursed_at && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[10px] border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                    onClick={() => {
                                      setDisburseDialog({
                                        config: item.primaryConfig || { id: '', staff_id: item.staff_id, total_saved: item.totalSaved },
                                        staff_name: item.staffMember?.name_bn || item.staffMember?.name_en || '-',
                                        amount: item.totalSaved,
                                        categoryId: '',
                                        institutionId: '',
                                        note: item.isResigned ? (bn ? 'পদত্যাগকালীন ডিপোজিট সম্পূর্ণ পরিশোধ' : 'Settlement upon resignation') : '',
                                      });
                                    }}
                                    title={bn ? 'মোট পরিশোধ' : 'Disburse Total'}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" /> {bn ? 'পরিশোধ' : 'Pay'}
                                  </Button>
                                )}
                                {item.primaryConfig?.disbursed_at && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]" title={new Date(item.primaryConfig.disbursed_at).toLocaleString()}>
                                    {bn ? 'পরিশোধিত' : 'Paid'}
                                  </Badge>
                                )}
                                {item.primaryConfig ? (
                                  <>
                                    {canEditItem && (
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-6 w-6" 
                                      title={bn ? 'সেটিংস সম্পাদনা' : 'Edit Settings'}
                                      onClick={() => {
                                        const rawStart = item.primaryConfig?.start_month || item.startMonth || monthYear;
                                        setSavingsDialog({
                                          ...item.primaryConfig, 
                                          staff_name: item.staffMember?.name_bn || item.staffMember?.name_en || '-',
                                          staff_joining_date: item.staffMember?.joining_date,
                                          start_month: rawStart,
                                        });
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    )}
                                    {canDeleteItem && (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" 
                                        title={bn ? 'মুছে ফেলুন' : 'Delete'}
                                        onClick={() => setDeleteSavingsId(item.primaryConfig?.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </>
                                ) : canEditItem ? (
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1"
                                    onClick={() => {
                                      setSavingsDialog({
                                        staff_id: item.staff_id,
                                        staff_name: item.staffMember?.name_bn || item.staffMember?.name_en || '',
                                        staff_joining_date: item.staffMember?.joining_date,
                                        monthly_amount: 1000,
                                        duration_months: 6,
                                        start_month: monthYear,
                                        is_active: true,
                                      });
                                    }}
                                    title={bn ? 'জমা চালু করুন' : 'Setup Savings'}
                                  >
                                    <Plus className="h-3 w-3" /> {bn ? 'সেটআপ' : 'Setup'}
                                  </Button>
                                ) : null}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-blue-600" />
                {bn ? 'বেতন জমা / সঞ্চয় সেটিংস' : 'Savings Setup'}
              </DialogTitle>
            </DialogHeader>
            {savingsDialog && (() => {
              const selectedStaff = (staff as any[]).find((s: any) => s.id === savingsDialog.staff_id) || (staffRaw as any[]).find((s: any) => s.id === savingsDialog.staff_id);
              const sJoiningMonth = getJoiningMonth(savingsDialog.staff_joining_date || selectedStaff?.joining_date);
              const sStartMonth = savingsDialog.start_month || monthYear;
              const sDuration = Math.max(1, Number(savingsDialog.duration_months) || 1);
              const sEndMonth = getEndMonthFromStart(sStartMonth, sDuration);

              return (
                <div className="space-y-4">
                  {savingsDialog.staff_name ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-1">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{savingsDialog.staff_name}</p>
                      {sJoiningMonth && (
                        <p className="text-xs text-muted-foreground font-medium">
                          📅 {bn ? `যোগদান: ${formatMonthLabel(sJoiningMonth, true)}` : `Joined: ${formatMonthLabel(sJoiningMonth, false)}`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs">{bn ? 'স্টাফ নির্বাচন করুন' : 'Select Staff'}</Label>
                      <Select
                        value={savingsDialog.staff_id || ''}
                        onValueChange={(sid) => {
                          const found = (staff as any[]).find((s: any) => s.id === sid) || (staffRaw as any[]).find((s: any) => s.id === sid);
                          setSavingsDialog({
                            ...savingsDialog,
                            staff_id: sid,
                            staff_name: found?.name_bn || found?.name_en || '',
                            staff_joining_date: found?.joining_date,
                            start_month: savingsDialog.start_month || monthYear,
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={bn ? 'স্টাফ বাছাই করুন' : 'Choose staff'} />
                        </SelectTrigger>
                        <SelectContent>
                          {(staff as any[]).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name_bn || s.name_en} {s.staff_id_custom ? `(${s.staff_id_custom})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sJoiningMonth && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          📅 {bn ? `যোগদান: ${formatMonthLabel(sJoiningMonth, true)}` : `Joined: ${formatMonthLabel(sJoiningMonth, false)}`}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">{bn ? 'মাসিক জমা (৳)' : 'Monthly Savings Amount (৳)'}</Label>
                    <NumberInput
                      value={savingsDialog.monthly_amount}
                      onValueChange={n => setSavingsDialog({ ...savingsDialog, monthly_amount: n })}
                      placeholder="1000"
                    />
                  </div>

                  {/* Start Month and End Month Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">{bn ? 'শুরু মাস (YYYY-MM)' : 'Start Month'}</Label>
                      <Input
                        type="month"
                        min="2020-01"
                        max="2040-12"
                        value={savingsDialog.start_month || monthYear}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSavingsDialog({ ...savingsDialog, start_month: val });
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">{bn ? 'শেষ মাস (YYYY-MM)' : 'End Month'}</Label>
                      <Input
                        type="month"
                        min={savingsDialog.start_month || "2020-01"}
                        max="2040-12"
                        value={sEndMonth}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const currentStart = savingsDialog.start_month || monthYear;
                          if (val < currentStart) {
                            toast.error(bn ? 'শেষ মাস শুরু মাসের পূর্বে হতে পারে না' : 'End month cannot be earlier than start month');
                            return;
                          }
                          const newDur = getDurationFromRange(currentStart, val);
                          setSavingsDialog({
                            ...savingsDialog,
                            start_month: currentStart,
                            duration_months: Math.max(1, newDur),
                          });
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{bn ? 'সময়কাল (মাস)' : 'Duration (Months)'}</Label>
                      <span className="text-[11px] text-muted-foreground">
                        {bn ? 'শেষ মাস বাছাই করলে স্বয়ংক্রিয় হিসাব হবে' : 'Auto-syncs with end month'}
                      </span>
                    </div>
                    <NumberInput
                      value={savingsDialog.duration_months}
                      onValueChange={n => setSavingsDialog({ ...savingsDialog, duration_months: Math.max(1, n) })}
                      allowDecimal={false}
                      placeholder="6"
                      className="mt-1"
                    />
                  </div>

                  {/* Range & Maturity Preview Card */}
                  <div className="p-3 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-blue-900 dark:text-blue-200">
                      <span className="font-semibold">{bn ? '📅 ডিপোজিট সময়সীমা:' : '📅 Deposit Period:'}</span>
                      <span className="font-bold text-sm">
                        {formatMonthLabel(sStartMonth, bn)} – {formatMonthLabel(sEndMonth, bn)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-blue-200/50 dark:border-blue-800/50">
                      <span>{bn ? 'মোট মাস সংখ্যা:' : 'Total Months:'}</span>
                      <span className="font-bold text-foreground">
                        {bn ? toBnDigits(sDuration) : sDuration} {bn ? 'মাস' : 'months'}
                      </span>
                    </div>
                    {savingsDialog.monthly_amount > 0 && (
                      <div className="flex justify-between items-center text-blue-700 dark:text-blue-300 font-bold pt-1">
                        <span>{bn ? 'মেয়াদ শেষে মোট জমা:' : 'Total saved at maturity:'}</span>
                        <span className="text-base">
                          ৳{bn ? toBnDigits((savingsDialog.monthly_amount * sDuration).toLocaleString()) 
                               : (savingsDialog.monthly_amount * sDuration).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {savingsDialog.id && (
                      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                        <span>{bn ? 'এখন পর্যন্ত জমা:' : 'Saved so far:'}</span>
                        <span>
                          ৳{bn ? toBnDigits(Number(savingsDialog.total_saved || 0).toLocaleString()) 
                               : Number(savingsDialog.total_saved || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

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
                    disabled={
                      saveSavingsMutation.isPending ||
                      !savingsDialog.staff_id ||
                      !savingsDialog.monthly_amount ||
                      !savingsDialog.duration_months
                    }>
                    <Save className="h-4 w-4 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Disburse Savings Dialog */}
        <Dialog open={!!disburseDialog} onOpenChange={() => setDisburseDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                {bn ? 'মোট জমা পরিশোধ' : 'Disburse Total Savings'}
              </DialogTitle>
            </DialogHeader>
            {disburseDialog && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{disburseDialog.staff_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bn ? 'পরিশোধের পর জমা সেটআপ নিষ্ক্রিয় হবে এবং হিসাব তালিকায় অটো এন্ট্রি যাবে।' : 'After payment, savings setup will be deactivated and an expense entry will be auto-created.'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'পরিশোধের পরিমাণ (৳)' : 'Amount (৳)'}</Label>
                  <NumberInput
                    value={disburseDialog.amount}
                    onValueChange={n => setDisburseDialog({ ...disburseDialog, amount: n })}
                  />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'প্রতিষ্ঠান (Project)' : 'Institution (Project)'}</Label>
                  <Select
                    value={disburseDialog.institutionId || ''}
                    onValueChange={v => setDisburseDialog({ ...disburseDialog, institutionId: v, categoryId: '' })}
                  >
                    <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {(expenseInstitutions as any[]).map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>{bn ? (i.name_bn || i.name) : i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'হিসাব ব্যয় খাত' : 'Expense Head'}</Label>
                  <Select
                    value={disburseDialog.categoryId || ''}
                    onValueChange={v => setDisburseDialog({ ...disburseDialog, categoryId: v })}
                    disabled={!disburseDialog.institutionId}
                  >
                    <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {(expenseCategories as any[])
                        .filter((c: any) => !disburseDialog.institutionId || c.institution_id === disburseDialog.institutionId)
                        .map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{bn ? (c.name_bn || c.name) : c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'নোট (ঐচ্ছিক)' : 'Note (optional)'}</Label>
                  <Input
                    value={disburseDialog.note || ''}
                    onChange={e => setDisburseDialog({ ...disburseDialog, note: e.target.value })}
                    placeholder={bn ? 'যেমন: চেক নং / তারিখ' : 'e.g. Check no / date'}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    disburseSavingsMutation.isPending ||
                    !disburseDialog.amount ||
                    !disburseDialog.categoryId ||
                    !disburseDialog.institutionId
                  }
                  onClick={() => disburseSavingsMutation.mutate({
                    config: disburseDialog.config,
                    amount: Number(disburseDialog.amount),
                    categoryId: disburseDialog.categoryId,
                    institutionId: disburseDialog.institutionId,
                    note: disburseDialog.note,
                  })}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  {bn ? 'পরিশোধ ও হিসাবে যোগ করুন' : 'Disburse & Add to Expenses'}
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
                    <NumberInput value={editDialog.base_salary} onValueChange={n => setEditDialog({ ...editDialog, base_salary: n })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'বোনাস' : 'Bonus'}</Label>
                    <NumberInput value={editDialog.bonus} onValueChange={n => setEditDialog({ ...editDialog, bonus: n })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'ওভারটাইম' : 'Overtime'}</Label>
                    <NumberInput value={editDialog.overtime} onValueChange={n => setEditDialog({ ...editDialog, overtime: n })} />
                    <Input className="mt-1.5" type="text" placeholder={bn ? 'কারণ/বিবরণ লিখুন' : 'Reason / note'} value={editDialog.overtime_reason || ''} onChange={e => setEditDialog({ ...editDialog, overtime_reason: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'অন্যান্য ডিউটি' : 'Other Duty'}</Label>
                    <NumberInput value={editDialog.other_allowance} onValueChange={n => setEditDialog({ ...editDialog, other_allowance: n })} />
                    <Input className="mt-1.5" type="text" placeholder={bn ? 'ডিউটি/বিবরণ লিখুন' : 'Duty / note'} value={editDialog.other_allowance_note || ''} onChange={e => setEditDialog({ ...editDialog, other_allowance_note: e.target.value })} />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <Label className="text-xs font-semibold text-red-500">{bn ? 'কর্তনসমূহ' : 'Deductions'}</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs">{bn ? 'বিলম্ব উপস্থিত কর্তন' : 'Late Present Ded.'}</Label>
                      <NumberInput value={editDialog.late_deduction} onValueChange={n => setEditDialog({ ...editDialog, late_deduction: n })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অনুপস্থিতি কর্তন' : 'Absence Ded.'}</Label>
                      <NumberInput value={editDialog.absence_deduction} onValueChange={n => setEditDialog({ ...editDialog, absence_deduction: n })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অগ্রিম/ডিপোজিট কর্তন' : 'Advance/Deposit Ded.'}</Label>
                      <NumberInput value={editDialog.advance_deduction} onValueChange={n => setEditDialog({ ...editDialog, advance_deduction: n })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অন্যান্য কর্তন' : 'Other Ded.'}</Label>
                      <NumberInput value={editDialog.other_deduction} onValueChange={n => setEditDialog({ ...editDialog, other_deduction: n })} />
                      <Input className="mt-1.5" type="text" placeholder={bn ? 'কর্তনের কারণ লিখুন' : 'Reason for deduction'} value={editDialog.other_deduction_note || ''} onChange={e => setEditDialog({ ...editDialog, other_deduction_note: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">{bn ? 'মন্তব্য' : 'Remarks'}</Label>
                  <Textarea value={editDialog.remarks || ''} onChange={e => setEditDialog({ ...editDialog, remarks: e.target.value })} rows={2} />
                </div>
                {(() => {
                  // Savings is auto-applied on save, so the preview must show it too —
                  // otherwise the dialog net differs from the table/slip/PDF net.
                  const sav = Number(getActiveSavings(editDialog.staff_id)?.amount || 0);
                  const dutyDed = Number(editDialog.duty_deduction ?? (getDutyDeduction(editDialog.staff_id).total || 0));
                  const previewNet = computeManualOverrideNet({
                    base_salary: editDialog.base_salary, bonus: editDialog.bonus,
                    overtime: editDialog.overtime, other_allowance: editDialog.other_allowance,
                    late_deduction: editDialog.late_deduction, absence_deduction: editDialog.absence_deduction,
                    advance_deduction: editDialog.advance_deduction, other_deduction: editDialog.other_deduction,
                    savings_deduction: sav, duty_deduction: dutyDed,
                  });
                  return (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                      {sav > 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">
                          {bn ? 'জমা কর্তন' : 'Savings deduction'}: ৳{sav.toLocaleString()}
                        </p>
                      )}
                      {dutyDed > 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">
                          {bn ? 'আবাসিক ডিউটি কর্তন' : 'Residential duty deduction'}: ৳{dutyDed.toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{bn ? 'নিট বেতন' : 'Net Salary'}</p>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                        ৳{previewNet.toLocaleString()}
                      </p>
                    </div>
                  );
                })()}

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
                <TabsTrigger value="expense" className="flex-1">{bn ? 'হিসাব সংযোগ' : 'Expense Link'}</TabsTrigger>
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
                      if (mode === 'per_minute') return bn ? 'Per-Minute: মাসিক বেতন ÷ মাসের দিনসংখ্যা ÷ দৈনিক ডিউটি মিনিট = প্রতি মিনিটের হার' : 'Per-Minute: Monthly ÷ days in month ÷ duty minutes = rate/minute';
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

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{bn ? 'সম্পূর্ণ উপস্থিতি বাধ্যতামূলক' : 'Require Complete Attendance'}</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {bn ? 'মাসের সব দিনের উপস্থিতি না দেওয়া পর্যন্ত বেতন জেনারেট হবে না' : 'Salary won\'t generate until every day of the month is marked'}
                    </p>
                  </div>
                  <Switch
                    checked={getSetting('require_complete_attendance')?.enabled !== false}
                    onCheckedChange={v => saveSettingMutation.mutate({ key: 'require_complete_attendance', value: { enabled: v } })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{bn ? 'অচিহ্নিত দিন বেতনসহ (হাজিরাহীন দিনে কর্তনমুক্ত)' : 'Unmarked Days Paid (No Deduction)'}</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {bn
                        ? 'চালু থাকলে যে দিনগুলোতে কোনো হাজিরা দেওয়া হয়নি তা কর্তন হবে না (শুধু স্পষ্ট অনুপস্থিতি কর্তন হবে); বন্ধ করলে হাজিরাহীন দিনগুলো অনুপস্থিত ধরে কর্তন হবে'
                        : 'When enabled, days with missing attendance are not deducted (only explicit absents are deducted); when disabled, unmarked days are treated as absent'}
                    </p>
                  </div>
                  <Switch
                    checked={getSetting('unmarked_days_paid')?.enabled !== false}
                    onCheckedChange={v => saveSettingMutation.mutate({ key: 'unmarked_days_paid', value: { enabled: v } })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>{bn ? 'স্বয়ংক্রিয় ওভারটাইম ভাতা প্রদান' : 'Automatic Overtime Pay'}</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {bn
                        ? 'চালু করলে নির্ধারিত ছুটির সময়ের পর অবস্থান করা অতিরিক্ত মিনিটের টাকা বেতনে যুক্ত হবে; বন্ধ/default থাকলে অতিরিক্ত সময় কেবল তথ্যের জন্য দেখা যাবে, কোনো টাকা যোগ হবে না'
                        : 'Enable to convert extra minutes past shift end into overtime pay; off/default tracks minutes without paying overtime'}
                    </p>
                  </div>
                  <Switch
                    checked={getSetting('auto_overtime_pay')?.enabled === true}
                    onCheckedChange={v => saveSettingMutation.mutate({ key: 'auto_overtime_pay', value: { enabled: v } })}
                  />
                </div>


                <div className="p-3 border rounded-lg space-y-2">
                  <Label>{bn ? 'বেতন হিসাবের ভিত্তি' : 'Salary Calculation Basis'}</Label>
                  <Select
                    value={getSetting('salary_calc_basis')?.mode || 'subtractive'}
                    onValueChange={v => saveSettingMutation.mutate({ key: 'salary_calc_basis', value: { mode: v } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtractive">{bn ? 'কর্তনভিত্তিক (পূর্ণ মাস − অনুপস্থিতি/দেরি; ছুটির দিন বেতনসহ)' : 'Subtractive (Full month − absences/late; holidays paid)'}</SelectItem>
                      <SelectItem value="additive">{bn ? 'যোগভিত্তিক (শুধু উপস্থিত দিনের আয়; ছুটির দিন বেতনহীন)' : 'Additive (Only present days earned; holidays unpaid)'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {bn
                      ? 'কর্তনভিত্তিক: শুক্রবার/সরকারি ছুটি স্বয়ংক্রিয়ভাবে বেতনসহ। যোগভিত্তিক: প্রতিদিন উপস্থিতি রেকর্ড থাকতে হবে নাহলে সেদিনের বেতন হবে না।'
                      : 'Subtractive: weekend/holidays auto-paid. Additive: each day must have an attendance record to be paid.'}
                  </p>
                </div>
              </TabsContent>

              {/* Expense Link Settings */}
              <TabsContent value="expense" className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <FolderOpen className="h-4 w-4 inline mr-1 text-primary" />
                  <span className="font-semibold">{bn ? 'হিসাবে অটো-সেভ সেটিংস' : 'Auto-Save to Expenses Settings'}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bn ? 'বেতন পরিশোধ করলে স্বয়ংক্রিয়ভাবে হিসাব ব্যবস্থাপনায় সেভ হবে। প্রতিষ্ঠান ও ব্যয় খাত নির্বাচন করুন।' 
                         : 'When salary is paid, it will auto-save to expense management. Select institution & expense head.'}
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
                  <Label>{bn ? 'ব্যয় খাত (Expense Head)' : 'Expense Head'}</Label>
                  <Select
                    value={getSetting('expense_location')?.category_id || ''}
                    onValueChange={v => {
                      const current = getSetting('expense_location') || {};
                      saveSettingMutation.mutate({ key: 'expense_location', value: { ...current, category_id: v } });
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'ব্যয় খাত নির্বাচন করুন' : 'Select expense head'} /></SelectTrigger>
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

                <div className="flex items-center justify-between p-3 border border-border/60 rounded-xl">
                  <div>
                    <Label className="text-sm font-medium">{bn ? 'বেতন পরিশোধের সময় স্বয়ংক্রিয়ভাবে হিসাবে যোগ করুন' : 'Auto-add to expenses on salary payment'}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{bn ? 'চালু থাকলে পেমেন্ট নিশ্চিতকরণ ডায়ালগে চেকবক্স ডিফল্ট টিক থাকবে' : 'When enabled, expense checkbox is checked by default in payment dialog'}</p>
                  </div>
                  <Switch
                    checked={getSetting('expense_location')?.auto_add_to_expenses !== false}
                    onCheckedChange={(checked) => {
                      const current = getSetting('expense_location') || {};
                      saveSettingMutation.mutate({ key: 'expense_location', value: { ...current, auto_add_to_expenses: checked } });
                    }}
                  />
                </div>

                {getSetting('expense_location')?.institution_id && getSetting('expense_location')?.category_id ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4 inline mr-1 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {bn ? 'সক্রিয়: প্রতিষ্ঠান ও ব্যয় খাত সংযুক্ত আছে' : 'Active: Institution & expense head connected'}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-1 text-yellow-600" />
                    <span className="text-yellow-700 dark:text-yellow-400">
                      {bn ? 'প্রতিষ্ঠান ও ব্যয় খাত নির্বাচন করুন অটো-সেভ চালু করতে' : 'Select institution & expense head to enable auto-save'}
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="formula" className="space-y-4 mt-4">
                <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <h4 className="font-semibold">{bn ? 'Per-Minute ফর্মুলা' : 'Per-Minute Formula'}</h4>
                  <div className="space-y-1 text-muted-foreground text-xs">
                    <p>• <strong>{bn ? 'দৈনিক হার' : 'Daily Rate'}</strong> = {bn ? 'মাসিক বেতন ÷ মাসের প্রকৃত দিনসংখ্যা' : 'Monthly Salary ÷ actual days in month'}</p>
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
              const totalDeduction = breakdown.reduce((s: number, d: any) => s + (d.deduction || 0), 0);
              const totalEarned = breakdown.reduce((s: number, d: any) => s + (d.dailyEarning || 0), 0);
              const totalAddition = breakdown.reduce((s: number, d: any) => s + (d.addition || 0), 0);
              
              const STATUS_LABEL: Record<string, { bn: string; en: string; color: string }> = {
                present: { bn: 'উপস্থিত', en: 'Present', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                absent: { bn: 'অনুপস্থিত', en: 'Absent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                late: { bn: 'বিলম্ব উপস্থিত', en: 'Late Present', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
                half_day: { bn: 'অর্ধদিন', en: 'Half Day', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
                leave: { bn: 'ছুটি', en: 'Leave', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
              };

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="text-center p-2 border rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50">
                      <p className="text-lg font-bold text-emerald-600">{bn ? toBnDigits(stats.present) : stats.present}</p>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{bn ? 'মোট উপস্থিত' : 'Total Present'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {bn
                          ? `${toBnDigits(stats.regularPresent ?? Math.max(0, (stats.present || 0) - (stats.late || 0) - (stats.halfDay || 0)))} পূর্ণ${stats.late > 0 ? `, ${toBnDigits(stats.late)} বিলম্ব` : ''}${stats.halfDay > 0 ? `, ${toBnDigits(stats.halfDay)} অর্ধদিন` : ''}`
                          : `${stats.regularPresent ?? Math.max(0, (stats.present || 0) - (stats.late || 0) - (stats.halfDay || 0))} full${stats.late > 0 ? `, ${stats.late} late` : ''}${stats.halfDay > 0 ? `, ${stats.halfDay} half` : ''}`}
                      </p>
                    </div>
                    <div className="text-center p-2 border rounded-lg bg-red-50/40 dark:bg-red-950/20 border-red-200/50">
                      <p className="text-lg font-bold text-red-500">{bn ? toBnDigits(stats.absent) : stats.absent}</p>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">{bn ? 'অনুপস্থিত' : 'Absent'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{bn ? 'বেতন কর্তন' : 'Deducted'}</p>
                    </div>
                    <div className="text-center p-2 border rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/50">
                      <p className="text-lg font-bold text-blue-600">{bn ? toBnDigits(stats.leave || 0) : (stats.leave || 0)}</p>
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">{bn ? 'ছুটি' : 'Leave'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{bn ? 'অনুমোদিত' : 'Approved'}</p>
                    </div>
                    <div className="text-center p-2 border rounded-lg bg-muted/40">
                      <p className="text-lg font-bold text-foreground">
                        {bn
                          ? toBnDigits(stats.present + stats.absent + (stats.leave || 0))
                          : (stats.present + stats.absent + (stats.leave || 0))}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">{bn ? 'মোট হিসাবকৃত দিন' : 'Total Days'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{bn ? 'উপস্থিত+অনুপস্থিত+ছুটি' : 'Pres + Abs + Leave'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 border rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-red-600">{bn ? 'কর্তন (বিয়োগ) বিবরণ' : 'Deductions (-)'}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bn ? 'অনুপস্থিতি' : 'Absence'}</span>
                        <span>{bn ? toBnDigits(stats.absent) : stats.absent} {bn ? 'দিন' : 'days'} = -৳{bn ? toBnDigits(Math.round(stats.absent * stats.dailyRate).toLocaleString()) : Math.round(stats.absent * stats.dailyRate).toLocaleString()}</span>
                      </div>
                      {stats.totalLateArrivalMinutes > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{bn ? 'লেইট আসা' : 'Late Arrival'}</span>
                          <span>{bn ? toBnDigits(stats.totalLateArrivalMinutes) : stats.totalLateArrivalMinutes} {bn ? 'মি.' : 'min'} = -৳{bn ? toBnDigits(Math.round(Number(stats.totalLateArrivalDeduction || 0)).toLocaleString()) : Math.round(Number(stats.totalLateArrivalDeduction || 0)).toLocaleString()}</span>
                        </div>
                      )}
                      {stats.totalEarlyExitMinutes > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{bn ? 'আগাম যাওয়া' : 'Early Exit'}</span>
                          <span>{bn ? toBnDigits(stats.totalEarlyExitMinutes) : stats.totalEarlyExitMinutes} {bn ? 'মি.' : 'min'} = -৳{bn ? toBnDigits(Math.round(Number(stats.totalEarlyExitDeduction || 0)).toLocaleString()) : Math.round(Number(stats.totalEarlyExitDeduction || 0)).toLocaleString()}</span>
                        </div>
                      )}
                      {stats.halfDay > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{bn ? 'অর্ধদিন' : 'Half Day'}</span>
                          <span>{bn ? toBnDigits(stats.halfDay) : stats.halfDay} {bn ? 'দিন' : 'days'} = -৳{bn ? toBnDigits(Math.round(stats.halfDay * stats.dailyRate / 2).toLocaleString()) : Math.round(stats.halfDay * stats.dailyRate / 2).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-bold border-t pt-1 text-red-600">
                        <span>{bn ? 'মোট কর্তন' : 'Total Ded.'}</span>
                        <span>-৳{bn ? toBnDigits(Math.round(totalDeduction).toLocaleString()) : Math.round(totalDeduction).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="p-2 border rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-emerald-600">{bn ? 'প্রাপ্য (যোগ) বিবরণ' : 'Earnings (+)'}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bn ? 'উপস্থিতি ও ছুটি আয়' : 'Attendance & Leave'}</span>
                        <span>{bn ? toBnDigits(stats.present + (stats.leave || 0)) : stats.present + (stats.leave || 0)} {bn ? 'দিন' : 'days'} = +৳{bn ? toBnDigits(Math.round((stats.present + (stats.leave || 0)) * stats.dailyRate).toLocaleString()) : Math.round((stats.present + (stats.leave || 0)) * stats.dailyRate).toLocaleString()}</span>
                      </div>
                      {getSetting('auto_overtime_pay')?.enabled === true && stats.totalOvertimeMinutes > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{bn ? 'ওভারটাইম' : 'Overtime'}</span>
                          <span>{bn ? toBnDigits(stats.totalOvertimeMinutes) : stats.totalOvertimeMinutes} {bn ? 'মি.' : 'min'} = +৳{bn ? toBnDigits(Math.round(stats.totalOvertimeMinutes * stats.perMinuteRate).toLocaleString()) : Math.round(stats.totalOvertimeMinutes * stats.perMinuteRate).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-bold border-t pt-1 text-emerald-600 mt-auto">
                        <span>{bn ? 'মোট প্রাপ্য (যোগ)' : 'Total Earned'}</span>
                        <span>+৳{bn ? toBnDigits(Math.round(totalEarned).toLocaleString()) : Math.round(totalEarned).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground flex justify-between items-center">
                    <div>
                      <Calculator className="h-3 w-3 inline mr-1" />
                      {bn ? 'দৈনিক রেট' : 'Daily rate'}: ৳{bn ? toBnDigits(Math.round(stats.dailyRate).toLocaleString()) : Math.round(stats.dailyRate).toLocaleString()} | 
                      {bn ? ' প্রতি মিনিট রেট' : ' Per-min'}: ৳{bn ? toBnDigits(stats.perMinuteRate.toFixed(2)) : stats.perMinuteRate.toFixed(2)}
                    </div>
                    <div className="font-semibold text-emerald-600">
                      {bn ? 'নিট প্রাপ্য' : 'Net Total'}: ৳{bn ? toBnDigits(Math.round(totalEarned).toLocaleString()) : Math.round(totalEarned).toLocaleString()}
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-x-auto overflow-y-hidden -mx-1 px-1 [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] touch-pan-x">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-2 py-2 text-left text-xs">{bn ? 'তারিখ ও বার' : 'Date & Day'}</th>
                          <th className="px-2 py-2 text-center text-xs">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                          <th className="px-2 py-2 text-center text-xs">{bn ? 'ইন/আউট' : 'In/Out'}</th>
                          <th className="px-2 py-2 text-center text-xs">{bn ? 'লেইট/আগাম' : 'Late/Early'}</th>
                          <th className="px-2 py-2 text-right text-xs text-red-500">{bn ? 'কর্তন (বিয়োগ)' : 'Ded. (-)'}</th>
                          <th className="px-2 py-2 text-right text-xs text-emerald-600">{bn ? 'প্রাপ্য (যোগ)' : 'Earned (+)'}</th>
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
                              const dateObj = new Date(d.date);
                              const dateLabel = dateObj.toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', weekday: 'short' });
                              return (
                                <tr key={i} className="border-b hover:bg-muted/30">
                                  <td className="px-2 py-1.5 text-xs font-medium">{dateLabel}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    <Badge className={`${sl.color} text-[9px]`}>{bn ? sl.bn : sl.en}</Badge>
                                  </td>
                                  <td className="px-2 py-1.5 text-center text-[10px]">
                                    {['absent', 'holiday', 'leave', 'excused'].includes(d.status) ? '-' : (
                                      <>{d.checkIn ? fmt(d.checkIn) : '-'} / {d.checkOut ? fmt(d.checkOut) : '-'}</>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-center text-[10px]">
                                    {d.status === 'absent' ? (
                                      <span className="text-red-500 font-semibold">{bn ? 'পুরো দিন' : 'Full day'}</span>
                                    ) : (
                                      <>
                                        {d.lateMin > 0 && <span className="text-yellow-600">{bn ? toBnDigits(d.lateMin) : d.lateMin}{bn ? 'মি↓' : 'm↓'} </span>}
                                        {d.earlyMin > 0 && <span className="text-orange-600">{bn ? toBnDigits(d.earlyMin) : d.earlyMin}{bn ? 'মি↑' : 'm↑'} </span>}
                                        {d.lateMin === 0 && d.earlyMin === 0 && d.status !== 'half_day' && <span className="text-emerald-500">✓</span>}
                                        {d.status === 'half_day' && <span className="text-orange-500">{bn ? '½দিন' : '½day'}</span>}
                                      </>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-xs text-red-500 font-semibold">
                                    {d.deduction > 0 ? (
                                      bn ? `-৳${toBnDigits(Math.round(d.deduction).toLocaleString())}` : `-৳${Math.round(d.deduction).toLocaleString()}`
                                    ) : '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-xs text-emerald-600 font-semibold">
                                    {d.dailyEarning > 0 ? (
                                      bn ? `+৳${toBnDigits(Math.round(d.dailyEarning).toLocaleString())}` : `+৳${Math.round(d.dailyEarning).toLocaleString()}`
                                    ) : '-'}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                      {breakdown.length > 0 && (
                        <tfoot>
                          <tr className="bg-muted/50 font-semibold">
                            <td colSpan={4} className="px-2 py-2 text-xs text-right">{bn ? 'সর্বমোট' : 'Grand Total'}</td>
                            <td className="px-2 py-2 text-right text-xs text-red-600 font-bold">
                              {totalDeduction > 0 ? (
                                bn ? `-৳${toBnDigits(Math.round(totalDeduction).toLocaleString())}` : `-৳${Math.round(totalDeduction).toLocaleString()}`
                              ) : '৳০'}
                            </td>
                            <td className="px-2 py-2 text-right text-xs text-emerald-600 font-bold">
                              +৳{bn ? toBnDigits(Math.round(totalEarned).toLocaleString()) : Math.round(totalEarned).toLocaleString()}
                            </td>
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

        {/* Payment Confirmation Dialog with Expense Choice */}
        <Dialog open={!!paidConfirmId} onOpenChange={(o) => { if (!o) setPaidConfirmId(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {bn ? 'বেতন পরিশোধ নিশ্চিতকরণ' : 'Confirm Salary Payment'}
              </DialogTitle>
              <DialogDescription>
                {bn ? 'এই কর্মীর বেতন পরিশোধিত হিসেবে চিহ্নিত করতে যাচ্ছেন।' : 'You are about to mark this staff member salary as paid.'}
              </DialogDescription>
            </DialogHeader>

            {paidConfirmId && (() => {
              const paidRecord = salaryRecords.find((r: any) => r.id === paidConfirmId);
              const paidStaff = staff.find((s: any) => s.id === paidRecord?.staff_id);
              const payableSnapshot = paidStaff && paidRecord ? getSalaryDisplaySnapshot(paidStaff, paidRecord).record : paidRecord;
              const payableNet = payableSnapshot ? Number(payableSnapshot.net_salary || 0) : 0;
              const monthNameObj = MONTHS.find(m => m.value === selectedMonth);

              return (
                <div className="space-y-4 py-2">
                  <div className="rounded-lg border bg-muted/40 p-3.5 space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{bn ? 'কর্মীর নাম:' : 'Staff Name:'}</span>
                      <span className="font-semibold text-foreground">{paidStaff?.name_bn || paidStaff?.name_en || '—'}</span>
                    </div>
                    {paidStaff?.designation && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{bn ? 'পদবী:' : 'Designation:'}</span>
                        <span>{paidStaff.designation}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{bn ? 'মাস:' : 'Month:'}</span>
                      <span className="font-medium">{bn ? monthNameObj?.bn : monthNameObj?.en} {selectedYear}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t text-base font-bold">
                      <span>{bn ? 'পরিশোধযোগ্য নিট বেতন:' : 'Net Payable:'}</span>
                      <span className="text-emerald-600 font-mono">
                        ৳{bn ? toBnDigits(payableNet.toLocaleString()) : payableNet.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-800/60 p-3.5 space-y-2">
                    <div className="flex items-start space-x-2.5">
                      <Checkbox
                        id="payAddToExpenseCheck"
                        checked={payAddToExpense}
                        onCheckedChange={(checked) => setPayAddToExpense(!!checked)}
                        className="mt-0.5"
                      />
                      <div className="space-y-1 leading-none cursor-pointer" onClick={() => setPayAddToExpense(!payAddToExpense)}>
                        <label htmlFor="payAddToExpenseCheck" className="text-sm font-semibold cursor-pointer select-none text-foreground">
                          {bn ? 'হিসাব ব্যবস্থাপনায় খরচ হিসেবে যোগ করুন' : 'Add to Expense Management as Expense'}
                        </label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {payAddToExpense
                            ? (bn ? '✓ বেতন পরিশোধের সাথে সাথে এটি হিসাবের খরচে ভাউচার হিসেবে যুক্ত হবে।' : '✓ This salary will be recorded as an expense voucher in Expense Management.')
                            : (bn ? '✕ বেতন পরিশোধ হবে কিন্তু হিসাবে কোন খরচ যুক্ত হবে না (বকেয়া বা ঘাটতি বাড়বে না)। পরে যেকোনো সময় এক ক্লিকে যুক্ত করা যাবে।' : '✕ Salary will be marked paid without adding to expenses. Can be linked anytime later.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setPaidConfirmId(null)}
                disabled={markPaidMutation.isPending}
              >
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (paidConfirmId) {
                    markPaidMutation.mutate({ id: paidConfirmId, addToExpense: payAddToExpense });
                    setPaidConfirmId(null);
                  }
                }}
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                {bn ? 'হ্যাঁ, পরিশোধ করুন' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Master Expense Sync & Link Dialog */}
        <Dialog open={expenseSyncModalOpen} onOpenChange={setExpenseSyncModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Landmark className="h-5 w-5 text-blue-600" />
                {bn ? 'হিসাব লিঙ্ক ও খরচ সমন্বয়' : 'Salary Expense Link & Sync'}
              </DialogTitle>
              <DialogDescription>
                {bn ? 'বেতন পরিশোধের পর হিসাব ব্যবস্থাপনায় (খরচ) যুক্ত বা বাদ দেওয়ার সার্বিক নিয়ন্ত্রণ।' : 'Manage how paid salaries are linked to Expense Management for this month.'}
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const paidRecordsForSync = salaryRecords.filter((r: any) => r.status === 'paid');
              const totalPaidNetForSync = paidRecordsForSync.reduce((sum: number, r: any) => {
                const staffMember = staff.find((s: any) => s.id === r.staff_id);
                const payable = staffMember ? getSalaryDisplaySnapshot(staffMember, r).record : r;
                return sum + Number(payable.net_salary || 0);
              }, 0);

              const expenseConfig = getSetting('expense_location') || {};
              const currentInst = (expenseInstitutions as any[]).find((i: any) => i.id === expenseConfig?.institution_id);
              const currentCat = (expenseCategories as any[]).find((c: any) => c.id === expenseConfig?.category_id);
              const isConfigReady = !!(expenseConfig?.institution_id && expenseConfig?.category_id);
              const monthNameObj = MONTHS.find(m => m.value === selectedMonth);
              const monthLabel = `${bn ? monthNameObj?.bn : monthNameObj?.en} ${selectedYear}`;

              return (
                <div className="space-y-4 py-2">
                  {/* Current Month Overview KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
                      <div className="text-xs text-muted-foreground font-medium">{bn ? 'পরিশোধিত বেতন' : 'Paid Salary'}</div>
                      <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                        ৳{bn ? toBnDigits(totalPaidNetForSync.toLocaleString()) : totalPaidNetForSync.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {bn ? `${toBnDigits(paidRecordsForSync.length)} জন কর্মী` : `${paidRecordsForSync.length} staff members`}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
                      <div className="text-xs text-muted-foreground font-medium">{bn ? 'বর্তমানে খরচে যুক্ত' : 'Currently in Expenses'}</div>
                      <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                        ৳{bn ? toBnDigits(totalSalaryInExpenses.toLocaleString()) : totalSalaryInExpenses.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {totalSalaryInExpenses > 0 ? (
                          consolidatedExpense ? (bn ? 'একক মোট ভাউচার' : 'Consolidated voucher') : (bn ? `${toBnDigits(monthSalaryExpenses.length)} টি ভাউচার` : `${monthSalaryExpenses.length} vouchers`)
                        ) : (
                          bn ? 'কোন খরচ যুক্ত নেই' : 'No expenses added'
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50">
                      <div className="text-xs text-muted-foreground font-medium">{bn ? 'হিসাব লিঙ্ক অবস্থা' : 'Expense Link Status'}</div>
                      <div className="mt-1">
                        {totalSalaryInExpenses === 0 ? (
                          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs">
                            {bn ? 'খরচমুক্ত / বকেয়া নেই' : 'Not Linked / Zero Arrears'}
                          </Badge>
                        ) : consolidatedExpense ? (
                          <Badge className="bg-blue-600 text-white text-xs">
                            {bn ? 'এককালীন মোট' : 'Consolidated Total'}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-white text-xs">
                            {bn ? 'সবার নাম সহ পৃথক' : 'Individual Vouchers'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {bn ? `মাস: ${monthLabel}` : `Month: ${monthLabel}`}
                      </div>
                    </div>
                  </div>

                  {/* Destination project and category */}
                  <div className="rounded-lg border p-3 bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-muted-foreground">{bn ? 'খরচের গন্তব্য:' : 'Destination:'}</span>
                      {isConfigReady ? (
                        <>
                          <Badge variant="secondary" className="font-normal">
                            {bn ? (currentInst?.name_bn || currentInst?.name || 'প্রতিষ্ঠান') : (currentInst?.name || 'Institution')}
                          </Badge>
                          <span>➔</span>
                          <Badge variant="secondary" className="font-normal">
                            {bn ? (currentCat?.name_bn || currentCat?.name || 'ব্যয় খাত') : (currentCat?.name || 'Expense Head')}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-amber-600 font-medium">
                          {bn ? '⚠️ হিসাব প্রতিষ্ঠান বা ব্যয় খাত সেট করা নেই!' : '⚠️ Expense institution or expense head not set!'}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 self-start sm:self-auto"
                      onClick={() => {
                        setExpenseSyncModalOpen(false);
                        setSettingsOpen(true);
                      }}
                    >
                      <Settings2 className="h-3 w-3 mr-1" />
                      {bn ? 'গন্তব্য পরিবর্তন' : 'Change Location'}
                    </Button>
                  </div>

                  {/* 3 Action Modes */}
                  <div className="space-y-3 pt-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {bn ? 'হিসাব সমন্বয় করার বিকল্পসমূহ' : 'Expense Sync Options'}
                    </div>

                    {/* Mode 1: Individual */}
                    <div className={`p-3.5 rounded-lg border transition-all ${monthSalaryExpenses.length > 0 && !consolidatedExpense ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-border bg-card'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-foreground">
                              {bn ? 'বিকল্প ১: সবার নাম সহ পৃথক পৃথক খরচে যোগ করুন' : 'Option 1: Add Individual Vouchers with Names'}
                            </span>
                            {monthSalaryExpenses.length > 0 && !consolidatedExpense && (
                              <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">
                                {bn ? 'বর্তমানে সক্রিয়' : 'Active'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {bn
                              ? 'প্রতিটি পরিশোধিত কর্মীর নাম ও পদবী সহ আলাদা খরচের ভাউচার তৈরি হবে (যেমন: "বেতন: মো: করিম (সহকারী শিক্ষক) - মার্চ ২০২৬")।'
                              : 'Creates individual expense vouchers for each paid staff with their name and designation.'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap self-start sm:self-auto"
                          disabled={syncMonthExpensesMutation.isPending || paidRecordsForSync.length === 0 || !isConfigReady}
                          onClick={() => syncMonthExpensesMutation.mutate('individual')}
                        >
                          {syncMonthExpensesMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Users className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {bn ? 'পৃথক ভাবে যোগ করুন' : 'Apply Individual'}
                        </Button>
                      </div>
                    </div>

                    {/* Mode 2: Consolidated */}
                    <div className={`p-3.5 rounded-lg border transition-all ${consolidatedExpense ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20' : 'border-border bg-card'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-semibold text-foreground">
                              {bn ? 'বিকল্প ২: পুরো মাসের মোট বেতন একবারে যোগ করুন' : 'Option 2: Add Consolidated Single Monthly Total'}
                            </span>
                            {consolidatedExpense && (
                              <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5">
                                {bn ? 'বর্তমানে সক্রিয়' : 'Active'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {bn
                              ? `পুরো মাসের সকল কর্মীর মোট পরিশোধিত বেতনের একটি মাত্র মোট ভাউচার তৈরি হবে (যেমন: "মোট শিক্ষক-স্টাফ বেতন: ${monthLabel} (${toBnDigits(paidRecordsForSync.length)} জন) - ৳${toBnDigits(totalPaidNetForSync.toLocaleString())}")।`
                              : 'Creates a single consolidated expense voucher for total paid salary of the entire month.'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap self-start sm:self-auto"
                          disabled={syncMonthExpensesMutation.isPending || paidRecordsForSync.length === 0 || !isConfigReady}
                          onClick={() => syncMonthExpensesMutation.mutate('consolidated')}
                        >
                          {syncMonthExpensesMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Layers className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {bn ? 'এককালীন মোট যোগ করুন' : 'Apply Consolidated'}
                        </Button>
                      </div>
                    </div>

                    {/* Mode 3: Remove All */}
                    <div className={`p-3.5 rounded-lg border transition-all ${totalSalaryInExpenses === 0 ? 'border-muted-foreground/30 bg-muted/20' : 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-semibold text-foreground">
                              {bn ? 'বিকল্প ৩: হিসাব থেকে সম্পূর্ণ বাদ দিন (বকেয়া দূরীকরণ)' : 'Option 3: Remove All Salary Expenses (Clear Arrears)'}
                            </span>
                            {totalSalaryInExpenses === 0 && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                                {bn ? 'কোন খরচ নেই' : 'Clean'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {bn
                              ? 'হিসাব ব্যবস্থাপনা থেকে এই মাসের সকল বেতন খরচ মুছে ফেলা হবে যাতে হিসাব পাতায় কোনো বকেয়া বা ঘাটতি না দেখায়। কোনো বেতন রেকর্ড ডিলিট হবে না।'
                              : 'Removes all salary expense vouchers for this month from Expense Management to clear deficits/arrears. Salary records are preserved.'}
                          </p>
                        </div>
                        {canDeleteItem && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="whitespace-nowrap self-start sm:self-auto"
                            disabled={syncMonthExpensesMutation.isPending || totalSalaryInExpenses === 0}
                            onClick={() => syncMonthExpensesMutation.mutate('remove_all')}
                          >
                            {syncMonthExpensesMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {bn ? 'হিসাব থেকে বাদ দিন' : 'Remove from Expenses'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <DialogFooter>
              <Button variant="outline" onClick={() => setExpenseSyncModalOpen(false)}>
                {bn ? 'বন্ধ করুন' : 'Close'}
              </Button>
            </DialogFooter>
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
          description={bn ? 'এই বেতন রেকর্ডটি অপরিশোধিত হিসেবে চিহ্নিত হবে এবং সংশ্লিষ্ট হিসাব থেকে সরানো হবে।' : 'This salary record will be marked as unpaid and removed from expenses.'}
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
          description={bn ? 'এই বেতন রেকর্ডটি সম্পূর্ণভাবে মুছে ফেলা হবে। পরিশোধিত হলে সংশ্লিষ্ট হিসাব ও জমা এন্ট্রিও সরানো হবে। আপনি পুনরায় জেনারেট করতে পারবেন।' : 'This salary record will be permanently deleted. Linked expense and savings entries will also be removed. You can regenerate it later.'}
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
                <Label className="text-sm font-semibold">{bn ? 'বেতন শিটের তারিখ' : 'Salary Sheet Date'}</Label>
                <DatePicker value={sheetDate} onChange={setSheetDate} bengali={bn} />
                <p className="text-[11px] text-muted-foreground">
                  {bn ? 'ডিফল্টভাবে নির্বাচিত মাসের শেষ তারিখ; প্রয়োজনে এডিট করুন।' : 'Defaults to the last day of the selected month; edit if needed.'}
                </p>
              </div>


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

        {/* Salary Slip Preview & Mobile/Desktop Print Modal */}
        <Dialog open={!!slipModal} onOpenChange={(open) => { if (!open) setSlipModal(null); }}>
          <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border bg-background shadow-2xl">
            {/* Header with sticky action bar */}
            <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-emerald-950 grid place-items-center shadow-md flex-shrink-0">
                  <Printer className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold truncate">
                      {slipModal?.staff?.name_bn || slipModal?.staff?.name_en}
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-white/10 text-amber-300 border-white/20">
                      {slipModal?.slipId}
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-200/90 truncate">
                    {bn ? 'বেতন স্লিপ প্রিভিউ ও প্রিন্ট' : 'Salary Slip Preview & Print'} • {slipModal?.monthLabel}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto flex-wrap sm:flex-nowrap">
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md gap-1.5 px-3.5"
                  onClick={handlePrintSlip}
                >
                  <Printer className="h-4 w-4" />
                  <span>{bn ? 'সরাসরি প্রিন্ট' : 'Print'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium gap-1.5"
                  disabled={slipModalLoading === 'view'}
                  onClick={async () => {
                    if (!slipModal) return;
                    setSlipModalLoading('view');
                    try {
                      toast.info(bn ? 'PDF লোড হচ্ছে…' : 'Loading PDF…');
                      await viewSlipPdfInNewTab(slipModal.html);
                    } catch {
                      toast.error(bn ? 'PDF ভিউ করতে সমস্যা' : 'Failed to view PDF');
                    } finally {
                      setSlipModalLoading(null);
                    }
                  }}
                >
                  <FileText className="h-4 w-4" />
                  <span>{slipModalLoading === 'view' ? (bn ? 'হচ্ছে…' : 'Loading…') : (bn ? 'PDF ভিউ' : 'PDF View')}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium gap-1.5"
                  disabled={slipModalLoading === 'download'}
                  onClick={async () => {
                    if (!slipModal) return;
                    setSlipModalLoading('download');
                    try {
                      toast.info(bn ? 'PDF তৈরি হচ্ছে…' : 'Generating PDF…');
                      await downloadSlipAsPdf(slipModal.html, slipModal.filename);
                      toast.success(bn ? 'PDF ডাউনলোড সম্পন্ন' : 'PDF downloaded');
                    } catch {
                      toast.error(bn ? 'PDF তৈরিতে সমস্যা' : 'Failed to generate PDF');
                    } finally {
                      setSlipModalLoading(null);
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span>{slipModalLoading === 'download' ? (bn ? 'হচ্ছে…' : 'Generating…') : (bn ? 'PDF ডাউনলোড' : 'PDF')}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium gap-1.5"
                  disabled={slipModalLoading === 'share'}
                  onClick={async () => {
                    if (!slipModal) return;
                    setSlipModalLoading('share');
                    try {
                      toast.info(bn ? 'শেয়ার প্রস্তুত হচ্ছে…' : 'Preparing share…');
                      const shared = await shareSlipPdf(slipModal.html, slipModal.filename, bn ? 'বেতন স্লিপ' : 'Salary Slip');
                      if (shared) toast.success(bn ? 'শেয়ার সম্পন্ন' : 'Shared successfully');
                    } catch {
                      toast.error(bn ? 'শেয়ারে সমস্যা' : 'Failed to share');
                    } finally {
                      setSlipModalLoading(null);
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{bn ? 'শেয়ার করুন' : 'Share'}</span>
                </Button>
              </div>
            </div>

            {/* Signed Slip Status Bar inside Slip Preview Modal */}
            {slipModal?.staff && (() => {
              const slip = signedDocsManager.getStaffSlip(slipModal.staff.id);
              return (
                <div className="w-full bg-slate-50 dark:bg-slate-900 px-4 py-2.5 border-b flex items-center justify-between gap-3 text-xs flex-wrap sm:flex-nowrap">
                  {slip ? (
                    <>
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{bn ? 'এই মাসের স্বাক্ষরিত স্লিপ সংরক্ষিত আছে' : 'Signed slip is saved'}</span>
                        <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                          ({new Date(slip.uploaded_at).toLocaleDateString('bn-BD', { dateStyle: 'short' })})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:border-emerald-700"
                          onClick={() => setDirectViewStaff(slipModal.staff)}
                        >
                          <Eye className="h-3.5 w-3.5 text-emerald-600" /> {bn ? 'স্বাক্ষরিত কপি দেখুন' : 'View Signed'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-emerald-700"
                          onClick={() => setDirectUploadStaff(slipModal.staff)}
                        >
                          {bn ? 'পরিবর্তন' : 'Replace'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Camera className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="truncate">{bn ? 'প্রিন্ট করে স্বাক্ষর নেওয়ার পর স্বাক্ষরিত কপি এখানে আপলোড করুন' : 'Upload signed copy after printing & signatures'}</span>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0 ml-auto"
                        onClick={() => setDirectUploadStaff(slipModal.staff)}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        {bn ? 'স্বাক্ষরিত স্লিপ আপলোড / স্ক্যান' : 'Upload Signed Slip'}
                      </Button>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Slip Interactive Preview Body */}
            <div className="flex-1 overflow-auto p-3 sm:p-5 bg-slate-100 dark:bg-slate-950 flex justify-center items-start min-h-[350px] max-h-[75vh]">
              {slipModal && (
                <div className="w-full max-w-[820px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col items-center">
                  <iframe
                    ref={previewIframeRef}
                    srcDoc={slipModal.html}
                    title="Salary Slip Preview"
                    className="w-full min-h-[750px] border-0 bg-white"
                    style={{ height: '780px' }}
                  />
                </div>
              )}
            </div>

            {/* Mobile Footer for convenient thumb access */}
            <div className="sm:hidden p-2.5 border-t bg-background grid grid-cols-4 gap-1.5">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-1.5 text-xs"
                onClick={handlePrintSlip}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 px-1.5 text-xs"
                disabled={slipModalLoading === 'view'}
                onClick={async () => {
                  if (!slipModal) return;
                  setSlipModalLoading('view');
                  try {
                    await viewSlipPdfInNewTab(slipModal.html);
                  } finally {
                    setSlipModalLoading(null);
                  }
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{bn ? 'PDF ভিউ' : 'PDF View'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 px-1.5 text-xs"
                disabled={slipModalLoading === 'download'}
                onClick={async () => {
                  if (!slipModal) return;
                  setSlipModalLoading('download');
                  try {
                    await downloadSlipAsPdf(slipModal.html, slipModal.filename);
                    toast.success(bn ? 'PDF ডাউনলোড সম্পন্ন' : 'PDF downloaded');
                  } finally {
                    setSlipModalLoading(null);
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>PDF</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-1.5 text-xs"
                onClick={() => setSlipModal(null)}
              >
                {bn ? 'বন্ধ' : 'Close'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Signed Salary Documents Vault / Hub Dialog */}
        <SignedSalaryDocsHubDialog
          open={signedHubOpen}
          onOpenChange={setSignedHubOpen}
          monthYear={monthYear}
          monthLabel={getMonthLabel(monthYear)}
          staffList={staff}
          manager={signedDocsManager}
        />

        {/* Staff Direct Upload Dialog */}
        {directUploadStaff && (
          <SignedSlipUploadDialog
            open={!!directUploadStaff}
            onOpenChange={(o) => { if (!o) setDirectUploadStaff(null); }}
            staff={directUploadStaff}
            monthLabel={getMonthLabel(monthYear)}
            existingSlip={signedDocsManager.getStaffSlip(directUploadStaff.id)}
            onSave={async (file, notes) => {
              await signedDocsManager.uploadStaffSlip({
                staffId: directUploadStaff.id,
                staffName: directUploadStaff.name_bn || directUploadStaff.name_en,
                file,
                notes,
              });
            }}
            isSaving={signedDocsManager.isUploadingStaffSlip}
          />
        )}

        {/* Staff Direct Viewer Dialog */}
        {directViewStaff && (
          <SignedSlipViewerDialog
            open={!!directViewStaff}
            onOpenChange={(o) => { if (!o) setDirectViewStaff(null); }}
            staff={directViewStaff}
            monthLabel={getMonthLabel(monthYear)}
            slip={signedDocsManager.getStaffSlip(directViewStaff.id) || null}
            onReplace={() => {
              const target = directViewStaff;
              setDirectViewStaff(null);
              setDirectUploadStaff(target);
            }}
            onDelete={async () => {
              const s = directViewStaff;
              const slip = signedDocsManager.getStaffSlip(s.id);
              await signedDocsManager.deleteStaffSlip({ staffId: s.id, storagePath: slip?.storage_path });
              setDirectViewStaff(null);
            }}
            isDeleting={signedDocsManager.isDeletingStaffSlip}
          />
        )}

        {/* Salary Savings Ledger Detailed Dialog */}
        {activeLedgerGroup && (
          <SalarySavingsLedgerDialog
            open={!!selectedLedgerStaffId}
            onOpenChange={(o) => {
              if (!o) setSelectedLedgerStaffId(null);
            }}
            group={activeLedgerGroup}
            currentMonthYear={monthYear}
            bn={bn}
          />
        )}

      </div>
    </>
  );
};

export default AdminSalary;
