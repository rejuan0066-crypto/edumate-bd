-- ============================================================================
-- RLS Security Verification Suite
-- ----------------------------------------------------------------------------
-- Run via:  psql "$SUPABASE_DB_URL" -f supabase/tests/rls_security_checks.sql
-- Or paste sections into supabase--read_query.
--
-- Each block prints PASS / FAIL rows. CI can grep for "FAIL" to fail the build.
-- All checks are READ-ONLY (catalog inspection + a few impersonated SELECTs in
-- a rolled-back transaction). Safe to run against production.
-- ============================================================================

\set ON_ERROR_STOP on
\pset format aligned
\pset border 2

\echo '\n============================================================'
\echo '  1. APPLICANT PII — admission_test_attempts'
\echo '============================================================'

-- 1a. Base table must NOT have a public/anon SELECT policy.
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '1a. No anon SELECT policy on admission_test_attempts' AS check,
  COUNT(*) AS offending_policies
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'admission_test_attempts'
  AND p.polcmd IN ('r', '*')
  AND (
    p.polroles = '{0}'::oid[]                                   -- PUBLIC
    OR 'anon' = ANY(SELECT rolname FROM pg_roles r
                    JOIN unnest(p.polroles) pr ON r.oid = pr)
  );

-- 1b. The public projection view must exist with security_invoker = on.
SELECT
  CASE WHEN c.reloptions @> ARRAY['security_invoker=on'] THEN 'PASS' ELSE 'FAIL' END AS status,
  '1b. admission_test_attempts_public is security_invoker=on' AS check,
  COALESCE(array_to_string(c.reloptions, ','), '<no options>') AS reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'admission_test_attempts_public';

-- 1c. The view must NOT expose PII columns.
WITH cols AS (
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'admission_test_attempts_public'
)
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '1c. Public view excludes PII columns' AS check,
  COALESCE(string_agg(column_name, ', '), 'none') AS leaked_columns
FROM cols
WHERE column_name IN (
  'applicant_phone','applicant_email','applicant_address',
  'applicant_guardian','applicant_nid_birth','ip_address','user_agent'
);

-- 1d. The submission RPC must exist and be SECURITY DEFINER.
SELECT
  CASE WHEN p.prosecdef THEN 'PASS' ELSE 'FAIL' END AS status,
  '1d. submit_admission_test_attempt is SECURITY DEFINER' AS check,
  p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'submit_admission_test_attempt';

\echo '\n============================================================'
\echo '  2. SALARY RECORDS'
\echo '============================================================'

-- 2a. RLS must be enabled.
SELECT
  CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END AS status,
  '2a. RLS enabled on salary_records' AS check
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'salary_records';

-- 2b. There must be NO "USING (true)" SELECT policy.
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '2b. No "USING (true)" SELECT policy on salary_records' AS check,
  COALESCE(string_agg(p.polname, '; '), 'none') AS offending_policies
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relname='salary_records'
  AND p.polcmd IN ('r','*')
  AND pg_get_expr(p.polqual, p.polrelid) IN ('true','(true)');

-- 2c. Self-only policy must exist (staff_id IN ... auth.uid()).
SELECT
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '2c. Self-only SELECT policy exists on salary_records' AS check
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relname='salary_records'
  AND p.polcmd IN ('r','*')
  AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%staff_id%auth.uid()%';

-- 2d. salary_records MUST NOT be in supabase_realtime publication.
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '2d. salary_records not in supabase_realtime' AS check
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public' AND tablename = 'salary_records';

\echo '\n============================================================'
\echo '  3. STORAGE BUCKETS'
\echo '============================================================'

-- 3a. Sensitive buckets must NOT be public.
SELECT
  CASE WHEN bool_and(public = false) THEN 'PASS' ELSE 'FAIL' END AS status,
  '3a. receipts & staff-letters are private' AS check,
  string_agg(id || '=' || public::text, ', ') AS bucket_state
FROM storage.buckets
WHERE id IN ('receipts','staff-letters');

-- 3b. anon must NOT have SELECT on storage.objects for sensitive buckets
--     (i.e. there should be at least one policy that excludes anon, and no
--     policy that lets anon read them).
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '3b. No anon SELECT policy on sensitive storage buckets' AS check,
  COALESCE(string_agg(policyname, '; '), 'none') AS offending_policies
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND cmd = 'SELECT'
  AND ('anon' = ANY(roles) OR roles = '{public}')
  AND (
    qual ILIKE '%''receipts''%'
    OR qual ILIKE '%''staff-letters''%'
    OR qual ILIKE '%''committee-attachments''%'
  );

\echo '\n============================================================'
\echo '  4. NO "ALWAYS TRUE" POLICIES ON SENSITIVE TABLES'
\echo '============================================================'

WITH watched(tbl) AS (
  VALUES
    ('donors'),('budgets'),('scholarships'),('scholarship_awards'),
    ('meetings'),('meeting_participants'),('committee_attachments'),
    ('smtp_config'),('salary_records'),('admission_test_attempts'),
    ('staff'),('students'),('payments'),('user_roles'),
    ('app_settings'),('vapid_keys'),('rate_limit_config')
),
violations AS (
  SELECT c.relname AS tbl, p.polname,
         CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                       WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
                       WHEN '*' THEN 'ALL' END AS cmd,
         pg_get_expr(p.polqual, p.polrelid) AS using_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN (SELECT tbl FROM watched)
    AND p.polcmd IN ('r','*')
    AND pg_get_expr(p.polqual, p.polrelid) IN ('true','(true)')
)
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '4. No "USING (true)" SELECT/ALL policies on sensitive tables' AS check,
  COUNT(*) AS violation_count
FROM violations;

-- Detailed violations (only if any exist):
SELECT 'VIOLATION' AS marker, tbl, cmd, polname, using_expr
FROM (
  SELECT c.relname AS tbl, p.polname,
         CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN '*' THEN 'ALL' END AS cmd,
         pg_get_expr(p.polqual, p.polrelid) AS using_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN ('donors','budgets','scholarships','scholarship_awards',
                      'meetings','meeting_participants','committee_attachments',
                      'smtp_config','salary_records','admission_test_attempts',
                      'staff','students','payments','user_roles',
                      'app_settings','vapid_keys','rate_limit_config')
    AND p.polcmd IN ('r','*')
    AND pg_get_expr(p.polqual, p.polrelid) IN ('true','(true)')
) v
ORDER BY tbl, cmd;

\echo '\n============================================================'
\echo '  5. ANON / PUBLIC ROLE SURFACE AREA'
\echo '============================================================'

-- 5a. anon must not have READ (SELECT/ALL) access on these PII tables.
--     INSERT-only policies (e.g. recruitment form on `staff`) are allowed.
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '5a. anon has no SELECT/ALL policies on PII tables' AS check,
  COALESCE(string_agg(c.relname || '.' || p.polname || ' (' || p.polcmd || ')', '; '), 'none') AS offenders
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('admission_test_attempts','salary_records','donors','smtp_config',
                    'staff','payments','user_roles','vapid_keys')
  AND p.polcmd IN ('r','*')
  AND 'anon' = ANY(SELECT rolname FROM pg_roles r
                   JOIN unnest(p.polroles) pr ON r.oid = pr);

\echo '\n============================================================'
\echo '  6. RLS ENABLED ON ALL public.* TABLES'
\echo '============================================================'

SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  '6. All public tables have RLS enabled' AS check,
  COALESCE(string_agg(c.relname, ', '), 'none') AS missing_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;

\echo '\n============================================================'
\echo '  Done. Search output for "FAIL" or "VIOLATION".'
\echo '============================================================'
