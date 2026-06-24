ALTER TABLE public.library_issuance_audit
  ADD COLUMN IF NOT EXISTS old_distributor_name text,
  ADD COLUMN IF NOT EXISTS new_distributor_name text;

CREATE OR REPLACE FUNCTION public.enforce_library_distributor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  current_name text;
  changed_by_admin boolean := false;
  old_name text;
BEGIN
  NEW.issued_by := auth.uid();

  is_admin := public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin');

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

  -- The "old" distributor is the logged-in user's own name (the default)
  old_name := current_name;

  IF NOT is_admin THEN
    NEW.distributor_name := current_name;
  ELSE
    IF NEW.distributor_name IS NULL OR btrim(NEW.distributor_name) = '' THEN
      NEW.distributor_name := current_name;
    ELSIF current_name IS NOT NULL
          AND btrim(NEW.distributor_name) <> btrim(current_name) THEN
      changed_by_admin := true;
    END IF;
  END IF;

  INSERT INTO public.library_issuance_audit (
    issuance_id, action, issued_by, issued_by_name,
    distributor_name, distributor_changed_by_admin,
    old_distributor_name, new_distributor_name
  ) VALUES (
    NEW.id, 'issued', auth.uid(), current_name,
    NEW.distributor_name, changed_by_admin,
    old_name, NEW.distributor_name
  );

  RETURN NEW;
END;
$function$;