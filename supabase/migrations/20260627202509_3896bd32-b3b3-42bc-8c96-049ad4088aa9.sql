CREATE OR REPLACE FUNCTION public.enforce_staff_joining_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.joining_date IS NULL THEN
    RAISE EXCEPTION 'JOINING_DATE_REQUIRED'
      USING HINT = 'যোগদানের তারিখ দিন';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_joining_date ON public.staff;
CREATE TRIGGER trg_enforce_staff_joining_date
  BEFORE INSERT ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_joining_date();