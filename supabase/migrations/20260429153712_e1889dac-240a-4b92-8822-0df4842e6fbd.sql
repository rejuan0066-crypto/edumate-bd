CREATE OR REPLACE FUNCTION public.sync_profile_to_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.staff
  SET name_bn = COALESCE(NULLIF(TRIM(NEW.full_name), ''), name_bn),
      phone = COALESCE(NULLIF(TRIM(NEW.phone), ''), phone),
      photo_url = COALESCE(NULLIF(TRIM(NEW.avatar_url), ''), photo_url),
      updated_at = now()
  WHERE user_id = NEW.id AND deleted_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_to_staff ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_staff
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_staff();