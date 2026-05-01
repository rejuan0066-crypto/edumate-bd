-- =========================================================
-- 1) Class-wide exam merit list approvals
-- =========================================================
CREATE TABLE IF NOT EXISTS public.merit_list_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  submitted_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_session_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_merit_list_approvals_status ON public.merit_list_approvals(status);

DROP TRIGGER IF EXISTS trg_merit_list_approvals_updated_at ON public.merit_list_approvals;
CREATE TRIGGER trg_merit_list_approvals_updated_at
BEFORE UPDATE ON public.merit_list_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.merit_list_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage merit list approvals" ON public.merit_list_approvals;
CREATE POLICY "Admins manage merit list approvals"
ON public.merit_list_approvals
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- =========================================================
-- 2) Admission test merit approval columns
-- =========================================================
ALTER TABLE public.admission_tests
  ADD COLUMN IF NOT EXISTS merit_approval_status text NOT NULL DEFAULT 'pending'
    CHECK (merit_approval_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS merit_rejection_reason text,
  ADD COLUMN IF NOT EXISTS merit_submitted_by uuid,
  ADD COLUMN IF NOT EXISTS merit_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS merit_decided_by uuid,
  ADD COLUMN IF NOT EXISTS merit_decided_at timestamptz;

-- Rebuild the public view to also require admin approval of the merit list
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
    WHERE t.id = a.test_id
      AND t.is_published = true
      AND t.deleted_at IS NULL
      AND t.merit_approval_status = 'approved'
  );

GRANT SELECT ON public.admission_test_attempts_public TO anon, authenticated;

-- =========================================================
-- 3) RPCs — admin-only approval actions
-- =========================================================

-- 3a) Class merit list: submit / approve / reject
CREATE OR REPLACE FUNCTION public.submit_merit_list_for_approval(
  p_exam_session_id uuid,
  p_class_id uuid
) RETURNS public.merit_list_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.merit_list_approvals;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.merit_list_approvals (exam_session_id, class_id, status, submitted_by, submitted_at)
  VALUES (p_exam_session_id, p_class_id, 'pending', auth.uid(), now())
  ON CONFLICT (exam_session_id, class_id) DO UPDATE
    SET status = 'pending',
        rejection_reason = NULL,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = now(),
        decided_by = NULL,
        decided_at = NULL,
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_merit_list(
  p_exam_session_id uuid,
  p_class_id uuid
) RETURNS public.merit_list_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.merit_list_approvals;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.merit_list_approvals (exam_session_id, class_id, status, decided_by, decided_at)
  VALUES (p_exam_session_id, p_class_id, 'approved', auth.uid(), now())
  ON CONFLICT (exam_session_id, class_id) DO UPDATE
    SET status = 'approved',
        rejection_reason = NULL,
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_merit_list(
  p_exam_session_id uuid,
  p_class_id uuid,
  p_reason text
) RETURNS public.merit_list_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.merit_list_approvals;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = '23502';
  END IF;

  INSERT INTO public.merit_list_approvals (exam_session_id, class_id, status, rejection_reason, decided_by, decided_at)
  VALUES (p_exam_session_id, p_class_id, 'rejected', trim(p_reason), auth.uid(), now())
  ON CONFLICT (exam_session_id, class_id) DO UPDATE
    SET status = 'rejected',
        rejection_reason = EXCLUDED.rejection_reason,
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_merit_list_for_approval(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_merit_list(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_merit_list(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_merit_list_for_approval(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_merit_list(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_merit_list(uuid,uuid,text) TO authenticated;

-- 3b) Admission test merit: submit / approve / reject
CREATE OR REPLACE FUNCTION public.submit_admission_test_merit_for_approval(p_test_id uuid)
RETURNS public.admission_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admission_tests;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.admission_tests
     SET merit_approval_status = 'pending',
         merit_rejection_reason = NULL,
         merit_submitted_by = auth.uid(),
         merit_submitted_at = now(),
         merit_decided_by = NULL,
         merit_decided_at = NULL
   WHERE id = p_test_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_admission_test_merit(p_test_id uuid)
RETURNS public.admission_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admission_tests;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.admission_tests
     SET merit_approval_status = 'approved',
         merit_rejection_reason = NULL,
         merit_decided_by = auth.uid(),
         merit_decided_at = now()
   WHERE id = p_test_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_admission_test_merit(p_test_id uuid, p_reason text)
RETURNS public.admission_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admission_tests;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = '23502';
  END IF;

  UPDATE public.admission_tests
     SET merit_approval_status = 'rejected',
         merit_rejection_reason = trim(p_reason),
         merit_decided_by = auth.uid(),
         merit_decided_at = now()
   WHERE id = p_test_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_admission_test_merit_for_approval(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_admission_test_merit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_admission_test_merit(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_admission_test_merit_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_admission_test_merit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_admission_test_merit(uuid,text) TO authenticated;