ALTER TABLE public.payment_gateway_config
  ADD COLUMN IF NOT EXISTS webhook_secret text NOT NULL DEFAULT '';