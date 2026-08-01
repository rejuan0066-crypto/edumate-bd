CREATE TABLE public.duty_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  action text NOT NULL,
  staff_id uuid,
  staff_name text,
  shift_id uuid,
  shift_name text,
  weekday smallint,
  duty_date date,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  changed_by_name text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.duty_change_audit TO authenticated;
GRANT ALL ON public.duty_change_audit TO service_role;

ALTER TABLE public.duty_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view duty change audit"
ON public.duty_change_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_duty_change_audit_created ON public.duty_change_audit (created_at DESC);
CREATE INDEX idx_duty_change_audit_staff ON public.duty_change_audit (staff_id);

CREATE OR REPLACE FUNCTION public.log_duty_weekly_template_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_name text;
  v_shift_name text;
  v_actor_name text;
  v_action text;
  v_rec public.duty_weekly_template;
BEGIN
  v_rec := COALESCE(NEW, OLD);

  SELECT name_bn INTO v_staff_name FROM public.staff WHERE id = v_rec.staff_id;
  SELECT name_bn INTO v_shift_name FROM public.duty_shifts WHERE id = v_rec.shift_id;
  SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := CASE WHEN NEW.is_active THEN 'assigned' ELSE 'removed' END;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := CASE WHEN NEW.is_active THEN 'assigned' ELSE 'removed' END;
  ELSE
    v_action := 'removed';
  END IF;

  INSERT INTO public.duty_change_audit (
    source, action, staff_id, staff_name, shift_id, shift_name, weekday,
    old_value, new_value, changed_by, changed_by_name, ip_address, user_agent
  ) VALUES (
    'weekly_template', v_action, v_rec.staff_id, v_staff_name, v_rec.shift_id, v_shift_name, v_rec.weekday,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid(), v_actor_name, public.get_request_ip(), public.get_request_ua()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_duty_weekly_template
AFTER INSERT OR UPDATE OR DELETE ON public.duty_weekly_template
FOR EACH ROW EXECUTE FUNCTION public.log_duty_weekly_template_change();

CREATE OR REPLACE FUNCTION public.log_duty_roster_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_name text;
  v_shift_name text;
  v_actor_name text;
  v_action text;
  v_rec public.duty_roster;
BEGIN
  v_rec := COALESCE(NEW, OLD);

  SELECT name_bn INTO v_staff_name FROM public.staff WHERE id = v_rec.staff_id;
  SELECT name_bn INTO v_shift_name FROM public.duty_shifts WHERE id = v_rec.shift_id;
  SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();

  v_action := CASE TG_OP WHEN 'INSERT' THEN 'assigned' WHEN 'UPDATE' THEN 'updated' ELSE 'removed' END;

  INSERT INTO public.duty_change_audit (
    source, action, staff_id, staff_name, shift_id, shift_name, duty_date,
    old_value, new_value, changed_by, changed_by_name, ip_address, user_agent
  ) VALUES (
    'daily_roster', v_action, v_rec.staff_id, v_staff_name, v_rec.shift_id, v_shift_name, v_rec.duty_date,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid(), v_actor_name, public.get_request_ip(), public.get_request_ua()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_duty_roster
AFTER INSERT OR UPDATE OR DELETE ON public.duty_roster
FOR EACH ROW EXECUTE FUNCTION public.log_duty_roster_change();