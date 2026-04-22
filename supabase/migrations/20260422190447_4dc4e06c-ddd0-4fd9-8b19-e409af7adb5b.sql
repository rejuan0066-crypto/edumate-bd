-- Web Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone (logged in or anon) can register their own subscription
CREATE POLICY "Anyone can register push subscription"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Users can update/delete their own
CREATE POLICY "Users manage own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users delete own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (user_id = auth.uid() OR user_id IS NULL);

-- Admins view all
CREATE POLICY "Admins view all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Push notification log (audit)
CREATE TABLE IF NOT EXISTS public.push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  category TEXT DEFAULT 'general',
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  triggered_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage push log"
ON public.push_notification_log
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_push_subs_updated
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();