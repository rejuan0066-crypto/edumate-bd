DROP POLICY IF EXISTS "Authenticated users can view budgets" ON public.budgets;
CREATE POLICY "Finance staff can view budgets" ON public.budgets FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_menu_permission(auth.uid(),'/admin/budgets','view'));

DROP POLICY IF EXISTS "Authenticated can view assets" ON public.fixed_assets;
CREATE POLICY "Finance staff can view assets" ON public.fixed_assets FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_menu_permission(auth.uid(),'/admin/accounts','view'));

DROP POLICY IF EXISTS "Authenticated can view duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Admins or own duty shift attendance" ON public.duty_shift_attendance FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_menu_permission(auth.uid(),'/admin/duty-roster','view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_shift_attendance.staff_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated can view weekly duty template" ON public.duty_weekly_template;
CREATE POLICY "Admins or own weekly duty template" ON public.duty_weekly_template FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_menu_permission(auth.uid(),'/admin/duty-roster','view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_weekly_template.staff_id AND s.user_id = auth.uid())
);