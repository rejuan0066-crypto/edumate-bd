DROP FUNCTION IF EXISTS public.public_find_exam_student(uuid, text);
DROP FUNCTION IF EXISTS public.public_find_exam_student(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(
   student_id uuid,
   class_id uuid,
   merit_rank integer,
   name_bn text,
   name_en text,
   roll_number text,
   registration_no text,
   division_id uuid,
   session_id uuid,
   photo_url text,
   father_name text,
   date_of_birth date,
   marks jsonb
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH matched AS (
    SELECT
      s.id AS student_id,
      ess.class_id,
      s.name_bn,
      s.name_en,
      s.roll_number,
      s.registration_no,
      s.division_id,
      s.session_id,
      s.photo_url,
      s.father_name,
      s.date_of_birth
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s
      ON s.id = ess.student_id
     AND COALESCE(s.status, 'active') = 'active'
     AND s.deleted_at IS NULL
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
    ORDER BY vr.sort_order
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
      COALESCE(SUM(r.marks) FILTER (WHERE r.id IS NOT NULL), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(r.id) FILTER (
        WHERE r.marks < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.published_results r
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
    SELECT
      r.*,
      CASE WHEN r.failed_count = 0 THEN 0 ELSE 1 END AS merit_tier
    FROM ranked r
    WHERE r.has_any_mark
      AND (r.failed_count = 0 OR (r.grace_limit > 0 AND r.failed_count <= r.grace_limit))
  ),
  target_rank AS (
    SELECT
      target.student_id,
      (
        1 + COUNT(*) FILTER (
          WHERE higher.merit_tier < target.merit_tier
             OR (higher.merit_tier = target.merit_tier AND higher.total_marks > target.total_marks)
        )
      )::integer AS merit_rank
    FROM eligible target
    JOIN matched m ON m.student_id = target.student_id
    CROSS JOIN eligible higher
    GROUP BY target.student_id, target.merit_tier, target.total_marks
  ),
  target_marks AS (
    SELECT COALESCE(jsonb_object_agg(r.subject_id::text, r.marks), '{}'::jsonb) AS marks
    FROM matched m
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = m.student_id
  )
  SELECT
    m.student_id,
    m.class_id,
    tr.merit_rank,
    m.name_bn,
    m.name_en,
    m.roll_number,
    m.registration_no,
    m.division_id,
    m.session_id,
    m.photo_url,
    m.father_name,
    m.date_of_birth,
    tm.marks
  FROM matched m
  LEFT JOIN target_rank tr ON tr.student_id = m.student_id
  CROSS JOIN target_marks tm;
$function$;

REVOKE ALL ON FUNCTION public.public_find_exam_student(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated;
