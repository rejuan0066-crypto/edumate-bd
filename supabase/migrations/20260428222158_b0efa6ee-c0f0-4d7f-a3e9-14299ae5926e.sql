-- 1) Add columns to history tables
ALTER TABLE public.staff_promotions
  ADD COLUMN IF NOT EXISTS letter_file_url TEXT;

ALTER TABLE public.staff_salary_changes
  ADD COLUMN IF NOT EXISTS letter_file_url TEXT;

-- 2) Create public bucket for staff letters
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-letters', 'staff-letters', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage RLS policies
-- Allow public read of letter files
DROP POLICY IF EXISTS "Public read staff letters" ON storage.objects;
CREATE POLICY "Public read staff letters"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'staff-letters');

-- Allow admins to upload
DROP POLICY IF EXISTS "Admins upload staff letters" ON storage.objects;
CREATE POLICY "Admins upload staff letters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'staff-letters'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to update
DROP POLICY IF EXISTS "Admins update staff letters" ON storage.objects;
CREATE POLICY "Admins update staff letters"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'staff-letters'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to delete
DROP POLICY IF EXISTS "Admins delete staff letters" ON storage.objects;
CREATE POLICY "Admins delete staff letters"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'staff-letters'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );