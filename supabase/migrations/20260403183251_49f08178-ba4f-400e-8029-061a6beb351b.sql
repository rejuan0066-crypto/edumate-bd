
-- Payment Gateway Config table
CREATE TABLE public.payment_gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'generic',
  provider_name TEXT NOT NULL DEFAULT '',
  api_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  merchant_id TEXT NOT NULL DEFAULT '',
  callback_url TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  extra_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS Gateway Config table
CREATE TABLE public.sms_gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'generic',
  provider_name TEXT NOT NULL DEFAULT '',
  api_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  sender_id TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  extra_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.payment_gateway_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_gateway_config ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for payment_gateway_config
CREATE POLICY "Admins can view payment config" ON public.payment_gateway_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payment config" ON public.payment_gateway_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment config" ON public.payment_gateway_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment config" ON public.payment_gateway_config
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only policies for sms_gateway_config
CREATE POLICY "Admins can view sms config" ON public.sms_gateway_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sms config" ON public.sms_gateway_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sms config" ON public.sms_gateway_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sms config" ON public.sms_gateway_config
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
