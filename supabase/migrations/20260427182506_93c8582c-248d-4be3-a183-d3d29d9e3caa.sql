ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS allow_overlap BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_committee_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_names TEXT;
BEGIN
  -- Only enforce for active linked-staff members
  IF NEW.staff_id IS NULL OR NEW.is_active = false OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.allow_overlap, false) = true THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), string_agg(c.name, ', ')
    INTO v_count, v_names
  FROM public.committee_members cm
  JOIN public.committees c ON c.id = cm.committee_id
  WHERE cm.staff_id = NEW.staff_id
    AND cm.is_active = true
    AND cm.deleted_at IS NULL
    AND c.is_active = true
    AND c.deleted_at IS NULL
    AND (TG_OP = 'INSERT' OR cm.id <> NEW.id)
    AND cm.committee_id <> NEW.committee_id;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'OVERLAP_BLOCKED: Staff is already an active member of: %. Set allow_overlap=true to confirm.', v_names
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_committee_overlap_guard ON public.committee_members;
CREATE TRIGGER trg_committee_overlap_guard
BEFORE INSERT OR UPDATE ON public.committee_members
FOR EACH ROW EXECUTE FUNCTION public.guard_committee_overlap();