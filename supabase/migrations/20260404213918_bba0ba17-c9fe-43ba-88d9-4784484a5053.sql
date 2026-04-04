
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
