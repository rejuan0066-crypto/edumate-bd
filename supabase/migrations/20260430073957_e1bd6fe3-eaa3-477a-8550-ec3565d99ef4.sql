-- 1) Department validation: required + uniqueness on English name + trim
CREATE OR REPLACE FUNCTION public.validate_administrative_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Trim
  NEW.name := NULLIF(TRIM(NEW.name), '');
  NEW.name_bn := NULLIF(TRIM(NEW.name_bn), '');

  -- Required
  IF NEW.name IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের ইংরেজি নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;
  IF NEW.name_bn IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের বাংলা নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Case-insensitive uniqueness on English name (active rows)
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name) = lower(NEW.name)
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME: এই ইংরেজি নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Case-insensitive uniqueness on Bangla name (active rows) — backstop the partial unique index
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name_bn) = lower(NEW.name_bn)
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME_BN: এই বাংলা নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name_bn
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_admin_department ON public.administrative_departments;
CREATE TRIGGER trg_validate_admin_department
  BEFORE INSERT OR UPDATE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.validate_administrative_department();

-- Add case-insensitive unique index on English name (active rows) to mirror name_bn
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_dept_name_active
  ON public.administrative_departments (lower(name))
  WHERE deleted_at IS NULL;


-- 2) Officer field validation: required name_bn + format checks + department reference
CREATE OR REPLACE FUNCTION public.validate_admin_officer_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Trim string fields
  NEW.name_bn := NULLIF(TRIM(NEW.name_bn), '');
  NEW.name_en := NULLIF(TRIM(NEW.name_en), '');
  NEW.phone := NULLIF(TRIM(NEW.phone), '');
  NEW.email := NULLIF(TRIM(NEW.email), '');
  NEW.nid := NULLIF(TRIM(NEW.nid), '');
  NEW.department := NULLIF(TRIM(NEW.department), '');

  -- Required: name_bn
  IF NEW.name_bn IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: কর্মকর্তার বাংলা নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Phone format (BD: 11 digits starting with 01[3-9])
  IF NEW.phone IS NOT NULL THEN
    v_digits := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
    IF length(v_digits) <> 11 OR v_digits !~ '^01[3-9][0-9]{8}$' THEN
      RAISE EXCEPTION 'INVALID_PHONE: সঠিক মোবাইল নম্বর দিন (১১ অঙ্কের, 01 দিয়ে শুরু)।'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.phone := v_digits;
  END IF;

  -- Email format
  IF NEW.email IS NOT NULL THEN
    IF NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'INVALID_EMAIL: সঠিক ইমেইল ঠিকানা দিন।'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.email := lower(NEW.email);
  END IF;

  -- NID length: 10, 13, or 17 digits
  IF NEW.nid IS NOT NULL THEN
    v_digits := regexp_replace(NEW.nid, '[^0-9]', '', 'g');
    IF length(v_digits) NOT IN (10, 13, 17) THEN
      RAISE EXCEPTION 'INVALID_NID: এনআইডি ১০, ১৩ অথবা ১৭ অঙ্কের হতে হবে।'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.nid := v_digits;
  END IF;

  -- Department reference: must exist in administrative_departments (case-insensitive name OR name_bn)
  IF NEW.department IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.administrative_departments
      WHERE deleted_at IS NULL
        AND COALESCE(is_active, true) = true
        AND (lower(name) = lower(NEW.department) OR lower(name_bn) = lower(NEW.department))
    ) THEN
      RAISE EXCEPTION 'INVALID_DEPARTMENT: "%" নামে কোনো সক্রিয় বিভাগ পাওয়া যায়নি।', NEW.department
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_admin_officer_fields ON public.administrative_officers;
CREATE TRIGGER trg_validate_admin_officer_fields
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_fields();

-- Attach existing uniqueness validators to officers (they exist as functions but weren't attached)
DROP TRIGGER IF EXISTS trg_validate_admin_officer_unique ON public.administrative_officers;
CREATE TRIGGER trg_validate_admin_officer_unique
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_unique();

DROP TRIGGER IF EXISTS trg_validate_no_cross_staff_admin_officers ON public.administrative_officers;
CREATE TRIGGER trg_validate_no_cross_staff_admin_officers
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();

-- Also ensure the same cross-table trigger exists on staff (mirror)
DROP TRIGGER IF EXISTS trg_validate_no_cross_staff_admin_staff ON public.staff;
CREATE TRIGGER trg_validate_no_cross_staff_admin_staff
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();