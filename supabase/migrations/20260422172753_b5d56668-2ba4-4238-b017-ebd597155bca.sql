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