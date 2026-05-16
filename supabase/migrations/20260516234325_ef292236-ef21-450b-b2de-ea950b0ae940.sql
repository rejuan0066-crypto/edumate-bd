INSERT INTO public.app_settings (key, value, description)
VALUES ('quran_default_translation', '"both"'::jsonb, 'Default translation state for Quran page: off | bn | en | both')
ON CONFLICT (key) DO NOTHING;