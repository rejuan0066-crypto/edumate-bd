
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
