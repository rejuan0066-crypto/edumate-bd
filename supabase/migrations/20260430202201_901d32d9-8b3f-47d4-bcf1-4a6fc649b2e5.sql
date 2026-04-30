-- 1. Add nid column to committee_members
ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS nid text;

-- 2. Trigger function: prevent duplicate NID across committee_members + staff + administrative_officers
CREATE OR REPLACE FUNCTION public.prevent_duplicate_committee_member_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Within committee_members
  IF EXISTS (
    SELECT 1 FROM public.committee_members
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_NID: এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Cross-check: staff
  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Cross-check: administrative_officers
  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_committee_member_nid ON public.committee_members;
CREATE TRIGGER trg_prevent_duplicate_committee_member_nid
BEFORE INSERT OR UPDATE OF nid, deleted_at ON public.committee_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_committee_member_nid();

-- 3. Update staff + administrative_officers triggers to also cross-check committee_members.nid
CREATE OR REPLACE FUNCTION public.prevent_duplicate_staff_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(nid) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.committee_members
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_admin_officer_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.committee_members
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;