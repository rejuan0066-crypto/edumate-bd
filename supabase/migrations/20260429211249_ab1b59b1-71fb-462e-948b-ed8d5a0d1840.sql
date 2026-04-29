-- Unique partial indexes (case-insensitive) on phone & email for non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_officers_phone_active
  ON public.administrative_officers (phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL AND phone <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_officers_email_active
  ON public.administrative_officers (lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL AND email <> '';

-- Friendly validation trigger so duplicates raise an explicit, translatable message
CREATE OR REPLACE FUNCTION public.validate_admin_officer_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE phone = NEW.phone
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর ইতিমধ্যে অন্য একজন প্রশাসনিক কর্মকর্তার জন্য ব্যবহৃত হয়েছে (%).', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE lower(email) = lower(NEW.email)
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_EMAIL: এই ইমেইল ইতিমধ্যে অন্য একজন প্রশাসনিক কর্মকর্তার জন্য ব্যবহৃত হয়েছে (%).', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_admin_officer_unique_trg ON public.administrative_officers;
CREATE TRIGGER validate_admin_officer_unique_trg
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_unique();