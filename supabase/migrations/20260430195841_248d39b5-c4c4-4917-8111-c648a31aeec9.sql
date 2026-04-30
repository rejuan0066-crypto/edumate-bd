CREATE OR REPLACE FUNCTION public.auto_generate_staff_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_prefix TEXT;
BEGIN
  IF NEW.joining_date IS NOT NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE);
  ELSE
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
  END IF;

  SELECT id_prefix INTO v_prefix
  FROM public.staff_categories
  WHERE key = NEW.staff_category
    AND is_active = true
  LIMIT 1;

  IF NEW.staff_id IS NULL
     OR NEW.staff_id = ''
     OR (TG_OP = 'UPDATE' AND NEW.staff_category IS DISTINCT FROM OLD.staff_category)
     OR (v_prefix IS NOT NULL AND NEW.staff_id NOT LIKE v_prefix || '-%') THEN
    NEW.staff_id := public.generate_staff_id(NEW.staff_category, v_year);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_staff_id ON public.staff;
CREATE TRIGGER trg_auto_staff_id
BEFORE INSERT OR UPDATE OF staff_id, staff_category, joining_date ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_staff_id();