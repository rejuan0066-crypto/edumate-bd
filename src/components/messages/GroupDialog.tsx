import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMessageableUsers, type ConversationRow } from "@/hooks/useMessaging";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When provided, the dialog edits this existing group. */
  conversation?: ConversationRow | null;
  onSaved: (conversationId: string) => void;
}

const GroupDialog = ({ open, onOpenChange, conversation, onSaved }: Props) => {
  const { user } = useAuth();
  const { data: users, isLoading } = useMessageableUsers();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(conversation?.title ?? "");
    setDescription(conversation?.description ?? "");
    setSelected(
      (conversation?.participants ?? [])
        .map((p) => p.user_id)
        .filter((id) => id !== user?.id),
    );
    setSearch("");
  }, [open, conversation, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users ?? [];
    if (!q) return list;
    return list.filter((u) =>
      [u.full_name, u.designation, u.role].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [users, search]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    if (!title.trim()) {
      toast.error("গ্রুপের নাম দিন");
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      let convId = conversation?.id;
      if (convId) {
        const { error } = await supabase
          .from("conversations" as never)
          .update({ title: title.trim(), description: description.trim() || null } as never)
          .eq("id", convId);
        if (error) throw error;

        const existing = (conversation?.participants ?? []).map((p) => p.user_id);
        const target = [...new Set([...selected, user.id])];
        const toAdd = target.filter((id) => !existing.includes(id));
        const toRemove = existing.filter((id) => id !== user.id && !target.includes(id));
        if (toAdd.length) {
          const { error: e2 } = await supabase.from("conversation_participants" as never).insert(
            toAdd.map((id) => ({ conversation_id: convId, user_id: id, role: "member" })) as never,
          );
          if (e2) throw e2;
        }
        if (toRemove.length) {
          const { error: e3 } = await supabase
            .from("conversation_participants" as never)
            .delete()
            .eq("conversation_id", convId)
            .in("user_id", toRemove);
          if (e3) throw e3;
        }
      } else {
        const { data, error } = await supabase
          .from("conversations" as never)
          .insert({
            type: "group",
            title: title.trim(),
            description: description.trim() || null,
            created_by: user.id,
          } as never)
          .select("id")
          .single();
        if (error) throw error;
        convId = (data as unknown as { id: string }).id;
        const rows = [...new Set([...selected, user.id])].map((id) => ({
          conversation_id: convId,
          user_id: id,
          role: id === user.id ? "admin" : "member",
        }));
        const { error: e2 } = await supabase
          .from("conversation_participants" as never)
          .insert(rows as never);
        if (e2) throw e2;
      }
      toast.success(conversation ? "গ্রুপ আপডেট হয়েছে" : "গ্রুপ তৈরি হয়েছে");
      onSaved(convId!);
      onOpenChange(false);
    } catch (err) {
      toast.error("সংরক্ষণ করা যায়নি: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[38px]">
        <DialogHeader>
          <DialogTitle>{conversation ? "গ্রুপ সম্পাদনা" : "নতুন গ্রুপ"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="গ্রুপের নাম" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="বর্ণনা (ঐচ্ছিক)"
            rows={2}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="সদস্য খুঁজুন"
              className="pl-9"
            />
          </div>
          <ScrollArea className="max-h-[38vh] pr-2">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((u) => (
                  <label
                    key={u.user_id}
                    className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-border/50 bg-background/40 p-2.5 backdrop-blur transition hover:-translate-y-[2px]"
                  >
                    <Checkbox
                      checked={selected.includes(u.user_id)}
                      onCheckedChange={() => toggle(u.user_id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{u.full_name}</span>
                      {u.designation && (
                        <span className="block truncate text-xs text-muted-foreground">{u.designation}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
          <p className="text-xs text-muted-foreground">{selected.length} জন সদস্য নির্বাচিত</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            বাতিল
          </Button>
          <Button onClick={save} disabled={saving} className="rounded-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            সংরক্ষণ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupDialog;
