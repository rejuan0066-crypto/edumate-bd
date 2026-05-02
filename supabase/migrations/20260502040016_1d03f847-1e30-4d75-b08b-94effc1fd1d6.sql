-- =========================================
-- 1) USER DEVICES REGISTRY
-- =========================================
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  label TEXT,
  user_agent TEXT,
  last_ip TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON public.user_devices(user_id, is_active);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own devices" ON public.user_devices;
CREATE POLICY "Users view own devices" ON public.user_devices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users manage own devices" ON public.user_devices;
CREATE POLICY "Users manage own devices" ON public.user_devices
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin delete devices" ON public.user_devices;
CREATE POLICY "Super admin delete devices" ON public.user_devices
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

-- No direct INSERT policy: insertion happens via SECURITY DEFINER RPC only.

CREATE OR REPLACE FUNCTION public.tg_user_devices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_user_devices_updated_at ON public.user_devices;
CREATE TRIGGER trg_user_devices_updated_at
BEFORE UPDATE ON public.user_devices
FOR EACH ROW EXECUTE FUNCTION public.tg_user_devices_updated_at();

-- =========================================
-- 2) SECURITY ALERTS LOG
-- =========================================
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alert_type TEXT NOT NULL, -- 'device_mismatch' | 'unknown_device' | 'revoked_device' | 'missing_device_header'
  severity TEXT NOT NULL DEFAULT 'warn', -- 'info' | 'warn' | 'critical'
  device_id TEXT,
  registered_devices TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  endpoint TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON public.security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON public.security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON public.security_alerts(created_at DESC);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read alerts" ON public.security_alerts;
CREATE POLICY "Admins read alerts" ON public.security_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin delete alerts" ON public.security_alerts;
CREATE POLICY "Super admin delete alerts" ON public.security_alerts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- No INSERT/UPDATE policies: all inserts happen via SECURITY DEFINER RPCs.

-- =========================================
-- 3) DEVICE REGISTRATION (TRUST-ON-FIRST-USE)
-- =========================================
CREATE OR REPLACE FUNCTION public.register_user_device(
  _device_id TEXT,
  _label TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _ip TEXT DEFAULT NULL
) RETURNS public.user_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.user_devices;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    RAISE EXCEPTION 'device_id required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_devices (user_id, device_id, label, user_agent, last_ip)
  VALUES (uid, _device_id, _label, _user_agent, _ip)
  ON CONFLICT (user_id, device_id) DO UPDATE
    SET last_seen_at = now(),
        last_ip = COALESCE(EXCLUDED.last_ip, public.user_devices.last_ip),
        user_agent = COALESCE(EXCLUDED.user_agent, public.user_devices.user_agent),
        is_active = true,
        revoked_at = NULL
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_user_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =========================================
-- 4) DEVICE VERIFICATION (with auto-log)
-- =========================================
CREATE OR REPLACE FUNCTION public.verify_user_device(
  _device_id TEXT,
  _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _endpoint TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  device_row public.user_devices;
  total_devices INT;
  registered_ids TEXT[];
  alert_type TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Missing header
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    INSERT INTO public.security_alerts (user_id, alert_type, severity, ip_address, user_agent, endpoint)
    VALUES (uid, 'missing_device_header', 'warn', _ip, _user_agent, _endpoint);
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_device_header');
  END IF;

  SELECT * INTO device_row
  FROM public.user_devices
  WHERE user_id = uid AND device_id = _device_id
  LIMIT 1;

  SELECT count(*), array_agg(device_id) INTO total_devices, registered_ids
  FROM public.user_devices
  WHERE user_id = uid AND is_active = true;

  -- TRUST-ON-FIRST-USE: if user has no registered devices yet, auto-register this one
  IF total_devices = 0 AND device_row IS NULL THEN
    INSERT INTO public.user_devices (user_id, device_id, user_agent, last_ip)
    VALUES (uid, _device_id, _user_agent, _ip)
    RETURNING * INTO device_row;
    RETURN jsonb_build_object('ok', true, 'reason', 'auto_registered', 'device_id', _device_id);
  END IF;

  -- Unknown device
  IF device_row IS NULL THEN
    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, registered_devices, ip_address, user_agent, endpoint
    ) VALUES (
      uid, 'unknown_device', 'critical', _device_id, registered_ids, _ip, _user_agent, _endpoint
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_device');
  END IF;

  -- Revoked device
  IF NOT device_row.is_active THEN
    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, registered_devices, ip_address, user_agent, endpoint
    ) VALUES (
      uid, 'revoked_device', 'critical', _device_id, registered_ids, _ip, _user_agent, _endpoint
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'revoked_device');
  END IF;

  -- Match: update last seen
  UPDATE public.user_devices
  SET last_seen_at = now(),
      last_ip = COALESCE(_ip, last_ip),
      user_agent = COALESCE(_user_agent, user_agent)
  WHERE id = device_row.id;

  RETURN jsonb_build_object('ok', true, 'reason', 'matched', 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_user_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =========================================
-- 5) ADMIN HELPERS
-- =========================================
CREATE OR REPLACE FUNCTION public.revoke_user_device(_device_uuid UUID)
RETURNS public.user_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.user_devices;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_devices
  SET is_active = false, revoked_at = now()
  WHERE id = _device_uuid
    AND (user_id = uid OR public.has_role(uid, 'admin') OR public.has_role(uid, 'super_admin'))
  RETURNING * INTO rec;

  IF rec IS NULL THEN
    RAISE EXCEPTION 'Device not found or not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_device(UUID) TO authenticated;