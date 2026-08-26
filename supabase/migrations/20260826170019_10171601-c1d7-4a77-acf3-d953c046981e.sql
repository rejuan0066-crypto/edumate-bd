ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS publish_approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS publish_requested_by uuid,
  ADD COLUMN IF NOT EXISTS publish_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_decided_by uuid,
  ADD COLUMN IF NOT EXISTS publish_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_rejection_reason text;

DO $$ BEGIN
  ALTER TABLE public.exam_sessions
    ADD CONSTRAINT exam_sessions_publish_approval_status_chk
    CHECK (publish_approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Already published sessions stay approved
UPDATE public.exam_sessions SET publish_approval_status = 'approved' WHERE is_published IS TRUE;

-- Editing results resets publish approval
CREATE OR REPLACE FUNCTION public.reset_result_publish_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam uuid := COALESCE(NEW.exam_id, OLD.exam_id);
BEGIN
  UPDATE public.exam_sessions
     SET publish_approval_status = 'pending',
         is_published = false,
         publish_requested_by = auth.uid(),
         publish_requested_at = now(),
         publish_decided_by = NULL,
         publish_decided_at = NULL,
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = v_exam
     AND publish_approval_status <> 'pending';
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_result_publish_approval ON public.results;
CREATE TRIGGER trg_reset_result_publish_approval
AFTER INSERT OR UPDATE OR DELETE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.reset_result_publish_approval();

-- Block publishing without approval
CREATE OR REPLACE FUNCTION public.guard_exam_session_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published IS TRUE
     AND COALESCE(OLD.is_published, false) IS DISTINCT FROM true
     AND NEW.publish_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Result publishing requires admin approval';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_exam_session_publish ON public.exam_sessions;
CREATE TRIGGER trg_guard_exam_session_publish
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_exam_session_publish();

CREATE OR REPLACE FUNCTION public.submit_result_publish_for_approval(p_exam_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.exam_sessions
     SET publish_approval_status = 'pending',
         publish_requested_by = auth.uid(),
         publish_requested_at = now(),
         publish_decided_by = NULL,
         publish_decided_at = NULL,
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = p_exam_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_result_publish(p_exam_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can approve result publishing';
  END IF;
  UPDATE public.exam_sessions
     SET publish_approval_status = 'approved',
         publish_decided_by = auth.uid(),
         publish_decided_at = now(),
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = p_exam_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_result_publish(p_exam_session_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can reject result publishing';
  END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;
  UPDATE public.exam_sessions
     SET publish_approval_status = 'rejected',
         is_published = false,
         publish_decided_by = auth.uid(),
         publish_decided_at = now(),
         publish_rejection_reason = btrim(p_reason),
         updated_at = now()
   WHERE id = p_exam_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_result_publish_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_result_publish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_result_publish(uuid, text) TO authenticated;