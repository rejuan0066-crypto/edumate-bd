
-- Add requires_approval column to user_permissions
ALTER TABLE public.user_permissions ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

-- Create pending_actions table
CREATE TABLE public.pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  action_type text NOT NULL DEFAULT 'add',
  target_table text NOT NULL,
  target_id uuid,
  menu_path text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all pending actions
CREATE POLICY "Admins can manage pending_actions" ON public.pending_actions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view own pending actions
CREATE POLICY "Users can view own pending_actions" ON public.pending_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert pending actions
CREATE POLICY "Users can insert pending_actions" ON public.pending_actions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
