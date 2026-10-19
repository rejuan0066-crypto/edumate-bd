-- Migration: 20261019213000_cleanup_staff_bangla_in_english_field.sql
-- Description: Clean up staff records where Bengali was saved into English name fields (name_en or staff_data->>'last_name').

DO $$
DECLARE
  r RECORD;
  v_bn text;
  v_en text;
  v_last_name text;
BEGIN
  FOR r IN SELECT id, name_bn, name_en, staff_data FROM public.staff WHERE deleted_at IS NULL LOOP
    v_bn := r.name_bn;
    v_en := r.name_en;
    v_last_name := r.staff_data->>'last_name';

    -- 1. If name_en contains only Bengali and no English, nullify it
    IF v_en IS NOT NULL AND v_en ~ '[\u0980-\u09FF]' AND NOT (v_en ~ '[a-zA-Z]') THEN
      v_en := NULL;
    END IF;

    -- 2. Deduplicate repeated suffix in name_bn (e.g. "মাওলানাঃ ফারহান হোসাইন ফারহান হোসাইন")
    IF v_bn IS NOT NULL AND v_bn ~ '(.+?)\s+(.+?)\s+\2$' THEN
      v_bn := REGEXP_REPLACE(v_bn, '(.+?)\s+(.+?)\s+\2$', '\1 \2');
    END IF;

    -- 3. If staff_data has last_name with only Bengali and no English, clear it
    IF v_last_name IS NOT NULL AND v_last_name ~ '[\u0980-\u09FF]' AND NOT (v_last_name ~ '[a-zA-Z]') THEN
      UPDATE public.staff
      SET name_bn = COALESCE(v_bn, name_bn),
          name_en = v_en,
          staff_data = jsonb_set(COALESCE(staff_data, '{}'::jsonb), '{last_name}', '""'::jsonb)
      WHERE id = r.id;
    ELSE
      IF (v_bn IS DISTINCT FROM r.name_bn) OR (v_en IS DISTINCT FROM r.name_en) THEN
        UPDATE public.staff
        SET name_bn = COALESCE(v_bn, name_bn),
            name_en = v_en
        WHERE id = r.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;
