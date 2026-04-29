CREATE TABLE IF NOT EXISTS public.administrative_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_dept_name_bn_active
  ON public.administrative_departments (lower(name_bn))
  WHERE deleted_at IS NULL;

ALTER TABLE public.administrative_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view administrative departments" ON public.administrative_departments;
CREATE POLICY "Anyone authenticated can view administrative departments"
  ON public.administrative_departments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage administrative departments" ON public.administrative_departments;
CREATE POLICY "Admins manage administrative departments"
  ON public.administrative_departments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_admin_departments_updated_at ON public.administrative_departments;
CREATE TRIGGER set_admin_departments_updated_at
  BEFORE UPDATE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed common defaults
INSERT INTO public.administrative_departments (name, name_bn, sort_order)
VALUES
  ('Office', 'অফিস', 1),
  ('Accounts', 'হিসাব শাখা', 2),
  ('Administration', 'প্রশাসন', 3),
  ('Academic Section', 'একাডেমিক শাখা', 4),
  ('IT Section', 'আইটি শাখা', 5)
ON CONFLICT DO NOTHING;