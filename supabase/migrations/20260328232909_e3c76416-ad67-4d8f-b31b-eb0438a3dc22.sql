
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  message text,
  message_bn text,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
