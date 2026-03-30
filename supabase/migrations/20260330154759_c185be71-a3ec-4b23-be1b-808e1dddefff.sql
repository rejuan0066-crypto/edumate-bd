
UPDATE public.custom_form_fields 
SET validation = ('{"section":"student_details"}')::jsonb
WHERE default_value IN ('photo_url', 'last_name')
AND (validation IS NULL OR validation::text = '{}');

UPDATE public.custom_form_fields 
SET validation = ('{"section":"student_address"}')::jsonb
WHERE default_value = 'address_permanent'
AND (validation IS NULL OR validation::text = '{}');
