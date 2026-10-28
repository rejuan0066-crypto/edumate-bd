-- Only link officer records to accounts whose email address is confirmed.
CREATE OR REPLACE FUNCTION public.link_administrative_officer_by_email()
RETURNS public.administrative_officers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_row public.administrative_officers;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  -- Already linked?
  SELECT * INTO v_row FROM public.administrative_officers
   WHERE user_id = v_user_id AND deleted_at IS NULL
   LIMIT 1;
  IF v_row.id IS NOT NULL THEN
    RETURN v_row;
  END IF;

  -- Find an unlinked row matching the caller's email
  SELECT * INTO v_row FROM public.administrative_officers
   WHERE lower(email) = lower(v_email)
     AND user_id IS NULL
     AND deleted_at IS NULL
   LIMIT 1;
  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.administrative_officers
     SET user_id = v_user_id, updated_at = now()
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
