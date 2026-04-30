
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id TEXT PRIMARY KEY,
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encryption_keys_super_admin_only"
ON public.encryption_keys FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.encryption_keys (id, key_value)
VALUES ('master_v1', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_key TEXT;
BEGIN
  SELECT key_value INTO v_key FROM public.encryption_keys WHERE id = 'master_v1';
  IF v_key IS NULL THEN RAISE EXCEPTION 'ENCRYPTION_KEY_MISSING'; END IF;
  RETURN v_key;
END; $$;

-- Use extensions schema for pgcrypto functions to avoid resolution issues
CREATE OR REPLACE FUNCTION public.encrypt_value(p_plain TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_key TEXT;
BEGIN
  IF p_plain IS NULL OR p_plain = '' THEN RETURN NULL; END IF;
  v_key := public.get_encryption_key();
  RETURN encode(pgp_sym_encrypt(p_plain::text, v_key::text)::bytea, 'base64');
END; $$;

CREATE OR REPLACE FUNCTION public.decrypt_value(p_cipher TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_key TEXT;
BEGIN
  IF p_cipher IS NULL OR p_cipher = '' THEN RETURN NULL; END IF;
  v_key := public.get_encryption_key();
  BEGIN
    RETURN pgp_sym_decrypt(decode(p_cipher, 'base64')::bytea, v_key::text);
  EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
END; $$;

CREATE OR REPLACE FUNCTION public.encrypt_numeric(p_value NUMERIC)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.encrypt_value(p_value::TEXT);
$$;

CREATE OR REPLACE FUNCTION public.decrypt_numeric(p_cipher TEXT)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULLIF(public.decrypt_value(p_cipher), '')::NUMERIC;
$$;

-- Shadow columns
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_encrypted TEXT;
ALTER TABLE public.administrative_officers ADD COLUMN IF NOT EXISTS salary_encrypted TEXT;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS net_salary_encrypted TEXT;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS base_salary_encrypted TEXT;

CREATE OR REPLACE FUNCTION public.sync_encrypted_salary()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'staff' THEN
    NEW.salary_encrypted := public.encrypt_numeric(NEW.salary);
  ELSIF TG_TABLE_NAME = 'administrative_officers' THEN
    NEW.salary_encrypted := public.encrypt_numeric(NEW.salary);
  ELSIF TG_TABLE_NAME = 'salary_records' THEN
    NEW.net_salary_encrypted := public.encrypt_numeric(NEW.net_salary);
    NEW.base_salary_encrypted := public.encrypt_numeric(NEW.base_salary);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_enc_staff_salary ON public.staff;
CREATE TRIGGER trg_sync_enc_staff_salary BEFORE INSERT OR UPDATE OF salary ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.sync_encrypted_salary();

DROP TRIGGER IF EXISTS trg_sync_enc_admin_salary ON public.administrative_officers;
CREATE TRIGGER trg_sync_enc_admin_salary BEFORE INSERT OR UPDATE OF salary ON public.administrative_officers
FOR EACH ROW EXECUTE FUNCTION public.sync_encrypted_salary();

DROP TRIGGER IF EXISTS trg_sync_enc_salary_records ON public.salary_records;
CREATE TRIGGER trg_sync_enc_salary_records BEFORE INSERT OR UPDATE OF net_salary, base_salary ON public.salary_records
FOR EACH ROW EXECUTE FUNCTION public.sync_encrypted_salary();

UPDATE public.staff SET salary_encrypted = public.encrypt_numeric(salary)
WHERE salary IS NOT NULL AND salary_encrypted IS NULL;

UPDATE public.administrative_officers SET salary_encrypted = public.encrypt_numeric(salary)
WHERE salary IS NOT NULL AND salary_encrypted IS NULL;

UPDATE public.salary_records SET 
  net_salary_encrypted = public.encrypt_numeric(net_salary),
  base_salary_encrypted = public.encrypt_numeric(base_salary)
WHERE (net_salary IS NOT NULL OR base_salary IS NOT NULL) AND net_salary_encrypted IS NULL;

-- ============ AUDIT ============
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE OR REPLACE FUNCTION public.get_request_ip()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v TEXT;
BEGIN
  BEGIN
    v := current_setting('request.headers', true);
    IF v IS NOT NULL THEN
      v := (v::jsonb ->> 'x-forwarded-for');
      IF v IS NOT NULL THEN RETURN split_part(v, ',', 1); END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.get_request_ua()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v TEXT;
BEGIN
  BEGIN
    v := current_setting('request.headers', true);
    IF v IS NOT NULL THEN RETURN (v::jsonb ->> 'user-agent'); END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_sensitive_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID; v_email TEXT;
  v_old JSONB; v_new JSONB;
  v_diff JSONB := '{}'::jsonb;
  v_changed TEXT[] := ARRAY[]::TEXT[];
  v_record_id TEXT; v_action TEXT; k TEXT;
BEGIN
  BEGIN v_user := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user := NULL; END;
  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    v_record_id := NEW.id::TEXT;
    IF (v_old ? 'deleted_at') AND (v_new ? 'deleted_at') THEN
      IF v_old->>'deleted_at' IS NULL AND v_new->>'deleted_at' IS NOT NULL THEN
        v_action := 'SOFT_DELETE';
      ELSIF v_old->>'deleted_at' IS NOT NULL AND v_new->>'deleted_at' IS NULL THEN
        v_action := 'RESTORE';
      ELSE v_action := 'UPDATE'; END IF;
    ELSE v_action := 'UPDATE'; END IF;

    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k IN ('updated_at','created_at') THEN CONTINUE; END IF;
      IF k LIKE '%_encrypted' THEN CONTINUE; END IF;
      IF v_old->k IS DISTINCT FROM v_new->k THEN
        v_changed := array_append(v_changed, k);
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;
    IF array_length(v_changed, 1) IS NULL THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_record_id := OLD.id::TEXT; v_action := 'DELETE';
  END IF;

  INSERT INTO public.system_logs (
    user_id, action, table_name, record_id, old_data, new_data,
    ip_address, user_agent, description
  ) VALUES (
    v_user, v_action, TG_TABLE_NAME, v_record_id,
    v_old,
    CASE WHEN TG_OP='UPDATE' THEN v_diff ELSE NULL END,
    public.get_request_ip(), public.get_request_ua(),
    COALESCE(v_email,'') || ' • ' || TG_TABLE_NAME || ' ' || v_action ||
      CASE WHEN array_length(v_changed,1) > 0 
           THEN ' (changed: ' || array_to_string(v_changed, ', ') || ')'
           ELSE '' END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DO $$
DECLARE
  t TEXT;
  sensitive_tables TEXT[] := ARRAY[
    'students','staff','administrative_officers','salary_records',
    'fee_payments','user_roles','user_permissions','role_permissions',
    'profiles','results','exam_results','admissions',
    'parent_accounts','custom_roles','encryption_keys'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_sensitive_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_sensitive_%I AFTER UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ============ BACKUP ============
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'in_progress',
  storage_path TEXT,
  file_size_bytes BIGINT,
  table_count INTEGER,
  row_count BIGINT,
  error_message TEXT,
  triggered_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_history_admin_read"
ON public.backup_history FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "backup_history_super_admin_write"
ON public.backup_history FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "backup_history_super_admin_update"
ON public.backup_history FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('db-backups', 'db-backups', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "db_backups_super_admin_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'db-backups' AND public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "db_backups_super_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'db-backups' AND public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "db_backups_super_admin_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'db-backups' AND public.has_role(auth.uid(), 'super_admin'::app_role));
