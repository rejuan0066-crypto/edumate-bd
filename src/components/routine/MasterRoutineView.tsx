import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Printer, Plus, Minus, Save } from 'lucide-react';
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

const PERIOD_LABELS_BN = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'];

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

const CellEditor = ({ subjectId, teacherName, teacherNameBn, classId, filterClassId, subjects, classes, staff, bn, onSave, children, showClassSelect }: CellEditorProps) => {
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

  const handleStaffSelect = (staffId: string) => {
    const s = staff.find(st => st.id === staffId);
    if (s) {
      setLocalTeacher(s.name_en || '');
      setLocalTeacherBn(s.name_bn || '');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen} modal={false}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2 z-[200]" align="center" onOpenAutoFocus={e => e.preventDefault()} side="top" avoidCollisions>
        {showClassSelect && (
          <div>
            <Label className="text-xs">{bn ? 'শ্রেণী' : 'Class'}</Label>
            <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value={localClassId} onChange={e => setLocalClassId(e.target.value)}>
              <option value="">{bn ? 'শ্রেণী নির্বাচন' : 'Select class'}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <Label className="text-xs">{bn ? 'বিষয়' : 'Subject'}</Label>
          <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value={localSubjectId} onChange={e => setLocalSubjectId(e.target.value)}>
            <option value="none">{bn ? '-- খালি --' : '-- Empty --'}</option>
            {subjects.filter(s => {
              const cId = showClassSelect ? localClassId : filterClassId;
              if (!cId) return true;
              return !s.class_id || s.class_id === cId;
            }).map(s => <option key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">{bn ? 'শিক্ষক নির্বাচন' : 'Select Teacher'}</Label>
          <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value="" onChange={e => handleStaffSelect(e.target.value)}>
            <option value="">{bn ? 'শিক্ষক বাছুন' : 'Pick teacher'}</option>
            {staff.map(s => <option key={s.id} value={s.id}>{bn ? s.name_bn : (s.name_en || s.name_bn)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{bn ? 'নাম (বাংলা)' : 'Name BN'}</Label>
            <Input className="h-8 text-xs" value={localTeacherBn} onChange={e => setLocalTeacherBn(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{bn ? 'নাম (ইংরেজি)' : 'Name EN'}</Label>
            <Input className="h-8 text-xs" value={localTeacher} onChange={e => setLocalTeacher(e.target.value)} />
          </div>
        </div>
        <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={handleSave}>
          <Save className="h-3 w-3" /> {bn ? 'সেভ' : 'Save'}
        </Button>
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
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [periodCount, setPeriodCount] = useState(8);
  const [breakAfter, setBreakAfter] = useState(4);
  const [periodTimes, setPeriodTimes] = useState<Record<number, { start: string; end: string }>>({});
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Queries
  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-master-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisions-for-master-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: allClasses } = useQuery({
    queryKey: ['all-classes-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*, divisions(id, name, name_bn)').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, name_bn').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ['staff-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, name_bn, name_en').eq('status', 'active').order('name_bn');
      return data || [];
    },
  });

  // Filtered classes for dropdown
  const filteredClasses = useMemo(() => {
    if (!allClasses) return [];
    if (selectedDivisionId === 'all') return allClasses;
    return allClasses.filter(c => c.division_id === selectedDivisionId);
  }, [allClasses, selectedDivisionId]);

  const isAllClasses = selectedClassId === 'all';

  // Get or create routine for selected class (single class mode)
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

  // Get all routines for all classes (all classes mode)
  const { data: allRoutines } = useQuery({
    queryKey: ['all-class-routines', selectedSessionId, selectedDivisionId],
    queryFn: async () => {
      if (!selectedSessionId) return [];
      let q = supabase
        .from('class_routines')
        .select('id, class_id, name, name_bn')
        .eq('academic_session_id', selectedSessionId)
        .eq('is_active', true);
      const { data } = await q;
      return data || [];
    },
    enabled: !!selectedSessionId && isAllClasses,
  });

  // All periods for all routines (all classes mode)
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
    enabled: isAllClasses && !!allRoutines?.length,
  });

  // All periods for this routine (all days)
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

  const { data: studentCount } = useQuery({
    queryKey: ['total-students-count'],
    queryFn: async () => {
      const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active');
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
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

  // Get period data for a specific day and period number
  const getPeriodData = useCallback((dayOfWeek: number, periodNum: number) => {
    if (!allPeriods) return null;
    return allPeriods.find(p => p.day_of_week === dayOfWeek && p.period_number === periodNum);
  }, [allPeriods]);

  // Get period times from local state or DB
  const getPeriodTime = useCallback((periodNum: number) => {
    if (periodTimes[periodNum]) return periodTimes[periodNum];
    if (!allPeriods) return { start: '', end: '' };
    const p = allPeriods.find(pp => pp.period_number === periodNum && !pp.is_break);
    return { start: p?.start_time || '', end: p?.end_time || '' };
  }, [allPeriods, periodTimes]);

  // Save cell mutation
  const saveCellMutation = useMutation({
    mutationFn: async ({ dayOfWeek, periodNum, subjectId, teacherName, teacherNameBn }: {
      dayOfWeek: number; periodNum: number; subjectId: string; teacherName: string; teacherNameBn: string;
    }) => {
      let routineId = routine?.id;

      // Auto-create routine if not exists
      if (!routineId) {
        const cls = allClasses?.find(c => c.id === selectedClassId);
        const { data: newRoutine, error } = await supabase.from('class_routines').insert({
          class_id: selectedClassId,
          academic_session_id: selectedSessionId,
          name: cls?.name || 'Routine',
          name_bn: cls?.name_bn || 'রুটিন',
          is_active: true,
        }).select('id').single();
        if (error) throw error;
        routineId = newRoutine.id;
      }

      // Upsert period
      const { data: existing } = await supabase
        .from('routine_periods')
        .select('id')
        .eq('routine_id', routineId)
        .eq('day_of_week', dayOfWeek)
        .eq('period_number', periodNum)
        .maybeSingle();

      const time = periodTimes[periodNum] || { start: '08:00', end: '08:45' };
      const periodData = {
        routine_id: routineId,
        day_of_week: dayOfWeek,
        period_number: periodNum,
        subject_id: subjectId === 'none' ? null : subjectId || null,
        teacher_name: teacherName || null,
        teacher_name_bn: teacherNameBn || null,
        is_break: false,
        start_time: time.start,
        end_time: time.end,
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
    onError: () => toast.error(bn ? 'সেভ ব্যর্থ' : 'Save failed'),
  });

  const handleCellSave = (dayOfWeek: number, periodNum: number, subjectId: string, teacherName: string, teacherNameBn: string) => {
    saveCellMutation.mutate({ dayOfWeek, periodNum, subjectId, teacherName, teacherNameBn });
  };

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);
  const selectedCls = allClasses?.find(c => c.id === selectedClassId);
  const instName = bn ? institution?.name : (institution?.name_en || institution?.name);

  // Period label helpers
  let periodLabelIdx = 0;
  const periodLabelsMap: Record<number, string> = {};
  periodColumns.forEach(col => {
    if (!col.isBreak) {
      periodLabelIdx++;
      periodLabelsMap[col.num] = bn ? (PERIOD_LABELS_BN[periodLabelIdx - 1] || toBn(periodLabelIdx)) : `P${periodLabelIdx}`;
    }
  });

  // Print handler
  const handlePrint = () => {
    const el = document.getElementById('master-routine-print');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${bn ? 'সাপ্তাহিক রুটিন' : 'Weekly Routine'}</title>
    <style>@font-face{font-family:"Kalpurush";src:url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Kalpurush', 'SutonnyOMJ', 'Noto Sans Bengali', sans-serif; padding: 10px; }
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
      .period-header { background: #d4edda; }
      .footer { margin-top: 8px; font-size: 9px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body><div style="position:relative;">`);
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

  const thStyle = "border border-border bg-emerald-100 dark:bg-emerald-900/30 px-1 py-2 text-center font-bold text-[11px]";
  const breakThStyle = "border border-border bg-emerald-200 dark:bg-emerald-800/40 font-bold text-[10px]";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[170px]">
          <Label className="text-xs">{bn ? 'একাডেমিক সেশন' : 'Session'}</Label>
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger><SelectValue placeholder={bn ? 'সেশন নির্বাচন' : 'Select session'} /></SelectTrigger>
            <SelectContent>
              {sessions?.map(s => <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn || s.name : s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs">{bn ? 'বিভাগ' : 'Division'}</Label>
          <Select value={selectedDivisionId} onValueChange={(v) => { setSelectedDivisionId(v); setSelectedClassId(''); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All'}</SelectItem>
              {divisions?.map(d => <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[150px]">
          <Label className="text-xs">{bn ? 'শ্রেণী' : 'Class'}</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger><SelectValue placeholder={bn ? 'শ্রেণী নির্বাচন' : 'Select class'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব শ্রেণী' : 'All Classes'}</SelectItem>
              {filteredClasses.map(c => (
                <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-1">
          <div>
            <Label className="text-xs">{bn ? 'পিরিয়ড' : 'Periods'}</Label>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPeriodCount(p => Math.max(1, p - 1))}><Minus className="h-3 w-3" /></Button>
              <span className="text-sm font-bold w-6 text-center">{bn ? toBn(periodCount) : periodCount}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPeriodCount(p => Math.min(12, p + 1))}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">{bn ? 'বিরতি পরে' : 'Break after'}</Label>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setBreakAfter(p => Math.max(1, p - 1))}><Minus className="h-3 w-3" /></Button>
              <span className="text-sm font-bold w-6 text-center">{bn ? toBn(breakAfter) : breakAfter}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setBreakAfter(p => Math.min(periodCount, p + 1))}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
        {selectedSessionId && selectedClassId && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> {bn ? 'প্রিন্ট' : 'Print'}
          </Button>
        )}
      </div>

      {!selectedSessionId || !selectedClassId ? (
        <div className="py-12 text-center text-muted-foreground">
          {bn ? 'একটি সেশন এবং শ্রেণী নির্বাচন করুন' : 'Select a session and class'}
        </div>
      ) : isAllClasses ? (
        /* ─── All Classes Master Grid (Rows = Classes, Columns = Periods) ─── */
        <div id="master-routine-print">
          <div className="border-2 border-border rounded-lg overflow-hidden bg-background">
            {/* Header */}
            <div className="text-center py-3 px-4 border-b-2 border-border relative">
              {institution?.logo_url && <img src={institution.logo_url} alt="" className="w-12 h-12 object-contain mx-auto mb-1" />}
              <h1 className="text-lg font-bold text-foreground leading-tight">{instName || (bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}</h1>
              {institution?.address && <p className="text-[10px] text-muted-foreground">{institution.address}</p>}
              <p className="text-xs font-semibold text-foreground mt-0.5">
                {bn ? 'মাস্টার রুটিন' : 'Master Routine'} — {selectedSession ? (bn ? selectedSession.name_bn || selectedSession.name : selectedSession.name) : ''}
              </p>
            </div>

            {/* Day selector tabs */}
            <div className="flex gap-1 p-2 border-b border-border flex-wrap">
              {DAYS.map(day => (
                <Button
                  key={day.value}
                  size="sm"
                  variant={selectedDay === day.value ? 'default' : 'outline'}
                  className="text-xs h-7 px-3"
                  onClick={() => setSelectedDay(day.value)}
                >
                  {bn ? day.short_bn : day.short_en}
                </Button>
              ))}
            </div>

            {/* Master grid: Rows = Classes, Cols = Periods */}
            <div className="overflow-x-auto p-2">
              <table className="w-full border-collapse" style={{ minWidth: periodColumns.length * 85 + 120 }}>
                <thead>
                  <tr>
                    <th className={thStyle} style={{ minWidth: 100 }}>
                      {bn ? 'শ্রেণী / পিরিয়ড' : 'Class / Period'}
                    </th>
                    {periodColumns.map((col, idx) => {
                      if (col.isBreak) {
                        return (
                          <th key={`br-${idx}`} className={breakThStyle}
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', padding: '8px 2px', minWidth: 28, maxWidth: 32 }}>
                            {bn ? 'বিরতি' : 'Break'}
                          </th>
                        );
                      }
                      return (
                        <th key={col.num} className={thStyle}>
                          <div className="font-bold text-xs">{periodLabelsMap[col.num]}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map(cls => {
                    const classRoutine = allRoutines?.find(r => r.class_id === cls.id);
                    const classPeriods = classRoutine ? allClassesPeriods?.filter(p => p.routine_id === classRoutine.id) : [];

                    const getClassPeriodData = (periodNum: number) => {
                      return classPeriods?.find(p => p.day_of_week === selectedDay && p.period_number === periodNum) || null;
                    };

                    return (
                      <tr key={cls.id} className="hover:bg-accent/5 transition-colors">
                        <td className="border border-border bg-accent/5 px-3 py-2 font-bold text-[11px] whitespace-nowrap text-center">
                          {bn ? cls.name_bn : cls.name}
                        </td>
                        {periodColumns.map((col, idx) => {
                          if (col.isBreak) {
                            return <td key={`br-${idx}`} className="border border-border bg-accent/5" />;
                          }
                          const period = getClassPeriodData(col.num);
                          const subj = period?.subjects as any;
                          const subjName = subj ? (bn ? subj.name_bn : subj.name) : '';
                          const teacherDisplay = bn
                            ? (period?.teacher_name_bn || period?.teacher_name || '')
                            : (period?.teacher_name || period?.teacher_name_bn || '');

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
                                  // For all-classes mode, save with the specific class
                                  const targetClassId = cId || cls.id;
                                  // We need to handle saving for a specific class in all-classes mode
                                  const saveForClass = async () => {
                                    let routineId = allRoutines?.find(r => r.class_id === targetClassId)?.id;
                                    if (!routineId) {
                                      const c = allClasses?.find(cc => cc.id === targetClassId);
                                      const { data: newR, error } = await supabase.from('class_routines').insert({
                                        class_id: targetClassId,
                                        academic_session_id: selectedSessionId,
                                        name: c?.name || 'Routine',
                                        name_bn: c?.name_bn || 'রুটিন',
                                        is_active: true,
                                      }).select('id').single();
                                      if (error) { toast.error(bn ? 'সেভ ব্যর্থ' : 'Save failed'); return; }
                                      routineId = newR.id;
                                    }
                                    const { data: existing } = await supabase.from('routine_periods').select('id')
                                      .eq('routine_id', routineId).eq('day_of_week', selectedDay).eq('period_number', col.num).maybeSingle();
                                    const periodData = {
                                      routine_id: routineId,
                                      day_of_week: selectedDay,
                                      period_number: col.num,
                                      subject_id: sId === 'none' ? null : sId || null,
                                      teacher_name: tn || null,
                                      teacher_name_bn: tnBn || null,
                                      is_break: false,
                                      start_time: '08:00',
                                      end_time: '08:45',
                                    };
                                    if (existing) {
                                      await supabase.from('routine_periods').update(periodData).eq('id', existing.id);
                                    } else {
                                      await supabase.from('routine_periods').insert(periodData);
                                    }
                                    queryClient.invalidateQueries({ queryKey: ['all-class-routines'] });
                                    queryClient.invalidateQueries({ queryKey: ['all-classes-periods'] });
                                    toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
                                  };
                                  saveForClass();
                                }}
                              >
                                <button className="w-full cursor-pointer hover:bg-accent/10 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 rounded-none">
                                  <div className="flex flex-col min-h-[42px]">
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5">
                                      <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                                        {subjName || <span className="text-muted-foreground/30">+</span>}
                                      </span>
                                    </div>
                                    <div className="border-t border-border/70" />
                                    <div className="flex-1 flex items-center justify-center px-1 py-0.5">
                                      <span className="text-[8px] text-muted-foreground leading-tight text-center">
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
            <div className="px-3 py-2 border-t border-border text-[9px] text-muted-foreground">
              {bn ? 'বি.দ্র. কর্তৃপক্ষ কর্তৃক পরিবর্তন করার ক্ষমতা এবং বিশেষ প্রয়োজনে অতিরিক্ত ক্লাশ নিতে পারবেন।' : 'Note: Schedule subject to change by administration.'}
            </div>
          </div>
        </div>
      ) : (
        /* ─── Single Class Weekly Grid (Rows = Days, Columns = Periods) ─── */
        <div id="master-routine-print">
          <div className="border-2 border-border rounded-lg overflow-hidden bg-background">
            {/* Header */}
            <div className="text-center py-3 px-4 border-b-2 border-border relative">
              <div className="absolute top-2 right-3 text-[10px] text-muted-foreground border border-border rounded px-2 py-0.5">
                {bn ? 'তারিখ:' : 'Date:'} {new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}
              </div>
              {institution?.logo_url && <img src={institution.logo_url} alt="" className="w-12 h-12 object-contain mx-auto mb-1" />}
              <h1 className="text-lg font-bold text-foreground leading-tight">{instName || (bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}</h1>
              {institution?.address && <p className="text-[10px] text-muted-foreground">{institution.address}</p>}
              <p className="text-xs font-semibold text-foreground mt-0.5">
                {bn ? 'সাপ্তাহিক ক্লাস রুটিন' : 'Weekly Class Routine'} — {selectedSession ? (bn ? selectedSession.name_bn || selectedSession.name : selectedSession.name) : ''}
              </p>
              {selectedCls && (
                <p className="text-sm font-bold text-foreground mt-0.5 bg-primary/10 inline-block px-4 py-0.5 rounded">
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
                          <th key={`br-${idx}`} className={breakThStyle}
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', padding: '8px 2px', minWidth: 28, maxWidth: 32 }}>
                            {bn ? 'বিরতি' : 'Break'}
                          </th>
                        );
                      }
                      const time = getPeriodTime(col.num);
                      return (
                        <th key={col.num} className={thStyle}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-full cursor-pointer hover:opacity-80 focus:outline-none">
                                <div className="font-bold text-xs">{periodLabelsMap[col.num]}</div>
                                <div className="text-[8px] font-normal opacity-70">
                                  {time.start ? `${fmtTime(time.start, bn)} - ${fmtTime(time.end, bn)}` : (bn ? 'সময় দিন' : 'Set time')}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-3 space-y-2" align="center">
                              <Label className="text-xs font-bold">{periodLabelsMap[col.num]} {bn ? 'পিরিয়ডের সময়' : 'Period Time'}</Label>
                               <div className="flex gap-2">
                                 <div className="flex-1">
                                   <Label className="text-[10px]">{bn ? 'শুরু' : 'Start'}</Label>
                                   <TimePicker className="h-7 text-xs" value={time.start}
                                     onChange={value => setPeriodTimes(prev => ({ ...prev, [col.num]: { ...prev[col.num], start: value, end: prev[col.num]?.end || time.end || '' } }))} />
                                 </div>
                                 <div className="flex-1">
                                   <Label className="text-[10px]">{bn ? 'শেষ' : 'End'}</Label>
                                   <TimePicker className="h-7 text-xs" value={time.end}
                                     onChange={value => setPeriodTimes(prev => ({ ...prev, [col.num]: { start: prev[col.num]?.start || time.start || '', end: value } }))} />
                                 </div>
                               </div>
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
                        const period = getPeriodData(day.value, col.num);
                        const subj = period?.subjects as any;
                        const subjName = subj ? (bn ? subj.name_bn : subj.name) : '';
                        const teacherDisplay = bn
                          ? (period?.teacher_name_bn || period?.teacher_name || '')
                          : (period?.teacher_name || period?.teacher_name_bn || '');

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
                              onSave={(sId, tn, tnBn) => handleCellSave(day.value, col.num, sId, tn, tnBn)}
                            >
                              <button className="w-full cursor-pointer hover:bg-accent/10 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 rounded-none">
                                <div className="flex flex-col min-h-[42px]">
                                  <div className="flex-1 flex items-center justify-center px-1 py-0.5">
                                    <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                                      {subjName || <span className="text-muted-foreground/30">+</span>}
                                    </span>
                                  </div>
                                  <div className="border-t border-border/70" />
                                  <div className="flex-1 flex items-center justify-center px-1 py-0.5">
                                    <span className="text-[8px] text-muted-foreground leading-tight text-center">
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
              {bn ? 'বি.দ্র. কর্তৃপক্ষ কর্তৃক পরিবর্তন করার ক্ষমতা এবং বিশেষ প্রয়োজনে অতিরিক্ত ক্লাশ নিতে পারবেন।' : 'Note: Schedule subject to change by administration.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterRoutineView;
