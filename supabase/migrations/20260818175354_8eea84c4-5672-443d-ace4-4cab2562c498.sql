-- Update foreign key to CASCADE delete for question_papers
ALTER TABLE public.question_papers
DROP CONSTRAINT IF EXISTS question_papers_exam_session_id_fkey,
ADD CONSTRAINT question_papers_exam_session_id_fkey 
FOREIGN KEY (exam_session_id) 
REFERENCES public.exam_sessions(id) 
ON DELETE CASCADE;
