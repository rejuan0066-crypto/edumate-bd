import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, ExternalLink, User, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry: any | null;
}

const StatusPill = ({ active, deleted }: { active: boolean; deleted: boolean }) => {
  const cls = deleted
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    : active
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  const label = deleted ? "Removed" : active ? "Active" : "Inactive";
  return <Badge className={`${cls} text-xs font-semibold`}>{label}</Badge>;
};

export default function CommitteeAuditDetailsDrawer({ open, onOpenChange, entry }: Props) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const { data: current } = useQuery({
    queryKey: ["committee-member-current", entry?.member_id],
    enabled: !!entry?.member_id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("*")
        .eq("id", entry.member_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: overlap } = useQuery({
    queryKey: ["committee-member-overlap", entry?.staff_id, entry?.committee_id],
    enabled: !!entry?.staff_id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("id, committee_id, is_active, deleted_at, committees(name)")
        .eq("staff_id", entry.staff_id)
        .is("deleted_at", null)
        .eq("is_active", true);
      return (data || []).filter((x: any) => x.committee_id !== entry?.committee_id);
    },
  });

  if (!entry) return null;

  // Derive "before" state from audit details (for UPDATE) or infer from action
  const details = entry.details || {};
  const before = (() => {
    if (entry.action === "added") return { is_active: false, deleted: true };
    if (entry.action === "removed") return { is_active: true, deleted: false };
    if (entry.action === "deactivated") return { is_active: true, deleted: false };
    if (entry.action === "reactivated") return { is_active: false, deleted: false };
    if (entry.action === "updated")
      return {
        is_active: details.old_is_active ?? true,
        deleted: false,
        designation: details.old_designation,
        staff_id: details.old_staff_id,
      };
    return { is_active: false, deleted: false };
  })();
  const after = (() => {
    if (entry.action === "added") return { is_active: true, deleted: false };
    if (entry.action === "removed") return { is_active: true, deleted: true };
    if (entry.action === "deactivated") return { is_active: false, deleted: false };
    if (entry.action === "reactivated") return { is_active: true, deleted: false };
    if (entry.action === "updated")
      return {
        is_active: details.new_is_active ?? true,
        deleted: false,
        designation: details.new_designation,
        staff_id: details.new_staff_id,
      };
    return { is_active: false, deleted: false };
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{bn ? "অডিট বিস্তারিত" : "Audit Details"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5 text-sm">
          {/* Action summary */}
          <div className="rounded-2xl bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {bn ? "অ্যাকশন" : "Action"}
            </div>
            <div className="mt-1 font-semibold">{entry.action}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {format(new Date(entry.created_at), "dd/MM/yyyy hh:mm:ss a")} •{" "}
              {entry.performed_by_email || "system"}
            </div>
          </div>

          {/* Before / After */}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              {bn ? "পূর্বে → পরে" : "Before → After"}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="rounded-xl border p-3 space-y-2">
                <div className="text-[10px] uppercase opacity-60">{bn ? "পূর্বে" : "Before"}</div>
                <StatusPill active={before.is_active} deleted={before.deleted} />
                {"designation" in before && (
                  <div className="text-xs text-muted-foreground">
                    {bn ? "পদবি:" : "Desig:"} {before.designation || "—"}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="rounded-xl border p-3 space-y-2 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="text-[10px] uppercase opacity-60">{bn ? "পরে" : "After"}</div>
                <StatusPill active={after.is_active} deleted={after.deleted} />
                {"designation" in after && (
                  <div className="text-xs text-muted-foreground">
                    {bn ? "পদবি:" : "Desig:"} {after.designation || "—"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current state */}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              {bn ? "বর্তমান অবস্থা" : "Current State"}
            </div>
            {current ? (
              <div className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusPill
                    active={!!current.is_active}
                    deleted={!!current.deleted_at}
                  />
                  {current.allow_overlap && (
                    <Badge className="bg-purple-100 text-purple-700 text-[10px]">
                      {bn ? "ওভারল্যাপ অনুমোদিত" : "Overlap allowed"}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>
                    {bn ? "যোগদান:" : "Joined:"}{" "}
                    {current.joining_date
                      ? format(new Date(current.joining_date), "dd/MM/yyyy")
                      : "—"}
                  </div>
                  <div>
                    {bn ? "সর্বশেষ আপডেট:" : "Updated:"}{" "}
                    {current.updated_at
                      ? format(new Date(current.updated_at), "dd/MM/yyyy hh:mm a")
                      : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">
                {bn ? "মেম্বার রেকর্ড পাওয়া যায়নি (হার্ড-ডিলিট)" : "Member record not found (hard-deleted)"}
              </div>
            )}
          </div>

          {/* Overlap status */}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              {bn ? "অন্যান্য সক্রিয় কমিটি" : "Other Active Committees"}
            </div>
            {overlap && overlap.length > 0 ? (
              <ul className="space-y-1">
                {overlap.map((o: any) => (
                  <li key={o.id} className="text-xs flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    {o.committees?.name || "—"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">
                {bn ? "নেই" : "None"}
              </div>
            )}
          </div>

          <Separator />

          {/* Links */}
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to={`/admin/staff?focus=${entry.staff_id || ""}`}>
                <User className="w-4 h-4 mr-2" />
                {bn ? "স্টাফ পেজে যান" : "Go to Staff"}
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to={`/admin/committees?committee=${entry.committee_id || ""}`}>
                <Users className="w-4 h-4 mr-2" />
                {bn ? "কমিটি পেজে যান" : "Go to Committee"}
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
