-- 1) Seed settings (idempotent)
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('receipt_qr_ttl_days', '365'::jsonb, 'Receipt QR validity in days. Tokens older than this are considered expired and auto-rotated on next request.'),
  ('receipt_qr_auto_rotate', 'true'::jsonb, 'When true, expired/aged-out QR tokens are automatically replaced on next request.')
ON CONFLICT (key) DO NOTHING;

-- 2) Replace get_or_create_receipt_token to honor TTL + auto-rotate
CREATE OR REPLACE FUNCTION public.get_or_create_receipt_token(
  _receipt_type text,
  _receipt_id   uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _token        text;
  _row          public.receipt_verify_tokens%ROWTYPE;
  _ttl_days     int;
  _auto_rotate  boolean;
BEGIN
  IF _receipt_type NOT IN ('fee_payment', 'parent_payment_request', 'donation', 'salary') THEN
    RAISE EXCEPTION 'Invalid receipt_type';
  END IF;

  -- Read settings with safe defaults
  SELECT COALESCE(NULLIF(value::text, 'null')::int, 365)
    INTO _ttl_days
    FROM public.app_settings WHERE key = 'receipt_qr_ttl_days';
  IF _ttl_days IS NULL THEN _ttl_days := 365; END IF;

  SELECT COALESCE((value)::boolean, true)
    INTO _auto_rotate
    FROM public.app_settings WHERE key = 'receipt_qr_auto_rotate';
  IF _auto_rotate IS NULL THEN _auto_rotate := true; END IF;

  -- Find latest active token for this receipt
  SELECT * INTO _row
  FROM public.receipt_verify_tokens
  WHERE receipt_type = _receipt_type
    AND receipt_id = _receipt_id
    AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Active and within TTL -> return it
    IF (_row.expires_at IS NULL OR _row.expires_at > now())
       AND _row.created_at + make_interval(days => _ttl_days) > now() THEN
      RETURN _row.token;
    END IF;

    -- Aged-out / expired
    IF NOT _auto_rotate THEN
      -- Caller wants no rotation: still return the (now stale) token; verify will say EXPIRED
      RETURN _row.token;
    END IF;

    -- Auto-rotate: revoke the old one
    UPDATE public.receipt_verify_tokens
       SET revoked_at = now()
     WHERE id = _row.id AND revoked_at IS NULL;
  END IF;

  -- Issue a fresh token
  _token := encode(gen_random_bytes(24), 'base64');
  _token := replace(replace(replace(_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.receipt_verify_tokens (token, receipt_type, receipt_id, expires_at)
  VALUES (_token, _receipt_type, _receipt_id, now() + make_interval(days => _ttl_days));

  RETURN _token;
END;
$function$;

-- 3) Manual rotation (admin / accounts staff only)
CREATE OR REPLACE FUNCTION public.rotate_receipt_token(
  _receipt_type text,
  _receipt_id   uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _token    text;
  _ttl_days int;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF _receipt_type NOT IN ('fee_payment', 'parent_payment_request', 'donation', 'salary') THEN
    RAISE EXCEPTION 'Invalid receipt_type';
  END IF;

  SELECT COALESCE(NULLIF(value::text, 'null')::int, 365)
    INTO _ttl_days
    FROM public.app_settings WHERE key = 'receipt_qr_ttl_days';
  IF _ttl_days IS NULL THEN _ttl_days := 365; END IF;

  -- Revoke any active tokens for this receipt
  UPDATE public.receipt_verify_tokens
     SET revoked_at = now()
   WHERE receipt_type = _receipt_type
     AND receipt_id   = _receipt_id
     AND revoked_at IS NULL;

  _token := encode(gen_random_bytes(24), 'base64');
  _token := replace(replace(replace(_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.receipt_verify_tokens (token, receipt_type, receipt_id, expires_at)
  VALUES (_token, _receipt_type, _receipt_id, now() + make_interval(days => _ttl_days));

  RETURN _token;
END;
$function$;

REVOKE ALL ON FUNCTION public.rotate_receipt_token(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rotate_receipt_token(text, uuid) TO authenticated;