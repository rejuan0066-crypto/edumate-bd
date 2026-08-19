GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;

DROP POLICY IF EXISTS "Super admins can manage results" ON public.results;
CREATE POLICY "Super admins can manage results"
ON public.results FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));