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
import { RoutineSetupDialog } from '@/components/routine/RoutineSetupDialog';

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

interface MasterRoutineItem {
  id: string;
  name: string;
  name_bn: string;
  session_id: string;
  session_name: string;
  period_count: number;
  break_after: number;
  is_active: boolean;
  is_default?: boolean;
}

const DEFAULT_MASTER_ROUTINES: MasterRoutineItem[] = [
  {
    id: 'daily-master-routine-2026-27',
    name: 'Daily Class Routine 2026-27',
    name_bn: 'দৈনিক ক্লাস রুটিন — ২০২৬-২৭',
    session_id: 'b34fd827-6ef8-443a-a810-b4e5e372d888',
    session_name: '২০২৬-২৭',
    period_count: 8,
    break_after: 4,
    is_active: true,
    is_default: true,
  },
];

const AdminClassRoutine = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [newRoutineForm, setNewRoutineForm] = useState({
    name: '',
    name_bn: '',
    session_id: 'b34fd827-6ef8-443a-a810-b4e5e372d888',
    session_name: '২০২৬-২৭',
    period_count: 8,
    break_after: 4,
    is_active: true,
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

  // Fetch sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-for-routine'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch Master Routines Catalog (stored in website_settings)
  const { data: routineList = DEFAULT_MASTER_ROUTINES, isLoading } = useQuery<MasterRoutineItem[]>({
    queryKey: ['master-routines-catalog'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'master_routines_catalog')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        return data.value as MasterRoutineItem[];
      }
      return DEFAULT_MASTER_ROUTINES;
    },
  });

  // Create new Master Routine
  const createMasterRoutine = useMutation({
    mutationFn: async () => {
      const selectedSess = sessions.find((s: any) => s.id === newRoutineForm.session_id);
      const newItem: MasterRoutineItem = {
        id: `routine-${Date.now()}`,
        name: newRoutineForm.name.trim() || newRoutineForm.name_bn.trim(),
        name_bn: newRoutineForm.name_bn.trim(),
        session_id: newRoutineForm.session_id,
        session_name: bn ? (selectedSess?.name_bn || selectedSess?.name || '২০২৬-২৭') : (selectedSess?.name || '2026-27'),
        period_count: Number(newRoutineForm.period_count) || 8,
        break_after: Number(newRoutineForm.break_after) || 4,
        is_active: newRoutineForm.is_active,
        is_default: false,
      };

      const updated = [...routineList, newItem];
      const { error } = await supabase
        .from('website_settings')
        .upsert({
          key: 'master_routines_catalog',
          value: updated as any,
        }, { onConflict: 'key' });

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-routines-catalog'] });
      setShowCreate(false);
      setNewRoutineForm({
        name: '',
        name_bn: '',
        session_id: sessions[0]?.id || 'b34fd827-6ef8-443a-a810-b4e5e372d888',
        session_name: '২০২৬-২৭',
        period_count: 8,
        break_after: 4,
        is_active: true,
      });
      toast.success(bn ? 'নতুন রুটিন সফলভাবে তৈরি হয়েছে' : 'New routine created successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || (bn ? 'রুটিন তৈরি ব্যর্থ হয়েছে' : 'Failed to create routine'));
    },
  });

  // Delete Routine
  const deleteMasterRoutine = useMutation({
    mutationFn: async (id: string) => {
      const updated = routineList.filter(r => r.id !== id);
      const { error } = await supabase
        .from('website_settings')
        .upsert({
          key: 'master_routines_catalog',
          value: updated as any,
        }, { onConflict: 'key' });

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-routines-catalog'] });
      if (selectedRoutineId) setSelectedRoutineId(null);
      toast.success(bn ? 'রুটিন মুছে ফেলা হয়েছে' : 'Routine deleted');
    },
  });

  // Reset Routine Periods
  const resetAllPeriods = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('routine_periods').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['all-class-routines'] });
      qc.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(bn ? 'রুটিনের সকল পিরিয়ড সফলভাবে রিসেট করা হয়েছে' : 'All routine periods reset successfully');
    },
    onError: () => toast.error(bn ? 'রিসেট ব্যর্থ হয়েছে' : 'Reset failed'),
  });

  const selectedRoutine = routineList.find(r => r.id === selectedRoutineId) || routineList[0];



  // ---- LIST VIEW: When no routine is clicked, show Routine Names List ----
  if (!selectedRoutineId) {
    return (
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{bn ? 'ক্লাস রুটিন' : 'Class Routine'}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bn ? 'রুটিনের নামের উপর ক্লিক করে সম্পূর্ণ ক্লাস রুটিন টেবিল দেখুন ও পিরিয়ড এন্ট্রি করুন' : 'Click on any routine name to open the timetable and manage periods'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 font-semibold"
              onClick={() => setShowSetupDialog(true)}
            >
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>{bn ? 'স্ট্যান্ডার্ড রুটিন অটো-ফিল / রিসেট' : 'Auto-Fill / Setup Routine'}</span>
            </Button>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 font-semibold">
                  <Plus className="h-4 w-4" />{bn ? 'নতুন রুটিন তৈরি' : 'New Routine'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{bn ? 'নতুন রুটিন তৈরি করুন' : 'Create New Routine'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3.5 py-2">
                  <div>
                    <Label className="text-xs font-semibold">{bn ? 'রুটিনের নাম (বাংলা) *' : 'Routine Name (Bangla) *'}</Label>
                    <Input
                      placeholder={bn ? 'যেমন: রমজান মাসের ক্লাস রুটিন' : 'e.g. Ramadan Routine'}
                      value={newRoutineForm.name_bn}
                      onChange={e => setNewRoutineForm(f => ({ ...f, name_bn: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">{bn ? 'রুটিনের নাম (ইংরেজি)' : 'Routine Name (English)'}</Label>
                    <Input
                      placeholder={bn ? 'যেমন: Ramadan Class Routine' : 'e.g. Ramadan Class Routine'}
                      value={newRoutineForm.name}
                      onChange={e => setNewRoutineForm(f => ({ ...f, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">{bn ? 'শিক্ষাবর্ষ' : 'Academic Session'}</Label>
                    <Select
                      value={newRoutineForm.session_id}
                      onValueChange={v => {
                        const s = sessions.find((item: any) => item.id === v);
                        setNewRoutineForm(f => ({
                          ...f,
                          session_id: v,
                          session_name: bn ? (s?.name_bn || s?.name || '২০২৬-২৭') : (s?.name || '2026-27'),
                        }));
                      }}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sessions.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn || s.name : s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">{bn ? 'মোট পিরিয়ড সংখ্যা' : 'Period Count'}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={newRoutineForm.period_count}
                        onChange={e => setNewRoutineForm(f => ({ ...f, period_count: Number(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">{bn ? 'বিরতি পিরিয়ড' : 'Break After'}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={newRoutineForm.break_after}
                        onChange={e => setNewRoutineForm(f => ({ ...f, break_after: Number(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={newRoutineForm.is_active}
                      onCheckedChange={v => setNewRoutineForm(f => ({ ...f, is_active: v }))}
                    />
                    <Label className="text-xs font-semibold">{bn ? 'সক্রিয় রুটিন' : 'Active Routine'}</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowCreate(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
                  <Button
                    onClick={() => createMasterRoutine.mutate()}
                    disabled={!newRoutineForm.name_bn.trim() || createMasterRoutine.isPending}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    {bn ? 'তৈরি করুন' : 'Create'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Routine Names List Table */}
        <Card className="border border-border shadow-xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[200px]">{bn ? 'রুটিনের নাম' : 'Routine Name'}</TableHead>
                    <TableHead className="min-w-[120px]">{bn ? 'শিক্ষাবর্ষ' : 'Academic Session'}</TableHead>
                    <TableHead className="min-w-[150px]">{bn ? 'আওতা / জামাত' : 'Scope / Classes'}</TableHead>
                    <TableHead className="min-w-[130px]">{bn ? 'পিরিয়ড বিন্যাস' : 'Period Setup'}</TableHead>
                    <TableHead className="min-w-[90px]">{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="w-32 text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routineList.map((r, idx) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors group"
                      onClick={() => setSelectedRoutineId(r.id)}
                    >
                      <TableCell className="text-xs text-muted-foreground text-center font-semibold">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-bold text-base text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>{bn ? r.name_bn : r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {r.session_name || '২০২৬-২৭'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="font-normal border-emerald-300 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">
                          {bn ? 'সকল শ্রেণী (১১টি জামাত)' : 'All 11 Classes'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {bn ? `${r.period_count}টি পিরিয়ড (${r.break_after}র্থ বিরতি)` : `${r.period_count} Periods (Break ${r.break_after})`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? 'default' : 'secondary'} className={r.is_active ? 'bg-emerald-600' : ''}>
                          {r.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end items-center">
                          <Button
                            size="sm"
                            className="h-8 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 shadow-xs"
                            onClick={() => setSelectedRoutineId(r.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{bn ? 'টেবিল দেখুন' : 'View'}</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title={bn ? 'রুটিন রিসেট ও সেটআপ' : 'Reset & Setup Routine'}
                            onClick={() => setShowSetupDialog(true)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          {!r.is_default && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              title={bn ? 'রুটিন মুছুন' : 'Delete Routine'}
                              onClick={async () => {
                                if ((await confirm({ description: bn ? 'এই রুটিনটি মুছে ফেলতে চান?' : 'Delete routine?', variant: 'destructive' }))) {
                                  deleteMasterRoutine.mutate(r.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <RoutineSetupDialog
          open={showSetupDialog}
          onOpenChange={setShowSetupDialog}
          bn={bn}
          sessionId={sessions[0]?.id}
        />
      </div>
    );
  }

  // ---- DETAIL VIEW: When routine is clicked -> Show Full Master Routine Table ----
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRoutineId(null)}
            className="h-9 px-3 rounded-xl gap-2 font-bold text-xs hover:bg-muted border-emerald-600/40 text-emerald-800 dark:text-emerald-300 shadow-sm"
          >
            <span>←</span> {bn ? 'রুটিন তালিকায় ফিরুন' : 'Back to Routine List'}
          </Button>
          <div className="h-6 w-px bg-border/60" />
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>📅</span>
              <span>{bn ? selectedRoutine?.name_bn || selectedRoutine?.name : selectedRoutine?.name}</span>
              <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 text-xs font-semibold">
                {selectedRoutine?.session_name || '২০২৬-২৭'}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bn ? 'সকল জামাতের সাপ্তাহিক ক্লাস রুটিন ও পিরিয়ড ব্যবস্থাপনা' : 'Timetable and periods management for all classes'}
            </p>
          </div>
        </div>
      </div>

      <MasterRoutineView
        initialClassId="all"
        initialSessionId={selectedRoutine?.session_id}
        onBack={() => setSelectedRoutineId(null)}
        showBackToList={true}
      />
    </div>
  );
};

export default AdminClassRoutine;
