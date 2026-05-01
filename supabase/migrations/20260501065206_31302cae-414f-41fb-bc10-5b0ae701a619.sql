
-- ============================================================
-- 1) ADMISSION_TEST_ATTEMPTS — protect applicant PII
-- ============================================================
DROP POLICY IF EXISTS "Public can view attempts for merit list of published tests" ON public.admission_test_attempts;

DROP VIEW IF EXISTS public.admission_test_attempts_public CASCADE;
CREATE VIEW public.admission_test_attempts_public
WITH (security_invoker = on) AS
SELECT
  a.id, a.test_id, a.applicant_name, a.score, a.percentage,
  a.passed, a.rank, a.correct_count, a.total_questions, a.status, a.submitted_at
FROM public.admission_test_attempts a
WHERE a.status = 'submitted'
  AND EXISTS (
    SELECT 1 FROM public.admission_tests t
    WHERE t.id = a.test_id AND t.is_published = true AND t.deleted_at IS NULL
  );

GRANT SELECT ON public.admission_test_attempts_public TO anon, authenticated;
REVOKE SELECT ON public.admission_test_attempts FROM anon;

CREATE OR REPLACE FUNCTION public.submit_admission_test_attempt(
  p_test_id uuid,
  p_applicant_name text,
  p_applicant_phone text,
  p_applicant_email text DEFAULT NULL,
  p_applicant_guardian text DEFAULT NULL,
  p_applicant_address text DEFAULT NULL,
  p_applicant_nid_birth text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admission_tests WHERE id = p_test_id AND is_published = true AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'TEST_NOT_OPEN' USING ERRCODE = 'check_violation';
  END IF;
  IF p_applicant_name IS NULL OR length(trim(p_applicant_name)) = 0 THEN
    RAISE EXCEPTION 'NAME_REQUIRED' USING ERRCODE = 'not_null_violation';
  END IF;
  IF p_applicant_phone IS NULL OR length(trim(p_applicant_phone)) = 0 THEN
    RAISE EXCEPTION 'PHONE_REQUIRED' USING ERRCODE = 'not_null_violation';
  END IF;

  INSERT INTO public.admission_test_attempts (
    test_id, applicant_name, applicant_phone, applicant_email,
    applicant_guardian, applicant_address, applicant_nid_birth, status
  ) VALUES (
    p_test_id, trim(p_applicant_name), trim(p_applicant_phone),
    NULLIF(trim(COALESCE(p_applicant_email,'')), ''),
    NULLIF(trim(COALESCE(p_applicant_guardian,'')), ''),
    NULLIF(trim(COALESCE(p_applicant_address,'')), ''),
    NULLIF(trim(COALESCE(p_applicant_nid_birth,'')), ''),
    'in_progress'
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_admission_test_attempt(uuid,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_admission_test_attempt(uuid,text,text,text,text,text,text) TO anon, authenticated;

-- ============================================================
-- 2) SALARY_RECORDS — restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Staff can view own salary" ON public.salary_records;

CREATE POLICY "Staff can view own salary records only"
ON public.salary_records FOR SELECT TO authenticated
USING (staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Salary managers can view all salary records"
ON public.salary_records FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_menu_permission(auth.uid(), '/admin/salary', 'view')
);

-- ============================================================
-- 3) STORAGE BUCKETS — make sensitive ones private
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id IN ('receipts','staff-letters');

DROP POLICY IF EXISTS "Admins read receipts bucket" ON storage.objects;
CREATE POLICY "Admins read receipts bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/fees', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-receipts', 'view')
  )
);

DROP POLICY IF EXISTS "Admins read staff-letters bucket" ON storage.objects;
CREATE POLICY "Admins read staff-letters bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'staff-letters' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/staff', 'view')
  )
);

-- ============================================================
-- 4) ALWAYS-TRUE POLICY CLEANUP
-- ============================================================
-- post_likes: anonymous visitor likes — open delete cannot be tied to auth, restrict to admins
DROP POLICY IF EXISTS "Anyone can delete own likes" ON public.post_likes;
CREATE POLICY "Admins can delete likes"
ON public.post_likes FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- online_exam_attempts: only update while in_progress
DROP POLICY IF EXISTS "Anyone can update exam attempt" ON public.online_exam_attempts;
CREATE POLICY "Update only in-progress exam attempts"
ON public.online_exam_attempts FOR UPDATE
USING (status = 'in_progress')
WITH CHECK (status IN ('in_progress','submitted'));

-- online_exam_answers: only update while parent attempt is in_progress
DROP POLICY IF EXISTS "Anyone can update exam answer" ON public.online_exam_answers;
CREATE POLICY "Update answers only for in-progress attempts"
ON public.online_exam_answers FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.online_exam_attempts a WHERE a.id = online_exam_answers.attempt_id AND a.status = 'in_progress')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.online_exam_attempts a WHERE a.id = online_exam_answers.attempt_id AND a.status = 'in_progress')
);
