-- 1) Helper: list overloaded functions in public schema
CREATE OR REPLACE FUNCTION public.list_function_overloads()
RETURNS TABLE(function_name text, overload_count bigint, signatures text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.proname::text AS function_name,
    COUNT(*) AS overload_count,
    array_agg(pg_get_function_identity_arguments(p.oid) ORDER BY p.oid) AS signatures
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  GROUP BY p.proname
  HAVING COUNT(*) > 1
  ORDER BY p.proname;
$$;

-- 2) Assertion helper for use inside migrations
CREATE OR REPLACE FUNCTION public.assert_no_function_overloads(fn_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bad RECORD;
  msg text := '';
BEGIN
  FOR bad IN
    SELECT p.proname::text AS fn,
           COUNT(*) AS cnt,
           array_agg(pg_get_function_identity_arguments(p.oid) ORDER BY p.oid) AS sigs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY(fn_names)
    GROUP BY p.proname
    HAVING COUNT(*) > 1
  LOOP
    msg := msg || format(E'\n - %s has %s overloads: %s',
                         bad.fn, bad.cnt, array_to_string(bad.sigs, ' | '));
  END LOOP;

  IF length(msg) > 0 THEN
    RAISE EXCEPTION 'Function overload safeguard failed:%', msg
      USING HINT = 'Drop the obsolete version(s) using DROP FUNCTION public.<name>(<exact arg types>) before re-running the migration.';
  END IF;
END;
$$;

-- 3) Event trigger: warn when a newly created/replaced function ends up overloaded
CREATE OR REPLACE FUNCTION public.warn_function_overloads()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  obj RECORD;
  cnt int;
  sigs text;
  fn_name text;
BEGIN
  FOR obj IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE FUNCTION', 'ALTER FUNCTION')
      AND object_type = 'function'
      AND schema_name = 'public'
  LOOP
    -- Extract the bare function name (object_identity looks like public.foo(arg1, arg2))
    fn_name := split_part(split_part(obj.object_identity, '(', 1), '.', 2);

    SELECT COUNT(*),
           string_agg(pg_get_function_identity_arguments(p.oid), ' | ' ORDER BY p.oid)
      INTO cnt, sigs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = fn_name;

    IF cnt > 1 THEN
      RAISE WARNING
        'Function overload detected: public.% now has % versions (signatures: %). If unintended, DROP the obsolete version explicitly.',
        fn_name, cnt, sigs;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS trg_warn_function_overloads;
CREATE EVENT TRIGGER trg_warn_function_overloads
  ON ddl_command_end
  WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION')
  EXECUTE FUNCTION public.warn_function_overloads();

-- 4) Lock down execute permissions on the assertion helpers
REVOKE ALL ON FUNCTION public.list_function_overloads() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_no_function_overloads(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_function_overloads() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_no_function_overloads(text[]) TO authenticated, service_role;

-- 5) Sanity check right now: warn (don't fail) on any pre-existing overloads
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.list_function_overloads() LOOP
    RAISE WARNING 'Pre-existing function overload: % (% versions): %',
      r.function_name, r.overload_count, array_to_string(r.signatures, ' | ');
  END LOOP;
END;
$$;