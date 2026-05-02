
-- 1) Sync /admin/donors visible_to_roles with all approved roles for this menu.
--    Approved roles for the donor management page (per app routing & RBAC):
--      - super_admin (full bypass)
--      - admin       (default admin access)
--    Note: 'accountant' is a STAFF CATEGORY (job title), not an app_role enum value.
--    Accountant access is enforced via is_accounts_staff() + permission system,
--    not via system_modules.visible_to_roles, so it is intentionally NOT listed here.

UPDATE public.system_modules
SET visible_to_roles = ARRAY['super_admin','admin']::text[],
    updated_at = now()
WHERE menu_path = '/admin/donors';

-- 2) Helper: returns the canonical (approved) role list for a given menu_path.
--    Centralised so future edits stay in one place.
CREATE OR REPLACE FUNCTION public.canonical_module_roles(_menu_path text)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _menu_path
    WHEN '/admin/donors' THEN ARRAY['super_admin','admin']::text[]
    ELSE NULL
  END;
$$;

-- 3) Auto-correction: sanitise visible_to_roles on insert/update so that:
--      a) only valid app_role enum values are stored
--      b) duplicates are removed
--      c) for menu_paths with a canonical list, the array is force-reset to canonical
CREATE OR REPLACE FUNCTION public.sanitize_system_module_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_roles text[];
  cleaned text[];
  canonical text[];
BEGIN
  -- Collect all valid app_role enum values
  SELECT array_agg(e::text)
    INTO valid_roles
  FROM unnest(enum_range(NULL::app_role)) e;

  -- Remove invalid/duplicate roles (preserve order via DISTINCT subquery)
  IF NEW.visible_to_roles IS NOT NULL THEN
    SELECT array_agg(DISTINCT r)
      INTO cleaned
    FROM unnest(NEW.visible_to_roles) r
    WHERE r = ANY(valid_roles);
    NEW.visible_to_roles := COALESCE(cleaned, ARRAY[]::text[]);
  END IF;

  -- If this menu has a canonical role list, force-reset to it
  canonical := public.canonical_module_roles(NEW.menu_path);
  IF canonical IS NOT NULL THEN
    NEW.visible_to_roles := canonical;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_system_module_roles ON public.system_modules;
CREATE TRIGGER trg_sanitize_system_module_roles
BEFORE INSERT OR UPDATE OF visible_to_roles, menu_path
ON public.system_modules
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_system_module_roles();

-- 4) On-demand repair: callable by super_admin to re-sync ALL modules that
--    have a canonical role list. Returns the rows it corrected.
CREATE OR REPLACE FUNCTION public.resync_canonical_module_roles()
RETURNS TABLE(menu_path text, old_roles text[], new_roles text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super_admin can resync module roles';
  END IF;

  RETURN QUERY
  WITH targets AS (
    SELECT sm.id,
           sm.menu_path AS mp,
           sm.visible_to_roles AS old_r,
           public.canonical_module_roles(sm.menu_path) AS new_r
    FROM public.system_modules sm
    WHERE public.canonical_module_roles(sm.menu_path) IS NOT NULL
  ),
  changed AS (
    UPDATE public.system_modules sm
    SET visible_to_roles = t.new_r,
        updated_at = now()
    FROM targets t
    WHERE sm.id = t.id
      AND COALESCE(sm.visible_to_roles, ARRAY[]::text[]) IS DISTINCT FROM t.new_r
    RETURNING sm.menu_path, t.old_r, t.new_r
  )
  SELECT c.menu_path, c.old_r, c.new_r FROM changed c;
END;
$$;

REVOKE ALL ON FUNCTION public.resync_canonical_module_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resync_canonical_module_roles() TO authenticated;
