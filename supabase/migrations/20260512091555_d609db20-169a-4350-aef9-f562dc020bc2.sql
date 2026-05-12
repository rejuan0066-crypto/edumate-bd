-- Tighten student_type RPCs: require super_admin OR explicit 'approve' permission on /admin/students
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
  v_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT (
    public.has_role(v_actor, 'super_admin')
    OR public.has_menu_permission(v_actor, '/admin/students', 'approve')
  ) THEN
    RAISE EXCEPTION 'forbidden: explicit approve permission required';
  END IF;
  IF p_new_type NOT IN ('new', 'old') THEN
    RAISE EXCEPTION 'invalid type %', p_new_type;
  END IF;

  SELECT student_type, approval_status INTO v_old, v_status FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  IF COALESCE(v_status, 'pending') <> 'approved' THEN
    RAISE EXCEPTION 'student must be approved before changing type';
  END IF;

  IF COALESCE(v_old, 'new') = p_new_type THEN
    RAISE EXCEPTION 'no change';
  END IF;

  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = v_actor;

  UPDATE public.students SET student_type = p_new_type WHERE id = p_student_id;

  INSERT INTO public.student_type_audit (
    student_id, old_type, new_type, reason, changed_by, changed_by_name, changed_by_email
  ) VALUES (
    p_student_id, v_old, p_new_type, btrim(p_reason), v_actor, v_name, v_email
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_type_history(p_student_id uuid)
RETURNS SETOF public.student_type_audit
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.student_type_audit
  WHERE student_id = p_student_id
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_menu_permission(auth.uid(), '/admin/students', 'approve')
      OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
    )
  ORDER BY created_at DESC;
$$;

-- Tighten audit table SELECT: explicit approve/view permission or super_admin
DROP POLICY IF EXISTS "admins read student_type_audit" ON public.student_type_audit;
CREATE POLICY "explicit perm read student_type_audit"
ON public.student_type_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_menu_permission(auth.uid(), '/admin/students', 'approve')
);