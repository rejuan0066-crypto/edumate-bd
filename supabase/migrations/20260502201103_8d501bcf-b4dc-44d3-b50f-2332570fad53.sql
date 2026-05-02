
-- Add attempt_token for ownership verification
ALTER TABLE public.online_exam_attempts
  ADD COLUMN IF NOT EXISTS attempt_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Allow anon INSERT again so guest exams keep working,
-- but block all direct UPDATEs (they must go through RPCs that verify the token).
CREATE POLICY "Anyone can start exam attempt"
ON public.online_exam_attempts FOR INSERT TO public
WITH CHECK (status = 'in_progress');

CREATE POLICY "Anyone can insert exam answer for in-progress attempt"
ON public.online_exam_answers FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.online_exam_attempts a
    WHERE a.id = attempt_id AND a.status = 'in_progress'
  )
);

-- Token-verified UPDATE for tab_switch_count / status / etc.
CREATE OR REPLACE FUNCTION public.rpc_update_exam_attempt(
  p_attempt_id uuid,
  p_attempt_token uuid,
  p_tab_switch_count int DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_status text;
BEGIN
  SELECT attempt_token, status INTO v_token, v_status
  FROM public.online_exam_attempts WHERE id = p_attempt_id;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_token <> p_attempt_token THEN
    RAISE EXCEPTION 'Invalid attempt token';
  END IF;
  IF v_status NOT IN ('in_progress','submitted') THEN
    RAISE EXCEPTION 'Attempt is closed';
  END IF;

  UPDATE public.online_exam_attempts
  SET
    tab_switch_count = COALESCE(p_tab_switch_count, tab_switch_count),
    status = COALESCE(p_status, status),
    submitted_at = CASE WHEN p_status = 'submitted' THEN now() ELSE submitted_at END
  WHERE id = p_attempt_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_update_exam_attempt(uuid,uuid,int,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_update_exam_attempt(uuid,uuid,int,text) TO anon, authenticated;
