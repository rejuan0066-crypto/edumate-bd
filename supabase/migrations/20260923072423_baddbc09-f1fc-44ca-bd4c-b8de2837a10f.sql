CREATE OR REPLACE FUNCTION public.has_any_menu_permission(_user_id uuid, _paths text[], _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM unnest(_paths) AS p(path)
      WHERE public.has_menu_permission(_user_id, p.path, _action)
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.has_any_menu_permission(uuid, text[], text) TO authenticated;

DO $do$
DECLARE
  rec record;
  mapping jsonb := '[
    {"t":"divisions","p":["/admin/divisions","/admin/academic-sessions"]},
    {"t":"classes","p":["/admin/divisions","/admin/classes","/admin/academic-sessions"]},
    {"t":"academic_sessions","p":["/admin/academic-sessions","/admin/divisions"]},
    {"t":"subjects","p":["/admin/subjects"]},
    {"t":"exam_sessions","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_types","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_classes","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_subjects","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_students","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"results","p":["/admin/results"]},
    {"t":"published_results","p":["/admin/results"]},
    {"t":"class_routines","p":["/admin/class-routine","/admin/routine"]},
    {"t":"routine_periods","p":["/admin/class-routine","/admin/routine"]},
    {"t":"notices","p":["/admin/notices"]},
    {"t":"posts","p":["/admin/posts"]},
    {"t":"fee_types","p":["/admin/fees","/admin/fee-types","/admin/students-fees"]},
    {"t":"fee_categories","p":["/admin/fees","/admin/fee-categories","/admin/students-fees"]},
    {"t":"fee_payments","p":["/admin/fees","/admin/students-fees","/admin/fee-receipts"]},
    {"t":"expenses","p":["/admin/expenses"]},
    {"t":"donors","p":["/admin/donors"]},
    {"t":"salary_records","p":["/admin/salary"]},
    {"t":"library_books","p":["/admin/library"]},
    {"t":"library_issuances","p":["/admin/library"]},
    {"t":"library_profiles","p":["/admin/library"]},
    {"t":"student_certificates","p":["/admin/student-certificates","/admin/certificates"]},
    {"t":"joining_letters","p":["/admin/joining-letters"]},
    {"t":"holidays","p":["/admin/holidays","/admin/settings"]},
    {"t":"staff_holidays","p":["/admin/staff-holidays"]},
    {"t":"designations","p":["/admin/designations"]},
    {"t":"committees","p":["/admin/committees"]},
    {"t":"committee_members","p":["/admin/committee-members","/admin/committees"]},
    {"t":"inventory_items","p":["/admin/inventory"]},
    {"t":"hostels","p":["/admin/hostel"]},
    {"t":"hostel_rooms","p":["/admin/hostel"]},
    {"t":"hostel_allocations","p":["/admin/hostel"]},
    {"t":"scholarships","p":["/admin/scholarships"]},
    {"t":"budgets","p":["/admin/budgets"]},
    {"t":"question_papers","p":["/admin/question-papers","/admin/questions"]},
    {"t":"questions","p":["/admin/questions","/admin/question-papers"]},
    {"t":"online_exams","p":["/admin/online-exams"]},
    {"t":"admission_tests","p":["/admin/admission-tests"]},
    {"t":"live_classes","p":["/admin/live-classes"]},
    {"t":"duty_shifts","p":["/admin/duty-roster","/admin/duty-shifts"]},
    {"t":"duty_roster","p":["/admin/duty-roster","/admin/duty-shifts"]}
  ]'::jsonb;
  tbl text;
  paths text;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(mapping) AS m(obj)
  LOOP
    tbl := rec.obj->>'t';
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      CONTINUE;
    END IF;

    SELECT string_agg(quote_literal(x), ',') INTO paths
    FROM jsonb_array_elements_text(rec.obj->'p') AS t(x);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can view ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''view''))',
      'Permitted users can view ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can add ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''add''))',
      'Permitted users can add ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can edit ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''edit'')) WITH CHECK (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''edit''))',
      'Permitted users can edit ' || tbl, tbl, paths, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can remove ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''delete''))',
      'Permitted users can remove ' || tbl, tbl, paths);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
  END LOOP;
END
$do$;