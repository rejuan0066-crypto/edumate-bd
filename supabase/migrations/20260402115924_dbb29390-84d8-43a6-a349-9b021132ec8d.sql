
CREATE TABLE public.api_verification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT false,
  master_password text NOT NULL DEFAULT '',
  field_mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.api_verification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_verification_config"
  ON public.api_verification_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.api_verification_config (api_url, api_key, is_enabled, master_password, field_mappings)
VALUES ('', '', false, '', '{"student":{"name":"first_name","fatherName":"father_name","motherName":"mother_name","dateOfBirth":"date_of_birth","address":"address"},"staff":{"name":"name_bn","fatherName":"father_name","dateOfBirth":"date_of_birth","address":"address"}}');
