-- Update the RPC to include class filtering
CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL)
RETURNS TABLE(student_id uuid, class_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ess.student_id, ess.class_id
  FROM exam_session_students ess
  JOIN exam_sessions es ON es.id = ess.exam_session_id AND es.is_published = true
  JOIN students s ON s.id = ess.student_id
  WHERE ess.exam_session_id = p_session_id
    AND (p_class_id IS NULL OR ess.class_id = p_class_id)
    AND (
      s.roll_number = btrim(p_roll)
      OR s.student_id = btrim(p_roll)
      OR s.registration_no = btrim(p_roll)
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated;
