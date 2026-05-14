
-- 1. Remove the wide-open public policy on the base table
DROP POLICY IF EXISTS "Public read for whatsapp public view" ON public.whatsapp_config;

-- 2. Recreate the public view as SECURITY DEFINER (owner reads base table; callers only see safe columns)
DROP VIEW IF EXISTS public.whatsapp_public_config;

CREATE VIEW public.whatsapp_public_config
WITH (security_invoker = off, security_barrier = on) AS
SELECT
  id,
  phone_number,
  welcome_message,
  show_floating_button,
  button_position,
  button_label,
  default_language,
  business_hours,
  away_message,
  route_mode,
  route_patterns,
  -- Hard-coded false to satisfy existing client typing without leaking real value
  false AS cloud_api_enabled,
  NULL::text AS phone_number_id,
  NULL::text AS business_account_id
FROM public.whatsapp_config
LIMIT 1;

GRANT SELECT ON public.whatsapp_public_config TO anon, authenticated;
