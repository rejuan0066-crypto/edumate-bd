CREATE TABLE IF NOT EXISTS public.committee_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID,
  committee_name TEXT,
  member_id UUID,
  staff_id UUID,
  member_name TEXT,
  designation TEXT,
  action TEXT NOT NULL,
  performed_by UUID,
  performed_by_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_committee_audit_staff ON public.committee_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_committee_audit_committee ON public.committee_audit_log(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_audit_created ON public.committee_audit_log(created_at DESC);

ALTER TABLE public.committee_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view committee audit log"
ON public.committee_audit_log FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "System can insert audit log"
ON public.committee_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_committee_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_committee_name TEXT;
  v_user UUID;
  v_email TEXT;
  v_target_committee UUID;
  v_target_member UUID;
  v_target_staff UUID;
  v_target_name TEXT;
  v_target_desig TEXT;
BEGIN
  BEGIN v_user := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user := NULL; END;
  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'added';
    v_target_committee := NEW.committee_id;
    v_target_member := NEW.id;
    v_target_staff := NEW.staff_id;
    v_target_name := NEW.name;
    v_target_desig := NEW.designation;
  ELSIF TG_OP = 'UPDATE' THEN
    v_target_committee := NEW.committee_id;
    v_target_member := NEW.id;
    v_target_staff := COALESCE(NEW.staff_id, OLD.staff_id);
    v_target_name := NEW.name;
    v_target_desig := NEW.designation;

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'removed';
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      v_action := 'deactivated';
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      v_action := 'reactivated';
    ELSIF COALESCE(OLD.staff_id::text,'') <> COALESCE(NEW.staff_id::text,'') THEN
      v_action := 'staff_link_changed';
    ELSE
      v_action := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'hard_deleted';
    v_target_committee := OLD.committee_id;
    v_target_member := OLD.id;
    v_target_staff := OLD.staff_id;
    v_target_name := OLD.name;
    v_target_desig := OLD.designation;
  END IF;

  SELECT name INTO v_committee_name FROM public.committees WHERE id = v_target_committee;

  INSERT INTO public.committee_audit_log (
    committee_id, committee_name, member_id, staff_id,
    member_name, designation, action, performed_by, performed_by_email,
    details
  ) VALUES (
    v_target_committee, v_committee_name, v_target_member, v_target_staff,
    v_target_name, v_target_desig, v_action, v_user, v_email,
    CASE WHEN TG_OP = 'UPDATE' THEN
      jsonb_build_object(
        'old_is_active', OLD.is_active, 'new_is_active', NEW.is_active,
        'old_staff_id', OLD.staff_id, 'new_staff_id', NEW.staff_id,
        'old_designation', OLD.designation, 'new_designation', NEW.designation
      )
    ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_committee_audit ON public.committee_members;
CREATE TRIGGER trg_committee_audit
AFTER INSERT OR UPDATE OR DELETE ON public.committee_members
FOR EACH ROW EXECUTE FUNCTION public.log_committee_member_change();