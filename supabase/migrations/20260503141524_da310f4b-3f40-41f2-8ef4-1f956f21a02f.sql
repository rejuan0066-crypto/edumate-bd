-- Allow custom (non-staff) entries in salary_workflow_settings
ALTER TABLE public.salary_workflow_settings ALTER COLUMN staff_id DROP NOT NULL;

ALTER TABLE public.salary_workflow_settings DROP CONSTRAINT IF EXISTS salary_workflow_settings_role_staff_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS salary_workflow_settings_role_staff_uniq
  ON public.salary_workflow_settings (role, staff_id) WHERE staff_id IS NOT NULL;

ALTER TABLE public.salary_workflow_settings
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text;

-- Global toggle: allow admins to enable/disable custom entries
INSERT INTO public.website_settings (key, value)
VALUES ('salary_workflow_config', jsonb_build_object('allow_custom_entries', true))
ON CONFLICT (key) DO UPDATE
  SET value = COALESCE(public.website_settings.value, '{}'::jsonb)
              || jsonb_build_object(
                'allow_custom_entries',
                COALESCE((public.website_settings.value->>'allow_custom_entries')::boolean, true)
              );