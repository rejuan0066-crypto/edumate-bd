-- 1. Extend payments to remember what the gateway transaction was paying for
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fee_assignment_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'gateway',
  ADD COLUMN IF NOT EXISTS parent_account_id UUID NULL,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ NULL;

-- 2. Allocation audit table
CREATE TABLE IF NOT EXISTS public.fee_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NULL,
  trx_id TEXT NULL,
  source TEXT NOT NULL,                       -- 'gateway' | 'manual' | 'admin' | 'reversal'
  source_record_id UUID NULL,                 -- payments.id or parent_payment_requests.id
  parent_account_id UUID NULL,
  actor_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fpa_fee_payment ON public.fee_payment_allocations (fee_payment_id);
CREATE INDEX IF NOT EXISTS idx_fpa_source ON public.fee_payment_allocations (source, source_record_id);
CREATE INDEX IF NOT EXISTS idx_fpa_student ON public.fee_payment_allocations (student_id, created_at DESC);

ALTER TABLE public.fee_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read fee_payment_allocations" ON public.fee_payment_allocations;
CREATE POLICY "Admins read fee_payment_allocations"
ON public.fee_payment_allocations
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_accounts_staff(auth.uid())
);

-- 3. Core reconciliation RPC
CREATE OR REPLACE FUNCTION public.reconcile_fee_payment(
  p_student_id UUID,
  p_amount NUMERIC,
  p_fee_assignment_ids UUID[] DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_trx_id TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'admin',
  p_source_record_id UUID DEFAULT NULL,
  p_parent_account_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS TABLE(fee_payment_id UUID, allocated NUMERIC, new_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining NUMERIC := COALESCE(p_amount, 0);
  v_row RECORD;
  v_alloc NUMERIC;
  v_due NUMERIC;
  v_new_paid NUMERIC;
  v_new_status TEXT;
  v_receipt TEXT;
BEGIN
  IF v_remaining <= 0 OR p_student_id IS NULL THEN
    RETURN;
  END IF;

  v_receipt := COALESCE(p_trx_id, 'AUTO-' || to_char(now(), 'YYYYMMDDHH24MISS'));

  -- Iterate target rows: explicit ids first (in array order), then oldest-unpaid fallback.
  FOR v_row IN
    SELECT fp.id, fp.amount, COALESCE(fp.paid_amount, 0) AS paid_amount, fp.status
    FROM public.fee_payments fp
    WHERE fp.student_id = p_student_id
      AND fp.deleted_at IS NULL
      AND fp.status <> 'paid'
      AND (
        (p_fee_assignment_ids IS NOT NULL AND array_length(p_fee_assignment_ids, 1) IS NOT NULL
          AND fp.id = ANY(p_fee_assignment_ids))
        OR (p_fee_assignment_ids IS NULL OR array_length(p_fee_assignment_ids, 1) IS NULL)
      )
    ORDER BY
      CASE WHEN p_fee_assignment_ids IS NOT NULL THEN array_position(p_fee_assignment_ids, fp.id) END NULLS LAST,
      fp.year NULLS LAST, fp.month NULLS LAST, fp.created_at
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_due := GREATEST(v_row.amount - v_row.paid_amount, 0);
    IF v_due <= 0 THEN
      CONTINUE;
    END IF;

    v_alloc := LEAST(v_due, v_remaining);
    v_new_paid := v_row.paid_amount + v_alloc;
    v_new_status := CASE WHEN v_new_paid >= v_row.amount THEN 'paid' ELSE 'partial' END;

    UPDATE public.fee_payments
    SET paid_amount = v_new_paid,
        status = v_new_status,
        paid_at = COALESCE(paid_at, now()),
        receipt_number = COALESCE(receipt_number, v_receipt),
        collected_by = COALESCE(collected_by, p_source),
        updated_at = now()
    WHERE id = v_row.id;

    INSERT INTO public.fee_payment_allocations
      (fee_payment_id, student_id, amount, method, trx_id, source,
       source_record_id, parent_account_id, actor_id)
    VALUES
      (v_row.id, p_student_id, v_alloc, p_method, p_trx_id, p_source,
       p_source_record_id, p_parent_account_id, p_actor_id);

    v_remaining := v_remaining - v_alloc;

    fee_payment_id := v_row.id;
    allocated := v_alloc;
    new_status := v_new_status;
    RETURN NEXT;
  END LOOP;

  -- Stamp gateway record as reconciled
  IF p_source = 'gateway' AND p_source_record_id IS NOT NULL THEN
    UPDATE public.payments SET reconciled_at = now() WHERE id = p_source_record_id;
  END IF;
END;
$$;

-- 4. Reverse allocations (used when verified→pending/rejected or success→failed)
CREATE OR REPLACE FUNCTION public.reverse_fee_allocations(
  p_source TEXT,
  p_source_record_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alloc RECORD;
  v_reversed INT := 0;
  v_row RECORD;
  v_new_paid NUMERIC;
  v_new_status TEXT;
BEGIN
  FOR v_alloc IN
    SELECT id, fee_payment_id, student_id, amount
    FROM public.fee_payment_allocations
    WHERE source = p_source
      AND source_record_id = p_source_record_id
      AND amount > 0
  LOOP
    SELECT amount, COALESCE(paid_amount, 0) AS paid_amount
      INTO v_row
    FROM public.fee_payments
    WHERE id = v_alloc.fee_payment_id;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_new_paid := GREATEST(v_row.paid_amount - v_alloc.amount, 0);
    v_new_status := CASE
      WHEN v_new_paid <= 0 THEN 'unpaid'
      WHEN v_new_paid >= v_row.amount THEN 'paid'
      ELSE 'partial'
    END;

    UPDATE public.fee_payments
    SET paid_amount = v_new_paid,
        status = v_new_status,
        paid_at = CASE WHEN v_new_paid <= 0 THEN NULL ELSE paid_at END,
        receipt_number = CASE WHEN v_new_paid <= 0 THEN NULL ELSE receipt_number END,
        updated_at = now()
    WHERE id = v_alloc.fee_payment_id;

    -- Audit the reversal as a negative allocation
    INSERT INTO public.fee_payment_allocations
      (fee_payment_id, student_id, amount, source, source_record_id, actor_id, notes)
    VALUES
      (v_alloc.fee_payment_id, v_alloc.student_id, -v_alloc.amount, 'reversal',
       p_source_record_id, p_actor_id, 'Reversed ' || p_source);

    v_reversed := v_reversed + 1;
  END LOOP;

  RETURN v_reversed;
END;
$$;

-- 5. Trigger: parent_payment_requests status transitions
CREATE OR REPLACE FUNCTION public.on_parent_payment_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  -- Approve: pending → verified
  IF NEW.status = 'verified' AND COALESCE(OLD.status, '') <> 'verified' THEN
    NEW.verified_at := COALESCE(NEW.verified_at, now());
    NEW.verified_by := COALESCE(NEW.verified_by, v_actor);

    PERFORM public.reconcile_fee_payment(
      NEW.student_uuid,
      NEW.amount,
      NEW.fee_assignment_ids,
      NEW.method,
      NEW.trx_id,
      'manual',
      NEW.id,
      NEW.parent_account_id,
      v_actor
    );
  END IF;

  -- Revoke: verified → pending/rejected → reverse prior allocations
  IF COALESCE(OLD.status, '') = 'verified' AND NEW.status <> 'verified' THEN
    PERFORM public.reverse_fee_allocations('manual', NEW.id, v_actor);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parent_payment_request_reconcile ON public.parent_payment_requests;
CREATE TRIGGER trg_parent_payment_request_reconcile
BEFORE UPDATE OF status ON public.parent_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.on_parent_payment_request_status_change();

-- 6. Trigger: payments (gateway) status transitions
CREATE OR REPLACE FUNCTION public.on_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF NEW.status = 'success' AND COALESCE(OLD.status, '') <> 'success' AND NEW.student_id IS NOT NULL THEN
    PERFORM public.reconcile_fee_payment(
      NEW.student_id,
      NEW.amount,
      NEW.fee_assignment_ids,
      NEW.payment_method,
      NEW.transaction_id,
      'gateway',
      NEW.id,
      NEW.parent_account_id,
      v_actor
    );
  END IF;

  IF COALESCE(OLD.status, '') = 'success' AND NEW.status <> 'success' THEN
    PERFORM public.reverse_fee_allocations('gateway', NEW.id, v_actor);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_reconcile ON public.payments;
CREATE TRIGGER trg_payment_reconcile
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.on_payment_status_change();

-- Also reconcile freshly-inserted successful payments (e.g. webhook inserts a 'success' row directly)
CREATE OR REPLACE FUNCTION public.on_payment_insert_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'success' AND NEW.student_id IS NOT NULL THEN
    PERFORM public.reconcile_fee_payment(
      NEW.student_id, NEW.amount, NEW.fee_assignment_ids,
      NEW.payment_method, NEW.transaction_id,
      'gateway', NEW.id, NEW.parent_account_id, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_insert_reconcile ON public.payments;
CREATE TRIGGER trg_payment_insert_reconcile
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.on_payment_insert_success();