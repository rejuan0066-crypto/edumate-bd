-- Allow users with attendance permission to view students, classes, divisions, and academic_sessions
-- without needing full student or curriculum management permissions.

-- 1. STUDENTS table view for attendance
DROP POLICY IF EXISTS "Permitted attendance users can view students" ON public.students;
CREATE POLICY "Permitted attendance users can view students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/attendance', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/student-attendance', 'view')
  );

-- 2. CLASSES table view for attendance
DROP POLICY IF EXISTS "Permitted users can view classes" ON public.classes;
CREATE POLICY "Permitted users can view classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    public.has_any_menu_permission((SELECT auth.uid()), ARRAY[
      '/admin/divisions',
      '/admin/classes',
      '/admin/academic-sessions',
      '/admin/attendance',
      '/admin/student-attendance'
    ]::text[], 'view')
  );

-- 3. DIVISIONS table view for attendance
DROP POLICY IF EXISTS "Permitted users can view divisions" ON public.divisions;
CREATE POLICY "Permitted users can view divisions"
  ON public.divisions FOR SELECT
  TO authenticated
  USING (
    public.has_any_menu_permission((SELECT auth.uid()), ARRAY[
      '/admin/divisions',
      '/admin/academic-sessions',
      '/admin/attendance',
      '/admin/student-attendance'
    ]::text[], 'view')
  );

-- 4. ACADEMIC SESSIONS table view for attendance
DROP POLICY IF EXISTS "Permitted users can view academic_sessions" ON public.academic_sessions;
CREATE POLICY "Permitted users can view academic_sessions"
  ON public.academic_sessions FOR SELECT
  TO authenticated
  USING (
    public.has_any_menu_permission((SELECT auth.uid()), ARRAY[
      '/admin/academic-sessions',
      '/admin/divisions',
      '/admin/attendance',
      '/admin/student-attendance'
    ]::text[], 'view')
  );

-- 5. ATTENDANCE_RECORDS table INSERT, UPDATE, DELETE to support both /admin/attendance and /admin/student-attendance
DROP POLICY IF EXISTS "Permitted users add attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users add attendance_records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'edit'::text)
);

DROP POLICY IF EXISTS "Permitted users edit attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users edit attendance_records" ON public.attendance_records FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'edit'::text)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'edit'::text)
);

DROP POLICY IF EXISTS "Permitted users delete attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users delete attendance_records" ON public.attendance_records FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'delete'::text)
);
