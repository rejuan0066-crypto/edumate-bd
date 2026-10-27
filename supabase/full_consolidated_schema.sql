-- Migration: 20260326215636_9f47125c-db80-4c24-9bf9-1b0d13a5a3e1.sql

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'teacher');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Migration: 20260326221540_faeb95de-e52c-48e5-a115-1eee4d9cf55e.sql

-- 1. Divisions (শ্রেণী/বিভাগ)
CREATE TABLE public.divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view divisions" ON public.divisions FOR SELECT USING (true);
CREATE POLICY "Admins can manage divisions" ON public.divisions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Subjects (বিষয়)
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  code text,
  division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Students (ছাত্র)
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  name_bn text NOT NULL,
  name_en text,
  father_name text,
  mother_name text,
  date_of_birth date,
  gender text DEFAULT 'male',
  phone text,
  guardian_phone text,
  email text,
  address text,
  division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  roll_number text,
  admission_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Staff (শিক্ষক/কর্মচারী)
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name_bn text NOT NULL,
  name_en text,
  designation text,
  department text,
  phone text,
  email text,
  address text,
  joining_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  photo_url text,
  salary numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Results (ফলাফল)
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  exam_year int NOT NULL,
  exam_session text NOT NULL,
  exam_type text NOT NULL,
  division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Admins can manage exams" ON public.exams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  marks numeric,
  grade text,
  gpa numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id, subject_id)
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view results" ON public.results FOR SELECT USING (true);
CREATE POLICY "Admins can manage results" ON public.results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Notices (নোটিশ)
CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  content text,
  content_bn text,
  category text DEFAULT 'general',
  is_published boolean DEFAULT false,
  published_at timestamptz,
  attachment_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published notices" ON public.notices FOR SELECT USING (true);
CREATE POLICY "Admins can manage notices" ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Fee types
CREATE TABLE public.fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  fee_category text NOT NULL DEFAULT 'monthly',
  division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view fee types" ON public.fee_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage fee types" ON public.fee_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Fee payments
CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  fee_type_id uuid REFERENCES public.fee_types(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  paid_amount numeric DEFAULT 0,
  month text,
  year int,
  status text DEFAULT 'unpaid',
  paid_at timestamptz,
  receipt_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view fee payments" ON public.fee_payments FOR SELECT USING (true);
CREATE POLICY "Admins can manage fee payments" ON public.fee_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Website settings
CREATE TABLE public.website_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view website settings" ON public.website_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage website settings" ON public.website_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- Migration: 20260327131851_18f0a64d-0e6f-42d9-9401-56a5acc3e7ee.sql

DROP POLICY IF EXISTS "Admins can manage divisions" ON public.divisions;
CREATE POLICY "Admins can manage divisions" ON public.divisions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage exams" ON public.exams;
CREATE POLICY "Admins can manage exams" ON public.exams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage fee payments" ON public.fee_payments;
CREATE POLICY "Admins can manage fee payments" ON public.fee_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage fee types" ON public.fee_types;
CREATE POLICY "Admins can manage fee types" ON public.fee_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage notices" ON public.notices;
CREATE POLICY "Admins can manage notices" ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage results" ON public.results;
CREATE POLICY "Admins can manage results" ON public.results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage website settings" ON public.website_settings;
CREATE POLICY "Admins can manage website settings" ON public.website_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- Migration: 20260328100345_4dea0e8e-725e-4c11-95d9-d9d4a9172247.sql
ALTER TABLE public.results ADD CONSTRAINT results_exam_student_subject_unique UNIQUE (exam_id, student_id, subject_id);

-- Migration: 20260328103202_9cd32fe9-803e-4e1b-a3a6-e0a498f69578.sql

-- Expense Projects
CREATE TABLE public.expense_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense_projects" ON public.expense_projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view expense_projects" ON public.expense_projects FOR SELECT TO public USING (true);

-- Expense Categories (under projects)
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.expense_projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  name_bn text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view expense_categories" ON public.expense_categories FOR SELECT TO public USING (true);

-- Expense entries
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  project_id uuid REFERENCES public.expense_projects(id) NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id) NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  quantity numeric DEFAULT 1,
  has_receipt boolean DEFAULT false,
  receipt_url text,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Deposits
CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  deposit_date date NOT NULL DEFAULT CURRENT_DATE,
  bank_details text,
  other_details text,
  amount numeric NOT NULL DEFAULT 0,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage deposits" ON public.deposits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Monthly summary (for arrears/cash tracking)
CREATE TABLE public.expense_monthly_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL UNIQUE,
  total_expense numeric DEFAULT 0,
  total_deposit numeric DEFAULT 0,
  previous_arrears numeric DEFAULT 0,
  cash_amount numeric DEFAULT 0,
  principal_name text,
  casher_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_monthly_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense_monthly_summary" ON public.expense_monthly_summary FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- Migration: 20260328111551_9bdff518-3805-4b82-bb6d-d4f613a8b607.sql

INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Public can read receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can delete receipts" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'receipts');


-- Migration: 20260328150201_b5c2627b-fee0-448e-ac94-1214301ae730.sql

CREATE TABLE public.institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  other_info TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view institutions" ON public.institutions FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage institutions" ON public.institutions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default institution
INSERT INTO public.institutions (name, name_en, address, phone, email, is_default)
VALUES ('আল-আরাবিয়া সুভানিয়া হাফিজিয়া মাদ্রাসা', 'Al-Arabia Subhania Hafizia Madrasah', 'খজান্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট', '01749842401', 'info@subhania.edu.bd', true);


-- Migration: 20260328152152_760d9dd2-132a-42f2-8f9c-c71243fb1acc.sql
-- Add logo_url column to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for institution logos
INSERT INTO storage.buckets (id, name, public) VALUES ('institution-logos', 'institution-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Anyone can view institution logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'institution-logos');
CREATE POLICY "Admins can manage institution logos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'institution-logos' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')) WITH CHECK (bucket_id = 'institution-logos' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Migration: 20260328161007_12c2ce42-70ff-4aad-8c1b-238550fce142.sql

ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS student_category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS residence_type text DEFAULT 'non-resident';


-- Migration: 20260328162654_ad941ab8-0dde-4490-80a6-46024bc30d27.sql

CREATE TABLE public.donors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  donation_amount NUMERIC DEFAULT 0,
  donation_date DATE DEFAULT CURRENT_DATE,
  donation_type TEXT DEFAULT 'one-time',
  purpose TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage donors" ON public.donors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view donors" ON public.donors FOR SELECT TO public USING (true);


-- Migration: 20260328172533_333f82fb-3c08-4167-87c3-ca70fd8d4242.sql

CREATE TABLE public.custom_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  form_type text NOT NULL DEFAULT 'custom',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.custom_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  field_type text NOT NULL DEFAULT 'text',
  label text NOT NULL,
  label_bn text NOT NULL,
  placeholder text,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  options jsonb DEFAULT '[]'::jsonb,
  validation jsonb DEFAULT '{}'::jsonb,
  default_value text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom_forms" ON public.custom_forms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view custom_forms" ON public.custom_forms FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage custom_form_fields" ON public.custom_form_fields FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view custom_form_fields" ON public.custom_form_fields FOR SELECT TO public USING (true);


-- Migration: 20260328174924_deec1ed5-393c-4207-a57c-05b36fa11adc.sql

CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage classes" ON public.classes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Classes are viewable by authenticated users" ON public.classes
  FOR SELECT TO authenticated
  USING (true);


-- Migration: 20260328193048_fa6aa428-034a-4463-a118-f83a7323d17b.sql

ALTER TABLE public.custom_forms 
  ADD COLUMN publish_to text NOT NULL DEFAULT 'none',
  ADD COLUMN parent_menu text DEFAULT NULL,
  ADD COLUMN menu_slug text DEFAULT NULL;


-- Migration: 20260328213049_09271cb0-04c8-4804-a6cb-9d85a5184849.sql

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


-- Migration: 20260328214425_070e4c6a-121e-4a32-908b-941e27a14ecd.sql

-- Attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entity_type TEXT NOT NULL DEFAULT 'student', -- student, staff, teacher
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, half_day, leave
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(attendance_date, entity_type, entity_id)
);

-- Attendance rules table (admin-configurable)
CREATE TABLE public.attendance_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'student',
  rule_type TEXT NOT NULL DEFAULT 'status', -- status, time, penalty
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_records
CREATE POLICY "Admins can manage attendance_records" ON public.attendance_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view attendance_records" ON public.attendance_records FOR SELECT TO public USING (true);

-- RLS policies for attendance_rules
CREATE POLICY "Admins can manage attendance_rules" ON public.attendance_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active attendance_rules" ON public.attendance_rules FOR SELECT TO public USING (is_active = true);

-- Seed default attendance rules
INSERT INTO public.attendance_rules (name, name_bn, entity_type, rule_type, config, sort_order) VALUES
('Present', 'উপস্থিত', 'student', 'status', '{"color": "green", "icon": "check", "counts_as": "present"}', 1),
('Absent', 'অনুপস্থিত', 'student', 'status', '{"color": "red", "icon": "x", "counts_as": "absent"}', 2),
('Late', 'বিলম্ব', 'student', 'status', '{"color": "yellow", "icon": "clock", "counts_as": "late"}', 3),
('Half Day', 'অর্ধদিন', 'student', 'status', '{"color": "orange", "icon": "half", "counts_as": "half_day"}', 4),
('Leave', 'ছুটি', 'student', 'status', '{"color": "blue", "icon": "calendar", "counts_as": "leave"}', 5),
('Present', 'উপস্থিত', 'staff', 'status', '{"color": "green", "icon": "check", "counts_as": "present"}', 1),
('Absent', 'অনুপস্থিত', 'staff', 'status', '{"color": "red", "icon": "x", "counts_as": "absent"}', 2),
('Late', 'বিলম্ব', 'staff', 'status', '{"color": "yellow", "icon": "clock", "counts_as": "late"}', 3),
('Half Day', 'অর্ধদিন', 'staff', 'status', '{"color": "orange", "icon": "half", "counts_as": "half_day"}', 4),
('Leave', 'ছুটি', 'staff', 'status', '{"color": "blue", "icon": "calendar", "counts_as": "leave"}', 5);


-- Migration: 20260328215427_5f5c71f7-5e77-4b57-83c5-a50d871bbc14.sql

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


-- Migration: 20260328222929_26f36817-c4f5-4c5c-8685-dc16c188b5b1.sql

-- Role permissions table for granular access control
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  menu_path text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_add boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, menu_path)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);


-- Migration: 20260328232909_e3c76416-ad67-4d8f-b31b-eb0438a3dc22.sql

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  message text,
  message_bn text,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- Migration: 20260328233029_2f797cc9-41b9-4865-8765-068a87b527d7.sql

CREATE OR REPLACE FUNCTION public.notify_on_student_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
  VALUES (
    'New Student Admitted: ' || COALESCE(NEW.name_en, NEW.name_bn),
    'নতুন ছাত্র ভর্তি: ' || NEW.name_bn,
    'Roll: ' || COALESCE(NEW.roll_number, 'N/A') || ', ID: ' || NEW.student_id,
    'রোল: ' || COALESCE(NEW.roll_number, 'N/A') || ', আইডি: ' || NEW.student_id,
    'success',
    'student',
    '/admin/students'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_insert
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.notify_on_student_insert();

CREATE OR REPLACE FUNCTION public.notify_on_fee_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'Fee Payment Received: ৳' || COALESCE(NEW.paid_amount, NEW.amount),
      'ফি পরিশোধ: ৳' || COALESCE(NEW.paid_amount, NEW.amount),
      'Receipt: ' || COALESCE(NEW.receipt_number, 'N/A'),
      'রসিদ: ' || COALESCE(NEW.receipt_number, 'N/A'),
      'info',
      'fee',
      '/admin/fees'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_fee_payment
AFTER INSERT OR UPDATE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_fee_payment();

CREATE OR REPLACE FUNCTION public.notify_on_notice_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'Notice Published: ' || NEW.title,
      'নোটিশ প্রকাশিত: ' || COALESCE(NEW.title_bn, NEW.title),
      NULL, NULL,
      'info',
      'notice',
      '/admin/notices'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_notice_publish
AFTER INSERT OR UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_notice_publish();


-- Migration: 20260328235342_26294012-0d1f-4767-87e8-359faa140a85.sql

CREATE TABLE public.guardian_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL DEFAULT 'general',
  channel TEXT NOT NULL DEFAULT 'sms',
  template_key TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  recipient_filter JSONB DEFAULT '{}'::jsonb,
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guardian_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage guardian_notifications"
  ON public.guardian_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'fee_reminder',
  channel TEXT NOT NULL DEFAULT 'sms',
  subject TEXT,
  body TEXT NOT NULL,
  body_bn TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification_templates"
  ON public.notification_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view notification_templates"
  ON public.notification_templates FOR SELECT TO public
  USING (is_active = true);

-- Seed default templates
INSERT INTO public.notification_templates (name, name_bn, template_type, channel, subject, body, body_bn, variables) VALUES
('Fee Payment Reminder', 'ফি পরিশোধের রিমাইন্ডার', 'fee_reminder', 'sms', NULL, 'Dear Guardian, your ward {{student_name}} (ID: {{student_id}}) has pending fee of ৳{{amount}} for {{month}}. Please pay at the earliest.', 'সম্মানিত অভিভাবক, আপনার সন্তান {{student_name}} (আইডি: {{student_id}}) এর {{month}} মাসের ৳{{amount}} টাকা ফি বকেয়া আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন।', '["student_name","student_id","amount","month"]'::jsonb),
('Absence Notification', 'অনুপস্থিতি বিজ্ঞপ্তি', 'attendance', 'sms', NULL, 'Dear Guardian, your ward {{student_name}} (Roll: {{roll}}) was absent on {{date}}. Please contact the institution.', 'সম্মানিত অভিভাবক, আপনার সন্তান {{student_name}} (রোল: {{roll}}) {{date}} তারিখে অনুপস্থিত ছিল। অনুগ্রহ করে প্রতিষ্ঠানে যোগাযোগ করুন।', '["student_name","roll","date"]'::jsonb),
('Result Published', 'ফলাফল প্রকাশ', 'result', 'sms', NULL, 'Dear Guardian, the {{exam_name}} results have been published. Your ward {{student_name}} achieved GPA {{gpa}}. Check the website for details.', 'সম্মানিত অভিভাবক, {{exam_name}} এর ফলাফল প্রকাশিত হয়েছে। আপনার সন্তান {{student_name}} জিপিএ {{gpa}} পেয়েছে। বিস্তারিত ওয়েবসাইটে দেখুন।', '["exam_name","student_name","gpa"]'::jsonb),
('General Notice', 'সাধারণ বিজ্ঞপ্তি', 'general', 'sms', NULL, 'Dear Guardian, {{message}}', 'সম্মানিত অভিভাবক, {{message}}', '["message"]'::jsonb),
('Fee Payment Reminder (Email)', 'ফি পরিশোধের রিমাইন্ডার (ইমেইল)', 'fee_reminder', 'email', 'Fee Payment Reminder - {{student_name}}', 'Dear Guardian,\n\nThis is to inform you that your ward {{student_name}} (ID: {{student_id}}) has a pending fee of ৳{{amount}} for the month of {{month}}.\n\nPlease ensure timely payment to avoid any inconvenience.\n\nRegards,\nInstitution Administration', 'সম্মানিত অভিভাবক,\n\nআপনাকে জানানো যাচ্ছে যে আপনার সন্তান {{student_name}} (আইডি: {{student_id}}) এর {{month}} মাসের ৳{{amount}} টাকা ফি বকেয়া আছে।\n\nঅসুবিধা এড়াতে অনুগ্রহ করে সময়মতো পরিশোধ করুন।\n\nশুভেচ্ছান্তে,\nপ্রতিষ্ঠান প্রশাসন', '["student_name","student_id","amount","month"]'::jsonb),
('Absence Notification (Email)', 'অনুপস্থিতি বিজ্ঞপ্তি (ইমেইল)', 'attendance', 'email', 'Absence Notification - {{student_name}}', 'Dear Guardian,\n\nThis is to inform you that your ward {{student_name}} (Roll: {{roll}}) was marked absent on {{date}}.\n\nPlease contact the institution for further details.\n\nRegards,\nInstitution Administration', 'সম্মানিত অভিভাবক,\n\nআপনাকে জানানো যাচ্ছে যে আপনার সন্তান {{student_name}} (রোল: {{roll}}) {{date}} তারিখে অনুপস্থিত ছিল।\n\nবিস্তারিত জানতে অনুগ্রহ করে প্রতিষ্ঠানে যোগাযোগ করুন।\n\nশুভেচ্ছান্তে,\nপ্রতিষ্ঠান প্রশাসন', '["student_name","roll","date"]'::jsonb);


-- Migration: 20260329003232_d7114398-0ad8-4d34-8aa3-fcf09eae135f.sql

CREATE OR REPLACE FUNCTION public.notify_guardian_on_absence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student RECORD;
  v_msg TEXT;
  v_msg_bn TEXT;
  v_date_str TEXT;
BEGIN
  -- Only trigger for students marked absent
  IF NEW.entity_type = 'student' AND NEW.status = 'absent' THEN
    -- Get student info
    SELECT name_bn, name_en, student_id, guardian_phone, phone
    INTO v_student
    FROM public.students
    WHERE id = NEW.entity_id;

    IF v_student IS NOT NULL AND (v_student.guardian_phone IS NOT NULL OR v_student.phone IS NOT NULL) THEN
      v_date_str := to_char(NEW.attendance_date, 'DD/MM/YYYY');
      
      v_msg := 'Dear Guardian, your ward ' || COALESCE(v_student.name_en, v_student.name_bn) || 
               ' (ID: ' || v_student.student_id || ') was absent on ' || v_date_str || 
               '. Please contact the institution for details.';
      
      v_msg_bn := 'সম্মানিত অভিভাবক, আপনার সন্তান ' || v_student.name_bn || 
                  ' (আইডি: ' || v_student.student_id || ') তারিখ ' || v_date_str || 
                  ' তে অনুপস্থিত ছিল। বিস্তারিত জানতে প্রতিষ্ঠানে যোগাযোগ করুন।';

      INSERT INTO public.guardian_notifications (
        notification_type, channel, subject, message, status,
        recipients_count, recipient_filter
      ) VALUES (
        'absence_alert', 'sms', 
        'অনুপস্থিতি বিজ্ঞপ্তি - ' || v_student.name_bn,
        v_msg_bn,
        'sent',
        1,
        jsonb_build_object(
          'student_id', NEW.entity_id,
          'student_name_bn', v_student.name_bn,
          'student_name_en', v_student.name_en,
          'guardian_phone', COALESCE(v_student.guardian_phone, v_student.phone),
          'attendance_date', v_date_str,
          'message_en', v_msg
        )
      );

      -- Also create an internal notification for admin
      INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
      VALUES (
        'Absence Alert Sent: ' || COALESCE(v_student.name_en, v_student.name_bn),
        'অনুপস্থিতি বিজ্ঞপ্তি পাঠানো হয়েছে: ' || v_student.name_bn,
        'Guardian notified for absence on ' || v_date_str,
        'তারিখ ' || v_date_str || ' এর অনুপস্থিতির জন্য অভিভাবককে জানানো হয়েছে',
        'warning',
        'attendance',
        '/admin/guardian-notifications'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for new attendance records
CREATE TRIGGER trigger_notify_guardian_on_absence
AFTER INSERT ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.notify_guardian_on_absence();

-- Also trigger on update (e.g., changing status to absent)
CREATE TRIGGER trigger_notify_guardian_on_absence_update
AFTER UPDATE OF status ON public.attendance_records
FOR EACH ROW
WHEN (NEW.status = 'absent' AND OLD.status IS DISTINCT FROM 'absent')
EXECUTE FUNCTION public.notify_guardian_on_absence();


-- Migration: 20260329004045_6a976aa5-7065-43fd-a3e4-3ac0204e351e.sql

-- Salary records table for monthly salary processing
CREATE TABLE public.salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric DEFAULT 0,
  overtime numeric DEFAULT 0,
  late_deduction numeric DEFAULT 0,
  absence_deduction numeric DEFAULT 0,
  advance_deduction numeric DEFAULT 0,
  other_deduction numeric DEFAULT 0,
  other_allowance numeric DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  working_days integer DEFAULT 0,
  present_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  late_days integer DEFAULT 0,
  status text DEFAULT 'pending',
  paid_at timestamp with time zone,
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(staff_id, month_year)
);

-- Salary settings for configurable deduction/bonus rules
CREATE TABLE public.salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb DEFAULT '{}',
  description text,
  description_bn text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for salary_records
CREATE POLICY "Admins can manage salary_records" ON public.salary_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own salary" ON public.salary_records
  FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

-- RLS policies for salary_settings
CREATE POLICY "Admins can manage salary_settings" ON public.salary_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view salary_settings" ON public.salary_settings
  FOR SELECT TO public
  USING (is_active = true);

-- Seed default salary settings
INSERT INTO public.salary_settings (setting_key, setting_value, description, description_bn) VALUES
  ('late_deduction_per_day', '{"amount": 50}', 'Deduction per late day', 'প্রতি বিলম্বের দিনে কর্তন'),
  ('absence_deduction_formula', '{"type": "per_day", "formula": "base_salary / working_days"}', 'Absence deduction formula', 'অনুপস্থিতি কর্তনের সূত্র'),
  ('bonus_rules', '{"eid_bonus": {"percentage": 100, "label": "ঈদ বোনাস"}, "annual_bonus": {"percentage": 50, "label": "বার্ষিক বোনাস"}}', 'Bonus rules', 'বোনাস নিয়মাবলী');


-- Migration: 20260329004754_cafd9d33-63f1-4aaa-bd4a-39f54c42c3ba.sql

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


-- Migration: 20260329010332_82cd3e0e-d589-4ad9-b4c9-1d3666994ebc.sql

-- Custom form submissions table
CREATE TABLE public.custom_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.custom_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom_form_submissions" ON public.custom_form_submissions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert submissions" ON public.custom_form_submissions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view own submissions" ON public.custom_form_submissions
  FOR SELECT TO authenticated USING (submitted_by = auth.uid());


-- Migration: 20260329012008_4aa1d668-42a6-4b76-9178-3454ff867a59.sql
-- Create photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- RLS: Anyone can view photos
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');

-- RLS: Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');

-- RLS: Authenticated users can update their photos
CREATE POLICY "Authenticated users can update photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos');

-- RLS: Authenticated users can delete photos
CREATE POLICY "Authenticated users can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos');

-- Migration: 20260329012931_d52329ce-29f8-427b-a9a0-01d7a380ae10.sql

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS birth_reg_no text,
  ADD COLUMN IF NOT EXISTS religion text DEFAULT 'islam',
  ADD COLUMN IF NOT EXISTS admission_session text,
  ADD COLUMN IF NOT EXISTS registration_no text,
  ADD COLUMN IF NOT EXISTS session_year text,
  ADD COLUMN IF NOT EXISTS previous_class text,
  ADD COLUMN IF NOT EXISTS previous_institute text,
  ADD COLUMN IF NOT EXISTS father_occupation text,
  ADD COLUMN IF NOT EXISTS father_nid text,
  ADD COLUMN IF NOT EXISTS father_phone text,
  ADD COLUMN IF NOT EXISTS mother_occupation text,
  ADD COLUMN IF NOT EXISTS mother_nid text,
  ADD COLUMN IF NOT EXISTS mother_phone text,
  ADD COLUMN IF NOT EXISTS is_orphan boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_poor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admission_data jsonb DEFAULT '{}'::jsonb;


-- Migration: 20260329163423_ddaf5812-f9f3-4a71-b04d-c50a0568bce7.sql

-- Create storage bucket for website assets (logo, principal photo, gallery images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-assets', 'website-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read website assets" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'website-assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload website assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'website-assets');

-- Allow authenticated users to update
CREATE POLICY "Authenticated update website assets" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'website-assets');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated delete website assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'website-assets');


-- Migration: 20260329171257_da256f83-34c3-4cef-a026-77c85be9a2cd.sql

-- Create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  content text,
  content_bn text,
  category text NOT NULL DEFAULT 'general',
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage posts" ON public.posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published posts" ON public.posts
  FOR SELECT TO public
  USING (is_published = true);

-- Create storage bucket for post attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('post-attachments', 'post-attachments', true);

-- Storage policies
CREATE POLICY "Admins can upload post attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-attachments' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete post attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-attachments' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Anyone can view post attachments" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'post-attachments');


-- Migration: 20260329172718_cf1a7866-b0b4-49bb-b71e-14ce4384efe3.sql

-- Post comments table
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  commenter_name text NOT NULL,
  comment_text text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved comments" ON public.post_comments
  FOR SELECT TO public USING (is_approved = true);

CREATE POLICY "Anyone can insert comments" ON public.post_comments
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can manage comments" ON public.post_comments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Post likes table
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  visitor_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, visitor_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.post_likes
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert likes" ON public.post_likes
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can delete own likes" ON public.post_likes
  FOR DELETE TO public USING (true);

CREATE POLICY "Admins can manage likes" ON public.post_likes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Migration: 20260329205053_90af2e07-406c-4687-848c-13d04a004bd2.sql

CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  date TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'islamic',
  approximate BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage holidays" ON public.holidays
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active holidays" ON public.holidays
  FOR SELECT TO public
  USING (is_active = true);


-- Migration: 20260330154027_8c3872a1-da98-4345-89d8-8446e77f7995.sql

UPDATE public.custom_form_fields 
SET validation = '{"section": "student_details"}'::jsonb
WHERE default_value = 'photo_url' AND (validation::text = '{}' OR validation IS NULL);

UPDATE public.custom_form_fields 
SET validation = '{"section": "student_details"}'::jsonb
WHERE default_value = 'last_name' AND (validation::text = '{}' OR validation IS NULL);

UPDATE public.custom_form_fields 
SET validation = '{"section": "student_address"}'::jsonb
WHERE default_value = 'address_permanent' AND (validation::text = '{}' OR validation IS NULL);


-- Migration: 20260330154759_c185be71-a3ec-4b23-be1b-808e1dddefff.sql

UPDATE public.custom_form_fields 
SET validation = ('{"section":"student_details"}')::jsonb
WHERE default_value IN ('photo_url', 'last_name')
AND (validation IS NULL OR validation::text = '{}');

UPDATE public.custom_form_fields 
SET validation = ('{"section":"student_address"}')::jsonb
WHERE default_value = 'address_permanent'
AND (validation IS NULL OR validation::text = '{}');


-- Migration: 20260330193127_b99a50a5-f678-4197-809a-fd01deeed804.sql

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS religion text DEFAULT 'islam',
ADD COLUMN IF NOT EXISTS nid text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS residence_type text DEFAULT 'non_residential',
ADD COLUMN IF NOT EXISTS experience text,
ADD COLUMN IF NOT EXISTS previous_institute text,
ADD COLUMN IF NOT EXISTS staff_data jsonb DEFAULT '{}'::jsonb;


-- Migration: 20260331011746_09349600-3b7a-4ece-b392-d90b29e9b5f4.sql

CREATE TABLE public.document_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  layout_type TEXT NOT NULL DEFAULT 'form',
  category TEXT NOT NULL DEFAULT 'student',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.document_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document_layouts" ON public.document_layouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view document_layouts" ON public.document_layouts
  FOR SELECT TO public
  USING (is_active = true);


-- Migration: 20260331205606_c8873765-62fd-433c-adbc-80bc9cbff4b2.sql

ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS check_in_time TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_out_time TEXT DEFAULT NULL;

ALTER TABLE public.staff 
  ADD COLUMN IF NOT EXISTS duty_start_time TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS duty_end_time TEXT DEFAULT '17:00';


-- Migration: 20260331222511_cbc48ab4-fcb9-4fbe-b1aa-3430630f2c42.sql
UPDATE attendance_rules SET config = '{"color":"green","counts_as":"present","icon":"check"}' WHERE id = 'acfc14c6-1938-41ed-a099-ab03048c679b';

-- Migration: 20260331230137_e45e581f-dd81-4bc0-aeb6-272d0151e6f3.sql
ALTER TABLE public.attendance_records ADD COLUMN shift text NOT NULL DEFAULT 'full_day';

-- Migration: 20260401014229_b0d2e657-096c-46f8-82d3-eb4782fde54d.sql
ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_attendance_date_entity_type_entity_id_key;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_date_type_id_shift_key UNIQUE (attendance_date, entity_type, entity_id, shift);

-- Migration: 20260401175556_38758d74-8911-4de7-b286-e8f2c6261b11.sql

-- Create academic_sessions table
CREATE TABLE public.academic_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage academic_sessions" ON public.academic_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view
CREATE POLICY "Anyone can view academic_sessions" ON public.academic_sessions
  FOR SELECT TO public
  USING (true);

-- Add session_id to students
ALTER TABLE public.students ADD COLUMN session_id uuid REFERENCES public.academic_sessions(id);


-- Migration: 20260401180753_5b537e49-fcc6-47f9-91c4-0e8b7025fdc5.sql
ALTER TABLE public.students ADD COLUMN class_id uuid REFERENCES public.classes(id);

-- Migration: 20260401183724_703ab170-d154-4e64-8580-15ae84b01389.sql

CREATE TABLE public.form_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name text UNIQUE,
  is_visible boolean DEFAULT true,
  footer_text text,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.form_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage form_settings" ON public.form_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view form_settings" ON public.form_settings
  FOR SELECT TO public
  USING (true);


-- Migration: 20260401201208_65c8869e-a9e5-41a9-8a2f-0dc7cc4f18b5.sql
CREATE POLICY "Anyone can submit admission"
ON public.students
FOR INSERT
TO public
WITH CHECK (approval_status = 'pending');

-- Migration: 20260401211917_48069122-a53a-4c1a-8bd8-f02aa8064578.sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Migration: 20260401212328_61c315b4-50ce-4e68-90b4-50e1724bf301.sql
CREATE POLICY "Anyone can view classes"
ON public.classes
FOR SELECT
TO public
USING (true);

-- Migration: 20260402112701_e760316c-bbfe-487c-98d8-cbf11fdac385.sql
CREATE TABLE public.address_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'division',
  parent_path text DEFAULT NULL,
  name text NOT NULL,
  name_en text NOT NULL,
  sub_type text DEFAULT NULL,
  post_code text DEFAULT NULL,
  action text NOT NULL DEFAULT 'add',
  original_name_en text DEFAULT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.address_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage address_custom" ON public.address_custom
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view address_custom" ON public.address_custom
  FOR SELECT TO public
  USING (is_active = true);

-- Migration: 20260402114044_ebe9a329-29b5-4ea1-99ae-1d09b4f0d66e.sql

CREATE TABLE public.address_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  label_bn text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  parent_level_key text REFERENCES public.address_levels(key),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.address_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage address_levels" ON public.address_levels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view address_levels" ON public.address_levels FOR SELECT TO public USING (is_active = true);

INSERT INTO public.address_levels (key, label, label_bn, sort_order, parent_level_key) VALUES
  ('division', 'Division', 'বিভাগ', 1, null),
  ('district', 'District', 'জেলা', 2, 'division'),
  ('upazila', 'Upazila', 'উপজেলা', 3, 'district'),
  ('union', 'Union', 'ইউনিয়ন', 4, 'upazila'),
  ('post_office', 'Post Office', 'পোস্ট অফিস', 5, 'upazila');


-- Migration: 20260402115924_dbb29390-84d8-43a6-a349-9b021132ec8d.sql

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


-- Migration: 20260402140147_436663c4-b2f0-46f1-b853-73f9111b4a2a.sql

-- OTP verification codes table
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'email_verification',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- EmailJS configuration table
CREATE TABLE public.emailjs_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL DEFAULT '',
  template_id TEXT NOT NULL DEFAULT '',
  public_key TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  otp_expiry_minutes INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for otp_codes
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage otp_codes"
ON public.otp_codes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert otp_codes"
ON public.otp_codes FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can select own otp by email"
ON public.otp_codes FOR SELECT
TO public
USING (true);

-- RLS for emailjs_config
ALTER TABLE public.emailjs_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage emailjs_config"
ON public.emailjs_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view emailjs_config"
ON public.emailjs_config FOR SELECT
TO public
USING (true);


-- Migration: 20260402151326_e32b973e-b510-4288-ab1b-2d015ca4e976.sql

CREATE TABLE public.smtp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_username TEXT NOT NULL DEFAULT '',
  smtp_password TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  use_tls BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read smtp_config"
  ON public.smtp_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert smtp_config"
  ON public.smtp_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update smtp_config"
  ON public.smtp_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- Migration: 20260402164046_4884a92f-8cd9-4088-b99d-e00be9558de1.sql
-- Staff can view their own record
CREATE POLICY "Staff can view own staff record"
ON public.staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Staff/teachers can view their own attendance
CREATE POLICY "Staff can view own attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (entity_id IN (
  SELECT id FROM public.staff WHERE user_id = auth.uid()
));

-- Migration: 20260402165005_db403e17-0b05-4678-8239-02f0a31bb986.sql
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_path text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_add boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, menu_path)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_permissions"
ON public.user_permissions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Migration: 20260402171548_bed2c69d-e709-4fa4-a06b-4d63d3f93b92.sql

-- Add requires_approval column to user_permissions
ALTER TABLE public.user_permissions ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

-- Create pending_actions table
CREATE TABLE public.pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  action_type text NOT NULL DEFAULT 'add',
  target_table text NOT NULL,
  target_id uuid,
  menu_path text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all pending actions
CREATE POLICY "Admins can manage pending_actions" ON public.pending_actions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view own pending actions
CREATE POLICY "Users can view own pending_actions" ON public.pending_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert pending actions
CREATE POLICY "Users can insert pending_actions" ON public.pending_actions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- Migration: 20260402173903_f7a892ee-0682-40d4-bf93-b597926d2aa0.sql

ALTER TABLE public.user_permissions 
  ADD COLUMN IF NOT EXISTS approval_view boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_delete boolean NOT NULL DEFAULT false;

-- Migrate existing data: if requires_approval was true, set all approval columns to true
UPDATE public.user_permissions 
SET approval_view = requires_approval,
    approval_add = requires_approval,
    approval_edit = requires_approval,
    approval_delete = requires_approval;

-- Drop old column
ALTER TABLE public.user_permissions DROP COLUMN IF EXISTS requires_approval;


-- Migration: 20260402180056_2d831ff2-48b3-4917-8e71-d53d0fe76e0f.sql

-- Allow staff/teacher to INSERT/UPDATE/DELETE on key tables
-- They still need frontend permission checks + approval workflow

-- Students table
CREATE POLICY "Staff can manage students" ON public.students
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Notices table
CREATE POLICY "Staff can manage notices" ON public.notices
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Fee payments table
CREATE POLICY "Staff can manage fee_payments" ON public.fee_payments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Fee types table
CREATE POLICY "Staff can manage fee_types" ON public.fee_types
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Divisions table
CREATE POLICY "Staff can manage divisions" ON public.divisions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Subjects (currently missing from schema, skip if not exists)

-- Results table
CREATE POLICY "Staff can manage results" ON public.results
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expenses table
CREATE POLICY "Staff can manage expenses" ON public.expenses
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Donors table
CREATE POLICY "Staff can manage donors" ON public.donors
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Attendance records - staff/teacher can insert
CREATE POLICY "Staff can manage attendance" ON public.attendance_records
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Salary records - staff can view (already exists), add manage for staff role
CREATE POLICY "Staff can manage salary_records" ON public.salary_records
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Posts table
CREATE POLICY "Staff can manage posts" ON public.posts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expense categories
CREATE POLICY "Staff can manage expense_categories" ON public.expense_categories
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expense projects
CREATE POLICY "Staff can manage expense_projects" ON public.expense_projects
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Staff table
CREATE POLICY "Staff can manage staff" ON public.staff
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Exams table
CREATE POLICY "Staff can manage exams" ON public.exams
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Classes table
CREATE POLICY "Staff can manage classes" ON public.classes
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Deposits table
CREATE POLICY "Staff can manage deposits" ON public.deposits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Expense monthly summary
CREATE POLICY "Staff can manage expense_monthly_summary" ON public.expense_monthly_summary
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));


-- Migration: 20260402181128_c21fa26c-149b-4861-bd29-b365532b9873.sql

CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_bn text NOT NULL,
  description text,
  description_bn text,
  base_role text NOT NULL DEFAULT 'staff',
  permissions_template jsonb DEFAULT '[]'::jsonb,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom_roles" ON public.custom_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view custom_roles" ON public.custom_roles
FOR SELECT TO public
USING (is_active = true);

INSERT INTO public.custom_roles (name, name_bn, description, description_bn, base_role, is_system, sort_order) VALUES
  ('admin', 'অ্যাডমিন', 'Full system administrator', 'সম্পূর্ণ সিস্টেম অ্যাডমিনিস্ট্রেটর', 'admin', true, 1),
  ('teacher', 'শিক্ষক', 'Teacher with limited access', 'সীমিত অ্যাক্সেস সহ শিক্ষক', 'teacher', true, 2),
  ('staff', 'স্টাফ', 'Staff member with limited access', 'সীমিত অ্যাক্সেস সহ স্টাফ সদস্য', 'staff', true, 3);


-- Migration: 20260402204708_6e885244-8329-4a55-b9ea-e25d334636d1.sql

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update existing admin users to 'approved'
UPDATE public.profiles SET status = 'approved' WHERE id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);

-- Update the handle_new_user function to set status as 'pending' by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'pending');
  RETURN NEW;
END;
$function$;


-- Migration: 20260403060421_f96bef21-0620-4993-841e-d3504229794a.sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Migration: 20260403060447_030f43e9-9003-414e-bab5-64b4f64d229c.sql

-- Update Rejuan H's role to super_admin
UPDATE public.user_roles SET role = 'super_admin' WHERE user_id = 'f712d344-a0db-4c57-bee4-80db1694fd74';

-- Update has_role function to treat super_admin as having admin privileges too
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND (
      role = _role 
      OR (role = 'super_admin' AND _role = 'admin')
    )
  )
$$;


-- Migration: 20260403115635_b750583f-0d06-4ec7-8aaa-f0a9174c5dd4.sql
-- Drop the existing duplicate and recreate
DROP POLICY IF EXISTS "Staff can view own salary" ON public.salary_records;
CREATE POLICY "Staff can view own salary"
ON public.salary_records
FOR SELECT
TO authenticated
USING (
  staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'staff'::app_role)
  OR public.has_role(auth.uid(), 'teacher'::app_role)
);

-- Attendance policy was already handled, ensure it exists
DROP POLICY IF EXISTS "Staff can manage attendance with permission" ON public.attendance_records;
CREATE POLICY "Staff can manage attendance with permission"
ON public.attendance_records
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'staff'::app_role) 
  OR public.has_role(auth.uid(), 'teacher'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'staff'::app_role) 
  OR public.has_role(auth.uid(), 'teacher'::app_role)
);

-- Migration: 20260403142921_8e2c3931-d0d6-46a6-8545-51059913411a.sql
DROP POLICY IF EXISTS "Admins can manage institution logos" ON storage.objects;

CREATE POLICY "Admins can manage institution logos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'institution-logos'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'institution-logos'
  AND public.has_role(auth.uid(), 'admin')
);

-- Migration: 20260403183251_49f08178-ba4f-400e-8029-061a6beb351b.sql

-- Payment Gateway Config table
CREATE TABLE public.payment_gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'generic',
  provider_name TEXT NOT NULL DEFAULT '',
  api_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  merchant_id TEXT NOT NULL DEFAULT '',
  callback_url TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  extra_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS Gateway Config table
CREATE TABLE public.sms_gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'generic',
  provider_name TEXT NOT NULL DEFAULT '',
  api_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  sender_id TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  extra_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.payment_gateway_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_gateway_config ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for payment_gateway_config
CREATE POLICY "Admins can view payment config" ON public.payment_gateway_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payment config" ON public.payment_gateway_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment config" ON public.payment_gateway_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment config" ON public.payment_gateway_config
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only policies for sms_gateway_config
CREATE POLICY "Admins can view sms config" ON public.sms_gateway_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sms config" ON public.sms_gateway_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sms config" ON public.sms_gateway_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sms config" ON public.sms_gateway_config
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- Migration: 20260403193225_1cc0ff3d-6646-40e6-922e-c9cf353e7b0f.sql

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('admission_fee', 'monthly_fee', 'exam_fee', 'donation')),
  amount NUMERIC NOT NULL DEFAULT 0,
  transaction_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  payment_method TEXT,
  payer_name TEXT,
  payer_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage payments" ON public.payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT TO public
  USING (true);


-- Migration: 20260404153658_b52ef366-265b-42eb-b9a4-01d04e9f15c0.sql

CREATE TABLE public.receipt_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default Receipt',
  name_bn text NOT NULL DEFAULT 'ডিফল্ট রিসিট',
  paper_size text NOT NULL DEFAULT 'a4_3up',
  design_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage receipt_settings" ON public.receipt_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view receipt_settings" ON public.receipt_settings
  FOR SELECT TO public
  USING (is_active = true);


-- Migration: 20260404183913_7e3cb99e-fa6a-40a7-80a5-077d657ffaf6.sql

-- Receipt counter table for atomic serial numbering
CREATE TABLE public.receipt_counter (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix text NOT NULL DEFAULT 'SL',
  current_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert initial row
INSERT INTO public.receipt_counter (prefix, current_year, last_number)
VALUES ('SL', EXTRACT(YEAR FROM now())::integer, 0);

-- Enable RLS
ALTER TABLE public.receipt_counter ENABLE ROW LEVEL SECURITY;

-- Only admins and staff can use the counter
CREATE POLICY "Admins can manage receipt_counter" ON public.receipt_counter
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view receipt_counter" ON public.receipt_counter
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Atomic function to get next serial number
CREATE OR REPLACE FUNCTION public.get_next_receipt_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_year integer;
  v_next integer;
  v_current_year integer;
BEGIN
  v_current_year := EXTRACT(YEAR FROM now())::integer;
  
  -- Lock the row for update to prevent race conditions
  SELECT prefix, current_year, last_number
  INTO v_prefix, v_year, v_next
  FROM public.receipt_counter
  LIMIT 1
  FOR UPDATE;
  
  -- If year changed, reset counter
  IF v_year != v_current_year THEN
    v_next := 1;
    UPDATE public.receipt_counter
    SET current_year = v_current_year, last_number = 1, updated_at = now();
  ELSE
    v_next := v_next + 1;
    UPDATE public.receipt_counter
    SET last_number = v_next, updated_at = now();
  END IF;
  
  -- Return formatted serial: SL-2026-0001
  RETURN v_prefix || '-' || v_current_year::text || '-' || lpad(v_next::text, 4, '0');
END;
$$;


-- Migration: 20260404211823_be23e567-fc27-4876-b596-4af659d96557.sql
ALTER TABLE public.subjects ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Migration: 20260404213918_bba0ba17-c9fe-43ba-88d9-4784484a5053.sql

-- Exam Sessions table
CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  academic_session_id uuid REFERENCES public.academic_sessions(id) ON DELETE CASCADE NOT NULL,
  exam_type text NOT NULL DEFAULT 'annual',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exam Session Classes mapping
CREATE TABLE public.exam_session_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_session_id, class_id)
);

-- Exam Session Students mapping
CREATE TABLE public.exam_session_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_session_id, student_id)
);

-- RLS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_session_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_session_students ENABLE ROW LEVEL SECURITY;

-- exam_sessions policies
CREATE POLICY "Admins can manage exam_sessions" ON public.exam_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage exam_sessions" ON public.exam_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view exam_sessions" ON public.exam_sessions FOR SELECT TO public
  USING (true);

-- exam_session_classes policies
CREATE POLICY "Admins can manage exam_session_classes" ON public.exam_session_classes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage exam_session_classes" ON public.exam_session_classes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view exam_session_classes" ON public.exam_session_classes FOR SELECT TO public
  USING (true);

-- exam_session_students policies
CREATE POLICY "Admins can manage exam_session_students" ON public.exam_session_students FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage exam_session_students" ON public.exam_session_students FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view exam_session_students" ON public.exam_session_students FOR SELECT TO public
  USING (true);


-- Migration: 20260405072158_5e655a7b-191e-47da-a9f1-efadbdf8347d.sql

-- Add is_free column to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

-- Create fee_waivers table for selective fee exemptions
CREATE TABLE IF NOT EXISTS public.fee_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_type_id uuid NOT NULL REFERENCES public.fee_types(id) ON DELETE CASCADE,
  waiver_percent numeric NOT NULL DEFAULT 100,
  reason text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, fee_type_id)
);

ALTER TABLE public.fee_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee_waivers" ON public.fee_waivers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can manage fee_waivers" ON public.fee_waivers FOR ALL TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Anyone can view fee_waivers" ON public.fee_waivers FOR SELECT TO public USING (true);


-- Migration: 20260405073705_a4c54c2b-69e1-4350-822e-cafb8bcd6ea6.sql

CREATE TABLE public.student_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.student_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student_categories" ON public.student_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view student_categories" ON public.student_categories FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Staff can manage student_categories" ON public.student_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

INSERT INTO public.student_categories (name, name_bn, sort_order) VALUES
  ('general', 'সাধারণ', 1),
  ('orphan', 'এতিম', 2),
  ('poor', 'গরীব', 3),
  ('teachers_child', 'শিক্ষক সন্তান', 4);


-- Migration: 20260405083140_e29137fc-e0e6-4f66-938e-0b7aad6bb7be.sql

CREATE TABLE IF NOT EXISTS public.fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fee_categories"
  ON public.fee_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage fee_categories"
  ON public.fee_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.fee_categories (name, name_bn, sort_order) VALUES
  ('monthly', 'মাসিক', 1),
  ('exam', 'পরীক্ষা', 2),
  ('admission', 'ভর্তি', 3),
  ('books', 'বই', 4),
  ('uniform', 'পোশাক', 5),
  ('other', 'অন্যান্য', 6);


-- Migration: 20260405084305_6cd974e1-c6ec-4b1c-a29d-2e00368bc735.sql
ALTER TABLE public.fee_types ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL DEFAULT NULL;

-- Migration: 20260406181521_61213ede-30c2-43fd-84d7-1fd22ba66699.sql
ALTER TABLE public.academic_sessions ADD COLUMN IF NOT EXISTS name_bn TEXT DEFAULT '';

-- Migration: 20260406190631_ce54e8af-6df1-4a73-8cb1-ec3cf2568bd3.sql
ALTER TABLE public.divisions ADD COLUMN prefix text DEFAULT '';

-- Migration: 20260406194235_5bc2432d-57f9-4585-be53-0044841c36c3.sql

CREATE TABLE public.exam_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_bn text NOT NULL,
  key text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam_types" ON public.exam_types FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view exam_types" ON public.exam_types FOR SELECT TO public USING (true);
CREATE POLICY "Staff can manage exam_types" ON public.exam_types FOR ALL TO authenticated USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

INSERT INTO public.exam_types (name, name_bn, key, sort_order) VALUES
  ('Annual', 'বার্ষিক', 'annual', 1),
  ('Half Yearly', 'অর্ধবার্ষিক', 'half_yearly', 2),
  ('Pre-Test', 'প্রাক-নির্বাচনী', 'pre_test', 3);


-- Migration: 20260406204851_c42e4f13-6b57-45f3-b5d3-089f70df050f.sql

CREATE TABLE public.exam_session_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (exam_session_id, subject_id, class_id)
);

ALTER TABLE public.exam_session_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam_session_subjects" ON public.exam_session_subjects
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view exam_session_subjects" ON public.exam_session_subjects
  FOR SELECT TO public USING (true);

CREATE POLICY "Staff can manage exam_session_subjects" ON public.exam_session_subjects
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));


-- Migration: 20260407171845_09001c4a-4a4e-49d3-8ab3-fbc8d76d8eab.sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.students;

-- Migration: 20260407172509_9999e464-8f21-47a8-ac42-ba211f902d54.sql

-- Library Books Inventory
CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  author text,
  author_bn text,
  class_id uuid REFERENCES public.classes(id),
  subject_id uuid REFERENCES public.subjects(id),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  buying_price numeric NOT NULL DEFAULT 0,
  total_copies integer NOT NULL DEFAULT 1,
  available_copies integer NOT NULL DEFAULT 1,
  lost_copies integer NOT NULL DEFAULT 0,
  damaged_copies integer NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'new',
  purchased_by text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage library_books" ON public.library_books
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage library_books" ON public.library_books
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view library_books" ON public.library_books
  FOR SELECT TO public USING (true);

-- Library Issuances (Issue/Distribution Log)
CREATE TABLE public.library_issuances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  recipient_type text NOT NULL DEFAULT 'student',
  student_id uuid REFERENCES public.students(id),
  staff_id uuid REFERENCES public.staff(id),
  recipient_name text,
  distribution_type text NOT NULL DEFAULT 'free',
  selling_price numeric DEFAULT 0,
  book_condition text NOT NULL DEFAULT 'new',
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  returned_date date,
  status text NOT NULL DEFAULT 'issued',
  issued_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.library_issuances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage library_issuances" ON public.library_issuances
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage library_issuances" ON public.library_issuances
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view library_issuances" ON public.library_issuances
  FOR SELECT TO public USING (true);

-- Library Fines
CREATE TABLE public.library_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_id uuid NOT NULL REFERENCES public.library_issuances(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.library_books(id),
  fine_type text NOT NULL DEFAULT 'lost',
  fine_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage library_fines" ON public.library_fines
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage library_fines" ON public.library_fines
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));


-- Migration: 20260407175829_7e5cc3c7-2d5a-4e54-b0e5-9582245989d5.sql
ALTER TABLE public.library_books ADD COLUMN IF NOT EXISTS book_category text NOT NULL DEFAULT 'textbook';

-- Migration: 20260407181031_037b2c25-2300-4447-84e5-ffaf6efbd61c.sql
ALTER TABLE public.library_issuances ADD COLUMN IF NOT EXISTS distributor_name text;

-- Migration: 20260407205457_d77a9dca-6185-42ea-9911-bf6ffd1dc0e2.sql
-- Allow staff and teachers to update receipt_counter (needed for RPC fallback)
CREATE POLICY "Staff can manage receipt_counter"
ON public.receipt_counter
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Grant execute on the function to all authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_receipt_serial() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_receipt_serial() TO anon;

-- Migration: 20260407205750_ea9c9538-0c38-4912-a5d2-a10a497e2303.sql
ALTER TABLE public.payments DROP CONSTRAINT payments_fee_type_check;

-- Migration: 20260408194415_b2ce848e-403f-488c-bdd0-d70227a71820.sql

ALTER TABLE public.fee_types
ADD COLUMN session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_fee_types_session_id ON public.fee_types(session_id);


-- Migration: 20260408201722_be182b17-27f2-404a-aec2-801f0a810f6a.sql

-- Update roll numbers for all students: class-based serial like 101, 102... for class 1, 201, 202... for class 2
-- Classes are ordered globally by division sort_order then class sort_order

DO $$
DECLARE
  class_rec RECORD;
  student_rec RECORD;
  class_index INT := 0;
  student_index INT;
  new_roll TEXT;
BEGIN
  FOR class_rec IN 
    SELECT c.id 
    FROM classes c 
    JOIN divisions d ON c.division_id = d.id 
    WHERE c.is_active = true 
    ORDER BY d.sort_order, c.sort_order
  LOOP
    class_index := class_index + 1;
    student_index := 0;
    
    FOR student_rec IN 
      SELECT id FROM students 
      WHERE class_id = class_rec.id 
      ORDER BY roll_number, created_at
    LOOP
      student_index := student_index + 1;
      new_roll := (class_index * 100 + student_index)::TEXT;
      UPDATE students SET roll_number = new_roll WHERE id = student_rec.id;
    END LOOP;
  END LOOP;
END $$;


-- Migration: 20260408211848_0dc24990-f0be-4bdc-b224-d1270a52ce35.sql

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name_en TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name_en TEXT;


-- Migration: 20260409165313_a7322ca2-4a3c-4d38-926a-8ccc38f2c38e.sql

ALTER TABLE public.fee_types 
ADD COLUMN payment_frequency text NOT NULL DEFAULT 'one-time';


-- Migration: 20260409172104_8f21f5f7-d151-4db8-a736-d04b11870110.sql
ALTER TABLE public.fee_types 
ADD COLUMN applicable_months jsonb DEFAULT NULL;

-- Migration: 20260409202218_7c743ba2-17a4-4c64-b4ca-8cc5f864ed56.sql
ALTER TABLE public.academic_sessions
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE;

-- Migration: 20260410075415_e534a5c4-c6b1-4354-96ef-fc48d1546e48.sql
DELETE FROM public.exams WHERE id = '8b48d056-bef7-4174-87d5-63089490e5b6';

-- Migration: 20260410075704_89bda292-3f49-4dca-8d5d-9f10b9fad4b5.sql
ALTER TABLE public.results DROP CONSTRAINT results_exam_id_fkey;
ALTER TABLE public.results ADD CONSTRAINT results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE RESTRICT;

-- Migration: 20260410133833_e2dc023c-e626-48b8-b1ac-f37248312955.sql

-- Add is_published to exam_sessions
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Add division_id to results (previously came from exams table)
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL;

-- Drop old foreign key from results -> exams
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_exam_id_fkey;

-- Add new foreign key from results -> exam_sessions
ALTER TABLE public.results ADD CONSTRAINT results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exam_sessions(id) ON DELETE RESTRICT;

-- Drop the old exams table
DROP TABLE IF EXISTS public.exams CASCADE;


-- Migration: 20260410140245_4966efe1-0760-41b2-a6f5-3d42e8c68300.sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Migration: 20260410151504_c8949e22-d206-4769-bdf4-ca0827baaf3f.sql
ALTER TABLE public.custom_form_fields ADD COLUMN section text DEFAULT null;

-- Migration: 20260410165944_d15e020b-8d31-438a-9fab-dcda8d229b99.sql

DELETE FROM custom_form_fields WHERE form_id = '9c696597-1528-4627-8653-2a4937bd7863';
DELETE FROM custom_forms WHERE id = '9c696597-1528-4627-8653-2a4937bd7863';


-- Migration: 20260410175718_90406a0e-56f9-4da3-b6c3-e2899549c36b.sql
CREATE POLICY "Anyone can submit staff applications"
ON public.staff
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending');

-- Migration: 20260410181212_5bf7a097-4806-4fcc-984f-ae8bc1a1df7d.sql
CREATE TABLE public.designations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_bn text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage designations"
ON public.designations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage designations"
ON public.designations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view active designations"
ON public.designations FOR SELECT TO public
USING (is_active = true);

-- Migration: 20260410184823_1af9554e-978d-46a4-a648-916ae539abe6.sql

CREATE TABLE public.joining_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL DEFAULT '',
  staff_name_bn TEXT NOT NULL DEFAULT '',
  designation TEXT DEFAULT '',
  joining_date DATE DEFAULT CURRENT_DATE,
  letter_number TEXT DEFAULT '',
  letter_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  letter_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.joining_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage joining_letters"
  ON public.joining_letters FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can manage joining_letters"
  ON public.joining_letters FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view joining_letters"
  ON public.joining_letters FOR SELECT TO public
  USING (true);


-- Migration: 20260410203530_470f968d-df14-43e9-a98d-6a7116c33c7e.sql

CREATE TABLE public.resign_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_number TEXT,
  staff_name TEXT NOT NULL DEFAULT '',
  staff_name_bn TEXT NOT NULL DEFAULT '',
  designation TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  letter_date DATE,
  resign_date DATE,
  reason TEXT,
  letter_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resign_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view resign letters"
  ON public.resign_letters FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert resign letters"
  ON public.resign_letters FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update resign letters"
  ON public.resign_letters FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete resign letters"
  ON public.resign_letters FOR DELETE TO authenticated USING (true);


-- Migration: 20260410205840_06299f4e-a645-4dcb-bbe0-432c02bcd194.sql
ALTER TABLE public.joining_letters 
ADD COLUMN letter_type text NOT NULL DEFAULT 'joining';

-- Migration: 20260411194605_99d704ab-b9ba-4b0b-bc1e-86396375ec32.sql
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20260411205230_7fe2b67e-fb20-4f1c-8938-7d9696cab38e.sql

-- Create class_routines table
CREATE TABLE public.class_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create routine_periods table
CREATE TABLE public.routine_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID REFERENCES public.class_routines(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  period_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_name TEXT,
  teacher_name_bn TEXT,
  room TEXT,
  is_break BOOLEAN DEFAULT false,
  break_label TEXT,
  break_label_bn TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_periods ENABLE ROW LEVEL SECURITY;

-- Policies for class_routines
CREATE POLICY "Anyone can view active routines"
  ON public.class_routines FOR SELECT USING (true);

CREATE POLICY "Admins can insert routines"
  ON public.class_routines FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update routines"
  ON public.class_routines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete routines"
  ON public.class_routines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies for routine_periods
CREATE POLICY "Anyone can view routine periods"
  ON public.routine_periods FOR SELECT USING (true);

CREATE POLICY "Admins can insert routine periods"
  ON public.routine_periods FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update routine periods"
  ON public.routine_periods FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete routine periods"
  ON public.routine_periods FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_routine_periods_routine_id ON public.routine_periods(routine_id);
CREATE INDEX idx_class_routines_class_id ON public.class_routines(class_id);


-- Migration: 20260411205643_9de122ed-c001-4f47-b84a-e4f0c50950d5.sql

-- Create exam_routines table
CREATE TABLE public.exam_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  exam_session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create exam_routine_entries table
CREATE TABLE public.exam_routine_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID REFERENCES public.exam_routines(id) ON DELETE CASCADE NOT NULL,
  exam_date DATE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  notes TEXT,
  notes_bn TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_routine_entries ENABLE ROW LEVEL SECURITY;

-- Policies for exam_routines
CREATE POLICY "Anyone can view exam routines"
  ON public.exam_routines FOR SELECT USING (true);

CREATE POLICY "Admins can insert exam routines"
  ON public.exam_routines FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exam routines"
  ON public.exam_routines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exam routines"
  ON public.exam_routines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies for exam_routine_entries
CREATE POLICY "Anyone can view exam routine entries"
  ON public.exam_routine_entries FOR SELECT USING (true);

CREATE POLICY "Admins can insert exam routine entries"
  ON public.exam_routine_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exam routine entries"
  ON public.exam_routine_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exam routine entries"
  ON public.exam_routine_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_exam_routine_entries_routine_id ON public.exam_routine_entries(routine_id);
CREATE INDEX idx_exam_routines_session_id ON public.exam_routines(exam_session_id);


-- Migration: 20260412122706_081d4e39-2a3d-4f77-aa31-2fe1babaa41c.sql
ALTER TABLE public.designations
ADD COLUMN staff_category TEXT NOT NULL DEFAULT 'general';

COMMENT ON COLUMN public.designations.staff_category IS 'Category: teacher, administrative, general';

-- Migration: 20260412134908_cc9bac2b-819e-48c3-bc60-083905df6de6.sql
ALTER TABLE public.staff ADD COLUMN staff_category text NOT NULL DEFAULT 'general';

-- Migration: 20260412151352_e6fa511f-20d7-41f7-8a51-e5dbbda078de.sql

CREATE TABLE public.promotion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  from_session_id UUID REFERENCES public.academic_sessions(id),
  to_session_id UUID REFERENCES public.academic_sessions(id),
  from_class_id UUID REFERENCES public.classes(id),
  to_class_id UUID REFERENCES public.classes(id),
  from_division_id UUID REFERENCES public.divisions(id),
  to_division_id UUID REFERENCES public.divisions(id),
  from_roll_number TEXT,
  to_roll_number TEXT,
  promotion_type TEXT NOT NULL DEFAULT 'promoted' CHECK (promotion_type IN ('promoted', 'demoted', 'transferred')),
  promoted_by UUID,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view promotion history"
ON public.promotion_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert promotion history"
ON public.promotion_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promotion history"
ON public.promotion_history FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_promotion_history_student ON public.promotion_history(student_id);
CREATE INDEX idx_promotion_history_session ON public.promotion_history(to_session_id);


-- Migration: 20260412161540_4e1f4cfa-0049-4e69-97a7-bc68507107a4.sql

CREATE TABLE public.attendance_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'fingerprint',
  ip_address TEXT,
  port INTEGER,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  location_bn TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.attendance_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance devices"
ON public.attendance_devices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- Migration: 20260412185015_64fe8f30-8bf9-41a1-8cc3-5bcc4352372e.sql

-- Add deleted_at column to major tables for soft-delete support

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.fee_types ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.library_books ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create indexes for performance on soft-delete queries
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_types_deleted_at ON public.fee_types (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_deleted_at ON public.fee_payments (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON public.expenses (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_donors_deleted_at ON public.donors (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notices_deleted_at ON public.notices (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_books_deleted_at ON public.library_books (deleted_at) WHERE deleted_at IS NULL;


-- Migration: 20260413194017_601edb0b-b30c-4390-bcd2-1786537b885d.sql

-- Create staff_categories table
CREATE TABLE public.staff_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description TEXT,
  route_path TEXT,
  color TEXT DEFAULT 'gray',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view staff categories"
ON public.staff_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert staff categories"
ON public.staff_categories FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update staff categories"
ON public.staff_categories FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff categories"
ON public.staff_categories FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default categories
INSERT INTO public.staff_categories (key, name, name_bn, route_path, color, sort_order) VALUES
('teacher', 'Teacher', 'শিক্ষক', '/admin/teachers', 'blue', 1),
('administrative', 'Administrative', 'প্রশাসনিক কর্মকর্তা', '/admin/administrative-staff', 'purple', 2),
('support', 'Support Staff', 'অফিস কর্মচারী', '/admin/support-staff', 'cyan', 3),
('general', 'General Staff', 'সহায়ক কর্মী', '/admin/general-staff', 'orange', 4);


-- Migration: 20260413194932_12e88c6e-0ac7-4e28-a031-96cf8c4cf400.sql

-- Add staff_id column to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS staff_id TEXT UNIQUE;

-- Add id_prefix and id_start_range to staff_categories
ALTER TABLE public.staff_categories ADD COLUMN IF NOT EXISTS id_prefix TEXT;
ALTER TABLE public.staff_categories ADD COLUMN IF NOT EXISTS id_start_range INTEGER DEFAULT 1001;

-- Update existing categories with defaults
UPDATE public.staff_categories SET id_prefix = 'ADM', id_start_range = 1001 WHERE key = 'administrative';
UPDATE public.staff_categories SET id_prefix = 'TCH', id_start_range = 2001 WHERE key = 'teacher';
UPDATE public.staff_categories SET id_prefix = 'OFF', id_start_range = 3001 WHERE key = 'general';
UPDATE public.staff_categories SET id_prefix = 'STF', id_start_range = 4001 WHERE key = 'support';

-- Create the staff ID generation function
CREATE OR REPLACE FUNCTION public.generate_staff_id(p_category_key TEXT, p_joining_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_start_range INTEGER;
  v_year INTEGER;
  v_max_serial INTEGER;
  v_next_serial INTEGER;
  v_new_id TEXT;
BEGIN
  -- Get the category config (lock the row to prevent race conditions)
  SELECT id_prefix, id_start_range INTO v_prefix, v_start_range
  FROM public.staff_categories
  WHERE key = p_category_key AND is_active = true
  LIMIT 1
  FOR UPDATE;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'No ID prefix configured for category: %', p_category_key;
  END IF;

  -- Use provided year or current year
  v_year := COALESCE(p_joining_year, EXTRACT(YEAR FROM now())::INTEGER);

  -- Find the max serial number for this prefix+year combination
  SELECT MAX(
    CASE 
      WHEN staff_id ~ ('^' || v_prefix || '-' || v_year::TEXT || '-[0-9]+$')
      THEN CAST(split_part(staff_id, '-', 3) AS INTEGER)
      ELSE NULL
    END
  ) INTO v_max_serial
  FROM public.staff
  WHERE staff_id LIKE v_prefix || '-' || v_year::TEXT || '-%';

  -- Determine next serial: max+1 or start_range (whichever is higher)
  IF v_max_serial IS NULL THEN
    v_next_serial := v_start_range;
  ELSE
    v_next_serial := GREATEST(v_max_serial + 1, v_start_range);
  END IF;

  -- Format: PREFIX-YEAR-SERIAL (e.g., TCH-2025-2001)
  v_new_id := v_prefix || '-' || v_year::TEXT || '-' || v_next_serial::TEXT;

  -- Double-check uniqueness
  WHILE EXISTS (SELECT 1 FROM public.staff WHERE staff_id = v_new_id) LOOP
    v_next_serial := v_next_serial + 1;
    v_new_id := v_prefix || '-' || v_year::TEXT || '-' || v_next_serial::TEXT;
  END LOOP;

  RETURN v_new_id;
END;
$$;

-- Create trigger function to auto-generate staff_id on insert
CREATE OR REPLACE FUNCTION public.auto_generate_staff_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
BEGIN
  -- Only generate if staff_id is not already set
  IF NEW.staff_id IS NULL OR NEW.staff_id = '' THEN
    -- Extract year from joining_date, fallback to current year
    IF NEW.joining_date IS NOT NULL THEN
      v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE);
    ELSE
      v_year := EXTRACT(YEAR FROM now())::INTEGER;
    END IF;

    NEW.staff_id := public.generate_staff_id(NEW.staff_category, v_year);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on staff table
DROP TRIGGER IF EXISTS trg_auto_staff_id ON public.staff;
CREATE TRIGGER trg_auto_staff_id
BEFORE INSERT ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_staff_id();

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON public.staff(staff_id);


-- Migration: 20260413203110_db761565-dd68-415a-952c-cfb41d10b0c9.sql

-- Salary savings configuration per staff
CREATE TABLE public.salary_savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  start_month TEXT NOT NULL, -- e.g. '2026-04'
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_saved NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view salary_savings"
  ON public.salary_savings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert salary_savings"
  ON public.salary_savings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update salary_savings"
  ON public.salary_savings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete salary_savings"
  ON public.salary_savings FOR DELETE TO authenticated USING (true);

-- Monthly ledger entries for each deduction
CREATE TABLE public.salary_savings_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_id UUID NOT NULL REFERENCES public.salary_savings(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- e.g. '2026-04'
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_savings_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view salary_savings_ledger"
  ON public.salary_savings_ledger FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert salary_savings_ledger"
  ON public.salary_savings_ledger FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update salary_savings_ledger"
  ON public.salary_savings_ledger FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete salary_savings_ledger"
  ON public.salary_savings_ledger FOR DELETE TO authenticated USING (true);

-- Index for fast lookups
CREATE INDEX idx_salary_savings_staff ON public.salary_savings(staff_id);
CREATE INDEX idx_salary_savings_ledger_staff ON public.salary_savings_ledger(staff_id);
CREATE INDEX idx_salary_savings_ledger_month ON public.salary_savings_ledger(month_year);


-- Migration: 20260414064223_7c1dd35b-840f-46b7-b7cb-c49c139c1726.sql
-- Drop old trigger that only fired on INSERT
DROP TRIGGER IF EXISTS trg_auto_staff_id ON public.staff;

-- Recreate trigger for both INSERT and UPDATE
CREATE TRIGGER trg_auto_staff_id
BEFORE INSERT OR UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_staff_id();

-- Migration: 20260414065355_e943e5bf-f68a-4c6d-aca4-e410c8f05312.sql
-- Add new staff category roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrative';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'general';

-- Migration: 20260414164303_513d4a05-8f11-499a-87ef-70b98cfaa31b.sql

-- Question papers table
CREATE TABLE public.question_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'bangla',
  class_id UUID REFERENCES public.classes(id),
  division_id UUID REFERENCES public.divisions(id),
  exam_session_id UUID REFERENCES public.exam_sessions(id),
  total_marks INTEGER NOT NULL DEFAULT 100,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  instructions TEXT,
  instructions_bn TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES public.question_papers(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_bn TEXT,
  question_type TEXT NOT NULL DEFAULT 'descriptive',
  marks INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  group_label TEXT,
  group_label_bn TEXT,
  options JSONB,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage question papers" ON public.question_papers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view question papers" ON public.question_papers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view questions" ON public.questions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));


-- Migration: 20260414165211_55d13491-0deb-4297-89bc-ee56c1da0d72.sql

ALTER TABLE public.question_papers ADD COLUMN subject_id UUID REFERENCES public.subjects(id);


-- Migration: 20260414170606_075271ed-acde-4112-88d9-622e41456723.sql

-- Add approval workflow and font config columns to question_papers
ALTER TABLE public.question_papers 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_note TEXT,
  ADD COLUMN IF NOT EXISTS font_config JSONB DEFAULT '{"arabic":"Amiri","bengali":"SutonnyOMJ","english":"Arial","fontSize":14}'::jsonb,
  ADD COLUMN IF NOT EXISTS header_config JSONB DEFAULT '{"showLogo":true,"showInstitutionName":true,"centered":true}'::jsonb;


-- Migration: 20260414185024_1a1250a5-8806-48eb-9be1-2645170617f8.sql
ALTER TABLE public.question_papers 
ADD COLUMN IF NOT EXISTS layout_settings JSONB DEFAULT '{"orientation":"portrait","columns":1,"marginTop":20,"marginBottom":20,"marginLeft":15,"marginRight":15,"lineSpacing":1.5,"watermark":false,"headerStyle":"simple"}'::jsonb;

-- Migration: 20260414200825_7a2d5291-31ba-4a39-babf-fbdfd1994131.sql

-- Create expense_institutions table
CREATE TABLE public.expense_institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.expense_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_institutions ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin-only access like other expense tables)
CREATE POLICY "Authenticated users can view expense_institutions"
  ON public.expense_institutions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert expense_institutions"
  ON public.expense_institutions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update expense_institutions"
  ON public.expense_institutions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete expense_institutions"
  ON public.expense_institutions FOR DELETE TO authenticated USING (true);

-- Add institution_id column to expense_categories (nullable for backward compat)
ALTER TABLE public.expense_categories ADD COLUMN institution_id UUID REFERENCES public.expense_institutions(id) ON DELETE SET NULL;

-- Seed a default 'General' institution for every existing project
INSERT INTO public.expense_institutions (project_id, name, name_bn)
SELECT id, 'General', 'সাধারণ শাখা'
FROM public.expense_projects;

-- Link all existing categories to their project's default 'General' institution
UPDATE public.expense_categories
SET institution_id = ei.id
FROM public.expense_institutions ei
WHERE expense_categories.project_id = ei.project_id
  AND ei.name = 'General';


-- Migration: 20260414202224_515f4082-5fa8-4b50-8726-b64bd8c38cc6.sql

-- Step 1: Update institution names to match their parent project names
UPDATE public.expense_institutions ei
SET name = ep.name, name_bn = ep.name_bn
FROM public.expense_projects ep
WHERE ei.project_id = ep.id;

-- Step 2: Add institution_id to expenses table
ALTER TABLE public.expenses ADD COLUMN institution_id UUID REFERENCES public.expense_institutions(id);

-- Step 3: Populate institution_id on expenses from their project_id mapping
UPDATE public.expenses e
SET institution_id = ei.id
FROM public.expense_institutions ei
WHERE ei.project_id = e.project_id;

-- Step 4: Ensure all expense_categories have institution_id set
UPDATE public.expense_categories ec
SET institution_id = ei.id
FROM public.expense_institutions ei
WHERE ei.project_id = ec.project_id AND ec.institution_id IS NULL;

-- Step 5: Drop project_id foreign keys and columns
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_project_id_fkey;
ALTER TABLE public.expenses DROP COLUMN project_id;

ALTER TABLE public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_project_id_fkey;
ALTER TABLE public.expense_categories DROP COLUMN project_id;

ALTER TABLE public.expense_institutions DROP CONSTRAINT IF EXISTS expense_institutions_project_id_fkey;
ALTER TABLE public.expense_institutions DROP COLUMN project_id;

-- Step 6: Drop the expense_projects table
DROP TABLE IF EXISTS public.expense_projects CASCADE;

-- Step 7: Make institution_id NOT NULL on expenses (all data is mapped now)
ALTER TABLE public.expenses ALTER COLUMN institution_id SET NOT NULL;

-- Step 8: Make institution_id NOT NULL on expense_categories
ALTER TABLE public.expense_categories ALTER COLUMN institution_id SET NOT NULL;


-- Migration: 20260414221730_95520bcb-8e80-4198-ad9b-075fef32b540.sql
CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('otp_codes')
  ORDER BY t.table_name;
$$;

-- Migration: 20260414223118_43db456a-373a-4971-9c46-eaddd6312bcb.sql

-- 1. Create system_logs table
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view system logs"
ON public.system_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert logs (via trigger - security definer)
CREATE POLICY "System can insert logs"
ON public.system_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_system_logs_table ON public.system_logs(table_name);
CREATE INDEX idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_user ON public.system_logs(user_id);

-- 2. Add deleted_at to salary_records if not exists
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 3. Create generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_record_id TEXT;
  v_user_id UUID;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft delete
    IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL) THEN
      v_action := 'SOFT_DELETE';
    ELSE
      v_action := 'UPDATE';
    END IF;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old := to_jsonb(OLD);
    v_record_id := OLD.id::TEXT;
  END IF;

  -- Try to get current user
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO public.system_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, v_record_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach triggers to critical tables
CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_fee_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_salary_records
  AFTER INSERT OR UPDATE OR DELETE ON public.salary_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_staff
  AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


-- Migration: 20260414223605_d4f4c3c8-8f43-4bee-b8dd-9ca8d8b63ff6.sql

-- 1. Inventory Items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  min_stock_level NUMERIC NOT NULL DEFAULT 0,
  buying_price NUMERIC DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inventory" ON public.inventory_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage inventory" ON public.inventory_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Inventory Logs
CREATE TABLE public.inventory_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  change_amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'in',
  reason TEXT,
  expense_id UUID,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inventory logs" ON public.inventory_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage inventory logs" ON public.inventory_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Fixed Assets
CREATE TABLE public.fixed_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name_bn TEXT NOT NULL,
  asset_name_en TEXT,
  category TEXT NOT NULL DEFAULT 'furniture',
  location TEXT,
  location_bn TEXT,
  purchase_date DATE,
  purchase_price NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'good',
  condition_notes TEXT,
  quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view assets" ON public.fixed_assets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage assets" ON public.fixed_assets
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Audit triggers
CREATE TRIGGER audit_inventory_items
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_fixed_assets
  AFTER INSERT OR UPDATE OR DELETE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- 5. Indexes
CREATE INDEX idx_inventory_items_active ON public.inventory_items(is_active);
CREATE INDEX idx_inventory_logs_item ON public.inventory_logs(item_id);
CREATE INDEX idx_fixed_assets_status ON public.fixed_assets(status);


-- Migration: 20260415195440_0121b5cf-c89f-4f29-b7df-37e32f2bda6f.sql
CREATE OR REPLACE FUNCTION public.increment_inventory_stock(p_item_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.inventory_items
  SET current_stock = current_stock + p_amount,
      updated_at = now()
  WHERE id = p_item_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found or inactive: %', p_item_id;
  END IF;
END;
$$;

-- Migration: 20260415205309_220de714-3519-426d-b267-77e246a43d6c.sql
ALTER TABLE public.fee_payments ADD COLUMN collected_by TEXT DEFAULT NULL;

-- Migration: 20260415210039_d3c57f3a-ad33-4ed1-aea3-46d4f379a5e0.sql
ALTER TABLE public.fee_payments ADD COLUMN approved_by TEXT DEFAULT NULL;

-- Migration: 20260416080447_fbf7bc10-e1b0-44eb-b314-c8828a089a76.sql

CREATE TABLE public.manual_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_type TEXT NOT NULL DEFAULT 'bkash',
  method_name TEXT NOT NULL,
  method_name_bn TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT DEFAULT NULL,
  account_holder_bn TEXT DEFAULT NULL,
  qr_code_url TEXT DEFAULT NULL,
  instructions TEXT DEFAULT NULL,
  instructions_bn TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.manual_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active manual payment methods"
ON public.manual_payment_methods
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage manual payment methods"
ON public.manual_payment_methods
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- Migration: 20260417222846_8fab2ad6-0f23-4da4-943e-b61aad64459e.sql

-- Fix expense_institutions: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert expense_institutions" ON public.expense_institutions;
DROP POLICY IF EXISTS "Authenticated users can update expense_institutions" ON public.expense_institutions;
DROP POLICY IF EXISTS "Authenticated users can delete expense_institutions" ON public.expense_institutions;

CREATE POLICY "Admins can insert expense_institutions" ON public.expense_institutions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update expense_institutions" ON public.expense_institutions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete expense_institutions" ON public.expense_institutions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix resign_letters: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Authenticated users can update resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Authenticated users can delete resign letters" ON public.resign_letters;

CREATE POLICY "Admins can insert resign letters" ON public.resign_letters
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update resign letters" ON public.resign_letters
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete resign letters" ON public.resign_letters
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix salary_savings: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert salary_savings" ON public.salary_savings;
DROP POLICY IF EXISTS "Authenticated users can update salary_savings" ON public.salary_savings;
DROP POLICY IF EXISTS "Authenticated users can delete salary_savings" ON public.salary_savings;

CREATE POLICY "Admins can insert salary_savings" ON public.salary_savings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update salary_savings" ON public.salary_savings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete salary_savings" ON public.salary_savings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix salary_savings_ledger: only admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert salary_savings_ledger" ON public.salary_savings_ledger;
DROP POLICY IF EXISTS "Authenticated users can update salary_savings_ledger" ON public.salary_savings_ledger;
DROP POLICY IF EXISTS "Authenticated users can delete salary_savings_ledger" ON public.salary_savings_ledger;

CREATE POLICY "Admins can insert salary_savings_ledger" ON public.salary_savings_ledger
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update salary_savings_ledger" ON public.salary_savings_ledger
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete salary_savings_ledger" ON public.salary_savings_ledger
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix smtp_config: only admin can INSERT/UPDATE
DROP POLICY IF EXISTS "Authenticated users can insert smtp_config" ON public.smtp_config;
DROP POLICY IF EXISTS "Authenticated users can update smtp_config" ON public.smtp_config;

CREATE POLICY "Admins can insert smtp_config" ON public.smtp_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update smtp_config" ON public.smtp_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- Migration: 20260417223551_9ff03271-aa3a-47f8-a1e9-8adf68baebf5.sql
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_session_id ON public.students(session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON public.fee_payments(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_type_id ON public.fee_payments(fee_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_paid_at ON public.fee_payments(paid_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt_number ON public.fee_payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON public.fee_payments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_payments_year_month ON public.fee_payments(year, month) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_records_date_entity ON public.attendance_records(attendance_date DESC, entity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_entity_type ON public.attendance_records(entity_type, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_staff_category ON public.staff(staff_category);
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON public.staff(staff_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_institution ON public.expenses(institution_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_month_year ON public.expenses(month_year) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_published ON public.notices(is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_table ON public.system_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON public.system_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_results_student ON public.results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_exam ON public.results(exam_id);

CREATE INDEX IF NOT EXISTS idx_fee_types_class ON public.fee_types(class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_types_session ON public.fee_types(session_id) WHERE deleted_at IS NULL;

-- Migration: 20260417234348_d593730e-3f2a-46ad-ba7d-980876fb596c.sql
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

-- Migration: 20260418002003_3e1d864c-85be-4e4e-8d1c-11297879a6ae.sql
-- Helper function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. online_exams
CREATE TABLE public.online_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  description TEXT,
  description_bn TEXT,
  instructions TEXT,
  instructions_bn TEXT,
  exam_session_id UUID REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  total_marks NUMERIC NOT NULL DEFAULT 0,
  passing_marks NUMERIC NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  access_mode TEXT NOT NULL DEFAULT 'logged_in' CHECK (access_mode IN ('logged_in','class_based','access_code','flexible')),
  access_code TEXT,
  result_mode TEXT NOT NULL DEFAULT 'after_review' CHECK (result_mode IN ('immediate','after_review','scheduled')),
  result_publish_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{"randomize_questions":true,"randomize_options":true,"tab_switch_limit":3,"auto_submit_on_limit":true,"fullscreen_required":false,"show_correct_answers":false,"allow_review":true}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed','archived')),
  created_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_online_exams_status ON public.online_exams(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_online_exams_class ON public.online_exams(class_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_online_exams_window ON public.online_exams(start_at, end_at) WHERE deleted_at IS NULL;

-- 2. online_exam_questions
CREATE TABLE public.online_exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_bn TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq','true_false','short_answer')),
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer JSONB,
  marks NUMERIC NOT NULL DEFAULT 1 CHECK (marks >= 0),
  negative_marks NUMERIC NOT NULL DEFAULT 0 CHECK (negative_marks >= 0),
  explanation TEXT,
  explanation_bn TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_online_exam_questions_exam ON public.online_exam_questions(exam_id, sort_order);

-- 3. online_exam_attempts
CREATE TABLE public.online_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  parent_account_id UUID REFERENCES public.parent_accounts(id) ON DELETE SET NULL,
  attempted_by_name TEXT,
  attempted_by_identifier TEXT,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  time_taken_seconds INTEGER,
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  fullscreen_exit_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','auto_submitted','disqualified','abandoned')),
  total_score NUMERIC NOT NULL DEFAULT 0,
  auto_graded_score NUMERIC NOT NULL DEFAULT 0,
  manual_graded_score NUMERIC NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  question_order JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_online_exam_attempt_student ON public.online_exam_attempts(exam_id, student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_online_exam_attempts_exam ON public.online_exam_attempts(exam_id);
CREATE INDEX idx_online_exam_attempts_student ON public.online_exam_attempts(student_id);
CREATE INDEX idx_online_exam_attempts_status ON public.online_exam_attempts(status);

-- 4. online_exam_answers
CREATE TABLE public.online_exam_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.online_exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.online_exam_questions(id) ON DELETE CASCADE,
  answer JSONB,
  is_correct BOOLEAN,
  awarded_marks NUMERIC NOT NULL DEFAULT 0,
  manually_graded BOOLEAN NOT NULL DEFAULT false,
  reviewer_comment TEXT,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_online_exam_answer ON public.online_exam_answers(attempt_id, question_id);
CREATE INDEX idx_online_exam_answers_question ON public.online_exam_answers(question_id);

-- triggers
CREATE TRIGGER trg_online_exams_updated BEFORE UPDATE ON public.online_exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_online_exam_questions_updated BEFORE UPDATE ON public.online_exam_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_online_exam_attempts_updated BEFORE UPDATE ON public.online_exam_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_online_exam_answers_updated BEFORE UPDATE ON public.online_exam_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.online_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published exams" ON public.online_exams FOR SELECT USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "Admins manage exams" ON public.online_exams FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view questions of published exams" ON public.online_exam_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.online_exams e WHERE e.id = exam_id AND e.status = 'published' AND e.deleted_at IS NULL));
CREATE POLICY "Admins manage exam questions" ON public.online_exam_questions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert exam attempt" ON public.online_exam_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update exam attempt" ON public.online_exam_attempts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view exam attempts" ON public.online_exam_attempts FOR SELECT USING (true);
CREATE POLICY "Admins delete exam attempts" ON public.online_exam_attempts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert exam answer" ON public.online_exam_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update exam answer" ON public.online_exam_answers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view exam answers" ON public.online_exam_answers FOR SELECT USING (true);
CREATE POLICY "Admins delete exam answers" ON public.online_exam_answers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20260418004310_5ecc59fd-9a5d-4b4c-a848-a7d429ad40d9.sql

-- 1. live_classes table
CREATE TABLE public.live_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  description TEXT,
  description_bn TEXT,
  provider TEXT NOT NULL DEFAULT 'jitsi' CHECK (provider IN ('jitsi','zoom','google_meet','youtube')),
  meeting_url TEXT,
  meeting_room TEXT,
  access_mode TEXT NOT NULL DEFAULT 'logged_in' CHECK (access_mode IN ('public','logged_in','class_based','access_code')),
  access_code TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  recording_url TEXT,
  enable_chat BOOLEAN NOT NULL DEFAULT true,
  enable_attendance BOOLEAN NOT NULL DEFAULT true,
  enable_reminder BOOLEAN NOT NULL DEFAULT true,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
  max_participants INTEGER,
  created_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_classes_scheduled_start ON public.live_classes(scheduled_start);
CREATE INDEX idx_live_classes_status ON public.live_classes(status);
CREATE INDEX idx_live_classes_class_id ON public.live_classes(class_id);

-- 2. live_class_participants
CREATE TABLE public.live_class_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  attendance_marked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcp_live_class ON public.live_class_participants(live_class_id);
CREATE INDEX idx_lcp_student ON public.live_class_participants(student_id);

-- 3. live_class_messages
CREATE TABLE public.live_class_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID,
  sender_name TEXT NOT NULL,
  sender_role TEXT DEFAULT 'student',
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat','question','answer','system')),
  parent_message_id UUID REFERENCES public.live_class_messages(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcm_live_class ON public.live_class_messages(live_class_id);
CREATE INDEX idx_lcm_created ON public.live_class_messages(created_at);

-- 4. live_class_reminders
CREATE TABLE public.live_class_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  reminder_at TIMESTAMP WITH TIME ZONE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','sms','email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  recipients_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcr_reminder_at ON public.live_class_reminders(reminder_at);
CREATE INDEX idx_lcr_status ON public.live_class_reminders(status);

-- Enable RLS
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_reminders ENABLE ROW LEVEL SECURITY;

-- RLS: live_classes
CREATE POLICY "Public can view published live classes"
  ON public.live_classes FOR SELECT
  USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage live classes"
  ON public.live_classes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can manage live classes"
  ON public.live_classes FOR ALL
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- RLS: live_class_participants
CREATE POLICY "Anyone can view participants of published classes"
  ON public.live_class_participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.live_classes lc WHERE lc.id = live_class_id AND lc.is_published = true)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Logged-in users can join live classes"
  ON public.live_class_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR true);

CREATE POLICY "Users can update their own participation"
  ON public.live_class_participants FOR UPDATE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can delete participants"
  ON public.live_class_participants FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- RLS: live_class_messages
CREATE POLICY "Anyone can view messages of published classes"
  ON public.live_class_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.live_classes lc WHERE lc.id = live_class_id AND lc.is_published = true)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Anyone can post messages"
  ON public.live_class_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage messages"
  ON public.live_class_messages FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can delete messages"
  ON public.live_class_messages FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- RLS: live_class_reminders
CREATE POLICY "Admins manage reminders"
  ON public.live_class_reminders FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Triggers
CREATE TRIGGER update_live_classes_updated_at
  BEFORE UPDATE ON public.live_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
ALTER TABLE public.live_class_messages REPLICA IDENTITY FULL;
ALTER TABLE public.live_class_participants REPLICA IDENTITY FULL;
ALTER TABLE public.live_classes REPLICA IDENTITY FULL;


-- Migration: 20260418004341_bfb68a83-c3ce-43e5-9807-3da08bc85d98.sql

DROP POLICY IF EXISTS "Logged-in users can join live classes" ON public.live_class_participants;
DROP POLICY IF EXISTS "Anyone can post messages" ON public.live_class_messages;

CREATE POLICY "Users can join allowed live classes"
  ON public.live_class_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = live_class_id
        AND lc.is_published = true
        AND lc.deleted_at IS NULL
        AND (
          lc.access_mode = 'public'
          OR auth.uid() IS NOT NULL
        )
    )
  );

CREATE POLICY "Users can post in chat-enabled classes"
  ON public.live_class_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = live_class_id
        AND lc.is_published = true
        AND lc.enable_chat = true
        AND lc.deleted_at IS NULL
        AND (
          lc.access_mode = 'public'
          OR auth.uid() IS NOT NULL
        )
    )
  );


-- Migration: 20260418005833_f86791fd-d135-49f1-bcca-27c1ef6001d4.sql

-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  description_bn TEXT DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'jitsi',
  meeting_url TEXT DEFAULT '',
  meeting_room TEXT DEFAULT '',
  meeting_type TEXT NOT NULL DEFAULT 'staff',
  access_mode TEXT NOT NULL DEFAULT 'logged_in',
  access_code TEXT DEFAULT '',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  organizer_id UUID REFERENCES auth.users(id),
  staff_organizer_id UUID REFERENCES public.staff(id),
  enable_chat BOOLEAN NOT NULL DEFAULT true,
  enable_attendance BOOLEAN NOT NULL DEFAULT true,
  enable_reminder BOOLEAN NOT NULL DEFAULT false,
  reminder_minutes INT DEFAULT 10,
  recording_url TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  notes_bn TEXT DEFAULT '',
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert meetings"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meetings"
  ON public.meetings FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete meetings"
  ON public.meetings FOR DELETE TO authenticated
  USING (true);

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meeting participants
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  staff_id UUID REFERENCES public.staff(id),
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'participant',
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ DEFAULT NULL,
  attendance_marked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meeting participants"
  ON public.meeting_participants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert meeting participants"
  ON public.meeting_participants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meeting participants"
  ON public.meeting_participants FOR UPDATE TO authenticated
  USING (true);

CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_scheduled_start ON public.meetings(scheduled_start);
CREATE INDEX idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);


-- Migration: 20260418022510_15eef002-eb55-48bf-a6f3-feb443ccf41b.sql
-- Create a settings table for default meeting provider configurations
CREATE TABLE IF NOT EXISTS public.meeting_provider_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE,
    default_room_url TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_provider_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view meeting provider settings"
    ON public.meeting_provider_settings FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage meeting provider settings"
    ON public.meeting_provider_settings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_meeting_provider_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_meeting_provider_settings_updated_at ON public.meeting_provider_settings;
CREATE TRIGGER update_meeting_provider_settings_updated_at
    BEFORE UPDATE ON public.meeting_provider_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_meeting_provider_settings_updated_at();

-- Insert default Daily.co settings with the user's room
INSERT INTO public.meeting_provider_settings (provider, default_room_url, is_enabled)
VALUES ('daily', 'https://subhaniamadrasa.daily.co/Ljfzke0kWkZ9bQ6N49ZS', true)
ON CONFLICT (provider) DO UPDATE 
SET default_room_url = EXCLUDED.default_room_url, 
    is_enabled = true,
    updated_at = now();

-- Migration: 20260418032801_144eb01e-a54c-492f-97de-606fc8d55389.sql

-- Syllabus coverage tracking table
CREATE TABLE public.syllabus_coverage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  coverage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chapter TEXT,
  chapter_bn TEXT,
  topic TEXT,
  topic_bn TEXT,
  pages_covered TEXT,
  duration_minutes INTEGER,
  progress_percent NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.syllabus_coverage ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on syllabus_coverage"
  ON public.syllabus_coverage FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Staff can view
CREATE POLICY "Staff can view syllabus_coverage"
  ON public.syllabus_coverage FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_syllabus_coverage_updated_at
  BEFORE UPDATE ON public.syllabus_coverage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_syllabus_coverage_session_class ON public.syllabus_coverage(session_id, class_id);
CREATE INDEX idx_syllabus_coverage_teacher ON public.syllabus_coverage(teacher_id);
CREATE INDEX idx_syllabus_coverage_date ON public.syllabus_coverage(coverage_date);


-- Migration: 20260421182535_ac412530-4d8f-4805-9f77-b260d8e59f07.sql
-- Create student_certificates table for tracking issued certificates, transfer letters, and testimonials
CREATE TABLE public.student_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('certificate', 'transfer', 'testimonial')),
  certificate_category TEXT,
  serial_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose TEXT,
  purpose_bn TEXT,
  conduct TEXT,
  conduct_bn TEXT,
  reason TEXT,
  reason_bn TEXT,
  remarks TEXT,
  remarks_bn TEXT,
  last_class_attended TEXT,
  last_class_attended_bn TEXT,
  date_of_leaving DATE,
  date_of_admission DATE,
  achievements TEXT,
  achievements_bn TEXT,
  custom_data JSONB DEFAULT '{}'::jsonb,
  issued_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

-- Admins/staff can view all
CREATE POLICY "Admins and staff can view certificates"
ON public.student_certificates
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- Admins/staff can insert
CREATE POLICY "Admins and staff can insert certificates"
ON public.student_certificates
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- Admins/staff can update
CREATE POLICY "Admins and staff can update certificates"
ON public.student_certificates
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- Admins can delete
CREATE POLICY "Admins can delete certificates"
ON public.student_certificates
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Indexes
CREATE INDEX idx_student_certificates_student_id ON public.student_certificates(student_id);
CREATE INDEX idx_student_certificates_type ON public.student_certificates(certificate_type);
CREATE INDEX idx_student_certificates_issue_date ON public.student_certificates(issue_date DESC);
CREATE INDEX idx_student_certificates_deleted_at ON public.student_certificates(deleted_at) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_student_certificates_updated_at
BEFORE UPDATE ON public.student_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log trigger
CREATE TRIGGER audit_student_certificates
AFTER INSERT OR UPDATE OR DELETE ON public.student_certificates
FOR EACH ROW
EXECUTE FUNCTION public.audit_log_trigger();

-- Migration: 20260421184013_93353375-cad5-4fcf-9207-505ddf95d412.sql
-- Certificate template designs (per type: certificate, transfer, testimonial)
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,         -- certificate | transfer | testimonial
  config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- design settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Anyone (printing flow) can read templates
CREATE POLICY "Anyone can read certificate templates"
ON public.certificate_templates FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert certificate templates"
ON public.certificate_templates FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update certificate templates"
ON public.certificate_templates FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete certificate templates"
ON public.certificate_templates FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rows for the 3 types so the designer can edit out of the box
INSERT INTO public.certificate_templates (template_type, config) VALUES
('certificate', '{}'::jsonb),
('transfer', '{}'::jsonb),
('testimonial', '{}'::jsonb)
ON CONFLICT (template_type) DO NOTHING;

-- Migration: 20260421192059_ba6aa08f-dab9-4444-9e23-fc3f9a611181.sql
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS address_en TEXT,
ADD COLUMN IF NOT EXISTS other_info_en TEXT;

-- Migration: 20260422113300_db203b88-ec25-45fa-af0e-0bca615b5d59.sql
CREATE TABLE IF NOT EXISTS public.whatsapp_config (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), phone_number TEXT, welcome_message TEXT DEFAULT 'আসসালামু আলাইকুম', show_floating_button BOOLEAN NOT NULL DEFAULT true, button_position TEXT NOT NULL DEFAULT 'bottom-right', button_label TEXT DEFAULT 'WhatsApp চ্যাট', cloud_api_enabled BOOLEAN NOT NULL DEFAULT false, phone_number_id TEXT, business_account_id TEXT, default_language TEXT DEFAULT 'bn', business_hours TEXT, away_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view whatsapp config" ON public.whatsapp_config FOR SELECT USING (true);
CREATE POLICY "Admins can insert whatsapp config" ON public.whatsapp_config FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update whatsapp config" ON public.whatsapp_config FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete whatsapp config" ON public.whatsapp_config FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.whatsapp_config (phone_number, welcome_message, show_floating_button) VALUES (NULL, 'আসসালামু আলাইকুম, আমি আপনাদের প্রতিষ্ঠান সম্পর্কে জানতে চাই।', true) ON CONFLICT DO NOTHING;

-- Migration: 20260422114108_a4c667e5-619f-4944-a57f-24ba62433dcd.sql
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

-- Migration: 20260422114435_df255180-f776-462a-819d-51940230adf2.sql
ALTER TABLE public.whatsapp_templates
ADD COLUMN IF NOT EXISTS variable_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill rules from existing variables (mark all as optional text by default)
UPDATE public.whatsapp_templates
SET variable_rules = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'key', v,
        'label', v,
        'required', false,
        'type', 'text',
        'placeholder', '',
        'default_value', ''
      )
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text(variables) AS v
)
WHERE variable_rules = '[]'::jsonb AND jsonb_array_length(variables) > 0;

-- Migration: 20260422122610_78082c81-6e0a-4662-a211-682f15abee79.sql

-- 1. WhatsApp Message Queue table
CREATE TABLE public.whatsapp_message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('fee_receipt', 'absence', 'result', 'notice', 'custom')),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_text TEXT NOT NULL,
  template_name TEXT,
  template_variables JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'failed', 'rejected')),
  reference_id TEXT,
  reference_table TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp queue"
ON public.whatsapp_message_queue
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wa_queue_status ON public.whatsapp_message_queue(status);
CREATE INDEX idx_wa_queue_trigger ON public.whatsapp_message_queue(trigger_type);
CREATE INDEX idx_wa_queue_created ON public.whatsapp_message_queue(created_at DESC);

CREATE TRIGGER update_wa_queue_updated_at
BEFORE UPDATE ON public.whatsapp_message_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Queue function: Fee payment → receipt message
CREATE OR REPLACE FUNCTION public.queue_whatsapp_fee_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_fee_type RECORD;
  v_msg TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    SELECT name_bn, name_en, student_id, guardian_phone, phone
    INTO v_student FROM public.students WHERE id = NEW.student_id;

    SELECT name_bn, name INTO v_fee_type FROM public.fee_types WHERE id = NEW.fee_type_id;

    IF v_student IS NOT NULL AND COALESCE(v_student.guardian_phone, v_student.phone) IS NOT NULL THEN
      v_msg := 'সম্মানিত অভিভাবক, ' || v_student.name_bn ||
               ' (আইডি: ' || v_student.student_id || ') এর ' ||
               COALESCE(v_fee_type.name_bn, v_fee_type.name) ||
               ' বাবদ ৳' || COALESCE(NEW.paid_amount, NEW.amount) ||
               ' পরিশোধ হয়েছে। রসিদ নং: ' || COALESCE(NEW.receipt_number, 'N/A') || '।';

      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'fee_receipt',
        COALESCE(v_student.guardian_phone, v_student.phone),
        v_student.name_bn,
        v_msg,
        NEW.id::TEXT,
        'fee_payments'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_fee_receipt
AFTER INSERT OR UPDATE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_fee_receipt();

-- 3. Queue function: Absence → alert
CREATE OR REPLACE FUNCTION public.queue_whatsapp_absence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_msg TEXT;
  v_date_str TEXT;
BEGIN
  IF NEW.entity_type = 'student' AND NEW.status = 'absent' THEN
    SELECT name_bn, name_en, student_id, guardian_phone, phone
    INTO v_student FROM public.students WHERE id = NEW.entity_id;

    IF v_student IS NOT NULL AND COALESCE(v_student.guardian_phone, v_student.phone) IS NOT NULL THEN
      v_date_str := to_char(NEW.attendance_date, 'DD/MM/YYYY');
      v_msg := 'সম্মানিত অভিভাবক, আপনার সন্তান ' || v_student.name_bn ||
               ' (আইডি: ' || v_student.student_id || ') তারিখ ' || v_date_str ||
               ' তে অনুপস্থিত ছিল। বিস্তারিত জানতে প্রতিষ্ঠানে যোগাযোগ করুন।';

      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'absence',
        COALESCE(v_student.guardian_phone, v_student.phone),
        v_student.name_bn,
        v_msg,
        NEW.id::TEXT,
        'attendance_records'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_absence
AFTER INSERT ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_absence();

-- 4. Queue function: Result published → message
CREATE OR REPLACE FUNCTION public.queue_whatsapp_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_exam RECORD;
  v_msg TEXT;
  r RECORD;
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    SELECT name, name_bn INTO v_exam FROM public.exam_sessions WHERE id = NEW.id;

    FOR r IN
      SELECT DISTINCT s.id, s.name_bn, s.student_id, s.guardian_phone, s.phone
      FROM public.exam_session_students ess
      JOIN public.students s ON s.id = ess.student_id
      WHERE ess.exam_session_id = NEW.id
        AND COALESCE(s.guardian_phone, s.phone) IS NOT NULL
    LOOP
      v_msg := 'সম্মানিত অভিভাবক, ' || r.name_bn ||
               ' (আইডি: ' || r.student_id || ') এর ' ||
               COALESCE(v_exam.name_bn, v_exam.name) ||
               ' এর ফলাফল প্রকাশিত হয়েছে। বিস্তারিত জানতে প্রতিষ্ঠানে যোগাযোগ করুন।';

      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'result',
        COALESCE(r.guardian_phone, r.phone),
        r.name_bn,
        v_msg,
        NEW.id::TEXT,
        'exam_sessions'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_result
AFTER UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_result();

-- 5. Queue function: Notice published → message (bulk to all students with phone)
CREATE OR REPLACE FUNCTION public.queue_whatsapp_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_msg TEXT;
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    v_msg := '📢 নোটিশ: ' || COALESCE(NEW.title_bn, NEW.title) ||
             CASE WHEN NEW.content IS NOT NULL THEN E'\n' || left(NEW.content, 200) ELSE '' END;

    FOR r IN
      SELECT DISTINCT s.id, s.name_bn, COALESCE(s.guardian_phone, s.phone) AS phone
      FROM public.students s
      WHERE s.deleted_at IS NULL
        AND COALESCE(s.guardian_phone, s.phone) IS NOT NULL
      LIMIT 500
    LOOP
      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'notice',
        r.phone,
        r.name_bn,
        v_msg,
        NEW.id::TEXT,
        'notices'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_notice
AFTER INSERT OR UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_notice();


-- Migration: 20260422172753_b5d56668-2ba4-4238-b017-ebd597155bca.sql
-- Online Admission Test System

-- 1. Admission test configurations
CREATE TABLE public.admission_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  description TEXT,
  description_bn TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL DEFAULT 100,
  pass_mark INTEGER NOT NULL DEFAULT 40,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,
  shuffle_questions BOOLEAN DEFAULT true,
  show_result_immediately BOOLEAN DEFAULT true,
  instructions TEXT,
  instructions_bn TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. MCQ questions for admission tests
CREATE TABLE public.admission_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.admission_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_bn TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  marks INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Applicant attempts and auto-scored results
CREATE TABLE public.admission_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.admission_tests(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT,
  applicant_email TEXT,
  applicant_guardian TEXT,
  applicant_address TEXT,
  applicant_nid_birth TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  rank INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  ip_address TEXT,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admission_test_questions_test ON public.admission_test_questions(test_id, sort_order);
CREATE INDEX idx_admission_test_attempts_test ON public.admission_test_attempts(test_id, score DESC);
CREATE INDEX idx_admission_tests_published ON public.admission_tests(is_published, opens_at, closes_at);

-- Triggers for updated_at
CREATE TRIGGER update_admission_tests_updated_at
  BEFORE UPDATE ON public.admission_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.admission_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_test_attempts ENABLE ROW LEVEL SECURITY;

-- RLS: admission_tests
-- Anyone can view PUBLISHED tests (public listing for applicants)
CREATE POLICY "Public can view published admission tests"
  ON public.admission_tests FOR SELECT
  USING (is_published = true AND deleted_at IS NULL);

-- Admins can manage all tests
CREATE POLICY "Admins manage admission tests"
  ON public.admission_tests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: admission_test_questions
-- Anyone can view questions for published tests (needed during exam)
CREATE POLICY "Public can view questions for published tests"
  ON public.admission_test_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admission_tests t
    WHERE t.id = test_id AND t.is_published = true AND t.deleted_at IS NULL
  ));

-- Admins manage all questions
CREATE POLICY "Admins manage admission test questions"
  ON public.admission_test_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: admission_test_attempts
-- Anyone (anonymous applicants) can INSERT attempts for published, open tests
CREATE POLICY "Public can submit attempts for open tests"
  ON public.admission_test_attempts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admission_tests t
    WHERE t.id = test_id AND t.is_published = true AND t.deleted_at IS NULL
  ));

-- Public can update own in-progress attempt (by id) — needed to submit answers
CREATE POLICY "Public can update own attempt"
  ON public.admission_test_attempts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admins can view and manage all attempts
CREATE POLICY "Admins view all attempts"
  ON public.admission_test_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete attempts"
  ON public.admission_test_attempts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Public can read attempts to see their own merit rank in published merit list
CREATE POLICY "Public can view attempts for merit list of published tests"
  ON public.admission_test_attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admission_tests t
    WHERE t.id = test_id AND t.is_published = true AND t.deleted_at IS NULL
  ));

-- Migration: 20260422172847_90c44478-19cf-4f50-a1bd-117da0647cd8.sql
DROP POLICY IF EXISTS "Public can update own attempt" ON public.admission_test_attempts;

-- Migration: 20260422174020_c009a145-c2ee-4c80-b8d4-5c0308330a24.sql

-- Scholarships table
CREATE TABLE public.scholarships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description TEXT,
  scholarship_type TEXT NOT NULL DEFAULT 'merit',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_recipients INTEGER,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  eligibility_criteria TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scholarships"
ON public.scholarships FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage scholarships"
ON public.scholarships FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_scholarships_updated_at
BEFORE UPDATE ON public.scholarships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scholarship Awards table
CREATE TABLE public.scholarship_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  awarded_amount NUMERIC NOT NULL DEFAULT 0,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scholarship_id, student_id, academic_session_id)
);

ALTER TABLE public.scholarship_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scholarship awards"
ON public.scholarship_awards FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage scholarship awards"
ON public.scholarship_awards FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_scholarship_awards_updated_at
BEFORE UPDATE ON public.scholarship_awards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'annual',
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.expense_institutions(id) ON DELETE SET NULL,
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view budgets"
ON public.budgets FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage budgets"
ON public.budgets FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scholarship_awards_student ON public.scholarship_awards(student_id);
CREATE INDEX idx_scholarship_awards_scholarship ON public.scholarship_awards(scholarship_id);
CREATE INDEX idx_budgets_fiscal_year ON public.budgets(fiscal_year);
CREATE INDEX idx_budgets_period ON public.budgets(period_start, period_end);


-- Migration: 20260422175947_f6253e02-e35d-4bea-a425-fedc15c33ef5.sql

CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT UNIQUE,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  complainant_name TEXT,
  complainant_phone TEXT,
  complainant_email TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  related_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  attachments JSONB DEFAULT '[]'::jsonb,
  ip_address TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit complaints"
ON public.complaints FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all complaints"
ON public.complaints FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update complaints"
ON public.complaints FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete complaints"
ON public.complaints FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_complaints_status ON public.complaints(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_complaints_category ON public.complaints(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at DESC);

CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION public.generate_complaint_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year INTEGER;
  v_count INTEGER;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
    SELECT COUNT(*) + 1 INTO v_count FROM public.complaints
    WHERE EXTRACT(YEAR FROM created_at) = v_year;
    NEW.ticket_number := 'CMP-' || v_year::TEXT || '-' || lpad(v_count::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_complaint_ticket_number
BEFORE INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.generate_complaint_ticket();

-- Notification on new complaint
CREATE OR REPLACE FUNCTION public.notify_on_complaint()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
  VALUES (
    'New Complaint: ' || NEW.subject,
    'নতুন অভিযোগ: ' || NEW.subject,
    'Ticket: ' || NEW.ticket_number || ' (' || NEW.priority || ')',
    'টিকিট: ' || NEW.ticket_number,
    CASE WHEN NEW.priority = 'urgent' THEN 'warning' ELSE 'info' END,
    'complaint',
    '/admin/complaints'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_new_complaint
AFTER INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.notify_on_complaint();


-- Migration: 20260422185411_85108c64-fded-4fa0-a492-910e59a299d2.sql

CREATE TABLE IF NOT EXISTS public.parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id UUID REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'parent' CHECK (sender_type IN ('parent', 'admin', 'staff')),
  sender_name TEXT,
  parent_thread_id UUID REFERENCES public.parent_messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_messages_account ON public.parent_messages(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_thread ON public.parent_messages(parent_thread_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_created ON public.parent_messages(created_at DESC);

ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit parent messages"
  ON public.parent_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view parent messages by account"
  ON public.parent_messages FOR SELECT
  USING (true);

CREATE POLICY "Admin and staff can manage parent messages"
  ON public.parent_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER update_parent_messages_updated_at
  BEFORE UPDATE ON public.parent_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins when parent sends a message
CREATE OR REPLACE FUNCTION public.notify_on_parent_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender_type = 'parent' THEN
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'New Parent Message: ' || NEW.subject,
      'নতুন অভিভাবক বার্তা: ' || NEW.subject,
      'From: ' || COALESCE(NEW.sender_name, 'Parent'),
      'প্রেরক: ' || COALESCE(NEW.sender_name, 'অভিভাবক'),
      'info',
      'message',
      '/admin/parent-approvals'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_parent_message
  AFTER INSERT ON public.parent_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_parent_message();


-- Migration: 20260422190447_4dc4e06c-ddd0-4fd9-8b19-e409af7adb5b.sql
-- Web Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone (logged in or anon) can register their own subscription
CREATE POLICY "Anyone can register push subscription"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Users can update/delete their own
CREATE POLICY "Users manage own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users delete own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (user_id = auth.uid() OR user_id IS NULL);

-- Admins view all
CREATE POLICY "Admins view all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Push notification log (audit)
CREATE TABLE IF NOT EXISTS public.push_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  category TEXT DEFAULT 'general',
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  triggered_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage push log"
ON public.push_notification_log
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_push_subs_updated
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260422191404_236b62dc-a70e-4b57-bb77-b6de71d77877.sql
CREATE TABLE IF NOT EXISTS public.hostels (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, name_bn TEXT NOT NULL, hostel_type TEXT NOT NULL DEFAULT 'boys', address TEXT, warden_name TEXT, warden_phone TEXT, total_capacity INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ); CREATE TABLE IF NOT EXISTS public.hostel_rooms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE, room_number TEXT NOT NULL, floor TEXT, bed_count INTEGER NOT NULL DEFAULT 1, monthly_rent NUMERIC NOT NULL DEFAULT 0, room_type TEXT DEFAULT 'standard', is_active BOOLEAN NOT NULL DEFAULT true, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS public.hostel_allocations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), room_id UUID NOT NULL REFERENCES public.hostel_rooms(id) ON DELETE CASCADE, student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, bed_number INTEGER, check_in_date DATE NOT NULL DEFAULT CURRENT_DATE, check_out_date DATE, status TEXT NOT NULL DEFAULT 'active', monthly_charge NUMERIC NOT NULL DEFAULT 0, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS public.hostel_meal_menu (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE, day_of_week TEXT NOT NULL, meal_type TEXT NOT NULL, items TEXT NOT NULL, items_bn TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()); ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY; ALTER TABLE public.hostel_meal_menu ENABLE ROW LEVEL SECURITY; CREATE POLICY "Public read hostels" ON public.hostels FOR SELECT USING (true); CREATE POLICY "Admin manage hostels" ON public.hostels FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); CREATE POLICY "Public read rooms" ON public.hostel_rooms FOR SELECT USING (true); CREATE POLICY "Admin manage rooms" ON public.hostel_rooms FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); CREATE POLICY "Public read allocations" ON public.hostel_allocations FOR SELECT USING (true); CREATE POLICY "Admin manage allocations" ON public.hostel_allocations FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); CREATE POLICY "Public read meals" ON public.hostel_meal_menu FOR SELECT USING (true); CREATE POLICY "Admin manage meals" ON public.hostel_meal_menu FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); CREATE TRIGGER hostels_updated BEFORE UPDATE ON public.hostels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); CREATE TRIGGER hostel_rooms_updated BEFORE UPDATE ON public.hostel_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); CREATE TRIGGER hostel_allocations_updated BEFORE UPDATE ON public.hostel_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); CREATE TRIGGER hostel_meal_menu_updated BEFORE UPDATE ON public.hostel_meal_menu FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260422192446_2cb6bf19-6b64-479c-a2c3-9dae726f1b20.sql

-- Add session/class/staff/fee-mode fields to hostel_allocations
ALTER TABLE public.hostel_allocations
  ADD COLUMN IF NOT EXISTS occupant_type TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_mode TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Make student_id nullable since staff allocations won't have it
ALTER TABLE public.hostel_allocations ALTER COLUMN student_id DROP NOT NULL;

-- Validation: fee_mode must be one of free/full/discount; occupant_type student/staff
ALTER TABLE public.hostel_allocations DROP CONSTRAINT IF EXISTS hostel_alloc_fee_mode_chk;
ALTER TABLE public.hostel_allocations ADD CONSTRAINT hostel_alloc_fee_mode_chk
  CHECK (fee_mode IN ('free','full','discount'));

ALTER TABLE public.hostel_allocations DROP CONSTRAINT IF EXISTS hostel_alloc_occupant_type_chk;
ALTER TABLE public.hostel_allocations ADD CONSTRAINT hostel_alloc_occupant_type_chk
  CHECK (occupant_type IN ('student','staff'));

-- Ensure either student_id or staff_id is set based on occupant_type
ALTER TABLE public.hostel_allocations DROP CONSTRAINT IF EXISTS hostel_alloc_occupant_ref_chk;
ALTER TABLE public.hostel_allocations ADD CONSTRAINT hostel_alloc_occupant_ref_chk
  CHECK (
    (occupant_type = 'student' AND student_id IS NOT NULL) OR
    (occupant_type = 'staff' AND staff_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_hostel_alloc_session ON public.hostel_allocations(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_class ON public.hostel_allocations(class_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_staff ON public.hostel_allocations(staff_id);


-- Migration: 20260422193234_2daef0d3-2d18-4c5b-a673-f8b43b208a7f.sql
-- Health Profiles
CREATE TABLE public.health_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type TEXT NOT NULL CHECK (person_type IN ('student','staff')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  blood_group TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  family_history TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT health_profile_person_ref_chk CHECK (
    (person_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (person_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE UNIQUE INDEX health_profiles_student_uniq ON public.health_profiles(student_id) WHERE student_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX health_profiles_staff_uniq ON public.health_profiles(staff_id) WHERE staff_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage health profiles" ON public.health_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER health_profiles_updated_at
  BEFORE UPDATE ON public.health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Medical Visits
CREATE TABLE public.medical_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type TEXT NOT NULL CHECK (person_type IN ('student','staff')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TIME,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  attended_by TEXT,
  temperature_c NUMERIC,
  blood_pressure TEXT,
  pulse_rate INTEGER,
  follow_up_date DATE,
  severity TEXT DEFAULT 'mild' CHECK (severity IN ('mild','moderate','severe','emergency')),
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT medical_visit_person_ref_chk CHECK (
    (person_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (person_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE INDEX medical_visits_student_idx ON public.medical_visits(student_id) WHERE deleted_at IS NULL;
CREATE INDEX medical_visits_staff_idx ON public.medical_visits(staff_id) WHERE deleted_at IS NULL;
CREATE INDEX medical_visits_date_idx ON public.medical_visits(visit_date DESC);

ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage medical visits" ON public.medical_visits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER medical_visits_updated_at
  BEFORE UPDATE ON public.medical_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vaccinations
CREATE TABLE public.vaccinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type TEXT NOT NULL CHECK (person_type IN ('student','staff')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  vaccine_name_bn TEXT,
  dose_number INTEGER DEFAULT 1,
  vaccination_date DATE NOT NULL,
  next_due_date DATE,
  administered_by TEXT,
  batch_number TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vaccination_person_ref_chk CHECK (
    (person_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (person_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE INDEX vaccinations_student_idx ON public.vaccinations(student_id) WHERE deleted_at IS NULL;
CREATE INDEX vaccinations_staff_idx ON public.vaccinations(staff_id) WHERE deleted_at IS NULL;

ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vaccinations" ON public.vaccinations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vaccinations_updated_at
  BEFORE UPDATE ON public.vaccinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260422202036_841ff321-c941-43f2-83e0-fed2dad27ffa.sql
-- Design projects table for the Design Studio
CREATE TABLE public.design_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Design',
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1080,
  background text NOT NULL DEFAULT '#ffffff',
  canvas_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_design_projects_user ON public.design_projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_design_projects_updated ON public.design_projects(updated_at DESC);

ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their own designs
CREATE POLICY "Users manage own design projects"
ON public.design_projects
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all designs (for support/moderation)
CREATE POLICY "Admins view all design projects"
ON public.design_projects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto update updated_at
CREATE TRIGGER trg_design_projects_updated_at
BEFORE UPDATE ON public.design_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260422205333_588b1054-441f-4918-bc3a-337243a15ff0.sql

-- Templates table
CREATE TABLE IF NOT EXISTS public.design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  tags TEXT[] DEFAULT '{}',
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1080,
  background TEXT NOT NULL DEFAULT '#ffffff',
  canvas_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  thumbnail TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates: anyone authenticated can view system + own"
  ON public.design_templates FOR SELECT
  TO authenticated
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Templates: users insert their own"
  ON public.design_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Templates: users update their own"
  ON public.design_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Templates: users delete their own"
  ON public.design_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

CREATE TRIGGER update_design_templates_updated_at
  BEFORE UPDATE ON public.design_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_design_templates_user ON public.design_templates(user_id);
CREATE INDEX idx_design_templates_category ON public.design_templates(category);

-- Version history column on projects
ALTER TABLE public.design_projects
  ADD COLUMN IF NOT EXISTS version_history JSONB NOT NULL DEFAULT '[]'::jsonb;


-- Migration: 20260424133845_1d117879-ca01-463f-8b9d-12b515160c81.sql
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS established_year TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Migration: 20260424134133_8d35057e-22ee-44c9-844e-70d699a1ebf7.sql
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS established_year_en TEXT,
  ADD COLUMN IF NOT EXISTS registration_number_en TEXT;

-- Migration: 20260424134541_df3c046c-5103-4f20-a728-e39aa5703b34.sql
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Migration: 20260424134803_ced442f5-2bd4-4a35-9b14-01e0816c2bde.sql
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE public.divisions
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Migration: 20260424172256_89e8463c-a04a-4356-9f98-23c6a861de0c.sql
ALTER TABLE public.exam_types ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Migration: 20260424181839_8f1c0d9a-3170-4d30-8d4a-a201bf0f1c3a.sql
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS custom_label text;

-- Migration: 20260426205249_50057788-5749-46a4-93dd-b91d6405bedb.sql
-- Audit log for category shift time changes
CREATE TABLE IF NOT EXISTS public.shift_time_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key TEXT NOT NULL,
  category_label TEXT,
  old_start TEXT,
  old_end TEXT,
  new_start TEXT,
  new_end TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  affected_staff_count INTEGER NOT NULL DEFAULT 0,
  affected_salary_records INTEGER NOT NULL DEFAULT 0,
  affected_staff_ids JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_audit_created ON public.shift_time_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_audit_category ON public.shift_time_audit_log(category_key);

ALTER TABLE public.shift_time_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shift audit log"
ON public.shift_time_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert shift audit log"
ON public.shift_time_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Migration: 20260426205848_f685a867-c176-474f-9baa-52d5ffdde2ac.sql
ALTER TABLE public.salary_records
ADD COLUMN IF NOT EXISTS savings_deduction NUMERIC NOT NULL DEFAULT 0;

-- Migration: 20260427082213_ed4d2662-02cc-4a0f-be4a-4a3993e7602b.sql
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

-- Migration: 20260427171321_a5c659a4-df2f-4d32-866e-f7dd119508a7.sql
-- 1. Salary generation audit log table
CREATE TABLE IF NOT EXISTS public.salary_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_by_name TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name TEXT,
  month_year TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'generate',  -- generate, auto_generate, recalculate, ungenerate
  source TEXT NOT NULL DEFAULT 'manual',     -- manual, bulk, auto_attendance
  success BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,                               -- failure reason or note
  net_salary NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_gen_log_month ON public.salary_generation_log(month_year);
CREATE INDEX IF NOT EXISTS idx_salary_gen_log_staff ON public.salary_generation_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_gen_log_created ON public.salary_generation_log(created_at DESC);

ALTER TABLE public.salary_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view salary generation log"
ON public.salary_generation_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert salary generation log"
ON public.salary_generation_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Auto-generate trigger: when staff attendance is inserted, ensure a draft salary_records row exists for that month
CREATE OR REPLACE FUNCTION public.auto_create_salary_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_year TEXT;
  v_staff RECORD;
  v_existing UUID;
BEGIN
  -- Only for staff full_day attendance
  IF NEW.entity_type <> 'staff' OR NEW.shift <> 'full_day' THEN
    RETURN NEW;
  END IF;

  v_month_year := to_char(NEW.attendance_date, 'YYYY-MM');

  SELECT id, name_bn, name_en, salary INTO v_staff
  FROM public.staff WHERE id = NEW.entity_id AND status = 'active';

  IF v_staff.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing FROM public.salary_records
  WHERE staff_id = NEW.entity_id AND month_year = v_month_year LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Insert a minimal pending salary record (will be recalculated by user/Generate button)
  INSERT INTO public.salary_records (
    staff_id, month_year, base_salary, net_salary, status, remarks
  ) VALUES (
    v_staff.id, v_month_year, COALESCE(v_staff.salary, 0), COALESCE(v_staff.salary, 0),
    'pending', 'Auto-created from attendance entry. Click Recalculate to apply latest settings.'
  );

  -- Audit
  INSERT INTO public.salary_generation_log (
    generated_by, staff_id, staff_name, month_year, action, source, success, reason, net_salary
  ) VALUES (
    NULL, v_staff.id, COALESCE(v_staff.name_bn, v_staff.name_en),
    v_month_year, 'auto_generate', 'auto_attendance', true,
    'Auto-created when attendance recorded', COALESCE(v_staff.salary, 0)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_salary_on_attendance ON public.attendance_records;
CREATE TRIGGER trg_auto_salary_on_attendance
AFTER INSERT ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_salary_on_attendance();

-- Migration: 20260427171624_85c9f3ab-c52c-4d5f-8c33-cd43830d81c2.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'salary_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_records;
  END IF;
END $$;
ALTER TABLE public.salary_records REPLICA IDENTITY FULL;

-- Migration: 20260427174745_923d0252-40b8-49ce-b05b-9371eee5a02b.sql
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS principal_name TEXT,
  ADD COLUMN IF NOT EXISTS accountant_name TEXT,
  ADD COLUMN IF NOT EXISTS verifier_name TEXT;

-- Migration: 20260427175113_eb4efc5f-fa0c-4ec4-bfd0-caee27b551d0.sql
-- Committees table
CREATE TABLE IF NOT EXISTS public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  formation_date DATE,
  tenure_months INTEGER,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Committee members table
CREATE TABLE IF NOT EXISTS public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  designation TEXT NOT NULL,
  designation_en TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  occupation TEXT,
  occupation_en TEXT,
  photo_url TEXT,
  joining_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON public.committee_members(committee_id);

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

-- Public read (active only via app filter)
CREATE POLICY "Public can view committees"
  ON public.committees FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Public can view committee members"
  ON public.committee_members FOR SELECT USING (deleted_at IS NULL);

-- Admin write
CREATE POLICY "Admins can manage committees"
  ON public.committees FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage committee members"
  ON public.committee_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_committees_updated_at BEFORE UPDATE ON public.committees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_committee_members_updated_at BEFORE UPDATE ON public.committee_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260427180307_b56461c4-4c33-407a-878b-1309c0de693e.sql
-- Add optional staff link to committee_members
ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_committee_members_staff_id 
  ON public.committee_members(staff_id) 
  WHERE staff_id IS NOT NULL AND deleted_at IS NULL;

-- Helper view: staff IDs currently linked to an active committee member
CREATE OR REPLACE VIEW public.committee_staff_ids AS
SELECT DISTINCT cm.staff_id
FROM public.committee_members cm
JOIN public.committees c ON c.id = cm.committee_id
WHERE cm.staff_id IS NOT NULL
  AND cm.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND cm.is_active = true
  AND c.is_active = true;

GRANT SELECT ON public.committee_staff_ids TO anon, authenticated;

-- Migration: 20260427181637_a57825eb-12f9-466d-8b95-90853238d310.sql
CREATE TABLE IF NOT EXISTS public.committee_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID,
  committee_name TEXT,
  member_id UUID,
  staff_id UUID,
  member_name TEXT,
  designation TEXT,
  action TEXT NOT NULL,
  performed_by UUID,
  performed_by_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_committee_audit_staff ON public.committee_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_committee_audit_committee ON public.committee_audit_log(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_audit_created ON public.committee_audit_log(created_at DESC);

ALTER TABLE public.committee_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view committee audit log"
ON public.committee_audit_log FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "System can insert audit log"
ON public.committee_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_committee_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_committee_name TEXT;
  v_user UUID;
  v_email TEXT;
  v_target_committee UUID;
  v_target_member UUID;
  v_target_staff UUID;
  v_target_name TEXT;
  v_target_desig TEXT;
BEGIN
  BEGIN v_user := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user := NULL; END;
  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'added';
    v_target_committee := NEW.committee_id;
    v_target_member := NEW.id;
    v_target_staff := NEW.staff_id;
    v_target_name := NEW.name;
    v_target_desig := NEW.designation;
  ELSIF TG_OP = 'UPDATE' THEN
    v_target_committee := NEW.committee_id;
    v_target_member := NEW.id;
    v_target_staff := COALESCE(NEW.staff_id, OLD.staff_id);
    v_target_name := NEW.name;
    v_target_desig := NEW.designation;

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'removed';
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      v_action := 'deactivated';
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      v_action := 'reactivated';
    ELSIF COALESCE(OLD.staff_id::text,'') <> COALESCE(NEW.staff_id::text,'') THEN
      v_action := 'staff_link_changed';
    ELSE
      v_action := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'hard_deleted';
    v_target_committee := OLD.committee_id;
    v_target_member := OLD.id;
    v_target_staff := OLD.staff_id;
    v_target_name := OLD.name;
    v_target_desig := OLD.designation;
  END IF;

  SELECT name INTO v_committee_name FROM public.committees WHERE id = v_target_committee;

  INSERT INTO public.committee_audit_log (
    committee_id, committee_name, member_id, staff_id,
    member_name, designation, action, performed_by, performed_by_email,
    details
  ) VALUES (
    v_target_committee, v_committee_name, v_target_member, v_target_staff,
    v_target_name, v_target_desig, v_action, v_user, v_email,
    CASE WHEN TG_OP = 'UPDATE' THEN
      jsonb_build_object(
        'old_is_active', OLD.is_active, 'new_is_active', NEW.is_active,
        'old_staff_id', OLD.staff_id, 'new_staff_id', NEW.staff_id,
        'old_designation', OLD.designation, 'new_designation', NEW.designation
      )
    ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_committee_audit ON public.committee_members;
CREATE TRIGGER trg_committee_audit
AFTER INSERT OR UPDATE OR DELETE ON public.committee_members
FOR EACH ROW EXECUTE FUNCTION public.log_committee_member_change();

-- Migration: 20260427182506_93c8582c-248d-4be3-a183-d3d29d9e3caa.sql
ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS allow_overlap BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_committee_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_names TEXT;
BEGIN
  -- Only enforce for active linked-staff members
  IF NEW.staff_id IS NULL OR NEW.is_active = false OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.allow_overlap, false) = true THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), string_agg(c.name, ', ')
    INTO v_count, v_names
  FROM public.committee_members cm
  JOIN public.committees c ON c.id = cm.committee_id
  WHERE cm.staff_id = NEW.staff_id
    AND cm.is_active = true
    AND cm.deleted_at IS NULL
    AND c.is_active = true
    AND c.deleted_at IS NULL
    AND (TG_OP = 'INSERT' OR cm.id <> NEW.id)
    AND cm.committee_id <> NEW.committee_id;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'OVERLAP_BLOCKED: Staff is already an active member of: %. Set allow_overlap=true to confirm.', v_names
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_committee_overlap_guard ON public.committee_members;
CREATE TRIGGER trg_committee_overlap_guard
BEFORE INSERT OR UPDATE ON public.committee_members
FOR EACH ROW EXECUTE FUNCTION public.guard_committee_overlap();

-- Migration: 20260427183423_61d80772-275b-4c70-86fd-cf95455029a0.sql

-- Server-side guarded undo RPC for committee audit log
CREATE OR REPLACE FUNCTION public.undo_committee_change(
  p_audit_id uuid,
  p_expected_is_active boolean DEFAULT NULL,
  p_expected_deleted boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.committee_audit_log%ROWTYPE;
  v_member public.committee_members%ROWTYPE;
  v_current_is_active boolean;
  v_current_deleted boolean;
BEGIN
  SELECT * INTO v_entry FROM public.committee_audit_log WHERE id = p_audit_id;
  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'AUDIT_NOT_FOUND';
  END IF;
  IF v_entry.member_id IS NULL THEN
    RAISE EXCEPTION 'NO_MEMBER_REF';
  END IF;

  SELECT * INTO v_member FROM public.committee_members WHERE id = v_entry.member_id;
  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  v_current_is_active := v_member.is_active;
  v_current_deleted := v_member.deleted_at IS NOT NULL;

  -- State-match guard: ensure current state still matches what the client expected
  IF p_expected_is_active IS NOT NULL AND p_expected_is_active <> v_current_is_active THEN
    RAISE EXCEPTION 'STATE_MISMATCH: is_active changed (expected % got %)', p_expected_is_active, v_current_is_active;
  END IF;
  IF p_expected_deleted IS NOT NULL AND p_expected_deleted <> v_current_deleted THEN
    RAISE EXCEPTION 'STATE_MISMATCH: deleted changed (expected % got %)', p_expected_deleted, v_current_deleted;
  END IF;

  -- Reverse the action
  IF v_entry.action = 'added' THEN
    UPDATE public.committee_members SET deleted_at = now() WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'removed' THEN
    UPDATE public.committee_members SET deleted_at = NULL, is_active = true WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'deactivated' THEN
    UPDATE public.committee_members SET is_active = true WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'reactivated' THEN
    UPDATE public.committee_members SET is_active = false WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'updated' AND v_entry.details IS NOT NULL THEN
    UPDATE public.committee_members
    SET designation = COALESCE(v_entry.details->>'old_designation', designation),
        staff_id = NULLIF(v_entry.details->>'old_staff_id','')::uuid
    WHERE id = v_entry.member_id;
  ELSE
    RAISE EXCEPTION 'NOT_UNDOABLE: %', v_entry.action;
  END IF;

  RETURN jsonb_build_object('ok', true, 'action_reversed', v_entry.action, 'member_id', v_entry.member_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_committee_change(uuid, boolean, boolean) TO authenticated;


-- Migration: 20260427184458_ed9cefe0-a870-4075-a3e7-b1c9ca23bff6.sql

-- Storage bucket for committee attachments (public read like other org assets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('committee-attachments', 'committee-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "committee_attachments_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'committee-attachments');

-- Authenticated upload / update / delete
CREATE POLICY "committee_attachments_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'committee-attachments');

CREATE POLICY "committee_attachments_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'committee-attachments');

CREATE POLICY "committee_attachments_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'committee-attachments');

-- Attachments tracking table
CREATE TABLE public.committee_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  description text,
  uploaded_by uuid,
  uploaded_by_email text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_committee_attachments_committee ON public.committee_attachments(committee_id) WHERE deleted_at IS NULL;

ALTER TABLE public.committee_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "committee_attachments_select_all"
ON public.committee_attachments FOR SELECT
USING (deleted_at IS NULL);

CREATE POLICY "committee_attachments_auth_insert_row"
ON public.committee_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "committee_attachments_auth_update_row"
ON public.committee_attachments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER set_committee_attachments_updated_at
BEFORE UPDATE ON public.committee_attachments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260427192941_acf62d4e-4d0a-4506-88c2-2dec1b158562.sql
-- Password Policy Settings (single-row table)
CREATE TABLE IF NOT EXISTS public.password_policy (
  id INTEGER PRIMARY KEY DEFAULT 1,
  min_length INTEGER NOT NULL DEFAULT 8,
  require_uppercase BOOLEAN NOT NULL DEFAULT true,
  require_lowercase BOOLEAN NOT NULL DEFAULT true,
  require_number BOOLEAN NOT NULL DEFAULT true,
  require_special BOOLEAN NOT NULL DEFAULT true,
  block_leaked_passwords BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT password_policy_singleton CHECK (id = 1),
  CONSTRAINT password_policy_min_length_range CHECK (min_length BETWEEN 6 AND 64)
);

ALTER TABLE public.password_policy ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated (and even anon for signup hint) can read the policy
CREATE POLICY "Password policy readable by all"
  ON public.password_policy FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update password policy"
  ON public.password_policy FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert password policy"
  ON public.password_policy FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the singleton row
INSERT INTO public.password_policy (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- Security Events (audit log)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  -- e.g. 'otp_failed', 'otp_success', 'password_change_success',
  --      'password_change_failed', 'weak_password_rejected', 'login_failed'
  severity TEXT NOT NULL DEFAULT 'info', -- info | warning | critical
  user_id UUID,
  target_user_id UUID,
  email TEXT,
  reason TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type
  ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_email
  ON public.security_events (email);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete security events"
  ON public.security_events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- INSERT is intentionally restricted to service role / SECURITY DEFINER functions.
-- No client-side INSERT policy is created.

-- Helper: validate a password against the current policy
CREATE OR REPLACE FUNCTION public.validate_password_strength(p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.password_policy%ROWTYPE;
  v_failures TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_policy FROM public.password_policy WHERE id = 1;
  IF v_policy.id IS NULL THEN
    -- Fallback defaults
    v_policy.min_length := 8;
    v_policy.require_uppercase := true;
    v_policy.require_lowercase := true;
    v_policy.require_number := true;
    v_policy.require_special := true;
  END IF;

  IF p_password IS NULL OR length(p_password) < v_policy.min_length THEN
    v_failures := array_append(v_failures, 'min_length');
  END IF;
  IF v_policy.require_uppercase AND p_password !~ '[A-Z]' THEN
    v_failures := array_append(v_failures, 'uppercase');
  END IF;
  IF v_policy.require_lowercase AND p_password !~ '[a-z]' THEN
    v_failures := array_append(v_failures, 'lowercase');
  END IF;
  IF v_policy.require_number AND p_password !~ '[0-9]' THEN
    v_failures := array_append(v_failures, 'number');
  END IF;
  IF v_policy.require_special AND p_password !~ '[^A-Za-z0-9]' THEN
    v_failures := array_append(v_failures, 'special');
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(v_failures, 1) IS NULL,
    'failures', to_jsonb(v_failures),
    'policy', jsonb_build_object(
      'min_length', v_policy.min_length,
      'require_uppercase', v_policy.require_uppercase,
      'require_lowercase', v_policy.require_lowercase,
      'require_number', v_policy.require_number,
      'require_special', v_policy.require_special
    )
  );
END;
$$;

-- Migration: 20260427195251_a65bb1ab-ca29-45fa-869e-36e18d0d52a2.sql
-- Enforce unique user name (full_name) on profiles, case-insensitive, ignoring blanks/nulls
CREATE UNIQUE INDEX IF NOT EXISTS profiles_full_name_unique_ci
  ON public.profiles (lower(full_name))
  WHERE full_name IS NOT NULL AND full_name <> '';

-- Migration: 20260427203713_8045e240-2e71-4307-b3d3-966e5ae9f0da.sql
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


-- Migration: 20260427213132_0a408d0a-9c94-49df-8d0d-bccf5ab7ec3b.sql
CREATE TABLE IF NOT EXISTS public.otp_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  expiry_minutes INTEGER NOT NULL DEFAULT 10,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  hourly_limit INTEGER NOT NULL DEFAULT 5,
  daily_limit INTEGER NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT otp_config_singleton CHECK (id = 1)
);

INSERT INTO public.otp_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.otp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read otp config"
  ON public.otp_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update otp config"
  ON public.otp_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert otp config"
  ON public.otp_config FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_otp_config_updated_at
  BEFORE UPDATE ON public.otp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260427213803_d9798465-9ccb-4777-bcac-582e7dcfd352.sql
-- Multi-SMTP support: add name + purpose + priority for purpose-based routing

ALTER TABLE public.smtp_config
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Default',
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- purpose values: 'all' (fallback/default), 'otp', 'welcome', 'notice', 'bulk', 'transactional', 'auth'
-- Keep existing single row as the 'all' default profile

COMMENT ON COLUMN public.smtp_config.purpose IS 'Email purpose this SMTP serves: all | otp | welcome | notice | bulk | transactional | auth';
COMMENT ON COLUMN public.smtp_config.priority IS 'Higher priority = preferred when multiple profiles match the purpose';

CREATE INDEX IF NOT EXISTS idx_smtp_config_purpose ON public.smtp_config(purpose) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_smtp_config_enabled ON public.smtp_config(is_enabled);

-- Migration: 20260427215012_e89b9b62-98b0-4798-978c-5adebf207103.sql

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  brand_color TEXT DEFAULT '#10b981',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email templates"
  ON public.email_templates FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email templates"
  ON public.email_templates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete non-system email templates"
  ON public.email_templates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') AND is_system = false);

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.email_templates (template_key, name, description, subject, html_body, variables, is_system) VALUES
('otp', 'OTP Verification', 'ভেরিফিকেশন কোড পাঠানোর জন্য', 'আপনার ভেরিফিকেশন কোড: {{otp}}',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,{{brand_color}} 0%,#059669 100%);padding:48px 40px;text-align:center;">
<div style="display:inline-block;width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;line-height:72px;font-size:36px;">🔐</div>
<h1 style="color:#ffffff;font-size:26px;margin:20px 0 8px;font-weight:700;">ভেরিফিকেশন কোড</h1>
<p style="color:rgba(255,255,255,0.9);margin:0;font-size:15px;">{{institution_name}}</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px;">আসসালামু আলাইকুম,</p>
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 32px;">আপনার অ্যাকাউন্ট ভেরিফাই করতে নিচের কোডটি ব্যবহার করুন:</p>
<div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:2px dashed {{brand_color}};border-radius:16px;padding:32px;text-align:center;margin:0 0 32px;">
<div style="color:#64748b;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">আপনার OTP কোড</div>
<div style="color:{{brand_color}};font-size:42px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace;">{{otp}}</div>
</div>
<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin:0 0 24px;">
<p style="color:#92400e;font-size:14px;margin:0;line-height:1.5;">⏱️ এই কোডটি <strong>{{expiry_minutes}} মিনিট</strong> পর্যন্ত বৈধ থাকবে। কাউকে এই কোড শেয়ার করবেন না।</p>
</div>
<p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">যদি আপনি এই অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন।</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}. সর্বস্বত্ব সংরক্ষিত।</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["otp","institution_name","expiry_minutes","brand_color","year"]'::jsonb, true),

('welcome', 'Welcome Email', 'নতুন ইউজার রেজিস্ট্রেশনের পর স্বাগতম বার্তা', 'স্বাগতম {{user_name}} - {{institution_name}}',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,{{brand_color}} 0%,#059669 100%);padding:56px 40px;text-align:center;">
<div style="display:inline-block;width:80px;height:80px;background:rgba(255,255,255,0.2);border-radius:24px;line-height:80px;font-size:40px;">🎉</div>
<h1 style="color:#ffffff;font-size:30px;margin:24px 0 8px;font-weight:800;">স্বাগতম!</h1>
<p style="color:rgba(255,255,255,0.95);margin:0;font-size:17px;">{{institution_name}}-এ আপনাকে স্বাগতম</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<p style="color:#0f172a;font-size:18px;line-height:1.6;margin:0 0 16px;font-weight:600;">প্রিয় {{user_name}},</p>
<p style="color:#475569;font-size:16px;line-height:1.7;margin:0 0 28px;">আপনি সফলভাবে আমাদের প্ল্যাটফর্মে রেজিস্টার করেছেন। আপনার অ্যাকাউন্ট এখন সক্রিয় এবং ব্যবহারের জন্য প্রস্তুত।</p>
<div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:16px;padding:24px;margin:0 0 28px;">
<h3 style="color:#065f46;font-size:16px;margin:0 0 16px;">✨ আপনি যা করতে পারবেন:</h3>
<ul style="color:#047857;font-size:15px;line-height:2;margin:0;padding-left:20px;">
<li>নোটিশ ও আপডেট দেখা</li><li>একাডেমিক রেজাল্ট অ্যাক্সেস</li><li>ফি পেমেন্ট ও রসিদ</li><li>লাইব্রেরি সার্ভিস</li>
</ul></div>
<div style="text-align:center;margin:32px 0;">
<a href="{{login_url}}" style="display:inline-block;background:linear-gradient(135deg,{{brand_color}} 0%,#059669 100%);color:#ffffff;padding:16px 48px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;box-shadow:0 4px 14px rgba(16,185,129,0.4);">এখনই লগইন করুন →</a>
</div>
<p style="color:#64748b;font-size:14px;line-height:1.6;margin:24px 0 0;text-align:center;">কোনো সাহায্যের প্রয়োজন হলে যোগাযোগ করুন: <a href="mailto:{{support_email}}" style="color:{{brand_color}};">{{support_email}}</a></p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["user_name","institution_name","login_url","support_email","brand_color","year"]'::jsonb, true),

('password_reset', 'Password Reset', 'পাসওয়ার্ড রিসেট লিংক/কোড', 'পাসওয়ার্ড রিসেট অনুরোধ',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:48px 40px;text-align:center;">
<div style="display:inline-block;width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;line-height:72px;font-size:36px;">🔑</div>
<h1 style="color:#ffffff;font-size:26px;margin:20px 0 8px;font-weight:700;">পাসওয়ার্ড রিসেট</h1>
<p style="color:rgba(255,255,255,0.9);margin:0;font-size:15px;">নিরাপত্তা অনুরোধ</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<p style="color:#0f172a;font-size:16px;line-height:1.6;margin:0 0 20px;">প্রিয় {{user_name}},</p>
<p style="color:#475569;font-size:16px;line-height:1.7;margin:0 0 28px;">আমরা আপনার অ্যাকাউন্টের জন্য পাসওয়ার্ড রিসেট করার অনুরোধ পেয়েছি। নিচের কোডটি ব্যবহার করে আপনার পাসওয়ার্ড পরিবর্তন করুন:</p>
<div style="background:#fffbeb;border:2px dashed #f59e0b;border-radius:16px;padding:32px;text-align:center;margin:0 0 28px;">
<div style="color:#92400e;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">রিসেট কোড</div>
<div style="color:#d97706;font-size:38px;font-weight:800;letter-spacing:10px;font-family:'Courier New',monospace;">{{reset_code}}</div>
</div>
<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;border-radius:8px;margin:0 0 24px;">
<p style="color:#991b1b;font-size:14px;margin:0;line-height:1.6;"><strong>⚠️ সতর্কতা:</strong> যদি আপনি এই অনুরোধ না করে থাকেন, অবিলম্বে আপনার পাসওয়ার্ড পরিবর্তন করুন এবং সাপোর্ট টিমের সাথে যোগাযোগ করুন।</p>
</div>
<p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">এই কোডটি {{expiry_minutes}} মিনিট পর্যন্ত বৈধ।</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["user_name","reset_code","expiry_minutes","institution_name","year"]'::jsonb, true),

('notice', 'Notice / Announcement', 'সাধারণ নোটিশ ও ঘোষণা', '📢 {{notice_title}}',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:48px 40px;text-align:center;">
<div style="display:inline-block;width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;line-height:72px;font-size:36px;">📢</div>
<h1 style="color:#ffffff;font-size:26px;margin:20px 0 8px;font-weight:700;">গুরুত্বপূর্ণ নোটিশ</h1>
<p style="color:rgba(255,255,255,0.9);margin:0;font-size:15px;">{{institution_name}}</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:0 0 24px;">
<div style="color:#1e40af;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">{{notice_date}}</div>
<h2 style="color:#0f172a;font-size:22px;margin:0;font-weight:700;line-height:1.4;">{{notice_title}}</h2>
</div>
<div style="color:#334155;font-size:16px;line-height:1.8;margin:0 0 28px;">{{notice_body}}</div>
<div style="text-align:center;margin:32px 0 0;">
<a href="{{notice_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#ffffff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">বিস্তারিত দেখুন →</a>
</div>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["notice_title","notice_body","notice_date","notice_url","institution_name","year"]'::jsonb, true)
ON CONFLICT (template_key) DO NOTHING;


-- Migration: 20260427215605_b7181d06-a4d7-4806-a385-d1c0eef36009.sql

CREATE TABLE IF NOT EXISTS public.email_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  brand_color TEXT,
  changed_by UUID,
  changed_by_email TEXT,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etv_template ON public.email_template_versions(template_id, version_number DESC);

ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view template versions"
  ON public.email_template_versions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert template versions"
  ON public.email_template_versions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Snapshot trigger: before UPDATE, save current row as a version
CREATE OR REPLACE FUNCTION public.snapshot_email_template_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
  v_user UUID;
  v_email TEXT;
BEGIN
  -- Skip if nothing meaningful changed
  IF OLD.subject = NEW.subject
     AND OLD.html_body = NEW.html_body
     AND COALESCE(OLD.brand_color,'') = COALESCE(NEW.brand_color,'') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
  FROM public.email_template_versions WHERE template_id = OLD.id;

  BEGIN v_user := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user := NULL; END;
  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  INSERT INTO public.email_template_versions
    (template_id, template_key, version_number, subject, html_body, brand_color, changed_by, changed_by_email)
  VALUES
    (OLD.id, OLD.template_key, v_next, OLD.subject, OLD.html_body, OLD.brand_color, v_user, v_email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_template_snapshot ON public.email_templates;
CREATE TRIGGER trg_email_template_snapshot
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_email_template_version();


-- Migration: 20260427220101_70401a3e-1fa6-4ae6-aa49-8b04b164f51d.sql

INSERT INTO public.email_templates (template_key, name, description, subject, html_body, brand_color, variables, is_system) VALUES
(
  'payment_receipt',
  'পেমেন্ট রিসিট',
  'ফি/পেমেন্ট সফল হওয়ার পর পাঠানো রসিদ ইমেইল',
  '✓ পেমেন্ট সফল — রসিদ #{{receiptNumber}} ({{appName}})',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#0f766e);padding:40px 32px;text-align:center;">
          <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-block;line-height:72px;font-size:36px;color:#ffffff;">✓</div>
          <h1 style="color:#ffffff;font-size:28px;margin:16px 0 4px;font-weight:700;">পেমেন্ট সফল হয়েছে</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Payment Successful</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 24px;">প্রিয় <strong>{{studentName}}</strong>,</p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 28px;line-height:1.6;">আপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে। বিস্তারিত তথ্য নিচে দেওয়া হলো:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:24px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">রসিদ নম্বর</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{receiptNumber}}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">ফি ধরন</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{feeType}}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">তারিখ</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{paymentDate}}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">পেমেন্ট মাধ্যম</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{paymentMethod}}</td></tr>
            <tr><td colspan="2" style="padding:12px 0;"><div style="border-top:1px dashed #d1d5db;"></div></td></tr>
            <tr><td style="padding:8px 0;color:#111827;font-size:18px;font-weight:700;">মোট পরিশোধিত</td><td style="padding:8px 0;color:{{brandColor}};font-weight:800;font-size:22px;text-align:right;">৳{{amount}}</td></tr>
          </table>
          <p style="font-size:13px;color:#6b7280;margin:0;text-align:center;">এই রসিদটি সংরক্ষণ করুন। কোনো প্রশ্ন থাকলে প্রতিষ্ঠানে যোগাযোগ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}} — স্বয়ংক্রিয় ইমেইল</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#0d9488',
  '["studentName","receiptNumber","feeType","amount","paymentDate","paymentMethod","appName","brandColor"]'::jsonb,
  true
),
(
  'account_created',
  'একাউন্ট তৈরি নিশ্চিতকরণ',
  'নতুন ইউজার একাউন্ট সফলভাবে তৈরি হওয়ার পর পাঠানো ইমেইল',
  '🎉 আপনার একাউন্ট প্রস্তুত — {{appName}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#7c3aed);padding:48px 32px;text-align:center;">
          <div style="font-size:56px;line-height:1;margin-bottom:12px;">🎉</div>
          <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;font-weight:700;">স্বাগতম, {{userName}}!</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0;">আপনার একাউন্ট সফলভাবে তৈরি হয়েছে</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 24px;">{{appName}}-এ আপনাকে স্বাগতম। আপনার একাউন্টের বিস্তারিত তথ্য:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:28px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">ইমেইল</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{email}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">একাউন্ট ধরন</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{accountType}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">তৈরির তারিখ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{createdDate}}</td></tr>
          </table>
          <div style="text-align:center;margin:32px 0;">
            <a href="{{loginUrl}}" style="display:inline-block;background:linear-gradient(135deg,{{brandColor}},#7c3aed);color:#ffffff;padding:14px 36px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">এখনই লগইন করুন →</a>
          </div>
          <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">যদি আপনি এই একাউন্ট তৈরি না করে থাকেন, অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#6366f1',
  '["userName","email","accountType","createdDate","loginUrl","appName","brandColor"]'::jsonb,
  true
),
(
  'application_submitted',
  'আবেদন সাবমিট নিশ্চিতকরণ',
  'স্টাফ/চাকরির আবেদন সফলভাবে জমা হওয়ার পর',
  '📋 আবেদন গৃহীত — ট্র্যাকিং #{{applicationId}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#1e40af);padding:40px 32px;text-align:center;">
          <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;display:inline-block;line-height:72px;font-size:32px;">📋</div>
          <h1 style="color:#ffffff;font-size:26px;margin:16px 0 4px;font-weight:700;">আবেদন সফলভাবে জমা হয়েছে</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Application Received</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 16px;">প্রিয় <strong>{{applicantName}}</strong>,</p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 24px;line-height:1.7;">{{appName}}-এ <strong>{{position}}</strong> পদের জন্য আপনার আবেদন আমরা সফলভাবে পেয়েছি। আমাদের নিয়োগ কমিটি আপনার আবেদনটি পর্যালোচনা করবে।</p>
          <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="font-size:12px;color:#1e40af;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">আপনার ট্র্যাকিং নম্বর</p>
            <p style="font-size:24px;color:{{brandColor}};margin:0;font-weight:800;letter-spacing:2px;">{{applicationId}}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">পদ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{position}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">জমার তারিখ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{submittedDate}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">বর্তমান অবস্থা</td><td style="padding:6px 0;text-align:right;"><span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;">পর্যালোচনাধীন</span></td></tr>
          </table>
          <p style="font-size:14px;color:#4b5563;margin:0;line-height:1.6;">পরবর্তী ধাপ সম্পর্কে আমরা আপনাকে ইমেইলের মাধ্যমে জানাব। অনুগ্রহ করে ট্র্যাকিং নম্বরটি সংরক্ষণ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#3b82f6',
  '["applicantName","position","applicationId","submittedDate","appName","brandColor"]'::jsonb,
  true
),
(
  'admission_submitted',
  'এডমিশন আবেদন নিশ্চিতকরণ',
  'ছাত্র ভর্তি আবেদন সফলভাবে জমা হওয়ার পর পাঠানো ইমেইল',
  '🎓 ভর্তি আবেদন গৃহীত — #{{admissionId}} ({{appName}})',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#047857);padding:40px 32px;text-align:center;">
          <div style="font-size:48px;line-height:1;margin-bottom:8px;">🎓</div>
          <h1 style="color:#ffffff;font-size:26px;margin:8px 0 4px;font-weight:700;">ভর্তি আবেদন সফল</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Admission Application Received</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 16px;">সম্মানিত অভিভাবক,</p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 24px;line-height:1.7;">আপনার সন্তান <strong>{{studentName}}</strong>-এর ভর্তি আবেদন আমরা সফলভাবে পেয়েছি। নিচে আবেদনের বিস্তারিত তথ্য দেওয়া হলো:</p>
          <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="font-size:12px;color:#047857;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">আবেদন নম্বর</p>
            <p style="font-size:24px;color:{{brandColor}};margin:0;font-weight:800;letter-spacing:2px;">{{admissionId}}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">শিক্ষার্থীর নাম</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{studentName}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">আবেদিত শ্রেণী</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{className}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">শিক্ষাবর্ষ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{session}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">জমার তারিখ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{submittedDate}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">অবস্থা</td><td style="padding:6px 0;text-align:right;"><span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;">যাচাইয়ের অপেক্ষায়</span></td></tr>
          </table>
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;"><strong>পরবর্তী ধাপ:</strong> আবেদনটি পর্যালোচনার পর ভর্তি পরীক্ষা/সাক্ষাৎকারের তারিখ আপনাকে ইমেইল ও SMS-এর মাধ্যমে জানানো হবে।</p>
          </div>
          <p style="font-size:13px;color:#6b7280;margin:0;text-align:center;">আবেদন নম্বরটি সংরক্ষণ করুন। যেকোনো প্রশ্নে প্রতিষ্ঠানে যোগাযোগ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}} — স্বয়ংক্রিয় বার্তা</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#10b981',
  '["studentName","className","session","admissionId","submittedDate","appName","brandColor"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO NOTHING;


-- Migration: 20260427222140_15271485-f722-42d6-b7ea-11129adf2212.sql

ALTER TABLE public.otp_config 
  ADD COLUMN IF NOT EXISTS require_for_login boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_for_password_reset boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_for_email_change boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_for_password_change boolean NOT NULL DEFAULT true;


-- Migration: 20260427223321_5e17976a-7824-4426-b65d-5398c5d8957d.sql

-- 1. New columns
ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS failed_reason text,
  ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz;

-- 2. Constrain payment_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'donors_payment_status_check'
  ) THEN
    ALTER TABLE public.donors
      ADD CONSTRAINT donors_payment_status_check
      CHECK (payment_status IN ('pending', 'verified', 'failed'));
  END IF;
END $$;

-- 3. Backfill: existing 'active' rows are treated as verified (preserves old behaviour)
UPDATE public.donors
SET payment_status = 'verified',
    verified_at = COALESCE(verified_at, created_at)
WHERE payment_status = 'pending' AND status = 'active';

-- 4. Auto-assign receipt_number when a row transitions to 'verified'
CREATE OR REPLACE FUNCTION public.assign_donation_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int;
  v_count int;
BEGIN
  IF NEW.payment_status = 'verified' AND (NEW.receipt_number IS NULL OR NEW.receipt_number = '') THEN
    v_year := EXTRACT(YEAR FROM COALESCE(NEW.verified_at, now()))::int;
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.donors
    WHERE receipt_number LIKE 'DR-' || v_year::text || '-%';
    NEW.receipt_number := 'DR-' || v_year::text || '-' || lpad(v_count::text, 5, '0');
    IF NEW.verified_at IS NULL THEN
      NEW.verified_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_donation_receipt_number ON public.donors;
CREATE TRIGGER trg_assign_donation_receipt_number
  BEFORE INSERT OR UPDATE OF payment_status ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_donation_receipt_number();

-- 5. Backfill receipt numbers for already-verified rows missing them
DO $$
DECLARE
  r RECORD;
  v_year int;
  v_count int;
BEGIN
  FOR r IN
    SELECT id, COALESCE(verified_at, created_at) AS ts
    FROM public.donors
    WHERE payment_status = 'verified' AND (receipt_number IS NULL OR receipt_number = '')
    ORDER BY COALESCE(verified_at, created_at)
  LOOP
    v_year := EXTRACT(YEAR FROM r.ts)::int;
    SELECT COUNT(*) + 1 INTO v_count FROM public.donors
    WHERE receipt_number LIKE 'DR-' || v_year::text || '-%';
    UPDATE public.donors
      SET receipt_number = 'DR-' || v_year::text || '-' || lpad(v_count::text, 5, '0')
      WHERE id = r.id;
  END LOOP;
END $$;


-- Migration: 20260427225658_33dbfc76-eaad-4f76-b253-45ad415d3876.sql
-- Per-role OTP overrides matrix
ALTER TABLE public.otp_config
  ADD COLUMN IF NOT EXISTS role_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.otp_config.role_overrides IS
  'Per-role OTP flow overrides. Shape: { "<role>": { "login": bool, "password_reset": bool, "email_change": bool, "password_change": bool } }. Missing keys inherit global require_for_* flags.';

-- Migration: 20260428205250_7c87ed9c-918f-4aa9-9991-3dcb06ef3d16.sql
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_order INTEGER;
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name_bn NULLS LAST) * 10 AS rn
  FROM public.staff
)
UPDATE public.staff s SET salary_order = o.rn FROM ordered o WHERE s.id = o.id AND s.salary_order IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_salary_order ON public.staff(salary_order);

-- Migration: 20260428213619_e2122644-b1a9-486b-a531-e87b3f63954e.sql
CREATE TABLE IF NOT EXISTS public.staff_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  old_designation TEXT,
  new_designation TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  letter_number TEXT,
  issued_by TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.staff_salary_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  old_salary NUMERIC(12,2),
  new_salary NUMERIC(12,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('increase','decrease','adjustment')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  letter_number TEXT,
  issued_by TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.staff_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_salary_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff_promotions" ON public.staff_promotions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage staff_salary_changes" ON public.staff_salary_changes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_staff_promotions_updated
  BEFORE UPDATE ON public.staff_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_staff_salary_changes_updated
  BEFORE UPDATE ON public.staff_salary_changes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_staff_promotions_staff ON public.staff_promotions(staff_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_salary_changes_staff ON public.staff_salary_changes(staff_id) WHERE deleted_at IS NULL;

-- Migration: 20260428222158_b0efa6ee-c0f0-4d7f-a3e9-14299ae5926e.sql
-- 1) Add columns to history tables
ALTER TABLE public.staff_promotions
  ADD COLUMN IF NOT EXISTS letter_file_url TEXT;

ALTER TABLE public.staff_salary_changes
  ADD COLUMN IF NOT EXISTS letter_file_url TEXT;

-- 2) Create public bucket for staff letters
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-letters', 'staff-letters', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage RLS policies
-- Allow public read of letter files
DROP POLICY IF EXISTS "Public read staff letters" ON storage.objects;
CREATE POLICY "Public read staff letters"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'staff-letters');

-- Allow admins to upload
DROP POLICY IF EXISTS "Admins upload staff letters" ON storage.objects;
CREATE POLICY "Admins upload staff letters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'staff-letters'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to update
DROP POLICY IF EXISTS "Admins update staff letters" ON storage.objects;
CREATE POLICY "Admins update staff letters"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'staff-letters'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to delete
DROP POLICY IF EXISTS "Admins delete staff letters" ON storage.objects;
CREATE POLICY "Admins delete staff letters"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'staff-letters'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Migration: 20260428230114_823a1fd1-259d-4545-b9a9-06bb5fa7c516.sql

-- Salary approval workflow: extend salary_records & add settings table

ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS prepared_by_name text,
  ADD COLUMN IF NOT EXISTS prepared_by_role text,
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS verifier_staff_id uuid,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_by_name text,
  ADD COLUMN IF NOT EXISTS verified_by_role text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS approver_staff_id uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_by_role text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS paid_by_name text,
  ADD COLUMN IF NOT EXISTS paid_by_role text,
  ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS workflow_notes text;

-- Allowed stages: draft, pending_verification, verified, pending_approval, approved, paid, rejected
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_records_workflow_stage_chk'
  ) THEN
    ALTER TABLE public.salary_records
      ADD CONSTRAINT salary_records_workflow_stage_chk
      CHECK (workflow_stage IN ('draft','pending_verification','verified','pending_approval','approved','paid','rejected'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_salary_records_workflow_stage ON public.salary_records(workflow_stage);

-- Workflow history (audit trail)
CREATE TABLE IF NOT EXISTS public.salary_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_record_id uuid REFERENCES public.salary_records(id) ON DELETE CASCADE,
  month_year text,
  staff_id uuid,
  from_stage text,
  to_stage text NOT NULL,
  action text NOT NULL,
  actor_user_id uuid,
  actor_name text,
  actor_role text,
  target_staff_id uuid,
  target_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view salary workflow history"
  ON public.salary_workflow_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert salary workflow history"
  ON public.salary_workflow_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Workflow settings: which staff can act as verifier/approver/treasurer
CREATE TABLE IF NOT EXISTS public.salary_workflow_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('verifier','approver','treasurer')),
  staff_id uuid NOT NULL,
  display_name text,
  designation text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, staff_id)
);

ALTER TABLE public.salary_workflow_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view workflow settings"
  ON public.salary_workflow_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage workflow settings"
  ON public.salary_workflow_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_salary_workflow_settings_updated_at
  BEFORE UPDATE ON public.salary_workflow_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260428231832_2b43a8b4-1433-4c0d-9b3a-99d86a31b073.sql
-- Add is_default flag to salary_workflow_settings
ALTER TABLE public.salary_workflow_settings
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_salary_workflow_settings_default
  ON public.salary_workflow_settings(role, is_default) WHERE is_default = true;

-- Migration: 20260428235819_dcc33157-f815-4b4b-a1cb-98460d7980ac.sql
-- 1) Add payroll/attendance visibility flags on staff
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS include_in_payroll BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_in_attendance BOOLEAN NOT NULL DEFAULT true;

-- 2) Insert two new staff categories: Director & Committee Member
INSERT INTO public.staff_categories (key, name, name_bn, id_prefix, id_start_range, sort_order, is_active, color, description)
VALUES
  ('director', 'Director', 'পরিচালক', 'DIR', 5001, 5, true, '#7c3aed', 'পরিচালনা পর্ষদ / প্রশাসনিক বিভাগের সদস্য'),
  ('committee_member', 'Committee Member', 'কমিটি সদস্য', 'CMT', 6001, 6, true, '#0ea5e9', 'বিভিন্ন কমিটির সদস্য')
ON CONFLICT (key) DO NOTHING;

-- 3) Link a staff record to an optional custom role
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- 4) Seed common board / committee custom roles (skip if name already exists)
INSERT INTO public.custom_roles (name, name_bn, base_role, is_system, is_active, sort_order, description, description_bn)
SELECT * FROM (VALUES
  ('director', 'পরিচালক', 'admin', true, true, 10, 'Member of the board of directors', 'পরিচালনা পর্ষদের সদস্য'),
  ('chairman', 'সভাপতি', 'admin', true, true, 20, 'Chairman of the board', 'বোর্ডের সভাপতি'),
  ('vice_chairman', 'সহ-সভাপতি', 'admin', true, true, 30, 'Vice Chairman', 'সহ-সভাপতি'),
  ('secretary', 'সম্পাদক', 'administrative', true, true, 40, 'Secretary', 'সম্পাদক'),
  ('committee_member', 'কমিটি সদস্য', 'staff', true, true, 50, 'General committee member', 'সাধারণ কমিটি সদস্য')
) AS v(name, name_bn, base_role, is_system, is_active, sort_order, description, description_bn)
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.name = v.name);

-- Migration: 20260429001950_e8f28f83-e1de-41f8-827c-910b78c8ec26.sql
-- 1. Add allowed_categories column to custom_roles
ALTER TABLE public.custom_roles
  ADD COLUMN IF NOT EXISTS allowed_categories text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.custom_roles.allowed_categories IS
  'Staff categories that may be assigned this custom role. Empty array = unrestricted.';

-- 2. Pre-fill defaults for the seeded administrative roles (only update where empty)
UPDATE public.custom_roles
SET allowed_categories = ARRAY['director']
WHERE allowed_categories = '{}'::text[]
  AND lower(name) IN ('chairman', 'director', 'president', 'vice chairman', 'vice-chairman', 'vice president', 'vice-president');

UPDATE public.custom_roles
SET allowed_categories = ARRAY['committee_member']
WHERE allowed_categories = '{}'::text[]
  AND lower(name) IN ('secretary', 'joint secretary', 'treasurer', 'member', 'general secretary', 'assistant secretary');

-- 3. Validation trigger function on staff
CREATE OR REPLACE FUNCTION public.validate_staff_custom_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[];
  v_name text;
  v_name_bn text;
BEGIN
  -- Nothing to validate if no custom role assigned
  IF NEW.custom_role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT allowed_categories, name, name_bn
    INTO v_allowed, v_name, v_name_bn
  FROM public.custom_roles
  WHERE id = NEW.custom_role_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'INVALID_CUSTOM_ROLE: Custom role % does not exist', NEW.custom_role_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Empty allowed_categories => unrestricted
  IF v_allowed IS NULL OR array_length(v_allowed, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.staff_category IS NULL OR NOT (NEW.staff_category = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'CUSTOM_ROLE_CATEGORY_MISMATCH: Role "%" (%) is only allowed for categories: %. Current staff_category: %',
      v_name, v_name_bn, array_to_string(v_allowed, ', '), COALESCE(NEW.staff_category, 'NULL')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_staff_custom_role ON public.staff;
CREATE TRIGGER trg_validate_staff_custom_role
BEFORE INSERT OR UPDATE OF custom_role_id, staff_category ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.validate_staff_custom_role();

-- Migration: 20260429153556_67c5c3ab-6eaf-4df4-88f1-0becdfb0d94d.sql
CREATE OR REPLACE FUNCTION public.sync_staff_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_full_name := COALESCE(NULLIF(TRIM(NEW.name_bn), ''), NULLIF(TRIM(NEW.name_en), ''));
  UPDATE public.profiles
  SET full_name = COALESCE(v_full_name, full_name),
      phone = COALESCE(NULLIF(TRIM(NEW.phone), ''), phone),
      avatar_url = COALESCE(NULLIF(TRIM(NEW.photo_url), ''), avatar_url),
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Migration: 20260429153640_e0dec51f-e250-43b4-8476-3586f3966f5d.sql
DROP TRIGGER IF EXISTS trg_sync_staff_to_profile ON public.staff;
CREATE TRIGGER trg_sync_staff_to_profile
AFTER INSERT OR UPDATE
ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.sync_staff_to_profile();

-- Migration: 20260429153712_e1889dac-240a-4b92-8822-0df4842e6fbd.sql
CREATE OR REPLACE FUNCTION public.sync_profile_to_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.staff
  SET name_bn = COALESCE(NULLIF(TRIM(NEW.full_name), ''), name_bn),
      phone = COALESCE(NULLIF(TRIM(NEW.phone), ''), phone),
      photo_url = COALESCE(NULLIF(TRIM(NEW.avatar_url), ''), photo_url),
      updated_at = now()
  WHERE user_id = NEW.id AND deleted_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_to_staff ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_staff
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_staff();

-- Migration: 20260429153755_0029d906-0b4f-44d0-a09c-fd86b8a6cd6d.sql
ALTER TABLE public.profiles DISABLE TRIGGER trg_sync_profile_to_staff;
ALTER TABLE public.staff DISABLE TRIGGER trg_sync_staff_to_profile;

UPDATE public.profiles p
SET full_name = COALESCE(NULLIF(TRIM(s.name_bn), ''), NULLIF(TRIM(s.name_en), ''), p.full_name),
    phone = COALESCE(NULLIF(TRIM(s.phone), ''), p.phone),
    avatar_url = COALESCE(NULLIF(TRIM(s.photo_url), ''), p.avatar_url),
    updated_at = now()
FROM public.staff s
WHERE s.user_id = p.id AND s.deleted_at IS NULL;

ALTER TABLE public.profiles ENABLE TRIGGER trg_sync_profile_to_staff;
ALTER TABLE public.staff ENABLE TRIGGER trg_sync_staff_to_profile;

-- Migration: 20260429153830_697b0014-d0ba-4871-b44f-d2a62b10432e.sql
CREATE OR REPLACE FUNCTION public.sync_staff_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone text;
  v_avatar text;
  v_changed boolean := false;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_full_name := COALESCE(NULLIF(TRIM(NEW.name_bn), ''), NULLIF(TRIM(NEW.name_en), ''));
  v_phone := NULLIF(TRIM(NEW.phone), '');
  v_avatar := NULLIF(TRIM(NEW.photo_url), '');
  IF TG_OP = 'UPDATE' THEN
    IF v_full_name IS DISTINCT FROM COALESCE(NULLIF(TRIM(OLD.name_bn), ''), NULLIF(TRIM(OLD.name_en), ''))
       OR v_phone IS DISTINCT FROM NULLIF(TRIM(OLD.phone), '')
       OR v_avatar IS DISTINCT FROM NULLIF(TRIM(OLD.photo_url), '')
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      v_changed := true;
    END IF;
  ELSE
    v_changed := true;
  END IF;
  IF NOT v_changed THEN
    RETURN NEW;
  END IF;
  UPDATE public.profiles
  SET full_name = COALESCE(v_full_name, full_name),
      phone = COALESCE(v_phone, phone),
      avatar_url = COALESCE(v_avatar, avatar_url),
      updated_at = now()
  WHERE id = NEW.user_id
    AND (
      COALESCE(full_name,'') IS DISTINCT FROM COALESCE(v_full_name, full_name)
      OR COALESCE(phone,'') IS DISTINCT FROM COALESCE(v_phone, phone)
      OR COALESCE(avatar_url,'') IS DISTINCT FROM COALESCE(v_avatar, avatar_url)
    );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_to_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_photo text;
BEGIN
  v_name := NULLIF(TRIM(NEW.full_name), '');
  v_phone := NULLIF(TRIM(NEW.phone), '');
  v_photo := NULLIF(TRIM(NEW.avatar_url), '');
  IF v_name IS NOT DISTINCT FROM NULLIF(TRIM(OLD.full_name), '')
     AND v_phone IS NOT DISTINCT FROM NULLIF(TRIM(OLD.phone), '')
     AND v_photo IS NOT DISTINCT FROM NULLIF(TRIM(OLD.avatar_url), '') THEN
    RETURN NEW;
  END IF;
  UPDATE public.staff
  SET name_bn = COALESCE(v_name, name_bn),
      phone = COALESCE(v_phone, phone),
      photo_url = COALESCE(v_photo, photo_url),
      updated_at = now()
  WHERE user_id = NEW.id
    AND deleted_at IS NULL
    AND (
      COALESCE(name_bn,'') IS DISTINCT FROM COALESCE(v_name, name_bn)
      OR COALESCE(phone,'') IS DISTINCT FROM COALESCE(v_phone, phone)
      OR COALESCE(photo_url,'') IS DISTINCT FROM COALESCE(v_photo, photo_url)
    );
  RETURN NEW;
END;
$$;

-- Migration: 20260429154409_12ade4e9-227d-4fd5-9588-c2c8f9fc3100.sql
CREATE OR REPLACE FUNCTION public.sync_staff_to_committee_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_name_en text;
  v_desig text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.designation IS NOT DISTINCT FROM OLD.designation
     AND NEW.name_bn IS NOT DISTINCT FROM OLD.name_bn
     AND NEW.name_en IS NOT DISTINCT FROM OLD.name_en
     AND NEW.photo_url IS NOT DISTINCT FROM OLD.photo_url
     AND NEW.phone IS NOT DISTINCT FROM OLD.phone THEN
    RETURN NEW;
  END IF;

  v_name := NULLIF(TRIM(NEW.name_bn), '');
  v_name_en := NULLIF(TRIM(NEW.name_en), '');
  v_desig := NULLIF(TRIM(NEW.designation), '');

  UPDATE public.committee_members
  SET name = COALESCE(v_name, name),
      name_en = COALESCE(v_name_en, name_en),
      designation = COALESCE(v_desig, designation),
      designation_en = COALESCE(v_desig, designation_en),
      photo_url = COALESCE(NULLIF(TRIM(NEW.photo_url), ''), photo_url),
      phone = COALESCE(NULLIF(TRIM(NEW.phone), ''), phone),
      updated_at = now()
  WHERE staff_id = NEW.id
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_to_committee_members ON public.staff;
CREATE TRIGGER trg_sync_staff_to_committee_members
AFTER UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.sync_staff_to_committee_members();

-- Migration: 20260429191831_c7347bd7-251b-49dd-a93c-d7bd3cce77ea.sql
-- Sync existing staff.department from staff_category
UPDATE public.staff
SET department = staff_category
WHERE deleted_at IS NULL
  AND staff_category IS NOT NULL
  AND (department IS NULL OR department = '' OR department = 'general' OR department <> staff_category);

-- Trigger to keep department in sync with staff_category
CREATE OR REPLACE FUNCTION public.sync_staff_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always mirror staff_category into department
  IF NEW.staff_category IS NOT NULL THEN
    NEW.department := NEW.staff_category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_department ON public.staff;
CREATE TRIGGER trg_sync_staff_department
BEFORE INSERT OR UPDATE OF staff_category ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.sync_staff_department();

-- Migration: 20260429200444_9f96175b-ba63-433d-99ec-503d9fd80e06.sql
CREATE OR REPLACE FUNCTION public.sync_profile_to_staff()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_phone text;
  v_photo text;
BEGIN
  v_name := NULLIF(TRIM(NEW.full_name), '');
  v_phone := NULLIF(TRIM(NEW.phone), '');
  v_photo := NULLIF(TRIM(NEW.avatar_url), '');
  IF v_name IS NOT DISTINCT FROM NULLIF(TRIM(OLD.full_name), '')
     AND v_phone IS NOT DISTINCT FROM NULLIF(TRIM(OLD.phone), '')
     AND v_photo IS NOT DISTINCT FROM NULLIF(TRIM(OLD.avatar_url), '') THEN
    RETURN NEW;
  END IF;
  UPDATE public.staff
  SET name_bn = COALESCE(v_name, name_bn),
      name_en = COALESCE(v_name, name_en),
      phone = COALESCE(v_phone, phone),
      photo_url = COALESCE(v_photo, photo_url),
      updated_at = now()
  WHERE user_id = NEW.id
    AND deleted_at IS NULL
    AND (
      COALESCE(name_bn,'') IS DISTINCT FROM COALESCE(v_name, name_bn)
      OR COALESCE(name_en,'') IS DISTINCT FROM COALESCE(v_name, name_en)
      OR COALESCE(phone,'') IS DISTINCT FROM COALESCE(v_phone, phone)
      OR COALESCE(photo_url,'') IS DISTINCT FROM COALESCE(v_photo, photo_url)
    );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_staff_to_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_phone text;
  v_avatar text;
  v_changed boolean := false;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_full_name := COALESCE(NULLIF(TRIM(NEW.name_bn), ''), NULLIF(TRIM(NEW.name_en), ''));
  v_phone := NULLIF(TRIM(NEW.phone), '');
  v_avatar := NULLIF(TRIM(NEW.photo_url), '');
  IF TG_OP = 'UPDATE' THEN
    IF v_full_name IS DISTINCT FROM COALESCE(NULLIF(TRIM(OLD.name_bn), ''), NULLIF(TRIM(OLD.name_en), ''))
       OR v_phone IS DISTINCT FROM NULLIF(TRIM(OLD.phone), '')
       OR v_avatar IS DISTINCT FROM NULLIF(TRIM(OLD.photo_url), '')
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      v_changed := true;
    END IF;
  ELSE
    v_changed := true;
  END IF;
  IF NOT v_changed THEN
    RETURN NEW;
  END IF;
  UPDATE public.profiles
  SET full_name = COALESCE(v_full_name, full_name),
      phone = COALESCE(v_phone, phone),
      avatar_url = COALESCE(v_avatar, avatar_url),
      updated_at = now()
  WHERE id = NEW.user_id
    AND (
      COALESCE(full_name,'') IS DISTINCT FROM COALESCE(v_full_name, full_name)
      OR COALESCE(phone,'') IS DISTINCT FROM COALESCE(v_phone, phone)
      OR COALESCE(avatar_url,'') IS DISTINCT FROM COALESCE(v_avatar, avatar_url)
    );
  RETURN NEW;
END;
$function$;

-- Migration: 20260429205502_14e8dcd8-4ecf-4aab-b541-1ccbaf9915fc.sql
-- Create separate table for administrative officers (institution-level admin staff)
CREATE TABLE public.administrative_officers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  -- Basic identity
  name_bn text NOT NULL,
  name_en text,
  designation text,
  department text,
  phone text,
  email text,
  address text,
  photo_url text,
  -- Personal
  date_of_birth date,
  religion text DEFAULT 'islam',
  nid text,
  -- Employment & duty
  joining_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  employment_type text DEFAULT 'full_time',
  residence_type text DEFAULT 'non_residential',
  duty_start_time text DEFAULT '09:00',
  duty_end_time text DEFAULT '17:00',
  -- Background
  education text,
  experience text,
  previous_institute text,
  -- Salary / responsibility
  salary numeric DEFAULT 0,
  responsibilities text,
  office_room text,
  -- Identifier
  officer_id text UNIQUE,
  sort_order integer,
  -- Extensible JSON for any extra fields
  extra_data jsonb DEFAULT '{}'::jsonb,
  -- Soft delete
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_officers_status ON public.administrative_officers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_officers_user_id ON public.administrative_officers(user_id) WHERE deleted_at IS NULL;

ALTER TABLE public.administrative_officers ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can view active records
CREATE POLICY "Authenticated can view administrative officers"
ON public.administrative_officers FOR SELECT
TO authenticated
USING (true);

-- Insert/Update/Delete: only admin or super_admin
CREATE POLICY "Admins can insert administrative officers"
ON public.administrative_officers FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update administrative officers"
ON public.administrative_officers FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete administrative officers"
ON public.administrative_officers FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER set_admin_officers_updated_at
BEFORE UPDATE ON public.administrative_officers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log
CREATE TRIGGER audit_administrative_officers
AFTER INSERT OR UPDATE OR DELETE ON public.administrative_officers
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Migration: 20260429211249_ab1b59b1-71fb-462e-948b-ed8d5a0d1840.sql
-- Unique partial indexes (case-insensitive) on phone & email for non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_officers_phone_active
  ON public.administrative_officers (phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL AND phone <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_officers_email_active
  ON public.administrative_officers (lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL AND email <> '';

-- Friendly validation trigger so duplicates raise an explicit, translatable message
CREATE OR REPLACE FUNCTION public.validate_admin_officer_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE phone = NEW.phone
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর ইতিমধ্যে অন্য একজন প্রশাসনিক কর্মকর্তার জন্য ব্যবহৃত হয়েছে (%).', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE lower(email) = lower(NEW.email)
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_EMAIL: এই ইমেইল ইতিমধ্যে অন্য একজন প্রশাসনিক কর্মকর্তার জন্য ব্যবহৃত হয়েছে (%).', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_admin_officer_unique_trg ON public.administrative_officers;
CREATE TRIGGER validate_admin_officer_unique_trg
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_unique();

-- Migration: 20260429212228_d2de65d5-4966-4ed3-a3a1-c95cf751b4ee.sql
CREATE TABLE IF NOT EXISTS public.administrative_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_dept_name_bn_active
  ON public.administrative_departments (lower(name_bn))
  WHERE deleted_at IS NULL;

ALTER TABLE public.administrative_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view administrative departments" ON public.administrative_departments;
CREATE POLICY "Anyone authenticated can view administrative departments"
  ON public.administrative_departments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage administrative departments" ON public.administrative_departments;
CREATE POLICY "Admins manage administrative departments"
  ON public.administrative_departments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_admin_departments_updated_at ON public.administrative_departments;
CREATE TRIGGER set_admin_departments_updated_at
  BEFORE UPDATE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed common defaults
INSERT INTO public.administrative_departments (name, name_bn, sort_order)
VALUES
  ('Office', 'অফিস', 1),
  ('Accounts', 'হিসাব শাখা', 2),
  ('Administration', 'প্রশাসন', 3),
  ('Academic Section', 'একাডেমিক শাখা', 4),
  ('IT Section', 'আইটি শাখা', 5)
ON CONFLICT DO NOTHING;

-- Migration: 20260429213607_7bd7800d-5c91-4780-aad6-99e79c6f3cb0.sql
-- Unified directory view: staff + administrative_officers
CREATE OR REPLACE VIEW public.staff_directory AS
SELECT
  s.id,
  'staff'::text AS source,
  s.user_id,
  s.name_bn,
  s.name_en,
  s.designation,
  s.department,
  s.staff_category,
  s.phone,
  s.email,
  s.photo_url,
  s.staff_id AS code,
  s.status,
  s.joining_date,
  s.deleted_at,
  s.created_at
FROM public.staff s
WHERE s.deleted_at IS NULL
UNION ALL
SELECT
  ao.id,
  'administrative'::text AS source,
  ao.user_id,
  ao.name_bn,
  ao.name_en,
  ao.designation,
  ao.department,
  'administrative'::text AS staff_category,
  ao.phone,
  ao.email,
  ao.photo_url,
  ao.officer_id AS code,
  ao.status,
  ao.joining_date,
  ao.deleted_at,
  ao.created_at
FROM public.administrative_officers ao
WHERE ao.deleted_at IS NULL;

GRANT SELECT ON public.staff_directory TO authenticated, anon;

-- Migration: 20260429213645_d75b0ef8-d331-4495-898f-c1bf52ac46e1.sql
ALTER VIEW public.staff_directory SET (security_invoker = true);

-- Migration: 20260429214121_08707fe0-4371-40ee-a287-ebdd9e694d9c.sql
CREATE OR REPLACE FUNCTION public.auto_generate_officer_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year INTEGER;
BEGIN
  IF NEW.officer_id IS NULL OR NEW.officer_id = '' THEN
    IF NEW.joining_date IS NOT NULL THEN
      v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE)::INTEGER;
    ELSE
      v_year := EXTRACT(YEAR FROM now())::INTEGER;
    END IF;
    NEW.officer_id := public.generate_administrative_officer_id(v_year);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_officer_id ON public.administrative_officers;
CREATE TRIGGER trg_auto_generate_officer_id
BEFORE INSERT ON public.administrative_officers
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_officer_id();

-- Migration: 20260429215319_43af9eff-1dee-4958-82a8-bdb9b37c84a2.sql

-- 1) Replace the permissive SELECT policy with admin-or-own-row
DROP POLICY IF EXISTS "Authenticated can view administrative officers" ON public.administrative_officers;

CREATE POLICY "Admins or owner can view administrative officers"
ON public.administrative_officers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

-- 2) Public directory view (non-sensitive fields only)
DROP VIEW IF EXISTS public.administrative_officers_public;

CREATE VIEW public.administrative_officers_public
WITH (security_invoker = off) AS
SELECT
  id,
  officer_id,
  name_bn,
  name_en,
  designation,
  department,
  photo_url,
  phone,
  email,
  status,
  joining_date,
  user_id,
  created_at,
  updated_at,
  deleted_at
FROM public.administrative_officers
WHERE deleted_at IS NULL;

GRANT SELECT ON public.administrative_officers_public TO authenticated, anon;


-- Migration: 20260429215425_bd8fa463-7f5c-49f3-995a-af0602398ae2.sql

DROP VIEW IF EXISTS public.staff_directory;

CREATE VIEW public.staff_directory
WITH (security_invoker = off) AS
SELECT s.id,
       'staff'::text AS source,
       s.user_id,
       s.name_bn,
       s.name_en,
       s.designation,
       s.department,
       s.staff_category,
       s.phone,
       s.email,
       s.photo_url,
       s.staff_id AS code,
       s.status,
       s.joining_date,
       s.deleted_at,
       s.created_at
FROM public.staff s
WHERE s.deleted_at IS NULL
UNION ALL
SELECT ao.id,
       'administrative'::text AS source,
       ao.user_id,
       ao.name_bn,
       ao.name_en,
       ao.designation,
       ao.department,
       'administrative'::text AS staff_category,
       ao.phone,
       ao.email,
       ao.photo_url,
       ao.officer_id AS code,
       ao.status,
       ao.joining_date,
       ao.deleted_at,
       ao.created_at
FROM public.administrative_officers ao
WHERE ao.deleted_at IS NULL;

GRANT SELECT ON public.staff_directory TO authenticated, anon;


-- Migration: 20260429215514_f87d81c6-94d3-4418-b2d6-15488744a8d4.sql

CREATE OR REPLACE FUNCTION public.link_administrative_officer_by_email()
RETURNS public.administrative_officers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_row public.administrative_officers;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  -- Already linked?
  SELECT * INTO v_row FROM public.administrative_officers
   WHERE user_id = v_user_id AND deleted_at IS NULL
   LIMIT 1;
  IF v_row.id IS NOT NULL THEN
    RETURN v_row;
  END IF;

  -- Find an unlinked row matching the caller's email
  SELECT * INTO v_row FROM public.administrative_officers
   WHERE lower(email) = lower(v_email)
     AND user_id IS NULL
     AND deleted_at IS NULL
   LIMIT 1;
  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.administrative_officers
     SET user_id = v_user_id, updated_at = now()
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_administrative_officer_by_email() TO authenticated;


-- Migration: 20260429220152_63780a01-3cce-47da-979a-e8aab6c31f1c.sql

CREATE OR REPLACE FUNCTION public.generate_administrative_officer_id(p_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_max_serial INTEGER;
  v_next INTEGER;
  v_id TEXT;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::INTEGER);

  SELECT MAX(
    CASE
      WHEN officer_id ~ ('^ADO-' || v_year::TEXT || '-[0-9]+$')
      THEN CAST(split_part(officer_id, '-', 3) AS INTEGER)
      ELSE NULL
    END
  ) INTO v_max_serial
  FROM public.administrative_officers
  WHERE officer_id LIKE 'ADO-' || v_year::TEXT || '-%';

  v_next := COALESCE(v_max_serial, 0) + 1;
  v_id := 'ADO-' || v_year::TEXT || '-' || lpad(v_next::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM public.administrative_officers WHERE officer_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := 'ADO-' || v_year::TEXT || '-' || lpad(v_next::TEXT, 4, '0');
  END LOOP;

  RETURN v_id;
END;
$$;


-- Migration: 20260429220531_e5ab0254-c284-4278-a7d1-df3e583a2999.sql
UPDATE public.otp_config SET require_for_login = false, updated_at = now() WHERE id = 1;

-- Migration: 20260429225732_ed9523d9-b8fc-48aa-88dc-e27bad848478.sql
-- App-level key/value settings (single source of truth for global preferences like timezone)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public read (these are non-sensitive global preferences)
DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;
CREATE POLICY "app_settings public read"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only admin / super_admin can write
DROP POLICY IF EXISTS "app_settings admin insert" ON public.app_settings;
CREATE POLICY "app_settings admin insert"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app_settings admin update" ON public.app_settings;
CREATE POLICY "app_settings admin update"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app_settings admin delete" ON public.app_settings;
CREATE POLICY "app_settings admin delete"
  ON public.app_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the global timezone (default: Asia/Dhaka)
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'app_timezone',
  '{"timezone":"Asia/Dhaka"}'::jsonb,
  'Global IANA timezone applied to all date/time displays across the app'
)
ON CONFLICT (key) DO NOTHING;

-- Realtime so admin updates propagate live
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- Migration: 20260430061959_9c479791-3ce3-4d57-97a0-f6093fb40061.sql
-- ============================================================
-- DUPLICATE PREVENTION: staff, administrative_officers, cross-table
-- Clear Bangla error messages: "এই ফোন/ইমেইল/এনআইডি দিয়ে ইতিমধ্যে রেজিস্টার্ড"
-- ============================================================

-- 1) Staff uniqueness trigger (phone, email, nid)
CREATE OR REPLACE FUNCTION public.validate_staff_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Phone duplicate within staff
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE phone = NEW.phone
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- Email duplicate within staff
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE lower(email) = lower(NEW.email)
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_EMAIL: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- NID duplicate within staff
  IF NEW.nid IS NOT NULL AND NEW.nid <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE nid = NEW.nid
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_NID: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- user_id duplicate within staff
  IF NEW.user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.staff
      WHERE user_id = NEW.user_id
        AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_USER: এই ইউজার ইতিমধ্যে স্টাফ তালিকায় আছেন।'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_staff_unique ON public.staff;
CREATE TRIGGER trg_validate_staff_unique
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_staff_unique();

-- 2) Extend administrative_officers validator to also check NID + user_id
CREATE OR REPLACE FUNCTION public.validate_admin_officer_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE phone = NEW.phone AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE lower(email) = lower(NEW.email) AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_EMAIL: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.nid IS NOT NULL AND NEW.nid <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE nid = NEW.nid AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_NID: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE user_id = NEW.user_id AND deleted_at IS NULL
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_USER: এই ইউজার ইতিমধ্যে প্রশাসনিক কর্মকর্তা তালিকায় আছেন।'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Cross-table check: same person cannot be in both staff AND administrative_officers
CREATE OR REPLACE FUNCTION public.validate_no_cross_staff_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_other_table TEXT;
  v_match_field TEXT;
  v_match_value TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- When inserting/updating into staff, check administrative_officers
  IF TG_TABLE_NAME = 'staff' THEN
    IF NEW.user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE user_id = NEW.user_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইউজার ইতিমধ্যে প্রশাসনিক কর্মকর্তা তালিকায় রেজিস্টার্ড আছেন। একই ব্যক্তি স্টাফ ও প্রশাসনিক উভয় জায়গায় থাকতে পারবেন না।'
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.phone IS NOT NULL AND NEW.phone <> '' AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE phone = NEW.phone AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.email IS NOT NULL AND NEW.email <> '' AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE lower(email) = lower(NEW.email) AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.nid IS NOT NULL AND NEW.nid <> '' AND EXISTS (
      SELECT 1 FROM public.administrative_officers
      WHERE nid = NEW.nid AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- When inserting/updating into administrative_officers, check staff
  IF TG_TABLE_NAME = 'administrative_officers' THEN
    IF NEW.user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE user_id = NEW.user_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইউজার ইতিমধ্যে স্টাফ তালিকায় রেজিস্টার্ড আছেন। একই ব্যক্তি স্টাফ ও প্রশাসনিক উভয় জায়গায় থাকতে পারবেন না।'
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.phone IS NOT NULL AND NEW.phone <> '' AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE phone = NEW.phone AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.email IS NOT NULL AND NEW.email <> '' AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE lower(email) = lower(NEW.email) AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই ইমেইল (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.email
        USING ERRCODE = 'unique_violation';
    END IF;
    IF NEW.nid IS NOT NULL AND NEW.nid <> '' AND EXISTS (
      SELECT 1 FROM public.staff
      WHERE nid = NEW.nid AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই এনআইডি (%) দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।', NEW.nid
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_cross_staff_admin ON public.staff;
CREATE TRIGGER trg_no_cross_staff_admin
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();

DROP TRIGGER IF EXISTS trg_no_cross_admin_staff ON public.administrative_officers;
CREATE TRIGGER trg_no_cross_admin_staff
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();

-- 4) Profiles duplicate phone check (auth users phone via profiles)
CREATE OR REPLACE FUNCTION public.validate_profile_unique_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE phone = NEW.phone
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: এই ফোন নম্বর (%) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।', NEW.phone
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_unique_phone ON public.profiles;
CREATE TRIGGER trg_validate_profile_unique_phone
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_unique_phone();

-- Migration: 20260430063410_7f79de60-8c5c-413b-b740-4a3ff5122218.sql
-- 1. Add can_approve columns
ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_view boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_approve boolean NOT NULL DEFAULT false;

-- 2. Helper: get caller role (security definer to bypass RLS on user_roles)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 3. Central permission helper
-- Logic:
--   * If user is super_admin or admin → always true
--   * If user has ANY user_permissions row → ONLY those count (no role fallback)
--       - Look up specific menu_path; missing row = false
--   * Else → check role_permissions
CREATE OR REPLACE FUNCTION public.has_menu_permission(
  _user_id uuid,
  _menu_path text,
  _action text  -- 'view' | 'add' | 'edit' | 'delete' | 'approve'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_has_user_overrides boolean;
  v_perm record;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Admin / super_admin bypass
  IF public.has_role(_user_id, 'admin'::app_role)
     OR public.has_role(_user_id, 'super_admin'::app_role) THEN
    RETURN true;
  END IF;

  -- Check user_permissions overrides first
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions WHERE user_id = _user_id
  ) INTO v_has_user_overrides;

  IF v_has_user_overrides THEN
    SELECT can_view, can_add, can_edit, can_delete, can_approve
      INTO v_perm
    FROM public.user_permissions
    WHERE user_id = _user_id AND menu_path = _menu_path
    LIMIT 1;

    IF NOT FOUND THEN RETURN false; END IF;

    RETURN CASE _action
      WHEN 'view'    THEN v_perm.can_view
      WHEN 'add'     THEN v_perm.can_add
      WHEN 'edit'    THEN v_perm.can_edit
      WHEN 'delete'  THEN v_perm.can_delete
      WHEN 'approve' THEN v_perm.can_approve
      ELSE false
    END;
  END IF;

  -- Fallback to role_permissions
  v_role := public.get_user_role(_user_id);
  IF v_role IS NULL THEN RETURN false; END IF;

  SELECT can_view, can_add, can_edit, can_delete, can_approve
    INTO v_perm
  FROM public.role_permissions
  WHERE role = v_role AND menu_path = _menu_path
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  RETURN CASE _action
    WHEN 'view'    THEN v_perm.can_view
    WHEN 'add'     THEN v_perm.can_add
    WHEN 'edit'    THEN v_perm.can_edit
    WHEN 'delete'  THEN v_perm.can_delete
    WHEN 'approve' THEN v_perm.can_approve
    ELSE false
  END;
END;
$$;

-- =================================================================
-- 4. Tighten RLS on key sensitive tables
-- =================================================================

-- ---- STUDENTS ----
DROP POLICY IF EXISTS "Staff can manage students" ON public.students;
CREATE POLICY "Staff can view students with permission"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
  );

CREATE POLICY "Staff can add students with permission"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/students', 'add')
  );

CREATE POLICY "Staff can edit students with permission"
  ON public.students FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/students', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/students', 'edit'));

CREATE POLICY "Staff can delete students with permission"
  ON public.students FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/students', 'delete'));

-- ---- STAFF ----
DROP POLICY IF EXISTS "Staff can manage staff" ON public.staff;
CREATE POLICY "Staff can add staff with permission"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/staff', 'add')
  );

CREATE POLICY "Staff can edit staff with permission"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/staff', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/staff', 'edit'));

CREATE POLICY "Staff can delete staff with permission"
  ON public.staff FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/staff', 'delete'));

-- ---- FEE_PAYMENTS ----
DROP POLICY IF EXISTS "Staff can manage fee_payments" ON public.fee_payments;
CREATE POLICY "Staff can add fee_payments with permission"
  ON public.fee_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'add')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'add')
  );

CREATE POLICY "Staff can edit fee_payments with permission"
  ON public.fee_payments FOR UPDATE
  TO authenticated
  USING (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'edit')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'edit')
  )
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'edit')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'edit')
  );

CREATE POLICY "Staff can delete fee_payments with permission"
  ON public.fee_payments FOR DELETE
  TO authenticated
  USING (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'delete')
  );

-- ---- SALARY_RECORDS ----
DROP POLICY IF EXISTS "Staff can manage salary_records" ON public.salary_records;
CREATE POLICY "Staff can add salary_records with permission"
  ON public.salary_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/salary', 'add')
  );

CREATE POLICY "Staff can edit salary_records with permission"
  ON public.salary_records FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/salary', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/salary', 'edit'));

CREATE POLICY "Staff can delete salary_records with permission"
  ON public.salary_records FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/salary', 'delete'));

-- ---- NOTICES (allow public SELECT, restrict writes) ----
-- Drop overly broad write policies if they exist
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='public' AND tablename='notices'
       AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notices', p.policyname);
  END LOOP;
END$$;

CREATE POLICY "Staff can add notices with permission"
  ON public.notices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/notices', 'add'));

CREATE POLICY "Staff can edit notices with permission"
  ON public.notices FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/notices', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/notices', 'edit'));

CREATE POLICY "Staff can delete notices with permission"
  ON public.notices FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/notices', 'delete'));

-- Migration: 20260430064109_74bcc8fb-db4f-44a6-9c78-0a36ef6e4b48.sql
-- Atomic pre-validation + advisory locking for user creation race conditions
CREATE OR REPLACE FUNCTION public.acquire_user_create_lock(_email text, _phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_key bigint;
  v_phone_key bigint;
BEGIN
  -- Use hashtext to derive bigint keys for advisory locks (transaction-scoped)
  IF _email IS NOT NULL AND _email <> '' THEN
    v_email_key := hashtext('user_create_email:' || lower(_email));
    PERFORM pg_advisory_xact_lock(v_email_key);
  END IF;
  IF _phone IS NOT NULL AND _phone <> '' THEN
    v_phone_key := hashtext('user_create_phone:' || _phone);
    PERFORM pg_advisory_xact_lock(v_phone_key);
  END IF;
END;
$$;

-- Atomic duplicate check across profiles, staff, and administrative_officers
CREATE OR REPLACE FUNCTION public.check_user_duplicates(_email text, _phone text, _full_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lower_email text := lower(COALESCE(_email, ''));
  v_phone text := COALESCE(_phone, '');
  v_name text := COALESCE(_full_name, '');
BEGIN
  -- Email check across staff & administrative_officers (auth.users is checked in edge fn)
  IF v_lower_email <> '' THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_STAFF',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_ADMIN',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
  END IF;

  IF v_phone <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.staff WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_STAFF',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_ADMIN',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
  END IF;

  IF v_name <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(full_name) = lower(v_name)) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NAME',
        'message_bn', 'এই নামে একজন ইউজার ইতিমধ্যে আছেন।');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_user_create_lock(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_user_duplicates(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_user_create_lock(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_duplicates(text, text, text) TO service_role;

-- Migration: 20260430064659_e00c7e9e-f73d-4254-9745-c535573e5187.sql
-- Reusable enforcement helper: throws if caller lacks can_approve on given menu_path
CREATE OR REPLACE FUNCTION public.enforce_approve_permission(_menu_path text)
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid;
BEGIN
  BEGIN v_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_uid := NULL; END;

  -- Service role / no JWT context (server-side jobs, triggers from edge fns) → allow
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Admin / super_admin bypass (already handled by has_menu_permission, but explicit)
  IF public.has_role(v_uid, 'admin'::app_role)
     OR public.has_role(v_uid, 'super_admin'::app_role) THEN
    RETURN;
  END IF;

  IF NOT public.has_menu_permission(v_uid, _menu_path, 'approve') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: এই অনুমোদন কাজটি করার অনুমতি আপনার নেই (% requires approve permission)', _menu_path
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_approve_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_approve_permission(text) TO authenticated, service_role;

-- ── Per-table approve guard triggers ──

-- 1) notices: publishing requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_published, false) = true THEN
      PERFORM public.enforce_approve_permission('/admin/notices');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_published, false) = true AND COALESCE(OLD.is_published, false) = false THEN
      PERFORM public.enforce_approve_permission('/admin/notices');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_notice ON public.notices;
CREATE TRIGGER trg_guard_approve_notice
  BEFORE INSERT OR UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_notice();

-- 2) donors: verifying payment requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_donor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.payment_status, '') = 'verified'
       AND COALESCE(OLD.payment_status, '') <> 'verified' THEN
      PERFORM public.enforce_approve_permission('/admin/donors');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_donor ON public.donors;
CREATE TRIGGER trg_guard_approve_donor
  BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_donor();

-- 3) parent_accounts: approving requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_parent_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('approved','active')
       AND COALESCE(OLD.status, '') NOT IN ('approved','active') THEN
      PERFORM public.enforce_approve_permission('/admin/parent-approvals');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_parent_account ON public.parent_accounts;
CREATE TRIGGER trg_guard_approve_parent_account
  BEFORE UPDATE ON public.parent_accounts
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_parent_account();

-- 4) pending_actions: approving/rejecting requires approve on approvals page
CREATE OR REPLACE FUNCTION public.guard_approve_pending_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('approved','rejected')
       AND COALESCE(OLD.status, '') = 'pending' THEN
      PERFORM public.enforce_approve_permission('/admin/approvals');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_pending_action ON public.pending_actions;
CREATE TRIGGER trg_guard_approve_pending_action
  BEFORE UPDATE ON public.pending_actions
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_pending_action();

-- 5) salary_records: verify / approve / paid all require approve
CREATE OR REPLACE FUNCTION public.guard_approve_salary_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('verified','approved','paid')
       AND COALESCE(NEW.status, '') <> COALESCE(OLD.status, '') THEN
      PERFORM public.enforce_approve_permission('/admin/salary');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_salary_record ON public.salary_records;
CREATE TRIGGER trg_guard_approve_salary_record
  BEFORE UPDATE ON public.salary_records
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_salary_record();

-- 6) complaints: resolving/closing requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_complaint()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') IN ('resolved','closed')
       AND COALESCE(OLD.status, '') NOT IN ('resolved','closed') THEN
      PERFORM public.enforce_approve_permission('/admin/complaints');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_complaint ON public.complaints;
CREATE TRIGGER trg_guard_approve_complaint
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_complaint();

-- 7) staff: activating from pending requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_staff_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') = 'active'
       AND COALESCE(OLD.status, '') = 'pending' THEN
      PERFORM public.enforce_approve_permission('/admin/staff');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_staff_activation ON public.staff;
CREATE TRIGGER trg_guard_approve_staff_activation
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_staff_activation();

-- 8) administrative_officers: activating requires approve
CREATE OR REPLACE FUNCTION public.guard_approve_admin_officer_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.status, '') = 'active'
       AND COALESCE(OLD.status, '') = 'pending' THEN
      PERFORM public.enforce_approve_permission('/admin/administrative');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_approve_admin_officer ON public.administrative_officers;
CREATE TRIGGER trg_guard_approve_admin_officer
  BEFORE UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.guard_approve_admin_officer_activation();

-- Migration: 20260430065014_8c188b36-0bec-4bfa-b6b9-b035364b7364.sql
-- Timeout-aware advisory lock for user creation (transaction-scoped)
CREATE OR REPLACE FUNCTION public.acquire_user_create_lock(
  _email text,
  _phone text,
  _timeout_ms integer DEFAULT 2000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_key bigint;
  v_phone_key bigint;
  v_email_locked boolean := true;
  v_phone_locked boolean := true;
  v_started timestamptz := clock_timestamp();
  v_deadline timestamptz;
BEGIN
  v_deadline := v_started + make_interval(secs => GREATEST(_timeout_ms, 0) / 1000.0);

  IF _email IS NOT NULL AND _email <> '' THEN
    v_email_key := hashtext('user_create_email:' || lower(_email));
    v_email_locked := false;
    LOOP
      IF pg_try_advisory_xact_lock(v_email_key) THEN
        v_email_locked := true;
        EXIT;
      END IF;
      IF clock_timestamp() >= v_deadline THEN EXIT; END IF;
      PERFORM pg_sleep(0.05); -- 50ms
    END LOOP;
    IF NOT v_email_locked THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'LOCK_TIMEOUT', 'resource', 'email',
        'waited_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int
      );
    END IF;
  END IF;

  IF _phone IS NOT NULL AND _phone <> '' THEN
    v_phone_key := hashtext('user_create_phone:' || _phone);
    v_phone_locked := false;
    LOOP
      IF pg_try_advisory_xact_lock(v_phone_key) THEN
        v_phone_locked := true;
        EXIT;
      END IF;
      IF clock_timestamp() >= v_deadline THEN EXIT; END IF;
      PERFORM pg_sleep(0.05);
    END LOOP;
    IF NOT v_phone_locked THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'LOCK_TIMEOUT', 'resource', 'phone',
        'waited_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'waited_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int
  );
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_user_create_lock(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_user_create_lock(text, text, integer) TO service_role;

-- Migration: 20260430070100_8789c0ae-c9c4-4be1-9e11-7495fff9cf2f.sql
-- Rate limit configuration (admin-tunable)
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  max_requests INTEGER NOT NULL DEFAULT 20,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_config_admin_select" ON public.rate_limit_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "rate_limit_config_admin_modify" ON public.rate_limit_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_rate_limit_config_updated
  BEFORE UPDATE ON public.rate_limit_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Counters table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_key TEXT NOT NULL,         -- e.g. "user_create:admin:<uid>" or "otp_send:ip:1.2.3.4"
  scope TEXT NOT NULL,              -- 'admin' | 'ip' | 'email' | 'phone'
  action TEXT NOT NULL,             -- maps to rate_limit_config.action
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_bucket ON public.rate_limits(bucket_key, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can read counters; writes go through SECURITY DEFINER RPC
CREATE POLICY "rate_limits_admin_select" ON public.rate_limits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- RPC: check + increment in one shot
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key TEXT,
  _scope TEXT,
  _action TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.rate_limit_config%ROWTYPE;
  v_row public.rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_window_end TIMESTAMPTZ;
  v_retry_after INTEGER;
  v_bucket_key TEXT;
BEGIN
  IF _key IS NULL OR _key = '' OR _action IS NULL OR _action = '' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  v_bucket_key := _action || ':' || _scope || ':' || _key;

  SELECT * INTO v_cfg FROM public.rate_limit_config WHERE action = _action LIMIT 1;
  IF v_cfg.id IS NULL OR v_cfg.enabled = false THEN
    RETURN jsonb_build_object('ok', true, 'disabled', true);
  END IF;

  -- Lock row for atomic increment
  SELECT * INTO v_row FROM public.rate_limits
   WHERE bucket_key = v_bucket_key AND action = _action
   FOR UPDATE;

  IF v_row.id IS NULL THEN
    INSERT INTO public.rate_limits (bucket_key, scope, action, window_start, request_count, last_request_at)
    VALUES (v_bucket_key, _scope, _action, v_now, 1, v_now);
    RETURN jsonb_build_object(
      'ok', true, 'remaining', GREATEST(v_cfg.max_requests - 1, 0),
      'limit', v_cfg.max_requests, 'window_seconds', v_cfg.window_seconds
    );
  END IF;

  -- If window expired, reset
  IF v_row.window_start + make_interval(secs => v_cfg.window_seconds) <= v_now THEN
    UPDATE public.rate_limits
       SET window_start = v_now, request_count = 1, last_request_at = v_now
     WHERE id = v_row.id;
    RETURN jsonb_build_object(
      'ok', true, 'remaining', GREATEST(v_cfg.max_requests - 1, 0),
      'limit', v_cfg.max_requests, 'window_seconds', v_cfg.window_seconds
    );
  END IF;

  -- Check limit
  IF v_row.request_count >= v_cfg.max_requests THEN
    v_window_end := v_row.window_start + make_interval(secs => v_cfg.window_seconds);
    v_retry_after := GREATEST(CEIL(EXTRACT(EPOCH FROM (v_window_end - v_now)))::int, 1);
    UPDATE public.rate_limits
       SET blocked_count = blocked_count + 1, last_request_at = v_now
     WHERE id = v_row.id;
    RETURN jsonb_build_object(
      'ok', false, 'code', 'RATE_LIMITED',
      'retry_after', v_retry_after,
      'limit', v_cfg.max_requests, 'window_seconds', v_cfg.window_seconds,
      'message_bn', 'অনেক বেশি অনুরোধ পাঠানো হয়েছে। ' || v_retry_after::text || ' সেকেন্ড পর আবার চেষ্টা করুন।'
    );
  END IF;

  -- Increment
  UPDATE public.rate_limits
     SET request_count = request_count + 1, last_request_at = v_now
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'remaining', GREATEST(v_cfg.max_requests - v_row.request_count - 1, 0),
    'limit', v_cfg.max_requests,
    'window_seconds', v_cfg.window_seconds
  );
END;
$$;

-- Seed default configs
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, description) VALUES
  ('user_create_admin',    20,  60,  'Per-admin: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি মিনিটে'),
  ('user_create_ip',       30,  60,  'Per-IP: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি মিনিটে'),
  ('user_sensitive_admin', 30,  60,  'Per-admin: sensitive action (reset_password, set_role) প্রতি মিনিটে'),
  ('user_sensitive_ip',    50,  60,  'Per-IP: sensitive action প্রতি মিনিটে'),
  ('otp_send_email',       5,   60,  'Per-email: OTP send প্রতি মিনিটে'),
  ('otp_send_ip',          15,  60,  'Per-IP: OTP send প্রতি মিনিটে'),
  ('otp_verify_email',     10,  60,  'Per-email: OTP verify চেষ্টা প্রতি মিনিটে'),
  ('otp_verify_ip',        30,  60,  'Per-IP: OTP verify চেষ্টা প্রতি মিনিটে'),
  ('duplicate_check',      30,  60,  'Per-admin: debounced duplicate check প্রতি মিনিটে')
ON CONFLICT (action) DO NOTHING;

-- Migration: 20260430070934_b8e06a2a-a9d5-4d8b-9dec-90c621028079.sql
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, description) VALUES
  ('user_create_admin_hourly',    200, 3600, 'Per-admin: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি ঘণ্টায়'),
  ('user_create_ip_hourly',       300, 3600, 'Per-IP: ইউজার তৈরির সর্বোচ্চ চেষ্টা প্রতি ঘণ্টায়'),
  ('user_sensitive_admin_hourly', 400, 3600, 'Per-admin: sensitive action প্রতি ঘণ্টায়'),
  ('user_sensitive_ip_hourly',    600, 3600, 'Per-IP: sensitive action প্রতি ঘণ্টায়')
ON CONFLICT (action) DO NOTHING;

-- Migration: 20260430072842_529fa2d0-d34a-4adb-9fab-4021cfcfd5e5.sql
-- Add per-phone and per-user OTP rate limit config rows
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, enabled, description)
VALUES
  ('otp_send_phone',   5,  60,   true, 'OTP send requests per phone per minute'),
  ('otp_send_phone_hourly', 15, 3600, true, 'OTP send requests per phone per hour'),
  ('otp_send_user',    5,  60,   true, 'OTP send requests per user (auth uid) per minute'),
  ('otp_send_user_hourly',  20, 3600, true, 'OTP send requests per user per hour'),
  ('otp_verify_phone', 10, 60,   true, 'OTP verify attempts per phone per minute'),
  ('otp_verify_phone_hourly', 30, 3600, true, 'OTP verify attempts per phone per hour'),
  ('otp_verify_user',  10, 60,   true, 'OTP verify attempts per user per minute'),
  ('otp_verify_user_hourly',  30, 3600, true, 'OTP verify attempts per user per hour')
ON CONFLICT (action) DO NOTHING;

-- Migration: 20260430073957_e1bd6fe3-eaa3-477a-8550-ec3565d99ef4.sql
-- 1) Department validation: required + uniqueness on English name + trim
CREATE OR REPLACE FUNCTION public.validate_administrative_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Trim
  NEW.name := NULLIF(TRIM(NEW.name), '');
  NEW.name_bn := NULLIF(TRIM(NEW.name_bn), '');

  -- Required
  IF NEW.name IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের ইংরেজি নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;
  IF NEW.name_bn IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের বাংলা নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Case-insensitive uniqueness on English name (active rows)
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name) = lower(NEW.name)
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME: এই ইংরেজি নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Case-insensitive uniqueness on Bangla name (active rows) — backstop the partial unique index
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name_bn) = lower(NEW.name_bn)
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME_BN: এই বাংলা নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name_bn
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_admin_department ON public.administrative_departments;
CREATE TRIGGER trg_validate_admin_department
  BEFORE INSERT OR UPDATE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.validate_administrative_department();

-- Add case-insensitive unique index on English name (active rows) to mirror name_bn
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_dept_name_active
  ON public.administrative_departments (lower(name))
  WHERE deleted_at IS NULL;


-- 2) Officer field validation: required name_bn + format checks + department reference
CREATE OR REPLACE FUNCTION public.validate_admin_officer_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Trim string fields
  NEW.name_bn := NULLIF(TRIM(NEW.name_bn), '');
  NEW.name_en := NULLIF(TRIM(NEW.name_en), '');
  NEW.phone := NULLIF(TRIM(NEW.phone), '');
  NEW.email := NULLIF(TRIM(NEW.email), '');
  NEW.nid := NULLIF(TRIM(NEW.nid), '');
  NEW.department := NULLIF(TRIM(NEW.department), '');

  -- Required: name_bn
  IF NEW.name_bn IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: কর্মকর্তার বাংলা নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Phone format (BD: 11 digits starting with 01[3-9])
  IF NEW.phone IS NOT NULL THEN
    v_digits := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
    IF length(v_digits) <> 11 OR v_digits !~ '^01[3-9][0-9]{8}$' THEN
      RAISE EXCEPTION 'INVALID_PHONE: সঠিক মোবাইল নম্বর দিন (১১ অঙ্কের, 01 দিয়ে শুরু)।'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.phone := v_digits;
  END IF;

  -- Email format
  IF NEW.email IS NOT NULL THEN
    IF NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'INVALID_EMAIL: সঠিক ইমেইল ঠিকানা দিন।'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.email := lower(NEW.email);
  END IF;

  -- NID length: 10, 13, or 17 digits
  IF NEW.nid IS NOT NULL THEN
    v_digits := regexp_replace(NEW.nid, '[^0-9]', '', 'g');
    IF length(v_digits) NOT IN (10, 13, 17) THEN
      RAISE EXCEPTION 'INVALID_NID: এনআইডি ১০, ১৩ অথবা ১৭ অঙ্কের হতে হবে।'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.nid := v_digits;
  END IF;

  -- Department reference: must exist in administrative_departments (case-insensitive name OR name_bn)
  IF NEW.department IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.administrative_departments
      WHERE deleted_at IS NULL
        AND COALESCE(is_active, true) = true
        AND (lower(name) = lower(NEW.department) OR lower(name_bn) = lower(NEW.department))
    ) THEN
      RAISE EXCEPTION 'INVALID_DEPARTMENT: "%" নামে কোনো সক্রিয় বিভাগ পাওয়া যায়নি।', NEW.department
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_admin_officer_fields ON public.administrative_officers;
CREATE TRIGGER trg_validate_admin_officer_fields
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_fields();

-- Attach existing uniqueness validators to officers (they exist as functions but weren't attached)
DROP TRIGGER IF EXISTS trg_validate_admin_officer_unique ON public.administrative_officers;
CREATE TRIGGER trg_validate_admin_officer_unique
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_unique();

DROP TRIGGER IF EXISTS trg_validate_no_cross_staff_admin_officers ON public.administrative_officers;
CREATE TRIGGER trg_validate_no_cross_staff_admin_officers
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();

-- Also ensure the same cross-table trigger exists on staff (mirror)
DROP TRIGGER IF EXISTS trg_validate_no_cross_staff_admin_staff ON public.staff;
CREATE TRIGGER trg_validate_no_cross_staff_admin_staff
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.validate_no_cross_staff_admin();

-- Migration: 20260430181747_3bb53021-e35a-40cd-88ce-43f2b84c156a.sql
-- 1. Add department_id FK column
ALTER TABLE public.administrative_officers
  ADD COLUMN IF NOT EXISTS department_id uuid;

-- 2. Backfill department_id from existing text department (match name or name_bn, case-insensitive)
UPDATE public.administrative_officers ao
SET department_id = d.id
FROM public.administrative_departments d
WHERE ao.department_id IS NULL
  AND ao.department IS NOT NULL
  AND ao.department <> ''
  AND d.deleted_at IS NULL
  AND (lower(d.name) = lower(ao.department) OR lower(d.name_bn) = lower(ao.department));

-- 3. Hard FK constraint (RESTRICT delete to prevent orphaning)
ALTER TABLE public.administrative_officers
  DROP CONSTRAINT IF EXISTS fk_admin_officers_department;
ALTER TABLE public.administrative_officers
  ADD CONSTRAINT fk_admin_officers_department
  FOREIGN KEY (department_id)
  REFERENCES public.administrative_departments(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_admin_officers_department_id
  ON public.administrative_officers(department_id) WHERE deleted_at IS NULL;

-- 4. Trigger: enforce department is active & not soft-deleted; also keep department text in sync from FK
CREATE OR REPLACE FUNCTION public.validate_admin_officer_department_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dept public.administrative_departments%ROWTYPE;
BEGIN
  -- Skip on soft-delete of the officer itself
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If department_id provided, validate it
  IF NEW.department_id IS NOT NULL THEN
    SELECT * INTO v_dept FROM public.administrative_departments WHERE id = NEW.department_id;
    IF v_dept.id IS NULL THEN
      RAISE EXCEPTION 'INVALID_DEPARTMENT: নির্বাচিত বিভাগটি পাওয়া যায়নি।'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF v_dept.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'DEPARTMENT_DELETED: নির্বাচিত বিভাগটি মুছে ফেলা হয়েছে। সক্রিয় বিভাগ নির্বাচন করুন।'
        USING ERRCODE = 'check_violation';
    END IF;
    IF COALESCE(v_dept.is_active, false) = false THEN
      RAISE EXCEPTION 'DEPARTMENT_INACTIVE: নির্বাচিত বিভাগটি নিষ্ক্রিয়। সক্রিয় বিভাগ নির্বাচন করুন।'
        USING ERRCODE = 'check_violation';
    END IF;
    -- Sync text department from FK (Bangla name preferred)
    NEW.department := COALESCE(v_dept.name_bn, v_dept.name);
  ELSIF NEW.department IS NOT NULL AND NEW.department <> '' THEN
    -- If only text provided, resolve to active department
    SELECT * INTO v_dept FROM public.administrative_departments
     WHERE deleted_at IS NULL
       AND (lower(name) = lower(NEW.department) OR lower(name_bn) = lower(NEW.department))
     LIMIT 1;
    IF v_dept.id IS NULL THEN
      RAISE EXCEPTION 'INVALID_DEPARTMENT: "%" নামের কোনো সক্রিয় বিভাগ পাওয়া যায়নি।', NEW.department
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF COALESCE(v_dept.is_active, false) = false THEN
      RAISE EXCEPTION 'DEPARTMENT_INACTIVE: "%" বিভাগটি নিষ্ক্রিয়।', NEW.department
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.department_id := v_dept.id;
    NEW.department := COALESCE(v_dept.name_bn, v_dept.name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_admin_officer_department_ref ON public.administrative_officers;
CREATE TRIGGER trg_validate_admin_officer_department_ref
  BEFORE INSERT OR UPDATE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_officer_department_ref();

-- 5. Prevent deactivating/soft-deleting a department that still has active officers
CREATE OR REPLACE FUNCTION public.guard_department_in_use()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Soft-delete attempt
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.administrative_officers
     WHERE department_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DEPARTMENT_IN_USE: এই বিভাগে % জন সক্রিয় কর্মকর্তা আছেন। প্রথমে তাঁদের অন্য বিভাগে সরান।', v_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Deactivation attempt
  IF COALESCE(OLD.is_active, true) = true AND COALESCE(NEW.is_active, true) = false THEN
    SELECT COUNT(*) INTO v_count FROM public.administrative_officers
     WHERE department_id = OLD.id AND deleted_at IS NULL AND status = 'active';
    IF v_count > 0 THEN
      RAISE EXCEPTION 'DEPARTMENT_IN_USE: এই বিভাগে % জন সক্রিয় কর্মকর্তা আছেন। নিষ্ক্রিয় করার আগে তাঁদের সরান।', v_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_department_in_use ON public.administrative_departments;
CREATE TRIGGER trg_guard_department_in_use
  BEFORE UPDATE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.guard_department_in_use();

-- Migration: 20260430181932_0c8947e1-5ff5-489f-9640-7cff443771c6.sql
CREATE OR REPLACE FUNCTION public.audit_admin_entity_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_record_id TEXT;
  v_user_id UUID;
  v_email TEXT;
  v_changed_keys TEXT[] := ARRAY[]::TEXT[];
  v_diff JSONB := '{}'::jsonb;
  v_label TEXT;
  v_desc TEXT;
  k TEXT;
BEGIN
  BEGIN v_user_id := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
    v_action := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'SOFT_DELETE';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      v_action := 'RESTORE';
    ELSE
      v_action := 'UPDATE';
    END IF;

    -- Compute changed-field diff (old/new pairs) ignoring noise columns
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k IN ('updated_at','created_at') THEN CONTINUE; END IF;
      IF v_old->k IS DISTINCT FROM v_new->k THEN
        v_changed_keys := array_append(v_changed_keys, k);
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;

    -- If only timestamps changed, skip logging
    IF array_length(v_changed_keys, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := OLD.id::TEXT;
    v_action := 'DELETE';
  END IF;

  -- Friendly label
  IF TG_TABLE_NAME = 'administrative_departments' THEN
    v_label := COALESCE(
      CASE WHEN TG_OP='DELETE' THEN OLD.name_bn ELSE NEW.name_bn END,
      CASE WHEN TG_OP='DELETE' THEN OLD.name ELSE NEW.name END,
      v_record_id
    );
    v_desc := 'বিভাগ "' || v_label || '" — ' || v_action;
  ELSIF TG_TABLE_NAME = 'administrative_officers' THEN
    v_label := COALESCE(
      CASE WHEN TG_OP='DELETE' THEN OLD.name_bn ELSE NEW.name_bn END,
      CASE WHEN TG_OP='DELETE' THEN OLD.name_en ELSE NEW.name_en END,
      v_record_id
    );
    v_desc := 'প্রশাসনিক কর্মকর্তা "' || v_label || '" — ' || v_action;
  ELSE
    v_desc := TG_TABLE_NAME || ' — ' || v_action;
  END IF;

  IF TG_OP = 'UPDATE' AND array_length(v_changed_keys, 1) > 0 THEN
    v_desc := v_desc || ' (পরিবর্তিত: ' || array_to_string(v_changed_keys, ', ') || ')';
  END IF;

  INSERT INTO public.system_logs (
    user_id, action, table_name, record_id, old_data, new_data, description
  ) VALUES (
    v_user_id, v_action, TG_TABLE_NAME, v_record_id,
    v_old,
    CASE WHEN TG_OP = 'UPDATE' THEN v_diff ELSE v_new END,
    COALESCE(v_email, '') || CASE WHEN v_email IS NOT NULL THEN ' • ' ELSE '' END || v_desc
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_administrative_departments ON public.administrative_departments;
CREATE TRIGGER trg_audit_administrative_departments
  AFTER INSERT OR UPDATE OR DELETE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_entity_changes();

DROP TRIGGER IF EXISTS trg_audit_administrative_officers ON public.administrative_officers;
CREATE TRIGGER trg_audit_administrative_officers
  AFTER INSERT OR UPDATE OR DELETE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_entity_changes();

-- Migration: 20260430182113_5d16c2ef-ead7-45a8-a7f5-539657316f53.sql
-- 1. Add code column
ALTER TABLE public.administrative_departments
  ADD COLUMN IF NOT EXISTS code text;

-- 2. Backfill: generate code from English name (first 4 letters uppercased), ensure uniqueness with -N suffix
DO $$
DECLARE
  r RECORD;
  v_base TEXT;
  v_try TEXT;
  v_n INT;
BEGIN
  FOR r IN SELECT id, name FROM public.administrative_departments WHERE (code IS NULL OR code = '') LOOP
    v_base := upper(regexp_replace(COALESCE(r.name, 'DEPT'), '[^A-Za-z0-9]', '', 'g'));
    IF length(v_base) < 2 THEN v_base := v_base || 'DPT'; END IF;
    v_base := substr(v_base, 1, 6);
    v_try := v_base;
    v_n := 1;
    WHILE EXISTS (SELECT 1 FROM public.administrative_departments WHERE upper(code) = upper(v_try) AND id <> r.id) LOOP
      v_n := v_n + 1;
      v_try := substr(v_base, 1, 5) || v_n::text;
    END LOOP;
    UPDATE public.administrative_departments SET code = v_try WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Unique index on code (case-insensitive, active rows only)
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_dept_code_active
  ON public.administrative_departments (upper(code))
  WHERE deleted_at IS NULL;

-- 4. Update validation trigger to enforce code rules
CREATE OR REPLACE FUNCTION public.validate_administrative_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Trim
  NEW.name := NULLIF(TRIM(NEW.name), '');
  NEW.name_bn := NULLIF(TRIM(NEW.name_bn), '');
  NEW.code := upper(NULLIF(TRIM(NEW.code), ''));

  -- Required
  IF NEW.name IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের ইংরেজি নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;
  IF NEW.name_bn IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের বাংলা নাম আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;
  IF NEW.code IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_FIELD: বিভাগের কোড আবশ্যক।'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Code format: 2-10 chars, A-Z 0-9 only
  IF NEW.code !~ '^[A-Z0-9]{2,10}$' THEN
    RAISE EXCEPTION 'INVALID_DEPT_CODE: কোড অবশ্যই ২-১০ অক্ষরের ইংরেজি অক্ষর/সংখ্যা হতে হবে (যেমন: ACC, IT01)।'
      USING ERRCODE = 'check_violation';
  END IF;

  -- English name uniqueness
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name) = lower(NEW.name) AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME: এই ইংরেজি নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Bangla name uniqueness
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE lower(name_bn) = lower(NEW.name_bn) AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_NAME_BN: এই বাংলা নাম (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.name_bn
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Code uniqueness
  IF EXISTS (
    SELECT 1 FROM public.administrative_departments
    WHERE upper(code) = upper(NEW.code) AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DEPT_CODE: এই কোড (%) দিয়ে ইতিমধ্যে একটি বিভাগ আছে।', NEW.code
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Migration: 20260430184346_9e577277-2da2-429f-8ba8-c2a68095d869.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id TEXT PRIMARY KEY,
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encryption_keys_super_admin_only"
ON public.encryption_keys FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.encryption_keys (id, key_value)
VALUES ('master_v1', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_key TEXT;
BEGIN
  SELECT key_value INTO v_key FROM public.encryption_keys WHERE id = 'master_v1';
  IF v_key IS NULL THEN RAISE EXCEPTION 'ENCRYPTION_KEY_MISSING'; END IF;
  RETURN v_key;
END; $$;

-- Use extensions schema for pgcrypto functions to avoid resolution issues
CREATE OR REPLACE FUNCTION public.encrypt_value(p_plain TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_key TEXT;
BEGIN
  IF p_plain IS NULL OR p_plain = '' THEN RETURN NULL; END IF;
  v_key := public.get_encryption_key();
  RETURN encode(pgp_sym_encrypt(p_plain::text, v_key::text)::bytea, 'base64');
END; $$;

CREATE OR REPLACE FUNCTION public.decrypt_value(p_cipher TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_key TEXT;
BEGIN
  IF p_cipher IS NULL OR p_cipher = '' THEN RETURN NULL; END IF;
  v_key := public.get_encryption_key();
  BEGIN
    RETURN pgp_sym_decrypt(decode(p_cipher, 'base64')::bytea, v_key::text);
  EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
END; $$;

CREATE OR REPLACE FUNCTION public.encrypt_numeric(p_value NUMERIC)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.encrypt_value(p_value::TEXT);
$$;

CREATE OR REPLACE FUNCTION public.decrypt_numeric(p_cipher TEXT)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULLIF(public.decrypt_value(p_cipher), '')::NUMERIC;
$$;

-- Shadow columns
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_encrypted TEXT;
ALTER TABLE public.administrative_officers ADD COLUMN IF NOT EXISTS salary_encrypted TEXT;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS net_salary_encrypted TEXT;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS base_salary_encrypted TEXT;

CREATE OR REPLACE FUNCTION public.sync_encrypted_salary()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'staff' THEN
    NEW.salary_encrypted := public.encrypt_numeric(NEW.salary);
  ELSIF TG_TABLE_NAME = 'administrative_officers' THEN
    NEW.salary_encrypted := public.encrypt_numeric(NEW.salary);
  ELSIF TG_TABLE_NAME = 'salary_records' THEN
    NEW.net_salary_encrypted := public.encrypt_numeric(NEW.net_salary);
    NEW.base_salary_encrypted := public.encrypt_numeric(NEW.base_salary);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_enc_staff_salary ON public.staff;
CREATE TRIGGER trg_sync_enc_staff_salary BEFORE INSERT OR UPDATE OF salary ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.sync_encrypted_salary();

DROP TRIGGER IF EXISTS trg_sync_enc_admin_salary ON public.administrative_officers;
CREATE TRIGGER trg_sync_enc_admin_salary BEFORE INSERT OR UPDATE OF salary ON public.administrative_officers
FOR EACH ROW EXECUTE FUNCTION public.sync_encrypted_salary();

DROP TRIGGER IF EXISTS trg_sync_enc_salary_records ON public.salary_records;
CREATE TRIGGER trg_sync_enc_salary_records BEFORE INSERT OR UPDATE OF net_salary, base_salary ON public.salary_records
FOR EACH ROW EXECUTE FUNCTION public.sync_encrypted_salary();

UPDATE public.staff SET salary_encrypted = public.encrypt_numeric(salary)
WHERE salary IS NOT NULL AND salary_encrypted IS NULL;

UPDATE public.administrative_officers SET salary_encrypted = public.encrypt_numeric(salary)
WHERE salary IS NOT NULL AND salary_encrypted IS NULL;

UPDATE public.salary_records SET 
  net_salary_encrypted = public.encrypt_numeric(net_salary),
  base_salary_encrypted = public.encrypt_numeric(base_salary)
WHERE (net_salary IS NOT NULL OR base_salary IS NOT NULL) AND net_salary_encrypted IS NULL;

-- ============ AUDIT ============
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE OR REPLACE FUNCTION public.get_request_ip()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v TEXT;
BEGIN
  BEGIN
    v := current_setting('request.headers', true);
    IF v IS NOT NULL THEN
      v := (v::jsonb ->> 'x-forwarded-for');
      IF v IS NOT NULL THEN RETURN split_part(v, ',', 1); END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.get_request_ua()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v TEXT;
BEGIN
  BEGIN
    v := current_setting('request.headers', true);
    IF v IS NOT NULL THEN RETURN (v::jsonb ->> 'user-agent'); END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_sensitive_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID; v_email TEXT;
  v_old JSONB; v_new JSONB;
  v_diff JSONB := '{}'::jsonb;
  v_changed TEXT[] := ARRAY[]::TEXT[];
  v_record_id TEXT; v_action TEXT; k TEXT;
BEGIN
  BEGIN v_user := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user := NULL; END;
  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
    IF (v_old ? 'deleted_at') AND (v_new ? 'deleted_at') THEN
      IF v_old->>'deleted_at' IS NULL AND v_new->>'deleted_at' IS NOT NULL THEN
        v_action := 'SOFT_DELETE';
      ELSIF v_old->>'deleted_at' IS NOT NULL AND v_new->>'deleted_at' IS NULL THEN
        v_action := 'RESTORE';
      ELSE v_action := 'UPDATE'; END IF;
    ELSE v_action := 'UPDATE'; END IF;

    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k IN ('updated_at','created_at') THEN CONTINUE; END IF;
      IF k LIKE '%_encrypted' THEN CONTINUE; END IF;
      IF v_old->k IS DISTINCT FROM v_new->k THEN
        v_changed := array_append(v_changed, k);
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;
    IF array_length(v_changed, 1) IS NULL THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_record_id := OLD.id::TEXT; v_action := 'DELETE';
  END IF;

  INSERT INTO public.system_logs (
    user_id, action, table_name, record_id, old_data, new_data,
    ip_address, user_agent, description
  ) VALUES (
    v_user, v_action, TG_TABLE_NAME, v_record_id,
    v_old,
    CASE WHEN TG_OP='UPDATE' THEN v_diff ELSE NULL END,
    public.get_request_ip(), public.get_request_ua(),
    COALESCE(v_email,'') || ' • ' || TG_TABLE_NAME || ' ' || v_action ||
      CASE WHEN array_length(v_changed,1) > 0 
           THEN ' (changed: ' || array_to_string(v_changed, ', ') || ')'
           ELSE '' END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DO $$
DECLARE
  t TEXT;
  sensitive_tables TEXT[] := ARRAY[
    'students','staff','administrative_officers','salary_records',
    'fee_payments','user_roles','user_permissions','role_permissions',
    'profiles','results','exam_results','admissions',
    'parent_accounts','custom_roles','encryption_keys'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_sensitive_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_sensitive_%I AFTER UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ============ BACKUP ============
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'in_progress',
  storage_path TEXT,
  file_size_bytes BIGINT,
  table_count INTEGER,
  row_count BIGINT,
  error_message TEXT,
  triggered_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_history_admin_read"
ON public.backup_history FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "backup_history_super_admin_write"
ON public.backup_history FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "backup_history_super_admin_update"
ON public.backup_history FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('db-backups', 'db-backups', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "db_backups_super_admin_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'db-backups' AND public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "db_backups_super_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'db-backups' AND public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "db_backups_super_admin_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'db-backups' AND public.has_role(auth.uid(), 'super_admin'::app_role));


-- Migration: 20260430185046_b5172b98-afc1-47c6-a453-dade709d226e.sql

CREATE OR REPLACE FUNCTION public.get_data_sensitivity_map()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  data_type TEXT,
  sensitivity TEXT,
  protection TEXT,
  notes TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admin / super_admin can see this map
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) 
          OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    CASE
      -- AES-256 encrypted shadow columns
      WHEN c.column_name LIKE '%_encrypted' THEN 'encrypted_aes256'
      -- The plaintext salary kept for sort/search but mirrored to encrypted column
      WHEN (c.table_name = 'staff' AND c.column_name = 'salary')
        OR (c.table_name = 'administrative_officers' AND c.column_name = 'salary')
        OR (c.table_name = 'salary_records' AND c.column_name IN ('net_salary','base_salary'))
        THEN 'encrypted_mirror'
      -- Identity / contact data — RLS + disk-level only (per policy)
      WHEN c.column_name IN (
        'nid','birth_registration','birth_registration_no','birth_certificate',
        'phone','mobile','mobile_number','phone_number','contact_number',
        'father_nid','mother_nid','guardian_nid','spouse_nid',
        'father_phone','mother_phone','guardian_phone',
        'address','present_address','permanent_address','postal_address',
        'email','personal_email','father_email','mother_email','guardian_email',
        'date_of_birth','dob','blood_group','religion'
      ) THEN 'sensitive_rls_only'
      -- Financial fields (non-encrypted) 
      WHEN c.column_name IN (
        'amount','paid_amount','due_amount','total_amount','discount','fine',
        'allowance','bonus','deduction','tax','provident_fund'
      ) THEN 'sensitive_rls_only'
      ELSE 'non_sensitive'
    END AS sensitivity,
    CASE
      WHEN c.column_name LIKE '%_encrypted' 
        THEN 'AES-256 (pgcrypto pgp_sym_encrypt)'
      WHEN (c.table_name = 'staff' AND c.column_name = 'salary')
        OR (c.table_name = 'administrative_officers' AND c.column_name = 'salary')
        OR (c.table_name = 'salary_records' AND c.column_name IN ('net_salary','base_salary'))
        THEN 'Mirrored to *_encrypted (AES-256)'
      WHEN c.column_name IN (
        'nid','birth_registration','birth_registration_no','phone','mobile','mobile_number',
        'father_nid','mother_nid','guardian_nid','address','present_address','permanent_address',
        'email','date_of_birth','blood_group','religion','amount','paid_amount','due_amount',
        'total_amount','discount','fine','allowance','bonus','deduction'
      ) THEN 'RLS + Disk-level AES-256'
      ELSE 'RLS only'
    END AS protection,
    CASE
      WHEN c.column_name LIKE '%_encrypted' 
        THEN 'Ciphertext column. Decrypt via decrypt_value()/decrypt_numeric().'
      WHEN (c.table_name = 'staff' AND c.column_name = 'salary')
        OR (c.table_name = 'administrative_officers' AND c.column_name = 'salary')
        OR (c.table_name = 'salary_records' AND c.column_name IN ('net_salary','base_salary'))
        THEN 'Plaintext kept for sort/filter; ciphertext is source of truth.'
      WHEN c.column_name IN ('nid','father_nid','mother_nid','guardian_nid','spouse_nid','birth_registration','birth_registration_no')
        THEN 'NID/BRN — needed for cross-referencing; not column-encrypted by policy.'
      WHEN c.column_name IN ('phone','mobile','mobile_number','father_phone','mother_phone','guardian_phone')
        THEN 'Phone — used for OTP/SMS lookup; RLS-protected.'
      ELSE NULL
    END AS notes
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name NOT IN (
      'system_logs','rate_limit_log','encryption_keys','backup_history',
      'otp_codes','committee_audit_log'
    )
  ORDER BY 
    CASE 
      WHEN c.column_name LIKE '%_encrypted' THEN 1
      WHEN c.column_name IN ('salary','net_salary','base_salary') THEN 2
      WHEN c.column_name IN ('nid','birth_registration','phone','mobile','email','address','present_address','permanent_address') THEN 3
      ELSE 4
    END,
    c.table_name, c.column_name;
END;
$$;

-- Add a row representing the auth.users password hash so admins see it
CREATE OR REPLACE FUNCTION public.get_password_protection_info()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'table', 'auth.users',
    'column', 'encrypted_password',
    'algorithm', 'scrypt (BCrypt-equivalent, managed by Supabase Auth)',
    'user_count', (SELECT COUNT(*) FROM auth.users),
    'never_logged', true
  );
$$;


-- Migration: 20260430195841_248d39b5-c4c4-4917-8111-c648a31aeec9.sql
CREATE OR REPLACE FUNCTION public.auto_generate_staff_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_prefix TEXT;
BEGIN
  IF NEW.joining_date IS NOT NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE);
  ELSE
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
  END IF;

  SELECT id_prefix INTO v_prefix
  FROM public.staff_categories
  WHERE key = NEW.staff_category
    AND is_active = true
  LIMIT 1;

  IF NEW.staff_id IS NULL
     OR NEW.staff_id = ''
     OR (TG_OP = 'UPDATE' AND NEW.staff_category IS DISTINCT FROM OLD.staff_category)
     OR (v_prefix IS NOT NULL AND NEW.staff_id NOT LIKE v_prefix || '-%') THEN
    NEW.staff_id := public.generate_staff_id(NEW.staff_category, v_year);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_staff_id ON public.staff;
CREATE TRIGGER trg_auto_staff_id
BEFORE INSERT OR UPDATE OF staff_id, staff_category, joining_date ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_staff_id();

-- Migration: 20260430201825_65d75f9c-a828-4e7e-aa7a-decfb5e4dd81.sql
-- Trigger: prevent duplicate NID in staff (case-insensitive, ignoring soft-deleted)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_staff_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check staff table
  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(nid) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Cross-check: administrative_officers
  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_staff_nid ON public.staff;
CREATE TRIGGER trg_prevent_duplicate_staff_nid
BEFORE INSERT OR UPDATE OF nid ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_staff_nid();

-- Same protection on administrative_officers (cross-check both ways)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_admin_officer_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_admin_officer_nid ON public.administrative_officers;
CREATE TRIGGER trg_prevent_duplicate_admin_officer_nid
BEFORE INSERT OR UPDATE OF nid ON public.administrative_officers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_admin_officer_nid();

-- Extend check_user_duplicates() to also check NID
CREATE OR REPLACE FUNCTION public.check_user_duplicates(
  _email text,
  _phone text,
  _full_name text,
  _nid text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lower_email text := lower(COALESCE(_email, ''));
  v_phone text := COALESCE(_phone, '');
  v_name text := COALESCE(_full_name, '');
  v_nid text := NULLIF(TRIM(COALESCE(_nid, '')), '');
BEGIN
  IF v_lower_email <> '' THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_STAFF',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_ADMIN',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
  END IF;

  IF v_phone <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.staff WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_STAFF',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_ADMIN',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
  END IF;

  IF v_nid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_STAFF',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_ADMIN',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
  END IF;

  IF v_name <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(full_name) = lower(v_name)) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NAME',
        'message_bn', 'এই নামে একজন ইউজার ইতিমধ্যে আছেন।');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- Migration: 20260430202201_901d32d9-8b3f-47d4-bcf1-4a6fc649b2e5.sql
-- 1. Add nid column to committee_members
ALTER TABLE public.committee_members
  ADD COLUMN IF NOT EXISTS nid text;

-- 2. Trigger function: prevent duplicate NID across committee_members + staff + administrative_officers
CREATE OR REPLACE FUNCTION public.prevent_duplicate_committee_member_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Within committee_members
  IF EXISTS (
    SELECT 1 FROM public.committee_members
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_NID: এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Cross-check: staff
  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Cross-check: administrative_officers
  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'CROSS_TABLE_DUPLICATE: এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_committee_member_nid ON public.committee_members;
CREATE TRIGGER trg_prevent_duplicate_committee_member_nid
BEFORE INSERT OR UPDATE OF nid, deleted_at ON public.committee_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_committee_member_nid();

-- 3. Update staff + administrative_officers triggers to also cross-check committee_members.nid
CREATE OR REPLACE FUNCTION public.prevent_duplicate_staff_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(nid) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.committee_members
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_admin_officer_nid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid text;
BEGIN
  v_nid := NULLIF(TRIM(COALESCE(NEW.nid, '')), '');
  IF v_nid IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.administrative_officers
    WHERE TRIM(COALESCE(nid, '')) = v_nid
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.committee_members
    WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Migration: 20260430211553_54c71cc0-3beb-481c-beec-47680334b105.sql

DROP POLICY IF EXISTS "Anyone can view students" ON public.students;

DROP VIEW IF EXISTS public.students_public;
CREATE VIEW public.students_public
WITH (security_invoker = on)
AS
SELECT
  id,
  name_bn,
  name_en,
  student_id,
  roll_number,
  registration_no,
  status,
  division_id,
  class_id,
  session_id,
  photo_url
FROM public.students
WHERE COALESCE(status, 'active') = 'active'
  AND deleted_at IS NULL;

GRANT SELECT ON public.students_public TO anon, authenticated;

CREATE POLICY "Public can view minimal student info"
ON public.students
FOR SELECT
TO anon
USING (
  COALESCE(status, 'active') = 'active'
  AND deleted_at IS NULL
);

REVOKE SELECT ON public.students FROM anon;
GRANT SELECT (
  id, name_bn, name_en, student_id, roll_number, registration_no,
  status, division_id, class_id, session_id, photo_url
) ON public.students TO anon;

ALTER VIEW public.administrative_officers_public SET (security_invoker = on);
ALTER VIEW public.staff_directory SET (security_invoker = on);
ALTER VIEW public.committee_staff_ids SET (security_invoker = on);

ALTER FUNCTION public.update_meeting_provider_settings_updated_at() SET search_path = public;


-- Migration: 20260430212022_d65214dd-2215-46de-82b0-72e961670ea7.sql

-- ====================================================================
-- 1) Realtime publication: remove sensitive tables
-- ====================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='salary_records') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.salary_records;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='app_settings') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.app_settings;
  END IF;
END $$;

-- ====================================================================
-- 2) RLS cleanup: budgets / scholarships / scholarship_awards
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage budgets" ON public.budgets;
CREATE POLICY "Permission-gated budgets manage"
  ON public.budgets FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/budgets', 'view')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/budgets', 'add')
    OR has_menu_permission(auth.uid(), '/admin/budgets', 'edit')
  );

DROP POLICY IF EXISTS "Authenticated users can manage scholarships" ON public.scholarships;
CREATE POLICY "Permission-gated scholarships manage"
  ON public.scholarships FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'view')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'add')
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'edit')
  );

DROP POLICY IF EXISTS "Authenticated users can manage scholarship awards" ON public.scholarship_awards;
CREATE POLICY "Permission-gated scholarship_awards manage"
  ON public.scholarship_awards FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'view')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'add')
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'edit')
  );

-- ====================================================================
-- 3) meetings / meeting_participants — admin & permission-only
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Authenticated users can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Authenticated users can delete meetings" ON public.meetings;
CREATE POLICY "Permission-gated meetings insert"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'add')
  );
CREATE POLICY "Permission-gated meetings update"
  ON public.meetings FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  );
CREATE POLICY "Permission-gated meetings delete"
  ON public.meetings FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'delete')
  );

DROP POLICY IF EXISTS "Authenticated users can insert meeting participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Authenticated users can update meeting participants" ON public.meeting_participants;
CREATE POLICY "Permission-gated meeting_participants insert"
  ON public.meeting_participants FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'add')
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  );
CREATE POLICY "Permission-gated meeting_participants update"
  ON public.meeting_participants FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  );

-- ====================================================================
-- 4) committee_attachments — committee permission only
-- ====================================================================
DROP POLICY IF EXISTS "committee_attachments_auth_insert_row" ON public.committee_attachments;
DROP POLICY IF EXISTS "committee_attachments_auth_update_row" ON public.committee_attachments;
CREATE POLICY "committee_attachments permission insert"
  ON public.committee_attachments FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees', 'add')
    OR has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  );
CREATE POLICY "committee_attachments permission update"
  ON public.committee_attachments FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  );

-- ====================================================================
-- 5) Storage bucket listing — block public listing on sensitive buckets
--    Direct public URLs (/object/public/...) keep working since bucket
--    is still marked public; only `list()` calls are blocked.
-- ====================================================================
DROP POLICY IF EXISTS "Public can read receipts" ON storage.objects;
CREATE POLICY "Auth can read receipts metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_menu_permission(auth.uid(), '/admin/expenses', 'view')
      OR has_menu_permission(auth.uid(), '/admin/fees', 'view')
    )
  );

DROP POLICY IF EXISTS "Public read staff letters" ON storage.objects;
CREATE POLICY "Auth can read staff-letters metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'staff-letters'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_menu_permission(auth.uid(), '/admin/staff', 'view')
      OR has_menu_permission(auth.uid(), '/admin/salary', 'view')
    )
  );

DROP POLICY IF EXISTS "committee_attachments_public_read" ON storage.objects;
CREATE POLICY "Auth can read committee-attachments metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'committee-attachments'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_menu_permission(auth.uid(), '/admin/committees', 'view')
    )
  );

DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
CREATE POLICY "Public can read photos directly"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos');
-- Anonymous direct URL access still works because bucket is public; listing requires auth.

-- ====================================================================
-- 6) Revoke EXECUTE from anon/authenticated on trigger-only functions.
--    These are SECURITY DEFINER but should ONLY run inside trigger
--    context, never be called directly via PostgREST.
-- ====================================================================
DO $$
DECLARE
  v_fn text;
  v_trigger_only_funcs text[] := ARRAY[
    'assign_donation_receipt_number',
    'audit_admin_entity_changes',
    'audit_log_trigger',
    'audit_sensitive_change',
    'auto_create_salary_on_attendance',
    'auto_generate_officer_id',
    'auto_generate_staff_id',
    'guard_approve_admin_officer_activation',
    'guard_approve_complaint',
    'guard_approve_donor',
    'guard_approve_notice',
    'guard_approve_parent_account',
    'guard_approve_pending_action',
    'guard_approve_salary_record',
    'guard_approve_staff_activation',
    'guard_committee_overlap',
    'guard_department_in_use',
    'handle_new_user',
    'log_committee_member_change',
    'notify_guardian_on_absence',
    'notify_on_notice_publish',
    'notify_on_parent_signup',
    'notify_on_student_insert',
    'prevent_duplicate_admin_officer_nid',
    'queue_whatsapp_absence',
    'set_parent_accounts_updated_at',
    'snapshot_email_template_version',
    'update_meeting_provider_settings_updated_at',
    'update_updated_at_column',
    'validate_admin_officer_department_ref',
    'validate_admin_officer_unique',
    'validate_administrative_department',
    'validate_no_cross_staff_admin',
    'validate_profile_unique_phone',
    'validate_staff_unique'
  ];
BEGIN
  FOREACH v_fn IN ARRAY v_trigger_only_funcs LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated'
    );
    EXIT; -- only need to run once
  END LOOP;
END $$;

-- Re-grant EXECUTE on user-callable helpers (RLS helpers + RPCs used by the app)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_menu_permission(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_duplicates(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_duplicates(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_password_strength(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_user_create_lock(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_approve_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_receipt_serial() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_administrative_officer_id(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_staff_id(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_complaint_ticket() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_password_protection_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_data_sensitivity_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_ip() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_ua() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_value(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_value(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_numeric(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_numeric(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_encryption_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_inventory_stock(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_committee_change(uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_administrative_officer_by_email() TO authenticated;


-- Migration: 20260501065206_31302cae-414f-41fb-bc10-5b0ae701a619.sql

-- ============================================================
-- 1) ADMISSION_TEST_ATTEMPTS — protect applicant PII
-- ============================================================
DROP POLICY IF EXISTS "Public can view attempts for merit list of published tests" ON public.admission_test_attempts;

DROP VIEW IF EXISTS public.admission_test_attempts_public CASCADE;
CREATE VIEW public.admission_test_attempts_public
WITH (security_invoker = on) AS
SELECT
  a.id, a.test_id, a.applicant_name, a.score, a.percentage,
  a.passed, a.rank, a.correct_count, a.total_questions, a.status, a.submitted_at
FROM public.admission_test_attempts a
WHERE a.status = 'submitted'
  AND EXISTS (
    SELECT 1 FROM public.admission_tests t
    WHERE t.id = a.test_id AND t.is_published = true AND t.deleted_at IS NULL
  );

GRANT SELECT ON public.admission_test_attempts_public TO anon, authenticated;
REVOKE SELECT ON public.admission_test_attempts FROM anon;

CREATE OR REPLACE FUNCTION public.submit_admission_test_attempt(
  p_test_id uuid,
  p_applicant_name text,
  p_applicant_phone text,
  p_applicant_email text DEFAULT NULL,
  p_applicant_guardian text DEFAULT NULL,
  p_applicant_address text DEFAULT NULL,
  p_applicant_nid_birth text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admission_tests WHERE id = p_test_id AND is_published = true AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'TEST_NOT_OPEN' USING ERRCODE = 'check_violation';
  END IF;
  IF p_applicant_name IS NULL OR length(trim(p_applicant_name)) = 0 THEN
    RAISE EXCEPTION 'NAME_REQUIRED' USING ERRCODE = 'not_null_violation';
  END IF;
  IF p_applicant_phone IS NULL OR length(trim(p_applicant_phone)) = 0 THEN
    RAISE EXCEPTION 'PHONE_REQUIRED' USING ERRCODE = 'not_null_violation';
  END IF;

  INSERT INTO public.admission_test_attempts (
    test_id, applicant_name, applicant_phone, applicant_email,
    applicant_guardian, applicant_address, applicant_nid_birth, status
  ) VALUES (
    p_test_id, trim(p_applicant_name), trim(p_applicant_phone),
    NULLIF(trim(COALESCE(p_applicant_email,'')), ''),
    NULLIF(trim(COALESCE(p_applicant_guardian,'')), ''),
    NULLIF(trim(COALESCE(p_applicant_address,'')), ''),
    NULLIF(trim(COALESCE(p_applicant_nid_birth,'')), ''),
    'in_progress'
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_admission_test_attempt(uuid,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_admission_test_attempt(uuid,text,text,text,text,text,text) TO anon, authenticated;

-- ============================================================
-- 2) SALARY_RECORDS — restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Staff can view own salary" ON public.salary_records;

CREATE POLICY "Staff can view own salary records only"
ON public.salary_records FOR SELECT TO authenticated
USING (staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Salary managers can view all salary records"
ON public.salary_records FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_menu_permission(auth.uid(), '/admin/salary', 'view')
);

-- ============================================================
-- 3) STORAGE BUCKETS — make sensitive ones private
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id IN ('receipts','staff-letters');

DROP POLICY IF EXISTS "Admins read receipts bucket" ON storage.objects;
CREATE POLICY "Admins read receipts bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/fees', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-receipts', 'view')
  )
);

DROP POLICY IF EXISTS "Admins read staff-letters bucket" ON storage.objects;
CREATE POLICY "Admins read staff-letters bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'staff-letters' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/staff', 'view')
  )
);

-- ============================================================
-- 4) ALWAYS-TRUE POLICY CLEANUP
-- ============================================================
-- post_likes: anonymous visitor likes — open delete cannot be tied to auth, restrict to admins
DROP POLICY IF EXISTS "Anyone can delete own likes" ON public.post_likes;
CREATE POLICY "Admins can delete likes"
ON public.post_likes FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- online_exam_attempts: only update while in_progress
DROP POLICY IF EXISTS "Anyone can update exam attempt" ON public.online_exam_attempts;
CREATE POLICY "Update only in-progress exam attempts"
ON public.online_exam_attempts FOR UPDATE
USING (status = 'in_progress')
WITH CHECK (status IN ('in_progress','submitted'));

-- online_exam_answers: only update while parent attempt is in_progress
DROP POLICY IF EXISTS "Anyone can update exam answer" ON public.online_exam_answers;
CREATE POLICY "Update answers only for in-progress attempts"
ON public.online_exam_answers FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.online_exam_attempts a WHERE a.id = online_exam_answers.attempt_id AND a.status = 'in_progress')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.online_exam_attempts a WHERE a.id = online_exam_answers.attempt_id AND a.status = 'in_progress')
);


-- Migration: 20260501171036_441bfbc4-504c-423e-bb96-42d1382cc054.sql
-- =========================================================
-- 1. Switch sensitive buckets to private
-- =========================================================
UPDATE storage.buckets SET public = false WHERE id IN ('photos','committee-attachments');

-- =========================================================
-- 2. Drop overly-permissive / legacy policies
-- =========================================================
DROP POLICY IF EXISTS "Public can read photos directly" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;
-- "Admins read receipts bucket" and "Auth can read receipts metadata" are kept (they are gated)

DROP POLICY IF EXISTS "committee_attachments_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "committee_attachments_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "committee_attachments_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "committee_attachments_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "Auth can read committee-attachments metadata" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read committee attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read committee attachments" ON storage.objects;

-- =========================================================
-- 3. PHOTOS bucket — admin/staff-perm read + owner-folder fallback
--    Files are organised as `<user_id>/...` for owner access.
-- =========================================================
CREATE POLICY "photos_read_admins_staff_or_owner"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/staff', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/admission', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/administrative', 'view')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "photos_insert_admin_or_owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "photos_update_admin_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

CREATE POLICY "photos_delete_admin_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

-- Anonymous public form uploads (admission / staff application) need INSERT for photos.
-- We allow anon to INSERT only into the special `public-uploads/` prefix; nothing else.
CREATE POLICY "photos_anon_public_form_upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'public-uploads'
);

-- =========================================================
-- 4. COMMITTEE-ATTACHMENTS — admin or /admin/committees permission
-- =========================================================
CREATE POLICY "committee_attachments_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'view')
  )
);

CREATE POLICY "committee_attachments_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'add')
  )
);

CREATE POLICY "committee_attachments_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  )
);

CREATE POLICY "committee_attachments_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'committee-attachments'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/committees', 'delete')
  )
);

-- =========================================================
-- 5. RECEIPTS — keep admin/perm read, add owner-folder read for paying student/parent
-- =========================================================
DROP POLICY IF EXISTS "receipts_owner_read" ON storage.objects;
CREATE POLICY "receipts_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Tighten upload to admin/permission only (was previously any authenticated user)
CREATE POLICY "receipts_insert_admin_or_perm"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/fees', 'add')
    OR public.has_menu_permission(auth.uid(), '/admin/expenses', 'add')
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'add')
  )
);

CREATE POLICY "receipts_update_admin_only"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

CREATE POLICY "receipts_delete_admin_only"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
);

-- =========================================================
-- 6. STAFF-LETTERS — owner-folder read so the staff can fetch their own letter
-- =========================================================
DROP POLICY IF EXISTS "staff_letters_owner_read" ON storage.objects;
CREATE POLICY "staff_letters_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- Migration: 20260501181719_962993f3-bb71-4b5e-9822-f6284cb2177e.sql
-- =========================================================
-- 1) Class-wide exam merit list approvals
-- =========================================================
CREATE TABLE IF NOT EXISTS public.merit_list_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  submitted_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_session_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_merit_list_approvals_status ON public.merit_list_approvals(status);

DROP TRIGGER IF EXISTS trg_merit_list_approvals_updated_at ON public.merit_list_approvals;
CREATE TRIGGER trg_merit_list_approvals_updated_at
BEFORE UPDATE ON public.merit_list_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.merit_list_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage merit list approvals" ON public.merit_list_approvals;
CREATE POLICY "Admins manage merit list approvals"
ON public.merit_list_approvals
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- =========================================================
-- 2) Admission test merit approval columns
-- =========================================================
ALTER TABLE public.admission_tests
  ADD COLUMN IF NOT EXISTS merit_approval_status text NOT NULL DEFAULT 'pending'
    CHECK (merit_approval_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS merit_rejection_reason text,
  ADD COLUMN IF NOT EXISTS merit_submitted_by uuid,
  ADD COLUMN IF NOT EXISTS merit_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS merit_decided_by uuid,
  ADD COLUMN IF NOT EXISTS merit_decided_at timestamptz;

-- Rebuild the public view to also require admin approval of the merit list
DROP VIEW IF EXISTS public.admission_test_attempts_public CASCADE;
CREATE VIEW public.admission_test_attempts_public
WITH (security_invoker = on) AS
SELECT
  a.id, a.test_id, a.applicant_name, a.score, a.percentage,
  a.passed, a.rank, a.correct_count, a.total_questions, a.status, a.submitted_at
FROM public.admission_test_attempts a
WHERE a.status = 'submitted'
  AND EXISTS (
    SELECT 1 FROM public.admission_tests t
    WHERE t.id = a.test_id
      AND t.is_published = true
      AND t.deleted_at IS NULL
      AND t.merit_approval_status = 'approved'
  );

GRANT SELECT ON public.admission_test_attempts_public TO anon, authenticated;

-- =========================================================
-- 3) RPCs — admin-only approval actions
-- =========================================================

-- 3a) Class merit list: submit / approve / reject
CREATE OR REPLACE FUNCTION public.submit_merit_list_for_approval(
  p_exam_session_id uuid,
  p_class_id uuid
) RETURNS public.merit_list_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.merit_list_approvals;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.merit_list_approvals (exam_session_id, class_id, status, submitted_by, submitted_at)
  VALUES (p_exam_session_id, p_class_id, 'pending', auth.uid(), now())
  ON CONFLICT (exam_session_id, class_id) DO UPDATE
    SET status = 'pending',
        rejection_reason = NULL,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = now(),
        decided_by = NULL,
        decided_at = NULL,
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_merit_list(
  p_exam_session_id uuid,
  p_class_id uuid
) RETURNS public.merit_list_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.merit_list_approvals;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.merit_list_approvals (exam_session_id, class_id, status, decided_by, decided_at)
  VALUES (p_exam_session_id, p_class_id, 'approved', auth.uid(), now())
  ON CONFLICT (exam_session_id, class_id) DO UPDATE
    SET status = 'approved',
        rejection_reason = NULL,
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_merit_list(
  p_exam_session_id uuid,
  p_class_id uuid,
  p_reason text
) RETURNS public.merit_list_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.merit_list_approvals;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = '23502';
  END IF;

  INSERT INTO public.merit_list_approvals (exam_session_id, class_id, status, rejection_reason, decided_by, decided_at)
  VALUES (p_exam_session_id, p_class_id, 'rejected', trim(p_reason), auth.uid(), now())
  ON CONFLICT (exam_session_id, class_id) DO UPDATE
    SET status = 'rejected',
        rejection_reason = EXCLUDED.rejection_reason,
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_merit_list_for_approval(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_merit_list(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_merit_list(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_merit_list_for_approval(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_merit_list(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_merit_list(uuid,uuid,text) TO authenticated;

-- 3b) Admission test merit: submit / approve / reject
CREATE OR REPLACE FUNCTION public.submit_admission_test_merit_for_approval(p_test_id uuid)
RETURNS public.admission_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admission_tests;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.admission_tests
     SET merit_approval_status = 'pending',
         merit_rejection_reason = NULL,
         merit_submitted_by = auth.uid(),
         merit_submitted_at = now(),
         merit_decided_by = NULL,
         merit_decided_at = NULL
   WHERE id = p_test_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_admission_test_merit(p_test_id uuid)
RETURNS public.admission_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admission_tests;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.admission_tests
     SET merit_approval_status = 'approved',
         merit_rejection_reason = NULL,
         merit_decided_by = auth.uid(),
         merit_decided_at = now()
   WHERE id = p_test_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_admission_test_merit(p_test_id uuid, p_reason text)
RETURNS public.admission_tests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.admission_tests;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = '23502';
  END IF;

  UPDATE public.admission_tests
     SET merit_approval_status = 'rejected',
         merit_rejection_reason = trim(p_reason),
         merit_decided_by = auth.uid(),
         merit_decided_at = now()
   WHERE id = p_test_id
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_admission_test_merit_for_approval(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_admission_test_merit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_admission_test_merit(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_admission_test_merit_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_admission_test_merit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_admission_test_merit(uuid,text) TO authenticated;

-- Migration: 20260501182850_eb301d88-58e0-4ac0-8d7f-ede7a496604a.sql

CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  event_type TEXT NOT NULL,
  resource TEXT,
  bucket_id TEXT,
  object_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  http_status INT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_bucket ON public.security_logs(bucket_id);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_logs_admin_read" ON public.security_logs;
CREATE POLICY "security_logs_admin_read" ON public.security_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "security_logs_auth_insert" ON public.security_logs;
CREATE POLICY "security_logs_auth_insert" ON public.security_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.is_accounts_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = _user_id
      AND s.deleted_at IS NULL
      AND s.status = 'active'
      AND (
        lower(coalesce(s.designation,'')) LIKE '%account%'
        OR lower(coalesce(s.designation,'')) LIKE '%হিসাব%'
        OR lower(coalesce(s.department,'')) LIKE '%account%'
        OR lower(coalesce(s.department,'')) LIKE '%হিসাব%'
      )
  )
  OR public.has_menu_permission(_user_id, '/admin/fees', 'view')
  OR public.has_menu_permission(_user_id, '/admin/salary', 'view');
$$;

GRANT EXECUTE ON FUNCTION public.is_accounts_staff(UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_resource TEXT DEFAULT NULL,
  p_bucket_id TEXT DEFAULT NULL,
  p_object_path TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_status INT DEFAULT 403,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_uid UUID;
  v_email TEXT;
BEGIN
  BEGIN v_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_uid := NULL; END;
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;
  INSERT INTO public.security_logs (
    user_id, user_email, event_type, resource, bucket_id, object_path,
    ip_address, user_agent, http_status, reason, metadata
  ) VALUES (
    v_uid, v_email, p_event_type, p_resource, p_bucket_id, p_object_path,
    p_ip, p_user_agent, p_status, p_reason, COALESCE(p_metadata,'{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INT,TEXT,JSONB) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.can_access_storage_object(
  _user_id UUID, _bucket TEXT, _object_path TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_first_seg TEXT;
BEGIN
  IF _user_id IS NULL OR _object_path IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'super_admin') OR public.has_role(_user_id,'admin') THEN
    RETURN true;
  END IF;
  v_first_seg := split_part(_object_path, '/', 1);

  IF _bucket = 'receipts' THEN
    IF public.is_accounts_staff(_user_id) THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.parent_accounts pa
      WHERE pa.user_id = _user_id AND pa.status IN ('approved','active')
        AND pa.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = _user_id AND s.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'photos' THEN
    IF v_first_seg = 'public-uploads' THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = _user_id AND s.deleted_at IS NULL
        AND s.photo_url IS NOT NULL
        AND s.photo_url LIKE '%' || _object_path || '%'
    ) THEN RETURN true; END IF;
    IF public.has_role(_user_id,'teacher') AND _object_path LIKE 'staff/%' THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'staff-letters' THEN
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'committee-attachments' THEN
    RETURN public.has_role(_user_id,'staff') OR public.has_role(_user_id,'teacher') OR public.has_role(_user_id,'administrative');
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_storage_object(UUID,TEXT,TEXT) TO authenticated, anon;

DROP POLICY IF EXISTS "receipts_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "Auth can read receipts metadata" ON storage.objects;
DROP POLICY IF EXISTS "Admins read receipts bucket" ON storage.objects;
CREATE POLICY "receipts_authorized_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.can_access_storage_object(auth.uid(), 'receipts', name)
  );

DROP POLICY IF EXISTS "photos_read_admins_staff_or_owner" ON storage.objects;
CREATE POLICY "photos_authorized_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.can_access_storage_object(auth.uid(), 'photos', name)
  );

DROP POLICY IF EXISTS "photos_anon_public_read" ON storage.objects;
CREATE POLICY "photos_anon_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'photos'
    AND split_part(name,'/',1) = 'public-uploads'
  );

UPDATE storage.buckets SET public = false WHERE id IN ('photos','receipts','staff-letters','committee-attachments');


-- Migration: 20260501182923_6b203cb7-0a29-4035-a7ff-24fef69f53cc.sql

DROP POLICY IF EXISTS "security_logs_auth_insert" ON public.security_logs;
CREATE POLICY "security_logs_self_insert" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());


-- Migration: 20260501185930_b871dc07-5f14-4d40-b7f8-a59dfa6a4e62.sql
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS complainant_address text,
  ADD COLUMN IF NOT EXISTS complainant_student_id text,
  ADD COLUMN IF NOT EXISTS contact_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_verification_method text;

-- Enforce: no anonymous + all contact fields required + must be verified
CREATE OR REPLACE FUNCTION public.complaints_require_verified_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip enforcement for staff/admin updates
  IF TG_OP = 'INSERT' THEN
    NEW.is_anonymous := false;

    IF NEW.complainant_name IS NULL OR length(btrim(NEW.complainant_name)) < 2 THEN
      RAISE EXCEPTION 'COMPLAINANT_NAME_REQUIRED';
    END IF;
    IF NEW.complainant_phone IS NULL OR length(btrim(NEW.complainant_phone)) < 6 THEN
      RAISE EXCEPTION 'COMPLAINANT_PHONE_REQUIRED';
    END IF;
    IF NEW.complainant_email IS NULL OR NEW.complainant_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'COMPLAINANT_EMAIL_REQUIRED';
    END IF;
    IF NEW.complainant_address IS NULL OR length(btrim(NEW.complainant_address)) < 4 THEN
      RAISE EXCEPTION 'COMPLAINANT_ADDRESS_REQUIRED';
    END IF;
    IF NEW.complainant_student_id IS NULL OR length(btrim(NEW.complainant_student_id)) < 2 THEN
      RAISE EXCEPTION 'COMPLAINANT_STUDENT_ID_REQUIRED';
    END IF;
    IF NEW.contact_verified IS NOT TRUE THEN
      RAISE EXCEPTION 'CONTACT_NOT_VERIFIED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_require_verified_identity ON public.complaints;
CREATE TRIGGER trg_complaints_require_verified_identity
BEFORE INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.complaints_require_verified_identity();

-- Migration: 20260501191056_dc369fd9-f8d9-498a-a56b-6890f3545f55.sql
-- Timeline / updates table
CREATE TABLE IF NOT EXISTS public.complaint_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  update_type text NOT NULL CHECK (update_type IN ('created','status_change','note','assignment','resolution')),
  from_status text,
  to_status text,
  message text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint ON public.complaint_updates(complaint_id, created_at DESC);

ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view complaint updates"
  ON public.complaint_updates FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert complaint updates"
  ON public.complaint_updates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins update complaint updates"
  ON public.complaint_updates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete complaint updates"
  ON public.complaint_updates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.complaints_log_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_updates(complaint_id, update_type, to_status, message, is_public)
    VALUES (NEW.id, 'created', NEW.status, 'Complaint submitted', true);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.complaint_updates(complaint_id, update_type, from_status, to_status, is_public, created_by)
      VALUES (NEW.id, 'status_change', OLD.status, NEW.status, true, auth.uid());
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.complaint_updates(complaint_id, update_type, message, is_public, created_by)
      VALUES (NEW.id, 'assignment', 'Complaint assigned for review', true, auth.uid());
    END IF;
    IF NEW.resolution_notes IS DISTINCT FROM OLD.resolution_notes AND NEW.resolution_notes IS NOT NULL THEN
      INSERT INTO public.complaint_updates(complaint_id, update_type, message, is_public, created_by)
      VALUES (NEW.id, 'resolution', NEW.resolution_notes, true, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_log_update ON public.complaints;
CREATE TRIGGER trg_complaints_log_update
AFTER INSERT OR UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.complaints_log_update();

INSERT INTO public.complaint_updates(complaint_id, update_type, to_status, message, is_public, created_at)
SELECT c.id, 'created', c.status, 'Complaint submitted', true, c.created_at
FROM public.complaints c
LEFT JOIN public.complaint_updates u
  ON u.complaint_id = c.id AND u.update_type = 'created'
WHERE u.id IS NULL;

CREATE OR REPLACE FUNCTION public.get_complaint_by_ticket(p_ticket text, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_complaint public.complaints%ROWTYPE;
  v_updates jsonb;
BEGIN
  IF p_ticket IS NULL OR p_email IS NULL OR length(trim(p_ticket)) = 0 OR length(trim(p_email)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_complaint
  FROM public.complaints
  WHERE upper(ticket_number) = upper(trim(p_ticket))
    AND lower(complainant_email) = lower(trim(p_email))
    AND deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'update_type', update_type,
    'from_status', from_status,
    'to_status', to_status,
    'message', message,
    'created_at', created_at
  ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_updates
  FROM public.complaint_updates
  WHERE complaint_id = v_complaint.id AND is_public = true;

  RETURN jsonb_build_object(
    'id', v_complaint.id,
    'ticket_number', v_complaint.ticket_number,
    'subject', v_complaint.subject,
    'category', v_complaint.category,
    'priority', v_complaint.priority,
    'status', v_complaint.status,
    'description', v_complaint.description,
    'complainant_name', v_complaint.complainant_name,
    'created_at', v_complaint.created_at,
    'updated_at', v_complaint.updated_at,
    'resolved_at', v_complaint.resolved_at,
    'resolution_notes', v_complaint.resolution_notes,
    'updates', v_updates
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_complaint_by_ticket(text, text) TO anon, authenticated;

-- Migration: 20260501191631_1b807ae6-cbaa-4752-8428-1753ecb67ec1.sql
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

-- Migration: 20260501192940_00929a23-c11c-45c2-a3d9-e6d56b9e1d9d.sql
-- Allow 'reply' as a valid complaint update type for complainant follow-ups
ALTER TABLE public.complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_update_type_check;
ALTER TABLE public.complaint_updates ADD CONSTRAINT complaint_updates_update_type_check
  CHECK (update_type IN ('created','status_change','note','assignment','resolution','reply'));

-- RPC: complainant adds a reply to their own complaint (authenticated by ticket + email match)
CREATE OR REPLACE FUNCTION public.add_complaint_reply(
  p_ticket text,
  p_email text,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_complaint_id uuid;
  v_status text;
  v_msg text;
  v_recent_count int;
BEGIN
  -- Validate inputs
  v_msg := btrim(coalesce(p_message, ''));
  IF length(v_msg) < 2 THEN
    RAISE EXCEPTION 'Message too short';
  END IF;
  IF length(v_msg) > 4000 THEN
    RAISE EXCEPTION 'Message too long (max 4000 chars)';
  END IF;

  -- Look up complaint by ticket + email
  SELECT id, status INTO v_complaint_id, v_status
  FROM public.complaints
  WHERE upper(ticket_number) = upper(btrim(p_ticket))
    AND lower(complainant_email) = lower(btrim(p_email))
    AND deleted_at IS NULL;

  IF v_complaint_id IS NULL THEN
    RAISE EXCEPTION 'Complaint not found';
  END IF;

  -- Closed/rejected complaints cannot accept new replies
  IF v_status IN ('rejected','closed') THEN
    RAISE EXCEPTION 'This complaint is closed and no longer accepts replies';
  END IF;

  -- Simple anti-spam: max 5 replies per complaint per hour
  SELECT count(*) INTO v_recent_count
  FROM public.complaint_updates
  WHERE complaint_id = v_complaint_id
    AND update_type = 'reply'
    AND created_at > now() - interval '1 hour';
  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Reply rate limit reached. Please try again later.';
  END IF;

  INSERT INTO public.complaint_updates(complaint_id, update_type, message, is_public, created_by)
  VALUES (v_complaint_id, 'reply', v_msg, true, NULL);

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.add_complaint_reply(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.add_complaint_reply(text, text, text) TO anon, authenticated;

-- Migration: 20260501193419_8a2768b8-63a9-4dbf-aacb-efc3ceed0b99.sql
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

-- Migration: 20260501195125_52f3f739-aa89-4fec-8f06-1bb9f406e61b.sql
-- student_accounts: one account per student_id (UNIQUE), email/phone OTP verified
CREATE TABLE IF NOT EXISTS public.student_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,                 -- email or phone (lowercased for email)
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email','phone')),
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  student_id TEXT NOT NULL,              -- references students.student_id
  student_dob DATE NOT NULL,
  linked_student_uuid UUID NOT NULL,
  contact_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','rejected')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One student → one account (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS student_accounts_student_id_key
  ON public.student_accounts (lower(student_id));
CREATE UNIQUE INDEX IF NOT EXISTS student_accounts_linked_uuid_key
  ON public.student_accounts (linked_student_uuid);
-- Unique contact (email or phone) so login works deterministically
CREATE UNIQUE INDEX IF NOT EXISTS student_accounts_contact_key
  ON public.student_accounts (lower(contact));

ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;

-- RLS: only super_admin / admin can directly read; signup/login goes through service role edge fn.
DROP POLICY IF EXISTS "Admins can view student accounts" ON public.student_accounts;
CREATE POLICY "Admins can view student accounts"
  ON public.student_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update student accounts" ON public.student_accounts;
CREATE POLICY "Admins can update student accounts"
  ON public.student_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete student accounts" ON public.student_accounts;
CREATE POLICY "Admins can delete student accounts"
  ON public.student_accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_student_accounts_updated ON public.student_accounts;
CREATE TRIGGER trg_student_accounts_updated
BEFORE UPDATE ON public.student_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260501202401_9128188f-36dc-4a44-9a5f-c751ad5e83a5.sql
-- Allow 'pending' status and default new accounts to 'pending'
ALTER TABLE public.student_accounts DROP CONSTRAINT IF EXISTS student_accounts_status_check;
ALTER TABLE public.student_accounts
  ADD CONSTRAINT student_accounts_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'rejected'::text]));

ALTER TABLE public.student_accounts ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Migration: 20260501210728_5fdf7b52-8b06-4bbf-8386-f9764743ac5b.sql
-- 1. Add nid + linked_student_uuids array to parent_accounts
ALTER TABLE public.parent_accounts
  ADD COLUMN IF NOT EXISTS nid TEXT,
  ADD COLUMN IF NOT EXISTS linked_student_uuids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_parent_accounts_nid ON public.parent_accounts(nid) WHERE nid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parent_accounts_phone ON public.parent_accounts(phone) WHERE phone IS NOT NULL;

-- 2. Add guardian_nid to students for guardian-based matching (optional column)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS guardian_nid TEXT;

-- 3. Backfill linked_student_uuids from existing single linked_student_uuid
UPDATE public.parent_accounts
SET linked_student_uuids = ARRAY[linked_student_uuid]
WHERE linked_student_uuid IS NOT NULL
  AND (linked_student_uuids IS NULL OR array_length(linked_student_uuids, 1) IS NULL);

-- 4. RPC: find students matching parent's NID and/or phone
CREATE OR REPLACE FUNCTION public.match_students_for_parent(
  p_nid TEXT,
  p_phone TEXT
)
RETURNS TABLE(
  student_uuid UUID,
  student_id TEXT,
  name_bn TEXT,
  name_en TEXT,
  match_reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.student_id, s.name_bn, s.name_en,
    CASE
      WHEN p_nid IS NOT NULL AND p_nid <> '' AND TRIM(s.father_nid) = TRIM(p_nid) THEN 'father_nid'
      WHEN p_nid IS NOT NULL AND p_nid <> '' AND TRIM(s.mother_nid) = TRIM(p_nid) THEN 'mother_nid'
      WHEN p_nid IS NOT NULL AND p_nid <> '' AND TRIM(s.guardian_nid) = TRIM(p_nid) THEN 'guardian_nid'
      WHEN p_phone IS NOT NULL AND p_phone <> '' AND TRIM(s.guardian_phone) = TRIM(p_phone) THEN 'guardian_phone'
      WHEN p_phone IS NOT NULL AND p_phone <> '' AND TRIM(s.father_phone) = TRIM(p_phone) THEN 'father_phone'
      WHEN p_phone IS NOT NULL AND p_phone <> '' AND TRIM(s.mother_phone) = TRIM(p_phone) THEN 'mother_phone'
      ELSE 'unknown'
    END AS match_reason
  FROM public.students s
  WHERE s.deleted_at IS NULL
    AND (
      (p_nid IS NOT NULL AND p_nid <> '' AND (
        TRIM(s.father_nid) = TRIM(p_nid)
        OR TRIM(s.mother_nid) = TRIM(p_nid)
        OR TRIM(s.guardian_nid) = TRIM(p_nid)
      ))
      OR (p_phone IS NOT NULL AND p_phone <> '' AND (
        TRIM(s.guardian_phone) = TRIM(p_phone)
        OR TRIM(s.father_phone) = TRIM(p_phone)
        OR TRIM(s.mother_phone) = TRIM(p_phone)
      ))
    );
$$;

-- 5. RPC: refresh linked_student_uuids for an approved parent based on current NID/phone
CREATE OR REPLACE FUNCTION public.refresh_parent_student_links(p_account_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid TEXT;
  v_phone TEXT;
  v_uuids UUID[];
BEGIN
  SELECT nid, phone INTO v_nid, v_phone
  FROM public.parent_accounts
  WHERE id = p_account_id AND status = 'approved';

  IF v_nid IS NULL AND v_phone IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  SELECT COALESCE(array_agg(DISTINCT student_uuid), ARRAY[]::UUID[])
  INTO v_uuids
  FROM public.match_students_for_parent(v_nid, v_phone);

  UPDATE public.parent_accounts
  SET linked_student_uuids = v_uuids,
      linked_student_uuid = COALESCE(v_uuids[1], linked_student_uuid),
      updated_at = now()
  WHERE id = p_account_id;

  RETURN v_uuids;
END;
$$;

-- 6. Trigger: when a student is inserted/updated, auto-refresh any matching approved parents
CREATE OR REPLACE FUNCTION public.auto_link_parents_on_student_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Find all approved parent accounts whose NID or phone matches this student's parents
  FOR r IN
    SELECT DISTINCT pa.id
    FROM public.parent_accounts pa
    WHERE pa.status = 'approved'
      AND (
        (pa.nid IS NOT NULL AND pa.nid <> '' AND (
          TRIM(pa.nid) = TRIM(COALESCE(NEW.father_nid, ''))
          OR TRIM(pa.nid) = TRIM(COALESCE(NEW.mother_nid, ''))
          OR TRIM(pa.nid) = TRIM(COALESCE(NEW.guardian_nid, ''))
        ))
        OR (pa.phone IS NOT NULL AND pa.phone <> '' AND (
          TRIM(pa.phone) = TRIM(COALESCE(NEW.guardian_phone, ''))
          OR TRIM(pa.phone) = TRIM(COALESCE(NEW.father_phone, ''))
          OR TRIM(pa.phone) = TRIM(COALESCE(NEW.mother_phone, ''))
        ))
      )
  LOOP
    PERFORM public.refresh_parent_student_links(r.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_parents_on_student_change ON public.students;
CREATE TRIGGER trg_auto_link_parents_on_student_change
AFTER INSERT OR UPDATE OF father_nid, mother_nid, guardian_nid, guardian_phone, father_phone, mother_phone
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_parents_on_student_change();

-- 7. Parent fee payment requests table (manual TrxID fallback)
CREATE TABLE IF NOT EXISTS public.parent_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id UUID NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  student_uuid UUID NOT NULL,
  fee_assignment_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  trx_id TEXT,
  sender_phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  payment_record_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parent payment requests"
ON public.parent_payment_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR is_accounts_staff(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR is_accounts_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_parent_payment_requests_status ON public.parent_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_parent_payment_requests_parent ON public.parent_payment_requests(parent_account_id);

CREATE TRIGGER trg_parent_payment_requests_updated_at
BEFORE UPDATE ON public.parent_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260501221531_9af617c3-4847-40d3-b463-7594e6b3bc9e.sql
-- 1. Audit table
CREATE TABLE IF NOT EXISTS public.parent_student_link_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id UUID NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  student_uuid UUID NULL,
  action TEXT NOT NULL CHECK (action IN ('linked', 'unlinked', 'refreshed')),
  match_reason TEXT NULL,
  before_uuids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  after_uuids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  source TEXT NOT NULL DEFAULT 'unknown',
  triggered_by_student_uuid UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psla_parent ON public.parent_student_link_audit (parent_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psla_student ON public.parent_student_link_audit (student_uuid);
CREATE INDEX IF NOT EXISTS idx_psla_created ON public.parent_student_link_audit (created_at DESC);

ALTER TABLE public.parent_student_link_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read parent link audit" ON public.parent_student_link_audit;
CREATE POLICY "Admins read parent link audit"
ON public.parent_student_link_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER triggers can write.

-- 2. Updated refresh function with audit logging + source / trigger context
CREATE OR REPLACE FUNCTION public.refresh_parent_student_links(
  p_account_id UUID,
  p_source TEXT DEFAULT 'manual_refresh',
  p_triggered_by_student UUID DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nid TEXT;
  v_phone TEXT;
  v_before UUID[];
  v_after UUID[];
  v_added UUID[];
  v_removed UUID[];
  v_uuid UUID;
  v_reason TEXT;
BEGIN
  SELECT nid, phone, COALESCE(linked_student_uuids, ARRAY[]::UUID[])
    INTO v_nid, v_phone, v_before
  FROM public.parent_accounts
  WHERE id = p_account_id AND status = 'approved';

  IF v_nid IS NULL AND v_phone IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  SELECT COALESCE(array_agg(DISTINCT student_uuid), ARRAY[]::UUID[])
    INTO v_after
  FROM public.match_students_for_parent(v_nid, v_phone);

  -- Compute diffs
  SELECT COALESCE(array_agg(x), ARRAY[]::UUID[])
    INTO v_added
  FROM unnest(v_after) AS x
  WHERE x <> ALL (v_before);

  SELECT COALESCE(array_agg(x), ARRAY[]::UUID[])
    INTO v_removed
  FROM unnest(v_before) AS x
  WHERE x <> ALL (v_after);

  -- Persist
  UPDATE public.parent_accounts
  SET linked_student_uuids = v_after,
      linked_student_uuid = COALESCE(v_after[1], linked_student_uuid),
      updated_at = now()
  WHERE id = p_account_id;

  -- Audit each newly linked student with its match reason
  IF array_length(v_added, 1) IS NOT NULL THEN
    FOREACH v_uuid IN ARRAY v_added LOOP
      SELECT match_reason INTO v_reason
      FROM public.match_students_for_parent(v_nid, v_phone)
      WHERE student_uuid = v_uuid
      LIMIT 1;

      INSERT INTO public.parent_student_link_audit
        (parent_account_id, student_uuid, action, match_reason,
         before_uuids, after_uuids, source, triggered_by_student_uuid)
      VALUES
        (p_account_id, v_uuid, 'linked', COALESCE(v_reason, 'unknown'),
         v_before, v_after, p_source, p_triggered_by_student);
    END LOOP;
  END IF;

  -- Audit each unlinked student
  IF array_length(v_removed, 1) IS NOT NULL THEN
    FOREACH v_uuid IN ARRAY v_removed LOOP
      INSERT INTO public.parent_student_link_audit
        (parent_account_id, student_uuid, action, match_reason,
         before_uuids, after_uuids, source, triggered_by_student_uuid)
      VALUES
        (p_account_id, v_uuid, 'unlinked', NULL,
         v_before, v_after, p_source, p_triggered_by_student);
    END LOOP;
  END IF;

  -- Always log a single 'refreshed' row when fired by a student change so admins
  -- can see the trigger event itself even when nothing changed.
  IF p_source = 'student_change' THEN
    INSERT INTO public.parent_student_link_audit
      (parent_account_id, student_uuid, action, match_reason,
       before_uuids, after_uuids, source, triggered_by_student_uuid,
       notes)
    VALUES
      (p_account_id, p_triggered_by_student, 'refreshed', NULL,
       v_before, v_after, p_source, p_triggered_by_student,
       CASE
         WHEN array_length(v_added, 1) IS NULL AND array_length(v_removed, 1) IS NULL
           THEN 'no change'
         ELSE NULL
       END);
  END IF;

  RETURN v_after;
END;
$$;

-- 3. Updated trigger function passes student id + source
CREATE OR REPLACE FUNCTION public.auto_link_parents_on_student_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT pa.id
    FROM public.parent_accounts pa
    WHERE pa.status = 'approved'
      AND (
        (pa.nid IS NOT NULL AND pa.nid <> '' AND (
          TRIM(pa.nid) = TRIM(COALESCE(NEW.father_nid, ''))
          OR TRIM(pa.nid) = TRIM(COALESCE(NEW.mother_nid, ''))
          OR TRIM(pa.nid) = TRIM(COALESCE(NEW.guardian_nid, ''))
        ))
        OR (pa.phone IS NOT NULL AND pa.phone <> '' AND (
          TRIM(pa.phone) = TRIM(COALESCE(NEW.guardian_phone, ''))
          OR TRIM(pa.phone) = TRIM(COALESCE(NEW.father_phone, ''))
          OR TRIM(pa.phone) = TRIM(COALESCE(NEW.mother_phone, ''))
        ))
      )
  LOOP
    PERFORM public.refresh_parent_student_links(r.id, 'student_change', NEW.id);
  END LOOP;
  RETURN NEW;
END;
$$;

-- Migration: 20260501222101_eea4687b-cdfd-4ae6-80aa-01a36aa6a406.sql
-- 1. Extend payments to remember what the gateway transaction was paying for
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fee_assignment_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'gateway',
  ADD COLUMN IF NOT EXISTS parent_account_id UUID NULL,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ NULL;

-- 2. Allocation audit table
CREATE TABLE IF NOT EXISTS public.fee_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NULL,
  trx_id TEXT NULL,
  source TEXT NOT NULL,                       -- 'gateway' | 'manual' | 'admin' | 'reversal'
  source_record_id UUID NULL,                 -- payments.id or parent_payment_requests.id
  parent_account_id UUID NULL,
  actor_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fpa_fee_payment ON public.fee_payment_allocations (fee_payment_id);
CREATE INDEX IF NOT EXISTS idx_fpa_source ON public.fee_payment_allocations (source, source_record_id);
CREATE INDEX IF NOT EXISTS idx_fpa_student ON public.fee_payment_allocations (student_id, created_at DESC);

ALTER TABLE public.fee_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read fee_payment_allocations" ON public.fee_payment_allocations;
CREATE POLICY "Admins read fee_payment_allocations"
ON public.fee_payment_allocations
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_accounts_staff(auth.uid())
);

-- 3. Core reconciliation RPC
CREATE OR REPLACE FUNCTION public.reconcile_fee_payment(
  p_student_id UUID,
  p_amount NUMERIC,
  p_fee_assignment_ids UUID[] DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_trx_id TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'admin',
  p_source_record_id UUID DEFAULT NULL,
  p_parent_account_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS TABLE(fee_payment_id UUID, allocated NUMERIC, new_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining NUMERIC := COALESCE(p_amount, 0);
  v_row RECORD;
  v_alloc NUMERIC;
  v_due NUMERIC;
  v_new_paid NUMERIC;
  v_new_status TEXT;
  v_receipt TEXT;
BEGIN
  IF v_remaining <= 0 OR p_student_id IS NULL THEN
    RETURN;
  END IF;

  v_receipt := COALESCE(p_trx_id, 'AUTO-' || to_char(now(), 'YYYYMMDDHH24MISS'));

  -- Iterate target rows: explicit ids first (in array order), then oldest-unpaid fallback.
  FOR v_row IN
    SELECT fp.id, fp.amount, COALESCE(fp.paid_amount, 0) AS paid_amount, fp.status
    FROM public.fee_payments fp
    WHERE fp.student_id = p_student_id
      AND fp.deleted_at IS NULL
      AND fp.status <> 'paid'
      AND (
        (p_fee_assignment_ids IS NOT NULL AND array_length(p_fee_assignment_ids, 1) IS NOT NULL
          AND fp.id = ANY(p_fee_assignment_ids))
        OR (p_fee_assignment_ids IS NULL OR array_length(p_fee_assignment_ids, 1) IS NULL)
      )
    ORDER BY
      CASE WHEN p_fee_assignment_ids IS NOT NULL THEN array_position(p_fee_assignment_ids, fp.id) END NULLS LAST,
      fp.year NULLS LAST, fp.month NULLS LAST, fp.created_at
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_due := GREATEST(v_row.amount - v_row.paid_amount, 0);
    IF v_due <= 0 THEN
      CONTINUE;
    END IF;

    v_alloc := LEAST(v_due, v_remaining);
    v_new_paid := v_row.paid_amount + v_alloc;
    v_new_status := CASE WHEN v_new_paid >= v_row.amount THEN 'paid' ELSE 'partial' END;

    UPDATE public.fee_payments
    SET paid_amount = v_new_paid,
        status = v_new_status,
        paid_at = COALESCE(paid_at, now()),
        receipt_number = COALESCE(receipt_number, v_receipt),
        collected_by = COALESCE(collected_by, p_source),
        updated_at = now()
    WHERE id = v_row.id;

    INSERT INTO public.fee_payment_allocations
      (fee_payment_id, student_id, amount, method, trx_id, source,
       source_record_id, parent_account_id, actor_id)
    VALUES
      (v_row.id, p_student_id, v_alloc, p_method, p_trx_id, p_source,
       p_source_record_id, p_parent_account_id, p_actor_id);

    v_remaining := v_remaining - v_alloc;

    fee_payment_id := v_row.id;
    allocated := v_alloc;
    new_status := v_new_status;
    RETURN NEXT;
  END LOOP;

  -- Stamp gateway record as reconciled
  IF p_source = 'gateway' AND p_source_record_id IS NOT NULL THEN
    UPDATE public.payments SET reconciled_at = now() WHERE id = p_source_record_id;
  END IF;
END;
$$;

-- 4. Reverse allocations (used when verified→pending/rejected or success→failed)
CREATE OR REPLACE FUNCTION public.reverse_fee_allocations(
  p_source TEXT,
  p_source_record_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alloc RECORD;
  v_reversed INT := 0;
  v_row RECORD;
  v_new_paid NUMERIC;
  v_new_status TEXT;
BEGIN
  FOR v_alloc IN
    SELECT id, fee_payment_id, student_id, amount
    FROM public.fee_payment_allocations
    WHERE source = p_source
      AND source_record_id = p_source_record_id
      AND amount > 0
  LOOP
    SELECT amount, COALESCE(paid_amount, 0) AS paid_amount
      INTO v_row
    FROM public.fee_payments
    WHERE id = v_alloc.fee_payment_id;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_new_paid := GREATEST(v_row.paid_amount - v_alloc.amount, 0);
    v_new_status := CASE
      WHEN v_new_paid <= 0 THEN 'unpaid'
      WHEN v_new_paid >= v_row.amount THEN 'paid'
      ELSE 'partial'
    END;

    UPDATE public.fee_payments
    SET paid_amount = v_new_paid,
        status = v_new_status,
        paid_at = CASE WHEN v_new_paid <= 0 THEN NULL ELSE paid_at END,
        receipt_number = CASE WHEN v_new_paid <= 0 THEN NULL ELSE receipt_number END,
        updated_at = now()
    WHERE id = v_alloc.fee_payment_id;

    -- Audit the reversal as a negative allocation
    INSERT INTO public.fee_payment_allocations
      (fee_payment_id, student_id, amount, source, source_record_id, actor_id, notes)
    VALUES
      (v_alloc.fee_payment_id, v_alloc.student_id, -v_alloc.amount, 'reversal',
       p_source_record_id, p_actor_id, 'Reversed ' || p_source);

    v_reversed := v_reversed + 1;
  END LOOP;

  RETURN v_reversed;
END;
$$;

-- 5. Trigger: parent_payment_requests status transitions
CREATE OR REPLACE FUNCTION public.on_parent_payment_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  -- Approve: pending → verified
  IF NEW.status = 'verified' AND COALESCE(OLD.status, '') <> 'verified' THEN
    NEW.verified_at := COALESCE(NEW.verified_at, now());
    NEW.verified_by := COALESCE(NEW.verified_by, v_actor);

    PERFORM public.reconcile_fee_payment(
      NEW.student_uuid,
      NEW.amount,
      NEW.fee_assignment_ids,
      NEW.method,
      NEW.trx_id,
      'manual',
      NEW.id,
      NEW.parent_account_id,
      v_actor
    );
  END IF;

  -- Revoke: verified → pending/rejected → reverse prior allocations
  IF COALESCE(OLD.status, '') = 'verified' AND NEW.status <> 'verified' THEN
    PERFORM public.reverse_fee_allocations('manual', NEW.id, v_actor);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parent_payment_request_reconcile ON public.parent_payment_requests;
CREATE TRIGGER trg_parent_payment_request_reconcile
BEFORE UPDATE OF status ON public.parent_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.on_parent_payment_request_status_change();

-- 6. Trigger: payments (gateway) status transitions
CREATE OR REPLACE FUNCTION public.on_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF NEW.status = 'success' AND COALESCE(OLD.status, '') <> 'success' AND NEW.student_id IS NOT NULL THEN
    PERFORM public.reconcile_fee_payment(
      NEW.student_id,
      NEW.amount,
      NEW.fee_assignment_ids,
      NEW.payment_method,
      NEW.transaction_id,
      'gateway',
      NEW.id,
      NEW.parent_account_id,
      v_actor
    );
  END IF;

  IF COALESCE(OLD.status, '') = 'success' AND NEW.status <> 'success' THEN
    PERFORM public.reverse_fee_allocations('gateway', NEW.id, v_actor);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_reconcile ON public.payments;
CREATE TRIGGER trg_payment_reconcile
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.on_payment_status_change();

-- Also reconcile freshly-inserted successful payments (e.g. webhook inserts a 'success' row directly)
CREATE OR REPLACE FUNCTION public.on_payment_insert_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'success' AND NEW.student_id IS NOT NULL THEN
    PERFORM public.reconcile_fee_payment(
      NEW.student_id, NEW.amount, NEW.fee_assignment_ids,
      NEW.payment_method, NEW.transaction_id,
      'gateway', NEW.id, NEW.parent_account_id, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_insert_reconcile ON public.payments;
CREATE TRIGGER trg_payment_insert_reconcile
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.on_payment_insert_success();

-- Migration: 20260501223125_029d5d73-07fe-4a3a-842f-785b9758e20b.sql
ALTER TABLE public.parent_payment_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_payment_requests;

-- Migration: 20260501224332_bc0a3ef2-61f8-4178-91dc-29bb1316175d.sql

-- Receipt verification tokens table (works for any receipt type)
CREATE TABLE public.receipt_verify_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  receipt_type text NOT NULL CHECK (receipt_type IN ('fee_payment', 'parent_payment_request', 'donation', 'salary')),
  receipt_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 years'),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  scan_count integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz
);

CREATE INDEX idx_receipt_verify_tokens_token ON public.receipt_verify_tokens(token);
CREATE INDEX idx_receipt_verify_tokens_receipt ON public.receipt_verify_tokens(receipt_type, receipt_id);

ALTER TABLE public.receipt_verify_tokens ENABLE ROW LEVEL SECURITY;

-- Admins/staff manage; everyone else uses RPC
CREATE POLICY "Admins manage receipt tokens"
ON public.receipt_verify_tokens
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_accounts_staff(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_accounts_staff(auth.uid())
);

-- Helper to create or fetch a token for a receipt (idempotent)
CREATE OR REPLACE FUNCTION public.get_or_create_receipt_token(
  _receipt_type text,
  _receipt_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
BEGIN
  IF _receipt_type NOT IN ('fee_payment', 'parent_payment_request', 'donation', 'salary') THEN
    RAISE EXCEPTION 'Invalid receipt_type';
  END IF;

  SELECT token INTO _token
  FROM public.receipt_verify_tokens
  WHERE receipt_type = _receipt_type
    AND receipt_id = _receipt_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF _token IS NOT NULL THEN
    RETURN _token;
  END IF;

  _token := encode(gen_random_bytes(24), 'base64');
  -- URL-safe
  _token := replace(replace(replace(_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.receipt_verify_tokens (token, receipt_type, receipt_id)
  VALUES (_token, _receipt_type, _receipt_id);

  RETURN _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_receipt_token(text, uuid) TO authenticated, anon;

-- Public verify RPC: returns minimal info (status, amount, student/payer name, date, verified badge)
CREATE OR REPLACE FUNCTION public.verify_receipt_public(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.receipt_verify_tokens%ROWTYPE;
  _result jsonb;
  _student_uuid uuid;
BEGIN
  SELECT * INTO _row FROM public.receipt_verify_tokens WHERE token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'NOT_FOUND');
  END IF;

  IF _row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'REVOKED');
  END IF;

  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'EXPIRED');
  END IF;

  -- Update scan stats
  UPDATE public.receipt_verify_tokens
  SET scan_count = scan_count + 1, last_scanned_at = now()
  WHERE id = _row.id;

  IF _row.receipt_type = 'fee_payment' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'fee_payment',
      'receipt_id', fp.id,
      'receipt_number', fp.receipt_number,
      'amount', fp.paid_amount,
      'status', fp.status,
      'paid_at', fp.paid_at,
      'student_name', s.name,
      'student_id', s.student_id,
      'class_name', c.name,
      'fee_type', ft.name
    ) INTO _result
    FROM public.fee_payments fp
    LEFT JOIN public.students s ON s.id = fp.student_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
    WHERE fp.id = _row.receipt_id;

  ELSIF _row.receipt_type = 'parent_payment_request' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'parent_payment_request',
      'receipt_id', ppr.id,
      'amount', ppr.amount,
      'status', ppr.status,
      'method', ppr.method,
      'trx_id', ppr.trx_id,
      'paid_at', COALESCE(ppr.verified_at, ppr.created_at),
      'student_name', s.name,
      'student_id', s.student_id,
      'class_name', c.name
    ) INTO _result
    FROM public.parent_payment_requests ppr
    LEFT JOIN public.students s ON s.id = ppr.student_uuid
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE ppr.id = _row.receipt_id;
  END IF;

  IF _result IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'RECEIPT_DELETED');
  END IF;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_receipt_public(text) TO authenticated, anon;

-- Admin full-detail RPC
CREATE OR REPLACE FUNCTION public.verify_receipt_admin(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.receipt_verify_tokens%ROWTYPE;
  _result jsonb;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  ) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT * INTO _row FROM public.receipt_verify_tokens WHERE token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'NOT_FOUND');
  END IF;

  IF _row.receipt_type = 'fee_payment' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'fee_payment',
      'receipt', to_jsonb(fp.*),
      'student', to_jsonb(s.*),
      'class', to_jsonb(c.*),
      'fee_type', to_jsonb(ft.*),
      'token_info', jsonb_build_object(
        'created_at', _row.created_at,
        'expires_at', _row.expires_at,
        'revoked_at', _row.revoked_at,
        'scan_count', _row.scan_count + 1,
        'last_scanned_at', now()
      )
    ) INTO _result
    FROM public.fee_payments fp
    LEFT JOIN public.students s ON s.id = fp.student_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
    WHERE fp.id = _row.receipt_id;

  ELSIF _row.receipt_type = 'parent_payment_request' THEN
    SELECT jsonb_build_object(
      'valid', true,
      'receipt_type', 'parent_payment_request',
      'receipt', to_jsonb(ppr.*),
      'student', to_jsonb(s.*),
      'class', to_jsonb(c.*),
      'token_info', jsonb_build_object(
        'created_at', _row.created_at,
        'expires_at', _row.expires_at,
        'revoked_at', _row.revoked_at,
        'scan_count', _row.scan_count + 1,
        'last_scanned_at', now()
      )
    ) INTO _result
    FROM public.parent_payment_requests ppr
    LEFT JOIN public.students s ON s.id = ppr.student_uuid
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE ppr.id = _row.receipt_id;
  END IF;

  -- Update scan stats
  UPDATE public.receipt_verify_tokens
  SET scan_count = scan_count + 1, last_scanned_at = now()
  WHERE id = _row.id;

  RETURN COALESCE(_result, jsonb_build_object('valid', false, 'error', 'RECEIPT_DELETED'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_receipt_admin(text) TO authenticated;


-- Migration: 20260501225210_df48173d-84f6-41b9-8494-32bbb843741d.sql
CREATE TABLE IF NOT EXISTS public.receipt_status_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  receipt_number text,
  student_id uuid,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  change_source text,
  payment_method text,
  trx_id text,
  amount numeric(12,2),
  rejection_reason text,
  note text,
  ip_address text,
  user_agent text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_source
  ON public.receipt_status_audit (source_table, source_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_student
  ON public.receipt_status_audit (student_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_receipt
  ON public.receipt_status_audit (receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipt_status_audit_changed_at
  ON public.receipt_status_audit (changed_at DESC);

ALTER TABLE public.receipt_status_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view receipt status audit"
ON public.receipt_status_audit
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR is_accounts_staff(auth.uid())
);

CREATE OR REPLACE FUNCTION public.resolve_actor_name(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = _uid LIMIT 1),
    'System'
  );
$$;

CREATE OR REPLACE FUNCTION public.audit_fee_payments_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, receipt_number, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, amount
    ) VALUES (
      'fee_payments', NEW.id, NEW.receipt_number, NEW.student_id,
      NULL, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      CASE WHEN v_actor IS NULL THEN 'system' ELSE 'admin' END,
      NEW.paid_amount
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') IS DISTINCT FROM COALESCE(NEW.status,'') THEN
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, receipt_number, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, amount
    ) VALUES (
      'fee_payments', NEW.id, NEW.receipt_number, NEW.student_id,
      OLD.status, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      CASE WHEN v_actor IS NULL THEN 'system' ELSE 'admin' END,
      NEW.paid_amount
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_fee_payments_status ON public.fee_payments;
CREATE TRIGGER trg_audit_fee_payments_status
AFTER INSERT OR UPDATE OF status ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_fee_payments_status();

CREATE OR REPLACE FUNCTION public.audit_parent_payment_requests_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), NEW.verified_by);
  v_source text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_source := CASE WHEN NEW.method IN ('bkash','nagad','rocket','upay','online','gateway') THEN 'gateway'
                     ELSE 'parent_portal' END;
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, payment_method, trx_id, amount, note
    ) VALUES (
      'parent_payment_requests', NEW.id, NEW.student_uuid,
      NULL, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      v_source, NEW.method, NEW.trx_id, NEW.amount, NEW.note
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') IS DISTINCT FROM COALESCE(NEW.status,'') THEN
    v_source := CASE
      WHEN auth.uid() IS NOT NULL THEN 'admin'
      WHEN NEW.method IN ('bkash','nagad','rocket','upay','online','gateway') THEN 'gateway'
      ELSE 'system'
    END;
    INSERT INTO public.receipt_status_audit (
      source_table, source_id, student_id,
      old_status, new_status, changed_by, changed_by_name,
      change_source, payment_method, trx_id, amount,
      rejection_reason, note
    ) VALUES (
      'parent_payment_requests', NEW.id, NEW.student_uuid,
      OLD.status, NEW.status, v_actor, public.resolve_actor_name(v_actor),
      v_source, NEW.method, NEW.trx_id, NEW.amount,
      NEW.rejection_reason, NEW.note
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_parent_payment_requests_status ON public.parent_payment_requests;
CREATE TRIGGER trg_audit_parent_payment_requests_status
AFTER INSERT OR UPDATE OF status ON public.parent_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_parent_payment_requests_status();

-- Migration: 20260501225700_ca15f964-afca-4afd-a7e8-2dac34133b3a.sql
ALTER TABLE public.receipt_status_audit REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipt_status_audit;

-- Migration: 20260501232059_14a90d5b-d148-44a6-915f-64cdb0fd8f39.sql
-- 1) Seed settings (idempotent)
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('receipt_qr_ttl_days', '365'::jsonb, 'Receipt QR validity in days. Tokens older than this are considered expired and auto-rotated on next request.'),
  ('receipt_qr_auto_rotate', 'true'::jsonb, 'When true, expired/aged-out QR tokens are automatically replaced on next request.')
ON CONFLICT (key) DO NOTHING;

-- 2) Replace get_or_create_receipt_token to honor TTL + auto-rotate
CREATE OR REPLACE FUNCTION public.get_or_create_receipt_token(
  _receipt_type text,
  _receipt_id   uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _token        text;
  _row          public.receipt_verify_tokens%ROWTYPE;
  _ttl_days     int;
  _auto_rotate  boolean;
BEGIN
  IF _receipt_type NOT IN ('fee_payment', 'parent_payment_request', 'donation', 'salary') THEN
    RAISE EXCEPTION 'Invalid receipt_type';
  END IF;

  -- Read settings with safe defaults
  SELECT COALESCE(NULLIF(value::text, 'null')::int, 365)
    INTO _ttl_days
    FROM public.app_settings WHERE key = 'receipt_qr_ttl_days';
  IF _ttl_days IS NULL THEN _ttl_days := 365; END IF;

  SELECT COALESCE((value)::boolean, true)
    INTO _auto_rotate
    FROM public.app_settings WHERE key = 'receipt_qr_auto_rotate';
  IF _auto_rotate IS NULL THEN _auto_rotate := true; END IF;

  -- Find latest active token for this receipt
  SELECT * INTO _row
  FROM public.receipt_verify_tokens
  WHERE receipt_type = _receipt_type
    AND receipt_id = _receipt_id
    AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Active and within TTL -> return it
    IF (_row.expires_at IS NULL OR _row.expires_at > now())
       AND _row.created_at + make_interval(days => _ttl_days) > now() THEN
      RETURN _row.token;
    END IF;

    -- Aged-out / expired
    IF NOT _auto_rotate THEN
      -- Caller wants no rotation: still return the (now stale) token; verify will say EXPIRED
      RETURN _row.token;
    END IF;

    -- Auto-rotate: revoke the old one
    UPDATE public.receipt_verify_tokens
       SET revoked_at = now()
     WHERE id = _row.id AND revoked_at IS NULL;
  END IF;

  -- Issue a fresh token
  _token := encode(gen_random_bytes(24), 'base64');
  _token := replace(replace(replace(_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.receipt_verify_tokens (token, receipt_type, receipt_id, expires_at)
  VALUES (_token, _receipt_type, _receipt_id, now() + make_interval(days => _ttl_days));

  RETURN _token;
END;
$function$;

-- 3) Manual rotation (admin / accounts staff only)
CREATE OR REPLACE FUNCTION public.rotate_receipt_token(
  _receipt_type text,
  _receipt_id   uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _token    text;
  _ttl_days int;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF _receipt_type NOT IN ('fee_payment', 'parent_payment_request', 'donation', 'salary') THEN
    RAISE EXCEPTION 'Invalid receipt_type';
  END IF;

  SELECT COALESCE(NULLIF(value::text, 'null')::int, 365)
    INTO _ttl_days
    FROM public.app_settings WHERE key = 'receipt_qr_ttl_days';
  IF _ttl_days IS NULL THEN _ttl_days := 365; END IF;

  -- Revoke any active tokens for this receipt
  UPDATE public.receipt_verify_tokens
     SET revoked_at = now()
   WHERE receipt_type = _receipt_type
     AND receipt_id   = _receipt_id
     AND revoked_at IS NULL;

  _token := encode(gen_random_bytes(24), 'base64');
  _token := replace(replace(replace(_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.receipt_verify_tokens (token, receipt_type, receipt_id, expires_at)
  VALUES (_token, _receipt_type, _receipt_id, now() + make_interval(days => _ttl_days));

  RETURN _token;
END;
$function$;

REVOKE ALL ON FUNCTION public.rotate_receipt_token(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rotate_receipt_token(text, uuid) TO authenticated;

-- Migration: 20260501232544_d94989cb-19f2-4a18-8f88-baf938004bda.sql
-- 1) Donor extra columns
ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS nid             text,
  ADD COLUMN IF NOT EXISTS sender_number   text,
  ADD COLUMN IF NOT EXISTS purpose_key     text;

-- 2) Donation purposes (dropdown source)
CREATE TABLE IF NOT EXISTS public.donation_purposes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  label_bn    text NOT NULL,
  label_en    text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_purposes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donation_purposes public read active"
  ON public.donation_purposes FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "donation_purposes admin manage"
  ON public.donation_purposes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Seed common purposes (idempotent)
INSERT INTO public.donation_purposes (key, label_bn, label_en, sort_order) VALUES
  ('general',     'সাধারণ দান',           'General Donation',         10),
  ('zakat',       'যাকাত',                 'Zakat',                    20),
  ('sadaqah',     'সদকা',                  'Sadaqah',                  30),
  ('mosque',      'মসজিদ নির্মাণ',         'Mosque Construction',      40),
  ('madrasa',     'মাদরাসা ভবন',           'Madrasa Building',          50),
  ('education',   'ছাত্রদের শিক্ষা',       'Student Education',        60),
  ('orphan',      'এতিমদের সহায়তা',        'Orphan Support',           70),
  ('iftar',       'ইফতার বিতরণ',           'Iftar Distribution',       80),
  ('qurbani',     'কুরবানি',                'Qurbani',                   90),
  ('other',       'অন্যান্য',               'Other',                    999)
ON CONFLICT (key) DO NOTHING;

-- 3) Verified payments table (admin-seeded successful TrxIDs)
CREATE TABLE IF NOT EXISTS public.verified_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trx_id            text NOT NULL,
  amount            numeric(12,2) NOT NULL CHECK (amount > 0),
  method            text NOT NULL DEFAULT 'bkash',
  sender_number     text,
  note              text,
  consumed_by_donor_id  uuid REFERENCES public.donors(id) ON DELETE SET NULL,
  consumed_at       timestamptz,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_verified_payments_trx
  ON public.verified_payments (lower(trx_id));

CREATE INDEX IF NOT EXISTS idx_verified_payments_unconsumed
  ON public.verified_payments (lower(trx_id)) WHERE consumed_at IS NULL;

ALTER TABLE public.verified_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verified_payments admin manage"
  ON public.verified_payments
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_accounts_staff(auth.uid())
  );
-- No public read policy → anon cannot list this table.

-- 4) RPC to verify a manual donation TrxID
CREATE OR REPLACE FUNCTION public.verify_donation_payment(
  _trx_id text,
  _amount numeric,
  _donor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row public.verified_payments%ROWTYPE;
BEGIN
  IF _trx_id IS NULL OR length(trim(_trx_id)) = 0 THEN
    RETURN jsonb_build_object('matched', false, 'error', 'EMPTY_TRX');
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('matched', false, 'error', 'INVALID_AMOUNT');
  END IF;

  SELECT * INTO _row
  FROM public.verified_payments
  WHERE lower(trx_id) = lower(trim(_trx_id))
    AND amount = _amount
    AND consumed_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'error', 'NO_MATCH');
  END IF;

  UPDATE public.verified_payments
     SET consumed_at = now(),
         consumed_by_donor_id = COALESCE(_donor_id, consumed_by_donor_id)
   WHERE id = _row.id
     AND consumed_at IS NULL;

  RETURN jsonb_build_object(
    'matched', true,
    'verified_payment_id', _row.id,
    'method', _row.method,
    'amount', _row.amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_donation_payment(text, numeric, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_donation_payment(text, numeric, uuid) TO anon, authenticated;

-- 5) Trigger that auto-verifies manual donations on insert/update.
-- Reads TrxID from notes pattern "TrxID: <id>" (matches existing DonationPage code).
CREATE OR REPLACE FUNCTION public.auto_verify_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _trx       text;
  _result    jsonb;
BEGIN
  -- Only act when payment is still pending
  IF NEW.payment_status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Extract TrxID from notes  e.g.  "TrxID: ABC123 | Manual"
  _trx := substring(COALESCE(NEW.notes, '') FROM 'TrxID:\s*([^\s|]+)');
  IF _trx IS NULL OR NEW.donation_amount IS NULL OR NEW.donation_amount <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT public.verify_donation_payment(_trx, NEW.donation_amount, NEW.id) INTO _result;

  IF (_result->>'matched')::boolean THEN
    NEW.payment_status := 'verified';
    NEW.verified_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_verify_donation ON public.donors;
CREATE TRIGGER trg_auto_verify_donation
  BEFORE INSERT OR UPDATE OF notes, donation_amount, payment_status ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.auto_verify_donation();

-- updated_at touch trigger for verified_payments
CREATE OR REPLACE FUNCTION public.touch_verified_payments_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_verified_payments ON public.verified_payments;
CREATE TRIGGER trg_touch_verified_payments
  BEFORE UPDATE ON public.verified_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_verified_payments_updated_at();

-- Migration: 20260501233816_b886298a-565c-4b91-922f-032e6ab01017.sql

-- 1) Rate-limit config: 5 wrong manual donation TrxID attempts / 10 minutes per phone+IP
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, enabled)
VALUES
  ('donation_trx_verify_phone', 5, 600, true),
  ('donation_trx_verify_ip',    20, 600, true)
ON CONFLICT (action) DO UPDATE
  SET max_requests = EXCLUDED.max_requests,
      window_seconds = EXCLUDED.window_seconds,
      enabled = EXCLUDED.enabled;

-- 2) RPC called by /donation manual-submit. Enforces limits server-side and
--    on mismatch leaves the donor row 'pending' + notifies admins.
CREATE OR REPLACE FUNCTION public.verify_donation_attempt(
  _donor_id      uuid,
  _trx_id        text,
  _amount        numeric,
  _phone         text,
  _client_ip     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone_chk  jsonb;
  v_ip_chk     jsonb;
  v_result     jsonb;
  v_matched    boolean;
  v_donor      public.donors%ROWTYPE;
  v_phone_key  text := COALESCE(NULLIF(trim(_phone), ''), 'unknown');
  v_ip_key     text := COALESCE(NULLIF(trim(_client_ip), ''), 'unknown');
BEGIN
  -- Per-phone limit
  v_phone_chk := public.check_rate_limit(v_phone_key, 'phone', 'donation_trx_verify_phone');
  IF (v_phone_chk->>'ok')::boolean = false THEN
    -- Notify admins about lockout
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'Donation TrxID lockout',
      'দান যাচাই লকডাউন',
      format('Phone %s temporarily blocked after too many wrong TrxID attempts. Donor: %s', v_phone_key, _donor_id),
      format('ফোন %s বারবার ভুল TrxID দেওয়ায় সাময়িক ব্লকড। দাতা: %s', v_phone_key, _donor_id),
      'warning', 'donation', '/admin/donors'
    );
    RETURN jsonb_build_object(
      'matched', false, 'rate_limited', true, 'scope', 'phone',
      'retry_after', v_phone_chk->'retry_after'
    );
  END IF;

  -- Per-IP limit
  v_ip_chk := public.check_rate_limit(v_ip_key, 'ip', 'donation_trx_verify_ip');
  IF (v_ip_chk->>'ok')::boolean = false THEN
    RETURN jsonb_build_object(
      'matched', false, 'rate_limited', true, 'scope', 'ip',
      'retry_after', v_ip_chk->'retry_after'
    );
  END IF;

  -- Try to match against verified_payments
  v_result  := public.verify_donation_payment(_trx_id, _amount, _donor_id);
  v_matched := COALESCE((v_result->>'matched')::boolean, false);

  IF v_matched THEN
    UPDATE public.donors
       SET payment_status = 'verified', verified_at = now()
     WHERE id = _donor_id AND payment_status = 'pending';
    RETURN jsonb_build_object('matched', true, 'donor_id', _donor_id);
  END IF;

  -- Mismatch: keep donor 'pending', notify admins (one row per attempt)
  SELECT * INTO v_donor FROM public.donors WHERE id = _donor_id;
  INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
  VALUES (
    'Donation TrxID mismatch',
    'দান TrxID মিল হয়নি',
    format('Donor %s submitted unmatched TrxID "%s" for %s BDT (phone %s). Status remains pending.',
           COALESCE(v_donor.name_bn,'?'), _trx_id, _amount, v_phone_key),
    format('দাতা %s অমিল TrxID "%s" দিয়েছেন (পরিমাণ %s টাকা, ফোন %s)। স্ট্যাটাস pending রইল।',
           COALESCE(v_donor.name_bn,'?'), _trx_id, _amount, v_phone_key),
    'warning', 'donation', '/admin/donors'
  );

  RETURN jsonb_build_object(
    'matched', false, 'reason', v_result->>'error',
    'remaining_attempts', GREATEST(COALESCE((v_phone_chk->>'remaining')::int, 0), 0)
  );
END;
$$;

-- Allow anonymous /donation submitters to call it
GRANT EXECUTE ON FUNCTION public.verify_donation_attempt(uuid, text, numeric, text, text) TO anon, authenticated;


-- Migration: 20260501234940_8d3eeee8-03bc-4e83-8b56-410d11cd5d98.sql
-- Ensure donors.email exists with correct type, validation, and lookup index.
-- Idempotent: safe to run on databases where the column already exists.

-- 1) Add column if missing (no-op when present).
ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS email text;

-- 2) Normalize existing data: trim + lowercase, blank → NULL.
UPDATE public.donors
   SET email = NULLIF(lower(btrim(email)), '')
 WHERE email IS NOT NULL
   AND email IS DISTINCT FROM NULLIF(lower(btrim(email)), '');

-- 3) Length cap (255) + basic RFC-lite format check; allow NULL (optional field).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'donors_email_format_chk'
       AND conrelid = 'public.donors'::regclass
  ) THEN
    ALTER TABLE public.donors
      ADD CONSTRAINT donors_email_format_chk
      CHECK (
        email IS NULL
        OR (
          char_length(email) <= 255
          AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
        )
      ) NOT VALID;
    -- Validate separately so existing bad rows surface as a clear error
    -- without aborting the column-add path.
    BEGIN
      ALTER TABLE public.donors VALIDATE CONSTRAINT donors_email_format_chk;
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'donors_email_format_chk has pre-existing violations; constraint left as NOT VALID. Clean data then run: ALTER TABLE public.donors VALIDATE CONSTRAINT donors_email_format_chk;';
    END;
  END IF;
END $$;

-- 4) Lookup index for case-insensitive search (donor matching, dedupe, admin search).
CREATE INDEX IF NOT EXISTS idx_donors_email_lower
  ON public.donors (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.donors.email IS
  'Optional donor email (lowercased, trimmed, ≤255 chars, RFC-lite format).';


-- Migration: 20260502002005_8b2a1655-ceb3-4113-8dbd-509acee616bb.sql

-- 1) Sync /admin/donors visible_to_roles with all approved roles for this menu.
--    Approved roles for the donor management page (per app routing & RBAC):
--      - super_admin (full bypass)
--      - admin       (default admin access)
--    Note: 'accountant' is a STAFF CATEGORY (job title), not an app_role enum value.
--    Accountant access is enforced via is_accounts_staff() + permission system,
--    not via system_modules.visible_to_roles, so it is intentionally NOT listed here.

UPDATE public.system_modules
SET visible_to_roles = ARRAY['super_admin','admin']::text[],
    updated_at = now()
WHERE menu_path = '/admin/donors';

-- 2) Helper: returns the canonical (approved) role list for a given menu_path.
--    Centralised so future edits stay in one place.
CREATE OR REPLACE FUNCTION public.canonical_module_roles(_menu_path text)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _menu_path
    WHEN '/admin/donors' THEN ARRAY['super_admin','admin']::text[]
    ELSE NULL
  END;
$$;

-- 3) Auto-correction: sanitise visible_to_roles on insert/update so that:
--      a) only valid app_role enum values are stored
--      b) duplicates are removed
--      c) for menu_paths with a canonical list, the array is force-reset to canonical
CREATE OR REPLACE FUNCTION public.sanitize_system_module_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_roles text[];
  cleaned text[];
  canonical text[];
BEGIN
  -- Collect all valid app_role enum values
  SELECT array_agg(e::text)
    INTO valid_roles
  FROM unnest(enum_range(NULL::app_role)) e;

  -- Remove invalid/duplicate roles (preserve order via DISTINCT subquery)
  IF NEW.visible_to_roles IS NOT NULL THEN
    SELECT array_agg(DISTINCT r)
      INTO cleaned
    FROM unnest(NEW.visible_to_roles) r
    WHERE r = ANY(valid_roles);
    NEW.visible_to_roles := COALESCE(cleaned, ARRAY[]::text[]);
  END IF;

  -- If this menu has a canonical role list, force-reset to it
  canonical := public.canonical_module_roles(NEW.menu_path);
  IF canonical IS NOT NULL THEN
    NEW.visible_to_roles := canonical;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_system_module_roles ON public.system_modules;
CREATE TRIGGER trg_sanitize_system_module_roles
BEFORE INSERT OR UPDATE OF visible_to_roles, menu_path
ON public.system_modules
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_system_module_roles();

-- 4) On-demand repair: callable by super_admin to re-sync ALL modules that
--    have a canonical role list. Returns the rows it corrected.
CREATE OR REPLACE FUNCTION public.resync_canonical_module_roles()
RETURNS TABLE(menu_path text, old_roles text[], new_roles text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super_admin can resync module roles';
  END IF;

  RETURN QUERY
  WITH targets AS (
    SELECT sm.id,
           sm.menu_path AS mp,
           sm.visible_to_roles AS old_r,
           public.canonical_module_roles(sm.menu_path) AS new_r
    FROM public.system_modules sm
    WHERE public.canonical_module_roles(sm.menu_path) IS NOT NULL
  ),
  changed AS (
    UPDATE public.system_modules sm
    SET visible_to_roles = t.new_r,
        updated_at = now()
    FROM targets t
    WHERE sm.id = t.id
      AND COALESCE(sm.visible_to_roles, ARRAY[]::text[]) IS DISTINCT FROM t.new_r
    RETURNING sm.menu_path, t.old_r, t.new_r
  )
  SELECT c.menu_path, c.old_r, c.new_r FROM changed c;
END;
$$;

REVOKE ALL ON FUNCTION public.resync_canonical_module_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resync_canonical_module_roles() TO authenticated;


-- Migration: 20260502034249_44991597-081d-43c9-82e9-9b513be6be98.sql
-- Per-path canonical role resync, callable by admin OR super_admin.
-- Returns the diff (added/removed roles) without exposing all modules.
CREATE OR REPLACE FUNCTION public.resync_canonical_module_roles_for_path(_menu_path text)
RETURNS TABLE(
  menu_path text,
  old_roles text[],
  new_roles text[],
  added_roles text[],
  removed_roles text[],
  changed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_canonical text[];
  v_old text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(v_uid, 'super_admin'::app_role)
       OR public.has_role(v_uid, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden: admin or super_admin required' USING ERRCODE = '42501';
  END IF;

  IF _menu_path IS NULL OR length(trim(_menu_path)) = 0 THEN
    RAISE EXCEPTION 'menu_path is required' USING ERRCODE = '22023';
  END IF;

  v_canonical := public.canonical_module_roles(_menu_path);

  IF v_canonical IS NULL THEN
    RAISE EXCEPTION 'No canonical role list defined for path: %', _menu_path
      USING ERRCODE = '22023';
  END IF;

  SELECT sm.visible_to_roles INTO v_old
  FROM public.system_modules sm
  WHERE sm.menu_path = _menu_path;

  IF v_old IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'Module not registered: %', _menu_path USING ERRCODE = 'P0002';
  END IF;

  v_old := COALESCE(v_old, ARRAY[]::text[]);

  -- Apply update only if different
  UPDATE public.system_modules
  SET visible_to_roles = v_canonical,
      updated_at = now()
  WHERE system_modules.menu_path = _menu_path
    AND COALESCE(visible_to_roles, ARRAY[]::text[]) IS DISTINCT FROM v_canonical;

  RETURN QUERY
  SELECT
    _menu_path,
    v_old,
    v_canonical,
    COALESCE(ARRAY(SELECT unnest(v_canonical) EXCEPT SELECT unnest(v_old)), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT unnest(v_old)       EXCEPT SELECT unnest(v_canonical)), ARRAY[]::text[]),
    (COALESCE(v_old, ARRAY[]::text[]) IS DISTINCT FROM v_canonical);
END;
$$;

REVOKE ALL ON FUNCTION public.resync_canonical_module_roles_for_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resync_canonical_module_roles_for_path(text) TO authenticated;

-- Migration: 20260502035219_38f40642-bd6b-4770-b88b-4c2d5fffb0c0.sql
CREATE OR REPLACE FUNCTION public.canonical_module_roles(_menu_path text)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE _menu_path
    WHEN '/admin/donors' THEN ARRAY['super_admin','admin']::text[]
    WHEN '/admin/verified-payments' THEN ARRAY['super_admin','admin']::text[]
    WHEN '/admin/complaints' THEN ARRAY['super_admin','admin']::text[]
    WHEN '/admin/receipts' THEN ARRAY['super_admin','admin','accounts']::text[]
    WHEN '/admin/fee-receipts' THEN ARRAY['super_admin','admin','accounts']::text[]
    ELSE NULL
  END;
$function$;

-- Migration: 20260502040016_1d03f847-1e30-4d75-b08b-94effc1fd1d6.sql
-- =========================================
-- 1) USER DEVICES REGISTRY
-- =========================================
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  label TEXT,
  user_agent TEXT,
  last_ip TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON public.user_devices(user_id, is_active);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own devices" ON public.user_devices;
CREATE POLICY "Users view own devices" ON public.user_devices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users manage own devices" ON public.user_devices;
CREATE POLICY "Users manage own devices" ON public.user_devices
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin delete devices" ON public.user_devices;
CREATE POLICY "Super admin delete devices" ON public.user_devices
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

-- No direct INSERT policy: insertion happens via SECURITY DEFINER RPC only.

CREATE OR REPLACE FUNCTION public.tg_user_devices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_user_devices_updated_at ON public.user_devices;
CREATE TRIGGER trg_user_devices_updated_at
BEFORE UPDATE ON public.user_devices
FOR EACH ROW EXECUTE FUNCTION public.tg_user_devices_updated_at();

-- =========================================
-- 2) SECURITY ALERTS LOG
-- =========================================
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alert_type TEXT NOT NULL, -- 'device_mismatch' | 'unknown_device' | 'revoked_device' | 'missing_device_header'
  severity TEXT NOT NULL DEFAULT 'warn', -- 'info' | 'warn' | 'critical'
  device_id TEXT,
  registered_devices TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  endpoint TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON public.security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON public.security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON public.security_alerts(created_at DESC);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read alerts" ON public.security_alerts;
CREATE POLICY "Admins read alerts" ON public.security_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin delete alerts" ON public.security_alerts;
CREATE POLICY "Super admin delete alerts" ON public.security_alerts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- No INSERT/UPDATE policies: all inserts happen via SECURITY DEFINER RPCs.

-- =========================================
-- 3) DEVICE REGISTRATION (TRUST-ON-FIRST-USE)
-- =========================================
CREATE OR REPLACE FUNCTION public.register_user_device(
  _device_id TEXT,
  _label TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _ip TEXT DEFAULT NULL
) RETURNS public.user_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.user_devices;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    RAISE EXCEPTION 'device_id required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_devices (user_id, device_id, label, user_agent, last_ip)
  VALUES (uid, _device_id, _label, _user_agent, _ip)
  ON CONFLICT (user_id, device_id) DO UPDATE
    SET last_seen_at = now(),
        last_ip = COALESCE(EXCLUDED.last_ip, public.user_devices.last_ip),
        user_agent = COALESCE(EXCLUDED.user_agent, public.user_devices.user_agent),
        is_active = true,
        revoked_at = NULL
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_user_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =========================================
-- 4) DEVICE VERIFICATION (with auto-log)
-- =========================================
CREATE OR REPLACE FUNCTION public.verify_user_device(
  _device_id TEXT,
  _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _endpoint TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  device_row public.user_devices;
  total_devices INT;
  registered_ids TEXT[];
  alert_type TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Missing header
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    INSERT INTO public.security_alerts (user_id, alert_type, severity, ip_address, user_agent, endpoint)
    VALUES (uid, 'missing_device_header', 'warn', _ip, _user_agent, _endpoint);
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_device_header');
  END IF;

  SELECT * INTO device_row
  FROM public.user_devices
  WHERE user_id = uid AND device_id = _device_id
  LIMIT 1;

  SELECT count(*), array_agg(device_id) INTO total_devices, registered_ids
  FROM public.user_devices
  WHERE user_id = uid AND is_active = true;

  -- TRUST-ON-FIRST-USE: if user has no registered devices yet, auto-register this one
  IF total_devices = 0 AND device_row IS NULL THEN
    INSERT INTO public.user_devices (user_id, device_id, user_agent, last_ip)
    VALUES (uid, _device_id, _user_agent, _ip)
    RETURNING * INTO device_row;
    RETURN jsonb_build_object('ok', true, 'reason', 'auto_registered', 'device_id', _device_id);
  END IF;

  -- Unknown device
  IF device_row IS NULL THEN
    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, registered_devices, ip_address, user_agent, endpoint
    ) VALUES (
      uid, 'unknown_device', 'critical', _device_id, registered_ids, _ip, _user_agent, _endpoint
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_device');
  END IF;

  -- Revoked device
  IF NOT device_row.is_active THEN
    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, registered_devices, ip_address, user_agent, endpoint
    ) VALUES (
      uid, 'revoked_device', 'critical', _device_id, registered_ids, _ip, _user_agent, _endpoint
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'revoked_device');
  END IF;

  -- Match: update last seen
  UPDATE public.user_devices
  SET last_seen_at = now(),
      last_ip = COALESCE(_ip, last_ip),
      user_agent = COALESCE(_user_agent, user_agent)
  WHERE id = device_row.id;

  RETURN jsonb_build_object('ok', true, 'reason', 'matched', 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_user_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =========================================
-- 5) ADMIN HELPERS
-- =========================================
CREATE OR REPLACE FUNCTION public.revoke_user_device(_device_uuid UUID)
RETURNS public.user_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.user_devices;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_devices
  SET is_active = false, revoked_at = now()
  WHERE id = _device_uuid
    AND (user_id = uid OR public.has_role(uid, 'admin') OR public.has_role(uid, 'super_admin'))
  RETURNING * INTO rec;

  IF rec IS NULL THEN
    RAISE EXCEPTION 'Device not found or not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_device(UUID) TO authenticated;

-- Migration: 20260502040732_a43a8f0e-4d27-4108-a188-6052753a40da.sql
-- =========================================
-- 1) AUDIT-ROUTE DEVICE ALLOWLIST
-- =========================================
CREATE TABLE IF NOT EXISTS public.authorized_audit_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_id UUID, -- optional binding: if set, only this user on this device passes
  label TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by UUID,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authorized_audit_devices_active
  ON public.authorized_audit_devices(device_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_authorized_audit_devices_user
  ON public.authorized_audit_devices(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.authorized_audit_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit allowlist" ON public.authorized_audit_devices;
CREATE POLICY "Admins read audit allowlist" ON public.authorized_audit_devices
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- No INSERT/UPDATE/DELETE policies — all writes go through SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.tg_audit_devices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_audit_devices_updated_at ON public.authorized_audit_devices;
CREATE TRIGGER trg_audit_devices_updated_at
BEFORE UPDATE ON public.authorized_audit_devices
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_devices_updated_at();

-- =========================================
-- 2) AUDIT DEVICE VERIFICATION RPC
--    Combines: (a) user_devices match  +  (b) audit allowlist match
-- =========================================
CREATE OR REPLACE FUNCTION public.verify_audit_device(
  _device_id TEXT,
  _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _endpoint TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  base_check JSONB;
  allow_row public.authorized_audit_devices;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Step 1: enforce the existing per-user device binding (also logs missing/unknown/revoked)
  base_check := public.verify_user_device(_device_id, _ip, _user_agent, _endpoint);
  IF NOT (base_check->>'ok')::boolean THEN
    RETURN base_check;
  END IF;

  -- Step 2: check audit allowlist
  SELECT * INTO allow_row
  FROM public.authorized_audit_devices
  WHERE device_id = _device_id
    AND is_active = true
    AND (user_id IS NULL OR user_id = uid)
  LIMIT 1;

  IF allow_row IS NULL THEN
    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, ip_address, user_agent, endpoint, details
    ) VALUES (
      uid, 'audit_device_not_allowlisted', 'critical',
      _device_id, _ip, _user_agent, _endpoint,
      jsonb_build_object('reason', 'device not on authorized_audit_devices allowlist')
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'audit_device_not_allowlisted');
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'audit_allowlisted', 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_audit_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =========================================
-- 3) MANAGEMENT RPCS (super_admin only)
-- =========================================
CREATE OR REPLACE FUNCTION public.add_audit_device(
  _device_id TEXT,
  _user_id UUID DEFAULT NULL,
  _label TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
) RETURNS public.authorized_audit_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.authorized_audit_devices;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: super_admin only' USING ERRCODE = '42501';
  END IF;
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    RAISE EXCEPTION 'device_id required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.authorized_audit_devices (device_id, user_id, label, notes, added_by)
  VALUES (_device_id, _user_id, _label, _notes, uid)
  ON CONFLICT (device_id) DO UPDATE
    SET user_id = COALESCE(EXCLUDED.user_id, public.authorized_audit_devices.user_id),
        label = COALESCE(EXCLUDED.label, public.authorized_audit_devices.label),
        notes = COALESCE(EXCLUDED.notes, public.authorized_audit_devices.notes),
        is_active = true,
        revoked_at = NULL,
        revoked_by = NULL
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_audit_device(TEXT, UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_audit_device(_device_uuid UUID)
RETURNS public.authorized_audit_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  rec public.authorized_audit_devices;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: super_admin only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.authorized_audit_devices
  SET is_active = false, revoked_at = now(), revoked_by = uid
  WHERE id = _device_uuid
  RETURNING * INTO rec;

  IF rec IS NULL THEN
    RAISE EXCEPTION 'Device not found' USING ERRCODE = '42704';
  END IF;
  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_audit_device(UUID) TO authenticated;

-- Migration: 20260502042627_a074aee4-2459-4158-91ba-e4366f521e4e.sql

-- ============================================================
-- Advanced Device Management & Security Suite
-- Augments user_devices + adds device_approval_requests
-- ============================================================

-- 1) Extend user_devices with location + device model fields
ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS upazila text,
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS isp text,
  ADD COLUMN IF NOT EXISTS home_country text,
  ADD COLUMN IF NOT EXISTS home_city text,
  ADD COLUMN IF NOT EXISTS home_upazila text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS last_anomaly text,
  ADD COLUMN IF NOT EXISTS last_anomaly_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_devices_status
  ON public.user_devices(approval_status);

-- 2) New table: device_approval_requests
CREATE TABLE IF NOT EXISTS public.device_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  user_agent text,
  device_model text,
  ip_address text,
  country text,
  city text,
  upazila text,
  village text,
  region text,
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dar_status ON public.device_approval_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dar_user ON public.device_approval_requests(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dar_pending
  ON public.device_approval_requests(user_id, device_id) WHERE status = 'pending';

ALTER TABLE public.device_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read approval requests"
  ON public.device_approval_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

CREATE POLICY "Users insert own approval requests"
  ON public.device_approval_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_dar_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_dar_updated_at ON public.device_approval_requests;
CREATE TRIGGER trg_dar_updated_at BEFORE UPDATE ON public.device_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dar_updated_at();

-- 3) Settings flag: require admin approval for new devices
INSERT INTO public.app_settings (key, value)
VALUES ('device_approval_required', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4) RPC: update device location (called from edge fn after IP geo)
CREATE OR REPLACE FUNCTION public.update_device_location(
  _user_id uuid,
  _device_id text,
  _ip text,
  _country text,
  _region text,
  _city text,
  _upazila text,
  _village text,
  _latitude double precision,
  _longitude double precision,
  _isp text,
  _device_model text,
  _os text,
  _browser text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.user_devices;
  _anomaly text := NULL;
  _distance_km double precision;
BEGIN
  SELECT * INTO _row FROM public.user_devices
  WHERE user_id = _user_id AND device_id = _device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'device_not_found');
  END IF;

  -- Anomaly detection: out-of-area (different upazila/city than home)
  IF _row.home_city IS NOT NULL AND _city IS NOT NULL
     AND lower(_row.home_city) <> lower(_city) THEN
    _anomaly := 'out_of_area_city';
  ELSIF _row.home_upazila IS NOT NULL AND _upazila IS NOT NULL
     AND lower(_row.home_upazila) <> lower(_upazila) THEN
    _anomaly := 'out_of_area_upazila';
  ELSIF _row.home_country IS NOT NULL AND _country IS NOT NULL
     AND lower(_row.home_country) <> lower(_country) THEN
    _anomaly := 'out_of_country';
  END IF;

  UPDATE public.user_devices SET
    last_ip = _ip,
    country = _country, region = _region, city = _city,
    upazila = _upazila, village = _village,
    latitude = _latitude, longitude = _longitude, isp = _isp,
    device_model = COALESCE(_device_model, device_model),
    os = COALESCE(_os, os),
    browser = COALESCE(_browser, browser),
    last_seen_at = now(),
    last_anomaly = COALESCE(_anomaly, last_anomaly),
    last_anomaly_at = CASE WHEN _anomaly IS NOT NULL THEN now() ELSE last_anomaly_at END,
    -- TOFU home location on first sighting
    home_country = COALESCE(home_country, _country),
    home_city = COALESCE(home_city, _city),
    home_upazila = COALESCE(home_upazila, _upazila)
  WHERE user_id = _user_id AND device_id = _device_id;

  IF _anomaly IS NOT NULL THEN
    INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
    VALUES (_user_id, 'suspicious_location', 'warn', _device_id, _ip,
      jsonb_build_object(
        'anomaly', _anomaly,
        'observed', jsonb_build_object('country', _country, 'city', _city, 'upazila', _upazila, 'village', _village),
        'home', jsonb_build_object('country', _row.home_country, 'city', _row.home_city, 'upazila', _row.home_upazila)
      ));
  END IF;

  RETURN jsonb_build_object('ok', true, 'anomaly', _anomaly);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_device_location(uuid, text, text, text, text, text, text, text, double precision, double precision, text, text, text, text) TO authenticated;

-- 5) RPC: list staff devices with profile name/email (admin only)
CREATE OR REPLACE FUNCTION public.list_staff_devices()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  device_id text,
  user_name text,
  user_email text,
  label text,
  device_model text,
  os text,
  browser text,
  user_agent text,
  last_ip text,
  country text,
  region text,
  city text,
  upazila text,
  village text,
  latitude double precision,
  longitude double precision,
  isp text,
  is_active boolean,
  approval_status text,
  last_anomaly text,
  last_anomaly_at timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT d.id, d.user_id, d.device_id,
    COALESCE(p.full_name, p.full_name_bn, p.email, '—'),
    p.email,
    d.label, d.device_model, d.os, d.browser, d.user_agent,
    d.last_ip, d.country, d.region, d.city, d.upazila, d.village,
    d.latitude, d.longitude, d.isp,
    d.is_active, d.approval_status, d.last_anomaly, d.last_anomaly_at,
    d.first_seen_at, d.last_seen_at, d.created_at
  FROM public.user_devices d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  ORDER BY d.last_seen_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_staff_devices() TO authenticated;

-- 6) RPC: list pending device approval requests
CREATE OR REPLACE FUNCTION public.list_device_approval_requests(_status text DEFAULT 'pending')
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  device_id text,
  user_agent text,
  device_model text,
  ip_address text,
  country text,
  region text,
  city text,
  upazila text,
  village text,
  status text,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id,
    COALESCE(p.full_name, p.full_name_bn, p.email, '—'),
    p.email,
    r.device_id, r.user_agent, r.device_model, r.ip_address,
    r.country, r.region, r.city, r.upazila, r.village,
    r.status, r.created_at
  FROM public.device_approval_requests r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.status = COALESCE(_status, r.status)
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_device_approval_requests(text) TO authenticated;

-- 7) RPC: approve device request
CREATE OR REPLACE FUNCTION public.approve_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed', 'status', _r.status);
  END IF;

  -- Activate / register device
  INSERT INTO public.user_devices(user_id, device_id, label, user_agent, last_ip,
    device_model, country, region, city, upazila, village, latitude, longitude,
    is_active, approval_status, first_seen_at, last_seen_at)
  VALUES (_r.user_id, _r.device_id,
    COALESCE(_r.device_model, 'Approved device'), _r.user_agent, _r.ip_address,
    _r.device_model, _r.country, _r.region, _r.city, _r.upazila, _r.village,
    _r.latitude, _r.longitude,
    true, 'approved', now(), now())
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    is_active = true, approval_status = 'approved',
    last_ip = EXCLUDED.last_ip, last_seen_at = now(), revoked_at = NULL;

  UPDATE public.device_approval_requests
  SET status = 'approved', reviewed_by = _admin, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_r.user_id, 'device_approved', 'info', _r.device_id, _r.ip_address,
    jsonb_build_object('approved_by', _admin, 'notes', _notes));

  RETURN jsonb_build_object('ok', true, 'request_id', _request_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_device_request(uuid, text) TO authenticated;

-- 8) RPC: reject device request
CREATE OR REPLACE FUNCTION public.reject_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed'); END IF;

  UPDATE public.device_approval_requests
  SET status = 'rejected', reviewed_by = _admin, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_r.user_id, 'device_rejected', 'warn', _r.device_id, _r.ip_address,
    jsonb_build_object('rejected_by', _admin, 'notes', _notes));

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_device_request(uuid, text) TO authenticated;

-- 9) RPC: revoke a staff device (admin one-click)
CREATE OR REPLACE FUNCTION public.revoke_staff_device(_device_uuid uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.user_devices;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.user_devices WHERE id = _device_uuid;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE public.user_devices
  SET is_active = false, approval_status = 'revoked', revoked_at = now()
  WHERE id = _device_uuid;

  -- Also revoke audit allowlist entry if present
  UPDATE public.authorized_audit_devices
  SET is_active = false, revoked_at = now(), revoked_by = _admin
  WHERE device_id = _row.device_id AND is_active = true;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_row.user_id, 'device_revoked', 'critical', _row.device_id, _row.last_ip,
    jsonb_build_object('revoked_by', _admin, 'reason', _reason));

  RETURN jsonb_build_object('ok', true, 'device_id', _row.device_id, 'user_id', _row.user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_staff_device(uuid, text) TO authenticated;

-- 10) RPC: set/update device home location (TOFU lock)
CREATE OR REPLACE FUNCTION public.set_device_home_location(
  _device_uuid uuid, _country text, _city text, _upazila text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.user_devices
  SET home_country = _country, home_city = _city, home_upazila = _upazila
  WHERE id = _device_uuid;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_device_home_location(uuid, text, text, text) TO authenticated;


-- Migration: 20260502053302_1ca1f449-eb4e-45c8-b2b0-caac2401d67f.sql

-- 1. Cooldown setting
INSERT INTO public.app_settings (key, value)
VALUES ('device_reregister_cooldown_hours', '24'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Status helper (no side-effects)
CREATE OR REPLACE FUNCTION public.get_device_reregister_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _hours int;
  _last timestamptz;
  _pending public.device_approval_requests;
  _next timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT COALESCE((value)::int, 24) INTO _hours
  FROM public.app_settings WHERE key = 'device_reregister_cooldown_hours';
  IF _hours IS NULL THEN _hours := 24; END IF;

  SELECT * INTO _pending
  FROM public.device_approval_requests
  WHERE user_id = _uid AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  SELECT MAX(created_at) INTO _last
  FROM public.device_approval_requests
  WHERE user_id = _uid;

  _next := COALESCE(_last, 'epoch'::timestamptz) + make_interval(hours => _hours);

  RETURN jsonb_build_object(
    'ok', true,
    'cooldown_hours', _hours,
    'last_request_at', _last,
    'next_allowed_at', _next,
    'can_request', (_last IS NULL OR now() >= _next),
    'has_pending', (_pending.id IS NOT NULL),
    'pending_status', _pending.status,
    'pending_device_id', _pending.device_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_device_reregister_status() TO authenticated;

-- 3. Request RPC with cooldown enforcement + admin notification
CREATE OR REPLACE FUNCTION public.request_device_reregistration(
  _device_id text,
  _user_agent text DEFAULT NULL,
  _device_model text DEFAULT NULL,
  _ip text DEFAULT NULL,
  _country text DEFAULT NULL,
  _region text DEFAULT NULL,
  _city text DEFAULT NULL,
  _upazila text DEFAULT NULL,
  _village text DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _status jsonb;
  _req_id uuid;
  _hours int;
  _next timestamptz;
  _user_name text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  IF _device_id IS NULL OR length(_device_id) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_device_id');
  END IF;

  _status := public.get_device_reregister_status();
  _hours := COALESCE((_status->>'cooldown_hours')::int, 24);
  _next := (_status->>'next_allowed_at')::timestamptz;

  IF (_status->>'can_request')::boolean = false THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'cooldown_active',
      'next_allowed_at', _next,
      'cooldown_hours', _hours
    );
  END IF;

  -- upsert pending request (one per user+device)
  INSERT INTO public.device_approval_requests(
    user_id, device_id, user_agent, device_model, ip_address,
    country, region, city, upazila, village, latitude, longitude, status
  ) VALUES (
    _uid, _device_id, _user_agent, _device_model, _ip,
    _country, _region, _city, _upazila, _village, _latitude, _longitude, 'pending'
  )
  ON CONFLICT (user_id, device_id) WHERE status = 'pending'
  DO UPDATE SET
    user_agent = EXCLUDED.user_agent,
    device_model = EXCLUDED.device_model,
    ip_address = EXCLUDED.ip_address,
    country = EXCLUDED.country, region = EXCLUDED.region, city = EXCLUDED.city,
    upazila = EXCLUDED.upazila, village = EXCLUDED.village,
    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    updated_at = now()
  RETURNING id INTO _req_id;

  -- security log
  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_uid, 'device_reregistration_requested', 'warning', _device_id, _ip,
    jsonb_build_object(
      'request_id', _req_id, 'city', _city, 'upazila', _upazila, 'village', _village,
      'country', _country, 'device_model', _device_model
    ));

  -- admin notification
  SELECT COALESCE(full_name, email) INTO _user_name FROM public.profiles WHERE id = _uid;

  BEGIN
    INSERT INTO public.notifications(user_id, title, message, category, link, metadata)
    SELECT ur.user_id,
      'নতুন ডিভাইস অনুমোদনের অনুরোধ',
      COALESCE(_user_name, 'একজন ইউজার') || ' একটি নতুন ডিভাইস থেকে এক্সেস চাইছেন (' || COALESCE(_city, _upazila, _village, _country, 'অজানা লোকেশন') || ')',
      'security',
      '/admin/device-management',
      jsonb_build_object(
        'request_id', _req_id, 'requester_id', _uid, 'device_id', _device_id,
        'location', jsonb_build_object('village', _village, 'upazila', _upazila, 'city', _city, 'country', _country)
      )
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','super_admin');
  EXCEPTION WHEN OTHERS THEN
    -- notifications table may differ; never fail the request
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', _req_id,
    'cooldown_hours', _hours,
    'next_allowed_at', now() + make_interval(hours => _hours)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_device_reregistration(
  text, text, text, text, text, text, text, text, text, double precision, double precision
) TO authenticated;

-- 4. Update approve_device_request to rotate (deactivate the user's other active devices)
CREATE OR REPLACE FUNCTION public.approve_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
  _rotated_count int := 0;
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed', 'status', _r.status);
  END IF;

  -- ROTATE: deactivate the user's other active devices (one-active-device policy on re-registration).
  -- Remove from audit allowlist too so old browsers can't continue.
  WITH rotated AS (
    UPDATE public.user_devices
       SET is_active = false,
           approval_status = 'rotated',
           revoked_at = now()
     WHERE user_id = _r.user_id
       AND device_id <> _r.device_id
       AND is_active = true
    RETURNING device_id
  )
  SELECT count(*) INTO _rotated_count FROM rotated;

  DELETE FROM public.authorized_audit_devices
   WHERE user_id = _r.user_id AND device_id <> _r.device_id;

  -- Activate / register the new device
  INSERT INTO public.user_devices(user_id, device_id, label, user_agent, last_ip,
    device_model, country, region, city, upazila, village, latitude, longitude,
    is_active, approval_status, first_seen_at, last_seen_at)
  VALUES (_r.user_id, _r.device_id,
    COALESCE(_r.device_model, 'Approved device'), _r.user_agent, _r.ip_address,
    _r.device_model, _r.country, _r.region, _r.city, _r.upazila, _r.village,
    _r.latitude, _r.longitude,
    true, 'approved', now(), now())
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    is_active = true, approval_status = 'approved',
    last_ip = EXCLUDED.last_ip, last_seen_at = now(), revoked_at = NULL;

  UPDATE public.device_approval_requests
  SET status = 'approved', reviewed_by = _admin, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_r.user_id, 'device_approved', 'info', _r.device_id, _r.ip_address,
    jsonb_build_object('approved_by', _admin, 'notes', _notes, 'rotated_devices', _rotated_count));

  -- Notify the requester
  BEGIN
    INSERT INTO public.notifications(user_id, title, message, category, link)
    VALUES (_r.user_id,
      'আপনার ডিভাইস অনুমোদিত হয়েছে',
      'আপনার নতুন ডিভাইস থেকে এখন সিস্টেম এক্সেস করতে পারবেন।',
      'security', '/admin');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'request_id', _request_id, 'rotated_devices', _rotated_count);
END;
$$;

-- 5. Notify on reject as well
CREATE OR REPLACE FUNCTION public.reject_device_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.device_approval_requests;
  _admin uuid := auth.uid();
BEGIN
  IF NOT (has_role(_admin, 'admin') OR has_role(_admin, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.device_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  UPDATE public.device_approval_requests
  SET status = 'rejected', reviewed_by = _admin, reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  INSERT INTO public.security_alerts(user_id, alert_type, severity, device_id, ip_address, details)
  VALUES (_r.user_id, 'device_rejected', 'warning', _r.device_id, _r.ip_address,
    jsonb_build_object('rejected_by', _admin, 'notes', _notes));

  BEGIN
    INSERT INTO public.notifications(user_id, title, message, category, link)
    VALUES (_r.user_id,
      'ডিভাইস অনুমোদন প্রত্যাখ্যাত',
      COALESCE('কারণ: ' || _notes, 'আপনার ডিভাইস অনুমোদনের অনুরোধ প্রত্যাখ্যাত হয়েছে।'),
      'security', '/admin');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- Migration: 20260502054446_a4cbda53-8cf6-46ec-97ae-056454c1d416.sql

-- ============================================================
-- 1) blocked_devices: permanent blocklist
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocked_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  reason TEXT NOT NULL,
  last_ip TEXT,
  last_country TEXT,
  last_city TEXT,
  last_upazila TEXT,
  last_village TEXT,
  last_user_agent TEXT,
  attempt_count INT NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_by UUID,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unblocked_by UUID,
  unblocked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_devices_active
  ON public.blocked_devices (device_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blocked_devices_user ON public.blocked_devices (user_id);

ALTER TABLE public.blocked_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read blocked devices"
  ON public.blocked_devices FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_blocked_devices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_blocked_devices_updated_at
  BEFORE UPDATE ON public.blocked_devices
  FOR EACH ROW EXECUTE FUNCTION public.tg_blocked_devices_updated_at();

-- ============================================================
-- 2) device_route_allowlist: per-route approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.device_route_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  route_path TEXT NOT NULL,
  user_id UUID,
  approved_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, route_path)
);

CREATE INDEX IF NOT EXISTS idx_device_route_allowlist_lookup
  ON public.device_route_allowlist (device_id, route_path) WHERE is_active = true;

ALTER TABLE public.device_route_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read route allowlist"
  ON public.device_route_allowlist FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_device_route_allowlist_updated_at
  BEFORE UPDATE ON public.device_route_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.tg_blocked_devices_updated_at();

-- ============================================================
-- 3) Updated verify_audit_device: respects blocklist + route allowlist
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_audit_device(
  _device_id TEXT,
  _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _endpoint TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  base_check JSONB;
  allow_row public.authorized_audit_devices;
  blocked_row public.blocked_devices;
  route_row public.device_route_allowlist;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Hard block: blocklisted devices never pass
  SELECT * INTO blocked_row
  FROM public.blocked_devices
  WHERE device_id = _device_id AND is_active = true
  LIMIT 1;

  IF blocked_row.id IS NOT NULL THEN
    UPDATE public.blocked_devices
       SET attempt_count = attempt_count + 1,
           last_attempt_at = now(),
           last_ip = COALESCE(_ip, last_ip),
           last_user_agent = COALESCE(_user_agent, last_user_agent)
     WHERE id = blocked_row.id;

    INSERT INTO public.security_alerts (
      user_id, alert_type, severity, device_id, ip_address, user_agent, endpoint, details
    ) VALUES (
      uid, 'blocked_device_attempt', 'critical',
      _device_id, _ip, _user_agent, _endpoint,
      jsonb_build_object('reason', blocked_row.reason)
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'device_blocked', 'block_reason', blocked_row.reason);
  END IF;

  -- Step 1: per-user device binding
  base_check := public.verify_user_device(_device_id, _ip, _user_agent, _endpoint);
  IF NOT (base_check->>'ok')::boolean THEN
    RETURN base_check;
  END IF;

  -- Step 2a: full audit allowlist
  SELECT * INTO allow_row
  FROM public.authorized_audit_devices
  WHERE device_id = _device_id
    AND is_active = true
    AND (user_id IS NULL OR user_id = uid)
  LIMIT 1;

  IF allow_row.id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'audit_allowlisted', 'device_id', _device_id);
  END IF;

  -- Step 2b: route-specific allowlist (when an endpoint/path is supplied)
  IF _endpoint IS NOT NULL THEN
    SELECT * INTO route_row
    FROM public.device_route_allowlist
    WHERE device_id = _device_id
      AND is_active = true
      AND (user_id IS NULL OR user_id = uid)
      AND (
        route_path = _endpoint
        OR _endpoint LIKE route_path || '%'
      )
    LIMIT 1;

    IF route_row.id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'reason', 'route_allowlisted', 'device_id', _device_id, 'route', route_row.route_path);
    END IF;
  END IF;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, ip_address, user_agent, endpoint, details
  ) VALUES (
    uid, 'audit_device_not_allowlisted', 'critical',
    _device_id, _ip, _user_agent, _endpoint,
    jsonb_build_object('reason', 'device not on authorized_audit_devices allowlist')
  );
  RETURN jsonb_build_object('ok', false, 'reason', 'audit_device_not_allowlisted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_audit_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 4) RPC: list blocked-device candidates (auto-flagged + actually blocked)
--    Aggregates security_alerts that look like 403/device-deny events,
--    joined with blocked_devices status.
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_blocked_device_attempts(
  _search TEXT DEFAULT NULL,
  _only_blocked BOOLEAN DEFAULT false,
  _limit INT DEFAULT 200
) RETURNS TABLE (
  device_id TEXT,
  user_id UUID,
  reason TEXT,
  alert_type TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  upazila TEXT,
  village TEXT,
  attempt_count BIGINT,
  last_attempt_at TIMESTAMPTZ,
  is_blocked BOOLEAN,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  user_agent TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH alerts_agg AS (
    SELECT
      sa.device_id,
      MAX(sa.user_id) AS user_id,
      MAX(sa.alert_type) AS alert_type,
      COUNT(*) AS attempt_count,
      MAX(sa.created_at) AS last_attempt_at,
      (ARRAY_AGG(sa.ip_address ORDER BY sa.created_at DESC) FILTER (WHERE sa.ip_address IS NOT NULL))[1] AS ip_address,
      (ARRAY_AGG(sa.user_agent ORDER BY sa.created_at DESC) FILTER (WHERE sa.user_agent IS NOT NULL))[1] AS user_agent
    FROM public.security_alerts sa
    WHERE sa.device_id IS NOT NULL
      AND sa.alert_type IN (
        'device_mismatch','unknown_device','revoked_device','missing_device_header',
        'audit_device_not_allowlisted','blocked_device_attempt'
      )
    GROUP BY sa.device_id
  ),
  loc AS (
    SELECT DISTINCT ON (ud.device_id)
      ud.device_id, ud.country, ud.city, ud.upazila, ud.village
    FROM public.user_devices ud
    ORDER BY ud.device_id, ud.last_seen_at DESC NULLS LAST
  )
  SELECT
    a.device_id,
    a.user_id,
    CASE
      WHEN bd.id IS NOT NULL THEN bd.reason
      WHEN a.alert_type = 'device_mismatch' THEN 'Device Mismatch'
      WHEN a.alert_type = 'unknown_device' THEN 'Unknown Device'
      WHEN a.alert_type = 'revoked_device' THEN 'Revoked Device'
      WHEN a.alert_type = 'missing_device_header' THEN 'Missing Device Header'
      WHEN a.alert_type = 'audit_device_not_allowlisted' THEN 'Unauthorized Audit Route Access'
      WHEN a.alert_type = 'blocked_device_attempt' THEN 'Blocked Device Attempt'
      ELSE a.alert_type
    END AS reason,
    a.alert_type,
    a.ip_address,
    loc.country, loc.city, loc.upazila, loc.village,
    a.attempt_count,
    a.last_attempt_at,
    (bd.id IS NOT NULL) AS is_blocked,
    bd.reason AS blocked_reason,
    bd.blocked_at,
    a.user_agent
  FROM alerts_agg a
  LEFT JOIN public.blocked_devices bd ON bd.device_id = a.device_id AND bd.is_active = true
  LEFT JOIN loc ON loc.device_id = a.device_id
  WHERE
    (NOT _only_blocked OR bd.id IS NOT NULL)
    AND (
      _search IS NULL OR _search = ''
      OR a.device_id ILIKE '%' || _search || '%'
      OR COALESCE(a.ip_address,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.city,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.upazila,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.village,'') ILIKE '%' || _search || '%'
      OR COALESCE(loc.country,'') ILIKE '%' || _search || '%'
    )
  ORDER BY a.last_attempt_at DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_blocked_device_attempts(TEXT, BOOLEAN, INT) TO authenticated;

-- ============================================================
-- 5) RPC: permanent_block_device
-- ============================================================
CREATE OR REPLACE FUNCTION public.permanent_block_device(
  _device_id TEXT,
  _reason TEXT,
  _notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  loc RECORD;
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _device_id IS NULL OR length(trim(_device_id)) = 0 THEN
    RAISE EXCEPTION 'device_id required';
  END IF;

  SELECT ud.user_id, ud.last_ip, ud.country, ud.city, ud.upazila, ud.village, ud.user_agent
    INTO loc
    FROM public.user_devices ud
    WHERE ud.device_id = _device_id
    ORDER BY ud.last_seen_at DESC NULLS LAST
    LIMIT 1;

  INSERT INTO public.blocked_devices (
    device_id, user_id, reason, notes,
    last_ip, last_country, last_city, last_upazila, last_village, last_user_agent,
    blocked_by
  ) VALUES (
    _device_id, loc.user_id, _reason, _notes,
    loc.last_ip, loc.country, loc.city, loc.upazila, loc.village, loc.user_agent,
    uid
  )
  ON CONFLICT (device_id) DO UPDATE
    SET is_active = true,
        reason = EXCLUDED.reason,
        notes = COALESCE(EXCLUDED.notes, public.blocked_devices.notes),
        blocked_by = uid,
        blocked_at = now(),
        unblocked_by = NULL,
        unblocked_at = NULL,
        updated_at = now();

  -- Cascade: deactivate user_devices + remove from audit allowlist + remove route grants
  UPDATE public.user_devices
     SET is_active = false, revoked_at = now(), approval_status = 'blocked'
   WHERE device_id = _device_id AND is_active = true;

  UPDATE public.authorized_audit_devices
     SET is_active = false, revoked_at = now(), revoked_by = uid
   WHERE device_id = _device_id AND is_active = true;

  UPDATE public.device_route_allowlist
     SET is_active = false
   WHERE device_id = _device_id AND is_active = true;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, details
  ) VALUES (
    uid, 'device_permanently_blocked', 'critical', _device_id,
    jsonb_build_object('reason', _reason, 'notes', _notes)
  );

  RETURN jsonb_build_object('ok', true, 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.permanent_block_device(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 6) RPC: unblock_device
-- ============================================================
CREATE OR REPLACE FUNCTION public.unblock_device(
  _device_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.blocked_devices
     SET is_active = false,
         unblocked_by = uid,
         unblocked_at = now(),
         updated_at = now()
   WHERE device_id = _device_id AND is_active = true;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, details
  ) VALUES (
    uid, 'device_unblocked', 'warn', _device_id,
    jsonb_build_object('action', 'unblock')
  );

  RETURN jsonb_build_object('ok', true, 'device_id', _device_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unblock_device(TEXT) TO authenticated;

-- ============================================================
-- 7) RPC: approve_device_for_routes
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_device_for_routes(
  _device_id TEXT,
  _routes TEXT[],
  _notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  r TEXT;
  target_user UUID;
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _routes IS NULL OR array_length(_routes, 1) IS NULL THEN
    RAISE EXCEPTION 'routes required';
  END IF;

  SELECT ud.user_id INTO target_user
    FROM public.user_devices ud
    WHERE ud.device_id = _device_id
    ORDER BY ud.last_seen_at DESC NULLS LAST
    LIMIT 1;

  FOREACH r IN ARRAY _routes LOOP
    INSERT INTO public.device_route_allowlist (device_id, route_path, user_id, approved_by, notes)
    VALUES (_device_id, r, target_user, uid, _notes)
    ON CONFLICT (device_id, route_path) DO UPDATE
      SET is_active = true,
          approved_by = uid,
          notes = COALESCE(EXCLUDED.notes, public.device_route_allowlist.notes),
          updated_at = now();
  END LOOP;

  INSERT INTO public.security_alerts (
    user_id, alert_type, severity, device_id, details
  ) VALUES (
    uid, 'device_route_approved', 'info', _device_id,
    jsonb_build_object('routes', _routes)
  );

  -- Notify the staff
  IF target_user IS NOT NULL THEN
    notif_title := 'ডিভাইস অনুমোদিত';
    notif_body := 'আপনার ডিভাইসটি নির্দিষ্ট রুটের জন্য অনুমোদন করা হয়েছে: ' || array_to_string(_routes, ', ');
    BEGIN
      INSERT INTO public.notifications (user_id, title, body, category, link)
      VALUES (target_user, notif_title, notif_body, 'security', '/admin');
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'routes', _routes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_device_for_routes(TEXT, TEXT[], TEXT) TO authenticated;

-- ============================================================
-- 8) RPC: revoke_device_route_approval
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_device_route_approval(
  _device_id TEXT,
  _route_path TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF NOT has_role(uid, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.device_route_allowlist
     SET is_active = false, updated_at = now()
   WHERE device_id = _device_id AND route_path = _route_path AND is_active = true;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_device_route_approval(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 9) RPC: list per-device active route approvals (helper for UI)
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_device_route_approvals(_device_id TEXT)
RETURNS TABLE (route_path TEXT, approved_by UUID, created_at TIMESTAMPTZ, notes TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT dra.route_path, dra.approved_by, dra.created_at, dra.notes
    FROM public.device_route_allowlist dra
   WHERE dra.device_id = _device_id AND dra.is_active = true
   ORDER BY dra.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_device_route_approvals(TEXT) TO authenticated;


-- Migration: 20260502185025_a9e8c780-0823-44bb-8c42-f90d2d8532c1.sql

-- 1) History table
CREATE TABLE IF NOT EXISTS public.device_block_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('block','unblock')),
  reason TEXT NOT NULL,
  notes TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  upazila TEXT,
  village TEXT,
  user_agent TEXT,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_block_history_device
  ON public.device_block_history (device_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_block_history_user
  ON public.device_block_history (user_id, performed_at DESC);

ALTER TABLE public.device_block_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view device block history" ON public.device_block_history;
CREATE POLICY "Admins can view device block history"
  ON public.device_block_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 2) Updated unblock_device: requires reason, logs history
CREATE OR REPLACE FUNCTION public.unblock_device(
  _device_id TEXT,
  _reason TEXT,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  blocked_row public.blocked_devices;
BEGIN
  IF uid IS NULL OR NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'Reason is required (min 5 chars)' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO blocked_row
  FROM public.blocked_devices
  WHERE device_id = _device_id AND is_active = true
  LIMIT 1;

  UPDATE public.blocked_devices
     SET is_active = false,
         unblocked_by = uid,
         unblocked_at = now(),
         notes = COALESCE(_notes, notes)
   WHERE device_id = _device_id AND is_active = true;

  INSERT INTO public.device_block_history (
    device_id, user_id, action, reason, notes,
    ip_address, country, city, upazila, village, user_agent, performed_by
  ) VALUES (
    _device_id,
    blocked_row.user_id,
    'unblock',
    btrim(_reason),
    _notes,
    blocked_row.last_ip,
    blocked_row.last_country,
    blocked_row.last_city,
    blocked_row.last_upazila,
    blocked_row.last_village,
    blocked_row.last_user_agent,
    uid
  );

  INSERT INTO public.security_logs (user_id, event_type, severity, target_id, metadata)
  VALUES (
    uid, 'device_unblocked', 'warn', _device_id,
    jsonb_build_object('action','unblock','reason', btrim(_reason))
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.unblock_device(TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.unblock_device(TEXT, TEXT, TEXT) TO authenticated;

-- Drop the older 1-arg signature if it still exists
DROP FUNCTION IF EXISTS public.unblock_device(TEXT);

-- 3) Hook permanent_block_device to also write history
CREATE OR REPLACE FUNCTION public.permanent_block_device(
  _device_id TEXT,
  _reason TEXT,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  alert_row public.security_alerts;
  target_user UUID;
BEGIN
  IF uid IS NULL OR NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _reason IS NULL OR length(btrim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO alert_row
  FROM public.security_alerts
  WHERE device_id = _device_id
  ORDER BY created_at DESC
  LIMIT 1;

  target_user := alert_row.user_id;

  INSERT INTO public.blocked_devices (
    device_id, user_id, reason, notes,
    last_ip, last_country, last_city, last_upazila, last_village, last_user_agent,
    attempt_count, last_attempt_at, blocked_by, blocked_at, is_active
  ) VALUES (
    _device_id, target_user, btrim(_reason), _notes,
    alert_row.ip_address, alert_row.country, alert_row.city, alert_row.upazila, alert_row.village, alert_row.user_agent,
    1, COALESCE(alert_row.created_at, now()), uid, now(), true
  )
  ON CONFLICT (device_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        notes = COALESCE(EXCLUDED.notes, public.blocked_devices.notes),
        blocked_by = EXCLUDED.blocked_by,
        blocked_at = now(),
        unblocked_by = NULL,
        unblocked_at = NULL,
        is_active = true,
        updated_at = now();

  -- Cascade: deactivate user_devices and remove from audit allowlist + route allowlist
  UPDATE public.user_devices
     SET is_active = false, approval_status = 'blocked', revoked_at = now()
   WHERE device_id = _device_id;

  DELETE FROM public.authorized_audit_devices WHERE device_id = _device_id;
  DELETE FROM public.device_route_allowlist WHERE device_id = _device_id;

  INSERT INTO public.device_block_history (
    device_id, user_id, action, reason, notes,
    ip_address, country, city, upazila, village, user_agent, performed_by
  ) VALUES (
    _device_id, target_user, 'block', btrim(_reason), _notes,
    alert_row.ip_address, alert_row.country, alert_row.city, alert_row.upazila, alert_row.village, alert_row.user_agent, uid
  );

  INSERT INTO public.security_logs (user_id, event_type, severity, target_id, metadata)
  VALUES (
    uid, 'device_blocked', 'warn', _device_id,
    jsonb_build_object('action','block','reason', btrim(_reason))
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.permanent_block_device(TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.permanent_block_device(TEXT, TEXT, TEXT) TO authenticated;

-- 4) Helper to fetch history for a device
CREATE OR REPLACE FUNCTION public.list_device_block_history(_device_id TEXT, _limit INT DEFAULT 50)
RETURNS SETOF public.device_block_history
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.device_block_history
  WHERE device_id = _device_id
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'super_admin'::app_role)
    )
  ORDER BY performed_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
$$;

REVOKE ALL ON FUNCTION public.list_device_block_history(TEXT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.list_device_block_history(TEXT, INT) TO authenticated;


-- Migration: 20260502185949_5cc1044f-d0de-4b1e-97e6-e8e2a0157ab6.sql
-- Tighten SELECT policies on payments and fee_payments
-- Replaces "Anyone can view" with role/permission-scoped access.
-- Public callers that need data continue to work via:
--  * Edge functions (service role bypasses RLS): process-payment, payment-webhook
--  * /parent (anon) → uses new SECURITY DEFINER RPC get_parent_fee_payments
--  * /donation (anon INSERT) → unchanged; SELECT not required

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;

CREATE POLICY "Authorized roles can view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/payments', 'view')
  OR has_menu_permission(auth.uid(), '/admin/donors', 'view')
  OR has_menu_permission(auth.uid(), '/admin/verified-payments', 'view')
);

-- ============================================================
-- fee_payments
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view fee payments" ON public.fee_payments;

CREATE POLICY "Authorized roles can view fee_payments"
ON public.fee_payments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/fees', 'view')
  OR has_menu_permission(auth.uid(), '/admin/fee-collection', 'view')
  OR has_menu_permission(auth.uid(), '/admin/students-fees', 'view')
  OR has_menu_permission(auth.uid(), '/admin/fee-receipts', 'view')
);

-- ============================================================
-- RPC for unauthenticated parent portal to fetch a student's fee history.
-- Caller passes their parent_account_id; we verify linkage server-side.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_parent_fee_payments(
  _parent_account_id uuid,
  _student_uuid uuid
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  fee_type_id uuid,
  amount numeric,
  paid_amount numeric,
  month text,
  year integer,
  status text,
  paid_at timestamptz,
  receipt_number text,
  created_at timestamptz,
  fee_type_name text,
  fee_type_name_bn text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _linked boolean;
BEGIN
  IF _parent_account_id IS NULL OR _student_uuid IS NULL THEN
    RAISE EXCEPTION 'parent account and student required';
  END IF;

  -- Verify the parent account actually has access to this student
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_accounts pa
    WHERE pa.id = _parent_account_id
      AND _student_uuid = ANY(COALESCE(pa.linked_student_uuids, ARRAY[]::uuid[]))
  ) INTO _linked;

  IF NOT _linked THEN
    RAISE EXCEPTION 'access denied: student not linked to this parent account';
  END IF;

  RETURN QUERY
  SELECT
    fp.id,
    fp.student_id,
    fp.fee_type_id,
    fp.amount,
    fp.paid_amount,
    fp.month,
    fp.year,
    fp.status,
    fp.paid_at,
    fp.receipt_number,
    fp.created_at,
    ft.name        AS fee_type_name,
    ft.name_bn     AS fee_type_name_bn
  FROM public.fee_payments fp
  LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
  WHERE fp.student_id = _student_uuid
    AND fp.deleted_at IS NULL
  ORDER BY fp.paid_at DESC NULLS LAST, fp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_fee_payments(uuid, uuid) TO anon, authenticated;

-- Migration: 20260502192631_6229459c-1857-4484-89ba-577959aa676b.sql
-- 1. parent_accounts
DROP POLICY IF EXISTS "Public can read parent accounts" ON public.parent_accounts;
CREATE POLICY "Admins can read parent accounts"
  ON public.parent_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2. otp_codes
DROP POLICY IF EXISTS "Anyone can select own otp by email" ON public.otp_codes;

-- 3. donors
DROP POLICY IF EXISTS "Anyone can view donors" ON public.donors;
CREATE POLICY "Authorized roles can view donors"
  ON public.donors FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/donors'::text, 'view'::text)
  );

-- 4. smtp_config
DROP POLICY IF EXISTS "Anyone can view smtp_config" ON public.smtp_config;
DROP POLICY IF EXISTS "Authenticated users can view smtp_config" ON public.smtp_config;
CREATE POLICY "Admins only can view smtp_config"
  ON public.smtp_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 5. emailjs_config
DROP POLICY IF EXISTS "Anyone can view emailjs_config" ON public.emailjs_config;
CREATE POLICY "Admins only can view emailjs_config"
  ON public.emailjs_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_emailjs_public_key()
RETURNS TABLE(service_id text, template_id text, public_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT service_id, template_id, public_key
  FROM public.emailjs_config
  ORDER BY created_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_emailjs_public_key() TO anon, authenticated;

-- 6. staff
DROP POLICY IF EXISTS "Anyone can view staff" ON public.staff;

CREATE OR REPLACE FUNCTION public.list_staff_directory()
RETURNS TABLE(
  id uuid, name_bn text, name_en text, designation text,
  photo_url text, staff_category text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name_bn, name_en, designation, photo_url, staff_category
  FROM public.staff
  WHERE COALESCE(status, 'active') = 'active' AND deleted_at IS NULL
  ORDER BY name_bn NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.list_staff_directory() TO anon, authenticated;

-- 7. students
DROP POLICY IF EXISTS "Public can view minimal student info" ON public.students;
DROP POLICY IF EXISTS "Public can view student basic info" ON public.students;

CREATE OR REPLACE FUNCTION public.lookup_student_for_fee(
  p_reg_no text, p_dob text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, name_bn text, name_en text, student_id text,
  roll_number text, registration_no text, class_id uuid,
  session_id uuid, division_id uuid, photo_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name_bn, name_en, student_id, roll_number, registration_no,
         class_id, session_id, division_id, photo_url
  FROM public.students
  WHERE deleted_at IS NULL
    AND COALESCE(status, 'active') = 'active'
    AND (registration_no = p_reg_no OR student_id = p_reg_no OR birth_reg_no = p_reg_no)
    AND (p_dob IS NULL OR p_dob = '' OR date_of_birth::text = p_dob)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_student_for_fee(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_student_admission(p_reg_no text)
RETURNS TABLE(
  id uuid, roll_number text, registration_no text,
  admission_session text, student_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, roll_number, registration_no, admission_session, student_id
  FROM public.students
  WHERE deleted_at IS NULL AND birth_reg_no = p_reg_no
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_student_admission(text) TO anon, authenticated;

-- 8. payments / fee_payments
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view fee_payments" ON public.fee_payments;

-- 9. salary_savings
DROP POLICY IF EXISTS "Authenticated users can view salary_savings" ON public.salary_savings;
DROP POLICY IF EXISTS "Authenticated users can view salary_savings_ledger" ON public.salary_savings_ledger;

CREATE POLICY "Admins or self can view salary_savings"
  ON public.salary_savings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/salary'::text, 'view'::text)
    OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins or self can view salary_savings_ledger"
  ON public.salary_savings_ledger FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/salary'::text, 'view'::text)
    OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

-- 10. attendance_records
DROP POLICY IF EXISTS "Anyone can view attendance_records" ON public.attendance_records;
CREATE POLICY "Authorized roles can view attendance_records"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/attendance'::text, 'view'::text)
    OR public.has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'view'::text)
    OR (entity_type = 'staff' AND entity_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()))
  );

-- 11. hostel_allocations
DROP POLICY IF EXISTS "Public read allocations" ON public.hostel_allocations;
CREATE POLICY "Authorized roles can view hostel_allocations"
  ON public.hostel_allocations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'view'::text)
  );

-- 12. meeting_provider_settings
DROP POLICY IF EXISTS "Anyone can view meeting provider settings" ON public.meeting_provider_settings;
CREATE POLICY "Authenticated users can view meeting provider settings"
  ON public.meeting_provider_settings FOR SELECT TO authenticated USING (true);

-- 13. committee_members
DROP POLICY IF EXISTS "Public can view committee members" ON public.committee_members;
CREATE POLICY "Authenticated users can view committee members"
  ON public.committee_members FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.list_committee_members_public(p_committee_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, committee_id uuid, name text, name_en text,
  designation text, designation_en text, photo_url text, sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, committee_id, name, name_en, designation, designation_en, photo_url, sort_order
  FROM public.committee_members
  WHERE deleted_at IS NULL
    AND (p_committee_id IS NULL OR committee_id = p_committee_id)
  ORDER BY sort_order NULLS LAST, name;
$$;
GRANT EXECUTE ON FUNCTION public.list_committee_members_public(uuid) TO anon, authenticated;

-- 14. online_exam_attempts/answers
DROP POLICY IF EXISTS "Anyone can view exam attempts" ON public.online_exam_attempts;
DROP POLICY IF EXISTS "Anyone can view exam answers" ON public.online_exam_answers;

CREATE POLICY "Owner or admin can view exam attempts"
  ON public.online_exam_attempts FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "Owner or admin can view exam answers"
  ON public.online_exam_answers FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  );

-- 15. website-assets storage bucket
DROP POLICY IF EXISTS "Authenticated upload website assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update website assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete website assets" ON storage.objects;

CREATE POLICY "Admins can upload website assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'website-assets'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Admins can update website assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'website-assets'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Admins can delete website assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'website-assets'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

-- 16. global timezone default (value is JSON)
INSERT INTO public.app_settings (key, value, description)
VALUES ('app_timezone', to_jsonb('Asia/Dhaka'::text), 'Default global timezone for the app')
ON CONFLICT (key) DO NOTHING;

-- 17. Fix function search_path mutable warnings
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.schema, r.name, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;


-- Migration: 20260502193620_e007405e-0720-4ecc-8819-a2fbe6d068cf.sql
-- 1. Add metadata columns
ALTER TABLE public.rate_limit_config
  ADD COLUMN IF NOT EXISTS label_bn text,
  ADD COLUMN IF NOT EXISTS label_en text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_user_managed boolean NOT NULL DEFAULT false;

-- 2. Backfill labels/categories/scopes for known keys
UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'ইউজার তৈরি (প্রতি অ্যাডমিন/মিনিট)', label_en = 'User Create (per admin / minute)'
WHERE action = 'user_create_admin';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'ইউজার তৈরি (প্রতি অ্যাডমিন/ঘণ্টা)', label_en = 'User Create (per admin / hour)'
WHERE action = 'user_create_admin_hourly';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'ইউজার তৈরি (প্রতি IP/মিনিট)', label_en = 'User Create (per IP / minute)'
WHERE action = 'user_create_ip';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'ইউজার তৈরি (প্রতি IP/ঘণ্টা)', label_en = 'User Create (per IP / hour)'
WHERE action = 'user_create_ip_hourly';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'সংবেদনশীল কাজ (প্রতি অ্যাডমিন/মিনিট)', label_en = 'Sensitive action (per admin / minute)'
WHERE action = 'user_sensitive_admin';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'admin',
  label_bn = 'সংবেদনশীল কাজ (প্রতি অ্যাডমিন/ঘণ্টা)', label_en = 'Sensitive action (per admin / hour)'
WHERE action = 'user_sensitive_admin_hourly';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'সংবেদনশীল কাজ (প্রতি IP/মিনিট)', label_en = 'Sensitive action (per IP / minute)'
WHERE action = 'user_sensitive_ip';

UPDATE public.rate_limit_config SET
  category = 'user_management', scope = 'ip',
  label_bn = 'সংবেদনশীল কাজ (প্রতি IP/ঘণ্টা)', label_en = 'Sensitive action (per IP / hour)'
WHERE action = 'user_sensitive_ip_hourly';

UPDATE public.rate_limit_config SET category='otp', scope='email',
  label_bn='OTP পাঠানো (প্রতি ইমেইল/মিনিট)', label_en='OTP Send (per email / minute)'
WHERE action='otp_send_email';
UPDATE public.rate_limit_config SET category='otp', scope='ip',
  label_bn='OTP পাঠানো (প্রতি IP/মিনিট)', label_en='OTP Send (per IP / minute)'
WHERE action='otp_send_ip';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP পাঠানো (প্রতি মোবাইল/মিনিট)', label_en='OTP Send (per phone / minute)'
WHERE action='otp_send_phone';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP পাঠানো (প্রতি মোবাইল/ঘণ্টা)', label_en='OTP Send (per phone / hour)'
WHERE action='otp_send_phone_hourly';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP পাঠানো (প্রতি ইউজার/মিনিট)', label_en='OTP Send (per user / minute)'
WHERE action='otp_send_user';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP পাঠানো (প্রতি ইউজার/ঘণ্টা)', label_en='OTP Send (per user / hour)'
WHERE action='otp_send_user_hourly';
UPDATE public.rate_limit_config SET category='otp', scope='email',
  label_bn='OTP যাচাই (প্রতি ইমেইল/মিনিট)', label_en='OTP Verify (per email / minute)'
WHERE action='otp_verify_email';
UPDATE public.rate_limit_config SET category='otp', scope='ip',
  label_bn='OTP যাচাই (প্রতি IP/মিনিট)', label_en='OTP Verify (per IP / minute)'
WHERE action='otp_verify_ip';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP যাচাই (প্রতি মোবাইল/মিনিট)', label_en='OTP Verify (per phone / minute)'
WHERE action='otp_verify_phone';
UPDATE public.rate_limit_config SET category='otp', scope='phone',
  label_bn='OTP যাচাই (প্রতি মোবাইল/ঘণ্টা)', label_en='OTP Verify (per phone / hour)'
WHERE action='otp_verify_phone_hourly';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP যাচাই (প্রতি ইউজার/মিনিট)', label_en='OTP Verify (per user / minute)'
WHERE action='otp_verify_user';
UPDATE public.rate_limit_config SET category='otp', scope='user',
  label_bn='OTP যাচাই (প্রতি ইউজার/ঘণ্টা)', label_en='OTP Verify (per user / hour)'
WHERE action='otp_verify_user_hourly';

UPDATE public.rate_limit_config SET category='donation', scope='ip',
  label_bn='অনুদান TrxID যাচাই (প্রতি IP)', label_en='Donation TrxID verify (per IP)'
WHERE action='donation_trx_verify_ip';
UPDATE public.rate_limit_config SET category='donation', scope='phone',
  label_bn='অনুদান TrxID যাচাই (প্রতি মোবাইল)', label_en='Donation TrxID verify (per phone)'
WHERE action='donation_trx_verify_phone';

UPDATE public.rate_limit_config SET category='admin_ops', scope='admin',
  label_bn='ডুপ্লিকেট চেক (প্রতি অ্যাডমিন)', label_en='Duplicate check (per admin)'
WHERE action='duplicate_check';

-- 3. Seed new keys
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, enabled, description, category, scope, label_bn, label_en, is_user_managed)
VALUES
  ('test_email_send', 5, 3600, true, 'টেস্ট ইমেইল পাঠানোর সীমা (প্রতি অ্যাডমিন/ঘণ্টা)', 'test_email', 'admin',
   'টেস্ট ইমেইল (প্রতি অ্যাডমিন/ঘণ্টা)', 'Test Email (per admin / hour)', false),
  ('receipt_verify_token', 60, 60, true, 'রসিদ QR যাচাই অনুরোধ', 'receipt', 'ip',
   'রসিদ QR যাচাই (প্রতি IP/মিনিট)', 'Receipt QR verify (per IP / minute)', false),
  ('parent_payment_request', 10, 60, true, 'অভিভাবক পেমেন্ট অনুরোধ', 'payment', 'user',
   'অভিভাবক পেমেন্ট অনুরোধ (প্রতি ইউজার/মিনিট)', 'Parent payment request (per user / minute)', false)
ON CONFLICT (action) DO UPDATE SET
  category = EXCLUDED.category,
  scope = EXCLUDED.scope,
  label_bn = COALESCE(public.rate_limit_config.label_bn, EXCLUDED.label_bn),
  label_en = COALESCE(public.rate_limit_config.label_en, EXCLUDED.label_en);

-- 4. RLS policies — drop existing and recreate with admin read + super_admin manage + admin update for existing
DROP POLICY IF EXISTS "rate_limit_config_admin_read" ON public.rate_limit_config;
DROP POLICY IF EXISTS "rate_limit_config_super_admin_all" ON public.rate_limit_config;
DROP POLICY IF EXISTS "rate_limit_config_admin_update" ON public.rate_limit_config;
DROP POLICY IF EXISTS "rate_limit_config_admin_delete_user_managed" ON public.rate_limit_config;

CREATE POLICY "rate_limit_config_admin_read"
ON public.rate_limit_config FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rate_limit_config_super_admin_all"
ON public.rate_limit_config FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rate_limit_config_admin_update"
ON public.rate_limit_config FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rate_limit_config_admin_delete_user_managed"
ON public.rate_limit_config FOR DELETE
USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) AND is_user_managed = true);


-- Migration: 20260502200936_50b28276-a547-4c9c-a1dd-efcfced035f1.sql

-- ============================================================
-- 1) SMTP CONFIG: drop the duplicate "true" SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read smtp_config" ON public.smtp_config;

-- ============================================================
-- 2) PARENT MESSAGES: drop public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Public can view parent messages by account" ON public.parent_messages;

CREATE POLICY "Admin/staff can view parent messages"
ON public.parent_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);

-- Helper RPC for parents to fetch their own messages by account_id (parent session
-- token validation handled in edge functions; this is invoked via service-role from
-- parent-portal endpoints, which already verify ownership)
CREATE OR REPLACE FUNCTION public.get_parent_messages(p_account_id uuid)
RETURNS SETOF public.parent_messages
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.parent_messages WHERE parent_account_id = p_account_id ORDER BY created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_parent_messages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_messages(uuid) TO service_role;

-- ============================================================
-- 3) FEE WAIVERS: drop anon SELECT, add authenticated/role-based SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view fee_waivers" ON public.fee_waivers;

CREATE POLICY "Authorized roles can view fee_waivers"
ON public.fee_waivers FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- ============================================================
-- 4) LIBRARY ISSUANCES: drop anon SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view library_issuances" ON public.library_issuances;

CREATE POLICY "Authorized roles can view library_issuances"
ON public.library_issuances FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- ============================================================
-- 5) JOINING LETTERS: drop anon SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view joining_letters" ON public.joining_letters;

CREATE POLICY "Authorized roles can view joining_letters"
ON public.joining_letters FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);

-- ============================================================
-- 6) EXAM ATTEMPTS / ANSWERS: lock down direct anon access,
--    expose secure RPCs that validate parent/student session
-- ============================================================
-- Drop dangerous open policies
DROP POLICY IF EXISTS "Anyone can insert exam attempt" ON public.online_exam_attempts;
DROP POLICY IF EXISTS "Update only in-progress exam attempts" ON public.online_exam_attempts;
DROP POLICY IF EXISTS "Anyone can insert exam answer" ON public.online_exam_answers;
DROP POLICY IF EXISTS "Update answers only for in-progress attempts" ON public.online_exam_answers;

-- Keep only admin/teacher SELECT/DELETE; all writes go through RPCs
-- (Owner SELECT for parent/student is via RPC as well.)

-- Secure RPC: start an exam attempt
-- Caller must provide their parent_account_id OR student_account_id.
-- The function is invoked via service role from edge function `exam-session`
-- (which validates the parent/student session JWT first).
CREATE OR REPLACE FUNCTION public.rpc_start_exam_attempt(
  p_exam_id uuid,
  p_student_id uuid,
  p_parent_account_id uuid DEFAULT NULL,
  p_student_account_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
  v_owner_ok boolean := false;
BEGIN
  -- Verify the student belongs to this parent or this student account
  IF p_parent_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.parent_accounts
      WHERE id = p_parent_account_id
        AND status = 'approved'
        AND p_student_id = ANY (linked_student_uuids)
    ) INTO v_owner_ok;
  ELSIF p_student_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.student_accounts
      WHERE id = p_student_account_id
        AND status = 'approved'
        AND linked_student_uuid = p_student_id
    ) INTO v_owner_ok;
  END IF;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'Not authorized to start exam for this student';
  END IF;

  INSERT INTO public.online_exam_attempts (exam_id, student_id, status, started_at)
  VALUES (p_exam_id, p_student_id, 'in_progress', now())
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_start_exam_attempt(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_start_exam_attempt(uuid,uuid,uuid,uuid) TO service_role;

-- Secure RPC: submit/update an answer
CREATE OR REPLACE FUNCTION public.rpc_submit_exam_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer jsonb,
  p_parent_account_id uuid DEFAULT NULL,
  p_student_account_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_status text;
  v_owner_ok boolean := false;
BEGIN
  SELECT student_id, status INTO v_student_id, v_status
  FROM public.online_exam_attempts WHERE id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Attempt is no longer in progress';
  END IF;

  IF p_parent_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.parent_accounts
      WHERE id = p_parent_account_id
        AND status = 'approved'
        AND v_student_id = ANY (linked_student_uuids)
    ) INTO v_owner_ok;
  ELSIF p_student_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.student_accounts
      WHERE id = p_student_account_id
        AND status = 'approved'
        AND linked_student_uuid = v_student_id
    ) INTO v_owner_ok;
  END IF;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'Not authorized for this attempt';
  END IF;

  INSERT INTO public.online_exam_answers (attempt_id, question_id, answer)
  VALUES (p_attempt_id, p_question_id, p_answer)
  ON CONFLICT (attempt_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_submit_exam_answer(uuid,uuid,jsonb,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_submit_exam_answer(uuid,uuid,jsonb,uuid,uuid) TO service_role;

-- Secure RPC: finish an attempt
CREATE OR REPLACE FUNCTION public.rpc_finish_exam_attempt(
  p_attempt_id uuid,
  p_parent_account_id uuid DEFAULT NULL,
  p_student_account_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_owner_ok boolean := false;
BEGIN
  SELECT student_id INTO v_student_id
  FROM public.online_exam_attempts WHERE id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF p_parent_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.parent_accounts
      WHERE id = p_parent_account_id
        AND status = 'approved'
        AND v_student_id = ANY (linked_student_uuids)
    ) INTO v_owner_ok;
  ELSIF p_student_account_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.student_accounts
      WHERE id = p_student_account_id
        AND status = 'approved'
        AND linked_student_uuid = v_student_id
    ) INTO v_owner_ok;
  END IF;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'Not authorized for this attempt';
  END IF;

  UPDATE public.online_exam_attempts
  SET status = 'submitted', submitted_at = now()
  WHERE id = p_attempt_id AND status = 'in_progress';
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_finish_exam_attempt(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_finish_exam_attempt(uuid,uuid,uuid) TO service_role;


-- Migration: 20260502201103_8d501bcf-b4dc-44d3-b50f-2332570fad53.sql

-- Add attempt_token for ownership verification
ALTER TABLE public.online_exam_attempts
  ADD COLUMN IF NOT EXISTS attempt_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Allow anon INSERT again so guest exams keep working,
-- but block all direct UPDATEs (they must go through RPCs that verify the token).
CREATE POLICY "Anyone can start exam attempt"
ON public.online_exam_attempts FOR INSERT TO public
WITH CHECK (status = 'in_progress');

CREATE POLICY "Anyone can insert exam answer for in-progress attempt"
ON public.online_exam_answers FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.online_exam_attempts a
    WHERE a.id = attempt_id AND a.status = 'in_progress'
  )
);

-- Token-verified UPDATE for tab_switch_count / status / etc.
CREATE OR REPLACE FUNCTION public.rpc_update_exam_attempt(
  p_attempt_id uuid,
  p_attempt_token uuid,
  p_tab_switch_count int DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_status text;
BEGIN
  SELECT attempt_token, status INTO v_token, v_status
  FROM public.online_exam_attempts WHERE id = p_attempt_id;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_token <> p_attempt_token THEN
    RAISE EXCEPTION 'Invalid attempt token';
  END IF;
  IF v_status NOT IN ('in_progress','submitted') THEN
    RAISE EXCEPTION 'Attempt is closed';
  END IF;

  UPDATE public.online_exam_attempts
  SET
    tab_switch_count = COALESCE(p_tab_switch_count, tab_switch_count),
    status = COALESCE(p_status, status),
    submitted_at = CASE WHEN p_status = 'submitted' THEN now() ELSE submitted_at END
  WHERE id = p_attempt_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_update_exam_attempt(uuid,uuid,int,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_update_exam_attempt(uuid,uuid,int,text) TO anon, authenticated;


-- Migration: 20260502201420_e585190c-1d7e-4f0e-909b-ae554a37eef7.sql

-- Generate (or reuse) a backup cron secret in app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'backup_cron_secret',
  to_jsonb(encode(gen_random_bytes(32), 'hex'))
)
ON CONFLICT (key) DO NOTHING;

-- Replace the cron job to include the secret header
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'daily-db-backup-job';

SELECT cron.schedule(
  'daily-db-backup-job',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wwhunyzobtuibhvkipwk.supabase.co/functions/v1/daily-db-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value::text FROM public.app_settings WHERE key = 'backup_cron_secret')
    ),
    body := jsonb_build_object('source', 'cron', 'time', now())
  );
  $$
);


-- Migration: 20260502201810_b350c9a7-4aca-4fcd-b288-135ef406dab1.sql

ALTER TABLE public.parent_accounts
  ADD COLUMN IF NOT EXISTS session_token text,
  ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_parent_accounts_session_token
  ON public.parent_accounts (session_token)
  WHERE session_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_parent_session(
  p_account_id uuid,
  p_session_token text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_accounts
    WHERE id = p_account_id
      AND session_token = p_session_token
      AND session_token IS NOT NULL
      AND (session_expires_at IS NULL OR session_expires_at > now())
      AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.rotate_parent_session(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.parent_accounts
     SET session_token = v_token,
         session_expires_at = now() + interval '30 days'
   WHERE id = p_account_id;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_parent_session(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotate_parent_session(uuid) FROM public, anon, authenticated;


-- Migration: 20260502203012_08c8ae64-7c6b-451e-afca-3d9a37e61d76.sql
-- 1) app_settings: hide secret-bearing rows from public reads
DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;

CREATE POLICY "app_settings public read non-secret"
ON public.app_settings
FOR SELECT
TO public
USING (
  key NOT ILIKE '%_secret'
  AND key NOT ILIKE 'secret_%'
  AND key NOT ILIKE '%_token'
  AND key NOT ILIKE '%password%'
  AND key NOT ILIKE '%api_key%'
);

CREATE POLICY "app_settings admin read all"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2) notices: only published + not deleted are public
DROP POLICY IF EXISTS "Anyone can view published notices" ON public.notices;

CREATE POLICY "Anyone can view published notices"
ON public.notices
FOR SELECT
TO public
USING (
  COALESCE(is_published, false) = true
  AND deleted_at IS NULL
);

CREATE POLICY "Staff can view all notices"
ON public.notices
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- 3) results: remove blanket public read; restrict to staff/teacher/admin
DROP POLICY IF EXISTS "Anyone can view results" ON public.results;

CREATE POLICY "Staff can view results"
ON public.results
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- 4) Realtime: remove sensitive tables from broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.parent_payment_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.receipt_status_audit;

-- Migration: 20260502204351_378d8c29-354a-43c6-9b69-70e2527e4ba1.sql

-- 1. NOTIFICATIONS
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

DROP POLICY IF EXISTS "Staff can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view their notifications" ON public.notifications;

CREATE POLICY "Users view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR recipient_user_id IS NULL
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2. ONLINE_EXAM_ATTEMPTS
DROP POLICY IF EXISTS "Owner or admin can view exam attempts" ON public.online_exam_attempts;

CREATE POLICY "Owner or admin can view exam attempts"
ON public.online_exam_attempts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.online_exams e
    WHERE e.id = online_exam_attempts.exam_id
      AND e.created_by = auth.uid()
      AND has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- 3. RESIGN_LETTERS
DROP POLICY IF EXISTS "Authenticated users can view resign letters" ON public.resign_letters;

CREATE POLICY "Admins and owners view resign letters"
ON public.resign_letters
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
);

-- 4. COMMITTEE_MEMBERS
DROP POLICY IF EXISTS "Authenticated users can view committee members" ON public.committee_members;

CREATE POLICY "Admins view full committee members"
ON public.committee_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE OR REPLACE VIEW public.committee_members_public
WITH (security_invoker = on) AS
SELECT
  id, committee_id, staff_id, name, name_en,
  designation, designation_en, occupation, occupation_en,
  photo_url, joining_date, is_active, sort_order, allow_overlap,
  deleted_at, created_at, updated_at
FROM public.committee_members
WHERE deleted_at IS NULL;

GRANT SELECT ON public.committee_members_public TO anon, authenticated;

-- 5. ADMISSION_TEST_QUESTIONS (no question_type column)
DROP POLICY IF EXISTS "Public can view questions for published tests" ON public.admission_test_questions;

CREATE OR REPLACE VIEW public.admission_test_questions_public
WITH (security_invoker = off) AS
SELECT
  q.id, q.test_id, q.question_text, q.question_text_bn,
  q.options, q.marks, q.sort_order
FROM public.admission_test_questions q
JOIN public.admission_tests t ON t.id = q.test_id
WHERE t.is_published = true AND t.deleted_at IS NULL;

GRANT SELECT ON public.admission_test_questions_public TO anon, authenticated;

-- 6. ONLINE_EXAM_QUESTIONS
DROP POLICY IF EXISTS "Public can view questions of published exams" ON public.online_exam_questions;

CREATE OR REPLACE VIEW public.online_exam_questions_public
WITH (security_invoker = off) AS
SELECT
  q.id, q.exam_id, q.question_text, q.question_text_bn,
  q.question_type, q.options, q.marks, q.sort_order
FROM public.online_exam_questions q
JOIN public.online_exams e ON e.id = q.exam_id
WHERE e.status = 'published' AND e.deleted_at IS NULL;

GRANT SELECT ON public.online_exam_questions_public TO anon, authenticated;

-- 7. REALTIME
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='messages' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='realtime')) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Authenticated can subscribe to realtime" ON realtime.messages FOR SELECT TO authenticated USING (true)$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can broadcast to realtime" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Authenticated can broadcast to realtime" ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true)$p$;
  END IF;
END$$;


-- Migration: 20260503071943_b70be11a-c677-426b-899f-151c02fd3a85.sql

CREATE OR REPLACE FUNCTION public.validate_result_signatories()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v jsonb;
  item jsonb;
  cleaned jsonb := '[]'::jsonb;
  norm_item jsonb;
  t_bn text; t_en text; n_bn text; n_en text;
  idx int := 0;
  max_len constant int := 100;
BEGIN
  IF NEW.key IS DISTINCT FROM 'result_signatories' THEN
    RETURN NEW;
  END IF;

  v := NEW.value;

  IF v IS NULL OR jsonb_typeof(v) <> 'array' THEN
    RAISE EXCEPTION 'result_signatories must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(v) = 0 THEN
    RAISE EXCEPTION 'result_signatories must contain at least one signatory' USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    idx := idx + 1;

    IF jsonb_typeof(item) <> 'object' THEN
      RAISE EXCEPTION 'Signatory % must be an object', idx USING ERRCODE = '22023';
    END IF;

    t_bn := regexp_replace(btrim(coalesce(item->>'title_bn', '')), '\s{2,}', ' ', 'g');
    t_en := regexp_replace(btrim(coalesce(item->>'title_en', '')), '\s{2,}', ' ', 'g');
    n_bn := regexp_replace(btrim(coalesce(item->>'name_bn',  '')), '\s{2,}', ' ', 'g');
    n_en := regexp_replace(btrim(coalesce(item->>'name_en',  '')), '\s{2,}', ' ', 'g');

    IF t_bn = '' AND t_en = '' THEN
      RAISE EXCEPTION 'Signatory %: title required in Bangla or English', idx USING ERRCODE = '22023';
    END IF;
    IF n_bn = '' AND n_en = '' THEN
      RAISE EXCEPTION 'Signatory %: name required in Bangla or English', idx USING ERRCODE = '22023';
    END IF;

    IF char_length(t_bn) > max_len OR char_length(t_en) > max_len
       OR char_length(n_bn) > max_len OR char_length(n_en) > max_len THEN
      RAISE EXCEPTION 'Signatory %: title/name fields must be at most % characters', idx, max_len USING ERRCODE = '22023';
    END IF;

    norm_item := jsonb_build_object(
      'title_bn', t_bn,
      'title_en', t_en,
      'name_bn',  n_bn,
      'name_en',  n_en
    );
    cleaned := cleaned || jsonb_build_array(norm_item);
  END LOOP;

  NEW.value := cleaned;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_result_signatories ON public.website_settings;
CREATE TRIGGER trg_validate_result_signatories
BEFORE INSERT OR UPDATE ON public.website_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_result_signatories();


-- Migration: 20260503073646_ee0bdbd5-7e98-4a13-9c95-043e910e19e3.sql
-- Immutable structural validator for result_signatories JSONB.
-- Pure function over input → safe for use inside a CHECK constraint.
CREATE OR REPLACE FUNCTION public.is_valid_result_signatories(v jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  item jsonb;
  t_bn text; t_en text; n_bn text; n_en text;
  max_len constant int := 100;
  max_items constant int := 6;
BEGIN
  IF v IS NULL THEN
    RETURN false;
  END IF;
  IF jsonb_typeof(v) <> 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_array_length(v) = 0 OR jsonb_array_length(v) > max_items THEN
    RETURN false;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RETURN false;
    END IF;

    t_bn := coalesce(item->>'title_bn', '');
    t_en := coalesce(item->>'title_en', '');
    n_bn := coalesce(item->>'name_bn',  '');
    n_en := coalesce(item->>'name_en',  '');

    -- At least one title and at least one name (post-trim by the trigger)
    IF btrim(t_bn) = '' AND btrim(t_en) = '' THEN
      RETURN false;
    END IF;
    IF btrim(n_bn) = '' AND btrim(n_en) = '' THEN
      RETURN false;
    END IF;

    -- Length caps
    IF char_length(t_bn) > max_len
       OR char_length(t_en) > max_len
       OR char_length(n_bn) > max_len
       OR char_length(n_en) > max_len THEN
      RETURN false;
    END IF;

    -- Block control chars / newlines / tabs in any field
    IF t_bn ~ '[[:cntrl:]]' OR t_en ~ '[[:cntrl:]]'
       OR n_bn ~ '[[:cntrl:]]' OR n_en ~ '[[:cntrl:]]' THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Drop existing constraint if present (idempotent re-runs)
ALTER TABLE public.website_settings
  DROP CONSTRAINT IF EXISTS website_settings_result_signatories_valid;

-- CHECK constraint: only enforced when key = 'result_signatories'.
-- Other rows are unaffected (NULL / true short-circuit).
ALTER TABLE public.website_settings
  ADD CONSTRAINT website_settings_result_signatories_valid
  CHECK (
    key <> 'result_signatories'
    OR public.is_valid_result_signatories(value)
  )
  NOT VALID;

-- Validate against existing rows; will fail loudly if any current row violates.
ALTER TABLE public.website_settings
  VALIDATE CONSTRAINT website_settings_result_signatories_valid;

-- Trim the trigger down to NORMALIZATION only — structural validation now lives
-- in the CHECK constraint, so we no longer raise from the trigger.
CREATE OR REPLACE FUNCTION public.validate_result_signatories()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v jsonb;
  item jsonb;
  cleaned jsonb := '[]'::jsonb;
  norm_item jsonb;
  t_bn text; t_en text; n_bn text; n_en text;
BEGIN
  IF NEW.key IS DISTINCT FROM 'result_signatories' THEN
    RETURN NEW;
  END IF;

  v := NEW.value;

  -- Defer structural errors to the CHECK constraint; only normalize when shape is sane.
  IF v IS NULL OR jsonb_typeof(v) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RETURN NEW; -- let CHECK reject
    END IF;

    t_bn := regexp_replace(btrim(coalesce(item->>'title_bn', '')), '\s{2,}', ' ', 'g');
    t_en := regexp_replace(btrim(coalesce(item->>'title_en', '')), '\s{2,}', ' ', 'g');
    n_bn := regexp_replace(btrim(coalesce(item->>'name_bn',  '')), '\s{2,}', ' ', 'g');
    n_en := regexp_replace(btrim(coalesce(item->>'name_en',  '')), '\s{2,}', ' ', 'g');

    norm_item := jsonb_build_object(
      'title_bn', t_bn,
      'title_en', t_en,
      'name_bn',  n_bn,
      'name_en',  n_en
    );
    cleaned := cleaned || jsonb_build_array(norm_item);
  END LOOP;

  NEW.value := cleaned;
  RETURN NEW;
END;
$$;

-- Migration: 20260503073822_2f829035-c136-4d2a-85d4-5798a21ee9d6.sql
-- Audit log table
CREATE TABLE IF NOT EXISTS public.result_signatories_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('normalized', 'rejected')),
  original_value jsonb,
  cleaned_value jsonb,
  diff jsonb,
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_signatories_audit_created
  ON public.result_signatories_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_signatories_audit_action
  ON public.result_signatories_audit (action, created_at DESC);

ALTER TABLE public.result_signatories_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read signatory audit" ON public.result_signatories_audit;
CREATE POLICY "Admins read signatory audit"
  ON public.result_signatories_audit
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER trigger writes.

-- Compute a per-field diff between the original and cleaned arrays.
CREATE OR REPLACE FUNCTION public.diff_result_signatories(orig jsonb, cleaned jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  out_arr jsonb := '[]'::jsonb;
  i int;
  o jsonb; c jsonb;
  fields constant text[] := ARRAY['title_bn','title_en','name_bn','name_en'];
  f text;
  ov text; cv text;
  per_item jsonb;
BEGIN
  IF orig IS NULL OR cleaned IS NULL
     OR jsonb_typeof(orig) <> 'array' OR jsonb_typeof(cleaned) <> 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR i IN 0 .. jsonb_array_length(cleaned) - 1 LOOP
    o := COALESCE(orig -> i, '{}'::jsonb);
    c := cleaned -> i;
    per_item := '{}'::jsonb;
    FOREACH f IN ARRAY fields LOOP
      ov := COALESCE(o ->> f, '');
      cv := COALESCE(c ->> f, '');
      IF ov IS DISTINCT FROM cv THEN
        per_item := per_item || jsonb_build_object(
          f, jsonb_build_object('from', ov, 'to', cv)
        );
      END IF;
    END LOOP;
    IF per_item <> '{}'::jsonb THEN
      out_arr := out_arr || jsonb_build_array(jsonb_build_object('index', i, 'changes', per_item));
    END IF;
  END LOOP;

  RETURN out_arr;
END;
$$;

-- Replace the trigger to log normalization + rejection events.
CREATE OR REPLACE FUNCTION public.validate_result_signatories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  item jsonb;
  cleaned jsonb := '[]'::jsonb;
  norm_item jsonb;
  t_bn text; t_en text; n_bn text; n_en text;
  d jsonb;
  reject_reason text;
BEGIN
  IF NEW.key IS DISTINCT FROM 'result_signatories' THEN
    RETURN NEW;
  END IF;

  v := NEW.value;

  -- Detect obviously bad shape and log rejection BEFORE the CHECK constraint fires.
  IF v IS NULL OR jsonb_typeof(v) <> 'array' THEN
    INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
    VALUES ('rejected', v, 'value must be a JSON array', auth.uid());
    RAISE EXCEPTION 'result_signatories must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(v) = 0 THEN
    INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
    VALUES ('rejected', v, 'array must contain at least one signatory', auth.uid());
    RAISE EXCEPTION 'result_signatories must contain at least one signatory' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(v) > 6 THEN
    INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
    VALUES ('rejected', v, 'array exceeds maximum of 6 signatories', auth.uid());
    RAISE EXCEPTION 'result_signatories supports at most 6 signatories' USING ERRCODE = '22023';
  END IF;

  -- Normalize whitespace
  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
      VALUES ('rejected', v, 'each signatory must be an object', auth.uid());
      RAISE EXCEPTION 'each signatory must be an object' USING ERRCODE = '22023';
    END IF;

    t_bn := regexp_replace(btrim(coalesce(item->>'title_bn', '')), '\s{2,}', ' ', 'g');
    t_en := regexp_replace(btrim(coalesce(item->>'title_en', '')), '\s{2,}', ' ', 'g');
    n_bn := regexp_replace(btrim(coalesce(item->>'name_bn',  '')), '\s{2,}', ' ', 'g');
    n_en := regexp_replace(btrim(coalesce(item->>'name_en',  '')), '\s{2,}', ' ', 'g');

    norm_item := jsonb_build_object(
      'title_bn', t_bn, 'title_en', t_en, 'name_bn', n_bn, 'name_en', n_en
    );
    cleaned := cleaned || jsonb_build_array(norm_item);
  END LOOP;

  -- After normalization, re-check structural rules and log a clean rejection
  -- with reason BEFORE letting the CHECK constraint produce a generic error.
  IF NOT public.is_valid_result_signatories(cleaned) THEN
    -- Find the first failing reason
    reject_reason := 'validation failed (length, empty title/name, or control chars)';
    INSERT INTO public.result_signatories_audit
      (action, original_value, cleaned_value, diff, reason, actor_id)
    VALUES ('rejected', v, cleaned, public.diff_result_signatories(v, cleaned), reject_reason, auth.uid());
    RAISE EXCEPTION 'Signatory validation failed: %', reject_reason USING ERRCODE = '22023';
  END IF;

  -- Log normalization only when something actually changed
  d := public.diff_result_signatories(v, cleaned);
  IF d <> '[]'::jsonb THEN
    INSERT INTO public.result_signatories_audit
      (action, original_value, cleaned_value, diff, reason, actor_id)
    VALUES ('normalized', v, cleaned, d, 'auto-trim / whitespace collapse', auth.uid());
  END IF;

  NEW.value := cleaned;
  RETURN NEW;
END;
$$;

-- Migration: 20260503074215_26e50f70-e63a-466d-91b7-e9d1ee9d85ae.sql
CREATE TABLE IF NOT EXISTS public.result_print_footer_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('class','exam')),
  scope_id uuid NOT NULL,
  show_page_numbers boolean,
  show_footer_institution boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_id)
);

ALTER TABLE public.result_print_footer_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view footer overrides"
  ON public.result_print_footer_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins manage footer overrides insert"
  ON public.result_print_footer_overrides FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage footer overrides update"
  ON public.result_print_footer_overrides FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage footer overrides delete"
  ON public.result_print_footer_overrides FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_result_print_footer_overrides_updated
  BEFORE UPDATE ON public.result_print_footer_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260503074517_0522d52e-08dc-4f63-9be6-11b497c06d10.sql
CREATE TABLE IF NOT EXISTS public.result_footer_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  scope text NOT NULL CHECK (scope IN ('global','class','exam')),
  scope_id uuid,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_footer_audit_created ON public.result_footer_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_footer_audit_scope ON public.result_footer_audit (scope, scope_id);

ALTER TABLE public.result_footer_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view footer audit"
  ON public.result_footer_audit FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Trigger fn for global footer setting (website_settings row with key='result_print_footer')
CREATE OR REPLACE FUNCTION public.log_result_print_footer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.key <> 'result_print_footer' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.key <> 'result_print_footer' AND OLD.key <> 'result_print_footer' THEN RETURN NEW; END IF;
  IF TG_OP = 'DELETE' AND OLD.key <> 'result_print_footer' THEN RETURN OLD; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, 'global', NULL, 'insert', NULL, NEW.value);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.value IS DISTINCT FROM NEW.value THEN
      INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
      VALUES (auth.uid(), v_email, 'global', NULL, 'update', OLD.value, NEW.value);
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, 'global', NULL, 'delete', OLD.value, NULL);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_result_print_footer ON public.website_settings;
CREATE TRIGGER trg_log_result_print_footer
  AFTER INSERT OR UPDATE OR DELETE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_result_print_footer_change();

-- Trigger fn for per-class / per-exam overrides
CREATE OR REPLACE FUNCTION public.log_result_footer_override_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, NEW.scope, NEW.scope_id, 'insert', NULL,
            jsonb_build_object('show_page_numbers', NEW.show_page_numbers, 'show_footer_institution', NEW.show_footer_institution));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.show_page_numbers IS DISTINCT FROM NEW.show_page_numbers
       OR OLD.show_footer_institution IS DISTINCT FROM NEW.show_footer_institution THEN
      INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
      VALUES (auth.uid(), v_email, NEW.scope, NEW.scope_id, 'update',
              jsonb_build_object('show_page_numbers', OLD.show_page_numbers, 'show_footer_institution', OLD.show_footer_institution),
              jsonb_build_object('show_page_numbers', NEW.show_page_numbers, 'show_footer_institution', NEW.show_footer_institution));
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.result_footer_audit(actor_id, actor_email, scope, scope_id, action, old_value, new_value)
    VALUES (auth.uid(), v_email, OLD.scope, OLD.scope_id, 'delete',
            jsonb_build_object('show_page_numbers', OLD.show_page_numbers, 'show_footer_institution', OLD.show_footer_institution), NULL);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_result_footer_override ON public.result_print_footer_overrides;
CREATE TRIGGER trg_log_result_footer_override
  AFTER INSERT OR UPDATE OR DELETE ON public.result_print_footer_overrides
  FOR EACH ROW EXECUTE FUNCTION public.log_result_footer_override_change();


-- Migration: 20260503074741_7c55bf14-1d3b-47c9-8dae-fd474687f885.sql
CREATE OR REPLACE FUNCTION public.get_resolved_print_footer(
  p_class_id uuid DEFAULT NULL,
  p_exam_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global jsonb;
  v_class record;
  v_exam record;
  v_pages boolean;
  v_inst boolean;
  v_margins jsonb;
  v_src_pages text;
  v_src_inst text;
BEGIN
  SELECT value INTO v_global FROM public.website_settings WHERE key = 'result_print_footer';
  IF v_global IS NULL OR jsonb_typeof(v_global) <> 'object' THEN
    v_global := jsonb_build_object(
      'show_page_numbers', true,
      'show_footer_institution', true,
      'margins', jsonb_build_object('top',10,'right',10,'bottom',12,'left',10)
    );
  END IF;

  IF p_class_id IS NOT NULL THEN
    SELECT show_page_numbers, show_footer_institution INTO v_class
      FROM public.result_print_footer_overrides
     WHERE scope = 'class' AND scope_id = p_class_id;
  END IF;
  IF p_exam_id IS NOT NULL THEN
    SELECT show_page_numbers, show_footer_institution INTO v_exam
      FROM public.result_print_footer_overrides
     WHERE scope = 'exam' AND scope_id = p_exam_id;
  END IF;

  IF v_class.show_page_numbers IS NOT NULL THEN
    v_pages := v_class.show_page_numbers; v_src_pages := 'class';
  ELSIF v_exam.show_page_numbers IS NOT NULL THEN
    v_pages := v_exam.show_page_numbers; v_src_pages := 'exam';
  ELSE
    v_pages := COALESCE((v_global->>'show_page_numbers')::boolean, true); v_src_pages := 'global';
  END IF;

  IF v_class.show_footer_institution IS NOT NULL THEN
    v_inst := v_class.show_footer_institution; v_src_inst := 'class';
  ELSIF v_exam.show_footer_institution IS NOT NULL THEN
    v_inst := v_exam.show_footer_institution; v_src_inst := 'exam';
  ELSE
    v_inst := COALESCE((v_global->>'show_footer_institution')::boolean, true); v_src_inst := 'global';
  END IF;

  v_margins := COALESCE(v_global->'margins', jsonb_build_object('top',10,'right',10,'bottom',12,'left',10));
  -- Sanitize margins server-side (3..25, bottom >=10)
  v_margins := jsonb_build_object(
    'top', LEAST(25, GREATEST(3, COALESCE((v_margins->>'top')::int, 10))),
    'right', LEAST(25, GREATEST(3, COALESCE((v_margins->>'right')::int, 10))),
    'bottom', LEAST(25, GREATEST(10, COALESCE((v_margins->>'bottom')::int, 12))),
    'left', LEAST(25, GREATEST(3, COALESCE((v_margins->>'left')::int, 10)))
  );

  RETURN jsonb_build_object(
    'show_page_numbers', v_pages,
    'show_footer_institution', v_inst,
    'margins', v_margins,
    'source', jsonb_build_object('pages', v_src_pages, 'inst', v_src_inst)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_resolved_print_footer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_resolved_print_footer(uuid, uuid) TO authenticated;


-- Migration: 20260503074915_bdd09eb2-ff33-4d8b-b990-cfcc64862dc7.sql
CREATE OR REPLACE FUNCTION public.ensure_result_print_footer_defaults()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default jsonb := jsonb_build_object(
    'show_page_numbers', true,
    'show_footer_institution', true,
    'margins', jsonb_build_object('top', 10, 'right', 10, 'bottom', 12, 'left', 10)
  );
  v_existing jsonb;
  v_merged jsonb;
BEGIN
  SELECT value INTO v_existing FROM public.website_settings WHERE key = 'result_print_footer';

  IF v_existing IS NULL OR jsonb_typeof(v_existing) <> 'object' THEN
    INSERT INTO public.website_settings(key, value, updated_at)
    VALUES ('result_print_footer', v_default, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    RETURN;
  END IF;

  -- Backfill missing keys without overwriting admin choices
  v_merged := v_existing;
  IF NOT (v_merged ? 'show_page_numbers') THEN
    v_merged := v_merged || jsonb_build_object('show_page_numbers', true);
  END IF;
  IF NOT (v_merged ? 'show_footer_institution') THEN
    v_merged := v_merged || jsonb_build_object('show_footer_institution', true);
  END IF;
  IF NOT (v_merged ? 'margins') OR jsonb_typeof(v_merged->'margins') <> 'object' THEN
    v_merged := v_merged || jsonb_build_object('margins', v_default->'margins');
  ELSE
    v_merged := jsonb_set(v_merged, '{margins}',
      (v_default->'margins') || (v_merged->'margins'));
  END IF;

  IF v_merged IS DISTINCT FROM v_existing THEN
    UPDATE public.website_settings SET value = v_merged, updated_at = now()
    WHERE key = 'result_print_footer';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_result_print_footer_defaults() FROM PUBLIC;

SELECT public.ensure_result_print_footer_defaults();


-- Migration: 20260503141524_da310f4b-3f40-41f2-8ef4-1f956f21a02f.sql
-- Allow custom (non-staff) entries in salary_workflow_settings
ALTER TABLE public.salary_workflow_settings ALTER COLUMN staff_id DROP NOT NULL;

ALTER TABLE public.salary_workflow_settings DROP CONSTRAINT IF EXISTS salary_workflow_settings_role_staff_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS salary_workflow_settings_role_staff_uniq
  ON public.salary_workflow_settings (role, staff_id) WHERE staff_id IS NOT NULL;

ALTER TABLE public.salary_workflow_settings
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text;

-- Global toggle: allow admins to enable/disable custom entries
INSERT INTO public.website_settings (key, value)
VALUES ('salary_workflow_config', jsonb_build_object('allow_custom_entries', true))
ON CONFLICT (key) DO UPDATE
  SET value = COALESCE(public.website_settings.value, '{}'::jsonb)
              || jsonb_build_object(
                'allow_custom_entries',
                COALESCE((public.website_settings.value->>'allow_custom_entries')::boolean, true)
              );

-- Migration: 20260503143515_ba6edc38-dfdf-4d86-a0cf-02d13a89b40e.sql
-- Audit table for super-admin toggles around dynamic names & custom signatory entries
CREATE TABLE IF NOT EXISTS public.name_permission_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. 'toggle_allow_custom_entries', 'config_update'
  old_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_by_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_name_permission_audit_key ON public.name_permission_audit(setting_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_name_permission_audit_user ON public.name_permission_audit(changed_by, created_at DESC);

ALTER TABLE public.name_permission_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view name permission audit" ON public.name_permission_audit;
CREATE POLICY "Admins can view name permission audit"
  ON public.name_permission_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Authenticated can insert name permission audit" ON public.name_permission_audit;
CREATE POLICY "Authenticated can insert name permission audit"
  ON public.name_permission_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to auto-log relevant website_settings changes
CREATE OR REPLACE FUNCTION public.log_name_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_action TEXT;
  v_watched BOOLEAN := false;
BEGIN
  -- Watch keys related to dynamic name / signatory permissions
  IF NEW.key IN ('salary_workflow_config')
     OR NEW.key LIKE '%name_permissions%'
     OR NEW.key LIKE '%signatory_config%'
     OR NEW.key LIKE '%dynamic_names%' THEN
    v_watched := true;
  END IF;

  IF NOT v_watched THEN
    RETURN NEW;
  END IF;

  -- Only log if value actually changed
  IF TG_OP = 'UPDATE' AND OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  v_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'config_create'
    WHEN (OLD.value->>'allow_custom_entries') IS DISTINCT FROM (NEW.value->>'allow_custom_entries')
      THEN 'toggle_allow_custom_entries'
    ELSE 'config_update'
  END;

  INSERT INTO public.name_permission_audit (
    setting_key, action, old_value, new_value, changed_by, changed_by_email
  ) VALUES (
    NEW.key,
    v_action,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.value ELSE NULL END,
    NEW.value,
    auth.uid(),
    v_email
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_name_permission_change ON public.website_settings;
CREATE TRIGGER trg_log_name_permission_change
  AFTER INSERT OR UPDATE ON public.website_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_name_permission_change();

-- Migration: 20260503143558_02ea07bb-c028-4e96-9588-c39c1acb9238.sql
DROP POLICY IF EXISTS "Authenticated can insert name permission audit" ON public.name_permission_audit;

-- Migration: 20260503143901_7794aaf3-7407-4cf0-878a-653fccb5483c.sql
-- Backfill/seed dynamic name configuration for existing installations
-- Idempotent: safe to run multiple times.

-- 1) Ensure salary_workflow_config row exists with sensible defaults
INSERT INTO public.website_settings (key, value)
VALUES ('salary_workflow_config', '{"allow_custom_entries": true}'::jsonb)
ON CONFLICT (key) DO UPDATE
  SET value = public.website_settings.value
              || jsonb_build_object(
                   'allow_custom_entries',
                   COALESCE(public.website_settings.value->'allow_custom_entries', 'true'::jsonb)
                 );

-- 2) Backfill function: refresh display_name/designation/source on existing
--    salary_workflow_settings rows from their source records (staff or
--    administrative_officers). Only fills empty/NULL values, never overwrites
--    custom entries.
CREATE OR REPLACE FUNCTION public.backfill_salary_workflow_names()
RETURNS TABLE(updated_count integer, seeded_config boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  -- Refresh names from staff
  WITH upd AS (
    UPDATE public.salary_workflow_settings s
       SET display_name = COALESCE(NULLIF(s.display_name, ''), st.name_bn, st.name_en),
           designation  = COALESCE(NULLIF(s.designation, ''), st.designation),
           source       = COALESCE(s.source, 'staff')
      FROM public.staff st
     WHERE s.is_custom = false
       AND s.staff_id = st.id
       AND (s.display_name IS NULL OR s.display_name = ''
            OR s.designation IS NULL OR s.designation = ''
            OR s.source IS NULL)
    RETURNING 1
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM upd;

  -- Refresh names from administrative_officers (matched on staff_id column
  -- when source='administrative')
  WITH upd2 AS (
    UPDATE public.salary_workflow_settings s
       SET display_name = COALESCE(NULLIF(s.display_name, ''), ao.name_bn, ao.name_en),
           designation  = COALESCE(NULLIF(s.designation, ''), ao.designation),
           source       = 'administrative'
      FROM public.administrative_officers ao
     WHERE s.is_custom = false
       AND s.source = 'administrative'
       AND s.staff_id = ao.id
       AND (s.display_name IS NULL OR s.display_name = ''
            OR s.designation IS NULL OR s.designation = '')
    RETURNING 1
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM upd2;

  RETURN QUERY SELECT v_updated, true;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_salary_workflow_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_salary_workflow_names() TO authenticated;

-- 3) Run the backfill once as part of this migration
SELECT public.backfill_salary_workflow_names();


-- Migration: 20260503144925_24d9abfe-2abf-44c7-8e0f-d350b8d39da9.sql
-- Backend logging for administrative-name (staff directory) requests
CREATE TABLE IF NOT EXISTS public.admin_name_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NOT NULL,
  source_path text NOT NULL,           -- e.g. 'useStaffDirectory', 'AdminAdministrativeDebug:probe1'
  sql_path text,                        -- e.g. 'view:staff_directory', 'table:administrative_officers', 'rpc:list_staff_directory'
  caller_user_id uuid,
  caller_role text,
  filters jsonb DEFAULT '{}'::jsonb,
  result_count integer,
  error_code text,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_name_log_corr ON public.admin_name_request_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_admin_name_log_created ON public.admin_name_request_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_name_log_user ON public.admin_name_request_log(caller_user_id);

ALTER TABLE public.admin_name_request_log ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own log row (it's a diagnostic trail)
CREATE POLICY "auth can insert own admin name log"
ON public.admin_name_request_log FOR INSERT TO authenticated
WITH CHECK (caller_user_id IS NULL OR caller_user_id = auth.uid());

-- Only admins / super_admins can read
CREATE POLICY "admins read admin name log"
ON public.admin_name_request_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can delete (cleanup)
CREATE POLICY "super_admin delete admin name log"
ON public.admin_name_request_log FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Logging RPC: SECURITY DEFINER so it always succeeds even when caller has limited grants
CREATE OR REPLACE FUNCTION public.log_admin_name_request(
  _correlation_id text,
  _source_path text,
  _sql_path text,
  _filters jsonb,
  _result_count integer,
  _error_code text,
  _error_message text,
  _duration_ms integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _role text;
BEGIN
  -- Resolve caller's highest role (best-effort)
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role::text
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    ELSE 9 END
  LIMIT 1;

  INSERT INTO public.admin_name_request_log(
    correlation_id, source_path, sql_path, caller_user_id, caller_role,
    filters, result_count, error_code, error_message, duration_ms
  ) VALUES (
    COALESCE(_correlation_id, gen_random_uuid()::text),
    COALESCE(_source_path, 'unknown'),
    _sql_path,
    auth.uid(),
    _role,
    COALESCE(_filters, '{}'::jsonb),
    _result_count,
    _error_code,
    _error_message,
    _duration_ms
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_name_request(text,text,text,jsonb,integer,text,text,integer) TO authenticated;

-- Migration: 20260503170203_ecc59d17-1983-4955-bb4b-82b80285305d.sql
CREATE TABLE IF NOT EXISTS public.staff_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name_bn TEXT,
  name_en TEXT,
  holiday_type TEXT NOT NULL DEFAULT 'public' CHECK (holiday_type IN ('weekly','public')),
  weekday SMALLINT CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6)),
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_holidays_date ON public.staff_holidays(holiday_date) WHERE deleted_at IS NULL;

ALTER TABLE public.staff_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view staff_holidays"
  ON public.staff_holidays FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins insert staff_holidays"
  ON public.staff_holidays FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins update staff_holidays"
  ON public.staff_holidays FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins delete staff_holidays"
  ON public.staff_holidays FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_staff_holidays_updated_at
  BEFORE UPDATE ON public.staff_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260503194011_097d55f7-22bf-4085-816e-76f84e478cda.sql
ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS leave_type TEXT,
  ADD COLUMN IF NOT EXISTS leave_reason TEXT;

-- Migration: 20260503200106_10d40161-977e-46c6-9e44-871041e01290.sql

-- 1. Restrict otp_verify_attempts SELECT to admins only
DROP POLICY IF EXISTS "Anyone can read verify attempts" ON public.otp_verify_attempts;

-- 2. Restrict salary_settings SELECT to admins / users with salary view permission
DROP POLICY IF EXISTS "Anyone can view salary_settings" ON public.salary_settings;
CREATE POLICY "Authorized users can view salary_settings"
ON public.salary_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/salary'::text, 'view'::text)
);

-- 3. Restrict committee_attachments SELECT to authenticated users with permission
DROP POLICY IF EXISTS "committee_attachments_select_all" ON public.committee_attachments;
CREATE POLICY "committee_attachments_select_authorized"
ON public.committee_attachments
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees'::text, 'view'::text)
  )
);


-- Migration: 20260503201559_5c20bca4-b312-451d-9398-5d291913ee86.sql
DO $$
DECLARE
  v_correct uuid;
  v_wrong uuid;
BEGIN
  SELECT id INTO v_correct FROM public.designations WHERE name_bn = 'কোষাধ্যক্ষ' LIMIT 1;
  SELECT id INTO v_wrong   FROM public.designations WHERE name_bn = 'কোষাধ্যক' LIMIT 1;

  IF v_wrong IS NOT NULL AND v_correct IS NOT NULL THEN
    BEGIN
      UPDATE public.staff SET designation = v_correct::text WHERE designation = v_wrong::text;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN
      UPDATE public.administrative_officers SET designation = v_correct::text WHERE designation = v_wrong::text;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN
      UPDATE public.committee_members SET designation = v_correct::text WHERE designation = v_wrong::text;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    DELETE FROM public.designations WHERE id = v_wrong;
  ELSIF v_wrong IS NOT NULL AND v_correct IS NULL THEN
    UPDATE public.designations SET name_bn = 'কোষাধ্যক্ষ' WHERE id = v_wrong;
  END IF;
END $$;

UPDATE public.designations SET name_bn = REPLACE(name_bn, 'কোষাধ্যক', 'কোষাধ্যক্ষ')
  WHERE name_bn LIKE '%কোষাধ্যক%' AND name_bn NOT LIKE '%কোষাধ্যক্ষ%';

-- Migration: 20260503202101_327e8a96-927d-4d75-84b3-5f1721c33d9a.sql
CREATE TABLE IF NOT EXISTS public.role_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  description_en TEXT,
  description_bn TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read role translations" ON public.role_translations;
CREATE POLICY "Public read role translations"
  ON public.role_translations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage role translations" ON public.role_translations;
CREATE POLICY "Admins manage role translations"
  ON public.role_translations FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_role_translations_updated_at
  BEFORE UPDATE ON public.role_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_translations (role_key, name_en, name_bn, is_system, sort_order) VALUES
  ('super_admin',    'Super Admin',          'সুপার অ্যাডমিন',     true, 1),
  ('admin',          'Admin',                'অ্যাডমিন',            true, 2),
  ('teacher',        'Teacher',              'শিক্ষক',              true, 3),
  ('staff',          'Staff',                'স্টাফ',                true, 4),
  ('administrative', 'Administrative',       'প্রশাসনিক',           true, 5),
  ('support',        'Support Staff',        'সহায়ক কর্মী',         true, 6),
  ('general',        'General',              'সাধারণ',              true, 7)
ON CONFLICT (role_key) DO NOTHING;

-- Migration: 20260503211916_7fc65b41-d2f1-4688-a29c-017ed8982f3e.sql

ALTER TABLE public.salary_workflow_settings
  ADD COLUMN IF NOT EXISTS admin_officer_id UUID REFERENCES public.administrative_officers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_salary_workflow_settings_admin_officer
  ON public.salary_workflow_settings(admin_officer_id) WHERE admin_officer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS salary_workflow_settings_role_admin_uniq
  ON public.salary_workflow_settings(role, admin_officer_id) WHERE admin_officer_id IS NOT NULL;

ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS verifier_settings_id UUID REFERENCES public.salary_workflow_settings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approver_settings_id UUID REFERENCES public.salary_workflow_settings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS treasurer_settings_id UUID REFERENCES public.salary_workflow_settings(id) ON DELETE SET NULL;


-- Migration: 20260503215610_d6001fc4-6813-4054-b9e5-2126c6a99336.sql
DROP FUNCTION IF EXISTS public.check_user_duplicates(text, text, text);

-- Migration: 20260503220541_9080427c-5401-48a7-affe-16968f896bbd.sql
-- 1) Helper: list overloaded functions in public schema
CREATE OR REPLACE FUNCTION public.list_function_overloads()
RETURNS TABLE(function_name text, overload_count bigint, signatures text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.proname::text AS function_name,
    COUNT(*) AS overload_count,
    array_agg(pg_get_function_identity_arguments(p.oid) ORDER BY p.oid) AS signatures
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  GROUP BY p.proname
  HAVING COUNT(*) > 1
  ORDER BY p.proname;
$$;

-- 2) Assertion helper for use inside migrations
CREATE OR REPLACE FUNCTION public.assert_no_function_overloads(fn_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bad RECORD;
  msg text := '';
BEGIN
  FOR bad IN
    SELECT p.proname::text AS fn,
           COUNT(*) AS cnt,
           array_agg(pg_get_function_identity_arguments(p.oid) ORDER BY p.oid) AS sigs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY(fn_names)
    GROUP BY p.proname
    HAVING COUNT(*) > 1
  LOOP
    msg := msg || format(E'\n - %s has %s overloads: %s',
                         bad.fn, bad.cnt, array_to_string(bad.sigs, ' | '));
  END LOOP;

  IF length(msg) > 0 THEN
    RAISE EXCEPTION 'Function overload safeguard failed:%', msg
      USING HINT = 'Drop the obsolete version(s) using DROP FUNCTION public.<name>(<exact arg types>) before re-running the migration.';
  END IF;
END;
$$;

-- 3) Event trigger: warn when a newly created/replaced function ends up overloaded
CREATE OR REPLACE FUNCTION public.warn_function_overloads()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  obj RECORD;
  cnt int;
  sigs text;
  fn_name text;
BEGIN
  FOR obj IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE FUNCTION', 'ALTER FUNCTION')
      AND object_type = 'function'
      AND schema_name = 'public'
  LOOP
    -- Extract the bare function name (object_identity looks like public.foo(arg1, arg2))
    fn_name := split_part(split_part(obj.object_identity, '(', 1), '.', 2);

    SELECT COUNT(*),
           string_agg(pg_get_function_identity_arguments(p.oid), ' | ' ORDER BY p.oid)
      INTO cnt, sigs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = fn_name;

    IF cnt > 1 THEN
      RAISE WARNING
        'Function overload detected: public.% now has % versions (signatures: %). If unintended, DROP the obsolete version explicitly.',
        fn_name, cnt, sigs;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS trg_warn_function_overloads;
CREATE EVENT TRIGGER trg_warn_function_overloads
  ON ddl_command_end
  WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION')
  EXECUTE FUNCTION public.warn_function_overloads();

-- 4) Lock down execute permissions on the assertion helpers
REVOKE ALL ON FUNCTION public.list_function_overloads() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_no_function_overloads(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_function_overloads() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_no_function_overloads(text[]) TO authenticated, service_role;

-- 5) Sanity check right now: warn (don't fail) on any pre-existing overloads
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.list_function_overloads() LOOP
    RAISE WARNING 'Pre-existing function overload: % (% versions): %',
      r.function_name, r.overload_count, array_to_string(r.signatures, ' | ');
  END LOOP;
END;
$$;

-- Migration: 20260503225707_1c2a0176-96b6-451d-a456-72354a4b953d.sql
-- Salary PDF column configuration
CREATE TABLE public.salary_pdf_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  col_key text NOT NULL UNIQUE,
  label_bn text NOT NULL,
  label_en text NOT NULL,
  align text NOT NULL DEFAULT 'left' CHECK (align IN ('left','center','right')),
  weight numeric NOT NULL DEFAULT 5 CHECK (weight > 0),
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_salary_pdf_columns_order ON public.salary_pdf_columns (sort_order);

ALTER TABLE public.salary_pdf_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read salary pdf columns"
  ON public.salary_pdf_columns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage salary pdf columns - insert"
  ON public.salary_pdf_columns FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage salary pdf columns - update"
  ON public.salary_pdf_columns FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage salary pdf columns - delete"
  ON public.salary_pdf_columns FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_salary_pdf_columns_updated_at
  BEFORE UPDATE ON public.salary_pdf_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults (matches current COLUMNS registry in salary-pdf edge fn)
INSERT INTO public.salary_pdf_columns (col_key,label_bn,label_en,align,weight,sort_order) VALUES
  ('sl',         'ক্রঃ',                'SL',          'center', 3, 10),
  ('name',       'কর্মীর নাম ও আইডি',   'Name & ID',   'left',  15, 20),
  ('designation','পদবি',                'Designation', 'left',  12, 30),
  ('base',       'মূল বেতন (৳)',        'Base (BDT)',  'right',  8, 40),
  ('present',    'উপ',                  'P',           'center', 3, 50),
  ('absent',     'অনু',                 'A',           'center', 3, 60),
  ('late',       'বি',                  'L',           'center', 3, 70),
  ('leave',      'ছু',                  'Lv',          'center', 3, 80),
  ('deduction',  'কর্তন (৳)',           'Deduction',   'right',  8, 90),
  ('overtime',   'ওভারটাইম (৳)',        'Overtime',    'right',  7, 100),
  ('deposit',    'জমা (৳)',             'Deposit',     'right',  8, 110),
  ('totalDed',   'মোট কর্তন (৳)',       'Total Ded.',  'right',  9, 120),
  ('net',        'নিট প্রদেয় (৳)',     'Net Payable', 'right', 12, 130);

-- Migration: 20260503234910_273f6337-0d6f-42ef-add8-440654c46785.sql

CREATE TABLE IF NOT EXISTS public.salary_sheet_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL UNIQUE,
  memo_no text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.salary_sheet_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read salary memos"
  ON public.salary_sheet_memos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage salary memos"
  ON public.salary_sheet_memos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.get_or_create_salary_memo(p_month_year text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memo text;
  v_year text;
  v_month text;
  v_seq int;
  v_attempt int := 0;
BEGIN
  IF p_month_year IS NULL OR length(p_month_year) < 7 THEN
    RAISE EXCEPTION 'Invalid month_year: %', p_month_year;
  END IF;

  SELECT memo_no INTO v_memo
  FROM public.salary_sheet_memos
  WHERE month_year = p_month_year;

  IF v_memo IS NOT NULL THEN
    RETURN v_memo;
  END IF;

  v_year := split_part(p_month_year, '-', 1);
  v_month := split_part(p_month_year, '-', 2);

  LOOP
    v_attempt := v_attempt + 1;
    SELECT COALESCE(MAX(
      CASE WHEN memo_no ~ ('^SS-' || v_year || '-[0-9]+$')
           THEN (regexp_replace(memo_no, '^SS-' || v_year || '-', ''))::int
           ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.salary_sheet_memos
    WHERE memo_no LIKE 'SS-' || v_year || '-%';

    v_memo := 'SS-' || v_year || '-' || lpad(v_seq::text, 4, '0');

    BEGIN
      INSERT INTO public.salary_sheet_memos (month_year, memo_no, created_by)
      VALUES (p_month_year, v_memo, auth.uid());
      RETURN v_memo;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT memo_no INTO v_memo
        FROM public.salary_sheet_memos
        WHERE month_year = p_month_year;
        IF v_memo IS NOT NULL THEN
          RETURN v_memo;
        END IF;
        IF v_attempt > 5 THEN
          RAISE;
        END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_salary_memo(text) TO authenticated, anon, service_role;


-- Migration: 20260504173421_6e016ba2-79e8-47b6-a3fe-370a3ee28473.sql

ALTER TABLE public.salary_savings
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS expense_id UUID,
  ADD COLUMN IF NOT EXISTS expense_category_id UUID REFERENCES public.expense_categories(id),
  ADD COLUMN IF NOT EXISTS expense_institution_id UUID REFERENCES public.expense_institutions(id);

CREATE INDEX IF NOT EXISTS idx_salary_savings_disbursed ON public.salary_savings(disbursed_at);


-- Migration: 20260505182117_78305803-8c2a-4d25-b32c-d836d46f6315.sql

-- Fix Security Definer Views: switch to security_invoker so RLS of querying user applies
ALTER VIEW public.online_exam_questions_public SET (security_invoker = on);
ALTER VIEW public.admission_test_questions_public SET (security_invoker = on);

-- Fix mutable search_path on public functions
ALTER FUNCTION public.is_valid_result_signatories(jsonb) SET search_path = public;
ALTER FUNCTION public.warn_function_overloads() SET search_path = public;


-- Migration: 20260506163817_9187af32-4c14-4c26-8afc-851ee12181b3.sql
-- Enforce that only ONE active person can hold the "Principal" designation
-- across administrative_officers + staff combined.
CREATE OR REPLACE FUNCTION public.enforce_single_principal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_designation text;
  v_is_principal boolean;
  v_existing_admin int;
  v_existing_staff int;
  v_self_id uuid;
  v_table text := TG_TABLE_NAME;
BEGIN
  v_designation := lower(coalesce(NEW.designation, ''));
  v_is_principal := v_designation LIKE '%principal%'
                 OR v_designation LIKE '%প্রিন্সিপাল%'
                 OR v_designation LIKE '%অধ্যক্ষ%';

  IF NOT v_is_principal THEN
    RETURN NEW;
  END IF;

  -- Only enforce for active rows
  IF coalesce(NEW.status, 'active') <> 'active' THEN
    RETURN NEW;
  END IF;

  v_self_id := NEW.id;

  SELECT count(*) INTO v_existing_admin
  FROM administrative_officers
  WHERE deleted_at IS NULL
    AND status = 'active'
    AND id <> coalesce(v_self_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      lower(coalesce(designation, '')) LIKE '%principal%'
      OR lower(coalesce(designation, '')) LIKE '%প্রিন্সিপাল%'
      OR lower(coalesce(designation, '')) LIKE '%অধ্যক্ষ%'
    );

  SELECT count(*) INTO v_existing_staff
  FROM staff
  WHERE deleted_at IS NULL
    AND status = 'active'
    AND id <> coalesce(v_self_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      lower(coalesce(designation, '')) LIKE '%principal%'
      OR lower(coalesce(designation, '')) LIKE '%প্রিন্সিপাল%'
      OR lower(coalesce(designation, '')) LIKE '%অধ্যক্ষ%'
    );

  IF (v_existing_admin + v_existing_staff) > 0 THEN
    RAISE EXCEPTION 'DUPLICATE_PRINCIPAL: প্রিন্সিপাল/অধ্যক্ষ পদবি ইতিমধ্যে একজনকে দেয়া হয়েছে। নতুন কাউকে দিতে হলে আগেরজনের পদবি পরিবর্তন বা নিষ্ক্রিয় করুন।'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_principal_admin ON public.administrative_officers;
CREATE TRIGGER trg_enforce_single_principal_admin
BEFORE INSERT OR UPDATE OF designation, status, deleted_at
ON public.administrative_officers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_principal();

DROP TRIGGER IF EXISTS trg_enforce_single_principal_staff ON public.staff;
CREATE TRIGGER trg_enforce_single_principal_staff
BEFORE INSERT OR UPDATE OF designation, status, deleted_at
ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_principal();

-- Migration: 20260506164420_dbcc8e5f-b0aa-472b-9494-8fdf20720be9.sql
CREATE OR REPLACE FUNCTION public.check_user_duplicates(_email text, _phone text, _full_name text, _nid text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lower_email text := lower(COALESCE(_email, ''));
  v_phone text := COALESCE(_phone, '');
  v_name text := COALESCE(_full_name, '');
  v_nid text := NULLIF(TRIM(COALESCE(_nid, '')), '');
BEGIN
  IF v_lower_email <> '' THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_STAFF',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE lower(email) = v_lower_email AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_ADMIN',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.parent_accounts WHERE lower(email) = v_lower_email) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_PARENT',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন অভিভাবক অ্যাকাউন্ট আছে।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.student_accounts WHERE lower(contact) = v_lower_email) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL_STUDENT',
        'message_bn', 'এই ইমেইল দিয়ে ইতিমধ্যে একজন ছাত্র অ্যাকাউন্ট আছে।');
    END IF;
  END IF;

  IF v_phone <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.staff WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_STAFF',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE phone = v_phone AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_ADMIN',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.parent_accounts WHERE phone = v_phone) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE_PARENT',
        'message_bn', 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন অভিভাবক অ্যাকাউন্ট আছে।');
    END IF;
  END IF;

  IF v_nid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.staff WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_STAFF',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.administrative_officers WHERE TRIM(COALESCE(nid, '')) = v_nid AND deleted_at IS NULL) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_ADMIN',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।');
    END IF;
    IF EXISTS (SELECT 1 FROM public.parent_accounts WHERE TRIM(COALESCE(nid, '')) = v_nid) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NID_PARENT',
        'message_bn', 'এই NID দিয়ে ইতিমধ্যে একজন অভিভাবক অ্যাকাউন্ট আছে।');
    END IF;
  END IF;

  IF v_name <> '' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(full_name) = lower(v_name)) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_NAME',
        'message_bn', 'এই নামে একজন ইউজার ইতিমধ্যে আছেন।');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- Migration: 20260507180809_bfa393d3-7292-457a-ba1b-0a297ab859e4.sql
CREATE OR REPLACE FUNCTION public.generate_administrative_officer_id(p_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_serial INTEGER;
  v_next INTEGER;
  v_id TEXT;
BEGIN
  -- Global serial across all years. p_year kept for backward compatibility but ignored.
  SELECT MAX(
    CASE
      WHEN officer_id ~ '^ADO-[0-9]+$'
        THEN CAST(split_part(officer_id, '-', 2) AS INTEGER)
      WHEN officer_id ~ '^ADO-[0-9]{4}-[0-9]+$'
        THEN CAST(split_part(officer_id, '-', 3) AS INTEGER)
      ELSE NULL
    END
  ) INTO v_max_serial
  FROM public.administrative_officers;

  v_next := COALESCE(v_max_serial, 0) + 1;
  v_id := 'ADO-' || lpad(v_next::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM public.administrative_officers WHERE officer_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := 'ADO-' || lpad(v_next::TEXT, 4, '0');
  END LOOP;

  RETURN v_id;
END;
$$;

-- Migration: 20260507181046_21c205f2-c0c3-470a-ae49-db5bacfa24f5.sql
-- ID Format Configuration table
CREATE TABLE IF NOT EXISTS public.id_format_config (
  entity_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  include_year BOOLEAN NOT NULL DEFAULT false,
  serial_padding INTEGER NOT NULL DEFAULT 4 CHECK (serial_padding BETWEEN 1 AND 8),
  separator TEXT NOT NULL DEFAULT '-',
  reset_mode TEXT NOT NULL DEFAULT 'global' CHECK (reset_mode IN ('global','yearly')),
  start_serial INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.id_format_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "id_format_config_read" ON public.id_format_config;
CREATE POLICY "id_format_config_read" ON public.id_format_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "id_format_config_admin_all" ON public.id_format_config;
CREATE POLICY "id_format_config_admin_all" ON public.id_format_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE TRIGGER trg_id_format_config_updated_at
BEFORE UPDATE ON public.id_format_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.id_format_config (entity_key,label,prefix,include_year,serial_padding,separator,reset_mode,start_serial) VALUES
  ('administrative_officer','প্রশাসনিক কর্মকর্তা','ADO',false,4,'-','global',1),
  ('teacher','শিক্ষক','TCH',false,4,'-','global',2001),
  ('administrative','প্রশাসনিক','ADM',false,4,'-','global',1001),
  ('general','সাধারণ কর্মী','OFF',false,4,'-','global',3001),
  ('support','সহায়ক কর্মী','STF',false,4,'-','global',4001)
ON CONFLICT (entity_key) DO NOTHING;

-- Helper: build ID string
CREATE OR REPLACE FUNCTION public.build_formatted_id(
  p_prefix TEXT, p_include_year BOOLEAN, p_year INTEGER,
  p_separator TEXT, p_padding INTEGER, p_serial INTEGER
) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_include_year THEN p_prefix || p_separator || p_year::TEXT || p_separator || lpad(p_serial::TEXT, p_padding, '0')
    ELSE p_prefix || p_separator || lpad(p_serial::TEXT, p_padding, '0')
  END;
$$;

-- Rewrite administrative officer ID generator
CREATE OR REPLACE FUNCTION public.generate_administrative_officer_id(p_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.id_format_config%ROWTYPE;
  v_year INTEGER;
  v_max INTEGER;
  v_next INTEGER;
  v_id TEXT;
  v_prefix_pattern TEXT;
BEGIN
  SELECT * INTO c FROM public.id_format_config WHERE entity_key='administrative_officer' FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.id_format_config(entity_key,label,prefix) VALUES('administrative_officer','Officer','ADO')
    RETURNING * INTO c;
  END IF;
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::INTEGER);

  IF c.reset_mode = 'yearly' AND c.include_year THEN
    v_prefix_pattern := c.prefix || c.separator || v_year::TEXT || c.separator;
    SELECT MAX(CAST(regexp_replace(officer_id, '^.*' || c.separator, '') AS INTEGER))
      INTO v_max
      FROM public.administrative_officers
     WHERE officer_id LIKE v_prefix_pattern || '%'
       AND officer_id ~ ('^' || regexp_replace(v_prefix_pattern,'([.+*?^$()\[\]{}|\\])','\\\1','g') || '[0-9]+$');
  ELSE
    -- global: scan all officer_ids, extract trailing number
    SELECT MAX(CAST((regexp_match(officer_id,'([0-9]+)$'))[1] AS INTEGER))
      INTO v_max
      FROM public.administrative_officers
     WHERE officer_id ~ '[0-9]+$';
  END IF;

  v_next := COALESCE(GREATEST(v_max + 1, c.start_serial), c.start_serial);
  v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);

  WHILE EXISTS (SELECT 1 FROM public.administrative_officers WHERE officer_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);
  END LOOP;
  RETURN v_id;
END;
$$;

-- Rewrite staff ID generator (per category, reads from id_format_config)
CREATE OR REPLACE FUNCTION public.generate_staff_id(p_category_key TEXT, p_joining_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.id_format_config%ROWTYPE;
  v_year INTEGER;
  v_max INTEGER;
  v_next INTEGER;
  v_id TEXT;
  v_prefix_pattern TEXT;
BEGIN
  SELECT * INTO c FROM public.id_format_config WHERE entity_key = p_category_key FOR UPDATE;
  IF NOT FOUND THEN
    -- fallback to legacy staff_categories config if id_format_config row missing
    INSERT INTO public.id_format_config(entity_key,label,prefix,start_serial)
    SELECT key, COALESCE(name_bn,name_en,key), COALESCE(id_prefix,'STF'), COALESCE(id_start_range,1001)
      FROM public.staff_categories WHERE key = p_category_key
    RETURNING * INTO c;
    IF c.entity_key IS NULL THEN
      RAISE EXCEPTION 'No ID format configured for category: %', p_category_key;
    END IF;
  END IF;
  v_year := COALESCE(p_joining_year, EXTRACT(YEAR FROM now())::INTEGER);

  IF c.reset_mode = 'yearly' AND c.include_year THEN
    v_prefix_pattern := c.prefix || c.separator || v_year::TEXT || c.separator;
    SELECT MAX(CAST(regexp_replace(staff_id, '^.*' || c.separator, '') AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE v_prefix_pattern || '%'
       AND staff_id ~ ('^' || regexp_replace(v_prefix_pattern,'([.+*?^$()\[\]{}|\\])','\\\1','g') || '[0-9]+$');
  ELSE
    -- global within this prefix
    SELECT MAX(CAST((regexp_match(staff_id,'([0-9]+)$'))[1] AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE c.prefix || c.separator || '%'
       AND staff_id ~ '[0-9]+$';
  END IF;

  v_next := COALESCE(GREATEST(v_max + 1, c.start_serial), c.start_serial);
  v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);

  WHILE EXISTS (SELECT 1 FROM public.staff WHERE staff_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);
  END LOOP;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_administrative_officer_id(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_staff_id(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.build_formatted_id(text,boolean,integer,text,integer,integer) TO authenticated;

-- Migration: 20260507183420_fb7263a2-a7a5-435a-a5e6-560b42b576f7.sql

CREATE TABLE IF NOT EXISTS public.whatsapp_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  phone_number text,
  success boolean NOT NULL DEFAULT false,
  error_reason text,
  page_url text,
  user_agent text,
  is_pwa boolean DEFAULT false,
  user_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_click_events_created ON public.whatsapp_click_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_click_events_type ON public.whatsapp_click_events(event_type);

ALTER TABLE public.whatsapp_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log WhatsApp click events"
  ON public.whatsapp_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view WhatsApp click events"
  ON public.whatsapp_click_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));


-- Migration: 20260511232008_16f1bea0-988a-4dd0-b218-2b3f9e5c0f14.sql
-- 1) Remove public INSERT on otp_codes; service role bypasses RLS, so send-otp/admin-otp-recovery still work.
DROP POLICY IF EXISTS "Anyone can insert otp_codes" ON public.otp_codes;

-- 2) Remove public INSERT on otp_verify_attempts; verify-otp uses service role.
DROP POLICY IF EXISTS "Anyone can insert verify attempts" ON public.otp_verify_attempts;

-- 3) Restrict exam_session_students SELECT.
-- Public can only see rows belonging to a published exam session (needed by /result-find).
-- Authenticated staff/teachers/admins keep full access via existing policies.
DROP POLICY IF EXISTS "Anyone can view exam_session_students" ON public.exam_session_students;

CREATE POLICY "Public can view published exam_session_students"
ON public.exam_session_students
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = exam_session_students.exam_session_id
      AND es.is_published = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

-- Migration: 20260512085245_ee3490fd-e451-4705-a44d-aa1c7a266a67.sql
-- Public RPC: compute next admission roll number safely (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_next_admission_roll(p_class_id uuid, p_session_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sort int;
  v_start int;
  v_max int;
  v_prefix int;
BEGIN
  IF p_class_id IS NULL OR p_session_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(sort_order, 1) INTO v_sort FROM classes WHERE id = p_class_id;
  IF v_sort IS NULL THEN v_sort := 1; END IF;

  v_start := v_sort * 1000 + 1;
  v_prefix := v_sort;

  SELECT COALESCE(MAX( (regexp_replace(roll_number, '\D', '', 'g'))::int ), v_start - 1)
    INTO v_max
  FROM students
  WHERE class_id = p_class_id
    AND session_id = p_session_id
    AND roll_number IS NOT NULL
    AND roll_number ~ '^\d+$'
    AND (roll_number)::int >= v_start
    AND (roll_number)::int < (v_prefix + 1) * 1000;

  RETURN (v_max + 1)::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_admission_roll(uuid, uuid) TO anon, authenticated;

-- Public RPC: check duplicate birth registration (returns minimal info only)
CREATE OR REPLACE FUNCTION public.check_duplicate_birth_reg(p_birth_reg text)
RETURNS TABLE(roll_number text, registration_no text, admission_session text, student_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.roll_number, s.registration_no, s.admission_session, s.student_id
  FROM students s
  WHERE s.birth_reg_no = p_birth_reg
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_duplicate_birth_reg(text) TO anon, authenticated;

-- Migration: 20260512090212_8c47ecad-7ead-4246-81de-58b271e38cf4.sql
-- Auto-generate roll_number and registration_no when admin approves a student
CREATE OR REPLACE FUNCTION public.auto_generate_student_roll_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_roll integer;
  v_year text;
  v_session_name text;
BEGIN
  -- Only act when transitioning to approved
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN

    -- Generate roll if missing
    IF (NEW.roll_number IS NULL OR btrim(NEW.roll_number) = '')
       AND NEW.class_id IS NOT NULL
       AND NEW.session_id IS NOT NULL THEN
      BEGIN
        v_next_roll := public.get_next_admission_roll(NEW.class_id, NEW.session_id);
        IF v_next_roll IS NOT NULL THEN
          NEW.roll_number := v_next_roll::text;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- swallow; admin can fix manually
        NULL;
      END;
    END IF;

    -- Derive session year if missing
    IF NEW.session_year IS NULL OR btrim(NEW.session_year) = '' THEN
      SELECT name INTO v_session_name FROM public.academic_sessions WHERE id = NEW.session_id;
      IF v_session_name IS NOT NULL THEN
        v_year := substring(regexp_replace(v_session_name, '[^0-9]', '', 'g') from 1 for 4);
        IF v_year <> '' THEN
          NEW.session_year := v_year;
        END IF;
      END IF;
    END IF;

    -- Generate registration_no if missing
    IF (NEW.registration_no IS NULL OR btrim(NEW.registration_no) = '')
       AND NEW.session_year IS NOT NULL
       AND NEW.roll_number IS NOT NULL THEN
      NEW.registration_no := substring(NEW.session_year from 1 for 4) || NEW.roll_number;
    END IF;

    -- Replace placeholder student_id (STU-xxxxx) with registration_no
    IF NEW.registration_no IS NOT NULL
       AND (NEW.student_id IS NULL OR NEW.student_id LIKE 'STU-%') THEN
      NEW.student_id := NEW.registration_no;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_student_roll_on_approval ON public.students;
CREATE TRIGGER trg_auto_generate_student_roll_on_approval
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_student_roll_on_approval();

-- Migration: 20260512091134_c1ab58d3-1192-4db2-a6bc-4987a9a34f1f.sql
-- Audit table
CREATE TABLE IF NOT EXISTS public.student_type_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  old_type text,
  new_type text NOT NULL,
  reason text,
  changed_by uuid,
  changed_by_name text,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_type_audit_student ON public.student_type_audit(student_id, created_at DESC);

ALTER TABLE public.student_type_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read student_type_audit" ON public.student_type_audit;
CREATE POLICY "admins read student_type_audit"
ON public.student_type_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- No direct INSERT policy: only the SECURITY DEFINER RPC writes here.

-- RPC: change student_type with audit
CREATE OR REPLACE FUNCTION public.change_student_type(
  p_student_id uuid,
  p_new_type text,
  p_reason text DEFAULT NULL
)
RETURNS public.student_type_audit
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
  v_actor uuid := auth.uid();
  v_name text;
  v_email text;
  v_row public.student_type_audit;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT (public.has_role(v_actor, 'admin') OR public.has_role(v_actor, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_new_type NOT IN ('new', 'old') THEN
    RAISE EXCEPTION 'invalid type %', p_new_type;
  END IF;

  SELECT student_type INTO v_old FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  IF COALESCE(v_old, 'new') = p_new_type THEN
    RAISE EXCEPTION 'no change';
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = v_actor;

  UPDATE public.students SET student_type = p_new_type WHERE id = p_student_id;

  INSERT INTO public.student_type_audit (
    student_id, old_type, new_type, reason, changed_by, changed_by_name, changed_by_email
  ) VALUES (
    p_student_id, v_old, p_new_type, NULLIF(btrim(p_reason), ''), v_actor, v_name, v_email
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_student_type(uuid, text, text) TO authenticated;

-- RPC: history fetch
CREATE OR REPLACE FUNCTION public.get_student_type_history(p_student_id uuid)
RETURNS SETOF public.student_type_audit
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.student_type_audit
  WHERE student_id = p_student_id
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_type_history(uuid) TO authenticated;

-- Migration: 20260512091555_d609db20-169a-4350-aef9-f562dc020bc2.sql
-- Tighten student_type RPCs: require super_admin OR explicit 'approve' permission on /admin/students
CREATE OR REPLACE FUNCTION public.change_student_type(
  p_student_id uuid,
  p_new_type text,
  p_reason text DEFAULT NULL
)
RETURNS public.student_type_audit
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
  v_actor uuid := auth.uid();
  v_name text;
  v_email text;
  v_row public.student_type_audit;
  v_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT (
    public.has_role(v_actor, 'super_admin')
    OR public.has_menu_permission(v_actor, '/admin/students', 'approve')
  ) THEN
    RAISE EXCEPTION 'forbidden: explicit approve permission required';
  END IF;
  IF p_new_type NOT IN ('new', 'old') THEN
    RAISE EXCEPTION 'invalid type %', p_new_type;
  END IF;

  SELECT student_type, approval_status INTO v_old, v_status FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  IF COALESCE(v_status, 'pending') <> 'approved' THEN
    RAISE EXCEPTION 'student must be approved before changing type';
  END IF;

  IF COALESCE(v_old, 'new') = p_new_type THEN
    RAISE EXCEPTION 'no change';
  END IF;

  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE id = v_actor;

  UPDATE public.students SET student_type = p_new_type WHERE id = p_student_id;

  INSERT INTO public.student_type_audit (
    student_id, old_type, new_type, reason, changed_by, changed_by_name, changed_by_email
  ) VALUES (
    p_student_id, v_old, p_new_type, btrim(p_reason), v_actor, v_name, v_email
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_type_history(p_student_id uuid)
RETURNS SETOF public.student_type_audit
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.student_type_audit
  WHERE student_id = p_student_id
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_menu_permission(auth.uid(), '/admin/students', 'approve')
      OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
    )
  ORDER BY created_at DESC;
$$;

-- Tighten audit table SELECT: explicit approve/view permission or super_admin
DROP POLICY IF EXISTS "admins read student_type_audit" ON public.student_type_audit;
CREATE POLICY "explicit perm read student_type_audit"
ON public.student_type_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_menu_permission(auth.uid(), '/admin/students', 'approve')
);

-- Migration: 20260512092020_c11eae47-9392-47f1-b9c8-1a330eba9203.sql
CREATE OR REPLACE FUNCTION public.auto_generate_student_roll_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_roll text;
  v_year text;
  v_session_name text;
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN

    -- Generate roll if missing, using site formula (get_next_admission_roll)
    IF (NEW.roll_number IS NULL OR btrim(NEW.roll_number) = '')
       AND NEW.class_id IS NOT NULL
       AND NEW.session_id IS NOT NULL THEN
      BEGIN
        v_next_roll := public.get_next_admission_roll(NEW.class_id, NEW.session_id);
        IF v_next_roll IS NOT NULL AND btrim(v_next_roll) <> '' THEN
          NEW.roll_number := v_next_roll;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'auto roll generation failed: %', SQLERRM;
      END;
    END IF;

    -- Derive session year if missing
    IF NEW.session_year IS NULL OR btrim(NEW.session_year) = '' THEN
      SELECT name INTO v_session_name FROM public.academic_sessions WHERE id = NEW.session_id;
      IF v_session_name IS NOT NULL THEN
        v_year := substring(regexp_replace(v_session_name, '[^0-9]', '', 'g') from 1 for 4);
        IF v_year <> '' THEN
          NEW.session_year := v_year;
        END IF;
      END IF;
    END IF;

    -- Generate registration_no if missing (SessionYear + Roll)
    IF (NEW.registration_no IS NULL OR btrim(NEW.registration_no) = '')
       AND NEW.session_year IS NOT NULL
       AND NEW.roll_number IS NOT NULL THEN
      NEW.registration_no := substring(NEW.session_year from 1 for 4) || NEW.roll_number;
    END IF;

    -- Replace placeholder student_id (STU-xxxxx) with registration_no
    IF NEW.registration_no IS NOT NULL
       AND (NEW.student_id IS NULL OR NEW.student_id LIKE 'STU-%') THEN
      NEW.student_id := NEW.registration_no;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Migration: 20260512204824_45ebb707-ecf5-42d9-a55d-d01d78564d6d.sql
ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS route_mode text NOT NULL DEFAULT 'deny',
  ADD COLUMN IF NOT EXISTS route_patterns text[] NOT NULL DEFAULT ARRAY['/admin','/student-portal','/student-info','/parent-portal','/auth','/login']::text[];

ALTER TABLE public.whatsapp_config
  DROP CONSTRAINT IF EXISTS whatsapp_config_route_mode_check;
ALTER TABLE public.whatsapp_config
  ADD CONSTRAINT whatsapp_config_route_mode_check CHECK (route_mode IN ('deny','allow'));

-- Migration: 20260513020954_b1ace54a-d142-44b2-af0f-0fea19a3416f.sql

-- Zakat & Fitra yearly settings
CREATE TABLE public.zakat_fitra_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  -- Nisab thresholds (in grams)
  nisab_gold_grams numeric NOT NULL DEFAULT 87.48,
  nisab_silver_grams numeric NOT NULL DEFAULT 612.36,
  -- Per-gram prices in BDT
  gold_price_per_gram numeric NOT NULL DEFAULT 0,
  silver_price_per_gram numeric NOT NULL DEFAULT 0,
  -- Zakat rate (percent)
  zakat_rate numeric NOT NULL DEFAULT 2.5,
  -- Fitra options: array of {name_bn, name_en, amount_kg, price_per_kg}
  fitra_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Display
  notes_bn text DEFAULT '',
  notes_en text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zakat_fitra_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active zakat settings"
  ON public.zakat_fitra_settings FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage zakat settings"
  ON public.zakat_fitra_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER zakat_fitra_settings_updated
  BEFORE UPDATE ON public.zakat_fitra_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed current year row
INSERT INTO public.zakat_fitra_settings (year, gold_price_per_gram, silver_price_per_gram, fitra_options)
VALUES (
  EXTRACT(YEAR FROM now())::int,
  12000,
  150,
  '[
    {"name_bn":"গম/আটা","name_en":"Wheat/Flour","amount_kg":1.65,"price_per_kg":70},
    {"name_bn":"যব","name_en":"Barley","amount_kg":3.30,"price_per_kg":120},
    {"name_bn":"খেজুর","name_en":"Dates","amount_kg":3.30,"price_per_kg":600},
    {"name_bn":"কিশমিশ","name_en":"Raisins","amount_kg":3.30,"price_per_kg":850},
    {"name_bn":"পনির","name_en":"Cheese","amount_kg":3.30,"price_per_kg":900}
  ]'::jsonb
);


-- Migration: 20260513021950_16a59d9a-523c-4699-ae3c-c9f1da7f713b.sql

CREATE TABLE public.zakat_calculation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_year integer,
  calc_type text NOT NULL CHECK (calc_type IN ('zakat','fitra')),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_name text,
  contact_phone text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_zakat_logs_created ON public.zakat_calculation_logs (created_at DESC);
CREATE INDEX idx_zakat_logs_type ON public.zakat_calculation_logs (calc_type);

ALTER TABLE public.zakat_calculation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert calculation logs"
  ON public.zakat_calculation_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view calc logs"
  ON public.zakat_calculation_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins delete calc logs"
  ON public.zakat_calculation_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));


-- Migration: 20260513024212_b2e3a960-914f-46b0-b8f5-7e73f75d9d8f.sql
UPDATE website_settings
SET value = value || '[
  {"id":"quran-public","path":"/quran","label_bn":"কুরআন","label_en":"Quran","icon":"","visible":true,"sort_order":9.7},
  {"id":"zakat-fitra-public","path":"/zakat-fitra","label_bn":"যাকাত ও ফিতরা","label_en":"Zakat & Fitra","icon":"","visible":true,"sort_order":9.8}
]'::jsonb,
updated_at = now()
WHERE key = 'public_menu'
  AND NOT (value @> '[{"id":"quran-public"}]'::jsonb);

-- Migration: 20260514172346_a65f2860-d35a-429b-8b7a-437796e0b15d.sql
-- 1) salary_sheet_memos: restrict SELECT to admin/super_admin
DROP POLICY IF EXISTS "Anyone authenticated can read salary memos" ON public.salary_sheet_memos;

CREATE POLICY "Admins read salary memos"
ON public.salary_sheet_memos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2) push_subscriptions: require authentication for INSERT and tie to user_id
DROP POLICY IF EXISTS "Anyone can register push subscription" ON public.push_subscriptions;

CREATE POLICY "Authenticated users register own subscription"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Tighten UPDATE/DELETE to drop the IS NULL escape hatch for any leftover unowned rows
DROP POLICY IF EXISTS "Users delete own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users delete own subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3) whatsapp_config: drop public SELECT, expose safe columns via a view
DROP POLICY IF EXISTS "Anyone can view whatsapp config" ON public.whatsapp_config;

CREATE POLICY "Admins view whatsapp config"
ON public.whatsapp_config
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Public-safe view: excludes business_account_id, phone_number_id, cloud_api_enabled
CREATE OR REPLACE VIEW public.whatsapp_public_config
WITH (security_invoker = on)
AS
SELECT
  id,
  phone_number,
  welcome_message,
  show_floating_button,
  button_position,
  button_label,
  default_language,
  business_hours,
  away_message,
  route_mode,
  route_patterns
FROM public.whatsapp_config;

GRANT SELECT ON public.whatsapp_public_config TO anon, authenticated;

-- View needs a permissive SELECT on underlying table for security_invoker callers.
-- We add a dedicated "public-safe columns only" SELECT policy that the view uses.
-- (Postgres views with security_invoker run with caller's RLS, so we need a policy
-- that lets anyone read — but only the safe column subset is exposed by the view.)
CREATE POLICY "Public read for whatsapp public view"
ON public.whatsapp_config
FOR SELECT
TO anon, authenticated
USING (true);


-- Migration: 20260514173928_07008309-0ca1-479f-b59c-b3c10dbee057.sql

-- 1. Remove the wide-open public policy on the base table
DROP POLICY IF EXISTS "Public read for whatsapp public view" ON public.whatsapp_config;

-- 2. Recreate the public view as SECURITY DEFINER (owner reads base table; callers only see safe columns)
DROP VIEW IF EXISTS public.whatsapp_public_config;

CREATE VIEW public.whatsapp_public_config
WITH (security_invoker = off, security_barrier = on) AS
SELECT
  id,
  phone_number,
  welcome_message,
  show_floating_button,
  button_position,
  button_label,
  default_language,
  business_hours,
  away_message,
  route_mode,
  route_patterns,
  -- Hard-coded false to satisfy existing client typing without leaking real value
  false AS cloud_api_enabled,
  NULL::text AS phone_number_id,
  NULL::text AS business_account_id
FROM public.whatsapp_config
LIMIT 1;

GRANT SELECT ON public.whatsapp_public_config TO anon, authenticated;


-- Migration: 20260516234105_2bb3e2f7-1498-4547-8b76-59f3f6793776.sql
CREATE TABLE IF NOT EXISTS public.user_quran_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_scroll BOOLEAN NOT NULL DEFAULT false,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quran_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.user_quran_prefs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.user_quran_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.user_quran_prefs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.user_quran_prefs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_quran_prefs_updated_at
  BEFORE UPDATE ON public.user_quran_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260516234325_ef292236-ef21-450b-b2de-ea950b0ae940.sql
INSERT INTO public.app_settings (key, value, description)
VALUES ('quran_default_translation', '"both"'::jsonb, 'Default translation state for Quran page: off | bn | en | both')
ON CONFLICT (key) DO NOTHING;

-- Migration: 20260611154720_a435d2a0-9fd9-436c-a9d9-8dec29df682d.sql
ALTER TABLE public.payment_gateway_config
  ADD COLUMN IF NOT EXISTS webhook_secret text NOT NULL DEFAULT '';

-- Migration: 20260620173132_ab55b498-fdc4-4fe2-a737-fec5e32e1fb2.sql
-- Allow issuing a book by free-text name (not in the catalog)
ALTER TABLE public.library_issuances ALTER COLUMN book_id DROP NOT NULL;
ALTER TABLE public.library_issuances ADD COLUMN IF NOT EXISTS custom_book_title text;

-- Migration: 20260620175624_54414fa2-3d88-462e-9d27-43607540609e.sql
CREATE TABLE public.library_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_type text NOT NULL DEFAULT 'student',
  name text NOT NULL,
  member_code text,
  class_name text,
  roll_number text,
  phone text,
  address text,
  notes text,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  deleted_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_profiles TO authenticated;
GRANT ALL ON public.library_profiles TO service_role;

ALTER TABLE public.library_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized roles can view library_profiles"
  ON public.library_profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins can manage library_profiles"
  ON public.library_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can manage library_profiles"
  ON public.library_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE TRIGGER update_library_profiles_updated_at
  BEFORE UPDATE ON public.library_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.library_issuances ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.library_profiles(id) ON DELETE SET NULL;

-- Migration: 20260623193013_6131e8eb-858e-4608-85c3-8ab1f6ea300e.sql

-- 1. SUPA_security_definer_view: replace whatsapp_public_config view with a SECURITY DEFINER function
DROP VIEW IF EXISTS public.whatsapp_public_config;

CREATE OR REPLACE FUNCTION public.get_whatsapp_public_config()
RETURNS TABLE (
  id uuid, phone_number text, welcome_message text, show_floating_button boolean,
  button_position text, button_label text, default_language text, business_hours text,
  away_message text, route_mode text, route_patterns text[], cloud_api_enabled boolean,
  phone_number_id text, business_account_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, phone_number, welcome_message, show_floating_button, button_position,
         button_label, default_language, business_hours, away_message, route_mode,
         route_patterns, false AS cloud_api_enabled, NULL::text AS phone_number_id,
         NULL::text AS business_account_id
  FROM public.whatsapp_config
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_public_config() TO anon, authenticated;

-- 2. committee_members: scope the manage policy to authenticated admins (remove public/anon binding)
DROP POLICY IF EXISTS "Admins can manage committee members" ON public.committee_members;
CREATE POLICY "Admins can manage committee members" ON public.committee_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. donors: remove blanket staff/teacher ALL access, replace with permission-gated writes
DROP POLICY IF EXISTS "Staff can manage donors" ON public.donors;
CREATE POLICY "Permission-gated donor insert" ON public.donors
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'add'::text)
  );
CREATE POLICY "Permission-gated donor update" ON public.donors
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'edit'::text)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'edit'::text)
  );
CREATE POLICY "Permission-gated donor delete" ON public.donors
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'delete'::text)
  );

-- 4. exam_session_students: restrict SELECT to authenticated; add public RPC for result lookup
DROP POLICY IF EXISTS "Public can view published exam_session_students" ON public.exam_session_students;
CREATE POLICY "Authenticated can view published exam_session_students" ON public.exam_session_students
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM exam_sessions es
      WHERE es.id = exam_session_students.exam_session_id AND es.is_published = true
    ))
    OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text)
RETURNS TABLE(student_id uuid, class_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ess.student_id, ess.class_id
  FROM exam_session_students ess
  JOIN exam_sessions es ON es.id = ess.exam_session_id AND es.is_published = true
  JOIN students s ON s.id = ess.student_id
  WHERE ess.exam_session_id = p_session_id
    AND (
      s.roll_number = btrim(p_roll)
      OR s.student_id = btrim(p_roll)
      OR s.registration_no = btrim(p_roll)
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text) TO anon, authenticated;

-- 5. manual_payment_methods: limit public read to active rows only
DROP POLICY IF EXISTS "Anyone can view active manual payment methods" ON public.manual_payment_methods;
CREATE POLICY "Anyone can view active manual payment methods" ON public.manual_payment_methods
  FOR SELECT USING (is_active = true);

-- 6. otp_config: restrict table read to admins; expose safe flags via RPC
DROP POLICY IF EXISTS "Anyone can read otp config" ON public.otp_config;
CREATE POLICY "Admins can read otp config" ON public.otp_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_otp_requirements()
RETURNS TABLE (
  is_enabled boolean, require_for_login boolean, require_for_password_reset boolean,
  require_for_email_change boolean, require_for_password_change boolean, role_overrides jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_enabled, require_for_login, require_for_password_reset,
         require_for_email_change, require_for_password_change, role_overrides
  FROM public.otp_config
  WHERE id = 1
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_otp_requirements() TO anon, authenticated;


-- Migration: 20260624220800_9578f45d-933a-41b1-837b-6b648fdac437.sql
CREATE OR REPLACE FUNCTION public.enforce_library_distributor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  current_name text;
BEGIN
  -- Always bind the issuer to the authenticated user
  NEW.issued_by := auth.uid();

  -- Determine admin privileges
  is_admin := public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin');

  -- Resolve the logged-in user's display name
  SELECT COALESCE(s.name_bn, s.name_en)
    INTO current_name
    FROM public.staff s
   WHERE s.user_id = auth.uid()
     AND s.deleted_at IS NULL
   LIMIT 1;

  IF current_name IS NULL THEN
    SELECT COALESCE(a.name_bn, a.name_en)
      INTO current_name
      FROM public.administrative_officers a
     WHERE a.user_id = auth.uid()
       AND a.deleted_at IS NULL
     LIMIT 1;
  END IF;

  -- Non-admins can never choose another distributor: force their own name
  IF NOT is_admin THEN
    NEW.distributor_name := current_name;
  ELSE
    -- Admins may select someone else; fall back to own name if left blank
    IF NEW.distributor_name IS NULL OR btrim(NEW.distributor_name) = '' THEN
      NEW.distributor_name := current_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_library_distributor ON public.library_issuances;
CREATE TRIGGER trg_enforce_library_distributor
BEFORE INSERT ON public.library_issuances
FOR EACH ROW
EXECUTE FUNCTION public.enforce_library_distributor();

-- Migration: 20260624221024_8f9fe1a6-580f-4842-b105-667e8d43e842.sql
-- 1. Audit table
CREATE TABLE public.library_issuance_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issuance_id uuid,
  action text NOT NULL DEFAULT 'issued',
  issued_by uuid,
  issued_by_name text,
  distributor_name text,
  distributor_changed_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.library_issuance_audit TO authenticated;
GRANT ALL ON public.library_issuance_audit TO service_role;

ALTER TABLE public.library_issuance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view issuance audit"
ON public.library_issuance_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 2. Extend the enforcement trigger to also write audit rows
CREATE OR REPLACE FUNCTION public.enforce_library_distributor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  current_name text;
  changed_by_admin boolean := false;
BEGIN
  NEW.issued_by := auth.uid();

  is_admin := public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin');

  SELECT COALESCE(s.name_bn, s.name_en)
    INTO current_name
    FROM public.staff s
   WHERE s.user_id = auth.uid()
     AND s.deleted_at IS NULL
   LIMIT 1;

  IF current_name IS NULL THEN
    SELECT COALESCE(a.name_bn, a.name_en)
      INTO current_name
      FROM public.administrative_officers a
     WHERE a.user_id = auth.uid()
       AND a.deleted_at IS NULL
     LIMIT 1;
  END IF;

  IF NOT is_admin THEN
    NEW.distributor_name := current_name;
  ELSE
    IF NEW.distributor_name IS NULL OR btrim(NEW.distributor_name) = '' THEN
      NEW.distributor_name := current_name;
    ELSIF current_name IS NOT NULL
          AND btrim(NEW.distributor_name) <> btrim(current_name) THEN
      changed_by_admin := true;
    END IF;
  END IF;

  INSERT INTO public.library_issuance_audit (
    issuance_id, action, issued_by, issued_by_name,
    distributor_name, distributor_changed_by_admin
  ) VALUES (
    NEW.id, 'issued', auth.uid(), current_name,
    NEW.distributor_name, changed_by_admin
  );

  RETURN NEW;
END;
$$;

-- Migration: 20260624234300_d5954634-2d6d-4b7d-b72e-95dee7b36f2d.sql
ALTER TABLE public.library_issuance_audit
  ADD COLUMN IF NOT EXISTS old_distributor_name text,
  ADD COLUMN IF NOT EXISTS new_distributor_name text;

CREATE OR REPLACE FUNCTION public.enforce_library_distributor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  current_name text;
  changed_by_admin boolean := false;
  old_name text;
BEGIN
  NEW.issued_by := auth.uid();

  is_admin := public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin');

  SELECT COALESCE(s.name_bn, s.name_en)
    INTO current_name
    FROM public.staff s
   WHERE s.user_id = auth.uid()
     AND s.deleted_at IS NULL
   LIMIT 1;

  IF current_name IS NULL THEN
    SELECT COALESCE(a.name_bn, a.name_en)
      INTO current_name
      FROM public.administrative_officers a
     WHERE a.user_id = auth.uid()
       AND a.deleted_at IS NULL
     LIMIT 1;
  END IF;

  -- The "old" distributor is the logged-in user's own name (the default)
  old_name := current_name;

  IF NOT is_admin THEN
    NEW.distributor_name := current_name;
  ELSE
    IF NEW.distributor_name IS NULL OR btrim(NEW.distributor_name) = '' THEN
      NEW.distributor_name := current_name;
    ELSIF current_name IS NOT NULL
          AND btrim(NEW.distributor_name) <> btrim(current_name) THEN
      changed_by_admin := true;
    END IF;
  END IF;

  INSERT INTO public.library_issuance_audit (
    issuance_id, action, issued_by, issued_by_name,
    distributor_name, distributor_changed_by_admin,
    old_distributor_name, new_distributor_name
  ) VALUES (
    NEW.id, 'issued', auth.uid(), current_name,
    NEW.distributor_name, changed_by_admin,
    old_name, NEW.distributor_name
  );

  RETURN NEW;
END;
$function$;

-- Migration: 20260626173713_b25465e8-5eaf-4331-9ad3-d8fbe27b665d.sql
CREATE TABLE public.hostel_meal_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allocation_id uuid NOT NULL REFERENCES public.hostel_allocations(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  breakfast boolean NOT NULL DEFAULT false,
  lunch boolean NOT NULL DEFAULT false,
  dinner boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (allocation_id, attendance_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_meal_attendance TO authenticated;
GRANT ALL ON public.hostel_meal_attendance TO service_role;

ALTER TABLE public.hostel_meal_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view meal attendance"
  ON public.hostel_meal_attendance FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert meal attendance"
  ON public.hostel_meal_attendance FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update meal attendance"
  ON public.hostel_meal_attendance FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete meal attendance"
  ON public.hostel_meal_attendance FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_hostel_meal_attendance_updated_at
  BEFORE UPDATE ON public.hostel_meal_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260626180314_4a83abab-7f0a-4ebb-8975-73afe973cdf6.sql
-- Allow meal attendance without an allocation
ALTER TABLE public.hostel_meal_attendance ALTER COLUMN allocation_id DROP NOT NULL;

ALTER TABLE public.hostel_meal_attendance
  ADD COLUMN IF NOT EXISTS person_type text,
  ADD COLUMN IF NOT EXISTS person_id uuid,
  ADD COLUMN IF NOT EXISTS person_name text;

-- Unique index for ad-hoc (non-allocation) members per date
CREATE UNIQUE INDEX IF NOT EXISTS hostel_meal_attendance_person_date_key
  ON public.hostel_meal_attendance (person_type, person_id, attendance_date)
  WHERE allocation_id IS NULL;

-- Migration: 20260626194239_c60321a7-ff71-4b82-8d99-10d44616b453.sql
CREATE OR REPLACE FUNCTION public.get_hostel_attendance_roster(p_person_type text)
RETURNS TABLE (
  id uuid,
  person_type text,
  person_code text,
  name_bn text,
  name_en text,
  session_id uuid,
  class_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'view'::text)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'add'::text)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_person_type = 'student' THEN
    RETURN QUERY
    SELECT
      s.id,
      'student'::text AS person_type,
      s.student_id::text AS person_code,
      s.name_bn::text AS name_bn,
      s.name_en::text AS name_en,
      s.session_id,
      s.class_id
    FROM public.students s
    WHERE s.deleted_at IS NULL
    ORDER BY COALESCE(s.roll_number, s.student_id), s.name_bn;
  ELSIF p_person_type = 'staff' THEN
    RETURN QUERY
    SELECT
      st.id,
      'staff'::text AS person_type,
      st.staff_id::text AS person_code,
      st.name_bn::text AS name_bn,
      st.name_en::text AS name_en,
      NULL::uuid AS session_id,
      NULL::uuid AS class_id
    FROM public.staff st
    WHERE st.deleted_at IS NULL
      AND COALESCE(st.status, 'active') <> 'inactive'
    ORDER BY st.name_bn;
  ELSE
    RAISE EXCEPTION 'Invalid person type';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hostel_attendance_roster(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hostel_attendance_roster(text) TO authenticated;

-- Migration: 20260626204154_9a951ad8-73ac-43e1-befd-e4e4075064b3.sql
ALTER TABLE public.hostel_meal_attendance ALTER COLUMN breakfast DROP NOT NULL, ALTER COLUMN breakfast DROP DEFAULT;
ALTER TABLE public.hostel_meal_attendance ALTER COLUMN lunch DROP NOT NULL, ALTER COLUMN lunch DROP DEFAULT;
ALTER TABLE public.hostel_meal_attendance ALTER COLUMN dinner DROP NOT NULL, ALTER COLUMN dinner DROP DEFAULT;

-- Migration: 20260626205225_b591eced-9e03-4fa4-9369-7b1c52ff7ce8.sql

-- Ensure meal columns default to NULL (unmarked) rather than a forced value
ALTER TABLE public.hostel_meal_attendance
  ALTER COLUMN breakfast DROP DEFAULT,
  ALTER COLUMN lunch DROP DEFAULT,
  ALTER COLUMN dinner DROP DEFAULT;

-- Trigger function: clean up rows that have no attendance marked anymore
CREATE OR REPLACE FUNCTION public.cleanup_empty_meal_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.breakfast IS NULL
     AND NEW.lunch IS NULL
     AND NEW.dinner IS NULL
     AND (NEW.notes IS NULL OR btrim(NEW.notes) = '') THEN
    DELETE FROM public.hostel_meal_attendance WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_empty_meal_attendance ON public.hostel_meal_attendance;
CREATE TRIGGER trg_cleanup_empty_meal_attendance
  AFTER UPDATE ON public.hostel_meal_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_empty_meal_attendance();


-- Migration: 20260627194538_6ff0e8e6-a2a9-4c0d-a6e2-6ab508d437f1.sql
UPDATE public.salary_records
SET base_salary = 10000,
    net_salary = net_salary - (base_salary - 10000)
WHERE staff_id = 'ff848982-81e4-472b-bb31-a42e0adf30b0'
  AND month_year = '2026-05'
  AND status = 'pending'
  AND base_salary = 12000;

-- Migration: 20260627194922_3f551853-8cd4-4b52-a8f9-6ca9d56b923d.sql
UPDATE public.salary_records
SET base_salary = 10000,
    net_salary = net_salary - (base_salary - 10000),
    updated_at = now()
WHERE staff_id = 'ff848982-81e4-472b-bb31-a42e0adf30b0'
  AND month_year = '2026-05'
  AND status = 'pending'
  AND base_salary = 12000;

-- Migration: 20260627202509_3896bd32-b3b3-42bc-8c96-049ad4088aa9.sql
CREATE OR REPLACE FUNCTION public.enforce_staff_joining_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.joining_date IS NULL THEN
    RAISE EXCEPTION 'JOINING_DATE_REQUIRED'
      USING HINT = 'যোগদানের তারিখ দিন';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_joining_date ON public.staff;
CREATE TRIGGER trg_enforce_staff_joining_date
  BEFORE INSERT ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_joining_date();

-- Migration: 20260627202825_cb72ecd2-8e74-41ec-b00d-50f6ab9abf3b.sql
CREATE OR REPLACE FUNCTION public.enforce_admin_officer_joining_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.joining_date IS NULL THEN
    RAISE EXCEPTION 'JOINING_DATE_REQUIRED'
      USING HINT = 'যোগদানের তারিখ দিন';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_admin_officer_joining_date ON public.administrative_officers;
CREATE TRIGGER trg_enforce_admin_officer_joining_date
  BEFORE INSERT ON public.administrative_officers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_officer_joining_date();

-- Migration: 20260630015610_97ae554c-c59c-424c-9a6a-fd6a9e4e3b48.sql
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS other_allowance_note text;

-- Migration: 20260701174639_c92eac57-924d-4db7-9faf-66711155f292.sql
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS other_deduction_note TEXT;

-- Migration: 20260701175435_4f61b629-9d87-46ed-a3f4-dba24788cb9b.sql
DROP TRIGGER IF EXISTS trg_auto_salary_on_attendance ON public.attendance_records;
DROP FUNCTION IF EXISTS public.auto_create_salary_on_attendance();

-- Migration: 20260701195337_97df3ac3-b994-4620-9c8b-6aad8885b9e7.sql

-- ============================================================
-- 1. hostel_meal_attendance — restrict CRUD to admins / hostel-permitted staff
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view meal attendance" ON public.hostel_meal_attendance;
DROP POLICY IF EXISTS "Authenticated can insert meal attendance" ON public.hostel_meal_attendance;
DROP POLICY IF EXISTS "Authenticated can update meal attendance" ON public.hostel_meal_attendance;
DROP POLICY IF EXISTS "Authenticated can delete meal attendance" ON public.hostel_meal_attendance;

CREATE POLICY "Hostel staff can view meal attendance"
ON public.hostel_meal_attendance FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'view'::text)
);

CREATE POLICY "Hostel staff can insert meal attendance"
ON public.hostel_meal_attendance FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
);

CREATE POLICY "Hostel staff can update meal attendance"
ON public.hostel_meal_attendance FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'edit'::text)
);

CREATE POLICY "Hostel staff can delete meal attendance"
ON public.hostel_meal_attendance FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/hostel'::text, 'delete'::text)
);

-- ============================================================
-- 2. meetings & meeting_participants — restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON public.meetings;
CREATE POLICY "Staff and attendees can view meetings"
ON public.meetings FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/meetings'::text, 'view'::text)
  OR access_mode IN ('public', 'logged_in')
  OR EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = meetings.id AND mp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can view meeting participants" ON public.meeting_participants;
CREATE POLICY "Staff and self can view meeting participants"
ON public.meeting_participants FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/meetings'::text, 'view'::text)
  OR user_id = auth.uid()
);

-- ============================================================
-- 3. role_permissions — restrict SELECT to admins or own role
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view role_permissions" ON public.role_permissions;
CREATE POLICY "View own role or admin role_permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR role = get_user_role(auth.uid())
);

-- ============================================================
-- 4. Audit/log tables — restrict INSERT
-- ============================================================
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "Admins can insert system logs"
ON public.system_logs FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "System can insert audit log" ON public.committee_audit_log;
CREATE POLICY "Admins can insert committee audit log"
ON public.committee_audit_log FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated can insert salary generation log" ON public.salary_generation_log;
CREATE POLICY "Admins can insert salary generation log"
ON public.salary_generation_log FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/salary'::text, 'add'::text)
);


-- Migration: 20260701195621_acbed751-054d-424d-be3b-e5a8898dc139.sql

DROP POLICY IF EXISTS "Public can signup as parent" ON public.parent_accounts;
CREATE POLICY "Public can signup as parent"
ON public.parent_accounts FOR INSERT
WITH CHECK (
  status = 'pending'
  AND email_verified = false
  AND linked_student_uuid IS NULL
  AND (linked_student_uuids IS NULL OR linked_student_uuids = ARRAY[]::uuid[])
);


-- Migration: 20260703000339_79351695-ff40-4813-a33c-f9b399cd4d0b.sql
ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS calc_basis TEXT,
  ADD COLUMN IF NOT EXISTS earned_from_attendance NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_for_net NUMERIC,
  ADD COLUMN IF NOT EXISTS deductions_deferred BOOLEAN DEFAULT false;

-- Migration: 20260718174735_0b5af149-8017-4e3f-a204-72a4d1b09bcd.sql

-- Fix 1: custom_form_submissions — prevent spoofing submitted_by
DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.custom_form_submissions;
CREATE POLICY "Anyone can insert submissions"
  ON public.custom_form_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by IS NULL OR submitted_by = auth.uid());

-- Fix 2: realtime.messages — drop unscoped permissive broadcast/subscribe policies.
-- App does not use realtime broadcast/presence (only postgres_changes, which does
-- not require policies on realtime.messages). Removing these prevents any
-- authenticated user from listening to or injecting into arbitrary topics.
DROP POLICY IF EXISTS "Authenticated can broadcast to realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages;


-- Migration: 20260729183548_0ffa0497-210c-4f9c-8661-cb3f2c109dfe.sql
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;

-- Migration: 20260729190911_3f050f64-49a3-4f40-be79-9203f624242b.sql
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS overtime_reason text;

-- Migration: 20260729200403_9c90eb7f-66d7-409f-b206-ce24af36c3d2.sql
insert into public.salary_settings (setting_key, setting_value)
values ('unmarked_days_paid', '{"enabled": false}'::jsonb)
on conflict (setting_key) do update
set setting_value = excluded.setting_value,
    updated_at = now();

-- Migration: 20260801180133_e279af2b-1c4f-4269-a727-b1a6ba19bf84.sql
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Super admins: full control over all roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admins: can manage non-super_admin roles only, and cannot touch super_admin rows
CREATE POLICY "Admins can manage non-super-admin roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND role <> 'super_admin'::app_role)
WITH CHECK (public.has_role(auth.uid(), 'admin') AND role <> 'super_admin'::app_role);

-- Migration: 20260801182559_5d09a64f-db6d-41c2-bc34-8ef4db949411.sql
CREATE TABLE public.duty_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_bn text NOT NULL,
  name_en text,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  grace_minutes integer NOT NULL DEFAULT 0,
  pay_amount numeric,
  pay_type text CHECK (pay_type IN ('per_day','per_hour','monthly')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_shifts TO authenticated;
GRANT ALL ON public.duty_shifts TO service_role;

ALTER TABLE public.duty_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duty_shifts_select_auth" ON public.duty_shifts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "duty_shifts_admin_insert" ON public.duty_shifts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "duty_shifts_admin_update" ON public.duty_shifts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "duty_shifts_admin_delete" ON public.duty_shifts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER update_duty_shifts_updated_at
  BEFORE UPDATE ON public.duty_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.duty_shifts (code, name_bn, name_en, start_time, end_time, sort_order)
VALUES
  ('morning','সকাল','Morning','08:00','13:00',1),
  ('evening','সন্ধ্যা','Evening','16:00','21:00',2);

-- Migration: 20260801183006_19bc1645-9639-499d-ad50-bd0f1aad33e4.sql
CREATE TABLE public.duty_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.duty_shifts(id) ON DELETE RESTRICT,
  duty_date date NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, duty_date, shift_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_roster TO authenticated;
GRANT ALL ON public.duty_roster TO service_role;

ALTER TABLE public.duty_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage duty roster"
ON public.duty_roster FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff view own duty roster"
ON public.duty_roster FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_roster.staff_id AND s.user_id = auth.uid()));

CREATE INDEX idx_duty_roster_date ON public.duty_roster(duty_date);
CREATE INDEX idx_duty_roster_staff ON public.duty_roster(staff_id);

CREATE TRIGGER update_duty_roster_updated_at
BEFORE UPDATE ON public.duty_roster
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260801190434_7fb70e93-e47d-4db3-b61c-c4c058b5f50f.sql
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duty_roster;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.duty_roster REPLICA IDENTITY FULL;

-- Migration: 20260801191737_024704a0-cf33-4b62-bd01-7ea60e36508e.sql
ALTER TABLE public.duty_shifts
  ADD COLUMN IF NOT EXISTS attendance_mode text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS machine_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS machine_open_before_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS machine_close_after_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS early_exit_grace_minutes integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.duty_weekly_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.duty_shifts(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, shift_id, weekday)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_weekly_template TO authenticated;
GRANT ALL ON public.duty_weekly_template TO service_role;
ALTER TABLE public.duty_weekly_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage weekly duty template"
ON public.duty_weekly_template FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can view weekly duty template"
ON public.duty_weekly_template FOR SELECT TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.duty_shift_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.duty_shifts(id) ON DELETE CASCADE,
  duty_date date NOT NULL,
  status text NOT NULL DEFAULT 'present',
  check_in_time time,
  check_out_time time,
  late_minutes integer NOT NULL DEFAULT 0,
  early_exit_minutes integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  device_id text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, shift_id, duty_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_shift_attendance_date ON public.duty_shift_attendance(duty_date);
CREATE INDEX IF NOT EXISTS idx_duty_weekly_template_weekday ON public.duty_weekly_template(weekday);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_shift_attendance TO authenticated;
GRANT ALL ON public.duty_shift_attendance TO service_role;
ALTER TABLE public.duty_shift_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage duty shift attendance"
ON public.duty_shift_attendance FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can view duty shift attendance"
ON public.duty_shift_attendance FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER trg_duty_weekly_template_updated_at
BEFORE UPDATE ON public.duty_weekly_template
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_duty_shift_attendance_updated_at
BEFORE UPDATE ON public.duty_shift_attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.duty_shift_attendance;

-- Migration: 20260801194332_a8e73269-1094-4e1d-bab3-87bf72c59bdb.sql
CREATE TABLE public.duty_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  action text NOT NULL,
  staff_id uuid,
  staff_name text,
  shift_id uuid,
  shift_name text,
  weekday smallint,
  duty_date date,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  changed_by_name text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.duty_change_audit TO authenticated;
GRANT ALL ON public.duty_change_audit TO service_role;

ALTER TABLE public.duty_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view duty change audit"
ON public.duty_change_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_duty_change_audit_created ON public.duty_change_audit (created_at DESC);
CREATE INDEX idx_duty_change_audit_staff ON public.duty_change_audit (staff_id);

CREATE OR REPLACE FUNCTION public.log_duty_weekly_template_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_name text;
  v_shift_name text;
  v_actor_name text;
  v_action text;
  v_rec public.duty_weekly_template;
BEGIN
  v_rec := COALESCE(NEW, OLD);

  SELECT name_bn INTO v_staff_name FROM public.staff WHERE id = v_rec.staff_id;
  SELECT name_bn INTO v_shift_name FROM public.duty_shifts WHERE id = v_rec.shift_id;
  SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := CASE WHEN NEW.is_active THEN 'assigned' ELSE 'removed' END;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := CASE WHEN NEW.is_active THEN 'assigned' ELSE 'removed' END;
  ELSE
    v_action := 'removed';
  END IF;

  INSERT INTO public.duty_change_audit (
    source, action, staff_id, staff_name, shift_id, shift_name, weekday,
    old_value, new_value, changed_by, changed_by_name, ip_address, user_agent
  ) VALUES (
    'weekly_template', v_action, v_rec.staff_id, v_staff_name, v_rec.shift_id, v_shift_name, v_rec.weekday,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid(), v_actor_name, public.get_request_ip(), public.get_request_ua()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_duty_weekly_template
AFTER INSERT OR UPDATE OR DELETE ON public.duty_weekly_template
FOR EACH ROW EXECUTE FUNCTION public.log_duty_weekly_template_change();

CREATE OR REPLACE FUNCTION public.log_duty_roster_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_name text;
  v_shift_name text;
  v_actor_name text;
  v_action text;
  v_rec public.duty_roster;
BEGIN
  v_rec := COALESCE(NEW, OLD);

  SELECT name_bn INTO v_staff_name FROM public.staff WHERE id = v_rec.staff_id;
  SELECT name_bn INTO v_shift_name FROM public.duty_shifts WHERE id = v_rec.shift_id;
  SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();

  v_action := CASE TG_OP WHEN 'INSERT' THEN 'assigned' WHEN 'UPDATE' THEN 'updated' ELSE 'removed' END;

  INSERT INTO public.duty_change_audit (
    source, action, staff_id, staff_name, shift_id, shift_name, duty_date,
    old_value, new_value, changed_by, changed_by_name, ip_address, user_agent
  ) VALUES (
    'daily_roster', v_action, v_rec.staff_id, v_staff_name, v_rec.shift_id, v_shift_name, v_rec.duty_date,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid(), v_actor_name, public.get_request_ip(), public.get_request_ua()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_duty_roster
AFTER INSERT OR UPDATE OR DELETE ON public.duty_roster
FOR EACH ROW EXECUTE FUNCTION public.log_duty_roster_change();

-- Migration: 20260807185446_f157fbb8-19b4-4954-8eba-18ff3bf73833.sql
CREATE TABLE public.staff_machine_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  device_user_id TEXT NOT NULL,
  device_serial TEXT,
  finger_index INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_machine_users_unique_user
  ON public.staff_machine_users (device_user_id, COALESCE(device_serial, ''));
CREATE INDEX idx_staff_machine_users_staff ON public.staff_machine_users (staff_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_machine_users TO authenticated;
GRANT ALL ON public.staff_machine_users TO service_role;

ALTER TABLE public.staff_machine_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff machine users"
ON public.staff_machine_users FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_staff_machine_users_updated_at
BEFORE UPDATE ON public.staff_machine_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.machine_punch_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_serial TEXT,
  device_user_id TEXT NOT NULL,
  punch_at TIMESTAMPTZ NOT NULL,
  punch_date DATE NOT NULL,
  punch_time TIME NOT NULL,
  direction TEXT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.duty_shifts(id) ON DELETE SET NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  result TEXT,
  error TEXT,
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX machine_punch_log_dedupe
  ON public.machine_punch_log (COALESCE(device_serial, ''), device_user_id, punch_at);
CREATE INDEX idx_machine_punch_log_date ON public.machine_punch_log (punch_date DESC);

GRANT SELECT ON public.machine_punch_log TO authenticated;
GRANT ALL ON public.machine_punch_log TO service_role;

ALTER TABLE public.machine_punch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view machine punch log"
ON public.machine_punch_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Migration: 20260817133800_update_student_names.sql
UPDATE public.students SET name_bn = 'ছাদিকুর রহমান ১', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' AND roll_number = '7001' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রেজাউল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' AND roll_number = '7002' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ছাদিকুর রহমান ২', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' AND roll_number = '7003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আল রাহী', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' AND roll_number = '7004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সালমান আল সাদী', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' AND roll_number = '7005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রাহিম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' AND roll_number = '7006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রবিউল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' AND roll_number = '7007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রেজাউল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' AND roll_number = '6001' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ইমানুল্লাহ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' AND roll_number = '6002' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মুজাহিদুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' AND roll_number = '6003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সজিব আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' AND roll_number = '6004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মাহদী হাসান', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' AND roll_number = '6005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রিফাত হাসান', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' AND roll_number = '6006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'নাঈম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' AND roll_number = '6007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মাকমুন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5001' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ছামী আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5002' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মিজান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আব্দুর রহিম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'বিলাল আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হোসাইন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'নাহিন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তাহমিদ হাসান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5008' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মাহিন আলম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '894db1e1-1c5d-45d2-b838-299e17b7e185' AND roll_number = '5009' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সিয়াম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4001' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'এহসান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4002' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রবিউল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মিজানুর রহমান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মুজাহিদুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ইকবাল হোসেন', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আল মজিদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'শাহিরুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4008' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আল মামুন', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4009' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মুহিবুর রহমান রনি', updated_at = NOW(), deleted_at = NULL WHERE class_id = '0df6a29c-5783-4662-8c8e-0274982c3ab5' AND roll_number = '4010' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মুনাঈম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3001' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হোজাইফা আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সাব্বির আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'নাজমুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ফাহিম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আলী আমজদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মাহদী হাসান', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3008' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'কফিল উদ্দিন', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3009' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মোবাশ্বির আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3010' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আলী নেওয়াজ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3011' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = ' সাইফুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3012' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তাওহিদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3013' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'শামীম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3014' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আমিনুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3015' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তানভীর আহমদ ১', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3016' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রায়হান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3017' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মুহিব্বুল মোরসালিন', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3018' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মোতাহারুর রহমান', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3019' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ইউসুফ আলী', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3020' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তানভীর আহমদ ২', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'f06681a5-06f2-438e-a727-ad684260be34' AND roll_number = '3021' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তাহফিমুল ইসলাম আমিন', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8001' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'জুনাইদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8002' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রোহাদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সবিজ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মুস্তাকিম বিল্লাহ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রাঈদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হোসাইন আহমদ ১', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হোসাইন আহমদ ২', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8008' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আরিফ বিল্লাহ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8009' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তামিম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8010' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আব্দুল আহাদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8011' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'লাহিন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8012' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রহমত উল্লাহ সৌরভ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8013' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সারোয়ার আলম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8014' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আবু সুফিয়ান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8015' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রাহাত আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8016' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সাইম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '3770ea93-d762-44ab-9850-01b512166600' AND roll_number = '8017' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আজিজুর রহমান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2001' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'নূরুল আমিন', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2002' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'শাফায়েত আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রাকিব আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তারেক আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হিজার উদ্দিন', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মোছাচ্ছির আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ছামী আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2008' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তাহসিন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2009' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সারোয়ার আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2010' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আব্দুল্লাহ নীরব', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2011' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হাবিবুর রহমান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2012' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তালহা খাঁন', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2013' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আরিয়ান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2014' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আরিয়ান খাঁন', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2015' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রবিউল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2016' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রায়হান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2017' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আব্দুল কাইয়ুম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2018' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রোমান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2019' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আবু সুফিয়ান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2020' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তায়েফ হাসান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2021' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রোহান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2022' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সাফওয়ান আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2023' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সাকিবুল হাসান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2024' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সাকিরুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2025' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তানভীর আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2026' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ফুহাদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2027' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হিফজুর রহমান', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2028' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মেরাজুল হক', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2029' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'নৌশাদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2030' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মাছুম আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2031' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আব্দুস সামাদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = '2f15f4fc-2f79-4397-b066-0e0971fae924' AND roll_number = '2032' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'তাহমিদ আলী', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1002' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আব্দুল মুমিন', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1003' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'নাহিদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1004' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সাদিকুর রহমান', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1005' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ফারহান খাঁন', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1006' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মুখতাসির আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1007' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'জামিল আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1008' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আব্দুস সামাদ রাফি', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1009' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ইয়ামিন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1010' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'সাকিবুল হাসান', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1011' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'রবিউল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1012' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মাহবুব আলম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1013' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'হাসান আলী', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1014' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'বায়েজীদ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1015' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'ইয়ামিন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1016' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'নাফিজ আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1017' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'এনামুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1018' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আমিনুল ইসলাম', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1019' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'আমির হামজা', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1020' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'জুমুন আহমদ', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1021' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.students SET name_bn = 'মামুন আহমদ রিয়াপডেট', updated_at = NOW(), deleted_at = NULL WHERE class_id = 'b938e12b-a65a-44ab-beab-0f761175c67d' AND roll_number = '1022' AND session_id = 'b34fd827-6ef8-443a-a810-b4e5e372d888';
UPDATE public.classes SET name_bn = 'মুতাঃ ৩য় বর্ষ', updated_at = NOW() WHERE id = 'dea01e69-e7c2-470f-badf-742a767a00c7';
UPDATE public.classes SET name_bn = 'মুতাঃ ২য় বর্ষ', updated_at = NOW() WHERE id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3';
UPDATE public.classes SET name_bn = 'ইবতেদায়ী মে', updated_at = NOW() WHERE id = '894db1e1-1c5d-45d2-b838-299e17b7e185';
UPDATE public.classes SET name_bn = 'ইবতেদায়ী ৪র্থ', updated_at = NOW() WHERE id = '0df6a29c-5783-4662-8c8e-0274982c3ab5';
UPDATE public.classes SET name_bn = 'নুরানী ৩য়', updated_at = NOW() WHERE id = 'f06681a5-06f2-438e-a727-ad684260be34';
UPDATE public.classes SET name_bn = 'হিফজ নাজারা', updated_at = NOW() WHERE id = '3770ea93-d762-44ab-9850-01b512166600';
UPDATE public.classes SET name_bn = 'নুরানী ২য়', updated_at = NOW() WHERE id = '2f15f4fc-2f79-4397-b066-0e0971fae924';
UPDATE public.classes SET name_bn = 'নুরানী ১ম', updated_at = NOW() WHERE id = 'b938e12b-a65a-44ab-beab-0f761175c67d';


-- Migration: 20260818175354_8eea84c4-5672-443d-ace4-4cab2562c498.sql
-- Update foreign key to CASCADE delete for question_papers
ALTER TABLE public.question_papers
DROP CONSTRAINT IF EXISTS question_papers_exam_session_id_fkey,
ADD CONSTRAINT question_papers_exam_session_id_fkey 
FOREIGN KEY (exam_session_id) 
REFERENCES public.exam_sessions(id) 
ON DELETE CASCADE;


-- Migration: 20260818181750_b140f9f1-85ca-465b-9d07-f5fded4bc897.sql
UPDATE public.students
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id = 'd6bc5d64-a6db-4d92-9040-0629659d1ae0'
  AND deleted_at IS NULL;

-- Migration: 20260818184026_3bd93a11-a1a9-4447-939f-9bd1c6692d35.sql
UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' 
AND id IN (
    '7f0bf5d3-afb1-4c6b-aefc-06eee241bccd',
    '97e5354d-68af-4e3b-a845-5b4901b6905d',
    '7a4edfa0-4063-400e-ac41-072f5cd4c874',
    'aca9414e-58a5-4055-9ecb-7aa3c83d6830',
    'cca58b17-418c-425e-a8a8-f1449371594d',
    'e445e695-9e79-4a6a-947f-233615245b3a',
    '265fe7e9-2943-40a1-a2b9-740db1789852',
    '34bc1a98-3c65-4c7f-a09c-372e0cb61ba3',
    '637ea970-e9e1-4a4d-87b4-4d57a47f167e',
    '2bffab7f-27cf-4d4e-9f6c-782881dc64a3',
    'c0c2619d-3d96-46e7-8b91-81587e38ce15',
    '1bd64223-e2c4-4f07-8fd1-a780e94a8597',
    '297ed2b1-1a43-4191-af54-04e0ff0f54ce'
);

-- Migration: 20260818184745_c15deeef-c8e2-4a97-a510-dd4a2ec3230b.sql
-- Clear father_name and mother_name for all active students
UPDATE public.students
SET father_name = NULL,
    mother_name = NULL
WHERE deleted_at IS NULL;

-- GRANTs are already in place for public.students from previous migrations, 
-- but ensuring we don't break permissions if someone re-runs.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;


-- Migration: 20260818185000_cleanup_muta_students.sql
-- Force soft-delete for Muta 2nd Year (Nahbemir 7th) students with roll > 6007
UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' 
  AND roll_number::integer > 6007 
  AND deleted_at IS NULL;

-- Force soft-delete for Muta 3rd Year (Sarf 7th) students with roll > 7007
UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' 
  AND roll_number::integer > 7007 
  AND deleted_at IS NULL;


-- Migration: 20260818192003_a4472a24-f605-4292-a697-826381aff79b.sql
UPDATE public.students SET father_name = NULL, mother_name = NULL WHERE deleted_at IS NULL;

-- Migration: 20260818193000_clear_parent_names.sql
-- Clear father_name and mother_name for all active students
UPDATE public.students
SET father_name = NULL,
    mother_name = NULL
WHERE deleted_at IS NULL;

-- GRANTs are already in place for public.students from previous migrations, 
-- but ensuring we don't break permissions if someone re-runs.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;


-- Migration: 20260818193104_89da99f6-c680-4701-ad3f-8ac912692767.sql
ALTER TABLE public.pending_actions ADD COLUMN IF NOT EXISTS requires_admin_approval boolean DEFAULT false;
GRANT ALL ON public.pending_actions TO authenticated;
GRANT ALL ON public.pending_actions TO service_role;

-- Migration: 20260818193201_028d30c1-9228-4f17-8cfd-5ba46ff753f4.sql
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS approval_reject boolean DEFAULT false;

-- Migration: 20260818194648_e2e25f75-7625-4d48-a749-437b4005ccad.sql
CREATE OR REPLACE FUNCTION public.notify_admins_of_pending_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  msg text;
  msg_bn text;
BEGIN
  -- Build the notification message
  msg := 'New approval request: ' || NEW.action_type || ' on ' || NEW.target_table || ' by ' || NEW.user_name;
  msg_bn := 'নতুন অনুমোদনের অনুরোধ: ' || NEW.user_name || ' কর্তৃক ' || NEW.target_table || ' টেবিলে ' || NEW.action_type || ' অ্যাকশন';

  -- Find all admins (profile.role = 'admin' or profile.role = 'super_admin')
  -- Note: The user_roles table is where roles are actually stored according to project guidelines.
  FOR admin_id IN 
    SELECT user_id 
    FROM public.user_roles 
    WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      title_bn,
      message,
      message_bn,
      type,
      category,
      link
    ) VALUES (
      admin_id,
      'Approval Request',
      'অনুমোদনের অনুরোধ',
      msg,
      msg_bn,
      'warning',
      'approval',
      '/admin/approvals'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_pending_action ON public.pending_actions;

CREATE TRIGGER trg_notify_admins_on_pending_action
AFTER INSERT ON public.pending_actions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_of_pending_action();

GRANT EXECUTE ON FUNCTION public.notify_admins_of_pending_action() TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notifications TO authenticated;


-- Migration: 20260819114527_df695a44-707d-46ac-9bc3-9aff0f30b230.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;

DROP POLICY IF EXISTS "Super admins can manage results" ON public.results;
CREATE POLICY "Super admins can manage results"
ON public.results FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Migration: 20260819150029_aff43201-4424-4fc5-8e06-28a02b748273.sql
DELETE FROM exam_session_subjects WHERE exam_session_id='2b8df410-0c4b-45d5-95ff-1bc750710541';
DELETE FROM exam_session_students WHERE exam_session_id='2b8df410-0c4b-45d5-95ff-1bc750710541';
DELETE FROM exam_session_classes WHERE exam_session_id='2b8df410-0c4b-45d5-95ff-1bc750710541';
DELETE FROM exam_sessions WHERE id='2b8df410-0c4b-45d5-95ff-1bc750710541';
CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_unique_name_per_session ON public.exam_sessions (academic_session_id, exam_type, lower(name));

-- Migration: 20260819174811_c93c4737-949e-4da1-aed2-0a741beb94e9.sql
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE OR REPLACE FUNCTION public.set_results_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.updated_by := COALESCE(auth.uid(), OLD.updated_by);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_results_actor ON public.results;
CREATE TRIGGER trg_results_actor
BEFORE INSERT OR UPDATE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.set_results_actor();

-- Migration: 20260821054344_90ed3b67-ca26-42bb-9e31-d7cecb7e696b.sql
-- Update the RPC to include class filtering
CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL)
RETURNS TABLE(student_id uuid, class_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ess.student_id, ess.class_id
  FROM exam_session_students ess
  JOIN exam_sessions es ON es.id = ess.exam_session_id AND es.is_published = true
  JOIN students s ON s.id = ess.student_id
  WHERE ess.exam_session_id = p_session_id
    AND (p_class_id IS NULL OR ess.class_id = p_class_id)
    AND (
      s.roll_number = btrim(p_roll)
      OR s.student_id = btrim(p_roll)
      OR s.registration_no = btrim(p_roll)
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated;


-- Migration: 20260821055827_5e5f7e30-1736-4984-bd8c-9ef3f897efa4.sql
BEGIN;
UPDATE website_settings SET value = '" ১৬০+"' WHERE key = 'stat_students';
UPDATE website_settings SET value = '"১৪+"' WHERE key = 'stat_teachers';
UPDATE website_settings SET value = '"৫+"' WHERE key = 'stat_years';
COMMIT;

-- Migration: 20260823184536_b322384d-98cf-4d40-aade-f1967bdffdcb.sql
DROP FUNCTION IF EXISTS public.public_find_exam_student(uuid, text, uuid);

CREATE FUNCTION public.public_find_exam_student(
  p_session_id uuid,
  p_roll text,
  p_class_id uuid DEFAULT NULL
)
RETURNS TABLE(student_id uuid, class_id uuid, merit_rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH matched AS (
    SELECT ess.student_id, ess.class_id
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s ON s.id = ess.student_id
    WHERE ess.exam_session_id = p_session_id
      AND (p_class_id IS NULL OR ess.class_id = p_class_id)
      AND (
        s.roll_number = btrim(p_roll)
        OR s.student_id = btrim(p_roll)
        OR s.registration_no = btrim(p_roll)
      )
    LIMIT 1
  ),
  pass_config AS (
    SELECT COALESCE((vr.config ->> 'min')::numeric, 33) AS pass_mark
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'pass_mark'
      AND vr.is_active = true
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  grace_config AS (
    SELECT
      vr.is_active AND COALESCE((vr.config ->> 'enabled')::boolean, true) AS enabled,
      COALESCE(vr.config ->> 'apply_to', 'all') AS apply_to,
      COALESCE((vr.config ->> 'max_subjects')::integer, 1) AS max_subjects,
      COALESCE(vr.config -> 'class_rules', '{}'::jsonb) AS class_rules
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'grace_pass'
    LIMIT 1
  ),
  relevant_subjects AS (
    SELECT DISTINCT essu.subject_id
    FROM matched m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.exam_session_subjects essu ON essu.exam_session_id = p_session_id
    JOIN public.subjects sub ON sub.id = essu.subject_id
    WHERE sub.division_id = c.division_id OR sub.class_id = m.class_id
  ),
  class_stats AS (
    SELECT
      enrolled.student_id,
      COALESCE(SUM(COALESCE(r.marks, 0)), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(rs.subject_id) FILTER (
        WHERE COALESCE(r.marks, 0) < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.results r
      ON r.exam_id = p_session_id
     AND r.student_id = enrolled.student_id
     AND r.subject_id = rs.subject_id
    GROUP BY enrolled.student_id
  ),
  ranked AS (
    SELECT
      cs.*,
      CASE
        WHEN COALESCE((SELECT enabled FROM grace_config), false) = false THEN 0
        WHEN (SELECT class_rules FROM grace_config) ? (SELECT class_id::text FROM matched)
          THEN COALESCE(((SELECT class_rules FROM grace_config) ->> (SELECT class_id::text FROM matched))::integer, 0)
        WHEN COALESCE((SELECT apply_to FROM grace_config), 'all') = 'selected' THEN 0
        ELSE COALESCE((SELECT max_subjects FROM grace_config), 0)
      END AS grace_limit
    FROM class_stats cs
  ),
  eligible AS (
    SELECT *
    FROM ranked
    WHERE has_any_mark
      AND (failed_count = 0 OR (grace_limit > 0 AND failed_count <= grace_limit))
  )
  SELECT
    m.student_id,
    m.class_id,
    CASE
      WHEN target.student_id IS NULL THEN NULL
      ELSE (
        SELECT 1 + COUNT(*)::integer
        FROM eligible higher
        WHERE higher.total_marks > target.total_marks
      )
    END AS merit_rank
  FROM matched m
  LEFT JOIN eligible target ON target.student_id = m.student_id;
$function$;

REVOKE ALL ON FUNCTION public.public_find_exam_student(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated, service_role;

-- Migration: 20260824190150_fe5dc125-62bf-4bc8-bd32-796681cc9261.sql
DROP FUNCTION IF EXISTS public.public_find_exam_student(uuid, text, uuid);

CREATE FUNCTION public.public_find_exam_student(
  p_session_id uuid,
  p_roll text,
  p_class_id uuid DEFAULT NULL
)
RETURNS TABLE(
  student_id uuid,
  class_id uuid,
  merit_rank integer,
  name_bn text,
  name_en text,
  roll_number text,
  registration_no text,
  division_id uuid,
  session_id uuid,
  photo_url text,
  marks jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH matched AS (
    SELECT
      s.id AS student_id,
      ess.class_id,
      s.name_bn,
      s.name_en,
      s.roll_number,
      s.registration_no,
      s.division_id,
      s.session_id,
      s.photo_url
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s
      ON s.id = ess.student_id
     AND COALESCE(s.status, 'active') = 'active'
     AND s.deleted_at IS NULL
    WHERE ess.exam_session_id = p_session_id
      AND (p_class_id IS NULL OR ess.class_id = p_class_id)
      AND (
        s.roll_number = btrim(p_roll)
        OR s.student_id = btrim(p_roll)
        OR s.registration_no = btrim(p_roll)
      )
    LIMIT 1
  ),
  pass_config AS (
    SELECT COALESCE((vr.config ->> 'min')::numeric, 33) AS pass_mark
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'pass_mark'
      AND vr.is_active = true
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  grace_config AS (
    SELECT
      vr.is_active AND COALESCE((vr.config ->> 'enabled')::boolean, true) AS enabled,
      COALESCE(vr.config ->> 'apply_to', 'all') AS apply_to,
      COALESCE((vr.config ->> 'max_subjects')::integer, 1) AS max_subjects,
      COALESCE(vr.config -> 'class_rules', '{}'::jsonb) AS class_rules
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'grace_pass'
    LIMIT 1
  ),
  relevant_subjects AS (
    SELECT DISTINCT essu.subject_id
    FROM matched m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.exam_session_subjects essu ON essu.exam_session_id = p_session_id
    JOIN public.subjects sub ON sub.id = essu.subject_id
    WHERE sub.division_id = c.division_id OR sub.class_id = m.class_id
  ),
  class_stats AS (
    SELECT
      enrolled.student_id,
      COALESCE(SUM(COALESCE(r.marks, 0)), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(rs.subject_id) FILTER (
        WHERE COALESCE(r.marks, 0) < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.results r
      ON r.exam_id = p_session_id
     AND r.student_id = enrolled.student_id
     AND r.subject_id = rs.subject_id
    GROUP BY enrolled.student_id
  ),
  ranked AS (
    SELECT
      cs.*,
      CASE
        WHEN COALESCE((SELECT enabled FROM grace_config), false) = false THEN 0
        WHEN (SELECT class_rules FROM grace_config) ? (SELECT class_id::text FROM matched)
          THEN COALESCE(((SELECT class_rules FROM grace_config) ->> (SELECT class_id::text FROM matched))::integer, 0)
        WHEN COALESCE((SELECT apply_to FROM grace_config), 'all') = 'selected' THEN 0
        ELSE COALESCE((SELECT max_subjects FROM grace_config), 0)
      END AS grace_limit
    FROM class_stats cs
  ),
  eligible AS (
    SELECT *
    FROM ranked
    WHERE has_any_mark
      AND (failed_count = 0 OR (grace_limit > 0 AND failed_count <= grace_limit))
  ),
  target_rank AS (
    SELECT
      target.student_id,
      (SELECT 1 + COUNT(*)::integer FROM eligible higher WHERE higher.total_marks > target.total_marks) AS merit_rank
    FROM eligible target
    JOIN matched m ON m.student_id = target.student_id
  ),
  target_marks AS (
    SELECT COALESCE(jsonb_object_agg(r.subject_id::text, r.marks), '{}'::jsonb) AS marks
    FROM matched m
    LEFT JOIN public.results r
      ON r.exam_id = p_session_id
     AND r.student_id = m.student_id
  )
  SELECT
    m.student_id,
    m.class_id,
    tr.merit_rank,
    m.name_bn,
    m.name_en,
    m.roll_number,
    m.registration_no,
    m.division_id,
    m.session_id,
    m.photo_url,
    tm.marks
  FROM matched m
  LEFT JOIN target_rank tr ON tr.student_id = m.student_id
  CROSS JOIN target_marks tm;
$function$;

REVOKE ALL ON FUNCTION public.public_find_exam_student(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated, service_role;

-- Migration: 20260826170019_10171601-c1d7-4a77-acf3-d953c046981e.sql
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS publish_approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS publish_requested_by uuid,
  ADD COLUMN IF NOT EXISTS publish_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_decided_by uuid,
  ADD COLUMN IF NOT EXISTS publish_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_rejection_reason text;

DO $$ BEGIN
  ALTER TABLE public.exam_sessions
    ADD CONSTRAINT exam_sessions_publish_approval_status_chk
    CHECK (publish_approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Already published sessions stay approved
UPDATE public.exam_sessions SET publish_approval_status = 'approved' WHERE is_published IS TRUE;

-- Editing results resets publish approval
CREATE OR REPLACE FUNCTION public.reset_result_publish_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam uuid := COALESCE(NEW.exam_id, OLD.exam_id);
BEGIN
  UPDATE public.exam_sessions
     SET publish_approval_status = 'pending',
         is_published = false,
         publish_requested_by = auth.uid(),
         publish_requested_at = now(),
         publish_decided_by = NULL,
         publish_decided_at = NULL,
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = v_exam
     AND publish_approval_status <> 'pending';
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_result_publish_approval ON public.results;
CREATE TRIGGER trg_reset_result_publish_approval
AFTER INSERT OR UPDATE OR DELETE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.reset_result_publish_approval();

-- Block publishing without approval
CREATE OR REPLACE FUNCTION public.guard_exam_session_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published IS TRUE
     AND COALESCE(OLD.is_published, false) IS DISTINCT FROM true
     AND NEW.publish_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Result publishing requires admin approval';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_exam_session_publish ON public.exam_sessions;
CREATE TRIGGER trg_guard_exam_session_publish
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_exam_session_publish();

CREATE OR REPLACE FUNCTION public.submit_result_publish_for_approval(p_exam_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.exam_sessions
     SET publish_approval_status = 'pending',
         publish_requested_by = auth.uid(),
         publish_requested_at = now(),
         publish_decided_by = NULL,
         publish_decided_at = NULL,
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = p_exam_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_result_publish(p_exam_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can approve result publishing';
  END IF;
  UPDATE public.exam_sessions
     SET publish_approval_status = 'approved',
         publish_decided_by = auth.uid(),
         publish_decided_at = now(),
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = p_exam_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_result_publish(p_exam_session_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can reject result publishing';
  END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;
  UPDATE public.exam_sessions
     SET publish_approval_status = 'rejected',
         is_published = false,
         publish_decided_by = auth.uid(),
         publish_decided_at = now(),
         publish_rejection_reason = btrim(p_reason),
         updated_at = now()
   WHERE id = p_exam_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_result_publish_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_result_publish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_result_publish(uuid, text) TO authenticated;

-- Migration: 20260826170108_803a672a-1ff1-40d7-a9f4-8f2a33907988.sql
REVOKE ALL ON FUNCTION public.reset_result_publish_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_exam_session_publish() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_result_publish_for_approval(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_result_publish(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_result_publish(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_result_publish_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_result_publish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_result_publish(uuid, text) TO authenticated;

-- Migration: 20260826171012_263638ed-c43e-4359-90bc-f32f93a9fa28.sql
CREATE TABLE IF NOT EXISTS public.published_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  marks numeric,
  grade text,
  gpa numeric,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_id)
);

GRANT SELECT ON public.published_results TO anon;
GRANT SELECT ON public.published_results TO authenticated;
GRANT ALL ON public.published_results TO service_role;

ALTER TABLE public.published_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published results are publicly readable" ON public.published_results;
CREATE POLICY "Published results are publicly readable"
  ON public.published_results FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage published results" ON public.published_results;
CREATE POLICY "Admins manage published results"
  ON public.published_results FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_published_results_exam_student
  ON public.published_results (exam_id, student_id);

DROP TRIGGER IF EXISTS update_published_results_updated_at ON public.published_results;
CREATE TRIGGER update_published_results_updated_at
BEFORE UPDATE ON public.published_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Editing results no longer hides the previously published snapshot
CREATE OR REPLACE FUNCTION public.reset_result_publish_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam uuid := COALESCE(NEW.exam_id, OLD.exam_id);
BEGIN
  UPDATE public.exam_sessions
     SET publish_approval_status = 'pending',
         publish_requested_by = auth.uid(),
         publish_requested_at = now(),
         publish_decided_by = NULL,
         publish_decided_at = NULL,
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = v_exam
     AND publish_approval_status <> 'pending';
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Approving snapshots the current results as the public version
CREATE OR REPLACE FUNCTION public.approve_result_publish(p_exam_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can approve result publishing';
  END IF;

  UPDATE public.exam_sessions
     SET publish_approval_status = 'approved',
         publish_decided_by = auth.uid(),
         publish_decided_at = now(),
         publish_rejection_reason = NULL,
         updated_at = now()
   WHERE id = p_exam_session_id;

  DELETE FROM public.published_results WHERE exam_id = p_exam_session_id;

  INSERT INTO public.published_results (exam_id, student_id, subject_id, marks, grade, gpa, published_by)
  SELECT r.exam_id, r.student_id, r.subject_id, r.marks, r.grade, r.gpa, auth.uid()
  FROM public.results r
  WHERE r.exam_id = p_exam_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_result_publish_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_result_publish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_result_publish(uuid) TO authenticated;

-- Seed snapshots for sessions already published
INSERT INTO public.published_results (exam_id, student_id, subject_id, marks, grade, gpa)
SELECT r.exam_id, r.student_id, r.subject_id, r.marks, r.grade, r.gpa
FROM public.results r
JOIN public.exam_sessions es ON es.id = r.exam_id AND es.is_published = true
ON CONFLICT (exam_id, student_id, subject_id) DO NOTHING;

-- Public result lookup now reads the approved snapshot
CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(student_id uuid, class_id uuid, merit_rank integer, name_bn text, name_en text, roll_number text, registration_no text, division_id uuid, session_id uuid, photo_url text, marks jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH matched AS (
    SELECT
      s.id AS student_id,
      ess.class_id,
      s.name_bn,
      s.name_en,
      s.roll_number,
      s.registration_no,
      s.division_id,
      s.session_id,
      s.photo_url
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s
      ON s.id = ess.student_id
     AND COALESCE(s.status, 'active') = 'active'
     AND s.deleted_at IS NULL
    WHERE ess.exam_session_id = p_session_id
      AND (p_class_id IS NULL OR ess.class_id = p_class_id)
      AND (
        s.roll_number = btrim(p_roll)
        OR s.student_id = btrim(p_roll)
        OR s.registration_no = btrim(p_roll)
      )
    LIMIT 1
  ),
  pass_config AS (
    SELECT COALESCE((vr.config ->> 'min')::numeric, 33) AS pass_mark
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'pass_mark'
      AND vr.is_active = true
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  grace_config AS (
    SELECT
      vr.is_active AND COALESCE((vr.config ->> 'enabled')::boolean, true) AS enabled,
      COALESCE(vr.config ->> 'apply_to', 'all') AS apply_to,
      COALESCE((vr.config ->> 'max_subjects')::integer, 1) AS max_subjects,
      COALESCE(vr.config -> 'class_rules', '{}'::jsonb) AS class_rules
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'grace_pass'
    LIMIT 1
  ),
  relevant_subjects AS (
    SELECT DISTINCT essu.subject_id
    FROM matched m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.exam_session_subjects essu ON essu.exam_session_id = p_session_id
    JOIN public.subjects sub ON sub.id = essu.subject_id
    WHERE sub.division_id = c.division_id OR sub.class_id = m.class_id
  ),
  class_stats AS (
    SELECT
      enrolled.student_id,
      COALESCE(SUM(COALESCE(r.marks, 0)), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(rs.subject_id) FILTER (
        WHERE COALESCE(r.marks, 0) < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = enrolled.student_id
     AND r.subject_id = rs.subject_id
    GROUP BY enrolled.student_id
  ),
  ranked AS (
    SELECT
      cs.*,
      CASE
        WHEN COALESCE((SELECT enabled FROM grace_config), false) = false THEN 0
        WHEN (SELECT class_rules FROM grace_config) ? (SELECT class_id::text FROM matched)
          THEN COALESCE(((SELECT class_rules FROM grace_config) ->> (SELECT class_id::text FROM matched))::integer, 0)
        WHEN COALESCE((SELECT apply_to FROM grace_config), 'all') = 'selected' THEN 0
        ELSE COALESCE((SELECT max_subjects FROM grace_config), 0)
      END AS grace_limit
    FROM class_stats cs
  ),
  eligible AS (
    SELECT *
    FROM ranked
    WHERE has_any_mark
      AND (failed_count = 0 OR (grace_limit > 0 AND failed_count <= grace_limit))
  ),
  target_rank AS (
    SELECT
      target.student_id,
      (SELECT 1 + COUNT(*)::integer FROM eligible higher WHERE higher.total_marks > target.total_marks) AS merit_rank
    FROM eligible target
    JOIN matched m ON m.student_id = target.student_id
  ),
  target_marks AS (
    SELECT COALESCE(jsonb_object_agg(r.subject_id::text, r.marks), '{}'::jsonb) AS marks
    FROM matched m
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = m.student_id
  )
  SELECT
    m.student_id,
    m.class_id,
    tr.merit_rank,
    m.name_bn,
    m.name_en,
    m.roll_number,
    m.registration_no,
    m.division_id,
    m.session_id,
    m.photo_url,
    tm.marks
  FROM matched m
  LEFT JOIN target_rank tr ON tr.student_id = m.student_id
  CROSS JOIN target_marks tm;
$function$;

-- Migration: 20260826204546_35348aee-2573-4541-9e32-e043b0e4325b.sql
DROP POLICY IF EXISTS "Authenticated users can view budgets" ON public.budgets;
CREATE POLICY "Finance staff can view budgets" ON public.budgets FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_menu_permission(auth.uid(),'/admin/budgets','view'));

DROP POLICY IF EXISTS "Authenticated can view assets" ON public.fixed_assets;
CREATE POLICY "Finance staff can view assets" ON public.fixed_assets FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_menu_permission(auth.uid(),'/admin/accounts','view'));

DROP POLICY IF EXISTS "Authenticated can view duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Admins or own duty shift attendance" ON public.duty_shift_attendance FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_menu_permission(auth.uid(),'/admin/duty-roster','view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_shift_attendance.staff_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated can view weekly duty template" ON public.duty_weekly_template;
CREATE POLICY "Admins or own weekly duty template" ON public.duty_weekly_template FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_menu_permission(auth.uid(),'/admin/duty-roster','view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_weekly_template.staff_id AND s.user_id = auth.uid())
);

-- Migration: 20260827211209_0b9caf30-d319-4744-a6b0-b3034af2114d.sql
ALTER TABLE public.duty_shifts
  ADD COLUMN IF NOT EXISTS absent_deduction_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_deduction_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_deduction_amount numeric,
  ADD COLUMN IF NOT EXISTS late_deduction_mode text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS late_deduction_free_minutes integer NOT NULL DEFAULT 5;

ALTER TABLE public.duty_shifts
  DROP CONSTRAINT IF EXISTS duty_shifts_late_deduction_mode_check;

ALTER TABLE public.duty_shifts
  ADD CONSTRAINT duty_shifts_late_deduction_mode_check
  CHECK (late_deduction_mode IN ('flat', 'per_minute'));

-- Migration: 20260827211608_8e918aad-6dff-4a82-a57c-0dd30cbafd96.sql
ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS duty_deduction numeric NOT NULL DEFAULT 0;

-- Migration: 20260827215955_5510560c-31e8-4686-b90d-3a2c9029daf8.sql
-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  title TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_conv_participants_user ON public.conversation_participants(user_id);

-- Helper: participant check (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conv AND cp.user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_admin(_user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user,'admin') OR public.has_role(_user,'super_admin');
$$;

-- Policies: conversations
CREATE POLICY "participants view conversations" ON public.conversations FOR SELECT TO authenticated
USING (deleted_at IS NULL AND (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "users create conversations" ON public.conversations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (type = 'direct' OR public.is_chat_admin(auth.uid())));

CREATE POLICY "creator or admin update conversations" ON public.conversations FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.is_chat_admin(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.is_chat_admin(auth.uid()));

-- Policies: participants
CREATE POLICY "participants view members" ON public.conversation_participants FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "add participants" ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_chat_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid() AND c.type = 'direct')
);

CREATE POLICY "update own participation" ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_chat_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_chat_admin(auth.uid()));

CREATE POLICY "admins remove participants" ON public.conversation_participants FOR DELETE TO authenticated
USING (public.is_chat_admin(auth.uid()));

-- Policies: messages
CREATE POLICY "participants read messages" ON public.chat_messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "participants send messages" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "sender or admin update messages" ON public.chat_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR public.is_chat_admin(auth.uid()))
WITH CHECK (sender_id = auth.uid() OR public.is_chat_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conv_participants_updated BEFORE UPDATE ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_messages_updated BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bump conversation last_message_at
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_conversation AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Direct conversation get-or-create
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other_user IS NULL OR _other_user = v_me THEN RAISE EXCEPTION 'invalid recipient'; END IF;

  SELECT c.id INTO v_id
  FROM public.conversations c
  WHERE c.type = 'direct' AND c.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = v_me)
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = _other_user)
    AND (SELECT count(*) FROM public.conversation_participants p WHERE p.conversation_id = c.id) = 2
  LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.conversations (type, created_by) VALUES ('direct', v_me) RETURNING id INTO v_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (v_id, v_me, 'admin'), (v_id, _other_user, 'member');
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;

-- Directory of messageable users
CREATE OR REPLACE FUNCTION public.get_messageable_users()
RETURNS TABLE (user_id UUID, full_name TEXT, designation TEXT, role TEXT, source TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT p.id AS user_id,
           COALESCE(NULLIF(s.name_bn,''), NULLIF(ao.name_bn,''), p.full_name, '') AS full_name,
           COALESCE(NULLIF(s.designation,''), NULLIF(ao.designation,'')) AS designation,
           CASE WHEN s.id IS NOT NULL THEN 'staff'
                WHEN ao.id IS NOT NULL THEN 'administrative'
                ELSE 'user' END AS source
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.staff s WHERE s.user_id = p.id AND s.deleted_at IS NULL LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT a.* FROM public.administrative_officers a WHERE a.user_id = p.id AND a.deleted_at IS NULL LIMIT 1
    ) ao ON true
    WHERE p.id <> auth.uid()
  )
  SELECT b.user_id, b.full_name, b.designation,
         COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = b.user_id ORDER BY ur.role LIMIT 1), 'user') AS role,
         b.source
  FROM base b
  WHERE auth.uid() IS NOT NULL AND b.full_name <> ''
  ORDER BY b.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_messageable_users() TO authenticated;

-- Storage access for chat attachments
CREATE OR REPLACE FUNCTION public.can_access_storage_object(_user_id uuid, _bucket text, _object_path text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_seg TEXT;
BEGIN
  IF _user_id IS NULL OR _object_path IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'super_admin') OR public.has_role(_user_id,'admin') THEN
    RETURN true;
  END IF;
  v_first_seg := split_part(_object_path, '/', 1);

  IF _bucket = 'chat-attachments' THEN
    BEGIN
      RETURN public.is_conversation_participant(v_first_seg::uuid, _user_id);
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  IF _bucket = 'receipts' THEN
    IF public.is_accounts_staff(_user_id) THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.parent_accounts pa
      WHERE pa.user_id = _user_id AND pa.status IN ('approved','active')
        AND pa.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = _user_id AND s.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'photos' THEN
    IF v_first_seg = 'public-uploads' THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = _user_id AND s.deleted_at IS NULL
        AND s.photo_url IS NOT NULL
        AND s.photo_url LIKE '%' || _object_path || '%'
    ) THEN RETURN true; END IF;
    IF public.has_role(_user_id,'teacher') AND _object_path LIKE 'staff/%' THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'staff-letters' THEN
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'committee-attachments' THEN
    RETURN public.has_role(_user_id,'staff') OR public.has_role(_user_id,'teacher') OR public.has_role(_user_id,'administrative');
  END IF;

  RETURN false;
END;
$function$;

-- Realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Migration: 20260827220041_a365f708-e27f-4629-aeaf-4192527d0d2a.sql
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_messageable_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_messageable_users() TO authenticated;

-- Migration: 20260827220142_2db4d492-b98e-4f65-9585-59b98bdce89a.sql
CREATE POLICY "chat attachments read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.can_access_storage_object(auth.uid(), 'chat-attachments', name)
);

CREATE POLICY "chat attachments upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.can_access_storage_object(auth.uid(), 'chat-attachments', name)
);

CREATE POLICY "chat attachments delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (owner = auth.uid() OR public.is_chat_admin(auth.uid()))
);

-- Migration: 20260829104158_de2d578e-3105-4bff-bdd9-47d2dff7285d.sql
CREATE OR REPLACE FUNCTION public.generate_staff_id(p_category_key text, p_joining_year integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.id_format_config%ROWTYPE;
  v_year INTEGER;
  v_max INTEGER;
  v_next INTEGER;
  v_id TEXT;
  v_prefix_pattern TEXT;
BEGIN
  SELECT * INTO c FROM public.id_format_config WHERE entity_key = p_category_key FOR UPDATE;
  IF NOT FOUND THEN
    -- fallback to legacy staff_categories config if id_format_config row missing
    INSERT INTO public.id_format_config(entity_key,label,prefix,start_serial)
    SELECT key, COALESCE(name_bn, name, key), COALESCE(id_prefix,'STF'), COALESCE(id_start_range,1001)
      FROM public.staff_categories WHERE key = p_category_key
    RETURNING * INTO c;
    IF c.entity_key IS NULL THEN
      RAISE EXCEPTION 'No ID format configured for category: %', p_category_key;
    END IF;
  END IF;
  v_year := COALESCE(p_joining_year, EXTRACT(YEAR FROM now())::INTEGER);

  IF c.reset_mode = 'yearly' AND c.include_year THEN
    v_prefix_pattern := c.prefix || c.separator || v_year::TEXT || c.separator;
    SELECT MAX(CAST(regexp_replace(staff_id, '^.*' || c.separator, '') AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE v_prefix_pattern || '%'
       AND staff_id ~ ('^' || regexp_replace(v_prefix_pattern,'([.+*?^$()\[\]{}|\\])','\\\1','g') || '[0-9]+$');
  ELSE
    -- global within this prefix
    SELECT MAX(CAST((regexp_match(staff_id,'([0-9]+)$'))[1] AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE c.prefix || c.separator || '%'
       AND staff_id ~ '[0-9]+$';
  END IF;

  v_next := COALESCE(GREATEST(v_max + 1, c.start_serial), c.start_serial);
  v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);

  WHILE EXISTS (SELECT 1 FROM public.staff WHERE staff_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);
  END LOOP;
  RETURN v_id;
END;
$function$

-- Migration: 20260830065735_58d3ac92-ba68-4f6a-84ce-47d045730775.sql
CREATE POLICY "Permitted users can view staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/staff', 'view')
  OR has_menu_permission(auth.uid(), '/admin/general-staff', 'view')
  OR has_menu_permission(auth.uid(), '/admin/administrative-staff', 'view')
  OR has_menu_permission(auth.uid(), '/admin/teachers', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/salary', 'view')
);

-- Migration: 20260901062231_a92463e1-9e6d-4878-b3d6-ddf2586548ea.sql
DROP POLICY IF EXISTS "Admins or own duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Admins or own duty shift attendance" ON public.duty_shift_attendance FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'view'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'view'::text)
  OR EXISTS (SELECT 1 FROM staff s WHERE s.id = duty_shift_attendance.staff_id AND s.user_id = auth.uid())
);

CREATE POLICY "Permitted users add duty shift attendance" ON public.duty_shift_attendance FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'add'::text)
);

CREATE POLICY "Permitted users edit duty shift attendance" ON public.duty_shift_attendance FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
);

CREATE POLICY "Permitted users delete duty shift attendance" ON public.duty_shift_attendance FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'delete'::text)
);

DROP POLICY IF EXISTS "Admins or own weekly duty template" ON public.duty_weekly_template;
CREATE POLICY "Admins or own weekly duty template" ON public.duty_weekly_template FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster'::text, 'view'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'view'::text)
  OR EXISTS (SELECT 1 FROM staff s WHERE s.id = duty_weekly_template.staff_id AND s.user_id = auth.uid())
);

-- Migration: 20260901062802_171e5e0a-08b9-4bf7-bf6e-8596f978d759.sql
CREATE POLICY "Permitted users add attendance_records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
);

CREATE POLICY "Permitted users edit attendance_records" ON public.attendance_records FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
);

CREATE POLICY "Permitted users delete attendance_records" ON public.attendance_records FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'delete'::text)
);

-- Migration: 20260902002904_634e7333-edea-4740-b53e-e095d7190acd.sql
CREATE POLICY "Permitted users view duty roster" ON public.duty_roster FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
);

CREATE POLICY "Permitted users add duty roster" ON public.duty_roster FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'add')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'add')
);

CREATE POLICY "Permitted users edit duty roster" ON public.duty_roster FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'edit')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'edit')
);

CREATE POLICY "Permitted users delete duty roster" ON public.duty_roster FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'delete')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'delete')
);

-- Migration: 20260902003158_5764a4bc-9f94-48db-938f-fa9370353c8d.sql
-- attendance_records: restrict edit/delete to admin/super_admin only
DROP POLICY IF EXISTS "Permitted users edit attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Permitted users delete attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can manage attendance with permission" ON public.attendance_records;

CREATE POLICY "Admins edit attendance_records"
ON public.attendance_records FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete attendance_records"
ON public.attendance_records FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- duty_shift_attendance: restrict edit/delete to admin/super_admin only
DROP POLICY IF EXISTS "Permitted users edit duty shift attendance" ON public.duty_shift_attendance;
DROP POLICY IF EXISTS "Permitted users delete duty shift attendance" ON public.duty_shift_attendance;

CREATE POLICY "Admins edit duty shift attendance"
ON public.duty_shift_attendance FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete duty shift attendance"
ON public.duty_shift_attendance FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Migration: 20260902014605_5d4c3316-3c96-4595-a069-10f13df9f176.sql

DROP POLICY IF EXISTS "Admins or own weekly duty template" ON public.duty_weekly_template;
CREATE POLICY "Admins or own weekly duty template" ON public.duty_weekly_template
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_weekly_template.staff_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins or own duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Admins or own duty shift attendance" ON public.duty_shift_attendance
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'view')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'view')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'view')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.id = duty_shift_attendance.staff_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Permitted users add duty shift attendance" ON public.duty_shift_attendance;
CREATE POLICY "Permitted users add duty shift attendance" ON public.duty_shift_attendance
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'add')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'add')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'add')
);

DROP POLICY IF EXISTS "Permitted users add duty roster" ON public.duty_roster;
CREATE POLICY "Permitted users add duty roster" ON public.duty_roster
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/duty-roster', 'add')
  OR has_menu_permission(auth.uid(), '/admin/attendance', 'add')
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance', 'add')
);


-- Migration: 20260902210613_8711fd5e-1ed3-4276-90a6-6a47e971c60b.sql
CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(student_id uuid, class_id uuid, merit_rank integer, name_bn text, name_en text, roll_number text, registration_no text, division_id uuid, session_id uuid, photo_url text, marks jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH matched AS (
    SELECT
      s.id AS student_id,
      ess.class_id,
      s.name_bn,
      s.name_en,
      s.roll_number,
      s.registration_no,
      s.division_id,
      s.session_id,
      s.photo_url
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s
      ON s.id = ess.student_id
     AND COALESCE(s.status, 'active') = 'active'
     AND s.deleted_at IS NULL
    WHERE ess.exam_session_id = p_session_id
      AND (p_class_id IS NULL OR ess.class_id = p_class_id)
      AND (
        s.roll_number = btrim(p_roll)
        OR s.student_id = btrim(p_roll)
        OR s.registration_no = btrim(p_roll)
      )
    LIMIT 1
  ),
  pass_config AS (
    SELECT COALESCE((vr.config ->> 'min')::numeric, 33) AS pass_mark
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'pass_mark'
      AND vr.is_active = true
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  grace_config AS (
    SELECT
      vr.is_active AND COALESCE((vr.config ->> 'enabled')::boolean, true) AS enabled,
      COALESCE(vr.config ->> 'apply_to', 'all') AS apply_to,
      COALESCE((vr.config ->> 'max_subjects')::integer, 1) AS max_subjects,
      COALESCE(vr.config -> 'class_rules', '{}'::jsonb) AS class_rules
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'grace_pass'
    LIMIT 1
  ),
  relevant_subjects AS (
    SELECT DISTINCT essu.subject_id
    FROM matched m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.exam_session_subjects essu ON essu.exam_session_id = p_session_id
    JOIN public.subjects sub ON sub.id = essu.subject_id
    WHERE sub.division_id = c.division_id OR sub.class_id = m.class_id
  ),
  class_stats AS (
    SELECT
      enrolled.student_id,
      COALESCE(SUM(COALESCE(r.marks, 0)), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(rs.subject_id) FILTER (
        WHERE COALESCE(r.marks, 0) < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = enrolled.student_id
     AND r.subject_id = rs.subject_id
    GROUP BY enrolled.student_id
  ),
  ranked AS (
    SELECT
      cs.*,
      CASE
        WHEN COALESCE((SELECT enabled FROM grace_config), false) = false THEN 0
        WHEN (SELECT class_rules FROM grace_config) ? (SELECT class_id::text FROM matched)
          THEN COALESCE(((SELECT class_rules FROM grace_config) ->> (SELECT class_id::text FROM matched))::integer, 0)
        WHEN COALESCE((SELECT apply_to FROM grace_config), 'all') = 'selected' THEN 0
        ELSE COALESCE((SELECT max_subjects FROM grace_config), 0)
      END AS grace_limit
    FROM class_stats cs
  ),
  eligible AS (
    SELECT
      ranked.*,
      CASE
        WHEN failed_count > 0 AND grace_limit > 0 AND failed_count <= grace_limit THEN 1
        ELSE 0
      END AS merit_tier
    FROM ranked
    WHERE has_any_mark
      AND (failed_count = 0 OR (grace_limit > 0 AND failed_count <= grace_limit))
  ),
  target_rank AS (
    SELECT
      target.student_id,
      (SELECT 1 + COUNT(*)::integer
         FROM eligible higher
        WHERE higher.merit_tier < target.merit_tier
           OR (higher.merit_tier = target.merit_tier AND higher.total_marks > target.total_marks)
      ) AS merit_rank
    FROM eligible target
    JOIN matched m ON m.student_id = target.student_id
  ),
  target_marks AS (
    SELECT COALESCE(jsonb_object_agg(r.subject_id::text, r.marks), '{}'::jsonb) AS marks
    FROM matched m
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = m.student_id
  )
  SELECT
    m.student_id,
    m.class_id,
    tr.merit_rank,
    m.name_bn,
    m.name_en,
    m.roll_number,
    m.registration_no,
    m.division_id,
    m.session_id,
    m.photo_url,
    tm.marks
  FROM matched m
  LEFT JOIN target_rank tr ON tr.student_id = m.student_id
  CROSS JOIN target_marks tm;
$function$;

-- Migration: 20260902212140_225f65c1-1025-4f0d-bf98-df7a4b41ae13.sql
CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(student_id uuid, class_id uuid, merit_rank integer, name_bn text, name_en text, roll_number text, registration_no text, division_id uuid, session_id uuid, photo_url text, marks jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH matched AS (
    SELECT
      s.id AS student_id,
      ess.class_id,
      s.name_bn,
      s.name_en,
      s.roll_number,
      s.registration_no,
      s.division_id,
      s.session_id,
      s.photo_url
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s
      ON s.id = ess.student_id
     AND COALESCE(s.status, 'active') = 'active'
     AND s.deleted_at IS NULL
    WHERE ess.exam_session_id = p_session_id
      AND (p_class_id IS NULL OR ess.class_id = p_class_id)
      AND (
        s.roll_number = btrim(p_roll)
        OR s.student_id = btrim(p_roll)
        OR s.registration_no = btrim(p_roll)
      )
    LIMIT 1
  ),
  pass_config AS (
    SELECT COALESCE((vr.config ->> 'min')::numeric, 33) AS pass_mark
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'pass_mark'
      AND vr.is_active = true
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  grace_config AS (
    SELECT
      vr.is_active AND COALESCE((vr.config ->> 'enabled')::boolean, true) AS enabled,
      COALESCE(vr.config ->> 'apply_to', 'all') AS apply_to,
      COALESCE((vr.config ->> 'max_subjects')::integer, 1) AS max_subjects,
      COALESCE(vr.config -> 'class_rules', '{}'::jsonb) AS class_rules
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'grace_pass'
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  relevant_subjects AS (
    SELECT DISTINCT essu.subject_id
    FROM matched m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.exam_session_subjects essu ON essu.exam_session_id = p_session_id
    JOIN public.subjects sub ON sub.id = essu.subject_id
    WHERE sub.division_id = c.division_id OR sub.class_id = m.class_id
  ),
  class_stats AS (
    SELECT
      enrolled.student_id,
      COALESCE(SUM(r.marks) FILTER (WHERE r.id IS NOT NULL), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(r.id) FILTER (
        WHERE r.marks < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = enrolled.student_id
     AND r.subject_id = rs.subject_id
    GROUP BY enrolled.student_id
  ),
  ranked AS (
    SELECT
      cs.*,
      CASE
        WHEN COALESCE((SELECT enabled FROM grace_config), false) = false THEN 0
        WHEN (SELECT class_rules FROM grace_config) ? (SELECT class_id::text FROM matched)
          THEN COALESCE(((SELECT class_rules FROM grace_config) ->> (SELECT class_id::text FROM matched))::integer, 0)
        WHEN COALESCE((SELECT apply_to FROM grace_config), 'all') = 'selected' THEN 0
        ELSE COALESCE((SELECT max_subjects FROM grace_config), 0)
      END AS grace_limit
    FROM class_stats cs
  ),
  eligible AS (
    SELECT
      r.*,
      CASE WHEN r.failed_count = 0 THEN 0 ELSE 1 END AS merit_tier
    FROM ranked r
    WHERE r.has_any_mark
      AND (r.failed_count = 0 OR (r.grace_limit > 0 AND r.failed_count <= r.grace_limit))
  ),
  target_rank AS (
    SELECT
      target.student_id,
      (
        1 + COUNT(*) FILTER (
          WHERE higher.merit_tier < target.merit_tier
             OR (higher.merit_tier = target.merit_tier AND higher.total_marks > target.total_marks)
        )
      )::integer AS merit_rank
    FROM eligible target
    JOIN matched m ON m.student_id = target.student_id
    CROSS JOIN eligible higher
    GROUP BY target.student_id, target.merit_tier, target.total_marks
  ),
  target_marks AS (
    SELECT COALESCE(jsonb_object_agg(r.subject_id::text, r.marks), '{}'::jsonb) AS marks
    FROM matched m
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = m.student_id
  )
  SELECT
    m.student_id,
    m.class_id,
    tr.merit_rank,
    m.name_bn,
    m.name_en,
    m.roll_number,
    m.registration_no,
    m.division_id,
    m.session_id,
    m.photo_url,
    tm.marks
  FROM matched m
  LEFT JOIN target_rank tr ON tr.student_id = m.student_id
  CROSS JOIN target_marks tm;
$function$;

REVOKE ALL ON FUNCTION public.public_find_exam_student(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated;

-- Migration: 20260902220620_4e4e8a3e-b582-4ac5-9ee6-46179d3814ab.sql
CREATE OR REPLACE FUNCTION public.get_public_principal()
RETURNS TABLE (name_bn text, name_en text, designation text, photo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.name_bn, a.name_en, a.designation, a.photo_url
  FROM public.administrative_officers a
  WHERE a.deleted_at IS NULL
    AND a.status = 'active'
    AND (
      a.designation ILIKE '%principal%'
      OR a.designation LIKE '%প্রিন্সিপাল%'
      OR a.designation LIKE '%অধ্যক্ষ%'
      OR a.designation LIKE '%মুহতামিম%'
    )
  ORDER BY COALESCE(a.sort_order, 999), a.created_at
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_principal() TO anon, authenticated;

-- Sync institutions + website_settings from the officer record
UPDATE public.institutions i
SET principal_name = p.name_bn
FROM public.get_public_principal() p
WHERE i.is_default = true;

UPDATE public.website_settings ws
SET value = to_jsonb(p.name_bn)
FROM public.get_public_principal() p
WHERE ws.key = 'principal_name';

UPDATE public.website_settings ws
SET value = to_jsonb(p.name_en)
FROM public.get_public_principal() p
WHERE ws.key = 'principal_name_en' AND COALESCE(p.name_en, '') <> '';

DELETE FROM public.website_settings WHERE key IN ('idcard_principal_name', 'idcard_principal_name_en');

-- Migration: 20260902220913_2e7e48dd-2c42-49ad-af6a-162500430741.sql
CREATE OR REPLACE FUNCTION public.sync_principal_name_everywhere()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM public.get_public_principal();
  IF p.name_bn IS NULL AND p.name_en IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.institutions SET principal_name = p.name_bn WHERE is_default = true;

  INSERT INTO public.website_settings (key, value)
  VALUES ('principal_name', to_jsonb(COALESCE(p.name_bn, '')))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.website_settings (key, value)
  VALUES ('principal_name_en', to_jsonb(COALESCE(p.name_en, '')))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.website_settings (key, value)
  VALUES ('principal_title_bn', to_jsonb(COALESCE(p.designation, '')))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_principal_name ON public.administrative_officers;
CREATE TRIGGER trg_sync_principal_name
AFTER INSERT OR UPDATE OF name_bn, name_en, designation, status, deleted_at OR DELETE
ON public.administrative_officers
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_principal_name_everywhere();

-- Migration: 20260902220939_f8cdd4ce-31ab-410f-bb66-28d6f0fa1678.sql
REVOKE EXECUTE ON FUNCTION public.sync_principal_name_everywhere() FROM PUBLIC, anon, authenticated;

-- Migration: 20260920111642_33e6c6c6-79cb-4e63-a544-572bf66e0429.sql
DROP POLICY IF EXISTS "Admins and owners view resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Admins can insert resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Admins can update resign letters" ON public.resign_letters;
DROP POLICY IF EXISTS "Admins can delete resign letters" ON public.resign_letters;

CREATE POLICY "View resign letters by permission or owner"
ON public.resign_letters FOR SELECT TO authenticated
USING (
  public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'view')
  OR staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid())
);

CREATE POLICY "Insert resign letters by permission"
ON public.resign_letters FOR INSERT TO authenticated
WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'add'));

CREATE POLICY "Update resign letters by permission"
ON public.resign_letters FOR UPDATE TO authenticated
USING (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'edit'))
WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'edit'));

CREATE POLICY "Delete resign letters by permission"
ON public.resign_letters FOR DELETE TO authenticated
USING (public.has_menu_permission(auth.uid(), '/admin/resign-letters', 'delete'));

-- Migration: 20260921191712_efead230-c056-49fa-9a45-bb19c8e84364.sql
CREATE INDEX IF NOT EXISTS idx_attendance_records_type_shift_date ON public.attendance_records (entity_type, shift, attendance_date);
CREATE INDEX IF NOT EXISTS idx_results_exam_updated_at ON public.results (exam_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_actions_status ON public.pending_actions (status) WHERE status = 'pending';

-- Migration: 20260921192305_60d61acd-67b2-4232-bdc9-4d1d32905747.sql
DO $$
DECLARE
  r record;
  v_qual text;
  v_check text;
  v_roles text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname,
           c.relname  AS tablename,
           pol.polname AS policyname,
           pol.polpermissive AS permissive,
           pol.polcmd AS cmd,
           pg_get_expr(pol.polqual, pol.polrelid) AS qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check,
           (SELECT string_agg(CASE WHEN oid = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(oid)) END, ', ')
              FROM unnest(pol.polroles) AS oid) AS roles
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND (pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
            OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%auth.uid()%')
  LOOP
    v_qual  := replace(coalesce(r.qual, ''),  'auth.uid()', '( SELECT auth.uid() )');
    v_check := replace(coalesce(r.with_check, ''), 'auth.uid()', '( SELECT auth.uid() )');
    IF v_qual = coalesce(r.qual,'') AND v_check = coalesce(r.with_check,'') THEN
      CONTINUE;
    END IF;
    v_roles := coalesce(r.roles, 'PUBLIC');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    v_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      CASE r.cmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
      v_roles);

    IF r.qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;
    IF r.with_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;
  END LOOP;
END $$;

-- Migration: 20260923072423_baddbc09-f1fc-44ca-bd4c-b8de2837a10f.sql
CREATE OR REPLACE FUNCTION public.has_any_menu_permission(_user_id uuid, _paths text[], _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM unnest(_paths) AS p(path)
      WHERE public.has_menu_permission(_user_id, p.path, _action)
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.has_any_menu_permission(uuid, text[], text) TO authenticated;

DO $do$
DECLARE
  rec record;
  mapping jsonb := '[
    {"t":"divisions","p":["/admin/divisions","/admin/academic-sessions"]},
    {"t":"classes","p":["/admin/divisions","/admin/classes","/admin/academic-sessions"]},
    {"t":"academic_sessions","p":["/admin/academic-sessions","/admin/divisions"]},
    {"t":"subjects","p":["/admin/subjects"]},
    {"t":"exam_sessions","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_types","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_classes","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_subjects","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_students","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"results","p":["/admin/results"]},
    {"t":"published_results","p":["/admin/results"]},
    {"t":"class_routines","p":["/admin/class-routine","/admin/routine"]},
    {"t":"routine_periods","p":["/admin/class-routine","/admin/routine"]},
    {"t":"notices","p":["/admin/notices"]},
    {"t":"posts","p":["/admin/posts"]},
    {"t":"fee_types","p":["/admin/fees","/admin/fee-types","/admin/students-fees"]},
    {"t":"fee_categories","p":["/admin/fees","/admin/fee-categories","/admin/students-fees"]},
    {"t":"fee_payments","p":["/admin/fees","/admin/students-fees","/admin/fee-receipts"]},
    {"t":"expenses","p":["/admin/expenses"]},
    {"t":"donors","p":["/admin/donors"]},
    {"t":"salary_records","p":["/admin/salary"]},
    {"t":"library_books","p":["/admin/library"]},
    {"t":"library_issuances","p":["/admin/library"]},
    {"t":"library_profiles","p":["/admin/library"]},
    {"t":"student_certificates","p":["/admin/student-certificates","/admin/certificates"]},
    {"t":"joining_letters","p":["/admin/joining-letters"]},
    {"t":"holidays","p":["/admin/holidays","/admin/settings"]},
    {"t":"staff_holidays","p":["/admin/staff-holidays"]},
    {"t":"designations","p":["/admin/designations"]},
    {"t":"committees","p":["/admin/committees"]},
    {"t":"committee_members","p":["/admin/committee-members","/admin/committees"]},
    {"t":"inventory_items","p":["/admin/inventory"]},
    {"t":"hostels","p":["/admin/hostel"]},
    {"t":"hostel_rooms","p":["/admin/hostel"]},
    {"t":"hostel_allocations","p":["/admin/hostel"]},
    {"t":"scholarships","p":["/admin/scholarships"]},
    {"t":"budgets","p":["/admin/budgets"]},
    {"t":"question_papers","p":["/admin/question-papers","/admin/questions"]},
    {"t":"questions","p":["/admin/questions","/admin/question-papers"]},
    {"t":"online_exams","p":["/admin/online-exams"]},
    {"t":"admission_tests","p":["/admin/admission-tests"]},
    {"t":"live_classes","p":["/admin/live-classes"]},
    {"t":"duty_shifts","p":["/admin/duty-roster","/admin/duty-shifts"]},
    {"t":"duty_roster","p":["/admin/duty-roster","/admin/duty-shifts"]}
  ]'::jsonb;
  tbl text;
  paths text;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(mapping) AS m(obj)
  LOOP
    tbl := rec.obj->>'t';
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      CONTINUE;
    END IF;

    SELECT string_agg(quote_literal(x), ',') INTO paths
    FROM jsonb_array_elements_text(rec.obj->'p') AS t(x);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can view ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''view''))',
      'Permitted users can view ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can add ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''add''))',
      'Permitted users can add ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can edit ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''edit'')) WITH CHECK (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''edit''))',
      'Permitted users can edit ' || tbl, tbl, paths, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can remove ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_any_menu_permission((SELECT auth.uid()), ARRAY[%s]::text[], ''delete''))',
      'Permitted users can remove ' || tbl, tbl, paths);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
  END LOOP;
END
$do$;

-- Migration: 20261006000000_allow_attendance_view_students_classes.sql
-- Allow users with attendance permission to view students, classes, divisions, and academic_sessions
-- without needing full student or curriculum management permissions.

-- 1. STUDENTS table view for attendance
DROP POLICY IF EXISTS "Permitted attendance users can view students" ON public.students;
CREATE POLICY "Permitted attendance users can view students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/attendance', 'view')
    OR public.has_menu_permission(auth.uid(), '/admin/student-attendance', 'view')
  );

-- 2. CLASSES table view for attendance
DROP POLICY IF EXISTS "Permitted users can view classes" ON public.classes;
CREATE POLICY "Permitted users can view classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    public.has_any_menu_permission((SELECT auth.uid()), ARRAY[
      '/admin/divisions',
      '/admin/classes',
      '/admin/academic-sessions',
      '/admin/attendance',
      '/admin/student-attendance'
    ]::text[], 'view')
  );

-- 3. DIVISIONS table view for attendance
DROP POLICY IF EXISTS "Permitted users can view divisions" ON public.divisions;
CREATE POLICY "Permitted users can view divisions"
  ON public.divisions FOR SELECT
  TO authenticated
  USING (
    public.has_any_menu_permission((SELECT auth.uid()), ARRAY[
      '/admin/divisions',
      '/admin/academic-sessions',
      '/admin/attendance',
      '/admin/student-attendance'
    ]::text[], 'view')
  );

-- 4. ACADEMIC SESSIONS table view for attendance
DROP POLICY IF EXISTS "Permitted users can view academic_sessions" ON public.academic_sessions;
CREATE POLICY "Permitted users can view academic_sessions"
  ON public.academic_sessions FOR SELECT
  TO authenticated
  USING (
    public.has_any_menu_permission((SELECT auth.uid()), ARRAY[
      '/admin/academic-sessions',
      '/admin/divisions',
      '/admin/attendance',
      '/admin/student-attendance'
    ]::text[], 'view')
  );

-- 5. ATTENDANCE_RECORDS table INSERT, UPDATE, DELETE to support both /admin/attendance and /admin/student-attendance
DROP POLICY IF EXISTS "Permitted users add attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users add attendance_records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'add'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'edit'::text)
);

DROP POLICY IF EXISTS "Permitted users edit attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users edit attendance_records" ON public.attendance_records FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'edit'::text)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'edit'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'edit'::text)
);

DROP POLICY IF EXISTS "Permitted users delete attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users delete attendance_records" ON public.attendance_records FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_menu_permission(auth.uid(), '/admin/attendance'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'delete'::text)
  OR has_menu_permission(auth.uid(), '/admin/student-attendance'::text, 'delete'::text)
);


-- Migration: 20261008000000_public_meetings_link_sharing.sql
-- ============================================================
-- Allow anonymous link-sharing for public meetings & live classes
-- ============================================================

DROP POLICY IF EXISTS "Public can view published public meetings" ON public.meetings;
CREATE POLICY "Public can view published public meetings"
ON public.meetings FOR SELECT TO anon
USING (
  is_published = true 
  AND access_mode = 'public' 
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Public can view published public live classes" ON public.live_classes;
CREATE POLICY "Public can view published public live classes"
ON public.live_classes FOR SELECT TO anon
USING (
  is_published = true 
  AND access_mode = 'public' 
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Public can insert meeting participant" ON public.meeting_participants;
CREATE POLICY "Public can insert meeting participant"
ON public.meeting_participants FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_participants.meeting_id
      AND m.access_mode = 'public'
      AND m.is_published = true
  )
);


-- Migration: 20261009000000_public_fee_payment_access.sql
-- ==============================================================================
-- Public Fee Payment and Receipt Search Migration
-- Allows unauthenticated visitors to:
--  1. Safely search students by session, class, roll/reg without exposing sensitive data
--  2. View their own paid receipts by session, class, roll/reg or receipt number
--  3. Submit online pending payment requests
-- ==============================================================================

-- 1. Grant deleted_at to anon on students so queries checking soft deletion never fail with 42501
GRANT SELECT (deleted_at) ON public.students TO anon;

-- 2. Allow public to view basic student information for fee verification
DROP POLICY IF EXISTS "Public can view active students for fee lookup" ON public.students;
CREATE POLICY "Public can view active students for fee lookup"
  ON public.students FOR SELECT
  TO anon
  USING (
    COALESCE(status, 'active') = 'active'
    AND deleted_at IS NULL
  );

-- 3. Allow public to view paid receipts and submit pending payment requests
DROP POLICY IF EXISTS "Public can view paid fee receipts" ON public.fee_payments;
CREATE POLICY "Public can view paid fee receipts"
  ON public.fee_payments FOR SELECT
  TO anon
  USING (
    status = 'paid'
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Public can insert fee payments" ON public.fee_payments;
CREATE POLICY "Public can insert fee payments"
  ON public.fee_payments FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending'
  );

DROP POLICY IF EXISTS "Public can insert payments" ON public.payments;
CREATE POLICY "Public can insert payments"
  ON public.payments FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending'
  );

-- 4. Dedicated Security Definer function to search students for fee payment
CREATE OR REPLACE FUNCTION public.public_search_student_for_fee(
  p_identifier text,
  p_session_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name_bn text,
  name_en text,
  student_id text,
  roll_number text,
  registration_no text,
  class_id uuid,
  session_id uuid,
  division_id uuid,
  photo_url text,
  status text,
  class_name text,
  class_name_bn text,
  session_name text,
  session_name_bn text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.id, s.name_bn, s.name_en, s.student_id, s.roll_number, s.registration_no,
    s.class_id, s.session_id, s.division_id, s.photo_url, s.status,
    c.name AS class_name, c.name_bn AS class_name_bn,
    ses.name AS session_name, ses.name_bn AS session_name_bn
  FROM public.students s
  LEFT JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN public.academic_sessions ses ON ses.id = s.session_id
  WHERE s.deleted_at IS NULL
    AND COALESCE(s.status, 'active') = 'active'
    AND (p_session_id IS NULL OR s.session_id = p_session_id)
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
    AND (
      s.roll_number = btrim(p_identifier)
      OR s.student_id = btrim(p_identifier)
      OR s.registration_no = btrim(p_identifier)
      OR s.birth_reg_no = btrim(p_identifier)
    )
  LIMIT 5;
$$;
REVOKE ALL ON FUNCTION public.public_search_student_for_fee(text, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_search_student_for_fee(text, uuid, uuid) TO anon, authenticated;

-- 5. Dedicated Security Definer function to retrieve student's paid receipts
CREATE OR REPLACE FUNCTION public.public_search_student_receipts(
  p_identifier text,
  p_session_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_year integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  receipt_number text,
  student_id uuid,
  student_name text,
  student_code text,
  class_name text,
  roll text,
  fee_type text,
  fee_type_bn text,
  amount numeric,
  paid_amount numeric,
  status text,
  paid_at timestamptz,
  month text,
  year integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    fp.id,
    COALESCE(fp.receipt_number, 'RCP-' || UPPER(SUBSTRING(fp.id::text, 1, 8))) AS receipt_number,
    s.id AS student_id,
    COALESCE(s.name_bn, s.name_en, '') AS student_name,
    COALESCE(s.student_id, s.registration_no, '') AS student_code,
    COALESCE(c.name_bn, c.name, '') AS class_name,
    COALESCE(s.roll_number, '') AS roll,
    ft.name AS fee_type,
    ft.name_bn AS fee_type_bn,
    fp.amount,
    COALESCE(fp.paid_amount, fp.amount) AS paid_amount,
    fp.status,
    fp.paid_at,
    fp.month,
    fp.year
  FROM public.fee_payments fp
  JOIN public.students s ON s.id = fp.student_id
  LEFT JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN public.fee_types ft ON ft.id = fp.fee_type_id
  WHERE fp.status = 'paid'
    AND fp.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND (p_session_id IS NULL OR s.session_id = p_session_id)
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
    AND (p_year IS NULL OR fp.year = p_year)
    AND (
      s.roll_number = btrim(p_identifier)
      OR s.student_id = btrim(p_identifier)
      OR s.registration_no = btrim(p_identifier)
      OR fp.receipt_number ILIKE '%' || btrim(p_identifier) || '%'
    )
  ORDER BY fp.paid_at DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.public_search_student_receipts(text, uuid, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.public_search_student_receipts(text, uuid, uuid, integer) TO anon, authenticated;


-- Migration: 20261009140000_expense_institutions_and_categories_sync.sql
-- ==============================================================================
-- Expense Institutions and Categories Sync Migration
-- Ensures:
--  1. Anyone (public and authenticated) can view expense_institutions
--  2. Institutions from public.institutions are mirrored into public.expense_institutions
--  3. Orphan expense categories are linked to the default institution
-- ==============================================================================

-- 1. Policy: Allow public to view expense_institutions (consistent with institutions and expense_categories)
DROP POLICY IF EXISTS "Anyone can view expense_institutions" ON public.expense_institutions;
CREATE POLICY "Anyone can view expense_institutions"
  ON public.expense_institutions FOR SELECT
  TO public
  USING (true);

-- 2. Sync existing institutions into expense_institutions with matching IDs
INSERT INTO public.expense_institutions (id, name, name_bn)
SELECT id, COALESCE(name_en, name), name
FROM public.institutions
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    name_bn = EXCLUDED.name_bn;

-- 3. Link existing categories without a valid institution to the default institution
DO $$
DECLARE
  default_inst_id UUID;
BEGIN
  SELECT id INTO default_inst_id FROM public.institutions WHERE is_default = true LIMIT 1;
  IF default_inst_id IS NULL THEN
    SELECT id INTO default_inst_id FROM public.institutions ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF default_inst_id IS NOT NULL THEN
    -- Ensure default institution exists in expense_institutions
    INSERT INTO public.expense_institutions (id, name, name_bn)
    SELECT id, COALESCE(name_en, name), name
    FROM public.institutions WHERE id = default_inst_id
    ON CONFLICT (id) DO NOTHING;

    -- Re-link any categories pointing to non-existent institutions or null
    UPDATE public.expense_categories
    SET institution_id = default_inst_id
    WHERE institution_id IS NULL 
       OR institution_id NOT IN (SELECT id FROM public.expense_institutions);
  END IF;
END $$;


-- Migration: 20261010040000_expense_institutions_full_details.sql
-- ==============================================================================
-- Expense Institutions Full Details Migration
-- Adds address, phone, email, other_info, logo_url to expense_institutions
-- and syncs existing institutions data
-- ==============================================================================

ALTER TABLE public.expense_institutions
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS other_info TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Sync existing institution details into expense_institutions where matching ID exists
UPDATE public.expense_institutions ei
SET address = COALESCE(ei.address, i.address),
    phone = COALESCE(ei.phone, i.phone),
    email = COALESCE(ei.email, i.email),
    other_info = COALESCE(ei.other_info, i.other_info),
    logo_url = COALESCE(ei.logo_url, i.logo_url)
FROM public.institutions i
WHERE ei.id = i.id;


-- Migration: 20261010050000_signatory_authority_system.sql
-- ==============================================================================
-- Signatory Authority System Migration
-- Adds authority_role to designations, creates institution_signatories table,
-- and seeds core institution signatory roles with RLS
-- ==============================================================================

-- 1. Add authority_role to designations table
ALTER TABLE public.designations
  ADD COLUMN IF NOT EXISTS authority_role TEXT;

-- 2. Create institution_signatories table
CREATE TABLE IF NOT EXISTS public.institution_signatories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  role_name_bn TEXT NOT NULL,
  role_name_en TEXT NOT NULL,
  person_id UUID,
  person_source TEXT,
  person_name_bn TEXT,
  person_name_en TEXT,
  person_designation_bn TEXT,
  person_designation_en TEXT,
  person_phone TEXT,
  person_email TEXT,
  person_photo_url TEXT,
  signature_url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.institution_signatories ENABLE ROW LEVEL SECURITY;

-- Select policy (public so public reports and visitors can see official signatory names)
DROP POLICY IF EXISTS "Anyone can view institution_signatories" ON public.institution_signatories;
CREATE POLICY "Anyone can view institution_signatories"
  ON public.institution_signatories FOR SELECT
  TO public
  USING (true);

-- Manage policy (authenticated users / admins)
DROP POLICY IF EXISTS "Admins can manage institution_signatories" ON public.institution_signatories;
CREATE POLICY "Admins can manage institution_signatories"
  ON public.institution_signatories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Seed default 4 institutional signatory roles
INSERT INTO public.institution_signatories (role_key, role_name_bn, role_name_en)
VALUES
  ('head_of_institute', 'প্রতিষ্ঠান প্রধান (মুহতামিম / অধ্যক্ষ / সুপার)', 'Head of Institute / Principal'),
  ('accountant_cashier', 'প্রধান হিসাবরক্ষক / ক্যাশিয়ার / কোষাধ্যক্ষ', 'Chief Accountant / Cashier'),
  ('verifier_auditor', 'হিসাব নিরীক্ষক / অভ্যন্তরীণ যাচাইকারী', 'Internal Auditor / Verifier'),
  ('exam_controller', 'পরীক্ষা নিয়ন্ত্রক / শিক্ষা সচিব', 'Controller of Examinations')
ON CONFLICT (role_key) DO NOTHING;

-- 4. Initial auto-seed from institutions and administrative_officers
UPDATE public.institution_signatories
SET person_name_bn = COALESCE(
      (SELECT name_bn FROM public.administrative_officers WHERE deleted_at IS NULL AND status = 'active' AND (designation ILIKE '%principal%' OR designation LIKE '%মুহতামিম%' OR designation LIKE '%অধ্যক্ষ%') LIMIT 1),
      (SELECT principal_name FROM public.institutions WHERE is_default = true LIMIT 1)
    )
WHERE role_key = 'head_of_institute' AND (person_name_bn IS NULL OR person_name_bn = '');

UPDATE public.institution_signatories
SET person_name_bn = COALESCE(
      (SELECT name_bn FROM public.staff WHERE deleted_at IS NULL AND status = 'active' AND (designation LIKE '%হিসাব%' OR designation LIKE '%ক্যাশিয়ার%') LIMIT 1),
      (SELECT accountant_name FROM public.institutions WHERE is_default = true LIMIT 1)
    )
WHERE role_key = 'accountant_cashier' AND (person_name_bn IS NULL OR person_name_bn = '');

UPDATE public.institution_signatories
SET person_name_bn = (SELECT verifier_name FROM public.institutions WHERE is_default = true LIMIT 1)
WHERE role_key = 'verifier_auditor' AND (person_name_bn IS NULL OR person_name_bn = '');

-- 5. Mark known designations with authority_role
UPDATE public.designations
SET authority_role = 'head_of_institute'
WHERE (name_bn LIKE '%মুহতামিম%' OR name_bn LIKE '%অধ্যক্ষ%' OR name_bn LIKE '%প্রিন্সিপাল%' OR name_bn LIKE '%সুপার%' OR name ILIKE '%principal%')
  AND (authority_role IS NULL OR authority_role = '');

UPDATE public.designations
SET authority_role = 'accountant_cashier'
WHERE (name_bn LIKE '%হিসাবরক্ষক%' OR name_bn LIKE '%ক্যাশিয়ার%' OR name_bn LIKE '%কোষাধ্যক্ষ%' OR name ILIKE '%accountant%' OR name ILIKE '%cashier%')
  AND (authority_role IS NULL OR authority_role = '');

UPDATE public.designations
SET authority_role = 'verifier_auditor'
WHERE (name_bn LIKE '%যাচাইকারী%' OR name_bn LIKE '%নিরীক্ষক%' OR name ILIKE '%auditor%' OR name ILIKE '%verifier%')
  AND (authority_role IS NULL OR authority_role = '');

UPDATE public.designations
SET authority_role = 'exam_controller'
WHERE (name_bn LIKE '%পরীক্ষা নিয়ন্ত্রক%' OR name_bn LIKE '%শিক্ষা সচিব%' OR name ILIKE '%controller%')
  AND (authority_role IS NULL OR authority_role = '');


-- Migration: 20261011040000_inventory_and_asset_advanced_tracking.sql
-- Migration: Enhance Inventory Items, Logs, and Fixed Assets for Advanced Tracking

-- 1. inventory_items enhancements
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS total_purchased NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_consumed NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'consumable';

-- Populate existing items initial purchased amount if 0
UPDATE public.inventory_items 
  SET total_purchased = current_stock 
  WHERE total_purchased = 0 AND current_stock > 0;

-- 2. inventory_logs enhancements
ALTER TABLE public.inventory_logs 
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;

-- 3. fixed_assets enhancements
ALTER TABLE public.fixed_assets 
  ADD COLUMN IF NOT EXISTS damaged_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_id UUID;

-- Update damaged quantity for existing damaged assets
UPDATE public.fixed_assets 
  SET damaged_quantity = COALESCE(quantity, 1) 
  WHERE status IN ('damaged', 'disposed') AND damaged_quantity = 0;

-- 4. RLS Policy updates to ensure admin and staff can manage items and assets
DO $$
BEGIN
  -- inventory_items
  DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory_items;
  DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory_items;
  CREATE POLICY "Staff can manage inventory" ON public.inventory_items
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    );

  -- fixed_assets
  DROP POLICY IF EXISTS "Admins can manage assets" ON public.fixed_assets;
  DROP POLICY IF EXISTS "Staff can manage assets" ON public.fixed_assets;
  CREATE POLICY "Staff can manage assets" ON public.fixed_assets
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    );

  -- inventory_logs
  DROP POLICY IF EXISTS "Admins can manage inventory logs" ON public.inventory_logs;
  DROP POLICY IF EXISTS "Staff can manage inventory logs" ON public.inventory_logs;
  CREATE POLICY "Staff can manage inventory logs" ON public.inventory_logs
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    );
END $$;


-- Migration: 20261012025500_enrich_public_find_exam_student_fields.sql
DROP FUNCTION IF EXISTS public.public_find_exam_student(uuid, text);
DROP FUNCTION IF EXISTS public.public_find_exam_student(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(
   student_id uuid,
   class_id uuid,
   merit_rank integer,
   name_bn text,
   name_en text,
   roll_number text,
   registration_no text,
   division_id uuid,
   session_id uuid,
   photo_url text,
   father_name text,
   date_of_birth date,
   marks jsonb
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH matched AS (
    SELECT
      s.id AS student_id,
      ess.class_id,
      s.name_bn,
      s.name_en,
      s.roll_number,
      s.registration_no,
      s.division_id,
      s.session_id,
      s.photo_url,
      s.father_name,
      s.date_of_birth
    FROM public.exam_session_students ess
    JOIN public.exam_sessions es
      ON es.id = ess.exam_session_id
     AND es.is_published = true
    JOIN public.students s
      ON s.id = ess.student_id
     AND COALESCE(s.status, 'active') = 'active'
     AND s.deleted_at IS NULL
    WHERE ess.exam_session_id = p_session_id
      AND (p_class_id IS NULL OR ess.class_id = p_class_id)
      AND (
        s.roll_number = btrim(p_roll)
        OR s.student_id = btrim(p_roll)
        OR s.registration_no = btrim(p_roll)
      )
    LIMIT 1
  ),
  pass_config AS (
    SELECT COALESCE((vr.config ->> 'min')::numeric, 33) AS pass_mark
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'pass_mark'
      AND vr.is_active = true
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  grace_config AS (
    SELECT
      vr.is_active AND COALESCE((vr.config ->> 'enabled')::boolean, true) AS enabled,
      COALESCE(vr.config ->> 'apply_to', 'all') AS apply_to,
      COALESCE((vr.config ->> 'max_subjects')::integer, 1) AS max_subjects,
      COALESCE(vr.config -> 'class_rules', '{}'::jsonb) AS class_rules
    FROM public.validation_rules vr
    WHERE vr.module = 'result'
      AND vr.field_name = 'grace_pass'
    ORDER BY vr.sort_order
    LIMIT 1
  ),
  relevant_subjects AS (
    SELECT DISTINCT essu.subject_id
    FROM matched m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.exam_session_subjects essu ON essu.exam_session_id = p_session_id
    JOIN public.subjects sub ON sub.id = essu.subject_id
    WHERE sub.division_id = c.division_id OR sub.class_id = m.class_id
  ),
  class_stats AS (
    SELECT
      enrolled.student_id,
      COALESCE(SUM(r.marks) FILTER (WHERE r.id IS NOT NULL), 0) AS total_marks,
      COUNT(r.id) > 0 AS has_any_mark,
      COUNT(r.id) FILTER (
        WHERE r.marks < COALESCE((SELECT pass_mark FROM pass_config), 33)
      )::integer AS failed_count
    FROM matched m
    JOIN public.exam_session_students enrolled
      ON enrolled.exam_session_id = p_session_id
     AND enrolled.class_id = m.class_id
    CROSS JOIN relevant_subjects rs
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = enrolled.student_id
     AND r.subject_id = rs.subject_id
    GROUP BY enrolled.student_id
  ),
  ranked AS (
    SELECT
      cs.*,
      CASE
        WHEN COALESCE((SELECT enabled FROM grace_config), false) = false THEN 0
        WHEN (SELECT class_rules FROM grace_config) ? (SELECT class_id::text FROM matched)
          THEN COALESCE(((SELECT class_rules FROM grace_config) ->> (SELECT class_id::text FROM matched))::integer, 0)
        WHEN COALESCE((SELECT apply_to FROM grace_config), 'all') = 'selected' THEN 0
        ELSE COALESCE((SELECT max_subjects FROM grace_config), 0)
      END AS grace_limit
    FROM class_stats cs
  ),
  eligible AS (
    SELECT
      r.*,
      CASE WHEN r.failed_count = 0 THEN 0 ELSE 1 END AS merit_tier
    FROM ranked r
    WHERE r.has_any_mark
      AND (r.failed_count = 0 OR (r.grace_limit > 0 AND r.failed_count <= r.grace_limit))
  ),
  target_rank AS (
    SELECT
      target.student_id,
      (
        1 + COUNT(*) FILTER (
          WHERE higher.merit_tier < target.merit_tier
             OR (higher.merit_tier = target.merit_tier AND higher.total_marks > target.total_marks)
        )
      )::integer AS merit_rank
    FROM eligible target
    JOIN matched m ON m.student_id = target.student_id
    CROSS JOIN eligible higher
    GROUP BY target.student_id, target.merit_tier, target.total_marks
  ),
  target_marks AS (
    SELECT COALESCE(jsonb_object_agg(r.subject_id::text, r.marks), '{}'::jsonb) AS marks
    FROM matched m
    LEFT JOIN public.published_results r
      ON r.exam_id = p_session_id
     AND r.student_id = m.student_id
  )
  SELECT
    m.student_id,
    m.class_id,
    tr.merit_rank,
    m.name_bn,
    m.name_en,
    m.roll_number,
    m.registration_no,
    m.division_id,
    m.session_id,
    m.photo_url,
    m.father_name,
    m.date_of_birth,
    tm.marks
  FROM matched m
  LEFT JOIN target_rank tr ON tr.student_id = m.student_id
  CROSS JOIN target_marks tm;
$function$;

REVOKE ALL ON FUNCTION public.public_find_exam_student(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text, uuid) TO anon, authenticated;


-- Migration: 20261016210000_optimize_rls_permission_checks.sql
-- Optimize RLS Permission Checks and Prevent SubPlan Explosion for Non-Admin Users
-- This migration replaces row-by-row PL/pgSQL evaluation with a single-query SQL function
-- and wraps RLS policies in scalar subqueries `(SELECT ...)` to force PostgreSQL to plan
-- them as one-time InitPlans instead of per-row SubPlans.

-- 1. Create high-performance index on permission tables if not already present
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles (user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup ON public.user_permissions (user_id, menu_path);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON public.role_permissions (role, menu_path);

-- 2. Fast SQL-based has_any_menu_permission
CREATE OR REPLACE FUNCTION public.has_any_menu_permission(
  _user_id uuid,
  _paths text[],
  _action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    -- Admin or Super Admin bypass (single index lookup)
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id 
        AND ur.role IN ('admin'::public.app_role, 'super_admin'::public.app_role)
    ) THEN true
    -- When user has user_permissions override
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions WHERE user_id = _user_id
    ) THEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user_id
        AND up.menu_path = ANY(_paths)
        AND (
          CASE _action
            WHEN 'view'    THEN up.can_view
            WHEN 'add'     THEN up.can_add
            WHEN 'edit'    THEN up.can_edit
            WHEN 'delete'  THEN up.can_delete
            WHEN 'approve' THEN up.can_approve
            ELSE false
          END
        )
    )
    -- Fallback to role_permissions
    ELSE EXISTS (
      SELECT 1 FROM public.role_permissions rp
      JOIN public.user_roles ur ON ur.role::text = rp.role
      WHERE ur.user_id = _user_id
        AND rp.menu_path = ANY(_paths)
        AND (
          CASE _action
            WHEN 'view'    THEN rp.can_view
            WHEN 'add'     THEN rp.can_add
            WHEN 'edit'    THEN rp.can_edit
            WHEN 'delete'  THEN rp.can_delete
            WHEN 'approve' THEN rp.can_approve
            ELSE false
          END
        )
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_any_menu_permission(uuid, text[], text) TO authenticated;

-- 3. Fast SQL-based has_menu_permission delegating directly to has_any_menu_permission
CREATE OR REPLACE FUNCTION public.has_menu_permission(
  _user_id uuid,
  _menu_path text,
  _action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_menu_permission(_user_id, ARRAY[_menu_path], _action);
$$;

GRANT EXECUTE ON FUNCTION public.has_menu_permission(uuid, text, text) TO authenticated;

-- 4. Re-apply table policies using (SELECT public.has_any_menu_permission(...)) for InitPlan caching
DO $do$
DECLARE
  rec record;
  mapping jsonb := '[
    {"t":"divisions","p":["/admin/divisions","/admin/academic-sessions"]},
    {"t":"classes","p":["/admin/divisions","/admin/classes","/admin/academic-sessions"]},
    {"t":"academic_sessions","p":["/admin/academic-sessions","/admin/divisions"]},
    {"t":"subjects","p":["/admin/subjects"]},
    {"t":"exam_sessions","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_types","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_classes","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_subjects","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"exam_session_students","p":["/admin/exam-sessions","/admin/results"]},
    {"t":"results","p":["/admin/results"]},
    {"t":"published_results","p":["/admin/results"]},
    {"t":"class_routines","p":["/admin/class-routine","/admin/routine"]},
    {"t":"routine_periods","p":["/admin/class-routine","/admin/routine"]},
    {"t":"notices","p":["/admin/notices"]},
    {"t":"posts","p":["/admin/posts"]},
    {"t":"fee_types","p":["/admin/fees","/admin/fee-types","/admin/students-fees"]},
    {"t":"fee_categories","p":["/admin/fees","/admin/fee-categories","/admin/students-fees"]},
    {"t":"fee_payments","p":["/admin/fees","/admin/students-fees","/admin/fee-receipts","/admin/fee-collection"]},
    {"t":"expenses","p":["/admin/expenses"]},
    {"t":"donors","p":["/admin/donors"]},
    {"t":"salary_records","p":["/admin/salary"]},
    {"t":"library_books","p":["/admin/library"]},
    {"t":"library_issuances","p":["/admin/library"]},
    {"t":"library_profiles","p":["/admin/library"]},
    {"t":"student_certificates","p":["/admin/student-certificates","/admin/certificates"]},
    {"t":"joining_letters","p":["/admin/joining-letters"]},
    {"t":"holidays","p":["/admin/holidays","/admin/settings"]},
    {"t":"staff_holidays","p":["/admin/staff-holidays"]},
    {"t":"designations","p":["/admin/designations"]},
    {"t":"committees","p":["/admin/committees"]},
    {"t":"committee_members","p":["/admin/committee-members","/admin/committees"]},
    {"t":"inventory_items","p":["/admin/inventory"]},
    {"t":"hostels","p":["/admin/hostel"]},
    {"t":"hostel_rooms","p":["/admin/hostel"]},
    {"t":"hostel_allocations","p":["/admin/hostel"]},
    {"t":"scholarships","p":["/admin/scholarships"]},
    {"t":"budgets","p":["/admin/budgets"]},
    {"t":"question_papers","p":["/admin/question-papers","/admin/questions"]},
    {"t":"questions","p":["/admin/questions","/admin/question-papers"]},
    {"t":"online_exams","p":["/admin/online-exams"]},
    {"t":"admission_tests","p":["/admin/admission-tests"]},
    {"t":"live_classes","p":["/admin/live-classes"]},
    {"t":"duty_shifts","p":["/admin/duty-roster","/admin/duty-shifts"]},
    {"t":"duty_roster","p":["/admin/duty-roster","/admin/duty-shifts"]}
  ]'::jsonb;
  tbl text;
  paths text;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(mapping) AS m(obj)
  LOOP
    tbl := rec.obj->>'t';
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      CONTINUE;
    END IF;

    SELECT string_agg(quote_literal(x), ',') INTO paths
    FROM jsonb_array_elements_text(rec.obj->'p') AS t(x);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can view ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''view'')))',
      'Permitted users can view ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can add ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''add'')))',
      'Permitted users can add ' || tbl, tbl, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can edit ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''edit''))) WITH CHECK ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''edit'')))',
      'Permitted users can edit ' || tbl, tbl, paths, paths);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Permitted users can remove ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.has_any_menu_permission(auth.uid(), ARRAY[%s]::text[], ''delete'')))',
      'Permitted users can remove ' || tbl, tbl, paths);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
  END LOOP;
END
$do$;

-- 5. STUDENTS table policies optimized with InitPlan scalar subqueries
DROP POLICY IF EXISTS "Permitted attendance users can view students" ON public.students;
CREATE POLICY "Permitted attendance users can view students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/students', '/admin/attendance', '/admin/student-attendance']::text[], 'view'))
  );

DROP POLICY IF EXISTS "Staff can add students with permission" ON public.students;
CREATE POLICY "Staff can add students with permission"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'add'))
  );

DROP POLICY IF EXISTS "Staff can edit students with permission" ON public.students;
CREATE POLICY "Staff can edit students with permission"
  ON public.students FOR UPDATE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'edit')))
  WITH CHECK ((SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'edit')));

DROP POLICY IF EXISTS "Staff can delete students with permission" ON public.students;
CREATE POLICY "Staff can delete students with permission"
  ON public.students FOR DELETE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/students', 'delete')));

-- 6. ATTENDANCE_RECORDS table policies optimized with InitPlan scalar subqueries
DROP POLICY IF EXISTS "Permitted users add attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users add attendance_records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'add'))
  OR (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'edit'))
);

DROP POLICY IF EXISTS "Permitted users edit attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users edit attendance_records" ON public.attendance_records FOR UPDATE TO authenticated USING (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'edit'))
) WITH CHECK (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'edit'))
);

DROP POLICY IF EXISTS "Permitted users delete attendance_records" ON public.attendance_records;
CREATE POLICY "Permitted users delete attendance_records" ON public.attendance_records FOR DELETE TO authenticated USING (
  (SELECT public.has_any_menu_permission(auth.uid(), ARRAY['/admin/attendance', '/admin/staff-attendance', '/admin/student-attendance']::text[], 'delete'))
);

-- 7. STAFF table policies optimized with InitPlan scalar subqueries
DROP POLICY IF EXISTS "Staff can add staff with permission" ON public.staff;
CREATE POLICY "Staff can add staff with permission"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'add'))
  );

DROP POLICY IF EXISTS "Staff can edit staff with permission" ON public.staff;
CREATE POLICY "Staff can edit staff with permission"
  ON public.staff FOR UPDATE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'edit')))
  WITH CHECK ((SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'edit')));

DROP POLICY IF EXISTS "Staff can delete staff with permission" ON public.staff;
CREATE POLICY "Staff can delete staff with permission"
  ON public.staff FOR DELETE
  TO authenticated
  USING ((SELECT public.has_menu_permission(auth.uid(), '/admin/staff', 'delete')));

-- 8. RECEIPT_STATUS_AUDIT table policy optimized with scalar subquery
DROP POLICY IF EXISTS "Admins view receipt status audit" ON public.receipt_status_audit;
CREATE POLICY "Admins view receipt status audit"
ON public.receipt_status_audit
FOR SELECT
TO authenticated
USING (
  (SELECT public.has_role(auth.uid(), 'admin'::app_role))
  OR (SELECT public.has_role(auth.uid(), 'super_admin'::app_role))
  OR (SELECT public.is_accounts_staff(auth.uid()))
);


-- Migration: 20261019010000_prevent_duplicate_serials_and_receipts.sql
-- Migration: 20261019010000_prevent_duplicate_serials_and_receipts.sql
-- Description: Implement atomic serial number generators and UNIQUE constraints for
-- 1. Resignation letters (RL-YYYY-XXX)
-- 2. Joining & Reinstatement letters (JL-YYYY-XXX)
-- 3. Student roll numbers (numeric atomic sequence per class/session)
-- 4. Fee payment receipt numbers (SL-YYYY-XXXX auto-assigned via BEFORE INSERT trigger)
-- 5. Deduplication and UNIQUE indexes on all serial fields

-- ============================================================================
-- 1. RECEIPT COUNTER & FEE PAYMENTS ATOMIC RECEIPT NUMBER
-- ============================================================================

-- Ensure receipt_counter table exists and has initial record
CREATE TABLE IF NOT EXISTS public.receipt_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text NOT NULL DEFAULT 'SL',
  current_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initialize receipt_counter row if not present
INSERT INTO public.receipt_counter (prefix, current_year, last_number)
SELECT 'SL', EXTRACT(YEAR FROM now())::integer, 0
WHERE NOT EXISTS (SELECT 1 FROM public.receipt_counter);

-- Robust atomic function for receipt serial
CREATE OR REPLACE FUNCTION public.get_next_receipt_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_year integer;
  v_next integer;
  v_current_year integer;
BEGIN
  v_current_year := EXTRACT(YEAR FROM now())::integer;
  
  -- Lock row for update
  SELECT prefix, current_year, last_number
  INTO v_prefix, v_year, v_next
  FROM public.receipt_counter
  LIMIT 1
  FOR UPDATE;
  
  -- If empty somehow, insert and lock
  IF v_prefix IS NULL THEN
    INSERT INTO public.receipt_counter (prefix, current_year, last_number)
    VALUES ('SL', v_current_year, 0)
    RETURNING prefix, current_year, last_number
    INTO v_prefix, v_year, v_next;
  END IF;
  
  -- If year changed, reset counter
  IF v_year != v_current_year THEN
    v_next := 1;
    UPDATE public.receipt_counter
    SET current_year = v_current_year, last_number = 1, updated_at = now();
  ELSE
    v_next := v_next + 1;
    UPDATE public.receipt_counter
    SET last_number = v_next, updated_at = now();
  END IF;
  
  RETURN v_prefix || '-' || v_current_year::text || '-' || lpad(v_next::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_receipt_serial() TO anon, authenticated;

-- BEFORE INSERT trigger on fee_payments: automatically assign receipt_number if omitted
CREATE OR REPLACE FUNCTION public.auto_assign_fee_payment_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR trim(NEW.receipt_number) = '' THEN
    NEW.receipt_number := public.get_next_receipt_serial();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_fee_receipt_number ON public.fee_payments;
CREATE TRIGGER trg_auto_assign_fee_receipt_number
  BEFORE INSERT ON public.fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_fee_payment_receipt_number();

-- Deduplicate any existing duplicate fee payment receipt numbers safely
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT receipt_number
    FROM public.fee_payments
    WHERE receipt_number IS NOT NULL AND trim(receipt_number) != '' AND (deleted_at IS NULL)
    GROUP BY receipt_number
    HAVING count(*) > 1
  LOOP
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM public.fee_payments
      WHERE receipt_number = r.receipt_number AND deleted_at IS NULL
    )
    UPDATE public.fee_payments fp
    SET receipt_number = fp.receipt_number || '-DUP' || (n.rn - 1)
    FROM numbered n
    WHERE fp.id = n.id AND n.rn > 1;
  END LOOP;
END;
$$;

-- UNIQUE index on fee_payments(receipt_number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_payments_receipt_number
ON public.fee_payments (receipt_number)
WHERE deleted_at IS NULL AND receipt_number IS NOT NULL AND trim(receipt_number) != '';


-- ============================================================================
-- 2. RESIGNATION LETTERS (RL-YYYY-XXX) ATOMIC GENERATOR & CONSTRAINT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_resignation_letter_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq int;
  v_letter_no text;
  v_attempt int := 0;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::text;
  
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COALESCE(MAX(
      CASE WHEN letter_number ~ ('^RL-' || v_year || '-[0-9]+$')
           THEN (regexp_replace(letter_number, '^RL-' || v_year || '-', ''))::int
           ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.resign_letters
    WHERE letter_number LIKE 'RL-' || v_year || '-%';

    v_letter_no := 'RL-' || v_year || '-' || lpad(v_seq::text, 3, '0');

    IF NOT EXISTS (SELECT 1 FROM public.resign_letters WHERE letter_number = v_letter_no) THEN
      RETURN v_letter_no;
    END IF;

    IF v_attempt > 25 THEN
      RETURN 'RL-' || v_year || '-' || lpad((v_seq + v_attempt)::text, 3, '0');
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_resignation_letter_number() TO authenticated, anon;

-- Auto-assign trigger on resign_letters
CREATE OR REPLACE FUNCTION public.auto_assign_resignation_letter_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.letter_number IS NULL OR trim(NEW.letter_number) = '' THEN
    NEW.letter_number := public.generate_resignation_letter_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_resignation_letter_number ON public.resign_letters;
CREATE TRIGGER trg_auto_assign_resignation_letter_number
  BEFORE INSERT ON public.resign_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_resignation_letter_number();

-- Deduplicate existing resign_letters duplicates
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT letter_number
    FROM public.resign_letters
    WHERE letter_number IS NOT NULL AND trim(letter_number) != ''
    GROUP BY letter_number
    HAVING count(*) > 1
  LOOP
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM public.resign_letters
      WHERE letter_number = r.letter_number
    )
    UPDATE public.resign_letters rl
    SET letter_number = rl.letter_number || '-DUP' || (n.rn - 1)
    FROM numbered n
    WHERE rl.id = n.id AND n.rn > 1;
  END LOOP;
END;
$$;

-- UNIQUE index on resign_letters(letter_number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_resign_letters_letter_number
ON public.resign_letters(letter_number)
WHERE letter_number IS NOT NULL AND trim(letter_number) != '';


-- ============================================================================
-- 3. JOINING & REINSTATEMENT LETTERS (JL-YYYY-XXX) ATOMIC GENERATOR & CONSTRAINT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_joining_letter_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq int;
  v_letter_no text;
  v_attempt int := 0;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::text;
  
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COALESCE(MAX(
      CASE WHEN letter_number ~ ('^JL-' || v_year || '-[0-9]+$')
           THEN (regexp_replace(letter_number, '^JL-' || v_year || '-', ''))::int
           ELSE 0 END
    ), 0) + 1
    INTO v_seq
    FROM public.joining_letters
    WHERE letter_number LIKE 'JL-' || v_year || '-%';

    v_letter_no := 'JL-' || v_year || '-' || lpad(v_seq::text, 3, '0');

    IF NOT EXISTS (SELECT 1 FROM public.joining_letters WHERE letter_number = v_letter_no) THEN
      RETURN v_letter_no;
    END IF;

    IF v_attempt > 25 THEN
      RETURN 'JL-' || v_year || '-' || lpad((v_seq + v_attempt)::text, 3, '0');
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_joining_letter_number() TO authenticated, anon;

-- Auto-assign trigger on joining_letters
CREATE OR REPLACE FUNCTION public.auto_assign_joining_letter_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.letter_number IS NULL OR trim(NEW.letter_number) = '' THEN
    NEW.letter_number := public.generate_joining_letter_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_joining_letter_number ON public.joining_letters;
CREATE TRIGGER trg_auto_assign_joining_letter_number
  BEFORE INSERT ON public.joining_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_joining_letter_number();

-- Deduplicate existing joining_letters duplicates (e.g. JL-2026-002)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT letter_number
    FROM public.joining_letters
    WHERE letter_number IS NOT NULL AND trim(letter_number) != ''
    GROUP BY letter_number
    HAVING count(*) > 1
  LOOP
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM public.joining_letters
      WHERE letter_number = r.letter_number
    )
    UPDATE public.joining_letters jl
    SET letter_number = jl.letter_number || '-DUP' || (n.rn - 1)
    FROM numbered n
    WHERE jl.id = n.id AND n.rn > 1;
  END LOOP;
END;
$$;

-- UNIQUE index on joining_letters(letter_number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_joining_letters_letter_number
ON public.joining_letters(letter_number)
WHERE letter_number IS NOT NULL AND trim(letter_number) != '';


-- ============================================================================
-- 4. STUDENT ROLL NUMBER ATOMIC GENERATOR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_next_student_roll(
  p_class_id uuid,
  p_session_id uuid DEFAULT NULL,
  p_session_year text DEFAULT NULL,
  p_roll_start int DEFAULT 1001
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_roll int;
  v_roll_prefix int;
  v_next_roll int;
BEGIN
  IF p_roll_start IS NULL OR p_roll_start <= 0 THEN
    p_roll_start := 1001;
  END IF;

  v_roll_prefix := floor(p_roll_start / 1000)::int;

  -- Select maximum numeric roll cleanly using regex to avoid text comparison bugs ('99' > '100')
  SELECT COALESCE(MAX(
    CASE WHEN roll_number ~ '^[0-9]+$' 
         THEN roll_number::integer 
         ELSE 0 END
  ), p_roll_start - 1)
  INTO v_max_roll
  FROM public.students
  WHERE (class_id = p_class_id OR (roll_number ~ '^[0-9]+$' AND roll_number::integer >= p_roll_start AND roll_number::integer < (v_roll_prefix + 1) * 1000))
    AND (deleted_at IS NULL)
    AND (
      (p_session_id IS NOT NULL AND session_id = p_session_id) OR
      (p_session_year IS NOT NULL AND (session_year = p_session_year OR admission_session = p_session_year)) OR
      (p_session_id IS NULL AND p_session_year IS NULL)
    );

  IF v_max_roll < p_roll_start - 1 THEN
    v_max_roll := p_roll_start - 1;
  END IF;

  v_next_roll := v_max_roll + 1;

  -- Ensure collision avoidance against any pending or in-flight records
  WHILE EXISTS (
    SELECT 1 FROM public.students
    WHERE roll_number = v_next_roll::text
      AND deleted_at IS NULL
      AND (
        (p_session_id IS NOT NULL AND session_id = p_session_id) OR
        (p_session_year IS NOT NULL AND (session_year = p_session_year OR admission_session = p_session_year)) OR
        class_id = p_class_id
      )
  ) LOOP
    v_next_roll := v_next_roll + 1;
  END LOOP;

  RETURN v_next_roll::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_student_roll(uuid, uuid, text, int) TO authenticated, anon;


-- Migration: 20261019020000_enable_realtime_for_permissions.sql
-- Enable Realtime publication & full replica identity for instant permission sync

DO $$
BEGIN
  -- Set REPLICA IDENTITY FULL so DELETE/UPDATE events deliver all column data to clients
  ALTER TABLE public.user_permissions REPLICA IDENTITY FULL;
  ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;
  ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
  ALTER TABLE public.website_settings REPLICA IDENTITY FULL;

  -- Add to supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'role_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'website_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.website_settings;
  END IF;
END $$;


-- Migration: 20261019021500_fix_photos_storage_rls_for_users.sql
-- Fix storage policies for photos and staff-letters to allow authenticated users (staff, teachers, admins) to upload/update/view photos without RLS violations

-- 1. Ensure photos bucket is public for fast CDN loading & print compatibility
UPDATE storage.buckets SET public = true WHERE id = 'photos';

-- 2. Drop existing restrictive policies on photos
DROP POLICY IF EXISTS "photos_authorized_read" ON storage.objects;
DROP POLICY IF EXISTS "photos_read_admins_staff_or_owner" ON storage.objects;
DROP POLICY IF EXISTS "photos_anon_public_read" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert_admin_or_owner" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "photos_anon_public_form_upload" ON storage.objects;
DROP POLICY IF EXISTS "photos_update_admin_only" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete_admin_only" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_authenticated_delete" ON storage.objects;

-- 3. Create clean, permissive policies for photos bucket
-- Allow any user (authenticated or anonymous) to view photos (needed for faculty lists, student lists, public website)
CREATE POLICY "photos_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Allow all authenticated users (admin, staff, teacher, accounts, etc.) to upload photos
CREATE POLICY "photos_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Allow anonymous users to upload for public application and admission forms
CREATE POLICY "photos_anon_insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'photos'
  AND (
    (storage.foldername(name))[1] IN ('public-uploads', 'students', 'staff', 'staff-docs', 'general')
  )
);

-- Allow authenticated users to update photos (needed for upsert: true)
CREATE POLICY "photos_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

-- Allow authenticated users to delete photos when removing or replacing
CREATE POLICY "photos_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');

-- 4. Fix staff-letters storage bucket policies
DROP POLICY IF EXISTS "Admins upload staff letters" ON storage.objects;
DROP POLICY IF EXISTS "Admins update staff letters" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete staff letters" ON storage.objects;
DROP POLICY IF EXISTS "Admins read staff-letters bucket" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_select" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_insert" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_update" ON storage.objects;
DROP POLICY IF EXISTS "staff_letters_delete" ON storage.objects;

CREATE POLICY "staff_letters_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "staff_letters_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "staff_letters_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "staff_letters_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff-letters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- 5. Update public.can_access_storage_object function to grant photo access to all authenticated users
CREATE OR REPLACE FUNCTION public.can_access_storage_object(_user_id uuid, _bucket text, _object_path text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_seg TEXT;
BEGIN
  IF _object_path IS NULL THEN RETURN false; END IF;

  -- Photos bucket: all users can view photos (profiles, staff, student photos, general)
  IF _bucket = 'photos' THEN
    RETURN true;
  END IF;

  IF _user_id IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'super_admin') OR public.has_role(_user_id,'admin') THEN
    RETURN true;
  END IF;
  v_first_seg := split_part(_object_path, '/', 1);

  IF _bucket = 'chat-attachments' THEN
    BEGIN
      RETURN public.is_conversation_participant(v_first_seg::uuid, _user_id);
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  IF _bucket = 'receipts' THEN
    IF public.is_accounts_staff(_user_id) THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.parent_accounts pa
      WHERE pa.user_id = _user_id AND pa.status IN ('approved','active')
        AND pa.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = _user_id AND s.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'staff-letters' THEN
    RETURN true;
  END IF;

  IF _bucket = 'committee-attachments' THEN
    RETURN public.has_role(_user_id,'staff') OR public.has_role(_user_id,'teacher') OR public.has_role(_user_id,'administrative') OR public.has_menu_permission(_user_id, '/admin/committees', 'view');
  END IF;

  RETURN false;
END;
$function$;


-- Migration: 20261019030000_add_payment_rejection_and_collector.sql
-- Migration: Add payment rejection reason, custom collector, and soft delete to payments table
-- Safe for execution in Supabase SQL editor

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS collected_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Ensure staff and users can update their own pending/failed payments when editing/resubmitting
DROP POLICY IF EXISTS "Staff and creators can update pending or failed payments" ON public.payments;
CREATE POLICY "Staff and creators can update pending or failed payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR (created_by = auth.uid() AND status IN ('pending', 'failed'))
  OR (public.has_role(auth.uid(), 'staff') AND status IN ('pending', 'failed'))
  OR (public.has_role(auth.uid(), 'teacher') AND status IN ('pending', 'failed'))
);

-- Ensure admins can delete payments
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);


-- Migration: 20261019033000_ensure_payment_and_fee_deletion_policy.sql
-- Migration: Ensure authorized admins and staff can delete payments and fee_payments cleanly
DROP POLICY IF EXISTS "Staff can delete fee_payments with permission" ON public.fee_payments;
CREATE POLICY "Staff can delete fee_payments with permission"
  ON public.fee_payments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/fees', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-receipts', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'delete')
  );

DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/payments', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-receipts', 'delete')
  );


-- Migration: 20261019050000_sync_class_status_to_students.sql
-- Migration: Automatically synchronize class & division active status to students
-- When a class is deactivated, all students in that class become inactive everywhere.
-- When a class is activated, all students in that class become active.

-- 1. Function and Trigger for classes table
CREATE OR REPLACE FUNCTION public.sync_class_status_to_students()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    UPDATE public.students
    SET status = CASE WHEN NEW.is_active = TRUE THEN 'active' ELSE 'inactive' END,
        updated_at = NOW()
    WHERE class_id = NEW.id
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_class_status_to_students ON public.classes;
CREATE TRIGGER trg_sync_class_status_to_students
AFTER UPDATE OF is_active ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.sync_class_status_to_students();

-- 2. Function and Trigger for divisions table
CREATE OR REPLACE FUNCTION public.sync_division_status_to_classes_and_students()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- Cascade is_active to classes in this division
    UPDATE public.classes
    SET is_active = NEW.is_active
    WHERE division_id = NEW.id;

    -- Cascade status to students in this division
    UPDATE public.students
    SET status = CASE WHEN NEW.is_active = TRUE THEN 'active' ELSE 'inactive' END,
        updated_at = NOW()
    WHERE division_id = NEW.id
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_division_status ON public.divisions;
CREATE TRIGGER trg_sync_division_status
AFTER UPDATE OF is_active ON public.divisions
FOR EACH ROW
EXECUTE FUNCTION public.sync_division_status_to_classes_and_students();

-- 3. One-time retroactive cleanup of existing records
-- Set students of inactive classes to 'inactive'
UPDATE public.students s
SET status = 'inactive',
    updated_at = NOW()
FROM public.classes c
WHERE s.class_id = c.id
  AND c.is_active = FALSE
  AND s.deleted_at IS NULL
  AND (s.status IS NULL OR s.status = 'active');

-- Set students of inactive divisions to 'inactive'
UPDATE public.students s
SET status = 'inactive',
    updated_at = NOW()
FROM public.divisions d
WHERE s.division_id = d.id
  AND d.is_active = FALSE
  AND s.deleted_at IS NULL
  AND (s.status IS NULL OR s.status = 'active');





-- Migration: 20261019223000_restore_staff_id_year_format.sql
ALTER TABLE public.id_format_config ALTER COLUMN include_year SET DEFAULT true;
ALTER TABLE public.id_format_config ALTER COLUMN reset_mode SET DEFAULT 'yearly';

UPDATE public.id_format_config
SET include_year = true,
    reset_mode = 'yearly',
    updated_at = now()
WHERE entity_key IN ('teacher', 'general', 'support', 'chef', 'administrative', 'administrative_officer');

CREATE OR REPLACE FUNCTION public.generate_staff_id(p_category_key text, p_joining_year integer DEFAULT NULL::integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.id_format_config%ROWTYPE;
  v_year INTEGER;
  v_max INTEGER;
  v_next INTEGER;
  v_id TEXT;
  v_prefix_pattern TEXT;
BEGIN
  SELECT * INTO c FROM public.id_format_config WHERE entity_key = p_category_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.id_format_config(entity_key, label, prefix, start_serial, include_year, reset_mode)
    SELECT key, COALESCE(name_bn, name, key), COALESCE(id_prefix, 'STF'), COALESCE(id_start_range, 1001), true, 'yearly'
      FROM public.staff_categories WHERE key = p_category_key
    RETURNING * INTO c;
    IF c.entity_key IS NULL THEN
      RAISE EXCEPTION 'No ID format configured for category: %', p_category_key;
    END IF;
  END IF;

  v_year := COALESCE(p_joining_year, EXTRACT(YEAR FROM now())::INTEGER);

  IF c.reset_mode = 'yearly' AND c.include_year THEN
    v_prefix_pattern := c.prefix || c.separator || v_year::TEXT || c.separator;
    SELECT MAX(CAST(regexp_replace(staff_id, '^.*' || c.separator, '') AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE (
       staff_id LIKE v_prefix_pattern || '%'
       OR (staff_id LIKE c.prefix || c.separator || '%' AND staff_id ~ ('^' || regexp_replace(c.prefix,'([.+*?^$()\[\]{}|\\])','\\\1','g') || c.separator || '[0-9]+$'))
     )
     AND staff_id ~ '[0-9]+$';
  ELSE
    SELECT MAX(CAST((regexp_match(staff_id,'([0-9]+)$'))[1] AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE c.prefix || c.separator || '%'
       AND staff_id ~ '[0-9]+$';
  END IF;

  v_next := COALESCE(GREATEST(v_max + 1, c.start_serial), c.start_serial);
  v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);

  WHILE EXISTS (SELECT 1 FROM public.staff WHERE staff_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);
  END LOOP;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_staff_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_prefix TEXT;
  c public.id_format_config%ROWTYPE;
BEGIN
  IF NEW.joining_date IS NOT NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.joining_date::DATE);
  ELSE
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
  END IF;

  SELECT * INTO c
  FROM public.id_format_config
  WHERE entity_key = NEW.staff_category
  LIMIT 1;

  IF c.prefix IS NOT NULL THEN
    v_prefix := c.prefix;
  ELSE
    SELECT id_prefix INTO v_prefix
    FROM public.staff_categories
    WHERE key = NEW.staff_category
      AND is_active = true
    LIMIT 1;
  END IF;

  IF NEW.staff_id IS NULL
     OR NEW.staff_id = ''
     OR (TG_OP = 'UPDATE' AND NEW.staff_category IS DISTINCT FROM OLD.staff_category)
     OR (v_prefix IS NOT NULL AND NEW.staff_id NOT LIKE v_prefix || '-%') THEN
    NEW.staff_id := public.generate_staff_id(NEW.staff_category, v_year);
  ELSIF (c.include_year IS TRUE OR c.entity_key IS NULL)
        AND v_prefix IS NOT NULL
        AND NEW.staff_id ~ ('^' || v_prefix || '-[0-9]+$') THEN
    NEW.staff_id := v_prefix || '-' || v_year::TEXT || '-' || split_part(NEW.staff_id, '-', 2);
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.staff
SET staff_id = split_part(staff_id, '-', 1) || '-' || COALESCE(EXTRACT(YEAR FROM joining_date::date)::text, '2026') || '-' || split_part(staff_id, '-', 2)
WHERE staff_id ~ '^[A-Za-z]+-[0-9]+$';

-- Migration: 20261019231500_deduplicate_attendance_rules.sql
DELETE FROM public.attendance_rules a
USING public.attendance_rules b
WHERE a.id <> b.id
  AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id::text > b.id::text))
  AND a.entity_type = b.entity_type
  AND a.rule_type = b.rule_type
  AND coalesce(a.config->>'counts_as', lower(a.name)) = coalesce(b.config->>'counts_as', lower(b.name));

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_rules_entity_counts_as 
ON public.attendance_rules (entity_type, rule_type, (coalesce(config->>'counts_as', lower(name))));
