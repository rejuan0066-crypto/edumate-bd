import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search, ScrollText, Undo2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

export default function AdminCommitteeAuditLog() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const qc = useQueryClient();

  const [staffSearch, setStaffSearch] = useState("");
  const [committeeSearch, setCommitteeSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["committee-audit-log", staffSearch, committeeSearch, startDate, endDate, page],
    queryFn: async () => {
      let q = supabase
        .from("committee_audit_log" as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (staffSearch.trim()) q = q.ilike("member_name", `%${staffSearch.trim()}%`);
      if (committeeSearch.trim()) q = q.ilike("committee_name", `%${committeeSearch.trim()}%`);
      if (startDate) q = q.gte("created_at", new Date(startDate).toISOString());
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        q = q.lte("created_at", e.toISOString());
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data as any[], count: count || 0 };
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (entry: any) => {
      // Reverse the action
      if (entry.action === "added") {
        // Soft-delete the member
        const { error } = await supabase
          .from("committee_members")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entry.member_id);
        if (error) throw error;
      } else if (entry.action === "removed") {
        // Restore (clear deleted_at)
        const { error } = await supabase
          .from("committee_members")
          .update({ deleted_at: null, is_active: true })
          .eq("id", entry.member_id);
        if (error) throw error;
      } else if (entry.action === "deactivated") {
        const { error } = await supabase
          .from("committee_members")
          .update({ is_active: true })
          .eq("id", entry.member_id);
        if (error) throw error;
      } else if (entry.action === "reactivated") {
        const { error } = await supabase
          .from("committee_members")
          .update({ is_active: false })
          .eq("id", entry.member_id);
        if (error) throw error;
      } else if (entry.action === "updated" && entry.details) {
        const { error } = await supabase
          .from("committee_members")
          .update({
            designation: entry.details.old_designation || entry.designation,
            staff_id: entry.details.old_staff_id || null,
          })
          .eq("id", entry.member_id);
        if (error) throw error;
      } else {
        throw new Error("This action cannot be undone automatically.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committee-audit-log"] });
      qc.invalidateQueries({ queryKey: ["committee-members"] });
      qc.invalidateQueries({ queryKey: ["committee-staff-ids"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["salary-staff"] });
      toast.success(bn ? "পূর্বাবস্থায় ফেরানো হয়েছে" : "Undone");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  const actionBadge = (a: string) => {
    const map: Record<string, string> = {
      added: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      removed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      deactivated: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      reactivated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      updated: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
      staff_link_changed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return map[a] || "bg-gray-100 text-gray-800";
  };

  const undoableActions = ["added", "removed", "deactivated", "reactivated", "updated"];

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-6 text-white shadow-[0_20px_60px_-20px_rgba(6,78,59,0.5)]">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg">
              <ScrollText className="w-7 h-7 text-emerald-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{bn ? "কমিটি অডিট লগ" : "Committee Audit Log"}</h1>
              <p className="text-sm text-emerald-100/80 mt-1">
                {bn ? "সব কমিটি যোগ/সরানোর সম্পূর্ণ ইতিহাস" : "Complete history of committee changes"}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 rounded-[24px] backdrop-blur-xl bg-card/60 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? "স্টাফের নাম..." : "Staff name..."}
                className="pl-9"
                value={staffSearch}
                onChange={(e) => { setStaffSearch(e.target.value); setPage(0); }}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? "কমিটির নাম..." : "Committee name..."}
                className="pl-9"
                value={committeeSearch}
                onChange={(e) => { setCommitteeSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} />
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} />
          </div>
        </Card>

        {/* Table */}
        <Card className="rounded-[24px] overflow-hidden backdrop-blur-xl bg-card/60 border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">{bn ? "তারিখ" : "Date"}</th>
                  <th className="text-left px-4 py-3 font-semibold">{bn ? "স্টাফ" : "Staff"}</th>
                  <th className="text-left px-4 py-3 font-semibold">{bn ? "কমিটি" : "Committee"}</th>
                  <th className="text-left px-4 py-3 font-semibold">{bn ? "পদবি" : "Designation"}</th>
                  <th className="text-left px-4 py-3 font-semibold">{bn ? "অ্যাকশন" : "Action"}</th>
                  <th className="text-left px-4 py-3 font-semibold">{bn ? "করেছেন" : "By"}</th>
                  <th className="text-right px-4 py-3 font-semibold">{bn ? "আনডু" : "Undo"}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{bn ? "লোড হচ্ছে..." : "Loading..."}</td></tr>
                ) : !data?.rows.length ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{bn ? "কোনো রেকর্ড নেই" : "No records"}</td></tr>
                ) : data.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</td>
                    <td className="px-4 py-3 font-medium">{r.member_name || "—"}</td>
                    <td className="px-4 py-3">{r.committee_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.designation || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${actionBadge(r.action)} text-xs font-semibold`}>{r.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.performed_by_email || "system"}</td>
                    <td className="px-4 py-3 text-right">
                      {undoableActions.includes(r.action) && r.member_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={undoMutation.isPending}
                          onClick={() => {
                            if (window.confirm(bn ? "এই পরিবর্তন আনডু করবেন?" : "Undo this change?")) {
                              undoMutation.mutate(r);
                            }
                          }}
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1" />
                          {bn ? "আনডু" : "Undo"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                {bn ? `পৃষ্ঠা ${page + 1} / ${totalPages} • মোট ${data?.count}` : `Page ${page + 1} of ${totalPages} • Total ${data?.count}`}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
