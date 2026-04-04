
CREATE TABLE public.receipt_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default Receipt',
  name_bn text NOT NULL DEFAULT 'ডিফল্ট রিসিট',
  paper_size text NOT NULL DEFAULT 'a4_3up',
  design_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage receipt_settings" ON public.receipt_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view receipt_settings" ON public.receipt_settings
  FOR SELECT TO public
  USING (is_active = true);
