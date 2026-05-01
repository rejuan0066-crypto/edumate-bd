
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  event_type TEXT NOT NULL,
  resource TEXT,
  bucket_id TEXT,
  object_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  http_status INT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_bucket ON public.security_logs(bucket_id);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_logs_admin_read" ON public.security_logs;
CREATE POLICY "security_logs_admin_read" ON public.security_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "security_logs_auth_insert" ON public.security_logs;
CREATE POLICY "security_logs_auth_insert" ON public.security_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.is_accounts_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = _user_id
      AND s.deleted_at IS NULL
      AND s.status = 'active'
      AND (
        lower(coalesce(s.designation,'')) LIKE '%account%'
        OR lower(coalesce(s.designation,'')) LIKE '%হিসাব%'
        OR lower(coalesce(s.department,'')) LIKE '%account%'
        OR lower(coalesce(s.department,'')) LIKE '%হিসাব%'
      )
  )
  OR public.has_menu_permission(_user_id, '/admin/fees', 'view')
  OR public.has_menu_permission(_user_id, '/admin/salary', 'view');
$$;

GRANT EXECUTE ON FUNCTION public.is_accounts_staff(UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_resource TEXT DEFAULT NULL,
  p_bucket_id TEXT DEFAULT NULL,
  p_object_path TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_status INT DEFAULT 403,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_uid UUID;
  v_email TEXT;
BEGIN
  BEGIN v_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_uid := NULL; END;
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;
  INSERT INTO public.security_logs (
    user_id, user_email, event_type, resource, bucket_id, object_path,
    ip_address, user_agent, http_status, reason, metadata
  ) VALUES (
    v_uid, v_email, p_event_type, p_resource, p_bucket_id, p_object_path,
    p_ip, p_user_agent, p_status, p_reason, COALESCE(p_metadata,'{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INT,TEXT,JSONB) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.can_access_storage_object(
  _user_id UUID, _bucket TEXT, _object_path TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_first_seg TEXT;
BEGIN
  IF _user_id IS NULL OR _object_path IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'super_admin') OR public.has_role(_user_id,'admin') THEN
    RETURN true;
  END IF;
  v_first_seg := split_part(_object_path, '/', 1);

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

  IF _bucket = 'photos' THEN
    IF v_first_seg = 'public-uploads' THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = _user_id AND s.deleted_at IS NULL
        AND s.photo_url IS NOT NULL
        AND s.photo_url LIKE '%' || _object_path || '%'
    ) THEN RETURN true; END IF;
    IF public.has_role(_user_id,'teacher') AND _object_path LIKE 'staff/%' THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'staff-letters' THEN
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'committee-attachments' THEN
    RETURN public.has_role(_user_id,'staff') OR public.has_role(_user_id,'teacher') OR public.has_role(_user_id,'administrative');
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_storage_object(UUID,TEXT,TEXT) TO authenticated, anon;

DROP POLICY IF EXISTS "receipts_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "Auth can read receipts metadata" ON storage.objects;
DROP POLICY IF EXISTS "Admins read receipts bucket" ON storage.objects;
CREATE POLICY "receipts_authorized_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.can_access_storage_object(auth.uid(), 'receipts', name)
  );

DROP POLICY IF EXISTS "photos_read_admins_staff_or_owner" ON storage.objects;
CREATE POLICY "photos_authorized_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.can_access_storage_object(auth.uid(), 'photos', name)
  );

DROP POLICY IF EXISTS "photos_anon_public_read" ON storage.objects;
CREATE POLICY "photos_anon_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'photos'
    AND split_part(name,'/',1) = 'public-uploads'
  );

UPDATE storage.buckets SET public = false WHERE id IN ('photos','receipts','staff-letters','committee-attachments');
