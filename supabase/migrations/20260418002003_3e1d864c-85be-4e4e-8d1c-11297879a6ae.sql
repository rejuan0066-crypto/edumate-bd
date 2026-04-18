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