
-- Fix expense_institutions: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert expense_institutions" ON public.expense_institutions;
DROP POLICY IF EXISTS "Authenticated users can update expense_institutions" ON public.expense_institutions;
DROP POLICY IF EXISTS "Authenticated users can delete expense_institutions" ON public.expense_institutions;

CREATE POLICY "Admins can insert expense_institutions" ON public.expense_institutions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update expense_institutions" ON public.expense_institutions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete expense_institutions" ON public.expense_institutions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix resign_letters: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Authenticated users can update resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Authenticated users can delete resign letters" ON public.resign_letters;

CREATE POLICY "Admins can insert resign letters" ON public.resign_letters
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update resign letters" ON public.resign_letters
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete resign letters" ON public.resign_letters
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix salary_savings: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert salary_savings" ON public.salary_savings;
DROP POLICY IF EXISTS "Authenticated users can update salary_savings" ON public.salary_savings;
DROP POLICY IF EXISTS "Authenticated users can delete salary_savings" ON public.salary_savings;

CREATE POLICY "Admins can insert salary_savings" ON public.salary_savings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update salary_savings" ON public.salary_savings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete salary_savings" ON public.salary_savings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix salary_savings_ledger: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert salary_savings_ledger" ON public.salary_savings_ledger;
DROP POLICY IF EXISTS "Authenticated users can update salary_savings_ledger" ON public.salary_savings_ledger;
DROP POLICY IF EXISTS "Authenticated users can delete salary_savings_ledger" ON public.salary_savings_ledger;

CREATE POLICY "Admins can insert salary_savings_ledger" ON public.salary_savings_ledger
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update salary_savings_ledger" ON public.salary_savings_ledger
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete salary_savings_ledger" ON public.salary_savings_ledger
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix smtp_config: only admin can INSERT/UPDATE
DROP POLICY IF EXISTS "Authenticated users can insert smtp_config" ON public.smtp_config;
DROP POLICY IF EXISTS "Authenticated users can update smtp_config" ON public.smtp_config;

CREATE POLICY "Admins can insert smtp_config" ON public.smtp_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update smtp_config" ON public.smtp_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
