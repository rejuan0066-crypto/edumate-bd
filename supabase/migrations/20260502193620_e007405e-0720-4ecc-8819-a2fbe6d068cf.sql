-- 1. Add metadata columns
ALTER TABLE public.rate_limit_config
  ADD COLUMN IF NOT EXISTS label_bn text,
  ADD COLUMN IF NOT EXISTS label_en text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_user_managed boolean NOT NULL DEFAULT false;

-- 2. Backfill labels/categories/scopes for known keys
UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'ইউজার তৈরি (প্রতি অ্যাডমিন/মিনিট)', label_en = 'User Create (per admin / minute)'
WHERE action = 'user_create_admin';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'ইউজার তৈরি (প্রতি অ্যাডমিন/ঘণ্টা)', label_en = 'User Create (per admin / hour)'
WHERE action = 'user_create_admin_hourly';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'ইউজার তৈরি (প্রতি IP/মিনিট)', label_en = 'User Create (per IP / minute)'
WHERE action = 'user_create_ip';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'ইউজার তৈরি (প্রতি IP/ঘণ্টা)', label_en = 'User Create (per IP / hour)'
WHERE action = 'user_create_ip_hourly';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'সংবেদনশীল কাজ (প্রতি অ্যাডমিন/মিনিট)', label_en = 'Sensitive action (per admin / minute)'
WHERE action = 'user_sensitive_admin';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'সংবেদনশীল কাজ (প্রতি অ্যাডমিন/ঘণ্টা)', label_en = 'Sensitive action (per admin / hour)'
WHERE action = 'user_sensitive_admin_hourly';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'সংবেদনশীল কাজ (প্রতি IP/মিনিট)', label_en = 'Sensitive action (per IP / minute)'
WHERE action = 'user_sensitive_ip';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'সংবেদনশীল কাজ (প্রতি IP/ঘণ্টা)', label_en = 'Sensitive action (per IP / hour)'
WHERE action = 'user_sensitive_ip_hourly';

UPDATE public.rate_limit_config SET category='otp', scope='email',
  label_bn='OTP পাঠানো (প্রতি ইমেইল/মিনিট)', label_en='OTP Send (per email / minute)'
WHERE action='otp_send_email';
UPDATE public.rate_limit_config SET category='otp', scope='ip',
  label_bn='OTP পাঠানো (প্রতি IP/মিনিট)', label_en='OTP Send (per IP / minute)'
WHERE action='otp_send_ip';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP পাঠানো (প্রতি মোবাইল/মিনিট)', label_en='OTP Send (per phone / minute)'
WHERE action='otp_send_phone';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP পাঠানো (প্রতি মোবাইল/ঘণ্টা)', label_en='OTP Send (per phone / hour)'
WHERE action='otp_send_phone_hourly';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP পাঠানো (প্রতি ইউজার/মিনিট)', label_en='OTP Send (per user / minute)'
WHERE action='otp_send_user';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP পাঠানো (প্রতি ইউজার/ঘণ্টা)', label_en='OTP Send (per user / hour)'
WHERE action='otp_send_user_hourly';
UPDATE public.rate_limit_config SET category='otp', scope='email',
  label_bn='OTP যাচাই (প্রতি ইমেইল/মিনিট)', label_en='OTP Verify (per email / minute)'
WHERE action='otp_verify_email';
UPDATE public.rate_limit_config SET category='otp', scope='ip',
  label_bn='OTP যাচাই (প্রতি IP/মিনিট)', label_en='OTP Verify (per IP / minute)'
WHERE action='otp_verify_ip';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP যাচাই (প্রতি মোবাইল/মিনিট)', label_en='OTP Verify (per phone / minute)'
WHERE action='otp_verify_phone';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP যাচাই (প্রতি মোবাইল/ঘণ্টা)', label_en='OTP Verify (per phone / hour)'
WHERE action='otp_verify_phone_hourly';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP যাচাই (প্রতি ইউজার/মিনিট)', label_en='OTP Verify (per user / minute)'
WHERE action='otp_verify_user';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP যাচাই (প্রতি ইউজার/ঘণ্টা)', label_en='OTP Verify (per user / hour)'
WHERE action='otp_verify_user_hourly';

UPDATE public.rate_limit_config SET category='donation', scope='ip',
  label_bn='অনুদান TrxID যাচাই (প্রতি IP)', label_en='Donation TrxID verify (per IP)'
WHERE action='donation_trx_verify_ip';
UPDATE public.rate_limit_config SET category='donation', scope='phone',
  label_bn='অনুদান TrxID যাচাই (প্রতি মোবাইল)', label_en='Donation TrxID verify (per phone)'
WHERE action='donation_trx_verify_phone';

UPDATE public.rate_limit_config SET category='admin_ops', scope='admin',
  label_bn='ডুপ্লিকেট চেক (প্রতি অ্যাডমিন)', label_en='Duplicate check (per admin)'
WHERE action='duplicate_check';

-- 3. Seed new keys
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, enabled, description, category, scope, label_bn, label_en, is_user_managed)
VALUES
  ('test_email_send', 5, 3600, true, 'টেস্ট ইমেইল পাঠানোর সীমা (প্রতি অ্যাডমিন/ঘণ্টা)', 'test_email', 'admin',
   'টেস্ট ইমেইল (প্রতি অ্যাডমিন/ঘণ্টা)', 'Test Email (per admin / hour)', false),
  ('receipt_verify_token', 60, 60, true, 'রসিদ QR যাচাই অনুরোধ', 'receipt', 'ip',
   'রসিদ QR যাচাই (প্রতি IP/মিনিট)', 'Receipt QR verify (per IP / minute)', false),
  ('parent_payment_request', 10, 60, true, 'অভিভাবক পেমেন্ট অনুরোধ', 'payment', 'user',
   'অভিভাবক পেমেন্ট অনুরোধ (প্রতি ইউজার/মিনিট)', 'Parent payment request (per user / minute)', false)
ON CONFLICT (action) DO UPDATE SET
  category = EXCLUDED.category,
  scope = EXCLUDED.scope,
  label_bn = COALESCE(public.rate_limit_config.label_bn, EXCLUDED.label_bn),
  label_en = COALESCE(public.rate_limit_config.label_en, EXCLUDED.label_en);

-- 4. RLS policies — drop existing and recreate with admin read + super_admin manage + admin update for existing
DROP POLICY IF EXISTS "rate_limit_config_admin_read" ON public.rate_limit_config;
DROP POLICY IF EXISTS "rate_limit_config_super_admin_all" ON public.rate_limit_config;
DROP POLICY IF EXISTS "rate_limit_config_admin_update" ON public.rate_limit_config;
DROP POLICY IF EXISTS "rate_limit_config_admin_delete_user_managed" ON public.rate_limit_config;

CREATE POLICY "rate_limit_config_admin_read"
ON public.rate_limit_config FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rate_limit_config_super_admin_all"
ON public.rate_limit_config FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rate_limit_config_admin_update"
ON public.rate_limit_config FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rate_limit_config_admin_delete_user_managed"
ON public.rate_limit_config FOR DELETE
USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) AND is_user_managed = true);
