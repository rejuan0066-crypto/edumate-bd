-- Add per-phone and per-user OTP rate limit config rows
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, enabled, description)
VALUES
  ('otp_send_phone',   5,  60,   true, 'OTP send requests per phone per minute'),
  ('otp_send_phone_hourly', 15, 3600, true, 'OTP send requests per phone per hour'),
  ('otp_send_user',    5,  60,   true, 'OTP send requests per user (auth uid) per minute'),
  ('otp_send_user_hourly',  20, 3600, true, 'OTP send requests per user per hour'),
  ('otp_verify_phone', 10, 60,   true, 'OTP verify attempts per phone per minute'),
  ('otp_verify_phone_hourly', 30, 3600, true, 'OTP verify attempts per phone per hour'),
  ('otp_verify_user',  10, 60,   true, 'OTP verify attempts per user per minute'),
  ('otp_verify_user_hourly',  30, 3600, true, 'OTP verify attempts per user per hour')
ON CONFLICT (action) DO NOTHING;