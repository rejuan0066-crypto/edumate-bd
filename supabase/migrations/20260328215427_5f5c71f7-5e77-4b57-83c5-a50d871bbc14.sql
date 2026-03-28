
CREATE TABLE public.validation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL DEFAULT 'student',
  rule_level TEXT NOT NULL DEFAULT 'field',
  field_name TEXT,
  rule_type TEXT NOT NULL DEFAULT 'required',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  error_message_bn TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage validation_rules" ON public.validation_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active validation_rules" ON public.validation_rules FOR SELECT TO public USING (is_active = true);

INSERT INTO public.validation_rules (name, name_bn, module, rule_level, field_name, rule_type, config, error_message, error_message_bn, sort_order) VALUES
('NID Must Be 10 or 17 Digits', 'NID অবশ্যই ১০ বা ১৭ সংখ্যার হতে হবে', 'student', 'field', 'nid', 'format', '{"pattern": "^(\\d{10}|\\d{17})$"}', 'NID must be 10 or 17 digits', 'NID অবশ্যই ১০ বা ১৭ সংখ্যার হতে হবে', 1),
('Birth Reg Must Be 17 Digits', 'জন্ম নিবন্ধন অবশ্যই ১৭ সংখ্যার হতে হবে', 'student', 'field', 'birth_reg', 'format', '{"pattern": "^\\d{17}$"}', 'Birth Registration must be 17 digits', 'জন্ম নিবন্ধন অবশ্যই ১৭ সংখ্যার হতে হবে', 2),
('Phone Number Required', 'মোবাইল নম্বর আবশ্যক', 'student', 'field', 'phone', 'required', '{}', 'At least one phone number is required', 'কমপক্ষে একটি মোবাইল নম্বর আবশ্যক', 3),
('Fee Paid Cannot Exceed Total', 'পরিশোধিত ফি মোট ফি-এর বেশি হতে পারবে না', 'fee', 'business', 'paid_amount', 'max_value', '{"compare_field": "amount"}', 'Paid amount cannot exceed total fee', 'পরিশোধিত ফি মোট ফি-এর বেশি হতে পারবে না', 4),
('Marks Must Be 0-100', 'নম্বর ০-১০০ এর মধ্যে হতে হবে', 'result', 'field', 'marks', 'range', '{"min": 0, "max": 100}', 'Marks must be between 0 and 100', 'নম্বর ০-১০০ এর মধ্যে হতে হবে', 5),
('Salary Deduction Cannot Exceed Salary', 'বেতন কর্তন বেতনের বেশি হতে পারবে না', 'salary', 'business', 'deduction', 'max_value', '{"compare_field": "salary"}', 'Deduction cannot exceed salary', 'কর্তন বেতনের বেশি হতে পারবে না', 6),
('Student Name Required', 'ছাত্রের নাম আবশ্যক', 'student', 'field', 'name_bn', 'required', '{}', 'Student name is required', 'ছাত্রের নাম আবশ্যক', 7),
('Email Format', 'ইমেইল ফরম্যাট', 'student', 'field', 'email', 'format', '{"pattern": "^[^@]+@[^@]+\\.[^@]+$"}', 'Invalid email format', 'ইমেইল ফরম্যাট সঠিক নয়', 8);
