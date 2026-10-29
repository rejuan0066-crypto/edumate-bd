-- Prevent accidental staff_id regeneration on UPDATE
-- An employee's staff_id is their permanent institutional identity and must NEVER be overwritten automatically when updating staff records.

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
  -- 1. If this is an UPDATE and staff_id was already assigned, NEVER overwrite it!
  IF TG_OP = 'UPDATE' AND OLD.staff_id IS NOT NULL AND trim(OLD.staff_id) <> '' THEN
    -- If user intentionally edited staff_id, allow it; otherwise keep OLD.staff_id
    IF NEW.staff_id IS NOT NULL AND trim(NEW.staff_id) <> '' AND NEW.staff_id <> OLD.staff_id THEN
      RETURN NEW;
    END IF;
    NEW.staff_id := OLD.staff_id;
    RETURN NEW;
  END IF;

  -- 2. If staff_id is already explicitly provided by admin on INSERT, keep it!
  IF NEW.staff_id IS NOT NULL AND trim(NEW.staff_id) <> '' THEN
    RETURN NEW;
  END IF;

  -- 3. Otherwise generate new ID for brand-new staff record
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

  NEW.staff_id := public.generate_staff_id(NEW.staff_category, v_year);
  RETURN NEW;
END;
$$;

-- Fix any Hifz teachers whose ID was accidentally changed to STF- prefix
UPDATE public.staff
SET staff_id = 'TCH-' || substring(staff_id from 5)
WHERE (staff_category = 'teacher_hifz' OR staff_category = 'teacher' OR designation ILIKE '%হিফয%' OR designation ILIKE '%হিফজ%')
  AND staff_id LIKE 'STF-%';
