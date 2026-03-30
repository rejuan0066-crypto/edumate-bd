
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS religion text DEFAULT 'islam',
ADD COLUMN IF NOT EXISTS nid text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS residence_type text DEFAULT 'non_residential',
ADD COLUMN IF NOT EXISTS experience text,
ADD COLUMN IF NOT EXISTS previous_institute text,
ADD COLUMN IF NOT EXISTS staff_data jsonb DEFAULT '{}'::jsonb;
