CREATE TABLE IF NOT EXISTS public.result_footer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  scope text NOT NULL CHECK (scope IN ('global','class','exam')),
  scope_id uuid,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_footer_audit_created ON public.result_footer_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_footer_audit_scope ON public.result_footer_audit (scope, scope_id);

ALTER TABLE public.result_footer_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view footer audit"
  ON public.result_footer_audit FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Trigger fn for global footer setting (website_settings row with key='result_print_footer')
CREATE OR REPLACE FUNCTION public.log_result_print_footer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.key <> 'result_print_footer' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.key <> 'result_print_footer' AND OLD.key <> 'result_print_footer' THEN RETURN NEW; END IF;
  IF TG_OP = 'DELETE' AND OLD.key <> 'result_print_footer' THEN RETURN OLD; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, 'global', NULL, 'insert', NULL, NEW.value);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.value IS DISTINCT FROM NEW.value THEN
      INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
      VALUES (auth.uid(), v_email, 'global', NULL, 'update', OLD.value, NEW.value);
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, 'global', NULL, 'delete', OLD.value, NULL);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_result_print_footer ON public.website_settings;
CREATE TRIGGER trg_log_result_print_footer
  AFTER INSERT OR UPDATE OR DELETE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_result_print_footer_change();

-- Trigger fn for per-class / per-exam overrides
CREATE OR REPLACE FUNCTION public.log_result_footer_override_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, NEW.scope, NEW.scope_id, 'insert', NULL,
            jsonb_build_object('show_page_numbers', NEW.show_page_numbers, 'show_footer_institution', NEW.show_footer_institution));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.show_page_numbers IS DISTINCT FROM NEW.show_page_numbers
       OR OLD.show_footer_institution IS DISTINCT FROM NEW.show_footer_institution THEN
      INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
      VALUES (auth.uid(), v_email, NEW.scope, NEW.scope_id, 'update',
              jsonb_build_object('show_page_numbers', OLD.show_page_numbers, 'show_footer_institution', OLD.show_footer_institution),
              jsonb_build_object('show_page_numbers', NEW.show_page_numbers, 'show_footer_institution', NEW.show_footer_institution));
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, OLD.scope, OLD.scope_id, 'delete',
            jsonb_build_object('show_page_numbers', OLD.show_page_numbers, 'show_footer_institution', OLD.show_footer_institution), NULL);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_result_footer_override ON public.result_print_footer_overrides;
CREATE TRIGGER trg_log_result_footer_override
  AFTER INSERT OR UPDATE OR DELETE ON public.result_print_footer_overrides
  FOR EACH ROW EXECUTE FUNCTION public.log_result_footer_override_change();
