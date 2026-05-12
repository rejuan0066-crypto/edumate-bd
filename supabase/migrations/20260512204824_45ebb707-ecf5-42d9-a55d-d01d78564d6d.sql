ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS route_mode text NOT NULL DEFAULT 'deny',
  ADD COLUMN IF NOT EXISTS route_patterns text[] NOT NULL DEFAULT ARRAY['/admin','/student-portal','/student-info','/parent-portal','/auth','/login']::text[];

ALTER TABLE public.whatsapp_config
  DROP CONSTRAINT IF EXISTS whatsapp_config_route_mode_check;
ALTER TABLE public.whatsapp_config
  ADD CONSTRAINT whatsapp_config_route_mode_check CHECK (route_mode IN ('deny','allow'));