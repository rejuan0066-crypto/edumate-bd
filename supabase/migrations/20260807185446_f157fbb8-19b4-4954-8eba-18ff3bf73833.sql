CREATE TABLE public.staff_machine_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  device_user_id TEXT NOT NULL,
  device_serial TEXT,
  finger_index INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_machine_users_unique_user
  ON public.staff_machine_users (device_user_id, COALESCE(device_serial, ''));
CREATE INDEX idx_staff_machine_users_staff ON public.staff_machine_users (staff_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_machine_users TO authenticated;
GRANT ALL ON public.staff_machine_users TO service_role;

ALTER TABLE public.staff_machine_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff machine users"
ON public.staff_machine_users FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_staff_machine_users_updated_at
BEFORE UPDATE ON public.staff_machine_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.machine_punch_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_serial TEXT,
  device_user_id TEXT NOT NULL,
  punch_at TIMESTAMPTZ NOT NULL,
  punch_date DATE NOT NULL,
  punch_time TIME NOT NULL,
  direction TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.duty_shifts(id) ON DELETE SET NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  result TEXT,
  error TEXT,
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX machine_punch_log_dedupe
  ON public.machine_punch_log (COALESCE(device_serial, ''), device_user_id, punch_at);
CREATE INDEX idx_machine_punch_log_date ON public.machine_punch_log (punch_date DESC);

GRANT SELECT ON public.machine_punch_log TO authenticated;
GRANT ALL ON public.machine_punch_log TO service_role;

ALTER TABLE public.machine_punch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view machine punch log"
ON public.machine_punch_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));