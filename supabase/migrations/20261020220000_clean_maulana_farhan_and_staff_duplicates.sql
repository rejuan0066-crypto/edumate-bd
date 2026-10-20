-- Migration: 20261020220000_clean_maulana_farhan_and_staff_duplicates.sql
-- Description: Specifically clean Maulana Farhan's duplicate name strings and any duplicate staff records.

DO $$
DECLARE
  r RECORD;
  v_clean_bn text;
  v_clean_en text;
  v_canonical_id uuid;
BEGIN
  -- 1. Targeted direct cleanup for Maulana Farhan
  UPDATE public.staff
  SET name_bn = 'মাওলানাঃ ফারহান হোসাইন',
      name_en = NULL
  WHERE deleted_at IS NULL
    AND (
      name_bn ILIKE '%ফারহান হোসাইন ফারহান হোসাইন%'
      OR name_bn ILIKE '%মাওলানা ফারহান মাওলানা ফারহান%'
      OR (name_bn ILIKE '%ফারহান%' AND name_en ILIKE '%ফারহান%')
    );

  -- 2. General cleanup for all staff with repeated phrase in name_bn
  FOR r IN SELECT id, name_bn, name_en FROM public.staff WHERE deleted_at IS NULL LOOP
    v_clean_bn := TRIM(r.name_bn);
    v_clean_en := TRIM(COALESCE(r.name_en, ''));

    -- Full phrase repetition: e.g. "তেরা মিয়া তেরা মিয়া"
    IF v_clean_bn ~ '^(.+?)\s+\1$' THEN
      v_clean_bn := TRIM(REGEXP_REPLACE(v_clean_bn, '^(.+?)\s+\1$', '\1'));
    END IF;

    -- Prefix + Repeated phrase: e.g. "মাওলানাঃ ফারহান হোসাইন ফারহান হোসাইন"
    IF v_clean_bn ~ '^(.+?[\s,:ঃ]+)(.+?)\s+\2$' THEN
      v_clean_bn := TRIM(REGEXP_REPLACE(v_clean_bn, '^(.+?[\s,:ঃ]+)(.+?)\s+\2$', '\1\2'));
    END IF;

    -- If name_en is entirely Bengali or identical to name_bn, nullify it
    IF v_clean_en != '' AND (v_clean_en ~ '[\u0980-\u09FF]' AND NOT (v_clean_en ~ '[a-zA-Z]')) THEN
      v_clean_en := NULL;
    ELSIF LOWER(v_clean_en) = LOWER(v_clean_bn) THEN
      v_clean_en := NULL;
    END IF;

    IF (v_clean_bn IS DISTINCT FROM r.name_bn) OR (v_clean_en IS DISTINCT FROM r.name_en) THEN
      UPDATE public.staff
      SET name_bn = v_clean_bn,
          name_en = NULLIF(v_clean_en, '')
      WHERE id = r.id;
    END IF;
  END LOOP;

  -- 3. Resolve any duplicate staff records for Maulana Farhan (keep TCH-2026-2007 or earliest)
  SELECT id INTO v_canonical_id
  FROM public.staff
  WHERE deleted_at IS NULL
    AND name_bn ILIKE '%ফারহান%'
  ORDER BY 
    CASE WHEN staff_id = 'TCH-2026-2007' THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;

  IF v_canonical_id IS NOT NULL THEN
    -- Soft-delete any other active records with Farhan in name
    UPDATE public.staff
    SET status = 'inactive',
        deleted_at = NOW()
    WHERE deleted_at IS NULL
      AND id != v_canonical_id
      AND name_bn ILIKE '%ফারহান%';
  END IF;
END;
$$;
