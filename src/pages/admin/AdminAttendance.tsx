import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { exportAttendanceExcel, calcLateMinutes } from '@/lib/attendanceExcelExport';
import { useTimeFormat, formatTimeDisplay } from '@/hooks/useTimeFormat';
import { useResignedStaff } from '@/hooks/useResignedStaff';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { usePersistentTab } from '@/hooks/usePersistentTab';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { sortStaffByDepartment, isTeacherCategory } from '@/lib/staffOrderHelper';
import { runStaffDeduplicationSync } from '@/lib/staffDeduplicationSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  CalendarDays, Users, UserCog, Search, Check, X, Clock,
  CalendarOff, Save, Settings2, Plus, Trash2, Edit2, Lock,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Home, Sun, Sunset, Moon, Utensils, Coffee,
  Download, Printer, RotateCcw, Layers, QrCode, Send, Fingerprint, UserCheck, History, Sparkles, Loader2, Building2
} from 'lucide-react';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { getStaffDisplayNames } from '@/lib/nameFormatter';

import ClassQRPoster from '@/components/attendance/ClassQRPoster';
import AttendanceDeviceManager from '@/components/attendance/AttendanceDeviceManager';
import StaffCheckinDialog from '@/components/attendance/StaffCheckinDialog';
import { useCommitteeStaffIds } from '@/hooks/useCommitteeStaffIds';
import CommitteeExclusionNotice from '@/components/CommitteeExclusionNotice';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import StaffMonthlyAttendanceDialog from '@/components/admin/StaffMonthlyAttendanceDialog';
import ResidentialDutyMonthlySheetDialog from '@/components/admin/ResidentialDutyMonthlySheetDialog';
import FulltimeMonthlyAttendanceSheetDialog from '@/components/admin/FulltimeMonthlyAttendanceSheetDialog';
import BulkHolidayDialog from '@/components/admin/BulkHolidayDialog';
import AttendanceRecoveryDialog from '@/components/admin/AttendanceRecoveryDialog';
import StaffSpecialShiftDialog from '@/components/admin/StaffSpecialShiftDialog';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import {
  resolveStaffShift,
  fetchSpecialShifts,
  fetchDepartmentSchedules,
  saveDepartmentSchedule,
  findSpecialShiftForStaff,
  isDateInRange,
  StaffSpecialShift,
} from '@/lib/shiftResolution';
import { useConfirm } from "@/contexts/ConfirmContext";
import { useAppTimezone } from '@/hooks/useAppTimezone';
import { todayIsoInTz, addDaysIsoInTz, toMonthYearInTz } from '@/lib/timezone';
import { resolveThursdayHalfCategories, isThursdayDate, isSpecialDayDate, DAY_OF_WEEK_OPTIONS, getSpecialDayDeductionRateMode, getScheduleForDay } from '@/lib/thursdayHalfDay';
import { attendanceRecordsForDate, MISSING_ATTENDANCE_CONFLICT_OPTIONS } from '@/lib/attendanceRecords';
import { cn } from '@/lib/utils';

const STATUS_ICONS: Record<string, any> = {
  present: CheckCircle2, absent: XCircle, late: Clock,
  half_day: AlertCircle, leave: CalendarOff,
  excused: CheckCircle2, medical: CheckCircle2,
};
// Format a minute count as hours + minutes (e.g. 90 → "১ ঘণ্টা ৩০ মিনিট" / "1h 30m")
const fmtMins = (mins: number, bn: boolean) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (bn) {
    if (h > 0) return rem > 0 ? `${h} ঘণ্টা ${rem} মিনিট` : `${h} ঘণ্টা`;
    return `${rem} মিনিট`;
  }
  if (h > 0) return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  return `${rem}m`;
};
const STATUS_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  half_day: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  leave: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  excused: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  medical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const DUTY_SHIFTS = [
  { value: 'morning', labelBn: 'সকাল ডিউটি', labelEn: 'Morning Duty', icon: Sun },
  { value: 'evening', labelBn: 'সন্ধ্যা ডিউটি', labelEn: 'Evening Duty', icon: Moon },
];

const MEAL_SHIFTS = [
  { value: 'meal_breakfast', labelBn: 'সকালের নাস্তা', labelEn: 'Breakfast', icon: Coffee },
  { value: 'meal_lunch', labelBn: 'দুপুরের খাবার', labelEn: 'Lunch', icon: Utensils },
  { value: 'meal_dinner', labelBn: 'রাতের খাবার', labelEn: 'Dinner', icon: Utensils },
];

const AdminAttendance = ({ forcedTab }: { forcedTab?: 'student' | 'staff' }) => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  // Full-time attendance lives on /admin/attendance, /admin/staff-attendance and /admin/student-attendance;
  const permsA = usePagePermissions('/admin/attendance');
  const permsB = usePagePermissions('/admin/staff-attendance');
  const permsC = usePagePermissions('/admin/student-attendance');

  const canShowStudentTab = !forcedTab ? (permsA.isFeatureAllowed('tab_student_att') !== false && permsC.canViewPage) : forcedTab === 'student' ? permsC.canViewPage : false;
  const canShowStaffTab = !forcedTab ? (permsA.isFeatureAllowed('tab_staff_att') !== false && permsB.canViewPage) : forcedTab === 'staff' ? permsB.canViewPage : false;

  const canViewPage = forcedTab === 'staff'
    ? permsB.canViewPage
    : forcedTab === 'student'
    ? permsC.canViewPage
    : (permsA.canViewPage || permsB.canViewPage || permsC.canViewPage);

  const activePerms = forcedTab === 'staff' ? permsB : forcedTab === 'student' ? permsC : (permsA.canViewPage ? permsA : permsC);
  const canAddItem = forcedTab ? activePerms.canAddItem : (permsA.canAddItem || activePerms.canAddItem);
  const canEditItem = forcedTab ? activePerms.canEditItem : (permsA.canEditItem || activePerms.canEditItem);
  const canDeleteItem = forcedTab ? activePerms.canDeleteItem : (permsA.canDeleteItem || activePerms.canDeleteItem);
  const canApproveItem = forcedTab ? activePerms.canApproveItem : (permsA.canApproveItem || activePerms.canApproveItem);

  // Anyone with add or edit permissions can mark attendance
  const canMarkAttendance = canAddItem || canEditItem;
  const canBulkMark = canViewPage && canMarkAttendance;
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const { needsApproval, submitForApproval } = useApprovalWorkflow();
  // Non-admins can only mark attendance. Settings, rosters, devices, summaries
  // and exports stay hidden unless the matching permission is granted.
  const canManageAttendance = isAdmin || canApproveItem;
  const canExportAttendance = isAdmin || ((canApproveItem || canDeleteItem) && permsA.isFeatureAllowed('action_export_att') !== false);

  const { timeFormat, setTimeFormat } = useTimeFormat();

  // Auto-sync original staff IDs and master serial order on attendance load
  useEffect(() => {
    if (!isAdmin) return;
    runStaffDeduplicationSync(true).then((res) => {
      if (res.cleanedNamesCount > 0 || res.duplicateRowsHandled > 0) {
        queryClient.invalidateQueries({ queryKey: ['staff'] });
      }
    }).catch(() => {});
  }, [isAdmin, queryClient]);
  const { tz: appTz } = useAppTimezone();
  const fmt = (t: string) => formatTimeDisplay(t, timeFormat);
  const [searchParams] = useSearchParams();

  // Read tab from URL: ?tab=student or ?tab=staff
  const tabParam = searchParams.get('tab');
  const resolvedTab = forcedTab || (tabParam === 'staff' ? 'staff' : 'student');

  const [entityType, setEntityType] = useState<'student' | 'staff'>(resolvedTab);

  const targetMenuPath = entityType === 'staff' ? '/admin/staff-attendance' : '/admin/student-attendance';
  const requiresResetApproval = useMemo(() => {
    if (isAdmin) return false;
    return Boolean(needsApproval(targetMenuPath, 'delete') || needsApproval('/admin/attendance', 'delete'));
  }, [isAdmin, needsApproval, targetMenuPath]);

  // Sync entityType when forcedTab, URL tab param, or permission changes
  useEffect(() => {
    if (forcedTab) {
      setEntityType(forcedTab);
    } else if (!canShowStudentTab && canShowStaffTab) {
      setEntityType('staff');
    } else if (!canShowStaffTab && canShowStudentTab) {
      setEntityType('student');
    } else {
      setEntityType(tabParam === 'staff' ? 'staff' : 'student');
    }
  }, [forcedTab, tabParam, canShowStudentTab, canShowStaffTab]);
const [studentSubTab, setStudentSubTab] = useState<'all' | 'residential' | 'meal'>('all');
  const stafftabParam = searchParams.get('stafftab');
  const [settingsSubTab, setSettingsSubTab] = useState<'all' | 'fulltime' | 'duty' | 'meal'>('all');
  const [staffSubTab, setStaffSubTab] = useState<'fulltime' | 'duty' | 'meal'>(
    stafftabParam === 'duty' ? 'duty' : stafftabParam === 'meal' ? 'meal' : 'fulltime'
  );

  // Sync staffSubTab with ?stafftab=fulltime|duty|meal (separate pages per tab)
  const setSearchParams = useSearchParams()[1];
  const selectStaffSubTab = (v: 'fulltime' | 'duty' | 'meal') => {
    setStaffSubTab(v);
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'staff');
    if (v === 'fulltime') next.delete('stafftab');
    else next.set('stafftab', v);
    setSearchParams(next, { replace: true });
    setSelectedShift(v === 'fulltime' ? 'full_day' : v === 'duty' ? 'morning' : 'meal_breakfast');
  };
  const [selectedStaffCategory, setSelectedStaffCategory] = useState<string>('all');
  const [studentMealShift, setStudentMealShift] = useState('meal_breakfast');
  const [selectedDate, setSelectedDate] = useState(todayIsoInTz(appTz));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionYear, setSelectedSessionYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const [selectedShift, setSelectedShift] = useState(
    stafftabParam === 'duty' ? 'morning' : stafftabParam === 'meal' ? 'meal_breakfast' : 'full_day'
  );
  // Keep the shift in sync when the staff sub-tab changes via URL (deep links)
  useEffect(() => {
    if (staffSubTab === 'duty' && !['morning', 'evening'].includes(selectedShift)) setSelectedShift('morning');
    else if (staffSubTab === 'meal' && !selectedShift.startsWith('meal_')) setSelectedShift('meal_breakfast');
    else if (staffSubTab === 'fulltime' && selectedShift !== 'full_day') setSelectedShift('full_day');
  }, [staffSubTab, selectedShift]);

  const [advanceSettingsOpen, setAdvanceSettingsOpen] = useState(false);

  const { data: advanceMarkingSetting } = useQuery({
    queryKey: ['attendance_advance_marking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'attendance_advance_marking')
        .maybeSingle();
      return (data?.value as any) || { enabled: false, allow_future_leave: true, allow_future_attendance: true };
    },
  });

  const saveAdvanceMarkingMutation = useMutation({
    mutationFn: async (val: any) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'attendance_advance_marking', value: val });
      if (error) throw error;
      return val;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_advance_marking'] });
      toast.success(data?.enabled
        ? (bn ? 'আগাম ছুটি ও হাজিরা সুবিধা চালু হয়েছে' : 'Advance leave & attendance enabled')
        : (bn ? 'আগাম ছুটি ও হাজিরা সুবিধা বন্ধ করা হয়েছে' : 'Advance leave & attendance disabled')
      );
    },
    onError: (err: any) => toast.error(err?.message || 'Error saving setting'),
  });

  const isAdvanceMarkingEnabled = advanceMarkingSetting?.enabled === true;

  const [qrPosterOpen, setQrPosterOpen] = useState(false);
  const [deviceManagerOpen, setDeviceManagerOpen] = useState(false);
  const [staffCheckinOpen, setStaffCheckinOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetType, setResetType] = useState<'all' | 'student' | 'staff' | 'division' | 'single_staff' | 'staff_category'>('all');
  const [resetDivisionId, setResetDivisionId] = useState<string>('');
  const [resetStaffId, setResetStaffId] = useState<string>('');
  const [resetStaffName, setResetStaffName] = useState<string>('');
  const [resetStaffCategory, setResetStaffCategory] = useState<string>('');
  const [showResetMenu, setShowResetMenu] = useState(false);
  const resetBtnRef = useRef<HTMLDivElement>(null);
  const [monthlyStaff, setMonthlyStaff] = useState<any | null>(null);
  const [timeEditorOpenId, setTimeEditorOpenId] = useState<string | null>(null);
  // Effective shift: for students, meal tab uses meal shift; for staff, fulltime=full_day, others use selected
  const isDutyTab = entityType === 'staff' && staffSubTab === 'duty';
  const effectiveShift = entityType === 'student'
    ? (studentSubTab === 'meal' ? studentMealShift : 'full_day')
    : (staffSubTab === 'fulltime' ? 'full_day' : selectedShift);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [mainTab, setMainTab] = usePersistentTab<'attendance' | 'settings'>('attendance', {
    paramName: 'view',
    validTabs: ['attendance', 'settings'] as const,
    storageKey: 'edumate_attendance_main_tab',
  });
  const [dutyViewFilter, setDutyViewFilter] = useState<'both' | 'morning' | 'evening'>('both');
  const [dutyMonthlySheetOpen, setDutyMonthlySheetOpen] = useState(false);
  const [fulltimeMonthlySheetOpen, setFulltimeMonthlySheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm, setRuleForm] = useState({ name: '', name_bn: '', entity_type: 'student', config: { color: 'green', counts_as: 'present' } });
  const [dutyTimes, setDutyTimes] = useState({
    morning_start: '06:00', morning_end: '08:00',
    evening_start: '17:00', evening_end: '19:00',
    extra_duty_enabled: false,
    extra_duty_rate: 0,
    morning_days: 30,
    evening_days: 30,
    total_salary: 0,
  });
  const defaultCategoryTimes: Record<string, { start: string; end: string }> = {
    teacher: { start: '08:00', end: '14:00' },
    support: { start: '08:00', end: '17:00' },
    general: { start: '08:00', end: '17:00' },
  };
  const [categoryShiftTimes, setCategoryShiftTimes] = useState<Record<string, { start: string; end: string }>>(defaultCategoryTimes);

  // Department shift configurations: start, end, individual effective date ranges, and optional special-day schedule
  interface DeptShiftConfig {
    start: string;
    end: string;
    effectiveFrom: string;
    effectiveTo: string;
    isOngoing: boolean;
    specialDay?: {
      enabled: boolean;
      days: number[];
      start?: string;
      end?: string;
      rateMode?: 'regular_duty_rate' | 'special_day_rate';
      daySchedules?: Record<number, { start?: string; end: string; rateMode?: 'regular_duty_rate' | 'special_day_rate' }>;
    };
  }
  const [deptShiftConfigs, setDeptShiftConfigs] = useState<Record<string, DeptShiftConfig>>({});
  const [savingCatKey, setSavingCatKey] = useState<string | null>(null);
  const [selectedDeptTab, setSelectedDeptTab] = useState<string>('all');
  const [specialShiftDialogOpen, setSpecialShiftDialogOpen] = useState(false);

  // Dynamic staff categories from staff_categories table (synced with Designations page)
  const { data: staffCategoriesData = [] } = useQuery({
    queryKey: ['staff-categories-for-shift'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_categories')
        .select('key, name, name_bn, sort_order, id_prefix, id_start_range')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return (data || []) as Array<{ key: string; name: string; name_bn: string; sort_order: number; id_prefix?: string; id_start_range?: number }>;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Date-ranged special shifts query
  const { data: specialShifts = [] } = useQuery({
    queryKey: ['staff_special_shifts'],
    queryFn: async () => fetchSpecialShifts(supabase),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Date-ranged department schedules query
  const { data: departmentSchedules = [] } = useQuery({
    queryKey: ['department_shift_schedules'],
    queryFn: async () => fetchDepartmentSchedules(supabase),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch category shift times
  const { data: savedCategoryTimes } = useQuery({
    queryKey: ['category-shift-times'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'category_shift_times').maybeSingle();
      return data?.value as any;
    },
  });
  useEffect(() => {
    if (savedCategoryTimes && typeof savedCategoryTimes === 'object') {
      setCategoryShiftTimes((prev) => ({ ...defaultCategoryTimes, ...prev, ...savedCategoryTimes }));
    }
  }, [savedCategoryTimes]);

  const categoryLabelMap: Record<string, { bn: string; en: string }> = useMemo(() => {
    const map: Record<string, { bn: string; en: string }> = {
      administrative: { bn: 'প্রশাসন বিভাগ', en: 'Administrative Department' },
      teacher: { bn: 'শিক্ষা বিভাগ', en: 'Education Department' },
      teacher_hifz: { bn: 'হিফজ বিভাগ', en: 'Hifz Department' },
      teacher_nurani_kitab: { bn: 'নূরানী ও কিতাব বিভাগ', en: 'Nurani & Kitab Department' },
      support: { bn: 'অফিস বিভাগ', en: 'Office Department' },
      office_staff: { bn: 'অফিস স্টাফ', en: 'Office Staff' },
      general: { bn: 'সাধারণ / সহায়ক বিভাগ', en: 'General Department' },
      service_staff: { bn: 'সহায়ক কর্মী', en: 'Service Staff' },
      cook: { bn: 'রান্না বিভাগ', en: 'Kitchen Department' },
      chef: { bn: 'রান্না বিভাগ', en: 'Kitchen Department' },
    };
    // Direct dynamic override from DB staff_categories (Designations & Categories page)
    staffCategoriesData.forEach(c => {
      if (!c.key) return;
      const bnName = c.name_bn?.trim() || c.name?.trim() || map[c.key]?.bn || c.key;
      const enName = c.name?.trim() || c.name_bn?.trim() || map[c.key]?.en || c.key;
      map[c.key] = { bn: bnName, en: enName };
    });
    return map;
  }, [staffCategoriesData]);

  const getDeptConfig = (catKey: string): DeptShiftConfig => {
    if (deptShiftConfigs[catKey]) return deptShiftConfigs[catKey];
    const isTeacher = isTeacherCategory(catKey);
    const latest = departmentSchedules
      .filter((s: any) => s.category_key === catKey || (isTeacher && s.category_key === 'teacher'))
      .sort((a: any, b: any) => (b.effective_from || '').localeCompare(a.effective_from || ''))[0];

    const base = categoryShiftTimes[catKey]
      || (isTeacher ? categoryShiftTimes['teacher'] : null)
      || defaultCategoryTimes[catKey]
      || { start: '08:00', end: '17:00' };

    const rawSpecial = (base as any)?.specialDay
      || (isTeacher ? (categoryShiftTimes['teacher'] as any)?.specialDay : null)
      || (isTeacher && (thursdayHalfSetting as any)?.enabled ? {
      enabled: true,
      days: (thursdayHalfSetting as any)?.days || [4],
      start: (thursdayHalfSetting as any)?.start_time || '',
      end: (thursdayHalfSetting as any)?.end_time || '14:00',
      rateMode: (thursdayHalfSetting as any)?.deduction_rate_mode || 'regular_duty_rate',
    } : {
      enabled: false,
      days: [4],
      start: '',
      end: '14:00',
      rateMode: 'regular_duty_rate',
    });

    let daySchedules: Record<number, { start?: string; end: string; rateMode?: 'regular_duty_rate' | 'special_day_rate' }> = {};
    if (rawSpecial?.daySchedules && typeof rawSpecial.daySchedules === 'object' && Object.keys(rawSpecial.daySchedules).length > 0) {
      daySchedules = { ...rawSpecial.daySchedules };
    } else {
      const days = Array.isArray(rawSpecial?.days) && rawSpecial.days.length > 0 ? rawSpecial.days : [4];
      days.forEach((d: number) => {
        daySchedules[d] = {
          start: rawSpecial?.start || '',
          end: rawSpecial?.end || '14:00',
          rateMode: rawSpecial?.rateMode || 'regular_duty_rate',
        };
      });
    }

    const deptSpecial = {
      enabled: rawSpecial?.enabled === true,
      days: Object.keys(daySchedules).map(Number),
      start: rawSpecial?.start || '',
      end: rawSpecial?.end || '14:00',
      rateMode: rawSpecial?.rateMode || 'regular_duty_rate',
      daySchedules,
    };

    return {
      start: latest?.start_time || base.start,
      end: latest?.end_time || base.end,
      effectiveFrom: latest?.effective_from || todayIsoInTz(appTz),
      effectiveTo: latest?.effective_to || '',
      isOngoing: latest ? !latest.effective_to : true,
      specialDay: deptSpecial,
    };
  };

  const updateDeptConfig = (catKey: string, patch: Partial<DeptShiftConfig>) => {
    setDeptShiftConfigs((prev) => {
      const current = prev[catKey] || getDeptConfig(catKey);
      return {
        ...prev,
        [catKey]: { ...current, ...patch },
      };
    });

    if (patch.start !== undefined || patch.end !== undefined) {
      setCategoryShiftTimes((prev) => ({
        ...prev,
        [catKey]: {
          start: patch.start ?? prev[catKey]?.start ?? '08:00',
          end: patch.end ?? prev[catKey]?.end ?? '17:00',
        },
      }));
    }
  };
  const getCategoryLabel = (key: string) => categoryLabelMap[key] ? (bn ? categoryLabelMap[key].bn : categoryLabelMap[key].en) : key;
  const getCategoryResetTone = (key: string) => {
    const tones: Record<string, string> = {
      teacher: 'bg-blue-500/10 text-blue-600',
      administrative: 'bg-amber-500/10 text-amber-600',
      support: 'bg-teal-500/10 text-teal-600',
      general: 'bg-purple-500/10 text-purple-600',
    };

    return tones[key] || 'bg-primary/10 text-primary';
  };

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch holidays (site calendar) to mark on the attendance date picker
  const { data: holidayRows = [] } = useQuery({
    queryKey: ['staff-holidays-calendar'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_holidays')
        .select('holiday_date, name_bn, name_en, holiday_type')
        .is('deleted_at', null);
      return data || [];
    },
  });
  const holidayDates = useMemo(
    () => holidayRows.map((h: any) => h.holiday_date as string),
    [holidayRows],
  );
  const holidayInfo = useMemo(
    () =>
      holidayRows.map((h: any) => ({
        date: h.holiday_date as string,
        label: (bn ? h.name_bn || h.name_en : h.name_en || h.name_bn) || '',
        type: h.holiday_type || '',
      })),
    [holidayRows, bn],
  );


  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch academic sessions (proper session_id source)
  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-attendance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_sessions')
        .select('id, name, name_bn, is_active')
        .order('name', { ascending: false });
      return data || [];
    },
  });

  // Fetch students
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students-attendance'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('status', 'active').is('deleted_at', null);
      return data || [];
    },
    enabled: entityType === 'student',
  });

  // Fetch staff
  const committeeInfo = useCommitteeStaffIds();
  const [showCommitteeStaff, setShowCommitteeStaff] = useState(false);
  const { data: allStaffRaw = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('*')
        // Inactive staff stay available for PAST dates where attendance already
        // exists; they are filtered out per-date below.
        .in('status', ['active', 'inactive'])
        .order('salary_order', { ascending: true, nullsFirst: false })
        .order('name_bn', { ascending: true });
      return data || [];
    },
    enabled: entityType === 'staff',
  });
  const allStaff = useMemo(() => {
    const base = showCommitteeStaff
      ? (allStaffRaw as any[])
      : (allStaffRaw as any[]).filter((s: any) => !committeeInfo.ids.has(s.id));
    return sortStaffByDepartment(base, { categories: staffCategoriesData, bn, deduplicate: true });
  }, [allStaffRaw, showCommitteeStaff, committeeInfo.ids, staffCategoriesData, bn]);
  const committeeHiddenCount = (allStaffRaw as any[]).filter((s: any) => committeeInfo.ids.has(s.id)).length;

  const dynamicStaffCategories = useMemo(() => {
    const list: string[] = [];
    // 1. Categories actively defined in DB staff_categories (Designations/Departments page)
    (staffCategoriesData || []).forEach(c => {
      if (c.key && !list.includes(c.key)) list.push(c.key);
    });

    // 2. Also include any category actively assigned to existing staff members
    (allStaffRaw as any[] || []).forEach((s: any) => {
      const k = s.staff_category;
      if (k && !list.includes(k) && !k.startsWith('__')) list.push(k);
    });

    // 3. If teacher_nurani_kitab or teacher_hifz exists in active categories,
    // remove obsolete legacy generic 'teacher' ("শিক্ষা বিভাগ") to prevent duplicate cards.
    const hasSpecificTeacherCat = list.some(k => k === 'teacher_nurani_kitab' || k === 'teacher_hifz');
    const hasStaffWithGenericTeacher = (allStaffRaw as any[] || []).some((s: any) => s.staff_category === 'teacher');
    const isGenericTeacherInDb = (staffCategoriesData || []).some(c => c.key === 'teacher');

    if (hasSpecificTeacherCat && !hasStaffWithGenericTeacher && !isGenericTeacherInDb) {
      const idx = list.indexOf('teacher');
      if (idx !== -1) list.splice(idx, 1);
    }

    // 4. Only if database has no categories at all, use standard fallback
    if (list.length === 0) {
      if (savedCategoryTimes && typeof savedCategoryTimes === 'object') {
        Object.keys(savedCategoryTimes).forEach(k => {
          if (k && !list.includes(k) && !k.startsWith('__')) list.push(k);
        });
      }
      if (list.length === 0) {
        const defaults = ['administrative', 'teacher', 'support', 'general'];
        defaults.forEach(d => list.push(d));
      }
    }
    return list;
  }, [staffCategoriesData, allStaffRaw, savedCategoryTimes]);

  const toBnDigits = (str: string | number) => String(str).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
  const normalizeDaytimeCheckOut = (val?: string | null, scheduledEnd?: string | null): string => {
    if (!val || !scheduledEnd) return val || '';
    const [sh, sm] = (scheduledEnd || '0:0').split(':').map(Number);
    const sEndMin = (sh || 0) * 60 + (sm || 0);
    if (sEndMin < 12 * 60) return val;
    const [ch, cm] = val.split(':').map(Number);
    const cMin = (ch || 0) * 60 + (cm || 0);
    if (ch < 12 && Math.abs(((ch + 12) * 60 + (cm || 0)) - sEndMin) < Math.abs(cMin - sEndMin)) {
      return `${String(ch + 12).padStart(2, '0')}:${String(cm || 0).padStart(2, '0')}`;
    }
    return val;
  };

  const fmtDate = (dStr?: string | null) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      return bn ? toBnDigits(formatted) : formatted;
    }
    return dStr;
  };

  interface SpecialDutyGroup {
    id: string;
    name: string;
    duty_start_time: string;
    duty_end_time: string;
    effective_from: string;
    effective_to: string | null;
    isOngoing: boolean;
    staffIds: string[];
    staffNames: string[];
    shifts: StaffSpecialShift[];
    isActiveOnSelectedDate: boolean;
  }

  // Groups all active special shifts into distinct named duties (just like departments)
  const specialDutyGroups = useMemo<SpecialDutyGroup[]>(() => {
    if (!Array.isArray(specialShifts) || specialShifts.length === 0) return [];

    const map = new Map<string, SpecialDutyGroup>();

    specialShifts.forEach((shift) => {
      if (shift.is_active === false) return;
      const rawName = (shift.note || '').trim();
      const name = rawName || (bn ? 'আলাদা বিশেষ ডিউটি' : 'Special Duty Shift');
      const groupKey = `${name}__${shift.duty_start_time}__${shift.duty_end_time}__${shift.effective_from}__${shift.effective_to || 'ongoing'}`;

      const staffMember = allStaff.find((s: any) => s.id === shift.staff_id);
      const staffName = staffMember
        ? getStaffDisplayNames(staffMember.name_bn, staffMember.name_en, bn).primary
        : (shift.staff_name || '');

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: groupKey,
          name,
          duty_start_time: shift.duty_start_time,
          duty_end_time: shift.duty_end_time,
          effective_from: shift.effective_from,
          effective_to: shift.effective_to || null,
          isOngoing: !shift.effective_to,
          staffIds: [],
          staffNames: [],
          shifts: [],
          isActiveOnSelectedDate: isDateInRange(selectedDate, shift.effective_from, shift.effective_to),
        });
      }

      const g = map.get(groupKey)!;
      if (shift.staff_id && !g.staffIds.includes(shift.staff_id)) {
        g.staffIds.push(shift.staff_id);
        if (staffName && !g.staffNames.includes(staffName)) g.staffNames.push(staffName);
      }
      g.shifts.push(shift);
    });

    return Array.from(map.values());
  }, [specialShifts, allStaff, selectedDate, bn]);

  // Build session options: prefer academic_sessions (id-based), fallback to legacy session_year text
  const sessionOptions = useMemo(() => {
    if (academicSessions.length > 0) {
      return academicSessions.map((s: any) => ({
        value: s.id,
        label: bn ? (s.name_bn || s.name) : s.name,
        isLegacy: false,
      }));
    }
    const years = new Set(allStudents.map((s: any) => s.session_year).filter(Boolean));
    return Array.from(years).sort().reverse().map((y: any) => ({
      value: y as string,
      label: y as string,
      isLegacy: true,
    }));
  }, [academicSessions, allStudents, bn]);

  // Set default session
  useEffect(() => {
    if (sessionOptions.length > 0 && !selectedSessionYear) {
      const active = academicSessions.find((s: any) => s.is_active);
      setSelectedSessionYear(active?.id || sessionOptions[0].value);
    }
  }, [sessionOptions, academicSessions, selectedSessionYear]);

  const orderedClasses = useMemo(() => {
    const divisionOrder = new Map(divisions.map((d: any, index: number) => [d.id, d.sort_order ?? index]));

    return [...classes].sort((a: any, b: any) => {
      const divisionA = divisionOrder.get(a.division_id) ?? 9999;
      const divisionB = divisionOrder.get(b.division_id) ?? 9999;
      if (divisionA !== divisionB) return divisionA - divisionB;

      const classA = a.sort_order ?? 9999;
      const classB = b.sort_order ?? 9999;
      if (classA !== classB) return classA - classB;

      return String(a.name_bn || a.name || '').localeCompare(String(b.name_bn || b.name || ''), 'bn');
    });
  }, [classes, divisions]);

  // Filter students based on sub-tab and filters
  // ── Residential duty roster (weekly template + per-day overrides) ──
  const { data: dutyShiftDefs = [] } = useQuery({
    queryKey: ['duty-shift-defs'],
    queryFn: async () => {
      const { data } = await supabase.from('duty_shifts').select('id, code, is_active').is('deleted_at', null);
      return (data || []) as any[];
    },
  });

  const { data: dutyTemplateRows = [] } = useQuery({
    queryKey: ['duty-weekly-template-attendance'],
    queryFn: async () => {
      const { data } = await supabase.from('duty_weekly_template').select('staff_id, shift_id, weekday').eq('is_active', true);
      return (data || []) as any[];
    },
  });

  const { data: dutyRosterRows = [] } = useQuery({
    queryKey: ['duty-roster-attendance', selectedDate],
    queryFn: async () => {
      const { data } = await supabase.from('duty_roster').select('staff_id, shift_id, duty_date').eq('duty_date', selectedDate);
      return (data || []) as any[];
    },
  });

  // Duty shift definitions (morning & evening)
  const morningDutyShiftDef = useMemo(() => (dutyShiftDefs as any[]).find((s) => s.code === 'morning'), [dutyShiftDefs]);
  const eveningDutyShiftDef = useMemo(() => (dutyShiftDefs as any[]).find((s) => s.code === 'evening'), [dutyShiftDefs]);

  // Which duty_shifts row matches the selected morning/evening shift (fallback)
  const currentDutyShiftId = useMemo(() => {
    const found = (dutyShiftDefs as any[]).find((s) => s.code === selectedShift);
    return found?.id as string | undefined;
  }, [dutyShiftDefs, selectedShift]);

  // Helper: compute rostered staff IDs for a specific duty shift on selectedDate
  const getDutyStaffIdsForShiftId = useCallback((shiftId?: string) => {
    const ids = new Set<string>();
    if (!shiftId) return ids;
    const weekday = new Date(`${selectedDate}T00:00:00`).getDay();
    const overriddenStaff = new Set((dutyRosterRows as any[]).map((r) => r.staff_id));
    (dutyRosterRows as any[]).forEach((r) => {
      if (r.shift_id === shiftId) ids.add(r.staff_id);
    });
    (dutyTemplateRows as any[]).forEach((t) => {
      if (overriddenStaff.has(t.staff_id)) return; // day override replaces template
      if (t.weekday === weekday && t.shift_id === shiftId) ids.add(t.staff_id);
    });
    return ids;
  }, [selectedDate, dutyRosterRows, dutyTemplateRows]);

  const morningDutyStaffIds = useMemo(
    () => getDutyStaffIdsForShiftId(morningDutyShiftDef?.id),
    [getDutyStaffIdsForShiftId, morningDutyShiftDef?.id]
  );

  const eveningDutyStaffIds = useMemo(
    () => getDutyStaffIdsForShiftId(eveningDutyShiftDef?.id),
    [getDutyStaffIdsForShiftId, eveningDutyShiftDef?.id]
  );

  // Duty tab is strictly roster-driven
  const dutyRosterActive = useMemo(
    () => staffSubTab === 'duty' && (!!morningDutyShiftDef || !!eveningDutyShiftDef || !!currentDutyShiftId),
    [staffSubTab, morningDutyShiftDef, eveningDutyShiftDef, currentDutyShiftId],
  );

  // Staff on duty for the selected date + shift (day override beats template)
  const dutyStaffIdsForDate = useMemo(() => {
    return getDutyStaffIdsForShiftId(currentDutyShiftId);
  }, [getDutyStaffIdsForShiftId, currentDutyShiftId]);

  const entitiesRaw = useMemo(() => {

    if (entityType === 'staff') {
      let staffFiltered = allStaff;
      // Filter by staff category or special duty
      if (selectedStaffCategory && selectedStaffCategory !== 'all') {
        if (selectedStaffCategory.startsWith('special_')) {
          const dutyName = selectedStaffCategory.replace('special_', '');
          const matchingGroups = specialDutyGroups.filter(g => g.name === dutyName);
          const staffIdSet = new Set(matchingGroups.flatMap(g => g.staffIds));
          staffFiltered = staffFiltered.filter((s: any) => staffIdSet.has(s.id));
        } else {
          staffFiltered = staffFiltered.filter((s: any) => s.staff_category === selectedStaffCategory);
        }
      }
      // Meal tab: only residential staff
      if (staffSubTab === 'meal') {
        return staffFiltered.filter((s: any) => s.residence_type === 'residential' || s.residence_type === 'resident');
      }
      // Duty tab: strictly roster-driven — only staff rostered for morning/evening shifts appear
      if (staffSubTab === 'duty') {
        if (!dutyRosterActive) return [];
        return staffFiltered.filter((s: any) =>
          morningDutyStaffIds.has(s.id) ||
          eveningDutyStaffIds.has(s.id) ||
          dutyStaffIdsForDate.has(s.id)
        );
      }

      // Full-time: all filtered staff
      return staffFiltered;
    }

    let filtered = allStudents;

    // Residential or Meal sub-tab: only residential students
    if (studentSubTab === 'residential' || studentSubTab === 'meal') {
      filtered = filtered.filter((s: any) => s.residence_type === 'resident');
    }

    // Common filters for all student sub-tabs: session (id or legacy year) + division/class
    if (selectedSessionYear) {
      filtered = filtered.filter((s: any) =>
        s.session_id === selectedSessionYear || s.session_year === selectedSessionYear
      );
    }
    if (selectedClassId && selectedClassId !== 'all') {
      filtered = filtered.filter((s: any) => s.class_id === selectedClassId);
    }

    // Sort by global class serial, then by roll_number numerically
    const classOrder = new Map(orderedClasses.map((c: any, i: number) => [c.id, i]));
    filtered.sort((a: any, b: any) => {
      const classA = classOrder.get(a.class_id) ?? 9999;
      const classB = classOrder.get(b.class_id) ?? 9999;
      if (classA !== classB) return classA - classB;
      const rollA = parseInt(a.roll_number || '0', 10);
      const rollB = parseInt(b.roll_number || '0', 10);
      return rollA - rollB;
    });

    return filtered;
  }, [entityType, allStudents, allStaff, studentSubTab, selectedSessionYear, selectedClassId, orderedClasses, staffSubTab, selectedStaffCategory, specialDutyGroups, dutyRosterActive, dutyStaffIdsForDate, morningDutyStaffIds, eveningDutyStaffIds]);

  // Fetch attendance for selected date (for duty tab, fetch both morning & evening together)
  const { data: attendanceRaw = [] } = useQuery({
    queryKey: ['attendance', selectedDate, entityType, isDutyTab ? 'duty_both' : effectiveShift],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', selectedDate)
        .eq('entity_type', entityType);

      if (isDutyTab) {
        query = query.in('shift', ['morning', 'evening']);
      } else {
        query = query.eq('shift', effectiveShift);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const attendance = useMemo(
    () => attendanceRecordsForDate(attendanceRaw, selectedDate),
    [attendanceRaw, selectedDate],
  );

  // Inactive (resigned/left) staff must NOT show on dates after their resignation.
  // Past dates before or on the resign date preserve attendance history.
  const { isResignedOnDate, getResignDate } = useResignedStaff();

  const entities = useMemo(() => {
    if (entityType !== 'staff') return entitiesRaw;
    return (entitiesRaw as any[]).filter((e: any) => {
      const rd = getResignDate(e.id);
      // Strictly exclude from attendance roster on any date AFTER the resignation date
      if (rd && selectedDate > rd) {
        return false;
      }
      // Strictly exclude from attendance roster on any date BEFORE the joining date
      const jd = e.joining_date ? String(e.joining_date).slice(0, 10) : '';
      if (jd && selectedDate < jd && !attendance.some((a: any) => a.entity_id === e.id)) {
        return false;
      }
      // Inactive staff with no record on this date are hidden
      if (e.status === 'inactive' && !attendance.some((a: any) => a.entity_id === e.id)) {
        return false;
      }
      // Resigned staff disappear on/after resign date unless viewing pre-existing record on that exact day
      if (isResignedOnDate(e.id, selectedDate) && !attendance.some((a: any) => a.entity_id === e.id)) {
        return false;
      }
      return true;
    });
  }, [entitiesRaw, entityType, attendance, isResignedOnDate, getResignDate, selectedDate]);

  // Separate morning & evening duty roster entities for Residential Duty tab
  const morningDutyEntities = useMemo(() => {
    if (!isDutyTab) return [];
    let list = allStaff;
    if (selectedStaffCategory && selectedStaffCategory !== 'all') {
      if (selectedStaffCategory.startsWith('special_')) {
        const dutyName = selectedStaffCategory.replace('special_', '');
        const matchingGroups = specialDutyGroups.filter(g => g.name === dutyName);
        const staffIdSet = new Set(matchingGroups.flatMap(g => g.staffIds));
        list = list.filter((s: any) => staffIdSet.has(s.id));
      } else {
        list = list.filter((s: any) => s.staff_category === selectedStaffCategory);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s: any) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.name_bn && s.name_bn.toLowerCase().includes(q)) ||
        (s.designation && s.designation.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
      );
    }
    return list.filter((e: any) => {
      const rd = getResignDate(e.id);
      if (rd && selectedDate > rd) return false;
      const jd = e.joining_date ? String(e.joining_date).slice(0, 10) : '';
      if (jd && selectedDate < jd) return false;
      const hasAtt = attendance.some((a: any) => a.entity_id === e.id && a.shift === 'morning');
      if (e.status === 'inactive' && !hasAtt) return false;
      if (isResignedOnDate(e.id, selectedDate) && !hasAtt) return false;
      return morningDutyStaffIds.has(e.id) || hasAtt;
    });
  }, [isDutyTab, allStaff, selectedStaffCategory, specialDutyGroups, searchQuery, getResignDate, selectedDate, attendance, isResignedOnDate, morningDutyStaffIds]);

  const eveningDutyEntities = useMemo(() => {
    if (!isDutyTab) return [];
    let list = allStaff;
    if (selectedStaffCategory && selectedStaffCategory !== 'all') {
      if (selectedStaffCategory.startsWith('special_')) {
        const dutyName = selectedStaffCategory.replace('special_', '');
        const matchingGroups = specialDutyGroups.filter(g => g.name === dutyName);
        const staffIdSet = new Set(matchingGroups.flatMap(g => g.staffIds));
        list = list.filter((s: any) => staffIdSet.has(s.id));
      } else {
        list = list.filter((s: any) => s.staff_category === selectedStaffCategory);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s: any) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.name_bn && s.name_bn.toLowerCase().includes(q)) ||
        (s.designation && s.designation.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
      );
    }
    return list.filter((e: any) => {
      const rd = getResignDate(e.id);
      if (rd && selectedDate > rd) return false;
      const jd = e.joining_date ? String(e.joining_date).slice(0, 10) : '';
      if (jd && selectedDate < jd) return false;
      const hasAtt = attendance.some((a: any) => a.entity_id === e.id && a.shift === 'evening');
      if (e.status === 'inactive' && !hasAtt) return false;
      if (isResignedOnDate(e.id, selectedDate) && !hasAtt) return false;
      return eveningDutyStaffIds.has(e.id) || hasAtt;
    });
  }, [isDutyTab, allStaff, selectedStaffCategory, specialDutyGroups, searchQuery, getResignDate, selectedDate, attendance, isResignedOnDate, eveningDutyStaffIds]);

  // Fetch attendance rules
  const { data: rules = [] } = useQuery({
    queryKey: ['attendance-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance_rules').select('*').order('entity_type').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Auto-heal duplicate attendance rules in DB
  useEffect(() => {
    if (!isAdmin || !rules.length) return;
    const seen = new Map<string, string>();
    const duplicateIds: string[] = [];

    rules.forEach((r: any) => {
      const countsAs = (r.config as any)?.counts_as || r.name.toLowerCase();
      const key = `${r.entity_type}:${r.rule_type}:${countsAs}`;
      if (seen.has(key)) {
        duplicateIds.push(r.id);
      } else {
        seen.set(key, r.id);
      }
    });

    if (duplicateIds.length > 0) {
      (async () => {
        try {
          const { error } = await supabase.from('attendance_rules').delete().in('id', duplicateIds);
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['attendance-rules'] });
          }
        } catch (e) {
          console.error('Failed to auto-heal duplicate attendance rules:', e);
        }
      })();
    }
  }, [rules, isAdmin, queryClient]);

  // Fetch residential duty times
  const { data: savedDutyTimes } = useQuery({
    queryKey: ['residential-duty-times'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'residential_duty_times').maybeSingle();
      return data?.value as any;
    },
  });

  // Sync loaded duty times to state
  useEffect(() => {
    if (savedDutyTimes) {
      setDutyTimes({
        morning_start: savedDutyTimes.morning_start || '06:00',
        morning_end: savedDutyTimes.morning_end || '08:00',
        evening_start: savedDutyTimes.evening_start || '17:00',
        evening_end: savedDutyTimes.evening_end || '19:00',
        extra_duty_enabled: savedDutyTimes.extra_duty_enabled || false,
        extra_duty_rate: savedDutyTimes.extra_duty_rate || 0,
        morning_days: savedDutyTimes.morning_days || 30,
        evening_days: savedDutyTimes.evening_days || 30,
        total_salary: savedDutyTimes.total_salary || 0,
      });
    }
  }, [savedDutyTimes]);

  // Shared time validation: returns { ok, minutes, overnight, error }
  // Supports overnight shifts (end <= start ⇒ +24h next day).
  const validateShiftWindow = (start: string, end: string): { ok: boolean; minutes: number; overnight: boolean; error?: string } => {
    const tToMin = (t: string) => {
      if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return NaN;
      const [h, m] = t.split(':').map(Number);
      if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
      return h * 60 + m;
    };
    if (!start || !end) return { ok: false, minutes: 0, overnight: false, error: bn ? 'শুরু/শেষ সময় ফাঁকা' : 'start/end empty' };
    const s = tToMin(start), e = tToMin(end);
    if (isNaN(s) || isNaN(e)) return { ok: false, minutes: 0, overnight: false, error: bn ? 'অবৈধ সময় ফরম্যাট (HH:MM)' : 'invalid time format (HH:MM)' };
    if (s === e) return { ok: false, minutes: 0, overnight: false, error: bn ? 'শুরু ও শেষ সময় একই হতে পারবে না' : 'start and end cannot be identical' };
    const overnight = e < s;
    const minutes = overnight ? (24 * 60 - s) + e : e - s;
    if (minutes < 30) return { ok: false, minutes, overnight, error: bn ? 'কমপক্ষে ৩০ মিনিট হতে হবে' : 'minimum 30 minutes required' };
    if (minutes > 18 * 60) return { ok: false, minutes, overnight, error: bn ? '১৮ ঘন্টার বেশি ডিউটি অনুমোদিত নয়' : 'duty cannot exceed 18 hours' };
    return { ok: true, minutes, overnight };
  };

  const saveDutyTimesMutation = useMutation({
    mutationFn: async (times: typeof dutyTimes) => {
      // ===== Validate morning + evening shift windows (overnight-aware) =====
      const overnightWarnings: string[] = [];
      const checks: Array<[string, string, string]> = [
        [bn ? 'সকাল ডিউটি' : 'Morning duty', times.morning_start, times.morning_end],
        [bn ? 'সন্ধ্যা ডিউটি' : 'Evening duty', times.evening_start, times.evening_end],
      ];
      for (const [label, s, e] of checks) {
        const res = validateShiftWindow(s, e);
        if (!res.ok) {
          throw new Error(`${label}: ${res.error}`);
        }
        if (res.overnight) {
          overnightWarnings.push(`${label} (${s} → ${e}, ${Math.floor(res.minutes / 60)}h ${res.minutes % 60}m)`);
        }
      }

      // Validation: extra_duty_rate must be ≥ 0 and ≤ 10,000,000 if enabled
      if (times.extra_duty_enabled) {
        const rate = Number(times.extra_duty_rate);
        if (!Number.isFinite(rate) || isNaN(rate)) {
          throw new Error(bn ? 'অতিরিক্ত ডিউটি বেতন একটি বৈধ সংখ্যা হতে হবে' : 'Extra duty rate must be a valid number');
        }
        if (rate < 0) {
          throw new Error(bn ? 'অতিরিক্ত ডিউটি বেতন ঋণাত্মক হতে পারবে না' : 'Extra duty rate cannot be negative');
        }
        if (rate === 0) {
          throw new Error(bn ? 'অতিরিক্ত ডিউটি চালু থাকলে শূন্যের বেশি বেতন দিতে হবে' : 'Extra duty rate must be greater than 0 when enabled');
        }
        if (rate > 10000000) {
          throw new Error(bn ? 'অতিরিক্ত ডিউটি বেতন ১,০০,০০,০০০ এর বেশি হতে পারবে না' : 'Extra duty rate cannot exceed 10,000,000');
        }
        if (Number(times.morning_days) < 0 || Number(times.morning_days) > 31 || Number(times.evening_days) < 0 || Number(times.evening_days) > 31) {
          throw new Error(bn ? 'ডিউটি দিন ০ থেকে ৩১ এর মধ্যে হতে হবে' : 'Duty days must be between 0 and 31');
        }
      }
      const { error } = await supabase.from('website_settings').upsert(
        { key: 'residential_duty_times', value: times, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      return { overnightWarnings };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['residential-duty-times'] });
      queryClient.invalidateQueries({ queryKey: ['residential-duty-times-salary'] });
      toast.success(bn ? 'ডিউটি টাইম সেভ হয়েছে' : 'Duty times saved');
      if (res?.overnightWarnings?.length) {
        toast.info(
          (bn ? 'ওভারনাইট শিফট সনাক্ত হয়েছে: ' : 'Overnight shift detected: ') + res.overnightWarnings.join(' • '),
          { duration: 6000 }
        );
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || (bn ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save'));
    },
  });

  // Thursday half-day check-in/check-out setting (from salary settings)
  const { data: thursdayHalfSetting } = useQuery({
    queryKey: ['thursday-half-day-setting'],
    queryFn: async () => {
      const { data } = await supabase.from('salary_settings').select('setting_value').eq('setting_key', 'thursday_half_day_education').maybeSingle();
      return (data?.setting_value as any) || null;
    },
  });

  const saveCategoryTimesMutation = useMutation({
    mutationFn: async (deptPayloads: Record<string, DeptShiftConfig>) => {
      // ===== Validation (overnight-aware via shared validateShiftWindow) =====
      const errors: string[] = [];
      const overnightWarnings: string[] = [];
      for (const [k, v] of Object.entries(deptPayloads)) {
        if (k === '__overnightWarnings') continue;
        const label = getCategoryLabel(k) || k;
        const res = validateShiftWindow(v?.start, v?.end);
        if (!res.ok) {
          errors.push(`${label}: ${res.error}`);
          continue;
        }
        if (res.overnight) {
          overnightWarnings.push(`${label} (${v.start} → ${v.end})`);
        }
        if (!v.isOngoing && v.effectiveTo && v.effectiveTo < v.effectiveFrom) {
          errors.push(`${label}: ${bn ? 'সমাপ্তির তারিখ শুরুর তারিখের পূর্বের হতে পারবে না' : 'End date cannot be earlier than start date'}`);
        }
      }
      if (errors.length) {
        throw new Error(errors.join(' • '));
      }
      // Stash warnings for onSuccess
      (deptPayloads as any).__overnightWarnings = overnightWarnings;

      // ===== Capture old values for audit =====
      const oldTimes = (savedCategoryTimes as Record<string, { start: string; end: string }>) || {};

      // ===== Save settings (strip transient warnings field) =====
      // Preserve existing categories in DB so saving one department does not delete others
      const cleanTimes: Record<string, any> = {
        ...(savedCategoryTimes && typeof savedCategoryTimes === 'object' ? savedCategoryTimes : {}),
      };
      for (const [k, v] of Object.entries(deptPayloads)) {
        if (k === '__overnightWarnings') continue;
        const sp = (v as any).specialDay;
        let cleanSp: any = null;
        if (sp) {
          const dayKeys = sp.daySchedules ? Object.keys(sp.daySchedules).map(Number) : (sp.days || [4]);
          const firstDay = dayKeys[0];
          const firstRule = (firstDay !== undefined && sp.daySchedules) ? sp.daySchedules[firstDay] : null;
          cleanSp = {
            enabled: sp.enabled === true,
            days: dayKeys,
            daySchedules: sp.daySchedules || null,
            start: sp.start || firstRule?.start || '',
            end: sp.end || firstRule?.end || '14:00',
            rateMode: sp.rateMode || firstRule?.rateMode || 'regular_duty_rate',
          };
        }
        cleanTimes[k] = {
          start: (v as any).start,
          end: (v as any).end,
          specialDay: cleanSp,
        };
      }
      const { error } = await supabase.from('website_settings').upsert(
        { key: 'category_shift_times', value: cleanTimes, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;

      // ===== Save date-ranged schedules for EACH department with its OWN date range =====
      for (const [catKey, cfg] of Object.entries(deptPayloads)) {
        if (catKey === '__overnightWarnings') continue;
        await saveDepartmentSchedule(supabase, {
          id: crypto.randomUUID(),
          category_key: catKey,
          start_time: cfg.start,
          end_time: cfg.end,
          effective_from: cfg.effectiveFrom || todayIsoInTz(appTz),
          effective_to: cfg.isOngoing ? null : cfg.effectiveTo || null,
          note: bn ? `${getCategoryLabel(catKey)} শিফট আপডেট` : `${catKey} shift update`,
          updated_at: new Date().toISOString(),
        });
      }

      // ===== Audit log + auto-recalc per changed category =====
      const { data: { user } } = await supabase.auth.getUser();
      let actorName: string | null = null;
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        actorName = (prof as any)?.full_name || user.email || null;
      }

      const monthYear = toMonthYearInTz(new Date(), appTz); // YYYY-MM in app tz
      let totalRecalc = 0;
      const auditEntries: any[] = [];

      for (const [catKey, newVal] of Object.entries(cleanTimes)) {
        const oldVal = oldTimes[catKey];
        const changed = !oldVal || oldVal.start !== newVal.start || oldVal.end !== newVal.end;
        if (!changed) continue;

        // Find affected staff for this category
        const { data: affectedStaff } = await supabase
          .from('staff')
          .select('id')
          .eq('staff_category', catKey)
          .is('deleted_at', null);
        const staffIds = (affectedStaff || []).map((s: any) => s.id);

        // Auto-recalc: touch pending salary records' updated_at so consumers refetch.
        // Actual recompute happens in AdminSalary using latest shift times when displayed/recalculated.
        let recalcCount = 0;
        if (staffIds.length > 0) {
          const { data: recs } = await supabase
            .from('salary_records')
            .select('id')
            .in('staff_id', staffIds)
            .eq('month_year', monthYear)
            .eq('status', 'pending');
          recalcCount = recs?.length || 0;
          if (recalcCount > 0) {
            await supabase
              .from('salary_records')
              .update({ updated_at: new Date().toISOString() })
              .in('id', recs!.map((r: any) => r.id));
          }
        }
        totalRecalc += recalcCount;

        auditEntries.push({
          category_key: catKey,
          category_label: getCategoryLabel(catKey) || catKey,
          old_start: oldVal?.start || null,
          old_end: oldVal?.end || null,
          new_start: newVal.start,
          new_end: newVal.end,
          changed_by: user?.id || null,
          changed_by_name: actorName,
          affected_staff_count: staffIds.length,
          affected_salary_records: recalcCount,
          affected_staff_ids: staffIds,
        });
      }

      if (auditEntries.length > 0) {
        await supabase.from('shift_time_audit_log').insert(auditEntries);
      }

      return { changedCount: auditEntries.length, totalRecalc, overnightWarnings };
    },
    onSuccess: ({ changedCount, totalRecalc, overnightWarnings }) => {
      queryClient.invalidateQueries({ queryKey: ['category-shift-times'] });
      queryClient.invalidateQueries({ queryKey: ['category-shift-times-salary'] });
      queryClient.invalidateQueries({ queryKey: ['department_shift_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      queryClient.invalidateQueries({ queryKey: ['shift-time-audit-log'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      const msg = bn
        ? `সেভ হয়েছে${changedCount > 0 ? ` • ${changedCount} ডিপার্টমেন্ট পরিবর্তিত • ${totalRecalc} বেতন রেকর্ড আপডেট` : ''}`
        : `Saved${changedCount > 0 ? ` • ${changedCount} category changes • ${totalRecalc} salary records refreshed` : ''}`;
      toast.success(msg);
      if (overnightWarnings.length) {
        toast.info(
          (bn ? 'ওভারনাইট শিফট সনাক্ত হয়েছে: ' : 'Overnight shift detected: ') + overnightWarnings.join(' • '),
          { duration: 6000 }
        );
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || (bn ? 'সেভ করা যায়নি' : 'Failed to save'));
    },
  });

  const handleSaveSingleDepartment = async (catKey: string, catLabel: string) => {
    setSavingCatKey(catKey);
    try {
      const cfg = getDeptConfig(catKey);
      await saveCategoryTimesMutation.mutateAsync({ [catKey]: cfg } as any);
      toast.success(bn ? `"${catLabel}" এর সময়সূচি ও সেশন সফলভাবে সংরক্ষিত হয়েছে` : `Shift saved for ${catLabel}`);
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save'));
    } finally {
      setSavingCatKey(null);
    }
  };

  // Apply the Thursday half-day check-in/check-out window when the selected date is a
  // Thursday and the staff belongs to a configured department.
  // Teachers get Thursday half-day regardless of custom personal profile hours.
  // Only a date-ranged special shift overrides this.
  const applyThursdayWindow = (entity: any, base: { start: string; end: string }, isSpecialShift = false) => {
    if (isSpecialShift) return base;
    if (entity?.type === 'student') return base;
    const catKey = entity?.staff_category;
    if (!catKey) return base;

    // Check department-specific special day setting first
    const deptSpecial = (categoryShiftTimes[catKey] as any)?.specialDay
      || (isTeacherCategory(catKey) ? (categoryShiftTimes['teacher'] as any)?.specialDay : null);
    if (deptSpecial && deptSpecial.enabled) {
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
      const sched = getScheduleForDay(deptSpecial, dayOfWeek);
      if (sched) {
        return {
          start: sched.start || base.start,
          end: sched.end || '14:00',
        };
      }
    }

    // Fallback to legacy/global setting
    const appliesThu = shouldApplyThursdayHalfDay({
      setting: thursdayHalfSetting as any,
      staffCategory: catKey,
      attendanceDate: selectedDate,
      isOvernight: false,
    });
    if (!appliesThu) return base;
    return {
      start: (thursdayHalfSetting as any)?.start_time || base.start,
      end: (thursdayHalfSetting as any)?.end_time || '14:00',
    };
  };

  // Helper: get shift time for a staff entity (special shift > per-staff override > department shift)
  const getCategoryTime = (entity: any) => {
    const resolved = resolveStaffShift({
      staffId: entity?.id,
      staffCategory: entity?.staff_category,
      targetDate: selectedDate,
      profileDuty: {
        start: entity?.duty_start_time,
        end: entity?.duty_end_time,
      },
      specialShifts,
      departmentSchedules,
      categoryTimes: categoryShiftTimes,
    });

    return applyThursdayWindow(entity, { start: resolved.start, end: resolved.end }, resolved.source === 'special');
  };

  const getStaffShiftTime = (entity: any, shift?: string) => {
    if (staffSubTab === 'duty') {
      const targetShift = shift || selectedShift;
      const base = targetShift === 'evening'
        ? { start: dutyTimes.evening_start, end: dutyTimes.evening_end }
        : { start: dutyTimes.morning_start, end: dutyTimes.morning_end };
      return applyThursdayWindow(entity, base);
    }

    return getCategoryTime(entity);
  };

  // Manual marking defaults to the configured shift window. Explicit edits are preserved.
  const getAutoAttendanceTimes = (entityId: string, status: string, existing?: any, shift?: string) => {
    if (!['present', 'late', 'half_day'].includes(status)) return {};
    if (entityType === 'staff' && staffSubTab === 'meal') return {};
    const entity = (allStaff as any[]).find((item: any) => item.id === entityId) || entities.find((item: any) => item.id === entityId);
    if (!entity) return {};
    const shiftTime = entityType === 'staff'
      ? getStaffShiftTime(entity, shift)
      : {
          start: entity.duty_start_time || defaultCategoryTimes.teacher.start,
          end: entity.duty_end_time || defaultCategoryTimes.teacher.end,
        };
    return {
      check_in_time: existing?.check_in_time || shiftTime.start,
      check_out_time: existing?.check_out_time || shiftTime.end,
    };
  };

  // Auto-backfill: existing present/late/half_day staff records without check_in/out get scheduled shift times
  const backfillRanRef = useRef<string>('');
  useEffect(() => {
    if (entityType !== 'staff' || !attendance?.length || !entities?.length) return;
    const key = `${selectedDate}|${isDutyTab ? 'duty_both' : effectiveShift}|${attendance.length}`;
    if (backfillRanRef.current === key) return;
    backfillRanRef.current = key;
    const entityMap = new Map(entities.map((e: any) => [e.id, e]));
    const targets = (attendance as any[]).filter(a =>
      ['present', 'late', 'half_day'].includes(a.status) &&
      (!a.check_in_time || !a.check_out_time) &&
      entityMap.has(a.entity_id)
    );
    if (!targets.length) return;
    (async () => {
      let updated = 0;
      for (const a of targets) {
        const ent = entityMap.get(a.entity_id) as any;
        let start = a.check_in_time;
        let end = a.check_out_time;
        if (staffSubTab === 'duty') {
          const shiftKey = a.shift === 'evening' ? 'evening' : 'morning';
          if (shiftKey === 'morning') {
            start = start || dutyTimes.morning_start;
            end = end || dutyTimes.morning_end;
          } else {
            start = start || dutyTimes.evening_start;
            end = end || dutyTimes.evening_end;
          }
        } else {
          const t = getCategoryTime(ent);
          start = start || t.start;
          end = end || t.end;
        }
        if (start === a.check_in_time && end === a.check_out_time) continue;
        const { error } = await supabase
          .from('attendance_records')
          .update({ check_in_time: start || null, check_out_time: end || null, updated_at: new Date().toISOString() })
          .eq('id', a.id);
        if (!error) updated++;
      }
      if (updated > 0) {
        queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType] });
        queryClient.invalidateQueries({ queryKey: ['salary-attendance'] });
        queryClient.invalidateQueries({ queryKey: ['salary-duty-attendance'] });
      }
    })();
  }, [attendance, entities, entityType, selectedDate, effectiveShift, staffSubTab, isDutyTab, dutyTimes]);

  const statusOptions = useMemo(() => {
    const filtered = rules.filter((r: any) => r.entity_type === entityType && r.rule_type === 'status' && r.is_active);
    const seen = new Set<string>();
    return filtered.filter((r: any) => {
      const key = (r.config as any)?.counts_as || r.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rules, entityType]);

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      entityId,
      status,
      remarks,
      check_in_time,
      check_out_time,
      shift,
    }: {
      entityId: string;
      status: string;
      remarks?: string;
      check_in_time?: string;
      check_out_time?: string;
      shift?: string;
    }) => {
      const shiftVal = shift || (isDutyTab ? 'morning' : effectiveShift);
      // Resolve the persisted row, never an optimistic or stale cached ID.
      const { data: existing, error: lookupError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', selectedDate)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('shift', shiftVal)
        .maybeSingle();
      if (lookupError) throw lookupError;
      const updateData: any = { status, remarks, updated_at: new Date().toISOString() };
      const autoTimes = getAutoAttendanceTimes(entityId, status, existing, shiftVal);
      if (check_in_time !== undefined) updateData.check_in_time = check_in_time;
      else if (autoTimes.check_in_time !== undefined) updateData.check_in_time = autoTimes.check_in_time;
      if (check_out_time !== undefined) updateData.check_out_time = check_out_time;
      else if (autoTimes.check_out_time !== undefined) updateData.check_out_time = autoTimes.check_out_time;
      if (status === 'absent' || status === 'leave') {
        updateData.check_in_time = null;
        updateData.check_out_time = null;
      }

      // Past date restriction: Non-admin users cannot edit past attendance directly without approval
      const isPastDate = selectedDate < todayIsoInTz(appTz);
      if (isPastDate && !isAdmin) {
        const entity = entities.find((e: any) => e.id === entityId);
        const entityName = entity?.name_bn || entity?.name_en || (entityType === 'staff' ? 'স্টাফ' : 'শিক্ষার্থী');
        const statusLabel = status === 'present' ? (bn ? 'উপস্থিত' : 'Present')
          : status === 'absent' ? (bn ? 'অনুপস্থিত' : 'Absent')
          : status === 'late' ? (bn ? 'বিলম্ব' : 'Late')
          : status === 'leave' ? (bn ? 'ছুটি' : 'Leave') : status;

        const actionType = existing ? 'edit' : 'add';
        const success = await submitForApproval({
          actionType,
          targetTable: 'attendance_records',
          targetId: existing?.id,
          menuPath: targetMenuPath,
          payload: {
            ...updateData,
            attendance_date: selectedDate,
            entity_type: entityType,
            entity_id: entityId,
            shift: shiftVal,
            name_bn: entityName,
            status,
            previous_status: existing?.status || 'unmarked',
          },
          description: bn
            ? `${selectedDate} তারিখের ${entityName} এর হাজিরা "${statusLabel}" পরিবর্তনের আবেদন`
            : `Request to change attendance of ${entityName} on ${selectedDate} to ${status}`,
        });

        if (!success) {
          throw new Error('SUBMIT_APPROVAL_FAILED');
        }
        return { approvalSubmitted: true };
      }

      if (existing) {
        const { error } = await supabase.from('attendance_records').update(updateData).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance_records').insert({
          attendance_date: selectedDate, entity_type: entityType,
          entity_id: entityId, shift: shiftVal, ...updateData,
        });
        if (error) throw error;
      }
    },
    onMutate: async ({ entityId, status, remarks, check_in_time, check_out_time, shift }) => {
      const isPastDate = selectedDate < todayIsoInTz(appTz);
      if (isPastDate && !isAdmin) {
        return { isApproval: true };
      }
      const shiftVal = shift || (isDutyTab ? 'morning' : effectiveShift);
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      const queryKey = ['attendance', selectedDate, entityType, isDutyTab ? 'duty_both' : effectiveShift];
      await queryClient.cancelQueries({ queryKey });
      // Snapshot previous value for rollback on error
      const previousAttendance = queryClient.getQueryData(queryKey);
      // Optimistically update cache immediately — UI responds instantly without waiting for server
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!Array.isArray(old)) return old;
        const existing = old.find((a: any) => a.entity_id === entityId && (isDutyTab ? a.shift === shiftVal : true));
        const autoTimes = getAutoAttendanceTimes(entityId, status, existing, shiftVal);
        const optimisticRecord: any = {
          ...(existing ?? {
            id: `optimistic-${entityId}-${shiftVal}`,
            attendance_date: selectedDate,
            entity_type: entityType,
            entity_id: entityId,
            shift: shiftVal,
          }),
          status,
          shift: shiftVal,
          remarks: remarks ?? existing?.remarks,
          check_in_time: check_in_time !== undefined ? check_in_time : (autoTimes.check_in_time ?? existing?.check_in_time),
          check_out_time: check_out_time !== undefined ? check_out_time : (autoTimes.check_out_time ?? existing?.check_out_time),
          updated_at: new Date().toISOString(),
        };
        if (status === 'absent' || status === 'leave') {
          optimisticRecord.check_in_time = null;
          optimisticRecord.check_out_time = null;
        }
        if (existing) {
          return old.map((a: any) => (a.entity_id === entityId && (isDutyTab ? a.shift === shiftVal : true)) ? optimisticRecord : a);
        }
        return [...old, optimisticRecord];
      });
      return { previousAttendance, queryKey };
    },
    onSuccess: (result: any) => {
      if (result?.approvalSubmitted) {
        toast.info(
          bn
            ? '⏳ গত তারিখের হাজিরা পরিবর্তনের জন্য এডমিনের কাছে অনুমোদনের আবেদন পাঠানো হয়েছে। এডমিন অনুমোদন করার পর এটি কার্যকর হবে।'
            : '⏳ Past date attendance change submitted for admin approval. It will take effect once approved.',
          { duration: 6000 }
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType] });
      queryClient.invalidateQueries({ queryKey: ['salary-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-duty-attendance'] });
    },
    onError: (err: any, _vars, context: any) => {
      if (context?.isApproval) {
        toast.error(bn ? 'অনুমোদনের আবেদন পাঠাতে ব্যর্থ হয়েছে' : 'Failed to submit approval request');
        return;
      }
      // Rollback UI to previous state if save fails
      if (context?.previousAttendance !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousAttendance);
      }
      console.error('Attendance save error:', err);
      toast.error(bn ? 'সেভ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন' : 'Failed to save. Please try again.');
    },
  });

  // Bulk mark for duty shifts (morning or evening)
  const handleBulkMarkDuty = async (targetShift: 'morning' | 'evening', status: string = 'present') => {
    const isPastDate = selectedDate < todayIsoInTz(appTz);
    if (isPastDate && !isAdmin) {
      toast.error(
        bn
          ? 'পূর্বের তারিখের সবার হাজিরা এক সাথে দেওয়ার অনুমতি নেই। শুধুমাত্র এডমিন পূর্বের তারিখে পরিবর্তন করতে পারেন।'
          : 'Bulk attendance marking for past dates is restricted. Only Admins can perform this.'
      );
      return;
    }
    const list = targetShift === 'morning' ? morningDutyEntities : eveningDutyEntities;
    const unmarked = list.filter((e: any) => !attendance.some((a: any) => a.entity_id === e.id && a.shift === targetShift));
    if (unmarked.length === 0) {
      toast.info(bn ? 'ইতিমধ্যে সবার হাজিরা দেওয়া আছে' : 'All staff are already marked');
      return;
    }
    const records = unmarked.map((e: any) => {
      const autoTimes = getAutoAttendanceTimes(e.id, status, undefined, targetShift);
      return {
        attendance_date: selectedDate,
        entity_type: 'staff',
        entity_id: e.id,
        shift: targetShift,
        status,
        check_in_time: autoTimes.check_in_time || null,
        check_out_time: autoTimes.check_out_time || null,
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase.from('attendance_records').upsert(records, MISSING_ATTENDANCE_CONFLICT_OPTIONS);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType] });
    queryClient.invalidateQueries({ queryKey: ['salary-attendance'] });
    queryClient.invalidateQueries({ queryKey: ['salary-duty-attendance'] });
    toast.success(bn ? `${targetShift === 'morning' ? 'সকাল' : 'সন্ধ্যা'} শিফটের ${unmarked.length} জনের হাজিরা সেভ হয়েছে` : `Bulk attendance saved for ${unmarked.length} staff`);
  };

  // Bulk mark all
  const bulkMutation = useMutation({
    mutationFn: async (status: string) => {
      const isPastDate = selectedDate < todayIsoInTz(appTz);
      if (isPastDate && !isAdmin) {
        throw new Error(
          bn
            ? 'পূর্বের তারিখের সবার হাজিরা এক সাথে দেওয়ার অনুমতি নেই। শুধুমাত্র এডমিন পূর্বের তারিখে পরিবর্তন করতে পারেন।'
            : 'Bulk attendance marking for past dates is restricted. Only Admins can perform this.'
        );
      }
      const shiftVal = effectiveShift;
      const unmarked = entities.filter((e: any) => !attendance.find((a: any) => a.entity_id === e.id));
      if (unmarked.length === 0) return;
      const records = unmarked.map((e: any) => ({
        attendance_date: selectedDate, entity_type: entityType,
        entity_id: e.id, status, shift: shiftVal,
        ...getAutoAttendanceTimes(e.id, status),
      }));
      const { error } = await supabase.from('attendance_records').upsert(records, MISSING_ATTENDANCE_CONFLICT_OPTIONS);
      if (error) throw error;
    },
    onMutate: async (status: string) => {
      const queryKey = ['attendance', selectedDate, entityType, effectiveShift];
      await queryClient.cancelQueries({ queryKey });
      const previousAttendance = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!Array.isArray(old)) return old;
        const unmarked = entities.filter((e: any) => !old.some((a: any) => a.entity_id === e.id));
        const newRecords = unmarked.map((e: any) => {
          const autoTimes = getAutoAttendanceTimes(e.id, status);
          return {
            id: `optimistic-bulk-${e.id}`,
            attendance_date: selectedDate,
            entity_type: entityType,
            entity_id: e.id,
            shift: effectiveShift,
            status,
            check_in_time: autoTimes.check_in_time || null,
            check_out_time: autoTimes.check_out_time || null,
            updated_at: new Date().toISOString(),
          };
        });
        return [...old, ...newRecords];
      });
      return { previousAttendance, queryKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType, effectiveShift] });
      queryClient.invalidateQueries({ queryKey: ['salary-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-duty-attendance'] });
      toast.success(bn ? 'সবার উপস্থিতি সেভ হয়েছে' : 'Bulk attendance saved');
    },
    onError: (err, _vars, context: any) => {
      if (context?.previousAttendance !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousAttendance);
      }
      console.error('Bulk attendance error:', err);
      toast.error(bn ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save bulk attendance');
    },
  });

  // Special-day holiday dialog: pick which dates of the month + which people get leave.
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [presentDialogOpen, setPresentDialogOpen] = useState(false);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);


  // Reset attendance selectively
  const resetMutation = useMutation({
    mutationFn: async (type: 'all' | 'student' | 'staff' | 'division' | 'single_staff' | 'staff_category') => {
      let ids: string[] = [];
      if (type === 'all') {
        ids = attendance.map((a: any) => a.id);
      } else if (type === 'student') {
        const studentIds = new Set(allStudents.map((s: any) => s.id));
        ids = attendance.filter((a: any) => studentIds.has(a.entity_id)).map((a: any) => a.id);
      } else if (type === 'staff') {
        const staffIds = new Set(allStaff.map((s: any) => s.id));
        ids = attendance.filter((a: any) => staffIds.has(a.entity_id)).map((a: any) => a.id);
      } else if (type === 'division') {
        const divStudentIds = new Set(allStudents.filter((s: any) => s.division_id === resetDivisionId).map((s: any) => s.id));
        ids = attendance.filter((a: any) => divStudentIds.has(a.entity_id)).map((a: any) => a.id);
      } else if (type === 'single_staff') {
        ids = attendance.filter((a: any) => a.entity_id === resetStaffId).map((a: any) => a.id);
      } else if (type === 'staff_category') {
        const catStaffIds = new Set(allStaff.filter((s: any) => s.staff_category === resetStaffCategory).map((s: any) => s.id));
        ids = attendance.filter((a: any) => catStaffIds.has(a.entity_id)).map((a: any) => a.id);
      }
      if (ids.length === 0) throw new Error('No records to reset');

      if (requiresResetApproval) {
        const success = await submitForApproval({
          actionType: 'delete',
          targetTable: 'attendance_records',
          targetId: ids.length === 1 ? ids[0] : undefined,
          menuPath: targetMenuPath,
          payload: {
            ids,
            reset_type: type,
            target_label: resetTargetLabel,
            count: ids.length,
            date: selectedDate,
            entity_type: entityType,
            shift: effectiveShift,
          },
          description: bn
            ? `${selectedDate} তারিখের ${resetTargetLabel} (${ids.length}টি হাজিরা রেকর্ড) রিসেট করার আবেদন`
            : `Reset attendance for ${resetTargetLabel} (${ids.length} records) on ${selectedDate}`,
        });

        if (!success) {
          throw new Error('SUBMIT_APPROVAL_FAILED');
        }
        return { type, approvalSubmitted: true };
      }

      const { error } = await supabase.from('attendance_records').delete().in('id', ids);
      if (error) throw error;
      return { type, approvalSubmitted: false };
    },
    onSuccess: (result) => {
      const { type, approvalSubmitted } = result;
      setShowResetDialog(false);

      if (approvalSubmitted) {
        toast.info(
          bn
            ? '⏳ অনুমোদন প্রযোজ্য — রিসেট রিকোয়েস্টটি জমা দেওয়া হয়েছে। অনুমোদন করার পর কার্যকর হবে।'
            : '⏳ Approval applicable — reset request submitted. It will take effect after approval.',
          { duration: 6000 }
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType, effectiveShift] });
      queryClient.invalidateQueries({ queryKey: ['salary-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-duty-attendance'] });
      const labels: Record<string, string> = {
        all: bn ? 'সকল উপস্থিতি' : 'All attendance',
        student: bn ? 'ছাত্র হাজিরা' : 'Student attendance',
        staff: bn ? 'স্টাফ হাজিরা' : 'Staff attendance',
        division: bn ? 'বিভাগ হাজিরা' : 'Division attendance',
        single_staff: bn ? `${resetStaffName} এর হাজিরা` : `${resetStaffName}'s attendance`,
        staff_category: bn ? `${getCategoryLabel(resetStaffCategory) || resetStaffCategory} হাজিরা` : `${getCategoryLabel(resetStaffCategory) || resetStaffCategory} attendance`,
      };
      toast.success(bn ? `সাফল্যের সাথে ${labels[type]} রিসেট করা হয়েছে।` : `${labels[type]} reset successfully.`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '';
      if (message === 'No records to reset') {
        toast.error(bn ? 'রিসেট করার মতো কোনো রেকর্ড নেই' : 'No records found to reset');
        return;
      }
      if (message === 'SUBMIT_APPROVAL_FAILED') {
        toast.error(bn ? 'অনুমোদনের জন্য আবেদন পাঠাতে ব্যর্থ হয়েছে' : 'Failed to submit reset approval request');
        return;
      }

      toast.error(bn ? 'রিসেট করতে সমস্যা' : 'Failed to reset');
    },
  });

  // Rule CRUD
  const saveRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingRule) {
        const { error } = await supabase.from('attendance_rules').update(data).eq('id', editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance_rules').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-rules'] });
      setEditingRule(null);
      setRuleForm({ name: '', name_bn: '', entity_type: 'student', config: { color: 'green', counts_as: 'present' } });
      toast.success(bn ? 'রুল সেভ হয়েছে' : 'Rule saved');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-rules'] });
      toast.success(bn ? 'রুল মুছে ফেলা হয়েছে' : 'Rule deleted');
    },
  });

  // Fetch institution
  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  const filtered = entities.filter((e: any) => {
    const name = e.name_bn + (e.name_en || '') + (e.student_id || '');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Reorder staff serial (salary_order) — moves a staff row up/down in the list
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const handleMoveSerial = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= filtered.length) return;
    const next = [...filtered];
    [next[idx], next[j]] = [next[j], next[idx]];
    setReorderingId(next[j].id);
    try {
      await Promise.all(next.map((s: any, i: number) =>
        (s.salary_order ?? null) !== i + 1
          ? supabase.from('staff').update({ salary_order: i + 1 }).eq('id', s.id).then(({ error }) => { if (error) throw error; })
          : Promise.resolve(null)
      ));
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? 'সিরিয়াল আপডেট হয়েছে' : 'Serial updated');
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'সিরিয়াল বদলানো যায়নি' : 'Failed to reorder'));
    } finally {
      setReorderingId(null);
    }
  };

  // Per-class summary for drill-down grid (students only)
  const showClassGrid = entityType === 'student' && (!selectedClassId || selectedClassId === 'all');
  const classSummaries = useMemo(() => {
    if (entityType !== 'student') return [] as any[];
    // Students of the current session + sub-tab (ignore class filter)
    let base = allStudents;
    if (studentSubTab === 'residential' || studentSubTab === 'meal') {
      base = base.filter((s: any) => s.residence_type === 'resident');
    }
    if (selectedSessionYear) {
      base = base.filter((s: any) =>
        s.session_id === selectedSessionYear || s.session_year === selectedSessionYear
      );
    }
    const attMap = new Map<string, string>();
    attendance.forEach((a: any) => attMap.set(a.entity_id, a.status));
    return orderedClasses
      .map((c: any) => {
        const studs = base.filter((s: any) => s.class_id === c.id);
        if (studs.length === 0) return null;
        let present = 0, absent = 0, late = 0, marked = 0;
        studs.forEach((s: any) => {
          const st = attMap.get(s.id);
          if (!st) return;
          marked++;
          if (st === 'present') present++;
          else if (st === 'absent') absent++;
          else if (st === 'late') late++;
        });
        const div = divisions.find((d: any) => d.id === c.division_id);
        return { id: c.id, name: c.name, name_bn: c.name_bn, divName: div ? (bn ? div.name_bn : div.name) : '', total: studs.length, present, absent, late, marked };
      })
      .filter(Boolean) as any[];
  }, [entityType, allStudents, orderedClasses, divisions, selectedSessionYear, studentSubTab, attendance, bn]);

  const resettableStaffCategories = useMemo(() => {
    const attendanceIds = new Set(attendance.map((a: any) => a.entity_id));

    return dynamicStaffCategories
      .map((key) => {
        const matchedStaff = allStaff.filter((staff: any) => staff.staff_category === key && attendanceIds.has(staff.id));
        if (matchedStaff.length === 0) return null;

        return {
          key,
          label: getCategoryLabel(key),
          count: matchedStaff.length,
          color: getCategoryResetTone(key),
          icon: key === 'teacher' ? Users : UserCog,
        };
      })
      .filter(Boolean) as Array<{ key: string; label: string; count: number; color: string; icon: typeof Users }>;
  }, [attendance, dynamicStaffCategories, allStaff, bn]);

  const resetTargetLabel = useMemo(() => {
    if (resetType === 'single_staff') return resetStaffName || (bn ? 'নির্বাচিত স্টাফ' : 'selected staff');
    if (resetType === 'staff_category') return getCategoryLabel(resetStaffCategory || 'general');
    if (resetType === 'division') {
      const division = divisions.find((item: any) => item.id === resetDivisionId);
      return division ? (bn ? division.name_bn : division.name) : (bn ? 'নির্বাচিত বিভাগ' : 'selected division');
    }

    const labels: Record<string, string> = {
      all: bn ? 'সব উপস্থিতি' : 'all attendance',
      student: bn ? 'ছাত্র হাজিরা' : 'student attendance',
      staff: bn ? 'স্টাফ হাজিরা' : 'staff attendance',
    };

    return labels[resetType] || (bn ? 'নির্বাচিত রেকর্ড' : 'selected records');
  }, [resetType, resetStaffName, resetStaffCategory, resetDivisionId, divisions, bn]);

  const resetRecordCount = useMemo(() => {
    if (resetType === 'all') return attendance.length;
    if (resetType === 'student') {
      const studentIds = new Set(allStudents.map((student: any) => student.id));
      return attendance.filter((item: any) => studentIds.has(item.entity_id)).length;
    }
    if (resetType === 'staff') {
      const staffIds = new Set(allStaff.map((staff: any) => staff.id));
      return attendance.filter((item: any) => staffIds.has(item.entity_id)).length;
    }
    if (resetType === 'division') {
      const divisionStudentIds = new Set(allStudents.filter((student: any) => student.division_id === resetDivisionId).map((student: any) => student.id));
      return attendance.filter((item: any) => divisionStudentIds.has(item.entity_id)).length;
    }
    if (resetType === 'single_staff') return attendance.filter((item: any) => item.entity_id === resetStaffId).length;
    if (resetType === 'staff_category') {
      const categoryStaffIds = new Set(allStaff.filter((staff: any) => staff.staff_category === resetStaffCategory).map((staff: any) => staff.id));
      return attendance.filter((item: any) => categoryStaffIds.has(item.entity_id)).length;
    }
    return 0;
  }, [resetType, attendance, allStudents, allStaff, resetDivisionId, resetStaffId, resetStaffCategory]);

  const getAttendance = (entityId: string) => attendance.find((a: any) => a.entity_id === entityId);

  // Stats
  const stats = useMemo(() => {
    if (isDutyTab) {
      const morningTotal = morningDutyEntities.length;
      const eveningTotal = eveningDutyEntities.length;
      const total = morningTotal + eveningTotal;

      const morningAttMap = new Map();
      const eveningAttMap = new Map();
      attendance.forEach((a: any) => {
        if (a.shift === 'morning') morningAttMap.set(a.entity_id, a);
        if (a.shift === 'evening') eveningAttMap.set(a.entity_id, a);
      });

      let present = 0, absent = 0, late = 0, marked = 0;
      morningDutyEntities.forEach((e: any) => {
        const a = morningAttMap.get(e.id);
        if (a) {
          marked++;
          if (a.status === 'present') present++;
          else if (a.status === 'absent') absent++;
          else if (a.status === 'late') late++;
        }
      });
      eveningDutyEntities.forEach((e: any) => {
        const a = eveningAttMap.get(e.id);
        if (a) {
          marked++;
          if (a.status === 'present') present++;
          else if (a.status === 'absent') absent++;
          else if (a.status === 'late') late++;
        }
      });
      const unmarked = Math.max(0, total - marked);
      return { total, present, absent, late, unmarked, morningTotal, eveningTotal };
    }

    const total = entities.length;
    const present = attendance.filter((a: any) => a.status === 'present').length;
    const absent = attendance.filter((a: any) => a.status === 'absent').length;
    const late = attendance.filter((a: any) => a.status === 'late').length;
    const unmarked = total - attendance.length;
    return { total, present, absent, late, unmarked };
  }, [isDutyTab, entities, attendance, morningDutyEntities, eveningDutyEntities]);

  const changeDate = (dir: number) => {
    setSelectedDate(addDaysIsoInTz(selectedDate, dir, appTz));
  };

  // Current tab label
  const currentTabLabel = useMemo(() => {
    if (entityType === 'student') return bn ? (studentSubTab === 'residential' ? 'আবাসিক ছাত্র হাজিরা' : 'ছাত্র হাজিরা') : (studentSubTab === 'residential' ? 'Residential Student Attendance' : 'Student Attendance');
    if (staffSubTab === 'fulltime') return bn ? 'ফুল টাইম হাজিরা' : 'Full Time Attendance';
    if (staffSubTab === 'duty') return bn ? 'আবাসিক ডিউটি হাজিরা' : 'Residential Duty Attendance';
    return bn ? 'খাবার হাজিরা' : 'Meal Attendance';
  }, [entityType, staffSubTab, studentSubTab, bn]);

  const currentShiftLabel = useMemo(() => {
    if (entityType === 'student') return '';
    if (staffSubTab === 'fulltime') return bn ? 'ফুল ডে' : 'Full Day';
    const shifts = staffSubTab === 'duty' ? DUTY_SHIFTS : MEAL_SHIFTS;
    const sh = shifts.find(s => s.value === selectedShift);
    return sh ? (bn ? sh.labelBn : sh.labelEn) : '';
  }, [entityType, staffSubTab, selectedShift, bn]);

  // Status label helper
  const statusLabel = (status: string) => {
    const map: Record<string, string> = bn
      ? { present: 'উপস্থিত', absent: 'অনুপস্থিত', late: 'বিলম্ব', half_day: 'অর্ধদিন', leave: 'ছুটি', excused: 'অনুমতিপ্রাপ্ত', medical: 'চিকিৎসাজনিত' }
      : { present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half Day', leave: 'Leave', excused: 'Excused', medical: 'Medical' };
    return map[status] || status;
  };

  // CSV Download
  const handleDownloadCSV = async () => {
    // For duty tab, combine morning + evening
    if (entityType === 'staff' && staffSubTab === 'duty') {
      const { data: morningAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'morning');
      const { data: eveningAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'evening');

      const rows: string[][] = [];
      rows.push([
        bn ? 'ক্রম' : 'SL',
        bn ? 'নাম' : 'Name',
        bn ? 'পদবী' : 'Designation',
        bn ? 'সকাল স্ট্যাটাস' : 'Morning Status',
        bn ? 'সকাল চেক-ইন' : 'Morning In',
        bn ? 'সকাল চেক-আউট' : 'Morning Out',
        bn ? 'সন্ধ্যা স্ট্যাটাস' : 'Evening Status',
        bn ? 'সন্ধ্যা চেক-ইন' : 'Evening In',
        bn ? 'সন্ধ্যা চেক-আউট' : 'Evening Out',
      ]);

      filtered.forEach((entity: any, idx: number) => {
        const mAtt = (morningAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const eAtt = (eveningAtt as any[]).find((a: any) => a.entity_id === entity.id);
        rows.push([
          String(idx + 1),
          getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary || entity.name_bn,
          entity.designation || '-',
          mAtt ? statusLabel(mAtt.status) : (bn ? 'চিহ্নিত হয়নি' : 'Unmarked'),
          mAtt?.check_in_time ? fmt(mAtt.check_in_time) : '-',
          mAtt?.check_out_time ? fmt(mAtt.check_out_time) : '-',
          eAtt ? statusLabel(eAtt.status) : (bn ? 'চিহ্নিত হয়নি' : 'Unmarked'),
          eAtt?.check_in_time ? fmt(eAtt.check_in_time) : '-',
          eAtt?.check_out_time ? fmt(eAtt.check_out_time) : '-',
        ]);
      });

      const mPresent = (morningAtt as any[]).filter((a: any) => a.status === 'present').length;
      const ePresent = (eveningAtt as any[]).filter((a: any) => a.status === 'present').length;
      rows.push([]);
      rows.push([bn ? 'সকাল উপস্থিত' : 'Morning Present', String(mPresent), '', bn ? 'সন্ধ্যা উপস্থিত' : 'Evening Present', String(ePresent)]);

      const bom = '\uFEFF';
      const csv = bom + rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bn ? 'আবাসিক_ডিউটি_হাজিরা' : 'Residential_Duty_Attendance'}_${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(bn ? 'CSV ডাউনলোড হয়েছে' : 'CSV downloaded');
      return;
    }

    // For meal tab, combine all three meals
    if (entityType === 'staff' && staffSubTab === 'meal') {
      const { data: breakfastAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'meal_breakfast');
      const { data: lunchAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'meal_lunch');
      const { data: dinnerAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'meal_dinner');

      const rows: string[][] = [];
      rows.push([
        bn ? 'ক্রম' : 'SL',
        bn ? 'নাম' : 'Name',
        bn ? 'পদবী' : 'Designation',
        bn ? 'সকালের নাস্তা' : 'Breakfast',
        bn ? 'দুপুরের খাবার' : 'Lunch',
        bn ? 'রাতের খাবার' : 'Dinner',
      ]);

      filtered.forEach((entity: any, idx: number) => {
        const bAtt = (breakfastAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const lAtt = (lunchAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const dAtt = (dinnerAtt as any[]).find((a: any) => a.entity_id === entity.id);
        rows.push([
          String(idx + 1),
          getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary || entity.name_bn,
          entity.designation || '-',
          bAtt ? statusLabel(bAtt.status) : (bn ? 'চিহ্নিত হয়নি' : 'Unmarked'),
          lAtt ? statusLabel(lAtt.status) : (bn ? 'চিহ্নিত হয়নি' : 'Unmarked'),
          dAtt ? statusLabel(dAtt.status) : (bn ? 'চিহ্নিত হয়নি' : 'Unmarked'),
        ]);
      });

      const bPresent = (breakfastAtt as any[]).filter((a: any) => a.status === 'present').length;
      const lPresent = (lunchAtt as any[]).filter((a: any) => a.status === 'present').length;
      const dPresent = (dinnerAtt as any[]).filter((a: any) => a.status === 'present').length;
      rows.push([]);
      rows.push([bn ? 'নাস্তা উপস্থিত' : 'Breakfast Present', String(bPresent), '', bn ? 'দুপুর উপস্থিত' : 'Lunch Present', String(lPresent), bn ? 'রাত উপস্থিত' : 'Dinner Present', String(dPresent)]);

      const bom = '\uFEFF';
      const csv = bom + rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bn ? 'খাওয়া_হাজিরা' : 'Meal_Attendance'}_${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(bn ? 'CSV ডাউনলোড হয়েছে' : 'CSV downloaded');
      return;
    }

    // For student tabs, fetch attendance fresh from DB
    let studentAttData: any[] = [];
    if (entityType === 'student') {
      const entityIds = filtered.map((e: any) => e.id);
      if (entityIds.length > 0) {
        const { data } = await supabase.from('attendance_records').select('*')
          .eq('attendance_date', selectedDate).eq('entity_type', 'student').eq('shift', 'full_day')
          .in('entity_id', entityIds);
        studentAttData = data || [];
      }
    }
    const getAtt = (id: string) => entityType === 'student' ? studentAttData.find((a: any) => a.entity_id === id) : getAttendance(id);

    // Build columns for Excel
    const excelColumns: { key: string; label: string; center?: boolean }[] = [
      { key: 'sl', label: bn ? 'ক্রম' : 'SL', center: true },
      { key: 'name', label: bn ? 'নাম' : 'Name', center: false },
      { key: 'designation', label: entityType === 'student' ? (bn ? 'আইডি' : 'ID') : (bn ? 'পদবী' : 'Designation'), center: false },
      { key: 'status', label: bn ? 'স্ট্যাটাস' : 'Status', center: true },
    ];
    if (entityType === 'staff') {
      excelColumns.push(
        { key: 'checkIn', label: bn ? 'চেক-ইন' : 'Check In', center: true },
        { key: 'checkOut', label: bn ? 'চেক-আউট' : 'Check Out', center: true },
        { key: 'late', label: bn ? 'বিলম্ব (মিনিট)' : 'Late (Min)', center: true },
      );
    }

    let totalLateMinutes = 0;
    const excelRows = filtered.map((entity: any, idx: number) => {
      const att = getAtt(entity.id);
      const row: Record<string, any> = {
        sl: idx + 1,
        name: entityType === 'staff' ? (getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary || entity.name_bn) : entity.name_bn,
        designation: entityType === 'student' ? (entity.student_id || '-') : (entity.designation || '-'),
        status: att ? statusLabel(att.status) : (bn ? 'চিহ্নিত হয়নি' : 'Unmarked'),
      };
      if (entityType === 'staff') {
        row.checkIn = att?.check_in_time ? fmt(att.check_in_time) : '-';
        row.checkOut = att?.check_out_time ? fmt(att.check_out_time) : '-';
        // Calculate late
        const shiftStart = staffSubTab === 'duty'
          ? (selectedShift === 'morning' ? dutyTimes.morning_start : dutyTimes.evening_start)
          : getCategoryTime(entity).start;
        const shiftEnd = staffSubTab === 'duty'
          ? (selectedShift === 'morning' ? dutyTimes.morning_end : dutyTimes.evening_end)
          : getCategoryTime(entity).end;
        const lateMins = calcLateMinutes(att?.check_in_time || null, shiftStart, shiftEnd);
        totalLateMinutes += lateMins;
        row.late = lateMins > 0 ? `${lateMins} ${bn ? 'মিনিট' : 'Min'}` : '-';
      }
      return row;
    });

    const csvPresent = entityType === 'student' ? studentAttData.filter((a: any) => a.status === 'present').length : stats.present;
    const csvAbsent = entityType === 'student' ? studentAttData.filter((a: any) => a.status === 'absent').length : stats.absent;

    const instName = institution?.name || (bn ? 'প্রতিষ্ঠান' : 'Institution');
    const today = new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    exportAttendanceExcel({
      title: `${currentTabLabel}${currentShiftLabel ? ` (${currentShiftLabel})` : ''}`,
      institutionName: instName,
      reportDate: today,
      selectedDate,
      columns: excelColumns,
      rows: excelRows,
      stats: {
        total: filtered.length,
        present: csvPresent,
        absent: csvAbsent,
        ...(entityType === 'staff' ? { totalLateMinutes } : {}),
      },
      bn,
    });
    toast.success(bn ? 'এক্সেল ডাউনলোড হয়েছে' : 'Excel downloaded');
  };

  // Print attendance
  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableHtml = '';
    let printMetaStats = { total: filtered.length, present: 0, absent: 0, late: 0, unmarked: 0 };

    // For duty tab, combine morning + evening
    if (entityType === 'staff' && staffSubTab === 'duty') {
      const { data: morningAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'morning');
      const { data: eveningAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'evening');

      const statusRows = filtered.map((entity: any, idx: number) => {
        const mAtt = (morningAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const eAtt = (eveningAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const mColor = mAtt?.status === 'present' ? '#16a34a' : mAtt?.status === 'absent' ? '#dc2626' : mAtt?.status === 'late' ? '#ca8a04' : '#6b7280';
        const eColor = eAtt?.status === 'present' ? '#16a34a' : eAtt?.status === 'absent' ? '#dc2626' : eAtt?.status === 'late' ? '#ca8a04' : '#6b7280';
        return `<tr>
          <td style="text-align:center">${idx + 1}</td>
          <td>${getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary || entity.name_bn}</td>
          <td>${entity.designation || '-'}</td>
          <td style="color:${mColor};font-weight:600">${mAtt ? statusLabel(mAtt.status) : (bn ? '-' : '-')}</td>
          <td>${mAtt?.check_in_time ? fmt(mAtt.check_in_time) : '-'}</td>
          <td>${mAtt?.check_out_time ? fmt(mAtt.check_out_time) : '-'}</td>
          <td style="color:${eColor};font-weight:600">${eAtt ? statusLabel(eAtt.status) : (bn ? '-' : '-')}</td>
          <td>${eAtt?.check_in_time ? fmt(eAtt.check_in_time) : '-'}</td>
          <td>${eAtt?.check_out_time ? fmt(eAtt.check_out_time) : '-'}</td>
        </tr>`;
      }).join('');

      const mPresent = (morningAtt as any[]).filter((a: any) => a.status === 'present').length;
      const mAbsent = (morningAtt as any[]).filter((a: any) => a.status === 'absent').length;
      const ePresent = (eveningAtt as any[]).filter((a: any) => a.status === 'present').length;
      const eAbsent = (eveningAtt as any[]).filter((a: any) => a.status === 'absent').length;

      tableHtml = `
        <table>
          <thead><tr>
            <th style="width:40px" rowspan="2">${bn ? 'ক্রম' : 'SL'}</th>
            <th rowspan="2">${bn ? 'নাম' : 'Name'}</th>
            <th rowspan="2">${bn ? 'পদবী' : 'Designation'}</th>
            <th colspan="3" style="text-align:center;background:#fef3c7">${bn ? 'সকাল ডিউটি' : 'Morning Duty'}</th>
            <th colspan="3" style="text-align:center;background:#dbeafe">${bn ? 'সন্ধ্যা ডিউটি' : 'Evening Duty'}</th>
          </tr><tr>
            <th style="background:#fef3c7">${bn ? 'স্ট্যাটাস' : 'Status'}</th>
            <th style="background:#fef3c7">${bn ? 'ইন' : 'In'}</th>
            <th style="background:#fef3c7">${bn ? 'আউট' : 'Out'}</th>
            <th style="background:#dbeafe">${bn ? 'স্ট্যাটাস' : 'Status'}</th>
            <th style="background:#dbeafe">${bn ? 'ইন' : 'In'}</th>
            <th style="background:#dbeafe">${bn ? 'আউট' : 'Out'}</th>
          </tr></thead>
          <tbody>${statusRows}</tbody>
        </table>
        <div class="summary">
          <span style="background:#fef3c7;color:#92400e">${bn ? 'সকাল উপস্থিত' : 'Morning Present'}: ${mPresent} | ${bn ? 'অনুপস্থিত' : 'Absent'}: ${mAbsent}</span>
          <span style="background:#dbeafe;color:#1e40af">${bn ? 'সন্ধ্যা উপস্থিত' : 'Evening Present'}: ${ePresent} | ${bn ? 'অনুপস্থিত' : 'Absent'}: ${eAbsent}</span>
        </div>`;
    } else if (entityType === 'staff' && staffSubTab === 'meal') {
      // Meal tab: combine all three meals
      const { data: breakfastAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'meal_breakfast');
      const { data: lunchAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'meal_lunch');
      const { data: dinnerAtt = [] } = await supabase.from('attendance_records').select('*')
        .eq('attendance_date', selectedDate).eq('entity_type', 'staff').eq('shift', 'meal_dinner');

      const statusRows = filtered.map((entity: any, idx: number) => {
        const bAtt = (breakfastAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const lAtt = (lunchAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const dAtt = (dinnerAtt as any[]).find((a: any) => a.entity_id === entity.id);
        const bColor = bAtt?.status === 'present' ? '#16a34a' : bAtt?.status === 'absent' ? '#dc2626' : '#6b7280';
        const lColor = lAtt?.status === 'present' ? '#16a34a' : lAtt?.status === 'absent' ? '#dc2626' : '#6b7280';
        const dColor = dAtt?.status === 'present' ? '#16a34a' : dAtt?.status === 'absent' ? '#dc2626' : '#6b7280';
        return `<tr>
          <td style="text-align:center">${idx + 1}</td>
          <td>${getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary || entity.name_bn}</td>
          <td>${entity.designation || '-'}</td>
          <td style="color:${bColor};font-weight:600">${bAtt ? statusLabel(bAtt.status) : '-'}</td>
          <td style="color:${lColor};font-weight:600">${lAtt ? statusLabel(lAtt.status) : '-'}</td>
          <td style="color:${dColor};font-weight:600">${dAtt ? statusLabel(dAtt.status) : '-'}</td>
        </tr>`;
      }).join('');

      const bPresent = (breakfastAtt as any[]).filter((a: any) => a.status === 'present').length;
      const bAbsent = (breakfastAtt as any[]).filter((a: any) => a.status === 'absent').length;
      const lPresent = (lunchAtt as any[]).filter((a: any) => a.status === 'present').length;
      const lAbsent = (lunchAtt as any[]).filter((a: any) => a.status === 'absent').length;
      const dPresent = (dinnerAtt as any[]).filter((a: any) => a.status === 'present').length;
      const dAbsent = (dinnerAtt as any[]).filter((a: any) => a.status === 'absent').length;

      tableHtml = `
        <table>
          <thead><tr>
            <th style="width:40px">${bn ? 'ক্রম' : 'SL'}</th>
            <th>${bn ? 'নাম' : 'Name'}</th>
            <th>${bn ? 'পদবী' : 'Designation'}</th>
            <th style="text-align:center;background:#fef3c7">${bn ? 'সকালের নাস্তা' : 'Breakfast'}</th>
            <th style="text-align:center;background:#dcfce7">${bn ? 'দুপুরের খাবার' : 'Lunch'}</th>
            <th style="text-align:center;background:#dbeafe">${bn ? 'রাতের খাবার' : 'Dinner'}</th>
          </tr></thead>
          <tbody>${statusRows}</tbody>
        </table>
        <div class="summary">
          <span style="background:#fef3c7;color:#92400e">${bn ? 'নাস্তা' : 'Breakfast'}: ${bPresent}/${bPresent + bAbsent}</span>
          <span style="background:#dcfce7;color:#16a34a">${bn ? 'দুপুর' : 'Lunch'}: ${lPresent}/${lPresent + lAbsent}</span>
          <span style="background:#dbeafe;color:#1e40af">${bn ? 'রাত' : 'Dinner'}: ${dPresent}/${dPresent + dAbsent}</span>
        </div>`;
    } else {
      // For student tabs, fetch attendance fresh
      let printAttData: any[] = [];
      if (entityType === 'student') {
        const entityIds = filtered.map((e: any) => e.id);
        if (entityIds.length > 0) {
          const { data } = await supabase.from('attendance_records').select('*')
            .eq('attendance_date', selectedDate).eq('entity_type', 'student').eq('shift', 'full_day')
            .in('entity_id', entityIds);
          printAttData = data || [];
        }
      }
      const getPrintAtt = (id: string) => entityType === 'student' ? printAttData.find((a: any) => a.entity_id === id) : getAttendance(id);

      const statusRows = filtered.map((entity: any, idx: number) => {
        const att = getPrintAtt(entity.id);
        const status = att ? statusLabel(att.status) : (bn ? 'চিহ্নিত হয়নি' : 'Unmarked');
        const statusColor = att?.status === 'present' ? '#16a34a' : att?.status === 'absent' ? '#dc2626' : att?.status === 'late' ? '#ca8a04' : '#6b7280';
        return `<tr>
          <td style="text-align:center">${idx + 1}</td>
          <td>${entityType === 'staff' ? (getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary || entity.name_bn) : entity.name_bn}</td>
          <td>${entityType === 'student' ? (entity.student_id || '-') : (entity.designation || '-')}</td>
          <td style="color:${statusColor};font-weight:600">${status}</td>
          ${entityType === 'staff' ? `<td>${att?.check_in_time ? fmt(att.check_in_time) : '-'}</td><td>${att?.check_out_time ? fmt(att.check_out_time) : '-'}</td>` : ''}
        </tr>`;
      }).join('');

      const pPresent = entityType === 'student' ? printAttData.filter((a: any) => a.status === 'present').length : stats.present;
      const pAbsent = entityType === 'student' ? printAttData.filter((a: any) => a.status === 'absent').length : stats.absent;
      const pLate = entityType === 'student' ? printAttData.filter((a: any) => a.status === 'late').length : stats.late;
      const pUnmarked = filtered.length - (entityType === 'student' ? printAttData.length : attendance.length);

      // Store for meta section
      printMetaStats = { total: filtered.length, present: pPresent, absent: pAbsent, late: pLate, unmarked: pUnmarked };

      tableHtml = `
        <table>
          <thead><tr>
            <th style="width:40px">${bn ? 'ক্রম' : 'SL'}</th>
            <th>${bn ? 'নাম' : 'Name'}</th>
            <th>${entityType === 'student' ? (bn ? 'আইডি' : 'ID') : (bn ? 'পদবী' : 'Designation')}</th>
            <th>${bn ? 'স্ট্যাটাস' : 'Status'}</th>
            ${entityType === 'staff' ? `<th>${bn ? 'চেক-ইন' : 'Check In'}</th><th>${bn ? 'চেক-আউট' : 'Check Out'}</th>` : ''}
          </tr></thead>
          <tbody>${statusRows}</tbody>
        </table>
        <div class="summary">
          <span style="background:#dcfce7;color:#16a34a">${bn ? 'উপস্থিত' : 'Present'}: ${pPresent}</span>
          <span style="background:#fee2e2;color:#dc2626">${bn ? 'অনুপস্থিত' : 'Absent'}: ${pAbsent}</span>
          <span style="background:#fef9c3;color:#ca8a04">${bn ? 'বিলম্ব' : 'Late'}: ${pLate}</span>
          <span style="background:#f3f4f6;color:#6b7280">${bn ? 'বাকি' : 'Unmarked'}: ${pUnmarked}</span>
        </div>`;
    }

    const title = entityType === 'staff' && staffSubTab === 'duty'
      ? (bn ? 'আবাসিক ডিউটি হাজিরা (সকাল + সন্ধ্যা)' : 'Residential Duty Attendance (Morning + Evening)')
      : entityType === 'staff' && staffSubTab === 'meal'
      ? (bn ? 'খাওয়া হাজিরা (নাস্তা + দুপুর + রাত)' : 'Meal Attendance (Breakfast + Lunch + Dinner)')
      : currentTabLabel;

    const isDutyPrint = entityType === 'staff' && staffSubTab === 'duty';
    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${title} - ${selectedDate}</title>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: ${isDutyPrint ? 'A4 landscape' : 'A4 portrait'}; margin: 8mm; }
        body { font-family:'Hind Siliguri','Noto Sans Bengali',sans-serif; padding:12px; font-size:12px; color:#1e293b; }
        .header { text-align:center; margin-bottom:12px; border-bottom:2px solid #059669; padding-bottom:8px; }
        .header img { height:48px; margin-bottom:4px; }
        .header h2 { font-size:18px; margin:2px 0; color:#0f172a; }
        .header p { font-size:11px; color:#64748b; }
        .meta { display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px; font-weight:500; }
        table { width:100%; border-collapse:collapse; margin-top:6px; }
        th,td { border:1px solid #cbd5e1; padding:6px 8px; text-align:left; font-size:11px; }
        th { background:#f1f5f9; font-weight:700; color:#334155; }
        .summary { margin-top:12px; display:flex; gap:16px; font-size:11px; font-weight:600; flex-wrap:wrap; }
        .summary span { padding:4px 12px; border-radius:6px; font-weight:bold; }
        @media print { body { padding:0; } }
      </style>
    </head><body>
      <div class="header">
        ${institution?.logo_url ? `<img src="${institution.logo_url}" alt="logo">` : ''}
        <h2>${institution?.name || ''}</h2>
        ${institution?.name_en ? `<p>${institution.name_en}</p>` : ''}
        ${institution?.address ? `<p>${institution.address}</p>` : ''}
      </div>
      <h3 style="text-align:center;margin-bottom:8px">${title}</h3>
      <div class="meta">
        <span>${bn ? 'তারিখ' : 'Date'}: ${selectedDate}</span>
        <span>${entityType === 'student' ? (bn ? 'মোট ছাত্র' : 'Total Students') : (bn ? 'মোট স্টাফ' : 'Total Staff')}: ${printMetaStats.total}</span>
        ${entityType === 'student' ? `<span style="color:#16a34a;font-weight:600">${bn ? 'উপস্থিত' : 'Present'}: ${printMetaStats.present}</span>
        <span style="color:#dc2626;font-weight:600">${bn ? 'অনুপস্থিত' : 'Absent'}: ${printMetaStats.absent}</span>` : ''}
      </div>
      ${tableHtml}
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 800);
  };

  // Settings panel JSX (shared between Dialog & Settings tab)
  const settingsPanel = (
            <div className="space-y-4">
              {/* Time Format Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div>
                  <p className="text-sm font-medium">{bn ? 'টাইম ফরম্যাট' : 'Time Format'}</p>
                  <p className="text-[10px] text-muted-foreground">{timeFormat === '12h' ? '12-hour (AM/PM)' : '24-hour'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">12h</span>
                  <Switch checked={timeFormat === '24h'} onCheckedChange={c => setTimeFormat.mutate(c ? '24h' : '12h')} />
                  <span className="text-xs text-muted-foreground">24h</span>
                </div>
              </div>

              {/* Staff Settings Section Switcher */}
              {entityType === 'staff' && (
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/50">
                  <Button
                    type="button"
                    size="sm"
                    variant={settingsSubTab === 'all' ? 'default' : 'ghost'}
                    className={`h-7 px-3 text-xs rounded-lg font-medium transition-all ${
                      settingsSubTab === 'all' ? 'shadow-sm' : 'text-muted-foreground'
                    }`}
                    onClick={() => setSettingsSubTab('all')}
                  >
                    <Layers className="h-3.5 w-3.5 mr-1" />
                    {bn ? 'সকল সেটিংস' : 'All Settings'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={settingsSubTab === 'fulltime' ? 'default' : 'ghost'}
                    className={`h-7 px-3 text-xs rounded-lg font-medium transition-all ${
                      settingsSubTab === 'fulltime' ? 'shadow-sm' : 'text-muted-foreground'
                    }`}
                    onClick={() => setSettingsSubTab('fulltime')}
                  >
                    <Users className="h-3.5 w-3.5 mr-1" />
                    {bn ? 'ফুল টাইম শিফট' : 'Full Time'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={settingsSubTab === 'duty' ? 'default' : 'ghost'}
                    className={`h-7 px-3 text-xs rounded-lg font-medium transition-all ${
                      settingsSubTab === 'duty' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
                    }`}
                    onClick={() => setSettingsSubTab('duty')}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {bn ? 'আবাসিক ডিউটি সেটিংস' : 'Residential Duty'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={settingsSubTab === 'meal' ? 'default' : 'ghost'}
                    className={`h-7 px-3 text-xs rounded-lg font-medium transition-all ${
                      settingsSubTab === 'meal' ? 'shadow-sm' : 'text-muted-foreground'
                    }`}
                    onClick={() => setSettingsSubTab('meal')}
                  >
                    <Utensils className="h-3.5 w-3.5 mr-1" />
                    {bn ? 'খাবার হাজিরা' : 'Meal'}
                  </Button>
                </div>
              )}

              {/* Category-wise Fulltime Shift Times */}
              {entityType === 'staff' && (settingsSubTab === 'all' || settingsSubTab === 'fulltime') && (

              <div className="rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-5 space-y-5">
                {/* Header & Department Navigation */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <Label className="text-base font-bold flex items-center gap-2 text-foreground">
                        <Clock className="h-5 w-5 text-primary" />
                        {bn ? 'ডিপার্টমেন্ট অনুযায়ী ফুল টাইম শিফট ও সেশন' : 'Fulltime Shift & Session by Department'}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bn
                          ? 'প্রতিটি ডিপার্টমেন্টের জন্য আলাদা নিয়মিত কাজের সময়, সেশনের মেয়াদ ও বিশেষ বারের সময়সূচি নির্ধারণ করুন।'
                          : 'Set custom work hours, validity period, and special day schedules for each department.'}
                      </p>
                    </div>
                  </div>

                  {/* Department Filter Tabs (Pills) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {bn ? 'ডিপার্টমেন্ট নির্বাচন করুন:' : 'Select Department:'}
                      </span>
                      {selectedDeptTab !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedDeptTab('all')}
                          className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          {bn ? 'সবগুলো একসাথে দেখুন' : 'View all together'}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedDeptTab === 'all' ? 'default' : 'outline'}
                        className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          selectedDeptTab === 'all'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
                        }`}
                        onClick={() => setSelectedDeptTab('all')}
                      >
                        <Layers className="h-3.5 w-3.5 mr-1" />
                        {bn ? 'সকল ডিপার্টমেন্ট' : 'All Departments'}
                      </Button>

                      {dynamicStaffCategories
                        .filter(catKey => !['director', 'committee_member'].includes(catKey))
                        .map(catKey => {
                          const label = getCategoryLabel(catKey);
                          const isSelected = selectedDeptTab === catKey;
                          return (
                            <Button
                              key={catKey}
                              type="button"
                              size="sm"
                              variant={isSelected ? 'default' : 'outline'}
                              className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'bg-background hover:bg-muted text-foreground border-border/60'
                              }`}
                              onClick={() => setSelectedDeptTab(catKey)}
                            >
                              <Building2 className="h-3.5 w-3.5 mr-1 text-primary/80" />
                              {label}
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Render Department Cards based on selectedDeptTab */}
                {dynamicStaffCategories
                  .filter(catKey => !['director', 'committee_member'].includes(catKey))
                  .filter(catKey => selectedDeptTab === 'all' || selectedDeptTab === catKey)
                  .map(catKey => ({ key: catKey, label: getCategoryLabel(catKey) }))
                  .map(cat => {
                    const cfg = getDeptConfig(cat.key);
                    return (
                      <div
                        key={cat.key}
                        className="rounded-xl border-2 border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4"
                      >
                        {/* Department Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">{cat.label}</h3>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0.2 font-semibold ${
                                    cfg.isOngoing
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  }`}
                                >
                                  {cfg.isOngoing
                                    ? (bn ? '🟢 স্থায়ী সময়সূচি' : '🟢 Permanent')
                                    : (bn ? '⏳ নির্দিষ্ট মেয়াদী সেশন' : '⏳ Fixed Session')}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {bn ? 'এই ডিপার্টমেন্টের স্টাফদের ডিউটি ও হাজিরা হিসাবের নিয়ম' : 'Duty & attendance rules for this department'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            title={bn ? 'এই ক্যাটেগরির সবার ব্যক্তিগত ওভাররাইড মুছে দিন' : 'Clear per-staff override'}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition font-medium border border-amber-500/30 whitespace-nowrap flex items-center gap-1 cursor-pointer"
                            onClick={async () => {
                              const ok = await confirm({
                                title: bn ? 'ব্যক্তিগত ওভাররাইড রিসেট?' : 'Reset personal overrides?',
                                description: bn
                                  ? `${cat.label} ক্যাটেগরির সব স্টাফের নিজস্ব ডিউটি টাইম মুছে যাবে এবং ক্যাটেগরি টাইম প্রযোজ্য হবে।`
                                  : `All personal duty times for ${cat.label} will be cleared and the category time will apply.`,
                                variant: 'warning',
                              });
                              if (!ok) return;
                              const { error, count } = await supabase
                                .from('staff')
                                .update({ duty_start_time: null, duty_end_time: null, updated_at: new Date().toISOString() }, { count: 'exact' })
                                .eq('staff_category', cat.key);
                              if (error) { toast.error(error.message); return; }
                              toast.success(bn ? `${count ?? 0} জনের ওভাররাইড মুছে দেওয়া হয়েছে` : `Cleared override for ${count ?? 0} staff`);
                              queryClient.invalidateQueries({ queryKey: ['attendance'] });
                              queryClient.invalidateQueries({ queryKey: ['staff'] });
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            {bn ? 'ওভাররাইড রিসেট' : 'Reset overrides'}
                          </button>
                        </div>

                        {/* ৩টি সুস্পষ্ট সেকশন */}
                        <div className="space-y-4">
                          {/* সেকশন ১: দৈনিক নিয়মিত সময়সূচি */}
                          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                                ১
                              </span>
                              <Label className="text-xs font-bold text-foreground">
                                {bn ? 'দৈনিক নিয়মিত সময়সূচি' : 'Daily Regular Work Schedule'}
                              </Label>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({bn ? 'প্রতিদিন আসার ও যাওয়ার নির্ধারিত সময়' : 'Expected daily check-in and check-out'})
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-primary" /> {bn ? 'কাজের শুরুর সময়' : 'Start Time'}
                                </Label>
                                <TimePicker
                                  className="h-8 text-sm bg-background mt-1"
                                  displayFormat={timeFormat}
                                  value={cfg.start}
                                  onChange={v => updateDeptConfig(cat.key, { start: v })}
                                />
                              </div>
                              <div>
                                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-primary" /> {bn ? 'কাজের শেষের সময়' : 'End Time'}
                                </Label>
                                <TimePicker
                                  className="h-8 text-sm bg-background mt-1"
                                  displayFormat={timeFormat}
                                  value={cfg.end}
                                  onChange={v => updateDeptConfig(cat.key, { end: v })}
                                />
                              </div>
                            </div>
                          </div>

                          {/* সেকশন ২: সেশন ও মেয়াদের ধরন */}
                          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-950/15 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                                  ২
                                </span>
                                <Label className="text-xs font-bold text-foreground">
                                  {bn ? 'সেশন ও মেয়াদের ধরন' : 'Session & Validity Period'}
                                </Label>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {bn ? 'এই সময়সূচি কতদিন প্রযোজ্য থাকবে' : 'How long this schedule applies'}
                              </span>
                            </div>

                            {/* Mode Segmented Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => updateDeptConfig(cat.key, { isOngoing: true, effectiveTo: '' })}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                  cfg.isOngoing
                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/40 shadow-xs'
                                    : 'bg-background hover:bg-muted border-border/70 text-muted-foreground'
                                }`}
                              >
                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                                  cfg.isOngoing ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40'
                                }`}>
                                  {cfg.isOngoing && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                  <span className="font-bold text-xs block text-foreground">
                                    {bn ? '🟢 স্থায়ী সময়সূচি (অনির্দিষ্টকাল চলমান)' : 'Permanent (Ongoing)'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                                    {bn ? 'সমাপ্তির কোনো তারিখ নেই, নতুন কোনো সেশন না আসা পর্যন্ত চলতে থাকবে।' : 'No end date, active indefinitely.'}
                                  </span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => updateDeptConfig(cat.key, { isOngoing: false })}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                  !cfg.isOngoing
                                    ? 'bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/40 shadow-xs'
                                    : 'bg-background hover:bg-muted border-border/70 text-muted-foreground'
                                }`}
                              >
                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                                  !cfg.isOngoing ? 'border-amber-600 bg-amber-600 text-white' : 'border-muted-foreground/40'
                                }`}>
                                  {!cfg.isOngoing && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                  <span className="font-bold text-xs block text-foreground">
                                    {bn ? '⏳ নির্দিষ্ট মেয়াদী সেশন' : 'Fixed-term Session'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                                    {bn ? 'গ্রীষ্মকালীন, শীতকালীন বা নির্দিষ্ট কোনো শিক্ষাবর্ষের সমাপ্তি তারিখসহ।' : 'Has fixed end date (e.g., academic term).'}
                                  </span>
                                </div>
                              </button>
                            </div>

                            {/* Date Range Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                  {bn ? 'সেশন শুরুর তারিখ' : 'Session Start Date'} <span className="text-destructive">*</span>
                                </Label>
                                <DatePicker
                                  className="h-8 text-xs w-full bg-background mt-1"
                                  value={cfg.effectiveFrom}
                                  onChange={(d) => updateDeptConfig(cat.key, { effectiveFrom: d || '' })}
                                />
                              </div>
                              <div>
                                <Label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                    {bn ? 'সেশন সমাপ্তির তারিখ' : 'Session End Date'}
                                  </span>
                                  {cfg.isOngoing && (
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                      {bn ? '✓ স্থায়ী (সমাপ্তি নেই)' : 'Permanent'}
                                    </span>
                                  )}
                                </Label>
                                <DatePicker
                                  className={`h-8 text-xs w-full mt-1 ${cfg.isOngoing ? 'opacity-60 bg-muted cursor-not-allowed' : 'bg-background'}`}
                                  value={cfg.effectiveTo}
                                  onChange={(d) => updateDeptConfig(cat.key, { effectiveTo: d || '' })}
                                  disabled={cfg.isOngoing}
                                  placeholder={cfg.isOngoing ? (bn ? 'চলমান (স্থায়ী)' : 'Ongoing') : (bn ? 'সমাপ্তির তারিখ নির্বাচন করুন' : 'Select end date')}
                                />
                              </div>
                            </div>

                            {/* Clean Status Callout */}
                            <div className="rounded-lg bg-background border border-emerald-500/20 p-2.5 text-[11px] text-foreground flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="leading-snug">
                                {bn ? (
                                  <>
                                    <strong>কার্যকর অবস্থা:</strong> {cfg.effectiveFrom ? fmtDate(cfg.effectiveFrom) : 'শুরু হতে'}{' '}
                                    {cfg.isOngoing ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">স্থায়ীভাবে বলবৎ</span>
                                    ) : cfg.effectiveTo ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold">{fmtDate(cfg.effectiveTo)} পর্যন্ত কার্যকর</span>
                                    ) : (
                                      <span className="text-destructive font-semibold">সমাপ্তির তারিখ দেওয়া হয়নি</span>
                                    )}
                                    । প্রতিদিন ডিউটি: <strong>{cfg.start || '08:00'}</strong> হতে <strong>{cfg.end || '17:00'}</strong> পর্যন্ত।
                                  </>
                                ) : (
                                  <>
                                    <strong>Active:</strong> From {cfg.effectiveFrom || 'start'}{' '}
                                    {cfg.isOngoing ? 'indefinitely' : `to ${cfg.effectiveTo || 'end'}`}. Duty: {cfg.start} - {cfg.end}.
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* সেকশন ৩: বারভিত্তিক বিশেষ ডিউটি */}
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-950/15 p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                                  ৩
                                </span>
                                <div>
                                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    {bn ? 'বারভিত্তিক বিশেষ ডিউটি (যেমন: বৃহস্পতিবার হাফ-ডে)' : 'Day-Specific Duty (e.g. Thursday Half-day)'}
                                  </Label>
                                  <p className="text-[10px] text-muted-foreground">
                                    {bn ? 'সপ্তাহের নির্দিষ্ট বারে কাজ আগে শেষ হলেও পূর্ণ দিন হাজিরা গণ্য হবে' : 'Counts as full day even if duty ends earlier on selected days'}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={cfg.specialDay?.enabled === true}
                                onCheckedChange={(c) => {
                                  const curSchedules = cfg.specialDay?.daySchedules || {
                                    4: {
                                      start: cfg.specialDay?.start ?? '',
                                      end: cfg.specialDay?.end || '14:00',
                                      rateMode: cfg.specialDay?.rateMode || 'regular_duty_rate',
                                    },
                                  };
                                  updateDeptConfig(cat.key, {
                                    specialDay: {
                                      enabled: c,
                                      days: Object.keys(curSchedules).map(Number),
                                      start: cfg.specialDay?.start ?? '',
                                      end: cfg.specialDay?.end || '14:00',
                                      rateMode: cfg.specialDay?.rateMode || 'regular_duty_rate',
                                      daySchedules: curSchedules,
                                    },
                                  });
                                }}
                              />
                            </div>

                            {cfg.specialDay?.enabled && (
                              <div className="space-y-3 pt-2 border-t border-amber-500/20">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground font-semibold">
                                    {bn ? 'প্রযোজ্য বার নির্বাচন করুন:' : 'Select applicable day(s):'}
                                  </Label>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {DAY_OF_WEEK_OPTIONS.map((dayOpt) => {
                                      const daySchedules = cfg.specialDay?.daySchedules || {};
                                      const isSel = dayOpt.value in daySchedules;
                                      return (
                                        <label
                                          key={dayOpt.value}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer border transition-colors ${
                                            isSel
                                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-800 dark:text-amber-200 font-semibold shadow-2xs'
                                              : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
                                          }`}
                                        >
                                          <Checkbox
                                            checked={isSel}
                                            onCheckedChange={(v) => {
                                              const nextSchedules = { ...daySchedules };
                                              if (v) {
                                                nextSchedules[dayOpt.value] = {
                                                  start: cfg.specialDay?.start || '',
                                                  end: cfg.specialDay?.end || '14:00',
                                                  rateMode: cfg.specialDay?.rateMode || 'regular_duty_rate',
                                                };
                                              } else {
                                                delete nextSchedules[dayOpt.value];
                                              }
                                              const nextDays = Object.keys(nextSchedules).map(Number);
                                              updateDeptConfig(cat.key, {
                                                specialDay: {
                                                  ...cfg.specialDay!,
                                                  days: nextDays,
                                                  daySchedules: nextSchedules,
                                                },
                                              });
                                            }}
                                          />
                                          <span>{bn ? dayOpt.bn : dayOpt.en}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Per-Day Config Cards */}
                                {(() => {
                                  const daySchedules = cfg.specialDay?.daySchedules || {};
                                  const activeDays = DAY_OF_WEEK_OPTIONS.filter((d) => d.value in daySchedules);
                                  if (activeDays.length === 0) {
                                    return (
                                      <p className="text-[10px] text-muted-foreground italic p-2 bg-muted/20 rounded">
                                        {bn ? 'উপরে অন্তত একটি বার নির্বাচন করুন।' : 'Please select at least one day above.'}
                                      </p>
                                    );
                                  }
                                  return (
                                    <div className="space-y-2 mt-1">
                                      {activeDays.map((dayOpt) => {
                                        const sched = daySchedules[dayOpt.value] || { start: '', end: '14:00', rateMode: 'regular_duty_rate' };
                                        return (
                                          <div key={dayOpt.value} className="p-3 rounded-lg border border-amber-500/30 bg-background space-y-2.5">
                                            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                📅 {bn ? dayOpt.bn : dayOpt.en}
                                              </span>
                                              <button
                                                type="button"
                                                className="text-[10px] text-destructive hover:underline cursor-pointer font-medium"
                                                onClick={() => {
                                                  const nextSchedules = { ...daySchedules };
                                                  delete nextSchedules[dayOpt.value];
                                                  const nextDays = Object.keys(nextSchedules).map(Number);
                                                  updateDeptConfig(cat.key, {
                                                    specialDay: {
                                                      ...cfg.specialDay!,
                                                      days: nextDays,
                                                      daySchedules: nextSchedules,
                                                    },
                                                  });
                                                }}
                                              >
                                                {bn ? 'বাদ দিন' : 'Remove'}
                                              </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                              <div>
                                                <Label className="text-[10px] text-muted-foreground">{bn ? 'বিশেষ শুরু' : 'Special Start'}</Label>
                                                <TimePicker
                                                  className="h-8 text-xs w-full bg-background"
                                                  displayFormat={timeFormat}
                                                  value={sched.start || ''}
                                                  placeholder={bn ? 'ডিফল্ট শুরু' : 'Default start'}
                                                  onChange={(v) => {
                                                    const nextSchedules = {
                                                      ...daySchedules,
                                                      [dayOpt.value]: { ...sched, start: v },
                                                    };
                                                    updateDeptConfig(cat.key, {
                                                      specialDay: { ...cfg.specialDay!, daySchedules: nextSchedules },
                                                    });
                                                  }}
                                                />
                                              </div>
                                              <div>
                                                <Label className="text-[10px] text-muted-foreground">{bn ? 'বিশেষ শেষ (ফুল দিন)' : 'Special End (Full Day)'}</Label>
                                                <TimePicker
                                                  className="h-8 text-xs w-full bg-background"
                                                  displayFormat={timeFormat}
                                                  value={sched.end || '14:00'}
                                                  onChange={(v) => {
                                                    const nextSchedules = {
                                                      ...daySchedules,
                                                      [dayOpt.value]: { ...sched, end: v || '14:00' },
                                                    };
                                                    updateDeptConfig(cat.key, {
                                                      specialDay: { ...cfg.specialDay!, daySchedules: nextSchedules },
                                                    });
                                                  }}
                                                />
                                              </div>
                                            </div>

                                            <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                                              <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                                💰 {bn ? 'বিশেষ দিনে বিলম্ব/আগাম বের হওয়ার মিনিট কর্তনের হার:' : 'Late/Early Deduction Rate:'}
                                              </Label>
                                              <div className="space-y-1.5 bg-muted/30 p-2 rounded-md border border-border/50">
                                                <label className="flex items-start gap-2 text-xs cursor-pointer">
                                                  <input
                                                    type="radio"
                                                    name={`rate_mode_${cat.key}_${dayOpt.value}`}
                                                    checked={sched.rateMode !== 'special_day_rate'}
                                                    onChange={() => {
                                                      const nextSchedules = {
                                                        ...daySchedules,
                                                        [dayOpt.value]: { ...sched, rateMode: 'regular_duty_rate' },
                                                      };
                                                      updateDeptConfig(cat.key, {
                                                        specialDay: { ...cfg.specialDay!, daySchedules: nextSchedules as any },
                                                      });
                                                    }}
                                                    className="mt-0.5 cursor-pointer text-primary"
                                                  />
                                                  <div>
                                                    <span className="font-semibold text-foreground">{bn ? 'ডিপার্টমেন্টের নিয়মিত ডিউটি রেটে কর্তন (সুপারিশকৃত)' : 'Regular duty rate (Recommended)'}</span>
                                                    <p className="text-[10px] text-muted-foreground">{bn ? 'বিশেষ দিনেও সাধারণ দিনের প্রতি মিনিট রেট অনুযায়ী কর্তন হবে।' : 'Deducts using regular per-minute rate.'}</p>
                                                  </div>
                                                </label>
                                                <label className="flex items-start gap-2 text-xs cursor-pointer">
                                                  <input
                                                    type="radio"
                                                    name={`rate_mode_${cat.key}_${dayOpt.value}`}
                                                    checked={sched.rateMode === 'special_day_rate'}
                                                    onChange={() => {
                                                      const nextSchedules = {
                                                        ...daySchedules,
                                                        [dayOpt.value]: { ...sched, rateMode: 'special_day_rate' },
                                                      };
                                                      updateDeptConfig(cat.key, {
                                                        specialDay: { ...cfg.specialDay!, daySchedules: nextSchedules as any },
                                                      });
                                                    }}
                                                    className="mt-0.5 cursor-pointer text-primary"
                                                  />
                                                  <div>
                                                    <span className="font-semibold text-foreground">{bn ? 'বিশেষ দিনের শিফট রেটে কর্তন' : 'Special day shift rate'}</span>
                                                    <p className="text-[10px] text-muted-foreground">{bn ? 'বিশেষ দিনের মোট ডিউটি মিনিটের ভিত্তিতে কর্তন হবে।' : 'Deducts using rate calculated from special day hours.'}</p>
                                                  </div>
                                                </label>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dedicated Save Button for this Department */}
                        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3.5 sm:p-4 rounded-b-xl">
                          <p className="text-xs text-muted-foreground">
                            {bn
                              ? `শুধুমাত্র "${cat.label}" ডিপার্টমেন্টের সময়সূচি ও সেশন সংরক্ষণ করতে:`
                              : `Save schedule & session for "${cat.label}":`}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="w-full sm:w-auto h-9 px-5 text-xs font-bold rounded-lg shadow-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                            onClick={() => handleSaveSingleDepartment(cat.key, cat.label)}
                            disabled={savingCatKey === cat.key || saveCategoryTimesMutation.isPending}
                          >
                            {savingCatKey === cat.key ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                <span>{bn ? `"${cat.label}" সংরক্ষণ করুন` : `Save ${cat.label}`}</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                {/* Save All Departments Button (Visible when 'all' is selected) */}
                {selectedDeptTab === 'all' && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-10 text-xs font-bold rounded-xl shadow-xs"
                    onClick={() => {
                      const visibleCategories = dynamicStaffCategories
                        .filter(catKey => !['director', 'committee_member'].includes(catKey));
                      const payloads: Record<string, DeptShiftConfig> = {};
                      visibleCategories.forEach((catKey) => {
                        payloads[catKey] = getDeptConfig(catKey);
                      });
                      saveCategoryTimesMutation.mutate(payloads as any);
                    }}
                    disabled={saveCategoryTimesMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {bn ? 'সকল ডিপার্টমেন্টের শিফট একসাথে সংরক্ষণ করুন' : 'Save All Department Shifts'}
                  </Button>
                )}

                {/* Special Duty Shifts Section - Displayed just like departments with saved name */}
                <div className="pt-3 border-t border-border/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                      {bn ? 'আলাদা / বিশেষ ডিউটি শিফট' : 'Special Duty Shifts'}
                    </Label>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                      {specialDutyGroups.length} {bn ? 'টি ডিউটি' : 'duties'}
                    </Badge>
                  </div>

                  {specialDutyGroups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground bg-muted/10">
                      {bn ? 'কোনো আলাদা ডিউটি শিফট তৈরি করা হয়নি।' : 'No special duty shift created yet.'}
                    </div>
                  ) : (
                    specialDutyGroups.map((duty) => (
                      <div key={duty.id} className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] p-3 space-y-2.5">
                        {/* Header: Name & Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <p className="text-xs font-bold text-foreground truncate">{duty.name}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4">
                              {duty.staffIds.length} {bn ? 'জন স্টাফ' : 'staff'}
                            </Badge>
                            <button
                              type="button"
                              title={bn ? 'এই আলাদা ডিউটি শিফট মুছে ফেলুন' : 'Delete this special duty shift'}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: bn ? 'আলাদা ডিউটি শিফট মুছবেন?' : 'Delete special duty shift?',
                                  description: bn
                                    ? `"${duty.name}" শিফট এবং এর অন্তর্ভুক্ত ${duty.staffIds.length} জন স্টাফের এই ডিউটি অ্যাসাইনমেন্ট মুছে যাবে।`
                                    : `Delete "${duty.name}" and shift assignments for ${duty.staffIds.length} staff?`,
                                  variant: 'destructive',
                                });
                                if (!ok) return;
                                const shiftIds = duty.shifts.map(s => s.id);
                                const { error } = await supabase.from('staff_special_shifts' as any).delete().in('id', shiftIds);
                                if (error) { toast.error(error.message); return; }
                                toast.success(bn ? 'আলাদা ডিউটি শিফট মুছে ফেলা হয়েছে' : 'Special duty deleted');
                                queryClient.invalidateQueries({ queryKey: ['staff_special_shifts'] });
                                queryClient.invalidateQueries({ queryKey: ['attendance'] });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Times */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[9px] text-muted-foreground">{bn ? 'শুরু' : 'Start'}</Label>
                            <div className="h-7 px-2 rounded-md border bg-background/70 flex items-center text-xs font-semibold text-foreground">
                              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 mr-1 shrink-0" />
                              {fmt(duty.duty_start_time)}
                            </div>
                          </div>
                          <div>
                            <Label className="text-[9px] text-muted-foreground">{bn ? 'শেষ' : 'End'}</Label>
                            <div className="h-7 px-2 rounded-md border bg-background/70 flex items-center text-xs font-semibold text-foreground">
                              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 mr-1 shrink-0" />
                              {fmt(duty.duty_end_time)}
                            </div>
                          </div>
                        </div>

                        {/* Date Range */}
                        <div className="rounded-lg border border-border/40 bg-background/40 p-1.5 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-primary shrink-0" />
                            {fmtDate(duty.effective_from)} {bn ? 'থেকে' : 'to'} {duty.effective_to ? fmtDate(duty.effective_to) : (bn ? 'চলমান' : 'Ongoing')}
                          </span>
                          {duty.isOngoing && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {bn ? '🟢 চলমান' : '🟢 Ongoing'}
                            </span>
                          )}
                        </div>

                        {/* Staff Names Preview */}
                        {duty.staffNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {duty.staffNames.map((name, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-background/90 border border-border/60 text-foreground truncate max-w-[130px]">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Add New Special Duty Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-semibold bg-amber-500/[0.04]"
                    onClick={() => setSpecialShiftDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    {bn ? 'নতুন আলাদা ডিউটি শিফট যোগ করুন' : 'Add New Special Duty Shift'}
                  </Button>
                </div>

                <a href="/admin/shift-audit-log" className="block text-center text-[11px] text-primary hover:underline">
                  {bn ? '📜 পরিবর্তনের ইতিহাস দেখুন' : '📜 View change history'}
                </a>
              </div>
              )}

              {/* Residential Duty Times - Always accessible */}
              {entityType === 'staff' && (settingsSubTab === 'all' || settingsSubTab === 'duty') && (

              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <Label className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {bn ? 'আবাসিক ডিউটি টাইম সেটিংস' : 'Residential Duty Time Settings'}
                </Label>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{bn ? 'সকাল ডিউটি' : 'Morning Duty'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px]">{bn ? 'শুরু' : 'Start'}</Label>
                      <TimePicker className="h-8 text-sm" displayFormat={timeFormat} value={dutyTimes.morning_start} onChange={v => setDutyTimes(p => ({ ...p, morning_start: v }))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">{bn ? 'শেষ' : 'End'}</Label>
                      <TimePicker className="h-8 text-sm" displayFormat={timeFormat} value={dutyTimes.morning_end} onChange={v => setDutyTimes(p => ({ ...p, morning_end: v }))} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{bn ? 'সন্ধ্যা ডিউটি' : 'Evening Duty'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px]">{bn ? 'শুরু' : 'Start'}</Label>
                      <TimePicker className="h-8 text-sm" displayFormat={timeFormat} value={dutyTimes.evening_start} onChange={v => setDutyTimes(p => ({ ...p, evening_start: v }))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">{bn ? 'শেষ' : 'End'}</Label>
                      <TimePicker className="h-8 text-sm" displayFormat={timeFormat} value={dutyTimes.evening_end} onChange={v => setDutyTimes(p => ({ ...p, evening_end: v }))} />
                    </div>
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => saveDutyTimesMutation.mutate(dutyTimes)}>
                  <Save className="h-3 w-3 mr-1" /> {bn ? 'ডিউটি টাইম সেভ করুন' : 'Save Duty Times'}
                </Button>

                {/* Days & Salary Settings */}
                <div className="border-t pt-3 mt-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">{bn ? 'ডিউটি দিন ও বেতন সেটিংস' : 'Duty Days & Salary Settings'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px]">{bn ? 'সকাল ডিউটি (দিন)' : 'Morning Duty (Days)'}</Label>
                      <Input type="number" className="h-8 text-sm" value={dutyTimes.morning_days || ''} onChange={e => setDutyTimes(p => ({ ...p, morning_days: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">{bn ? 'সন্ধ্যা ডিউটি (দিন)' : 'Evening Duty (Days)'}</Label>
                      <Input type="number" className="h-8 text-sm" value={dutyTimes.evening_days || ''} onChange={e => setDutyTimes(p => ({ ...p, evening_days: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">{bn ? 'মোট ডিউটি বেতন (৳)' : 'Total Duty Salary (৳)'}</Label>
                    <Input type="number" className="h-8 text-sm" placeholder="0" value={dutyTimes.total_salary || ''} onChange={e => setDutyTimes(p => ({ ...p, total_salary: Number(e.target.value) }))} />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {bn
                        ? `মোট ${dutyTimes.morning_days + dutyTimes.evening_days} শিফট | প্রতি শিফট: ৳${dutyTimes.total_salary && (dutyTimes.morning_days + dutyTimes.evening_days) > 0 ? (dutyTimes.total_salary / (dutyTimes.morning_days + dutyTimes.evening_days)).toFixed(2) : '0'}`
                        : `Total ${dutyTimes.morning_days + dutyTimes.evening_days} shifts | Per shift: ৳${dutyTimes.total_salary && (dutyTimes.morning_days + dutyTimes.evening_days) > 0 ? (dutyTimes.total_salary / (dutyTimes.morning_days + dutyTimes.evening_days)).toFixed(2) : '0'}`}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => saveDutyTimesMutation.mutate(dutyTimes)}>
                    <Save className="h-3 w-3 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
                  </Button>
                </div>

                {/* Extra Duty Option */}
                <div className="border-t pt-3 mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{bn ? 'অতিরিক্ত ডিউটি হিসেবে যোগ করুন' : 'Count as Extra Duty'}</p>
                      <p className="text-[10px] text-muted-foreground">{bn ? 'চালু করলে আবাসিক ডিউটি অতিরিক্ত বেতন হিসেবে যোগ হবে' : 'If enabled, residential duty will be added as extra pay'}</p>
                    </div>
                    <Switch
                      checked={dutyTimes.extra_duty_enabled}
                      onCheckedChange={c => setDutyTimes(p => ({ ...p, extra_duty_enabled: c }))}
                    />
                  </div>
                  {dutyTimes.extra_duty_enabled && (
                    <div>
                      <Label className="text-xs">{bn ? 'প্রতি শিফটের মাসিক মোট বেতন (৳)' : 'Monthly total pay per shift (৳)'}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10000000}
                        step={1}
                        className="h-8 text-sm mt-1"
                        placeholder="0"
                        value={dutyTimes.extra_duty_rate || ''}
                        onChange={e => {
                          const raw = e.target.value;
                          if (raw === '') { setDutyTimes(p => ({ ...p, extra_duty_rate: 0 })); return; }
                          const n = Number(raw);
                          if (!Number.isFinite(n)) return;
                          const clamped = Math.max(0, Math.min(10000000, n));
                          setDutyTimes(p => ({ ...p, extra_duty_rate: clamped }));
                        }}
                      />
                      {dutyTimes.extra_duty_enabled && (!dutyTimes.extra_duty_rate || dutyTimes.extra_duty_rate <= 0) && (
                        <p className="text-[10px] text-destructive mt-1">
                          {bn ? '⚠ অতিরিক্ত ডিউটি চালু আছে — শূন্যের বেশি বেতন দিন' : '⚠ Extra duty is enabled — set a value greater than 0'}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {bn
                          ? `সকাল ও সন্ধ্যা — প্রতি শিফটের জন্য মাসিক মোট। প্রতিদিন উপস্থিতির হিসাবে আনুপাতিক হারে বেতনে যোগ হবে। (প্রতিদিন/প্রতি শিফট ≈ ৳${(dutyTimes.morning_days || 0) > 0 ? ((dutyTimes.extra_duty_rate || 0) / (dutyTimes.morning_days || 1)).toFixed(2) : '0'})`
                          : `Morning & Evening — monthly total per shift. Will be added pro-rata based on daily attendance. (Per day/per shift ≈ ৳${(dutyTimes.morning_days || 0) > 0 ? ((dutyTimes.extra_duty_rate || 0) / (dutyTimes.morning_days || 1)).toFixed(2) : '0'})`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Meal Attendance Settings */}
              {entityType === 'staff' && (settingsSubTab === 'all' || settingsSubTab === 'meal') && (
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <Label className="font-semibold flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" />
                  {bn ? 'খাবার হাজিরা সেটিংস' : 'Meal Attendance Settings'}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {bn
                    ? 'খাবার হাজিরার জন্য সকালের নাস্তা, দুপুর ও রাতের খাবার — উপরের ড্রপডাউন থেকে বেছে নিন। মেনু ও হোস্টেল সংক্রান্ত সেটিংস হোস্টেল পেজে।'
                    : 'Choose breakfast, lunch or dinner from the dropdown above. Menu and hostel-related settings live on the hostel page.'}
                </p>
                <Button asChild size="sm" variant="secondary" className="w-full">
                  <a href="/admin/hostel">
                    <Utensils className="h-3 w-3 mr-1" /> {bn ? 'খাবার মেনু সেটিংস' : 'Meal Menu Settings'}
                  </a>
                </Button>
              </div>
              )}



              {/* Existing Rules */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{bn ? 'বিদ্যমান রুলসমূহ' : 'Existing Rules'}</p>
                {rules.filter((r: any) => r.entity_type === entityType).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">{bn ? 'কোনো রুল নেই' : 'No rules yet'}</p>
                )}
                {rules.filter((r: any) => r.entity_type === entityType).map((rule: any) => {
                  const cfg = rule.config as any;
                  return (
                    <div key={rule.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                      <span className="text-sm flex-1">{bn ? rule.name_bn : rule.name}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[cfg?.counts_as] || 'bg-muted'}`}>{cfg?.counts_as}</Badge>
                      <Switch checked={rule.is_active} onCheckedChange={c => {
                        saveRuleMutation.mutate({ ...rule, is_active: c, config: rule.config });
                      }} />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                        setEditingRule(rule);
                        setRuleForm({ name: rule.name, name_bn: rule.name_bn, entity_type: rule.entity_type, config: rule.config as any });
                      }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={async () => {
                        if ((await confirm({ description: bn ? 'মুছে ফেলতে চান?' : 'Delete?', variant: 'destructive' }))) deleteRuleMutation.mutate(rule.id);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Add/Edit Rule Form */}
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <Label className="font-semibold">{editingRule ? (bn ? 'রুল সম্পাদনা' : 'Edit Rule') : (bn ? 'নতুন রুল' : 'New Rule')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{bn ? 'নাম (EN)' : 'Name (EN)'}</Label>
                    <Input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</Label>
                    <Input value={ruleForm.name_bn} onChange={e => setRuleForm(p => ({ ...p, name_bn: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{bn ? 'বিভাগ' : 'Category'}</Label>
                    <Input value={entityType === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'স্টাফ' : 'Staff')} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'গণনা হিসেবে' : 'Counts As'}</Label>
                    <Select value={ruleForm.config.counts_as} onValueChange={v => setRuleForm(p => ({ ...p, config: { ...p.config, counts_as: v } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">{bn ? 'উপস্থিত' : 'Present'}</SelectItem>
                        <SelectItem value="absent">{bn ? 'অনুপস্থিত' : 'Absent'}</SelectItem>
                        <SelectItem value="late">{bn ? 'বিলম্ব উপস্থিত' : 'Late Present'}</SelectItem>
                        <SelectItem value="half_day">{bn ? 'অর্ধদিন' : 'Half Day'}</SelectItem>
                        <SelectItem value="leave">{bn ? 'ছুটি' : 'Leave'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" size="sm" onClick={() => {
                  saveRuleMutation.mutate({ ...ruleForm, entity_type: entityType, rule_type: 'status', config: ruleForm.config });
                }} disabled={!ruleForm.name || !ruleForm.name_bn}>
                  {editingRule ? (bn ? 'আপডেট' : 'Update') : (bn ? 'যোগ করুন' : 'Add Rule')}
                </Button>
                {editingRule && (
                  <Button variant="outline" className="w-full" size="sm" onClick={() => {
                    setEditingRule(null);
                    setRuleForm({ name: '', name_bn: '', entity_type: 'student', config: { color: 'green', counts_as: 'present' } });
                  }}>
                    {bn ? 'বাতিল' : 'Cancel'}
                  </Button>
                )}
              </div>
            </div>
  );

  const renderDutyStaffCard = (entity: any, shift: 'morning' | 'evening', idx: number) => {
    const att = attendance.find((a: any) => a.entity_id === entity.id && a.shift === shift);
    const currentStatus = att?.status || '';
    const shiftTime = shift === 'morning'
      ? { start: dutyTimes.morning_start, end: dutyTimes.morning_end }
      : { start: dutyTimes.evening_start, end: dutyTimes.evening_end };

    const isTimeEditorOpen = timeEditorOpenId === `${entity.id}-${shift}`;

    return (
      <div
        key={`${entity.id}-${shift}`}
        className={`group relative rounded-[24px] border transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_12px_40px_-8px_hsl(220_20%_10%/0.1)] ${
          currentStatus 
            ? 'bg-background/80 backdrop-blur-md border-border/15 shadow-[0_4px_20px_-4px_hsl(220_20%_10%/0.06)]' 
            : 'bg-background/60 backdrop-blur-sm border-dashed border-border/20 shadow-sm'
        }`}
      >
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Left: Avatar + Info */}
          <div
            className="flex items-center gap-4 min-w-0 flex-shrink-0 cursor-pointer hover:opacity-80 transition"
            onClick={() => setMonthlyStaff(entity)}
            title={bn ? 'মাসিক ডিউটি উপস্থিতি দেখুন' : 'View monthly attendance'}
          >
            <span className="text-xs font-medium text-muted-foreground/60 w-6 text-center tabular-nums">
              {idx + 1}
            </span>
            <div className="relative">
              {entity.photo_url ? (
                <img src={entity.photo_url} alt="" className="w-11 h-11 rounded-2xl object-cover border border-border/20 shadow-sm" />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                  {(entity.name || entity.name_bn || 'S').charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm ${
                  currentStatus === 'present' ? 'bg-emerald-500' :
                  currentStatus === 'absent' ? 'bg-rose-500' :
                  currentStatus === 'late' ? 'bg-amber-500' :
                  currentStatus === 'half_day' ? 'bg-orange-500' :
                  currentStatus === 'leave' ? 'bg-blue-500' : 'bg-muted-foreground/30'
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm truncate">
                  {getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary}
                </span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-normal ${
                  shift === 'morning' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20'
                }`}>
                  {shift === 'morning' ? (bn ? '🌅 সকাল' : 'Morning') : (bn ? '🌙 সন্ধ্যা' : 'Evening')}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate mt-0.5">
                <span>{entity.designation || (bn ? 'শিক্ষক' : 'Teacher')}</span>
                {entity.phone && <span>• {entity.phone}</span>}
                <span className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded text-foreground/70">
                  {formatTimeDisplay(shiftTime.start, timeFormat)} - {formatTimeDisplay(shiftTime.end, timeFormat)}
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Late/Early badges & Time Inputs */}
          <div className="flex-1 flex flex-wrap items-center gap-2 justify-end sm:justify-start">
            {(() => {
              if (!att?.check_in_time || currentStatus === 'half_day') return null;
              const lateMin = calcLateMinutes(att.check_in_time, shiftTime.start);
              return lateMin > 0 ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/15">
                  {bn ? `${fmtMins(lateMin, true)} বিলম্ব` : `${fmtMins(lateMin, false)} late`}
                </span>
              ) : null;
            })()}

            {/* Time Picker */}
            {(['present', 'late', 'half_day'].includes(currentStatus || '') || isTimeEditorOpen) && (
              <div className={`flex flex-col gap-1 shrink-0 w-full sm:w-auto rounded-2xl border px-3 py-2 transition-all ${
                currentStatus === 'half_day'
                  ? 'border-orange-500/20 bg-orange-500/5 opacity-80'
                  : 'border-amber-500/20 bg-amber-500/5'
              }`}>
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  {currentStatus === 'half_day' ? (
                    <>
                      <Lock className="h-3 w-3 text-orange-500" />
                      <span className="text-orange-600 dark:text-orange-400">{bn ? 'সময় পরিবর্তন লক (অর্ধদিন)' : 'Time Locked (Half Day)'}</span>
                    </>
                  ) : (
                    bn ? 'ডিউটি চেক-ইন / চেক-আউট' : 'Duty Check-in / Out'
                  )}
                </span>
                <div className="flex gap-2 items-center">
                  <TimePicker
                    className="h-8 w-[120px] text-xs rounded-xl bg-background/60 border-border/20 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder={bn ? 'প্রবেশ' : 'In'}
                    displayFormat={timeFormat}
                    value={att?.check_in_time || ''}
                    disabled={!canMarkAttendance || currentStatus === 'half_day'}
                    onChange={v => saveMutation.mutate({
                      entityId: entity.id,
                      shift,
                      status: currentStatus || 'present',
                      check_in_time: v,
                      check_out_time: att?.check_out_time || '',
                    })}
                  />
                  <span className="text-muted-foreground/40 text-xs">—</span>
                  <TimePicker
                    className="h-8 w-[120px] text-xs rounded-xl bg-background/60 border-border/20 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder={bn ? 'বাহির' : 'Out'}
                    displayFormat={timeFormat}
                    value={att?.check_out_time || ''}
                    disabled={!canMarkAttendance || currentStatus === 'half_day'}
                    onChange={v => saveMutation.mutate({
                      entityId: entity.id,
                      shift,
                      status: currentStatus || 'present',
                      check_in_time: att?.check_in_time || '',
                      check_out_time: v,
                    })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Status Pills */}
          <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
            {statusOptions.map((rule: any) => {
              const cfg = rule.config as any;
              const countsAs = cfg?.counts_as || rule.name.toLowerCase();
              const isActive = currentStatus === countsAs;
              const Icon = STATUS_ICONS[countsAs] || Check;

              const activeStyles: Record<string, string> = {
                present: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 shadow-[0_0_12px_hsl(160_84%_40%/0.15)] ring-1 ring-emerald-500/30',
                absent: 'bg-rose-500/15 text-rose-700 border-rose-500/30 shadow-[0_0_12px_hsl(350_80%_50%/0.15)] ring-1 ring-rose-500/30',
                late: 'bg-amber-500/15 text-amber-700 border-amber-500/30 shadow-[0_0_12px_hsl(40_90%_50%/0.15)] ring-1 ring-amber-500/30',
                half_day: 'bg-orange-500/15 text-orange-700 border-orange-500/30 ring-1 ring-orange-500/30',
                leave: 'bg-blue-500/15 text-blue-700 border-blue-500/30 ring-1 ring-blue-500/30',
                excused: 'bg-teal-500/15 text-teal-700 border-teal-500/30 ring-1 ring-teal-500/30',
                medical: 'bg-purple-500/15 text-purple-700 border-purple-500/30 ring-1 ring-purple-500/30',
              };

              return (
                <button
                  key={rule.id}
                  disabled={!canMarkAttendance}
                  onClick={() => {
                    const mutateData: any = { entityId: entity.id, status: countsAs, shift };
                    if (['present', 'late', 'half_day'].includes(countsAs)) {
                      mutateData.check_in_time = att?.check_in_time || shiftTime.start;
                      mutateData.check_out_time = att?.check_out_time || shiftTime.end;
                      if (countsAs === 'late') setTimeEditorOpenId(`${entity.id}-${shift}`);
                      else if (isTimeEditorOpen) setTimeEditorOpenId(null);
                    } else {
                      mutateData.check_in_time = '';
                      mutateData.check_out_time = '';
                      if (isTimeEditorOpen) setTimeEditorOpenId(null);
                    }
                    saveMutation.mutate(mutateData);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 hover:scale-105 ${
                    isActive 
                      ? (activeStyles[countsAs] || 'bg-muted text-foreground border-border/30 ring-1 ring-primary/30')
                      : 'bg-muted/30 text-muted-foreground border-border/15 hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{bn ? rule.name_bn : rule.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'উপস্থিতি ব্যবস্থাপনা' : 'Attendance Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'ছাত্র ও স্টাফের দৈনিক উপস্থিতি ট্র্যাক করুন' : 'Track daily attendance for students & staff'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {canManageAttendance && entityType === 'student' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setQrPosterOpen(true)}>
                  <QrCode className="h-4 w-4 mr-1" /> {bn ? 'QR পোস্টার' : 'QR Poster'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeviceManagerOpen(true)}>
                  <Fingerprint className="h-4 w-4 mr-1" /> {bn ? 'হার্ডওয়্যার ডিভাইস' : 'Hardware Devices'}
                </Button>
              </>
            )}
            {canManageAttendance && entityType === 'staff' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStaffCheckinOpen(true)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <UserCheck className="h-4 w-4 mr-1" /> {bn ? 'চেক-ইন সিস্টেম' : 'Check-in System'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeviceManagerOpen(true)}>
                  <Fingerprint className="h-4 w-4 mr-1" /> {bn ? 'হার্ডওয়্যার ডিভাইস' : 'Hardware Devices'}
                </Button>
              </>
            )}
            {canManageAttendance && (
            <Button variant="outline" size="sm" onClick={async () => {
              toast.loading(bn ? 'দৈনিক সারসংক্ষেপ তৈরি হচ্ছে...' : 'Generating daily summary...');
              try {
                const res = await supabase.functions.invoke('daily-attendance-summary', { body: { date: selectedDate } });
                toast.dismiss();
                if (res.error) throw res.error;
                toast.success(bn ? `সারসংক্ষেপ তৈরি হয়েছে! ${res.data?.notifications_created || 0}টি বিজ্ঞপ্তি পাঠানো হয়েছে` : `Summary created! ${res.data?.notifications_created || 0} notifications sent`);
              } catch (e: any) { toast.dismiss(); toast.error(e.message || 'Failed'); }
            }}>
              <Send className="h-4 w-4 mr-1" /> {bn ? 'দৈনিক সারসংক্ষেপ' : 'Daily Summary'}
            </Button>
            )}
            {canExportAttendance && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                  <Download className="h-4 w-4 mr-1" /> {bn ? 'এক্সেল' : 'Excel'}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" /> {bn ? 'প্রিন্ট' : 'Print'}
                </Button>
              </>
            )}
            {canManageAttendance && (
            <Button variant={mainTab === 'settings' ? 'default' : 'outline'} size="sm" onClick={() => setMainTab(mainTab === 'settings' ? 'attendance' : 'settings')}>
              <Settings2 className="h-4 w-4 mr-1" /> {bn ? 'রুল সেটিংস' : 'Rule Settings'}
            </Button>
            )}
          </div>
        </div>

        {/* Main Tabs: Attendance / Settings */}
        {canManageAttendance && (
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
            <TabsList>
              <TabsTrigger value="attendance"><CalendarDays className="h-4 w-4 mr-1" /> {bn ? 'হাজিরা' : 'Attendance'}</TabsTrigger>
              <TabsTrigger value="settings"><Settings2 className="h-4 w-4 mr-1" /> {bn ? 'সেটিংস' : 'Settings'}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {canManageAttendance && mainTab === 'settings' && (
          <Card>
            <CardContent className="p-6">
              {settingsPanel}
            </CardContent>
          </Card>
        )}


        {mainTab === 'attendance' && (<>
        {/* Staff Dashboards: exactly 3 tabs */}
        {entityType === 'staff' && (
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-full border border-border/30 bg-gradient-to-r from-muted/70 via-muted/40 to-muted/70 backdrop-blur-xl w-fit max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'fulltime' as const, icon: Users, label: bn ? 'ফুল টাইম হাজিরা' : 'Full Time Attendance' },
              { id: 'duty' as const, icon: Clock, label: bn ? 'আবাসিক ডিউটি' : 'Residential Duty' },
              { id: 'meal' as const, icon: Utensils, label: bn ? 'খাবার হাজিরা' : 'Meal Attendance' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectStaffSubTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  staffSubTab === t.id
                    ? 'bg-primary text-primary-foreground shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                }`}
              >
                <t.icon className="h-4 w-4 shrink-0" /> {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div key={`stats-${entityType}-${staffSubTab}`} className="grid grid-cols-2 md:grid-cols-5 gap-4">


          {[
            { label: bn ? 'মোট' : 'Total', value: stats.total, icon: Users, gradient: 'from-primary/15 to-primary/5', iconBg: 'bg-primary/15', iconColor: 'text-primary' },
            { label: bn ? 'উপস্থিত' : 'Present', value: stats.present, icon: CheckCircle2, gradient: 'from-emerald-500/15 to-emerald-500/5', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-600' },
            { label: bn ? 'অনুপস্থিত' : 'Absent', value: stats.absent, icon: XCircle, gradient: 'from-rose-500/15 to-rose-500/5', iconBg: 'bg-rose-500/15', iconColor: 'text-rose-600' },
            { label: bn ? 'বিলম্ব উপস্থিত' : 'Late Present', value: stats.late, icon: Clock, gradient: 'from-amber-500/15 to-amber-500/5', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-600' },
            { label: bn ? 'বাকি' : 'Unmarked', value: stats.unmarked, icon: AlertCircle, gradient: 'from-muted to-muted/50', iconBg: 'bg-muted', iconColor: 'text-muted-foreground' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 transition-all duration-150 hover:border-border hover:shadow-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums">{s.value}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">{s.label}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              {/* Entity Type - only show switcher when not forced and both tabs allowed */}
              {!forcedTab && canShowStudentTab && canShowStaffTab && (
                <Tabs value={entityType} onValueChange={(v) => { setEntityType(v as any); setSearchQuery(''); }} className="shrink-0">
                  <TabsList>
                    <TabsTrigger value="student"><Users className="h-4 w-4 mr-1" /> {bn ? 'ছাত্র' : 'Students'}</TabsTrigger>
                    <TabsTrigger value="staff"><UserCog className="h-4 w-4 mr-1" /> {bn ? 'স্টাফ/শিক্ষক' : 'Staff/Teacher'}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <DatePicker bengali={bn} className="w-40 h-8 text-sm" value={selectedDate} onChange={v => setSelectedDate(v)} holidayDates={holidayDates} holidayInfo={holidayInfo} />
                </div>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-1 shrink-0 ml-auto">
                {!isDutyTab && canBulkMark && <Button size="sm" disabled={entities.length === 0} className="text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_16px_hsl(160_84%_30%/0.25)] hover:shadow-[0_6px_24px_hsl(160_84%_30%/0.35)] transition-all duration-200" onClick={() => setPresentDialogOpen(true)}>
                  <Check className="h-3.5 w-3.5 mr-1" /> {bn ? 'সবাই উপস্থিত' : 'All Present'}
                </Button>}
                {!isDutyTab && canBulkMark && <Button size="sm" disabled={entities.length === 0} className="text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_16px_hsl(217_91%_50%/0.25)] hover:shadow-[0_6px_24px_hsl(217_91%_50%/0.35)] transition-all duration-200" onClick={() => setHolidayDialogOpen(true)}>
                  <CalendarOff className="h-3.5 w-3.5 mr-1" /> {bn ? 'সবাই ছুটি' : 'All Leave'}
                </Button>}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "text-xs rounded-full border shadow-sm transition-all duration-200 font-medium gap-1.5",
                      isAdvanceMarkingEnabled
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                        : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/15"
                    )}
                    onClick={() => setAdvanceSettingsOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>{bn ? 'আগাম ছুটি/হাজিরা' : 'Advance Leave'}</span>
                    {isAdvanceMarkingEnabled && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                    )}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs rounded-full border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-sm transition-all duration-200 font-medium"
                    onClick={() => setRecoveryDialogOpen(true)}
                  >
                    <History className="h-3.5 w-3.5 mr-1 text-amber-600" />
                    {bn ? 'হাজিরা রিকভার' : 'Recover'}
                  </Button>
                )}
                {canDeleteItem && attendance.length > 0 && (
                  <Popover open={showResetMenu} onOpenChange={setShowResetMenu}>
                    <PopoverTrigger asChild>
                      <Button size="sm" className="text-xs rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 shadow-sm transition-all duration-200">
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> {bn ? 'রিসেট' : 'Reset'}
                        {requiresResetApproval && (
                          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
                            {bn ? 'অনুমোদন প্রযোজ্য' : 'Approval Req'}
                          </span>
                        )}
                        <Settings2 className="h-3 w-3 ml-1 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" side="bottom" sideOffset={8} avoidCollisions collisionPadding={16} className="w-72 max-h-[60vh] overflow-y-auto rounded-2xl border border-border/30 bg-background/95 backdrop-blur-2xl shadow-[0_16px_48px_-8px_hsl(220_20%_10%/0.15)] p-2 space-y-1 scrollbar-hidden hover:scrollbar-thin z-[9999]">
                      <div className="px-2 py-1">
                        <div className="flex items-center justify-between mb-2 px-2">
                          <p className="text-xs font-medium text-muted-foreground">{bn ? 'ডিপার্টমেন্ট অনুযায়ী রিসেট করুন' : 'Reset by Department'}</p>
                          {requiresResetApproval && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium">
                              {bn ? 'অনুমোদন প্রযোজ্য' : 'Approval Required'}
                            </Badge>
                          )}
                        </div>
                        {resettableStaffCategories.map(cat => (
                          <button key={cat.key} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors text-left" onClick={() => { setResetType('staff_category'); setResetStaffCategory(cat.key); setShowResetMenu(false); setShowResetDialog(true); }}>
                            <div className={`w-8 h-8 rounded-full ${cat.color} flex items-center justify-center shrink-0`}><cat.icon className="h-3.5 w-3.5" /></div>
                            <div>
                              <span className="text-sm text-foreground">{cat.label}</span>
                              <p className="text-[10px] text-muted-foreground">{cat.count} {bn ? 'জন' : 'records'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-border/20 my-1" />
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">{bn ? 'নির্দিষ্ট স্টাফ রিসেট করুন' : 'Reset Individual Staff'}</p>
                        <div className="max-h-[180px] overflow-y-auto scrollbar-hidden hover:scrollbar-thin space-y-0.5">
                          {(() => {
                            const staffWithAttendance = allStaff.filter((s: any) => attendance.some((a: any) => a.entity_id === s.id));
                            return staffWithAttendance.map((s: any) => (
                              <button key={s.id} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors text-left" onClick={() => { setResetType('single_staff'); setResetStaffId(s.id); setResetStaffName(getStaffDisplayNames(s.name_bn, s.name_en, bn).primary || (bn ? s.name_bn : (s.name_en || s.name_bn))); setShowResetMenu(false); setShowResetDialog(true); }}>
                                <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0"><UserCog className="h-3.5 w-3.5 text-rose-500" /></div>
                                <span className="text-sm text-foreground truncate">{getStaffDisplayNames(s.name_bn, s.name_en, bn).primary || (bn ? s.name_bn : (s.name_en || s.name_bn))}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                      {entityType === 'student' && (
                        <>
                          <div className="border-t border-border/20 my-1" />
                          <div className="px-2 py-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">{bn ? 'নির্দিষ্ট বিভাগ রিসেট করুন' : 'Reset by Division'}</p>
                            {divisions.map((d: any) => (
                              <button key={d.id} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left" onClick={() => { setResetType('division'); setResetDivisionId(d.id); setShowResetMenu(false); setShowResetDialog(true); }}>
                                <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0"><Home className="h-3.5 w-3.5 text-emerald-600" /></div>
                                <span className="text-sm text-foreground">{bn ? d.name_bn : d.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {entityType === 'student' && (
              <div className="flex flex-wrap gap-3 items-center">
                <Select value={selectedSessionYear} onValueChange={setSelectedSessionYear}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder={bn ? 'সেশন ইয়ার' : 'Session Year'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionOptions.map((opt: any) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Division/Class filter (all student sub-tabs) */}
                <Select value={selectedClassId || 'all'} onValueChange={(v) => setSelectedClassId(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder={bn ? 'শ্রেণী নির্বাচন' : 'Select Class'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল শ্রেণী (গ্রিড)' : 'All Classes (Grid)'}</SelectItem>
                    {orderedClasses.map((c: any) => {
                      const div = divisions.find((d: any) => d.id === c.division_id);
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {bn ? c.name_bn : c.name} {div ? `(${bn ? div.name_bn : div.name})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 h-8 text-sm" placeholder={bn ? 'নাম বা আইডি...' : 'Name or ID...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
            )}

            {/* Staff Shift Selector & Duty Controls */}
            {entityType === 'staff' && (
              <div className="flex flex-wrap gap-3 items-center">
                {/* For Meal tab: keep meal shift selector */}
                {staffSubTab === 'meal' && (
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_SHIFTS.map(sh => (
                        <SelectItem key={sh.value} value={sh.value}>{bn ? sh.labelBn : sh.labelEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Full-time staff tab: Full Month Attendance Sheet button */}
                {entityType === 'staff' && staffSubTab === 'fulltime' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFulltimeMonthlySheetOpen(true)}
                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {bn ? 'পুরো মাসের ফুল টাইম হাজিরা শিট (প্রিন্ট / PDF / Excel)' : 'Monthly Full-Time Sheet (Print / PDF / Excel)'}
                  </Button>
                )}

                {/* Duty tab: view filter (both / morning / evening) + Full Month Duty Sheet button */}
                {staffSubTab === 'duty' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-border/40 bg-muted/30 p-0.5">
                      <button
                        type="button"
                        onClick={() => setDutyViewFilter('both')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          dutyViewFilter === 'both'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {bn ? 'উভয় শিফট (সকাল ও সন্ধ্যা)' : 'Both Shifts'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDutyViewFilter('morning')}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          dutyViewFilter === 'morning'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Sun className="h-3 w-3" />
                        {bn ? 'সকাল ডিউটি' : 'Morning Duty'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDutyViewFilter('evening')}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          dutyViewFilter === 'evening'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Moon className="h-3 w-3" />
                        {bn ? 'সন্ধ্যা ডিউটি' : 'Evening Duty'}
                      </button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setDutyMonthlySheetOpen(true)}
                      className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {bn ? 'পুরো মাসের ডিউটি শিট (Excel / প্রিন্ট)' : 'Monthly Duty Sheet'}
                    </Button>
                  </div>
                )}

                {/* Duty roster status */}
                {staffSubTab === 'duty' && (
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border ${
                    (morningDutyEntities.length + eveningDutyEntities.length) > 0
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                  }`}>
                    {(morningDutyEntities.length + eveningDutyEntities.length) > 0
                      ? (bn
                          ? `রুটিন অনুযায়ী: সকাল ${morningDutyEntities.length} জন • সন্ধ্যা ${eveningDutyEntities.length} জন`
                          : `Roster: Morning ${morningDutyEntities.length} • Evening ${eveningDutyEntities.length}`)
                      : (bn ? 'এই দিনে কারো ডিউটি রুটিন নেই' : 'No one rostered for this day')}
                  </span>
                )}


                {/* Per-tab settings shortcuts (permission gated) */}
                {canManageAttendance && (
                <div className="flex gap-2">

                  {staffSubTab === 'duty' && (
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                      <a href="/admin/duty-roster">
                        <CalendarDays className="h-3.5 w-3.5 mr-1" /> {bn ? 'ডিউটি রুটিন সেট' : 'Duty Roster'}
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold"
                    onClick={() => {
                      if (staffSubTab === 'duty') setSettingsSubTab('duty');
                      else if (staffSubTab === 'meal') setSettingsSubTab('meal');
                      else setSettingsSubTab('fulltime');
                      setRulesDialogOpen(true);
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1" />
                    {staffSubTab === 'fulltime'
                      ? (bn ? 'ফুল টাইম সেটিংস' : 'Full Time Settings')
                      : staffSubTab === 'duty'
                        ? (bn ? 'আবাসিক ডিউটি সেটিংস' : 'Residential Duty Settings')
                        : (bn ? 'খাবার সেটিংস' : 'Meal Settings')}
                  </Button>
                </div>
                )}





                {/* Staff Category & Special Duty Filter */}
                <Select value={selectedStaffCategory} onValueChange={setSelectedStaffCategory}>
                  <SelectTrigger className="w-52 h-8 text-xs">
                    <SelectValue placeholder={bn ? 'ডিপার্টমেন্ট / ডিউটি' : 'Department / Duty'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল ডিপার্টমেন্ট' : 'All Departments'}</SelectItem>
                    {staffCategoriesData.map((category) => (
                      <SelectItem key={category.key} value={category.key}>{getCategoryLabel(category.key)}</SelectItem>
                    ))}
                    {specialDutyGroups.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mt-1 border-t">
                          {bn ? 'আলাদা / বিশেষ ডিউটি' : 'Special Duties'}
                        </div>
                        {specialDutyGroups.map((g) => (
                          <SelectItem key={`special_${g.name}`} value={`special_${g.name}`}>
                            🌟 {g.name} ({g.staffIds.length})
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 h-8 text-sm" placeholder={bn ? 'নাম বা পদবী...' : 'Name or designation...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Date Notification Banner */}
        {selectedDate > todayIsoInTz(appTz) && (
          <div className={cn(
            "rounded-2xl border p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs transition-all",
            isAdvanceMarkingEnabled
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          )}>
            <div className="flex items-center gap-2.5">
              {isAdvanceMarkingEnabled ? (
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
              <div>
                <p className="font-bold">
                  {isAdvanceMarkingEnabled
                    ? (bn ? `ভবিষ্যৎ তারিখ (${selectedDate}) — আগাম ছুটি ও হাজিরা মোড সক্রিয়` : `Future Date (${selectedDate}) — Advance Mode Active`)
                    : (bn ? `ভবিষ্যৎ তারিখ (${selectedDate}) — আগাম ছুটি/হাজিরা দিতে সেটিং চালু করুন` : `Future Date (${selectedDate}) — Enable Advance Mode`)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isAdvanceMarkingEnabled
                    ? (bn ? 'আপনি এই অনাগত তারিখে স্টাফ ও ছাত্রদের ছুটি (Leave) বা উপস্থিতি দিতে পারেন। বেতন ও হাজিরা শিটে তা যথাযথভাবে সংরক্ষিত হবে।' : 'You can assign leave or attendance on this future date.')
                    : (bn ? 'অনিচ্ছাকৃত ভুল এড়াতে আগাম এন্ট্রি বর্তমানে বন্ধ। পাশের বাটন চেপে সুবিধাটি চালু করতে পারেন।' : 'Advance attendance is currently disabled. Click below to enable.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {isAdvanceMarkingEnabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHolidayDialogOpen(true)}
                  className="text-xs h-7 rounded-full border-emerald-500/40 hover:bg-emerald-500/20 gap-1 font-medium"
                >
                  <CalendarOff className="h-3 w-3 text-blue-600" />
                  {bn ? 'একসাথে ছুটি দিন' : 'Bulk Leave'}
                </Button>
              ) : (
                isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => saveAdvanceMarkingMutation.mutate({ enabled: true, allow_future_leave: true, allow_future_attendance: true })}
                    disabled={saveAdvanceMarkingMutation.isPending}
                    className="text-xs h-7 rounded-full btn-primary-gradient gap-1 font-medium shadow-xs"
                  >
                    <Sparkles className="h-3 w-3" />
                    {bn ? 'আগাম এন্ট্রি চালু করুন' : 'Enable Advance Mode'}
                  </Button>
                )
              )}
            </div>
          </div>
        )}

        {/* Past Date Notification Banner for Non-Admin Staff Users */}
        {selectedDate < todayIsoInTz(appTz) && !isAdmin && (
          <div className="rounded-2xl border p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs transition-all border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold">
                  {bn ? `পূর্ববর্তী তারিখ (${selectedDate}) — এডমিন অনুমোদন প্রযোজ্য` : `Past Date (${selectedDate}) — Admin Approval Required`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {bn
                    ? 'স্টাফ ব্যবহারকারীদের জন্য গত তারিখের হাজিরা সরাসরি পরিবর্তন লক করা আছে। যেকোনো বাটনে ক্লিক করলে তা সরাসরি কার্যকর না হয়ে এডমিনের কাছে অনুমোদনের আবেদন যাবে।'
                    : 'Direct editing of past attendance is restricted for staff users. Any changes will be submitted for Admin approval.'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 text-xs font-semibold px-2.5 py-1 shrink-0">
              {bn ? 'অনুমোদন সাপেক্ষ' : 'Approval Required'}
            </Badge>
          </div>
        )}

        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-md rounded-[28px] border border-border/20 bg-background/95 p-0 backdrop-blur-xl shadow-[0_24px_80px_-16px_hsl(var(--foreground)/0.25)] overflow-hidden">
            <div className="border-b border-border/10 bg-destructive/5 px-6 py-5">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-left text-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <RotateCcw className="h-5 w-5" />
                    </span>
                    <span>{bn ? 'রিসেট নিশ্চিত করুন' : 'Confirm reset'}</span>
                  </div>
                  {requiresResetApproval && (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 text-xs font-semibold px-2.5 py-1">
                      {bn ? 'অনুমোদন প্রযোজ্য' : 'Approval Required'}
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-border/15 bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">{resetTargetLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {bn
                    ? `এই তারিখের ${resetRecordCount}টি হাজিরা রেকর্ড মুছে যাবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।`
                    : `${resetRecordCount} attendance records for this date will be removed. This action cannot be undone.`}
                </p>
                {requiresResetApproval && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      {bn
                        ? 'এই রিসেটের ক্ষেত্রে প্রধান এডমিনের অনুমোদন প্রযোজ্য। অনুমোদন করার পর কার্যকর হবে।'
                        : 'Admin approval is applicable for this reset. It will take effect after approval.'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={resetMutation.isPending}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  variant={requiresResetApproval ? 'default' : 'destructive'}
                  className={requiresResetApproval ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                  onClick={() => resetMutation.mutate(resetType)}
                  disabled={resetMutation.isPending || resetRecordCount === 0}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {resetMutation.isPending
                    ? (bn ? 'প্রক্রিয়াধীন...' : 'Processing...')
                    : requiresResetApproval
                    ? (bn ? 'অনুমোদন প্রযোজ্য — আবেদন পাঠান' : 'Approval Applicable — Submit')
                    : (bn ? 'রিসেট করুন' : 'Reset now')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Attendance List */}
        {showClassGrid ? (
          <div>
            {classSummaries.length === 0 ? (
              <div className="rounded-[24px] bg-background/60 backdrop-blur-sm border border-dashed border-border/20 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground">{bn ? 'এই সেশনে কোনো শ্রেণী পাওয়া যায়নি' : 'No classes found for this session'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {classSummaries.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClassId(c.id)}
                    className="group relative text-left rounded-[20px] border border-border/20 bg-background/70 backdrop-blur-md p-4 sm:p-5 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_16px_44px_-10px_hsl(220_20%_10%/0.14)] hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-foreground truncate">{bn ? c.name_bn : c.name}</p>
                        {c.divName && <p className="text-[11px] text-muted-foreground truncate">{c.divName}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground tabular-nums">{c.total}</span>
                      <span className="text-[11px] text-muted-foreground">{bn ? 'ছাত্র' : 'students'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                        {bn ? 'উপ' : 'P'}: {c.present}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20">
                        {bn ? 'অনু' : 'A'}: {c.absent}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                        {bn ? 'দেরি' : 'L'}: {c.late}
                      </Badge>
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      {bn ? 'চিহ্নিত' : 'Marked'}: {c.marked}/{c.total}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : isDutyTab ? (
          <div className="space-y-8">
            {/* Morning Duty Section */}
            {(dutyViewFilter === 'both' || dutyViewFilter === 'morning') && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shadow-sm">
                      <Sun className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">
                          {bn ? 'সকাল ডিউটি হাজিরা' : 'Morning Duty Attendance'}
                        </h3>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs">
                          {formatTimeDisplay(dutyTimes.morning_start, timeFormat)} - {formatTimeDisplay(dutyTimes.morning_end, timeFormat)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bn ? `রুটিন অনুযায়ী ${morningDutyEntities.length} জন শিক্ষক নির্ধারিত` : `${morningDutyEntities.length} staff scheduled per roster`}
                      </p>
                    </div>
                  </div>

                  {canBulkMark && morningDutyEntities.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleBulkMarkDuty('morning', 'present')}
                      className="text-xs rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {bn ? 'সকাল ডিউটি সবাইকে উপস্থিত করুন' : 'Mark All Morning Present'}
                    </Button>
                  )}
                </div>

                {morningDutyEntities.length === 0 ? (
                  <div className="rounded-[20px] bg-background/50 border border-dashed border-border/20 p-8 text-center">
                    <Sun className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {bn ? 'আজকের দিনে সকাল শিফটে কোনো শিক্ষক রুটিনে নেই' : 'No staff scheduled for morning duty today'}
                    </p>
                  </div>
                ) : (
                  morningDutyEntities.map((entity: any, idx: number) => renderDutyStaffCard(entity, 'morning', idx))
                )}
              </div>
            )}

            {/* Evening Duty Section */}
            {(dutyViewFilter === 'both' || dutyViewFilter === 'evening') && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shadow-sm">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">
                          {bn ? 'সন্ধ্যা ডিউটি হাজিরা' : 'Evening Duty Attendance'}
                        </h3>
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 border-indigo-500/20 text-xs">
                          {formatTimeDisplay(dutyTimes.evening_start, timeFormat)} - {formatTimeDisplay(dutyTimes.evening_end, timeFormat)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bn ? `রুটিন অনুযায়ী ${eveningDutyEntities.length} জন শিক্ষক নির্ধারিত` : `${eveningDutyEntities.length} staff scheduled per roster`}
                      </p>
                    </div>
                  </div>

                  {canBulkMark && eveningDutyEntities.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleBulkMarkDuty('evening', 'present')}
                      className="text-xs rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {bn ? 'সন্ধ্যা ডিউটি সবাইকে উপস্থিত করুন' : 'Mark All Evening Present'}
                    </Button>
                  )}
                </div>

                {eveningDutyEntities.length === 0 ? (
                  <div className="rounded-[20px] bg-background/50 border border-dashed border-border/20 p-8 text-center">
                    <Moon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {bn ? 'আজকের দিনে সন্ধ্যা শিফটে কোনো শিক্ষক রুটিনে নেই' : 'No staff scheduled for evening duty today'}
                    </p>
                  </div>
                ) : (
                  eveningDutyEntities.map((entity: any, idx: number) => renderDutyStaffCard(entity, 'evening', idx))
                )}
              </div>
            )}
          </div>
        ) : (
        <div className="space-y-3">
          {entityType === 'student' && selectedClassId && (
            <button
              type="button"
              onClick={() => setSelectedClassId('')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {bn ? 'শ্রেণী তালিকায় ফিরুন' : 'Back to classes'}
            </button>
          )}
          {filtered.map((entity: any, idx: number) => {
            const att = getAttendance(entity.id);
            const currentStatus = att?.status || '';
            return (
              <div
                key={entity.id}
                className={`group relative rounded-[24px] border transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_12px_40px_-8px_hsl(220_20%_10%/0.1)] ${
                  currentStatus 
                    ? 'bg-background/80 backdrop-blur-md border-border/15 shadow-[0_4px_20px_-4px_hsl(220_20%_10%/0.06)]' 
                    : 'bg-background/60 backdrop-blur-sm border-dashed border-border/20 shadow-sm'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Left: Index + Avatar + Info */}
                  <div
                    className={`flex items-center gap-4 min-w-0 flex-shrink-0 ${entityType === 'staff' ? 'cursor-pointer hover:opacity-80 transition' : ''}`}
                    onClick={() => { if (entityType === 'staff') setMonthlyStaff(entity); }}
                    title={entityType === 'staff' ? (bn ? 'মাসিক উপস্থিতি দেখুন' : 'View monthly attendance') : undefined}
                  >
                    {entityType === 'staff' ? (
                      <div className="flex flex-col items-center w-7 shrink-0 -my-1">
                        <button
                          type="button"
                          disabled={idx === 0 || reorderingId === entity.id}
                          onClick={(e) => { e.stopPropagation(); handleMoveSerial(idx, -1); }}
                          className="p-0.5 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition"
                          title={bn ? 'উপরে সরান' : 'Move up'}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-medium text-muted-foreground/60 text-center tabular-nums">{idx + 1}</span>
                        <button
                          type="button"
                          disabled={idx === filtered.length - 1 || reorderingId === entity.id}
                          onClick={(e) => { e.stopPropagation(); handleMoveSerial(idx, 1); }}
                          className="p-0.5 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition"
                          title={bn ? 'নিচে সরান' : 'Move down'}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground/60 w-6 text-center tabular-nums">{idx + 1}</span>
                    )}
                    
                    {/* Avatar with emerald ring */}
                    <div className={`relative h-11 w-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden ring-2 transition-all ${currentStatus === 'present' ? 'ring-emerald-400/60' : currentStatus === 'absent' ? 'ring-rose-400/40' : 'ring-border/20'}`}>
                      {entity.photo_url ? (
                        <img src={entity.photo_url} alt="" className="h-full w-full object-cover rounded-full" />
                      ) : (
                        <div className="h-full w-full bg-muted/60 flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}
                      {currentStatus === 'present' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                      )}
                    </div>

                    {/* Name & Info */}
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold text-foreground truncate ${entityType === 'staff' ? 'hover:text-primary' : ''}`}>
                        {entityType === 'staff'
                          ? getStaffDisplayNames(entity.name_bn, entity.name_en, bn).primary
                          : (bn ? entity.name_bn : (entity.name_en || entity.name_bn))}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {entityType === 'student'
                          ? (() => {
                              const cls = classes.find((c: any) => c.id === entity.class_id);
                              const div = divisions.find((d: any) => d.id === entity.division_id);
                              const className = cls ? (bn ? cls.name_bn : cls.name) : '';
                              const divName = div ? (bn ? div.name_bn : div.name) : '';
                              return `${bn ? 'রেজি' : 'Reg'}: ${entity.student_id || '-'} | ${className}${divName ? ` (${divName})` : ''} | ${bn ? 'রোল' : 'Roll'}: ${entity.roll_number || '-'}`;
                            })()
                          : staffSubTab === 'duty'
                            ? `${entity.designation || '-'} | ${bn ? 'নির্ধারিত' : 'Scheduled'}: ${selectedShift === 'morning' ? `${fmt(dutyTimes.morning_start)} - ${fmt(dutyTimes.morning_end)}` : `${fmt(dutyTimes.evening_start)} - ${fmt(dutyTimes.evening_end)}`}`
                            : (() => {
                                const activeSpecial = findSpecialShiftForStaff(entity.id, selectedDate, specialShifts);
                                const dutyName = activeSpecial?.note?.trim();
                                return (
                                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                                    <span>{entity.designation || '-'}</span>
                                    {dutyName && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                        {dutyName}
                                      </span>
                                    )}
                                    <span>| {bn ? 'নির্ধারিত' : 'Scheduled'}: {fmt(getCategoryTime(entity).start)} - {fmt(getCategoryTime(entity).end)}</span>
                                  </span>
                                );
                              })()}
                      </p>
                    </div>
                  </div>

                  {/* Center: Late badges + Time inputs */}
                  <div className="flex items-center gap-3 flex-wrap sm:ml-auto">
                    {/* Late Minutes Display for staff */}
                    {entityType === 'staff' && att?.check_in_time && currentStatus !== 'half_day' && (() => {
                      const effStart = staffSubTab === 'duty' ? (selectedShift === 'morning' ? dutyTimes.morning_start : dutyTimes.evening_start) : getCategoryTime(entity).start;
                      const effEnd = staffSubTab === 'duty' ? (selectedShift === 'morning' ? dutyTimes.morning_end : dutyTimes.evening_end) : getCategoryTime(entity).end;
                      const toMin = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
                      const sStart = toMin(effStart);
                      let sEnd = toMin(effEnd);
                      const overnight = sEnd <= sStart; // overnight shift (e.g. 17:00 → 05:00)
                      if (overnight) sEnd += 24 * 60;
                      let cIn = toMin(att.check_in_time);
                      let cOut = att.check_out_time ? toMin(att.check_out_time) : sEnd;
                      // Smart 12h AM/PM resolution: if daytime shift ends in afternoon (>=12:00 PM),
                      // and check-out was entered as e.g. 03:30 (AM), treat as 15:30 (PM)
                      if (!overnight && sEnd >= 12 * 60 && cOut < 12 * 60 && Math.abs((cOut + 12 * 60) - sEnd) < Math.abs(cOut - sEnd)) {
                        cOut += 12 * 60;
                      }
                      // For overnight: if check_in is earlier than start (e.g. 02:00 vs 17:00) treat as next-day
                      if (overnight && cIn < sStart) cIn += 24 * 60;
                      if (overnight && cOut <= cIn) cOut += 24 * 60;
                      const lateMin = Math.max(0, cIn - sStart);
                      const earlyMin = Math.max(0, sEnd - cOut);
                      return (lateMin > 0 || earlyMin > 0) ? (
                        <div className="flex gap-1.5 shrink-0">
                          {lateMin > 0 && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/15">{bn ? `${fmtMins(lateMin, true)} বিলম্ব` : `${fmtMins(lateMin, false)} late`}</span>}
                          {earlyMin > 0 && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-600 border border-orange-500/15">{bn ? `${fmtMins(earlyMin, true)} আগে` : `${fmtMins(earlyMin, false)} early`}</span>}
                        </div>
                      ) : null;
                    })()}

                    {/* Time Inputs for Staff (hide for meal tab) — also for students; show for present/late/half_day */}
                    {((entityType === 'staff' && staffSubTab !== 'meal' && (['present', 'late', 'half_day'].includes(currentStatus || '') || timeEditorOpenId === entity.id)) || (entityType === 'student' && (['present', 'late', 'half_day'].includes(currentStatus || '') || timeEditorOpenId === entity.id))) && (
                      <div className={`flex flex-col gap-1 shrink-0 w-full sm:w-auto rounded-2xl border px-3 py-2 transition-all ${
                        currentStatus === 'half_day'
                          ? 'border-orange-500/20 bg-orange-500/5 opacity-80'
                          : 'border-amber-500/20 bg-amber-500/5'
                      }`}>
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          {currentStatus === 'half_day' ? (
                            <>
                              <Lock className="h-3 w-3 text-orange-500" />
                              <span className="text-orange-600 dark:text-orange-400">{bn ? 'সময় পরিবর্তন লক (অর্ধদিন)' : 'Time Locked (Half Day)'}</span>
                            </>
                          ) : (
                            bn ? 'চেক-ইন / চেক-আউট সময়' : 'Check-in / Check-out time'
                          )}
                        </span>
                        <div className="flex gap-2 items-center">
                          <TimePicker
                            className="h-8 w-[120px] text-xs rounded-xl bg-background/60 border-border/20 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder={bn ? 'প্রবেশ' : 'In'}
                            displayFormat={timeFormat}
                            value={att?.check_in_time || ''}
                            disabled={!canMarkAttendance || currentStatus === 'half_day'}
                            onChange={v => saveMutation.mutate({ entityId: entity.id, status: currentStatus || (timeEditorOpenId === entity.id ? 'late' : 'present'), check_in_time: v, check_out_time: att?.check_out_time || '' })}
                          />
                          <span className="text-muted-foreground/40 text-xs">—</span>
                          <TimePicker
                            className="h-8 w-[120px] text-xs rounded-xl bg-background/60 border-border/20 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder={bn ? 'বাহির' : 'Out'}
                            displayFormat={timeFormat}
                            value={normalizeDaytimeCheckOut(att?.check_out_time, staffSubTab === 'duty' ? (selectedShift === 'morning' ? dutyTimes.morning_end : dutyTimes.evening_end) : getCategoryTime(entity).end)}
                            disabled={!canMarkAttendance || currentStatus === 'half_day'}
                            onChange={v => {
                              const effEnd = staffSubTab === 'duty' ? (selectedShift === 'morning' ? dutyTimes.morning_end : dutyTimes.evening_end) : getCategoryTime(entity).end;
                              saveMutation.mutate({ entityId: entity.id, status: currentStatus || (timeEditorOpenId === entity.id ? 'late' : 'present'), check_in_time: att?.check_in_time || '', check_out_time: normalizeDaytimeCheckOut(v, effEnd) });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Status Pills */}
                  <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                    {entityType === 'staff' && staffSubTab === 'meal' ? (
                      <>
                        {[
                          { status: 'present', label: bn ? 'উপস্থিত' : 'Present', Icon: CheckCircle2, activeBg: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 shadow-[0_0_12px_hsl(160_84%_40%/0.15)]', activeRing: 'ring-emerald-500/30' },
                          { status: 'absent', label: bn ? 'অনুপস্থিত' : 'Absent', Icon: XCircle, activeBg: 'bg-rose-500/15 text-rose-700 border-rose-500/30 shadow-[0_0_12px_hsl(350_80%_50%/0.15)]', activeRing: 'ring-rose-500/30' },
                        ].map(opt => {
                          const isActive = currentStatus === opt.status;
                          return (
                            <button
                              key={opt.status}
                              disabled={!canMarkAttendance}
                              onClick={() => saveMutation.mutate({ entityId: entity.id, status: opt.status })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                                isActive 
                                  ? `${opt.activeBg} ring-1 ${opt.activeRing}` 
                                  : 'bg-muted/30 text-muted-foreground border-border/15 hover:bg-muted/50'
                              }`}
                            >
                              <opt.Icon className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{opt.label}</span>
                            </button>
                          );
                        })}
                      </>
                    ) : (
                      statusOptions.map((rule: any) => {
                        const cfg = rule.config as any;
                        const countsAs = cfg?.counts_as || rule.name.toLowerCase();
                        const isActive = currentStatus === countsAs;
                        const Icon = STATUS_ICONS[countsAs] || Check;
                        
                        const activeStyles: Record<string, string> = {
                          present: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 shadow-[0_0_12px_hsl(160_84%_40%/0.15)] ring-1 ring-emerald-500/30',
                          absent: 'bg-rose-500/15 text-rose-700 border-rose-500/30 shadow-[0_0_12px_hsl(350_80%_50%/0.15)] ring-1 ring-rose-500/30',
                          late: 'bg-amber-500/15 text-amber-700 border-amber-500/30 shadow-[0_0_12px_hsl(40_90%_50%/0.15)] ring-1 ring-amber-500/30',
                          half_day: 'bg-orange-500/15 text-orange-700 border-orange-500/30 ring-1 ring-orange-500/30',
                          leave: 'bg-blue-500/15 text-blue-700 border-blue-500/30 ring-1 ring-blue-500/30',
                          excused: 'bg-teal-500/15 text-teal-700 border-teal-500/30 ring-1 ring-teal-500/30',
                          medical: 'bg-purple-500/15 text-purple-700 border-purple-500/30 ring-1 ring-purple-500/30',
                        };
                        
                        return (
                          <button
                            key={rule.id}
                            disabled={!canMarkAttendance}
                            onClick={() => {
                              const mutateData: any = { entityId: entity.id, status: countsAs };
                              if (entityType === 'staff' && staffSubTab !== 'meal' && ['present', 'late', 'half_day'].includes(countsAs)) {
                                const shiftTime = getStaffShiftTime(entity);
                                mutateData.check_in_time = att?.check_in_time || shiftTime.start;
                                mutateData.check_out_time = att?.check_out_time || shiftTime.end;
                                setTimeEditorOpenId(countsAs === 'late' ? entity.id : null);
                              } else if (entityType === 'student' && ['present', 'late', 'half_day'].includes(countsAs)) {
                                const sStart = entity?.duty_start_time || defaultCategoryTimes.teacher.start;
                                const sEnd = entity?.duty_end_time || defaultCategoryTimes.teacher.end;
                                mutateData.check_in_time = att?.check_in_time || sStart;
                                mutateData.check_out_time = att?.check_out_time || sEnd;
                                if (countsAs === 'late') setTimeEditorOpenId(entity.id);
                              }
                              if (countsAs === 'absent' || countsAs === 'leave') {
                                mutateData.check_in_time = '';
                                mutateData.check_out_time = '';
                                if (timeEditorOpenId === entity.id) setTimeEditorOpenId(null);
                              }
                              saveMutation.mutate(mutateData);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 hover:scale-105 ${
                              isActive 
                                ? (activeStyles[countsAs] || 'bg-muted text-foreground border-border/30 ring-1 ring-primary/30')
                                : 'bg-muted/30 text-muted-foreground border-border/15 hover:bg-muted/50'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{bn ? rule.name_bn : rule.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-[24px] bg-background/60 backdrop-blur-sm border border-dashed border-border/20 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground">{bn ? 'কোনো রেকর্ড পাওয়া যায়নি' : 'No records found'}</p>
            </div>
          )}
        </div>
        )}
        </>)}

        {/* Rules Dialog */}
        <Dialog open={canManageAttendance && rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <Settings2 className="h-5 w-5 inline mr-2" />
                {bn ? 'অ্যাটেন্ডেন্স রুল সেটিংস' : 'Attendance Rule Settings'}
              </DialogTitle>
            </DialogHeader>
            {settingsPanel}
          </DialogContent>
        </Dialog>

        {/* QR Poster Dialog */}
        <ClassQRPoster open={qrPosterOpen} onOpenChange={setQrPosterOpen} />
        {/* Hardware Device Manager */}
        <AttendanceDeviceManager open={deviceManagerOpen} onOpenChange={setDeviceManagerOpen} />
        {/* Staff Check-in Dialog */}
        <StaffCheckinDialog open={staffCheckinOpen} onOpenChange={setStaffCheckinOpen} selectedDate={selectedDate} />
        {/* Staff Monthly Attendance */}
        <StaffMonthlyAttendanceDialog
          open={!!monthlyStaff}
          onOpenChange={(v) => { if (!v) setMonthlyStaff(null); }}
          staff={monthlyStaff}
          shift={entityType === 'staff' ? effectiveShift : undefined}
          initialDate={selectedDate}
        />
        {/* Special Shift Assignment Dialog */}
        <StaffSpecialShiftDialog
          open={specialShiftDialogOpen}
          onOpenChange={setSpecialShiftDialogOpen}
          staffList={allStaff}
          categories={staffCategoriesData}
        />
        <FulltimeMonthlyAttendanceSheetDialog
          open={fulltimeMonthlySheetOpen}
          onOpenChange={setFulltimeMonthlySheetOpen}
          initialMonth={selectedDate.split('-')[1]}
          initialYear={selectedDate.split('-')[0]}
        />
        <ResidentialDutyMonthlySheetDialog
          open={dutyMonthlySheetOpen}
          onOpenChange={setDutyMonthlySheetOpen}
          initialMonth={selectedDate.split('-')[1]}
          initialYear={selectedDate.split('-')[0]}
        />
        <BulkHolidayDialog
          open={holidayDialogOpen}
          onOpenChange={setHolidayDialogOpen}
          entities={entities}
          entityType={entityType}
          shift={effectiveShift}
          bn={bn}
          onApplied={(firstKey) => setSelectedDate(firstKey)}
        />
        <BulkHolidayDialog
          open={presentDialogOpen}
          onOpenChange={setPresentDialogOpen}
          entities={entities}
          entityType={entityType}
          shift={effectiveShift}
          bn={bn}
          mode="present"
          onApplied={(firstKey) => setSelectedDate(firstKey)}
        />
        {/* Advance Leave & Attendance Setting Dialog */}
        <Dialog open={advanceSettingsOpen} onOpenChange={setAdvanceSettingsOpen}>
          <DialogContent className="max-w-md rounded-2xl p-5 border shadow-2xl">
            <DialogHeader className="pb-3 border-b">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    {bn ? 'আগাম ছুটি ও হাজিরা সেটিংস' : 'Advance Leave & Attendance Settings'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {bn
                      ? 'মাসের অনাগত যেকোনো তারিখে আগাম ছুটি ও হাজিরা প্রদানের অনুমতি নিয়ন্ত্রণ করুন।'
                      : 'Control permissions for marking advance leaves and attendance for future dates.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-3 space-y-4 text-xs">
              {/* Main Switch */}
              <div className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">
                    {bn ? 'আগাম ছুটি ও হাজিরা প্রদানের অনুমতি দিন' : 'Allow Advance Leave & Attendance'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {bn
                      ? 'চালু করলে মাসিক হাজিরা ক্যালেন্ডারে এবং দৈনিক হাজিরায় ভবিষ্যৎ তারিখের লক খুলে যাবে এবং আগাম ছুটি প্রদান করা যাবে।'
                      : 'When enabled, future dates become clickable in attendance grids to mark leave or attendance in advance.'}
                  </p>
                </div>
                <Switch
                  checked={isAdvanceMarkingEnabled}
                  disabled={saveAdvanceMarkingMutation.isPending}
                  onCheckedChange={(val) => {
                    saveAdvanceMarkingMutation.mutate({
                      enabled: val,
                      allow_future_leave: true,
                      allow_future_attendance: true,
                    });
                  }}
                />
              </div>

              {/* Quick Actions */}
              <div className="space-y-2 pt-1">
                <p className="font-semibold text-muted-foreground">
                  {bn ? 'কুইক টুলস:' : 'Quick Tools:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAdvanceSettingsOpen(false);
                      setHolidayDialogOpen(true);
                    }}
                    className="h-9 text-xs justify-start gap-2 rounded-xl border-blue-500/30 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  >
                    <CalendarOff className="h-4 w-4 text-blue-600" />
                    <span>{bn ? 'একাধিক দিনের ছুটি দিন' : 'Bulk Advance Leave'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAdvanceSettingsOpen(false);
                      setPresentDialogOpen(true);
                    }}
                    className="h-9 text-xs justify-start gap-2 rounded-xl border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{bn ? 'একাধিক দিনের উপস্থিতি দিন' : 'Bulk Advance Present'}</span>
                  </Button>
                </div>
              </div>

              {/* Salary notice */}
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[11px] leading-relaxed flex items-start gap-2">
                <span className="text-base shrink-0">💡</span>
                <span>
                  {bn
                    ? 'মাসের শেষের দিনগুলোতে ছুটি দিলে সিস্টেমে তা বেতনসহ দিন (Paid Leave) হিসেবে গণ্য হবে। মাস শেষ হওয়ার আগেই বেতন জেনারেট করলে ১ পয়সাও বেতন কাটা যাবে না।'
                    : 'Leaves granted for the remaining days of the month are treated as paid leaves in salary calculation.'}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                className="rounded-full w-full sm:w-auto text-xs"
                onClick={() => setAdvanceSettingsOpen(false)}
              >
                {bn ? 'ঠিক আছে' : 'Done'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AttendanceRecoveryDialog
          open={recoveryDialogOpen}
          onOpenChange={setRecoveryDialogOpen}
          bn={bn}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminAttendance;
