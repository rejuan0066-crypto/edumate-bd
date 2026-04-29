-- App-level key/value settings (single source of truth for global preferences like timezone)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public read (these are non-sensitive global preferences)
DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;
CREATE POLICY "app_settings public read"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only admin / super_admin can write
DROP POLICY IF EXISTS "app_settings admin insert" ON public.app_settings;
CREATE POLICY "app_settings admin insert"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app_settings admin update" ON public.app_settings;
CREATE POLICY "app_settings admin update"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app_settings admin delete" ON public.app_settings;
CREATE POLICY "app_settings admin delete"
  ON public.app_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the global timezone (default: Asia/Dhaka)
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'app_timezone',
  '{"timezone":"Asia/Dhaka"}'::jsonb,
  'Global IANA timezone applied to all date/time displays across the app'
)
ON CONFLICT (key) DO NOTHING;

-- Realtime so admin updates propagate live
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;