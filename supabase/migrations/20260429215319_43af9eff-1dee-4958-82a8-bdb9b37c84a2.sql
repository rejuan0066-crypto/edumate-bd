
-- 1) Replace the permissive SELECT policy with admin-or-own-row
DROP POLICY IF EXISTS "Authenticated can view administrative officers" ON public.administrative_officers;

CREATE POLICY "Admins or owner can view administrative officers"
ON public.administrative_officers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

-- 2) Public directory view (non-sensitive fields only)
DROP VIEW IF EXISTS public.administrative_officers_public;

CREATE VIEW public.administrative_officers_public
WITH (security_invoker = off) AS
SELECT
  id,
  officer_id,
  name_bn,
  name_en,
  designation,
  department,
  photo_url,
  phone,
  email,
  status,
  joining_date,
  user_id,
  created_at,
  updated_at,
  deleted_at
FROM public.administrative_officers
WHERE deleted_at IS NULL;

GRANT SELECT ON public.administrative_officers_public TO authenticated, anon;
