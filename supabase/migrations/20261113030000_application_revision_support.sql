-- Migration: Application Revision and Rejection Support for Staff and Students
-- Date: 2026-11-13

-- 1. Add revision & rejection metadata to public.students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS correction_notes text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS correction_fields jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;

-- 2. Add revision & rejection metadata to public.staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS correction_notes text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS correction_fields jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;

-- 3. Allow public applicants to resubmit/update their admission if it needs revision
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'Public can resubmit admission'
  ) THEN
    CREATE POLICY "Public can resubmit admission"
    ON public.students
    FOR UPDATE
    TO public
    USING (approval_status IN ('needs_revision', 'pending'))
    WITH CHECK (approval_status = 'pending');
  END IF;
END $$;

-- 4. Allow public applicants to resubmit/update their staff application if it needs revision
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff' AND policyname = 'Public can resubmit staff application'
  ) THEN
    CREATE POLICY "Public can resubmit staff application"
    ON public.staff
    FOR UPDATE
    TO public
    USING (status IN ('needs_revision', 'pending'))
    WITH CHECK (status = 'pending');
  END IF;
END $$;
