CREATE OR REPLACE FUNCTION public.sync_staff_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_full_name := COALESCE(NULLIF(TRIM(NEW.name_bn), ''), NULLIF(TRIM(NEW.name_en), ''));
  UPDATE public.profiles
  SET full_name = COALESCE(v_full_name, full_name),
      phone = COALESCE(NULLIF(TRIM(NEW.phone), ''), phone),
      avatar_url = COALESCE(NULLIF(TRIM(NEW.photo_url), ''), avatar_url),
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;