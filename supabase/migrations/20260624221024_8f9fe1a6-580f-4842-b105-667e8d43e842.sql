-- 1. Audit table
CREATE TABLE public.library_issuance_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issuance_id uuid,
  action text NOT NULL DEFAULT 'issued',
  issued_by uuid,
  issued_by_name text,
  distributor_name text,
  distributor_changed_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.library_issuance_audit TO authenticated;
GRANT ALL ON public.library_issuance_audit TO service_role;

ALTER TABLE public.library_issuance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view issuance audit"
ON public.library_issuance_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 2. Extend the enforcement trigger to also write audit rows
CREATE OR REPLACE FUNCTION public.enforce_library_distributor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  current_name text;
  changed_by_admin boolean := false;
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
    distributor_name, distributor_changed_by_admin
  ) VALUES (
    NEW.id, 'issued', auth.uid(), current_name,
    NEW.distributor_name, changed_by_admin
  );

  RETURN NEW;
END;
$$;