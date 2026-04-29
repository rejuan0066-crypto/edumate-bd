-- Create separate table for administrative officers (institution-level admin staff)
CREATE TABLE public.administrative_officers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  -- Basic identity
  name_bn text NOT NULL,
  name_en text,
  designation text,
  department text,
  phone text,
  email text,
  address text,
  photo_url text,
  -- Personal
  date_of_birth date,
  religion text DEFAULT 'islam',
  nid text,
  -- Employment & duty
  joining_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  employment_type text DEFAULT 'full_time',
  residence_type text DEFAULT 'non_residential',
  duty_start_time text DEFAULT '09:00',
  duty_end_time text DEFAULT '17:00',
  -- Background
  education text,
  experience text,
  previous_institute text,
  -- Salary / responsibility
  salary numeric DEFAULT 0,
  responsibilities text,
  office_room text,
  -- Identifier
  officer_id text UNIQUE,
  sort_order integer,
  -- Extensible JSON for any extra fields
  extra_data jsonb DEFAULT '{}'::jsonb,
  -- Soft delete
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_officers_status ON public.administrative_officers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_officers_user_id ON public.administrative_officers(user_id) WHERE deleted_at IS NULL;

ALTER TABLE public.administrative_officers ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can view active records
CREATE POLICY "Authenticated can view administrative officers"
ON public.administrative_officers FOR SELECT
TO authenticated
USING (true);

-- Insert/Update/Delete: only admin or super_admin
CREATE POLICY "Admins can insert administrative officers"
ON public.administrative_officers FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update administrative officers"
ON public.administrative_officers FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete administrative officers"
ON public.administrative_officers FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER set_admin_officers_updated_at
BEFORE UPDATE ON public.administrative_officers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log
CREATE TRIGGER audit_administrative_officers
AFTER INSERT OR UPDATE OR DELETE ON public.administrative_officers
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();