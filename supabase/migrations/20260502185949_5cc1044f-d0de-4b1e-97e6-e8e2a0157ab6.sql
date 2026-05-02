-- Tighten SELECT policies on payments and fee_payments
-- Replaces "Anyone can view" with role/permission-scoped access.
-- Public callers that need data continue to work via:
--  * Edge functions (service role bypasses RLS): process-payment, payment-webhook
--  * /parent (anon) → uses new SECURITY DEFINER RPC get_parent_fee_payments
--  * /donation (anon INSERT) → unchanged; SELECT not required

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;

CREATE POLICY "Authorized roles can view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/payments', 'view')
  OR has_menu_permission(auth.uid(), '/admin/donors', 'view')
  OR has_menu_permission(auth.uid(), '/admin/verified-payments', 'view')
);

-- ============================================================
-- fee_payments
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view fee payments" ON public.fee_payments;

CREATE POLICY "Authorized roles can view fee_payments"
ON public.fee_payments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/fees', 'view')
  OR has_menu_permission(auth.uid(), '/admin/fee-collection', 'view')
  OR has_menu_permission(auth.uid(), '/admin/students-fees', 'view')
  OR has_menu_permission(auth.uid(), '/admin/fee-receipts', 'view')
);

-- ============================================================
-- RPC for unauthenticated parent portal to fetch a student's fee history.
-- Caller passes their parent_account_id; we verify linkage server-side.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_parent_fee_payments(
  _parent_account_id uuid,
  _student_uuid uuid
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  fee_type_id uuid,
  amount numeric,
  paid_amount numeric,
  month text,
  year integer,
  status text,
  paid_at timestamptz,
  receipt_number text,
  created_at timestamptz,
  fee_type_name text,
  fee_type_name_bn text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _linked boolean;
BEGIN
  IF _parent_account_id IS NULL OR _student_uuid IS NULL THEN
    RAISE EXCEPTION 'parent account and student required';
  END IF;

  -- Verify the parent account actually has access to this student
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_accounts pa
    WHERE pa.id = _parent_account_id
      AND _student_uuid = ANY(COALESCE(pa.linked_student_uuids, ARRAY[]::uuid[]))
  ) INTO _linked;

  IF NOT _linked THEN
    RAISE EXCEPTION 'access denied: student not linked to this parent account';
  END IF;

  RETURN QUERY
  SELECT
    fp.id,
    fp.student_id,
    fp.fee_type_id,
    fp.amount,
    fp.paid_amount,
    fp.month,
    fp.year,
    fp.status,
    fp.paid_at,
    fp.receipt_number,
    fp.created_at,
    ft.name        AS fee_type_name,
    ft.name_bn     AS fee_type_name_bn
  FROM public.fee_payments fp
  LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
  WHERE fp.student_id = _student_uuid
    AND fp.deleted_at IS NULL
  ORDER BY fp.paid_at DESC NULLS LAST, fp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_fee_payments(uuid, uuid) TO anon, authenticated;