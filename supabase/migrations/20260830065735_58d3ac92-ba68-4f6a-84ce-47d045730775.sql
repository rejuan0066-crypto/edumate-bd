CREATE POLICY "Permitted users can view staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/staff', 'view')
  OR has_menu_permission(auth.uid(), '/admin/general-staff', 'view')
  OR has_menu_permission(auth.uid(), '/admin/administrative-staff', 'view')
  OR has_menu_permission(auth.uid(), '/admin/teachers', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/salary', 'view')
);