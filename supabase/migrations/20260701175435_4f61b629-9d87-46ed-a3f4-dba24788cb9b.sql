DROP TRIGGER IF EXISTS trg_auto_salary_on_attendance ON public.attendance_records;
DROP FUNCTION IF EXISTS public.auto_create_salary_on_attendance();