
ALTER TABLE public.salary_savings
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS expense_id UUID,
  ADD COLUMN IF NOT EXISTS expense_category_id UUID REFERENCES public.expense_categories(id),
  ADD COLUMN IF NOT EXISTS expense_institution_id UUID REFERENCES public.expense_institutions(id);

CREATE INDEX IF NOT EXISTS idx_salary_savings_disbursed ON public.salary_savings(disbursed_at);
