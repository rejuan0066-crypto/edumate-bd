DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'salary_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_records;
  END IF;
END $$;
ALTER TABLE public.salary_records REPLICA IDENTITY FULL;