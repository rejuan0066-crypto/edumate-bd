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
  Plus, Pencil, Trash2, Video, Users, Calendar, Clock, ExternalLink,
  Copy, Search, MessageCircle, ShieldCheck, Briefcase, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { useMeetingProviderSettings } from '@/hooks/useMeetingProviderSettings';

type Provider = 'jitsi' | 'jaas' | 'daily' | 'zoom' | 'google_meet' | 'youtube';
type AccessMode = 'public' | 'logged_in' | 'access_code';
type Status = 'scheduled' | 'live' | 'ended' | 'cancelled';
type MeetingType = 'staff' | 'parent' | 'administrative' | 'committee' | 'other';

interface MeetingForm {
  title: string;
  title_bn: string;
  description: string;
  description_bn: string;
  provider: Provider;
  meeting_url: string;
  meeting_room: string;
  meeting_type: MeetingType;
  access_mode: AccessMode;
  access_code: string;
  scheduled_start: string;
  scheduled_end: string;
  enable_chat: boolean;
  enable_attendance: boolean;
  enable_reminder: boolean;
  reminder_minutes: number;
  recording_url: string;
  notes: string;
  notes_bn: string;
  is_published: boolean;
  staff_organizer_id: string | null;
}

const emptyForm: MeetingForm = {
  title: '',
  title_bn: '',
  description: '',
  description_bn: '',
  provider: 'jitsi',
  meeting_url: '',
  meeting_room: '',
  meeting_type: 'staff',
  access_mode: 'logged_in',
  access_code: '',
  scheduled_start: '',
  scheduled_end: '',
  enable_chat: true,
  enable_attendance: true,
  enable_reminder: false,
  reminder_minutes: 10,
  recording_url: '',
  notes: '',
  notes_bn: '',
  is_published: true,
  staff_organizer_id: null,
};

const providerLabel = (p: Provider, bn: boolean) => ({
  daily: ['Daily.co (10k Mins Free - Best Embed)', 'Daily.co (১০,০০০ মিনিট ফ্রি - সেরা এমবেড)'],
  jitsi: ['Jitsi Meet (Host Login)', 'জিতসি মিট (হোস্ট লগইন)'],
  jaas: ['JaaS by 8x8 (JWT Required)', 'JaaS by 8x8 (JWT টোকেন আবশ্যক)'],
  zoom: ['Zoom', 'জুম'],
  google_meet: ['Google Meet', 'গুগল মিট'],
  youtube: ['YouTube Live', 'ইউটিউব লাইভ'],
}[p]?.[bn ? 1 : 0] || p);

const accessLabel = (a: AccessMode, bn: boolean) => ({
  public: ['Public', 'পাবলিক'],
  logged_in: ['Logged-in only', 'লগইনকৃত'],
  access_code: ['Access Code', 'অ্যাক্সেস কোড'],
}[a][bn ? 1 : 0]);

const meetingTypeLabel = (t: MeetingType, bn: boolean) => ({
  staff: ['Staff Meeting', 'স্টাফ মিটিং'],
  parent: ['Parent Meeting', 'অভিভাবক মিটিং'],
  administrative: ['Administrative', 'প্রশাসনিক'],
  committee: ['Committee', 'কমিটি'],
  other: ['Other', 'অন্যান্য'],
}[t][bn ? 1 : 0]);

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
  return new Date(iso).toLocaleString(bn ? 'bn-BD' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const computeStatus = (m: { scheduled_start: string; scheduled_end: string; status: Status }): Status => {
  if (m.status === 'cancelled' || m.status === 'ended') return m.status;
  const now = new Date();
  const start = new Date(m.scheduled_start);
  const end = new Date(m.scheduled_end);
  if (now >= start && now <= end) return 'live';
  if (now > end) return 'ended';
  return 'scheduled';
};

const AdminMeetings = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const bn = language === 'bn';
  const { getDefaultUrl } = useMeetingProviderSettings();

  const [tab, setTab] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MeetingForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [participantsOf, setParticipantsOf] = useState<string | null>(null);

  const { data: staff = [] } = useQuery({
    queryKey: ['mt-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, name_en, name_bn, staff_category, user_id').is('deleted_at', null).order('name_bn');
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['mt-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data ?? [];
    },
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, staff:staff_organizer_id(name_en,name_bn)')
        .is('deleted_at', null)
        .order('scheduled_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['mt-participants', participantsOf],
    queryFn: async () => {
      if (!participantsOf) return [];
      const { data } = await supabase
        .from('meeting_participants')
        .select('*, staff(name_bn,staff_id,name_en)')
        .eq('meeting_id', participantsOf)
        .order('joined_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!participantsOf,
  });

  const filtered = useMemo(() => {
    let list = meetings.map((m: any) => ({ ...m, _status: computeStatus(m) }));
    if (tab !== 'all') list = list.filter((m: any) => m._status === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((m: any) =>
        m.title.toLowerCase().includes(s) || m.title_bn.toLowerCase().includes(s)
      );
    }
    return list;
  }, [meetings, tab, search]);

  const counts = useMemo(() => {
    const list = meetings.map((m: any) => computeStatus(m));
    return {
      all: list.length,
      scheduled: list.filter((s) => s === 'scheduled').length,
      live: list.filter((s) => s === 'live').length,
      ended: list.filter((s) => s === 'ended').length,
    };
  }, [meetings]);

  const openCreate = () => {
    setEditingId(null);
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    // Auto-populate default Daily.co URL if available
    const defaultDailyUrl = getDefaultUrl('daily');
    const myStaff = staff.find((s: any) => s.user_id === user?.id);
    setForm({
      ...emptyForm,
      scheduled_start: toLocal(inOneHour),
      scheduled_end: toLocal(new Date(inOneHour.getTime() + 60 * 60 * 1000)),
      meeting_room: `meet-${Math.random().toString(36).slice(2, 10)}`,
      meeting_url: defaultDailyUrl || '',
      provider: defaultDailyUrl ? 'daily' : 'jitsi',
      staff_organizer_id: myStaff ? myStaff.id : (staff[0]?.id || null),
    });
    setOpen(true);
  };

  const openEdit = (m: any) => {
    setEditingId(m.id);
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setForm({
      title: m.title || '',
      title_bn: m.title_bn || '',
      description: m.description || '',
      description_bn: m.description_bn || '',
      provider: m.provider,
      meeting_url: m.meeting_url || '',
      meeting_room: m.meeting_room || '',
      meeting_type: m.meeting_type,
      access_mode: m.access_mode,
      access_code: m.access_code || '',
      scheduled_start: toLocal(m.scheduled_start),
      scheduled_end: toLocal(m.scheduled_end),
      enable_chat: m.enable_chat,
      enable_attendance: m.enable_attendance,
      enable_reminder: m.enable_reminder,
      reminder_minutes: m.reminder_minutes ?? 10,
      recording_url: m.recording_url || '',
      notes: m.notes || '',
      notes_bn: m.notes_bn || '',
      is_published: m.is_published,
      staff_organizer_id: m.staff_organizer_id,
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: MeetingForm) => {
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

      let cleanUrl = payload.meeting_url.trim();
      if (payload.provider === 'jaas') {
        if (cleanUrl.startsWith('vpaas-magic-cookie-')) {
          const room = payload.meeting_room || payload.title.replace(/[^a-zA-Z0-9]/g, '') || 'Meeting';
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
        organizer_id: user?.id ?? null,
      };

      if (editingId) {
        const { error } = await supabase.from('meetings').update(dbPayload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meetings').insert(dbPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setDeleteId(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'বাতিল করা হয়েছে' : 'Cancelled');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const startNowMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000);
      const defaultDailyUrl = getDefaultUrl('daily');
      const useDaily = !!defaultDailyUrl;
      const { data, error } = await supabase.from('meetings').insert({
        title: `Instant Meeting - ${now.toLocaleString('en-GB')}`,
        title_bn: `ইনস্ট্যান্ট মিটিং - ${now.toLocaleString('bn-BD')}`,
        provider: useDaily ? 'daily' : 'jitsi',
        meeting_url: useDaily ? defaultDailyUrl : '',
        meeting_room: useDaily ? '' : `meet-${Math.random().toString(36).slice(2, 10)}`,
        meeting_type: 'staff',
        access_mode: 'logged_in',
        scheduled_start: now.toISOString(),
        scheduled_end: end.toISOString(),
        enable_chat: true,
        enable_attendance: true,
        is_published: true,
        status: 'scheduled',
        organizer_id: user?.id ?? null,
      }).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success(bn ? 'মিটিং শুরু হচ্ছে…' : 'Starting meeting…');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate(`/meeting/${id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startScheduledMutation = useMutation({
    mutationFn: async (m: any) => {
      const now = new Date();
      const originalDuration = new Date(m.scheduled_end).getTime() - new Date(m.scheduled_start).getTime();
      const newEnd = new Date(now.getTime() + Math.max(originalDuration, 30 * 60 * 1000));
      const { error } = await supabase.from('meetings').update({
        scheduled_start: now.toISOString(),
        scheduled_end: newEnd.toISOString(),
        status: 'scheduled',
      }).eq('id', m.id);
      if (error) throw error;
      return m.id as string;
    },
    onSuccess: (id) => {
      toast.success(bn ? 'মিটিং এখন লাইভ' : 'Meeting is now live');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate(`/meeting/${id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyJoinLink = (m: any) => {
    const url = `${window.location.origin}/meeting/${m.id}`;
    navigator.clipboard.writeText(url);
    toast.success(bn ? 'লিংক কপি হয়েছে' : 'Link copied');
  };

  const getJoinUrl = (m: any) => {
    if (m.provider === 'jitsi') return `https://meet.jit.si/${m.meeting_room || m.id}`;
    return m.meeting_url;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-primary" />
              {bn ? 'মিটিং ব্যবস্থাপনা' : 'Meetings'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {bn ? 'স্টাফ, অভিভাবক ও প্রশাসনিক মিটিং শিডিউল ও পরিচালনা করুন' : 'Schedule and manage staff, parent and administrative meetings'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => startNowMutation.mutate()}
              disabled={startNowMutation.isPending}
              variant="default"
              className="gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
            >
              <Zap className="w-4 h-4" /> {bn ? 'এখনই শুরু করুন' : 'Start Now'}
            </Button>
            <Button onClick={openCreate} variant="outline" className="gap-2 rounded-2xl">
              <Plus className="w-4 h-4" /> {bn ? 'নতুন মিটিং' : 'Schedule'}
            </Button>
          </div>
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
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{bn ? 'কোনো মিটিং নেই' : 'No meetings yet'}</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filtered.map((m: any) => (
                  <Card key={m.id} className="p-5 rounded-[28px] backdrop-blur-xl bg-card/80 border-border/50 hover:shadow-lg transition-all">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold">{bn ? m.title_bn : m.title}</h3>
                          {statusBadge(m._status, bn)}
                          <Badge variant="secondary" className="rounded-full">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {meetingTypeLabel(m.meeting_type, bn)}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            <Video className="w-3 h-3 mr-1" />
                            {providerLabel(m.provider, bn)}
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            {accessLabel(m.access_mode, bn)}
                          </Badge>
                          {!m.is_published && (
                            <Badge variant="outline" className="rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                              {bn ? 'অপ্রকাশিত' : 'Unpublished'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDateTime(m.scheduled_start, bn)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.round((new Date(m.scheduled_end).getTime() - new Date(m.scheduled_start).getTime()) / 60000)} {bn ? 'মিনিট' : 'min'}
                          </span>
                          {(() => {
                            const orgName = m.staff
                              ? (bn ? m.staff.name_bn : m.staff.name_en)
                              : (profiles.find((p: any) => p.id === m.organizer_id)?.full_name || '');
                            if (!orgName) return null;
                            return <span>{bn ? 'আয়োজক:' : 'Organizer:'} <strong>{orgName}</strong></span>;
                          })()}
                        </div>
                        {(m.notes || m.notes_bn) && (
                          <p className="text-sm text-muted-foreground italic">{bn ? m.notes_bn || m.notes : m.notes}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(m._status === 'live' || m._status === 'scheduled') && getJoinUrl(m) && (
                          <Button size="sm" asChild className="rounded-xl gap-1">
                            <a href={getJoinUrl(m)} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" /> {bn ? 'যোগ দিন' : 'Join'}
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => copyJoinLink(m)} className="rounded-xl gap-1">
                          <Copy className="w-3.5 h-3.5" /> {bn ? 'লিংক' : 'Link'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setParticipantsOf(m.id)} className="rounded-xl gap-1">
                          <Users className="w-3.5 h-3.5" /> {bn ? 'অংশগ্রহণ' : 'Attendees'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)} className="rounded-xl">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {m._status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => startScheduledMutation.mutate(m)}
                              disabled={startScheduledMutation.isPending}
                              className="rounded-xl gap-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                            >
                              <Zap className="w-3.5 h-3.5" /> {bn ? 'এখনই শুরু' : 'Start Now'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate(m.id)} className="rounded-xl text-orange-600">
                              {bn ? 'বাতিল' : 'Cancel'}
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(m.id)} className="rounded-xl text-destructive">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {editingId ? (bn ? 'মিটিং সম্পাদনা' : 'Edit Meeting') : (bn ? 'নতুন মিটিং' : 'New Meeting')}
            </DialogTitle>
            <DialogDescription>
              {bn ? 'মিটিংয়ের বিস্তারিত তথ্য পূরণ করুন' : 'Fill in the meeting details'}
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
                <Label>{bn ? 'মিটিং ধরন' : 'Meeting Type'} *</Label>
                <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v as MeetingType })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{meetingTypeLabel('staff', bn)}</SelectItem>
                    <SelectItem value="parent">{meetingTypeLabel('parent', bn)}</SelectItem>
                    <SelectItem value="administrative">{meetingTypeLabel('administrative', bn)}</SelectItem>
                    <SelectItem value="committee">{meetingTypeLabel('committee', bn)}</SelectItem>
                    <SelectItem value="other">{meetingTypeLabel('other', bn)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'আয়োজক (স্টাফ)' : 'Organizer (Staff)'}</Label>
                <Select value={form.staff_organizer_id ?? 'none'} onValueChange={(v) => setForm({ ...form, staff_organizer_id: v === 'none' ? null : v })}>
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
                <Select 
                  value={form.provider} 
                  onValueChange={(v) => {
                    const provider = v as Provider;
                    // Auto-populate default URL when switching to daily
                    if (provider === 'daily') {
                      const defaultUrl = getDefaultUrl('daily');
                      setForm({ ...form, provider, meeting_url: defaultUrl || form.meeting_url });
                    } else if (provider === 'jitsi') {
                      setForm({ ...form, provider, meeting_url: '', meeting_room: `meet-${Math.random().toString(36).slice(2, 10)}` });
                    } else {
                      setForm({ ...form, provider, meeting_url: '' });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jitsi">{providerLabel('jitsi', bn)}</SelectItem>
                    <SelectItem value="jaas">{providerLabel('jaas', bn)}</SelectItem>
                    <SelectItem value="daily">{providerLabel('daily', bn)}</SelectItem>
                    <SelectItem value="google_meet">{providerLabel('google_meet', bn)}</SelectItem>
                    <SelectItem value="zoom">{providerLabel('zoom', bn)}</SelectItem>
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
                    <SelectItem value="access_code">{accessLabel('access_code', bn)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.provider === 'jitsi' && (
              <div>
                <Label>{bn ? 'রুম নাম (অনন্য)' : 'Room name (unique)'}</Label>
                <Input value={form.meeting_room} onChange={(e) => setForm({ ...form, meeting_room: e.target.value })} placeholder="meet-abc123" className="mt-1.5 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">https://meet.jit.si/{form.meeting_room || '[room]'}</p>
              </div>
            )}
            {form.provider === 'jaas' && (
              <div className="space-y-1.5">
                <Label>{bn ? 'JaaS মিটিং URL' : 'JaaS Meeting URL'} *</Label>
                <Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://8x8.vc/vpaas-magic-cookie-XXXX/RoomName?jwt=..." className="mt-1.5 rounded-xl" />
                <p className="text-xs text-muted-foreground">{bn ? '8x8.vc থেকে টোকেনসহ পূর্ণ URL paste করুন।' : 'Paste full URL including JWT token from 8x8.vc.'}</p>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  {bn ? '⚠️ গুরুত্বপূর্ণ: 8x8 JaaS-এ টোকেন (?jwt=...) ছাড়া প্রবেশ করলে "Authentication failed" এরর আসবে। কোনো টোকেন ছাড়া ঝামেলামুক্ত ইন-অ্যাপ কলের জন্য "Daily.co" (১০,০০০ মিনিট ফ্রি) ব্যবহার করুন।' : '⚠️ Note: 8x8 JaaS requires a signed ?jwt= token or "Authentication failed" occurs. For instant zero-token in-app meetings, use "Daily.co" (10k free min).'}
                </div>
              </div>
            )}
            {form.provider === 'daily' && (
              <div>
                <Label>{bn ? 'Daily.co রুম URL' : 'Daily.co Room URL'} *</Label>
                <Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://your-domain.daily.co/room-name" className="mt-1.5 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">{bn ? 'daily.co dashboard থেকে রুম তৈরি করে URL paste করুন। মাসে ১০,০০০ ফ্রি মিনিট।' : 'Create a room at daily.co dashboard and paste URL. 10,000 free min/month.'}</p>
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
                <Label>{bn ? 'এজেন্ডা/নোট (বাংলা)' : 'Agenda/Notes (Bangla)'}</Label>
                <Textarea rows={2} value={form.notes_bn} onChange={(e) => setForm({ ...form, notes_bn: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>{bn ? 'এজেন্ডা/নোট (English)' : 'Agenda/Notes (English)'}</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 rounded-xl" />
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

            <div>
              <Label>{bn ? 'রেকর্ডিং URL (মিটিং শেষ হলে)' : 'Recording URL (after meeting)'}</Label>
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
        description={bn ? 'এই মিটিংটি রিসাইকেল বিন-এ চলে যাবে।' : 'This meeting will be moved to the recycle bin.'}
      />
    </AdminLayout>
  );
};

export default AdminMeetings;
