-- Staff letters: only staff managers or the letter's own staff member may access.
CREATE OR REPLACE FUNCTION public.can_access_storage_object(_user_id uuid, _bucket text, _object_path text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_seg TEXT;
BEGIN
  IF _object_path IS NULL THEN RETURN false; END IF;

  -- Photos bucket: all users can view photos (profiles, staff, student photos, general)
  IF _bucket = 'photos' THEN
    RETURN true;
  END IF;

  IF _user_id IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'super_admin') OR public.has_role(_user_id,'admin') THEN
    RETURN true;
  END IF;
  v_first_seg := split_part(_object_path, '/', 1);

  IF _bucket = 'chat-attachments' THEN
    BEGIN
      RETURN public.is_conversation_participant(v_first_seg::uuid, _user_id);
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  IF _bucket = 'receipts' THEN
    IF public.is_accounts_staff(_user_id) THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.parent_accounts pa
      WHERE pa.user_id = _user_id AND pa.status IN ('approved','active')
        AND pa.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = _user_id AND s.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'staff-letters' THEN
    IF public.has_menu_permission(_user_id, '/admin/staff', 'view') THEN RETURN true; END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.staff st
      WHERE st.user_id = _user_id
        AND (regexp_replace(COALESCE(st.staff_id, ''), '[^a-zA-Z0-9_-]', '_', 'g') = v_first_seg
             OR st.id::text = v_first_seg)
    );
  END IF;

  IF _bucket = 'committee-attachments' THEN
    RETURN public.has_role(_user_id,'staff') OR public.has_role(_user_id,'teacher') OR public.has_role(_user_id,'administrative') OR public.has_menu_permission(_user_id, '/admin/committees', 'view');
  END IF;

  RETURN false;
END;
$function$;
