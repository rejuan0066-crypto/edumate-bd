
DROP POLICY IF EXISTS "Anyone can view students" ON public.students;

DROP VIEW IF EXISTS public.students_public;
CREATE VIEW public.students_public
WITH (security_invoker = on)
AS
SELECT
  id,
  name_bn,
  name_en,
  student_id,
  roll_number,
  registration_no,
  status,
  division_id,
  class_id,
  session_id,
  photo_url
FROM public.students
WHERE COALESCE(status, 'active') = 'active'
  AND deleted_at IS NULL;

GRANT SELECT ON public.students_public TO anon, authenticated;

CREATE POLICY "Public can view minimal student info"
ON public.students
FOR SELECT
TO anon
USING (
  COALESCE(status, 'active') = 'active'
  AND deleted_at IS NULL
);

REVOKE SELECT ON public.students FROM anon;
GRANT SELECT (
  id, name_bn, name_en, student_id, roll_number, registration_no,
  status, division_id, class_id, session_id, photo_url
) ON public.students TO anon;

ALTER VIEW public.administrative_officers_public SET (security_invoker = on);
ALTER VIEW public.staff_directory SET (security_invoker = on);
ALTER VIEW public.committee_staff_ids SET (security_invoker = on);

ALTER FUNCTION public.update_meeting_provider_settings_updated_at() SET search_path = public;
