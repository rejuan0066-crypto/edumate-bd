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