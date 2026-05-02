
-- ============================================================
-- Advanced Device Management & Security Suite
-- Augments user_devices + adds device_approval_requests
-- ============================================================

-- 1) Extend user_devices with location + device model fields
ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS upazila text,
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS isp text,
  ADD COLUMN IF NOT EXISTS home_country text,
  ADD COLUMN IF NOT EXISTS home_city text,
  ADD COLUMN IF NOT EXISTS home_upazila text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS last_anomaly text,
  ADD COLUMN IF NOT EXISTS last_anomaly_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_devices_status
  ON public.user_devices(approval_status);

-- 2) New table: device_approval_requests
CREATE TABLE IF NOT EXISTS public.device_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  user_agent text,
  device_model text,
  ip_address text,
  country text,
  city text,
  upazila text,
  village text,
  region text,
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dar_status ON public.device_approval_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dar_user ON public.device_approval_requests(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dar_pending
  ON public.device_approval_requests(user_id, device_id) WHERE status = 'pending';

ALTER TABLE public.device_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read approval requests"
  ON public.device_approval_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

CREATE POLICY "Users insert own approval requests"
  ON public.device_approval_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_dar_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_dar_updated_at ON public.device_approval_requests;
CREATE TRIGGER trg_dar_updated_at BEFORE UPDATE ON public.device_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dar_updated_at();

-- 3) Settings flag: require admin approval for new devices
INSERT INTO public.app_settings (key, value)
VALUES ('device_approval_required', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4) RPC: update device location (called from edge fn after IP geo)
CREATE OR REPLACE FUNCTION public.update_device_location(
  _user_id uuid,
  _device_id text,
  _ip text,
  _country text,
  _region text,
  _city text,
  _upazila text,
  _village text,
  _latitude double precision,
  _longitude double precision,
  _isp text,
  _device_model text,
  _os text,
  _browser text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.user_devices;
  _anomaly text := NULL;
  _distance_km double precision;
BEGIN
  SELECT * INTO _row FROM public.user_devices
  WHERE user_id = _user_id AND device_id = _device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'device_not_found');
  END IF;

  -- Anomaly detection: out-of-area (different upazila/city than home)
  IF _row.home_city IS NOT NULL AND _city IS NOT NULL
     AND lower(_row.home_city) <> lower(_city) THEN
    _anomaly := 'out_of_area_city';
  ELSIF _row.home_upazila IS NOT NULL AND _upazila IS NOT NULL
     AND lower(_row.home_upazila) <> lower(_upazila) THEN
    _anomaly := 'out_of_area_upazila';
  ELSIF _row.home_country IS NOT NULL AND _country IS NOT NULL
     AND lower(_row.home_country) <> lower(_country) THEN
    _anomaly := 'out_of_country';
  END IF;

  UPDATE public.user_devices SET
    last_ip = _ip,
    country = _country, region = _region, city = _city,
    upazila = _upazila, village = _village,
    latitude = _latitude, longitude = _longitude, isp = _isp,
    device_model = COALESCE(_device_model, device_model),
    os = COALESCE(_os, os),
    browser = COALESCE(_browser, browser),
    last_seen_at = now(),
    last_anomaly = COALESCE(_anomaly, last_anomaly),
    last_anomaly_at = CASE WHEN _anomaly IS NOT NULL THEN now() ELSE last_anomaly_at END,
    -- TOFU home location on first sighting
    home_country = COALESCE(home_country, _country),
    home_city = COALESCE(home_city, _city),
    home_upazila = COALESCE(home_upazila, _upazila)
  WHERE user_id = _user_id AND device_id = _device_id;

  IF _anomaly IS NOT NULL THEN
    INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
    VALUES (_user_id, 'suspicious_location', 'warn', _device_id, _ip,
      jsonb_build_object(
        'anomaly', _anomaly,
        'observed', jsonb_build_object('country', _country, 'city', _city, 'upazila', _upazila, 'village', _village),
        'home', jsonb_build_object('country', _row.home_country, 'city', _row.home_city, 'upazila', _row.home_upazila)
      ));
  END IF;

  RETURN jsonb_build_object('ok', true, 'anomaly', _anomaly);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_device_location(uuid, text, text, text, text, text, text, text, double precision, double precision, text, text, text, text) TO authenticated;

-- 5) RPC: list staff devices with profile name/email (admin only)
CREATE OR REPLACE FUNCTION public.list_staff_devices()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  device_id text,
  user_name text,
  user_email text,
  label text,
  device_model text,
  os text,
  browser text,
  user_agent text,
  last_ip text,
  country text,
  region text,
  city text,
  upazila text,
  village text,
  latitude double precision,
  longitude double precision,
  isp text,
  is_active boolean,
  approval_status text,
  last_anomaly text,
  last_anomaly_at timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT d.id, d.user_id, d.device_id,
    COALESCE(p.full_name, p.full_name_bn, p.email, '—'),
    p.email,
    d.label, d.device_model, d.os, d.browser, d.user_agent,
    d.last_ip, d.country, d.region, d.city, d.upazila, d.village,
    d.latitude, d.longitude, d.isp,
    d.is_active, d.approval_status, d.last_anomaly, d.last_anomaly_at,
    d.first_seen_at, d.last_seen_at, d.created_at
  FROM public.user_devices d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  ORDER BY d.last_seen_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_staff_devices() TO authenticated;

-- 6) RPC: list pending device approval requests
CREATE OR REPLACE FUNCTION public.list_device_approval_requests(_status text DEFAULT 'pending')
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  device_id text,
  user_agent text,
  device_model text,
  ip_address text,
  country text,
  region text,
  city text,
  upazila text,
  village text,
  status text,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id,
    COALESCE(p.full_name, p.full_name_bn, p.email, '—'),
    p.email,
    r.device_id, r.user_agent, r.device_model, r.ip_address,
    r.country, r.region, r.city, r.upazila, r.village,
    r.status, r.created_at
  FROM public.device_approval_requests r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.status = COALESCE(_status, r.status)
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_device_approval_requests(text) TO authenticated;

-- 7) RPC: approve device request
CREATE OR REPLACE FUNCTION public.approve_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed', 'status', _r.status);
  END IF;

  -- Activate / register device
  INSERT INTO public.user_devices(user_id, device_id, label, user_agent, last_ip,
    device_model, country, region, city, upazila, village, latitude, longitude,
    is_active, approval_status, first_seen_at, last_seen_at)
  VALUES (_r.user_id, _r.device_id,
    COALESCE(_r.device_model, 'Approved device'), _r.user_agent, _r.ip_address,
    _r.device_model, _r.country, _r.region, _r.city, _r.upazila, _r.village,
    _r.latitude, _r.longitude,
    true, 'approved', now(), now())
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    is_active = true, approval_status = 'approved',
    last_ip = EXCLUDED.last_ip, last_seen_at = now(), revoked_at = NULL;

  UPDATE public.device_approval_requests
  SET status = 'approved', reviewed_by = _admin, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_r.user_id, 'device_approved', 'info', _r.device_id, _r.ip_address,
    jsonb_build_object('approved_by', _admin, 'notes', _notes));

  RETURN jsonb_build_object('ok', true, 'request_id', _request_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_device_request(uuid, text) TO authenticated;

-- 8) RPC: reject device request
CREATE OR REPLACE FUNCTION public.reject_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed'); END IF;

  UPDATE public.device_approval_requests
  SET status = 'rejected', reviewed_by = _admin, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_r.user_id, 'device_rejected', 'warn', _r.device_id, _r.ip_address,
    jsonb_build_object('rejected_by', _admin, 'notes', _notes));

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_device_request(uuid, text) TO authenticated;

-- 9) RPC: revoke a staff device (admin one-click)
CREATE OR REPLACE FUNCTION public.revoke_staff_device(_device_uuid uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.user_devices;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.user_devices WHERE id = _device_uuid;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE public.user_devices
  SET is_active = false, approval_status = 'revoked', revoked_at = now()
  WHERE id = _device_uuid;

  -- Also revoke audit allowlist entry if present
  UPDATE public.authorized_audit_devices
  SET is_active = false, revoked_at = now(), revoked_by = _admin
  WHERE device_id = _row.device_id AND is_active = true;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_row.user_id, 'device_revoked', 'critical', _row.device_id, _row.last_ip,
    jsonb_build_object('revoked_by', _admin, 'reason', _reason));

  RETURN jsonb_build_object('ok', true, 'device_id', _row.device_id, 'user_id', _row.user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_staff_device(uuid, text) TO authenticated;

-- 10) RPC: set/update device home location (TOFU lock)
CREATE OR REPLACE FUNCTION public.set_device_home_location(
  _device_uuid uuid, _country text, _city text, _upazila text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.user_devices
  SET home_country = _country, home_city = _city, home_upazila = _upazila
  WHERE id = _device_uuid;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_device_home_location(uuid, text, text, text) TO authenticated;
