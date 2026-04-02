
CREATE TABLE public.smtp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_username TEXT NOT NULL DEFAULT '',
  smtp_password TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  use_tls BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read smtp_config"
  ON public.smtp_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert smtp_config"
  ON public.smtp_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update smtp_config"
  ON public.smtp_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
