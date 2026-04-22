
-- Templates table
CREATE TABLE IF NOT EXISTS public.design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  tags TEXT[] DEFAULT '{}',
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1080,
  background TEXT NOT NULL DEFAULT '#ffffff',
  canvas_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  thumbnail TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates: anyone authenticated can view system + own"
  ON public.design_templates FOR SELECT
  TO authenticated
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Templates: users insert their own"
  ON public.design_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Templates: users update their own"
  ON public.design_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Templates: users delete their own"
  ON public.design_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

CREATE TRIGGER update_design_templates_updated_at
  BEFORE UPDATE ON public.design_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_design_templates_user ON public.design_templates(user_id);
CREATE INDEX idx_design_templates_category ON public.design_templates(category);

-- Version history column on projects
ALTER TABLE public.design_projects
  ADD COLUMN IF NOT EXISTS version_history JSONB NOT NULL DEFAULT '[]'::jsonb;
