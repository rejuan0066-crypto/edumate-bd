import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/**
 * Download a staff member's committee membership history as CSV.
 * Includes active and inactive periods (joining/removal events from audit log).
 */
export async function exportStaffCommitteeHistoryCSV(
  staffId: string,
  staffName: string
) {
  // Current memberships
  const { data: current } = await supabase
    .from("committee_members" as any)
    .select("committee_id, designation, joining_date, is_active, deleted_at, created_at, updated_at, committee:committees(name, name_en)")
    .eq("staff_id", staffId);

  // Audit history
  const { data: audit } = await supabase
    .from("committee_audit_log" as any)
    .select("*")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: true });

  const rows: string[][] = [
    ["Committee", "Designation", "Action", "Status", "Date", "Performed By"],
  ];

  (current || []).forEach((m: any) => {
    const status = m.deleted_at
      ? "Removed"
      : m.is_active
      ? "Active"
      : "Inactive";
    rows.push([
      m.committee?.name || m.committee?.name_en || "—",
      m.designation || "—",
      "Current Record",
      status,
      m.joining_date ? format(new Date(m.joining_date), "dd/MM/yyyy") : "—",
      "—",
    ]);
  });

  (audit || []).forEach((a: any) => {
    rows.push([
      a.committee_name || "—",
      a.designation || "—",
      a.action,
      "—",
      format(new Date(a.created_at), "dd/MM/yyyy HH:mm"),
      a.performed_by_email || "system",
    ]);
  });

  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `committee-history-${staffName.replace(/\s+/g, "_")}-${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
