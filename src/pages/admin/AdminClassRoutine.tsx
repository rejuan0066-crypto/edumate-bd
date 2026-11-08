import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Copy, Eye, Clock, BookOpen, Printer, LayoutGrid, List, RotateCcw, Sparkles } from 'lucide-react';
import MasterRoutineView from '@/components/routine/MasterRoutineView';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useConfirm } from "@/contexts/ConfirmContext";
import { to12HourFormat } from '@/hooks/useTimeFormat';

const DAYS = [
  { value: 0, label_bn: 'শনিবার', label_en: 'Saturday' },
  { value: 1, label_bn: 'রবিবার', label_en: 'Sunday' },
  { value: 2, label_bn: 'সোমবার', label_en: 'Monday' },
  { value: 3, label_bn: 'মঙ্গলবার', label_en: 'Tuesday' },
  { value: 4, label_bn: 'বুধবার', label_en: 'Wednesday' },
  { value: 5, label_bn: 'বৃহস্পতিবার', label_en: 'Thursday' },
  { value: 6, label_bn: 'শুক্রবার', label_en: 'Friday' },
];

interface RoutinePeriod {
  id?: string;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  teacher_name: string;
  teacher_name_bn: string;
  room: string;
  is_break: boolean;
  break_label: string;
  break_label_bn: string;
}

const AdminClassRoutine = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', name_bn: '', class_id: '', academic_session_id: '', is_active: true });
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('class_routine_active_tab');
    if (saved === 'master') {
      localStorage.setItem('class_routine_active_tab', 'individual');
      return 'individual';
    }
    return saved || 'individual';
  });

  // Fetch institution
  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn, division_id, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch sessions
  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  // Fetch routines
  const { data: routines, isLoading } = useQuery({
    queryKey: ['class-routines'],
    queryFn: async () => {
      const { data } = await supabase.from('class_routines').select('*, classes(name, name_bn, divisions(name, name_bn)), academic_sessions(name, name_bn)').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch periods for selected routine
  const { data: periods } = useQuery({
    queryKey: ['routine-periods', selectedRoutineId],
    queryFn: async () => {
      if (!selectedRoutineId) return [];
      const { data } = await supabase.from('routine_periods').select('*, subjects(name, name_bn)').eq('routine_id', selectedRoutineId).order('day_of_week').order('period_number');
      return data || [];
    },
    enabled: !!selectedRoutineId,
  });

  // Create routine
  const createRoutine = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('class_routines').insert({
        name: form.name,
        name_bn: form.name_bn,
        class_id: form.class_id,
        academic_session_id: form.academic_session_id || null,
        is_active: form.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-routines'] });
      setShowCreate(false);
      setForm({ name: '', name_bn: '', class_id: '', academic_session_id: '', is_active: true });
      toast.success(language === 'bn' ? 'রুটিন তৈরি হয়েছে' : 'Routine created');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error'),
  });

  // Update routine
  const updateRoutine = useMutation({
    mutationFn: async () => {
      if (!editingRoutineId) return;
      const { error } = await supabase.from('class_routines').update({
        name: form.name,
        name_bn: form.name_bn,
        class_id: form.class_id,
        academic_session_id: form.academic_session_id || null,
        is_active: form.is_active,
      }).eq('id', editingRoutineId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-routines'] });
      setShowEdit(false);
      setEditingRoutineId(null);
      toast.success(language === 'bn' ? 'রুটিন আপডেট হয়েছে' : 'Routine updated');
    },
  });

  // Delete routine
  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_routines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-routines'] });
      if (selectedRoutineId) setSelectedRoutineId(null);
      toast.success(language === 'bn' ? 'রুটিন মুছে ফেলা হয়েছে' : 'Routine deleted');
    },
  });

  // Reset all periods of a routine
  const resetRoutine = useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await supabase.from('routine_periods').delete().eq('routine_id', routineId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine-periods', selectedRoutineId] });
      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['all-class-routines'] });
      qc.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(language === 'bn' ? 'রুটিনের সকল পিরিয়ড রিসেট করা হয়েছে' : 'Routine reset successfully');
    },
    onError: () => toast.error(language === 'bn' ? 'রিসেট ব্যর্থ হয়েছে' : 'Reset failed'),
  });

  // Helper to create default 8 periods for an empty routine
  const handleCreateDefaultPeriods = async (routineId: string) => {
    try {
      const defaultSlots = [
        { num: 1, start: '09:00', end: '09:45', isBreak: false },
        { num: 2, start: '09:45', end: '10:30', isBreak: false },
        { num: 3, start: '10:30', end: '11:15', isBreak: false },
        { num: 4, start: '11:15', end: '12:00', isBreak: false },
        { num: 5, start: '12:00', end: '12:45', isBreak: false },
        { num: 6, start: '12:45', end: '01:30', isBreak: false },
        { num: 7, start: '01:30', end: '02:15', isBreak: false },
        { num: 8, start: '02:15', end: '03:00', isBreak: false },
      ];

      const newRows: any[] = [];
      for (let day = 0; day <= 5; day++) {
        for (const slot of defaultSlots) {
          newRows.push({
            routine_id: routineId,
            day_of_week: day,
            period_number: slot.num,
            start_time: slot.start,
            end_time: slot.end,
            subject_id: null,
            teacher_name: '',
            teacher_name_bn: '',
            room: '',
            is_break: slot.isBreak,
          });
        }
      }

      const { error } = await supabase.from('routine_periods').insert(newRows);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ['routine-periods', routineId] });
      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(language === 'bn' ? 'ডিফল্ট ৮টি পিরিয়ড তৈরি হয়েছে' : 'Default 8 periods created');
    } catch (err: any) {
      console.error(err);
      toast.error(language === 'bn' ? 'ডিফল্ট পিরিয়ড তৈরিতে সমস্যা হয়েছে' : 'Failed to create default periods');
    }
  };

  // Add/update period
  const savePeriod = useMutation({
    mutationFn: async (period: RoutinePeriod) => {
      if (period.id) {
        const { id, ...rest } = period;
        const { error } = await supabase.from('routine_periods').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routine_periods').insert({ ...period, routine_id: selectedRoutineId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine-periods', selectedRoutineId] });
      toast.success(language === 'bn' ? 'পিরিয়ড সেভ হয়েছে' : 'Period saved');
    },
  });

  // Delete period
  const deletePeriod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routine_periods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routine-periods', selectedRoutineId] });
    },
  });

  // Copy routine
  const copyRoutine = useMutation({
    mutationFn: async (routineId: string) => {
      const routine = routines?.find(r => r.id === routineId);
      if (!routine) return;
      const { data: newRoutine, error } = await supabase.from('class_routines').insert({
        name: routine.name + ' (Copy)',
        name_bn: routine.name_bn + ' (কপি)',
        class_id: routine.class_id,
        academic_session_id: routine.academic_session_id,
        is_active: false,
      }).select().single();
      if (error) throw error;
      // Copy periods
      const { data: srcPeriods } = await supabase.from('routine_periods').select('*').eq('routine_id', routineId);
      if (srcPeriods && srcPeriods.length > 0 && newRoutine) {
        const newPeriods = srcPeriods.map(({ id, routine_id, created_at, updated_at, ...rest }) => ({ ...rest, routine_id: newRoutine.id }));
        await supabase.from('routine_periods').insert(newPeriods);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-routines'] });
      toast.success(language === 'bn' ? 'রুটিন কপি হয়েছে' : 'Routine copied');
    },
  });

  const selectedRoutine = routines?.find(r => r.id === selectedRoutineId);

  // Period editor state
  const [periodForm, setPeriodForm] = useState<RoutinePeriod>({
    day_of_week: 0, period_number: 1, start_time: '08:00', end_time: '08:45',
    subject_id: null, teacher_name: '', teacher_name_bn: '', room: '',
    is_break: false, break_label: '', break_label_bn: '',
  });
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);

  const openEditPeriod = (p: any) => {
    setPeriodForm({
      id: p.id, day_of_week: p.day_of_week, period_number: p.period_number,
      start_time: p.start_time, end_time: p.end_time, subject_id: p.subject_id,
      teacher_name: p.teacher_name || '', teacher_name_bn: p.teacher_name_bn || '',
      room: p.room || '', is_break: p.is_break || false,
      break_label: p.break_label || '', break_label_bn: p.break_label_bn || '',
    });
    setShowPeriodDialog(true);
  };

  const openNewPeriod = (day?: number) => {
    const dayPeriods = periods?.filter(p => p.day_of_week === (day ?? 0)) || [];
    const nextNum = dayPeriods.length > 0 ? Math.max(...dayPeriods.map(p => p.period_number)) + 1 : 1;
    const lastEnd = dayPeriods.length > 0 ? dayPeriods[dayPeriods.length - 1].end_time : '08:00';
    setPeriodForm({
      day_of_week: day ?? 0, period_number: nextNum, start_time: lastEnd, end_time: lastEnd,
      subject_id: null, teacher_name: '', teacher_name_bn: '', room: '',
      is_break: false, break_label: '', break_label_bn: '',
    });
    setShowPeriodDialog(true);
  };

  // Group periods by day
  const periodsByDay = DAYS.map(day => ({
    ...day,
    periods: (periods || []).filter(p => p.day_of_week === day.value).sort((a, b) => a.period_number - b.period_number),
  }));

  const RoutineFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>{language === 'bn' ? 'নাম (বাংলা)' : 'Name (Bangla)'}</Label>
          <Input value={form.name_bn} onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))} /></div>
        <div><Label>{language === 'bn' ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>{language === 'bn' ? 'শ্রেণী' : 'Class'}</Label>
          <Select value={form.class_id} onValueChange={v => setForm(f => ({ ...f, class_id: v }))}>
            <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'শ্রেণী নির্বাচন' : 'Select class'} /></SelectTrigger>
            <SelectContent>
              {classes?.map(c => {
                const div = c.divisions as any;
                return <SelectItem key={c.id} value={c.id}>{language === 'bn' ? `${div?.name_bn || ''} - ${c.name_bn}` : `${div?.name || ''} - ${c.name}`}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div><Label>{language === 'bn' ? 'একাডেমিক সেশন' : 'Academic Session'}</Label>
          <Select value={form.academic_session_id} onValueChange={v => setForm(f => ({ ...f, academic_session_id: v }))}>
            <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'সেশন নির্বাচন' : 'Select session'} /></SelectTrigger>
            <SelectContent>
              {sessions?.map(s => <SelectItem key={s.id} value={s.id}>{language === 'bn' ? s.name_bn || s.name : s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
        <Label>{language === 'bn' ? 'সক্রিয়' : 'Active'}</Label>
      </div>
    </div>
  );

  // ---- LIST VIEW ----
  if (!selectedRoutineId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{bn ? 'ক্লাস রুটিন' : 'Class Routine'}</h1>

        <Tabs
          value={activeTab}
          onValueChange={v => {
            setActiveTab(v);
            localStorage.setItem('class_routine_active_tab', v);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="individual" className="gap-1.5 text-xs font-semibold">
              <List className="h-3.5 w-3.5" /> {bn ? 'ক্লাস রুটিন তালিকা' : 'Class Routine List'}
            </TabsTrigger>
            <TabsTrigger value="master" className="gap-1.5 text-xs font-semibold">
              <LayoutGrid className="h-3.5 w-3.5" /> {bn ? 'দৈনিক মাস্টার রুটিন' : 'Daily Master Routine'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-4 mt-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="min-w-[180px]">
                <Label className="text-xs">{bn ? 'শ্রেণী অনুযায়ী ফিল্টার' : 'Filter by Class'}</Label>
                <Select value={filterClassId} onValueChange={setFilterClassId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
                    {classes?.map(c => {
                      const div = (c as any).divisions;
                      return <SelectItem key={c.id} value={c.id}>{bn ? `${div?.name_bn || ''} - ${c.name_bn}` : `${div?.name || ''} - ${c.name}`}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />{bn ? 'নতুন রুটিন' : 'New Routine'}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{bn ? 'নতুন রুটিন তৈরি' : 'Create Routine'}</DialogTitle></DialogHeader>
                  <RoutineFormFields />
                  <Button onClick={() => createRoutine.mutate()} disabled={!form.name || !form.name_bn || !form.class_id}>
                    {bn ? 'তৈরি করুন' : 'Create'}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? <p className="text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p> : (() => {
              const filtered = filterClassId === 'all' ? routines : routines?.filter(r => r.class_id === filterClassId);
              return (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[40px]">#</TableHead>
                          <TableHead className="min-w-[150px]">{bn ? 'রুটিন নাম' : 'Routine Name'}</TableHead>
                          <TableHead className="min-w-[120px]">{bn ? 'শ্রেণী' : 'Class'}</TableHead>
                          <TableHead className="min-w-[120px]">{bn ? 'সেশন' : 'Session'}</TableHead>
                          <TableHead className="min-w-[80px]">{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                          <TableHead className="w-28 text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered?.map((r, idx) => {
                          const cls = r.classes as any;
                          const div = cls?.divisions as any;
                          const sess = r.academic_sessions as any;
                          return (
                            <TableRow key={r.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedRoutineId(r.id)}>
                              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{bn ? r.name_bn : r.name}</TableCell>
                              <TableCell className="text-sm">{bn ? `${div?.name_bn || ''} - ${cls?.name_bn || ''}` : `${div?.name || ''} - ${cls?.name || ''}`}</TableCell>
                              <TableCell className="text-sm">{sess ? (bn ? sess.name_bn || sess.name : sess.name) : '-'}</TableCell>
                              <TableCell>
                                <Badge variant={r.is_active ? 'default' : 'secondary'}>
                                  {r.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex gap-1 justify-end">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" title={bn ? 'ফুল রুটিন দেখুন' : 'View Full Routine'} onClick={() => setSelectedRoutineId(r.id)}><Eye className="h-3.5 w-3.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40" title={bn ? 'রুটিন তথ্য সম্পাদনা' : 'Edit Routine'} onClick={() => {
                                    setForm({ name: r.name, name_bn: r.name_bn, class_id: r.class_id, academic_session_id: r.academic_session_id || '', is_active: r.is_active ?? true });
                                    setEditingRoutineId(r.id);
                                    setShowEdit(true);
                                  }}><Edit className="h-3.5 w-3.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40" title={bn ? 'রুটিন রিসেট (সকল পিরিয়ড মুছুন)' : 'Reset Routine'} onClick={async () => {
                                    if ((await confirm({
                                      title: bn ? 'রুটিন রিসেট নিশ্চিতকরণ' : 'Confirm Reset',
                                      description: bn ? `আপনি কি নিশ্চিত যে "${bn ? r.name_bn : r.name}" রুটিনের সকল পিরিয়ড রিসেট করতে চান? সব পিরিয়ড খালি হয়ে যাবে।` : `Reset all periods for "${r.name}"?`,
                                      variant: 'destructive',
                                    }))) {
                                      resetRoutine.mutate(r.id);
                                    }
                                  }}><RotateCcw className="h-3.5 w-3.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title={bn ? 'রুটিন কপি' : 'Copy Routine'} onClick={() => copyRoutine.mutate(r.id)}><Copy className="h-3.5 w-3.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" title={bn ? 'রুটিন ডিলিট' : 'Delete Routine'} onClick={async () => {
                                    if ((await confirm({ description: bn ? 'মুছে ফেলতে চান?' : 'Delete?', variant: 'destructive' }))) deleteRoutine.mutate(r.id);
                                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(!filtered || filtered.length === 0) && (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো রুটিন নেই' : 'No routines'}</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="master" className="mt-4">
            <MasterRoutineView />
          </TabsContent>
        </Tabs>

        {/* Edit dialog */}
        <Dialog open={showEdit} onOpenChange={v => { setShowEdit(v); if (!v) setEditingRoutineId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{bn ? 'রুটিন সম্পাদনা' : 'Edit Routine'}</DialogTitle></DialogHeader>
            <RoutineFormFields />
            <Button onClick={() => updateRoutine.mutate()} disabled={!form.name || !form.name_bn || !form.class_id}>
              {bn ? 'আপডেট করুন' : 'Update'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Helper: format time to bn
  const fmtTime = (t: string) => to12HourFormat(t, bn);
  
  const toBnNum = (n: number) => bn ? String(n).replace(/\d/g, (d: string) => '০১২৩৪৫৬৭৮৯'[Number(d)]) : String(n);

  const PERIOD_LABELS_BN = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'];
  const PERIOD_LABELS_EN = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  const cls = selectedRoutine?.classes as any;
  const div = cls?.divisions as any;
  const sess = selectedRoutine?.academic_sessions as any;
  const instName = bn ? institution?.name : (institution?.name_en || institution?.name);

  // Collect unique period numbers across all days
  const allPeriodNums = [...new Set((periods || []).map(p => p.period_number))].sort((a, b) => a - b);

  // Find break periods
  const breakNums = new Set((periods || []).filter(p => p.is_break).map(p => p.period_number));

  // Split periods: before break, break, after break
  const beforeBreak = allPeriodNums.filter(n => !breakNums.has(n) && (breakNums.size === 0 || n < Math.min(...breakNums)));
  const breakPeriods = allPeriodNums.filter(n => breakNums.has(n));
  const afterBreak = allPeriodNums.filter(n => !breakNums.has(n) && breakNums.size > 0 && n > Math.max(...breakNums));
  const orderedNums = breakNums.size > 0 ? [...beforeBreak, ...breakPeriods, ...afterBreak] : allPeriodNums;

  // Print handler
  const handlePrint = () => {
    const el = document.getElementById('routine-print-area');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${bn ? 'ক্লাস রুটিন' : 'Class Routine'}</title>
    <style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'SutonnyOMJ', 'Noto Sans Bengali', sans-serif; padding: 15px; }
      @page { size: A4 landscape; margin: 10mm; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1.5px solid #333; padding: 4px 6px; text-align: center; font-size: 11px; vertical-align: middle; }
      th { background: #f0f0f0; font-weight: 600; }
      .header { text-align: center; margin-bottom: 10px; }
      .header h1 { font-size: 18px; font-weight: 700; }
      .header p { font-size: 12px; margin: 2px 0; }
      .date-box { position: absolute; top: 15px; right: 20px; font-size: 11px; }
      .break-col { background: #e8f5e9 !important; writing-mode: vertical-rl; text-orientation: mixed; font-weight: 600; font-size: 10px; min-width: 28px; max-width: 32px; }
      .after-break { background: #f0faf0; }
      .after-break-head { background: #d4edda !important; }
      .day-cell { background: #f5f5f5; font-weight: 600; text-align: left; padding-left: 8px; white-space: nowrap; }
      .subject { font-weight: 600; font-size: 11px; }
      .teacher { font-size: 9px; color: #555; }
      .footer { margin-top: 8px; font-size: 10px; text-align: left; }
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

  // ---- DETAIL VIEW (Full Master Routine Table for Selected Class) ----
  return (
    <div className="space-y-4">
      <MasterRoutineView
        initialClassId={selectedRoutine?.class_id}
        initialSessionId={selectedRoutine?.academic_session_id || undefined}
        onBack={() => setSelectedRoutineId(null)}
        showBackToList={true}
      />
    </div>
  );
};

export default AdminClassRoutine;
