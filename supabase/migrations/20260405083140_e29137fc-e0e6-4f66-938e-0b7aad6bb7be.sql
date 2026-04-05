
CREATE TABLE IF NOT EXISTS public.fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fee_categories"
  ON public.fee_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage fee_categories"
  ON public.fee_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.fee_categories (name, name_bn, sort_order) VALUES
  ('monthly', 'মাসিক', 1),
  ('exam', 'পরীক্ষা', 2),
  ('admission', 'ভর্তি', 3),
  ('books', 'বই', 4),
  ('uniform', 'পোশাক', 5),
  ('other', 'অন্যান্য', 6);
