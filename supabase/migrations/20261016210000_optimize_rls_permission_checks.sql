-- Optimize RLS Permission Checks and Prevent SubPlan Explosion for Non-Admin Users
-- This migration replaces row-by-row PL/pgSQL evaluation with a single-query SQL function
-- and wraps RLS policies in scalar subqueries `(SELECT ...)` to force PostgreSQL to plan
-- them as one-time InitPlans instead of per-row SubPlans.

-- 1. Create high-performance index on permission tables if not already present
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles (user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup ON public.user_permissions (user_id, menu_path);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON public.role_permissions (role, menu_path);

-- 2. Fast SQL-based has_any_menu_permission
CREATE OR REPLACE FUNCTION public.has_any_menu_permission(
  _user_id uuid,
  _paths text[],
  _action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    -- Admin or Super Admin bypass (single index lookup)
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id 
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
    ) THEN true
    -- When user has user_permissions override
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions WHERE user_id = _user_id
    ) THEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user_id
        AND up.menu_path = ANY(_paths)
        AND (
          CASE _action
            WHEN 'view'    THEN up.can_view
            WHEN 'add'     THEN up.can_add
            WHEN 'edit'    THEN up.can_edit
            WHEN 'delete'  THEN up.can_delete
            WHEN 'approve' THEN up.can_approve
            ELSE false
          END
        )
    )
    -- Fallback to role_permissions
    ELSE EXISTS (
      SELECT 1 FROM public.role_permissions rp
      JOIN public.user_roles ur ON ur.role::text = rp.role
      WHERE ur.user_id = _user_id
        AND rp.menu_path = ANY(_paths)
        AND (
          CASE _action
            WHEN 'view'    THEN rp.can_view
            WHEN 'add'     THEN rp.can_add
            WHEN 'edit'    THEN rp.can_edit
            WHEN 'delete'  THEN rp.can_delete
            WHEN 'approve' THEN rp.can_approve
            ELSE false
          END
        )
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_any_menu_permission(uuid, text[], text) TO authenticated;

-- 3. Fast SQL-based has_menu_permission delegating directly to has_any_menu_permission
CREATE OR REPLACE FUNCTION public.has_menu_permission(
  _user_id uuid,
  _menu_path text,
  _action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_menu_permission(_user_id, ARRAY[_menu_path], _action);
$$;

GRANT EXECUTE ON FUNCTION public.has_menu_permission(uuid, text, text) TO authenticated;

-- 4. Re-apply table policies using (SELECT public.has_any_menu_permission(...)) for InitPlan caching
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
    {"t":"fee_payments","p":["/admin/fees","/admin/students-fees","/admin/fee-receipts","/admin/fee-collection"]},
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
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''view'')))',
      'Permitted users can view ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can add ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''add'')))',
      'Permitted users can add ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can edit ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''edit''))) WITH CHECK ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''edit'')))',
      'Permitted users can edit ' || tbl, tbl, paths, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can remove ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''delete'')))',
      'Permitted users can remove ' || tbl, tbl, paths);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
  END LOOP;
END
$do$;

-- 5. STUDENTS table policies optimized with InitPlan scalar subqueries
DROP POLICY IF EXISTS "Permitted attendance users can view students" ON public.students;
CREATE POLICY "Permitted attendance users can view students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/students', '/admin/attendance', '/admin/student-attendance']::text[], 'view'))
  );

DROP POLICY IF EXISTS "Staff can add students with permission" ON public.students;
CREATE POLICY "Staff can add students with permission"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'add'))
  );

DROP POLICY IF EXISTS "Staff can edit students with permission" ON public.students;
CREATE POLICY "Staff can edit students with permission"
  ON public.students FOR UPDATE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'edit')))
  WITH CHECK ((SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'edit')));

DROP POLICY IF EXISTS "Staff can delete students with permission" ON public.students;
CREATE POLICY "Staff can delete students with permission"
  ON public.students FOR DELETE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'delete')));

-- 6. ATTENDANCE_RECORDS table policies optimized with InitPlan scalar subqueries
DROP POLICY IF EXISTS "Permitted users add attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users add attendance_records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'add'))
  OR (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'edit'))
);

DROP POLICY IF EXISTS "Permitted users edit attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users edit attendance_records" ON public.attendance_records FOR UPDATE TO authenticated USING (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'edit'))
) WITH CHECK (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'edit'))
);

DROP POLICY IF EXISTS "Permitted users delete attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users delete attendance_records" ON public.attendance_records FOR DELETE TO authenticated USING (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'delete'))
);

-- 7. STAFF table policies optimized with InitPlan scalar subqueries
DROP POLICY IF EXISTS "Staff can add staff with permission" ON public.staff;
CREATE POLICY "Staff can add staff with permission"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'add'))
  );

DROP POLICY IF EXISTS "Staff can edit staff with permission" ON public.staff;
CREATE POLICY "Staff can edit staff with permission"
  ON public.staff FOR UPDATE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'edit')))
  WITH CHECK ((SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'edit')));

DROP POLICY IF EXISTS "Staff can delete staff with permission" ON public.staff;
CREATE POLICY "Staff can delete staff with permission"
  ON public.staff FOR DELETE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'delete')));

-- 8. RECEIPT_STATUS_AUDIT table policy optimized with scalar subquery
DROP POLICY IF EXISTS "Admins view receipt status audit" ON public.receipt_status_audit;
CREATE POLICY "Admins view receipt status audit"
ON public.receipt_status_audit
FOR SELECT
TO authenticated
USING (
  (SELECT public.has_role(auth.uid(), 'admin'::app_role))
  OR (SELECT public.has_role(auth.uid(), 'super_admin'::app_role))
  OR (SELECT public.is_accounts_staff(auth.uid()))
);
