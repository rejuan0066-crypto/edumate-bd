
CREATE TABLE public.document_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  layout_type TEXT NOT NULL DEFAULT 'form',
  category TEXT NOT NULL DEFAULT 'student',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.document_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document_layouts" ON public.document_layouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view document_layouts" ON public.document_layouts
  FOR SELECT TO public
  USING (is_active = true);
