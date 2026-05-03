
-- 1. Restrict otp_verify_attempts SELECT to admins only
DROP POLICY IF EXISTS "Anyone can read verify attempts" ON public.otp_verify_attempts;

-- 2. Restrict salary_settings SELECT to admins / users with salary view permission
DROP POLICY IF EXISTS "Anyone can view salary_settings" ON public.salary_settings;
CREATE POLICY "Authorized users can view salary_settings"
ON public.salary_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/salary'::text, 'view'::text)
);

-- 3. Restrict committee_attachments SELECT to authenticated users with permission
DROP POLICY IF EXISTS "committee_attachments_select_all" ON public.committee_attachments;
CREATE POLICY "committee_attachments_select_authorized"
ON public.committee_attachments
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees'::text, 'view'::text)
  )
);
