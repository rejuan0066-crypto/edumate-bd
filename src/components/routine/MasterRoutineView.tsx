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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Printer, Plus, Minus, Save, Trash2, Clock, CheckSquare,
  X, Filter, Check, ChevronDown, RefreshCw, PenTool, Edit, BookOpen, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
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

export interface CustomEventMeta {
  is_custom: boolean;
  title: string;
  span: number;
  note?: string;
  color?: string;
}

const COMMON_EVENT_CHIPS = [
  'সেমিনার',
  'বিশেষ ক্লাস',
  'পরীক্ষা',
  'মিলাদ ও দোয়া',
  'কর্মশালা',
  'আম বয়ান',
  'মুক্ত পাঠ',
  'ছুটি',
];

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
  initialCustomMeta?: CustomEventMeta | null;
  maxSpan?: number;
  onSave: (
    subjectId: string,
    teacherName: string,
    teacherNameBn: string,
    classId?: string,
    customMeta?: CustomEventMeta | null
  ) => void;
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
  initialCustomMeta,
  maxSpan = 4,
  onSave,
  children,
  showClassSelect,
}: CellEditorProps) => {
  const [open, setOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'regular' | 'custom'>('regular');
  
  // Regular class state
  const [localSubjectId, setLocalSubjectId] = useState(subjectId);
  const [localTeacher, setLocalTeacher] = useState(teacherName);
  const [localTeacherBn, setLocalTeacherBn] = useState(teacherNameBn);
  const [localClassId, setLocalClassId] = useState(classId || '');

  // Custom Event / Merge state
  const [customTitle, setCustomTitle] = useState('');
  const [customSpan, setCustomSpan] = useState(1);
  const [customNote, setCustomNote] = useState('');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      if (initialCustomMeta?.is_custom) {
        setEditorMode('custom');
        setCustomTitle(initialCustomMeta.title || '');
        setCustomSpan(initialCustomMeta.span || 1);
        setCustomNote(initialCustomMeta.note || '');
        setLocalSubjectId('none');
        setLocalTeacher('');
        setLocalTeacherBn('');
      } else {
        setEditorMode('regular');
        setLocalSubjectId(subjectId);
        setLocalTeacher(teacherName);
        setLocalTeacherBn(teacherNameBn);
        setCustomTitle('');
        setCustomSpan(1);
        setCustomNote('');
      }
      setLocalClassId(classId || '');
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    if (editorMode === 'custom') {
      if (!customTitle.trim()) {
        toast.error(bn ? 'ইভেন্ট বা বিষয়ের নাম লিখুন (যেমন: সেমিনার)' : 'Event title required');
        return;
      }
      const meta: CustomEventMeta = {
        is_custom: true,
        title: customTitle.trim(),
        span: Math.max(1, Math.min(maxSpan, customSpan)),
        note: customNote.trim(),
      };
      onSave('none', '', '', localClassId || undefined, meta);
    } else {
      onSave(localSubjectId, localTeacher, localTeacherBn, localClassId || undefined, null);
    }
    setOpen(false);
  };

  const handleClear = () => {
    onSave('none', '', '', localClassId || undefined, null);
    setOpen(false);
  };

  const handleStaffSelect = (staffId: string) => {
    const s = staff.find(st => st.id === staffId);
    if (s) {
      setLocalTeacher(s.name_en || s.name_bn || '');
      setLocalTeacherBn(s.name_bn || s.name_en || '');
      if (editorMode === 'custom') {
        setCustomNote(s.name_bn || s.name_en || '');
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen} modal={false}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-84 p-3.5 space-y-3 z-[250] shadow-xl border bg-card"
        align="center"
        onOpenAutoFocus={e => e.preventDefault()}
        side="top"
        avoidCollisions
      >
        <div className="flex items-center justify-between border-b pb-1.5">
          <Label className="text-xs font-bold text-foreground">
            {bn ? 'পিরিয়ড সম্পাদনা ও মার্জ' : 'Edit Period Slot'}
          </Label>
          <div className="flex bg-muted p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setEditorMode('regular')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                editorMode === 'regular'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {bn ? 'সাধারণ ক্লাস' : 'Regular'}
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('custom')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                editorMode === 'custom'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3 h-3" />
              {bn ? 'সেমিনার / মার্জ' : 'Event / Merge'}
            </button>
          </div>
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

        {editorMode === 'regular' ? (
          <div className="space-y-2.5">
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
          </div>
        ) : (
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold text-foreground">
                  {bn ? 'ইভেন্ট বা বিষয়ের নাম' : 'Event / Title'}
                </Label>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  {bn ? 'কাস্টম টেক্সট' : 'Custom'}
                </span>
              </div>
              <Input
                className="h-8 text-xs font-medium"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder={bn ? 'যেমন: সেমিনার / বিশেষ ক্লাস / পরীক্ষা' : 'e.g. Seminar'}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_EVENT_CHIPS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setCustomTitle(chip)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">{bn ? 'পিরিয়ড মার্জ' : 'Merge Span'}</Label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                  value={customSpan}
                  onChange={e => setCustomSpan(Number(e.target.value))}
                >
                  <option value={1}>{bn ? '১টি পিরিয়ড (মার্জ ছাড়া)' : '1 Period'}</option>
                  {maxSpan >= 2 && <option value={2}>{bn ? '২টি পিরিয়ড মার্জ' : '2 Periods'}</option>}
                  {maxSpan >= 3 && <option value={3}>{bn ? '৩টি পিরিয়ড মার্জ' : '3 Periods'}</option>}
                  {maxSpan >= 4 && <option value={4}>{bn ? '৪টি পিরিয়ড মার্জ' : '4 Periods'}</option>}
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium">{bn ? 'দায়িত্বপ্রাপ্ত / শিক্ষক' : 'In-charge'}</Label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value=""
                  onChange={e => handleStaffSelect(e.target.value)}
                >
                  <option value="">{bn ? '-- শিক্ষক বাছুন --' : '-- Pick --'}</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {bn ? s.name_bn || s.name_en : s.name_en || s.name_bn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">{bn ? 'বিবরণ বা তত্ত্বাবধায়ক নোট' : 'Note / Remarks'}</Label>
              <Input
                className="h-7 text-xs"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                placeholder={bn ? 'তত্ত্বাবধায়ক / বিষয়বস্তু' : 'In-charge or topic details'}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1.5 border-t">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1 text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
            onClick={handleClear}
          >
            <Trash2 className="h-3 w-3" />
            <span>{bn ? 'খালি / আনমার্জ' : 'Clear / Unmerge'}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className={`h-7 text-xs flex-1 gap-1 text-white font-medium ${
              editorMode === 'custom' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
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

  // Customizable Footer Note
  const [footerNote, setFooterNote] = useState<string>(() => {
    return localStorage.getItem('master_routine_footer_note') || 
      'বি.দ্র. কর্তৃপক্ষ কর্তৃক পরিবর্তন করার ক্ষমতা এবং বিশেষ প্রয়োজনে অতিরিক্ত ক্লাস নিতে পারবেন।';
  });
  const [isEditingFooterNote, setIsEditingFooterNote] = useState(false);

  // Signatories Config (Nazim & Principal)
  const [signatories, setSignatories] = useState<{
    nazim: { name_bn: string; title_bn: string; show: boolean };
    principal: { name_bn: string; title_bn: string; show: boolean };
  }>(() => {
    try {
      const saved = localStorage.getItem('master_routine_signatories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      nazim: { name_bn: '', title_bn: 'নাজিম / শিক্ষা সচিব', show: true },
      principal: { name_bn: '', title_bn: 'প্রতিষ্ঠাতা ও প্রিন্সিপাল', show: true },
    };
  });
  const [showSignatoryDialog, setShowSignatoryDialog] = useState(false);

  // Fetch website settings for institution info
  const { settings: websiteSettings } = useWebsiteSettings();

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

  // Divisions (শিক্ষা বিভাগসমূহ) with sort_order
  const { data: divisions } = useQuery({
    queryKey: ['divisions-for-master-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Classes with their divisions and sort_order
  const { data: allClasses } = useQuery({
    queryKey: ['all-classes-for-routine'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('*, divisions(id, name, name_bn, sort_order)')
        .eq('is_active', true);
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

  // Auto-populate default principal from website settings or staff if empty
  useEffect(() => {
    if (!signatories.principal.name_bn) {
      const pName = websiteSettings?.principal_name || 'আলহাজ্ব আব্দুছ ছোবহান';
      const pTitle = websiteSettings?.principal_title_bn || 'প্রতিষ্ঠাতা ও প্রিন্সিপাল';
      setSignatories(prev => ({
        ...prev,
        principal: { ...prev.principal, name_bn: pName, title_bn: pTitle },
      }));
    }
  }, [websiteSettings]);

  // Sequential Sorting of classes:
  // Division sort_order first -> Class sort_order second -> Name
  const sortClasses = useCallback((list: any[]) => {
    return [...list].sort((a, b) => {
      const divA = a.divisions?.sort_order ?? 999;
      const divB = b.divisions?.sort_order ?? 999;
      if (divA !== divB) return divA - divB;
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name_bn || a.name || '').localeCompare(b.name_bn || b.name || '', 'bn');
    });
  }, []);

  // Filtered classes according to selected education department (division)
  const filteredClasses = useMemo(() => {
    if (!allClasses) return [];
    let list = allClasses;
    if (selectedDivisionId !== 'all') {
      list = list.filter(c => c.division_id === selectedDivisionId);
    }
    return sortClasses(list);
  }, [allClasses, selectedDivisionId, sortClasses]);

  // Classes currently shown in the Daily Routine table
  const displayClasses = useMemo(() => {
    if (!filteredClasses) return [];
    let list = filteredClasses;
    if (selectedClassIds.length > 0) {
      list = filteredClasses.filter(c => selectedClassIds.includes(c.id));
    } else if (selectedClassId && selectedClassId !== 'all') {
      list = filteredClasses.filter(c => c.id === selectedClassId);
    }
    return sortClasses(list);
  }, [filteredClasses, selectedClassIds, selectedClassId, sortClasses]);

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
    teacherNameBn: string,
    customMeta?: CustomEventMeta | null
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
      if (!customMeta?.is_custom && (subjectId === 'none' || (!subjectId && !teacherName && !teacherNameBn))) {
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
      const isCustom = !!customMeta?.is_custom;

      const periodData = {
        routine_id: routineId,
        day_of_week: selectedDay,
        period_number: periodNum,
        subject_id: isCustom ? null : (subjectId && subjectId !== 'none' ? subjectId : null),
        teacher_name: isCustom ? (customMeta.note || null) : (teacherName || null),
        teacher_name_bn: isCustom ? (customMeta.note || null) : (teacherNameBn || null),
        is_break: false,
        break_label_bn: isCustom ? customMeta.title : null,
        room: isCustom ? JSON.stringify(customMeta) : null,
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
      toast.success(isCustom ? (bn ? 'কাস্টম ইভেন্ট / মার্জ সংরক্ষিত' : 'Event saved') : (bn ? 'সেভ হয়েছে' : 'Saved'));
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
      customMeta,
    }: {
      dayOfWeek: number;
      periodNum: number;
      subjectId: string;
      teacherName: string;
      teacherNameBn: string;
      customMeta?: CustomEventMeta | null;
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

      if (!customMeta?.is_custom && (subjectId === 'none' || (!subjectId && !teacherName && !teacherNameBn))) {
        if (existing) {
          await supabase.from('routine_periods').delete().eq('id', existing.id);
        }
        return;
      }

      const time = getPeriodTime(periodNum);
      const isCustom = !!customMeta?.is_custom;

      const periodData = {
        routine_id: routineId,
        day_of_week: dayOfWeek,
        period_number: periodNum,
        subject_id: isCustom ? null : (subjectId && subjectId !== 'none' ? subjectId : null),
        teacher_name: isCustom ? (customMeta.note || null) : (teacherName || null),
        teacher_name_bn: isCustom ? (customMeta.note || null) : (teacherNameBn || null),
        is_break: false,
        break_label_bn: isCustom ? customMeta.title : null,
        room: isCustom ? JSON.stringify(customMeta) : null,
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

  // Institution details for header & print
  const instName = websiteSettings?.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';
  const instAddress = websiteSettings?.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট';
  const instPhone = websiteSettings?.phone || '01749842401';
  const instEmail = websiteSettings?.email || 'info@subhania.edu.bd';
  const instLogo = websiteSettings?.logo_url || '';
  const sessionLabel = selectedSession ? (bn ? selectedSession.name_bn || selectedSession.name : selectedSession.name) : '';
  const dayLabel = DAYS[selectedDay]?.label_bn || 'শনিবার';

  // Save Signatories Settings
  const handleSaveSignatories = (newSig: typeof signatories) => {
    setSignatories(newSig);
    localStorage.setItem('master_routine_signatories', JSON.stringify(newSig));
    setShowSignatoryDialog(false);
    toast.success(bn ? 'স্বাক্ষরকারী তথ্য সংরক্ষিত হয়েছে' : 'Signatories saved');
  };

  // High Fidelity Print Handler
  const handlePrint = () => {
    const el = document.getElementById('daily-routine-print');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${bn ? 'দৈনিক ক্লাস রুটিন' : 'Daily Class Routine'} - ${instName}</title>
    <style>
      @font-face {
        font-family: "Kalpurush";
        src: url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");
        font-display: block;
      }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Kalpurush', 'Noto Sans Bengali', sans-serif;
        padding: 12px;
        background: #fff;
        color: #111;
      }
      @page {
        size: A4 landscape;
        margin: 6mm;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 8px;
        font-size: 11px;
      }
      th, td {
        border: 1.5px solid #222 !important;
        text-align: center;
        vertical-align: middle;
      }
      th {
        background-color: #e8f5e9 !important;
        color: #052e16 !important;
        font-weight: 700;
        padding: 5px 2px;
      }
      .break-col {
        background-color: #c8e6c9 !important;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-weight: 700;
        font-size: 10px;
        min-width: 28px;
        max-width: 32px;
      }
      .custom-cell {
        background-color: #fef3c7 !important;
        color: #78350f !important;
        font-weight: 700;
        padding: 4px;
      }
      .cell-subj {
        font-weight: 700;
        font-size: 10px;
        padding: 3px 2px;
        border-bottom: 1px solid #777;
        min-height: 18px;
        line-height: 1.2;
      }
      .cell-teacher {
        font-size: 9px;
        color: #333;
        padding: 2px;
        min-height: 16px;
        line-height: 1.2;
        background-color: #fcfcfc;
      }
      .header-wrap {
        text-align: center;
        margin-bottom: 6px;
      }
      .header-wrap h1 {
        font-size: 20px;
        font-weight: 800;
        color: #064e3b;
        margin-bottom: 2px;
      }
      .header-wrap .address {
        font-size: 11px;
        color: #444;
      }
      .header-wrap .contact {
        font-size: 10px;
        color: #555;
        margin-top: 2px;
      }
      .header-wrap .badge-title {
        display: inline-block;
        margin-top: 5px;
        padding: 3px 12px;
        background: #e8f5e9;
        border: 1px solid #1b5e20;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        color: #1b5e20;
      }
      .print-hidden, .no-print, button, input {
        display: none !important;
      }
      .footnote {
        margin-top: 8px;
        font-size: 10px;
        color: #444;
        border-top: 1px solid #999;
        padding-top: 4px;
        font-weight: 500;
      }
      .signatures {
        margin-top: 45px;
        display: flex;
        justify-content: space-around;
        align-items: center;
        text-align: center;
      }
      .sig-block {
        width: 220px;
      }
      .sig-line {
        border-top: 1.5px solid #222;
        margin-bottom: 4px;
      }
      .sig-title {
        font-size: 11px;
        font-weight: 700;
      }
      .sig-name {
        font-size: 10.5px;
        color: #222;
      }
      .sig-sub {
        font-size: 9px;
        color: #666;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-hidden { display: none !important; }
      }
    </style></head><body>`);

    w.document.write(el.innerHTML);
    w.document.write('</body></html>');
    w.document.close();

    const check = setInterval(() => {
      if (w.document.readyState === 'complete') {
        clearInterval(check);
        setTimeout(() => { w.print(); w.close(); }, 350);
      }
    }, 100);
  };

  const thStyle = "border border-border bg-emerald-100/90 dark:bg-emerald-900/40 px-1 py-1.5 text-center font-bold text-[11px] text-emerald-950 dark:text-emerald-100";
  const breakThStyle = "border border-border bg-emerald-200 dark:bg-emerald-800/60 font-bold text-[10px] text-emerald-950 dark:text-emerald-100";

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
                  {bn ? 'সকল শিক্ষা বিভাগ (সিরিয়াল অনুযায়ী)' : 'All Divisions (In Order)'}
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
                  {bn ? 'দৈনিক ক্লাস রুটিন (সকল/নির্বাচিত)' : 'Daily Class Routine (All/Multi)'}
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
            {/* Signatories Selector Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs text-foreground bg-card"
              onClick={() => setShowSignatoryDialog(true)}
            >
              <PenTool className="h-3.5 w-3.5 text-emerald-600" />
              <span>{bn ? 'স্বাক্ষরকারী' : 'Signatures'}</span>
            </Button>

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

            <Button
              size="sm"
              className="h-9 gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{bn ? 'প্রিন্ট / ডাউনলোড' : 'Print / Download'}</span>
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

      {/* Signatories Configuration Modal */}
      <Dialog open={showSignatoryDialog} onOpenChange={setShowSignatoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PenTool className="w-4 h-4 text-emerald-600" />
              {bn ? 'রুটিনের স্বাক্ষরকারী নির্বাচন' : 'Configure Routine Signatories'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            {/* Nazim */}
            <div className="p-3 border rounded-lg space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{bn ? '১. নাজিম / শিক্ষা সচিব' : '1. Nazim / Education Sec'}</span>
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatories.nazim.show}
                    onChange={e => setSignatories(prev => ({
                      ...prev,
                      nazim: { ...prev.nazim, show: e.target.checked }
                    }))}
                    className="rounded text-emerald-600"
                  />
                  <span>{bn ? 'প্রদর্শন করুন' : 'Show'}</span>
                </label>
              </div>

              {staff && staff.length > 0 && (
                <div>
                  <Label className="text-[11px] text-muted-foreground">{bn ? 'শিক্ষক তালিকা থেকে নির্বাচন' : 'Pick from staff'}</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value=""
                    onChange={e => {
                      const s = staff.find(st => st.id === e.target.value);
                      if (s) {
                        setSignatories(prev => ({
                          ...prev,
                          nazim: {
                            ...prev.nazim,
                            name_bn: s.name_bn || s.name_en || '',
                            title_bn: s.designation || 'নাজিম / শিক্ষা সচিব',
                          }
                        }));
                      }
                    }}
                  >
                    <option value="">{bn ? '-- বাছুন --' : '-- Pick --'}</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {bn ? s.name_bn || s.name_en : s.name_en || s.name_bn} {s.designation ? `(${s.designation})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">{bn ? 'নাম (বাংলা)' : 'Name'}</Label>
                  <Input
                    className="h-7 text-xs"
                    value={signatories.nazim.name_bn}
                    onChange={e => setSignatories(prev => ({
                      ...prev,
                      nazim: { ...prev.nazim, name_bn: e.target.value }
                    }))}
                    placeholder={bn ? 'নাজিমের নাম' : 'Name'}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">{bn ? 'পদবি' : 'Title'}</Label>
                  <Input
                    className="h-7 text-xs"
                    value={signatories.nazim.title_bn}
                    onChange={e => setSignatories(prev => ({
                      ...prev,
                      nazim: { ...prev.nazim, title_bn: e.target.value }
                    }))}
                    placeholder="পদবি"
                  />
                </div>
              </div>
            </div>

            {/* Principal */}
            <div className="p-3 border rounded-lg space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{bn ? '২. মুহতামিম / প্রিন্সিপাল' : '2. Principal / Muhtamim'}</span>
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatories.principal.show}
                    onChange={e => setSignatories(prev => ({
                      ...prev,
                      principal: { ...prev.principal, show: e.target.checked }
                    }))}
                    className="rounded text-emerald-600"
                  />
                  <span>{bn ? 'প্রদর্শন করুন' : 'Show'}</span>
                </label>
              </div>

              {staff && staff.length > 0 && (
                <div>
                  <Label className="text-[11px] text-muted-foreground">{bn ? 'শিক্ষক তালিকা থেকে নির্বাচন' : 'Pick from staff'}</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value=""
                    onChange={e => {
                      const s = staff.find(st => st.id === e.target.value);
                      if (s) {
                        setSignatories(prev => ({
                          ...prev,
                          principal: {
                            ...prev.principal,
                            name_bn: s.name_bn || s.name_en || '',
                            title_bn: s.designation || 'প্রতিষ্ঠাতা ও প্রিন্সিপাল',
                          }
                        }));
                      }
                    }}
                  >
                    <option value="">{bn ? '-- বাছুন --' : '-- Pick --'}</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {bn ? s.name_bn || s.name_en : s.name_en || s.name_bn} {s.designation ? `(${s.designation})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">{bn ? 'নাম (বাংলা)' : 'Name'}</Label>
                  <Input
                    className="h-7 text-xs"
                    value={signatories.principal.name_bn}
                    onChange={e => setSignatories(prev => ({
                      ...prev,
                      principal: { ...prev.principal, name_bn: e.target.value }
                    }))}
                    placeholder={bn ? 'প্রিন্সিপালের নাম' : 'Name'}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">{bn ? 'পদবি' : 'Title'}</Label>
                  <Input
                    className="h-7 text-xs"
                    value={signatories.principal.title_bn}
                    onChange={e => setSignatories(prev => ({
                      ...prev,
                      principal: { ...prev.principal, title_bn: e.target.value }
                    }))}
                    placeholder="পদবি"
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={() => handleSaveSignatories(signatories)}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {bn ? 'সংরক্ষণ করুন' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!selectedSessionId ? (
        <div className="py-12 text-center text-muted-foreground">
          {bn ? 'অনুগ্রহ করে একটি একাডেমিক সেশন নির্বাচন করুন' : 'Select an academic session'}
        </div>
      ) : isAllClasses ? (
        /* ─── All Classes Daily Grid (Rows = Classes sorted sequentially, Columns = Periods) ─── */
        <div id="daily-routine-print">
          <div className="border-2 border-border rounded-xl overflow-hidden bg-background shadow-sm">
            {/* Header with All Madrasa Information */}
            <div className="header-wrap text-center py-4 px-4 border-b-2 border-border relative bg-muted/20">
              {instLogo && (
                <img src={instLogo} alt="" className="w-14 h-14 object-contain mx-auto mb-1.5" />
              )}
              <h1 className="text-xl font-extrabold text-foreground leading-tight tracking-wide">
                {instName}
              </h1>
              {instAddress && <p className="address text-xs text-muted-foreground mt-0.5">{instAddress}</p>}
              {(instPhone || instEmail) && (
                <p className="contact text-[11px] text-muted-foreground font-sans mt-0.5">
                  {instPhone && <span>মোবাইল: {toBn(instPhone)}</span>}
                  {instPhone && instEmail && <span className="mx-2">|</span>}
                  {instEmail && <span>ইমেইল: {instEmail}</span>}
                </p>
              )}
              <div className="badge-title mt-2 inline-flex items-center gap-2 px-4 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-800">
                <span className="text-xs font-bold">
                  {bn ? 'দৈনিক ক্লাস রুটিন' : 'Daily Class Routine'} — {sessionLabel}
                </span>
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  (বার: {dayLabel})
                </span>
              </div>
            </div>

            {/* Day Selector Tabs (শনি, রবি, সোম, মঙ্গল, বুধ, বৃহ) */}
            <div className="flex items-center justify-between gap-1 p-2 border-b border-border flex-wrap bg-muted/10 print-hidden">
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

              <div className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                <span>{bn ? 'দিনের রুটিন:' : 'Day:'} </span>
                <span className="font-bold text-foreground">{bn ? DAYS[selectedDay]?.label_bn : DAYS[selectedDay]?.label_en}</span>
              </div>
            </div>

            {/* Daily Grid Table */}
            <div className="overflow-x-auto p-2">
              <table className="w-full border-collapse" style={{ minWidth: periodColumns.length * 90 + 160 }}>
                <thead>
                  <tr>
                    <th className={thStyle} style={{ minWidth: 150 }}>
                      <div className="font-bold text-xs">{bn ? 'শ্রেণী / পিরিয়ড' : 'Class / Period'}</div>
                      <div className="text-[9px] font-normal text-muted-foreground">
                        {bn ? `(${displayClasses.length} টি ক্লাস সিরিয়াল অনুযায়ী)` : `(${displayClasses.length} Classes In Order)`}
                      </div>
                    </th>
                    {periodColumns.map((col, idx) => {
                      if (col.isBreak) {
                        return (
                          <th
                            key={`br-${idx}`}
                            className={`${breakThStyle} break-col`}
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

                    let skipCount = 0;

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
                            return <td key={`br-${idx}`} className={`${breakThStyle} break-col`} />;
                          }

                          if (skipCount > 0) {
                            skipCount--;
                            return null;
                          }

                          const period = getClassPeriodData(col.num);

                          // Parse custom event & span metadata
                          let customMeta: CustomEventMeta | null = null;
                          if (period?.room && period.room.startsWith('{')) {
                            try {
                              const parsed = JSON.parse(period.room);
                              if (parsed.is_custom) {
                                customMeta = parsed;
                              }
                            } catch {}
                          }

                          // Calculate remaining non-break columns before break or end
                          let consecutivePeriods = 1;
                          for (let c = idx + 1; c < periodColumns.length; c++) {
                            if (periodColumns[c].isBreak) break;
                            consecutivePeriods++;
                          }

                          let span = 1;
                          if (customMeta && customMeta.span > 1) {
                            span = Math.min(customMeta.span, consecutivePeriods);
                            skipCount = span - 1;
                          }

                          // Custom Event / Merged Cell Rendering
                          if (customMeta) {
                            return (
                              <td
                                key={col.num}
                                colSpan={span}
                                className="border border-border p-0 custom-cell bg-amber-50/90 dark:bg-amber-950/40 text-center"
                              >
                                <CellEditor
                                  subjectId="none"
                                  teacherName=""
                                  teacherNameBn={customMeta.note || ''}
                                  subjects={subjects || []}
                                  filterClassId={cls.id}
                                  classes={filteredClasses || []}
                                  staff={staff || []}
                                  bn={bn}
                                  showClassSelect
                                  classId={cls.id}
                                  initialCustomMeta={customMeta}
                                  maxSpan={consecutivePeriods}
                                  onSave={(sId, tn, tnBn, cId, cMeta) => {
                                    const targetClassId = cId || cls.id;
                                    handleSaveMasterCell(targetClassId, col.num, sId, tn, tnBn, cMeta);
                                  }}
                                >
                                  <button className="w-full h-full min-h-[44px] cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-900/40 p-1 flex flex-col items-center justify-center text-center transition-colors">
                                    <span className="font-bold text-xs text-amber-950 dark:text-amber-200">
                                      {customMeta.title || (bn ? 'সেমিনার' : 'Seminar')}
                                    </span>
                                    {customMeta.note && (
                                      <span className="text-[9px] text-amber-800 dark:text-amber-300 mt-0.5 truncate max-w-[130px]">
                                        {customMeta.note}
                                      </span>
                                    )}
                                    {span > 1 && (
                                      <span className="text-[8px] text-amber-700/80 dark:text-amber-400 font-mono mt-0.5 print-hidden">
                                        ({toBn(span)}টি পিরিয়ড মার্জ)
                                      </span>
                                    )}
                                  </button>
                                </CellEditor>
                              </td>
                            );
                          }

                          // Regular Subject / Teacher Cell Rendering
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
                                initialCustomMeta={null}
                                maxSpan={consecutivePeriods}
                                onSave={(sId, tn, tnBn, cId, cMeta) => {
                                  const targetClassId = cId || cls.id;
                                  handleSaveMasterCell(targetClassId, col.num, sId, tn, tnBn, cMeta);
                                }}
                              >
                                <button className="w-full cursor-pointer hover:bg-accent/15 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 rounded-none text-left">
                                  <div className="flex flex-col min-h-[44px]">
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5 cell-subj">
                                      <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                                        {subjName || <span className="text-muted-foreground/30 font-bold">+</span>}
                                      </span>
                                    </div>
                                    <div className="border-t border-border/70" />
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5 bg-muted/10 cell-teacher">
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

            {/* Footnote / বি.দ্র. Section */}
            <div className="px-4 py-2.5 border-t border-border footnote flex items-center justify-between gap-3 flex-wrap bg-muted/10">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                  {bn ? 'বি.দ্র.' : 'Note:'}
                </span>
                {isEditingFooterNote ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Input
                      value={footerNote}
                      onChange={e => setFooterNote(e.target.value)}
                      className="h-7 text-xs flex-1"
                      placeholder={bn ? 'বি.দ্র. নোট লিখুন...' : 'Write note...'}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => {
                        setIsEditingFooterNote(false);
                        localStorage.setItem('master_routine_footer_note', footerNote);
                        toast.success(bn ? 'বি.দ্র. নোট সংরক্ষিত হয়েছে' : 'Note saved');
                      }}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {bn ? 'সেভ' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-xs text-foreground/80 font-medium">
                      {footerNote}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingFooterNote(true)}
                      className="print-hidden p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title={bn ? 'বি.দ্র. সম্পাদনা করুন' : 'Edit note'}
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <span className="print-hidden text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                {bn ? '💡 প্রতি সেলে ক্লিক করে বিষয়, শিক্ষক বা সেমিনার (পিরিয়ড মার্জ) নির্ধারণ করুন' : 'Click any slot to edit or merge'}
              </span>
            </div>

            {/* Signatures Section (নাজিম ও প্রিন্সিপাল স্বাক্ষর) */}
            <div className="signatures pt-10 pb-5 px-10 grid grid-cols-2 gap-8 text-center border-t border-border/40">
              {signatories.nazim.show && (
                <div className="sig-block flex flex-col items-center">
                  <div className="sig-line w-48 border-t-2 border-foreground/70 mb-1.5" />
                  <span className="sig-name font-bold text-xs text-foreground">
                    {signatories.nazim.name_bn || (bn ? 'নাজিম / শিক্ষা সচিব' : 'Education Secretary')}
                  </span>
                  <span className="sig-title text-[10px] text-muted-foreground">
                    {signatories.nazim.title_bn || (bn ? 'নাজিম / শিক্ষা সচিব' : 'Nazim')}
                  </span>
                  <span className="sig-sub text-[9px] text-muted-foreground/80 mt-0.5">
                    {instName}
                  </span>
                </div>
              )}

              {signatories.principal.show && (
                <div className="sig-block flex flex-col items-center">
                  <div className="sig-line w-48 border-t-2 border-foreground/70 mb-1.5" />
                  <span className="sig-name font-bold text-xs text-foreground">
                    {signatories.principal.name_bn || (bn ? 'আলহাজ্ব আব্দুছ ছোবহান' : 'Principal')}
                  </span>
                  <span className="sig-title text-[10px] text-muted-foreground">
                    {signatories.principal.title_bn || (bn ? 'প্রতিষ্ঠাতা ও প্রিন্সিপাল' : 'Founder & Principal')}
                  </span>
                  <span className="sig-sub text-[9px] text-muted-foreground/80 mt-0.5">
                    {instName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── Single Class Weekly Grid (Rows = Days, Columns = Periods) ─── */
        <div id="daily-routine-print">
          <div className="border-2 border-border rounded-xl overflow-hidden bg-background shadow-sm">
            {/* Header */}
            <div className="header-wrap text-center py-4 px-4 border-b-2 border-border relative bg-muted/20">
              <div className="absolute top-2 right-3 text-[10px] text-muted-foreground border border-border rounded px-2 py-0.5 print-hidden">
                {bn ? 'তারিখ:' : 'Date:'} {new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}
              </div>
              {instLogo && (
                <img src={instLogo} alt="" className="w-14 h-14 object-contain mx-auto mb-1.5" />
              )}
              <h1 className="text-xl font-extrabold text-foreground leading-tight tracking-wide">
                {instName}
              </h1>
              {instAddress && <p className="address text-xs text-muted-foreground mt-0.5">{instAddress}</p>}
              {(instPhone || instEmail) && (
                <p className="contact text-[11px] text-muted-foreground font-sans mt-0.5">
                  {instPhone && <span>মোবাইল: {toBn(instPhone)}</span>}
                  {instPhone && instEmail && <span className="mx-2">|</span>}
                  {instEmail && <span>ইমেইল: {instEmail}</span>}
                </p>
              )}
              <div className="badge-title mt-2 inline-flex items-center gap-2 px-4 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-800">
                <span className="text-xs font-bold">
                  {bn ? 'সাপ্তাহিক ক্লাস রুটিন' : 'Weekly Class Routine'} — {sessionLabel}
                </span>
                {selectedCls && (
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    ({bn ? selectedCls.name_bn : selectedCls.name})
                  </span>
                )}
              </div>
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
                            className={`${breakThStyle} break-col`}
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
                  {DAYS.map(day => {
                    let skipCount = 0;
                    return (
                      <tr key={day.value} className="hover:bg-accent/5 transition-colors">
                        <td className="border border-border bg-accent/5 px-3 py-2 font-bold text-[11px] whitespace-nowrap text-center">
                          {bn ? day.label_bn : day.label_en}
                        </td>
                        {periodColumns.map((col, idx) => {
                          if (col.isBreak) {
                            return <td key={`br-${idx}`} className={`${breakThStyle} break-col`} />;
                          }

                          if (skipCount > 0) {
                            skipCount--;
                            return null;
                          }

                          const period = allPeriods?.find(
                            (p: any) => p.day_of_week === day.value && p.period_number === col.num
                          );

                          let customMeta: CustomEventMeta | null = null;
                          if (period?.room && period.room.startsWith('{')) {
                            try {
                              const parsed = JSON.parse(period.room);
                              if (parsed.is_custom) {
                                customMeta = parsed;
                              }
                            } catch {}
                          }

                          let consecutivePeriods = 1;
                          for (let c = idx + 1; c < periodColumns.length; c++) {
                            if (periodColumns[c].isBreak) break;
                            consecutivePeriods++;
                          }

                          let span = 1;
                          if (customMeta && customMeta.span > 1) {
                            span = Math.min(customMeta.span, consecutivePeriods);
                            skipCount = span - 1;
                          }

                          if (customMeta) {
                            return (
                              <td
                                key={col.num}
                                colSpan={span}
                                className="border border-border p-0 custom-cell bg-amber-50/90 dark:bg-amber-950/40 text-center"
                              >
                                <CellEditor
                                  subjectId="none"
                                  teacherName=""
                                  teacherNameBn={customMeta.note || ''}
                                  subjects={subjects || []}
                                  filterClassId={selectedClassId}
                                  classes={filteredClasses || []}
                                  staff={staff || []}
                                  bn={bn}
                                  initialCustomMeta={customMeta}
                                  maxSpan={consecutivePeriods}
                                  onSave={(sId, tn, tnBn, _cId, cMeta) =>
                                    saveSingleCellMutation.mutate({
                                      dayOfWeek: day.value,
                                      periodNum: col.num,
                                      subjectId: sId,
                                      teacherName: tn,
                                      teacherNameBn: tnBn,
                                      customMeta: cMeta,
                                    })
                                  }
                                >
                                  <button className="w-full h-full min-h-[44px] cursor-pointer hover:bg-amber-100/70 p-1 flex flex-col items-center justify-center text-center">
                                    <span className="font-bold text-xs text-amber-950 dark:text-amber-200">
                                      {customMeta.title || (bn ? 'সেমিনার' : 'Seminar')}
                                    </span>
                                    {customMeta.note && (
                                      <span className="text-[9px] text-amber-800 dark:text-amber-300 mt-0.5 truncate max-w-[120px]">
                                        {customMeta.note}
                                      </span>
                                    )}
                                  </button>
                                </CellEditor>
                              </td>
                            );
                          }

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
                                initialCustomMeta={null}
                                maxSpan={consecutivePeriods}
                                onSave={(sId, tn, tnBn, _cId, cMeta) =>
                                  saveSingleCellMutation.mutate({
                                    dayOfWeek: day.value,
                                    periodNum: col.num,
                                    subjectId: sId,
                                    teacherName: tn,
                                    teacherNameBn: tnBn,
                                    customMeta: cMeta,
                                  })
                                }
                              >
                                <button className="w-full cursor-pointer hover:bg-accent/15 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 rounded-none text-left">
                                  <div className="flex flex-col min-h-[44px]">
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5 cell-subj">
                                      <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                                        {subjName || <span className="text-muted-foreground/30 font-bold">+</span>}
                                      </span>
                                    </div>
                                    <div className="border-t border-border/70" />
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5 bg-muted/10 cell-teacher">
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
                </tbody>
              </table>
            </div>

            {/* Footnote */}
            <div className="px-4 py-2.5 border-t border-border footnote flex items-center justify-between gap-3 flex-wrap bg-muted/10">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                  {bn ? 'বি.দ্র.' : 'Note:'}
                </span>
                <span className="text-xs text-foreground/80 font-medium">{footerNote}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="signatures pt-10 pb-5 px-10 grid grid-cols-2 gap-8 text-center border-t border-border/40">
              {signatories.nazim.show && (
                <div className="sig-block flex flex-col items-center">
                  <div className="sig-line w-48 border-t-2 border-foreground/70 mb-1.5" />
                  <span className="sig-name font-bold text-xs text-foreground">
                    {signatories.nazim.name_bn || (bn ? 'নাজিম / শিক্ষা সচিব' : 'Education Secretary')}
                  </span>
                  <span className="sig-title text-[10px] text-muted-foreground">
                    {signatories.nazim.title_bn || (bn ? 'নাজিম / শিক্ষা সচিব' : 'Nazim')}
                  </span>
                  <span className="sig-sub text-[9px] text-muted-foreground/80 mt-0.5">
                    {instName}
                  </span>
                </div>
              )}

              {signatories.principal.show && (
                <div className="sig-block flex flex-col items-center">
                  <div className="sig-line w-48 border-t-2 border-foreground/70 mb-1.5" />
                  <span className="sig-name font-bold text-xs text-foreground">
                    {signatories.principal.name_bn || (bn ? 'আলহাজ্ব আব্দুছ ছোবহান' : 'Principal')}
                  </span>
                  <span className="sig-title text-[10px] text-muted-foreground">
                    {signatories.principal.title_bn || (bn ? 'প্রতিষ্ঠাতা ও প্রিন্সিপাল' : 'Founder & Principal')}
                  </span>
                  <span className="sig-sub text-[9px] text-muted-foreground/80 mt-0.5">
                    {instName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterRoutineView;
