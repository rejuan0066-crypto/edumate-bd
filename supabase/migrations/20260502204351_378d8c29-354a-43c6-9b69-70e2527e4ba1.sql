
-- 1. NOTIFICATIONS
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

DROP POLICY IF EXISTS "Staff can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view their notifications" ON public.notifications;

CREATE POLICY "Users view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR recipient_user_id IS NULL
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2. ONLINE_EXAM_ATTEMPTS
DROP POLICY IF EXISTS "Owner or admin can view exam attempts" ON public.online_exam_attempts;

CREATE POLICY "Owner or admin can view exam attempts"
ON public.online_exam_attempts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.online_exams e
    WHERE e.id = online_exam_attempts.exam_id
      AND e.created_by = auth.uid()
      AND has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- 3. RESIGN_LETTERS
DROP POLICY IF EXISTS "Authenticated users can view resign letters" ON public.resign_letters;

CREATE POLICY "Admins and owners view resign letters"
ON public.resign_letters
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
);

-- 4. COMMITTEE_MEMBERS
DROP POLICY IF EXISTS "Authenticated users can view committee members" ON public.committee_members;

CREATE POLICY "Admins view full committee members"
ON public.committee_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE OR REPLACE VIEW public.committee_members_public
WITH (security_invoker = on) AS
SELECT
  id, committee_id, staff_id, name, name_en,
  designation, designation_en, occupation, occupation_en,
  photo_url, joining_date, is_active, sort_order, allow_overlap,
  deleted_at, created_at, updated_at
FROM public.committee_members
WHERE deleted_at IS NULL;

GRANT SELECT ON public.committee_members_public TO anon, authenticated;

-- 5. ADMISSION_TEST_QUESTIONS (no question_type column)
DROP POLICY IF EXISTS "Public can view questions for published tests" ON public.admission_test_questions;

CREATE OR REPLACE VIEW public.admission_test_questions_public
WITH (security_invoker = off) AS
SELECT
  q.id, q.test_id, q.question_text, q.question_text_bn,
  q.options, q.marks, q.sort_order
FROM public.admission_test_questions q
JOIN public.admission_tests t ON t.id = q.test_id
WHERE t.is_published = true AND t.deleted_at IS NULL;

GRANT SELECT ON public.admission_test_questions_public TO anon, authenticated;

-- 6. ONLINE_EXAM_QUESTIONS
DROP POLICY IF EXISTS "Public can view questions of published exams" ON public.online_exam_questions;

CREATE OR REPLACE VIEW public.online_exam_questions_public
WITH (security_invoker = off) AS
SELECT
  q.id, q.exam_id, q.question_text, q.question_text_bn,
  q.question_type, q.options, q.marks, q.sort_order
FROM public.online_exam_questions q
JOIN public.online_exams e ON e.id = q.exam_id
WHERE e.status = 'published' AND e.deleted_at IS NULL;

GRANT SELECT ON public.online_exam_questions_public TO anon, authenticated;

-- 7. REALTIME
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='messages' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='realtime')) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Authenticated can subscribe to realtime" ON realtime.messages FOR SELECT TO authenticated USING (true)$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can broadcast to realtime" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Authenticated can broadcast to realtime" ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true)$p$;
  END IF;
END$$;
