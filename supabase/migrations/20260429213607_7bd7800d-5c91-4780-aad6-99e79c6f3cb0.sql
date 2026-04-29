-- Unified directory view: staff + administrative_officers
CREATE OR REPLACE VIEW public.staff_directory AS
SELECT
  s.id,
  'staff'::text AS source,
  s.user_id,
  s.name_bn,
  s.name_en,
  s.designation,
  s.department,
  s.staff_category,
  s.phone,
  s.email,
  s.photo_url,
  s.staff_id AS code,
  s.status,
  s.joining_date,
  s.deleted_at,
  s.created_at
FROM public.staff s
WHERE s.deleted_at IS NULL
UNION ALL
SELECT
  ao.id,
  'administrative'::text AS source,
  ao.user_id,
  ao.name_bn,
  ao.name_en,
  ao.designation,
  ao.department,
  'administrative'::text AS staff_category,
  ao.phone,
  ao.email,
  ao.photo_url,
  ao.officer_id AS code,
  ao.status,
  ao.joining_date,
  ao.deleted_at,
  ao.created_at
FROM public.administrative_officers ao
WHERE ao.deleted_at IS NULL;

GRANT SELECT ON public.staff_directory TO authenticated, anon;