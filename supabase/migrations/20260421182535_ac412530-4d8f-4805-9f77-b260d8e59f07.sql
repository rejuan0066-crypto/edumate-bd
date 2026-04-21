-- Create student_certificates table for tracking issued certificates, transfer letters, and testimonials
CREATE TABLE public.student_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('certificate', 'transfer', 'testimonial')),
  certificate_category TEXT,
  serial_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose TEXT,
  purpose_bn TEXT,
  conduct TEXT,
  conduct_bn TEXT,
  reason TEXT,
  reason_bn TEXT,
  remarks TEXT,
  remarks_bn TEXT,
  last_class_attended TEXT,
  last_class_attended_bn TEXT,
  date_of_leaving DATE,
  date_of_admission DATE,
  achievements TEXT,
  achievements_bn TEXT,
  custom_data JSONB DEFAULT '{}'::jsonb,
  issued_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

-- Admins/staff can view all
CREATE POLICY "Admins and staff can view certificates"
ON public.student_certificates
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- Admins/staff can insert
CREATE POLICY "Admins and staff can insert certificates"
ON public.student_certificates
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- Admins/staff can update
CREATE POLICY "Admins and staff can update certificates"
ON public.student_certificates
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role)
);

-- Admins can delete
CREATE POLICY "Admins can delete certificates"
ON public.student_certificates
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Indexes
CREATE INDEX idx_student_certificates_student_id ON public.student_certificates(student_id);
CREATE INDEX idx_student_certificates_type ON public.student_certificates(certificate_type);
CREATE INDEX idx_student_certificates_issue_date ON public.student_certificates(issue_date DESC);
CREATE INDEX idx_student_certificates_deleted_at ON public.student_certificates(deleted_at) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_student_certificates_updated_at
BEFORE UPDATE ON public.student_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log trigger
CREATE TRIGGER audit_student_certificates
AFTER INSERT OR UPDATE OR DELETE ON public.student_certificates
FOR EACH ROW
EXECUTE FUNCTION public.audit_log_trigger();