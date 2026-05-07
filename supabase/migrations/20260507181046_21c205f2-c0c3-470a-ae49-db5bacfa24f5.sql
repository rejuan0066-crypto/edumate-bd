-- ID Format Configuration table
CREATE TABLE IF NOT EXISTS public.id_format_config (
  entity_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  include_year BOOLEAN NOT NULL DEFAULT false,
  serial_padding INTEGER NOT NULL DEFAULT 4 CHECK (serial_padding BETWEEN 1 AND 8),
  separator TEXT NOT NULL DEFAULT '-',
  reset_mode TEXT NOT NULL DEFAULT 'global' CHECK (reset_mode IN ('global','yearly')),
  start_serial INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.id_format_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "id_format_config_read" ON public.id_format_config;
CREATE POLICY "id_format_config_read" ON public.id_format_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "id_format_config_admin_all" ON public.id_format_config;
CREATE POLICY "id_format_config_admin_all" ON public.id_format_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE TRIGGER trg_id_format_config_updated_at
BEFORE UPDATE ON public.id_format_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.id_format_config (entity_key,label,prefix,include_year,serial_padding,separator,reset_mode,start_serial) VALUES
  ('administrative_officer','প্রশাসনিক কর্মকর্তা','ADO',false,4,'-','global',1),
  ('teacher','শিক্ষক','TCH',false,4,'-','global',2001),
  ('administrative','প্রশাসনিক','ADM',false,4,'-','global',1001),
  ('general','সাধারণ কর্মী','OFF',false,4,'-','global',3001),
  ('support','সহায়ক কর্মী','STF',false,4,'-','global',4001)
ON CONFLICT (entity_key) DO NOTHING;

-- Helper: build ID string
CREATE OR REPLACE FUNCTION public.build_formatted_id(
  p_prefix TEXT, p_include_year BOOLEAN, p_year INTEGER,
  p_separator TEXT, p_padding INTEGER, p_serial INTEGER
) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_include_year THEN p_prefix || p_separator || p_year::TEXT || p_separator || lpad(p_serial::TEXT, p_padding, '0')
    ELSE p_prefix || p_separator || lpad(p_serial::TEXT, p_padding, '0')
  END;
$$;

-- Rewrite administrative officer ID generator
CREATE OR REPLACE FUNCTION public.generate_administrative_officer_id(p_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.id_format_config%ROWTYPE;
  v_year INTEGER;
  v_max INTEGER;
  v_next INTEGER;
  v_id TEXT;
  v_prefix_pattern TEXT;
BEGIN
  SELECT * INTO c FROM public.id_format_config WHERE entity_key='administrative_officer' FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.id_format_config(entity_key,label,prefix) VALUES('administrative_officer','Officer','ADO')
    RETURNING * INTO c;
  END IF;
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::INTEGER);

  IF c.reset_mode = 'yearly' AND c.include_year THEN
    v_prefix_pattern := c.prefix || c.separator || v_year::TEXT || c.separator;
    SELECT MAX(CAST(regexp_replace(officer_id, '^.*' || c.separator, '') AS INTEGER))
      INTO v_max
      FROM public.administrative_officers
     WHERE officer_id LIKE v_prefix_pattern || '%'
       AND officer_id ~ ('^' || regexp_replace(v_prefix_pattern,'([.+*?^$()\[\]{}|\\])','\\\1','g') || '[0-9]+$');
  ELSE
    -- global: scan all officer_ids, extract trailing number
    SELECT MAX(CAST((regexp_match(officer_id,'([0-9]+)$'))[1] AS INTEGER))
      INTO v_max
      FROM public.administrative_officers
     WHERE officer_id ~ '[0-9]+$';
  END IF;

  v_next := COALESCE(GREATEST(v_max + 1, c.start_serial), c.start_serial);
  v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);

  WHILE EXISTS (SELECT 1 FROM public.administrative_officers WHERE officer_id = v_id) LOOP
    v_next := v_next + 1;
    v_id := public.build_formatted_id(c.prefix, c.include_year, v_year, c.separator, c.serial_padding, v_next);
  END LOOP;
  RETURN v_id;
END;
$$;

-- Rewrite staff ID generator (per category, reads from id_format_config)
CREATE OR REPLACE FUNCTION public.generate_staff_id(p_category_key TEXT, p_joining_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    SELECT key, COALESCE(name_bn,name_en,key), COALESCE(id_prefix,'STF'), COALESCE(id_start_range,1001)
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
$$;

GRANT EXECUTE ON FUNCTION public.generate_administrative_officer_id(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_staff_id(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.build_formatted_id(text,boolean,integer,text,integer,integer) TO authenticated;