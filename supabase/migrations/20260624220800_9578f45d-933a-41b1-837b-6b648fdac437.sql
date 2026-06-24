CREATE OR REPLACE FUNCTION public.enforce_library_distributor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  current_name text;
BEGIN
  -- Always bind the issuer to the authenticated user
  NEW.issued_by := auth.uid();

  -- Determine admin privileges
  is_admin := public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin');

  -- Resolve the logged-in user's display name
  SELECT COALESCE(s.name_bn, s.name_en)
    INTO current_name
    FROM public.staff s
   WHERE s.user_id = auth.uid()
     AND s.deleted_at IS NULL
   LIMIT 1;

  IF current_name IS NULL THEN
    SELECT COALESCE(a.name_bn, a.name_en)
      INTO current_name
      FROM public.administrative_officers a
     WHERE a.user_id = auth.uid()
       AND a.deleted_at IS NULL
     LIMIT 1;
  END IF;

  -- Non-admins can never choose another distributor: force their own name
  IF NOT is_admin THEN
    NEW.distributor_name := current_name;
  ELSE
    -- Admins may select someone else; fall back to own name if left blank
    IF NEW.distributor_name IS NULL OR btrim(NEW.distributor_name) = '' THEN
      NEW.distributor_name := current_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_library_distributor ON public.library_issuances;
CREATE TRIGGER trg_enforce_library_distributor
BEFORE INSERT ON public.library_issuances
FOR EACH ROW
EXECUTE FUNCTION public.enforce_library_distributor();