
-- System Modules table: tracks all configurable modules
CREATE TABLE public.system_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  description_bn text,
  icon text DEFAULT 'Box',
  menu_path text,
  is_enabled boolean DEFAULT true,
  is_system boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  parent_module_id uuid REFERENCES public.system_modules(id) ON DELETE SET NULL,
  settings jsonb DEFAULT '{}',
  visible_to_roles text[] DEFAULT ARRAY['admin']::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system_modules" ON public.system_modules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view enabled modules" ON public.system_modules
  FOR SELECT TO authenticated
  USING (is_enabled = true);

-- Formulas table: stores calculation rules
CREATE TABLE public.formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  module text NOT NULL,
  formula_type text NOT NULL DEFAULT 'calculation',
  expression jsonb NOT NULL DEFAULT '{}',
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage formulas" ON public.formulas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active formulas" ON public.formulas
  FOR SELECT TO public
  USING (is_active = true);

-- Seed default system modules
INSERT INTO public.system_modules (name, name_bn, description, description_bn, icon, menu_path, is_system, sort_order, visible_to_roles) VALUES
  ('Dashboard', 'ড্যাশবোর্ড', 'Main dashboard overview', 'প্রধান ড্যাশবোর্ড', 'LayoutDashboard', '/admin', true, 1, ARRAY['admin','staff','teacher']),
  ('Student Management', 'ছাত্র ব্যবস্থাপনা', 'Manage student records', 'ছাত্রদের তথ্য পরিচালনা', 'Users', '/admin/students', true, 2, ARRAY['admin','teacher']),
  ('Staff Management', 'স্টাফ/শিক্ষক ব্যবস্থাপনা', 'Manage staff and teachers', 'স্টাফ ও শিক্ষক পরিচালনা', 'UserCog', '/admin/staff', true, 3, ARRAY['admin']),
  ('Division & Class', 'বিভাগ ও শ্রেণী', 'Academic divisions and classes', 'একাডেমিক বিভাগ ও শ্রেণী', 'Layers', '/admin/divisions', true, 4, ARRAY['admin']),
  ('Fee Management', 'ফি ব্যবস্থাপনা', 'Manage fees and payments', 'ফি ও পেমেন্ট পরিচালনা', 'CreditCard', '/admin/fees', true, 5, ARRAY['admin']),
  ('Expense Management', 'খরচ ব্যবস্থাপনা', 'Track expenses and deposits', 'খরচ ও জমা ট্র্যাক', 'Receipt', '/admin/expenses', true, 6, ARRAY['admin']),
  ('Results', 'ফলাফল', 'Exam results management', 'পরীক্ষার ফলাফল পরিচালনা', 'FileText', '/admin/results', true, 7, ARRAY['admin','teacher']),
  ('Notices', 'নোটিশ', 'Notice management', 'নোটিশ পরিচালনা', 'Bell', '/admin/notices', true, 8, ARRAY['admin']),
  ('Donor Management', 'দাতা তালিকা', 'Manage donors', 'দাতাদের তথ্য পরিচালনা', 'Heart', '/admin/donors', true, 9, ARRAY['admin']),
  ('Subjects', 'বিষয়সমূহ', 'Subject management', 'বিষয় পরিচালনা', 'BookOpen', '/admin/subjects', true, 10, ARRAY['admin','teacher']),
  ('Attendance', 'উপস্থিতি', 'Track attendance', 'উপস্থিতি ট্র্যাক', 'ClipboardCheck', '/admin/attendance', false, 11, ARRAY['admin','teacher']),
  ('Salary Management', 'বেতন ব্যবস্থাপনা', 'Salary calculation and payment', 'বেতন হিসাব ও পেমেন্ট', 'Wallet', '/admin/salary', false, 12, ARRAY['admin']),
  ('Reports & Analytics', 'রিপোর্ট ও বিশ্লেষণ', 'Dynamic reports and charts', 'ডায়নামিক রিপোর্ট ও চার্ট', 'BarChart3', '/admin/reports', false, 13, ARRAY['admin']),
  ('Website Control', 'ওয়েবসাইট নিয়ন্ত্রণ', 'Website settings', 'ওয়েবসাইট সেটিংস', 'Globe', '/admin/website', true, 14, ARRAY['admin']),
  ('Settings', 'সেটিংস', 'System settings', 'সিস্টেম সেটিংস', 'Settings', '/admin/settings', true, 15, ARRAY['admin']);

-- Seed default formulas
INSERT INTO public.formulas (name, name_bn, module, formula_type, expression, variables, sort_order) VALUES
  ('Total Fee Calculation', 'মোট ফি হিসাব', 'fee', 'calculation',
   '{"formula": "monthly + exam + hostel - discount", "result_field": "total_fee"}',
   '[{"key":"monthly","label":"মাসিক ফি","label_en":"Monthly Fee"},{"key":"exam","label":"পরীক্ষা ফি","label_en":"Exam Fee"},{"key":"hostel","label":"হোস্টেল ফি","label_en":"Hostel Fee"},{"key":"discount","label":"ছাড়","label_en":"Discount"}]',
   1),
  ('Salary Calculation', 'বেতন হিসাব', 'salary', 'calculation',
   '{"formula": "base + bonus - late_deduction - absence_deduction", "result_field": "net_salary"}',
   '[{"key":"base","label":"বেসিক বেতন","label_en":"Base Salary"},{"key":"bonus","label":"বোনাস","label_en":"Bonus"},{"key":"late_deduction","label":"বিলম্ব কর্তন","label_en":"Late Deduction"},{"key":"absence_deduction","label":"অনুপস্থিতি কর্তন","label_en":"Absence Deduction"}]',
   2),
  ('Profit/Loss Calculation', 'লাভ/ক্ষতি হিসাব', 'expense', 'calculation',
   '{"formula": "total_income - total_expense", "result_field": "profit_loss"}',
   '[{"key":"total_income","label":"মোট আয়","label_en":"Total Income"},{"key":"total_expense","label":"মোট ব্যয়","label_en":"Total Expense"}]',
   3),
  ('Grade: A+', 'গ্রেড: এ+', 'grade', 'grade_rule',
   '{"min_marks": 80, "max_marks": 100, "grade": "A+", "gpa": 5.0}',
   '[]', 1),
  ('Grade: A', 'গ্রেড: এ', 'grade', 'grade_rule',
   '{"min_marks": 70, "max_marks": 79, "grade": "A", "gpa": 4.0}',
   '[]', 2),
  ('Grade: A-', 'গ্রেড: এ-', 'grade', 'grade_rule',
   '{"min_marks": 60, "max_marks": 69, "grade": "A-", "gpa": 3.5}',
   '[]', 3),
  ('Grade: B', 'গ্রেড: বি', 'grade', 'grade_rule',
   '{"min_marks": 50, "max_marks": 59, "grade": "B", "gpa": 3.0}',
   '[]', 4),
  ('Grade: C', 'গ্রেড: সি', 'grade', 'grade_rule',
   '{"min_marks": 40, "max_marks": 49, "grade": "C", "gpa": 2.0}',
   '[]', 5),
  ('Grade: D', 'গ্রেড: ডি', 'grade', 'grade_rule',
   '{"min_marks": 33, "max_marks": 39, "grade": "D", "gpa": 1.0}',
   '[]', 6),
  ('Grade: F', 'গ্রেড: এফ (ফেল)', 'grade', 'grade_rule',
   '{"min_marks": 0, "max_marks": 32, "grade": "F", "gpa": 0.0}',
   '[]', 7);
