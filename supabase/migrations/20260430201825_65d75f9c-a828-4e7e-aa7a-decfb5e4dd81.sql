-- Trigger: prevent duplicate NID in staff (case-insensitive, ignoring soft-deleted)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_staff_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check staff table
  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(nid) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Cross-check: administrative_officers
  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_staff_nid ON public.staff;
CREATE TRIGGER trg_prevent_duplicate_staff_nid
BEFORE INSERT OR UPDATE OF nid ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_staff_nid();

-- Same protection on administrative_officers (cross-check both ways)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_admin_officer_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_admin_officer_nid ON public.administrative_officers;
CREATE TRIGGER trg_prevent_duplicate_admin_officer_nid
BEFORE INSERT OR UPDATE OF nid ON public.administrative_officers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_admin_officer_nid();

-- Extend check_user_duplicates() to also check NID
CREATE OR REPLACE FUNCTION public.check_user_duplicates(
  _email text,
  _phone text,
  _full_name text,
  _nid text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lower_email text := lower(COALESCE(_email, ''));
  v_phone text := COALESCE(_phone, '');
  v_name text := COALESCE(_full_name, '');
  v_nid text := NULLIF(TRIM(COALESCE(_nid, '')), '');
BEGIN
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

  IF v_nid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_STAFF',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_ADMIN',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
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
$function$;