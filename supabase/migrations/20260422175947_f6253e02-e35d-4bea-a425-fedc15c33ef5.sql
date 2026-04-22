
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT UNIQUE,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  complainant_name TEXT,
  complainant_phone TEXT,
  complainant_email TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  related_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  attachments JSONB DEFAULT '[]'::jsonb,
  ip_address TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit complaints"
ON public.complaints FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all complaints"
ON public.complaints FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update complaints"
ON public.complaints FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete complaints"
ON public.complaints FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_complaints_status ON public.complaints(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_complaints_category ON public.complaints(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at DESC);

CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION public.generate_complaint_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year INTEGER;
  v_count INTEGER;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
    SELECT COUNT(*) + 1 INTO v_count FROM public.complaints
    WHERE EXTRACT(YEAR FROM created_at) = v_year;
    NEW.ticket_number := 'CMP-' || v_year::TEXT || '-' || lpad(v_count::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_complaint_ticket_number
BEFORE INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.generate_complaint_ticket();

-- Notification on new complaint
CREATE OR REPLACE FUNCTION public.notify_on_complaint()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
  VALUES (
    'New Complaint: ' || NEW.subject,
    'নতুন অভিযোগ: ' || NEW.subject,
    'Ticket: ' || NEW.ticket_number || ' (' || NEW.priority || ')',
    'টিকিট: ' || NEW.ticket_number,
    CASE WHEN NEW.priority = 'urgent' THEN 'warning' ELSE 'info' END,
    'complaint',
    '/admin/complaints'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_new_complaint
AFTER INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.notify_on_complaint();
