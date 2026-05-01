
-- 1) Rate-limit config: 5 wrong manual donation TrxID attempts / 10 minutes per phone+IP
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, enabled)
VALUES
  ('donation_trx_verify_phone', 5, 600, true),
  ('donation_trx_verify_ip',    20, 600, true)
ON CONFLICT (action) DO UPDATE
  SET max_requests = EXCLUDED.max_requests,
      window_seconds = EXCLUDED.window_seconds,
      enabled = EXCLUDED.enabled;

-- 2) RPC called by /donation manual-submit. Enforces limits server-side and
--    on mismatch leaves the donor row 'pending' + notifies admins.
CREATE OR REPLACE FUNCTION public.verify_donation_attempt(
  _donor_id      uuid,
  _trx_id        text,
  _amount        numeric,
  _phone         text,
  _client_ip     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone_chk  jsonb;
  v_ip_chk     jsonb;
  v_result     jsonb;
  v_matched    boolean;
  v_donor      public.donors%ROWTYPE;
  v_phone_key  text := COALESCE(NULLIF(trim(_phone), ''), 'unknown');
  v_ip_key     text := COALESCE(NULLIF(trim(_client_ip), ''), 'unknown');
BEGIN
  -- Per-phone limit
  v_phone_chk := public.check_rate_limit(v_phone_key, 'phone', 'donation_trx_verify_phone');
  IF (v_phone_chk->>'ok')::boolean = false THEN
    -- Notify admins about lockout
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'Donation TrxID lockout',
      'দান যাচাই লকডাউন',
      format('Phone %s temporarily blocked after too many wrong TrxID attempts. Donor: %s', v_phone_key, _donor_id),
      format('ফোন %s বারবার ভুল TrxID দেওয়ায় সাময়িক ব্লকড। দাতা: %s', v_phone_key, _donor_id),
      'warning', 'donation', '/admin/donors'
    );
    RETURN jsonb_build_object(
      'matched', false, 'rate_limited', true, 'scope', 'phone',
      'retry_after', v_phone_chk->'retry_after'
    );
  END IF;

  -- Per-IP limit
  v_ip_chk := public.check_rate_limit(v_ip_key, 'ip', 'donation_trx_verify_ip');
  IF (v_ip_chk->>'ok')::boolean = false THEN
    RETURN jsonb_build_object(
      'matched', false, 'rate_limited', true, 'scope', 'ip',
      'retry_after', v_ip_chk->'retry_after'
    );
  END IF;

  -- Try to match against verified_payments
  v_result  := public.verify_donation_payment(_trx_id, _amount, _donor_id);
  v_matched := COALESCE((v_result->>'matched')::boolean, false);

  IF v_matched THEN
    UPDATE public.donors
       SET payment_status = 'verified', verified_at = now()
     WHERE id = _donor_id AND payment_status = 'pending';
    RETURN jsonb_build_object('matched', true, 'donor_id', _donor_id);
  END IF;

  -- Mismatch: keep donor 'pending', notify admins (one row per attempt)
  SELECT * INTO v_donor FROM public.donors WHERE id = _donor_id;
  INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
  VALUES (
    'Donation TrxID mismatch',
    'দান TrxID মিল হয়নি',
    format('Donor %s submitted unmatched TrxID "%s" for %s BDT (phone %s). Status remains pending.',
           COALESCE(v_donor.name_bn,'?'), _trx_id, _amount, v_phone_key),
    format('দাতা %s অমিল TrxID "%s" দিয়েছেন (পরিমাণ %s টাকা, ফোন %s)। স্ট্যাটাস pending রইল।',
           COALESCE(v_donor.name_bn,'?'), _trx_id, _amount, v_phone_key),
    'warning', 'donation', '/admin/donors'
  );

  RETURN jsonb_build_object(
    'matched', false, 'reason', v_result->>'error',
    'remaining_attempts', GREATEST(COALESCE((v_phone_chk->>'remaining')::int, 0), 0)
  );
END;
$$;

-- Allow anonymous /donation submitters to call it
GRANT EXECUTE ON FUNCTION public.verify_donation_attempt(uuid, text, numeric, text, text) TO anon, authenticated;
