CREATE OR REPLACE FUNCTION public.generate_staff_id(p_category_key text, p_joining_year integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.id_format_config%ROWTYPE;
  v_year INTEGER;
  v_max INTEGER;
  v_next INTEGER;
  v_id TEXT;
  v_prefix_pattern TEXT;
BEGIN
  SELECT * INTO c FROM public.id_format_config WHERE entity_key = p_category_key FOR UPDATE;
  IF NOT FOUND THEN
    -- fallback to legacy staff_categories config if id_format_config row missing
    INSERT INTO public.id_format_config(entity_key,label,prefix,start_serial)
    SELECT key, COALESCE(name_bn, name, key), COALESCE(id_prefix,'STF'), COALESCE(id_start_range,1001)
      FROM public.staff_categories WHERE key = p_category_key
    RETURNING * INTO c;
    IF c.entity_key IS NULL THEN
      RAISE EXCEPTION 'No ID format configured for category: %', p_category_key;
    END IF;
  END IF;
  v_year := COALESCE(p_joining_year, EXTRACT(YEAR FROM now())::INTEGER);

  IF c.reset_mode = 'yearly' AND c.include_year THEN
    v_prefix_pattern := c.prefix || c.separator || v_year::TEXT || c.separator;
    SELECT MAX(CAST(regexp_replace(staff_id, '^.*' || c.separator, '') AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE v_prefix_pattern || '%'
       AND staff_id ~ ('^' || regexp_replace(v_prefix_pattern,'([.+*?^$()\[\]{}|\\])','\\\1','g') || '[0-9]+$');
  ELSE
    -- global within this prefix
    SELECT MAX(CAST((regexp_match(staff_id,'([0-9]+)$'))[1] AS INTEGER))
      INTO v_max
      FROM public.staff
     WHERE staff_id LIKE c.prefix || c.separator || '%'
       AND staff_id ~ '[0-9]+$';
  END IF;

  v_next := COALESCE(GREATEST(v_max + 1, c.start_serial), c.start_serial);
  v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);

  WHILE EXISTS (SELECT 1 FROM public.staff WHERE staff_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);
  END LOOP;
  RETURN v_id;
END;
$function$