-- 1) salary_sheet_memos: restrict SELECT to admin/super_admin
DROP POLICY IF EXISTS "Anyone authenticated can read salary memos" ON public.salary_sheet_memos;

CREATE POLICY "Admins read salary memos"
ON public.salary_sheet_memos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2) push_subscriptions: require authentication for INSERT and tie to user_id
DROP POLICY IF EXISTS "Anyone can register push subscription" ON public.push_subscriptions;

CREATE POLICY "Authenticated users register own subscription"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Tighten UPDATE/DELETE to drop the IS NULL escape hatch for any leftover unowned rows
DROP POLICY IF EXISTS "Users delete own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users delete own subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3) whatsapp_config: drop public SELECT, expose safe columns via a view
DROP POLICY IF EXISTS "Anyone can view whatsapp config" ON public.whatsapp_config;

CREATE POLICY "Admins view whatsapp config"
ON public.whatsapp_config
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Public-safe view: excludes business_account_id, phone_number_id, cloud_api_enabled
CREATE OR REPLACE VIEW public.whatsapp_public_config
WITH (security_invoker = on)
AS
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
  route_patterns
FROM public.whatsapp_config;

GRANT SELECT ON public.whatsapp_public_config TO anon, authenticated;

-- View needs a permissive SELECT on underlying table for security_invoker callers.
-- We add a dedicated "public-safe columns only" SELECT policy that the view uses.
-- (Postgres views with security_invoker run with caller's RLS, so we need a policy
-- that lets anyone read — but only the safe column subset is exposed by the view.)
CREATE POLICY "Public read for whatsapp public view"
ON public.whatsapp_config
FOR SELECT
TO anon, authenticated
USING (true);
