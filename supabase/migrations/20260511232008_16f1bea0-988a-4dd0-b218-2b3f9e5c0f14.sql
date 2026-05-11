-- 1) Remove public INSERT on otp_codes; service role bypasses RLS, so send-otp/admin-otp-recovery still work.
DROP POLICY IF EXISTS "Anyone can insert otp_codes" ON public.otp_codes;

-- 2) Remove public INSERT on otp_verify_attempts; verify-otp uses service role.
DROP POLICY IF EXISTS "Anyone can insert verify attempts" ON public.otp_verify_attempts;

-- 3) Restrict exam_session_students SELECT.
-- Public can only see rows belonging to a published exam session (needed by /result-find).
-- Authenticated staff/teachers/admins keep full access via existing policies.
DROP POLICY IF EXISTS "Anyone can view exam_session_students" ON public.exam_session_students;

CREATE POLICY "Public can view published exam_session_students"
ON public.exam_session_students
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = exam_session_students.exam_session_id
      AND es.is_published = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);