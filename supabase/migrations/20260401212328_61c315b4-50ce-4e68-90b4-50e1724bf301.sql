CREATE POLICY "Anyone can view classes"
ON public.classes
FOR SELECT
TO public
USING (true);