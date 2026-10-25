import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Copy, Eye, Clock, BookOpen, ArrowLeft, CalendarDays } from 'lucide-react';
import { useConfirm } from "@/contexts/ConfirmContext";
import { to12HourFormat } from '@/hooks/useTimeFormat';

const AdminExamRoutine = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', name_bn: '', exam_session_id: '', is_active: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch exam sessions
  const { data: examSessions } = useQuery({
    queryKey: ['exam-sessions-for-routine'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_sessions')
        .select('*, academic_sessions(name, name_bn)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects-for-exam-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes-for-exam-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch exam session subjects for auto-populate
  const getSessionSubjects = async (sessionId: string) => {
    const { data } = await supabase
      .from('exam_session_subjects')
      .select('subject_id, class_id, subjects(name, name_bn)')
      .eq('exam_session_id', sessionId);
    return data || [];
  };

  // Fetch routines
  const { data: routines, isLoading } = useQuery({
    queryKey: ['exam-routines'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_routines')
        .select('*, exam_sessions(name, name_bn, academic_sessions(name, name_bn))')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch entries for selected routine
  const { data: entries } = useQuery({
    queryKey: ['exam-routine-entries', selectedRoutineId],
    queryFn: async () => {
      if (!selectedRoutineId) return [];
      const { data } = await supabase
        .from('exam_routine_entries')
        .select('*, subjects(name, name_bn), classes(name, name_bn, divisions(name, name_bn))')
        .eq('routine_id', selectedRoutineId)
        .order('exam_date')
        .order('start_time');
      return data || [];
    },
    enabled: !!selectedRoutineId,
  });

  // Create routine
  const createRoutine = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('exam_routines').insert({
        name: form.name,
        name_bn: form.name_bn,
        exam_session_id: form.exam_session_id,
        is_active: form.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-routines'] });
      setShowCreate(false);
      setForm({ name: '', name_bn: '', exam_session_id: '', is_active: true });
      toast.success(bn ? 'রুটিন তৈরি হয়েছে' : 'Routine created');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  // Update routine
  const updateRoutine = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase.from('exam_routines').update({
        name: form.name,
        name_bn: form.name_bn,
        exam_session_id: form.exam_session_id,
        is_active: form.is_active,
      }).eq('id', editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-routines'] });
      setShowEdit(false);
      setEditingId(null);
      toast.success(bn ? 'আপডেট হয়েছে' : 'Updated');
    },
  });

  // Delete routine
  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exam_routines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-routines'] });
      if (selectedRoutineId) setSelectedRoutineId(null);
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  // Copy routine
  const copyRoutine = useMutation({
    mutationFn: async (routineId: string) => {
      const routine = routines?.find(r => r.id === routineId);
      if (!routine) return;
      const { data: newRoutine, error } = await supabase.from('exam_routines').insert({
        name: routine.name + ' (Copy)',
        name_bn: routine.name_bn + ' (কপি)',
        exam_session_id: routine.exam_session_id,
        is_active: false,
      }).select().single();
      if (error) throw error;
      const { data: srcEntries } = await supabase.from('exam_routine_entries').select('*').eq('routine_id', routineId);
      if (srcEntries && srcEntries.length > 0 && newRoutine) {
        const newEntries = srcEntries.map(({ id, routine_id, created_at, updated_at, ...rest }) => ({ ...rest, routine_id: newRoutine.id }));
        await supabase.from('exam_routine_entries').insert(newEntries);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-routines'] });
      toast.success(bn ? 'কপি হয়েছে' : 'Copied');
    },
  });

  // Entry CRUD
  const [entryForm, setEntryForm] = useState({
    id: '' as string | undefined,
    exam_date: '',
    subject_id: '',
    class_id: '',
    start_time: '09:00',
    end_time: '12:00',
    room: '',
    notes: '',
    notes_bn: '',
  });
  const [showEntryDialog, setShowEntryDialog] = useState(false);

  const saveEntry = useMutation({
    mutationFn: async () => {
      const payload = {
        routine_id: selectedRoutineId!,
        exam_date: entryForm.exam_date,
        subject_id: entryForm.subject_id || null,
        class_id: entryForm.class_id || null,
        start_time: entryForm.start_time,
        end_time: entryForm.end_time,
        room: entryForm.room || null,
        notes: entryForm.notes || null,
        notes_bn: entryForm.notes_bn || null,
      };
      if (entryForm.id) {
        const { error } = await supabase.from('exam_routine_entries').update(payload).eq('id', entryForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('exam_routine_entries').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-routine-entries', selectedRoutineId] });
      setShowEntryDialog(false);
      toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exam_routine_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-routine-entries', selectedRoutineId] }),
  });

  // Auto-populate from exam session subjects
  const autoPopulate = useMutation({
    mutationFn: async () => {
      const routine = routines?.find(r => r.id === selectedRoutineId);
      if (!routine) return;
      const sessionSubjects = await getSessionSubjects(routine.exam_session_id);
      if (sessionSubjects.length === 0) {
        toast.error(bn ? 'এই সেশনে কোনো বিষয় নেই' : 'No subjects in this session');
        return;
      }
      const today = new Date();
      const newEntries = sessionSubjects.map((ss, idx) => ({
        routine_id: selectedRoutineId!,
        exam_date: new Date(today.getTime() + idx * 86400000).toISOString().split('T')[0],
        subject_id: ss.subject_id,
        class_id: ss.class_id,
        start_time: '09:00',
        end_time: '12:00',
        sort_order: idx,
      }));
      const { error } = await supabase.from('exam_routine_entries').insert(newEntries);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-routine-entries', selectedRoutineId] });
      toast.success(bn ? 'বিষয়গুলো যোগ হয়েছে' : 'Subjects added');
    },
  });

  const openNewEntry = () => {
    setEntryForm({ id: undefined, exam_date: '', subject_id: '', class_id: '', start_time: '09:00', end_time: '12:00', room: '', notes: '', notes_bn: '' });
    setShowEntryDialog(true);
  };

  const openEditEntry = (e: any) => {
    setEntryForm({
      id: e.id, exam_date: e.exam_date, subject_id: e.subject_id || '',
      class_id: e.class_id || '', start_time: e.start_time, end_time: e.end_time,
      room: e.room || '', notes: e.notes || '', notes_bn: e.notes_bn || '',
    });
    setShowEntryDialog(true);
  };

  const selectedRoutine = routines?.find(r => r.id === selectedRoutineId);

  const RoutineFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'}</Label>
          <Input value={form.name_bn} onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))} /></div>
        <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      </div>
      <div>
        <Label>{bn ? 'পরীক্ষা সেশন' : 'Exam Session'}</Label>
        <Select value={form.exam_session_id} onValueChange={v => setForm(f => ({ ...f, exam_session_id: v }))}>
          <SelectTrigger><SelectValue placeholder={bn ? 'সেশন নির্বাচন' : 'Select session'} /></SelectTrigger>
          <SelectContent>
            {examSessions?.map(s => {
              const acad = s.academic_sessions as any;
              return (
                <SelectItem key={s.id} value={s.id}>
                  {bn ? s.name_bn : s.name}
                  {acad && ` (${bn ? acad.name_bn || acad.name : acad.name})`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
        <Label>{bn ? 'সক্রিয়' : 'Active'}</Label>
      </div>
    </div>
  );

  // ---- LIST VIEW ----
  if (!selectedRoutineId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold">{bn ? 'পরীক্ষার রুটিন' : 'Exam Routine'}</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{bn ? 'নতুন রুটিন' : 'New Routine'}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{bn ? 'নতুন পরীক্ষার রুটিন' : 'Create Exam Routine'}</DialogTitle></DialogHeader>
              <RoutineFormFields />
              <Button onClick={() => createRoutine.mutate()} disabled={!form.name || !form.name_bn || !form.exam_session_id}>
                {bn ? 'তৈরি করুন' : 'Create'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <p className="text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p> : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[40px]">#</TableHead>
                      <TableHead className="min-w-[150px]">{bn ? 'রুটিন নাম' : 'Routine Name'}</TableHead>
                      <TableHead className="min-w-[120px]">{bn ? 'পরীক্ষা সেশন' : 'Exam Session'}</TableHead>
                      <TableHead className="min-w-[120px]">{bn ? 'একাডেমিক সেশন' : 'Academic Session'}</TableHead>
                      <TableHead className="min-w-[80px]">{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                      <TableHead className="w-28 text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routines?.map((r, idx) => {
                      const es = r.exam_sessions as any;
                      const acad = es?.academic_sessions as any;
                      return (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedRoutineId(r.id)}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{bn ? r.name_bn : r.name}</TableCell>
                          <TableCell className="text-sm">{bn ? es?.name_bn || es?.name : es?.name}</TableCell>
                          <TableCell className="text-sm">{acad ? (bn ? acad.name_bn || acad.name : acad.name) : '-'}</TableCell>
                          <TableCell>
                            <Badge variant={r.is_active ? 'default' : 'secondary'}>
                              {r.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedRoutineId(r.id)}><Eye className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyRoutine.mutate(r.id)}><Copy className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                setForm({ name: r.name, name_bn: r.name_bn, exam_session_id: r.exam_session_id, is_active: r.is_active ?? true });
                                setEditingId(r.id);
                                setShowEdit(true);
                              }}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => {
                                if ((await confirm({ description: bn ? 'মুছে ফেলতে চান?' : 'Delete?', variant: 'destructive' }))) deleteRoutine.mutate(r.id);
                              }}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {routines?.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো রুটিন নেই' : 'No routines'}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showEdit} onOpenChange={v => { setShowEdit(v); if (!v) setEditingId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{bn ? 'রুটিন সম্পাদনা' : 'Edit Routine'}</DialogTitle></DialogHeader>
            <RoutineFormFields />
            <Button onClick={() => updateRoutine.mutate()} disabled={!form.name || !form.name_bn || !form.exam_session_id}>
              {bn ? 'আপডেট করুন' : 'Update'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Group entries by date
  const entriesByDate: Record<string, typeof entries> = {};
  entries?.forEach(e => {
    if (!entriesByDate[e.exam_date]) entriesByDate[e.exam_date] = [];
    entriesByDate[e.exam_date]!.push(e);
  });
  const sortedDates = Object.keys(entriesByDate).sort();

  // ---- DETAIL VIEW ----
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setSelectedRoutineId(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {bn ? 'পেছনে' : 'Back'}
        </Button>
        <h1 className="text-lg font-bold flex-1 min-w-0 truncate">
          {bn ? selectedRoutine?.name_bn : selectedRoutine?.name}
        </h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={openNewEntry}>
          <Plus className="h-4 w-4 mr-1" />{bn ? 'এন্ট্রি যোগ' : 'Add Entry'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => autoPopulate.mutate()} disabled={autoPopulate.isPending}>
          <BookOpen className="h-4 w-4 mr-1" />{bn ? 'সেশন থেকে বিষয় আনুন' : 'Auto from Session'}
        </Button>
      </div>

      {/* Entry dialog */}
      <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{entryForm.id ? (bn ? 'এন্ট্রি সম্পাদনা' : 'Edit Entry') : (bn ? 'নতুন এন্ট্রি' : 'New Entry')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'পরীক্ষার তারিখ' : 'Exam Date'}</Label>
              <DatePicker bengali={bn} value={entryForm.exam_date} onChange={v => setEntryForm(f => ({ ...f, exam_date: v }))} />
            </div>
            <div><Label>{bn ? 'বিষয়' : 'Subject'}</Label>
              <Select value={entryForm.subject_id} onValueChange={v => setEntryForm(f => ({ ...f, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder={bn ? 'বিষয় নির্বাচন' : 'Select subject'} /></SelectTrigger>
                <SelectContent>
                  {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{bn ? 'শ্রেণী (ঐচ্ছিক)' : 'Class (Optional)'}</Label>
              <Select value={entryForm.class_id} onValueChange={v => setEntryForm(f => ({ ...f, class_id: v }))}>
                <SelectTrigger><SelectValue placeholder={bn ? 'শ্রেণী নির্বাচন' : 'Select class'} /></SelectTrigger>
                <SelectContent>
                  {classes?.map(c => {
                    const div = c.divisions as any;
                    return <SelectItem key={c.id} value={c.id}>{bn ? `${div?.name_bn || ''} - ${c.name_bn}` : `${div?.name || ''} - ${c.name}`}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'শুরু' : 'Start'}</Label>
                <TimePicker value={entryForm.start_time} onChange={v => setEntryForm(f => ({ ...f, start_time: v }))} />
              </div>
              <div><Label>{bn ? 'শেষ' : 'End'}</Label>
                <TimePicker value={entryForm.end_time} onChange={v => setEntryForm(f => ({ ...f, end_time: v }))} />
              </div>
            </div>
            <div><Label>{bn ? 'রুম/হল' : 'Room/Hall'}</Label>
              <Input value={entryForm.room} onChange={e => setEntryForm(f => ({ ...f, room: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'মন্তব্য (বাংলা)' : 'Notes (BN)'}</Label>
                <Input value={entryForm.notes_bn} onChange={e => setEntryForm(f => ({ ...f, notes_bn: e.target.value }))} />
              </div>
              <div><Label>{bn ? 'মন্তব্য (ইংরেজি)' : 'Notes (EN)'}</Label>
                <Input value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full" onClick={() => saveEntry.mutate()} disabled={!entryForm.exam_date || !entryForm.start_time || !entryForm.end_time}>
              {entryForm.id ? (bn ? 'আপডেট' : 'Update') : (bn ? 'যোগ করুন' : 'Add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exam routine table */}
      {(entries?.length || 0) === 0 ? (
        <p className="text-center text-muted-foreground py-8">{bn ? 'কোনো এন্ট্রি নেই। "সেশন থেকে বিষয় আনুন" বাটনে ক্লিক করে স্বয়ংক্রিয়ভাবে বিষয় যোগ করুন।' : 'No entries. Click "Auto from Session" to populate.'}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[40px]">#</TableHead>
                    <TableHead className="min-w-[120px]"><CalendarDays className="h-3 w-3 inline mr-1" />{bn ? 'তারিখ' : 'Date'}</TableHead>
                    <TableHead className="min-w-[80px]">{bn ? 'বার' : 'Day'}</TableHead>
                    <TableHead className="min-w-[120px]"><BookOpen className="h-3 w-3 inline mr-1" />{bn ? 'বিষয়' : 'Subject'}</TableHead>
                    <TableHead className="min-w-[100px]">{bn ? 'শ্রেণী' : 'Class'}</TableHead>
                    <TableHead className="min-w-[100px]"><Clock className="h-3 w-3 inline mr-1" />{bn ? 'সময়' : 'Time'}</TableHead>
                    <TableHead>{bn ? 'রুম' : 'Room'}</TableHead>
                    <TableHead>{bn ? 'মন্তব্য' : 'Notes'}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.map((e, idx) => {
                    const subj = e.subjects as any;
                    const cls = e.classes as any;
                    const div = cls?.divisions as any;
                    const dateObj = new Date(e.exam_date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { weekday: 'short' });
                    const formattedDate = dateObj.toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{formattedDate}</TableCell>
                        <TableCell className="text-xs">{dayName}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {subj ? (bn ? subj.name_bn : subj.name) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {cls ? (bn ? `${div?.name_bn || ''} - ${cls.name_bn}` : `${div?.name || ''} - ${cls.name}`) : (bn ? 'সকল' : 'All')}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {to12HourFormat(e.start_time, bn)} - {to12HourFormat(e.end_time, bn)}
                        </TableCell>
                        <TableCell className="text-xs">{e.room || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{bn ? e.notes_bn : e.notes || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditEntry(e)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteEntry.mutate(e.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminExamRoutine;
