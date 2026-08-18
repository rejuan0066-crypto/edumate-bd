-- Clear father_name and mother_name for all active students
UPDATE public.students
SET father_name = NULL,
    mother_name = NULL
WHERE deleted_at IS NULL;

-- GRANTs are already in place for public.students from previous migrations, 
-- but ensuring we don't break permissions if someone re-runs.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
