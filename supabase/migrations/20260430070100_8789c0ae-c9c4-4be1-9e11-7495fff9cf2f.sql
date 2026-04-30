-- Rate limit configuration (admin-tunable)
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  max_requests INTEGER NOT NULL DEFAULT 20,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_config_admin_select" ON public.rate_limit_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "rate_limit_config_admin_modify" ON public.rate_limit_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_rate_limit_config_updated
  BEFORE UPDATE ON public.rate_limit_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Counters table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_key TEXT NOT NULL,         -- e.g. "user_create:admin:<uid>" or "otp_send:ip:1.2.3.4"
  scope TEXT NOT NULL,              -- 'admin' | 'ip' | 'email' | 'phone'
  action TEXT NOT NULL,             -- maps to rate_limit_config.action
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_bucket ON public.rate_limits(bucket_key, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can read counters; writes go through SECURITY DEFINER RPC
CREATE POLICY "rate_limits_admin_select" ON public.rate_limits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- RPC: check + increment in one shot
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key TEXT,
  _scope TEXT,
  _action TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.rate_limit_config%ROWTYPE;
  v_row public.rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_window_end TIMESTAMPTZ;
  v_retry_after INTEGER;
  v_bucket_key TEXT;
BEGIN
  IF _key IS NULL OR _key = '' OR _action IS NULL OR _action = '' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  v_bucket_key := _action || ':' || _scope || ':' || _key;

  SELECT * INTO v_cfg FROM public.rate_limit_config WHERE action = _action LIMIT 1;
  IF v_cfg.id IS NULL OR v_cfg.enabled = false THEN
    RETURN jsonb_build_object('ok', true, 'disabled', true);
  END IF;

  -- Lock row for atomic increment
  SELECT * INTO v_row FROM public.rate_limits
   WHERE bucket_key = v_bucket_key AND action = _action
   FOR UPDATE;

  IF v_row.id IS NULL THEN
    INSERT INTO public.rate_limits (bucket_key, scope, action, window_start, request_count, last_request_at)
    VALUES (v_bucket_key, _scope, _action, v_now, 1, v_now);
    RETURN jsonb_build_object(
      'ok', true, 'remaining', GREATEST(v_cfg.max_requests - 1, 0),
      'limit', v_cfg.max_requests, 'window_seconds', v_cfg.window_seconds
    );
  END IF;

  -- If window expired, reset
  IF v_row.window_start + make_interval(secs => v_cfg.window_seconds) <= v_now THEN
    UPDATE public.rate_limits
       SET window_start = v_now, request_count = 1, last_request_at = v_now
     WHERE id = v_row.id;
    RETURN jsonb_build_object(
      'ok', true, 'remaining', GREATEST(v_cfg.max_requests - 1, 0),
      'limit', v_cfg.max_requests, 'window_seconds', v_cfg.window_seconds
    );
  END IF;

  -- Check limit
  IF v_row.request_count >= v_cfg.max_requests THEN
    v_window_end := v_row.window_start + make_interval(secs => v_cfg.window_seconds);
    v_retry_after := GREATEST(CEIL(EXTRACT(EPOCH FROM (v_window_end - v_now)))::int, 1);
    UPDATE public.rate_limits
       SET blocked_count = blocked_count + 1, last_request_at = v_now
     WHERE id = v_row.id;
    RETURN jsonb_build_object(
      'ok', false, 'code', 'RATE_LIMITED',
      'retry_after', v_retry_after,
      'limit', v_cfg.max_requests, 'window_seconds', v_cfg.window_seconds,
      'message_bn', 'অনেক বেশি অনুরোধ পাঠানো হয়েছে। ' || v_retry_after::text || ' সেকেন্ড পর আবার চেষ্টা করুন।'
    );
  END IF;

  -- Increment
  UPDATE public.rate_limits
     SET request_count = request_count + 1, last_request_at = v_now
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'remaining', GREATEST(v_cfg.max_requests - v_row.request_count - 1, 0),
    'limit', v_cfg.max_requests,
    'window_seconds', v_cfg.window_seconds
  );
END;
$$;

-- Seed default configs
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, description) VALUES
  ('user_create_admin',    20,  60,  'Per-admin: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি মিনিটে'),
  ('user_create_ip',       30,  60,  'Per-IP: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি মিনিটে'),
  ('user_sensitive_admin', 30,  60,  'Per-admin: sensitive action (reset_password, set_role) প্রতি মিনিটে'),
  ('user_sensitive_ip',    50,  60,  'Per-IP: sensitive action প্রতি মিনিটে'),
  ('otp_send_email',       5,   60,  'Per-email: OTP send প্রতি মিনিটে'),
  ('otp_send_ip',          15,  60,  'Per-IP: OTP send প্রতি মিনিটে'),
  ('otp_verify_email',     10,  60,  'Per-email: OTP verify চেষ্টা প্রতি মিনিটে'),
  ('otp_verify_ip',        30,  60,  'Per-IP: OTP verify চেষ্টা প্রতি মিনিটে'),
  ('duplicate_check',      30,  60,  'Per-admin: debounced duplicate check প্রতি মিনিটে')
ON CONFLICT (action) DO NOTHING;