
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
  idx int := 0;
  max_len constant int := 100;
BEGIN
  IF NEW.key IS DISTINCT FROM 'result_signatories' THEN
    RETURN NEW;
  END IF;

  v := NEW.value;

  IF v IS NULL OR jsonb_typeof(v) <> 'array' THEN
    RAISE EXCEPTION 'result_signatories must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(v) = 0 THEN
    RAISE EXCEPTION 'result_signatories must contain at least one signatory' USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    idx := idx + 1;

    IF jsonb_typeof(item) <> 'object' THEN
      RAISE EXCEPTION 'Signatory % must be an object', idx USING ERRCODE = '22023';
    END IF;

    t_bn := regexp_replace(btrim(coalesce(item->>'title_bn', '')), '\s{2,}', ' ', 'g');
    t_en := regexp_replace(btrim(coalesce(item->>'title_en', '')), '\s{2,}', ' ', 'g');
    n_bn := regexp_replace(btrim(coalesce(item->>'name_bn',  '')), '\s{2,}', ' ', 'g');
    n_en := regexp_replace(btrim(coalesce(item->>'name_en',  '')), '\s{2,}', ' ', 'g');

    IF t_bn = '' AND t_en = '' THEN
      RAISE EXCEPTION 'Signatory %: title required in Bangla or English', idx USING ERRCODE = '22023';
    END IF;
    IF n_bn = '' AND n_en = '' THEN
      RAISE EXCEPTION 'Signatory %: name required in Bangla or English', idx USING ERRCODE = '22023';
    END IF;

    IF char_length(t_bn) > max_len OR char_length(t_en) > max_len
       OR char_length(n_bn) > max_len OR char_length(n_en) > max_len THEN
      RAISE EXCEPTION 'Signatory %: title/name fields must be at most % characters', idx, max_len USING ERRCODE = '22023';
    END IF;

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

DROP TRIGGER IF EXISTS trg_validate_result_signatories ON public.website_settings;
CREATE TRIGGER trg_validate_result_signatories
BEFORE INSERT OR UPDATE ON public.website_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_result_signatories();
