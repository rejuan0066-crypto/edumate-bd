CREATE TABLE IF NOT EXISTS public.otp_verify_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  purpose text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_verify_attempts_email_purpose_created_idx
  ON public.otp_verify_attempts (email, purpose, created_at DESC);

ALTER TABLE public.otp_verify_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert verify attempts" ON public.otp_verify_attempts;
CREATE POLICY "Anyone can insert verify attempts"
  ON public.otp_verify_attempts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read verify attempts" ON public.otp_verify_attempts;
CREATE POLICY "Anyone can read verify attempts"
  ON public.otp_verify_attempts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage verify attempts" ON public.otp_verify_attempts;
CREATE POLICY "Admins manage verify attempts"
  ON public.otp_verify_attempts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));