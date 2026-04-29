-- 1. Add allowed_categories column to custom_roles
ALTER TABLE public.custom_roles
  ADD COLUMN IF NOT EXISTS allowed_categories text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.custom_roles.allowed_categories IS
  'Staff categories that may be assigned this custom role. Empty array = unrestricted.';

-- 2. Pre-fill defaults for the seeded administrative roles (only update where empty)
UPDATE public.custom_roles
SET allowed_categories = ARRAY['director']
WHERE allowed_categories = '{}'::text[]
  AND lower(name) IN ('chairman', 'director', 'president', 'vice chairman', 'vice-chairman', 'vice president', 'vice-president');

UPDATE public.custom_roles
SET allowed_categories = ARRAY['committee_member']
WHERE allowed_categories = '{}'::text[]
  AND lower(name) IN ('secretary', 'joint secretary', 'treasurer', 'member', 'general secretary', 'assistant secretary');

-- 3. Validation trigger function on staff
CREATE OR REPLACE FUNCTION public.validate_staff_custom_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[];
  v_name text;
  v_name_bn text;
BEGIN
  -- Nothing to validate if no custom role assigned
  IF NEW.custom_role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT allowed_categories, name, name_bn
    INTO v_allowed, v_name, v_name_bn
  FROM public.custom_roles
  WHERE id = NEW.custom_role_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'INVALID_CUSTOM_ROLE: Custom role % does not exist', NEW.custom_role_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Empty allowed_categories => unrestricted
  IF v_allowed IS NULL OR array_length(v_allowed, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.staff_category IS NULL OR NOT (NEW.staff_category = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'CUSTOM_ROLE_CATEGORY_MISMATCH: Role "%" (%) is only allowed for categories: %. Current staff_category: %',
      v_name, v_name_bn, array_to_string(v_allowed, ', '), COALESCE(NEW.staff_category, 'NULL')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_staff_custom_role ON public.staff;
CREATE TRIGGER trg_validate_staff_custom_role
BEFORE INSERT OR UPDATE OF custom_role_id, staff_category ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.validate_staff_custom_role();