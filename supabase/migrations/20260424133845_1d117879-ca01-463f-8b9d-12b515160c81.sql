ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS established_year TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT;