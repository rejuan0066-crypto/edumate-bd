-- 1. Add code column
ALTER TABLE public.administrative_departments
  ADD COLUMN IF NOT EXISTS code text;

-- 2. Backfill: generate code from English name (first 4 letters uppercased), ensure uniqueness with -N suffix
DO $$
DECLARE
  r RECORD;
  v_base TEXT;
  v_try TEXT;
  v_n INT;
BEGIN
  FOR r IN SELECT id, name FROM public.administrative_departments WHERE (code IS NULL OR code = '') LOOP
    v_base := upper(regexp_replace(COALESCE(r.name, 'DEPT'), '[^A-Za-z0-9]', '', 'g'));
    IF length(v_base) < 2 THEN v_base := v_base || 'DPT'; END IF;
    v_base := substr(v_base, 1, 6);
    v_try := v_base;
    v_n := 1;
    WHILE EXISTS (SELECT 1 FROM public.administrative_departments WHERE upper(code) = upper(v_try) AND id <> r.id) LOOP
      v_n := v_n + 1;
      v_try := substr(v_base, 1, 5) || v_n::text;
    END LOOP;
    UPDATE public.administrative_departments SET code = v_try WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Unique index on code (case-insensitive, active rows only)
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_dept_code_active
  ON public.administrative_departments (upper(code))
  WHERE deleted_at IS NULL;

-- 4. Update validation trigger to enforce code rules
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
  NEW.code := upper(NULLIF(TRIM(NEW.code), ''));

  -- Required
  IF NEW.name IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের ইংরেজি নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;
  IF NEW.name_bn IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের বাংলা নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;
  IF NEW.code IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের কোড আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Code format: 2-10 chars, A-Z 0-9 only
  IF NEW.code !~ '^[A-Z0-9]{2,10}$' THEN
    RAISE EXCEPTION 'INVALID_DEPT_CODE: কোড অবশ্যই ২-১০ অক্ষরের ইংরেজি অক্ষর/সংখ্যা হতে হবে (যেমন: ACC, IT01)।'
      USING ERRCODE = 'check_violation';
  END IF;

  -- English name uniqueness
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name) = lower(NEW.name) AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME: এই ইংরেজি নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Bangla name uniqueness
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name_bn) = lower(NEW.name_bn) AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME_BN: এই বাংলা নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name_bn
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Code uniqueness
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE upper(code) = upper(NEW.code) AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_CODE: এই কোড (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.code
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;