
-- Expense Projects
CREATE TABLE public.expense_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense_projects" ON public.expense_projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view expense_projects" ON public.expense_projects FOR SELECT TO public USING (true);

-- Expense Categories (under projects)
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.expense_projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  name_bn text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view expense_categories" ON public.expense_categories FOR SELECT TO public USING (true);

-- Expense entries
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  project_id uuid REFERENCES public.expense_projects(id) NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id) NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  quantity numeric DEFAULT 1,
  has_receipt boolean DEFAULT false,
  receipt_url text,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Deposits
CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  deposit_date date NOT NULL DEFAULT CURRENT_DATE,
  bank_details text,
  other_details text,
  amount numeric NOT NULL DEFAULT 0,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage deposits" ON public.deposits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Monthly summary (for arrears/cash tracking)
CREATE TABLE public.expense_monthly_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL UNIQUE,
  total_expense numeric DEFAULT 0,
  total_deposit numeric DEFAULT 0,
  previous_arrears numeric DEFAULT 0,
  cash_amount numeric DEFAULT 0,
  principal_name text,
  casher_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_monthly_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense_monthly_summary" ON public.expense_monthly_summary FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
