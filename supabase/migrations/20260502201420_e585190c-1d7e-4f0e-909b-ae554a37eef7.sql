
-- Generate (or reuse) a backup cron secret in app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'backup_cron_secret',
  to_jsonb(encode(gen_random_bytes(32), 'hex'))
)
ON CONFLICT (key) DO NOTHING;

-- Replace the cron job to include the secret header
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'daily-db-backup-job';

SELECT cron.schedule(
  'daily-db-backup-job',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wwhunyzobtuibhvkipwk.supabase.co/functions/v1/daily-db-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value::text FROM public.app_settings WHERE key = 'backup_cron_secret')
    ),
    body := jsonb_build_object('source', 'cron', 'time', now())
  );
  $$
);
