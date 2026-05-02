
-- 1) History table
CREATE TABLE IF NOT EXISTS public.device_block_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('block','unblock')),
  reason TEXT NOT NULL,
  notes TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  upazila TEXT,
  village TEXT,
  user_agent TEXT,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_block_history_device
  ON public.device_block_history (device_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_block_history_user
  ON public.device_block_history (user_id, performed_at DESC);

ALTER TABLE public.device_block_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view device block history" ON public.device_block_history;
CREATE POLICY "Admins can view device block history"
  ON public.device_block_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 2) Updated unblock_device: requires reason, logs history
CREATE OR REPLACE FUNCTION public.unblock_device(
  _device_id TEXT,
  _reason TEXT,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  blocked_row public.blocked_devices;
BEGIN
  IF uid IS NULL OR NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'Reason is required (min 5 chars)' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO blocked_row
  FROM public.blocked_devices
  WHERE device_id = _device_id AND is_active = true
  LIMIT 1;

  UPDATE public.blocked_devices
     SET is_active = false,
         unblocked_by = uid,
         unblocked_at = now(),
         notes = COALESCE(_notes, notes)
   WHERE device_id = _device_id AND is_active = true;

  INSERT INTO public.device_block_history (
    device_id, user_id, action, reason, notes,
    ip_address, country, city, upazila, village, user_agent, performed_by
  ) VALUES (
    _device_id,
    blocked_row.user_id,
    'unblock',
    btrim(_reason),
    _notes,
    blocked_row.last_ip,
    blocked_row.last_country,
    blocked_row.last_city,
    blocked_row.last_upazila,
    blocked_row.last_village,
    blocked_row.last_user_agent,
    uid
  );

  INSERT INTO public.security_logs (user_id, event_type, severity, target_id, metadata)
  VALUES (
    uid, 'device_unblocked', 'warn', _device_id,
    jsonb_build_object('action','unblock','reason', btrim(_reason))
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.unblock_device(TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.unblock_device(TEXT, TEXT, TEXT) TO authenticated;

-- Drop the older 1-arg signature if it still exists
DROP FUNCTION IF EXISTS public.unblock_device(TEXT);

-- 3) Hook permanent_block_device to also write history
CREATE OR REPLACE FUNCTION public.permanent_block_device(
  _device_id TEXT,
  _reason TEXT,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  alert_row public.security_alerts;
  target_user UUID;
BEGIN
  IF uid IS NULL OR NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _reason IS NULL OR length(btrim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO alert_row
  FROM public.security_alerts
  WHERE device_id = _device_id
  ORDER BY created_at DESC
  LIMIT 1;

  target_user := alert_row.user_id;

  INSERT INTO public.blocked_devices (
    device_id, user_id, reason, notes,
    last_ip, last_country, last_city, last_upazila, last_village, last_user_agent,
    attempt_count, last_attempt_at, blocked_by, blocked_at, is_active
  ) VALUES (
    _device_id, target_user, btrim(_reason), _notes,
    alert_row.ip_address, alert_row.country, alert_row.city, alert_row.upazila, alert_row.village, alert_row.user_agent,
    1, COALESCE(alert_row.created_at, now()), uid, now(), true
  )
  ON CONFLICT (device_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        notes = COALESCE(EXCLUDED.notes, public.blocked_devices.notes),
        blocked_by = EXCLUDED.blocked_by,
        blocked_at = now(),
        unblocked_by = NULL,
        unblocked_at = NULL,
        is_active = true,
        updated_at = now();

  -- Cascade: deactivate user_devices and remove from audit allowlist + route allowlist
  UPDATE public.user_devices
     SET is_active = false, approval_status = 'blocked', revoked_at = now()
   WHERE device_id = _device_id;

  DELETE FROM public.authorized_audit_devices WHERE device_id = _device_id;
  DELETE FROM public.device_route_allowlist WHERE device_id = _device_id;

  INSERT INTO public.device_block_history (
    device_id, user_id, action, reason, notes,
    ip_address, country, city, upazila, village, user_agent, performed_by
  ) VALUES (
    _device_id, target_user, 'block', btrim(_reason), _notes,
    alert_row.ip_address, alert_row.country, alert_row.city, alert_row.upazila, alert_row.village, alert_row.user_agent, uid
  );

  INSERT INTO public.security_logs (user_id, event_type, severity, target_id, metadata)
  VALUES (
    uid, 'device_blocked', 'warn', _device_id,
    jsonb_build_object('action','block','reason', btrim(_reason))
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.permanent_block_device(TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.permanent_block_device(TEXT, TEXT, TEXT) TO authenticated;

-- 4) Helper to fetch history for a device
CREATE OR REPLACE FUNCTION public.list_device_block_history(_device_id TEXT, _limit INT DEFAULT 50)
RETURNS SETOF public.device_block_history
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.device_block_history
  WHERE device_id = _device_id
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'super_admin'::app_role)
    )
  ORDER BY performed_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
$$;

REVOKE ALL ON FUNCTION public.list_device_block_history(TEXT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.list_device_block_history(TEXT, INT) TO authenticated;
