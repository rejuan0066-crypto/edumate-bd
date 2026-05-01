-- Allow 'pending' status and default new accounts to 'pending'
ALTER TABLE public.student_accounts DROP CONSTRAINT IF EXISTS student_accounts_status_check;
ALTER TABLE public.student_accounts
  ADD CONSTRAINT student_accounts_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'rejected'::text]));

ALTER TABLE public.student_accounts ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;