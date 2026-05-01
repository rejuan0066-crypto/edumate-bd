-- Parent signup field configuration
CREATE TABLE IF NOT EXISTS public.parent_signup_field_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key TEXT NOT NULL UNIQUE,
  label_bn TEXT NOT NULL,
  label_en TEXT NOT NULL,
  placeholder_bn TEXT,
  placeholder_en TEXT,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','email','phone','password','date','number')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  min_length INTEGER,
  max_length INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psfc_order ON public.parent_signup_field_config(display_order);

ALTER TABLE public.parent_signup_field_config ENABLE ROW LEVEL SECURITY;

-- Public read so signup page can render
CREATE POLICY "Anyone can view parent signup field config"
ON public.parent_signup_field_config FOR SELECT
USING (true);

CREATE POLICY "Admins manage parent signup field config insert"
ON public.parent_signup_field_config FOR INSERT
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage parent signup field config update"
ON public.parent_signup_field_config FOR UPDATE
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage parent signup field config delete"
ON public.parent_signup_field_config FOR DELETE
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER update_psfc_updated_at
BEFORE UPDATE ON public.parent_signup_field_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default fields
INSERT INTO public.parent_signup_field_config
  (field_key, label_bn, label_en, placeholder_bn, placeholder_en, field_type, is_visible, is_required, is_locked, min_length, max_length, display_order)
VALUES
  ('full_name','আপনার নাম','Your Full Name',NULL,NULL,'text',true,true,false,2,100,10),
  ('email','ইমেইল','Email',NULL,NULL,'email',true,true,true,5,150,20),
  ('phone','ফোন','Phone',NULL,NULL,'phone',true,false,false,7,20,30),
  ('password','পাসওয়ার্ড','Password',NULL,NULL,'password',true,true,true,6,128,40),
  ('student_id','ছাত্র আইডি','Student ID','STU-2026-001','STU-2026-001','text',true,true,true,3,50,50),
  ('student_dob','সন্তানের জন্মতারিখ (dd/mm/yyyy)','Child''s Date of Birth (dd/mm/yyyy)','dd/mm/yyyy','dd/mm/yyyy','date',true,true,true,10,10,60)
ON CONFLICT (field_key) DO NOTHING;