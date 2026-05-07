
CREATE TABLE IF NOT EXISTS public.whatsapp_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  phone_number text,
  success boolean NOT NULL DEFAULT false,
  error_reason text,
  page_url text,
  user_agent text,
  is_pwa boolean DEFAULT false,
  user_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_click_events_created ON public.whatsapp_click_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_click_events_type ON public.whatsapp_click_events(event_type);

ALTER TABLE public.whatsapp_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log WhatsApp click events"
  ON public.whatsapp_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view WhatsApp click events"
  ON public.whatsapp_click_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
