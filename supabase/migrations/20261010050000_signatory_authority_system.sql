-- ==============================================================================
-- Signatory Authority System Migration
-- Adds authority_role to designations, creates institution_signatories table,
-- and seeds core institution signatory roles with RLS
-- ==============================================================================

-- 1. Add authority_role to designations table
ALTER TABLE public.designations
  ADD COLUMN IF NOT EXISTS authority_role TEXT;

-- 2. Create institution_signatories table
CREATE TABLE IF NOT EXISTS public.institution_signatories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  role_name_bn TEXT NOT NULL,
  role_name_en TEXT NOT NULL,
  person_id UUID,
  person_source TEXT,
  person_name_bn TEXT,
  person_name_en TEXT,
  person_designation_bn TEXT,
  person_designation_en TEXT,
  person_phone TEXT,
  person_email TEXT,
  person_photo_url TEXT,
  signature_url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.institution_signatories ENABLE ROW LEVEL SECURITY;

-- Select policy (public so public reports and visitors can see official signatory names)
DROP POLICY IF EXISTS "Anyone can view institution_signatories" ON public.institution_signatories;
CREATE POLICY "Anyone can view institution_signatories"
  ON public.institution_signatories FOR SELECT
  TO public
  USING (true);

-- Manage policy (authenticated users / admins)
DROP POLICY IF EXISTS "Admins can manage institution_signatories" ON public.institution_signatories;
CREATE POLICY "Admins can manage institution_signatories"
  ON public.institution_signatories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Seed default 4 institutional signatory roles
INSERT INTO public.institution_signatories (role_key, role_name_bn, role_name_en)
VALUES
  ('head_of_institute', 'প্রতিষ্ঠান প্রধান (মুহতামিম / অধ্যক্ষ / সুপার)', 'Head of Institute / Principal'),
  ('accountant_cashier', 'প্রধান হিসাবরক্ষক / ক্যাশিয়ার / কোষাধ্যক্ষ', 'Chief Accountant / Cashier'),
  ('verifier_auditor', 'হিসাব নিরীক্ষক / অভ্যন্তরীণ যাচাইকারী', 'Internal Auditor / Verifier'),
  ('exam_controller', 'পরীক্ষা নিয়ন্ত্রক / শিক্ষা সচিব', 'Controller of Examinations')
ON CONFLICT (role_key) DO NOTHING;

-- 4. Initial auto-seed from institutions and administrative_officers
UPDATE public.institution_signatories
SET person_name_bn = COALESCE(
      (SELECT name_bn FROM public.administrative_officers WHERE deleted_at IS NULL AND status = 'active' AND (designation ILIKE '%principal%' OR designation LIKE '%মুহতামিম%' OR designation LIKE '%অধ্যক্ষ%') LIMIT 1),
      (SELECT principal_name FROM public.institutions WHERE is_default = true LIMIT 1)
    )
WHERE role_key = 'head_of_institute' AND (person_name_bn IS NULL OR person_name_bn = '');

UPDATE public.institution_signatories
SET person_name_bn = COALESCE(
      (SELECT name_bn FROM public.staff WHERE deleted_at IS NULL AND status = 'active' AND (designation LIKE '%হিসাব%' OR designation LIKE '%ক্যাশিয়ার%') LIMIT 1),
      (SELECT accountant_name FROM public.institutions WHERE is_default = true LIMIT 1)
    )
WHERE role_key = 'accountant_cashier' AND (person_name_bn IS NULL OR person_name_bn = '');

UPDATE public.institution_signatories
SET person_name_bn = (SELECT verifier_name FROM public.institutions WHERE is_default = true LIMIT 1)
WHERE role_key = 'verifier_auditor' AND (person_name_bn IS NULL OR person_name_bn = '');

-- 5. Mark known designations with authority_role
UPDATE public.designations
SET authority_role = 'head_of_institute'
WHERE (name_bn LIKE '%মুহতামিম%' OR name_bn LIKE '%অধ্যক্ষ%' OR name_bn LIKE '%প্রিন্সিপাল%' OR name_bn LIKE '%সুপার%' OR name ILIKE '%principal%')
  AND (authority_role IS NULL OR authority_role = '');

UPDATE public.designations
SET authority_role = 'accountant_cashier'
WHERE (name_bn LIKE '%হিসাবরক্ষক%' OR name_bn LIKE '%ক্যাশিয়ার%' OR name_bn LIKE '%কোষাধ্যক্ষ%' OR name ILIKE '%accountant%' OR name ILIKE '%cashier%')
  AND (authority_role IS NULL OR authority_role = '');

UPDATE public.designations
SET authority_role = 'verifier_auditor'
WHERE (name_bn LIKE '%যাচাইকারী%' OR name_bn LIKE '%নিরীক্ষক%' OR name ILIKE '%auditor%' OR name ILIKE '%verifier%')
  AND (authority_role IS NULL OR authority_role = '');

UPDATE public.designations
SET authority_role = 'exam_controller'
WHERE (name_bn LIKE '%পরীক্ষা নিয়ন্ত্রক%' OR name_bn LIKE '%শিক্ষা সচিব%' OR name ILIKE '%controller%')
  AND (authority_role IS NULL OR authority_role = '');
