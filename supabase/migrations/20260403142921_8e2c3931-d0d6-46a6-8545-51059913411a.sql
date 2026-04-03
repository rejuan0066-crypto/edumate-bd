DROP POLICY IF EXISTS "Admins can manage institution logos" ON storage.objects;

CREATE POLICY "Admins can manage institution logos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'institution-logos'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'institution-logos'
  AND public.has_role(auth.uid(), 'admin')
);