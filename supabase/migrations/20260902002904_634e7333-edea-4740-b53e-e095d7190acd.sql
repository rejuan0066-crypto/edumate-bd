CREATE POLICY "Permitted users view duty roster" ON public.duty_roster FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
);

CREATE POLICY "Permitted users add duty roster" ON public.duty_roster FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'add')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'add')
);

CREATE POLICY "Permitted users edit duty roster" ON public.duty_roster FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'edit')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'edit')
);

CREATE POLICY "Permitted users delete duty roster" ON public.duty_roster FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'delete')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'delete')
);