import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Plus,
  Users,
  Search,
  Send,
  Paperclip,
  Loader2,
  ArrowLeft,
  Trash2,
  Settings2,
  Bell,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/contexts/ConfirmContext";
import {
  useConversations,
  useMessages,
  useMarkRead,
  useMessageableUsers,
  type ChatAttachment,
  type ConversationRow,
} from "@/hooks/useMessaging";
import NewConversationDialog from "@/components/messages/NewConversationDialog";
import GroupDialog from "@/components/messages/GroupDialog";
import AttachmentView from "@/components/messages/AttachmentView";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const AdminMessages = () => {
  const { user, role } = useAuth();
  const confirm = useConfirm();
  const isAdmin = role === "admin" || role === "super_admin";

  const { data: conversations, isLoading, totalUnread } = useConversations();
  const { data: directory } = useMessageableUsers();
  const markRead = useMarkRead();
  const push = usePushNotifications();

  // Open a conversation directly from a notification link (?c=<id>)
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("c");
    if (cid) setActiveId(cid);
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ConversationRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => (conversations ?? []).find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const { data: messages, isLoading: msgLoading } = useMessages(activeId);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    (directory ?? []).forEach((u) => map.set(u.user_id, u.full_name));
    return map;
  }, [directory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = conversations ?? [];
    if (!q) return list;
    return list.filter((c) => c.displayTitle.toLowerCase().includes(q));
  }, [conversations, search]);

  useEffect(() => {
    if (activeId) markRead.mutate(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages?.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, activeId]);

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const tooBig = arr.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      toast.error(`ফাইল ২০MB এর বেশি হতে পারবে না: ${tooBig.name}`);
      return;
    }
    setFiles((prev) => [...prev, ...arr]);
  };

  const send = async () => {
    if (!activeId || !user?.id) return;
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    try {
      const attachments: ChatAttachment[] = [];
      for (const file of files) {
        const safe = file.name.replace(/[^\w.\-\u0980-\u09FF]+/g, "_");
        const path = `${activeId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage.from("chat-attachments").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) throw error;
        attachments.push({
          path,
          name: file.name,
          size: file.size,
          mime: file.type || "application/octet-stream",
        });
      }
      const { error: insErr } = await supabase.from("chat_messages" as never).insert({
        conversation_id: activeId,
        sender_id: user.id,
        body: body.trim() || null,
        attachments,
      } as never);
      if (insErr) throw insErr;

      // Notify the other participants (push + in-app bell). Failure must not block sending.
      const previewText = body.trim() || (attachments.length ? `${attachments.length}টি ফাইল পাঠানো হয়েছে` : "");
      supabase.functions
        .invoke("notify-message", { body: { conversation_id: activeId, preview: previewText } })
        .catch(() => {});

      setBody("");
      setFiles([]);
    } catch (err) {
      toast.error("মেসেজ পাঠানো যায়নি: " + (err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    const ok = await confirm({
      title: "মেসেজ মুছবেন?",
      description: "এই মেসেজটি সবার কাছ থেকে সরে যাবে।",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("chat_messages" as never)
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) toast.error("মুছা যায়নি: " + error.message);
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-4 p-2 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold">বার্তা</h1>
              <p className="text-xs text-muted-foreground">
                স্টাফ, শিক্ষক ও অ্যাডমিনদের মধ্যে অভ্যন্তরীণ মেসেজ
                {totalUnread > 0 && ` • ${totalUnread} টি অপঠিত`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {push.supported && !push.subscribed && (
              <Button
                variant="outline"
                className="rounded-full"
                disabled={push.loading}
                onClick={async () => {
                  const ok = await push.subscribe();
                  if (ok) toast.success("মোবাইলে বার্তার নোটিফিকেশন চালু হয়েছে");
                  else toast.error("নোটিফিকেশন চালু করা যায়নি — ব্রাউজারে অনুমতি দিন");
                }}
              >
                <Bell className="mr-1.5 h-4 w-4" /> নোটিফিকেশন চালু করুন
              </Button>
            )}
            <Button onClick={() => setNewOpen(true)} className="rounded-full">
              <Plus className="mr-1.5 h-4 w-4" /> নতুন মেসেজ
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setEditGroup(null);
                  setGroupOpen(true);
                }}
              >
                <Users className="mr-1.5 h-4 w-4" /> নতুন গ্রুপ
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
          {/* Conversation list */}
          <Card
            className={`rounded-[45px] border-border/50 bg-background/60 backdrop-blur ${
              activeId ? "hidden lg:block" : ""
            }`}
          >
            <CardContent className="space-y-3 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="কথোপকথন খুঁজুন"
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[62vh] pr-2">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">কোনো কথোপকথন নেই</p>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={`flex w-full items-center gap-3 rounded-[20px] border p-3 text-left backdrop-blur transition hover:-translate-y-[3px] ${
                          c.id === activeId
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/50 bg-background/40"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {c.type === "group" ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{c.displayTitle}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.lastMessage?.body ||
                              (c.lastMessage?.attachments?.length ? "📎 সংযুক্তি" : "কোনো মেসেজ নেই")}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(c.last_message_at), "dd/MM hh:mm a")}
                          </span>
                          {c.unreadCount > 0 && (
                            <Badge className="rounded-full px-2 py-0 text-[10px]">{c.unreadCount}</Badge>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Thread */}
          <Card
            className={`rounded-[45px] border-border/50 bg-background/60 backdrop-blur ${
              activeId ? "" : "hidden lg:block"
            }`}
          >
            <CardContent className="flex h-[72vh] flex-col gap-3 p-4">
              {!active ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                  <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm">একটি কথোপকথন বেছে নিন</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setActiveId(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{active.displayTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {active.type === "group"
                          ? `${active.participants.length} জন সদস্য`
                          : "সরাসরি বার্তা"}
                      </p>
                    </div>
                    {isAdmin && active.type === "group" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setEditGroup(active);
                          setGroupOpen(true);
                        }}
                      >
                        <Settings2 className="mr-1.5 h-3.5 w-3.5" /> সম্পাদনা
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="flex-1 pr-2">
                    {msgLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(messages ?? []).map((m) => {
                          const mine = m.sender_id === user?.id;
                          const senderName = mine ? "আপনি" : nameById.get(m.sender_id) || "ব্যবহারকারী";
                          return (
                            <div
                              key={m.id}
                              className={`group flex ${mine ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-[20px] border px-3.5 py-2.5 backdrop-blur ${
                                  mine
                                    ? "border-primary/40 bg-primary/10"
                                    : "border-border/50 bg-background/50"
                                }`}
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-[11px] font-medium opacity-80">{senderName}</span>
                                  <span className="text-[10px] opacity-60">
                                    {format(new Date(m.created_at), "dd/MM/yyyy hh:mm a")}
                                  </span>
                                  {(mine || isAdmin) && !m.deleted_at && (
                                    <button
                                      type="button"
                                      onClick={() => deleteMessage(m.id)}
                                      className="opacity-0 transition group-hover:opacity-70"
                                      aria-label="মেসেজ মুছুন"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                {m.deleted_at ? (
                                  <p className="text-xs italic opacity-60">মেসেজটি মুছে ফেলা হয়েছে</p>
                                ) : (
                                  <>
                                    {m.body && (
                                      <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                                    )}
                                    {(m.attachments ?? []).map((a) => (
                                      <AttachmentView key={a.path} attachment={a} />
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <span
                          key={`${f.name}-${i}`}
                          className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs"
                        >
                          {f.name}
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            aria-label="সরান"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex w-full flex-nowrap items-end gap-2 border-t border-border/50 pt-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        pickFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="ফাইল সংযুক্ত করুন"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder="মেসেজ লিখুন…"
                      className="min-h-[44px] w-full min-w-0 flex-1 resize-none rounded-[20px]"
                    />
                    <Button
                      onClick={send}
                      disabled={sending || (!body.trim() && files.length === 0)}
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen} onStarted={setActiveId} />
      <GroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        conversation={editGroup}
        onSaved={setActiveId}
      />
    </AdminLayout>
  );
};

export default AdminMessages;
