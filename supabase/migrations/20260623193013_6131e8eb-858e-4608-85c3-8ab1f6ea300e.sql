
-- 1. SUPA_security_definer_view: replace whatsapp_public_config view with a SECURITY DEFINER function
DROP VIEW IF EXISTS public.whatsapp_public_config;

CREATE OR REPLACE FUNCTION public.get_whatsapp_public_config()
RETURNS TABLE (
  id uuid, phone_number text, welcome_message text, show_floating_button boolean,
  button_position text, button_label text, default_language text, business_hours text,
  away_message text, route_mode text, route_patterns text[], cloud_api_enabled boolean,
  phone_number_id text, business_account_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, phone_number, welcome_message, show_floating_button, button_position,
         button_label, default_language, business_hours, away_message, route_mode,
         route_patterns, false AS cloud_api_enabled, NULL::text AS phone_number_id,
         NULL::text AS business_account_id
  FROM public.whatsapp_config
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_public_config() TO anon, authenticated;

-- 2. committee_members: scope the manage policy to authenticated admins (remove public/anon binding)
DROP POLICY IF EXISTS "Admins can manage committee members" ON public.committee_members;
CREATE POLICY "Admins can manage committee members" ON public.committee_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. donors: remove blanket staff/teacher ALL access, replace with permission-gated writes
DROP POLICY IF EXISTS "Staff can manage donors" ON public.donors;
CREATE POLICY "Permission-gated donor insert" ON public.donors
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'add'::text)
  );
CREATE POLICY "Permission-gated donor update" ON public.donors
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'edit'::text)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'edit'::text)
  );
CREATE POLICY "Permission-gated donor delete" ON public.donors
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/donors'::text, 'delete'::text)
  );

-- 4. exam_session_students: restrict SELECT to authenticated; add public RPC for result lookup
DROP POLICY IF EXISTS "Public can view published exam_session_students" ON public.exam_session_students;
CREATE POLICY "Authenticated can view published exam_session_students" ON public.exam_session_students
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM exam_sessions es
      WHERE es.id = exam_session_students.exam_session_id AND es.is_published = true
    ))
    OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE OR REPLACE FUNCTION public.public_find_exam_student(p_session_id uuid, p_roll text)
RETURNS TABLE(student_id uuid, class_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ess.student_id, ess.class_id
  FROM exam_session_students ess
  JOIN exam_sessions es ON es.id = ess.exam_session_id AND es.is_published = true
  JOIN students s ON s.id = ess.student_id
  WHERE ess.exam_session_id = p_session_id
    AND (
      s.roll_number = btrim(p_roll)
      OR s.student_id = btrim(p_roll)
      OR s.registration_no = btrim(p_roll)
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.public_find_exam_student(uuid, text) TO anon, authenticated;

-- 5. manual_payment_methods: limit public read to active rows only
DROP POLICY IF EXISTS "Anyone can view active manual payment methods" ON public.manual_payment_methods;
CREATE POLICY "Anyone can view active manual payment methods" ON public.manual_payment_methods
  FOR SELECT USING (is_active = true);

-- 6. otp_config: restrict table read to admins; expose safe flags via RPC
DROP POLICY IF EXISTS "Anyone can read otp config" ON public.otp_config;
CREATE POLICY "Admins can read otp config" ON public.otp_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_otp_requirements()
RETURNS TABLE (
  is_enabled boolean, require_for_login boolean, require_for_password_reset boolean,
  require_for_email_change boolean, require_for_password_change boolean, role_overrides jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_enabled, require_for_login, require_for_password_reset,
         require_for_email_change, require_for_password_change, role_overrides
  FROM public.otp_config
  WHERE id = 1
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_otp_requirements() TO anon, authenticated;
