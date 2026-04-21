-- Certificate template designs (per type: certificate, transfer, testimonial)
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,         -- certificate | transfer | testimonial
  config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- design settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Anyone (printing flow) can read templates
CREATE POLICY "Anyone can read certificate templates"
ON public.certificate_templates FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert certificate templates"
ON public.certificate_templates FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update certificate templates"
ON public.certificate_templates FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete certificate templates"
ON public.certificate_templates FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rows for the 3 types so the designer can edit out of the box
INSERT INTO public.certificate_templates (template_type, config) VALUES
('certificate', '{}'::jsonb),
('transfer', '{}'::jsonb),
('testimonial', '{}'::jsonb)
ON CONFLICT (template_type) DO NOTHING;