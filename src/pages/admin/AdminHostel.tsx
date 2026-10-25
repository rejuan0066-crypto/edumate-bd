import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, BedDouble, Users, UtensilsCrossed, Plus, Pencil, Trash2, CalendarCheck, Lock, Clock, Save, Download, X, Printer, PackageCheck } from 'lucide-react';
import HostelBoardingStockTab from '@/components/hostel/HostelBoardingStockTab';
import * as XLSX from 'xlsx-js-style';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { useAppTimezone } from '@/hooks/useAppTimezone';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';

type Hostel = { id: string; name: string; name_bn: string; hostel_type: string; address?: string | null; warden_name?: string | null; warden_phone?: string | null; total_capacity: number; is_active: boolean; notes?: string | null };
type Room = { id: string; hostel_id: string; room_number: string; floor?: string | null; bed_count: number; monthly_rent: number; room_type?: string | null; is_active: boolean; notes?: string | null };
type Allocation = { id: string; room_id: string; student_id?: string | null; staff_id?: string | null; occupant_type: 'student' | 'staff'; academic_session_id?: string | null; class_id?: string | null; fee_mode: 'free' | 'full' | 'discount'; discount_percent: number; discount_amount: number; bed_number?: number | null; check_in_date: string; check_out_date?: string | null; status: string; monthly_charge: number; notes?: string | null };
type Meal = { id: string; hostel_id: string; day_of_week: string; meal_type: string; items: string; items_bn?: string | null };
type MealAttendance = { id: string; allocation_id: string | null; attendance_date: string; breakfast: boolean; lunch: boolean; dinner: boolean; notes?: string | null; person_type?: string | null; person_id?: string | null; person_name?: string | null };
type AttendanceRosterPerson = { id: string; person_type: 'student' | 'staff'; person_code?: string | null; name_bn: string; name_en?: string | null; session_id?: string | null; class_id?: string | null };
type CutoffMeal = 'breakfast' | 'lunch' | 'dinner';
type TimePeriod = 'AM' | 'PM';

const DAYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const DAYS_BN = ['শনিবার','রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার'];
const MEAL_TYPES = [
  { v: 'breakfast', en: 'Breakfast', bn: 'নাশতা' },
  { v: 'lunch', en: 'Lunch', bn: 'দুপুরের খাবার' },
  { v: 'dinner', en: 'Dinner', bn: 'রাতের খাবার' },
  { v: 'snack', en: 'Snack', bn: 'বিকেলের নাশতা' },
];

const HOUR_12_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const parseTime12 = (time?: string): { hour: string; minute: string; period: TimePeriod } => {
  const [rawHour = '0', rawMinute = '00'] = (time || '00:00').split(':');
  const hour24 = Number(rawHour) || 0;
  const period: TimePeriod = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return {
    hour: String(hour12).padStart(2, '0'),
    minute: rawMinute.padStart(2, '0').slice(0, 2),
    period,
  };
};

const to24h = (hour: string, minute: string, period: TimePeriod) => {
  let h = Number(hour) || 12;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
};

const AdminHostel = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const { tz } = useAppTimezone();
  const { data: institutionInfo } = useInstitutionInfo();
  const confirm = useConfirm();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/hostel');

  const confirmClearAttendance = async (personId: string, personName: string) => {
    const ok = await confirm({
      title: bn ? 'হাজিরা মুছবেন?' : 'Clear attendance?',
      description: bn
        ? `"${personName}" এর এই বেলার হাজিরা মুছে ফেলা হবে। আপনি কি নিশ্চিত?`
        : `This will clear "${personName}"'s attendance for this meal. Are you sure?`,
      confirmText: bn ? 'হ্যাঁ, মুছুন' : 'Yes, clear',
      cancelText: bn ? 'বাতিল' : 'Cancel',
      variant: 'warning',
    });
    if (ok) clearAttendance.mutate({ person: { type: attCat, id: personId }, meal: attMeal, personName });
  };


  // ─── Hostels ────────────────────────────────────────────────────────────
  const { data: hostels = [] } = useQuery({
    queryKey: ['hostels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostels' as any).select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Hostel[];
    },
  });

  const [hostelDlg, setHostelDlg] = useState(false);
  const [editHostel, setEditHostel] = useState<Hostel | null>(null);
  const [hostelForm, setHostelForm] = useState<Partial<Hostel>>({ hostel_type: 'boys', total_capacity: 0, is_active: true });
  const [delHostelId, setDelHostelId] = useState<string | null>(null);

  const saveHostel = useMutation({
    mutationFn: async (payload: Partial<Hostel>) => {
      if (editHostel) {
        const { error } = await supabase.from('hostels' as any).update(payload).eq('id', editHostel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostels' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostels'] });
      setHostelDlg(false); setEditHostel(null); setHostelForm({ hostel_type: 'boys', total_capacity: 0, is_active: true });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteHostel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostels' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostels'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelHostelId(null); },
  });

  // ─── Rooms ──────────────────────────────────────────────────────────────
  const { data: rooms = [] } = useQuery({
    queryKey: ['hostel-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostel_rooms' as any).select('*').order('room_number');
      if (error) throw error;
      return data as unknown as Room[];
    },
  });

  const [roomDlg, setRoomDlg] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<Partial<Room>>({ bed_count: 1, monthly_rent: 0, is_active: true });
  const [delRoomId, setDelRoomId] = useState<string | null>(null);

  const saveRoom = useMutation({
    mutationFn: async (payload: Partial<Room>) => {
      if (editRoom) {
        const { error } = await supabase.from('hostel_rooms' as any).update(payload).eq('id', editRoom.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostel_rooms' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-rooms'] });
      setRoomDlg(false); setEditRoom(null); setRoomForm({ bed_count: 1, monthly_rent: 0, is_active: true });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostel_rooms' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelRoomId(null); },
  });

  // ─── Allocations ────────────────────────────────────────────────────────
  const { data: allocations = [] } = useQuery({
    queryKey: ['hostel-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostel_allocations' as any).select('*').order('check_in_date', { ascending: false });
      if (error) throw error;
      return data as unknown as Allocation[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-min'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id, student_id, name_bn, name_en, session_id, class_id').is('deleted_at', null).limit(2000);
      if (error) throw error;
      return data;
    },
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-min-hostel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('id, staff_id, name_bn, name_en').is('deleted_at', null).limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-hostel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('id, name, name_bn').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: classesList = [] } = useQuery({
    queryKey: ['classes-hostel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('id, name, name_bn, sort_order').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const [allocDlg, setAllocDlg] = useState(false);
  const [editAlloc, setEditAlloc] = useState<Allocation | null>(null);
  const [allocForm, setAllocForm] = useState<Partial<Allocation>>({ status: 'active', occupant_type: 'student', fee_mode: 'full', discount_percent: 0, discount_amount: 0, monthly_charge: 0, check_in_date: new Date().toISOString().split('T')[0] });
  const [delAllocId, setDelAllocId] = useState<string | null>(null);

  const saveAlloc = useMutation({
    mutationFn: async (payload: Partial<Allocation>) => {
      if (editAlloc) {
        const { error } = await supabase.from('hostel_allocations' as any).update(payload).eq('id', editAlloc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostel_allocations' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-allocations'] });
      setAllocDlg(false); setEditAlloc(null); setAllocForm({ status: 'active', occupant_type: 'student', fee_mode: 'full', discount_percent: 0, discount_amount: 0, monthly_charge: 0, check_in_date: new Date().toISOString().split('T')[0] });
      toast({ title: bn ? 'বরাদ্দ সংরক্ষিত' : 'Allocation saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteAlloc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostel_allocations' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-allocations'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelAllocId(null); },
  });

  // ─── Meals ──────────────────────────────────────────────────────────────
  const { data: meals = [] } = useQuery({
    queryKey: ['hostel-meals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostel_meal_menu' as any).select('*');
      if (error) throw error;
      return data as unknown as Meal[];
    },
  });

  const [mealDlg, setMealDlg] = useState(false);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [mealForm, setMealForm] = useState<Partial<Meal>>({ day_of_week: 'Saturday', meal_type: 'breakfast' });
  const [delMealId, setDelMealId] = useState<string | null>(null);

  const saveMeal = useMutation({
    mutationFn: async (payload: Partial<Meal>) => {
      if (editMeal) {
        const { error } = await supabase.from('hostel_meal_menu' as any).update(payload).eq('id', editMeal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostel_meal_menu' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-meals'] });
      setMealDlg(false); setEditMeal(null); setMealForm({ day_of_week: 'Saturday', meal_type: 'breakfast' });
      toast({ title: bn ? 'মেনু সংরক্ষিত' : 'Menu saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostel_meal_menu' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-meals'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelMealId(null); },
  });

  // ─── Meal Attendance (3 meals/day for boarding members) ──────────────────
  const [attDate, setAttDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attMeal, setAttMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [attCat, setAttCat] = useState<'student' | 'staff'>('student');
  const [attSearch, setAttSearch] = useState('');
  const [mealSelectedClassId, setMealSelectedClassId] = useState<string | null>(null);

  // ─── Meal-attendance cutoff settings (lock non-admins after deadline) ─────
  type MealCutoffs = { enabled: boolean; breakfast: string; lunch: string; dinner: string; breakfast_start: string; lunch_start: string; dinner_start: string };
  const DEFAULT_CUTOFFS: MealCutoffs = { enabled: true, breakfast: '10:00', lunch: '15:00', dinner: '22:00', breakfast_start: '06:00', lunch_start: '12:00', dinner_start: '19:00' };
  const { data: cutoffs = DEFAULT_CUTOFFS } = useQuery({
    queryKey: ['hostel-meal-cutoffs'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'hostel_meal_attendance_cutoffs').maybeSingle();
      const v = data?.value as Partial<MealCutoffs> | null;
      return { ...DEFAULT_CUTOFFS, ...(v || {}) } as MealCutoffs;
    },
  });
  const [cutoffForm, setCutoffForm] = useState<MealCutoffs | null>(null);
  const cf = cutoffForm ?? cutoffs;
  const saveCutoffs = useMutation({
    mutationFn: async (payload: MealCutoffs) => {
      const { error } = await supabase.from('app_settings').upsert(
        { key: 'hostel_meal_attendance_cutoffs', value: payload as any, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-meal-cutoffs'] }); setCutoffForm(null); toast({ title: bn ? 'সেটিং সংরক্ষিত' : 'Settings saved' }); },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  // Current time in the app timezone as "YYYY-MM-DDThh:mm a" for lexical comparison
  const nowInTz = (() => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = (t: string) => p.find(x => x.type === t)?.value || '00';
    return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
  })();
  // Format an "HH:mm" 24h string to 12h "hh:mm AM/PM" for display
  const to12h = (t?: string) => {
    if (!t) return '';
    const { hour, minute, period } = parseTime12(t);
    return `${hour}:${minute} ${period}`;
  };
  type CutoffKey = 'breakfast' | 'lunch' | 'dinner' | 'breakfast_start' | 'lunch_start' | 'dinner_start';
  const updateCutoffTime = (meal: CutoffKey, part: 'hour' | 'minute' | 'period', value: string) => {
    const current = parseTime12(cf[meal]);
    const next = { ...current, [part]: value } as { hour: string; minute: string; period: TimePeriod };
    setCutoffForm({ ...cf, [meal]: to24h(next.hour, next.minute, next.period) });
  };
  const renderCutoffTimePicker = (meal: CutoffKey, label: string) => {
    return (
      <div className="space-y-1.5 rounded-2xl border border-border/60 bg-background/60 p-3">
        <Label className="text-xs font-medium">{label}</Label>
        <TimePicker
          value={cf[meal] || ''}
          onChange={(v) => setCutoffForm(prev => ({ ...prev, [meal]: v }))}
          placeholder={label}
        />
      </div>
    );
  };
  // Outside the allowed window (start–end) for the selected date + meal? (locks non-admins)
  const startStr = `${attDate}T${cf[`${attMeal}_start` as CutoffKey] || '00:00'}`;
  const deadlineStr = `${attDate}T${cf[attMeal] || '23:59'}`;
  const beforeStart = nowInTz < startStr;
  const afterDeadline = nowInTz > deadlineStr;
  const attLocked = cf.enabled && !isAdmin && (beforeStart || afterDeadline);


  const { data: mealAttendance = [] } = useQuery({
    queryKey: ['hostel-meal-attendance', attDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostel_meal_attendance' as any).select('*').eq('attendance_date', attDate);
      if (error) throw error;
      return data as unknown as MealAttendance[];
    },
  });

  const { data: attendanceStudents = [], isLoading: loadingAttendanceStudents, error: attendanceStudentsError } = useQuery({
    queryKey: ['hostel-attendance-roster', 'student'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_hostel_attendance_roster', { p_person_type: 'student' });
      if (error) throw error;
      return data as AttendanceRosterPerson[];
    },
  });

  const { data: attendanceStaff = [], isLoading: loadingAttendanceStaff, error: attendanceStaffError } = useQuery({
    queryKey: ['hostel-attendance-roster', 'staff'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_hostel_attendance_roster', { p_person_type: 'staff' });
      if (error) throw error;
      return data as AttendanceRosterPerson[];
    },
  });

  const saveAttendance = useMutation({
    mutationFn: async (payload: { allocation_id?: string; person?: { type: string; id: string; name: string }; meal: 'breakfast' | 'lunch' | 'dinner'; value: boolean }) => {
      const existing = (mealAttendance as MealAttendance[]).find(a =>
        payload.allocation_id ? a.allocation_id === payload.allocation_id : (a.person_type === payload.person?.type && a.person_id === payload.person?.id)
      );
      if (existing) {
        const { error } = await supabase.from('hostel_meal_attendance' as any).update({ [payload.meal]: payload.value }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const row: any = { attendance_date: attDate, [payload.meal]: payload.value };
        if (payload.allocation_id) row.allocation_id = payload.allocation_id;
        else if (payload.person) { row.person_type = payload.person.type; row.person_id = payload.person.id; row.person_name = payload.person.name; }
        const { error } = await supabase.from('hostel_meal_attendance' as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-meal-attendance', attDate] }),
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  // Clear a single person's meal attendance for the selected meal
  const clearAttendance = useMutation({
    mutationFn: async (payload: { allocation_id?: string; person?: { type: string; id: string }; meal: 'breakfast' | 'lunch' | 'dinner'; personName?: string }) => {
      const existing = (mealAttendance as MealAttendance[]).find(a =>
        payload.allocation_id ? a.allocation_id === payload.allocation_id : (a.person_type === payload.person?.type && a.person_id === payload.person?.id)
      );
      if (!existing) return null;
      const prevValue = (existing as any)[payload.meal];
      const { error } = await supabase.from('hostel_meal_attendance' as any).update({ [payload.meal]: null }).eq('id', existing.id);
      if (error) throw error;
      return { id: existing.id, meal: payload.meal, prevValue, personName: payload.personName };
    },
    onSuccess: (ctx) => {
      qc.invalidateQueries({ queryKey: ['hostel-meal-attendance', attDate] });
      if (ctx && ctx.prevValue != null) {
        toast({
          title: bn ? 'হাজিরা মুছে ফেলা হয়েছে' : 'Attendance cleared',
          description: ctx.personName || undefined,
          action: (
            <ToastAction
              altText={bn ? 'পূর্বাবস্থায় ফিরান' : 'Undo'}
              onClick={async () => {
                const { error } = await supabase.from('hostel_meal_attendance' as any)
                  .update({ [ctx.meal]: ctx.prevValue }).eq('id', ctx.id);
                if (error) {
                  toast({ title: bn ? 'ত্রুটি' : 'Error', description: error.message, variant: 'destructive' });
                  return;
                }
                qc.invalidateQueries({ queryKey: ['hostel-meal-attendance', attDate] });
                toast({ title: bn ? 'পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে' : 'Restored' });
              }}
            >
              {bn ? 'পূর্বাবস্থায় ফিরান' : 'Undo'}
            </ToastAction>
          ),
        });
      }
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });


  // Add an ad-hoc member (no allocation) to today's meal attendance
  const [adHocType, setAdHocType] = useState<'student' | 'staff'>('student');
  const [adHocId, setAdHocId] = useState<string>('');
  const addAdHoc = useMutation({
    mutationFn: async () => {
      if (!adHocId) throw new Error(bn ? 'সদস্য বাছাই করুন' : 'Select a member');
      const list: any[] = adHocType === 'student' ? (students as any[]) : (staffList as any[]);
      const p = list.find((x: any) => x.id === adHocId);
      const name = p ? (bn ? p.name_bn : (p.name_en || p.name_bn)) + (p.student_id || p.staff_id ? ` (${p.student_id || p.staff_id})` : '') : '';
      const dup = (mealAttendance as MealAttendance[]).find(a => a.person_type === adHocType && a.person_id === adHocId);
      if (dup) throw new Error(bn ? 'এই সদস্য ইতিমধ্যে তালিকায় আছে' : 'Member already in list');
      const { error } = await supabase.from('hostel_meal_attendance' as any).insert({ attendance_date: attDate, person_type: adHocType, person_id: adHocId, person_name: name });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-meal-attendance', attDate] }); setAdHocId(''); toast({ title: bn ? 'যোগ করা হয়েছে' : 'Added' }); },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });
  const deleteAttendance = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('hostel_meal_attendance' as any).delete().eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-meal-attendance', attDate] }),
  });

  const attFor = (allocId: string) => (mealAttendance as MealAttendance[]).find(a => a.allocation_id === allocId);
  const activeAllocations = allocations.filter(a => a.status === 'active');
  const adHocRows = (mealAttendance as MealAttendance[]).filter(a => !a.allocation_id && a.person_id);

  // Per-person record for the simplified meal-attendance roster
  const personAtt = (type: 'student' | 'staff', id: string) =>
    (mealAttendance as MealAttendance[]).find(a => a.person_type === type && a.person_id === id);

  // Full roster for selected category, filtered by search
  const activeAttendanceRoster = attCat === 'student' ? attendanceStudents : attendanceStaff;
  const activeAttendanceRosterError = attCat === 'student' ? attendanceStudentsError : attendanceStaffError;
  const isAttendanceRosterLoading = attCat === 'student' ? loadingAttendanceStudents : loadingAttendanceStaff;
  const attRoster = (activeAttendanceRoster || []).filter((p: AttendanceRosterPerson) => {
    if (attCat === 'student' && mealSelectedClassId && p.class_id !== mealSelectedClassId) return false;
    const q = attSearch.trim().toLowerCase();
    if (!q) return true;
    const code = (p.person_code || '').toLowerCase();
    return (p.name_bn || '').toLowerCase().includes(q) || (p.name_en || '').toLowerCase().includes(q) || code.includes(q);
  });

  // Per-class meal-attendance summary cards (drill-down step 1 for students)
  const mealClassSummaries = (() => {
    if (attCat !== 'student') return [] as { id: string; label: string; total: number; present: number; absent: number; unmarked: number }[];
    const map = new Map<string, AttendanceRosterPerson[]>();
    (activeAttendanceRoster || []).forEach((p: AttendanceRosterPerson) => {
      const key = p.class_id || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    const order = (classesList as any[]).map((c: any) => c.id);
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([key, people]) => {
        let present = 0, absent = 0, unmarked = 0;
        people.forEach(p => {
          const rec = personAtt('student', p.id);
          if (!rec || rec[attMeal] === null || rec[attMeal] === undefined) unmarked++;
          else if (rec[attMeal]) present++;
          else absent++;
        });
        const c: any = (classesList as any[]).find((x: any) => x.id === key);
        const label = key === '__none__'
          ? (bn ? 'শ্রেণীবিহীন' : 'No Class')
          : (c ? (bn ? c.name_bn : c.name) : (bn ? 'অজানা শ্রেণী' : 'Unknown Class'));
        return { id: key, label, total: people.length, present, absent, unmarked };
      });
  })();

  // Group the student roster into separate per-class sections (staff stays as one group)
  const attRosterGroups = (() => {
    if (attCat !== 'student') {
      return [{ key: 'all', label: '', people: attRoster }];
    }
    const map = new Map<string, AttendanceRosterPerson[]>();
    attRoster.forEach((p: AttendanceRosterPerson) => {
      const key = p.class_id || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    const order = (classesList as any[]).map((c: any) => c.id);
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([key, people]) => {
        const c: any = (classesList as any[]).find((x: any) => x.id === key);
        return {
          key,
          label: key === '__none__'
            ? (bn ? 'শ্রেণীবিহীন' : 'No Class')
            : (c ? (bn ? c.name_bn : c.name) : (bn ? 'অজানা শ্রেণী' : 'Unknown Class')),
          people,
        };
      });

  })();


  // Per-meal present/absent tally for the current category + date
  const attStats = (() => {
    let present = 0, absent = 0, unmarked = 0;
    (activeAttendanceRoster || []).forEach((p: AttendanceRosterPerson) => {
      const rec = personAtt(attCat, p.id);
      if (!rec || rec[attMeal] === null || rec[attMeal] === undefined) unmarked++;
      else if (rec[attMeal]) present++;
      else absent++;
    });
    return { present, absent, unmarked, total: (activeAttendanceRoster || []).length };
  })();

  const mealLabel = (m: 'breakfast' | 'lunch' | 'dinner') =>
    m === 'breakfast' ? (bn ? 'সকাল' : 'Breakfast') : m === 'lunch' ? (bn ? 'দুপুর' : 'Lunch') : (bn ? 'রাত' : 'Dinner');

  const exportAttendance = () => {
    const rows = (activeAttendanceRoster || []).map((p: AttendanceRosterPerson, i: number) => {
      const rec = personAtt(attCat, p.id);
      const status = !rec || rec[attMeal] === null || rec[attMeal] === undefined
        ? (bn ? 'দেওয়া হয়নি' : 'Not marked')
        : rec[attMeal] ? (bn ? 'উপস্থিত' : 'Present') : (bn ? 'অনুপস্থিত' : 'Absent');
      const row: Record<string, any> = {
        '#': i + 1,
        [bn ? 'নাম' : 'Name']: (bn ? p.name_bn : (p.name_en || p.name_bn)) || p.name_bn,
        [bn ? 'আইডি' : 'ID']: p.person_code || '',
      };
      if (attCat === 'student') row[bn ? 'ক্লাস' : 'Class'] = classLabel(p.class_id) || '';
      row[bn ? 'হাজিরা' : 'Status'] = status;
      return row;
    });
    const summary = [
      {},
      { '#': bn ? 'মোট' : 'Total', [bn ? 'নাম' : 'Name']: attStats.total },
      { '#': bn ? 'উপস্থিত' : 'Present', [bn ? 'নাম' : 'Name']: attStats.present },
      { '#': bn ? 'অনুপস্থিত' : 'Absent', [bn ? 'নাম' : 'Name']: attStats.absent },
      { '#': bn ? 'দেওয়া হয়নি' : 'Not marked', [bn ? 'নাম' : 'Name']: attStats.unmarked },
    ];
    const catLabel = attCat === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'শিক্ষক/স্টাফ' : 'Teacher/Staff');
    // Header section showing which meal/date/category this attendance is for
    const ws = XLSX.utils.aoa_to_sheet([
      [bn ? 'খাবার হাজিরা' : 'Meal Attendance'],
      [bn ? 'বেলা' : 'Meal', mealLabel(attMeal)],
      [bn ? 'তারিখ' : 'Date', attDate],
      [bn ? 'ধরন' : 'Category', catLabel],
      [],
    ]);
    // Append the roster + summary below the header (origin -1 = next empty row)
    XLSX.utils.sheet_add_json(ws, [...rows, ...summary], { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const fname = `meal-attendance_${attDate}_${attMeal}_${attCat}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast({ title: bn ? 'ফাইল সেভ হয়েছে' : 'File saved', description: fname });
  };

  // ─── Weekly / Monthly period report (download + print) ─────────────────────
  const buildDateRange = (period: 'week' | 'month') => {
    const base = new Date(attDate + 'T00:00:00');
    let start: Date, end: Date;
    if (period === 'week') {
      const day = base.getDay(); // 0 = Sun
      start = new Date(base); start.setDate(base.getDate() - day);
      end = new Date(start); end.setDate(start.getDate() + 6);
    } else {
      start = new Date(base.getFullYear(), base.getMonth(), 1);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    }
    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return { start: dates[0], end: dates[dates.length - 1], dates };
  };

  const fetchPeriodAttendance = async (start: string, end: string) => {
    const { data, error } = await supabase.from('hostel_meal_attendance' as any)
      .select('*').gte('attendance_date', start).lte('attendance_date', end);
    if (error) throw error;
    return (data as unknown as MealAttendance[]) || [];
  };

  // Build per-person rows: each date column shows present meal-count (out of 3)
  const buildPeriodRows = (dates: string[], records: MealAttendance[]) => {
    const meals: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
    return (activeAttendanceRoster || []).map((p: AttendanceRosterPerson, i: number) => {
      const cells: Record<string, string> = {};
      let totalPresent = 0;
      dates.forEach(dt => {
        const rec = records.find(r => r.attendance_date === dt && r.person_type === attCat && r.person_id === p.id);
        const cnt = rec ? meals.filter(m => rec[m] === true).length : 0;
        totalPresent += cnt;
        cells[dt] = rec ? String(cnt) : '-';
      });
      return {
        '#': i + 1,
        name: (bn ? p.name_bn : (p.name_en || p.name_bn)) || p.name_bn,
        id: p.person_code || '',
        class: attCat === 'student' ? (classLabel(p.class_id) || '') : '',
        cells,
        totalPresent,
      };
    });
  };

  const periodTitle = (period: 'week' | 'month', start: string, end: string) =>
    (bn ? (period === 'week' ? 'সাপ্তাহিক খাবার হাজিরা' : 'মাসিক খাবার হাজিরা') : (period === 'week' ? 'Weekly Meal Attendance' : 'Monthly Meal Attendance'))
    + ` (${start} → ${end})`;

  const downloadPeriodReport = async (period: 'week' | 'month') => {
    try {
      const { start, end, dates } = buildDateRange(period);
      const records = await fetchPeriodAttendance(start, end);
      const rows = buildPeriodRows(dates, records);
      const catLabel = attCat === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'শিক্ষক/স্টাফ' : 'Teacher/Staff');
      const dateCol = (dt: string) => dt.slice(8) + '/' + dt.slice(5, 7);
      const instName = institutionInfo ? (bn ? institutionInfo.name : (institutionInfo.name_en || institutionInfo.name)) : '';
      const FONT = 'SutonnyOMJ';
      const argb = (hex: string) => 'FF' + hex.replace('#', '');

      // ── Column definitions (dynamic date columns) ──
      type Col = { key: string; label: string; width: number; left?: boolean };
      const cols: Col[] = [
        { key: '#', label: '#', width: 5 },
        { key: 'name', label: bn ? 'নাম' : 'Name', width: 26, left: true },
        { key: 'id', label: bn ? 'আইডি' : 'ID', width: 16 },
      ];
      if (attCat === 'student') cols.push({ key: 'class', label: bn ? 'ক্লাস' : 'Class', width: 18, left: true });
      dates.forEach(dt => cols.push({ key: dt, label: dateCol(dt), width: 7 }));
      cols.push({ key: 'total', label: bn ? 'মোট বেলা' : 'Total Meals', width: 12 });
      const totalCols = cols.length;

      const cellValue = (r: any, key: string) => {
        if (key === '#') return r['#'];
        if (key === 'name') return r.name;
        if (key === 'id') return r.id;
        if (key === 'class') return r.class;
        if (key === 'total') return r.totalPresent;
        return r.cells[key];
      };

      // ── Sheet data (aoa) ──
      const sheetData: any[][] = [];
      sheetData.push([instName || (bn ? 'প্রতিষ্ঠান' : 'Institution')]);                       // 0 institution
      sheetData.push([periodTitle(period, start, end)]);                                        // 1 title
      sheetData.push([`${bn ? 'ধরন' : 'Category'}: ${catLabel}   |   ${bn ? 'প্রতি ঘর = সেই দিনে উপস্থিত বেলা (০-৩)' : 'Each cell = meals present that day (0-3)'}`]); // 2 note
      sheetData.push([]);                                                                       // 3 spacer
      sheetData.push(cols.map(c => c.label));                                                   // 4 header
      const headerRowIdx = 4;
      rows.forEach(r => sheetData.push(cols.map(c => cellValue(r, c.key))));
      const dataStart = headerRowIdx + 1;
      const dataEnd = dataStart + rows.length - 1;

      // Summary row
      sheetData.push([]);
      const summaryRowIdx = sheetData.length;
      const grandTotal = rows.reduce((s: number, r: any) => s + (r.totalPresent || 0), 0);
      const summary: any[] = new Array(totalCols).fill('');
      summary[0] = bn ? 'মোট' : 'Total';
      summary[1] = `${rows.length} ${bn ? 'জন' : 'people'}`;
      summary[totalCols - 1] = grandTotal;
      sheetData.push(summary);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
      ];
      ws['!cols'] = cols.map(c => ({ wch: c.width }));
      // Freeze header + name columns for easy scrolling
      ws['!freeze'] = { xSplit: attCat === 'student' ? 4 : 3, ySplit: headerRowIdx + 1 } as any;

      const rowHeights: Record<number, number> = { 0: 30, 1: 24, 2: 20, 3: 8, [headerRowIdx]: 26 };
      ws['!rows'] = Array.from({ length: sheetData.length }, (_, i) => ({ hpt: rowHeights[i] ?? 22 }));

      const thin = {
        top: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
      };
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };
          const cell = ws[ref];
          cell.s = {
            font: { name: FONT, sz: 11, color: { rgb: 'FF1E293B' } },
            alignment: { vertical: 'center', horizontal: cols[c]?.left ? 'left' : 'center', wrapText: true },
            border: thin,
          };
          if (r === 0) { cell.s = { font: { name: FONT, sz: 16, bold: true, color: { rgb: 'FF064E3B' } }, alignment: { horizontal: 'center', vertical: 'center' } }; }
          else if (r === 1) { cell.s = { font: { name: FONT, sz: 13, bold: true, color: { rgb: 'FF0F172A' } }, alignment: { horizontal: 'center', vertical: 'center' } }; }
          else if (r === 2) { cell.s = { font: { name: FONT, sz: 10, color: { rgb: 'FF64748B' } }, alignment: { horizontal: 'center', vertical: 'center' } }; }
          else if (r === 3) { cell.s = { font: { name: FONT, sz: 8 } }; }
          else if (r === headerRowIdx) {
            cell.s = {
              fill: { fgColor: { rgb: argb('#059669') } },
              font: { name: FONT, sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } },
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border: thin,
            };
          } else if (r >= dataStart && r <= dataEnd) {
            if ((r - dataStart) % 2 === 1) cell.s.fill = { fgColor: { rgb: argb('#F8FAFC') } };
            // Highlight the total-meals column
            if (cols[c]?.key === 'total') cell.s.font = { name: FONT, sz: 11, bold: true, color: { rgb: 'FF059669' } };
            // Dim empty "-" cells
            const v = String(cell.v ?? '');
            if (v === '-' || v === '0') cell.s.font = { name: FONT, sz: 11, color: { rgb: 'FFCBD5E1' } };
            else if (cols[c]?.key !== 'name' && cols[c]?.key !== 'class' && cols[c]?.key !== 'id' && cols[c]?.key !== '#' && cols[c]?.key !== 'total')
              cell.s.font = { name: FONT, sz: 11, bold: true, color: { rgb: 'FF16A34A' } };
          } else if (r === summaryRowIdx) {
            cell.s = {
              fill: { fgColor: { rgb: argb('#ECFDF5') } },
              font: { name: FONT, sz: 11, bold: true, color: { rgb: 'FF064E3B' } },
              alignment: { horizontal: cols[c]?.left ? 'left' : 'center', vertical: 'center' },
              border: { top: { style: 'medium', color: { rgb: 'FF059669' } }, bottom: { style: 'medium', color: { rgb: 'FF059669' } }, left: thin.left, right: thin.right },
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, period === 'week' ? 'Weekly' : 'Monthly');
      const fname = `meal-attendance_${period}_${start}_${attCat}.xlsx`;
      XLSX.writeFile(wb, fname, { bookType: 'xlsx', cellStyles: true });
      toast({ title: bn ? 'ফাইল সেভ হয়েছে' : 'File saved', description: fname });
    } catch (e: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const printPeriodReport = async (period: 'week' | 'month') => {
    try {
      const { start, end, dates } = buildDateRange(period);
      const records = await fetchPeriodAttendance(start, end);
      const rows = buildPeriodRows(dates, records);
      const catLabel = attCat === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'শিক্ষক/স্টাফ' : 'Teacher/Staff');
      const dateCol = (dt: string) => dt.slice(8) + '/' + dt.slice(5, 7);
      const instName = institutionInfo ? (bn ? institutionInfo.name : (institutionInfo.name_en || institutionInfo.name)) : '';
      const cellHtml = (v: string) => {
        if (v === '-' || v === '0') return `<td class="dim">${v === '0' ? '0' : '–'}</td>`;
        return `<td class="hit">${v}</td>`;
      };
      const grandTotal = rows.reduce((s: number, r: any) => s + (r.totalPresent || 0), 0);
      const head = `<tr><th class="num">#</th><th class="lft">${bn ? 'নাম' : 'Name'}</th><th>${bn ? 'আইডি' : 'ID'}</th>${attCat === 'student' ? `<th class="lft">${bn ? 'ক্লাস' : 'Class'}</th>` : ''}${dates.map(d => `<th class="day">${dateCol(d)}</th>`).join('')}<th class="tot">${bn ? 'মোট' : 'Total'}</th></tr>`;
      const body = rows.map(r => `<tr><td class="num">${r['#']}</td><td class="lft">${r.name}</td><td>${r.id}</td>${attCat === 'student' ? `<td class="lft">${r.class}</td>` : ''}${dates.map(d => cellHtml(r.cells[d])).join('')}<td class="tot">${r.totalPresent}</td></tr>`).join('');
      const foot = `<tr class="sum"><td class="lft" colspan="${attCat === 'student' ? 4 : 3}">${bn ? 'মোট' : 'Total'} · ${rows.length} ${bn ? 'জন' : 'people'}</td>${dates.map(() => '<td></td>').join('')}<td class="tot">${grandTotal}</td></tr>`;
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${periodTitle(period, start, end)}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'SutonnyOMJ', 'Noto Sans Bengali', 'Nikosh', 'Kalpurush', 'SolaimanLipi', sans-serif; color: #0f172a; margin: 0; }
          .head-band { border-bottom: 3px solid #059669; padding-bottom: 8px; margin-bottom: 12px; text-align: center; }
          h1 { font-size: 20px; margin: 0; color:#064e3b; letter-spacing:.3px; }
          h2 { font-size: 14px; font-weight: 600; margin: 4px 0 0; color:#0f172a; }
          p.meta { font-size: 11px; color:#475569; margin: 4px 0 0; }
          table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          th, td { border: 1px solid #d1d5db; padding: 4px 5px; text-align:center; }
          th { background:#059669; color:#fff; font-weight:700; }
          th.day { background:#047857; }
          td.lft, th.lft { text-align:left; }
          td.num, th.num { width: 26px; color:#94a3b8; }
          td.dim { color:#cbd5e1; }
          td.hit { color:#16a34a; font-weight:700; }
          td.tot, th.tot { font-weight:800; color:#064e3b; background:#ecfdf5; }
          th.tot { color:#fff; background:#065f46; }
          tbody tr:nth-child(even) td { background:#f8fafc; }
          tbody tr:nth-child(even) td.tot { background:#d1fae5; }
          tr.sum td { background:#ecfdf5; font-weight:800; border-top:2px solid #059669; }
          tfoot { display: table-footer-group; }
        </style></head><body>
        <div class="head-band">
          ${instName ? `<h1>${instName}</h1>` : ''}
          <h2>${periodTitle(period, start, end)}</h2>
          <p class="meta">${bn ? 'ধরন' : 'Category'}: ${catLabel} · ${bn ? 'প্রতি ঘর = সেই দিনে উপস্থিত বেলা (০-৩)' : 'Each cell = meals present (0-3)'}</p>
        </div>
        <table><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>
        </body></html>`;
      const w = window.open('', '_blank');
      if (!w) { toast({ title: bn ? 'পপআপ ব্লক' : 'Popup blocked', variant: 'destructive' }); return; }
      w.document.write(html); w.document.close();
      w.onload = () => { w.focus(); w.print(); };
    } catch (e: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' });
    }
  };



  // ─── Stats ──────────────────────────────────────────────────────────────
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((s, r) => s + (r.bed_count || 0), 0);
  const occupied = allocations.filter(a => a.status === 'active').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  const studentName = (id?: string | null) => {
    if (!id) return '—';
    const s: any = students.find((x: any) => x.id === id);
    return s ? (bn ? s.name_bn : (s.name_en || s.name_bn)) + ` (${s.student_id})` : id.slice(0, 8);
  };
  const staffName = (id?: string | null) => {
    if (!id) return '—';
    const s: any = (staffList as any[]).find((x: any) => x.id === id);
    return s ? (bn ? s.name_bn : (s.name_en || s.name_bn)) + (s.staff_id ? ` (${s.staff_id})` : '') : id.slice(0, 8);
  };
  const occupantLabel = (a: Allocation) => a.occupant_type === 'staff' ? staffName(a.staff_id) : studentName(a.student_id);
  const sessionLabel = (id?: string | null) => {
    if (!id) return '—';
    const s: any = (academicSessions as any[]).find((x: any) => x.id === id);
    return s ? (bn ? (s.name_bn || s.name) : s.name) : '—';
  };
  const classLabel = (id?: string | null) => {
    if (!id) return '—';
    const c: any = (classesList as any[]).find((x: any) => x.id === id);
    return c ? (bn ? c.name_bn : c.name) : '—';
  };
  const roomLabel = (id: string) => {
    const r = rooms.find(x => x.id === id);
    if (!r) return id.slice(0, 8);
    const h = hostels.find(x => x.id === r.hostel_id);
    return `${h ? (bn ? h.name_bn : h.name) : ''} - ${r.room_number}`;
  };
  const hostelLabel = (id: string) => {
    const h = hostels.find(x => x.id === id);
    return h ? (bn ? h.name_bn : h.name) : id.slice(0, 8);
  };

  // Filter students by selected session/class for allocation form
  const filteredStudents = (students as any[]).filter((s: any) => {
    if (allocForm.academic_session_id && s.session_id !== allocForm.academic_session_id) return false;
    if (allocForm.class_id && s.class_id !== allocForm.class_id) return false;
    return true;
  });

  // Auto-calculate net charge based on fee mode + room rent
  const computeNetCharge = (form: Partial<Allocation>): number => {
    const room = rooms.find(r => r.id === form.room_id);
    const base = Number(room?.monthly_rent || 0);
    if (form.fee_mode === 'free') return 0;
    if (form.fee_mode === 'discount') {
      const pct = Number(form.discount_percent || 0);
      const amt = Number(form.discount_amount || 0);
      const afterPct = base - (base * pct / 100);
      return Math.max(0, afterPct - amt);
    }
    return base;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{bn ? 'হোস্টেল ব্যবস্থাপনা' : 'Hostel Management'}</h1>
        <p className="text-muted-foreground">{bn ? 'হোস্টেল, রুম, বরাদ্দ ও খাবার মেনু পরিচালনা করুন' : 'Manage hostels, rooms, allocations and meal menus'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Building2 className="w-6 h-6 text-primary" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'মোট হোস্টেল' : 'Total Hostels'}</p><p className="text-2xl font-bold">{hostels.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center"><BedDouble className="w-6 h-6 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'মোট বেড' : 'Total Beds'}</p><p className="text-2xl font-bold">{totalBeds}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><Users className="w-6 h-6 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'বরাদ্দকৃত' : 'Occupied'}</p><p className="text-2xl font-bold">{occupied}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center"><UtensilsCrossed className="w-6 h-6 text-orange-600" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'অকুপেন্সি' : 'Occupancy'}</p><p className="text-2xl font-bold">{occupancyRate}%</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="boarding-stock" className="space-y-4">
        <div className="relative -mx-2 px-2">
          <div className="overflow-x-auto scrollbar-none snap-x snap-mandatory [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] md:[mask-image:none]">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-6 md:max-w-5xl gap-1.5 bg-muted/50 p-1.5 rounded-2xl border border-border/60 shadow-sm h-auto">
              {[
                { v: 'boarding-stock', bn: 'বোর্ডিং স্টক ও খরচ', en: 'Boarding Stock', Icon: PackageCheck },
                { v: 'hostels', bn: 'হোস্টেল', en: 'Hostels', Icon: Building2 },
                { v: 'rooms', bn: 'রুম', en: 'Rooms', Icon: BedDouble },
                { v: 'allocations', bn: 'বরাদ্দ', en: 'Allocations', Icon: Users },
                { v: 'meals', bn: 'খাবার মেনু', en: 'Meal Menu', Icon: UtensilsCrossed },
                { v: 'meal-attendance', bn: 'খাবার হাজিরা', en: 'Meal Attendance', Icon: CalendarCheck },
              ].map(({ v, bn: bnL, en, Icon }) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="group relative snap-start flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 rounded-xl px-2.5 md:px-3.5 py-2.5 md:py-2.5 min-w-[85px] md:min-w-0 text-[11px] md:text-sm leading-tight font-medium tracking-tight bg-background border border-border/70 text-foreground shadow-xs transition-all duration-200 hover:bg-muted/60 hover:text-foreground data-[state=active]:!bg-emerald-600 data-[state=active]:!text-white data-[state=active]:!border-emerald-600 data-[state=active]:shadow-md data-[state=active]:font-bold"
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="whitespace-nowrap">{bn ? bnL : en}</span>
                </TabsTrigger>
              ))}
            </TabsList>

          </div>
        </div>

        {/* BOARDING STOCK & EXPENSES TAB (FIRST TAB) */}
        <TabsContent value="boarding-stock">
          <HostelBoardingStockTab />
        </TabsContent>

        {/* HOSTELS TAB */}
        <TabsContent value="hostels">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'হোস্টেল তালিকা' : 'Hostels'}</CardTitle>
              {canAddItem && (
                <Button onClick={() => { setEditHostel(null); setHostelForm({ hostel_type: 'boys', total_capacity: 0, is_active: true }); setHostelDlg(true); }}>
                  <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন' : 'New'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                    <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                    <TableHead>{bn ? 'ওয়ার্ডেন' : 'Warden'}</TableHead>
                    <TableHead>{bn ? 'ক্যাপাসিটি' : 'Capacity'}</TableHead>
                    <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hostels.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{bn ? h.name_bn : h.name}</TableCell>
                      <TableCell>{h.hostel_type === 'boys' ? (bn ? 'ছেলে' : 'Boys') : h.hostel_type === 'girls' ? (bn ? 'মেয়ে' : 'Girls') : (bn ? 'মিশ্র' : 'Mixed')}</TableCell>
                      <TableCell>{h.warden_name || '—'}</TableCell>
                      <TableCell>{h.total_capacity}</TableCell>
                      <TableCell><Badge variant={h.is_active ? 'default' : 'secondary'}>{h.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {canEditItem && (
                          <Button size="icon" variant="ghost" onClick={() => { setEditHostel(h); setHostelForm(h); setHostelDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                        )}
                        {canDeleteItem && (
                          <Button size="icon" variant="ghost" onClick={() => setDelHostelId(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {hostels.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{bn ? 'কোনো হোস্টেল নেই' : 'No hostels yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROOMS TAB */}
        <TabsContent value="rooms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'রুম তালিকা' : 'Rooms'}</CardTitle>
              {canAddItem && (
                <Button onClick={() => { setEditRoom(null); setRoomForm({ bed_count: 1, monthly_rent: 0, is_active: true }); setRoomDlg(true); }}>
                  <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন রুম' : 'New Room'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{bn ? 'হোস্টেল' : 'Hostel'}</TableHead>
                  <TableHead>{bn ? 'রুম নং' : 'Room #'}</TableHead>
                  <TableHead>{bn ? 'তলা' : 'Floor'}</TableHead>
                  <TableHead>{bn ? 'বেড' : 'Beds'}</TableHead>
                  <TableHead>{bn ? 'মাসিক ভাড়া' : 'Monthly Rent'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rooms.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{hostelLabel(r.hostel_id)}</TableCell>
                      <TableCell className="font-medium">{r.room_number}</TableCell>
                      <TableCell>{r.floor || '—'}</TableCell>
                      <TableCell>{r.bed_count}</TableCell>
                      <TableCell>৳{Number(r.monthly_rent).toLocaleString()}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {canEditItem && (
                          <Button size="icon" variant="ghost" onClick={() => { setEditRoom(r); setRoomForm(r); setRoomDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                        )}
                        {canDeleteItem && (
                          <Button size="icon" variant="ghost" onClick={() => setDelRoomId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rooms.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{bn ? 'কোনো রুম নেই' : 'No rooms yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALLOCATIONS TAB */}
        <TabsContent value="allocations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'রুম বরাদ্দ' : 'Allocations'}</CardTitle>
              {canAddItem && (
                <Button onClick={() => { setEditAlloc(null); setAllocForm({ status: 'active', occupant_type: 'student', fee_mode: 'full', discount_percent: 0, discount_amount: 0, monthly_charge: 0, check_in_date: new Date().toISOString().split('T')[0] }); setAllocDlg(true); }}>
                  <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন বরাদ্দ' : 'New Allocation'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                  <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                  <TableHead>{bn ? 'সেশন/শ্রেণী' : 'Session/Class'}</TableHead>
                  <TableHead>{bn ? 'রুম' : 'Room'}</TableHead>
                  <TableHead>{bn ? 'বেড' : 'Bed'}</TableHead>
                  <TableHead>{bn ? 'চেক-ইন' : 'Check-in'}</TableHead>
                  <TableHead>{bn ? 'ফি মোড' : 'Fee Mode'}</TableHead>
                  <TableHead>{bn ? 'মাসিক চার্জ' : 'Monthly'}</TableHead>
                  <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {allocations.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Badge variant={a.occupant_type === 'staff' ? 'secondary' : 'outline'}>
                          {a.occupant_type === 'staff' ? (bn ? 'স্টাফ' : 'Staff') : (bn ? 'ছাত্র' : 'Student')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{occupantLabel(a)}</TableCell>
                      <TableCell className="text-xs">
                        {a.occupant_type === 'student' ? (
                          <>
                            <div>{sessionLabel(a.academic_session_id)}</div>
                            <div className="text-muted-foreground">{classLabel(a.class_id)}</div>
                          </>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{roomLabel(a.room_id)}</TableCell>
                      <TableCell>{a.bed_number || '—'}</TableCell>
                      <TableCell>{a.check_in_date}</TableCell>
                      <TableCell>
                        <Badge variant={a.fee_mode === 'free' ? 'default' : a.fee_mode === 'discount' ? 'secondary' : 'outline'}>
                          {a.fee_mode === 'free' ? (bn ? 'ফ্রি' : 'Free') : a.fee_mode === 'discount' ? (bn ? `ডিসকাউন্ট ${a.discount_percent}%` : `Discount ${a.discount_percent}%`) : (bn ? 'পূর্ণ ফি' : 'Full Fee')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">৳{Number(a.monthly_charge).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {canEditItem && (
                          <Button size="icon" variant="ghost" onClick={() => { setEditAlloc(a); setAllocForm(a); setAllocDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                        )}
                        {canDeleteItem && (
                          <Button size="icon" variant="ghost" onClick={() => setDelAllocId(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allocations.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">{bn ? 'কোনো বরাদ্দ নেই' : 'No allocations yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEALS TAB */}
        <TabsContent value="meals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'সাপ্তাহিক খাবার মেনু' : 'Weekly Meal Menu'}</CardTitle>
              {canAddItem && (
                <Button onClick={() => { setEditMeal(null); setMealForm({ day_of_week: 'Saturday', meal_type: 'breakfast' }); setMealDlg(true); }}>
                  <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন' : 'New'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{bn ? 'হোস্টেল' : 'Hostel'}</TableHead>
                  <TableHead>{bn ? 'বার' : 'Day'}</TableHead>
                  <TableHead>{bn ? 'খাবার' : 'Meal'}</TableHead>
                  <TableHead>{bn ? 'আইটেম' : 'Items'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {meals.map(m => {
                    const dayIdx = DAYS.indexOf(m.day_of_week);
                    const mt = MEAL_TYPES.find(x => x.v === m.meal_type);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>{hostelLabel(m.hostel_id)}</TableCell>
                        <TableCell>{bn && dayIdx >= 0 ? DAYS_BN[dayIdx] : m.day_of_week}</TableCell>
                        <TableCell>{mt ? (bn ? mt.bn : mt.en) : m.meal_type}</TableCell>
                        <TableCell className="max-w-md truncate">{bn ? (m.items_bn || m.items) : m.items}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {canEditItem && (
                            <Button size="icon" variant="ghost" onClick={() => { setEditMeal(m); setMealForm(m); setMealDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                          )}
                          {canDeleteItem && (
                            <Button size="icon" variant="ghost" onClick={() => setDelMealId(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {meals.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{bn ? 'কোনো মেনু নেই' : 'No menu yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEAL ATTENDANCE TAB */}
        <TabsContent value="meal-attendance">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5" />{bn ? '৩ বেলা খাবারের হাজিরা' : '3-Meal Attendance'}</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">{bn ? 'তারিখ' : 'Date'}</Label>
                <DatePicker value={attDate} onChange={setAttDate} className="w-[180px]" bengali={bn} />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="mark" className="space-y-4">
                <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
                  <TabsList className="inline-flex gap-1 bg-gradient-to-b from-muted/70 to-muted/40 backdrop-blur-xl p-1 rounded-2xl border border-border/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] h-auto">
                    <TabsTrigger value="mark" className="group flex items-center gap-1.5 md:gap-2 rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm font-medium whitespace-nowrap text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12),0_0_0_1px_hsl(var(--border))]">
                      <CalendarCheck className="w-4 h-4 opacity-70 group-data-[state=active]:opacity-100" />
                      {bn ? 'হাজিরা দিন' : 'Mark Attendance'}
                    </TabsTrigger>
                    {isAdmin && (
                      <TabsTrigger value="lock" className="group flex items-center gap-1.5 md:gap-2 rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm font-medium whitespace-nowrap text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12),0_0_0_1px_hsl(var(--border))]">
                        <Lock className="w-4 h-4 opacity-70 group-data-[state=active]:opacity-100" />
                        {bn ? 'লক সেটিং' : 'Lock Settings'}
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>


                {isAdmin && (
                  <TabsContent value="lock">
                    <div className="p-4 rounded-xl border border-border/60 bg-card">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="w-4 h-4 text-primary" />{bn ? 'হাজিরা লক সেটিং' : 'Attendance Lock Settings'}</div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">{bn ? 'সক্রিয়' : 'Enabled'}</Label>
                          <Switch checked={cf.enabled} onCheckedChange={(v) => setCutoffForm({ ...cf, enabled: v })} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{bn ? 'নির্ধারিত শুরু সময়ের আগে বা শেষ সময়ের পরে এডমিন ছাড়া অন্যরা সেই বেলার হাজিরা দিতে পারবে না। এডমিন যেকোনো তারিখের হাজিরা দিতে ও পরিবর্তন করতে পারবে।' : 'Before the start time or after the end time, non-admins cannot mark that meal. Admins can mark/edit any date.'}</p>
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                        {renderCutoffTimePicker('breakfast_start', bn ? 'সকাল শুরু' : 'Breakfast start')}
                        {renderCutoffTimePicker('lunch_start', bn ? 'দুপুর শুরু' : 'Lunch start')}
                        {renderCutoffTimePicker('dinner_start', bn ? 'রাত শুরু' : 'Dinner start')}
                        {renderCutoffTimePicker('breakfast', bn ? 'সকাল শেষ' : 'Breakfast end')}
                        {renderCutoffTimePicker('lunch', bn ? 'দুপুর শেষ' : 'Lunch end')}
                        {renderCutoffTimePicker('dinner', bn ? 'রাত শেষ' : 'Dinner end')}
                      </div>
                      {cutoffForm && (
                        <div className="flex justify-end mt-3">
                          <Button size="sm" onClick={() => saveCutoffs.mutate(cf)} disabled={saveCutoffs.isPending}>
                            <Save className="w-4 h-4 mr-1.5" />{bn ? 'সেভ করুন' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="mark" className="space-y-0">
              {/* Step 1 & 2: pick meal + category */}
              <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4 p-3 rounded-xl bg-muted/40">
                <div className="w-full lg:w-56">
                  <Label className="text-xs">{bn ? '১. বেলা বাছাই' : '1. Select Meal'}</Label>
                  <Select value={attMeal} onValueChange={(v: any) => setAttMeal(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">{bn ? 'সকাল (নাশতা)' : 'Breakfast'}</SelectItem>
                      <SelectItem value="lunch">{bn ? 'দুপুর' : 'Lunch'}</SelectItem>
                      <SelectItem value="dinner">{bn ? 'রাত' : 'Dinner'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full lg:w-56">
                  <Label className="text-xs">{bn ? '২. ধরন বাছাই' : '2. Select Category'}</Label>
                  <Select value={attCat} onValueChange={(v: any) => { setAttCat(v); setAttSearch(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
                      <SelectItem value="staff">{bn ? 'শিক্ষক/স্টাফ' : 'Teacher/Staff'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">{bn ? 'খুঁজুন' : 'Search'}</Label>
                  <Input value={attSearch} onChange={e => setAttSearch(e.target.value)} placeholder={bn ? 'নাম বা আইডি' : 'Name or ID'} />
                </div>
              </div>


              {attLocked && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  <Lock className="w-4 h-4 shrink-0" />
                  {bn
                    ? (beforeStart
                        ? `এই বেলার হাজিরা ${to12h(cf[`${attMeal}_start` as CutoffKey])} থেকে শুরু হবে — এখনো সময় হয়নি। এডমিনের সাথে যোগাযোগ করুন।`
                        : `এই তারিখ ও বেলার (${to12h(cf[attMeal])}) সময় শেষ — হাজিরা দেওয়া বন্ধ। এডমিনের সাথে যোগাযোগ করুন।`)
                    : (beforeStart
                        ? `Attendance for this meal opens at ${to12h(cf[`${attMeal}_start` as CutoffKey])} — not started yet. Contact an admin.`
                        : `The time for this date & meal (${to12h(cf[attMeal])}) has passed — attendance is locked. Contact an admin.`)}
                </div>
              )}

              {attCat === 'student' && !mealSelectedClassId ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {mealClassSummaries.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-8 text-sm">{bn ? 'কোনো ক্লাস নেই' : 'No classes'}</div>
                  )}
                  {mealClassSummaries.map(cs => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => setMealSelectedClassId(cs.id)}
                      className="text-left rounded-2xl border border-border/60 bg-card p-4 hover:-translate-y-[3px] hover:shadow-lg hover:border-primary/40 transition-all"
                    >
                      <div className="font-bold text-base mb-1.5 truncate">{cs.label}</div>
                      <div className="text-xs text-muted-foreground mb-2">{bn ? 'মোট' : 'Total'}: <span className="font-semibold text-foreground tabular-nums">{cs.total}</span></div>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 tabular-nums">{bn ? 'উপ' : 'P'}: {cs.present}</span>
                        <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 tabular-nums">{bn ? 'অনু' : 'A'}: {cs.absent}</span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 tabular-nums">{bn ? 'বাকি' : '—'}: {cs.unmarked}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
              <>
              {attCat === 'student' && mealSelectedClassId && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setMealSelectedClassId(null)}
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-border/50 bg-background/60 hover:bg-background hover:text-emerald-600 hover:border-emerald-200/60 transition-all"
                  >
                    ← {bn ? 'শ্রেণী তালিকায় ফিরুন' : 'Back to classes'}
                    <span className="text-muted-foreground">· {mealClassSummaries.find(c => c.id === mealSelectedClassId)?.label || ''}</span>
                  </button>
                </div>
              )}
              {/* Per-meal present/absent summary + export */}
              <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{mealLabel(attMeal)} · {attCat === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'শিক্ষক/স্টাফ' : 'Teacher/Staff')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={exportAttendance} disabled={attStats.total === 0}>
                    <Download className="w-4 h-4 mr-1.5" />{bn ? 'দৈনিক সেভ' : 'Daily'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPeriodReport('week')} disabled={attStats.total === 0}>
                    <Download className="w-4 h-4 mr-1.5" />{bn ? 'সাপ্তাহিক' : 'Weekly'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => printPeriodReport('week')} disabled={attStats.total === 0} title={bn ? 'সাপ্তাহিক প্রিন্ট' : 'Print weekly'}>
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPeriodReport('month')} disabled={attStats.total === 0}>
                    <Download className="w-4 h-4 mr-1.5" />{bn ? 'মাসিক' : 'Monthly'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => printPeriodReport('month')} disabled={attStats.total === 0} title={bn ? 'মাসিক প্রিন্ট' : 'Print monthly'}>
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>

              </div>
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{bn ? 'উপস্থিত' : 'Present'}</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{attStats.present}</p>
                </div>
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-destructive">{bn ? 'অনুপস্থিত' : 'Absent'}</p>
                  <p className="text-xl font-bold text-destructive tabular-nums">{attStats.absent}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">{bn ? 'দেওয়া হয়নি' : 'Not marked'}</p>
                  <p className="text-xl font-bold text-foreground/70 tabular-nums">{attStats.unmarked}</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-primary">{bn ? 'মোট' : 'Total'}</p>
                  <p className="text-xl font-bold text-primary tabular-nums">{attStats.total}</p>
                </div>
              </div>


              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader><TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                  <TableHead>{bn ? 'আইডি' : 'ID'}</TableHead>
                  {attCat === 'student' && <TableHead>{bn ? 'ক্লাস' : 'Class'}</TableHead>}
                  <TableHead className="text-center whitespace-nowrap">{bn ? 'হাজিরা' : 'Attendance'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {activeAttendanceRosterError && (
                    <TableRow>
                      <TableCell colSpan={attCat === 'student' ? 5 : 4} className="text-center text-destructive py-8">
                        {bn ? 'হাজিরা তালিকা লোড করা যাচ্ছে না — আপনার হোস্টেল পারমিশন চেক করুন' : 'Could not load attendance roster — check hostel permission'}
                      </TableCell>
                    </TableRow>
                  )}
                  {isAttendanceRosterLoading && !activeAttendanceRosterError && (
                    <TableRow>
                      <TableCell colSpan={attCat === 'student' ? 5 : 4} className="text-center text-muted-foreground py-8">
                        {bn ? 'তালিকা লোড হচ্ছে...' : 'Loading roster...'}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isAttendanceRosterLoading && !activeAttendanceRosterError && attRosterGroups.map((group) => (
                    <React.Fragment key={group.key}>
                      {attCat === 'student' && (
                        <TableRow className="hover:bg-transparent hover:translate-y-0">
                          <TableCell colSpan={5} className="bg-primary/10 border-y-2 border-primary/30 py-4">
                            <span className="text-lg font-extrabold text-primary">{group.label}</span>
                            <span className="ml-2 text-sm text-muted-foreground font-medium">({group.people.length} {bn ? 'জন' : ''})</span>
                          </TableCell>
                        </TableRow>
                      )}
                      {group.people.map((p: AttendanceRosterPerson, idx: number) => {
                        const rec = personAtt(attCat, p.id);
                        const present = !rec || rec[attMeal] === null || rec[attMeal] === undefined ? null : !!rec[attMeal];
                        const name = (bn ? p.name_bn : (p.name_en || p.name_bn)) || p.name_bn;
                        const code = p.person_code || '';
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{name}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{code || '—'}</TableCell>
                            {attCat === 'student' && <TableCell className="text-muted-foreground whitespace-nowrap">{classLabel(p.class_id) || '—'}</TableCell>}
                            <TableCell>
                              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                <Button
                                  size="sm"
                                  variant={present === true ? 'default' : 'outline'}
                                  disabled={attLocked}
                                  className={present === true ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                  onClick={() => saveAttendance.mutate({ person: { type: attCat, id: p.id, name: name + (code ? ` (${code})` : '') }, meal: attMeal, value: true })}
                                >
                                  {bn ? 'উপস্থিত' : 'Present'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={present === false ? 'destructive' : 'outline'}
                                  disabled={attLocked}
                                  onClick={() => saveAttendance.mutate({ person: { type: attCat, id: p.id, name: name + (code ? ` (${code})` : '') }, meal: attMeal, value: false })}
                                >
                                  {bn ? 'অনুপস্থিত' : 'Absent'}
                                </Button>
                                {present !== null && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={attLocked}
                                    className="text-muted-foreground hover:text-destructive"
                                    title={bn ? 'ক্লিয়ার করুন' : 'Clear'}
                                    onClick={() => confirmClearAttendance(p.id, name + (code ? ` (${code})` : ''))}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {!isAttendanceRosterLoading && !activeAttendanceRosterError && attRoster.length === 0 && <TableRow><TableCell colSpan={attCat === 'student' ? 5 : 4} className="text-center text-muted-foreground py-8">{bn ? 'কোনো ফলাফল নেই' : 'No results'}</TableCell></TableRow>}
                </TableBody>
              </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {activeAttendanceRosterError && (
                  <div className="text-center text-destructive py-8 text-sm">
                    {bn ? 'হাজিরা তালিকা লোড করা যাচ্ছে না — আপনার হোস্টেল পারমিশন চেক করুন' : 'Could not load attendance roster — check hostel permission'}
                  </div>
                )}
                {isAttendanceRosterLoading && !activeAttendanceRosterError && (
                  <div className="text-center text-muted-foreground py-8 text-sm">{bn ? 'তালিকা লোড হচ্ছে...' : 'Loading roster...'}</div>
                )}
                {!isAttendanceRosterLoading && !activeAttendanceRosterError && attRosterGroups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    {attCat === 'student' && (
                      <div className="bg-primary/10 border-y-2 border-primary/30 py-2 px-3 rounded-lg">
                        <span className="text-base font-extrabold text-primary">{group.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-medium">({group.people.length} {bn ? 'জন' : ''})</span>
                      </div>
                    )}
                    {group.people.map((p: AttendanceRosterPerson, idx: number) => {
                      const rec = personAtt(attCat, p.id);
                      const present = !rec || rec[attMeal] === null || rec[attMeal] === undefined ? null : !!rec[attMeal];
                      const name = (bn ? p.name_bn : (p.name_en || p.name_bn)) || p.name_bn;
                      const code = p.person_code || '';
                      return (
                        <div key={p.id} className="rounded-xl border bg-card p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                                <span className="font-semibold text-sm break-words">{name}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {code || '—'}{attCat === 'student' && classLabel(p.class_id) ? ` • ${classLabel(p.class_id)}` : ''}
                              </div>
                            </div>
                            {present !== null && (
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={attLocked}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                title={bn ? 'ক্লিয়ার করুন' : 'Clear'}
                                onClick={() => confirmClearAttendance(p.id, name + (code ? ` (${code})` : ''))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant={present === true ? 'default' : 'outline'}
                              disabled={attLocked}
                              className={`w-full ${present === true ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                              onClick={() => saveAttendance.mutate({ person: { type: attCat, id: p.id, name: name + (code ? ` (${code})` : '') }, meal: attMeal, value: true })}
                            >
                              {bn ? 'উপস্থিত' : 'Present'}
                            </Button>
                            <Button
                              size="sm"
                              variant={present === false ? 'destructive' : 'outline'}
                              disabled={attLocked}
                              className="w-full"
                              onClick={() => saveAttendance.mutate({ person: { type: attCat, id: p.id, name: name + (code ? ` (${code})` : '') }, meal: attMeal, value: false })}
                            >
                              {bn ? 'অনুপস্থিত' : 'Absent'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {!isAttendanceRosterLoading && !activeAttendanceRosterError && attRoster.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">{bn ? 'কোনো ফলাফল নেই' : 'No results'}</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">{bn ? 'বেলা ও ধরন বাছাই করুন, তারপর প্রত্যেকের নামের পাশে উপস্থিত/অনুপস্থিত চাপুন — স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।' : 'Pick a meal and category, then tap Present/Absent beside each name — it saves automatically.'}</p>
              </>
              )}
                </TabsContent>
              </Tabs>
            </CardContent>


          </Card>
        </TabsContent>
      </Tabs>

      {/* HOSTEL DIALOG */}
      <Dialog open={hostelDlg} onOpenChange={setHostelDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editHostel ? (bn ? 'হোস্টেল সম্পাদনা' : 'Edit Hostel') : (bn ? 'নতুন হোস্টেল' : 'New Hostel')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'নাম (ইং)' : 'Name (EN)'} *</Label><Input value={hostelForm.name || ''} onChange={e => setHostelForm({ ...hostelForm, name: e.target.value })} /></div>
              <div><Label>{bn ? 'নাম (বাং)' : 'Name (BN)'} *</Label><Input value={hostelForm.name_bn || ''} onChange={e => setHostelForm({ ...hostelForm, name_bn: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'ধরন' : 'Type'}</Label>
                <Select value={hostelForm.hostel_type || 'boys'} onValueChange={v => setHostelForm({ ...hostelForm, hostel_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boys">{bn ? 'ছেলেদের' : 'Boys'}</SelectItem>
                    <SelectItem value="girls">{bn ? 'মেয়েদের' : 'Girls'}</SelectItem>
                    <SelectItem value="mixed">{bn ? 'মিশ্র' : 'Mixed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{bn ? 'ক্যাপাসিটি' : 'Capacity'}</Label><NumberInput value={hostelForm.total_capacity} onValueChange={n => setHostelForm({ ...hostelForm, total_capacity: n })} /></div>
            </div>
            <div><Label>{bn ? 'ঠিকানা' : 'Address'}</Label><Textarea value={hostelForm.address || ''} onChange={e => setHostelForm({ ...hostelForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'ওয়ার্ডেন' : 'Warden'}</Label><Input value={hostelForm.warden_name || ''} onChange={e => setHostelForm({ ...hostelForm, warden_name: e.target.value })} /></div>
              <div><Label>{bn ? 'ফোন' : 'Phone'}</Label><Input value={hostelForm.warden_phone || ''} onChange={e => setHostelForm({ ...hostelForm, warden_phone: e.target.value })} /></div>
            </div>
            <div><Label>{bn ? 'নোট' : 'Notes'}</Label><Textarea value={hostelForm.notes || ''} onChange={e => setHostelForm({ ...hostelForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHostelDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveHostel.mutate(hostelForm)} disabled={!hostelForm.name || !hostelForm.name_bn}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ROOM DIALOG */}
      <Dialog open={roomDlg} onOpenChange={setRoomDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRoom ? (bn ? 'রুম সম্পাদনা' : 'Edit Room') : (bn ? 'নতুন রুম' : 'New Room')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'হোস্টেল' : 'Hostel'} *</Label>
              <Select value={roomForm.hostel_id || ''} onValueChange={v => setRoomForm({ ...roomForm, hostel_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'হোস্টেল বাছাই' : 'Select hostel'} /></SelectTrigger>
                <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{bn ? h.name_bn : h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'রুম নং' : 'Room #'} *</Label><Input value={roomForm.room_number || ''} onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })} /></div>
              <div><Label>{bn ? 'তলা' : 'Floor'}</Label><Input value={roomForm.floor || ''} onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'বেড সংখ্যা' : 'Beds'}</Label><NumberInput value={roomForm.bed_count} onValueChange={n => setRoomForm({ ...roomForm, bed_count: n })} /></div>
              <div><Label>{bn ? 'মাসিক ভাড়া' : 'Monthly Rent'}</Label><NumberInput value={roomForm.monthly_rent} onValueChange={n => setRoomForm({ ...roomForm, monthly_rent: n })} /></div>
            </div>
            <div><Label>{bn ? 'রুম টাইপ' : 'Room Type'}</Label>
              <Select value={roomForm.room_type || 'standard'} onValueChange={v => setRoomForm({ ...roomForm, room_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{bn ? 'সাধারণ' : 'Standard'}</SelectItem>
                  <SelectItem value="ac">{bn ? 'এসি' : 'AC'}</SelectItem>
                  <SelectItem value="deluxe">{bn ? 'ডিলাক্স' : 'Deluxe'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveRoom.mutate(roomForm)} disabled={!roomForm.hostel_id || !roomForm.room_number}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALLOCATION DIALOG */}
      <Dialog open={allocDlg} onOpenChange={setAllocDlg}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editAlloc ? (bn ? 'বরাদ্দ সম্পাদনা' : 'Edit Allocation') : (bn ? 'নতুন বরাদ্দ' : 'New Allocation')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Occupant Type */}
            <div>
              <Label>{bn ? 'আবাসিক ধরন' : 'Occupant Type'} *</Label>
              <Select
                value={allocForm.occupant_type || 'student'}
                onValueChange={(v: 'student' | 'staff') => setAllocForm({ ...allocForm, occupant_type: v, student_id: null, staff_id: null, academic_session_id: null, class_id: null })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{bn ? 'আবাসিক ছাত্র' : 'Resident Student'}</SelectItem>
                  <SelectItem value="staff">{bn ? 'আবাসিক স্টাফ' : 'Resident Staff'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Student-only: session + class filter */}
            {allocForm.occupant_type === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'শিক্ষাবর্ষ' : 'Academic Session'}</Label>
                    <Select value={allocForm.academic_session_id || ''} onValueChange={v => setAllocForm({ ...allocForm, academic_session_id: v, student_id: null })}>
                      <SelectTrigger><SelectValue placeholder={bn ? 'সেশন বাছাই' : 'Select session'} /></SelectTrigger>
                      <SelectContent>{(academicSessions as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{bn ? 'শ্রেণী' : 'Class'}</Label>
                    <Select value={allocForm.class_id || ''} onValueChange={v => setAllocForm({ ...allocForm, class_id: v, student_id: null })}>
                      <SelectTrigger><SelectValue placeholder={bn ? 'শ্রেণী বাছাই' : 'Select class'} /></SelectTrigger>
                      <SelectContent>{(classesList as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{bn ? 'ছাত্র' : 'Student'} * <span className="text-xs text-muted-foreground">({filteredStudents.length} {bn ? 'জন' : 'available'})</span></Label>
                  <Select value={allocForm.student_id || ''} onValueChange={v => setAllocForm({ ...allocForm, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'ছাত্র বাছাই' : 'Select student'} /></SelectTrigger>
                    <SelectContent className="max-h-60">{filteredStudents.map((s: any) => <SelectItem key={s.id} value={s.id}>{(bn ? s.name_bn : (s.name_en || s.name_bn))} ({s.student_id})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Staff selector */}
            {allocForm.occupant_type === 'staff' && (
              <div>
                <Label>{bn ? 'স্টাফ' : 'Staff'} *</Label>
                <Select value={allocForm.staff_id || ''} onValueChange={v => setAllocForm({ ...allocForm, staff_id: v })}>
                  <SelectTrigger><SelectValue placeholder={bn ? 'স্টাফ বাছাই' : 'Select staff'} /></SelectTrigger>
                  <SelectContent className="max-h-60">{(staffList as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{(bn ? s.name_bn : (s.name_en || s.name_bn))}{s.staff_id ? ` (${s.staff_id})` : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div><Label>{bn ? 'রুম' : 'Room'} *</Label>
              <Select
                value={allocForm.room_id || ''}
                onValueChange={v => {
                  const r = rooms.find(x => x.id === v);
                  const next = { ...allocForm, room_id: v };
                  if (r) next.monthly_charge = computeNetCharge({ ...next, room_id: v });
                  setAllocForm(next);
                }}
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'রুম বাছাই' : 'Select room'} /></SelectTrigger>
                <SelectContent className="max-h-60">{rooms.map(r => <SelectItem key={r.id} value={r.id}>{roomLabel(r.id)} (৳{r.monthly_rent}/{r.bed_count} beds)</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Fee Mode */}
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 space-y-3">
              <Label className="text-sm font-semibold">{bn ? 'ফি ব্যবস্থা' : 'Fee Arrangement'}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['free', 'full', 'discount'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      const next = { ...allocForm, fee_mode: mode };
                      next.monthly_charge = computeNetCharge(next);
                      setAllocForm(next);
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      allocForm.fee_mode === mode
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-background hover:bg-accent border border-border'
                    }`}
                  >
                    {mode === 'free' ? (bn ? '🎁 ফ্রি' : '🎁 Free') : mode === 'full' ? (bn ? '💰 পূর্ণ ফি' : '💰 Full Fee') : (bn ? '🏷️ ডিসকাউন্ট' : '🏷️ Discount')}
                  </button>
                ))}
              </div>
              {allocForm.fee_mode === 'discount' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{bn ? 'ডিসকাউন্ট %' : 'Discount %'}</Label>
                    <NumberInput
                      value={allocForm.discount_percent}
                      onValueChange={n => {
                        const next = { ...allocForm, discount_percent: n };
                        next.monthly_charge = computeNetCharge(next);
                        setAllocForm(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'অতিরিক্ত ছাড় (৳)' : 'Flat Discount (৳)'}</Label>
                    <NumberInput
                      value={allocForm.discount_amount}
                      onValueChange={n => {
                        const next = { ...allocForm, discount_amount: n };
                        next.monthly_charge = computeNetCharge(next);
                        setAllocForm(next);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'বেড নং' : 'Bed #'}</Label><NumberInput value={allocForm.bed_number} onValueChange={n => setAllocForm({ ...allocForm, bed_number: n })} /></div>
              <div>
                <Label>{bn ? 'মাসিক চার্জ (৳)' : 'Monthly Charge (৳)'}</Label>
                <NumberInput value={allocForm.monthly_charge} onValueChange={n => setAllocForm({ ...allocForm, monthly_charge: n })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">{bn ? 'চেক-ইন' : 'Check-in'}</Label>
                <DatePicker value={allocForm.check_in_date || ''} onChange={v => setAllocForm({ ...allocForm, check_in_date: v })} bengali={bn} clearable />
              </div>
              <div>
                <Label className="mb-1 block">{bn ? 'চেক-আউট' : 'Check-out'}</Label>
                <DatePicker value={allocForm.check_out_date || ''} onChange={v => setAllocForm({ ...allocForm, check_out_date: v })} bengali={bn} clearable />
              </div>
            </div>
            <div><Label>{bn ? 'স্ট্যাটাস' : 'Status'}</Label>
              <Select value={allocForm.status || 'active'} onValueChange={v => setAllocForm({ ...allocForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{bn ? 'সক্রিয়' : 'Active'}</SelectItem>
                  <SelectItem value="checked_out">{bn ? 'চেক-আউট' : 'Checked Out'}</SelectItem>
                  <SelectItem value="suspended">{bn ? 'স্থগিত' : 'Suspended'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button
              onClick={() => saveAlloc.mutate(allocForm)}
              disabled={
                !allocForm.room_id ||
                (allocForm.occupant_type === 'student' && !allocForm.student_id) ||
                (allocForm.occupant_type === 'staff' && !allocForm.staff_id)
              }
            >{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MEAL DIALOG */}
      <Dialog open={mealDlg} onOpenChange={setMealDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editMeal ? (bn ? 'মেনু সম্পাদনা' : 'Edit Menu') : (bn ? 'নতুন মেনু' : 'New Menu')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'হোস্টেল' : 'Hostel'} *</Label>
              <Select value={mealForm.hostel_id || ''} onValueChange={v => setMealForm({ ...mealForm, hostel_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'হোস্টেল বাছাই' : 'Select hostel'} /></SelectTrigger>
                <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{bn ? h.name_bn : h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'বার' : 'Day'}</Label>
                <Select value={mealForm.day_of_week || 'Saturday'} onValueChange={v => setMealForm({ ...mealForm, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={d} value={d}>{bn ? DAYS_BN[i] : d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{bn ? 'খাবার' : 'Meal'}</Label>
                <Select value={mealForm.meal_type || 'breakfast'} onValueChange={v => setMealForm({ ...mealForm, meal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEAL_TYPES.map(m => <SelectItem key={m.v} value={m.v}>{bn ? m.bn : m.en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{bn ? 'আইটেম (ইং)' : 'Items (EN)'} *</Label><Textarea value={mealForm.items || ''} onChange={e => setMealForm({ ...mealForm, items: e.target.value })} placeholder="Rice, Dal, Vegetables, Fish curry" /></div>
            <div><Label>{bn ? 'আইটেম (বাং)' : 'Items (BN)'}</Label><Textarea value={mealForm.items_bn || ''} onChange={e => setMealForm({ ...mealForm, items_bn: e.target.value })} placeholder="ভাত, ডাল, সবজি, মাছের তরকারি" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMealDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveMeal.mutate(mealForm)} disabled={!mealForm.hostel_id || !mealForm.items}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMS */}
      <DeleteConfirmDialog open={!!delHostelId} onOpenChange={() => setDelHostelId(null)} onConfirm={() => delHostelId && deleteHostel.mutate(delHostelId)} title={bn ? 'হোস্টেল মুছবেন?' : 'Delete hostel?'} />
      <DeleteConfirmDialog open={!!delRoomId} onOpenChange={() => setDelRoomId(null)} onConfirm={() => delRoomId && deleteRoom.mutate(delRoomId)} title={bn ? 'রুম মুছবেন?' : 'Delete room?'} />
      <DeleteConfirmDialog open={!!delAllocId} onOpenChange={() => setDelAllocId(null)} onConfirm={() => delAllocId && deleteAlloc.mutate(delAllocId)} title={bn ? 'বরাদ্দ মুছবেন?' : 'Delete allocation?'} />
      <DeleteConfirmDialog open={!!delMealId} onOpenChange={() => setDelMealId(null)} onConfirm={() => delMealId && deleteMeal.mutate(delMealId)} title={bn ? 'মেনু মুছবেন?' : 'Delete menu?'} />
    </div>
  );
};

export default AdminHostel;
