CREATE OR REPLACE FUNCTION public.get_hostel_attendance_roster(p_person_type text)
RETURNS TABLE (
  id uuid,
  person_type text,
  person_code text,
  name_bn text,
  name_en text,
  session_id uuid,
  class_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'view'::text)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'add'::text)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_person_type = 'student' THEN
    RETURN QUERY
    SELECT
      s.id,
      'student'::text AS person_type,
      s.student_id::text AS person_code,
      s.name_bn::text AS name_bn,
      s.name_en::text AS name_en,
      s.session_id,
      s.class_id
    FROM public.students s
    WHERE s.deleted_at IS NULL
    ORDER BY COALESCE(s.roll_number, s.student_id), s.name_bn;
  ELSIF p_person_type = 'staff' THEN
    RETURN QUERY
    SELECT
      st.id,
      'staff'::text AS person_type,
      st.staff_id::text AS person_code,
      st.name_bn::text AS name_bn,
      st.name_en::text AS name_en,
      NULL::uuid AS session_id,
      NULL::uuid AS class_id
    FROM public.staff st
    WHERE st.deleted_at IS NULL
      AND COALESCE(st.status, 'active') <> 'inactive'
    ORDER BY st.name_bn;
  ELSE
    RAISE EXCEPTION 'Invalid person type';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hostel_attendance_roster(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hostel_attendance_roster(text) TO authenticated;