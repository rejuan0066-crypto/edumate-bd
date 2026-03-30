
UPDATE public.custom_form_fields 
SET validation = '{"section": "student_details"}'::jsonb
WHERE default_value = 'photo_url' AND (validation::text = '{}' OR validation IS NULL);

UPDATE public.custom_form_fields 
SET validation = '{"section": "student_details"}'::jsonb
WHERE default_value = 'last_name' AND (validation::text = '{}' OR validation IS NULL);

UPDATE public.custom_form_fields 
SET validation = '{"section": "student_address"}'::jsonb
WHERE default_value = 'address_permanent' AND (validation::text = '{}' OR validation IS NULL);
