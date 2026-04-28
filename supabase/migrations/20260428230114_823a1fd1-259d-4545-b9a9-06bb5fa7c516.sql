
-- Salary approval workflow: extend salary_records & add settings table

ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS prepared_by_name text,
  ADD COLUMN IF NOT EXISTS prepared_by_role text,
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS verifier_staff_id uuid,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_by_name text,
  ADD COLUMN IF NOT EXISTS verified_by_role text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS approver_staff_id uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_by_role text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS paid_by_name text,
  ADD COLUMN IF NOT EXISTS paid_by_role text,
  ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS workflow_notes text;

-- Allowed stages: draft, pending_verification, verified, pending_approval, approved, paid, rejected
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_records_workflow_stage_chk'
  ) THEN
    ALTER TABLE public.salary_records
      ADD CONSTRAINT salary_records_workflow_stage_chk
      CHECK (workflow_stage IN ('draft','pending_verification','verified','pending_approval','approved','paid','rejected'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_salary_records_workflow_stage ON public.salary_records(workflow_stage);

-- Workflow history (audit trail)
CREATE TABLE IF NOT EXISTS public.salary_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_record_id uuid REFERENCES public.salary_records(id) ON DELETE CASCADE,
  month_year text,
  staff_id uuid,
  from_stage text,
  to_stage text NOT NULL,
  action text NOT NULL,
  actor_user_id uuid,
  actor_name text,
  actor_role text,
  target_staff_id uuid,
  target_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view salary workflow history"
  ON public.salary_workflow_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert salary workflow history"
  ON public.salary_workflow_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Workflow settings: which staff can act as verifier/approver/treasurer
CREATE TABLE IF NOT EXISTS public.salary_workflow_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('verifier','approver','treasurer')),
  staff_id uuid NOT NULL,
  display_name text,
  designation text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, staff_id)
);

ALTER TABLE public.salary_workflow_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view workflow settings"
  ON public.salary_workflow_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage workflow settings"
  ON public.salary_workflow_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_salary_workflow_settings_updated_at
  BEFORE UPDATE ON public.salary_workflow_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
