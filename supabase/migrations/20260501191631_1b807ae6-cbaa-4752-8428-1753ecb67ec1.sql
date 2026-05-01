CREATE TABLE IF NOT EXISTS public.complaint_field_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  label_bn text NOT NULL,
  label_en text NOT NULL,
  placeholder_bn text,
  placeholder_en text,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','email','phone','textarea','select','number')),
  options jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT true,
  is_locked boolean NOT NULL DEFAULT false,
  min_length integer,
  max_length integer,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccfc_order ON public.complaint_field_config(display_order);

ALTER TABLE public.complaint_field_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view complaint field config"
  ON public.complaint_field_config FOR SELECT USING (true);

CREATE POLICY "Admins manage complaint field config insert"
  ON public.complaint_field_config FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage complaint field config update"
  ON public.complaint_field_config FOR UPDATE
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Admins manage complaint field config delete"
  ON public.complaint_field_config FOR DELETE
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_ccfc_updated_at
BEFORE UPDATE ON public.complaint_field_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.complaint_field_config
  (field_key, label_bn, label_en, placeholder_bn, placeholder_en, field_type, is_visible, is_required, is_locked, min_length, max_length, display_order, options)
VALUES
  ('complainant_name','অভিযোগকারীর নাম','Complainant Name',NULL,NULL,'text',true,true,false,2,100,1,NULL),
  ('complainant_phone','মোবাইল নম্বর','Phone Number',NULL,NULL,'phone',true,true,false,6,20,2,NULL),
  ('complainant_email','ইমেইল','Email Address',NULL,NULL,'email',true,true,true,5,255,3,NULL),
  ('complainant_address','ঠিকানা','Address',NULL,NULL,'textarea',true,true,false,5,300,4,NULL),
  ('complainant_student_id','পরিচয়পত্র নম্বর (NID/জন্ম নিবন্ধন/অন্যান্য)','ID Number (NID/Birth Reg./Other)','NID, জন্ম নিবন্ধন বা অন্য যেকোনো পরিচয়পত্র','NID, Birth Registration or any other ID','text',true,true,false,3,50,5,NULL),
  ('category','ক্যাটাগরি','Category',NULL,NULL,'select',true,true,true,NULL,NULL,6,
    '[{"value":"academic","label_bn":"একাডেমিক","label_en":"Academic"},
      {"value":"administrative","label_bn":"প্রশাসনিক","label_en":"Administrative"},
      {"value":"financial","label_bn":"আর্থিক","label_en":"Financial"},
      {"value":"facility","label_bn":"সুবিধা","label_en":"Facility"},
      {"value":"discipline","label_bn":"শৃঙ্খলা","label_en":"Discipline"},
      {"value":"harassment","label_bn":"হয়রানি","label_en":"Harassment"},
      {"value":"other","label_bn":"অন্যান্য","label_en":"Other"}]'::jsonb),
  ('priority','অগ্রাধিকার','Priority',NULL,NULL,'select',true,true,true,NULL,NULL,7,
    '[{"value":"low","label_bn":"কম","label_en":"Low"},
      {"value":"medium","label_bn":"মাঝারি","label_en":"Medium"},
      {"value":"high","label_bn":"উচ্চ","label_en":"High"},
      {"value":"urgent","label_bn":"জরুরি","label_en":"Urgent"}]'::jsonb),
  ('subject','বিষয়','Subject',NULL,NULL,'text',true,true,true,3,200,8,NULL),
  ('description','বিবরণ','Description',NULL,NULL,'textarea',true,true,true,10,2000,9,NULL)
ON CONFLICT (field_key) DO NOTHING;