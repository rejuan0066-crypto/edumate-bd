CREATE POLICY "Permitted users add attendance_records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
);

CREATE POLICY "Permitted users edit attendance_records" ON public.attendance_records FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
);

CREATE POLICY "Permitted users delete attendance_records" ON public.attendance_records FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'delete'::text)
);