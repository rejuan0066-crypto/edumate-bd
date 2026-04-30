CREATE OR REPLACE FUNCTION public.audit_admin_entity_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_record_id TEXT;
  v_user_id UUID;
  v_email TEXT;
  v_changed_keys TEXT[] := ARRAY[]::TEXT[];
  v_diff JSONB := '{}'::jsonb;
  v_label TEXT;
  v_desc TEXT;
  k TEXT;
BEGIN
  BEGIN v_user_id := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
    v_action := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'SOFT_DELETE';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      v_action := 'RESTORE';
    ELSE
      v_action := 'UPDATE';
    END IF;

    -- Compute changed-field diff (old/new pairs) ignoring noise columns
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k IN ('updated_at','created_at') THEN CONTINUE; END IF;
      IF v_old->k IS DISTINCT FROM v_new->k THEN
        v_changed_keys := array_append(v_changed_keys, k);
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;

    -- If only timestamps changed, skip logging
    IF array_length(v_changed_keys, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := OLD.id::TEXT;
    v_action := 'DELETE';
  END IF;

  -- Friendly label
  IF TG_TABLE_NAME = 'administrative_departments' THEN
    v_label := COALESCE(
      CASE WHEN TG_OP='DELETE' THEN OLD.name_bn ELSE NEW.name_bn END,
      CASE WHEN TG_OP='DELETE' THEN OLD.name ELSE NEW.name END,
      v_record_id
    );
    v_desc := 'বিভাগ "' || v_label || '" — ' || v_action;
  ELSIF TG_TABLE_NAME = 'administrative_officers' THEN
    v_label := COALESCE(
      CASE WHEN TG_OP='DELETE' THEN OLD.name_bn ELSE NEW.name_bn END,
      CASE WHEN TG_OP='DELETE' THEN OLD.name_en ELSE NEW.name_en END,
      v_record_id
    );
    v_desc := 'প্রশাসনিক কর্মকর্তা "' || v_label || '" — ' || v_action;
  ELSE
    v_desc := TG_TABLE_NAME || ' — ' || v_action;
  END IF;

  IF TG_OP = 'UPDATE' AND array_length(v_changed_keys, 1) > 0 THEN
    v_desc := v_desc || ' (পরিবর্তিত: ' || array_to_string(v_changed_keys, ', ') || ')';
  END IF;

  INSERT INTO public.system_logs (
    user_id, action, table_name, record_id, old_data, new_data, description
  ) VALUES (
    v_user_id, v_action, TG_TABLE_NAME, v_record_id,
    v_old,
    CASE WHEN TG_OP = 'UPDATE' THEN v_diff ELSE v_new END,
    COALESCE(v_email, '') || CASE WHEN v_email IS NOT NULL THEN ' • ' ELSE '' END || v_desc
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_administrative_departments ON public.administrative_departments;
CREATE TRIGGER trg_audit_administrative_departments
  AFTER INSERT OR UPDATE OR DELETE ON public.administrative_departments
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_entity_changes();

DROP TRIGGER IF EXISTS trg_audit_administrative_officers ON public.administrative_officers;
CREATE TRIGGER trg_audit_administrative_officers
  AFTER INSERT OR UPDATE OR DELETE ON public.administrative_officers
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_entity_changes();