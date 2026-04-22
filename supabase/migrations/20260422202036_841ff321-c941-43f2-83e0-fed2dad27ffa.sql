-- Design projects table for the Design Studio
CREATE TABLE public.design_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Design',
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1080,
  background text NOT NULL DEFAULT '#ffffff',
  canvas_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_design_projects_user ON public.design_projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_design_projects_updated ON public.design_projects(updated_at DESC);

ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their own designs
CREATE POLICY "Users manage own design projects"
ON public.design_projects
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all designs (for support/moderation)
CREATE POLICY "Admins view all design projects"
ON public.design_projects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto update updated_at
CREATE TRIGGER trg_design_projects_updated_at
BEFORE UPDATE ON public.design_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();