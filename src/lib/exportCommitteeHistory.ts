import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface HistoryFilters {
  startDate?: string; // yyyy-MM-dd
  endDate?: string;
  status?: "all" | "active" | "inactive";
  actions?: string[]; // optional action filter
}

interface HistoryRow {
  committee: string;
  staffName: string;
  designation: string;
  action: string;
  status: string;
  oldValue: string;
  newValue: string;
  date: string;
  performedBy: string;
  rawDate: Date;
}

const summarizeOldNew = (a: any) => {
  if (!a.details) return { oldValue: "—", newValue: "—" };
  const d = a.details;
  const parts: string[] = [];
  const oldP: string[] = [];
  const newP: string[] = [];
  if (d.old_is_active !== undefined && d.old_is_active !== d.new_is_active) {
    oldP.push(`active=${d.old_is_active}`);
    newP.push(`active=${d.new_is_active}`);
  }
  if (d.old_designation !== d.new_designation) {
    oldP.push(`desig="${d.old_designation || ""}"`);
    newP.push(`desig="${d.new_designation || ""}"`);
  }
  if ((d.old_staff_id || "") !== (d.new_staff_id || "")) {
    oldP.push(`staff=${d.old_staff_id || "—"}`);
    newP.push(`staff=${d.new_staff_id || "—"}`);
  }
  parts.push(...oldP);
  return { oldValue: oldP.join(", ") || "—", newValue: newP.join(", ") || "—" };
};

async function buildHistoryRows(
  staffId: string | null,
  f: HistoryFilters
): Promise<HistoryRow[]> {
  // If staffId is provided → per-staff history. Otherwise → global audit log.
  const auditQ = supabase
    .from("committee_audit_log" as any)
    .select("*")
    .order("created_at", { ascending: true });

  if (staffId) auditQ.eq("staff_id", staffId);

  const promises: Promise<any>[] = [auditQ];

  if (staffId) {
    promises.unshift(
      supabase
        .from("committee_members" as any)
        .select(
          "committee_id, designation, joining_date, is_active, deleted_at, created_at, committee:committees(name, name_en)"
        )
        .eq("staff_id", staffId)
    );
  }

  const results = await Promise.all(promises);
  const audit = staffId ? results[1].data : results[0].data;
  const current = staffId ? results[0].data : null;

  const rows: HistoryRow[] = [];

  (current || []).forEach((m: any) => {
    const status = m.deleted_at ? "Removed" : m.is_active ? "Active" : "Inactive";
    const d = m.joining_date ? new Date(m.joining_date) : new Date(m.created_at);
    rows.push({
      committee: m.committee?.name || m.committee?.name_en || "—",
      staffName: "—",
      designation: m.designation || "—",
      action: "Current Record",
      status,
      oldValue: "—",
      newValue: status,
      date: format(d, "dd/MM/yyyy"),
      performedBy: "—",
      rawDate: d,
    });
  });

  (audit || []).forEach((a: any) => {
    const d = new Date(a.created_at);
    const { oldValue, newValue } = summarizeOldNew(a);
    rows.push({
      committee: a.committee_name || "—",
      staffName: a.member_name || "—",
      designation: a.designation || "—",
      action: a.action,
      status: "—",
      oldValue,
      newValue,
      date: format(d, "dd/MM/yyyy HH:mm"),
      performedBy: a.performed_by_email || "system",
      rawDate: d,
    });
  });

  return rows.filter((r) => {
    if (f.startDate && r.rawDate < new Date(f.startDate)) return false;
    if (f.endDate) {
      const end = new Date(f.endDate);
      end.setHours(23, 59, 59, 999);
      if (r.rawDate > end) return false;
    }
    if (f.status && f.status !== "all") {
      if (f.status === "active" && r.status !== "Active") return false;
      if (f.status === "inactive" && !["Inactive", "Removed"].includes(r.status))
        return false;
    }
    if (f.actions && f.actions.length > 0 && !f.actions.includes(r.action))
      return false;
    return true;
  });
}

const filterSummary = (f: HistoryFilters) =>
  [
    `Period: ${f.startDate || "—"} to ${f.endDate || "—"}`,
    `Status: ${f.status || "all"}`,
    `Actions: ${f.actions?.length ? f.actions.join("/") : "all"}`,
  ].join(" | ");

const HEADERS = [
  "Committee",
  "Staff Name",
  "Designation",
  "Action",
  "Old Value",
  "New Value",
  "Status",
  "Date",
  "Performed By",
];

export async function exportStaffCommitteeHistoryCSV(
  staffId: string | null,
  staffName: string,
  filters: HistoryFilters = {}
) {
  const rows = await buildHistoryRows(staffId, filters);
  const headerLines = [
    `# Committee Membership History`,
    `# Subject: ${staffName}`,
    `# Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    `# Filters: ${filterSummary(filters)}`,
    `# Total Rows: ${rows.length}`,
  ].join("\n");

  const body = [
    HEADERS,
    ...rows.map((r) => [
      r.committee,
      r.staffName,
      r.designation,
      r.action,
      r.oldValue,
      r.newValue,
      r.status,
      r.date,
      r.performedBy,
    ]),
  ]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const csv = headerLines + "\n\n" + body;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `committee-history-${staffName.replace(/\s+/g, "_")}-${format(
    new Date(),
    "yyyyMMdd"
  )}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportStaffCommitteeHistoryPDF(
  staffId: string | null,
  staffName: string,
  filters: HistoryFilters = {}
) {
  const rows = await buildHistoryRows(staffId, filters);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text("Committee Membership History", 40, 40);
  doc.setFontSize(10);
  doc.text(`Subject: ${staffName}`, 40, 60);
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 40, 75);
  doc.text(`Filters: ${filterSummary(filters)}`, 40, 90);
  doc.text(`Total Rows: ${rows.length}`, 40, 105);

  autoTable(doc, {
    startY: 120,
    head: [HEADERS],
    body: rows.map((r) => [
      r.committee,
      r.staffName,
      r.designation,
      r.action,
      r.oldValue,
      r.newValue,
      r.status,
      r.date,
      r.performedBy,
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [6, 78, 59] as any, textColor: 255 },
    alternateRowStyles: { fillColor: [245, 250, 248] },
  });

  doc.save(
    `committee-history-${staffName.replace(/\s+/g, "_")}-${format(
      new Date(),
      "yyyyMMdd"
    )}.pdf`
  );
}
