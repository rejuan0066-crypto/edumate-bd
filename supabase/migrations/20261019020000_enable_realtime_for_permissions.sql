-- Enable Realtime publication & full replica identity for instant permission sync

DO $$
BEGIN
  -- Set REPLICA IDENTITY FULL so DELETE/UPDATE events deliver all column data to clients
  ALTER TABLE public.user_permissions REPLICA IDENTITY FULL;
  ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;
  ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
  ALTER TABLE public.website_settings REPLICA IDENTITY FULL;

  -- Add to supabase_realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'role_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'website_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.website_settings;
  END IF;
END $$;
