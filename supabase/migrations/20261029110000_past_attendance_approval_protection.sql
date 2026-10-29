-- ==============================================================================
-- Migration: Restrict past date attendance modification to Admin only or via Admin Approval
-- Staff users (non-admins) cannot directly insert/update past attendance records.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_past_attendance_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::DATE;
BEGIN
  -- If attendance_date is today or in the future, allow standard flow
  IF NEW.attendance_date >= v_today THEN
    RETURN NEW;
  END IF;

  -- If attendance_date is in the past:
  -- Check if current authenticated user has an admin role
  v_is_admin := (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'institution_admin'::app_role)
    OR auth.role() = 'service_role'
  );

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'PAST_ATTENDANCE_REQUIRES_ADMIN_APPROVAL: পূর্ববর্তী তারিখের (%s) হাজিরা পরিবর্তনের জন্য এডমিনের অনুমোদন আবশ্যক।', NEW.attendance_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_past_attendance_permission ON public.attendance_records;
CREATE TRIGGER trg_check_past_attendance_permission
BEFORE INSERT OR UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.check_past_attendance_permission();
