UPDATE public.students
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id = 'd6bc5d64-a6db-4d92-9040-0629659d1ae0'
  AND deleted_at IS NULL;