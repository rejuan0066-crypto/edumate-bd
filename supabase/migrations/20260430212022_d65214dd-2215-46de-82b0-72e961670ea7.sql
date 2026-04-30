
-- ====================================================================
-- 1) Realtime publication: remove sensitive tables
-- ====================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='salary_records') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.salary_records;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='app_settings') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.app_settings;
  END IF;
END $$;

-- ====================================================================
-- 2) RLS cleanup: budgets / scholarships / scholarship_awards
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage budgets" ON public.budgets;
CREATE POLICY "Permission-gated budgets manage"
  ON public.budgets FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/budgets', 'view')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/budgets', 'add')
    OR has_menu_permission(auth.uid(), '/admin/budgets', 'edit')
  );

DROP POLICY IF EXISTS "Authenticated users can manage scholarships" ON public.scholarships;
CREATE POLICY "Permission-gated scholarships manage"
  ON public.scholarships FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'view')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'add')
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'edit')
  );

DROP POLICY IF EXISTS "Authenticated users can manage scholarship awards" ON public.scholarship_awards;
CREATE POLICY "Permission-gated scholarship_awards manage"
  ON public.scholarship_awards FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'view')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'add')
    OR has_menu_permission(auth.uid(), '/admin/scholarships', 'edit')
  );

-- ====================================================================
-- 3) meetings / meeting_participants — admin & permission-only
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Authenticated users can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Authenticated users can delete meetings" ON public.meetings;
CREATE POLICY "Permission-gated meetings insert"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'add')
  );
CREATE POLICY "Permission-gated meetings update"
  ON public.meetings FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  );
CREATE POLICY "Permission-gated meetings delete"
  ON public.meetings FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'delete')
  );

DROP POLICY IF EXISTS "Authenticated users can insert meeting participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Authenticated users can update meeting participants" ON public.meeting_participants;
CREATE POLICY "Permission-gated meeting_participants insert"
  ON public.meeting_participants FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'add')
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  );
CREATE POLICY "Permission-gated meeting_participants update"
  ON public.meeting_participants FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/meetings', 'edit')
  );

-- ====================================================================
-- 4) committee_attachments — committee permission only
-- ====================================================================
DROP POLICY IF EXISTS "committee_attachments_auth_insert_row" ON public.committee_attachments;
DROP POLICY IF EXISTS "committee_attachments_auth_update_row" ON public.committee_attachments;
CREATE POLICY "committee_attachments permission insert"
  ON public.committee_attachments FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees', 'add')
    OR has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  );
CREATE POLICY "committee_attachments permission update"
  ON public.committee_attachments FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_menu_permission(auth.uid(), '/admin/committees', 'edit')
  );

-- ====================================================================
-- 5) Storage bucket listing — block public listing on sensitive buckets
--    Direct public URLs (/object/public/...) keep working since bucket
--    is still marked public; only `list()` calls are blocked.
-- ====================================================================
DROP POLICY IF EXISTS "Public can read receipts" ON storage.objects;
CREATE POLICY "Auth can read receipts metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_menu_permission(auth.uid(), '/admin/expenses', 'view')
      OR has_menu_permission(auth.uid(), '/admin/fees', 'view')
    )
  );

DROP POLICY IF EXISTS "Public read staff letters" ON storage.objects;
CREATE POLICY "Auth can read staff-letters metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'staff-letters'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_menu_permission(auth.uid(), '/admin/staff', 'view')
      OR has_menu_permission(auth.uid(), '/admin/salary', 'view')
    )
  );

DROP POLICY IF EXISTS "committee_attachments_public_read" ON storage.objects;
CREATE POLICY "Auth can read committee-attachments metadata"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'committee-attachments'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_menu_permission(auth.uid(), '/admin/committees', 'view')
    )
  );

DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
CREATE POLICY "Public can read photos directly"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos');
-- Anonymous direct URL access still works because bucket is public; listing requires auth.

-- ====================================================================
-- 6) Revoke EXECUTE from anon/authenticated on trigger-only functions.
--    These are SECURITY DEFINER but should ONLY run inside trigger
--    context, never be called directly via PostgREST.
-- ====================================================================
DO $$
DECLARE
  v_fn text;
  v_trigger_only_funcs text[] := ARRAY[
    'assign_donation_receipt_number',
    'audit_admin_entity_changes',
    'audit_log_trigger',
    'audit_sensitive_change',
    'auto_create_salary_on_attendance',
    'auto_generate_officer_id',
    'auto_generate_staff_id',
    'guard_approve_admin_officer_activation',
    'guard_approve_complaint',
    'guard_approve_donor',
    'guard_approve_notice',
    'guard_approve_parent_account',
    'guard_approve_pending_action',
    'guard_approve_salary_record',
    'guard_approve_staff_activation',
    'guard_committee_overlap',
    'guard_department_in_use',
    'handle_new_user',
    'log_committee_member_change',
    'notify_guardian_on_absence',
    'notify_on_notice_publish',
    'notify_on_parent_signup',
    'notify_on_student_insert',
    'prevent_duplicate_admin_officer_nid',
    'queue_whatsapp_absence',
    'set_parent_accounts_updated_at',
    'snapshot_email_template_version',
    'update_meeting_provider_settings_updated_at',
    'update_updated_at_column',
    'validate_admin_officer_department_ref',
    'validate_admin_officer_unique',
    'validate_administrative_department',
    'validate_no_cross_staff_admin',
    'validate_profile_unique_phone',
    'validate_staff_unique'
  ];
BEGIN
  FOREACH v_fn IN ARRAY v_trigger_only_funcs LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated'
    );
    EXIT; -- only need to run once
  END LOOP;
END $$;

-- Re-grant EXECUTE on user-callable helpers (RLS helpers + RPCs used by the app)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_menu_permission(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_duplicates(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_duplicates(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_password_strength(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_user_create_lock(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_approve_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_receipt_serial() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_administrative_officer_id(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_staff_id(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_complaint_ticket() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_password_protection_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_data_sensitivity_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_ip() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_ua() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_value(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_value(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_numeric(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_numeric(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_encryption_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_inventory_stock(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_committee_change(uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_administrative_officer_by_email() TO authenticated;
