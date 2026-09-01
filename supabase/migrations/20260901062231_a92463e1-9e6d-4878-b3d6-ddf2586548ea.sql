DROP POLICY IF EXISTS "Admins or own duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Admins or own duty shift attendance" ON public.duty_shift_attendance FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'view'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'view'::text)
  OR EXISTS (SELECT 1 FROM staff s WHERE s.id = duty_shift_attendance.staff_id AND s.user_id = auth.uid())
);

CREATE POLICY "Permitted users add duty shift attendance" ON public.duty_shift_attendance FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'add'::text)
);

CREATE POLICY "Permitted users edit duty shift attendance" ON public.duty_shift_attendance FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
);

CREATE POLICY "Permitted users delete duty shift attendance" ON public.duty_shift_attendance FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'delete'::text)
);

DROP POLICY IF EXISTS "Admins or own weekly duty template" ON public.duty_weekly_template;
CREATE POLICY "Admins or own weekly duty template" ON public.duty_weekly_template FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'view'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'view'::text)
  OR EXISTS (SELECT 1 FROM staff s WHERE s.id = duty_weekly_template.staff_id AND s.user_id = auth.uid())
);