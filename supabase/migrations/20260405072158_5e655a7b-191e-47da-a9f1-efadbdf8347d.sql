
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
