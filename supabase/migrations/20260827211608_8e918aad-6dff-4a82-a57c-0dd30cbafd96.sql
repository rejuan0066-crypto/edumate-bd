ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS duty_deduction numeric NOT NULL DEFAULT 0;