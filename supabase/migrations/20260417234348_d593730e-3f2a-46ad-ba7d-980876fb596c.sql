CREATE TABLE public.parent_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  student_id TEXT NOT NULL,
  student_dob DATE NOT NULL,
  linked_student_uuid UUID REFERENCES public.students(id) ON DELETE SET NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parent_accounts_email ON public.parent_accounts(email);
CREATE INDEX idx_parent_accounts_student_id ON public.parent_accounts(student_id);
CREATE INDEX idx_parent_accounts_status ON public.parent_accounts(status);

ALTER TABLE public.parent_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can signup as parent"
ON public.parent_accounts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can read parent accounts"
ON public.parent_accounts FOR SELECT
USING (true);

CREATE POLICY "Admins can update parent accounts"
ON public.parent_accounts FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete parent accounts"
ON public.parent_accounts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_parent_accounts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_parent_accounts_updated_at
BEFORE UPDATE ON public.parent_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_parent_accounts_updated_at();

CREATE OR REPLACE FUNCTION public.notify_on_parent_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
  VALUES (
    'New Parent Signup: ' || NEW.full_name,
    'নতুন অভিভাবক সাইনআপ: ' || NEW.full_name,
    'Student ID: ' || NEW.student_id || ', Email: ' || NEW.email,
    'ছাত্র আইডি: ' || NEW.student_id || ', ইমেইল: ' || NEW.email,
    'info',
    'parent',
    '/admin/parent-approvals'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_parent_signup
AFTER INSERT ON public.parent_accounts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_parent_signup();