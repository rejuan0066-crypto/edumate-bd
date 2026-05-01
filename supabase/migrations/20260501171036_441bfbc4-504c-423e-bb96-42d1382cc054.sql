-- =========================================================
-- 1. Switch sensitive buckets to private
-- =========================================================
UPDATE storage.buckets SET public = false WHERE id IN ('photos','committee-attachments');

-- =========================================================
-- 2. Drop overly-permissive / legacy policies
-- =========================================================
DROP POLICY IF EXISTS "Public can read photos directly" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;
-- "Admins read receipts bucket" and "Auth can read receipts metadata" are kept (they are gated)

DROP POLICY IF EXISTS "committee_attachments_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "committee_attachments_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "committee_attachments_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "committee_attachments_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "Auth can read committee-attachments metadata" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read committee attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read committee attachments" ON storage.objects;

-- =========================================================
-- 3. PHOTOS bucket — admin/staff-perm read + owner-folder fallback
--    Files are organised as `<user_id>/...` for owner access.
-- =========================================================
CREATE POLICY "photos_read_admins_staff_or_owner"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/staff', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/admission', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/administrative', 'view')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "photos_insert_admin_or_owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "photos_update_admin_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

CREATE POLICY "photos_delete_admin_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

-- Anonymous public form uploads (admission / staff application) need INSERT for photos.
-- We allow anon to INSERT only into the special `public-uploads/` prefix; nothing else.
CREATE POLICY "photos_anon_public_form_upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'public-uploads'
);

-- =========================================================
-- 4. COMMITTEE-ATTACHMENTS — admin or /admin/committees permission
-- =========================================================
CREATE POLICY "committee_attachments_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'view')
  )
);

CREATE POLICY "committee_attachments_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'add')
  )
);

CREATE POLICY "committee_attachments_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  )
);

CREATE POLICY "committee_attachments_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'delete')
  )
);

-- =========================================================
-- 5. RECEIPTS — keep admin/perm read, add owner-folder read for paying student/parent
-- =========================================================
DROP POLICY IF EXISTS "receipts_owner_read" ON storage.objects;
CREATE POLICY "receipts_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Tighten upload to admin/permission only (was previously any authenticated user)
CREATE POLICY "receipts_insert_admin_or_perm"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/fees', 'add')
    OR public.has_menu_permission(auth.uid(), '/admin/expenses', 'add')
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'add')
  )
);

CREATE POLICY "receipts_update_admin_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

CREATE POLICY "receipts_delete_admin_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

-- =========================================================
-- 6. STAFF-LETTERS — owner-folder read so the staff can fetch their own letter
-- =========================================================
DROP POLICY IF EXISTS "staff_letters_owner_read" ON storage.objects;
CREATE POLICY "staff_letters_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
