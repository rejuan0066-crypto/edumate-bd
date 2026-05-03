-- Backfill/seed dynamic name configuration for existing installations
-- Idempotent: safe to run multiple times.

-- 1) Ensure salary_workflow_config row exists with sensible defaults
INSERT INTO public.website_settings (key, value)
VALUES ('salary_workflow_config', '{"allow_custom_entries": true}'::jsonb)
ON CONFLICT (key) DO UPDATE
  SET value = public.website_settings.value
              || jsonb_build_object(
                   'allow_custom_entries',
                   COALESCE(public.website_settings.value->'allow_custom_entries', 'true'::jsonb)
                 );

-- 2) Backfill function: refresh display_name/designation/source on existing
--    salary_workflow_settings rows from their source records (staff or
--    administrative_officers). Only fills empty/NULL values, never overwrites
--    custom entries.
CREATE OR REPLACE FUNCTION public.backfill_salary_workflow_names()
RETURNS TABLE(updated_count integer, seeded_config boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  -- Refresh names from staff
  WITH upd AS (
    UPDATE public.salary_workflow_settings s
       SET display_name = COALESCE(NULLIF(s.display_name, ''), st.name_bn, st.name_en),
           designation  = COALESCE(NULLIF(s.designation, ''), st.designation),
           source       = COALESCE(s.source, 'staff')
      FROM public.staff st
     WHERE s.is_custom = false
       AND s.staff_id = st.id
       AND (s.display_name IS NULL OR s.display_name = ''
            OR s.designation IS NULL OR s.designation = ''
            OR s.source IS NULL)
    RETURNING 1
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM upd;

  -- Refresh names from administrative_officers (matched on staff_id column
  -- when source='administrative')
  WITH upd2 AS (
    UPDATE public.salary_workflow_settings s
       SET display_name = COALESCE(NULLIF(s.display_name, ''), ao.name_bn, ao.name_en),
           designation  = COALESCE(NULLIF(s.designation, ''), ao.designation),
           source       = 'administrative'
      FROM public.administrative_officers ao
     WHERE s.is_custom = false
       AND s.source = 'administrative'
       AND s.staff_id = ao.id
       AND (s.display_name IS NULL OR s.display_name = ''
            OR s.designation IS NULL OR s.designation = '')
    RETURNING 1
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM upd2;

  RETURN QUERY SELECT v_updated, true;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_salary_workflow_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_salary_workflow_names() TO authenticated;

-- 3) Run the backfill once as part of this migration
SELECT public.backfill_salary_workflow_names();
