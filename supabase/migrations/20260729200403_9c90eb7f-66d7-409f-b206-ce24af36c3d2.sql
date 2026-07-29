insert into public.salary_settings (setting_key, setting_value)
values ('unmarked_days_paid', '{"enabled": false}'::jsonb)
on conflict (setting_key) do update
set setting_value = excluded.setting_value,
    updated_at = now();