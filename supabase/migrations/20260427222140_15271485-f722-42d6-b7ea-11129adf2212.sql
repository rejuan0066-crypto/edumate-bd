
ALTER TABLE public.otp_config 
  ADD COLUMN IF NOT EXISTS require_for_login boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_for_password_reset boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_for_email_change boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_for_password_change boolean NOT NULL DEFAULT true;
