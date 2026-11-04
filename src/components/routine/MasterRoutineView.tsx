import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TimePicker } from '@/components/ui/time-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Printer, Plus, Minus, Save, Trash2, Clock, CheckSquare,
  X, Filter, Check, ChevronDown, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { to12HourFormat } from '@/hooks/useTimeFormat';

const DAYS = [
  { value: 0, label_bn: 'শনিবার', label_en: 'Saturday', short_bn: 'শনি', short_en: 'Sat' },
  { value: 1, label_bn: 'রবিবার', label_en: 'Sunday', short_bn: 'রবি', short_en: 'Sun' },
  { value: 2, label_bn: 'সোমবার', label_en: 'Monday', short_bn: 'সোম', short_en: 'Mon' },
  { value: 3, label_bn: 'মঙ্গলবার', label_en: 'Tuesday', short_bn: 'মঙ্গল', short_en: 'Tue' },
  { value: 4, label_bn: 'বুধবার', label_en: 'Wednesday', short_bn: 'বুধ', short_en: 'Wed' },
  { value: 5, label_bn: 'বৃহস্পতিবার', label_en: 'Thursday', short_bn: 'বৃহঃ', short_en: 'Thu' },
];

const PERIOD_LABELS_BN = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম', '১১তম', '১২তম'];

const toBn = (n: number | string) => String(n).replace(/\d/g, (d: string) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

const fmtTime = (t: string, bn: boolean) => to12HourFormat(t, bn);

/* ─── Cell Editor Popover ─── */
interface CellEditorProps {
  subjectId: string;
  teacherName: string;
  teacherNameBn: string;
  classId?: string;
  filterClassId?: string;
  subjects: any[];
  classes: any[];
  staff: any[];
  bn: boolean;
  onSave: (subjectId: string, teacherName: string, teacherNameBn: string, classId?: string) => void;
  children: React.ReactNode;
  showClassSelect?: boolean;
}

const CellEditor = ({
  subjectId,
  teacherName,
  teacherNameBn,
  classId,
  filterClassId,
  subjects,
  classes,
  staff,
  bn,
  onSave,
  children,
  showClassSelect,
}: CellEditorProps) => {
  const [open, setOpen] = useState(false);
  const [localSubjectId, setLocalSubjectId] = useState(subjectId);
  const [localTeacher, setLocalTeacher] = useState(teacherName);
  const [localTeacherBn, setLocalTeacherBn] = useState(teacherNameBn);
  const [localClassId, setLocalClassId] = useState(classId || '');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSubjectId(subjectId);
      setLocalTeacher(teacherName);
      setLocalTeacherBn(teacherNameBn);
      setLocalClassId(classId || '');
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    onSave(localSubjectId, localTeacher, localTeacherBn, localClassId || undefined);
    setOpen(false);
  };

  const handleClear = () => {
    onSave('none', '', '', localClassId || undefined);
    setOpen(false);
  };

  const handleStaffSelect = (staffId: string) => {
    const s = staff.find(st => st.id === staffId);
    if (s) {
      setLocalTeacher(s.name_en || s.name_bn || '');
      setLocalTeacherBn(s.name_bn || s.name_en || '');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen} modal={false}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-3.5 space-y-2.5 z-[250] shadow-xl border bg-card"
        align="center"
        onOpenAutoFocus={e => e.preventDefault()}
        side="top"
        avoidCollisions
      >
        <div className="flex items-center justify-between border-b pb-1.5">
          <Label className="text-xs font-bold text-foreground">
            {bn ? 'পিরিয়ড তথ্য সম্পাদনা' : 'Edit Period Slot'}
          </Label>
          {(localTeacherBn || localTeacher || localSubjectId !== 'none') && (
            <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40">
              {bn ? 'নির্ধারিত' : 'Assigned'}
            </Badge>
          )}
        </div>

        {showClassSelect && (
          <div>
            <Label className="text-xs font-medium">{bn ? 'শ্রেণী' : 'Class'}</Label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={localClassId}
              onChange={e => setLocalClassId(e.target.value)}
            >
              <option value="">{bn ? 'শ্রেণী নির্বাচন' : 'Select class'}</option>
              {classes.map(c => {
                const divName = bn ? c.divisions?.name_bn : c.divisions?.name;
                return (
                  <option key={c.id} value={c.id}>
                    {bn ? c.name_bn : c.name} {divName ? `(${divName})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div>
          <Label className="text-xs font-medium">{bn ? 'বিষয় নির্বাচন' : 'Subject'}</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={localSubjectId}
            onChange={e => setLocalSubjectId(e.target.value)}
          >
            <option value="none">{bn ? '-- কোনো বিষয় নেই (খালি) --' : '-- Empty --'}</option>
            {subjects
              .filter(s => {
                const cId = showClassSelect ? localClassId : filterClassId;
                if (!cId) return true;
                return !s.class_id || s.class_id === cId;
              })
              .map(s => (
                <option key={s.id} value={s.id}>
                  {bn ? s.name_bn : s.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs font-medium">{bn ? 'শিক্ষক নির্বাচন' : 'Select Teacher'}</Label>
            <span className="text-[10px] text-muted-foreground">{bn ? 'শিক্ষা বিভাগসহ' : 'With Dept'}</span>
          </div>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            value=""
            onChange={e => handleStaffSelect(e.target.value)}
          >
            <option value="">{bn ? '-- শিক্ষক বাছুন --' : '-- Pick teacher --'}</option>
            {staff.map(s => {
              const deptOrDesig = s.department || s.designation || '';
              const label = bn
                ? `${s.name_bn || s.name_en}${deptOrDesig ? ` (${deptOrDesig})` : ''}`
                : `${s.name_en || s.name_bn}${deptOrDesig ? ` (${deptOrDesig})` : ''}`;
              return (
                <option key={s.id} value={s.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">{bn ? 'শিক্ষক নাম (বাংলা)' : 'Name BN'}</Label>
            <Input
              className="h-7 text-xs"
              value={localTeacherBn}
              onChange={e => setLocalTeacherBn(e.target.value)}
              placeholder={bn ? 'নাম লিখুন' : 'Teacher name'}
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">{bn ? 'শিক্ষক নাম (ইংরেজি)' : 'Name EN'}</Label>
            <Input
              className="h-7 text-xs"
              value={localTeacher}
              onChange={e => setLocalTeacher(e.target.value)}
              placeholder="English name"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1.5 border-t">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1 text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
            onClick={handleClear}
          >
            <Trash2 className="h-3 w-3" />
            <span>{bn ? 'খালি করুন' : 'Clear'}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={handleSave}
          >
            <Save className="h-3 w-3" />
            <span>{bn ? 'সেভ করুন' : 'Save'}</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ─── Main Component ─── */
const MasterRoutineView = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [periodCount, setPeriodCount] = useState(8);
  const [breakAfter, setBreakAfter] = useState(4);
  const [periodTimes, setPeriodTimes] = useState<Record<number, { start: string; end: string }>>({});
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [classSearchTerm, setClassSearchTerm] = useState('');

  // Institution info
  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Academic sessions
  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-master-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Auto-select latest session
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSessionId) {
      const current = sessions.find((s: any) => s.is_current) || sessions[0];
      if (current) setSelectedSessionId(current.id);
    }
  }, [sessions, selectedSessionId]);

  // Divisions (শিক্ষা বিভাগসমূহ)
  const { data: divisions } = useQuery({
    queryKey: ['divisions-for-master-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Classes with their divisions
  const { data: allClasses } = useQuery({
    queryKey: ['all-classes-for-routine'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('*, divisions(id, name, name_bn)')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  // Subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, name_bn, class_id').eq('is_active', true).order('name');
      return data || [];
    },
  });

  // Staff / Teachers with department and designation
  const { data: staff } = useQuery({
    queryKey: ['staff-for-routine'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, department, designation')
        .eq('status', 'active')
        .order('name_bn');
      return data || [];
    },
  });

  // Filtered classes according to selected education department (division)
  const filteredClasses = useMemo(() => {
    if (!allClasses) return [];
    if (selectedDivisionId === 'all') return allClasses;
    return allClasses.filter(c => c.division_id === selectedDivisionId);
  }, [allClasses, selectedDivisionId]);

  // Classes currently shown in the Master Routine table
  const displayClasses = useMemo(() => {
    if (!filteredClasses) return [];
    if (selectedClassIds.length > 0) {
      return filteredClasses.filter(c => selectedClassIds.includes(c.id));
    }
    if (selectedClassId && selectedClassId !== 'all') {
      return filteredClasses.filter(c => c.id === selectedClassId);
    }
    return filteredClasses;
  }, [filteredClasses, selectedClassIds, selectedClassId]);

  const isAllClasses = selectedClassId === 'all' || selectedClassIds.length > 0;

  // Single class routine
  const { data: routine } = useQuery({
    queryKey: ['class-routine', selectedSessionId, selectedClassId],
    queryFn: async () => {
      if (!selectedSessionId || !selectedClassId || isAllClasses) return null;
      const { data } = await supabase
        .from('class_routines')
        .select('id, class_id, name, name_bn')
        .eq('academic_session_id', selectedSessionId)
        .eq('class_id', selectedClassId)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedSessionId && !!selectedClassId && !isAllClasses,
  });

  // All routines for all classes in this session
  const { data: allRoutines } = useQuery({
    queryKey: ['all-class-routines', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return [];
      const { data } = await supabase
        .from('class_routines')
        .select('id, class_id, name, name_bn')
        .eq('academic_session_id', selectedSessionId)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!selectedSessionId,
  });

  // All periods for routines in this session
  const { data: allClassesPeriods } = useQuery({
    queryKey: ['all-classes-periods', allRoutines?.map(r => r.id).join(',')],
    queryFn: async () => {
      if (!allRoutines?.length) return [];
      const routineIds = allRoutines.map(r => r.id);
      const { data } = await supabase
        .from('routine_periods')
        .select('*, subjects(name, name_bn)')
        .in('routine_id', routineIds)
        .order('period_number');
      return data || [];
    },
    enabled: !!allRoutines?.length,
  });

  // All periods for single routine (weekly view)
  const { data: allPeriods } = useQuery({
    queryKey: ['weekly-routine-periods', routine?.id],
    queryFn: async () => {
      if (!routine?.id) return [];
      const { data } = await supabase
        .from('routine_periods')
        .select('*, subjects(name, name_bn)')
        .eq('routine_id', routine.id)
        .order('period_number');
      return data || [];
    },
    enabled: !!routine?.id,
  });

  // Period columns with break
  const periodColumns = useMemo(() => {
    const cols: { num: number; isBreak: boolean }[] = [];
    let pNum = 1;
    for (let i = 1; i <= periodCount; i++) {
      if (i === breakAfter + 1) {
        cols.push({ num: -1, isBreak: true });
      }
      cols.push({ num: pNum, isBreak: false });
      pNum++;
    }
    if (breakAfter >= periodCount) {
      cols.push({ num: -1, isBreak: true });
    }
    return cols;
  }, [periodCount, breakAfter]);

  // Period labels map
  let pIdx = 0;
  const periodLabelsMap: Record<number, string> = {};
  periodColumns.forEach(col => {
    if (!col.isBreak) {
      pIdx++;
      periodLabelsMap[col.num] = bn ? (PERIOD_LABELS_BN[pIdx - 1] || toBn(pIdx)) : `P${pIdx}`;
    }
  });

  // Pre-populate period start and end times from DB periods
  useEffect(() => {
    const sourcePeriods = allClassesPeriods || allPeriods;
    if (sourcePeriods && sourcePeriods.length > 0) {
      setPeriodTimes(prev => {
        const next = { ...prev };
        let changed = false;
        sourcePeriods.forEach((p: any) => {
          if (p.period_number && p.start_time && (!next[p.period_number] || !next[p.period_number].start)) {
            next[p.period_number] = {
              start: p.start_time,
              end: p.end_time || '',
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [allClassesPeriods, allPeriods]);

  // Helper to get period time
  const getPeriodTime = useCallback((periodNum: number) => {
    if (periodTimes[periodNum] && periodTimes[periodNum].start) {
      return periodTimes[periodNum];
    }
    const source = allClassesPeriods || allPeriods;
    if (source) {
      const p = source.find((pp: any) => pp.period_number === periodNum && !pp.is_break && pp.start_time);
      if (p) return { start: p.start_time || '', end: p.end_time || '' };
    }
    return { start: '', end: '' };
  }, [periodTimes, allClassesPeriods, allPeriods]);

  // Save period time across all classes for that period number
  const handleSavePeriodTimeToAllClasses = async (periodNum: number, start: string, end: string) => {
    if (!start || !end) {
      toast.error(bn ? 'শুরু এবং শেষ সময় উভয়ই নির্বাচন করুন' : 'Both start and end time required');
      return;
    }
    setPeriodTimes(prev => ({ ...prev, [periodNum]: { start, end } }));

    if (!selectedSessionId) {
      toast.success(bn ? 'সময় আপডেট হয়েছে' : 'Time updated locally');
      return;
    }

    try {
      if (allRoutines && allRoutines.length > 0) {
        const routineIds = allRoutines.map(r => r.id);
        const { error } = await supabase
          .from('routine_periods')
          .update({ start_time: start, end_time: end })
          .in('routine_id', routineIds)
          .eq('period_number', periodNum);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['all-classes-periods'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(
        bn
          ? `${periodLabelsMap[periodNum]} পিরিয়ডের সময় সংরক্ষিত হয়েছে (${fmtTime(start, bn)} - ${fmtTime(end, bn)})`
          : `Period ${periodNum} time saved`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(bn ? 'সময় সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save period time');
    }
  };

  // Save or delete a single period slot in Master Grid (All/Multi Classes mode)
  const handleSaveMasterCell = async (
    targetClassId: string,
    periodNum: number,
    subjectId: string,
    teacherName: string,
    teacherNameBn: string
  ) => {
    try {
      let routineId = allRoutines?.find(r => r.class_id === targetClassId)?.id;

      // Auto-create class_routine if not exists
      if (!routineId) {
        const cls = allClasses?.find(c => c.id === targetClassId);
        const { data: newR, error } = await supabase
          .from('class_routines')
          .insert({
            class_id: targetClassId,
            academic_session_id: selectedSessionId,
            name: cls?.name || 'Routine',
            name_bn: cls?.name_bn || 'রুটিন',
            is_active: true,
          })
          .select('id')
          .single();

        if (error) throw error;
        routineId = newR.id;
      }

      const { data: existing } = await supabase
        .from('routine_periods')
        .select('id')
        .eq('routine_id', routineId)
        .eq('day_of_week', selectedDay)
        .eq('period_number', periodNum)
        .maybeSingle();

      // Clear cell action
      if (subjectId === 'none' || (!subjectId && !teacherName && !teacherNameBn)) {
        if (existing) {
          const { error: delErr } = await supabase.from('routine_periods').delete().eq('id', existing.id);
          if (delErr) throw delErr;
        }
        queryClient.invalidateQueries({ queryKey: ['all-classes-periods'] });
        queryClient.invalidateQueries({ queryKey: ['all-class-routines'] });
        toast.success(bn ? 'পিরিয়ড খালি করা হয়েছে' : 'Period cleared');
        return;
      }

      const time = getPeriodTime(periodNum);
      const periodData = {
        routine_id: routineId,
        day_of_week: selectedDay,
        period_number: periodNum,
        subject_id: subjectId || null,
        teacher_name: teacherName || null,
        teacher_name_bn: teacherNameBn || null,
        is_break: false,
        start_time: time.start || '08:00',
        end_time: time.end || '08:45',
      };

      if (existing) {
        const { error: updErr } = await supabase.from('routine_periods').update(periodData).eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('routine_periods').insert(periodData);
        if (insErr) throw insErr;
      }

      queryClient.invalidateQueries({ queryKey: ['all-classes-periods'] });
      queryClient.invalidateQueries({ queryKey: ['all-class-routines'] });
      toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (bn ? 'সেভ ব্যর্থ হয়েছে' : 'Save failed'));
    }
  };

  // Remove a class from the current routine view
  const handleRemoveClassFromView = (classId: string) => {
    const currentList = displayClasses.map(c => c.id);
    const nextList = currentList.filter(id => id !== classId);
    setSelectedClassIds(nextList);
    toast.info(bn ? 'ক্লাসটি ভিউ থেকে সরানো হয়েছে' : 'Class removed from view');
  };

  // Delete all routine periods for a class
  const handleDeleteClassRoutine = async (classId: string, className: string) => {
    const confirmMsg = bn
      ? `আপনি কি নিশ্চিত যে "${className}" শ্রেণীর রুটিনের সকল পিরিয়ড মুছে ফেলতে চান?`
      : `Are you sure you want to clear all routine periods for "${className}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const routineId = allRoutines?.find(r => r.class_id === classId)?.id;
      if (routineId) {
        const { error } = await supabase.from('routine_periods').delete().eq('routine_id', routineId);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['all-classes-periods'] });
      queryClient.invalidateQueries({ queryKey: ['all-class-routines'] });
      toast.success(bn ? `"${className}" শ্রেণীর রুটিন মুছে ফেলা হয়েছে` : `Routine deleted for ${className}`);
    } catch (err: any) {
      toast.error(err.message || (bn ? 'মুছতে ব্যর্থ হয়েছে' : 'Failed to delete'));
    }
  };

  // Single Class Save cell mutation
  const saveSingleCellMutation = useMutation({
    mutationFn: async ({
      dayOfWeek,
      periodNum,
      subjectId,
      teacherName,
      teacherNameBn,
    }: {
      dayOfWeek: number;
      periodNum: number;
      subjectId: string;
      teacherName: string;
      teacherNameBn: string;
    }) => {
      let routineId = routine?.id;

      if (!routineId) {
        const cls = allClasses?.find(c => c.id === selectedClassId);
        const { data: newRoutine, error } = await supabase
          .from('class_routines')
          .insert({
            class_id: selectedClassId,
            academic_session_id: selectedSessionId,
            name: cls?.name || 'Routine',
            name_bn: cls?.name_bn || 'রুটিন',
            is_active: true,
          })
          .select('id')
          .single();
        if (error) throw error;
        routineId = newRoutine.id;
      }

      const { data: existing } = await supabase
        .from('routine_periods')
        .select('id')
        .eq('routine_id', routineId)
        .eq('day_of_week', dayOfWeek)
        .eq('period_number', periodNum)
        .maybeSingle();

      if (subjectId === 'none' || (!subjectId && !teacherName && !teacherNameBn)) {
        if (existing) {
          await supabase.from('routine_periods').delete().eq('id', existing.id);
        }
        return;
      }

      const time = getPeriodTime(periodNum);
      const periodData = {
        routine_id: routineId,
        day_of_week: dayOfWeek,
        period_number: periodNum,
        subject_id: subjectId || null,
        teacher_name: teacherName || null,
        teacher_name_bn: teacherNameBn || null,
        is_break: false,
        start_time: time.start || '08:00',
        end_time: time.end || '08:45',
      };

      if (existing) {
        const { error } = await supabase.from('routine_periods').update(periodData).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routine_periods').insert(periodData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      queryClient.invalidateQueries({ queryKey: ['class-routine'] });
      toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
    },
    onError: () => toast.error(bn ? 'সেভ ব্যর্থ হয়েছে' : 'Save failed'),
  });

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);
  const selectedCls = allClasses?.find(c => c.id === selectedClassId);
  const instName = bn ? institution?.name : (institution?.name_en || institution?.name);

  // Print handler
  const handlePrint = () => {
    const el = document.getElementById('master-routine-print');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${bn ? 'ক্লাস রুটিন' : 'Class Routine'}</title>
    <style>@font-face{font-family:"Kalpurush";src:url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");font-display:block;}</style>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Kalpurush', 'Noto Sans Bengali', sans-serif; padding: 10px; }
      @page { size: A4 landscape; margin: 8mm; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1.5px solid #333; text-align: center; vertical-align: middle; }
      th { background: #d4edda; font-weight: 700; }
      .header { text-align: center; margin-bottom: 8px; }
      .header h1 { font-size: 18px; font-weight: 700; }
      .header p { font-size: 11px; margin: 2px 0; }
      .break-col { background: #c8e6c9 !important; writing-mode: vertical-rl; text-orientation: mixed; font-weight: 700; font-size: 10px; min-width: 26px; max-width: 30px; }
      .cell-top { font-weight: 600; font-size: 9.5px; padding: 2px 3px; border-bottom: 1px solid #999; min-height: 18px; }
      .cell-bottom { font-size: 8px; color: #555; padding: 2px 3px; min-height: 18px; }
      .day-cell { background: #f5f5f5; font-weight: 700; font-size: 11px; white-space: nowrap; padding: 6px 8px; }
      .print-hidden, .no-print { display: none !important; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-hidden { display: none !important; } }
    </style></head><body><div>`);
    w.document.write(el.innerHTML);
    w.document.write('</div></body></html>');
    w.document.close();
    const check = setInterval(() => {
      if (w.document.readyState === 'complete') {
        clearInterval(check);
        setTimeout(() => { w.print(); w.close(); }, 300);
      }
    }, 100);
  };

  const thStyle = "border border-border bg-emerald-100/80 dark:bg-emerald-900/30 px-1 py-1.5 text-center font-bold text-[11px]";
  const breakThStyle = "border border-border bg-emerald-200 dark:bg-emerald-800/40 font-bold text-[10px]";

  return (
    <div className="space-y-4">
      {/* ─── Top Filter & Control Bar ─── */}
      <div className="p-3.5 bg-card border rounded-xl shadow-sm space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          {/* Academic Session */}
          <div className="min-w-[160px] flex-1 sm:flex-initial">
            <Label className="text-xs font-semibold">{bn ? 'একাডেমিক সেশন' : 'Session'}</Label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={bn ? 'সেশন নির্বাচন' : 'Select session'} />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                {sessions?.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {bn ? s.name_bn || s.name : s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Education Department / Division */}
          <div className="min-w-[150px] flex-1 sm:flex-initial">
            <Label className="text-xs font-semibold">{bn ? 'শিক্ষা বিভাগ' : 'Education Division'}</Label>
            <Select
              value={selectedDivisionId}
              onValueChange={v => {
                setSelectedDivisionId(v);
                setSelectedClassIds([]);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                <SelectItem value="all" className="text-xs font-medium">
                  {bn ? 'সকল শিক্ষা বিভাগ' : 'All Divisions'}
                </SelectItem>
                {divisions?.map(d => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {bn ? d.name_bn : d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Single Class or All Switcher */}
          <div className="min-w-[150px] flex-1 sm:flex-initial">
            <Label className="text-xs font-semibold">{bn ? 'শ্রেণী মোড' : 'Class Mode'}</Label>
            <Select
              value={selectedClassId}
              onValueChange={v => {
                setSelectedClassId(v);
                if (v !== 'all') setSelectedClassIds([]);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={bn ? 'সব শ্রেণী' : 'All Classes'} />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                <SelectItem value="all" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {bn ? 'প্রতিদিনের মাস্টার রুটিন (সব/মাল্টিপল)' : 'Daily Master Routine (All/Multi)'}
                </SelectItem>
                {filteredClasses.map(c => {
                  const divName = bn ? c.divisions?.name_bn : c.divisions?.name;
                  return (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {bn ? c.name_bn : c.name} {divName ? `(${divName})` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-Class Selector Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5 border-dashed border-emerald-500/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>{bn ? 'মাল্টিপল ক্লাস নির্বাচন' : 'Multi-Class Select'}</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                >
                  {displayClasses.length} {bn ? 'টি' : ''}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3 space-y-2.5 z-[250] shadow-xl" align="start">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-emerald-600" />
                  {bn ? 'রুটিনে প্রদর্শনের জন্য ক্লাস নির্বাচন' : 'Select Classes to Display'}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {displayClasses.length}/{filteredClasses.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-6 px-2 flex-1"
                  onClick={() => setSelectedClassIds(filteredClasses.map(c => c.id))}
                >
                  {bn ? 'সব নির্বাচন' : 'Select All'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-6 px-2 flex-1"
                  onClick={() => setSelectedClassIds([])}
                >
                  {bn ? 'রিসেট (সব দেখান)' : 'Reset'}
                </Button>
              </div>

              <Input
                placeholder={bn ? 'শ্রেণী খুঁজুন...' : 'Search class...'}
                value={classSearchTerm}
                onChange={e => setClassSearchTerm(e.target.value)}
                className="h-7 text-xs"
              />

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 border rounded-md p-1 bg-muted/20">
                {filteredClasses
                  .filter(cls => {
                    if (!classSearchTerm.trim()) return true;
                    const term = classSearchTerm.toLowerCase();
                    return (
                      cls.name_bn.toLowerCase().includes(term) ||
                      cls.name.toLowerCase().includes(term) ||
                      (cls.divisions?.name_bn || '').toLowerCase().includes(term)
                    );
                  })
                  .map(cls => {
                    const isChecked = displayClasses.some(c => c.id === cls.id);
                    const divName = bn ? cls.divisions?.name_bn : cls.divisions?.name;
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center justify-between gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-accent transition-colors ${
                          isChecked ? 'bg-emerald-50 dark:bg-emerald-950/20 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                const next = displayClasses.filter(c => c.id !== cls.id).map(c => c.id);
                                setSelectedClassIds(next);
                              } else {
                                setSelectedClassIds([...displayClasses.map(c => c.id), cls.id]);
                              }
                            }}
                            className="rounded border-input text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <span className="text-foreground">{bn ? cls.name_bn : cls.name}</span>
                        </div>
                        {divName && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {divName}
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Period Count Controls */}
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs font-semibold">{bn ? 'পিরিয়ড সংখ্যা' : 'Periods'}</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-8"
                  onClick={() => setPeriodCount(p => Math.max(1, p - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-bold w-6 text-center">{bn ? toBn(periodCount) : periodCount}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-8"
                  onClick={() => setPeriodCount(p => Math.min(12, p + 1))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'বিরতি পিরিয়ড' : 'Break after'}</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-8"
                  onClick={() => setBreakAfter(p => Math.max(1, p - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-bold w-6 text-center">{bn ? toBn(breakAfter) : breakAfter}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-8"
                  onClick={() => setBreakAfter(p => Math.min(periodCount, p + 1))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['all-classes-periods'] });
                queryClient.invalidateQueries({ queryKey: ['all-class-routines'] });
                queryClient.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
                toast.success(bn ? 'রিফ্রেশ সম্পন্ন' : 'Refreshed');
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{bn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 bg-background" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 text-foreground" />
              <span>{bn ? 'প্রিন্ট রুটিন' : 'Print'}</span>
            </Button>
          </div>
        </div>

        {/* Selected Classes Tag Cloud */}
        {selectedClassIds.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t text-xs">
            <span className="text-muted-foreground text-[11px] font-medium">
              {bn ? 'নির্বাচিত ক্লাস:' : 'Selected Classes:'}
            </span>
            {displayClasses.map(c => (
              <Badge
                key={c.id}
                variant="secondary"
                className="gap-1 text-[11px] font-normal py-0.5 px-2 bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <span>{bn ? c.name_bn : c.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveClassFromView(c.id)}
                  className="hover:text-destructive focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button
              type="button"
              onClick={() => setSelectedClassIds([])}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
            >
              {bn ? 'সব ক্লাস দেখান' : 'Show All'}
            </button>
          </div>
        )}
      </div>

      {!selectedSessionId ? (
        <div className="py-12 text-center text-muted-foreground">
          {bn ? 'অনুগ্রহ করে একটি একাডেমিক সেশন নির্বাচন করুন' : 'Select an academic session'}
        </div>
      ) : isAllClasses ? (
        /* ─── All Classes Daily Master Grid (Rows = Classes, Columns = Periods) ─── */
        <div id="master-routine-print">
          <div className="border-2 border-border rounded-xl overflow-hidden bg-background shadow-sm">
            {/* Header */}
            <div className="text-center py-3 px-4 border-b-2 border-border relative bg-muted/20">
              {institution?.logo_url && (
                <img src={institution.logo_url} alt="" className="w-12 h-12 object-contain mx-auto mb-1" />
              )}
              <h1 className="text-lg font-bold text-foreground leading-tight">
                {instName || (bn ? 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা' : 'Madrasah Name')}
              </h1>
              {institution?.address && <p className="text-[10px] text-muted-foreground">{institution.address}</p>}
              <p className="text-xs font-semibold text-foreground mt-0.5">
                {bn ? 'মাস্টার রুটিন' : 'Master Routine'} —{' '}
                {selectedSession ? (bn ? selectedSession.name_bn || selectedSession.name : selectedSession.name) : ''}
              </p>
            </div>

            {/* Day Selector Tabs (শনি, রবি, সোম, মঙ্গল, বুধ, বৃহ) */}
            <div className="flex items-center justify-between gap-1 p-2 border-b border-border flex-wrap bg-muted/10">
              <div className="flex gap-1 flex-wrap">
                {DAYS.map(day => (
                  <Button
                    key={day.value}
                    size="sm"
                    variant={selectedDay === day.value ? 'default' : 'outline'}
                    className={`text-xs h-7 px-3.5 font-bold transition-all ${
                      selectedDay === day.value
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedDay(day.value)}
                  >
                    {bn ? day.short_bn : day.short_en}
                  </Button>
                ))}
              </div>

              <div className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/60 print-hidden">
                <span>{bn ? 'দিনের রুটিন:' : 'Day:'} </span>
                <span className="font-bold text-foreground">{bn ? DAYS[selectedDay]?.label_bn : DAYS[selectedDay]?.label_en}</span>
              </div>
            </div>

            {/* Master Grid Table */}
            <div className="overflow-x-auto p-2">
              <table className="w-full border-collapse" style={{ minWidth: periodColumns.length * 90 + 160 }}>
                <thead>
                  <tr>
                    <th className={thStyle} style={{ minWidth: 150 }}>
                      <div className="font-bold text-xs">{bn ? 'শ্রেণী / পিরিয়ড' : 'Class / Period'}</div>
                      <div className="text-[9px] font-normal text-muted-foreground">
                        {bn ? `(${displayClasses.length} টি ক্লাস)` : `(${displayClasses.length} Classes)`}
                      </div>
                    </th>
                    {periodColumns.map((col, idx) => {
                      if (col.isBreak) {
                        return (
                          <th
                            key={`br-${idx}`}
                            className={breakThStyle}
                            style={{
                              writingMode: 'vertical-rl',
                              textOrientation: 'mixed',
                              padding: '8px 2px',
                              minWidth: 32,
                              maxWidth: 36,
                            }}
                          >
                            {bn ? 'বিরতি' : 'Break'}
                          </th>
                        );
                      }
                      const time = getPeriodTime(col.num);
                      return (
                        <th key={col.num} className={thStyle}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full cursor-pointer hover:bg-emerald-200/60 dark:hover:bg-emerald-800/40 p-1 rounded transition-colors focus:outline-none"
                              >
                                <div className="font-bold text-xs">{periodLabelsMap[col.num]}</div>
                                <div className="text-[9px] font-medium text-emerald-800 dark:text-emerald-200 mt-0.5 flex items-center justify-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 opacity-70 print-hidden" />
                                  <span>
                                    {time.start
                                      ? `${fmtTime(time.start, bn)} - ${fmtTime(time.end, bn)}`
                                      : (bn ? 'সময় দিন' : 'Set Time')}
                                  </span>
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 space-y-2.5 z-[250] shadow-xl" align="center">
                              <div className="flex items-center justify-between border-b pb-1.5">
                                <Label className="text-xs font-bold">
                                  {periodLabelsMap[col.num]} {bn ? 'পিরিয়ডের সময় নির্বাচন' : 'Set Period Time'}
                                </Label>
                                <Badge variant="outline" className="text-[10px]">
                                  {col.num} {bn ? 'নং পিরিয়ড' : ''}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">{bn ? 'শুরু' : 'Start'}</Label>
                                  <TimePicker
                                    className="h-8 text-xs"
                                    value={time.start}
                                    onChange={value =>
                                      setPeriodTimes(prev => ({
                                        ...prev,
                                        [col.num]: { start: value, end: prev[col.num]?.end || time.end || '' },
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">{bn ? 'শেষ' : 'End'}</Label>
                                  <TimePicker
                                    className="h-8 text-xs"
                                    value={time.end}
                                    onChange={value =>
                                      setPeriodTimes(prev => ({
                                        ...prev,
                                        [col.num]: { start: prev[col.num]?.start || time.start || '', end: value },
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 mt-1 font-medium"
                                onClick={() => {
                                  const curTime = periodTimes[col.num] || time;
                                  handleSavePeriodTimeToAllClasses(col.num, curTime.start, curTime.end);
                                }}
                              >
                                <Save className="h-3 w-3" />
                                <span>{bn ? 'সকল ক্লাসের জন্য সেভ করুন' : 'Apply to All Classes'}</span>
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayClasses.map(cls => {
                    const classRoutine = allRoutines?.find(r => r.class_id === cls.id);
                    const classPeriods = classRoutine
                      ? allClassesPeriods?.filter(p => p.routine_id === classRoutine.id)
                      : [];

                    const getClassPeriodData = (periodNum: number) => {
                      return (
                        classPeriods?.find(p => p.day_of_week === selectedDay && p.period_number === periodNum) || null
                      );
                    };

                    const divName = bn ? cls.divisions?.name_bn : cls.divisions?.name;

                    return (
                      <tr key={cls.id} className="hover:bg-accent/5 transition-colors group">
                        <td className="border border-border bg-accent/5 px-2.5 py-1.5 text-center">
                          <div className="flex items-center justify-between gap-1">
                            <div className="text-left flex-1 min-w-0">
                              <span className="font-bold text-[11px] text-foreground block truncate">
                                {bn ? cls.name_bn : cls.name}
                              </span>
                              {divName && (
                                <span className="text-[9px] text-muted-foreground block truncate">
                                  {divName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 print-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                title={bn ? 'রুটিন ভিউ থেকে বাদ দিন' : 'Remove from view'}
                                onClick={() => handleRemoveClassFromView(cls.id)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                title={bn ? 'এই শ্রেণীর রুটিন সম্পূর্ণ মুছুন' : 'Clear routine periods'}
                                onClick={() => handleDeleteClassRoutine(cls.id, bn ? cls.name_bn : cls.name)}
                                className="p-1 rounded text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        {periodColumns.map((col, idx) => {
                          if (col.isBreak) {
                            return <td key={`br-${idx}`} className="border border-border bg-accent/5" />;
                          }
                          const period = getClassPeriodData(col.num);
                          const subj = period?.subjects as any;
                          const subjName = subj ? (bn ? subj.name_bn : subj.name) : '';
                          const teacherDisplay = bn
                            ? period?.teacher_name_bn || period?.teacher_name || ''
                            : period?.teacher_name || period?.teacher_name_bn || '';

                          return (
                            <td key={col.num} className="border border-border p-0">
                              <CellEditor
                                subjectId={period?.subject_id || 'none'}
                                teacherName={period?.teacher_name || ''}
                                teacherNameBn={period?.teacher_name_bn || ''}
                                subjects={subjects || []}
                                filterClassId={cls.id}
                                classes={filteredClasses || []}
                                staff={staff || []}
                                bn={bn}
                                showClassSelect
                                classId={cls.id}
                                onSave={(sId, tn, tnBn, cId) => {
                                  const targetClassId = cId || cls.id;
                                  handleSaveMasterCell(targetClassId, col.num, sId, tn, tnBn);
                                }}
                              >
                                <button className="w-full cursor-pointer hover:bg-accent/15 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 rounded-none text-left">
                                  <div className="flex flex-col min-h-[44px]">
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5">
                                      <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                                        {subjName || <span className="text-muted-foreground/30 font-bold">+</span>}
                                      </span>
                                    </div>
                                    <div className="border-t border-border/70" />
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5 bg-muted/10">
                                      <span className="text-[8.5px] text-muted-foreground leading-tight text-center truncate max-w-[85px]">
                                        {teacherDisplay || <span className="opacity-30">—</span>}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              </CellEditor>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {displayClasses.length === 0 && (
                    <tr>
                      <td colSpan={periodColumns.length + 1} className="py-8 text-center text-xs text-muted-foreground">
                        {bn ? 'কোনো শ্রেণী পাওয়া যায়নি। ফিল্টার পরিবর্তন করুন।' : 'No classes found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-border text-[9px] text-muted-foreground flex items-center justify-between">
              <span>
                {bn
                  ? 'বি.দ্র. কর্তৃপক্ষ কর্তৃক পরিবর্তন করার ক্ষমতা এবং বিশেষ প্রয়োজনে অতিরিক্ত ক্লাশ নিতে পারবেন।'
                  : 'Note: Schedule subject to change by administration.'}
              </span>
              <span className="print-hidden text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                {bn ? '💡 প্রতি সেলে ক্লিক করে বিষয় ও শিক্ষক নির্ধারণ বা পরিবর্তন করুন' : 'Click any slot to edit'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Single Class Weekly Grid (Rows = Days, Columns = Periods) ─── */
        <div id="master-routine-print">
          <div className="border-2 border-border rounded-xl overflow-hidden bg-background shadow-sm">
            {/* Header */}
            <div className="text-center py-3 px-4 border-b-2 border-border relative bg-muted/20">
              <div className="absolute top-2 right-3 text-[10px] text-muted-foreground border border-border rounded px-2 py-0.5">
                {bn ? 'তারিখ:' : 'Date:'} {new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}
              </div>
              {institution?.logo_url && (
                <img src={institution.logo_url} alt="" className="w-12 h-12 object-contain mx-auto mb-1" />
              )}
              <h1 className="text-lg font-bold text-foreground leading-tight">
                {instName || (bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}
              </h1>
              {institution?.address && <p className="text-[10px] text-muted-foreground">{institution.address}</p>}
              <p className="text-xs font-semibold text-foreground mt-0.5">
                {bn ? 'সাপ্তাহিক ক্লাস রুটিন' : 'Weekly Class Routine'} —{' '}
                {selectedSession ? (bn ? selectedSession.name_bn || selectedSession.name : selectedSession.name) : ''}
              </p>
              {selectedCls && (
                <p className="text-sm font-bold text-foreground mt-0.5 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100 inline-block px-4 py-0.5 rounded-full">
                  {bn ? selectedCls.name_bn : selectedCls.name}
                </p>
              )}
            </div>

            {/* Weekly Table */}
            <div className="overflow-x-auto p-2">
              <table className="w-full border-collapse" style={{ minWidth: periodColumns.length * 85 + 90 }}>
                <thead>
                  <tr>
                    <th className={thStyle} style={{ minWidth: 80 }}>
                      {bn ? 'দিন / পিরিয়ড' : 'Day / Period'}
                    </th>
                    {periodColumns.map((col, idx) => {
                      if (col.isBreak) {
                        return (
                          <th
                            key={`br-${idx}`}
                            className={breakThStyle}
                            style={{
                              writingMode: 'vertical-rl',
                              textOrientation: 'mixed',
                              padding: '8px 2px',
                              minWidth: 28,
                              maxWidth: 32,
                            }}
                          >
                            {bn ? 'বিরতি' : 'Break'}
                          </th>
                        );
                      }
                      const time = getPeriodTime(col.num);
                      return (
                        <th key={col.num} className={thStyle}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full cursor-pointer hover:bg-emerald-200/60 dark:hover:bg-emerald-800/40 p-1 rounded transition-colors focus:outline-none"
                              >
                                <div className="font-bold text-xs">{periodLabelsMap[col.num]}</div>
                                <div className="text-[8.5px] font-normal opacity-70 mt-0.5">
                                  {time.start
                                    ? `${fmtTime(time.start, bn)} - ${fmtTime(time.end, bn)}`
                                    : (bn ? 'সময় দিন' : 'Set time')}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3 space-y-2.5 z-[250]" align="center">
                              <Label className="text-xs font-bold">
                                {periodLabelsMap[col.num]} {bn ? 'পিরিয়ডের সময়' : 'Period Time'}
                              </Label>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-[10px]">{bn ? 'শুরু' : 'Start'}</Label>
                                  <TimePicker
                                    className="h-7 text-xs"
                                    value={time.start}
                                    onChange={value =>
                                      setPeriodTimes(prev => ({
                                        ...prev,
                                        [col.num]: { start: value, end: prev[col.num]?.end || time.end || '' },
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label className="text-[10px]">{bn ? 'শেষ' : 'End'}</Label>
                                  <TimePicker
                                    className="h-7 text-xs"
                                    value={time.end}
                                    onChange={value =>
                                      setPeriodTimes(prev => ({
                                        ...prev,
                                        [col.num]: { start: prev[col.num]?.start || time.start || '', end: value },
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 mt-1"
                                onClick={() => {
                                  const curTime = periodTimes[col.num] || time;
                                  handleSavePeriodTimeToAllClasses(col.num, curTime.start, curTime.end);
                                }}
                              >
                                <Save className="h-3 w-3" />
                                <span>{bn ? 'সেভ করুন' : 'Save'}</span>
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day.value} className="hover:bg-accent/5 transition-colors">
                      <td className="border border-border bg-accent/5 px-3 py-2 font-bold text-[11px] whitespace-nowrap text-center">
                        {bn ? day.label_bn : day.label_en}
                      </td>
                      {periodColumns.map((col, idx) => {
                        if (col.isBreak) {
                          return <td key={`br-${idx}`} className="border border-border bg-accent/5" />;
                        }
                        const period = allPeriods?.find(
                          (p: any) => p.day_of_week === day.value && p.period_number === col.num
                        );
                        const subj = period?.subjects as any;
                        const subjName = subj ? (bn ? subj.name_bn : subj.name) : '';
                        const teacherDisplay = bn
                          ? period?.teacher_name_bn || period?.teacher_name || ''
                          : period?.teacher_name || period?.teacher_name_bn || '';

                        return (
                          <td key={col.num} className="border border-border p-0">
                            <CellEditor
                              subjectId={period?.subject_id || 'none'}
                              teacherName={period?.teacher_name || ''}
                              teacherNameBn={period?.teacher_name_bn || ''}
                              subjects={subjects || []}
                              filterClassId={selectedClassId}
                              classes={filteredClasses || []}
                              staff={staff || []}
                              bn={bn}
                              onSave={(sId, tn, tnBn) =>
                                saveSingleCellMutation.mutate({
                                  dayOfWeek: day.value,
                                  periodNum: col.num,
                                  subjectId: sId,
                                  teacherName: tn,
                                  teacherNameBn: tnBn,
                                })
                              }
                            >
                              <button className="w-full cursor-pointer hover:bg-accent/15 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 rounded-none text-left">
                                <div className="flex flex-col min-h-[44px]">
                                  <div className="flex-1 flex items-center justify-center px-1 py-0.5">
                                    <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                                      {subjName || <span className="text-muted-foreground/30 font-bold">+</span>}
                                    </span>
                                  </div>
                                  <div className="border-t border-border/70" />
                                  <div className="flex-1 flex items-center justify-center px-1 py-0.5 bg-muted/10">
                                    <span className="text-[8.5px] text-muted-foreground leading-tight text-center truncate max-w-[85px]">
                                      {teacherDisplay || <span className="opacity-30">—</span>}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </CellEditor>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-border text-[9px] text-muted-foreground">
              {bn
                ? 'বি.দ্র. কর্তৃপক্ষ কর্তৃক পরিবর্তন করার ক্ষমতা এবং বিশেষ প্রয়োজনে অতিরিক্ত ক্লাশ নিতে পারবেন।'
                : 'Note: Schedule subject to change by administration.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterRoutineView;
