ALTER TABLE public.duty_shifts
  ADD COLUMN IF NOT EXISTS attendance_mode text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS machine_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS machine_open_before_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS machine_close_after_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS early_exit_grace_minutes integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.duty_weekly_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.duty_shifts(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, shift_id, weekday)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_weekly_template TO authenticated;
GRANT ALL ON public.duty_weekly_template TO service_role;
ALTER TABLE public.duty_weekly_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage weekly duty template"
ON public.duty_weekly_template FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can view weekly duty template"
ON public.duty_weekly_template FOR SELECT TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.duty_shift_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.duty_shifts(id) ON DELETE CASCADE,
  duty_date date NOT NULL,
  status text NOT NULL DEFAULT 'present',
  check_in_time time,
  check_out_time time,
  late_minutes integer NOT NULL DEFAULT 0,
  early_exit_minutes integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  device_id text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, shift_id, duty_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_shift_attendance_date ON public.duty_shift_attendance(duty_date);
CREATE INDEX IF NOT EXISTS idx_duty_weekly_template_weekday ON public.duty_weekly_template(weekday);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_shift_attendance TO authenticated;
GRANT ALL ON public.duty_shift_attendance TO service_role;
ALTER TABLE public.duty_shift_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage duty shift attendance"
ON public.duty_shift_attendance FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can view duty shift attendance"
ON public.duty_shift_attendance FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER trg_duty_weekly_template_updated_at
BEFORE UPDATE ON public.duty_weekly_template
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_duty_shift_attendance_updated_at
BEFORE UPDATE ON public.duty_shift_attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.duty_shift_attendance;