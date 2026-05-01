-- 1. Audit table
CREATE TABLE IF NOT EXISTS public.parent_student_link_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id UUID NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  student_uuid UUID NULL,
  action TEXT NOT NULL CHECK (action IN ('linked', 'unlinked', 'refreshed')),
  match_reason TEXT NULL,
  before_uuids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  after_uuids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  source TEXT NOT NULL DEFAULT 'unknown',
  triggered_by_student_uuid UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psla_parent ON public.parent_student_link_audit (parent_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psla_student ON public.parent_student_link_audit (student_uuid);
CREATE INDEX IF NOT EXISTS idx_psla_created ON public.parent_student_link_audit (created_at DESC);

ALTER TABLE public.parent_student_link_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read parent link audit" ON public.parent_student_link_audit;
CREATE POLICY "Admins read parent link audit"
ON public.parent_student_link_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER triggers can write.

-- 2. Updated refresh function with audit logging + source / trigger context
CREATE OR REPLACE FUNCTION public.refresh_parent_student_links(
  p_account_id UUID,
  p_source TEXT DEFAULT 'manual_refresh',
  p_triggered_by_student UUID DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid TEXT;
  v_phone TEXT;
  v_before UUID[];
  v_after UUID[];
  v_added UUID[];
  v_removed UUID[];
  v_uuid UUID;
  v_reason TEXT;
BEGIN
  SELECT nid, phone, COALESCE(linked_student_uuids, ARRAY[]::UUID[])
    INTO v_nid, v_phone, v_before
  FROM public.parent_accounts
  WHERE id = p_account_id AND status = 'approved';

  IF v_nid IS NULL AND v_phone IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  SELECT COALESCE(array_agg(DISTINCT student_uuid), ARRAY[]::UUID[])
    INTO v_after
  FROM public.match_students_for_parent(v_nid, v_phone);

  -- Compute diffs
  SELECT COALESCE(array_agg(x), ARRAY[]::UUID[])
    INTO v_added
  FROM unnest(v_after) AS x
  WHERE x <> ALL (v_before);

  SELECT COALESCE(array_agg(x), ARRAY[]::UUID[])
    INTO v_removed
  FROM unnest(v_before) AS x
  WHERE x <> ALL (v_after);

  -- Persist
  UPDATE public.parent_accounts
  SET linked_student_uuids = v_after,
      linked_student_uuid = COALESCE(v_after[1], linked_student_uuid),
      updated_at = now()
  WHERE id = p_account_id;

  -- Audit each newly linked student with its match reason
  IF array_length(v_added, 1) IS NOT NULL THEN
    FOREACH v_uuid IN ARRAY v_added LOOP
      SELECT match_reason INTO v_reason
      FROM public.match_students_for_parent(v_nid, v_phone)
      WHERE student_uuid = v_uuid
      LIMIT 1;

      INSERT INTO public.parent_student_link_audit
        (parent_account_id, student_uuid, action, match_reason,
         before_uuids, after_uuids, source, triggered_by_student_uuid)
      VALUES
        (p_account_id, v_uuid, 'linked', COALESCE(v_reason, 'unknown'),
         v_before, v_after, p_source, p_triggered_by_student);
    END LOOP;
  END IF;

  -- Audit each unlinked student
  IF array_length(v_removed, 1) IS NOT NULL THEN
    FOREACH v_uuid IN ARRAY v_removed LOOP
      INSERT INTO public.parent_student_link_audit
        (parent_account_id, student_uuid, action, match_reason,
         before_uuids, after_uuids, source, triggered_by_student_uuid)
      VALUES
        (p_account_id, v_uuid, 'unlinked', NULL,
         v_before, v_after, p_source, p_triggered_by_student);
    END LOOP;
  END IF;

  -- Always log a single 'refreshed' row when fired by a student change so admins
  -- can see the trigger event itself even when nothing changed.
  IF p_source = 'student_change' THEN
    INSERT INTO public.parent_student_link_audit
      (parent_account_id, student_uuid, action, match_reason,
       before_uuids, after_uuids, source, triggered_by_student_uuid,
       notes)
    VALUES
      (p_account_id, p_triggered_by_student, 'refreshed', NULL,
       v_before, v_after, p_source, p_triggered_by_student,
       CASE
         WHEN array_length(v_added, 1) IS NULL AND array_length(v_removed, 1) IS NULL
           THEN 'no change'
         ELSE NULL
       END);
  END IF;

  RETURN v_after;
END;
$$;

-- 3. Updated trigger function passes student id + source
CREATE OR REPLACE FUNCTION public.auto_link_parents_on_student_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
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
    PERFORM public.refresh_parent_student_links(r.id, 'student_change', NEW.id);
  END LOOP;
  RETURN NEW;
END;
$$;