-- 1. Add nid + linked_student_uuids array to parent_accounts
ALTER TABLE public.parent_accounts
  ADD COLUMN IF NOT EXISTS nid TEXT,
  ADD COLUMN IF NOT EXISTS linked_student_uuids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_parent_accounts_nid ON public.parent_accounts(nid) WHERE nid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parent_accounts_phone ON public.parent_accounts(phone) WHERE phone IS NOT NULL;

-- 2. Add guardian_nid to students for guardian-based matching (optional column)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS guardian_nid TEXT;

-- 3. Backfill linked_student_uuids from existing single linked_student_uuid
UPDATE public.parent_accounts
SET linked_student_uuids = ARRAY[linked_student_uuid]
WHERE linked_student_uuid IS NOT NULL
  AND (linked_student_uuids IS NULL OR array_length(linked_student_uuids, 1) IS NULL);

-- 4. RPC: find students matching parent's NID and/or phone
CREATE OR REPLACE FUNCTION public.match_students_for_parent(
  p_nid TEXT,
  p_phone TEXT
)
RETURNS TABLE(
  student_uuid UUID,
  student_id TEXT,
  name_bn TEXT,
  name_en TEXT,
  match_reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.student_id, s.name_bn, s.name_en,
    CASE
      WHEN p_nid IS NOT NULL AND p_nid <> '' AND TRIM(s.father_nid) = TRIM(p_nid) THEN 'father_nid'
      WHEN p_nid IS NOT NULL AND p_nid <> '' AND TRIM(s.mother_nid) = TRIM(p_nid) THEN 'mother_nid'
      WHEN p_nid IS NOT NULL AND p_nid <> '' AND TRIM(s.guardian_nid) = TRIM(p_nid) THEN 'guardian_nid'
      WHEN p_phone IS NOT NULL AND p_phone <> '' AND TRIM(s.guardian_phone) = TRIM(p_phone) THEN 'guardian_phone'
      WHEN p_phone IS NOT NULL AND p_phone <> '' AND TRIM(s.father_phone) = TRIM(p_phone) THEN 'father_phone'
      WHEN p_phone IS NOT NULL AND p_phone <> '' AND TRIM(s.mother_phone) = TRIM(p_phone) THEN 'mother_phone'
      ELSE 'unknown'
    END AS match_reason
  FROM public.students s
  WHERE s.deleted_at IS NULL
    AND (
      (p_nid IS NOT NULL AND p_nid <> '' AND (
        TRIM(s.father_nid) = TRIM(p_nid)
        OR TRIM(s.mother_nid) = TRIM(p_nid)
        OR TRIM(s.guardian_nid) = TRIM(p_nid)
      ))
      OR (p_phone IS NOT NULL AND p_phone <> '' AND (
        TRIM(s.guardian_phone) = TRIM(p_phone)
        OR TRIM(s.father_phone) = TRIM(p_phone)
        OR TRIM(s.mother_phone) = TRIM(p_phone)
      ))
    );
$$;

-- 5. RPC: refresh linked_student_uuids for an approved parent based on current NID/phone
CREATE OR REPLACE FUNCTION public.refresh_parent_student_links(p_account_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid TEXT;
  v_phone TEXT;
  v_uuids UUID[];
BEGIN
  SELECT nid, phone INTO v_nid, v_phone
  FROM public.parent_accounts
  WHERE id = p_account_id AND status = 'approved';

  IF v_nid IS NULL AND v_phone IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  SELECT COALESCE(array_agg(DISTINCT student_uuid), ARRAY[]::UUID[])
  INTO v_uuids
  FROM public.match_students_for_parent(v_nid, v_phone);

  UPDATE public.parent_accounts
  SET linked_student_uuids = v_uuids,
      linked_student_uuid = COALESCE(v_uuids[1], linked_student_uuid),
      updated_at = now()
  WHERE id = p_account_id;

  RETURN v_uuids;
END;
$$;

-- 6. Trigger: when a student is inserted/updated, auto-refresh any matching approved parents
CREATE OR REPLACE FUNCTION public.auto_link_parents_on_student_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Find all approved parent accounts whose NID or phone matches this student's parents
  FOR r IN
    SELECT DISTINCT pa.id
    FROM public.parent_accounts pa
    WHERE pa.status = 'approved'
      AND (
        (pa.nid IS NOT NULL AND pa.nid <> '' AND (
          TRIM(pa.nid) = TRIM(COALESCE(NEW.father_nid, ''))
          OR TRIM(pa.nid) = TRIM(COALESCE(NEW.mother_nid, ''))
          OR TRIM(pa.nid) = TRIM(COALESCE(NEW.guardian_nid, ''))
        ))
        OR (pa.phone IS NOT NULL AND pa.phone <> '' AND (
          TRIM(pa.phone) = TRIM(COALESCE(NEW.guardian_phone, ''))
          OR TRIM(pa.phone) = TRIM(COALESCE(NEW.father_phone, ''))
          OR TRIM(pa.phone) = TRIM(COALESCE(NEW.mother_phone, ''))
        ))
      )
  LOOP
    PERFORM public.refresh_parent_student_links(r.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_parents_on_student_change ON public.students;
CREATE TRIGGER trg_auto_link_parents_on_student_change
AFTER INSERT OR UPDATE OF father_nid, mother_nid, guardian_nid, guardian_phone, father_phone, mother_phone
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_parents_on_student_change();

-- 7. Parent fee payment requests table (manual TrxID fallback)
CREATE TABLE IF NOT EXISTS public.parent_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id UUID NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  student_uuid UUID NOT NULL,
  fee_assignment_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  trx_id TEXT,
  sender_phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  payment_record_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parent payment requests"
ON public.parent_payment_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR is_accounts_staff(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR is_accounts_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_parent_payment_requests_status ON public.parent_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_parent_payment_requests_parent ON public.parent_payment_requests(parent_account_id);

CREATE TRIGGER trg_parent_payment_requests_updated_at
BEFORE UPDATE ON public.parent_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();