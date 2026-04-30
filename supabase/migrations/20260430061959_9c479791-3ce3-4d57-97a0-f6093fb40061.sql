-- ============================================================
-- DUPLICATE PREVENTION: staff, administrative_officers, cross-table
-- Clear Bangla error messages: "এই ফোন/ইমেইল/এনআইডি দিয়ে ইতিমধ্যে রেজিস্টার্ড"
-- ============================================================

-- 1) Staff uniqueness trigger (phone, email, nid)
CREATE OR REPLACE FUNCTION public.validate_staff_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Phone duplicate within staff
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE phone = NEW.phone
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- Email duplicate within staff
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE lower(email) = lower(NEW.email)
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_EMAIL: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- NID duplicate within staff
  IF NEW.nid IS NOT NULL AND NEW.nid <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE nid = NEW.nid
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_NID: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- user_id duplicate within staff
  IF NEW.user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE user_id = NEW.user_id
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_USER: এই ইউজার ইতিমধ্যে স্টাফ তালিকায় আছেন।'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_staff_unique ON public.staff;
CREATE TRIGGER trg_validate_staff_unique
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_staff_unique();

-- 2) Extend administrative_officers validator to also check NID + user_id
CREATE OR REPLACE FUNCTION public.validate_admin_officer_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE phone = NEW.phone AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE lower(email) = lower(NEW.email) AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_EMAIL: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.nid IS NOT NULL AND NEW.nid <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE nid = NEW.nid AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_NID: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE user_id = NEW.user_id AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_USER: এই ইউজার ইতিমধ্যে প্রশাসনিক কর্মকর্তা তালিকায় আছেন।'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Cross-table check: same person cannot be in both staff AND administrative_officers
CREATE OR REPLACE FUNCTION public.validate_no_cross_staff_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_other_table TEXT;
  v_match_field TEXT;
  v_match_value TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- When inserting/updating into staff, check administrative_officers
  IF TG_TABLE_NAME = 'staff' THEN
    IF NEW.user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE user_id = NEW.user_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইউজার ইতিমধ্যে প্রশাসনিক কর্মকর্তা তালিকায় রেজিস্টার্ড আছেন। একই ব্যক্তি স্টাফ ও প্রশাসনিক উভয় জায়গায় থাকতে পারবেন না।'
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.phone IS NOT NULL AND NEW.phone <> '' AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE phone = NEW.phone AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.email IS NOT NULL AND NEW.email <> '' AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE lower(email) = lower(NEW.email) AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.nid IS NOT NULL AND NEW.nid <> '' AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE nid = NEW.nid AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- When inserting/updating into administrative_officers, check staff
  IF TG_TABLE_NAME = 'administrative_officers' THEN
    IF NEW.user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE user_id = NEW.user_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইউজার ইতিমধ্যে স্টাফ তালিকায় রেজিস্টার্ড আছেন। একই ব্যক্তি স্টাফ ও প্রশাসনিক উভয় জায়গায় থাকতে পারবেন না।'
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.phone IS NOT NULL AND NEW.phone <> '' AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE phone = NEW.phone AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.email IS NOT NULL AND NEW.email <> '' AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE lower(email) = lower(NEW.email) AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.nid IS NOT NULL AND NEW.nid <> '' AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE nid = NEW.nid AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_cross_staff_admin ON public.staff;
CREATE TRIGGER trg_no_cross_staff_admin
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();

DROP TRIGGER IF EXISTS trg_no_cross_admin_staff ON public.administrative_officers;
CREATE TRIGGER trg_no_cross_admin_staff
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();

-- 4) Profiles duplicate phone check (auth users phone via profiles)
CREATE OR REPLACE FUNCTION public.validate_profile_unique_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE phone = NEW.phone
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_unique_phone ON public.profiles;
CREATE TRIGGER trg_validate_profile_unique_phone
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_unique_phone();