
-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  description_bn TEXT DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'jitsi',
  meeting_url TEXT DEFAULT '',
  meeting_room TEXT DEFAULT '',
  meeting_type TEXT NOT NULL DEFAULT 'staff',
  access_mode TEXT NOT NULL DEFAULT 'logged_in',
  access_code TEXT DEFAULT '',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  organizer_id UUID REFERENCES auth.users(id),
  staff_organizer_id UUID REFERENCES public.staff(id),
  enable_chat BOOLEAN NOT NULL DEFAULT true,
  enable_attendance BOOLEAN NOT NULL DEFAULT true,
  enable_reminder BOOLEAN NOT NULL DEFAULT false,
  reminder_minutes INT DEFAULT 10,
  recording_url TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  notes_bn TEXT DEFAULT '',
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert meetings"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meetings"
  ON public.meetings FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete meetings"
  ON public.meetings FOR DELETE TO authenticated
  USING (true);

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meeting participants
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  staff_id UUID REFERENCES public.staff(id),
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'participant',
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ DEFAULT NULL,
  attendance_marked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meeting participants"
  ON public.meeting_participants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert meeting participants"
  ON public.meeting_participants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meeting participants"
  ON public.meeting_participants FOR UPDATE TO authenticated
  USING (true);

CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_scheduled_start ON public.meetings(scheduled_start);
CREATE INDEX idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);
