-- Migration: Add payment rejection reason, custom collector, and soft delete to payments table
-- Safe for execution in Supabase SQL editor

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS collected_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Ensure staff and users can update their own pending/failed payments when editing/resubmitting
DROP POLICY IF EXISTS "Staff and creators can update pending or failed payments" ON public.payments;
CREATE POLICY "Staff and creators can update pending or failed payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR (created_by = auth.uid() AND status IN ('pending', 'failed'))
  OR (public.has_role(auth.uid(), 'staff') AND status IN ('pending', 'failed'))
  OR (public.has_role(auth.uid(), 'teacher') AND status IN ('pending', 'failed'))
);

-- Ensure admins can delete payments
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);
