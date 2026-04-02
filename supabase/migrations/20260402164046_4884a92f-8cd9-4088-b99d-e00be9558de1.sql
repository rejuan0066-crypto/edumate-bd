-- Staff can view their own record
CREATE POLICY "Staff can view own staff record"
ON public.staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Staff/teachers can view their own attendance
CREATE POLICY "Staff can view own attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (entity_id IN (
  SELECT id FROM public.staff WHERE user_id = auth.uid()
));