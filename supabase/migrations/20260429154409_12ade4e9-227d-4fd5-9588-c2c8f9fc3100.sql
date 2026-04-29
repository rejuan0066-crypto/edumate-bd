CREATE OR REPLACE FUNCTION public.sync_staff_to_committee_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_name_en text;
  v_desig text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.designation IS NOT DISTINCT FROM OLD.designation
     AND NEW.name_bn IS NOT DISTINCT FROM OLD.name_bn
     AND NEW.name_en IS NOT DISTINCT FROM OLD.name_en
     AND NEW.photo_url IS NOT DISTINCT FROM OLD.photo_url
     AND NEW.phone IS NOT DISTINCT FROM OLD.phone THEN
    RETURN NEW;
  END IF;

  v_name := NULLIF(TRIM(NEW.name_bn), '');
  v_name_en := NULLIF(TRIM(NEW.name_en), '');
  v_desig := NULLIF(TRIM(NEW.designation), '');

  UPDATE public.committee_members
  SET name = COALESCE(v_name, name),
      name_en = COALESCE(v_name_en, name_en),
      designation = COALESCE(v_desig, designation),
      designation_en = COALESCE(v_desig, designation_en),
      photo_url = COALESCE(NULLIF(TRIM(NEW.photo_url), ''), photo_url),
      phone = COALESCE(NULLIF(TRIM(NEW.phone), ''), phone),
      updated_at = now()
  WHERE staff_id = NEW.id
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_to_committee_members ON public.staff;
CREATE TRIGGER trg_sync_staff_to_committee_members
AFTER UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.sync_staff_to_committee_members();