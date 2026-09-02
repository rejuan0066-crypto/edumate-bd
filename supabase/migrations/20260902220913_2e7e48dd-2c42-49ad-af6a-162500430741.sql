CREATE OR REPLACE FUNCTION public.sync_principal_name_everywhere()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM public.get_public_principal();
  IF p.name_bn IS NULL AND p.name_en IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.institutions SET principal_name = p.name_bn WHERE is_default = true;

  INSERT INTO public.website_settings (key, value)
  VALUES ('principal_name', to_jsonb(COALESCE(p.name_bn, '')))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.website_settings (key, value)
  VALUES ('principal_name_en', to_jsonb(COALESCE(p.name_en, '')))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.website_settings (key, value)
  VALUES ('principal_title_bn', to_jsonb(COALESCE(p.designation, '')))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_principal_name ON public.administrative_officers;
CREATE TRIGGER trg_sync_principal_name
AFTER INSERT OR UPDATE OF name_bn, name_en, designation, status, deleted_at OR DELETE
ON public.administrative_officers
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_principal_name_everywhere();