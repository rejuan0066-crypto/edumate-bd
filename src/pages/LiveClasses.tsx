import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Calendar, Clock, Video, Users, Search, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'live' | 'scheduled' | 'ended';

const computeStatus = (lc: any): Status => {
  if (lc.status === 'cancelled' || lc.status === 'ended') return 'ended';
  const now = new Date();
  const s = new Date(lc.scheduled_start);
  const e = new Date(lc.scheduled_end);
  if (now >= s && now <= e) return 'live';
  if (now > e) return 'ended';
  return 'scheduled';
};

const providerLabel = (p: string, bn: boolean) => {
  const map: Record<string, [string, string]> = {
    jitsi: ['Jitsi', 'জিতসি'],
    zoom: ['Zoom', 'জুম'],
    google_meet: ['Google Meet', 'গুগল মিট'],
    youtube: ['YouTube Live', 'ইউটিউব লাইভ'],
  };
  return bn ? map[p]?.[1] : map[p]?.[0];
};

const formatDate = (iso: string, bn: boolean) =>
  new Date(iso).toLocaleString(bn ? 'bn-BD' : 'en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });

const LiveClasses = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const [tab, setTab] = useState<'live' | 'scheduled' | 'ended'>('live');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['public-live-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_classes')
        .select('id, title, title_bn, description_bn, provider, access_mode, scheduled_start, scheduled_end, status, recording_url, classes(name_bn, name), subjects(name_bn, name), staff(name_bn, name_en)')
        .eq('is_published', true)
        .is('deleted_at', null)
        .neq('access_mode', 'access_code')
        .order('scheduled_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const handleAccessCode = async () => {
    const t = code.trim();
    if (!t) return;
    const { data, error } = await supabase
      .from('live_classes')
      .select('id, access_code')
      .eq('access_code', t)
      .eq('is_published', true)
      .is('deleted_at', null)
      .maybeSingle();
    if (error || !data) {
      toast.error(bn ? 'অবৈধ কোড' : 'Invalid code');
      return;
    }
    navigate(`/live-class/${data.id}?code=${encodeURIComponent(t)}`);
  };

  const grouped = useMemo(() => {
    const list = classes.map((lc: any) => ({ ...lc, _status: computeStatus(lc) }));
    const filtered = search.trim()
      ? list.filter((lc: any) =>
          lc.title?.toLowerCase().includes(search.toLowerCase()) ||
          lc.title_bn?.toLowerCase().includes(search.toLowerCase()))
      : list;
    return {
      live: filtered.filter((lc: any) => lc._status === 'live'),
      scheduled: filtered.filter((lc: any) => lc._status === 'scheduled'),
      ended: filtered.filter((lc: any) => lc._status === 'ended'),
    };
  }, [classes, search]);

  const renderCard = (lc: any) => {
    const isLive = lc._status === 'live';
    const isEnded = lc._status === 'ended';
    return (
      <Card key={lc.id} className="p-5 rounded-[28px] backdrop-blur-xl bg-card/80 border-border/50 hover:shadow-xl hover:scale-[1.01] transition-all">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isLive && (
                <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 animate-pulse rounded-full">
                  <Radio className="w-3 h-3 mr-1" /> {bn ? 'লাইভ' : 'LIVE'}
                </Badge>
              )}
              <Badge variant="secondary" className="rounded-full text-xs">
                <Video className="w-3 h-3 mr-1" /> {providerLabel(lc.provider, bn)}
              </Badge>
              {isEnded && lc.recording_url && (
                <Badge variant="outline" className="rounded-full text-xs">
                  ▶ {bn ? 'রেকর্ডিং' : 'Recording'}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg leading-tight">{bn ? lc.title_bn : lc.title}</h3>
            {lc.description_bn && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{lc.description_bn}</p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> {formatDate(lc.scheduled_start, bn)}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            {Math.round((new Date(lc.scheduled_end).getTime() - new Date(lc.scheduled_start).getTime()) / 60000)} {bn ? 'মিনিট' : 'min'}
          </div>
          {lc.classes && (
            <div>{bn ? 'ক্লাস:' : 'Class:'} {bn ? lc.classes.name_bn : lc.classes.name}</div>
          )}
          {lc.subjects && (
            <div>{bn ? 'বিষয়:' : 'Subject:'} {bn ? lc.subjects.name_bn : lc.subjects.name}</div>
          )}
          {lc.staff && (
            <div>{bn ? 'শিক্ষক:' : 'Teacher:'} {bn ? lc.staff.name_bn : lc.staff.name_en}</div>
          )}
        </div>

        <Button
          onClick={() => navigate(`/live-class/${lc.id}`)}
          className={`w-full rounded-2xl gap-2 ${isLive ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
          variant={isLive ? 'default' : 'outline'}
          disabled={isEnded && !lc.recording_url}
        >
          {isLive
            ? (bn ? '▶ এখনই যোগ দিন' : '▶ Join Now')
            : isEnded
              ? (lc.recording_url ? (bn ? 'রেকর্ডিং দেখুন' : 'Watch Recording') : (bn ? 'সমাপ্ত' : 'Ended'))
              : (bn ? 'বিস্তারিত' : 'Details')}
        </Button>
      </Card>
    );
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <Radio className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">{bn ? 'লাইভ ক্লাস' : 'Live Classes'}</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {bn ? 'অনলাইন ক্লাসের শিডিউল দেখুন, লাইভ ক্লাসে অংশ নিন এবং রেকর্ডিং দেখুন' : 'Browse scheduled, live and recorded classes'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'ক্লাস অনুসন্ধান…' : 'Search classes…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-2xl h-12"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? 'অ্যাক্সেস কোড…' : 'Access code…'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAccessCode()}
                className="pl-10 rounded-2xl h-12"
              />
            </div>
            <Button onClick={handleAccessCode} className="rounded-2xl h-12 gap-2">
              <ShieldCheck className="w-4 h-4" /> {bn ? 'যোগ' : 'Join'}
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="rounded-2xl mb-6">
            <TabsTrigger value="live" className="rounded-xl gap-1">
              <Radio className="w-3.5 h-3.5" /> {bn ? 'লাইভ' : 'Live'} ({grouped.live.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-xl">
              {bn ? 'আসন্ন' : 'Upcoming'} ({grouped.scheduled.length})
            </TabsTrigger>
            <TabsTrigger value="ended" className="rounded-xl">
              {bn ? 'সমাপ্ত' : 'Ended'} ({grouped.ended.length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</div>
          ) : grouped[tab].length === 0 ? (
            <Card className="p-12 text-center rounded-[32px]">
              <Video className="w-14 h-14 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {tab === 'live'
                  ? (bn ? 'এখন কোনো লাইভ ক্লাস নেই' : 'No live classes right now')
                  : tab === 'scheduled'
                    ? (bn ? 'কোনো আসন্ন ক্লাস নেই' : 'No upcoming classes')
                    : (bn ? 'কোনো সমাপ্ত ক্লাস নেই' : 'No ended classes')}
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {grouped[tab].map(renderCard)}
            </div>
          )}
        </Tabs>
      </div>
    </PublicLayout>
  );
};

export default LiveClasses;
