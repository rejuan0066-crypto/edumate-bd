-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  title TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_conv_participants_user ON public.conversation_participants(user_id);

-- Helper: participant check (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conv AND cp.user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_admin(_user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user,'admin') OR public.has_role(_user,'super_admin');
$$;

-- Policies: conversations
CREATE POLICY "participants view conversations" ON public.conversations FOR SELECT TO authenticated
USING (deleted_at IS NULL AND (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "users create conversations" ON public.conversations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (type = 'direct' OR public.is_chat_admin(auth.uid())));

CREATE POLICY "creator or admin update conversations" ON public.conversations FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.is_chat_admin(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.is_chat_admin(auth.uid()));

-- Policies: participants
CREATE POLICY "participants view members" ON public.conversation_participants FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "add participants" ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_chat_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid() AND c.type = 'direct')
);

CREATE POLICY "update own participation" ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_chat_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_chat_admin(auth.uid()));

CREATE POLICY "admins remove participants" ON public.conversation_participants FOR DELETE TO authenticated
USING (public.is_chat_admin(auth.uid()));

-- Policies: messages
CREATE POLICY "participants read messages" ON public.chat_messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "participants send messages" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "sender or admin update messages" ON public.chat_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR public.is_chat_admin(auth.uid()))
WITH CHECK (sender_id = auth.uid() OR public.is_chat_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conv_participants_updated BEFORE UPDATE ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_messages_updated BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bump conversation last_message_at
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_conversation AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Direct conversation get-or-create
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other_user IS NULL OR _other_user = v_me THEN RAISE EXCEPTION 'invalid recipient'; END IF;

  SELECT c.id INTO v_id
  FROM public.conversations c
  WHERE c.type = 'direct' AND c.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = v_me)
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = _other_user)
    AND (SELECT count(*) FROM public.conversation_participants p WHERE p.conversation_id = c.id) = 2
  LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.conversations (type, created_by) VALUES ('direct', v_me) RETURNING id INTO v_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (v_id, v_me, 'admin'), (v_id, _other_user, 'member');
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;

-- Directory of messageable users
CREATE OR REPLACE FUNCTION public.get_messageable_users()
RETURNS TABLE (user_id UUID, full_name TEXT, designation TEXT, role TEXT, source TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT p.id AS user_id,
           COALESCE(NULLIF(s.name_bn,''), NULLIF(ao.name_bn,''), p.full_name, '') AS full_name,
           COALESCE(NULLIF(s.designation,''), NULLIF(ao.designation,'')) AS designation,
           CASE WHEN s.id IS NOT NULL THEN 'staff'
                WHEN ao.id IS NOT NULL THEN 'administrative'
                ELSE 'user' END AS source
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.staff s WHERE s.user_id = p.id AND s.deleted_at IS NULL LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT a.* FROM public.administrative_officers a WHERE a.user_id = p.id AND a.deleted_at IS NULL LIMIT 1
    ) ao ON true
    WHERE p.id <> auth.uid()
  )
  SELECT b.user_id, b.full_name, b.designation,
         COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = b.user_id ORDER BY ur.role LIMIT 1), 'user') AS role,
         b.source
  FROM base b
  WHERE auth.uid() IS NOT NULL AND b.full_name <> ''
  ORDER BY b.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_messageable_users() TO authenticated;

-- Storage access for chat attachments
CREATE OR REPLACE FUNCTION public.can_access_storage_object(_user_id uuid, _bucket text, _object_path text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_seg TEXT;
BEGIN
  IF _user_id IS NULL OR _object_path IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'super_admin') OR public.has_role(_user_id,'admin') THEN
    RETURN true;
  END IF;
  v_first_seg := split_part(_object_path, '/', 1);

  IF _bucket = 'chat-attachments' THEN
    BEGIN
      RETURN public.is_conversation_participant(v_first_seg::uuid, _user_id);
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  IF _bucket = 'receipts' THEN
    IF public.is_accounts_staff(_user_id) THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.parent_accounts pa
      WHERE pa.user_id = _user_id AND pa.status IN ('approved','active')
        AND pa.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = _user_id AND s.student_id = v_first_seg
    ) THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'photos' THEN
    IF v_first_seg = 'public-uploads' THEN RETURN true; END IF;
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    IF EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = _user_id AND s.deleted_at IS NULL
        AND s.photo_url IS NOT NULL
        AND s.photo_url LIKE '%' || _object_path || '%'
    ) THEN RETURN true; END IF;
    IF public.has_role(_user_id,'teacher') AND _object_path LIKE 'staff/%' THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'staff-letters' THEN
    IF v_first_seg = _user_id::TEXT THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF _bucket = 'committee-attachments' THEN
    RETURN public.has_role(_user_id,'staff') OR public.has_role(_user_id,'teacher') OR public.has_role(_user_id,'administrative');
  END IF;

  RETURN false;
END;
$function$;

-- Realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;