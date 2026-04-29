CREATE OR REPLACE FUNCTION public.sync_staff_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone text;
  v_avatar text;
  v_changed boolean := false;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_full_name := COALESCE(NULLIF(TRIM(NEW.name_bn), ''), NULLIF(TRIM(NEW.name_en), ''));
  v_phone := NULLIF(TRIM(NEW.phone), '');
  v_avatar := NULLIF(TRIM(NEW.photo_url), '');
  IF TG_OP = 'UPDATE' THEN
    IF v_full_name IS DISTINCT FROM COALESCE(NULLIF(TRIM(OLD.name_bn), ''), NULLIF(TRIM(OLD.name_en), ''))
       OR v_phone IS DISTINCT FROM NULLIF(TRIM(OLD.phone), '')
       OR v_avatar IS DISTINCT FROM NULLIF(TRIM(OLD.photo_url), '')
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      v_changed := true;
    END IF;
  ELSE
    v_changed := true;
  END IF;
  IF NOT v_changed THEN
    RETURN NEW;
  END IF;
  UPDATE public.profiles
  SET full_name = COALESCE(v_full_name, full_name),
      phone = COALESCE(v_phone, phone),
      avatar_url = COALESCE(v_avatar, avatar_url),
      updated_at = now()
  WHERE id = NEW.user_id
    AND (
      COALESCE(full_name,'') IS DISTINCT FROM COALESCE(v_full_name, full_name)
      OR COALESCE(phone,'') IS DISTINCT FROM COALESCE(v_phone, phone)
      OR COALESCE(avatar_url,'') IS DISTINCT FROM COALESCE(v_avatar, avatar_url)
    );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_to_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_photo text;
BEGIN
  v_name := NULLIF(TRIM(NEW.full_name), '');
  v_phone := NULLIF(TRIM(NEW.phone), '');
  v_photo := NULLIF(TRIM(NEW.avatar_url), '');
  IF v_name IS NOT DISTINCT FROM NULLIF(TRIM(OLD.full_name), '')
     AND v_phone IS NOT DISTINCT FROM NULLIF(TRIM(OLD.phone), '')
     AND v_photo IS NOT DISTINCT FROM NULLIF(TRIM(OLD.avatar_url), '') THEN
    RETURN NEW;
  END IF;
  UPDATE public.staff
  SET name_bn = COALESCE(v_name, name_bn),
      phone = COALESCE(v_phone, phone),
      photo_url = COALESCE(v_photo, photo_url),
      updated_at = now()
  WHERE user_id = NEW.id
    AND deleted_at IS NULL
    AND (
      COALESCE(name_bn,'') IS DISTINCT FROM COALESCE(v_name, name_bn)
      OR COALESCE(phone,'') IS DISTINCT FROM COALESCE(v_phone, phone)
      OR COALESCE(photo_url,'') IS DISTINCT FROM COALESCE(v_photo, photo_url)
    );
  RETURN NEW;
END;
$$;