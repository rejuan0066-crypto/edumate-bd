import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import {
  Search,
  ScrollText,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import CommitteeAuditDetailsDrawer from "@/components/CommitteeAuditDetailsDrawer";
import OtpVerificationDialog from "@/components/OtpVerificationDialog";
import { useAdminOtpGate } from "@/hooks/useAdminOtpGate";
import {
  exportStaffCommitteeHistoryCSV,
  exportStaffCommitteeHistoryPDF,
} from "@/lib/exportCommitteeHistory";

const PAGE_SIZE = 25;

type SortKey = "newest" | "oldest" | "staff" | "committee";

const ACTION_OPTIONS = [
  { key: "added", label: "Add" },
  { key: "removed", label: "Remove" },
  { key: "reactivated", label: "Activate" },
  { key: "deactivated", label: "Deactivate" },
  { key: "updated", label: "Update" },
  { key: "staff_link_changed", label: "Staff Link" },
];

export default function AdminCommitteeAuditLog() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const qc = useQueryClient();

  const [staffSearch, setStaffSearch] = useState("");
  const [committeeSearch, setCommitteeSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [actionFilter, setActionFilter] = useState<Set<string>>(new Set());
  const [drawerEntry, setDrawerEntry] = useState<any | null>(null);

  // Undo confirmation state
  const [undoTarget, setUndoTarget] = useState<any | null>(null);
  const [undoCurrent, setUndoCurrent] = useState<any | null>(null);

  const otpGate = useAdminOtpGate();

  const { data, isLoading } = useQuery({
    queryKey: [
      "committee-audit-log",
      staffSearch,
      committeeSearch,
      startDate,
      endDate,
      page,
      sortKey,
      Array.from(actionFilter).sort().join(","),
    ],
    queryFn: async () => {
      const orderCol =
        sortKey === "staff"
          ? "member_name"
          : sortKey === "committee"
          ? "committee_name"
          : "created_at";
      const ascending = sortKey === "oldest" || sortKey === "staff" || sortKey === "committee";

      let q = supabase
        .from("committee_audit_log" as any)
        .select("*", { count: "exact" })
        .order(orderCol, { ascending })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (staffSearch.trim()) q = q.ilike("member_name", `%${staffSearch.trim()}%`);
      if (committeeSearch.trim()) q = q.ilike("committee_name", `%${committeeSearch.trim()}%`);
      if (startDate) q = q.gte("created_at", new Date(startDate).toISOString());
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        q = q.lte("created_at", e.toISOString());
      }
      if (actionFilter.size > 0) q = q.in("action", Array.from(actionFilter));

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data as any[], count: count || 0 };
    },
  });

  // Server-side guarded undo via RPC
  const undoMutation = useMutation({
    mutationFn: async ({
      entry,
      currentSnapshot,
    }: {
      entry: any;
      currentSnapshot: { is_active: boolean; deleted: boolean } | null;
    }) => {
      const { data, error } = await supabase.rpc("undo_committee_change" as any, {
        p_audit_id: entry.id,
        p_expected_is_active: currentSnapshot?.is_active ?? null,
        p_expected_deleted: currentSnapshot?.deleted ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committee-audit-log"] });
      qc.invalidateQueries({ queryKey: ["committee-members"] });
      qc.invalidateQueries({ queryKey: ["committee-staff-ids"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["salary-staff"] });
      toast.success(bn ? "পূর্বাবস্থায় ফেরানো হয়েছে" : "Undone");
      setUndoTarget(null);
      setUndoCurrent(null);
    },
    onError: (e: any) => {
      const msg = e.message || "";
      if (msg.includes("STATE_MISMATCH")) {
        toast.error(
          bn
            ? "অবস্থা পরিবর্তিত হয়েছে — আনডু বাতিল"
            : "State changed since audit — undo aborted"
        );
      } else {
        toast.error(msg);
      }
    },
  });

  // When user clicks Undo, fetch fresh state, show confirm dialog
  const initiateUndo = async (entry: any) => {
    if (!entry.member_id) {
      toast.error(bn ? "মেম্বার রেকর্ড নেই" : "No member ref");
      return;
    }
    const { data } = await supabase
      .from("committee_members")
      .select("is_active, deleted_at")
      .eq("id", entry.member_id)
      .maybeSingle();
    setUndoCurrent(
      data
        ? { is_active: !!data.is_active, deleted: !!data.deleted_at }
        : null
    );
    setUndoTarget(entry);
  };

  const confirmUndo = () => {
    if (!undoTarget) return;
    otpGate.requireOtp(() =>
      undoMutation.mutate({ entry: undoTarget, currentSnapshot: undoCurrent })
    );
  };

  // Export current filtered audit log (global, no staff filter)
  const exportLog = (kind: "csv" | "pdf") => {
    otpGate.requireOtp(async () => {
      try {
        const filters = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: "all" as const,
          actions: actionFilter.size > 0 ? Array.from(actionFilter) : undefined,
        };
        if (kind === "csv")
          await exportStaffCommitteeHistoryCSV(null, "All-Committee-Audit", filters);
        else await exportStaffCommitteeHistoryPDF(null, "All-Committee-Audit", filters);
        toast.success(bn ? "ডাউনলোড হয়েছে" : "Downloaded");
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  const actionBadge = (a: string) => {
    const map: Record<string, string> = {
      added: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      removed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      deactivated: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      reactivated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      updated: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
      staff_link_changed:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return map[a] || "bg-gray-100 text-gray-800";
  };

  const undoableActions = ["added", "removed", "deactivated", "reactivated", "updated"];

  const toggleAction = (key: string) => {
    setActionFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setPage(0);
  };

  // Snapshot summary for undo confirm dialog
  const undoSummary = useMemo(() => {
    if (!undoTarget) return null;
    return {
      action: undoTarget.action,
      committee: undoTarget.committee_name,
      staff: undoTarget.member_name,
      when: format(new Date(undoTarget.created_at), "dd/MM/yyyy HH:mm"),
      currentState: undoCurrent
        ? undoCurrent.deleted
          ? "Removed"
          : undoCurrent.is_active
          ? "Active"
          : "Inactive"
        : "Missing",
    };
  }, [undoTarget, undoCurrent]);

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-6 text-white shadow-[0_20px_60px_-20px_rgba(6,78,59,0.5)]">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg">
                <ScrollText className="w-7 h-7 text-emerald-950" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {bn ? "কমিটি অডিট লগ" : "Committee Audit Log"}
                </h1>
                <p className="text-sm text-emerald-100/80 mt-1">
                  {bn
                    ? "সব কমিটি যোগ/সরানোর সম্পূর্ণ ইতিহাস"
                    : "Complete history of committee changes"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportLog("csv")}
                className="gap-1"
              >
                <Download className="w-4 h-4" /> CSV
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportLog("pdf")}
                className="gap-1"
              >
                <FileText className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 rounded-[24px] backdrop-blur-xl bg-card/60 border-border/50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? "স্টাফের নাম..." : "Staff name..."}
                className="pl-9"
                value={staffSearch}
                onChange={(e) => {
                  setStaffSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? "কমিটির নাম..." : "Committee name..."}
                className="pl-9"
                value={committeeSearch}
                onChange={(e) => {
                  setCommitteeSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
            />
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{bn ? "নতুন আগে" : "Newest first"}</SelectItem>
                <SelectItem value="oldest">{bn ? "পুরাতন আগে" : "Oldest first"}</SelectItem>
                <SelectItem value="staff">{bn ? "স্টাফ A→Z" : "Staff A→Z"}</SelectItem>
                <SelectItem value="committee">
                  {bn ? "কমিটি A→Z" : "Committee A→Z"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action quick filter */}
          <div className="flex flex-wrap gap-2 items-center pt-1">
            <span className="text-xs text-muted-foreground mr-1">
              {bn ? "অ্যাকশন:" : "Action:"}
            </span>
            {ACTION_OPTIONS.map((opt) => {
              const on = actionFilter.has(opt.key);
              return (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={on ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => toggleAction(opt.key)}
                >
                  {opt.label}
                </Button>
              );
            })}
            {actionFilter.size > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setActionFilter(new Set());
                  setPage(0);
                }}
              >
                {bn ? "মুছুন" : "Clear"}
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="rounded-[24px] overflow-hidden backdrop-blur-xl bg-card/60 border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    {bn ? "তারিখ" : "Date"}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    {bn ? "স্টাফ" : "Staff"}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    {bn ? "কমিটি" : "Committee"}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    {bn ? "পদবি" : "Designation"}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    {bn ? "অ্যাকশন" : "Action"}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    {bn ? "করেছেন" : "By"}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    {bn ? "কাজ" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {bn ? "লোড হচ্ছে..." : "Loading..."}
                    </td>
                  </tr>
                ) : !data?.rows.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {bn ? "কোনো রেকর্ড নেই" : "No records"}
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-border/40 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.member_name || "—"}</td>
                      <td className="px-4 py-3">{r.committee_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.designation || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${actionBadge(r.action)} text-xs font-semibold`}
                        >
                          {r.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.performed_by_email || "system"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setDrawerEntry(r)}
                            title={bn ? "বিস্তারিত" : "Details"}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {undoableActions.includes(r.action) && r.member_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={undoMutation.isPending}
                              onClick={() => initiateUndo(r)}
                            >
                              <Undo2 className="w-3.5 h-3.5 mr-1" />
                              {bn ? "আনডু" : "Undo"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                {bn
                  ? `পৃষ্ঠা ${page + 1} / ${totalPages} • মোট ${data?.count}`
                  : `Page ${page + 1} of ${totalPages} • Total ${data?.count}`}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Details Drawer */}
      <CommitteeAuditDetailsDrawer
        open={!!drawerEntry}
        onOpenChange={(o) => !o && setDrawerEntry(null)}
        entry={drawerEntry}
      />

      {/* Undo Confirm Dialog with state-snapshot */}
      <AlertDialog
        open={!!undoTarget}
        onOpenChange={(o) => {
          if (!o) {
            setUndoTarget(null);
            setUndoCurrent(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Undo2 className="w-5 h-5" />
              {bn ? "পরিবর্তন আনডু করবেন?" : "Undo this change?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-1">
                {undoSummary && (
                  <div className="rounded-lg bg-muted p-3 text-sm space-y-1 text-foreground">
                    <div>
                      <strong>{bn ? "অ্যাকশন:" : "Action:"}</strong> {undoSummary.action}
                    </div>
                    <div>
                      <strong>{bn ? "কমিটি:" : "Committee:"}</strong>{" "}
                      {undoSummary.committee}
                    </div>
                    <div>
                      <strong>{bn ? "স্টাফ:" : "Staff:"}</strong> {undoSummary.staff}
                    </div>
                    <div>
                      <strong>{bn ? "কখন:" : "When:"}</strong> {undoSummary.when}
                    </div>
                    <div className="pt-1 border-t border-border/40">
                      <strong>{bn ? "বর্তমান অবস্থা:" : "Current state:"}</strong>{" "}
                      <Badge variant="outline">{undoSummary.currentState}</Badge>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 text-xs p-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {bn
                      ? "সার্ভার যাচাই করবে যে অবস্থা এখনো অডিট অনুযায়ী আছে। ওটিপি (২FA) লাগবে।"
                      : "Server will verify the state still matches the audit entry. OTP (2FA) is required."}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{bn ? "বাতিল" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo}>
              {bn ? "আনডু নিশ্চিত করুন" : "Confirm Undo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* OTP Gate Dialog */}
      <OtpVerificationDialog
        open={otpGate.open}
        onOpenChange={otpGate.setOpen}
        email={otpGate.email}
        purpose="email_verification"
        onVerified={otpGate.onVerified}
        title={bn ? "সংবেদনশীল কাজ যাচাই" : "Verify Sensitive Action"}
        description={
          bn
            ? "এই কাজটি সম্পন্ন করতে ওটিপি যাচাই দরকার।"
            : "OTP verification is required to perform this action."
        }
      />
    </AdminLayout>
  );
}
