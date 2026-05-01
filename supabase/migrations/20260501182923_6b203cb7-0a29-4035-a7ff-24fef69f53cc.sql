
DROP POLICY IF EXISTS "security_logs_auth_insert" ON public.security_logs;
CREATE POLICY "security_logs_self_insert" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
