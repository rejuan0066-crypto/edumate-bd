ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE public.divisions
  ADD COLUMN IF NOT EXISTS name_ar TEXT;