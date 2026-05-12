-- Public RPC: compute next admission roll number safely (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_next_admission_roll(p_class_id uuid, p_session_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sort int;
  v_start int;
  v_max int;
  v_prefix int;
BEGIN
  IF p_class_id IS NULL OR p_session_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(sort_order, 1) INTO v_sort FROM classes WHERE id = p_class_id;
  IF v_sort IS NULL THEN v_sort := 1; END IF;

  v_start := v_sort * 1000 + 1;
  v_prefix := v_sort;

  SELECT COALESCE(MAX( (regexp_replace(roll_number, '\D', '', 'g'))::int ), v_start - 1)
    INTO v_max
  FROM students
  WHERE class_id = p_class_id
    AND session_id = p_session_id
    AND roll_number IS NOT NULL
    AND roll_number ~ '^\d+$'
    AND (roll_number)::int >= v_start
    AND (roll_number)::int < (v_prefix + 1) * 1000;

  RETURN (v_max + 1)::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_admission_roll(uuid, uuid) TO anon, authenticated;

-- Public RPC: check duplicate birth registration (returns minimal info only)
CREATE OR REPLACE FUNCTION public.check_duplicate_birth_reg(p_birth_reg text)
RETURNS TABLE(roll_number text, registration_no text, admission_session text, student_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.roll_number, s.registration_no, s.admission_session, s.student_id
  FROM students s
  WHERE s.birth_reg_no = p_birth_reg
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_duplicate_birth_reg(text) TO anon, authenticated;