CREATE TABLE IF NOT EXISTS public.receipt_status_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  receipt_number text,
  student_id uuid,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  change_source text,
  payment_method text,
  trx_id text,
  amount numeric(12,2),
  rejection_reason text,
  note text,
  ip_address text,
  user_agent text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_source
  ON public.receipt_status_audit (source_table, source_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_student
  ON public.receipt_status_audit (student_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_receipt
  ON public.receipt_status_audit (receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_changed_at
  ON public.receipt_status_audit (changed_at DESC);

ALTER TABLE public.receipt_status_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view receipt status audit"
ON public.receipt_status_audit
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_accounts_staff(auth.uid())
);

CREATE OR REPLACE FUNCTION public.resolve_actor_name(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = _uid LIMIT 1),
    'System'
  );
$$;

CREATE OR REPLACE FUNCTION public.audit_fee_payments_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, receipt_number, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, amount
    ) VALUES (
      'fee_payments', NEW.id, NEW.receipt_number, NEW.student_id,
      NULL, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      CASE WHEN v_actor IS NULL THEN 'system' ELSE 'admin' END,
      NEW.paid_amount
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') IS DISTINCT FROM COALESCE(NEW.status,'') THEN
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, receipt_number, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, amount
    ) VALUES (
      'fee_payments', NEW.id, NEW.receipt_number, NEW.student_id,
      OLD.status, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      CASE WHEN v_actor IS NULL THEN 'system' ELSE 'admin' END,
      NEW.paid_amount
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_fee_payments_status ON public.fee_payments;
CREATE TRIGGER trg_audit_fee_payments_status
AFTER INSERT OR UPDATE OF status ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_fee_payments_status();

CREATE OR REPLACE FUNCTION public.audit_parent_payment_requests_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), NEW.verified_by);
  v_source text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_source := CASE WHEN NEW.method IN ('bkash','nagad','rocket','upay','online','gateway') THEN 'gateway'
                     ELSE 'parent_portal' END;
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, payment_method, trx_id, amount, note
    ) VALUES (
      'parent_payment_requests', NEW.id, NEW.student_uuid,
      NULL, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      v_source, NEW.method, NEW.trx_id, NEW.amount, NEW.note
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') IS DISTINCT FROM COALESCE(NEW.status,'') THEN
    v_source := CASE
      WHEN auth.uid() IS NOT NULL THEN 'admin'
      WHEN NEW.method IN ('bkash','nagad','rocket','upay','online','gateway') THEN 'gateway'
      ELSE 'system'
    END;
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, payment_method, trx_id, amount,
      rejection_reason, note
    ) VALUES (
      'parent_payment_requests', NEW.id, NEW.student_uuid,
      OLD.status, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      v_source, NEW.method, NEW.trx_id, NEW.amount,
      NEW.rejection_reason, NEW.note
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_parent_payment_requests_status ON public.parent_payment_requests;
CREATE TRIGGER trg_audit_parent_payment_requests_status
AFTER INSERT OR UPDATE OF status ON public.parent_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_parent_payment_requests_status();