CREATE OR REPLACE FUNCTION public.is_staff_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('meeting_provider_settings','Authenticated users can view meeting provider settings'),
    ('scholarship_awards','Authenticated users can view scholarship awards'),
    ('scholarships','Authenticated users can view scholarships'),
    ('promotion_history','Authenticated users can view promotion history'),
    ('salary_workflow_settings','Anyone authenticated can view workflow settings'),
    ('salary_pdf_columns','Authenticated can read salary pdf columns'),
    ('expense_institutions','Authenticated users can view expense_institutions'),
    ('expense_categories','Anyone can view expense_categories'),
    ('inventory_items','Authenticated can view inventory'),
    ('inventory_logs','Authenticated can view inventory logs'),
    ('duty_shifts','duty_shifts_select_auth'),
    ('syllabus_coverage','Staff can view syllabus_coverage'),
    ('id_format_config','id_format_config_read'),
    ('whatsapp_templates','Anyone authenticated can view templates'),
    ('staff_categories','Authenticated users can view staff categories')
  ) AS t(tbl, pol) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff_member(auth.uid()))', r.pol, r.tbl);
  END LOOP;
END $$;