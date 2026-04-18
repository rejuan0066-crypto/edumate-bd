import { useState, useMemo, useEffect, useRef } from 'react';
import { exportAttendanceExcel, calcLateMinutes } from '@/lib/attendanceExcelExport';
import { useTimeFormat, formatTimeDisplay } from '@/hooks/useTimeFormat';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  CalendarDays, Users, UserCog, Search, Check, X, Clock,
  CalendarOff, Save, Settings2, Plus, Trash2, Edit2,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Home, Sun, Sunset, Moon, Utensils, Coffee,
  Download, Printer, RotateCcw, QrCode, Send, Fingerprint, UserCheck
} from 'lucide-react';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import ClassQRPoster from '@/components/attendance/ClassQRPoster';
import AttendanceDeviceManager from '@/components/attendance/AttendanceDeviceManager';
import StaffCheckinDialog from '@/components/attendance/StaffCheckinDialog';

const STATUS_ICONS: Record<string, any> = {
  present: CheckCircle2, absent: XCircle, late: Clock,
  half_day: AlertCircle, leave: CalendarOff,
  excused: CheckCircle2, medical: CheckCircle2,
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
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/attendance');
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const fmt = (t: string) => formatTimeDisplay(t, timeFormat);
  const [searchParams] = useSearchParams();

  // Read tab from URL: ?tab=student or ?tab=staff
  const tabParam = searchParams.get('tab');
  const resolvedTab = forcedTab || (tabParam === 'staff' ? 'staff' : 'student');

  const [entityType, setEntityType] = useState<'student' | 'staff'>(resolvedTab);

  // Sync entityType when forcedTab or URL tab param changes
  useEffect(() => {
    setEntityType(forcedTab || (tabParam === 'staff' ? 'staff' : 'student'));
  }, [forcedTab, tabParam]);
  const [studentSubTab, setStudentSubTab] = useState<'all' | 'residential' | 'meal'>('all');
  const [staffSubTab, setStaffSubTab] = useState<'fulltime' | 'duty' | 'meal'>('fulltime');
  const [selectedStaffCategory, setSelectedStaffCategory] = useState<string>('all');
  const [studentMealShift, setStudentMealShift] = useState('meal_breakfast');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionYear, setSelectedSessionYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedShift, setSelectedShift] = useState('full_day');
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
  // Effective shift: for students, meal tab uses meal shift; for staff, fulltime=full_day, others use selected
  const effectiveShift = entityType === 'student'
    ? (studentSubTab === 'meal' ? studentMealShift : 'full_day')
    : (staffSubTab === 'fulltime' ? 'full_day' : selectedShift);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
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
    administrative: { start: '09:00', end: '17:00' },
    support: { start: '08:00', end: '17:00' },
    general: { start: '08:00', end: '17:00' },
  };
  const [categoryShiftTimes, setCategoryShiftTimes] = useState<Record<string, { start: string; end: string }>>(defaultCategoryTimes);

  // Dynamic staff categories from designations table
  const { data: dynamicStaffCategories = [] } = useQuery({
    queryKey: ['staff-categories-for-shift'],
    queryFn: async () => {
      const { data } = await supabase.from('designations').select('staff_category').eq('is_active', true);
      const unique = [...new Set((data || []).map((d: any) => d.staff_category))];
      // Ensure default categories are always included
      const defaults = ['teacher', 'administrative', 'support', 'general'];
      defaults.forEach(d => { if (!unique.includes(d)) unique.push(d); });
      return unique;
    },
  });

  const categoryLabelMap: Record<string, { bn: string; en: string }> = {
    teacher: { bn: 'শিক্ষক', en: 'Teacher' },
    administrative: { bn: 'প্রশাসনিক', en: 'Administrative' },
    support: { bn: 'সাপোর্ট স্টাফ', en: 'Support Staff' },
    general: { bn: 'সহায়ক কর্মী', en: 'General Staff' },
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
      const { data } = await supabase.from('students').select('*').eq('status', 'active');
      return data || [];
    },
    enabled: entityType === 'student',
  });

  // Fetch staff
  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('*').eq('status', 'active').order('name_bn');
      return data || [];
    },
    enabled: entityType === 'staff',
  });

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
  useMemo(() => {
    if (sessionOptions.length > 0 && !selectedSessionYear) {
      const active = academicSessions.find((s: any) => s.is_active);
      setSelectedSessionYear(active?.id || sessionOptions[0].value);
    }
  }, [sessionOptions, academicSessions]);

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
  const entities = useMemo(() => {
    if (entityType === 'staff') {
      let staffFiltered = allStaff;
      // Filter by staff category
      if (selectedStaffCategory && selectedStaffCategory !== 'all') {
        staffFiltered = staffFiltered.filter((s: any) => s.staff_category === selectedStaffCategory);
      }
      // Meal tab: only residential staff
      if (staffSubTab === 'meal') {
        return staffFiltered.filter((s: any) => s.residence_type === 'residential' || s.residence_type === 'resident');
      }
      // Duty tab: only residential staff
      if (staffSubTab === 'duty') {
        return staffFiltered.filter((s: any) => s.residence_type === 'residential' || s.residence_type === 'resident');
      }
      // Full-time: all filtered staff
      return staffFiltered;
    }
    let filtered = allStudents;

    // Residential or Meal sub-tab: only residential students
    if (studentSubTab === 'residential' || studentSubTab === 'meal') {
      filtered = filtered.filter((s: any) => s.residence_type === 'resident');
    }

    // Common filters for all student sub-tabs: session year + division/class
    if (selectedSessionYear) {
      filtered = filtered.filter((s: any) => s.session_year === selectedSessionYear);
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
  }, [entityType, allStudents, allStaff, studentSubTab, selectedSessionYear, selectedClassId, orderedClasses, staffSubTab, selectedStaffCategory]);

  // Fetch attendance for selected date (for staff, fetch by shift too)
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedDate, entityType, effectiveShift],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', selectedDate)
        .eq('entity_type', entityType)
        .eq('shift', effectiveShift);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch attendance rules
  const { data: rules = [] } = useQuery({
    queryKey: ['attendance-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance_rules').select('*').order('entity_type').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch residential duty times
  const { data: savedDutyTimes } = useQuery({
    queryKey: ['residential-duty-times'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'residential_duty_times').maybeSingle();
      return data?.value as any;
    },
  });

  // Sync loaded duty times to state
  useMemo(() => {
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

  const saveDutyTimesMutation = useMutation({
    mutationFn: async (times: typeof dutyTimes) => {
      const { error } = await supabase.from('website_settings').upsert(
        { key: 'residential_duty_times', value: times, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residential-duty-times'] });
      toast.success(bn ? 'ডিউটি টাইম সেভ হয়েছে' : 'Duty times saved');
    },
  });

  // Fetch category shift times
  const { data: savedCategoryTimes } = useQuery({
    queryKey: ['category-shift-times'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'category_shift_times').maybeSingle();
      return data?.value as any;
    },
  });
  useMemo(() => {
    if (savedCategoryTimes) {
      setCategoryShiftTimes({ ...defaultCategoryTimes, ...savedCategoryTimes });
    }
  }, [savedCategoryTimes]);

  const saveCategoryTimesMutation = useMutation({
    mutationFn: async (times: Record<string, { start: string; end: string }>) => {
      const { error } = await supabase.from('website_settings').upsert(
        { key: 'category_shift_times', value: times, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-shift-times'] });
      toast.success(bn ? 'ক্যাটাগরি শিফট টাইম সেভ হয়েছে' : 'Category shift times saved');
    },
  });

  // Helper: get shift time for a staff entity
  const getCategoryTime = (entity: any) => {
    const cat = entity.staff_category || 'general';
    return categoryShiftTimes[cat] || defaultCategoryTimes.general;
  };

  const statusOptions = useMemo(() => {
    return rules.filter((r: any) => r.entity_type === entityType && r.rule_type === 'status' && r.is_active);
  }, [rules, entityType]);

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async ({ entityId, status, remarks, check_in_time, check_out_time }: { entityId: string; status: string; remarks?: string; check_in_time?: string; check_out_time?: string }) => {
      const shiftVal = effectiveShift;
      const existing = attendance.find((a: any) => a.entity_id === entityId);
      const updateData: any = { status, remarks, updated_at: new Date().toISOString() };
      if (check_in_time !== undefined) updateData.check_in_time = check_in_time;
      if (check_out_time !== undefined) updateData.check_out_time = check_out_time;
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType, effectiveShift] }),
    onError: (err) => { console.error('Attendance save error:', err); toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save'); },
  });

  // Bulk mark all
  const bulkMutation = useMutation({
    mutationFn: async (status: string) => {
      const shiftVal = effectiveShift;
      const unmarked = entities.filter((e: any) => !attendance.find((a: any) => a.entity_id === e.id));
      if (unmarked.length === 0) return;
      const records = unmarked.map((e: any) => ({
        attendance_date: selectedDate, entity_type: entityType,
        entity_id: e.id, status, shift: shiftVal,
      }));
      const { error } = await supabase.from('attendance_records').insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType, effectiveShift] });
      toast.success(bn ? 'সবার উপস্থিতি সেভ হয়েছে' : 'Bulk attendance saved');
    },
  });

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
      const { error } = await supabase.from('attendance_records').delete().in('id', ids);
      if (error) throw error;
      return type;
    },
    onSuccess: (_data, type) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType, effectiveShift] });
      const labels: Record<string, string> = {
        all: bn ? 'সকল উপস্থিতি' : 'All attendance',
        student: bn ? 'ছাত্র হাজিরা' : 'Student attendance',
        staff: bn ? 'স্টাফ হাজিরা' : 'Staff attendance',
        division: bn ? 'বিভাগ হাজিরা' : 'Division attendance',
        single_staff: bn ? `${resetStaffName} এর হাজিরা` : `${resetStaffName}'s attendance`,
        staff_category: bn ? `${getCategoryLabel(resetStaffCategory) || resetStaffCategory} হাজিরা` : `${getCategoryLabel(resetStaffCategory) || resetStaffCategory} attendance`,
      };
      setShowResetDialog(false);
      toast.success(bn ? `সাফল্যের সাথে ${labels[type]} রিসেট করা হয়েছে।` : `${labels[type]} reset successfully.`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '';
      if (message === 'No records to reset') {
        toast.error(bn ? 'রিসেট করার মতো কোনো রেকর্ড নেই' : 'No records found to reset');
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
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  const filtered = entities.filter((e: any) => {
    const name = e.name_bn + (e.name_en || '') + (e.student_id || '');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
    const total = entities.length;
    const present = attendance.filter((a: any) => a.status === 'present').length;
    const absent = attendance.filter((a: any) => a.status === 'absent').length;
    const late = attendance.filter((a: any) => a.status === 'late').length;
    const unmarked = total - attendance.length;
    return { total, present, absent, late, unmarked };
  }, [entities, attendance]);

  const changeDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Current tab label
  const currentTabLabel = useMemo(() => {
    if (entityType === 'student') return bn ? (studentSubTab === 'residential' ? 'আবাসিক ছাত্র হাজিরা' : 'ছাত্র হাজিরা') : (studentSubTab === 'residential' ? 'Residential Student Attendance' : 'Student Attendance');
    if (staffSubTab === 'fulltime') return bn ? 'ফুল টাইম হাজিরা' : 'Full Time Attendance';
    if (staffSubTab === 'duty') return bn ? 'আবাসিক ডিউটি হাজিরা' : 'Residential Duty Attendance';
    return bn ? 'খাওয়া হাজিরা' : 'Meal Attendance';
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
          entity.name_bn,
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
          entity.name_bn,
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
        name: entity.name_bn,
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
        const lateMins = calcLateMinutes(att?.check_in_time || null, shiftStart);
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
          <td>${entity.name_bn}</td>
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
          <td>${entity.name_bn}</td>
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
          <td>${entity.name_bn}</td>
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

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${title} - ${selectedDate}</title>
      <style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif; padding:20px; font-size:12px; }
        .header { text-align:center; margin-bottom:16px; border-bottom:2px solid #333; padding-bottom:10px; }
        .header img { height:50px; margin-bottom:6px; }
        .header h2 { font-size:18px; margin:4px 0; }
        .header p { font-size:11px; color:#555; }
        .meta { display:flex; justify-content:space-between; margin-bottom:10px; font-size:11px; }
        table { width:100%; border-collapse:collapse; margin-top:8px; }
        th,td { border:1px solid #ccc; padding:5px 8px; text-align:left; font-size:11px; }
        th { background:#f3f4f6; font-weight:700; }
        .summary { margin-top:12px; display:flex; gap:20px; font-size:11px; font-weight:600; flex-wrap:wrap; }
        .summary span { padding:3px 10px; border-radius:4px; }
        @media print { body { padding:10px; } }
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

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'উপস্থিতি ব্যবস্থাপনা' : 'Attendance Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'ছাত্র ও স্টাফের দৈনিক উপস্থিতি ট্র্যাক করুন' : 'Track daily attendance for students & staff'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {entityType === 'student' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setQrPosterOpen(true)}>
                  <QrCode className="h-4 w-4 mr-1" /> {bn ? 'QR পোস্টার' : 'QR Poster'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeviceManagerOpen(true)}>
                  <Fingerprint className="h-4 w-4 mr-1" /> {bn ? 'হার্ডওয়্যার ডিভাইস' : 'Hardware Devices'}
                </Button>
              </>
            )}
            {entityType === 'staff' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStaffCheckinOpen(true)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <UserCheck className="h-4 w-4 mr-1" /> {bn ? 'চেক-ইন সিস্টেম' : 'Check-in System'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeviceManagerOpen(true)}>
                  <Fingerprint className="h-4 w-4 mr-1" /> {bn ? 'হার্ডওয়্যার ডিভাইস' : 'Hardware Devices'}
                </Button>
              </>
            )}
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
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <Download className="h-4 w-4 mr-1" /> {bn ? 'এক্সেল' : 'Excel'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> {bn ? 'প্রিন্ট' : 'Print'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRulesDialogOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" /> {bn ? 'রুল সেটিংস' : 'Rule Settings'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: bn ? 'মোট' : 'Total', value: stats.total, icon: Users, gradient: 'from-primary/15 to-primary/5', iconBg: 'bg-primary/15', iconColor: 'text-primary' },
            { label: bn ? 'উপস্থিত' : 'Present', value: stats.present, icon: CheckCircle2, gradient: 'from-emerald-500/15 to-emerald-500/5', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-600' },
            { label: bn ? 'অনুপস্থিত' : 'Absent', value: stats.absent, icon: XCircle, gradient: 'from-rose-500/15 to-rose-500/5', iconBg: 'bg-rose-500/15', iconColor: 'text-rose-600' },
            { label: bn ? 'বিলম্ব উপস্থিত' : 'Late Present', value: stats.late, icon: Clock, gradient: 'from-amber-500/15 to-amber-500/5', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-600' },
            { label: bn ? 'বাকি' : 'Unmarked', value: stats.unmarked, icon: AlertCircle, gradient: 'from-muted to-muted/50', iconBg: 'bg-muted', iconColor: 'text-muted-foreground' },
          ].map((s, i) => (
            <div key={i} className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${s.gradient} backdrop-blur-md border border-border/10 p-5 shadow-[0_8px_32px_-8px_hsl(220_20%_10%/0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-8px_hsl(220_20%_10%/0.12)]`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{s.value}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">{s.label}</p>
                </div>
                <div className={`w-11 h-11 rounded-2xl ${s.iconBg} flex items-center justify-center`}>
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
              {/* Entity Type - only show switcher when not forced */}
              {!forcedTab && (
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
                  <DatePicker bengali={bn} className="w-40 h-8 text-sm" value={selectedDate} onChange={v => setSelectedDate(v)} />
                </div>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-1 shrink-0 ml-auto">
                {canEditItem && <Button size="sm" className="text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_16px_hsl(160_84%_30%/0.25)] hover:shadow-[0_6px_24px_hsl(160_84%_30%/0.35)] transition-all duration-200" onClick={() => bulkMutation.mutate('present')}>
                  <Check className="h-3.5 w-3.5 mr-1" /> {bn ? 'সবাই উপস্থিত' : 'All Present'}
                </Button>}
                {canDeleteItem && attendance.length > 0 && (
                  <Popover open={showResetMenu} onOpenChange={setShowResetMenu}>
                    <PopoverTrigger asChild>
                      <Button size="sm" className="text-xs rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 shadow-sm transition-all duration-200">
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> {bn ? 'রিসেট' : 'Reset'}
                        <Settings2 className="h-3 w-3 ml-1 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" side="bottom" sideOffset={8} avoidCollisions collisionPadding={16} className="w-72 max-h-[60vh] overflow-y-auto rounded-2xl border border-border/30 bg-background/95 backdrop-blur-2xl shadow-[0_16px_48px_-8px_hsl(220_20%_10%/0.15)] p-2 space-y-1 scrollbar-hidden hover:scrollbar-thin z-[9999]">
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">{bn ? 'ক্যাটাগরি অনুযায়ী রিসেট করুন' : 'Reset by Category'}</p>
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
                              <button key={s.id} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors text-left" onClick={() => { setResetType('single_staff'); setResetStaffId(s.id); setResetStaffName(bn ? s.name_bn : (s.name_en || s.name_bn)); setShowResetMenu(false); setShowResetDialog(true); }}>
                                <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0"><UserCog className="h-3.5 w-3.5 text-rose-500" /></div>
                                <span className="text-sm text-foreground truncate">{bn ? s.name_bn : (s.name_en || s.name_bn)}</span>
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
                    {sessionYears.map((sy: any) => (
                      <SelectItem key={sy} value={sy}>{sy}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Division/Class filter (all student sub-tabs) */}
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder={bn ? 'শ্রেণী নির্বাচন' : 'Select Class'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
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

            {/* Staff Shift Selector */}
            {entityType === 'staff' && (
              <div className="flex flex-wrap gap-3 items-center">
                {/* Staff Sub-tabs: Full-time / Duty / Meal */}
                <Tabs value={staffSubTab} onValueChange={(v) => { setStaffSubTab(v as any); setSelectedShift(v === 'fulltime' ? 'full_day' : v === 'duty' ? 'morning' : 'meal_breakfast'); }} className="shrink-0">
                  <TabsList>
                    <TabsTrigger value="fulltime">
                      <Users className="h-4 w-4 mr-1" /> {bn ? 'ফুল টাইম হাজিরা' : 'Full Time'}
                    </TabsTrigger>
                    <TabsTrigger value="duty">
                      <Clock className="h-4 w-4 mr-1" /> {bn ? 'আবাসিক ডিউটি' : 'Residential Duty'}
                    </TabsTrigger>
                    <TabsTrigger value="meal">
                      <Utensils className="h-4 w-4 mr-1" /> {bn ? 'খাওয়া হাজিরা' : 'Meal'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Shift selector (only for duty/meal sub-tabs) */}
                {staffSubTab !== 'fulltime' && (
                  <Tabs value={selectedShift} onValueChange={setSelectedShift} className="shrink-0">
                    <TabsList>
                      {(staffSubTab === 'duty' ? DUTY_SHIFTS : MEAL_SHIFTS).map(sh => (
                        <TabsTrigger key={sh.value} value={sh.value}>
                          <sh.icon className="h-4 w-4 mr-1" /> {bn ? sh.labelBn : sh.labelEn}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}

                {/* Staff Category Filter */}
                <Select value={selectedStaffCategory} onValueChange={setSelectedStaffCategory}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder={bn ? 'ক্যাটাগরি' : 'Category'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল ক্যাটাগরি' : 'All Categories'}</SelectItem>
                    <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                    <SelectItem value="administrative">{bn ? 'প্রশাসনিক' : 'Administrative'}</SelectItem>
                    <SelectItem value="support">{bn ? 'সাপোর্ট স্টাফ' : 'Support Staff'}</SelectItem>
                    <SelectItem value="general">{bn ? 'সহায়ক কর্মী' : 'General Staff'}</SelectItem>
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

        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-md rounded-[28px] border border-border/20 bg-background/95 p-0 backdrop-blur-xl shadow-[0_24px_80px_-16px_hsl(var(--foreground)/0.25)] overflow-hidden">
            <div className="border-b border-border/10 bg-destructive/5 px-6 py-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-left text-lg">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <RotateCcw className="h-5 w-5" />
                  </span>
                  <span>{bn ? 'রিসেট নিশ্চিত করুন' : 'Confirm reset'}</span>
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
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={resetMutation.isPending}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => resetMutation.mutate(resetType)}
                  disabled={resetMutation.isPending || resetRecordCount === 0}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {resetMutation.isPending ? (bn ? 'রিসেট হচ্ছে...' : 'Resetting...') : (bn ? 'রিসেট করুন' : 'Reset now')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Attendance List */}
        <div className="space-y-3">
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
                  <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground/60 w-6 text-center tabular-nums">{idx + 1}</span>
                    
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
                      <p className="text-sm font-semibold text-foreground truncate">{bn ? entity.name_bn : (entity.name_en || entity.name_bn)}</p>
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
                            ? `${entity.designation || '-'} | ${selectedShift === 'morning' ? `${fmt(dutyTimes.morning_start)} - ${fmt(dutyTimes.morning_end)}` : `${fmt(dutyTimes.evening_start)} - ${fmt(dutyTimes.evening_end)}`}`
                            : `${entity.designation || '-'} | ${fmt(getCategoryTime(entity).start)} - ${fmt(getCategoryTime(entity).end)}`}
                      </p>
                    </div>
                  </div>

                  {/* Center: Late badges + Time inputs */}
                  <div className="flex items-center gap-3 flex-wrap sm:ml-auto">
                    {/* Late Minutes Display for staff */}
                    {entityType === 'staff' && att?.check_in_time && (() => {
                      const effStart = staffSubTab === 'duty' ? (selectedShift === 'morning' ? dutyTimes.morning_start : dutyTimes.evening_start) : getCategoryTime(entity).start;
                      const effEnd = staffSubTab === 'duty' ? (selectedShift === 'morning' ? dutyTimes.morning_end : dutyTimes.evening_end) : getCategoryTime(entity).end;
                      const dutyStart = effStart.split(':').map(Number);
                      const checkIn = att.check_in_time.split(':').map(Number);
                      const dutyEnd = effEnd.split(':').map(Number);
                      const checkOut = att.check_out_time ? att.check_out_time.split(':').map(Number) : dutyEnd;
                      const lateMin = Math.max(0, (checkIn[0] * 60 + checkIn[1]) - (dutyStart[0] * 60 + dutyStart[1]));
                      const earlyMin = Math.max(0, (dutyEnd[0] * 60 + dutyEnd[1]) - (checkOut[0] * 60 + checkOut[1]));
                      return (lateMin > 0 || earlyMin > 0) ? (
                        <div className="flex gap-1.5 shrink-0">
                          {lateMin > 0 && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/15">{bn ? `${lateMin} মি. বিলম্ব` : `${lateMin}m late`}</span>}
                          {earlyMin > 0 && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-600 border border-orange-500/15">{bn ? `${earlyMin} মি. আগে` : `${earlyMin}m early`}</span>}
                        </div>
                      ) : null;
                    })()}

                    {/* Time Inputs for Staff (hide for meal tab) */}
                    {entityType === 'staff' && staffSubTab !== 'meal' && (
                      <div className="flex gap-2 items-center shrink-0">
                        <TimePicker
                          className="h-8 w-[120px] text-xs rounded-xl bg-muted/30 border-border/20 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all"
                          placeholder="In"
                          displayFormat={timeFormat}
                          value={att?.check_in_time || ''}
                          onChange={v => saveMutation.mutate({ entityId: entity.id, status: currentStatus || 'present', check_in_time: v, check_out_time: att?.check_out_time || '' })}
                        />
                        <span className="text-muted-foreground/40 text-xs">—</span>
                        <TimePicker
                          className="h-8 w-[120px] text-xs rounded-xl bg-muted/30 border-border/20 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all"
                          placeholder="Out"
                          displayFormat={timeFormat}
                          value={att?.check_out_time || ''}
                          onChange={v => saveMutation.mutate({ entityId: entity.id, status: currentStatus || 'present', check_in_time: att?.check_in_time || '', check_out_time: v })}
                        />
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
                              onClick={() => saveMutation.mutate({ entityId: entity.id, status: opt.status })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 hover:scale-105 ${
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
                            onClick={() => {
                              const mutateData: any = { entityId: entity.id, status: countsAs };
                              if (entityType === 'staff' && staffSubTab === 'duty' && ['present', 'late', 'half_day'].includes(countsAs)) {
                                if (selectedShift === 'morning') {
                                  mutateData.check_in_time = dutyTimes.morning_start;
                                  mutateData.check_out_time = dutyTimes.morning_end;
                                } else if (selectedShift === 'evening') {
                                  mutateData.check_in_time = dutyTimes.evening_start;
                                  mutateData.check_out_time = dutyTimes.evening_end;
                                }
                              } else if (entityType === 'staff' && ['present', 'late', 'half_day'].includes(countsAs)) {
                                mutateData.check_in_time = getCategoryTime(entity).start;
                                mutateData.check_out_time = getCategoryTime(entity).end;
                              }
                              if (countsAs === 'absent' || countsAs === 'leave') {
                                mutateData.check_in_time = '';
                                mutateData.check_out_time = '';
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

        {/* Rules Dialog */}
        <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <Settings2 className="h-5 w-5 inline mr-2" />
                {bn ? 'অ্যাটেন্ডেন্স রুল সেটিংস' : 'Attendance Rule Settings'}
              </DialogTitle>
            </DialogHeader>
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

              {/* Category-wise Fulltime Shift Times - Staff only */}
              {entityType === 'staff' && (
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <Label className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {bn ? 'ক্যাটাগরি অনুযায়ী ফুল টাইম শিফট' : 'Fulltime Shift by Category'}
                </Label>
                {dynamicStaffCategories.map(catKey => ({ key: catKey, label: getCategoryLabel(catKey) })).map(cat => (
                  <div key={cat.key} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px]">{bn ? 'শুরু' : 'Start'}</Label>
                        <TimePicker className="h-8 text-sm" displayFormat={timeFormat} value={categoryShiftTimes[cat.key]?.start || '08:00'} onChange={v => setCategoryShiftTimes(p => ({ ...p, [cat.key]: { ...p[cat.key], start: v } }))} />
                      </div>
                      <div>
                        <Label className="text-[10px]">{bn ? 'শেষ' : 'End'}</Label>
                        <TimePicker className="h-8 text-sm" displayFormat={timeFormat} value={categoryShiftTimes[cat.key]?.end || '17:00'} onChange={v => setCategoryShiftTimes(p => ({ ...p, [cat.key]: { ...p[cat.key], end: v } }))} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button size="sm" className="w-full" onClick={() => saveCategoryTimesMutation.mutate(categoryShiftTimes)}>
                  <Save className="h-3 w-3 mr-1" /> {bn ? 'ক্যাটাগরি শিফট সেভ করুন' : 'Save Category Shifts'}
                </Button>
              </div>
              )}

              {/* Residential Duty Times - Staff only */}
              {entityType === 'staff' && (
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
                      <Input type="number" className="h-8 text-sm" value={dutyTimes.morning_days} onChange={e => setDutyTimes(p => ({ ...p, morning_days: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">{bn ? 'সন্ধ্যা ডিউটি (দিন)' : 'Evening Duty (Days)'}</Label>
                      <Input type="number" className="h-8 text-sm" value={dutyTimes.evening_days} onChange={e => setDutyTimes(p => ({ ...p, evening_days: Number(e.target.value) }))} />
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
                      <Label className="text-xs">{bn ? 'প্রতি ডিউটির নির্ধারিত বেতন (৳)' : 'Pay per duty shift (৳)'}</Label>
                      <Input
                        type="number"
                        className="h-8 text-sm mt-1"
                        placeholder="0"
                        value={dutyTimes.extra_duty_rate || ''}
                        onChange={e => setDutyTimes(p => ({ ...p, extra_duty_rate: Number(e.target.value) }))}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{bn ? 'প্রতিটি সকাল/সন্ধ্যা ডিউটিতে উপস্থিত থাকলে এই পরিমাণ অতিরিক্ত বেতন যোগ হবে' : 'This amount will be added as extra pay for each morning/evening duty attended'}</p>
                    </div>
                  )}
                </div>
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
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => {
                        if (confirm(bn ? 'মুছে ফেলতে চান?' : 'Delete?')) deleteRuleMutation.mutate(rule.id);
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
                    <Label className="text-xs">{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
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
          </DialogContent>
        </Dialog>

        {/* QR Poster Dialog */}
        <ClassQRPoster open={qrPosterOpen} onOpenChange={setQrPosterOpen} />
        {/* Hardware Device Manager */}
        <AttendanceDeviceManager open={deviceManagerOpen} onOpenChange={setDeviceManagerOpen} />
        {/* Staff Check-in Dialog */}
        <StaffCheckinDialog open={staffCheckinOpen} onOpenChange={setStaffCheckinOpen} selectedDate={selectedDate} />
      </div>
    </AdminLayout>
  );
};

export default AdminAttendance;
