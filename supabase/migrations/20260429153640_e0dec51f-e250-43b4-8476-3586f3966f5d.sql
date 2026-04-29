DROP TRIGGER IF EXISTS trg_sync_staff_to_profile ON public.staff;
CREATE TRIGGER trg_sync_staff_to_profile
AFTER INSERT OR UPDATE
ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.sync_staff_to_profile();