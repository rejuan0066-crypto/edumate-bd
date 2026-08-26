CREATE TABLE IF NOT EXISTS public.published_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  marks numeric,
  grade text,
  gpa numeric,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_id)
);

GRANT SELECT ON public.published_results TO anon;
GRANT SELECT ON public.published_results TO authenticated;
GRANT ALL ON public.published_results TO service_role;

ALTER TABLE public.published_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published results are publicly readable" ON public.published_results;
CREATE POLICY "Published results are publicly readable"
  ON public.published_results FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage published results" ON public.published_results;
CREATE POLICY "Admins manage published results"
  ON public.published_results FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_published_results_exam_student
  ON public.published_results (exam_id, student_id);

DROP TRIGGER IF EXISTS update_published_results_updated_at ON public.published_results;
CREATE TRIGGER update_published_results_updated_at
BEFORE UPDATE ON public.published_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Editing results no longer hides the previously published snapshot
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

-- Approving snapshots the current results as the public version
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

  DELETE FROM public.published_results WHERE exam_id = p_exam_session_id;

  INSERT INTO public.published_results (exam_id, student_id, subject_id, marks, grade, gpa, published_by)
  SELECT r.exam_id, r.student_id, r.subject_id, r.marks, r.grade, r.gpa, auth.uid()
  FROM public.results r
  WHERE r.exam_id = p_exam_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_result_publish_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_result_publish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_result_publish(uuid) TO authenticated;

-- Seed snapshots for sessions already published
INSERT INTO public.published_results (exam_id, student_id, subject_id, marks, grade, gpa)
SELECT r.exam_id, r.student_id, r.subject_id, r.marks, r.grade, r.gpa
FROM public.results r
JOIN public.exam_sessions es ON es.id = r.exam_id AND es.is_published = true
ON CONFLICT (exam_id, student_id, subject_id) DO NOTHING;

-- Public result lookup now reads the approved snapshot
CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(student_id uuid, class_id uuid, merit_rank integer, name_bn text, name_en text, roll_number text, registration_no text, division_id uuid, session_id uuid, photo_url text, marks jsonb)
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
      s.photo_url
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
    SELECT *
    FROM ranked
    WHERE has_any_mark
      AND (failed_count = 0 OR (grace_limit > 0 AND failed_count <= grace_limit))
  ),
  target_rank AS (
    SELECT
      target.student_id,
      (SELECT 1 + COUNT(*)::integer FROM eligible higher WHERE higher.total_marks > target.total_marks) AS merit_rank
    FROM eligible target
    JOIN matched m ON m.student_id = target.student_id
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
    tm.marks
  FROM matched m
  LEFT JOIN target_rank tr ON tr.student_id = m.student_id
  CROSS JOIN target_marks tm;
$function$;