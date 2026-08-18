-- Force soft-delete for Muta 2nd Year (Nahbemir 7th) students with roll > 6007
UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3' 
  AND roll_number::integer > 6007 
  AND deleted_at IS NULL;

-- Force soft-delete for Muta 3rd Year (Sarf 7th) students with roll > 7007
UPDATE public.students 
SET deleted_at = NOW() 
WHERE class_id = 'dea01e69-e7c2-470f-badf-742a767a00c7' 
  AND roll_number::integer > 7007 
  AND deleted_at IS NULL;
