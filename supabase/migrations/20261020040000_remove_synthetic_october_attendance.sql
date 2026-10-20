-- Remove synthetic attendance records generated for October 4 through October 19, 2026
-- Preserves all real attendance up to October 3, 2026
DELETE FROM public.attendance_records
WHERE attendance_date >= '2026-10-04'
  AND attendance_date <= '2026-10-19';
