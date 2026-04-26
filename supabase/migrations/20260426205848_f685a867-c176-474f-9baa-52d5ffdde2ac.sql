ALTER TABLE public.salary_records
ADD COLUMN IF NOT EXISTS savings_deduction NUMERIC NOT NULL DEFAULT 0;