CREATE TABLE IF NOT EXISTS public.user_quran_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_scroll BOOLEAN NOT NULL DEFAULT false,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quran_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.user_quran_prefs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.user_quran_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.user_quran_prefs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.user_quran_prefs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_quran_prefs_updated_at
  BEFORE UPDATE ON public.user_quran_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();