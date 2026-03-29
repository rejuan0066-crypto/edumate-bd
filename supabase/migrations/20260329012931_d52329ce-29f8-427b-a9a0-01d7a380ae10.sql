
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS birth_reg_no text,
  ADD COLUMN IF NOT EXISTS religion text DEFAULT 'islam',
  ADD COLUMN IF NOT EXISTS admission_session text,
  ADD COLUMN IF NOT EXISTS registration_no text,
  ADD COLUMN IF NOT EXISTS session_year text,
  ADD COLUMN IF NOT EXISTS previous_class text,
  ADD COLUMN IF NOT EXISTS previous_institute text,
  ADD COLUMN IF NOT EXISTS father_occupation text,
  ADD COLUMN IF NOT EXISTS father_nid text,
  ADD COLUMN IF NOT EXISTS father_phone text,
  ADD COLUMN IF NOT EXISTS mother_occupation text,
  ADD COLUMN IF NOT EXISTS mother_nid text,
  ADD COLUMN IF NOT EXISTS mother_phone text,
  ADD COLUMN IF NOT EXISTS is_orphan boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_poor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admission_data jsonb DEFAULT '{}'::jsonb;
