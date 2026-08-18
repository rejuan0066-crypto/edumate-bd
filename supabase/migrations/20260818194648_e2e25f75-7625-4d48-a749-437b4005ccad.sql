CREATE OR REPLACE FUNCTION public.notify_admins_of_pending_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  msg text;
  msg_bn text;
BEGIN
  -- Build the notification message
  msg := 'New approval request: ' || NEW.action_type || ' on ' || NEW.target_table || ' by ' || NEW.user_name;
  msg_bn := 'নতুন অনুমোদনের অনুরোধ: ' || NEW.user_name || ' কর্তৃক ' || NEW.target_table || ' টেবিলে ' || NEW.action_type || ' অ্যাকশন';

  -- Find all admins (profile.role = 'admin' or profile.role = 'super_admin')
  -- Note: The user_roles table is where roles are actually stored according to project guidelines.
  FOR admin_id IN 
    SELECT user_id 
    FROM public.user_roles 
    WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      title_bn,
      message,
      message_bn,
      type,
      category,
      link
    ) VALUES (
      admin_id,
      'Approval Request',
      'অনুমোদনের অনুরোধ',
      msg,
      msg_bn,
      'warning',
      'approval',
      '/admin/approvals'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_pending_action ON public.pending_actions;

CREATE TRIGGER trg_notify_admins_on_pending_action
AFTER INSERT ON public.pending_actions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_of_pending_action();

GRANT EXECUTE ON FUNCTION public.notify_admins_of_pending_action() TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notifications TO authenticated;
