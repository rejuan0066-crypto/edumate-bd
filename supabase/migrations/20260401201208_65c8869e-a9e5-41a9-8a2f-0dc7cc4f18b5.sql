CREATE POLICY "Anyone can submit admission"
ON public.students
FOR INSERT
TO public
WITH CHECK (approval_status = 'pending');