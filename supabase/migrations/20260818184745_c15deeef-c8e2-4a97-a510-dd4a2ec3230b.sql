-- Cleanup Muta 2nd Year
UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' 
  AND roll_number::integer > 6007 
  AND deleted_at IS NULL;

-- Cleanup Muta 3rd Year
UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' 
  AND roll_number::integer > 7007 
  AND deleted_at IS NULL;