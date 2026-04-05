
CREATE TABLE public.student_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.student_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student_categories" ON public.student_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view student_categories" ON public.student_categories FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Staff can manage student_categories" ON public.student_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

INSERT INTO public.student_categories (name, name_bn, sort_order) VALUES
  ('general', 'সাধারণ', 1),
  ('orphan', 'এতিম', 2),
  ('poor', 'গরীব', 3),
  ('teachers_child', 'শিক্ষক সন্তান', 4);
