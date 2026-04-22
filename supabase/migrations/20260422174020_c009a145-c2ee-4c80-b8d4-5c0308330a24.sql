
-- Scholarships table
CREATE TABLE public.scholarships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description TEXT,
  scholarship_type TEXT NOT NULL DEFAULT 'merit',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_recipients INTEGER,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  eligibility_criteria TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scholarships"
ON public.scholarships FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage scholarships"
ON public.scholarships FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_scholarships_updated_at
BEFORE UPDATE ON public.scholarships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scholarship Awards table
CREATE TABLE public.scholarship_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  awarded_amount NUMERIC NOT NULL DEFAULT 0,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scholarship_id, student_id, academic_session_id)
);

ALTER TABLE public.scholarship_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scholarship awards"
ON public.scholarship_awards FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage scholarship awards"
ON public.scholarship_awards FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_scholarship_awards_updated_at
BEFORE UPDATE ON public.scholarship_awards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'annual',
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.expense_institutions(id) ON DELETE SET NULL,
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view budgets"
ON public.budgets FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage budgets"
ON public.budgets FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scholarship_awards_student ON public.scholarship_awards(student_id);
CREATE INDEX idx_scholarship_awards_scholarship ON public.scholarship_awards(scholarship_id);
CREATE INDEX idx_budgets_fiscal_year ON public.budgets(fiscal_year);
CREATE INDEX idx_budgets_period ON public.budgets(period_start, period_end);
