
ALTER TABLE public.parent_accounts
  ADD COLUMN IF NOT EXISTS session_token text,
  ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_parent_accounts_session_token
  ON public.parent_accounts (session_token)
  WHERE session_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_parent_session(
  p_account_id uuid,
  p_session_token text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_accounts
    WHERE id = p_account_id
      AND session_token = p_session_token
      AND session_token IS NOT NULL
      AND (session_expires_at IS NULL OR session_expires_at > now())
      AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.rotate_parent_session(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.parent_accounts
     SET session_token = v_token,
         session_expires_at = now() + interval '30 days'
   WHERE id = p_account_id;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_parent_session(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotate_parent_session(uuid) FROM public, anon, authenticated;
