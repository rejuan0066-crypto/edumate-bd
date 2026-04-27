-- Email delivery log
CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  template_kind TEXT NOT NULL CHECK (template_kind IN ('user','student','other')),
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_created_at ON public.email_delivery_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status ON public.email_delivery_log (status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_kind ON public.email_delivery_log (template_kind);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient ON public.email_delivery_log (recipient_email);

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email delivery log"
ON public.email_delivery_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete email delivery log"
ON public.email_delivery_log FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));
