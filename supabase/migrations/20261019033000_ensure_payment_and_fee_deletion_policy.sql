-- Migration: Ensure authorized admins and staff can delete payments and fee_payments cleanly
DROP POLICY IF EXISTS "Staff can delete fee_payments with permission" ON public.fee_payments;
CREATE POLICY "Staff can delete fee_payments with permission"
  ON public.fee_payments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/fees', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-receipts', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'delete')
  );

DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-receipts', 'delete')
  );
