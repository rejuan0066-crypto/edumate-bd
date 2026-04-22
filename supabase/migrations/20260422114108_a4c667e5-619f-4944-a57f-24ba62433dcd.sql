-- WhatsApp message templates
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  body_en TEXT NOT NULL DEFAULT '',
  body_bn TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta_template_name TEXT,
  meta_language_code TEXT DEFAULT 'bn',
  use_meta_template BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view templates"
ON public.whatsapp_templates FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins manage templates"
ON public.whatsapp_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_templates_category ON public.whatsapp_templates(category);
CREATE INDEX idx_whatsapp_templates_active ON public.whatsapp_templates(is_active);

-- Seed default templates
INSERT INTO public.whatsapp_templates (template_key, name, name_bn, category, description, body_en, body_bn, variables, sort_order) VALUES
('fee_paid', 'Fee Paid Confirmation', 'ফি পরিশোধ নিশ্চিতকরণ', 'fee',
  'Sent to guardian when a fee payment is recorded',
  'Dear Guardian, fee payment of ৳{amount} for {month} has been received for {student_name} (Class: {class}). Receipt: {receipt_no}. Thank you.',
  'প্রিয় অভিভাবক, {student_name} (শ্রেণী: {class}) এর {month} মাসের ৳{amount} টাকা ফি গ্রহণ করা হয়েছে। রসিদ নং: {receipt_no}। ধন্যবাদ।',
  '["student_name","class","month","amount","receipt_no"]'::jsonb, 1),

('fee_unpaid', 'Fee Due Reminder', 'ফি বকেয়া স্মরণিকা', 'fee',
  'Reminder for outstanding fees',
  'Dear Guardian, ৳{amount} fee for {month} is pending for {student_name} (Class: {class}). Please pay by {due_date}. Thank you.',
  'প্রিয় অভিভাবক, {student_name} (শ্রেণী: {class}) এর {month} মাসের ৳{amount} টাকা ফি বকেয়া রয়েছে। অনুগ্রহ করে {due_date} এর মধ্যে পরিশোধ করুন।',
  '["student_name","class","month","amount","due_date"]'::jsonb, 2),

('exam_result', 'Exam Result Published', 'পরীক্ষার ফলাফল প্রকাশ', 'result',
  'Notify guardian when exam results are published',
  'Dear Guardian, {exam_name} result of {student_name} (Class: {class}, Roll: {roll}) has been published. GPA: {gpa}, Position: {position}. Visit the website to view details.',
  'প্রিয় অভিভাবক, {student_name} (শ্রেণী: {class}, রোল: {roll}) এর {exam_name} এর ফলাফল প্রকাশিত হয়েছে। জিপিএ: {gpa}, অবস্থান: {position}। বিস্তারিত দেখতে ওয়েবসাইট ভিজিট করুন।',
  '["student_name","class","roll","exam_name","gpa","position"]'::jsonb, 3),

('attendance_absent', 'Absence Alert', 'অনুপস্থিতি সতর্কতা', 'attendance',
  'Sent when student is marked absent',
  'Dear Guardian, your ward {student_name} (Class: {class}, Roll: {roll}) was absent on {date}. Please contact the institution.',
  'প্রিয় অভিভাবক, আপনার সন্তান {student_name} (শ্রেণী: {class}, রোল: {roll}) তারিখ {date} এ অনুপস্থিত ছিল। অনুগ্রহ করে প্রতিষ্ঠানে যোগাযোগ করুন।',
  '["student_name","class","roll","date"]'::jsonb, 4),

('exam_routine', 'Exam Routine Notice', 'পরীক্ষার রুটিন বিজ্ঞপ্তি', 'exam',
  'Inform about upcoming exam schedule',
  'Dear Guardian, {exam_name} for {class} starts from {start_date}. Please check the website for the full routine. — {institution}',
  'প্রিয় অভিভাবক, {class} এর {exam_name} {start_date} থেকে শুরু হবে। সম্পূর্ণ রুটিন ওয়েবসাইটে দেখুন। — {institution}',
  '["class","exam_name","start_date","institution"]'::jsonb, 5),

('general_notice', 'General Notice', 'সাধারণ বিজ্ঞপ্তি', 'general',
  'For any custom announcement',
  'Dear Guardian, {message} — {institution}',
  'প্রিয় অভিভাবক, {message} — {institution}',
  '["message","institution"]'::jsonb, 6);