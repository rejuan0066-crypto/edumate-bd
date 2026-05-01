-- student_accounts: one account per student_id (UNIQUE), email/phone OTP verified
CREATE TABLE IF NOT EXISTS public.student_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,                 -- email or phone (lowercased for email)
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email','phone')),
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  student_id TEXT NOT NULL,              -- references students.student_id
  student_dob DATE NOT NULL,
  linked_student_uuid UUID NOT NULL,
  contact_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','rejected')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One student → one account (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS student_accounts_student_id_key
  ON public.student_accounts (lower(student_id));
CREATE UNIQUE INDEX IF NOT EXISTS student_accounts_linked_uuid_key
  ON public.student_accounts (linked_student_uuid);
-- Unique contact (email or phone) so login works deterministically
CREATE UNIQUE INDEX IF NOT EXISTS student_accounts_contact_key
  ON public.student_accounts (lower(contact));

ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;

-- RLS: only super_admin / admin can directly read; signup/login goes through service role edge fn.
DROP POLICY IF EXISTS "Admins can view student accounts" ON public.student_accounts;
CREATE POLICY "Admins can view student accounts"
  ON public.student_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update student accounts" ON public.student_accounts;
CREATE POLICY "Admins can update student accounts"
  ON public.student_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete student accounts" ON public.student_accounts;
CREATE POLICY "Admins can delete student accounts"
  ON public.student_accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_student_accounts_updated ON public.student_accounts;
CREATE TRIGGER trg_student_accounts_updated
BEFORE UPDATE ON public.student_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();