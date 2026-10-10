DROP POLICY IF EXISTS "Published results are publicly readable" ON public.published_results;
CREATE POLICY "Published results are publicly readable" ON public.published_results FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "photos_anon_public_read" ON storage.objects;