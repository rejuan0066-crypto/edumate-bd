DROP FUNCTION IF EXISTS public.public_find_exam_student(uuid, text, uuid);

CREATE FUNCTION public.public_find_exam_student(
  p_session_id uuid,
  p_roll text,
  p_class_id uuid DEFAULT NULL
)
RETURNS TABLE(student_id uuid, class_id uuid, merit_rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH matched AS (
    SELECT ess.student_id, ess.class_id
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s ON s.id = ess.student_id
    WHERE ess.exam_session_id = p_session_id
      AND (p_class_id IS NULL OR ess.class_id = p_class_id)
      AND (
        s.roll_number = btrim(p_roll)
        OR s.student_id = btrim(p_roll)
        OR s.registration_no = btrim(p_roll)
      )
    LIMIT 1
  ),
  pass_config AS (
    SELECT COALESCE((vr.config ->> 'min')::numeric, 33) AS pass_mark
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'pass_mark'
      AND vr.is_active = true
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  grace_config AS (
    SELECT
      vr.is_active AND COALESCE((vr.config ->> 'enabled')::boolean, true) AS enabled,
      COALESCE(vr.config ->> 'apply_to', 'all') AS apply_to,
      COALESCE((vr.config ->> 'max_subjects')::integer, 1) AS max_subjects,
      COALESCE(vr.config -> 'class_rules', '{}'::jsonb) AS class_rules
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'grace_pass'
    LIMIT 1
  ),
  relevant_subjects AS (
    SELECT DISTINCT essu.subject_id
    FROM matched m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.exam_session_subjects essu ON essu.exam_session_id = p_session_id
    JOIN public.subjects sub ON sub.id = essu.subject_id
    WHERE sub.division_id = c.division_id OR sub.class_id = m.class_id
  ),
  class_stats AS (
    SELECT
      enrolled.student_id,
      COALESCE(SUM(COALESCE(r.marks, 0)), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(rs.subject_id) FILTER (
        WHERE COALESCE(r.marks, 0) < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.results r
      ON r.exam_id = p_session_id
     AND r.student_id = enrolled.student_id
     AND r.subject_id = rs.subject_id
    GROUP BY enrolled.student_id
  ),
  ranked AS (
    SELECT
      cs.*,
      CASE
        WHEN COALESCE((SELECT enabled FROM grace_config), false) = false THEN 0
        WHEN (SELECT class_rules FROM grace_config) ? (SELECT class_id::text FROM matched)
          THEN COALESCE(((SELECT class_rules FROM grace_config) ->> (SELECT class_id::text FROM matched))::integer, 0)
        WHEN COALESCE((SELECT apply_to FROM grace_config), 'all') = 'selected' THEN 0
        ELSE COALESCE((SELECT max_subjects FROM grace_config), 0)
      END AS grace_limit
    FROM class_stats cs
  ),
  eligible AS (
    SELECT *
    FROM ranked
    WHERE has_any_mark
      AND (failed_count = 0 OR (grace_limit > 0 AND failed_count <= grace_limit))
  )
  SELECT
    m.student_id,
    m.class_id,
    CASE
      WHEN target.student_id IS NULL THEN NULL
      ELSE (
        SELECT 1 + COUNT(*)::integer
        FROM eligible higher
        WHERE higher.total_marks > target.total_marks
      )
    END AS merit_rank
  FROM matched m
  LEFT JOIN eligible target ON target.student_id = m.student_id;
$function$;

REVOKE ALL ON FUNCTION public.public_find_exam_student(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated, service_role;