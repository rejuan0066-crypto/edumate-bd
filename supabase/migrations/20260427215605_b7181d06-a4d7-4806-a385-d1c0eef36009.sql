
CREATE TABLE IF NOT EXISTS public.email_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  brand_color TEXT,
  changed_by UUID,
  changed_by_email TEXT,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etv_template ON public.email_template_versions(template_id, version_number DESC);

ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view template versions"
  ON public.email_template_versions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert template versions"
  ON public.email_template_versions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Snapshot trigger: before UPDATE, save current row as a version
CREATE OR REPLACE FUNCTION public.snapshot_email_template_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
  v_user UUID;
  v_email TEXT;
BEGIN
  -- Skip if nothing meaningful changed
  IF OLD.subject = NEW.subject
     AND OLD.html_body = NEW.html_body
     AND COALESCE(OLD.brand_color,'') = COALESCE(NEW.brand_color,'') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
  FROM public.email_template_versions WHERE template_id = OLD.id;

  BEGIN v_user := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user := NULL; END;
  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  INSERT INTO public.email_template_versions
    (template_id, template_key, version_number, subject, html_body, brand_color, changed_by, changed_by_email)
  VALUES
    (OLD.id, OLD.template_key, v_next, OLD.subject, OLD.html_body, OLD.brand_color, v_user, v_email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_template_snapshot ON public.email_templates;
CREATE TRIGGER trg_email_template_snapshot
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_email_template_version();
