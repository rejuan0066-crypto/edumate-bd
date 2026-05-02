
-- 1. Cooldown setting
INSERT INTO public.app_settings (key, value)
VALUES ('device_reregister_cooldown_hours', '24'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Status helper (no side-effects)
CREATE OR REPLACE FUNCTION public.get_device_reregister_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _hours int;
  _last timestamptz;
  _pending public.device_approval_requests;
  _next timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT COALESCE((value)::int, 24) INTO _hours
  FROM public.app_settings WHERE key = 'device_reregister_cooldown_hours';
  IF _hours IS NULL THEN _hours := 24; END IF;

  SELECT * INTO _pending
  FROM public.device_approval_requests
  WHERE user_id = _uid AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  SELECT MAX(created_at) INTO _last
  FROM public.device_approval_requests
  WHERE user_id = _uid;

  _next := COALESCE(_last, 'epoch'::timestamptz) + make_interval(hours => _hours);

  RETURN jsonb_build_object(
    'ok', true,
    'cooldown_hours', _hours,
    'last_request_at', _last,
    'next_allowed_at', _next,
    'can_request', (_last IS NULL OR now() >= _next),
    'has_pending', (_pending.id IS NOT NULL),
    'pending_status', _pending.status,
    'pending_device_id', _pending.device_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_device_reregister_status() TO authenticated;

-- 3. Request RPC with cooldown enforcement + admin notification
CREATE OR REPLACE FUNCTION public.request_device_reregistration(
  _device_id text,
  _user_agent text DEFAULT NULL,
  _device_model text DEFAULT NULL,
  _ip text DEFAULT NULL,
  _country text DEFAULT NULL,
  _region text DEFAULT NULL,
  _city text DEFAULT NULL,
  _upazila text DEFAULT NULL,
  _village text DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _status jsonb;
  _req_id uuid;
  _hours int;
  _next timestamptz;
  _user_name text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  IF _device_id IS NULL OR length(_device_id) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_device_id');
  END IF;

  _status := public.get_device_reregister_status();
  _hours := COALESCE((_status->>'cooldown_hours')::int, 24);
  _next := (_status->>'next_allowed_at')::timestamptz;

  IF (_status->>'can_request')::boolean = false THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'cooldown_active',
      'next_allowed_at', _next,
      'cooldown_hours', _hours
    );
  END IF;

  -- upsert pending request (one per user+device)
  INSERT INTO public.device_approval_requests(
    user_id, device_id, user_agent, device_model, ip_address,
    country, region, city, upazila, village, latitude, longitude, status
  ) VALUES (
    _uid, _device_id, _user_agent, _device_model, _ip,
    _country, _region, _city, _upazila, _village, _latitude, _longitude, 'pending'
  )
  ON CONFLICT (user_id, device_id) WHERE status = 'pending'
  DO UPDATE SET
    user_agent = EXCLUDED.user_agent,
    device_model = EXCLUDED.device_model,
    ip_address = EXCLUDED.ip_address,
    country = EXCLUDED.country, region = EXCLUDED.region, city = EXCLUDED.city,
    upazila = EXCLUDED.upazila, village = EXCLUDED.village,
    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    updated_at = now()
  RETURNING id INTO _req_id;

  -- security log
  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_uid, 'device_reregistration_requested', 'warning', _device_id, _ip,
    jsonb_build_object(
      'request_id', _req_id, 'city', _city, 'upazila', _upazila, 'village', _village,
      'country', _country, 'device_model', _device_model
    ));

  -- admin notification
  SELECT COALESCE(full_name, email) INTO _user_name FROM public.profiles WHERE id = _uid;

  BEGIN
    INSERT INTO public.notifications(user_id, title, message, category, link, metadata)
    SELECT ur.user_id,
      'নতুন ডিভাইস অনুমোদনের অনুরোধ',
      COALESCE(_user_name, 'একজন ইউজার') || ' একটি নতুন ডিভাইস থেকে এক্সেস চাইছেন (' || COALESCE(_city, _upazila, _village, _country, 'অজানা লোকেশন') || ')',
      'security',
      '/admin/device-management',
      jsonb_build_object(
        'request_id', _req_id, 'requester_id', _uid, 'device_id', _device_id,
        'location', jsonb_build_object('village', _village, 'upazila', _upazila, 'city', _city, 'country', _country)
      )
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','super_admin');
  EXCEPTION WHEN OTHERS THEN
    -- notifications table may differ; never fail the request
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', _req_id,
    'cooldown_hours', _hours,
    'next_allowed_at', now() + make_interval(hours => _hours)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_device_reregistration(
  text, text, text, text, text, text, text, text, text, double precision, double precision
) TO authenticated;

-- 4. Update approve_device_request to rotate (deactivate the user's other active devices)
CREATE OR REPLACE FUNCTION public.approve_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
  _rotated_count int := 0;
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed', 'status', _r.status);
  END IF;

  -- ROTATE: deactivate the user's other active devices (one-active-device policy on re-registration).
  -- Remove from audit allowlist too so old browsers can't continue.
  WITH rotated AS (
    UPDATE public.user_devices
       SET is_active = false,
           approval_status = 'rotated',
           revoked_at = now()
     WHERE user_id = _r.user_id
       AND device_id <> _r.device_id
       AND is_active = true
    RETURNING device_id
  )
  SELECT count(*) INTO _rotated_count FROM rotated;

  DELETE FROM public.authorized_audit_devices
   WHERE user_id = _r.user_id AND device_id <> _r.device_id;

  -- Activate / register the new device
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
    jsonb_build_object('approved_by', _admin, 'notes', _notes, 'rotated_devices', _rotated_count));

  -- Notify the requester
  BEGIN
    INSERT INTO public.notifications(user_id, title, message, category, link)
    VALUES (_r.user_id,
      'আপনার ডিভাইস অনুমোদিত হয়েছে',
      'আপনার নতুন ডিভাইস থেকে এখন সিস্টেম এক্সেস করতে পারবেন।',
      'security', '/admin');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'request_id', _request_id, 'rotated_devices', _rotated_count);
END;
$$;

-- 5. Notify on reject as well
CREATE OR REPLACE FUNCTION public.reject_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE public.device_approval_requests
  SET status = 'rejected', reviewed_by = _admin, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_r.user_id, 'device_rejected', 'warning', _r.device_id, _r.ip_address,
    jsonb_build_object('rejected_by', _admin, 'notes', _notes));

  BEGIN
    INSERT INTO public.notifications(user_id, title, message, category, link)
    VALUES (_r.user_id,
      'ডিভাইস অনুমোদন প্রত্যাখ্যাত',
      COALESCE('কারণ: ' || _notes, 'আপনার ডিভাইস অনুমোদনের অনুরোধ প্রত্যাখ্যাত হয়েছে।'),
      'security', '/admin');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true);
END;
$$;
