
-- ============================================================
-- 1) SMTP CONFIG: drop the duplicate "true" SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read smtp_config" ON public.smtp_config;

-- ============================================================
-- 2) PARENT MESSAGES: drop public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Public can view parent messages by account" ON public.parent_messages;

CREATE POLICY "Admin/staff can view parent messages"
ON public.parent_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);

-- Helper RPC for parents to fetch their own messages by account_id (parent session
-- token validation handled in edge functions; this is invoked via service-role from
-- parent-portal endpoints, which already verify ownership)
CREATE OR REPLACE FUNCTION public.get_parent_messages(p_account_id uuid)
RETURNS SETOF public.parent_messages
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.parent_messages WHERE parent_account_id = p_account_id ORDER BY created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_parent_messages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_messages(uuid) TO service_role;

-- ============================================================
-- 3) FEE WAIVERS: drop anon SELECT, add authenticated/role-based SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view fee_waivers" ON public.fee_waivers;

CREATE POLICY "Authorized roles can view fee_waivers"
ON public.fee_waivers FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- ============================================================
-- 4) LIBRARY ISSUANCES: drop anon SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view library_issuances" ON public.library_issuances;

CREATE POLICY "Authorized roles can view library_issuances"
ON public.library_issuances FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- ============================================================
-- 5) JOINING LETTERS: drop anon SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view joining_letters" ON public.joining_letters;

CREATE POLICY "Authorized roles can view joining_letters"
ON public.joining_letters FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);

-- ============================================================
-- 6) EXAM ATTEMPTS / ANSWERS: lock down direct anon access,
--    expose secure RPCs that validate parent/student session
-- ============================================================
-- Drop dangerous open policies
DROP POLICY IF EXISTS "Anyone can insert exam attempt" ON public.online_exam_attempts;
DROP POLICY IF EXISTS "Update only in-progress exam attempts" ON public.online_exam_attempts;
DROP POLICY IF EXISTS "Anyone can insert exam answer" ON public.online_exam_answers;
DROP POLICY IF EXISTS "Update answers only for in-progress attempts" ON public.online_exam_answers;

-- Keep only admin/teacher SELECT/DELETE; all writes go through RPCs
-- (Owner SELECT for parent/student is via RPC as well.)

-- Secure RPC: start an exam attempt
-- Caller must provide their parent_account_id OR student_account_id.
-- The function is invoked via service role from edge function `exam-session`
-- (which validates the parent/student session JWT first).
CREATE OR REPLACE FUNCTION public.rpc_start_exam_attempt(
  p_exam_id uuid,
  p_student_id uuid,
  p_parent_account_id uuid DEFAULT NULL,
  p_student_account_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
  v_owner_ok boolean := false;
BEGIN
  -- Verify the student belongs to this parent or this student account
  IF p_parent_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.parent_accounts
      WHERE id = p_parent_account_id
        AND status = 'approved'
        AND p_student_id = ANY (linked_student_uuids)
    ) INTO v_owner_ok;
  ELSIF p_student_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.student_accounts
      WHERE id = p_student_account_id
        AND status = 'approved'
        AND linked_student_uuid = p_student_id
    ) INTO v_owner_ok;
  END IF;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'Not authorized to start exam for this student';
  END IF;

  INSERT INTO public.online_exam_attempts (exam_id, student_id, status, started_at)
  VALUES (p_exam_id, p_student_id, 'in_progress', now())
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_start_exam_attempt(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_start_exam_attempt(uuid,uuid,uuid,uuid) TO service_role;

-- Secure RPC: submit/update an answer
CREATE OR REPLACE FUNCTION public.rpc_submit_exam_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer jsonb,
  p_parent_account_id uuid DEFAULT NULL,
  p_student_account_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_status text;
  v_owner_ok boolean := false;
BEGIN
  SELECT student_id, status INTO v_student_id, v_status
  FROM public.online_exam_attempts WHERE id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Attempt is no longer in progress';
  END IF;

  IF p_parent_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.parent_accounts
      WHERE id = p_parent_account_id
        AND status = 'approved'
        AND v_student_id = ANY (linked_student_uuids)
    ) INTO v_owner_ok;
  ELSIF p_student_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.student_accounts
      WHERE id = p_student_account_id
        AND status = 'approved'
        AND linked_student_uuid = v_student_id
    ) INTO v_owner_ok;
  END IF;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'Not authorized for this attempt';
  END IF;

  INSERT INTO public.online_exam_answers (attempt_id, question_id, answer)
  VALUES (p_attempt_id, p_question_id, p_answer)
  ON CONFLICT (attempt_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_submit_exam_answer(uuid,uuid,jsonb,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_submit_exam_answer(uuid,uuid,jsonb,uuid,uuid) TO service_role;

-- Secure RPC: finish an attempt
CREATE OR REPLACE FUNCTION public.rpc_finish_exam_attempt(
  p_attempt_id uuid,
  p_parent_account_id uuid DEFAULT NULL,
  p_student_account_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_owner_ok boolean := false;
BEGIN
  SELECT student_id INTO v_student_id
  FROM public.online_exam_attempts WHERE id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF p_parent_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.parent_accounts
      WHERE id = p_parent_account_id
        AND status = 'approved'
        AND v_student_id = ANY (linked_student_uuids)
    ) INTO v_owner_ok;
  ELSIF p_student_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.student_accounts
      WHERE id = p_student_account_id
        AND status = 'approved'
        AND linked_student_uuid = v_student_id
    ) INTO v_owner_ok;
  END IF;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'Not authorized for this attempt';
  END IF;

  UPDATE public.online_exam_attempts
  SET status = 'submitted', submitted_at = now()
  WHERE id = p_attempt_id AND status = 'in_progress';
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_finish_exam_attempt(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_finish_exam_attempt(uuid,uuid,uuid) TO service_role;
