
DROP POLICY IF EXISTS "Admins or own weekly duty template" ON public.duty_weekly_template;
CREATE POLICY "Admins or own weekly duty template" ON public.duty_weekly_template
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_weekly_template.staff_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins or own duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Admins or own duty shift attendance" ON public.duty_shift_attendance
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_shift_attendance.staff_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Permitted users add duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Permitted users add duty shift attendance" ON public.duty_shift_attendance
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'add')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'add')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'add')
);

DROP POLICY IF EXISTS "Permitted users add duty roster" ON public.duty_roster;
CREATE POLICY "Permitted users add duty roster" ON public.duty_roster
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'add')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'add')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'add')
);
