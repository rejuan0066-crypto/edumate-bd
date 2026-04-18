
-- 1. live_classes table
CREATE TABLE public.live_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  description TEXT,
  description_bn TEXT,
  provider TEXT NOT NULL DEFAULT 'jitsi' CHECK (provider IN ('jitsi','zoom','google_meet','youtube')),
  meeting_url TEXT,
  meeting_room TEXT,
  access_mode TEXT NOT NULL DEFAULT 'logged_in' CHECK (access_mode IN ('public','logged_in','class_based','access_code')),
  access_code TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  recording_url TEXT,
  enable_chat BOOLEAN NOT NULL DEFAULT true,
  enable_attendance BOOLEAN NOT NULL DEFAULT true,
  enable_reminder BOOLEAN NOT NULL DEFAULT true,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
  max_participants INTEGER,
  created_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_classes_scheduled_start ON public.live_classes(scheduled_start);
CREATE INDEX idx_live_classes_status ON public.live_classes(status);
CREATE INDEX idx_live_classes_class_id ON public.live_classes(class_id);

-- 2. live_class_participants
CREATE TABLE public.live_class_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  attendance_marked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcp_live_class ON public.live_class_participants(live_class_id);
CREATE INDEX idx_lcp_student ON public.live_class_participants(student_id);

-- 3. live_class_messages
CREATE TABLE public.live_class_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID,
  sender_name TEXT NOT NULL,
  sender_role TEXT DEFAULT 'student',
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat','question','answer','system')),
  parent_message_id UUID REFERENCES public.live_class_messages(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcm_live_class ON public.live_class_messages(live_class_id);
CREATE INDEX idx_lcm_created ON public.live_class_messages(created_at);

-- 4. live_class_reminders
CREATE TABLE public.live_class_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  reminder_at TIMESTAMP WITH TIME ZONE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','sms','email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  recipients_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcr_reminder_at ON public.live_class_reminders(reminder_at);
CREATE INDEX idx_lcr_status ON public.live_class_reminders(status);

-- Enable RLS
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_reminders ENABLE ROW LEVEL SECURITY;

-- RLS: live_classes
CREATE POLICY "Public can view published live classes"
  ON public.live_classes FOR SELECT
  USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage live classes"
  ON public.live_classes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can manage live classes"
  ON public.live_classes FOR ALL
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- RLS: live_class_participants
CREATE POLICY "Anyone can view participants of published classes"
  ON public.live_class_participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.live_classes lc WHERE lc.id = live_class_id AND lc.is_published = true)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Logged-in users can join live classes"
  ON public.live_class_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR true);

CREATE POLICY "Users can update their own participation"
  ON public.live_class_participants FOR UPDATE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can delete participants"
  ON public.live_class_participants FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- RLS: live_class_messages
CREATE POLICY "Anyone can view messages of published classes"
  ON public.live_class_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.live_classes lc WHERE lc.id = live_class_id AND lc.is_published = true)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Anyone can post messages"
  ON public.live_class_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage messages"
  ON public.live_class_messages FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can delete messages"
  ON public.live_class_messages FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- RLS: live_class_reminders
CREATE POLICY "Admins manage reminders"
  ON public.live_class_reminders FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Triggers
CREATE TRIGGER update_live_classes_updated_at
  BEFORE UPDATE ON public.live_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
ALTER TABLE public.live_class_messages REPLICA IDENTITY FULL;
ALTER TABLE public.live_class_participants REPLICA IDENTITY FULL;
ALTER TABLE public.live_classes REPLICA IDENTITY FULL;
