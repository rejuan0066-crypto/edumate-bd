
CREATE OR REPLACE FUNCTION public.notify_on_student_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
  VALUES (
    'New Student Admitted: ' || COALESCE(NEW.name_en, NEW.name_bn),
    'নতুন ছাত্র ভর্তি: ' || NEW.name_bn,
    'Roll: ' || COALESCE(NEW.roll_number, 'N/A') || ', ID: ' || NEW.student_id,
    'রোল: ' || COALESCE(NEW.roll_number, 'N/A') || ', আইডি: ' || NEW.student_id,
    'success',
    'student',
    '/admin/students'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_insert
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.notify_on_student_insert();

CREATE OR REPLACE FUNCTION public.notify_on_fee_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'Fee Payment Received: ৳' || COALESCE(NEW.paid_amount, NEW.amount),
      'ফি পরিশোধ: ৳' || COALESCE(NEW.paid_amount, NEW.amount),
      'Receipt: ' || COALESCE(NEW.receipt_number, 'N/A'),
      'রসিদ: ' || COALESCE(NEW.receipt_number, 'N/A'),
      'info',
      'fee',
      '/admin/fees'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_fee_payment
AFTER INSERT OR UPDATE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_fee_payment();

CREATE OR REPLACE FUNCTION public.notify_on_notice_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'Notice Published: ' || NEW.title,
      'নোটিশ প্রকাশিত: ' || COALESCE(NEW.title_bn, NEW.title),
      NULL, NULL,
      'info',
      'notice',
      '/admin/notices'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_notice_publish
AFTER INSERT OR UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_notice_publish();
