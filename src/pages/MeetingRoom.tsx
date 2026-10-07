import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Briefcase, Calendar, Clock, ExternalLink, ShieldCheck, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

const MeetingRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [guestName, setGuestName] = useState('');
  const [granted, setGranted] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [requestingMedia, setRequestingMedia] = useState(false);

  const requestMediaPermission = async () => {
    setRequestingMedia(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error(bn ? 'এই ব্রাউজারে মাইক্রোফোন সমর্থন নেই' : 'Microphone not supported in this browser');
        setRequestingMedia(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
      setMediaReady(true);
      toast.success(bn ? 'অনুমতি পাওয়া গেছে' : 'Permission granted');
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        toast.error(bn ? 'মাইক/ক্যামেরা অনুমতি বাতিল করা হয়েছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন।' : 'Mic/Camera denied. Allow it in browser settings.');
      } else if (name === 'NotFoundError') {
        toast.error(bn ? 'কোনো মাইক্রোফোন পাওয়া যায়নি' : 'No microphone found');
      } else if (name === 'NotReadableError') {
        toast.error(bn ? 'মাইক্রোফোন অন্য অ্যাপে ব্যবহৃত হচ্ছে' : 'Microphone is in use by another app');
      } else {
        toast.error(bn ? 'অনুমতি পেতে ব্যর্থ' : 'Permission request failed');
      }
    } finally {
      setRequestingMedia(false);
    }
  };

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, staff:staff_organizer_id(name_bn, name_en)')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch organizer profile if staff_organizer_id was not selected
  const { data: organizerProfile } = useQuery({
    queryKey: ['organizer-profile', meeting?.organizer_id],
    queryFn: async () => {
      if (!meeting?.organizer_id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', meeting.organizer_id).maybeSingle();
      return data;
    },
    enabled: !!meeting?.organizer_id,
  });

  // Fetch logged in user's profile to pass accurate full name to meeting
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const organizerName = useMemo(() => {
    if (meeting?.staff) {
      return bn ? (meeting.staff.name_bn || meeting.staff.name_en) : (meeting.staff.name_en || meeting.staff.name_bn);
    }
    if (organizerProfile?.full_name) {
      return organizerProfile.full_name;
    }
    return '';
  }, [meeting, organizerProfile, bn]);

  const status = useMemo(() => {
    if (!meeting) return 'scheduled' as const;
    if (meeting.status === 'cancelled' || meeting.status === 'ended') return meeting.status;
    const now = new Date();
    const start = new Date(meeting.scheduled_start);
    const end = new Date(meeting.scheduled_end);
    if (now >= start && now <= end) return 'live' as const;
    if (now > end) return 'ended' as const;
    return 'scheduled' as const;
  }, [meeting]);

  const canEnter = useMemo(() => {
    if (!meeting) return false;
    if (meeting.access_mode === 'public') return true;
    if (meeting.access_mode === 'logged_in') return !!user;
    if (meeting.access_mode === 'access_code') return granted;
    return true;
  }, [meeting, user, granted]);

  useEffect(() => {
    if (!meeting || !canEnter || !meeting.enable_attendance) return;
    let mounted = true;
    let participantId: string | null = null;
    (async () => {
      const displayName = user?.email || guestName || 'Guest';
      const { data } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user?.id ?? null,
          display_name: displayName,
          attendance_marked: true,
        })
        .select('id')
        .maybeSingle();
      if (mounted && data) participantId = data.id;
    })();
    return () => {
      mounted = false;
      if (participantId) {
        supabase.from('meeting_participants').update({ left_at: new Date().toISOString() }).eq('id', participantId);
      }
    };
  }, [meeting, canEnter, user, guestName]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="text-center py-20 text-muted-foreground">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</div>
      </PublicLayout>
    );
  }

  if (error || !meeting) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-20 text-center">
          <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-bold mb-2">{bn ? 'মিটিং পাওয়া যায়নি' : 'Meeting not found'}</h2>
          <Button onClick={() => navigate('/')} className="mt-4 rounded-2xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> {bn ? 'হোমে ফিরুন' : 'Back home'}
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const formatDT = (iso: string) =>
    new Date(iso).toLocaleString(bn ? 'bn-BD' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });

  const rawDisplayName = useMemo(() => {
    if (currentUserProfile?.full_name) return currentUserProfile.full_name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.email) return user.email.split('@')[0];
    if (guestName) return guestName;
    return bn ? 'অংশগ্রহণকারী' : 'Guest';
  }, [currentUserProfile, user, guestName, bn]);

  const displayName = encodeURIComponent(rawDisplayName);
  const jitsiConfig = [
    'config.prejoinPageEnabled=false',
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    'config.startSilent=false',
    'config.disableDeepLinking=true',
    'config.p2p.enabled=true',
  ].join('&');
  const joinUrl = meeting.provider === 'jitsi'
    ? `https://meet.jit.si/${meeting.meeting_room || meeting.id}#userInfo.displayName="${displayName}"&${jitsiConfig}`
    : meeting.meeting_url;

  const tryAccessCode = () => {
    if (accessCodeInput.trim() === (meeting.access_code || '').trim()) {
      setGranted(true);
      toast.success(bn ? 'অ্যাক্সেস অনুমোদিত' : 'Access granted');
    } else {
      toast.error(bn ? 'ভুল অ্যাক্সেস কোড' : 'Wrong access code');
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" /> {bn ? 'ফিরুন' : 'Back'}
        </Button>

        <Card className="p-6 rounded-[32px] mb-6">
          <div className="flex flex-wrap items-start gap-3 mb-3">
            <h1 className="text-2xl font-bold flex-1">{bn ? meeting.title_bn : meeting.title}</h1>
            <Badge variant={status === 'live' ? 'destructive' : 'secondary'} className="rounded-full">
              {status === 'live' ? (bn ? 'লাইভ' : 'LIVE') : status === 'scheduled' ? (bn ? 'নির্ধারিত' : 'Scheduled') : status === 'ended' ? (bn ? 'সমাপ্ত' : 'Ended') : (bn ? 'বাতিল' : 'Cancelled')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDT(meeting.scheduled_start)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> → {formatDT(meeting.scheduled_end)}</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> {meeting.access_mode}</span>
            {organizerName && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>{bn ? 'আয়োজক:' : 'Organizer:'} <strong>{organizerName}</strong></span>
              </span>
            )}
          </div>
          {(meeting.description || meeting.description_bn) && (
            <p className="mt-3 text-sm">{bn ? meeting.description_bn || meeting.description : meeting.description}</p>
          )}
          {(meeting.notes || meeting.notes_bn) && (
            <div className="mt-3 p-3 rounded-2xl bg-muted/40 text-sm">
              <div className="font-medium mb-1">{bn ? 'এজেন্ডা/নোট' : 'Agenda/Notes'}</div>
              <div className="whitespace-pre-wrap text-muted-foreground">{bn ? meeting.notes_bn || meeting.notes : meeting.notes}</div>
            </div>
          )}
        </Card>

        {/* Access Gates */}
        {!canEnter && meeting.access_mode === 'logged_in' && (
          <Card className="p-8 rounded-[32px] text-center">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{bn ? 'লগইন প্রয়োজন' : 'Login required'}</h3>
            <Button onClick={() => navigate('/login')} className="rounded-2xl mt-2">{bn ? 'লগইন করুন' : 'Login'}</Button>
          </Card>
        )}

        {!canEnter && meeting.access_mode === 'access_code' && (
          <Card className="p-8 rounded-[32px] max-w-md mx-auto">
            <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-center mb-4">{bn ? 'অ্যাক্সেস কোড দিন' : 'Enter access code'}</h3>
            <div className="space-y-3">
              <Input value={accessCodeInput} onChange={(e) => setAccessCodeInput(e.target.value)} placeholder={bn ? 'কোড' : 'Code'} className="rounded-xl" />
              {!user && (
                <div>
                  <Label className="text-xs">{bn ? 'আপনার নাম' : 'Your name'}</Label>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="rounded-xl mt-1" />
                </div>
              )}
              <Button onClick={tryAccessCode} className="w-full rounded-xl">{bn ? 'প্রবেশ করুন' : 'Enter'}</Button>
            </div>
          </Card>
        )}

        {canEnter && status !== 'cancelled' && (
          <>
            {meeting.provider === 'jitsi' && status === 'live' && !mediaReady && (
              <Card className="p-8 rounded-[32px] text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{bn ? 'মাইক্রোফোন/ক্যামেরা অনুমতি দিন' : 'Allow Microphone & Camera'}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {bn ? 'মিটিংয়ে যোগ দিতে আপনার ব্রাউজারকে মাইক্রোফোন এবং ক্যামেরা ব্যবহারের অনুমতি দিতে হবে। মোবাইলে ব্রাউজার পপ-আপে "Allow" চাপুন।' : 'To join, your browser needs permission to use microphone and camera. On mobile, tap "Allow" in the browser pop-up.'}
                </p>
                <Button onClick={requestMediaPermission} disabled={requestingMedia} size="lg" className="rounded-2xl w-full">
                  {requestingMedia ? (bn ? 'অনুরোধ করা হচ্ছে…' : 'Requesting…') : (bn ? 'অনুমতি দিন ও যোগ দিন' : 'Grant Permission & Join')}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  {bn ? 'টিপ: শুধু অডিও চাইলে ভেতরে গিয়ে ক্যামেরা বন্ধ করতে পারবেন।' : 'Tip: You can turn off the camera once inside.'}
                </p>
              </Card>
            )}

            {meeting.provider === 'jitsi' && status === 'live' && mediaReady && (
              <Card className="p-2 rounded-[32px] overflow-hidden">
                <iframe
                  src={joinUrl}
                  className="w-full h-[70vh] rounded-[28px] border-0"
                  allow="camera *; microphone *; autoplay *; fullscreen *; display-capture *; speaker-selection *; clipboard-write *"
                  allowFullScreen
                  {...({ allowusermedia: 'true' } as any)}
                  title={meeting.title}
                />
                <p className="text-xs text-muted-foreground text-center mt-2 px-2">
                  {bn ? '🎙️ আনমিউট না হলে: ব্রাউজার অ্যাড্রেস বারের 🔒 আইকনে ট্যাপ করে Microphone "Allow" করুন, তারপর পেজ রিফ্রেশ করুন।' : '🎙️ If unmute fails: Tap 🔒 in address bar, "Allow" Microphone, then refresh.'}
                </p>
              </Card>
            )}

            {meeting.provider === 'youtube' && status === 'live' && meeting.meeting_url && (
              <Card className="p-2 rounded-[32px] overflow-hidden">
                <iframe
                  src={`${meeting.meeting_url.replace('watch?v=', 'embed/')}${meeting.meeting_url.includes('?') ? '&' : '?'}autoplay=1`}
                  className="w-full h-[70vh] rounded-[28px] border-0"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={meeting.title}
                />
              </Card>
            )}

            {(meeting.provider === 'jaas' || meeting.provider === 'daily') && status === 'live' && meeting.meeting_url && !mediaReady && (
              <Card className="p-8 rounded-[32px] text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{bn ? 'মাইক্রোফোন/ক্যামেরা অনুমতি দিন' : 'Allow Microphone & Camera'}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {bn ? 'মিটিংয়ে যোগ দিতে আপনার ব্রাউজারকে মাইক্রোফোন এবং ক্যামেরা ব্যবহারের অনুমতি দিতে হবে।' : 'To join, your browser needs permission to use microphone and camera.'}
                </p>
                <Button onClick={requestMediaPermission} disabled={requestingMedia} size="lg" className="rounded-2xl w-full">
                  {requestingMedia ? (bn ? 'অনুরোধ করা হচ্ছে…' : 'Requesting…') : (bn ? 'অনুমতি দিন ও যোগ দিন' : 'Grant Permission & Join')}
                </Button>
              </Card>
            )}

            {(meeting.provider === 'jaas' || meeting.provider === 'daily') && status === 'live' && meeting.meeting_url && mediaReady && (() => {
              let liveUrl = meeting.meeting_url;
              if (meeting.provider === 'jaas' && liveUrl.startsWith('vpaas-magic-cookie-')) {
                const room = meeting.meeting_room || meeting.id || 'Meeting';
                liveUrl = `https://8x8.vc/${liveUrl}/${room}`;
              }
              if (liveUrl.includes('8x8.vc') || liveUrl.includes('meet.jit.si')) {
                const hashGlue = liveUrl.includes('#') ? '&' : '#';
                liveUrl = `${liveUrl}${hashGlue}userInfo.displayName="${displayName}"`;
              }
              return (
                <Card className="p-2 rounded-[32px] overflow-hidden">
                  <iframe
                    src={liveUrl}
                    className="w-full h-[70vh] rounded-[28px] border-0"
                    allow="camera *; microphone *; autoplay *; fullscreen *; display-capture *; speaker-selection *; clipboard-write *"
                    allowFullScreen
                    {...({ allowusermedia: 'true' } as any)}
                    title={meeting.title}
                  />
                  <p className="text-xs text-muted-foreground text-center mt-2 px-2">
                    {bn ? '🎙️ আনমিউট না হলে: ব্রাউজার অ্যাড্রেস বারের 🔒 আইকনে ট্যাপ করে Microphone "Allow" করুন।' : '🎙️ If unmute fails: Tap 🔒 in address bar, "Allow" Microphone.'}
                  </p>
                </Card>
              );
            })()}

            {(meeting.provider === 'zoom' || meeting.provider === 'google_meet') && (
              <Card className="p-8 rounded-[32px] text-center">
                <h3 className="text-lg font-semibold mb-3">{bn ? 'বাহ্যিক মিটিং লিংক' : 'External meeting link'}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {bn ? 'নিচের বাটনে ক্লিক করে নতুন ট্যাবে মিটিংয়ে যোগ দিন। কোনো লিমিট নেই।' : 'Click below to join in a new tab. No time limit.'}
                </p>
                <Button asChild size="lg" className="rounded-2xl">
                  <a href={meeting.meeting_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> {bn ? 'মিটিংয়ে যোগ দিন' : 'Join meeting'}
                  </a>
                </Button>
              </Card>
            )}

            {meeting.provider === 'jitsi' && status === 'scheduled' && (
              <Card className="p-8 rounded-[32px] text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p>{bn ? 'মিটিং এখনো শুরু হয়নি।' : 'Meeting has not started yet.'}</p>
                <p className="text-sm text-muted-foreground mt-1">{formatDT(meeting.scheduled_start)}</p>
              </Card>
            )}

            {status === 'ended' && (
              <Card className="p-8 rounded-[32px] text-center">
                <p className="text-muted-foreground">{bn ? 'এই মিটিংটি সমাপ্ত।' : 'This meeting has ended.'}</p>
                {meeting.recording_url && (
                  <Button asChild className="mt-4 rounded-2xl">
                    <a href={meeting.recording_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" /> {bn ? 'রেকর্ডিং দেখুন' : 'View recording'}
                    </a>
                  </Button>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
};

export default MeetingRoom;
