ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS complainant_address text,
  ADD COLUMN IF NOT EXISTS complainant_student_id text,
  ADD COLUMN IF NOT EXISTS contact_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_verification_method text;

-- Enforce: no anonymous + all contact fields required + must be verified
CREATE OR REPLACE FUNCTION public.complaints_require_verified_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip enforcement for staff/admin updates
  IF TG_OP = 'INSERT' THEN
    NEW.is_anonymous := false;

    IF NEW.complainant_name IS NULL OR length(btrim(NEW.complainant_name)) < 2 THEN
      RAISE EXCEPTION 'COMPLAINANT_NAME_REQUIRED';
    END IF;
    IF NEW.complainant_phone IS NULL OR length(btrim(NEW.complainant_phone)) < 6 THEN
      RAISE EXCEPTION 'COMPLAINANT_PHONE_REQUIRED';
    END IF;
    IF NEW.complainant_email IS NULL OR NEW.complainant_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'COMPLAINANT_EMAIL_REQUIRED';
    END IF;
    IF NEW.complainant_address IS NULL OR length(btrim(NEW.complainant_address)) < 4 THEN
      RAISE EXCEPTION 'COMPLAINANT_ADDRESS_REQUIRED';
    END IF;
    IF NEW.complainant_student_id IS NULL OR length(btrim(NEW.complainant_student_id)) < 2 THEN
      RAISE EXCEPTION 'COMPLAINANT_STUDENT_ID_REQUIRED';
    END IF;
    IF NEW.contact_verified IS NOT TRUE THEN
      RAISE EXCEPTION 'CONTACT_NOT_VERIFIED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_require_verified_identity ON public.complaints;
CREATE TRIGGER trg_complaints_require_verified_identity
BEFORE INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.complaints_require_verified_identity();