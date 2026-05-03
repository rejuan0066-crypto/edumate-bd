-- Audit log table
CREATE TABLE IF NOT EXISTS public.result_signatories_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('normalized', 'rejected')),
  original_value jsonb,
  cleaned_value jsonb,
  diff jsonb,
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_signatories_audit_created
  ON public.result_signatories_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_signatories_audit_action
  ON public.result_signatories_audit (action, created_at DESC);

ALTER TABLE public.result_signatories_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read signatory audit" ON public.result_signatories_audit;
CREATE POLICY "Admins read signatory audit"
  ON public.result_signatories_audit
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER trigger writes.

-- Compute a per-field diff between the original and cleaned arrays.
CREATE OR REPLACE FUNCTION public.diff_result_signatories(orig jsonb, cleaned jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  out_arr jsonb := '[]'::jsonb;
  i int;
  o jsonb; c jsonb;
  fields constant text[] := ARRAY['title_bn','title_en','name_bn','name_en'];
  f text;
  ov text; cv text;
  per_item jsonb;
BEGIN
  IF orig IS NULL OR cleaned IS NULL
     OR jsonb_typeof(orig) <> 'array' OR jsonb_typeof(cleaned) <> 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR i IN 0 .. jsonb_array_length(cleaned) - 1 LOOP
    o := COALESCE(orig -> i, '{}'::jsonb);
    c := cleaned -> i;
    per_item := '{}'::jsonb;
    FOREACH f IN ARRAY fields LOOP
      ov := COALESCE(o ->> f, '');
      cv := COALESCE(c ->> f, '');
      IF ov IS DISTINCT FROM cv THEN
        per_item := per_item || jsonb_build_object(
          f, jsonb_build_object('from', ov, 'to', cv)
        );
      END IF;
    END LOOP;
    IF per_item <> '{}'::jsonb THEN
      out_arr := out_arr || jsonb_build_array(jsonb_build_object('index', i, 'changes', per_item));
    END IF;
  END LOOP;

  RETURN out_arr;
END;
$$;

-- Replace the trigger to log normalization + rejection events.
CREATE OR REPLACE FUNCTION public.validate_result_signatories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  item jsonb;
  cleaned jsonb := '[]'::jsonb;
  norm_item jsonb;
  t_bn text; t_en text; n_bn text; n_en text;
  d jsonb;
  reject_reason text;
BEGIN
  IF NEW.key IS DISTINCT FROM 'result_signatories' THEN
    RETURN NEW;
  END IF;

  v := NEW.value;

  -- Detect obviously bad shape and log rejection BEFORE the CHECK constraint fires.
  IF v IS NULL OR jsonb_typeof(v) <> 'array' THEN
    INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
    VALUES ('rejected', v, 'value must be a JSON array', auth.uid());
    RAISE EXCEPTION 'result_signatories must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(v) = 0 THEN
    INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
    VALUES ('rejected', v, 'array must contain at least one signatory', auth.uid());
    RAISE EXCEPTION 'result_signatories must contain at least one signatory' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(v) > 6 THEN
    INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
    VALUES ('rejected', v, 'array exceeds maximum of 6 signatories', auth.uid());
    RAISE EXCEPTION 'result_signatories supports at most 6 signatories' USING ERRCODE = '22023';
  END IF;

  -- Normalize whitespace
  FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      INSERT INTO public.result_signatories_audit (action, original_value, reason, actor_id)
      VALUES ('rejected', v, 'each signatory must be an object', auth.uid());
      RAISE EXCEPTION 'each signatory must be an object' USING ERRCODE = '22023';
    END IF;

    t_bn := regexp_replace(btrim(coalesce(item->>'title_bn', '')), '\s{2,}', ' ', 'g');
    t_en := regexp_replace(btrim(coalesce(item->>'title_en', '')), '\s{2,}', ' ', 'g');
    n_bn := regexp_replace(btrim(coalesce(item->>'name_bn',  '')), '\s{2,}', ' ', 'g');
    n_en := regexp_replace(btrim(coalesce(item->>'name_en',  '')), '\s{2,}', ' ', 'g');

    norm_item := jsonb_build_object(
      'title_bn', t_bn, 'title_en', t_en, 'name_bn', n_bn, 'name_en', n_en
    );
    cleaned := cleaned || jsonb_build_array(norm_item);
  END LOOP;

  -- After normalization, re-check structural rules and log a clean rejection
  -- with reason BEFORE letting the CHECK constraint produce a generic error.
  IF NOT public.is_valid_result_signatories(cleaned) THEN
    -- Find the first failing reason
    reject_reason := 'validation failed (length, empty title/name, or control chars)';
    INSERT INTO public.result_signatories_audit
      (action, original_value, cleaned_value, diff, reason, actor_id)
    VALUES ('rejected', v, cleaned, public.diff_result_signatories(v, cleaned), reject_reason, auth.uid());
    RAISE EXCEPTION 'Signatory validation failed: %', reject_reason USING ERRCODE = '22023';
  END IF;

  -- Log normalization only when something actually changed
  d := public.diff_result_signatories(v, cleaned);
  IF d <> '[]'::jsonb THEN
    INSERT INTO public.result_signatories_audit
      (action, original_value, cleaned_value, diff, reason, actor_id)
    VALUES ('normalized', v, cleaned, d, 'auto-trim / whitespace collapse', auth.uid());
  END IF;

  NEW.value := cleaned;
  RETURN NEW;
END;
$$;