-- Migration: Enforce Row-Level Security (RLS) on all public tables
-- Fixes Supabase Security Advisor alert: rls_disabled_in_public
-- Automatically enables RLS on any table in the public schema that does not have it enabled.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND rowsecurity = false
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        RAISE NOTICE 'Successfully enabled RLS on public.%', r.tablename;
    END LOOP;
END $$;
