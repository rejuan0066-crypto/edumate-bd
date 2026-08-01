CREATE TABLE public.duty_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_bn text NOT NULL,
  name_en text,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  grace_minutes integer NOT NULL DEFAULT 0,
  pay_amount numeric,
  pay_type text CHECK (pay_type IN ('per_day','per_hour','monthly')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_shifts TO authenticated;
GRANT ALL ON public.duty_shifts TO service_role;

ALTER TABLE public.duty_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duty_shifts_select_auth" ON public.duty_shifts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "duty_shifts_admin_insert" ON public.duty_shifts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "duty_shifts_admin_update" ON public.duty_shifts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "duty_shifts_admin_delete" ON public.duty_shifts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER update_duty_shifts_updated_at
  BEFORE UPDATE ON public.duty_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.duty_shifts (code, name_bn, name_en, start_time, end_time, sort_order)
VALUES
  ('morning','সকাল','Morning','08:00','13:00',1),
  ('evening','সন্ধ্যা','Evening','16:00','21:00',2);