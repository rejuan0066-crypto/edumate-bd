CREATE TABLE IF NOT EXISTS public.role_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description_en TEXT,
  description_bn TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read role translations" ON public.role_translations;
CREATE POLICY "Public read role translations"
  ON public.role_translations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage role translations" ON public.role_translations;
CREATE POLICY "Admins manage role translations"
  ON public.role_translations FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_role_translations_updated_at
  BEFORE UPDATE ON public.role_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_translations (role_key, name_en, name_bn, is_system, sort_order) VALUES
  ('super_admin',    'Super Admin',          'সুপার অ্যাডমিন',     true, 1),
  ('admin',          'Admin',                'অ্যাডমিন',            true, 2),
  ('teacher',        'Teacher',              'শিক্ষক',              true, 3),
  ('staff',          'Staff',                'স্টাফ',                true, 4),
  ('administrative', 'Administrative',       'প্রশাসনিক',           true, 5),
  ('support',        'Support Staff',        'সহায়ক কর্মী',         true, 6),
  ('general',        'General',              'সাধারণ',              true, 7)
ON CONFLICT (role_key) DO NOTHING;