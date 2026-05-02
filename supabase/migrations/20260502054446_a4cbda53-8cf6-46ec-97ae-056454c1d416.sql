
-- ============================================================
-- 1) blocked_devices: permanent blocklist
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocked_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  reason TEXT NOT NULL,
  last_ip TEXT,
  last_country TEXT,
  last_city TEXT,
  last_upazila TEXT,
  last_village TEXT,
  last_user_agent TEXT,
  attempt_count INT NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_by UUID,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unblocked_by UUID,
  unblocked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_devices_active
  ON public.blocked_devices (device_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blocked_devices_user ON public.blocked_devices (user_id);

ALTER TABLE public.blocked_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read blocked devices"
  ON public.blocked_devices FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_blocked_devices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_blocked_devices_updated_at
  BEFORE UPDATE ON public.blocked_devices
  FOR EACH ROW EXECUTE FUNCTION public.tg_blocked_devices_updated_at();

-- ============================================================
-- 2) device_route_allowlist: per-route approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.device_route_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  route_path TEXT NOT NULL,
  user_id UUID,
  approved_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, route_path)
);

CREATE INDEX IF NOT EXISTS idx_device_route_allowlist_lookup
  ON public.device_route_allowlist (device_id, route_path) WHERE is_active = true;

ALTER TABLE public.device_route_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read route allowlist"
  ON public.device_route_allowlist FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_device_route_allowlist_updated_at
  BEFORE UPDATE ON public.device_route_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.tg_blocked_devices_updated_at();

-- ============================================================
-- 3) Updated verify_audit_device: respects blocklist + route allowlist
-- ============================================================
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
  blocked_row public.blocked_devices;
  route_row public.device_route_allowlist;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Hard block: blocklisted devices never pass
  SELECT * INTO blocked_row
  FROM public.blocked_devices
  WHERE device_id = _device_id AND is_active = true
  LIMIT 1;

  IF blocked_row.id IS NOT NULL THEN
    UPDATE public.blocked_devices
       SET attempt_count = attempt_count + 1,
           last_attempt_at = now(),
           last_ip = COALESCE(_ip, last_ip),
           last_user_agent = COALESCE(_user_agent, last_user_agent)
     WHERE id = blocked_row.id;

    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, ip_address, user_agent, endpoint, details
    ) VALUES (
      uid, 'blocked_device_attempt', 'critical',
      _device_id, _ip, _user_agent, _endpoint,
      jsonb_build_object('reason', blocked_row.reason)
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'device_blocked', 'block_reason', blocked_row.reason);
  END IF;

  -- Step 1: per-user device binding
  base_check := public.verify_user_device(_device_id, _ip, _user_agent, _endpoint);
  IF NOT (base_check->>'ok')::boolean THEN
    RETURN base_check;
  END IF;

  -- Step 2a: full audit allowlist
  SELECT * INTO allow_row
  FROM public.authorized_audit_devices
  WHERE device_id = _device_id
    AND is_active = true
    AND (user_id IS NULL OR user_id = uid)
  LIMIT 1;

  IF allow_row.id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'audit_allowlisted', 'device_id', _device_id);
  END IF;

  -- Step 2b: route-specific allowlist (when an endpoint/path is supplied)
  IF _endpoint IS NOT NULL THEN
    SELECT * INTO route_row
    FROM public.device_route_allowlist
    WHERE device_id = _device_id
      AND is_active = true
      AND (user_id IS NULL OR user_id = uid)
      AND (
        route_path = _endpoint
        OR _endpoint LIKE route_path || '%'
      )
    LIMIT 1;

    IF route_row.id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'reason', 'route_allowlisted', 'device_id', _device_id, 'route', route_row.route_path);
    END IF;
  END IF;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, ip_address, user_agent, endpoint, details
  ) VALUES (
    uid, 'audit_device_not_allowlisted', 'critical',
    _device_id, _ip, _user_agent, _endpoint,
    jsonb_build_object('reason', 'device not on authorized_audit_devices allowlist')
  );
  RETURN jsonb_build_object('ok', false, 'reason', 'audit_device_not_allowlisted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_audit_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 4) RPC: list blocked-device candidates (auto-flagged + actually blocked)
--    Aggregates security_alerts that look like 403/device-deny events,
--    joined with blocked_devices status.
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_blocked_device_attempts(
  _search TEXT DEFAULT NULL,
  _only_blocked BOOLEAN DEFAULT false,
  _limit INT DEFAULT 200
) RETURNS TABLE (
  device_id TEXT,
  user_id UUID,
  reason TEXT,
  alert_type TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  upazila TEXT,
  village TEXT,
  attempt_count BIGINT,
  last_attempt_at TIMESTAMPTZ,
  is_blocked BOOLEAN,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  user_agent TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH alerts_agg AS (
    SELECT
      sa.device_id,
      MAX(sa.user_id) AS user_id,
      MAX(sa.alert_type) AS alert_type,
      COUNT(*) AS attempt_count,
      MAX(sa.created_at) AS last_attempt_at,
      (ARRAY_AGG(sa.ip_address ORDER BY sa.created_at DESC) FILTER (WHERE sa.ip_address IS NOT NULL))[1] AS ip_address,
      (ARRAY_AGG(sa.user_agent ORDER BY sa.created_at DESC) FILTER (WHERE sa.user_agent IS NOT NULL))[1] AS user_agent
    FROM public.security_alerts sa
    WHERE sa.device_id IS NOT NULL
      AND sa.alert_type IN (
        'device_mismatch','unknown_device','revoked_device','missing_device_header',
        'audit_device_not_allowlisted','blocked_device_attempt'
      )
    GROUP BY sa.device_id
  ),
  loc AS (
    SELECT DISTINCT ON (ud.device_id)
      ud.device_id, ud.country, ud.city, ud.upazila, ud.village
    FROM public.user_devices ud
    ORDER BY ud.device_id, ud.last_seen_at DESC NULLS LAST
  )
  SELECT
    a.device_id,
    a.user_id,
    CASE
      WHEN bd.id IS NOT NULL THEN bd.reason
      WHEN a.alert_type = 'device_mismatch' THEN 'Device Mismatch'
      WHEN a.alert_type = 'unknown_device' THEN 'Unknown Device'
      WHEN a.alert_type = 'revoked_device' THEN 'Revoked Device'
      WHEN a.alert_type = 'missing_device_header' THEN 'Missing Device Header'
      WHEN a.alert_type = 'audit_device_not_allowlisted' THEN 'Unauthorized Audit Route Access'
      WHEN a.alert_type = 'blocked_device_attempt' THEN 'Blocked Device Attempt'
      ELSE a.alert_type
    END AS reason,
    a.alert_type,
    a.ip_address,
    loc.country, loc.city, loc.upazila, loc.village,
    a.attempt_count,
    a.last_attempt_at,
    (bd.id IS NOT NULL) AS is_blocked,
    bd.reason AS blocked_reason,
    bd.blocked_at,
    a.user_agent
  FROM alerts_agg a
  LEFT JOIN public.blocked_devices bd ON bd.device_id = a.device_id AND bd.is_active = true
  LEFT JOIN loc ON loc.device_id = a.device_id
  WHERE
    (NOT _only_blocked OR bd.id IS NOT NULL)
    AND (
      _search IS NULL OR _search = ''
      OR a.device_id ILIKE '%' || _search || '%'
      OR COALESCE(a.ip_address,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.city,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.upazila,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.village,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.country,'') ILIKE '%' || _search || '%'
    )
  ORDER BY a.last_attempt_at DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_blocked_device_attempts(TEXT, BOOLEAN, INT) TO authenticated;

-- ============================================================
-- 5) RPC: permanent_block_device
-- ============================================================
CREATE OR REPLACE FUNCTION public.permanent_block_device(
  _device_id TEXT,
  _reason TEXT,
  _notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  loc RECORD;
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    RAISE EXCEPTION 'device_id required';
  END IF;

  SELECT ud.user_id, ud.last_ip, ud.country, ud.city, ud.upazila, ud.village, ud.user_agent
    INTO loc
    FROM public.user_devices ud
    WHERE ud.device_id = _device_id
    ORDER BY ud.last_seen_at DESC NULLS LAST
    LIMIT 1;

  INSERT INTO public.blocked_devices (
    device_id, user_id, reason, notes,
    last_ip, last_country, last_city, last_upazila, last_village, last_user_agent,
    blocked_by
  ) VALUES (
    _device_id, loc.user_id, _reason, _notes,
    loc.last_ip, loc.country, loc.city, loc.upazila, loc.village, loc.user_agent,
    uid
  )
  ON CONFLICT (device_id) DO UPDATE
    SET is_active = true,
        reason = EXCLUDED.reason,
        notes = COALESCE(EXCLUDED.notes, public.blocked_devices.notes),
        blocked_by = uid,
        blocked_at = now(),
        unblocked_by = NULL,
        unblocked_at = NULL,
        updated_at = now();

  -- Cascade: deactivate user_devices + remove from audit allowlist + remove route grants
  UPDATE public.user_devices
     SET is_active = false, revoked_at = now(), approval_status = 'blocked'
   WHERE device_id = _device_id AND is_active = true;

  UPDATE public.authorized_audit_devices
     SET is_active = false, revoked_at = now(), revoked_by = uid
   WHERE device_id = _device_id AND is_active = true;

  UPDATE public.device_route_allowlist
     SET is_active = false
   WHERE device_id = _device_id AND is_active = true;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, details
  ) VALUES (
    uid, 'device_permanently_blocked', 'critical', _device_id,
    jsonb_build_object('reason', _reason, 'notes', _notes)
  );

  RETURN jsonb_build_object('ok', true, 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.permanent_block_device(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 6) RPC: unblock_device
-- ============================================================
CREATE OR REPLACE FUNCTION public.unblock_device(
  _device_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.blocked_devices
     SET is_active = false,
         unblocked_by = uid,
         unblocked_at = now(),
         updated_at = now()
   WHERE device_id = _device_id AND is_active = true;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, details
  ) VALUES (
    uid, 'device_unblocked', 'warn', _device_id,
    jsonb_build_object('action', 'unblock')
  );

  RETURN jsonb_build_object('ok', true, 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unblock_device(TEXT) TO authenticated;

-- ============================================================
-- 7) RPC: approve_device_for_routes
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_device_for_routes(
  _device_id TEXT,
  _routes TEXT[],
  _notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  r TEXT;
  target_user UUID;
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _routes IS NULL OR array_length(_routes, 1) IS NULL THEN
    RAISE EXCEPTION 'routes required';
  END IF;

  SELECT ud.user_id INTO target_user
    FROM public.user_devices ud
    WHERE ud.device_id = _device_id
    ORDER BY ud.last_seen_at DESC NULLS LAST
    LIMIT 1;

  FOREACH r IN ARRAY _routes LOOP
    INSERT INTO public.device_route_allowlist (device_id, route_path, user_id, approved_by, notes)
    VALUES (_device_id, r, target_user, uid, _notes)
    ON CONFLICT (device_id, route_path) DO UPDATE
      SET is_active = true,
          approved_by = uid,
          notes = COALESCE(EXCLUDED.notes, public.device_route_allowlist.notes),
          updated_at = now();
  END LOOP;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, details
  ) VALUES (
    uid, 'device_route_approved', 'info', _device_id,
    jsonb_build_object('routes', _routes)
  );

  -- Notify the staff
  IF target_user IS NOT NULL THEN
    notif_title := 'ডিভাইস অনুমোদিত';
    notif_body := 'আপনার ডিভাইসটি নির্দিষ্ট রুটের জন্য অনুমোদন করা হয়েছে: ' || array_to_string(_routes, ', ');
    BEGIN
      INSERT INTO public.notifications (user_id, title, body, category, link)
      VALUES (target_user, notif_title, notif_body, 'security', '/admin');
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'routes', _routes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_device_for_routes(TEXT, TEXT[], TEXT) TO authenticated;

-- ============================================================
-- 8) RPC: revoke_device_route_approval
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_device_route_approval(
  _device_id TEXT,
  _route_path TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.device_route_allowlist
     SET is_active = false, updated_at = now()
   WHERE device_id = _device_id AND route_path = _route_path AND is_active = true;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_device_route_approval(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 9) RPC: list per-device active route approvals (helper for UI)
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_device_route_approvals(_device_id TEXT)
RETURNS TABLE (route_path TEXT, approved_by UUID, created_at TIMESTAMPTZ, notes TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT dra.route_path, dra.approved_by, dra.created_at, dra.notes
    FROM public.device_route_allowlist dra
   WHERE dra.device_id = _device_id AND dra.is_active = true
   ORDER BY dra.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_device_route_approvals(TEXT) TO authenticated;
