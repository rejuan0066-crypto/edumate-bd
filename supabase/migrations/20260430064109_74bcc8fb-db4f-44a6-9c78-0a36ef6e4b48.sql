-- Atomic pre-validation + advisory locking for user creation race conditions
CREATE OR REPLACE FUNCTION public.acquire_user_create_lock(_email text, _phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_key bigint;
  v_phone_key bigint;
BEGIN
  -- Use hashtext to derive bigint keys for advisory locks (transaction-scoped)
  IF _email IS NOT NULL AND _email <> '' THEN
    v_email_key := hashtext('user_create_email:' || lower(_email));
    PERFORM pg_advisory_xact_lock(v_email_key);
  END IF;
  IF _phone IS NOT NULL AND _phone <> '' THEN
    v_phone_key := hashtext('user_create_phone:' || _phone);
    PERFORM pg_advisory_xact_lock(v_phone_key);
  END IF;
END;
$$;

-- Atomic duplicate check across profiles, staff, and administrative_officers
CREATE OR REPLACE FUNCTION public.check_user_duplicates(_email text, _phone text, _full_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lower_email text := lower(COALESCE(_email, ''));
  v_phone text := COALESCE(_phone, '');
  v_name text := COALESCE(_full_name, '');
BEGIN
  -- Email check across staff & administrative_officers (auth.users is checked in edge fn)
  IF v_lower_email <> '' THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_STAFF',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_ADMIN',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
  END IF;

  IF v_phone <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.staff WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_STAFF',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_ADMIN',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
  END IF;

  IF v_name <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(full_name) = lower(v_name)) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NAME',
        'message_bn', 'এই নামে একজন ইউজার ইতিমধ্যে আছেন।');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_user_create_lock(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_user_duplicates(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_user_create_lock(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_duplicates(text, text, text) TO service_role;