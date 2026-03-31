import { useState, useMemo } from 'react';
import { useTimeFormat, formatTimeDisplay } from '@/hooks/useTimeFormat';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  CalendarDays, Users, UserCog, Search, Check, X, Clock,
  CalendarOff, Save, Settings2, Plus, Trash2, Edit2,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Home, Sun, Sunset, Moon
} from 'lucide-react';

const STATUS_ICONS: Record<string, any> = {
  present: CheckCircle2, absent: XCircle, late: Clock,
  half_day: AlertCircle, leave: CalendarOff,
};
const STATUS_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  half_day: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  leave: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const SHIFTS = [
  { value: 'morning', labelBn: 'সকাল', labelEn: 'Morning', icon: Sun },
  { value: 'afternoon', labelBn: 'দুপুর', labelEn: 'Afternoon', icon: Sunset },
  { value: 'evening', labelBn: 'সন্ধ্যা', labelEn: 'Evening', icon: Moon },
];

const AdminAttendance = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const fmt = (t: string) => formatTimeDisplay(t, timeFormat);

  const [entityType, setEntityType] = useState<'student' | 'staff'>('student');
  const [studentSubTab, setStudentSubTab] = useState<'all' | 'residential'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionYear, setSelectedSessionYear] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedShift, setSelectedShift] = useState('morning');
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm, setRuleForm] = useState({ name: '', name_bn: '', entity_type: 'student', config: { color: 'green', counts_as: 'present' } });

  // Fetch divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch students
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students-attendance'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*').eq('status', 'active').order('name_bn');
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

  // Get unique session years from students
  const sessionYears = useMemo(() => {
    const years = new Set(allStudents.map((s: any) => s.session_year).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [allStudents]);

  // Set default session year
  useMemo(() => {
    if (sessionYears.length > 0 && !selectedSessionYear) {
      setSelectedSessionYear(sessionYears[0] as string);
    }
  }, [sessionYears]);

  // Filter students based on sub-tab and filters
  const entities = useMemo(() => {
    if (entityType === 'staff') return allStaff;

    let filtered = allStudents;

    // Residential sub-tab: only residential students with session year filter
    if (studentSubTab === 'residential') {
      filtered = filtered.filter((s: any) => s.residence_type === 'resident');
      if (selectedSessionYear) {
        filtered = filtered.filter((s: any) => s.session_year === selectedSessionYear);
      }
    }

    // All students tab: filter by session year + division/class
    if (studentSubTab === 'all') {
      if (selectedSessionYear) {
        filtered = filtered.filter((s: any) => s.session_year === selectedSessionYear);
      }
      if (selectedDivisionId && selectedDivisionId !== 'all') {
        filtered = filtered.filter((s: any) => s.division_id === selectedDivisionId);
      }
    }

    return filtered;
  }, [entityType, allStudents, allStaff, studentSubTab, selectedSessionYear, selectedDivisionId]);

  // Fetch attendance for selected date (for staff, fetch by shift too)
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedDate, entityType, entityType === 'staff' ? selectedShift : 'full_day'],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', selectedDate)
        .eq('entity_type', entityType);

      if (entityType === 'staff') {
        query = query.eq('shift', selectedShift);
      } else {
        query = query.eq('shift', 'full_day');
      }

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

  const statusOptions = useMemo(() => {
    return rules.filter((r: any) => r.entity_type === entityType && r.rule_type === 'status' && r.is_active);
  }, [rules, entityType]);

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async ({ entityId, status, remarks, check_in_time, check_out_time }: { entityId: string; status: string; remarks?: string; check_in_time?: string; check_out_time?: string }) => {
      const shiftVal = entityType === 'staff' ? selectedShift : 'full_day';
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType] }),
    onError: () => toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save'),
  });

  // Bulk mark all
  const bulkMutation = useMutation({
    mutationFn: async (status: string) => {
      const shiftVal = entityType === 'staff' ? selectedShift : 'full_day';
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
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate, entityType] });
      toast.success(bn ? 'সবার উপস্থিতি সেভ হয়েছে' : 'Bulk attendance saved');
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

  const filtered = entities.filter((e: any) => {
    const name = e.name_bn + (e.name_en || '') + (e.student_id || '');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
          <Button variant="outline" onClick={() => setRulesDialogOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> {bn ? 'রুল সেটিংস' : 'Rule Settings'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: bn ? 'মোট' : 'Total', value: stats.total, color: 'bg-primary/10 text-primary' },
            { label: bn ? 'উপস্থিত' : 'Present', value: stats.present, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: bn ? 'অনুপস্থিত' : 'Absent', value: stats.absent, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            { label: bn ? 'বিলম্ব উপস্থিত' : 'Late Present', value: stats.late, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
            { label: bn ? 'বাকি' : 'Unmarked', value: stats.unmarked, color: 'bg-muted text-muted-foreground' },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <Badge className={`${s.color} text-[10px] mt-1`}>{s.label}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              {/* Entity Type */}
              <Tabs value={entityType} onValueChange={(v) => { setEntityType(v as any); setSearchQuery(''); }} className="shrink-0">
                <TabsList>
                  <TabsTrigger value="student"><Users className="h-4 w-4 mr-1" /> {bn ? 'ছাত্র' : 'Students'}</TabsTrigger>
                  <TabsTrigger value="staff"><UserCog className="h-4 w-4 mr-1" /> {bn ? 'স্টাফ/শিক্ষক' : 'Staff/Teacher'}</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="pl-8 w-40 h-8 text-sm" />
                </div>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-1 shrink-0 ml-auto">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => bulkMutation.mutate('present')}>
                  <Check className="h-3 w-3 mr-1" /> {bn ? 'সবাই উপস্থিত' : 'All Present'}
                </Button>
              </div>
            </div>

            {/* Student Filters Row */}
            {entityType === 'student' && (
              <div className="flex flex-wrap gap-3 items-center">
                {/* Sub-tabs: All / Residential */}
                <Tabs value={studentSubTab} onValueChange={(v) => setStudentSubTab(v as any)} className="shrink-0">
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs h-7 px-3">
                      <Users className="h-3 w-3 mr-1" /> {bn ? 'সকল ছাত্র' : 'All Students'}
                    </TabsTrigger>
                    <TabsTrigger value="residential" className="text-xs h-7 px-3">
                      <Home className="h-3 w-3 mr-1" /> {bn ? 'আবাসিক ছাত্র' : 'Residential'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Session Year (both tabs) */}
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

                {/* Division/Class filter (for 'all' sub-tab) */}
                {studentSubTab === 'all' && (
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue placeholder={bn ? 'বিভাগ/শ্রেণী নির্বাচন' : 'Select Class'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All Classes'}</SelectItem>
                      {divisions.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

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
                <Tabs value={selectedShift} onValueChange={setSelectedShift} className="shrink-0">
                  <TabsList className="h-8">
                    {SHIFTS.map(sh => (
                      <TabsTrigger key={sh.value} value={sh.value} className="text-xs h-7 px-3">
                        <sh.icon className="h-3 w-3 mr-1" /> {bn ? sh.labelBn : sh.labelEn}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Search */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 h-8 text-sm" placeholder={bn ? 'নাম বা পদবী...' : 'Name or designation...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance List */}
        <div className="space-y-1">
          {filtered.map((entity: any, idx: number) => {
            const att = getAttendance(entity.id);
            const currentStatus = att?.status || '';
            return (
              <Card key={entity.id} className={`transition-all ${!currentStatus ? 'border-dashed' : ''}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Index */}
                  <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{idx + 1}</span>
                  
                  {/* Photo */}
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {entity.photo_url ? (
                      <img src={entity.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{bn ? entity.name_bn : (entity.name_en || entity.name_bn)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entityType === 'student'
                        ? `${bn ? 'আইডি' : 'ID'}: ${entity.student_id || '-'} ${entity.roll_number ? `| ${bn ? 'রোল' : 'Roll'}: ${entity.roll_number}` : ''}`
                        : (entity.designation || '-')}
                    </p>
                  </div>

                  {/* Late Minutes Display for staff */}
                  {entityType === 'staff' && att?.check_in_time && (() => {
                    const dutyStart = (entity.duty_start_time || '08:00').split(':').map(Number);
                    const checkIn = att.check_in_time.split(':').map(Number);
                    const dutyEnd = (entity.duty_end_time || '17:00').split(':').map(Number);
                    const checkOut = att.check_out_time ? att.check_out_time.split(':').map(Number) : dutyEnd;
                    const lateMin = Math.max(0, (checkIn[0] * 60 + checkIn[1]) - (dutyStart[0] * 60 + dutyStart[1]));
                    const earlyMin = Math.max(0, (dutyEnd[0] * 60 + dutyEnd[1]) - (checkOut[0] * 60 + checkOut[1]));
                    return (lateMin > 0 || earlyMin > 0) ? (
                      <div className="flex gap-1 shrink-0">
                        {lateMin > 0 && <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[9px]">{bn ? `${lateMin} মি. বিলম্ব` : `${lateMin}m late`}</Badge>}
                        {earlyMin > 0 && <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[9px]">{bn ? `${earlyMin} মি. আগে` : `${earlyMin}m early`}</Badge>}
                      </div>
                    ) : null;
                  })()}

                  {/* Time Inputs for Staff */}
                  {entityType === 'staff' && (
                    <div className="flex gap-1 items-center shrink-0">
                      <Input
                        type="time"
                        className="h-7 w-24 text-xs"
                        placeholder="In"
                        value={att?.check_in_time || ''}
                        onChange={e => saveMutation.mutate({ entityId: entity.id, status: currentStatus || 'present', check_in_time: e.target.value, check_out_time: att?.check_out_time || '' })}
                      />
                      <span className="text-[10px] text-muted-foreground">-</span>
                      <Input
                        type="time"
                        className="h-7 w-24 text-xs"
                        placeholder="Out"
                        value={att?.check_out_time || ''}
                        onChange={e => saveMutation.mutate({ entityId: entity.id, status: currentStatus || 'present', check_in_time: att?.check_in_time || '', check_out_time: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Status Buttons */}
                  <div className="flex gap-1 flex-wrap justify-end">
                    {statusOptions.map((rule: any) => {
                      const cfg = rule.config as any;
                      const countsAs = cfg?.counts_as || rule.name.toLowerCase();
                      const isActive = currentStatus === countsAs;
                      const Icon = STATUS_ICONS[countsAs] || Check;
                      const colorClass = isActive ? (STATUS_COLORS[countsAs] || 'bg-muted') : 'bg-background hover:bg-muted/50';
                      return (
                        <button
                          key={rule.id}
                          onClick={() => {
                            const mutateData: any = { entityId: entity.id, status: countsAs };
                            if (entityType === 'staff' && ['present', 'late', 'half_day'].includes(countsAs)) {
                              mutateData.check_in_time = entity.duty_start_time || '08:00';
                              mutateData.check_out_time = entity.duty_end_time || '17:00';
                            }
                            if (countsAs === 'absent' || countsAs === 'leave') {
                              mutateData.check_in_time = '';
                              mutateData.check_out_time = '';
                            }
                            saveMutation.mutate(mutateData);
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${colorClass} ${isActive ? 'ring-1 ring-offset-1 ring-primary/30' : ''}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span className="hidden sm:inline">{bn ? rule.name_bn : rule.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{bn ? 'কোনো রেকর্ড পাওয়া যায়নি' : 'No records found'}</p>
            </CardContent></Card>
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
              {/* Existing Rules */}
              <div className="space-y-2">
                {rules.map((rule: any) => {
                  const cfg = rule.config as any;
                  return (
                    <div key={rule.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                      <Badge variant="outline" className="text-[10px]">{rule.entity_type}</Badge>
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
                    <Label className="text-xs">{bn ? 'টাইপ' : 'Entity Type'}</Label>
                    <Select value={ruleForm.entity_type} onValueChange={v => setRuleForm(p => ({ ...p, entity_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
                        <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                      </SelectContent>
                    </Select>
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
                  saveRuleMutation.mutate({ ...ruleForm, rule_type: 'status', config: ruleForm.config });
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
      </div>
    </AdminLayout>
  );
};

export default AdminAttendance;
