
CREATE OR REPLACE FUNCTION public.generate_administrative_officer_id(p_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_max_serial INTEGER;
  v_next INTEGER;
  v_id TEXT;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::INTEGER);

  SELECT MAX(
    CASE
      WHEN officer_id ~ ('^ADO-' || v_year::TEXT || '-[0-9]+$')
      THEN CAST(split_part(officer_id, '-', 3) AS INTEGER)
      ELSE NULL
    END
  ) INTO v_max_serial
  FROM public.administrative_officers
  WHERE officer_id LIKE 'ADO-' || v_year::TEXT || '-%';

  v_next := COALESCE(v_max_serial, 0) + 1;
  v_id := 'ADO-' || v_year::TEXT || '-' || lpad(v_next::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM public.administrative_officers WHERE officer_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := 'ADO-' || v_year::TEXT || '-' || lpad(v_next::TEXT, 4, '0');
  END LOOP;

  RETURN v_id;
END;
$$;
