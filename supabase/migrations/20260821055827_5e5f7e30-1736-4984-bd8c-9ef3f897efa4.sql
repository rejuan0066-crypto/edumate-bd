BEGIN;
UPDATE website_settings SET value = '" ১৬০+"' WHERE key = 'stat_students';
UPDATE website_settings SET value = '"১৪+"' WHERE key = 'stat_teachers';
UPDATE website_settings SET value = '"৫+"' WHERE key = 'stat_years';
COMMIT;