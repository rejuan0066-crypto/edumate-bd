-- Enforce that only ONE active person can hold the "Principal" designation
-- across administrative_officers + staff combined.
CREATE OR REPLACE FUNCTION public.enforce_single_principal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_designation text;
  v_is_principal boolean;
  v_existing_admin int;
  v_existing_staff int;
  v_self_id uuid;
  v_table text := TG_TABLE_NAME;
BEGIN
  v_designation := lower(coalesce(NEW.designation, ''));
  v_is_principal := v_designation LIKE '%principal%'
                 OR v_designation LIKE '%প্রিন্সিপাল%'
                 OR v_designation LIKE '%অধ্যক্ষ%';

  IF NOT v_is_principal THEN
    RETURN NEW;
  END IF;

  -- Only enforce for active rows
  IF coalesce(NEW.status, 'active') <> 'active' THEN
    RETURN NEW;
  END IF;

  v_self_id := NEW.id;

  SELECT count(*) INTO v_existing_admin
  FROM administrative_officers
  WHERE deleted_at IS NULL
    AND status = 'active'
    AND id <> coalesce(v_self_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      lower(coalesce(designation, '')) LIKE '%principal%'
      OR lower(coalesce(designation, '')) LIKE '%প্রিন্সিপাল%'
      OR lower(coalesce(designation, '')) LIKE '%অধ্যক্ষ%'
    );

  SELECT count(*) INTO v_existing_staff
  FROM staff
  WHERE deleted_at IS NULL
    AND status = 'active'
    AND id <> coalesce(v_self_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      lower(coalesce(designation, '')) LIKE '%principal%'
      OR lower(coalesce(designation, '')) LIKE '%প্রিন্সিপাল%'
      OR lower(coalesce(designation, '')) LIKE '%অধ্যক্ষ%'
    );

  IF (v_existing_admin + v_existing_staff) > 0 THEN
    RAISE EXCEPTION 'DUPLICATE_PRINCIPAL: প্রিন্সিপাল/অধ্যক্ষ পদবি ইতিমধ্যে একজনকে দেয়া হয়েছে। নতুন কাউকে দিতে হলে আগেরজনের পদবি পরিবর্তন বা নিষ্ক্রিয় করুন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_principal_admin ON public.administrative_officers;
CREATE TRIGGER trg_enforce_single_principal_admin
BEFORE INSERT OR UPDATE OF designation, status, deleted_at
ON public.administrative_officers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_principal();

DROP TRIGGER IF EXISTS trg_enforce_single_principal_staff ON public.staff;
CREATE TRIGGER trg_enforce_single_principal_staff
BEFORE INSERT OR UPDATE OF designation, status, deleted_at
ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_principal();