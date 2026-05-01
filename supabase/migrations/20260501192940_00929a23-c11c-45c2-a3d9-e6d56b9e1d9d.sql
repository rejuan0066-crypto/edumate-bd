-- Allow 'reply' as a valid complaint update type for complainant follow-ups
ALTER TABLE public.complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_update_type_check;
ALTER TABLE public.complaint_updates ADD CONSTRAINT complaint_updates_update_type_check
  CHECK (update_type IN ('created','status_change','note','assignment','resolution','reply'));

-- RPC: complainant adds a reply to their own complaint (authenticated by ticket + email match)
CREATE OR REPLACE FUNCTION public.add_complaint_reply(
  p_ticket text,
  p_email text,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_complaint_id uuid;
  v_status text;
  v_msg text;
  v_recent_count int;
BEGIN
  -- Validate inputs
  v_msg := btrim(coalesce(p_message, ''));
  IF length(v_msg) < 2 THEN
    RAISE EXCEPTION 'Message too short';
  END IF;
  IF length(v_msg) > 4000 THEN
    RAISE EXCEPTION 'Message too long (max 4000 chars)';
  END IF;

  -- Look up complaint by ticket + email
  SELECT id, status INTO v_complaint_id, v_status
  FROM public.complaints
  WHERE upper(ticket_number) = upper(btrim(p_ticket))
    AND lower(complainant_email) = lower(btrim(p_email))
    AND deleted_at IS NULL;

  IF v_complaint_id IS NULL THEN
    RAISE EXCEPTION 'Complaint not found';
  END IF;

  -- Closed/rejected complaints cannot accept new replies
  IF v_status IN ('rejected','closed') THEN
    RAISE EXCEPTION 'This complaint is closed and no longer accepts replies';
  END IF;

  -- Simple anti-spam: max 5 replies per complaint per hour
  SELECT count(*) INTO v_recent_count
  FROM public.complaint_updates
  WHERE complaint_id = v_complaint_id
    AND update_type = 'reply'
    AND created_at > now() - interval '1 hour';
  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Reply rate limit reached. Please try again later.';
  END IF;

  INSERT INTO public.complaint_updates(complaint_id, update_type, message, is_public, created_by)
  VALUES (v_complaint_id, 'reply', v_msg, true, NULL);

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.add_complaint_reply(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.add_complaint_reply(text, text, text) TO anon, authenticated;