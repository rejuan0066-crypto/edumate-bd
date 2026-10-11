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
  IF NEW.joining_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'JOINING_DATE_FUTURE'
      USING HINT = 'যোগদানের তারিখ ভবিষ্যতের হতে পারে না';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_joining_date ON public.staff;
CREATE TRIGGER trg_enforce_staff_joining_date
  BEFORE INSERT OR UPDATE OF joining_date ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_joining_date();

CREATE OR REPLACE FUNCTION public.enforce_admin_officer_joining_date()
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
  IF NEW.joining_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'JOINING_DATE_FUTURE'
      USING HINT = 'যোগদানের তারিখ ভবিষ্যতের হতে পারে না';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_admin_officer_joining_date ON public.administrative_officers;
CREATE TRIGGER trg_enforce_admin_officer_joining_date
  BEFORE INSERT OR UPDATE OF joining_date ON public.administrative_officers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_officer_joining_date();