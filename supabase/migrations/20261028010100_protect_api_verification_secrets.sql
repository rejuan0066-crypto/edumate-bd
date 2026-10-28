-- Keep the API key and master password server-side; admins unlock them via RPC.
REVOKE SELECT ON public.api_verification_config FROM anon, authenticated;
GRANT SELECT (id, api_url, is_enabled, field_mappings, created_at, updated_at)
  ON public.api_verification_config TO authenticated;

CREATE OR REPLACE FUNCTION public.api_verification_has_master_password()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN false
    ELSE COALESCE((SELECT master_password <> '' FROM public.api_verification_config LIMIT 1), false)
  END;
$$;

CREATE OR REPLACE FUNCTION public.api_verification_unlock(p_password text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RETURN NULL;
  END IF;
  SELECT api_key, master_password INTO r FROM public.api_verification_config LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('api_key', '', 'master_password', ''); END IF;
  IF r.master_password <> '' AND r.master_password IS DISTINCT FROM p_password THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('api_key', r.api_key, 'master_password', r.master_password);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.api_verification_has_master_password() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.api_verification_unlock(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.api_verification_has_master_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_verification_unlock(text) TO authenticated;
