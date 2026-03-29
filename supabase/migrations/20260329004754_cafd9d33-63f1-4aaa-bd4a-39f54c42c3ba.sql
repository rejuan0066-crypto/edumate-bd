
INSERT INTO public.formulas (name, name_bn, description, module, formula_type, expression, variables, is_active, sort_order) VALUES
('Net Salary', 'নিট বেতন', 'মূল বেতন + বোনাস + ওভারটাইম + ভাতা - বিলম্ব কর্তন - অনুপস্থিতি কর্তন - অগ্রিম কর্তন - অন্যান্য কর্তন', 'salary', 'calculation',
 '{"formula": "base_salary + bonus + overtime + other_allowance - late_deduction - absence_deduction - advance_deduction - other_deduction", "result_field": "net_salary"}'::jsonb,
 '[{"key": "base_salary", "label": "মূল বেতন", "label_en": "Base Salary"}, {"key": "bonus", "label": "বোনাস", "label_en": "Bonus"}, {"key": "overtime", "label": "ওভারটাইম", "label_en": "Overtime"}, {"key": "other_allowance", "label": "অন্যান্য ভাতা", "label_en": "Other Allowance"}, {"key": "late_deduction", "label": "বিলম্ব কর্তন", "label_en": "Late Deduction"}, {"key": "absence_deduction", "label": "অনুপস্থিতি কর্তন", "label_en": "Absence Deduction"}, {"key": "advance_deduction", "label": "অগ্রিম কর্তন", "label_en": "Advance Deduction"}, {"key": "other_deduction", "label": "অন্যান্য কর্তন", "label_en": "Other Deduction"}]'::jsonb,
 true, 0),

('Absence Deduction', 'অনুপস্থিতি কর্তন', 'প্রতি অনুপস্থিত দিনের জন্য বেতন কর্তন', 'salary', 'deduction',
 '{"formula": "(base_salary / working_days) * absent_days", "result_field": "absence_deduction"}'::jsonb,
 '[{"key": "base_salary", "label": "মূল বেতন", "label_en": "Base Salary"}, {"key": "working_days", "label": "কর্মদিবস", "label_en": "Working Days"}, {"key": "absent_days", "label": "অনুপস্থিত দিন", "label_en": "Absent Days"}]'::jsonb,
 true, 1),

('Late Deduction', 'বিলম্ব কর্তন', 'প্রতি বিলম্বের দিনে নির্দিষ্ট পরিমাণ কর্তন', 'salary', 'deduction',
 '{"formula": "late_days * late_rate", "result_field": "late_deduction"}'::jsonb,
 '[{"key": "late_days", "label": "বিলম্বের দিন", "label_en": "Late Days"}, {"key": "late_rate", "label": "প্রতি দিনের হার", "label_en": "Rate Per Day"}]'::jsonb,
 true, 2),

('Eid Bonus', 'ঈদ বোনাস', 'মূল বেতনের ১০০% ঈদ বোনাস', 'salary', 'calculation',
 '{"formula": "base_salary * (percentage / 100)", "result_field": "eid_bonus"}'::jsonb,
 '[{"key": "base_salary", "label": "মূল বেতন", "label_en": "Base Salary"}, {"key": "percentage", "label": "শতাংশ", "label_en": "Percentage"}]'::jsonb,
 true, 3);
