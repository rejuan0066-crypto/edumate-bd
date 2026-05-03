CREATE TABLE IF NOT EXISTS public.result_print_footer_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('class','exam')),
  scope_id uuid NOT NULL,
  show_page_numbers boolean,
  show_footer_institution boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_id)
);

ALTER TABLE public.result_print_footer_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view footer overrides"
  ON public.result_print_footer_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins manage footer overrides insert"
  ON public.result_print_footer_overrides FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage footer overrides update"
  ON public.result_print_footer_overrides FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage footer overrides delete"
  ON public.result_print_footer_overrides FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_result_print_footer_overrides_updated
  BEFORE UPDATE ON public.result_print_footer_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
