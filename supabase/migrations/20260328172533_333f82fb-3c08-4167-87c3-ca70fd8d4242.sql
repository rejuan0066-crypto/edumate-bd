
CREATE TABLE public.custom_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  form_type text NOT NULL DEFAULT 'custom',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.custom_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  field_type text NOT NULL DEFAULT 'text',
  label text NOT NULL,
  label_bn text NOT NULL,
  placeholder text,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  options jsonb DEFAULT '[]'::jsonb,
  validation jsonb DEFAULT '{}'::jsonb,
  default_value text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom_forms" ON public.custom_forms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view custom_forms" ON public.custom_forms FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage custom_form_fields" ON public.custom_form_fields FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view custom_form_fields" ON public.custom_form_fields FOR SELECT TO public USING (true);
