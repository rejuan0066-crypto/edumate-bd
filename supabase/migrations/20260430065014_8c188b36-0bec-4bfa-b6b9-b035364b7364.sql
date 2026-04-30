-- Timeout-aware advisory lock for user creation (transaction-scoped)
CREATE OR REPLACE FUNCTION public.acquire_user_create_lock(
  _email text,
  _phone text,
  _timeout_ms integer DEFAULT 2000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_key bigint;
  v_phone_key bigint;
  v_email_locked boolean := true;
  v_phone_locked boolean := true;
  v_started timestamptz := clock_timestamp();
  v_deadline timestamptz;
BEGIN
  v_deadline := v_started + make_interval(secs => GREATEST(_timeout_ms, 0) / 1000.0);

  IF _email IS NOT NULL AND _email <> '' THEN
    v_email_key := hashtext('user_create_email:' || lower(_email));
    v_email_locked := false;
    LOOP
      IF pg_try_advisory_xact_lock(v_email_key) THEN
        v_email_locked := true;
        EXIT;
      END IF;
      IF clock_timestamp() >= v_deadline THEN EXIT; END IF;
      PERFORM pg_sleep(0.05); -- 50ms
    END LOOP;
    IF NOT v_email_locked THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'LOCK_TIMEOUT', 'resource', 'email',
        'waited_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int
      );
    END IF;
  END IF;

  IF _phone IS NOT NULL AND _phone <> '' THEN
    v_phone_key := hashtext('user_create_phone:' || _phone);
    v_phone_locked := false;
    LOOP
      IF pg_try_advisory_xact_lock(v_phone_key) THEN
        v_phone_locked := true;
        EXIT;
      END IF;
      IF clock_timestamp() >= v_deadline THEN EXIT; END IF;
      PERFORM pg_sleep(0.05);
    END LOOP;
    IF NOT v_phone_locked THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'LOCK_TIMEOUT', 'resource', 'phone',
        'waited_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'waited_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int
  );
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_user_create_lock(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_user_create_lock(text, text, integer) TO service_role;