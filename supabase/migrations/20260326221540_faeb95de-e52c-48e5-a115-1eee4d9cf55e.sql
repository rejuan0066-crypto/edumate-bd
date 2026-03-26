
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
