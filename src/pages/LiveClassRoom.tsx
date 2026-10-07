import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import PublicLayout from '@/components/PublicLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Radio, Calendar, Clock, Users, MessageCircle, Send, ExternalLink, ArrowLeft,
  Lock, ShieldCheck, Video,
} from 'lucide-react';
import { toast } from 'sonner';

type Status = 'live' | 'scheduled' | 'ended' | 'cancelled';

const computeStatus = (lc: any): Status => {
  if (lc.status === 'cancelled') return 'cancelled';
  const now = new Date();
  const s = new Date(lc.scheduled_start);
  const e = new Date(lc.scheduled_end);
  if (now >= s && now <= e) return 'live';
  if (now > e) return 'ended';
  return 'scheduled';
};

const formatDateTime = (iso: string, bn: boolean) =>
  new Date(iso).toLocaleString(bn ? 'bn-BD' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

const formatTime = (iso: string, bn: boolean) =>
  new Date(iso).toLocaleTimeString(bn ? 'bn-BD' : 'en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

const youtubeEmbed = (url: string) => {
  if (!url) return '';
  // youtu.be/ID, youtube.com/watch?v=ID, youtube.com/live/ID
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
  return url;
};

const LiveClassRoom = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();

  const providedCode = searchParams.get('code') ?? '';
  const [enteredCode, setEnteredCode] = useState(providedCode);
  const [codeOk, setCodeOk] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const joinedRef = useRef(false);

  // Fetch class
  const { data: lc, isLoading, error } = useQuery({
    queryKey: ['live-class', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_classes')
        .select('*, classes(name,name_bn), subjects(name,name_bn), staff(name_en,name_bn)')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('NOT_FOUND');
      return data;
    },
    enabled: !!id,
    refetchInterval: 60_000,
  });

  // Profile lookup
  const { data: profile } = useQuery({
    queryKey: ['lc-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .maybeSingle();
      return data as { id: string; full_name: string | null } | null;
    },
    enabled: !!user?.id,
  });

  // Messages
  const { data: messages = [] } = useQuery({
    queryKey: ['lc-messages', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_class_messages')
        .select('*')
        .eq('live_class_id', id!)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id && !!lc?.enable_chat,
  });

  // Participants count
  const { data: participants = [] } = useQuery({
    queryKey: ['lc-room-participants', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('live_class_participants')
        .select('id, display_name, joined_at, left_at')
        .eq('live_class_id', id!)
        .order('joined_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
    refetchInterval: 20_000,
  });

  // Realtime: messages + participants
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`live-class-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_class_messages',
        filter: `live_class_id=eq.${id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['lc-messages', id] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_class_participants',
        filter: `live_class_id=eq.${id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['lc-room-participants', id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const status: Status | null = lc ? computeStatus(lc) : null;
  const isLive = status === 'live';

  // Access checks
  const accessGranted = useMemo(() => {
    if (!lc) return false;
    if (lc.access_mode === 'public') return true;
    if (lc.access_mode === 'logged_in') return !!user;
    if (lc.access_mode === 'class_based') return !!user;
    if (lc.access_mode === 'access_code') return codeOk || (providedCode && providedCode === lc.access_code);
    return false;
  }, [lc, user, codeOk, providedCode]);

  useEffect(() => {
    if (lc && lc.access_mode === 'access_code' && providedCode && providedCode === lc.access_code) {
      setCodeOk(true);
    }
  }, [lc, providedCode]);

  const verifyCode = () => {
    if (lc && enteredCode.trim() === lc.access_code) {
      setCodeOk(true);
      toast.success(bn ? 'কোড সঠিক' : 'Code accepted');
    } else {
      toast.error(bn ? 'অবৈধ কোড' : 'Invalid code');
    }
  };

  const displayName = useMemo(() => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return guestName.trim() || 'Guest';
  }, [profile, user, guestName]);

  // Auto-join (attendance)
  useEffect(() => {
    if (!lc || !id || !accessGranted || !isLive || joinedRef.current) return;
    if (!lc.enable_attendance) return;
    if (!user && lc.access_mode !== 'public') return;
    if (lc.access_mode === 'public' && !user && !guestName.trim()) return;

    joinedRef.current = true;
    (async () => {
      const { data, error } = await supabase
        .from('live_class_participants')
        .insert({
          live_class_id: id,
          user_id: user?.id ?? null,
          display_name: displayName,
          attendance_marked: true,
        })
        .select('id')
        .single();
      if (!error && data) setParticipantId(data.id);
    })();
  }, [lc, id, accessGranted, isLive, user, profile, displayName, guestName]);

  // Mark left on unmount
  useEffect(() => {
    return () => {
      if (participantId) {
        const leftAt = new Date().toISOString();
        supabase.from('live_class_participants').update({ left_at: leftAt }).eq('id', participantId).then();
      }
    };
  }, [participantId]);

  const sendMessage = async () => {
    const t = chatInput.trim();
    if (!t || !id) return;
    setChatInput('');
    const { error } = await supabase.from('live_class_messages').insert({
      live_class_id: id,
      user_id: user?.id ?? null,
      sender_name: displayName,
      sender_role: 'student',
      message: t,
      message_type: 'chat',
    });
    if (error) {
      toast.error(error.message);
      setChatInput(t);
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          {bn ? 'লোড হচ্ছে…' : 'Loading…'}
        </div>
      </PublicLayout>
    );
  }

  if (error || !lc) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">{bn ? 'ক্লাস পাওয়া যায়নি' : 'Class not found'}</p>
          <Button onClick={() => navigate('/live-classes')} variant="outline" className="rounded-2xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> {bn ? 'ফিরে যান' : 'Back'}
          </Button>
        </div>
      </PublicLayout>
    );
  }

  // Access gates
  if (lc.access_mode === 'logged_in' && !user) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
          <Lock className="w-14 h-14 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-bold mb-2">{bn ? 'লগইন প্রয়োজন' : 'Login required'}</h2>
          <p className="text-muted-foreground mb-6">{bn ? 'এই ক্লাসে যোগ দিতে লগইন করুন' : 'Please log in to join this class'}</p>
          <Button onClick={() => navigate('/login')} className="rounded-2xl">{bn ? 'লগইন' : 'Login'}</Button>
        </div>
      </PublicLayout>
    );
  }

  if (lc.access_mode === 'access_code' && !codeOk) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 max-w-md">
          <Card className="p-8 rounded-[28px] text-center">
            <ShieldCheck className="w-14 h-14 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">{bn ? 'অ্যাক্সেস কোড প্রয়োজন' : 'Access code required'}</h2>
            <p className="text-muted-foreground mb-6">{bn ? 'শিক্ষকের কাছ থেকে প্রাপ্ত কোড দিন' : 'Enter the code from your teacher'}</p>
            <Input
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
              placeholder={bn ? 'কোড' : 'Code'}
              className="rounded-2xl h-12 text-center tracking-widest mb-4"
            />
            <Button onClick={verifyCode} className="w-full rounded-2xl h-12">
              {bn ? 'যাচাই' : 'Verify'}
            </Button>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  if (lc.access_mode === 'public' && !user && !guestName.trim() && isLive) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 max-w-md">
          <Card className="p-8 rounded-[28px]">
            <Users className="w-14 h-14 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-center">{bn ? 'আপনার নাম' : 'Your name'}</h2>
            <p className="text-muted-foreground mb-6 text-center">{bn ? 'অংশগ্রহণের জন্য নাম দিন' : 'Enter a name to join'}</p>
            <Input
              autoFocus
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={bn ? 'আপনার নাম' : 'Your name'}
              className="rounded-2xl h-12 mb-4"
            />
            <Button onClick={() => guestName.trim() && setGuestName(guestName.trim())} disabled={!guestName.trim()} className="w-full rounded-2xl h-12">
              {bn ? 'যোগ দিন' : 'Continue'}
            </Button>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // Build embed
  const renderMeeting = () => {
    if (status === 'scheduled') {
      return (
        <div className="aspect-video rounded-[24px] bg-muted/40 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <Clock className="w-14 h-14 text-primary" />
          <h3 className="text-xl font-semibold">{bn ? 'ক্লাস এখনো শুরু হয়নি' : 'Class has not started yet'}</h3>
          <p className="text-muted-foreground">
            {bn ? 'শুরু হবে:' : 'Starts:'} {formatDateTime(lc.scheduled_start, bn)}
          </p>
        </div>
      );
    }
    if (status === 'cancelled') {
      return (
        <div className="aspect-video rounded-[24px] bg-muted/40 flex items-center justify-center text-muted-foreground">
          {bn ? 'এই ক্লাসটি বাতিল করা হয়েছে' : 'This class was cancelled'}
        </div>
      );
    }
    if (status === 'ended') {
      if (lc.recording_url) {
        return (
          <div className="aspect-video rounded-[24px] overflow-hidden bg-black">
            <iframe
              src={youtubeEmbed(lc.recording_url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Recording"
            />
          </div>
        );
      }
      return (
        <div className="aspect-video rounded-[24px] bg-muted/40 flex items-center justify-center text-muted-foreground">
          {bn ? 'ক্লাস শেষ হয়েছে — কোনো রেকর্ডিং নেই' : 'Class ended — no recording available'}
        </div>
      );
    }

    // LIVE
    const mUrl = lc.meeting_url || '';
    const isJaaS = lc.provider === 'jaas' || mUrl.includes('8x8.vc') || mUrl.startsWith('vpaas-magic-cookie-');
    const isDaily = lc.provider === 'daily' || mUrl.includes('daily.co');

    if (isJaaS) {
      let finalJaaSUrl = mUrl;
      const room = lc.meeting_room || lc.id || 'LiveClass';
      if (mUrl.startsWith('eyJ')) {
        finalJaaSUrl = `https://8x8.vc/vpaas-magic-cookie-bf72faa5e6d3456fba4402a771432f19/${room}?jwt=${mUrl}`;
      } else if (mUrl.startsWith('vpaas-magic-cookie-')) {
        finalJaaSUrl = `https://8x8.vc/${mUrl}/${room}`;
      } else if (!mUrl.startsWith('http://') && !mUrl.startsWith('https://')) {
        finalJaaSUrl = `https://${mUrl}`;
      }
      const hashGlue = finalJaaSUrl.includes('#') ? '&' : '#';
      finalJaaSUrl = `${finalJaaSUrl}${hashGlue}userInfo.displayName="${displayName}"&config.prejoinPageEnabled=false`;
      return (
        <div className="aspect-video rounded-[24px] overflow-hidden bg-black shadow-2xl">
          <iframe
            src={finalJaaSUrl}
            className="w-full h-full border-0"
            allow="camera *; microphone *; autoplay *; fullscreen *; display-capture *; speaker-selection *; clipboard-write *"
            allowFullScreen
            title="JaaS Live Class"
          />
        </div>
      );
    }

    if (isDaily) {
      return (
        <div className="aspect-video rounded-[24px] overflow-hidden bg-black shadow-2xl">
          <iframe
            src={mUrl}
            className="w-full h-full border-0"
            allow="camera *; microphone *; autoplay *; fullscreen *; display-capture *; speaker-selection *; clipboard-write *"
            allowFullScreen
            title="Daily.co Live Class"
          />
        </div>
      );
    }

    if (lc.provider === 'jitsi') {
      const room = lc.meeting_room || lc.id;
      const src = `https://meet.jit.si/${room}#userInfo.displayName="${displayName}"&config.prejoinPageEnabled=false`;
      return (
        <div className="aspect-video rounded-[24px] overflow-hidden bg-black shadow-2xl">
          <iframe
            src={src}
            className="w-full h-full border-0"
            allow="camera *; microphone *; autoplay *; fullscreen *; display-capture *; speaker-selection *"
            allowFullScreen
            title="Jitsi Meet"
          />
        </div>
      );
    }
    if (lc.provider === 'youtube' && lc.meeting_url) {
      return (
        <div className="aspect-video rounded-[24px] overflow-hidden bg-black shadow-2xl">
          <iframe
            src={youtubeEmbed(lc.meeting_url)}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="YouTube Live"
          />
        </div>
      );
    }
    // Zoom / Google Meet → external
    return (
      <div className="aspect-video rounded-[24px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Video className="w-16 h-16 text-primary" />
        <h3 className="text-xl font-semibold">{bn ? 'বাহ্যিক প্ল্যাটফর্মে যোগ দিন' : 'Join on external platform'}</h3>
        <Button asChild size="lg" className="rounded-2xl gap-2">
          <a href={lc.meeting_url} target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4" /> {bn ? 'যোগ দিন' : 'Open Meeting'}
          </a>
        </Button>
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/live-classes')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-1" /> {bn ? 'সব ক্লাস' : 'All classes'}
          </Button>
          {isLive && (
            <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 animate-pulse rounded-full">
              <Radio className="w-3 h-3 mr-1" /> {bn ? 'লাইভ' : 'LIVE'}
            </Badge>
          )}
          <Badge variant="outline" className="rounded-full">
            <Users className="w-3 h-3 mr-1" /> {participants.filter((p: any) => !p.left_at).length} {bn ? 'জন' : 'online'}
          </Badge>
        </div>

        <div className={`grid gap-6 ${lc.enable_chat && isLive ? 'lg:grid-cols-[1fr,360px]' : ''}`}>
          {/* Main */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold leading-tight">{bn ? lc.title_bn : lc.title}</h1>
              {(lc.description_bn || lc.description) && (
                <p className="text-muted-foreground mt-1">{bn ? lc.description_bn : lc.description}</p>
              )}
            </div>

            {renderMeeting()}

            <Card className="p-4 rounded-[24px]">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDateTime(lc.scheduled_start, bn)} — {formatTime(lc.scheduled_end, bn)}</span>
                </div>
                {lc.classes && (
                  <div>{bn ? 'ক্লাস:' : 'Class:'} <strong>{bn ? lc.classes.name_bn : lc.classes.name}</strong></div>
                )}
                {lc.subjects && (
                  <div>{bn ? 'বিষয়:' : 'Subject:'} <strong>{bn ? lc.subjects.name_bn : lc.subjects.name}</strong></div>
                )}
                {lc.staff && (
                  <div>{bn ? 'শিক্ষক:' : 'Teacher:'} <strong>{bn ? lc.staff.name_bn : lc.staff.name_en}</strong></div>
                )}
              </div>
            </Card>
          </div>

          {/* Chat */}
          {lc.enable_chat && (isLive || messages.length > 0) && (
            <Card className="rounded-[24px] flex flex-col h-[600px] lg:h-auto lg:max-h-[calc(100vh-200px)] overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">{bn ? 'লাইভ চ্যাট' : 'Live Chat'}</h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {bn ? 'এখনো কোনো মেসেজ নেই' : 'No messages yet'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m: any) => (
                      <div key={m.id} className="text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-semibold ${m.sender_role === 'teacher' ? 'text-primary' : ''}`}>
                            {m.sender_name}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatTime(m.created_at, bn)}</span>
                        </div>
                        <p className="break-words">{m.message}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>
              {isLive && (
                <div className="p-3 border-t border-border/50 flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={bn ? 'মেসেজ লিখুন…' : 'Type a message…'}
                    className="rounded-xl"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!chatInput.trim()} className="rounded-xl shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default LiveClassRoom;
