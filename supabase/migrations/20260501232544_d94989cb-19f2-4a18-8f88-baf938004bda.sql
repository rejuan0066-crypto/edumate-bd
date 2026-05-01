-- 1) Donor extra columns
ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS nid             text,
  ADD COLUMN IF NOT EXISTS sender_number   text,
  ADD COLUMN IF NOT EXISTS purpose_key     text;

-- 2) Donation purposes (dropdown source)
CREATE TABLE IF NOT EXISTS public.donation_purposes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  label_bn    text NOT NULL,
  label_en    text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_purposes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donation_purposes public read active"
  ON public.donation_purposes FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "donation_purposes admin manage"
  ON public.donation_purposes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Seed common purposes (idempotent)
INSERT INTO public.donation_purposes (key, label_bn, label_en, sort_order) VALUES
  ('general',     'সাধারণ দান',           'General Donation',         10),
  ('zakat',       'যাকাত',                 'Zakat',                    20),
  ('sadaqah',     'সদকা',                  'Sadaqah',                  30),
  ('mosque',      'মসজিদ নির্মাণ',         'Mosque Construction',      40),
  ('madrasa',     'মাদরাসা ভবন',           'Madrasa Building',          50),
  ('education',   'ছাত্রদের শিক্ষা',       'Student Education',        60),
  ('orphan',      'এতিমদের সহায়তা',        'Orphan Support',           70),
  ('iftar',       'ইফতার বিতরণ',           'Iftar Distribution',       80),
  ('qurbani',     'কুরবানি',                'Qurbani',                   90),
  ('other',       'অন্যান্য',               'Other',                    999)
ON CONFLICT (key) DO NOTHING;

-- 3) Verified payments table (admin-seeded successful TrxIDs)
CREATE TABLE IF NOT EXISTS public.verified_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trx_id            text NOT NULL,
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  method            text NOT NULL DEFAULT 'bkash',
  sender_number     text,
  note              text,
  consumed_by_donor_id  uuid REFERENCES public.donors(id) ON DELETE SET NULL,
  consumed_at       timestamptz,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_verified_payments_trx
  ON public.verified_payments (lower(trx_id));

CREATE INDEX IF NOT EXISTS idx_verified_payments_unconsumed
  ON public.verified_payments (lower(trx_id)) WHERE consumed_at IS NULL;

ALTER TABLE public.verified_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified_payments admin manage"
  ON public.verified_payments
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  );
-- No public read policy → anon cannot list this table.

-- 4) RPC to verify a manual donation TrxID
CREATE OR REPLACE FUNCTION public.verify_donation_payment(
  _trx_id text,
  _amount numeric,
  _donor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row public.verified_payments%ROWTYPE;
BEGIN
  IF _trx_id IS NULL OR length(trim(_trx_id)) = 0 THEN
    RETURN jsonb_build_object('matched', false, 'error', 'EMPTY_TRX');
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('matched', false, 'error', 'INVALID_AMOUNT');
  END IF;

  SELECT * INTO _row
  FROM public.verified_payments
  WHERE lower(trx_id) = lower(trim(_trx_id))
    AND amount = _amount
    AND consumed_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'error', 'NO_MATCH');
  END IF;

  UPDATE public.verified_payments
     SET consumed_at = now(),
         consumed_by_donor_id = COALESCE(_donor_id, consumed_by_donor_id)
   WHERE id = _row.id
     AND consumed_at IS NULL;

  RETURN jsonb_build_object(
    'matched', true,
    'verified_payment_id', _row.id,
    'method', _row.method,
    'amount', _row.amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_donation_payment(text, numeric, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_donation_payment(text, numeric, uuid) TO anon, authenticated;

-- 5) Trigger that auto-verifies manual donations on insert/update.
-- Reads TrxID from notes pattern "TrxID: <id>" (matches existing DonationPage code).
CREATE OR REPLACE FUNCTION public.auto_verify_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _trx       text;
  _result    jsonb;
BEGIN
  -- Only act when payment is still pending
  IF NEW.payment_status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Extract TrxID from notes  e.g.  "TrxID: ABC123 | Manual"
  _trx := substring(COALESCE(NEW.notes, '') FROM 'TrxID:\s*([^\s|]+)');
  IF _trx IS NULL OR NEW.donation_amount IS NULL OR NEW.donation_amount <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT public.verify_donation_payment(_trx, NEW.donation_amount, NEW.id) INTO _result;

  IF (_result->>'matched')::boolean THEN
    NEW.payment_status := 'verified';
    NEW.verified_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_verify_donation ON public.donors;
CREATE TRIGGER trg_auto_verify_donation
  BEFORE INSERT OR UPDATE OF notes, donation_amount, payment_status ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.auto_verify_donation();

-- updated_at touch trigger for verified_payments
CREATE OR REPLACE FUNCTION public.touch_verified_payments_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_verified_payments ON public.verified_payments;
CREATE TRIGGER trg_touch_verified_payments
  BEFORE UPDATE ON public.verified_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_verified_payments_updated_at();