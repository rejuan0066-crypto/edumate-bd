CREATE OR REPLACE FUNCTION public.auto_generate_officer_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year INTEGER;
BEGIN
  IF NEW.officer_id IS NULL OR NEW.officer_id = '' THEN
    IF NEW.joining_date IS NOT NULL THEN
      v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE)::INTEGER;
    ELSE
      v_year := EXTRACT(YEAR FROM now())::INTEGER;
    END IF;
    NEW.officer_id := public.generate_administrative_officer_id(v_year);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_officer_id ON public.administrative_officers;
CREATE TRIGGER trg_auto_generate_officer_id
BEFORE INSERT ON public.administrative_officers
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_officer_id();