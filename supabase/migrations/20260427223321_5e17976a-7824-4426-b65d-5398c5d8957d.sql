
-- 1. New columns
ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS failed_reason text,
  ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz;

-- 2. Constrain payment_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'donors_payment_status_check'
  ) THEN
    ALTER TABLE public.donors
      ADD CONSTRAINT donors_payment_status_check
      CHECK (payment_status IN ('pending', 'verified', 'failed'));
  END IF;
END $$;

-- 3. Backfill: existing 'active' rows are treated as verified (preserves old behaviour)
UPDATE public.donors
SET payment_status = 'verified',
    verified_at = COALESCE(verified_at, created_at)
WHERE payment_status = 'pending' AND status = 'active';

-- 4. Auto-assign receipt_number when a row transitions to 'verified'
CREATE OR REPLACE FUNCTION public.assign_donation_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int;
  v_count int;
BEGIN
  IF NEW.payment_status = 'verified' AND (NEW.receipt_number IS NULL OR NEW.receipt_number = '') THEN
    v_year := EXTRACT(YEAR FROM COALESCE(NEW.verified_at, now()))::int;
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.donors
    WHERE receipt_number LIKE 'DR-' || v_year::text || '-%';
    NEW.receipt_number := 'DR-' || v_year::text || '-' || lpad(v_count::text, 5, '0');
    IF NEW.verified_at IS NULL THEN
      NEW.verified_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_donation_receipt_number ON public.donors;
CREATE TRIGGER trg_assign_donation_receipt_number
  BEFORE INSERT OR UPDATE OF payment_status ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_donation_receipt_number();

-- 5. Backfill receipt numbers for already-verified rows missing them
DO $$
DECLARE
  r RECORD;
  v_year int;
  v_count int;
BEGIN
  FOR r IN
    SELECT id, COALESCE(verified_at, created_at) AS ts
    FROM public.donors
    WHERE payment_status = 'verified' AND (receipt_number IS NULL OR receipt_number = '')
    ORDER BY COALESCE(verified_at, created_at)
  LOOP
    v_year := EXTRACT(YEAR FROM r.ts)::int;
    SELECT COUNT(*) + 1 INTO v_count FROM public.donors
    WHERE receipt_number LIKE 'DR-' || v_year::text || '-%';
    UPDATE public.donors
      SET receipt_number = 'DR-' || v_year::text || '-' || lpad(v_count::text, 5, '0')
      WHERE id = r.id;
  END LOOP;
END $$;
