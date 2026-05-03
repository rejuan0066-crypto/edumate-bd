
ALTER TABLE public.salary_workflow_settings
  ADD COLUMN IF NOT EXISTS admin_officer_id UUID REFERENCES public.administrative_officers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_salary_workflow_settings_admin_officer
  ON public.salary_workflow_settings(admin_officer_id) WHERE admin_officer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS salary_workflow_settings_role_admin_uniq
  ON public.salary_workflow_settings(role, admin_officer_id) WHERE admin_officer_id IS NOT NULL;

ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS verifier_settings_id UUID REFERENCES public.salary_workflow_settings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approver_settings_id UUID REFERENCES public.salary_workflow_settings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS treasurer_settings_id UUID REFERENCES public.salary_workflow_settings(id) ON DELETE SET NULL;
