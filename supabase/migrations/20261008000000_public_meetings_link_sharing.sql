-- ============================================================
-- Allow anonymous link-sharing for public meetings & live classes
-- ============================================================

DROP POLICY IF EXISTS "Public can view published public meetings" ON public.meetings;
CREATE POLICY "Public can view published public meetings"
ON public.meetings FOR SELECT TO anon
USING (
  is_published = true 
  AND access_mode = 'public' 
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Public can view published public live classes" ON public.live_classes;
CREATE POLICY "Public can view published public live classes"
ON public.live_classes FOR SELECT TO anon
USING (
  is_published = true 
  AND access_mode = 'public' 
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Public can insert meeting participant" ON public.meeting_participants;
CREATE POLICY "Public can insert meeting participant"
ON public.meeting_participants FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_participants.meeting_id
      AND m.access_mode = 'public'
      AND m.is_published = true
  )
);
