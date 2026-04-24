ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS established_year_en TEXT,
  ADD COLUMN IF NOT EXISTS registration_number_en TEXT;