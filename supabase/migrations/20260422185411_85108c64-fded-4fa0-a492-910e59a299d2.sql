
CREATE TABLE IF NOT EXISTS public.parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id UUID REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'parent' CHECK (sender_type IN ('parent', 'admin', 'staff')),
  sender_name TEXT,
  parent_thread_id UUID REFERENCES public.parent_messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_messages_account ON public.parent_messages(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_thread ON public.parent_messages(parent_thread_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_created ON public.parent_messages(created_at DESC);

ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit parent messages"
  ON public.parent_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view parent messages by account"
  ON public.parent_messages FOR SELECT
  USING (true);

CREATE POLICY "Admin and staff can manage parent messages"
  ON public.parent_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER update_parent_messages_updated_at
  BEFORE UPDATE ON public.parent_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins when parent sends a message
CREATE OR REPLACE FUNCTION public.notify_on_parent_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender_type = 'parent' THEN
    INSERT INTO public.notifications (title, title_bn, message, message_bn, type, category, link)
    VALUES (
      'New Parent Message: ' || NEW.subject,
      'নতুন অভিভাবক বার্তা: ' || NEW.subject,
      'From: ' || COALESCE(NEW.sender_name, 'Parent'),
      'প্রেরক: ' || COALESCE(NEW.sender_name, 'অভিভাবক'),
      'info',
      'message',
      '/admin/parent-approvals'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_parent_message
  AFTER INSERT ON public.parent_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_parent_message();
