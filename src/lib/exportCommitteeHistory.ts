import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface HistoryFilters {
  startDate?: string; // yyyy-MM-dd
  endDate?: string;
  status?: "all" | "active" | "inactive";
}

interface HistoryRow {
  committee: string;
  designation: string;
  action: string;
  status: string;
  date: string;
  performedBy: string;
  rawDate: Date;
}

async function buildHistoryRows(staffId: string, f: HistoryFilters): Promise<HistoryRow[]> {
  const [{ data: current }, { data: audit }] = await Promise.all([
    supabase
      .from("committee_members" as any)
      .select("committee_id, designation, joining_date, is_active, deleted_at, created_at, committee:committees(name, name_en)")
      .eq("staff_id", staffId),
    supabase
      .from("committee_audit_log" as any)
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: true }),
  ]);

  const rows: HistoryRow[] = [];

  (current || []).forEach((m: any) => {
    const status = m.deleted_at ? "Removed" : m.is_active ? "Active" : "Inactive";
    const d = m.joining_date ? new Date(m.joining_date) : new Date(m.created_at);
    rows.push({
      committee: m.committee?.name || m.committee?.name_en || "—",
      designation: m.designation || "—",
      action: "Current Record",
      status,
      date: format(d, "dd/MM/yyyy"),
      performedBy: "—",
      rawDate: d,
    });
  });

  (audit || []).forEach((a: any) => {
    const d = new Date(a.created_at);
    rows.push({
      committee: a.committee_name || "—",
      designation: a.designation || "—",
      action: a.action,
      status: "—",
      date: format(d, "dd/MM/yyyy HH:mm"),
      performedBy: a.performed_by_email || "system",
      rawDate: d,
    });
  });

  // Apply filters
  return rows.filter((r) => {
    if (f.startDate && r.rawDate < new Date(f.startDate)) return false;
    if (f.endDate) {
      const end = new Date(f.endDate);
      end.setHours(23, 59, 59, 999);
      if (r.rawDate > end) return false;
    }
    if (f.status && f.status !== "all") {
      if (f.status === "active" && r.status !== "Active") return false;
      if (f.status === "inactive" && !["Inactive", "Removed"].includes(r.status)) return false;
    }
    return true;
  });
}

export async function exportStaffCommitteeHistoryCSV(
  staffId: string,
  staffName: string,
  filters: HistoryFilters = {}
) {
  const rows = await buildHistoryRows(staffId, filters);
  const head = ["Committee", "Designation", "Action", "Status", "Date", "Performed By"];
  const csv = [head, ...rows.map((r) => [r.committee, r.designation, r.action, r.status, r.date, r.performedBy])]
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

export async function exportStaffCommitteeHistoryPDF(
  staffId: string,
  staffName: string,
  filters: HistoryFilters = {}
) {
  const rows = await buildHistoryRows(staffId, filters);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text("Committee Membership History", 40, 40);
  doc.setFontSize(10);
  doc.text(`Staff: ${staffName}`, 40, 60);
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 40, 75);
  if (filters.startDate || filters.endDate) {
    doc.text(
      `Period: ${filters.startDate || "—"} to ${filters.endDate || "—"} | Status: ${filters.status || "all"}`,
      40,
      90
    );
  }

  autoTable(doc, {
    startY: 105,
    head: [["Committee", "Designation", "Action", "Status", "Date", "Performed By"]],
    body: rows.map((r) => [r.committee, r.designation, r.action, r.status, r.date, r.performedBy]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillBytes: [6, 78, 59] as any, fillColor: [6, 78, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 250, 248] },
  });

  doc.save(`committee-history-${staffName.replace(/\s+/g, "_")}-${format(new Date(), "yyyyMMdd")}.pdf`);
}
