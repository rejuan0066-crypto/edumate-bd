-- ==============================================================================
-- Migration: Department Shift Schedules & Staff Special Shifts (Date-Ranged)
-- Description:
--   1. department_shift_schedules: Date-ranged shifts per department category
--   2. staff_special_shifts: Date-ranged custom duty hours for selected staff
-- ==============================================================================

-- 1. Table: department_shift_schedules
CREATE TABLE IF NOT EXISTS public.department_shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text NOT NULL,
  start_time text NOT NULL DEFAULT '08:00',
  end_time text NOT NULL DEFAULT '17:00',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dept_shift_lookup 
  ON public.department_shift_schedules (category_key, effective_from, effective_to);

-- 2. Table: staff_special_shifts
CREATE TABLE IF NOT EXISTS public.staff_special_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  category_key text,
  duty_start_time text NOT NULL,
  duty_end_time text NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_special_shift_lookup 
  ON public.staff_special_shifts (staff_id, effective_from, effective_to);

-- 3. Enable RLS
ALTER TABLE public.department_shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_special_shifts ENABLE ROW LEVEL SECURITY;

-- 4. Policies for department_shift_schedules
DROP POLICY IF EXISTS "department_shift_schedules_select" ON public.department_shift_schedules;
CREATE POLICY "department_shift_schedules_select" ON public.department_shift_schedules
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "department_shift_schedules_all" ON public.department_shift_schedules;
CREATE POLICY "department_shift_schedules_all" ON public.department_shift_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Policies for staff_special_shifts
DROP POLICY IF EXISTS "staff_special_shifts_select" ON public.staff_special_shifts;
CREATE POLICY "staff_special_shifts_select" ON public.staff_special_shifts
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "staff_special_shifts_all" ON public.staff_special_shifts;
CREATE POLICY "staff_special_shifts_all" ON public.staff_special_shifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Grants
GRANT ALL ON public.department_shift_schedules TO authenticated, service_role;
GRANT SELECT ON public.department_shift_schedules TO anon;
GRANT ALL ON public.staff_special_shifts TO authenticated, service_role;
GRANT SELECT ON public.staff_special_shifts TO anon;
