-- Audit table for super-admin toggles around dynamic names & custom signatory entries
CREATE TABLE IF NOT EXISTS public.name_permission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. 'toggle_allow_custom_entries', 'config_update'
  old_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_by_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_name_permission_audit_key ON public.name_permission_audit(setting_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_name_permission_audit_user ON public.name_permission_audit(changed_by, created_at DESC);

ALTER TABLE public.name_permission_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view name permission audit" ON public.name_permission_audit;
CREATE POLICY "Admins can view name permission audit"
  ON public.name_permission_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Authenticated can insert name permission audit" ON public.name_permission_audit;
CREATE POLICY "Authenticated can insert name permission audit"
  ON public.name_permission_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to auto-log relevant website_settings changes
CREATE OR REPLACE FUNCTION public.log_name_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_action TEXT;
  v_watched BOOLEAN := false;
BEGIN
  -- Watch keys related to dynamic name / signatory permissions
  IF NEW.key IN ('salary_workflow_config')
     OR NEW.key LIKE '%name_permissions%'
     OR NEW.key LIKE '%signatory_config%'
     OR NEW.key LIKE '%dynamic_names%' THEN
    v_watched := true;
  END IF;

  IF NOT v_watched THEN
    RETURN NEW;
  END IF;

  -- Only log if value actually changed
  IF TG_OP = 'UPDATE' AND OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  v_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'config_create'
    WHEN (OLD.value->>'allow_custom_entries') IS DISTINCT FROM (NEW.value->>'allow_custom_entries')
      THEN 'toggle_allow_custom_entries'
    ELSE 'config_update'
  END;

  INSERT INTO public.name_permission_audit (
    setting_key, action, old_value, new_value, changed_by, changed_by_email
  ) VALUES (
    NEW.key,
    v_action,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.value ELSE NULL END,
    NEW.value,
    auth.uid(),
    v_email
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_name_permission_change ON public.website_settings;
CREATE TRIGGER trg_log_name_permission_change
  AFTER INSERT OR UPDATE ON public.website_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_name_permission_change();