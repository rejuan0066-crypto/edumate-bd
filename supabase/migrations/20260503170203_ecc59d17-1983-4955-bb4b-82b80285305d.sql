CREATE TABLE IF NOT EXISTS public.staff_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name_bn TEXT,
  name_en TEXT,
  holiday_type TEXT NOT NULL DEFAULT 'public' CHECK (holiday_type IN ('weekly','public')),
  weekday SMALLINT CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6)),
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_holidays_date ON public.staff_holidays(holiday_date) WHERE deleted_at IS NULL;

ALTER TABLE public.staff_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view staff_holidays"
  ON public.staff_holidays FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins insert staff_holidays"
  ON public.staff_holidays FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins update staff_holidays"
  ON public.staff_holidays FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins delete staff_holidays"
  ON public.staff_holidays FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_staff_holidays_updated_at
  BEFORE UPDATE ON public.staff_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();