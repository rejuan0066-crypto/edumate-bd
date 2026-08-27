import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMessageableUsers } from "@/hooks/useMessaging";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStarted: (conversationId: string) => void;
}

const NewConversationDialog = ({ open, onOpenChange, onStarted }: Props) => {
  const { data: users, isLoading } = useMessageableUsers();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users ?? [];
    if (!q) return list;
    return list.filter((u) =>
      [u.full_name, u.designation, u.role].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [users, search]);

  const start = async (userId: string) => {
    setBusy(userId);
    const { data, error } = await supabase.rpc("get_or_create_direct_conversation" as never, {
      _other_user: userId,
    } as never);
    setBusy(null);
    if (error) {
      toast.error("কথোপকথন শুরু করা যায়নি: " + error.message);
      return;
    }
    onStarted(data as unknown as string);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[38px]">
        <DialogHeader>
          <DialogTitle>নতুন মেসেজ</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, পদবি বা রোল দিয়ে খুঁজুন"
            className="pl-9"
          />
        </div>
        <ScrollArea className="max-h-[50vh] pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">কাউকে পাওয়া যায়নি</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => (
                <button
                  key={u.user_id}
                  type="button"
                  disabled={busy === u.user_id}
                  onClick={() => start(u.user_id)}
                  className="flex w-full items-center gap-3 rounded-[20px] border border-border/50 bg-background/40 p-3 text-left backdrop-blur transition hover:-translate-y-[3px] hover:border-primary/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {busy === u.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.full_name}</span>
                    {u.designation && (
                      <span className="block truncate text-xs text-muted-foreground">{u.designation}</span>
                    )}
                  </span>
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    {u.role}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
