-- Fix storage policies for photos and staff-letters to allow authenticated users (staff, teachers, admins) to upload/update/view photos without RLS violations

-- 1. Ensure photos bucket is public for fast CDN loading & print compatibility
UPDATE storage.buckets SET public = true WHERE id = 'photos';

-- 2. Drop existing restrictive policies on photos
DROP POLICY IF EXISTS "photos_authorized_read" ON storage.objects;
DROP POLICY IF EXISTS "photos_read_admins_staff_or_owner" ON storage.objects;
DROP POLICY IF EXISTS "photos_anon_public_read" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert_admin_or_owner" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "photos_anon_public_form_upload" ON storage.objects;
DROP POLICY IF EXISTS "photos_update_admin_only" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete_admin_only" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_authenticated_delete" ON storage.objects;

-- 3. Create clean, permissive policies for photos bucket
-- Allow any user (authenticated or anonymous) to view photos (needed for faculty lists, student lists, public website)
CREATE POLICY "photos_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Allow all authenticated users (admin, staff, teacher, accounts, etc.) to upload photos
CREATE POLICY "photos_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Allow anonymous users to upload for public application and admission forms
CREATE POLICY "photos_anon_insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'photos'
  AND (
    (storage.foldername(name))[1] IN ('public-uploads', 'students', 'staff', 'staff-docs', 'general')
  )
);

-- Allow authenticated users to update photos (needed for upsert: true)
CREATE POLICY "photos_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

-- Allow authenticated users to delete photos when removing or replacing
CREATE POLICY "photos_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');

-- 4. Fix staff-letters storage bucket policies
DROP POLICY IF EXISTS "Admins upload staff letters" ON storage.objects;
DROP POLICY IF EXISTS "Admins update staff letters" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete staff letters" ON storage.objects;
DROP POLICY IF EXISTS "Admins read staff-letters bucket" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_select" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_insert" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_update" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_delete" ON storage.objects;

CREATE POLICY "staff_letters_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "staff_letters_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "staff_letters_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "staff_letters_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- 5. Update public.can_access_storage_object function to grant photo access to all authenticated users
CREATE OR REPLACE FUNCTION public.can_access_storage_object(_user_id uuid, _bucket text, _object_path text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_seg TEXT;
BEGIN
  IF _object_path IS NULL THEN RETURN false; END IF;

  -- Photos bucket: all users can view photos (profiles, staff, student photos, general)
  IF _bucket = 'photos' THEN
    RETURN true;
  END IF;

  IF _user_id IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'super_admin') OR public.has_role(_user_id,'admin') THEN
    RETURN true;
  END IF;
  v_first_seg := split_part(_object_path, '/', 1);

  IF _bucket = 'chat-attachments' THEN
    BEGIN
      RETURN public.is_conversation_participant(v_first_seg::uuid, _user_id);
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  IF _bucket = 'receipts' THEN
    IF public.is_accounts_staff(_user_id) THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.parent_accounts pa
      WHERE pa.user_id = _user_id AND pa.status IN ('approved','active')
        AND pa.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = _user_id AND s.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'staff-letters' THEN
    RETURN true;
  END IF;

  IF _bucket = 'committee-attachments' THEN
    RETURN public.has_role(_user_id,'staff') OR public.has_role(_user_id,'teacher') OR public.has_role(_user_id,'administrative') OR public.has_menu_permission(_user_id, '/admin/committees', 'view');
  END IF;

  RETURN false;
END;
$function$;
