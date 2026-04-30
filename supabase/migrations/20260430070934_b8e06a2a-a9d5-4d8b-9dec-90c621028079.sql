INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, description) VALUES
  ('user_create_admin_hourly',    200, 3600, 'Per-admin: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি ঘণ্টায়'),
  ('user_create_ip_hourly',       300, 3600, 'Per-IP: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি ঘণ্টায়'),
  ('user_sensitive_admin_hourly', 400, 3600, 'Per-admin: sensitive action প্রতি ঘণ্টায়'),
  ('user_sensitive_ip_hourly',    600, 3600, 'Per-IP: sensitive action প্রতি ঘণ্টায়')
ON CONFLICT (action) DO NOTHING;