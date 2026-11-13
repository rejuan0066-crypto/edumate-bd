-- Deduplicate student_categories and enforce unique category name
DELETE FROM public.student_categories a
USING public.student_categories b
WHERE a.id > b.id
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));

-- Ensure unique constraint so duplicates cannot be created in the future
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_categories_unique_name
ON public.student_categories (LOWER(TRIM(name)));
