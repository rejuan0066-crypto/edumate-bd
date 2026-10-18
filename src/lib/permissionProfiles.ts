/**
 * PERMISSION PROFILES FOR ADMIN PAGES
 * Categorizes pages so that each page only shows relevant permission checkboxes:
 * - Read-only / Audit Logs / Reports: only 'can_view' (no add/edit/delete/approval)
 * - Settings: 'can_view' and 'can_edit'
 * - Standard CRUD: 'can_view', 'can_add', 'can_edit', 'can_delete'
 * - Approval Workflow (financial/critical): full CRUD + Maker-Checker approvals
 */

export type PageProfileType = 'audit_log' | 'report' | 'settings' | 'standard_crud' | 'approval_workflow';

export interface PagePermissionProfile {
  type: PageProfileType;
  allowView: boolean;
  allowAdd: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  allowApprove: boolean;
  supportsApprovalWorkflow: boolean;
  typeBadge_bn: string;
  typeBadge_en: string;
}

// 1. Audit logs & historical immutable records (Strictly Read-Only)
const AUDIT_AND_LOG_PATHS = new Set([
  '/admin/shift-audit-log',
  '/admin/receipt-audit',
  '/admin/receipts-role-audit',
  '/admin/verified-payments-role-audit',
  '/admin/complaints-role-audit',
  '/admin/donors-role-audit',
  '/admin/accounts-audit',
  '/admin/committee-audit-log',
  '/admin/library-audit',
  '/admin/parent-link-audit',
  '/admin/signatory-audit',
  '/admin/footer-audit',
  '/admin/administrative-debug',
  '/admin/name-permission-audit',
  '/admin/zakat-logs',
  '/admin/system-logs',
  '/admin/whatsapp-logs',
  '/admin/email-delivery-log',
  '/admin/audit-device-allowlist',
  '/admin/blocked-devices',
  '/admin/backup',
  '/admin/health-check',
  '/admin/otp-recovery',
]);

// 2. Reports, Analytics & Public Dashboards (Read-Only)
const REPORT_PATHS = new Set([
  '/admin',
  '/admin/analytics',
  '/admin/reports',
  '/admin/staff-reports',
  '/admin/merit-list',
  '/admin/profile',
]);

// 3. Settings & Configurations (View & Edit/Save only)
const SETTINGS_PATHS = new Set([
  '/admin/settings',
  '/admin/settings/id-format',
  '/admin/receipt-designer',
  '/admin/payments',
  '/admin/email-templates',
  '/admin/website',
  '/admin/theme',
  '/admin/menu-manager',
  '/admin/formula-builder',
  '/admin/validation-manager',
  '/admin/parent-signup-fields',
  '/admin/translations',
  '/admin/module-manager',
  '/admin/device-management',
  '/admin/api-verification',
]);

// 4. Approval Workflow Enabled (Financial or Critical data)
const APPROVAL_WORKFLOW_PATHS = new Set([
  '/admin/students',
  '/admin/staff',
  '/admin/teachers',
  '/admin/administrative-staff',
  '/admin/support-staff',
  '/admin/general-staff',
  '/admin/directors',
  '/admin/administrative',
  '/admin/expenses',
  '/admin/students-fees',
  '/admin/fee-receipts',
  '/admin/salary',
  '/admin/donors',
  '/admin/resign-letters',
  '/admin/joining-letters',
  '/admin/student-approvals',
  '/admin/parent-approvals',
  '/admin/approvals',
  '/admin/complaints',
  '/admin/admission-tests',
  '/admin/scholarships',
  '/admin/health-records',
  '/admin/attendance',
  '/admin/student-attendance',
  '/admin/staff-attendance',
  '/admin/results',
]);

/**
 * Returns the permission capability profile for a given admin menu path.
 */
export function getPagePermissionProfile(rawPath: string): PagePermissionProfile {
  const path = (rawPath || '').split('?')[0].trim();

  // 1. Audit / Log check
  if (
    AUDIT_AND_LOG_PATHS.has(path) ||
    path.endsWith('-audit') ||
    path.endsWith('-audit-log') ||
    path.endsWith('-logs') ||
    path.includes('/audit')
  ) {
    return {
      type: 'audit_log',
      allowView: true,
      allowAdd: false,
      allowEdit: false,
      allowDelete: false,
      allowApprove: false,
      supportsApprovalWorkflow: false,
      typeBadge_bn: 'অডিট রেকর্ড (শুধু দেখা)',
      typeBadge_en: 'Audit Log (View Only)',
    };
  }

  // 2. Report check
  if (REPORT_PATHS.has(path) || path.includes('/reports')) {
    return {
      type: 'report',
      allowView: true,
      allowAdd: false,
      allowEdit: false,
      allowDelete: false,
      allowApprove: false,
      supportsApprovalWorkflow: false,
      typeBadge_bn: 'রিপোর্ট (শুধু দেখা)',
      typeBadge_en: 'Report (View Only)',
    };
  }

  // 3. Settings check
  if (SETTINGS_PATHS.has(path) || path.includes('/settings') || path.endsWith('-designer') || path.endsWith('-builder')) {
    return {
      type: 'settings',
      allowView: true,
      allowAdd: false,
      allowEdit: true,
      allowDelete: false,
      allowApprove: false,
      supportsApprovalWorkflow: false,
      typeBadge_bn: 'সেটিংস (দেখা ও সংরক্ষণ)',
      typeBadge_en: 'Settings (View & Edit)',
    };
  }

  // 4. Approval Workflow check
  if (APPROVAL_WORKFLOW_PATHS.has(path) || path.includes('/approvals')) {
    return {
      type: 'approval_workflow',
      allowView: true,
      allowAdd: true,
      allowEdit: true,
      allowDelete: true,
      allowApprove: true,
      supportsApprovalWorkflow: true,
      typeBadge_bn: 'অনুমোদন ও ওয়ার্কফ্লো',
      typeBadge_en: 'Approval Workflow',
    };
  }

  // 5. Default: Standard CRUD
  return {
    type: 'standard_crud',
    allowView: true,
    allowAdd: true,
    allowEdit: true,
    allowDelete: true,
    allowApprove: false,
    supportsApprovalWorkflow: false,
    typeBadge_bn: 'ম্যানেজমেন্ট (CRUD)',
    typeBadge_en: 'Standard CRUD',
  };
}
