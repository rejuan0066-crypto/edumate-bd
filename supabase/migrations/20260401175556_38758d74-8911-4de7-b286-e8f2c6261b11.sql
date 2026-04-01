
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
