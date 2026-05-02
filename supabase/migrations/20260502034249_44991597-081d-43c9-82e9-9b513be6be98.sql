-- Per-path canonical role resync, callable by admin OR super_admin.
-- Returns the diff (added/removed roles) without exposing all modules.
CREATE OR REPLACE FUNCTION public.resync_canonical_module_roles_for_path(_menu_path text)
RETURNS TABLE(
  menu_path text,
  old_roles text[],
  new_roles text[],
  added_roles text[],
  removed_roles text[],
  changed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_canonical text[];
  v_old text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(v_uid, 'super_admin'::app_role)
       OR public.has_role(v_uid, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden: admin or super_admin required' USING ERRCODE = '42501';
  END IF;

  IF _menu_path IS NULL OR length(trim(_menu_path)) = 0 THEN
    RAISE EXCEPTION 'menu_path is required' USING ERRCODE = '22023';
  END IF;

  v_canonical := public.canonical_module_roles(_menu_path);

  IF v_canonical IS NULL THEN
    RAISE EXCEPTION 'No canonical role list defined for path: %', _menu_path
      USING ERRCODE = '22023';
  END IF;

  SELECT sm.visible_to_roles INTO v_old
  FROM public.system_modules sm
  WHERE sm.menu_path = _menu_path;

  IF v_old IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'Module not registered: %', _menu_path USING ERRCODE = 'P0002';
  END IF;

  v_old := COALESCE(v_old, ARRAY[]::text[]);

  -- Apply update only if different
  UPDATE public.system_modules
  SET visible_to_roles = v_canonical,
      updated_at = now()
  WHERE system_modules.menu_path = _menu_path
    AND COALESCE(visible_to_roles, ARRAY[]::text[]) IS DISTINCT FROM v_canonical;

  RETURN QUERY
  SELECT
    _menu_path,
    v_old,
    v_canonical,
    COALESCE(ARRAY(SELECT unnest(v_canonical) EXCEPT SELECT unnest(v_old)), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT unnest(v_old)       EXCEPT SELECT unnest(v_canonical)), ARRAY[]::text[]),
    (COALESCE(v_old, ARRAY[]::text[]) IS DISTINCT FROM v_canonical);
END;
$$;

REVOKE ALL ON FUNCTION public.resync_canonical_module_roles_for_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resync_canonical_module_roles_for_path(text) TO authenticated;