CREATE POLICY "chat attachments read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.can_access_storage_object(auth.uid(), 'chat-attachments', name)
);

CREATE POLICY "chat attachments upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.can_access_storage_object(auth.uid(), 'chat-attachments', name)
);

CREATE POLICY "chat attachments delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (owner = auth.uid() OR public.is_chat_admin(auth.uid()))
);