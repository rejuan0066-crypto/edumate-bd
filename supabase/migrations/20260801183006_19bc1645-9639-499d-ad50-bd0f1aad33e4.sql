CREATE TABLE public.duty_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.duty_shifts(id) ON DELETE RESTRICT,
  duty_date date NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, duty_date, shift_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_roster TO authenticated;
GRANT ALL ON public.duty_roster TO service_role;

ALTER TABLE public.duty_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage duty roster"
ON public.duty_roster FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff view own duty roster"
ON public.duty_roster FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_roster.staff_id AND s.user_id = auth.uid()));

CREATE INDEX idx_duty_roster_date ON public.duty_roster(duty_date);
CREATE INDEX idx_duty_roster_staff ON public.duty_roster(staff_id);

CREATE TRIGGER update_duty_roster_updated_at
BEFORE UPDATE ON public.duty_roster
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();