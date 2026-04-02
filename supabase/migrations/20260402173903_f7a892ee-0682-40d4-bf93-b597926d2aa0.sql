
ALTER TABLE public.user_permissions 
  ADD COLUMN IF NOT EXISTS approval_view boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_delete boolean NOT NULL DEFAULT false;

-- Migrate existing data: if requires_approval was true, set all approval columns to true
UPDATE public.user_permissions 
SET approval_view = requires_approval,
    approval_add = requires_approval,
    approval_edit = requires_approval,
    approval_delete = requires_approval;

-- Drop old column
ALTER TABLE public.user_permissions DROP COLUMN IF EXISTS requires_approval;
