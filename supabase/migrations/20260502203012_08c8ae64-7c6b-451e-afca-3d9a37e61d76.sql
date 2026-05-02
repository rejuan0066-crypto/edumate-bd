-- 1) app_settings: hide secret-bearing rows from public reads
DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;

CREATE POLICY "app_settings public read non-secret"
ON public.app_settings
FOR SELECT
TO public
USING (
  key NOT ILIKE '%_secret'
  AND key NOT ILIKE 'secret_%'
  AND key NOT ILIKE '%_token'
  AND key NOT ILIKE '%password%'
  AND key NOT ILIKE '%api_key%'
);

CREATE POLICY "app_settings admin read all"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2) notices: only published + not deleted are public
DROP POLICY IF EXISTS "Anyone can view published notices" ON public.notices;

CREATE POLICY "Anyone can view published notices"
ON public.notices
FOR SELECT
TO public
USING (
  COALESCE(is_published, false) = true
  AND deleted_at IS NULL
);

CREATE POLICY "Staff can view all notices"
ON public.notices
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- 3) results: remove blanket public read; restrict to staff/teacher/admin
DROP POLICY IF EXISTS "Anyone can view results" ON public.results;

CREATE POLICY "Staff can view results"
ON public.results
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- 4) Realtime: remove sensitive tables from broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.parent_payment_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.receipt_status_audit;