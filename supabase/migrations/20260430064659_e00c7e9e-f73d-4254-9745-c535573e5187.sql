-- Reusable enforcement helper: throws if caller lacks can_approve on given menu_path
CREATE OR REPLACE FUNCTION public.enforce_approve_permission(_menu_path text)
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid;
BEGIN
  BEGIN v_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_uid := NULL; END;

  -- Service role / no JWT context (server-side jobs, triggers from edge fns) → allow
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Admin / super_admin bypass (already handled by has_menu_permission, but explicit)
  IF public.has_role(v_uid, 'admin'::app_role)
     OR public.has_role(v_uid, 'super_admin'::app_role) THEN
    RETURN;
  END IF;

  IF NOT public.has_menu_permission(v_uid, _menu_path, 'approve') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: এই অনুমোদন কাজটি করার অনুমতি আপনার নেই (% requires approve permission)', _menu_path
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_approve_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_approve_permission(text) TO authenticated, service_role;

-- ── Per-table approve guard triggers ──

-- 1) notices: publishing requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_published, false) = true THEN
      PERFORM public.enforce_approve_permission('/admin/notices');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_published, false) = true AND COALESCE(OLD.is_published, false) = false THEN
      PERFORM public.enforce_approve_permission('/admin/notices');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_notice ON public.notices;
CREATE TRIGGER trg_guard_approve_notice
  BEFORE INSERT OR UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_notice();

-- 2) donors: verifying payment requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_donor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.payment_status, '') = 'verified'
       AND COALESCE(OLD.payment_status, '') <> 'verified' THEN
      PERFORM public.enforce_approve_permission('/admin/donors');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_donor ON public.donors;
CREATE TRIGGER trg_guard_approve_donor
  BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_donor();

-- 3) parent_accounts: approving requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_parent_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('approved','active')
       AND COALESCE(OLD.status, '') NOT IN ('approved','active') THEN
      PERFORM public.enforce_approve_permission('/admin/parent-approvals');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_parent_account ON public.parent_accounts;
CREATE TRIGGER trg_guard_approve_parent_account
  BEFORE UPDATE ON public.parent_accounts
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_parent_account();

-- 4) pending_actions: approving/rejecting requires approve on approvals page
CREATE OR REPLACE FUNCTION public.guard_approve_pending_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('approved','rejected')
       AND COALESCE(OLD.status, '') = 'pending' THEN
      PERFORM public.enforce_approve_permission('/admin/approvals');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_pending_action ON public.pending_actions;
CREATE TRIGGER trg_guard_approve_pending_action
  BEFORE UPDATE ON public.pending_actions
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_pending_action();

-- 5) salary_records: verify / approve / paid all require approve
CREATE OR REPLACE FUNCTION public.guard_approve_salary_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('verified','approved','paid')
       AND COALESCE(NEW.status, '') <> COALESCE(OLD.status, '') THEN
      PERFORM public.enforce_approve_permission('/admin/salary');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_salary_record ON public.salary_records;
CREATE TRIGGER trg_guard_approve_salary_record
  BEFORE UPDATE ON public.salary_records
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_salary_record();

-- 6) complaints: resolving/closing requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_complaint()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('resolved','closed')
       AND COALESCE(OLD.status, '') NOT IN ('resolved','closed') THEN
      PERFORM public.enforce_approve_permission('/admin/complaints');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_complaint ON public.complaints;
CREATE TRIGGER trg_guard_approve_complaint
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_complaint();

-- 7) staff: activating from pending requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_staff_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') = 'active'
       AND COALESCE(OLD.status, '') = 'pending' THEN
      PERFORM public.enforce_approve_permission('/admin/staff');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_staff_activation ON public.staff;
CREATE TRIGGER trg_guard_approve_staff_activation
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_staff_activation();

-- 8) administrative_officers: activating requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_admin_officer_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') = 'active'
       AND COALESCE(OLD.status, '') = 'pending' THEN
      PERFORM public.enforce_approve_permission('/admin/administrative');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_admin_officer ON public.administrative_officers;
CREATE TRIGGER trg_guard_approve_admin_officer
  BEFORE UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_admin_officer_activation();