
-- Allow staff/teacher to INSERT/UPDATE/DELETE on key tables
-- They still need frontend permission checks + approval workflow

-- Students table
CREATE POLICY "Staff can manage students" ON public.students
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Notices table
CREATE POLICY "Staff can manage notices" ON public.notices
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Fee payments table
CREATE POLICY "Staff can manage fee_payments" ON public.fee_payments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Fee types table
CREATE POLICY "Staff can manage fee_types" ON public.fee_types
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Divisions table
CREATE POLICY "Staff can manage divisions" ON public.divisions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Subjects (currently missing from schema, skip if not exists)

-- Results table
CREATE POLICY "Staff can manage results" ON public.results
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expenses table
CREATE POLICY "Staff can manage expenses" ON public.expenses
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Donors table
CREATE POLICY "Staff can manage donors" ON public.donors
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Attendance records - staff/teacher can insert
CREATE POLICY "Staff can manage attendance" ON public.attendance_records
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Salary records - staff can view (already exists), add manage for staff role
CREATE POLICY "Staff can manage salary_records" ON public.salary_records
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Posts table
CREATE POLICY "Staff can manage posts" ON public.posts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expense categories
CREATE POLICY "Staff can manage expense_categories" ON public.expense_categories
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expense projects
CREATE POLICY "Staff can manage expense_projects" ON public.expense_projects
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Staff table
CREATE POLICY "Staff can manage staff" ON public.staff
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Exams table
CREATE POLICY "Staff can manage exams" ON public.exams
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Classes table
CREATE POLICY "Staff can manage classes" ON public.classes
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Deposits table
CREATE POLICY "Staff can manage deposits" ON public.deposits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expense monthly summary
CREATE POLICY "Staff can manage expense_monthly_summary" ON public.expense_monthly_summary
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));
