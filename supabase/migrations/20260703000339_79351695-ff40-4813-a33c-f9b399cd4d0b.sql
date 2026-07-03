ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS calc_basis TEXT,
  ADD COLUMN IF NOT EXISTS earned_from_attendance NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_for_net NUMERIC,
  ADD COLUMN IF NOT EXISTS deductions_deferred BOOLEAN DEFAULT false;