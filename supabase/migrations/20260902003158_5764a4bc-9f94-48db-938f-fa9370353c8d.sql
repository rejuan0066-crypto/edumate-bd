-- attendance_records: restrict edit/delete to admin/super_admin only
DROP POLICY IF EXISTS "Permitted users edit attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Permitted users delete attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can manage attendance with permission" ON public.attendance_records;

CREATE POLICY "Admins edit attendance_records"
ON public.attendance_records FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete attendance_records"
ON public.attendance_records FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- duty_shift_attendance: restrict edit/delete to admin/super_admin only
DROP POLICY IF EXISTS "Permitted users edit duty shift attendance" ON public.duty_shift_attendance;
DROP POLICY IF EXISTS "Permitted users delete duty shift attendance" ON public.duty_shift_attendance;

CREATE POLICY "Admins edit duty shift attendance"
ON public.duty_shift_attendance FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete duty shift attendance"
ON public.duty_shift_attendance FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));