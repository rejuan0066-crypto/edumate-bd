
-- 1. WhatsApp Message Queue table
CREATE TABLE public.whatsapp_message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('fee_receipt', 'absence', 'result', 'notice', 'custom')),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_text TEXT NOT NULL,
  template_name TEXT,
  template_variables JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'failed', 'rejected')),
  reference_id TEXT,
  reference_table TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp queue"
ON public.whatsapp_message_queue
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wa_queue_status ON public.whatsapp_message_queue(status);
CREATE INDEX idx_wa_queue_trigger ON public.whatsapp_message_queue(trigger_type);
CREATE INDEX idx_wa_queue_created ON public.whatsapp_message_queue(created_at DESC);

CREATE TRIGGER update_wa_queue_updated_at
BEFORE UPDATE ON public.whatsapp_message_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Queue function: Fee payment → receipt message
CREATE OR REPLACE FUNCTION public.queue_whatsapp_fee_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_fee_type RECORD;
  v_msg TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    SELECT name_bn, name_en, student_id, guardian_phone, phone
    INTO v_student FROM public.students WHERE id = NEW.student_id;

    SELECT name_bn, name INTO v_fee_type FROM public.fee_types WHERE id = NEW.fee_type_id;

    IF v_student IS NOT NULL AND COALESCE(v_student.guardian_phone, v_student.phone) IS NOT NULL THEN
      v_msg := 'সম্মানিত অভিভাবক, ' || v_student.name_bn ||
               ' (আইডি: ' || v_student.student_id || ') এর ' ||
               COALESCE(v_fee_type.name_bn, v_fee_type.name) ||
               ' বাবদ ৳' || COALESCE(NEW.paid_amount, NEW.amount) ||
               ' পরিশোধ হয়েছে। রসিদ নং: ' || COALESCE(NEW.receipt_number, 'N/A') || '।';

      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'fee_receipt',
        COALESCE(v_student.guardian_phone, v_student.phone),
        v_student.name_bn,
        v_msg,
        NEW.id::TEXT,
        'fee_payments'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_fee_receipt
AFTER INSERT OR UPDATE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_fee_receipt();

-- 3. Queue function: Absence → alert
CREATE OR REPLACE FUNCTION public.queue_whatsapp_absence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_msg TEXT;
  v_date_str TEXT;
BEGIN
  IF NEW.entity_type = 'student' AND NEW.status = 'absent' THEN
    SELECT name_bn, name_en, student_id, guardian_phone, phone
    INTO v_student FROM public.students WHERE id = NEW.entity_id;

    IF v_student IS NOT NULL AND COALESCE(v_student.guardian_phone, v_student.phone) IS NOT NULL THEN
      v_date_str := to_char(NEW.attendance_date, 'DD/MM/YYYY');
      v_msg := 'সম্মানিত অভিভাবক, আপনার সন্তান ' || v_student.name_bn ||
               ' (আইডি: ' || v_student.student_id || ') তারিখ ' || v_date_str ||
               ' তে অনুপস্থিত ছিল। বিস্তারিত জানতে প্রতিষ্ঠানে যোগাযোগ করুন।';

      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'absence',
        COALESCE(v_student.guardian_phone, v_student.phone),
        v_student.name_bn,
        v_msg,
        NEW.id::TEXT,
        'attendance_records'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_absence
AFTER INSERT ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_absence();

-- 4. Queue function: Result published → message
CREATE OR REPLACE FUNCTION public.queue_whatsapp_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_exam RECORD;
  v_msg TEXT;
  r RECORD;
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    SELECT name, name_bn INTO v_exam FROM public.exam_sessions WHERE id = NEW.id;

    FOR r IN
      SELECT DISTINCT s.id, s.name_bn, s.student_id, s.guardian_phone, s.phone
      FROM public.exam_session_students ess
      JOIN public.students s ON s.id = ess.student_id
      WHERE ess.exam_session_id = NEW.id
        AND COALESCE(s.guardian_phone, s.phone) IS NOT NULL
    LOOP
      v_msg := 'সম্মানিত অভিভাবক, ' || r.name_bn ||
               ' (আইডি: ' || r.student_id || ') এর ' ||
               COALESCE(v_exam.name_bn, v_exam.name) ||
               ' এর ফলাফল প্রকাশিত হয়েছে। বিস্তারিত জানতে প্রতিষ্ঠানে যোগাযোগ করুন।';

      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'result',
        COALESCE(r.guardian_phone, r.phone),
        r.name_bn,
        v_msg,
        NEW.id::TEXT,
        'exam_sessions'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_result
AFTER UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_result();

-- 5. Queue function: Notice published → message (bulk to all students with phone)
CREATE OR REPLACE FUNCTION public.queue_whatsapp_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_msg TEXT;
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    v_msg := '📢 নোটিশ: ' || COALESCE(NEW.title_bn, NEW.title) ||
             CASE WHEN NEW.content IS NOT NULL THEN E'\n' || left(NEW.content, 200) ELSE '' END;

    FOR r IN
      SELECT DISTINCT s.id, s.name_bn, COALESCE(s.guardian_phone, s.phone) AS phone
      FROM public.students s
      WHERE s.deleted_at IS NULL
        AND COALESCE(s.guardian_phone, s.phone) IS NOT NULL
      LIMIT 500
    LOOP
      INSERT INTO public.whatsapp_message_queue (
        trigger_type, recipient_phone, recipient_name, message_text,
        reference_id, reference_table
      ) VALUES (
        'notice',
        r.phone,
        r.name_bn,
        v_msg,
        NEW.id::TEXT,
        'notices'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wa_notice
AFTER INSERT OR UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_notice();
