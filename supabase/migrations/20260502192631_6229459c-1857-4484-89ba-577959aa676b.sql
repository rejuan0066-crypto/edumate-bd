-- 1. parent_accounts
DROP POLICY IF EXISTS "Public can read parent accounts" ON public.parent_accounts;
CREATE POLICY "Admins can read parent accounts"
  ON public.parent_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2. otp_codes
DROP POLICY IF EXISTS "Anyone can select own otp by email" ON public.otp_codes;

-- 3. donors
DROP POLICY IF EXISTS "Anyone can view donors" ON public.donors;
CREATE POLICY "Authorized roles can view donors"
  ON public.donors FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/donors'::text, 'view'::text)
  );

-- 4. smtp_config
DROP POLICY IF EXISTS "Anyone can view smtp_config" ON public.smtp_config;
DROP POLICY IF EXISTS "Authenticated users can view smtp_config" ON public.smtp_config;
CREATE POLICY "Admins only can view smtp_config"
  ON public.smtp_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 5. emailjs_config
DROP POLICY IF EXISTS "Anyone can view emailjs_config" ON public.emailjs_config;
CREATE POLICY "Admins only can view emailjs_config"
  ON public.emailjs_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_emailjs_public_key()
RETURNS TABLE(service_id text, template_id text, public_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT service_id, template_id, public_key
  FROM public.emailjs_config
  ORDER BY created_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_emailjs_public_key() TO anon, authenticated;

-- 6. staff
DROP POLICY IF EXISTS "Anyone can view staff" ON public.staff;

CREATE OR REPLACE FUNCTION public.list_staff_directory()
RETURNS TABLE(
  id uuid, name_bn text, name_en text, designation text,
  photo_url text, staff_category text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name_bn, name_en, designation, photo_url, staff_category
  FROM public.staff
  WHERE COALESCE(status, 'active') = 'active' AND deleted_at IS NULL
  ORDER BY name_bn NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.list_staff_directory() TO anon, authenticated;

-- 7. students
DROP POLICY IF EXISTS "Public can view minimal student info" ON public.students;
DROP POLICY IF EXISTS "Public can view student basic info" ON public.students;

CREATE OR REPLACE FUNCTION public.lookup_student_for_fee(
  p_reg_no text, p_dob text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, name_bn text, name_en text, student_id text,
  roll_number text, registration_no text, class_id uuid,
  session_id uuid, division_id uuid, photo_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name_bn, name_en, student_id, roll_number, registration_no,
         class_id, session_id, division_id, photo_url
  FROM public.students
  WHERE deleted_at IS NULL
    AND COALESCE(status, 'active') = 'active'
    AND (registration_no = p_reg_no OR student_id = p_reg_no OR birth_reg_no = p_reg_no)
    AND (p_dob IS NULL OR p_dob = '' OR date_of_birth::text = p_dob)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_student_for_fee(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_student_admission(p_reg_no text)
RETURNS TABLE(
  id uuid, roll_number text, registration_no text,
  admission_session text, student_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, roll_number, registration_no, admission_session, student_id
  FROM public.students
  WHERE deleted_at IS NULL AND birth_reg_no = p_reg_no
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_student_admission(text) TO anon, authenticated;

-- 8. payments / fee_payments
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view fee_payments" ON public.fee_payments;

-- 9. salary_savings
DROP POLICY IF EXISTS "Authenticated users can view salary_savings" ON public.salary_savings;
DROP POLICY IF EXISTS "Authenticated users can view salary_savings_ledger" ON public.salary_savings_ledger;

CREATE POLICY "Admins or self can view salary_savings"
  ON public.salary_savings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/salary'::text, 'view'::text)
    OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins or self can view salary_savings_ledger"
  ON public.salary_savings_ledger FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/salary'::text, 'view'::text)
    OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

-- 10. attendance_records
DROP POLICY IF EXISTS "Anyone can view attendance_records" ON public.attendance_records;
CREATE POLICY "Authorized roles can view attendance_records"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/attendance'::text, 'view'::text)
    OR public.has_menu_permission(auth.uid(), '/admin/staff-attendance'::text, 'view'::text)
    OR (entity_type = 'staff' AND entity_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()))
  );

-- 11. hostel_allocations
DROP POLICY IF EXISTS "Public read allocations" ON public.hostel_allocations;
CREATE POLICY "Authorized roles can view hostel_allocations"
  ON public.hostel_allocations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_menu_permission(auth.uid(), '/admin/hostel'::text, 'view'::text)
  );

-- 12. meeting_provider_settings
DROP POLICY IF EXISTS "Anyone can view meeting provider settings" ON public.meeting_provider_settings;
CREATE POLICY "Authenticated users can view meeting provider settings"
  ON public.meeting_provider_settings FOR SELECT TO authenticated USING (true);

-- 13. committee_members
DROP POLICY IF EXISTS "Public can view committee members" ON public.committee_members;
CREATE POLICY "Authenticated users can view committee members"
  ON public.committee_members FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.list_committee_members_public(p_committee_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, committee_id uuid, name text, name_en text,
  designation text, designation_en text, photo_url text, sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, committee_id, name, name_en, designation, designation_en, photo_url, sort_order
  FROM public.committee_members
  WHERE deleted_at IS NULL
    AND (p_committee_id IS NULL OR committee_id = p_committee_id)
  ORDER BY sort_order NULLS LAST, name;
$$;
GRANT EXECUTE ON FUNCTION public.list_committee_members_public(uuid) TO anon, authenticated;

-- 14. online_exam_attempts/answers
DROP POLICY IF EXISTS "Anyone can view exam attempts" ON public.online_exam_attempts;
DROP POLICY IF EXISTS "Anyone can view exam answers" ON public.online_exam_answers;

CREATE POLICY "Owner or admin can view exam attempts"
  ON public.online_exam_attempts FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "Owner or admin can view exam answers"
  ON public.online_exam_answers FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  );

-- 15. website-assets storage bucket
DROP POLICY IF EXISTS "Authenticated upload website assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update website assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete website assets" ON storage.objects;

CREATE POLICY "Admins can upload website assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'website-assets'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Admins can update website assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'website-assets'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Admins can delete website assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'website-assets'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

-- 16. global timezone default (value is JSON)
INSERT INTO public.app_settings (key, value, description)
VALUES ('app_timezone', to_jsonb('Asia/Dhaka'::text), 'Default global timezone for the app')
ON CONFLICT (key) DO NOTHING;

-- 17. Fix function search_path mutable warnings
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.schema, r.name, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
