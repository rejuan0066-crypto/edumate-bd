-- Sync existing staff.department from staff_category
UPDATE public.staff
SET department = staff_category
WHERE deleted_at IS NULL
  AND staff_category IS NOT NULL
  AND (department IS NULL OR department = '' OR department = 'general' OR department <> staff_category);

-- Trigger to keep department in sync with staff_category
CREATE OR REPLACE FUNCTION public.sync_staff_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always mirror staff_category into department
  IF NEW.staff_category IS NOT NULL THEN
    NEW.department := NEW.staff_category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_department ON public.staff;
CREATE TRIGGER trg_sync_staff_department
BEFORE INSERT OR UPDATE OF staff_category ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.sync_staff_department();