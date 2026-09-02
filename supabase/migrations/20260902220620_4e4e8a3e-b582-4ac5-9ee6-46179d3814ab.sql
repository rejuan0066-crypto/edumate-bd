CREATE OR REPLACE FUNCTION public.get_public_principal()
RETURNS TABLE (name_bn text, name_en text, designation text, photo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.name_bn, a.name_en, a.designation, a.photo_url
  FROM public.administrative_officers a
  WHERE a.deleted_at IS NULL
    AND a.status = 'active'
    AND (
      a.designation ILIKE '%principal%'
      OR a.designation LIKE '%প্রিন্সিপাল%'
      OR a.designation LIKE '%অধ্যক্ষ%'
      OR a.designation LIKE '%মুহতামিম%'
    )
  ORDER BY COALESCE(a.sort_order, 999), a.created_at
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_principal() TO anon, authenticated;

-- Sync institutions + website_settings from the officer record
UPDATE public.institutions i
SET principal_name = p.name_bn
FROM public.get_public_principal() p
WHERE i.is_default = true;

UPDATE public.website_settings ws
SET value = to_jsonb(p.name_bn)
FROM public.get_public_principal() p
WHERE ws.key = 'principal_name';

UPDATE public.website_settings ws
SET value = to_jsonb(p.name_en)
FROM public.get_public_principal() p
WHERE ws.key = 'principal_name_en' AND COALESCE(p.name_en, '') <> '';

DELETE FROM public.website_settings WHERE key IN ('idcard_principal_name', 'idcard_principal_name_en');