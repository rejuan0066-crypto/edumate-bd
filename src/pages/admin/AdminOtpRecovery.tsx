import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldAlert,
  RefreshCw,
  Loader2,
  KeyRound,
  LogOut,
  ShieldCheck,
  Search,
} from "lucide-react";
import { useAdminOtpGate } from "@/hooks/useAdminOtpGate";
import OtpVerificationDialog from "@/components/OtpVerificationDialog";
import { format } from "date-fns";

type LockedUser = {
  email: string;
  total_codes_24h: number;
  codes_last_hour: number;
  max_attempts_seen: number;
  locked_codes: number;
  last_purpose: string;
  last_attempt_at: string;
  is_locked: boolean;
};

export default function AdminOtpRecovery() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<LockedUser[]>([]);
  const [thresholds, setThresholds] = useState<{ maxAttempts: number; hourlyLimit: number }>({
    maxAttempts: 3,
    hourlyLimit: 5,
  });
  const [search, setSearch] = useState("");

  const [dialog, setDialog] = useState<{
    open: boolean;
    user?: LockedUser;
    action?: "reset" | "revoke" | "full";
  }>({ open: false });
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [working, setWorking] = useState(false);

  const otpGate = useAdminOtpGate();

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-otp-recovery", {
        body: { action: "list_locked" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load");
      setList(data.locked || []);
      setThresholds(data.thresholds || { maxAttempts: 3, hourlyLimit: 5 });
    } catch (e: any) {
      toast.error(e?.message || "Failed to load locked users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAction = (user: LockedUser, action: "reset" | "revoke" | "full") => {
    setDialog({ open: true, user, action });
    setReason("");
    setConfirmEmail("");
  };

  const performAction = async () => {
    if (!dialog.user || !dialog.action) return;
    if (confirmEmail.trim().toLowerCase() !== dialog.user.email.toLowerCase()) {
      toast.error("Email confirmation does not match");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Please provide a reason (min 5 chars) for the audit log");
      return;
    }

    // Identity verification: require admin OTP before destructive recovery
    const verified = await ensureOtp("OTP Recovery action");
    if (!verified) return;

    setWorking(true);
    try {
      const actionMap = {
        reset: "reset_attempts",
        revoke: "revoke_sessions",
        full: "full_recover",
      } as const;
      const { data, error } = await supabase.functions.invoke("admin-otp-recovery", {
        body: {
          action: actionMap[dialog.action],
          email: dialog.user.email,
          reason: reason.trim(),
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Action failed");
      toast.success(data.message || "Action completed");
      setDialog({ open: false });
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setWorking(false);
    }
  };

  const filtered = list.filter((u) =>
    u.email.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" /> OTP Recovery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resolve locked OTP users by clearing failed attempts or revoking sessions. All actions
            require admin OTP verification and are written to the audit log.
          </p>
        </div>
        <Button onClick={load} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="card-elevated p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Max attempts: {thresholds.maxAttempts}</Badge>
          <Badge variant="outline">Hourly limit: {thresholds.hourlyLimit}</Badge>
        </div>
      </div>

      <div className="card-elevated p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading locked users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mb-2 text-emerald-500" />
            <p className="text-sm">No locked OTP users in the last 24 hours.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: "0 8px" }}>
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Attempts</th>
                  <th className="text-left px-4 py-2">Codes (1h / 24h)</th>
                  <th className="text-left px-4 py-2">Last Purpose</th>
                  <th className="text-left px-4 py-2">Last Activity</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.email} className="bg-muted/20 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 rounded-l-[20px] font-medium text-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.is_locked ? (
                        <Badge variant="destructive">Locked</Badge>
                      ) : (
                        <Badge variant="secondary">At risk</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">{u.max_attempts_seen}</td>
                    <td className="px-4 py-3">
                      {u.codes_last_hour} / {u.total_codes_24h}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.last_purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {u.last_attempt_at ? format(new Date(u.last_attempt_at), "dd/MM/yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-4 py-3 rounded-r-[20px] text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openAction(u, "reset")}>
                          <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset attempts
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAction(u, "revoke")}>
                          <LogOut className="w-3.5 h-3.5 mr-1" /> Revoke sessions
                        </Button>
                        <Button size="sm" variant="default" onClick={() => openAction(u, "full")}>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Full recover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog({ open: false })}>
        <DialogContent className="rounded-[38px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              {dialog.action === "reset" && "Reset OTP attempts"}
              {dialog.action === "revoke" && "Revoke all sessions"}
              {dialog.action === "full" && "Full recovery"}
            </DialogTitle>
            <DialogDescription>
              {dialog.action === "reset" &&
                "Clears all unused OTP codes for this user, removing the lock. The user can request a fresh OTP immediately."}
              {dialog.action === "revoke" &&
                "Signs the user out of all devices. Requires the user to log in again."}
              {dialog.action === "full" &&
                "Clears OTP locks AND revokes all active sessions. Use when an account is suspected to be compromised."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
              <p className="text-xs text-muted-foreground">User</p>
              <p className="font-medium text-foreground">{dialog.user?.email}</p>
            </div>

            <div>
              <Label className="text-xs">Reason (audit log)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. User confirmed identity by phone, requested unlock"
                className="bg-background mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">
                Type the user's email to confirm: <span className="font-mono">{dialog.user?.email}</span>
              </Label>
              <Input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={dialog.user?.email}
                className="bg-background mt-1"
              />
            </div>

            <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-400">
              You'll be asked to verify your own admin OTP before this action runs.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })} disabled={working}>
              Cancel
            </Button>
            <Button onClick={performAction} disabled={working}>
              {working ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Confirm & verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
