CREATE TABLE IF NOT EXISTS public.staff_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  old_designation TEXT,
  new_designation TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  letter_number TEXT,
  issued_by TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.staff_salary_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  old_salary NUMERIC(12,2),
  new_salary NUMERIC(12,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('increase','decrease','adjustment')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  letter_number TEXT,
  issued_by TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.staff_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_salary_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff_promotions" ON public.staff_promotions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage staff_salary_changes" ON public.staff_salary_changes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_staff_promotions_updated
  BEFORE UPDATE ON public.staff_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_staff_salary_changes_updated
  BEFORE UPDATE ON public.staff_salary_changes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_staff_promotions_staff ON public.staff_promotions(staff_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_salary_changes_staff ON public.staff_salary_changes(staff_id) WHERE deleted_at IS NULL;