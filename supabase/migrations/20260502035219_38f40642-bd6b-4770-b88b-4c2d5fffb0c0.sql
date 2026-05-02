CREATE OR REPLACE FUNCTION public.canonical_module_roles(_menu_path text)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE _menu_path
    WHEN '/admin/donors' THEN ARRAY['super_admin','admin']::text[]
    WHEN '/admin/verified-payments' THEN ARRAY['super_admin','admin']::text[]
    WHEN '/admin/complaints' THEN ARRAY['super_admin','admin']::text[]
    WHEN '/admin/receipts' THEN ARRAY['super_admin','admin','accounts']::text[]
    WHEN '/admin/fee-receipts' THEN ARRAY['super_admin','admin','accounts']::text[]
    ELSE NULL
  END;
$function$;