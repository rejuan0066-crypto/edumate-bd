CREATE OR REPLACE FUNCTION public.generate_administrative_officer_id(p_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_serial INTEGER;
  v_next INTEGER;
  v_id TEXT;
BEGIN
  -- Global serial across all years. p_year kept for backward compatibility but ignored.
  SELECT MAX(
    CASE
      WHEN officer_id ~ '^ADO-[0-9]+$'
        THEN CAST(split_part(officer_id, '-', 2) AS INTEGER)
      WHEN officer_id ~ '^ADO-[0-9]{4}-[0-9]+$'
        THEN CAST(split_part(officer_id, '-', 3) AS INTEGER)
      ELSE NULL
    END
  ) INTO v_max_serial
  FROM public.administrative_officers;

  v_next := COALESCE(v_max_serial, 0) + 1;
  v_id := 'ADO-' || lpad(v_next::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM public.administrative_officers WHERE officer_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := 'ADO-' || lpad(v_next::TEXT, 4, '0');
  END LOOP;

  RETURN v_id;
END;
$$;