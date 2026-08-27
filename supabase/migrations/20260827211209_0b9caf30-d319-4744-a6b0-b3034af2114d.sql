ALTER TABLE public.duty_shifts
  ADD COLUMN IF NOT EXISTS absent_deduction_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_deduction_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_deduction_amount numeric,
  ADD COLUMN IF NOT EXISTS late_deduction_mode text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS late_deduction_free_minutes integer NOT NULL DEFAULT 5;

ALTER TABLE public.duty_shifts
  DROP CONSTRAINT IF EXISTS duty_shifts_late_deduction_mode_check;

ALTER TABLE public.duty_shifts
  ADD CONSTRAINT duty_shifts_late_deduction_mode_check
  CHECK (late_deduction_mode IN ('flat', 'per_minute'));