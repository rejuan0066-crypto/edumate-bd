import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChatAttachment {
  path: string;
  name: string;
  size: number;
  mime: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachments: ChatAttachment[];
  deleted_at: string | null;
  created_at: string;
}

export interface ConversationParticipant {
  user_id: string;
  role: string;
  last_read_at: string;
}

export interface ConversationRow {
  id: string;
  type: "direct" | "group";
  title: string | null;
  description: string | null;
  created_by: string | null;
  last_message_at: string;
  participants: ConversationParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  displayTitle: string;
  otherUserId: string | null;
}

export interface DirectoryUser {
  user_id: string;
  full_name: string;
  designation: string | null;
  role: string;
  source: string;
}

export function useMessageableUsers() {
  return useQuery({
    queryKey: ["messageable-users"],
    queryFn: async (): Promise<DirectoryUser[]> => {
      const { data, error } = await supabase.rpc("get_messageable_users" as never);
      if (error) throw error;
      return (data ?? []) as unknown as DirectoryUser[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** All conversations of the current user, enriched with last message + unread count. */
export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ConversationRow[]> => {
      const { data: convs, error } = await supabase
        .from("conversations" as never)
        .select("id, type, title, description, created_by, last_message_at")
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const list = (convs ?? []) as unknown as ConversationRow[];
      if (!list.length) return [];

      const ids = list.map((c) => c.id);

      const [{ data: parts }, { data: msgs }, { data: profiles }] = await Promise.all([
        supabase
          .from("conversation_participants" as never)
          .select("conversation_id, user_id, role, last_read_at")
          .in("conversation_id", ids),
        supabase
          .from("chat_messages" as never)
          .select("id, conversation_id, sender_id, body, attachments, deleted_at, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("profiles" as never).select("id, full_name"),
      ]);

      const nameById = new Map<string, string>();
      ((profiles ?? []) as unknown as { id: string; full_name: string | null }[]).forEach((p) =>
        nameById.set(p.id, p.full_name || ""),
      );

      const partsByConv = new Map<string, ConversationParticipant[]>();
      ((parts ?? []) as unknown as (ConversationParticipant & { conversation_id: string })[]).forEach((p) => {
        const arr = partsByConv.get(p.conversation_id) ?? [];
        arr.push({ user_id: p.user_id, role: p.role, last_read_at: p.last_read_at });
        partsByConv.set(p.conversation_id, arr);
      });

      const msgsByConv = new Map<string, ChatMessage[]>();
      ((msgs ?? []) as unknown as ChatMessage[]).forEach((m) => {
        const arr = msgsByConv.get(m.conversation_id) ?? [];
        arr.push(m);
        msgsByConv.set(m.conversation_id, arr);
      });

      return list.map((c) => {
        const participants = partsByConv.get(c.id) ?? [];
        const mine = participants.find((p) => p.user_id === user?.id);
        const convMsgs = msgsByConv.get(c.id) ?? [];
        const lastMessage = convMsgs.find((m) => !m.deleted_at) ?? null;
        const unreadCount = convMsgs.filter(
          (m) =>
            !m.deleted_at &&
            m.sender_id !== user?.id &&
            mine &&
            new Date(m.created_at) > new Date(mine.last_read_at),
        ).length;
        const other = c.type === "direct" ? participants.find((p) => p.user_id !== user?.id) : undefined;
        const displayTitle =
          c.type === "group"
            ? c.title || "গ্রুপ"
            : (other && nameById.get(other.user_id)) || "ব্যবহারকারী";
        return {
          ...c,
          participants,
          lastMessage,
          unreadCount,
          displayTitle,
          otherUserId: other?.user_id ?? null,
        };
      });
    },
  });

  // Realtime: refresh list on any new message / conversation change
  useEffect(() => {
    if (!user?.id) return;
    const channelName = `messaging-conversations-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let channel: any = null;
    try {
      channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error in useConversations:', e);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [user?.id, queryClient]);

  const totalUnread = useMemo(
    () => (query.data ?? []).reduce((sum, c) => sum + c.unreadCount, 0),
    [query.data],
  );

  return { ...query, totalUnread };
}

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages" as never)
        .select("id, conversation_id, sender_id, body, attachments, deleted_at, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    const channelName = `messaging-thread-${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let channel: any = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
          () => queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] }),
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error in useMessages:', e);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useMarkRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("conversation_participants" as never)
        .update({ last_read_at: new Date().toISOString() } as never)
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] }),
  });
}
