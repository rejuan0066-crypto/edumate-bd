-- ==============================================================================
-- Migration: Allow past-date attendance when user/role has `action_past_date_attendance`
-- in website_settings -> role_feature_permissions
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
  v_features JSONB;
  v_user_map JSONB;
  v_role_map JSONB;
  v_role_name TEXT;
  v_feature_key TEXT;
  v_global_key TEXT := '/admin/attendance:action_past_date_attendance';
  v_explicit BOOLEAN;
BEGIN
  -- If attendance_date is today or in the future, allow standard flow
  IF NEW.attendance_date >= v_today THEN
    RETURN NEW;
  END IF;

  -- Check if current authenticated user has an admin role or service_role
  v_is_admin := (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'institution_admin'::app_role)
    OR auth.role() = 'service_role'
  );

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Check granular permission from website_settings ('role_feature_permissions')
  SELECT value INTO v_features
  FROM public.website_settings
  WHERE key = 'role_feature_permissions'
  LIMIT 1;

  IF v_features IS NOT NULL AND auth.uid() IS NOT NULL THEN
    v_feature_key := CASE
      WHEN NEW.entity_type = 'staff' THEN '/admin/staff-attendance:action_past_date_attendance'
      ELSE '/admin/student-attendance:action_past_date_attendance'
    END;

    -- 1. User-specific override takes highest priority
    v_user_map := v_features -> ('user_' || auth.uid()::text);
    IF v_user_map IS NOT NULL THEN
      IF (v_user_map ? v_feature_key) THEN
        v_explicit := COALESCE((v_user_map ->> v_feature_key)::BOOLEAN, FALSE);
        IF v_explicit THEN
          RETURN NEW;
        ELSE
          RAISE EXCEPTION 'PAST_ATTENDANCE_REQUIRES_ADMIN_APPROVAL: পূর্ববর্তী তারিখের (%s) হাজিরা পরিবর্তনের জন্য এডমিনের অনুমোদন আবশ্যক।', NEW.attendance_date;
        END IF;
      ELSIF (v_user_map ? v_global_key) THEN
        v_explicit := COALESCE((v_user_map ->> v_global_key)::BOOLEAN, FALSE);
        IF v_explicit THEN
          RETURN NEW;
        ELSE
          RAISE EXCEPTION 'PAST_ATTENDANCE_REQUIRES_ADMIN_APPROVAL: পূর্ববর্তী তারিখের (%s) হাজিরা পরিবর্তনের জন্য এডমিনের অনুমোদন আবশ্যক।', NEW.attendance_date;
        END IF;
      END IF;
    END IF;

    -- 2. Role-level permission (user_roles + staff custom_roles)
    FOR v_role_name IN
      SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()
      UNION
      SELECT cr.name FROM public.staff s
      JOIN public.custom_roles cr ON cr.id = s.custom_role_id
      WHERE s.user_id = auth.uid()
    LOOP
      v_role_map := v_features -> v_role_name;
      IF v_role_map IS NOT NULL THEN
        IF COALESCE((v_role_map ->> v_feature_key)::BOOLEAN, FALSE)
           OR COALESCE((v_role_map ->> v_global_key)::BOOLEAN, FALSE) THEN
          RETURN NEW;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RAISE EXCEPTION 'PAST_ATTENDANCE_REQUIRES_ADMIN_APPROVAL: পূর্ববর্তী তারিখের (%s) হাজিরা পরিবর্তনের জন্য এডমিনের অনুমোদন আবশ্যক।', NEW.attendance_date;
END;
$$;
