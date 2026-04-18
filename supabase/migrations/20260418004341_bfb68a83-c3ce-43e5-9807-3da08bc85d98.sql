
DROP POLICY IF EXISTS "Logged-in users can join live classes" ON public.live_class_participants;
DROP POLICY IF EXISTS "Anyone can post messages" ON public.live_class_messages;

CREATE POLICY "Users can join allowed live classes"
  ON public.live_class_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = live_class_id
        AND lc.is_published = true
        AND lc.deleted_at IS NULL
        AND (
          lc.access_mode = 'public'
          OR auth.uid() IS NOT NULL
        )
    )
  );

CREATE POLICY "Users can post in chat-enabled classes"
  ON public.live_class_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = live_class_id
        AND lc.is_published = true
        AND lc.enable_chat = true
        AND lc.deleted_at IS NULL
        AND (
          lc.access_mode = 'public'
          OR auth.uid() IS NOT NULL
        )
    )
  );
