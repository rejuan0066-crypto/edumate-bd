-- 1. Salary generation audit log table
CREATE TABLE IF NOT EXISTS public.salary_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_by_name TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name TEXT,
  month_year TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'generate',  -- generate, auto_generate, recalculate, ungenerate
  source TEXT NOT NULL DEFAULT 'manual',     -- manual, bulk, auto_attendance
  success BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,                               -- failure reason or note
  net_salary NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_gen_log_month ON public.salary_generation_log(month_year);
CREATE INDEX IF NOT EXISTS idx_salary_gen_log_staff ON public.salary_generation_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_gen_log_created ON public.salary_generation_log(created_at DESC);

ALTER TABLE public.salary_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view salary generation log"
ON public.salary_generation_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert salary generation log"
ON public.salary_generation_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Auto-generate trigger: when staff attendance is inserted, ensure a draft salary_records row exists for that month
CREATE OR REPLACE FUNCTION public.auto_create_salary_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_year TEXT;
  v_staff RECORD;
  v_existing UUID;
BEGIN
  -- Only for staff full_day attendance
  IF NEW.entity_type <> 'staff' OR NEW.shift <> 'full_day' THEN
    RETURN NEW;
  END IF;

  v_month_year := to_char(NEW.attendance_date, 'YYYY-MM');

  SELECT id, name_bn, name_en, salary INTO v_staff
  FROM public.staff WHERE id = NEW.entity_id AND status = 'active';

  IF v_staff.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing FROM public.salary_records
  WHERE staff_id = NEW.entity_id AND month_year = v_month_year LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Insert a minimal pending salary record (will be recalculated by user/Generate button)
  INSERT INTO public.salary_records (
    staff_id, month_year, base_salary, net_salary, status, remarks
  ) VALUES (
    v_staff.id, v_month_year, COALESCE(v_staff.salary, 0), COALESCE(v_staff.salary, 0),
    'pending', 'Auto-created from attendance entry. Click Recalculate to apply latest settings.'
  );

  -- Audit
  INSERT INTO public.salary_generation_log (
    generated_by, staff_id, staff_name, month_year, action, source, success, reason, net_salary
  ) VALUES (
    NULL, v_staff.id, COALESCE(v_staff.name_bn, v_staff.name_en),
    v_month_year, 'auto_generate', 'auto_attendance', true,
    'Auto-created when attendance recorded', COALESCE(v_staff.salary, 0)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_salary_on_attendance ON public.attendance_records;
CREATE TRIGGER trg_auto_salary_on_attendance
AFTER INSERT ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_salary_on_attendance();