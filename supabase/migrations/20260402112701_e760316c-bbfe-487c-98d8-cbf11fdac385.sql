CREATE TABLE public.address_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'division',
  parent_path text DEFAULT NULL,
  name text NOT NULL,
  name_en text NOT NULL,
  sub_type text DEFAULT NULL,
  post_code text DEFAULT NULL,
  action text NOT NULL DEFAULT 'add',
  original_name_en text DEFAULT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.address_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage address_custom" ON public.address_custom
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view address_custom" ON public.address_custom
  FOR SELECT TO public
  USING (is_active = true);