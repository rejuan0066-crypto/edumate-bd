ALTER TABLE public.pending_actions ADD COLUMN IF NOT EXISTS requires_admin_approval boolean DEFAULT false;
GRANT ALL ON public.pending_actions TO authenticated;
GRANT ALL ON public.pending_actions TO service_role;