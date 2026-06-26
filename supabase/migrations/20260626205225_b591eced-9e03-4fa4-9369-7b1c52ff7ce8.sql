
-- Ensure meal columns default to NULL (unmarked) rather than a forced value
ALTER TABLE public.hostel_meal_attendance
  ALTER COLUMN breakfast DROP DEFAULT,
  ALTER COLUMN lunch DROP DEFAULT,
  ALTER COLUMN dinner DROP DEFAULT;

-- Trigger function: clean up rows that have no attendance marked anymore
CREATE OR REPLACE FUNCTION public.cleanup_empty_meal_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.breakfast IS NULL
     AND NEW.lunch IS NULL
     AND NEW.dinner IS NULL
     AND (NEW.notes IS NULL OR btrim(NEW.notes) = '') THEN
    DELETE FROM public.hostel_meal_attendance WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_empty_meal_attendance ON public.hostel_meal_attendance;
CREATE TRIGGER trg_cleanup_empty_meal_attendance
  AFTER UPDATE ON public.hostel_meal_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_empty_meal_attendance();
