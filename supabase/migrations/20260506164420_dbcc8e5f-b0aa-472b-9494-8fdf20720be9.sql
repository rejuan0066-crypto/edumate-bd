CREATE OR REPLACE FUNCTION public.check_user_duplicates(_email text, _phone text, _full_name text, _nid text DEFAULT NULL::text)
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
    IF EXISTS (SELECT 1 FROM public.parent_accounts WHERE lower(email) = v_lower_email) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_PARENT',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন অভিভাবক অ্যাকাউন্ট আছে।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.student_accounts WHERE lower(contact) = v_lower_email) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_STUDENT',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন ছাত্র অ্যাকাউন্ট আছে।');
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
    IF EXISTS (SELECT 1 FROM public.parent_accounts WHERE phone = v_phone) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_PARENT',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন অভিভাবক অ্যাকাউন্ট আছে।');
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
    IF EXISTS (SELECT 1 FROM public.parent_accounts WHERE TRIM(COALESCE(nid, '')) = v_nid) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_PARENT',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন অভিভাবক অ্যাকাউন্ট আছে।');
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