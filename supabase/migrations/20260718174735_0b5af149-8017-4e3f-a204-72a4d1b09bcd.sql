
-- Fix 1: custom_form_submissions — prevent spoofing submitted_by
DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.custom_form_submissions;
CREATE POLICY "Anyone can insert submissions"
  ON public.custom_form_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by IS NULL OR submitted_by = auth.uid());

-- Fix 2: realtime.messages — drop unscoped permissive broadcast/subscribe policies.
-- App does not use realtime broadcast/presence (only postgres_changes, which does
-- not require policies on realtime.messages). Removing these prevents any
-- authenticated user from listening to or injecting into arbitrary topics.
DROP POLICY IF EXISTS "Authenticated can broadcast to realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages;
