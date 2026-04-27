CREATE TABLE IF NOT EXISTS public.otp_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  expiry_minutes INTEGER NOT NULL DEFAULT 10,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  hourly_limit INTEGER NOT NULL DEFAULT 5,
  daily_limit INTEGER NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT otp_config_singleton CHECK (id = 1)
);

INSERT INTO public.otp_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.otp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read otp config"
  ON public.otp_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update otp config"
  ON public.otp_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert otp config"
  ON public.otp_config FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_otp_config_updated_at
  BEFORE UPDATE ON public.otp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();