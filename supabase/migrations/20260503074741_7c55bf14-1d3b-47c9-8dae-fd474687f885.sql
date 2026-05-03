CREATE OR REPLACE FUNCTION public.get_resolved_print_footer(
  p_class_id uuid DEFAULT NULL,
  p_exam_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global jsonb;
  v_class record;
  v_exam record;
  v_pages boolean;
  v_inst boolean;
  v_margins jsonb;
  v_src_pages text;
  v_src_inst text;
BEGIN
  SELECT value INTO v_global FROM public.website_settings WHERE key = 'result_print_footer';
  IF v_global IS NULL OR jsonb_typeof(v_global) <> 'object' THEN
    v_global := jsonb_build_object(
      'show_page_numbers', true,
      'show_footer_institution', true,
      'margins', jsonb_build_object('top',10,'right',10,'bottom',12,'left',10)
    );
  END IF;

  IF p_class_id IS NOT NULL THEN
    SELECT show_page_numbers, show_footer_institution INTO v_class
      FROM public.result_print_footer_overrides
     WHERE scope = 'class' AND scope_id = p_class_id;
  END IF;
  IF p_exam_id IS NOT NULL THEN
    SELECT show_page_numbers, show_footer_institution INTO v_exam
      FROM public.result_print_footer_overrides
     WHERE scope = 'exam' AND scope_id = p_exam_id;
  END IF;

  IF v_class.show_page_numbers IS NOT NULL THEN
    v_pages := v_class.show_page_numbers; v_src_pages := 'class';
  ELSIF v_exam.show_page_numbers IS NOT NULL THEN
    v_pages := v_exam.show_page_numbers; v_src_pages := 'exam';
  ELSE
    v_pages := COALESCE((v_global->>'show_page_numbers')::boolean, true); v_src_pages := 'global';
  END IF;

  IF v_class.show_footer_institution IS NOT NULL THEN
    v_inst := v_class.show_footer_institution; v_src_inst := 'class';
  ELSIF v_exam.show_footer_institution IS NOT NULL THEN
    v_inst := v_exam.show_footer_institution; v_src_inst := 'exam';
  ELSE
    v_inst := COALESCE((v_global->>'show_footer_institution')::boolean, true); v_src_inst := 'global';
  END IF;

  v_margins := COALESCE(v_global->'margins', jsonb_build_object('top',10,'right',10,'bottom',12,'left',10));
  -- Sanitize margins server-side (3..25, bottom >=10)
  v_margins := jsonb_build_object(
    'top', LEAST(25, GREATEST(3, COALESCE((v_margins->>'top')::int, 10))),
    'right', LEAST(25, GREATEST(3, COALESCE((v_margins->>'right')::int, 10))),
    'bottom', LEAST(25, GREATEST(10, COALESCE((v_margins->>'bottom')::int, 12))),
    'left', LEAST(25, GREATEST(3, COALESCE((v_margins->>'left')::int, 10)))
  );

  RETURN jsonb_build_object(
    'show_page_numbers', v_pages,
    'show_footer_institution', v_inst,
    'margins', v_margins,
    'source', jsonb_build_object('pages', v_src_pages, 'inst', v_src_inst)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_resolved_print_footer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_resolved_print_footer(uuid, uuid) TO authenticated;
