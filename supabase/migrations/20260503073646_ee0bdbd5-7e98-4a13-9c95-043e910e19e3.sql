-- Immutable structural validator for result_signatories JSONB.
-- Pure function over input → safe for use inside a CHECK constraint.
CREATE OR REPLACE FUNCTION public.is_valid_result_signatories(v jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  item jsonb;
  t_bn text; t_en text; n_bn text; n_en text;
  max_len constant int := 100;
  max_items constant int := 6;
BEGIN
  IF v IS NULL THEN
    RETURN false;
  END IF;
  IF jsonb_typeof(v) <> 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_array_length(v) = 0 OR jsonb_array_length(v) > max_items THEN
    RETURN false;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RETURN false;
    END IF;

    t_bn := coalesce(item->>'title_bn', '');
    t_en := coalesce(item->>'title_en', '');
    n_bn := coalesce(item->>'name_bn',  '');
    n_en := coalesce(item->>'name_en',  '');

    -- At least one title and at least one name (post-trim by the trigger)
    IF btrim(t_bn) = '' AND btrim(t_en) = '' THEN
      RETURN false;
    END IF;
    IF btrim(n_bn) = '' AND btrim(n_en) = '' THEN
      RETURN false;
    END IF;

    -- Length caps
    IF char_length(t_bn) > max_len
       OR char_length(t_en) > max_len
       OR char_length(n_bn) > max_len
       OR char_length(n_en) > max_len THEN
      RETURN false;
    END IF;

    -- Block control chars / newlines / tabs in any field
    IF t_bn ~ '[[:cntrl:]]' OR t_en ~ '[[:cntrl:]]'
       OR n_bn ~ '[[:cntrl:]]' OR n_en ~ '[[:cntrl:]]' THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Drop existing constraint if present (idempotent re-runs)
ALTER TABLE public.website_settings
  DROP CONSTRAINT IF EXISTS website_settings_result_signatories_valid;

-- CHECK constraint: only enforced when key = 'result_signatories'.
-- Other rows are unaffected (NULL / true short-circuit).
ALTER TABLE public.website_settings
  ADD CONSTRAINT website_settings_result_signatories_valid
  CHECK (
    key <> 'result_signatories'
    OR public.is_valid_result_signatories(value)
  )
  NOT VALID;

-- Validate against existing rows; will fail loudly if any current row violates.
ALTER TABLE public.website_settings
  VALIDATE CONSTRAINT website_settings_result_signatories_valid;

-- Trim the trigger down to NORMALIZATION only — structural validation now lives
-- in the CHECK constraint, so we no longer raise from the trigger.
CREATE OR REPLACE FUNCTION public.validate_result_signatories()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v jsonb;
  item jsonb;
  cleaned jsonb := '[]'::jsonb;
  norm_item jsonb;
  t_bn text; t_en text; n_bn text; n_en text;
BEGIN
  IF NEW.key IS DISTINCT FROM 'result_signatories' THEN
    RETURN NEW;
  END IF;

  v := NEW.value;

  -- Defer structural errors to the CHECK constraint; only normalize when shape is sane.
  IF v IS NULL OR jsonb_typeof(v) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RETURN NEW; -- let CHECK reject
    END IF;

    t_bn := regexp_replace(btrim(coalesce(item->>'title_bn', '')), '\s{2,}', ' ', 'g');
    t_en := regexp_replace(btrim(coalesce(item->>'title_en', '')), '\s{2,}', ' ', 'g');
    n_bn := regexp_replace(btrim(coalesce(item->>'name_bn',  '')), '\s{2,}', ' ', 'g');
    n_en := regexp_replace(btrim(coalesce(item->>'name_en',  '')), '\s{2,}', ' ', 'g');

    norm_item := jsonb_build_object(
      'title_bn', t_bn,
      'title_en', t_en,
      'name_bn',  n_bn,
      'name_en',  n_en
    );
    cleaned := cleaned || jsonb_build_array(norm_item);
  END LOOP;

  NEW.value := cleaned;
  RETURN NEW;
END;
$$;