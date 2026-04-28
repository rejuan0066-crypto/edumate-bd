-- Add is_default flag to salary_workflow_settings
ALTER TABLE public.salary_workflow_settings
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_salary_workflow_settings_default
  ON public.salary_workflow_settings(role, is_default) WHERE is_default = true;