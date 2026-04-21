ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS address_en TEXT,
ADD COLUMN IF NOT EXISTS other_info_en TEXT;