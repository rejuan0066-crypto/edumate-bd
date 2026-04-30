-- 1. Add can_approve columns
ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_view boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_approve boolean NOT NULL DEFAULT false;

-- 2. Helper: get caller role (security definer to bypass RLS on user_roles)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 3. Central permission helper
-- Logic:
--   * If user is super_admin or admin → always true
--   * If user has ANY user_permissions row → ONLY those count (no role fallback)
--       - Look up specific menu_path; missing row = false
--   * Else → check role_permissions
CREATE OR REPLACE FUNCTION public.has_menu_permission(
  _user_id uuid,
  _menu_path text,
  _action text  -- 'view' | 'add' | 'edit' | 'delete' | 'approve'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_has_user_overrides boolean;
  v_perm record;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Admin / super_admin bypass
  IF public.has_role(_user_id, 'admin'::app_role)
     OR public.has_role(_user_id, 'super_admin'::app_role) THEN
    RETURN true;
  END IF;

  -- Check user_permissions overrides first
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions WHERE user_id = _user_id
  ) INTO v_has_user_overrides;

  IF v_has_user_overrides THEN
    SELECT can_view, can_add, can_edit, can_delete, can_approve
      INTO v_perm
    FROM public.user_permissions
    WHERE user_id = _user_id AND menu_path = _menu_path
    LIMIT 1;

    IF NOT FOUND THEN RETURN false; END IF;

    RETURN CASE _action
      WHEN 'view'    THEN v_perm.can_view
      WHEN 'add'     THEN v_perm.can_add
      WHEN 'edit'    THEN v_perm.can_edit
      WHEN 'delete'  THEN v_perm.can_delete
      WHEN 'approve' THEN v_perm.can_approve
      ELSE false
    END;
  END IF;

  -- Fallback to role_permissions
  v_role := public.get_user_role(_user_id);
  IF v_role IS NULL THEN RETURN false; END IF;

  SELECT can_view, can_add, can_edit, can_delete, can_approve
    INTO v_perm
  FROM public.role_permissions
  WHERE role = v_role AND menu_path = _menu_path
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  RETURN CASE _action
    WHEN 'view'    THEN v_perm.can_view
    WHEN 'add'     THEN v_perm.can_add
    WHEN 'edit'    THEN v_perm.can_edit
    WHEN 'delete'  THEN v_perm.can_delete
    WHEN 'approve' THEN v_perm.can_approve
    ELSE false
  END;
END;
$$;

-- =================================================================
-- 4. Tighten RLS on key sensitive tables
-- =================================================================

-- ---- STUDENTS ----
DROP POLICY IF EXISTS "Staff can manage students" ON public.students;
CREATE POLICY "Staff can view students with permission"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/students', 'view')
  );

CREATE POLICY "Staff can add students with permission"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/students', 'add')
  );

CREATE POLICY "Staff can edit students with permission"
  ON public.students FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/students', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/students', 'edit'));

CREATE POLICY "Staff can delete students with permission"
  ON public.students FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/students', 'delete'));

-- ---- STAFF ----
DROP POLICY IF EXISTS "Staff can manage staff" ON public.staff;
CREATE POLICY "Staff can add staff with permission"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/staff', 'add')
  );

CREATE POLICY "Staff can edit staff with permission"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/staff', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/staff', 'edit'));

CREATE POLICY "Staff can delete staff with permission"
  ON public.staff FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/staff', 'delete'));

-- ---- FEE_PAYMENTS ----
DROP POLICY IF EXISTS "Staff can manage fee_payments" ON public.fee_payments;
CREATE POLICY "Staff can add fee_payments with permission"
  ON public.fee_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'add')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'add')
  );

CREATE POLICY "Staff can edit fee_payments with permission"
  ON public.fee_payments FOR UPDATE
  TO authenticated
  USING (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'edit')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'edit')
  )
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'edit')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'edit')
  );

CREATE POLICY "Staff can delete fee_payments with permission"
  ON public.fee_payments FOR DELETE
  TO authenticated
  USING (
    public.has_menu_permission(auth.uid(), '/admin/fees', 'delete')
    OR public.has_menu_permission(auth.uid(), '/admin/fee-collection', 'delete')
  );

-- ---- SALARY_RECORDS ----
DROP POLICY IF EXISTS "Staff can manage salary_records" ON public.salary_records;
CREATE POLICY "Staff can add salary_records with permission"
  ON public.salary_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_menu_permission(auth.uid(), '/admin/salary', 'add')
  );

CREATE POLICY "Staff can edit salary_records with permission"
  ON public.salary_records FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/salary', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/salary', 'edit'));

CREATE POLICY "Staff can delete salary_records with permission"
  ON public.salary_records FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/salary', 'delete'));

-- ---- NOTICES (allow public SELECT, restrict writes) ----
-- Drop overly broad write policies if they exist
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='public' AND tablename='notices'
       AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notices', p.policyname);
  END LOOP;
END$$;

CREATE POLICY "Staff can add notices with permission"
  ON public.notices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/notices', 'add'));

CREATE POLICY "Staff can edit notices with permission"
  ON public.notices FOR UPDATE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/notices', 'edit'))
  WITH CHECK (public.has_menu_permission(auth.uid(), '/admin/notices', 'edit'));

CREATE POLICY "Staff can delete notices with permission"
  ON public.notices FOR DELETE
  TO authenticated
  USING (public.has_menu_permission(auth.uid(), '/admin/notices', 'delete'));