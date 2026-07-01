
DROP POLICY IF EXISTS "Public can signup as parent" ON public.parent_accounts;
CREATE POLICY "Public can signup as parent"
ON public.parent_accounts FOR INSERT
WITH CHECK (
  status = 'pending'
  AND email_verified = false
  AND linked_student_uuid IS NULL
  AND (linked_student_uuids IS NULL OR linked_student_uuids = ARRAY[]::uuid[])
);
