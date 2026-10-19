-- Migration: 20261019210000_cleanup_and_prevent_duplicate_staff_names.sql
-- Description: Clean up existing duplicate and mixed staff names, and add BEFORE INSERT/UPDATE trigger to prevent future duplication.

-- 1. Helper function to sanitize a staff name record
CREATE OR REPLACE FUNCTION public.sanitize_staff_name(
  p_name_bn text,
  p_name_en text
)
RETURNS TABLE(out_name_bn text, out_name_en text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_bn text := TRIM(COALESCE(p_name_bn, ''));
  v_en text := TRIM(COALESCE(p_name_en, ''));
  v_has_bn boolean;
  v_has_en boolean;
  v_clean_bn text;
  v_clean_en text;
BEGIN
  -- If both empty
  IF v_bn = '' AND v_en = '' THEN
    RETURN QUERY SELECT ''::text, NULL::text;
    RETURN;
  END IF;

  -- Check scripts in v_bn
  v_has_bn := (v_bn ~ '[\u0980-\u09FF]');
  v_has_en := (v_bn ~ '[a-zA-Z]');

  -- If v_bn has both Bengali and English mixed together
  -- e.g. 'হাফিজ আব্দুল কাদির তানজিদ Hafiz Abdul Kadir Tanjid'
  IF v_has_bn AND v_has_en THEN
    v_clean_bn := TRIM(REGEXP_REPLACE(REGEXP_REPLACE(v_bn, '[a-zA-Z0-9]', '', 'g'), '\s+', ' ', 'g'));
    v_clean_en := TRIM(REGEXP_REPLACE(REGEXP_REPLACE(v_bn, '[\u0980-\u09FF]', '', 'g'), '\s+', ' ', 'g'));
  ELSE
    v_clean_bn := v_bn;
    v_clean_en := v_en;
  END IF;

  -- Check if v_clean_en also had both scripts
  IF v_clean_en ~ '[\u0980-\u09FF]' AND v_clean_en ~ '[a-zA-Z]' THEN
    v_clean_en := TRIM(REGEXP_REPLACE(REGEXP_REPLACE(v_clean_en, '[\u0980-\u09FF]', '', 'g'), '\s+', ' ', 'g'));
  END IF;

  -- If v_clean_en equals v_clean_bn, or if v_clean_en is in Bengali script without English
  IF LOWER(v_clean_en) = LOWER(v_clean_bn) OR (v_clean_en ~ '[\u0980-\u09FF]' AND NOT (v_clean_en ~ '[a-zA-Z]')) THEN
    v_clean_en := NULL;
  END IF;

  -- Deduplicate repeated words in v_clean_bn if string repeats itself:
  -- E.g. 'তেরা মিয়া তেরা মিয়া'
  IF v_clean_bn ~ '^(.+?)\s+\1$' THEN
    v_clean_bn := TRIM(REGEXP_REPLACE(v_clean_bn, '^(.+?)\s+\1$', '\1'));
  END IF;

  IF v_clean_en IS NOT NULL AND v_clean_en ~ '^(.+?)\s+\1$' THEN
    v_clean_en := TRIM(REGEXP_REPLACE(v_clean_en, '^(.+?)\s+\1$', '\1'));
  END IF;

  IF NULLIF(v_clean_en, '') IS NULL THEN
    v_clean_en := NULL;
  END IF;

  RETURN QUERY SELECT v_clean_bn, v_clean_en;
END;
$$;

-- 2. Trigger function for public.staff
CREATE OR REPLACE FUNCTION public.trg_fn_sanitize_staff_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT out_name_bn, out_name_en
  INTO v_rec
  FROM public.sanitize_staff_name(NEW.name_bn, NEW.name_en);

  IF v_rec.out_name_bn IS NOT NULL AND v_rec.out_name_bn != '' THEN
    NEW.name_bn := v_rec.out_name_bn;
  END IF;

  NEW.name_en := v_rec.out_name_en;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_staff_name ON public.staff;
CREATE TRIGGER trg_sanitize_staff_name
BEFORE INSERT OR UPDATE OF name_bn, name_en ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_sanitize_staff_name();

-- 3. One-time update of existing staff records
DO $$
DECLARE
  r RECORD;
  v_clean RECORD;
BEGIN
  FOR r IN SELECT id, name_bn, name_en FROM public.staff WHERE deleted_at IS NULL LOOP
    SELECT out_name_bn, out_name_en
    INTO v_clean
    FROM public.sanitize_staff_name(r.name_bn, r.name_en);

    IF (v_clean.out_name_bn IS DISTINCT FROM r.name_bn) OR (v_clean.out_name_en IS DISTINCT FROM r.name_en) THEN
      UPDATE public.staff
      SET name_bn = COALESCE(v_clean.out_name_bn, r.name_bn),
          name_en = v_clean.out_name_en
      WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;
