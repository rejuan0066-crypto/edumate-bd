ALTER TABLE public.whatsapp_templates
ADD COLUMN IF NOT EXISTS variable_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill rules from existing variables (mark all as optional text by default)
UPDATE public.whatsapp_templates
SET variable_rules = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'key', v,
        'label', v,
        'required', false,
        'type', 'text',
        'placeholder', '',
        'default_value', ''
      )
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text(variables) AS v
)
WHERE variable_rules = '[]'::jsonb AND jsonb_array_length(variables) > 0;