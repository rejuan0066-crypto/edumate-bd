-- Salary PDF column configuration
CREATE TABLE public.salary_pdf_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  col_key text NOT NULL UNIQUE,
  label_bn text NOT NULL,
  label_en text NOT NULL,
  align text NOT NULL DEFAULT 'left' CHECK (align IN ('left','center','right')),
  weight numeric NOT NULL DEFAULT 5 CHECK (weight > 0),
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_salary_pdf_columns_order ON public.salary_pdf_columns (sort_order);

ALTER TABLE public.salary_pdf_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read salary pdf columns"
  ON public.salary_pdf_columns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage salary pdf columns - insert"
  ON public.salary_pdf_columns FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage salary pdf columns - update"
  ON public.salary_pdf_columns FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage salary pdf columns - delete"
  ON public.salary_pdf_columns FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_salary_pdf_columns_updated_at
  BEFORE UPDATE ON public.salary_pdf_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults (matches current COLUMNS registry in salary-pdf edge fn)
INSERT INTO public.salary_pdf_columns (col_key,label_bn,label_en,align,weight,sort_order) VALUES
  ('sl',         'ক্রঃ',                'SL',          'center', 3, 10),
  ('name',       'কর্মীর নাম ও আইডি',   'Name & ID',   'left',  15, 20),
  ('designation','পদবি',                'Designation', 'left',  12, 30),
  ('base',       'মূল বেতন (৳)',        'Base (BDT)',  'right',  8, 40),
  ('present',    'উপ',                  'P',           'center', 3, 50),
  ('absent',     'অনু',                 'A',           'center', 3, 60),
  ('late',       'বি',                  'L',           'center', 3, 70),
  ('leave',      'ছু',                  'Lv',          'center', 3, 80),
  ('deduction',  'কর্তন (৳)',           'Deduction',   'right',  8, 90),
  ('overtime',   'ওভারটাইম (৳)',        'Overtime',    'right',  7, 100),
  ('deposit',    'জমা (৳)',             'Deposit',     'right',  8, 110),
  ('totalDed',   'মোট কর্তন (৳)',       'Total Ded.',  'right',  9, 120),
  ('net',        'নিট প্রদেয় (৳)',     'Net Payable', 'right', 12, 130);