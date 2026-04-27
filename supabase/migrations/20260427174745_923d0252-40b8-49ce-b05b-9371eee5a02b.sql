ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS principal_name TEXT,
  ADD COLUMN IF NOT EXISTS accountant_name TEXT,
  ADD COLUMN IF NOT EXISTS verifier_name TEXT;