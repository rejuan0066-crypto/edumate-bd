
-- Server-side guarded undo RPC for committee audit log
CREATE OR REPLACE FUNCTION public.undo_committee_change(
  p_audit_id uuid,
  p_expected_is_active boolean DEFAULT NULL,
  p_expected_deleted boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.committee_audit_log%ROWTYPE;
  v_member public.committee_members%ROWTYPE;
  v_current_is_active boolean;
  v_current_deleted boolean;
BEGIN
  SELECT * INTO v_entry FROM public.committee_audit_log WHERE id = p_audit_id;
  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'AUDIT_NOT_FOUND';
  END IF;
  IF v_entry.member_id IS NULL THEN
    RAISE EXCEPTION 'NO_MEMBER_REF';
  END IF;

  SELECT * INTO v_member FROM public.committee_members WHERE id = v_entry.member_id;
  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  v_current_is_active := v_member.is_active;
  v_current_deleted := v_member.deleted_at IS NOT NULL;

  -- State-match guard: ensure current state still matches what the client expected
  IF p_expected_is_active IS NOT NULL AND p_expected_is_active <> v_current_is_active THEN
    RAISE EXCEPTION 'STATE_MISMATCH: is_active changed (expected % got %)', p_expected_is_active, v_current_is_active;
  END IF;
  IF p_expected_deleted IS NOT NULL AND p_expected_deleted <> v_current_deleted THEN
    RAISE EXCEPTION 'STATE_MISMATCH: deleted changed (expected % got %)', p_expected_deleted, v_current_deleted;
  END IF;

  -- Reverse the action
  IF v_entry.action = 'added' THEN
    UPDATE public.committee_members SET deleted_at = now() WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'removed' THEN
    UPDATE public.committee_members SET deleted_at = NULL, is_active = true WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'deactivated' THEN
    UPDATE public.committee_members SET is_active = true WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'reactivated' THEN
    UPDATE public.committee_members SET is_active = false WHERE id = v_entry.member_id;
  ELSIF v_entry.action = 'updated' AND v_entry.details IS NOT NULL THEN
    UPDATE public.committee_members
    SET designation = COALESCE(v_entry.details->>'old_designation', designation),
        staff_id = NULLIF(v_entry.details->>'old_staff_id','')::uuid
    WHERE id = v_entry.member_id;
  ELSE
    RAISE EXCEPTION 'NOT_UNDOABLE: %', v_entry.action;
  END IF;

  RETURN jsonb_build_object('ok', true, 'action_reversed', v_entry.action, 'member_id', v_entry.member_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_committee_change(uuid, boolean, boolean) TO authenticated;
