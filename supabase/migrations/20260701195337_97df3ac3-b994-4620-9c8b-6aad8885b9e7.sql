
-- ============================================================
-- 1. hostel_meal_attendance — restrict CRUD to admins / hostel-permitted staff
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view meal attendance" ON public.hostel_meal_attendance;
DROP POLICY IF EXISTS "Authenticated can insert meal attendance" ON public.hostel_meal_attendance;
DROP POLICY IF EXISTS "Authenticated can update meal attendance" ON public.hostel_meal_attendance;
DROP POLICY IF EXISTS "Authenticated can delete meal attendance" ON public.hostel_meal_attendance;

CREATE POLICY "Hostel staff can view meal attendance"
ON public.hostel_meal_attendance FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'view'::text)
);

CREATE POLICY "Hostel staff can insert meal attendance"
ON public.hostel_meal_attendance FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
);

CREATE POLICY "Hostel staff can update meal attendance"
ON public.hostel_meal_attendance FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
);

CREATE POLICY "Hostel staff can delete meal attendance"
ON public.hostel_meal_attendance FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'delete'::text)
);

-- ============================================================
-- 2. meetings & meeting_participants — restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON public.meetings;
CREATE POLICY "Staff and attendees can view meetings"
ON public.meetings FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/meetings'::text, 'view'::text)
  OR access_mode IN ('public', 'logged_in')
  OR EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = meetings.id AND mp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can view meeting participants" ON public.meeting_participants;
CREATE POLICY "Staff and self can view meeting participants"
ON public.meeting_participants FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/meetings'::text, 'view'::text)
  OR user_id = auth.uid()
);

-- ============================================================
-- 3. role_permissions — restrict SELECT to admins or own role
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view role_permissions" ON public.role_permissions;
CREATE POLICY "View own role or admin role_permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR role = get_user_role(auth.uid())
);

-- ============================================================
-- 4. Audit/log tables — restrict INSERT
-- ============================================================
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "Admins can insert system logs"
ON public.system_logs FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "System can insert audit log" ON public.committee_audit_log;
CREATE POLICY "Admins can insert committee audit log"
ON public.committee_audit_log FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated can insert salary generation log" ON public.salary_generation_log;
CREATE POLICY "Admins can insert salary generation log"
ON public.salary_generation_log FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/salary'::text, 'add'::text)
);
