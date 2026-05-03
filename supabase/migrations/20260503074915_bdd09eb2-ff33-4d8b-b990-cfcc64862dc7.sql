CREATE OR REPLACE FUNCTION public.ensure_result_print_footer_defaults()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default jsonb := jsonb_build_object(
    'show_page_numbers', true,
    'show_footer_institution', true,
    'margins', jsonb_build_object('top', 10, 'right', 10, 'bottom', 12, 'left', 10)
  );
  v_existing jsonb;
  v_merged jsonb;
BEGIN
  SELECT value INTO v_existing FROM public.website_settings WHERE key = 'result_print_footer';

  IF v_existing IS NULL OR jsonb_typeof(v_existing) <> 'object' THEN
    INSERT INTO public.website_settings(key, value, updated_at)
    VALUES ('result_print_footer', v_default, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    RETURN;
  END IF;

  -- Backfill missing keys without overwriting admin choices
  v_merged := v_existing;
  IF NOT (v_merged ? 'show_page_numbers') THEN
    v_merged := v_merged || jsonb_build_object('show_page_numbers', true);
  END IF;
  IF NOT (v_merged ? 'show_footer_institution') THEN
    v_merged := v_merged || jsonb_build_object('show_footer_institution', true);
  END IF;
  IF NOT (v_merged ? 'margins') OR jsonb_typeof(v_merged->'margins') <> 'object' THEN
    v_merged := v_merged || jsonb_build_object('margins', v_default->'margins');
  ELSE
    v_merged := jsonb_set(v_merged, '{margins}',
      (v_default->'margins') || (v_merged->'margins'));
  END IF;

  IF v_merged IS DISTINCT FROM v_existing THEN
    UPDATE public.website_settings SET value = v_merged, updated_at = now()
    WHERE key = 'result_print_footer';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_result_print_footer_defaults() FROM PUBLIC;

SELECT public.ensure_result_print_footer_defaults();
