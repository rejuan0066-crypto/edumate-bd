-- Per-role OTP overrides matrix
ALTER TABLE public.otp_config
  ADD COLUMN IF NOT EXISTS role_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.otp_config.role_overrides IS
  'Per-role OTP flow overrides. Shape: { "<role>": { "login": bool, "password_reset": bool, "email_change": bool, "password_change": bool } }. Missing keys inherit global require_for_* flags.';