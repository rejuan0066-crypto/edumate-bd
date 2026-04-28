ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_order INTEGER;
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name_bn NULLS LAST) * 10 AS rn
  FROM public.staff
)
UPDATE public.staff s SET salary_order = o.rn FROM ordered o WHERE s.id = o.id AND s.salary_order IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_salary_order ON public.staff(salary_order);