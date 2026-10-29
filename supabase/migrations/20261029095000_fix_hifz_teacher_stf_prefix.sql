-- Fix hifz teachers whose staff_id was accidentally assigned STF- prefix
-- teacher_hifz and teacher_nurani_kitab should use TCH- prefix, not STF-

-- Pattern: STF-2026-4001 → TCH-2026-2001 (4xxx → 2xxx range for teachers)
UPDATE public.staff
SET staff_id = regexp_replace(staff_id, '^STF-(\d{4})-4(\d{3})$', 'TCH-\1-2\2')
WHERE staff_id ~ '^STF-\d{4}-4\d{3}$'
  AND staff_category IN ('teacher_hifz', 'teacher_nurani_kitab', 'teacher')
  AND deleted_at IS NULL;

-- Fallback: any remaining STF- teacher just swap prefix
UPDATE public.staff
SET staff_id = 'TCH-' || substring(staff_id FROM 5)
WHERE staff_id LIKE 'STF-%'
  AND staff_category IN ('teacher_hifz', 'teacher_nurani_kitab', 'teacher')
  AND deleted_at IS NULL;
