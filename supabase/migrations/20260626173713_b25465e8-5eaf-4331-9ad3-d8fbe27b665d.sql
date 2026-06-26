CREATE TABLE public.hostel_meal_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allocation_id uuid NOT NULL REFERENCES public.hostel_allocations(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  breakfast boolean NOT NULL DEFAULT false,
  lunch boolean NOT NULL DEFAULT false,
  dinner boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (allocation_id, attendance_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_meal_attendance TO authenticated;
GRANT ALL ON public.hostel_meal_attendance TO service_role;

ALTER TABLE public.hostel_meal_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view meal attendance"
  ON public.hostel_meal_attendance FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert meal attendance"
  ON public.hostel_meal_attendance FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update meal attendance"
  ON public.hostel_meal_attendance FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete meal attendance"
  ON public.hostel_meal_attendance FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_hostel_meal_attendance_updated_at
  BEFORE UPDATE ON public.hostel_meal_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();