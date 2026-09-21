DO $$
DECLARE
  r record;
  v_qual text;
  v_check text;
  v_roles text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname,
           c.relname  AS tablename,
           pol.polname AS policyname,
           pol.polpermissive AS permissive,
           pol.polcmd AS cmd,
           pg_get_expr(pol.polqual, pol.polrelid) AS qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check,
           (SELECT string_agg(CASE WHEN oid = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(oid)) END, ', ')
              FROM unnest(pol.polroles) AS oid) AS roles
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND (pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
            OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%auth.uid()%')
  LOOP
    v_qual  := replace(coalesce(r.qual, ''),  'auth.uid()', '( SELECT auth.uid() )');
    v_check := replace(coalesce(r.with_check, ''), 'auth.uid()', '( SELECT auth.uid() )');
    IF v_qual = coalesce(r.qual,'') AND v_check = coalesce(r.with_check,'') THEN
      CONTINUE;
    END IF;
    v_roles := coalesce(r.roles, 'PUBLIC');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    v_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      CASE r.cmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
      v_roles);

    IF r.qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;
    IF r.with_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;
  END LOOP;
END $$;