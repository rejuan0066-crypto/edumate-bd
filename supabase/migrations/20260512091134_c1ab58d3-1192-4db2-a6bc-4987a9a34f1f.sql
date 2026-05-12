-- Audit table
CREATE TABLE IF NOT EXISTS public.student_type_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  old_type text,
  new_type text NOT NULL,
  reason text,
  changed_by uuid,
  changed_by_name text,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_type_audit_student ON public.student_type_audit(student_id, created_at DESC);

ALTER TABLE public.student_type_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read student_type_audit" ON public.student_type_audit;
CREATE POLICY "admins read student_type_audit"
ON public.student_type_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- No direct INSERT policy: only the SECURITY DEFINER RPC writes here.

-- RPC: change student_type with audit
CREATE OR REPLACE FUNCTION public.change_student_type(
  p_student_id uuid,
  p_new_type text,
  p_reason text DEFAULT NULL
)
RETURNS public.student_type_audit
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
  v_actor uuid := auth.uid();
  v_name text;
  v_email text;
  v_row public.student_type_audit;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT (public.has_role(v_actor, 'admin') OR public.has_role(v_actor, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_new_type NOT IN ('new', 'old') THEN
    RAISE EXCEPTION 'invalid type %', p_new_type;
  END IF;

  SELECT student_type INTO v_old FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  IF COALESCE(v_old, 'new') = p_new_type THEN
    RAISE EXCEPTION 'no change';
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = v_actor;

  UPDATE public.students SET student_type = p_new_type WHERE id = p_student_id;

  INSERT INTO public.student_type_audit (
    student_id, old_type, new_type, reason, changed_by, changed_by_name, changed_by_email
  ) VALUES (
    p_student_id, v_old, p_new_type, NULLIF(btrim(p_reason), ''), v_actor, v_name, v_email
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_student_type(uuid, text, text) TO authenticated;

-- RPC: history fetch
CREATE OR REPLACE FUNCTION public.get_student_type_history(p_student_id uuid)
RETURNS SETOF public.student_type_audit
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.student_type_audit
  WHERE student_id = p_student_id
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_type_history(uuid) TO authenticated;