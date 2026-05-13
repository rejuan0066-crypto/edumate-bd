
CREATE TABLE public.zakat_calculation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_year integer,
  calc_type text NOT NULL CHECK (calc_type IN ('zakat','fitra')),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_name text,
  contact_phone text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_zakat_logs_created ON public.zakat_calculation_logs (created_at DESC);
CREATE INDEX idx_zakat_logs_type ON public.zakat_calculation_logs (calc_type);

ALTER TABLE public.zakat_calculation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert calculation logs"
  ON public.zakat_calculation_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view calc logs"
  ON public.zakat_calculation_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins delete calc logs"
  ON public.zakat_calculation_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
