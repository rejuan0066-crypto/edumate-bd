-- Migration: restore_staff_id_year_format
-- Restores the standard [PREFIX]-[YEAR]-[SERIAL] format for all staff categories (teacher, general, support, chef, administrative, administrative_officer)
-- and migrates any existing IDs that were generated without the year (e.g. TCH-2017 -> TCH-2026-2017).

-- 1. Ensure table defaults include year and reset yearly
ALTER TABLE public.id_format_config ALTER COLUMN include_year SET DEFAULT true;
ALTER TABLE public.id_format_config ALTER COLUMN reset_mode SET DEFAULT 'yearly';

-- 2. Update all existing id_format_config rows for staff entities
UPDATE public.id_format_config
SET include_year = true,
    reset_mode = 'yearly',
    updated_at = now()
WHERE entity_key IN ('teacher', 'general', 'support', 'chef', 'administrative', 'administrative_officer');

-- 3. Update staff ID generator function
CREATE OR REPLACE FUNCTION public.generate_staff_id(p_category_key text, p_joining_year integer DEFAULT NULL::integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.id_format_config%ROWTYPE;
  v_year INTEGER;
  v_max INTEGER;
  v_next INTEGER;
  v_id TEXT;
  v_prefix_pattern TEXT;
BEGIN
  SELECT * INTO c FROM public.id_format_config WHERE entity_key = p_category_key FOR UPDATE;
  IF NOT FOUND THEN
    -- fallback to legacy staff_categories config if id_format_config row missing
    INSERT INTO public.id_format_config(entity_key, label, prefix, start_serial, include_year, reset_mode)
    SELECT key, COALESCE(name_bn, name, key), COALESCE(id_prefix, 'STF'), COALESCE(id_start_range, 1001), true, 'yearly'
      FROM public.staff_categories WHERE key = p_category_key
    RETURNING * INTO c;
    IF c.entity_key IS NULL THEN
      RAISE EXCEPTION 'No ID format configured for category: %', p_category_key;
    END IF;
  END IF;

  v_year := COALESCE(p_joining_year, EXTRACT(YEAR FROM now())::INTEGER);

  IF c.reset_mode = 'yearly' AND c.include_year THEN
    v_prefix_pattern := c.prefix || c.separator || v_year::TEXT || c.separator;
    -- Find max serial looking at both year-prefixed IDs (e.g. TCH-2026-2016) and legacy IDs (e.g. TCH-2017)
    SELECT MAX(CAST(regexp_replace(staff_id, '^.*' || c.separator, '') AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE (
       staff_id LIKE v_prefix_pattern || '%'
       OR (staff_id LIKE c.prefix || c.separator || '%' AND staff_id ~ ('^' || regexp_replace(c.prefix,'([.+*?^$()\[\]{}|\\])','\\\1','g') || c.separator || '[0-9]+$'))
     )
     AND staff_id ~ '[0-9]+$';
  ELSE
    -- global within this prefix
    SELECT MAX(CAST((regexp_match(staff_id,'([0-9]+)$'))[1] AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE c.prefix || c.separator || '%'
       AND staff_id ~ '[0-9]+$';
  END IF;

  v_next := COALESCE(GREATEST(v_max + 1, c.start_serial), c.start_serial);
  v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);

  WHILE EXISTS (SELECT 1 FROM public.staff WHERE staff_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);
  END LOOP;
  RETURN v_id;
END;
$function$;

-- 4. Update auto_generate_staff_id trigger function
CREATE OR REPLACE FUNCTION public.auto_generate_staff_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_prefix TEXT;
  c public.id_format_config%ROWTYPE;
BEGIN
  IF NEW.joining_date IS NOT NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE);
  ELSE
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
  END IF;

  SELECT * INTO c
  FROM public.id_format_config
  WHERE entity_key = NEW.staff_category
  LIMIT 1;

  IF c.prefix IS NOT NULL THEN
    v_prefix := c.prefix;
  ELSE
    SELECT id_prefix INTO v_prefix
    FROM public.staff_categories
    WHERE key = NEW.staff_category
      AND is_active = true
    LIMIT 1;
  END IF;

  -- 1. If staff_id is empty, or category changed, or prefix mismatch: generate new ID
  IF NEW.staff_id IS NULL
     OR NEW.staff_id = ''
     OR (TG_OP = 'UPDATE' AND NEW.staff_category IS DISTINCT FROM OLD.staff_category)
     OR (v_prefix IS NOT NULL AND NEW.staff_id NOT LIKE v_prefix || '-%') THEN
    NEW.staff_id := public.generate_staff_id(NEW.staff_category, v_year);

  -- 2. If staff_id has legacy format missing year (e.g. TCH-2017) while format requires year:
  ELSIF (c.include_year IS TRUE OR c.entity_key IS NULL)
        AND v_prefix IS NOT NULL
        AND NEW.staff_id ~ ('^' || v_prefix || '-[0-9]+$') THEN
    NEW.staff_id := v_prefix || '-' || v_year::TEXT || '-' || split_part(NEW.staff_id, '-', 2);
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Fix all existing staff records missing the year in their staff_id
UPDATE public.staff
SET staff_id = split_part(staff_id, '-', 1) || '-' || COALESCE(EXTRACT(YEAR FROM joining_date::date)::text, '2026') || '-' || split_part(staff_id, '-', 2)
WHERE staff_id ~ '^[A-Za-z]+-[0-9]+$';
