-- =========================================
-- 1) AUDIT-ROUTE DEVICE ALLOWLIST
-- =========================================
CREATE TABLE IF NOT EXISTS public.authorized_audit_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_id UUID, -- optional binding: if set, only this user on this device passes
  label TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by UUID,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authorized_audit_devices_active
  ON public.authorized_audit_devices(device_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_authorized_audit_devices_user
  ON public.authorized_audit_devices(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.authorized_audit_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit allowlist" ON public.authorized_audit_devices;
CREATE POLICY "Admins read audit allowlist" ON public.authorized_audit_devices
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- No INSERT/UPDATE/DELETE policies — all writes go through SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.tg_audit_devices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_audit_devices_updated_at ON public.authorized_audit_devices;
CREATE TRIGGER trg_audit_devices_updated_at
BEFORE UPDATE ON public.authorized_audit_devices
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_devices_updated_at();

-- =========================================
-- 2) AUDIT DEVICE VERIFICATION RPC
--    Combines: (a) user_devices match  +  (b) audit allowlist match
-- =========================================
CREATE OR REPLACE FUNCTION public.verify_audit_device(
  _device_id TEXT,
  _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _endpoint TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  base_check JSONB;
  allow_row public.authorized_audit_devices;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Step 1: enforce the existing per-user device binding (also logs missing/unknown/revoked)
  base_check := public.verify_user_device(_device_id, _ip, _user_agent, _endpoint);
  IF NOT (base_check->>'ok')::boolean THEN
    RETURN base_check;
  END IF;

  -- Step 2: check audit allowlist
  SELECT * INTO allow_row
  FROM public.authorized_audit_devices
  WHERE device_id = _device_id
    AND is_active = true
    AND (user_id IS NULL OR user_id = uid)
  LIMIT 1;

  IF allow_row IS NULL THEN
    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, ip_address, user_agent, endpoint, details
    ) VALUES (
      uid, 'audit_device_not_allowlisted', 'critical',
      _device_id, _ip, _user_agent, _endpoint,
      jsonb_build_object('reason', 'device not on authorized_audit_devices allowlist')
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'audit_device_not_allowlisted');
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'audit_allowlisted', 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_audit_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =========================================
-- 3) MANAGEMENT RPCS (super_admin only)
-- =========================================
CREATE OR REPLACE FUNCTION public.add_audit_device(
  _device_id TEXT,
  _user_id UUID DEFAULT NULL,
  _label TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
) RETURNS public.authorized_audit_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.authorized_audit_devices;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: super_admin only' USING ERRCODE = '42501';
  END IF;
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    RAISE EXCEPTION 'device_id required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.authorized_audit_devices (device_id, user_id, label, notes, added_by)
  VALUES (_device_id, _user_id, _label, _notes, uid)
  ON CONFLICT (device_id) DO UPDATE
    SET user_id = COALESCE(EXCLUDED.user_id, public.authorized_audit_devices.user_id),
        label = COALESCE(EXCLUDED.label, public.authorized_audit_devices.label),
        notes = COALESCE(EXCLUDED.notes, public.authorized_audit_devices.notes),
        is_active = true,
        revoked_at = NULL,
        revoked_by = NULL
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_audit_device(TEXT, UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_audit_device(_device_uuid UUID)
RETURNS public.authorized_audit_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.authorized_audit_devices;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: super_admin only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.authorized_audit_devices
  SET is_active = false, revoked_at = now(), revoked_by = uid
  WHERE id = _device_uuid
  RETURNING * INTO rec;

  IF rec IS NULL THEN
    RAISE EXCEPTION 'Device not found' USING ERRCODE = '42704';
  END IF;
  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_audit_device(UUID) TO authenticated;