-- Password Policy Settings (single-row table)
CREATE TABLE IF NOT EXISTS public.password_policy (
  id INTEGER PRIMARY KEY DEFAULT 1,
  min_length INTEGER NOT NULL DEFAULT 8,
  require_uppercase BOOLEAN NOT NULL DEFAULT true,
  require_lowercase BOOLEAN NOT NULL DEFAULT true,
  require_number BOOLEAN NOT NULL DEFAULT true,
  require_special BOOLEAN NOT NULL DEFAULT true,
  block_leaked_passwords BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT password_policy_singleton CHECK (id = 1),
  CONSTRAINT password_policy_min_length_range CHECK (min_length BETWEEN 6 AND 64)
);

ALTER TABLE public.password_policy ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated (and even anon for signup hint) can read the policy
CREATE POLICY "Password policy readable by all"
  ON public.password_policy FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update password policy"
  ON public.password_policy FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert password policy"
  ON public.password_policy FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the singleton row
INSERT INTO public.password_policy (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- Security Events (audit log)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  -- e.g. 'otp_failed', 'otp_success', 'password_change_success',
  --      'password_change_failed', 'weak_password_rejected', 'login_failed'
  severity TEXT NOT NULL DEFAULT 'info', -- info | warning | critical
  user_id UUID,
  target_user_id UUID,
  email TEXT,
  reason TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type
  ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_email
  ON public.security_events (email);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete security events"
  ON public.security_events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- INSERT is intentionally restricted to service role / SECURITY DEFINER functions.
-- No client-side INSERT policy is created.

-- Helper: validate a password against the current policy
CREATE OR REPLACE FUNCTION public.validate_password_strength(p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.password_policy%ROWTYPE;
  v_failures TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_policy FROM public.password_policy WHERE id = 1;
  IF v_policy.id IS NULL THEN
    -- Fallback defaults
    v_policy.min_length := 8;
    v_policy.require_uppercase := true;
    v_policy.require_lowercase := true;
    v_policy.require_number := true;
    v_policy.require_special := true;
  END IF;

  IF p_password IS NULL OR length(p_password) < v_policy.min_length THEN
    v_failures := array_append(v_failures, 'min_length');
  END IF;
  IF v_policy.require_uppercase AND p_password !~ '[A-Z]' THEN
    v_failures := array_append(v_failures, 'uppercase');
  END IF;
  IF v_policy.require_lowercase AND p_password !~ '[a-z]' THEN
    v_failures := array_append(v_failures, 'lowercase');
  END IF;
  IF v_policy.require_number AND p_password !~ '[0-9]' THEN
    v_failures := array_append(v_failures, 'number');
  END IF;
  IF v_policy.require_special AND p_password !~ '[^A-Za-z0-9]' THEN
    v_failures := array_append(v_failures, 'special');
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(v_failures, 1) IS NULL,
    'failures', to_jsonb(v_failures),
    'policy', jsonb_build_object(
      'min_length', v_policy.min_length,
      'require_uppercase', v_policy.require_uppercase,
      'require_lowercase', v_policy.require_lowercase,
      'require_number', v_policy.require_number,
      'require_special', v_policy.require_special
    )
  );
END;
$$;