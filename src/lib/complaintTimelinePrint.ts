import { format } from 'date-fns';
import { toast } from 'sonner';

interface ComplaintData {
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  is_anonymous: boolean;
  complainant_name?: string | null;
  complainant_phone?: string | null;
  complainant_email?: string | null;
  complainant_address?: string | null;
  complainant_id_number?: string | null;
  resolution_notes?: string | null;
  created_at: string;
}

interface TimelineUpdate {
  id: string;
  update_type: string;
  from_status?: string | null;
  to_status?: string | null;
  message?: string | null;
  is_public: boolean;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const CATEGORY_LABEL: Record<string, string> = {
  academic: 'Academic',
  financial: 'Financial',
  infrastructure: 'Infrastructure',
  staff: 'Staff',
  other: 'Other',
};

const TYPE_LABEL: Record<string, string> = {
  created: 'Submitted',
  status_change: 'Status Change',
  note: 'Update / Note',
  assignment: 'Assignment',
  resolution: 'Resolution',
};

const escape = (s?: string | null) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const printComplaintTimeline = (complaint: ComplaintData, updates: TimelineUpdate[]) => {
  const sorted = [...updates].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const fmt = (d: string) => format(new Date(d), 'dd/MM/yyyy HH:mm');

  const timelineHtml = sorted.length === 0
    ? '<div class="empty">No timeline entries yet.</div>'
    : sorted.map((u) => `
      <div class="tl-item ${u.is_public ? '' : 'internal'}">
        <div class="tl-dot"></div>
        <div class="tl-body">
          <div class="tl-head">
            <span class="tl-type">${escape(TYPE_LABEL[u.update_type] || u.update_type)}</span>
            ${u.from_status || u.to_status ? `<span class="tl-status">${escape(STATUS_LABEL[u.from_status || ''] || u.from_status || '')} → <strong>${escape(STATUS_LABEL[u.to_status || ''] || u.to_status || '')}</strong></span>` : ''}
            ${!u.is_public ? '<span class="tl-badge">Internal</span>' : ''}
            <span class="tl-date">${escape(fmt(u.created_at))}</span>
          </div>
          ${u.message ? `<div class="tl-msg">${escape(u.message)}</div>` : ''}
        </div>
      </div>
    `).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Complaint ${escape(complaint.ticket_number)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter','Noto Sans Bengali',sans-serif;padding:32px;color:#111;font-size:13px;line-height:1.5;background:#fff}
  .header{border-bottom:3px solid #047857;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
  .header h1{font-size:22px;color:#047857;margin-bottom:4px}
  .header .sub{color:#666;font-size:12px}
  .ticket-box{text-align:right;border:2px solid #047857;border-radius:8px;padding:10px 16px;background:#ecfdf5}
  .ticket-box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#047857}
  .ticket-box .val{font-family:monospace;font-weight:700;font-size:16px;color:#064e3b}
  .badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
  .badge{padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid}
  .badge.status{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
  .badge.priority{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
  .badge.category{background:#f3f4f6;color:#374151;border-color:#d1d5db}
  .section{margin-bottom:22px}
  .section h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#047857;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
  .desc{padding:12px;background:#f9fafb;border-radius:6px;border-left:3px solid #047857;white-space:pre-wrap}
  .info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px}
  .info-row{display:flex;gap:8px;font-size:12px}
  .info-row .k{color:#6b7280;min-width:110px}
  .info-row .v{font-weight:500;color:#111}
  .timeline{position:relative;padding-left:24px}
  .timeline::before{content:"";position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:#d1fae5}
  .tl-item{position:relative;padding-bottom:14px}
  .tl-item:last-child{padding-bottom:0}
  .tl-dot{position:absolute;left:-22px;top:4px;width:12px;height:12px;border-radius:50%;background:#047857;border:2px solid #fff;box-shadow:0 0 0 2px #047857}
  .tl-item.internal .tl-dot{background:#9ca3af;box-shadow:0 0 0 2px #9ca3af}
  .tl-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px}
  .tl-type{font-weight:600;color:#111}
  .tl-status{color:#6b7280;font-size:12px}
  .tl-badge{font-size:10px;padding:2px 8px;border-radius:4px;background:#fef3c7;color:#92400e;font-weight:600}
  .tl-date{margin-left:auto;color:#6b7280;font-size:11px;font-family:monospace}
  .tl-msg{padding:8px 12px;background:#f9fafb;border-radius:6px;color:#374151;white-space:pre-wrap;font-size:12px}
  .resolution{padding:14px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;white-space:pre-wrap}
  .empty{padding:20px;text-align:center;color:#9ca3af;font-style:italic}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:10px;text-align:center}
  @media print{
    body{padding:16px;font-size:11px}
    .no-print{display:none}
    .section{page-break-inside:avoid}
    .tl-item{page-break-inside:avoid}
  }
  .actions{position:fixed;top:12px;right:12px;display:flex;gap:8px}
  .actions button{padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:12px}
  .actions .print-btn{background:#047857;color:#fff}
  .actions .close-btn{background:#e5e7eb;color:#111}
</style></head>
<body>
  <div class="actions no-print">
    <button class="print-btn" onclick="window.print()">🖨 Print</button>
    <button class="close-btn" onclick="window.close()">Close</button>
  </div>

  <div class="header">
    <div>
      <h1>Complaint Timeline</h1>
      <div class="sub">Generated ${escape(format(new Date(), 'dd/MM/yyyy HH:mm'))}</div>
    </div>
    <div class="ticket-box">
      <div class="lbl">Ticket</div>
      <div class="val">${escape(complaint.ticket_number)}</div>
    </div>
  </div>

  <div class="badges">
    <span class="badge status">Status: ${escape(STATUS_LABEL[complaint.status] || complaint.status)}</span>
    <span class="badge priority">Priority: ${escape(PRIORITY_LABEL[complaint.priority] || complaint.priority)}</span>
    <span class="badge category">${escape(CATEGORY_LABEL[complaint.category] || complaint.category)}</span>
    ${complaint.is_anonymous ? '<span class="badge category">Anonymous</span>' : ''}
  </div>

  <div class="section">
    <h2>Subject</h2>
    <div style="font-size:15px;font-weight:600;color:#111">${escape(complaint.subject)}</div>
  </div>

  <div class="section">
    <h2>Description</h2>
    <div class="desc">${escape(complaint.description)}</div>
  </div>

  ${!complaint.is_anonymous && (complaint.complainant_name || complaint.complainant_phone || complaint.complainant_email) ? `
  <div class="section">
    <h2>Complainant Details</h2>
    <div class="info-grid">
      ${complaint.complainant_name ? `<div class="info-row"><span class="k">Name:</span><span class="v">${escape(complaint.complainant_name)}</span></div>` : ''}
      ${complaint.complainant_phone ? `<div class="info-row"><span class="k">Phone:</span><span class="v">${escape(complaint.complainant_phone)}</span></div>` : ''}
      ${complaint.complainant_email ? `<div class="info-row"><span class="k">Email:</span><span class="v">${escape(complaint.complainant_email)}</span></div>` : ''}
      ${complaint.complainant_id_number ? `<div class="info-row"><span class="k">ID Number:</span><span class="v">${escape(complaint.complainant_id_number)}</span></div>` : ''}
      ${complaint.complainant_address ? `<div class="info-row" style="grid-column:span 2"><span class="k">Address:</span><span class="v">${escape(complaint.complainant_address)}</span></div>` : ''}
      <div class="info-row"><span class="k">Submitted:</span><span class="v">${escape(fmt(complaint.created_at))}</span></div>
    </div>
  </div>
  ` : `
  <div class="section">
    <div class="info-grid">
      <div class="info-row"><span class="k">Submitted:</span><span class="v">${escape(fmt(complaint.created_at))}</span></div>
    </div>
  </div>
  `}

  <div class="section">
    <h2>Status Timeline & Updates</h2>
    <div class="timeline">${timelineHtml}</div>
  </div>

  ${complaint.resolution_notes ? `
  <div class="section">
    <h2>Resolution Notes</h2>
    <div class="resolution">${escape(complaint.resolution_notes)}</div>
  </div>
  ` : ''}

  <div class="footer">This is a system-generated document — Complaint ${escape(complaint.ticket_number)}</div>

  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Please allow pop-ups to print the complaint timeline.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
};
