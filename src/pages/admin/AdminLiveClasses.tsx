import { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Pencil, Trash2, Video, Users, Radio, Calendar, Clock, ExternalLink,
  Copy, Search, MessageCircle, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

type Provider = 'jitsi' | 'jaas' | 'daily' | 'zoom' | 'google_meet' | 'youtube';
type AccessMode = 'public' | 'logged_in' | 'class_based' | 'access_code';
type Status = 'scheduled' | 'live' | 'ended' | 'cancelled';

interface LiveClassForm {
  title: string;
  title_bn: string;
  description: string;
  description_bn: string;
  provider: Provider;
  meeting_url: string;
  meeting_room: string;
  access_mode: AccessMode;
  access_code: string;
  class_id: string | null;
  academic_session_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  enable_chat: boolean;
  enable_attendance: boolean;
  enable_reminder: boolean;
  reminder_minutes_before: number;
  recording_url: string;
  is_published: boolean;
}

const emptyForm: LiveClassForm = {
  title: '',
  title_bn: '',
  description: '',
  description_bn: '',
  provider: 'jitsi',
  meeting_url: '',
  meeting_room: '',
  access_mode: 'logged_in',
  access_code: '',
  class_id: null,
  academic_session_id: null,
  subject_id: null,
  teacher_id: null,
  scheduled_start: '',
  scheduled_end: '',
  enable_chat: true,
  enable_attendance: true,
  enable_reminder: true,
  reminder_minutes_before: 10,
  recording_url: '',
  is_published: true,
};

const providerLabel = (p: Provider, bn: boolean) => {
  const map: Record<Provider, [string, string]> = {
    daily: ['Daily.co (10k Mins Free - Best Embed)', 'Daily.co (১০,০০০ মিনিট ফ্রি - সেরা এমবেড)'],
    jitsi: ['Jitsi Meet (Host Login)', 'জিতসি মিট (হোস্ট লগইন)'],
    jaas: ['JaaS by 8x8 (JWT Required)', 'JaaS by 8x8 (JWT টোকেন আবশ্যক)'],
    zoom: ['Zoom', 'জুম'],
    google_meet: ['Google Meet', 'গুগল মিট'],
    youtube: ['YouTube Live', 'ইউটিউব লাইভ'],
  };
  return bn ? map[p][1] : map[p][0];
};

const accessLabel = (a: AccessMode, bn: boolean) => {
  const map: Record<AccessMode, [string, string]> = {
    public: ['Public', 'পাবলিক'],
    logged_in: ['Logged-in only', 'লগইনকৃত'],
    class_based: ['Specific Class', 'নির্দিষ্ট ক্লাস'],
    access_code: ['Access Code', 'অ্যাক্সেস কোড'],
  };
  return bn ? map[a][1] : map[a][0];
};

const statusBadge = (s: Status, bn: boolean) => {
  const map: Record<Status, { label: [string, string]; cls: string }> = {
    scheduled: { label: ['Scheduled', 'নির্ধারিত'], cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
    live: { label: ['LIVE', 'লাইভ'], cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 animate-pulse' },
    ended: { label: ['Ended', 'সমাপ্ত'], cls: 'bg-muted text-muted-foreground border-border' },
    cancelled: { label: ['Cancelled', 'বাতিল'], cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  };
  const m = map[s];
  return <Badge variant="outline" className={`${m.cls} font-medium`}>{bn ? m.label[1] : m.label[0]}</Badge>;
};

const formatDateTime = (iso: string | null, bn: boolean) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(bn ? 'bn-BD' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const computeStatus = (lc: { scheduled_start: string; scheduled_end: string; status: Status }): Status => {
  if (lc.status === 'cancelled' || lc.status === 'ended') return lc.status;
  const now = new Date();
  const start = new Date(lc.scheduled_start);
  const end = new Date(lc.scheduled_end);
  if (now >= start && now <= end) return 'live';
  if (now > end) return 'ended';
  return 'scheduled';
};

const AdminLiveClasses = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bn = language === 'bn';

  const [tab, setTab] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LiveClassForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [participantsOf, setParticipantsOf] = useState<string | null>(null);

  // Lookups
  const { data: classes = [] } = useQuery({
    queryKey: ['lc-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['lc-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('id, name, name_bn').eq('is_active', true).order('name');
      return data ?? [];
    },
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['lc-subjects', form.class_id],
    queryFn: async () => {
      let q = supabase.from('subjects').select('id, name, name_bn, class_id').eq('is_active', true);
      if (form.class_id) q = q.eq('class_id', form.class_id);
      const { data } = await q.order('sort_order');
      return data ?? [];
    },
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['lc-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, name_en, name_bn, staff_category').is('deleted_at', null).order('name_bn');
      return (data ?? []).filter((s: any) => ['teacher', 'administrative'].includes(s.staff_category));
    },
  });

  // Live classes list
  const { data: liveClasses = [], isLoading } = useQuery({
    queryKey: ['live-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_classes')
        .select('*, classes(name,name_bn), academic_sessions(name,name_bn), subjects(name,name_bn), staff(name_en,name_bn)')
        .is('deleted_at', null)
        .order('scheduled_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  // Participants for selected class
  const { data: participants = [] } = useQuery({
    queryKey: ['lc-participants', participantsOf],
    queryFn: async () => {
      if (!participantsOf) return [];
      const { data } = await supabase
        .from('live_class_participants')
        .select('*, students(name_bn,student_id), staff(name_bn,staff_id)')
        .eq('live_class_id', participantsOf)
        .order('joined_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!participantsOf,
  });

  const filtered = useMemo(() => {
    let list = liveClasses.map((lc: any) => ({ ...lc, _status: computeStatus(lc) }));
    if (tab !== 'all') list = list.filter((lc: any) => lc._status === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((lc: any) =>
        lc.title.toLowerCase().includes(s) || lc.title_bn.toLowerCase().includes(s)
      );
    }
    return list;
  }, [liveClasses, tab, search]);

  const openCreate = () => {
    setEditingId(null);
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      ...emptyForm,
      scheduled_start: toLocal(inOneHour),
      scheduled_end: toLocal(new Date(inOneHour.getTime() + 60 * 60 * 1000)),
      meeting_room: `class-${Math.random().toString(36).slice(2, 10)}`,
    });
    setOpen(true);
  };

  const openEdit = (lc: any) => {
    setEditingId(lc.id);
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setForm({
      title: lc.title || '',
      title_bn: lc.title_bn || '',
      description: lc.description || '',
      description_bn: lc.description_bn || '',
      provider: lc.provider,
      meeting_url: lc.meeting_url || '',
      meeting_room: lc.meeting_room || '',
      access_mode: lc.access_mode,
      access_code: lc.access_code || '',
      class_id: lc.class_id,
      academic_session_id: lc.academic_session_id,
      subject_id: lc.subject_id,
      teacher_id: lc.teacher_id,
      scheduled_start: toLocal(lc.scheduled_start),
      scheduled_end: toLocal(lc.scheduled_end),
      enable_chat: lc.enable_chat,
      enable_attendance: lc.enable_attendance,
      enable_reminder: lc.enable_reminder,
      reminder_minutes_before: lc.reminder_minutes_before ?? 10,
      recording_url: lc.recording_url || '',
      is_published: lc.is_published,
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: LiveClassForm) => {
      if (!payload.title.trim() || !payload.title_bn.trim()) {
        throw new Error(bn ? 'শিরোনাম দিন' : 'Title required');
      }
      if (!payload.scheduled_start || !payload.scheduled_end) {
        throw new Error(bn ? 'সময় নির্ধারণ করুন' : 'Schedule required');
      }
      if (new Date(payload.scheduled_end) <= new Date(payload.scheduled_start)) {
        throw new Error(bn ? 'শেষ সময় শুরুর পরে হতে হবে' : 'End must be after start');
      }
      if (payload.provider !== 'jitsi' && !payload.meeting_url.trim()) {
        throw new Error(bn ? 'মিটিং লিংক দিন' : 'Meeting URL required');
      }
      if (payload.access_mode === 'access_code' && !payload.access_code.trim()) {
        throw new Error(bn ? 'অ্যাক্সেস কোড দিন' : 'Access code required');
      }
      if (payload.access_mode === 'class_based' && !payload.class_id) {
        throw new Error(bn ? 'ক্লাস নির্বাচন করুন' : 'Class required');
      }

      let cleanUrl = payload.meeting_url.trim();
      if (payload.provider === 'jaas') {
        if (cleanUrl.startsWith('vpaas-magic-cookie-')) {
          const room = payload.meeting_room || payload.title.replace(/[^a-zA-Z0-9]/g, '') || 'LiveClass';
          cleanUrl = `https://8x8.vc/${cleanUrl}/${room}`;
        } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }
      }

      const dbPayload: any = {
        ...payload,
        meeting_url: cleanUrl,
        scheduled_start: new Date(payload.scheduled_start).toISOString(),
        scheduled_end: new Date(payload.scheduled_end).toISOString(),
        created_by: user?.id ?? null,
      };

      if (editingId) {
        const { error } = await supabase.from('live_classes').update(dbPayload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('live_classes').insert(dbPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('live_classes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('live_classes').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'বাতিল করা হয়েছে' : 'Cancelled');
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
    },
  });

  const copyJoinLink = (lc: any) => {
    const url = `${window.location.origin}/live-class/${lc.id}`;
    navigator.clipboard.writeText(url);
    toast.success(bn ? 'লিংক কপি হয়েছে' : 'Link copied');
  };

  const getJoinUrl = (lc: any) => {
    if (lc.provider === 'jitsi') return `https://meet.jit.si/${lc.meeting_room || lc.id}`;
    return lc.meeting_url;
  };

  const counts = useMemo(() => {
    const list = liveClasses.map((lc: any) => computeStatus(lc));
    return {
      all: list.length,
      scheduled: list.filter((s) => s === 'scheduled').length,
      live: list.filter((s) => s === 'live').length,
      ended: list.filter((s) => s === 'ended').length,
    };
  }, [liveClasses]);

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Radio className="w-8 h-8 text-primary" />
              {bn ? 'লাইভ ক্লাস ব্যবস্থাপনা' : 'Live Classes'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {bn ? 'অনলাইন ক্লাস শিডিউল, মনিটর ও পরিচালনা করুন' : 'Schedule, monitor and manage online classes'}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 rounded-2xl">
            <Plus className="w-4 h-4" /> {bn ? 'নতুন লাইভ ক্লাস' : 'New Live Class'}
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'অনুসন্ধান…' : 'Search…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-2xl"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="rounded-2xl">
            <TabsTrigger value="all" className="rounded-xl">{bn ? 'সব' : 'All'} ({counts.all})</TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-xl">{bn ? 'নির্ধারিত' : 'Scheduled'} ({counts.scheduled})</TabsTrigger>
            <TabsTrigger value="live" className="rounded-xl">{bn ? 'লাইভ' : 'Live'} ({counts.live})</TabsTrigger>
            <TabsTrigger value="ended" className="rounded-xl">{bn ? 'সমাপ্ত' : 'Ended'} ({counts.ended})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center rounded-[32px]">
                <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{bn ? 'কোনো লাইভ ক্লাস নেই' : 'No live classes yet'}</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filtered.map((lc: any) => (
                  <Card key={lc.id} className="p-5 rounded-[28px] backdrop-blur-xl bg-card/80 border-border/50 hover:shadow-lg transition-all">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold">{bn ? lc.title_bn : lc.title}</h3>
                          {statusBadge(lc._status, bn)}
                          <Badge variant="secondary" className="rounded-full">
                            <Video className="w-3 h-3 mr-1" />
                            {providerLabel(lc.provider, bn)}
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            {accessLabel(lc.access_mode, bn)}
                          </Badge>
                          {!lc.is_published && (
                            <Badge variant="outline" className="rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                              {bn ? 'অপ্রকাশিত' : 'Unpublished'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDateTime(lc.scheduled_start, bn)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.round((new Date(lc.scheduled_end).getTime() - new Date(lc.scheduled_start).getTime()) / 60000)} {bn ? 'মিনিট' : 'min'}
                          </span>
                          {lc.classes && (
                            <span>{bn ? 'ক্লাস:' : 'Class:'} {bn ? lc.classes.name_bn : lc.classes.name}</span>
                          )}
                          {lc.subjects && (
                            <span>{bn ? 'বিষয়:' : 'Subject:'} {bn ? lc.subjects.name_bn : lc.subjects.name}</span>
                          )}
                          {lc.staff && (
                            <span>{bn ? 'শিক্ষক:' : 'Teacher:'} {bn ? lc.staff.name_bn : lc.staff.name_en}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(lc._status === 'live' || lc._status === 'scheduled') && (
                          <Button size="sm" asChild className="rounded-xl gap-1">
                            <Link to={`/live-class/${lc.id}`}>
                              <Video className="w-3.5 h-3.5" /> {bn ? 'যোগ দিন' : 'Join'}
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => copyJoinLink(lc)} className="rounded-xl gap-1">
                          <Copy className="w-3.5 h-3.5" /> {bn ? 'লিংক' : 'Link'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setParticipantsOf(lc.id)} className="rounded-xl gap-1">
                          <Users className="w-3.5 h-3.5" /> {bn ? 'অংশগ্রহণ' : 'Attendees'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(lc)} className="rounded-xl">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {lc._status === 'scheduled' && (
                          <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate(lc.id)} className="rounded-xl text-orange-600">
                            {bn ? 'বাতিল' : 'Cancel'}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(lc.id)} className="rounded-xl text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              {editingId ? (bn ? 'লাইভ ক্লাস সম্পাদনা' : 'Edit Live Class') : (bn ? 'নতুন লাইভ ক্লাস' : 'New Live Class')}
            </DialogTitle>
            <DialogDescription>
              {bn ? 'অনলাইন ক্লাসের বিস্তারিত তথ্য পূরণ করুন' : 'Fill in the live class details'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'শিরোনাম (বাংলা)' : 'Title (Bangla)'} *</Label>
                <Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>{bn ? 'শিরোনাম (English)' : 'Title (English)'} *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'বিবরণ (বাংলা)' : 'Description (Bangla)'}</Label>
                <Textarea rows={2} value={form.description_bn} onChange={(e) => setForm({ ...form, description_bn: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>{bn ? 'বিবরণ (English)' : 'Description (English)'}</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'শুরুর সময়' : 'Start time'} *</Label>
                <div className="mt-1.5">
                  <DateTimePicker value={form.scheduled_start} onChange={(v) => setForm({ ...form, scheduled_start: v })} bengali={bn} />
                </div>
              </div>
              <div>
                <Label>{bn ? 'শেষের সময়' : 'End time'} *</Label>
                <div className="mt-1.5">
                  <DateTimePicker value={form.scheduled_end} onChange={(v) => setForm({ ...form, scheduled_end: v })} bengali={bn} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'প্রোভাইডার' : 'Provider'} *</Label>
                <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v as Provider })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jitsi">{providerLabel('jitsi', bn)}</SelectItem>
                    <SelectItem value="jaas">{providerLabel('jaas', bn)}</SelectItem>
                    <SelectItem value="daily">{providerLabel('daily', bn)}</SelectItem>
                    <SelectItem value="zoom">{providerLabel('zoom', bn)}</SelectItem>
                    <SelectItem value="google_meet">{providerLabel('google_meet', bn)}</SelectItem>
                    <SelectItem value="youtube">{providerLabel('youtube', bn)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'অ্যাক্সেস' : 'Access'} *</Label>
                <Select value={form.access_mode} onValueChange={(v) => setForm({ ...form, access_mode: v as AccessMode })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{accessLabel('public', bn)}</SelectItem>
                    <SelectItem value="logged_in">{accessLabel('logged_in', bn)}</SelectItem>
                    <SelectItem value="class_based">{accessLabel('class_based', bn)}</SelectItem>
                    <SelectItem value="access_code">{accessLabel('access_code', bn)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.provider === 'jitsi' && (
              <div>
                <Label>{bn ? 'রুম নাম (অনন্য)' : 'Room name (unique)'}</Label>
                <Input value={form.meeting_room} onChange={(e) => setForm({ ...form, meeting_room: e.target.value })} placeholder="class-abc123" className="mt-1.5 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">https://meet.jit.si/{form.meeting_room || '[room]'}</p>
              </div>
            )}
            {form.provider === 'jaas' && (
              <div className="space-y-1.5">
                <Label>{bn ? 'JaaS মিটিং URL' : 'JaaS Meeting URL'} *</Label>
                <Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://8x8.vc/vpaas-magic-cookie-XXXX/RoomName?jwt=..." className="mt-1.5 rounded-xl" />
                <p className="text-xs text-muted-foreground">{bn ? '8x8.vc থেকে টোকেনসহ পূর্ণ URL paste করুন।' : 'Paste full URL including JWT token from 8x8.vc.'}</p>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  {bn ? '⚠️ গুরুত্বপূর্ণ: 8x8 JaaS-এ টোকেন (?jwt=...) ছাড়া প্রবেশ করলে "Authentication failed" এরর আসবে। কোনো টোকেন ছাড়া ঝামেলামুক্ত ইন-অ্যাপ লাইভ ক্লাসের জন্য "Daily.co" (১০,০০০ মিনিট ফ্রি) ব্যবহার করুন।' : '⚠️ Note: 8x8 JaaS requires a signed ?jwt= token or "Authentication failed" occurs. For instant zero-token in-app classes, use "Daily.co" (10k free min).'}
                </div>
              </div>
            )}
            {form.provider === 'daily' && (
              <div>
                <Label>{bn ? 'Daily.co রুম URL' : 'Daily.co Room URL'} *</Label>
                <Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://your-domain.daily.co/room-name" className="mt-1.5 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">{bn ? 'Daily.co থেকে রুম URL পেস্ট করুন। সাইটের ভেতরেই চলবে।' : 'Paste Daily.co room URL. Embeds in-app.'}</p>
              </div>
            )}
            {(form.provider === 'zoom' || form.provider === 'google_meet' || form.provider === 'youtube') && (
              <div>
                <Label>{bn ? 'মিটিং URL' : 'Meeting URL'} *</Label>
                <Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://…" className="mt-1.5 rounded-xl" />
              </div>
            )}

            {form.access_mode === 'access_code' && (
              <div>
                <Label>{bn ? 'অ্যাক্সেস কোড' : 'Access code'} *</Label>
                <Input value={form.access_code} onChange={(e) => setForm({ ...form, access_code: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'একাডেমিক সেশন' : 'Academic session'}</Label>
                <Select value={form.academic_session_id ?? 'none'} onValueChange={(v) => setForm({ ...form, academic_session_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {sessions.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'ক্লাস' : 'Class'}{form.access_mode === 'class_based' && ' *'}</Label>
                <Select value={form.class_id ?? 'none'} onValueChange={(v) => setForm({ ...form, class_id: v === 'none' ? null : v, subject_id: null })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'বিষয়' : 'Subject'}</Label>
                <Select value={form.subject_id ?? 'none'} onValueChange={(v) => setForm({ ...form, subject_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {subjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'শিক্ষক' : 'Teacher'}</Label>
                <Select value={form.teacher_id ?? 'none'} onValueChange={(v) => setForm({ ...form, teacher_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {staff.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <Label className="cursor-pointer flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> {bn ? 'চ্যাট/Q&A' : 'Chat/Q&A'}
                </Label>
                <Switch checked={form.enable_chat} onCheckedChange={(v) => setForm({ ...form, enable_chat: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="cursor-pointer flex items-center gap-2">
                  <Users className="w-4 h-4" /> {bn ? 'অ্যাটেন্ডেন্স' : 'Attendance'}
                </Label>
                <Switch checked={form.enable_attendance} onCheckedChange={(v) => setForm({ ...form, enable_attendance: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="cursor-pointer flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {bn ? 'রিমাইন্ডার' : 'Reminder'}
                </Label>
                <Switch checked={form.enable_reminder} onCheckedChange={(v) => setForm({ ...form, enable_reminder: v })} />
              </div>
            </div>

            {form.enable_reminder && (
              <div>
                <Label>{bn ? 'রিমাইন্ডার (মিনিট আগে)' : 'Reminder (minutes before)'}</Label>
                <Input
                  type="number" min={1} max={1440}
                  value={form.reminder_minutes_before || ''}
                  onChange={(e) => setForm({ ...form, reminder_minutes_before: Number(e.target.value) || 10 })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            )}

            <div>
              <Label>{bn ? 'রেকর্ডিং URL (ক্লাস শেষ হলে)' : 'Recording URL (after class)'}</Label>
              <Input value={form.recording_url} onChange={(e) => setForm({ ...form, recording_url: e.target.value })} placeholder="https://…" className="mt-1.5 rounded-xl" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <Label className="cursor-pointer">{bn ? 'প্রকাশিত' : 'Published'}</Label>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="rounded-xl">
              {saveMutation.isPending ? (bn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…') : (bn ? 'সংরক্ষণ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={!!participantsOf} onOpenChange={(o) => !o && setParticipantsOf(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> {bn ? 'অংশগ্রহণকারী' : 'Participants'} ({participants.length})
            </DialogTitle>
          </DialogHeader>
          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{bn ? 'কেউ এখনো যোগ দেননি' : 'No one has joined yet'}</div>
          ) : (
            <div className="space-y-2">
              {participants.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40">
                  <div>
                    <div className="font-medium">{p.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.students?.student_id && `${bn ? 'ছাত্র আইডি:' : 'Student ID:'} ${p.students.student_id} • `}
                      {p.staff?.staff_id && `${bn ? 'স্টাফ আইডি:' : 'Staff ID:'} ${p.staff.staff_id} • `}
                      {bn ? 'যোগ:' : 'Joined:'} {formatDateTime(p.joined_at, bn)}
                      {p.left_at && ` • ${bn ? 'ছেড়েছেন:' : 'Left:'} ${formatDateTime(p.left_at, bn)}`}
                    </div>
                  </div>
                  {p.attendance_marked && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                      ✓ {bn ? 'উপস্থিত' : 'Present'}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isPending={deleteMutation.isPending}
        description={bn ? 'এই লাইভ ক্লাসটি রিসাইকেল বিন-এ চলে যাবে।' : 'This live class will be moved to the recycle bin.'}
      />
    </AdminLayout>
  );
};

export default AdminLiveClasses;
