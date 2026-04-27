-- Multi-SMTP support: add name + purpose + priority for purpose-based routing

ALTER TABLE public.smtp_config
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Default',
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- purpose values: 'all' (fallback/default), 'otp', 'welcome', 'notice', 'bulk', 'transactional', 'auth'
-- Keep existing single row as the 'all' default profile

COMMENT ON COLUMN public.smtp_config.purpose IS 'Email purpose this SMTP serves: all | otp | welcome | notice | bulk | transactional | auth';
COMMENT ON COLUMN public.smtp_config.priority IS 'Higher priority = preferred when multiple profiles match the purpose';

CREATE INDEX IF NOT EXISTS idx_smtp_config_purpose ON public.smtp_config(purpose) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_smtp_config_enabled ON public.smtp_config(is_enabled);