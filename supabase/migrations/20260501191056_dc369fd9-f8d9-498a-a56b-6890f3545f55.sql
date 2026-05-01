-- Timeline / updates table
CREATE TABLE IF NOT EXISTS public.complaint_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  update_type text NOT NULL CHECK (update_type IN ('created','status_change','note','assignment','resolution')),
  from_status text,
  to_status text,
  message text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint ON public.complaint_updates(complaint_id, created_at DESC);

ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view complaint updates"
  ON public.complaint_updates FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert complaint updates"
  ON public.complaint_updates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins update complaint updates"
  ON public.complaint_updates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete complaint updates"
  ON public.complaint_updates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.complaints_log_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_updates(complaint_id, update_type, to_status, message, is_public)
    VALUES (NEW.id, 'created', NEW.status, 'Complaint submitted', true);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.complaint_updates(complaint_id, update_type, from_status, to_status, is_public, created_by)
      VALUES (NEW.id, 'status_change', OLD.status, NEW.status, true, auth.uid());
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.complaint_updates(complaint_id, update_type, message, is_public, created_by)
      VALUES (NEW.id, 'assignment', 'Complaint assigned for review', true, auth.uid());
    END IF;
    IF NEW.resolution_notes IS DISTINCT FROM OLD.resolution_notes AND NEW.resolution_notes IS NOT NULL THEN
      INSERT INTO public.complaint_updates(complaint_id, update_type, message, is_public, created_by)
      VALUES (NEW.id, 'resolution', NEW.resolution_notes, true, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_log_update ON public.complaints;
CREATE TRIGGER trg_complaints_log_update
AFTER INSERT OR UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.complaints_log_update();

INSERT INTO public.complaint_updates(complaint_id, update_type, to_status, message, is_public, created_at)
SELECT c.id, 'created', c.status, 'Complaint submitted', true, c.created_at
FROM public.complaints c
LEFT JOIN public.complaint_updates u
  ON u.complaint_id = c.id AND u.update_type = 'created'
WHERE u.id IS NULL;

CREATE OR REPLACE FUNCTION public.get_complaint_by_ticket(p_ticket text, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_complaint public.complaints%ROWTYPE;
  v_updates jsonb;
BEGIN
  IF p_ticket IS NULL OR p_email IS NULL OR length(trim(p_ticket)) = 0 OR length(trim(p_email)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_complaint
  FROM public.complaints
  WHERE upper(ticket_number) = upper(trim(p_ticket))
    AND lower(complainant_email) = lower(trim(p_email))
    AND deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'update_type', update_type,
    'from_status', from_status,
    'to_status', to_status,
    'message', message,
    'created_at', created_at
  ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_updates
  FROM public.complaint_updates
  WHERE complaint_id = v_complaint.id AND is_public = true;

  RETURN jsonb_build_object(
    'id', v_complaint.id,
    'ticket_number', v_complaint.ticket_number,
    'subject', v_complaint.subject,
    'category', v_complaint.category,
    'priority', v_complaint.priority,
    'status', v_complaint.status,
    'description', v_complaint.description,
    'complainant_name', v_complaint.complainant_name,
    'created_at', v_complaint.created_at,
    'updated_at', v_complaint.updated_at,
    'resolved_at', v_complaint.resolved_at,
    'resolution_notes', v_complaint.resolution_notes,
    'updates', v_updates
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_complaint_by_ticket(text, text) TO anon, authenticated;