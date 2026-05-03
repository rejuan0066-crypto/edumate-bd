-- Backend logging for administrative-name (staff directory) requests
CREATE TABLE IF NOT EXISTS public.admin_name_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NOT NULL,
  source_path text NOT NULL,           -- e.g. 'useStaffDirectory', 'AdminAdministrativeDebug:probe1'
  sql_path text,                        -- e.g. 'view:staff_directory', 'table:administrative_officers', 'rpc:list_staff_directory'
  caller_user_id uuid,
  caller_role text,
  filters jsonb DEFAULT '{}'::jsonb,
  result_count integer,
  error_code text,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_name_log_corr ON public.admin_name_request_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_admin_name_log_created ON public.admin_name_request_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_name_log_user ON public.admin_name_request_log(caller_user_id);

ALTER TABLE public.admin_name_request_log ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own log row (it's a diagnostic trail)
CREATE POLICY "auth can insert own admin name log"
ON public.admin_name_request_log FOR INSERT TO authenticated
WITH CHECK (caller_user_id IS NULL OR caller_user_id = auth.uid());

-- Only admins / super_admins can read
CREATE POLICY "admins read admin name log"
ON public.admin_name_request_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can delete (cleanup)
CREATE POLICY "super_admin delete admin name log"
ON public.admin_name_request_log FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Logging RPC: SECURITY DEFINER so it always succeeds even when caller has limited grants
CREATE OR REPLACE FUNCTION public.log_admin_name_request(
  _correlation_id text,
  _source_path text,
  _sql_path text,
  _filters jsonb,
  _result_count integer,
  _error_code text,
  _error_message text,
  _duration_ms integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _role text;
BEGIN
  -- Resolve caller's highest role (best-effort)
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role::text
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    ELSE 9 END
  LIMIT 1;

  INSERT INTO public.admin_name_request_log(
    correlation_id, source_path, sql_path, caller_user_id, caller_role,
    filters, result_count, error_code, error_message, duration_ms
  ) VALUES (
    COALESCE(_correlation_id, gen_random_uuid()::text),
    COALESCE(_source_path, 'unknown'),
    _sql_path,
    auth.uid(),
    _role,
    COALESCE(_filters, '{}'::jsonb),
    _result_count,
    _error_code,
    _error_message,
    _duration_ms
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_name_request(text,text,text,jsonb,integer,text,text,integer) TO authenticated;