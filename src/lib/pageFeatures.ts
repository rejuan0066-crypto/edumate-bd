/**
 * PAGE_SUB_FEATURES
 * Mapping of admin menu paths to their internal tabs and sensitive actions.
 * Allows roles to hide tabs/options 100% from the DOM.
 */

export interface SubFeatureItem {
  key: string;
  label_bn: string;
  label_en: string;
  type: 'tab' | 'action'; // 'tab' = page tab, 'action' = button or special configuration
  description_bn?: string;
  description_en?: string;
}

export interface PageFeatureGroup {
  menuPath: string;
  features: SubFeatureItem[];
}

export const KNOWN_PAGE_FEATURES: Record<string, SubFeatureItem[]> = {
  // শিক্ষার্থী ব্যবস্থাপনা
  '/admin/students': [
    { key: 'tab_list', label_bn: 'শিক্ষার্থী তালিকা', label_en: 'Student List', type: 'tab' },
    { key: 'tab_admission', label_bn: 'নতুন ভর্তি ফরম', label_en: 'Admission Form', type: 'tab' },
    { key: 'action_export_excel', label_bn: 'এক্সেল ডাউনলোড বাটন', label_en: 'Export Excel Button', type: 'action' },
    { key: 'action_print_profile', label_bn: 'প্রোফাইল প্রিন্ট বাটন', label_en: 'Print Profile Button', type: 'action' },
    { key: 'action_status_change', label_bn: 'ছাত্র অবস্থা পরিবর্তন (Active/Inactive)', label_en: 'Change Student Status', type: 'action' },
  ],

  // শিক্ষক ও স্টাফ
  '/admin/staff': [
    { key: 'tab_staff_list', label_bn: 'স্টাফ ও শিক্ষক তালিকা', label_en: 'Staff List', type: 'tab' },
    { key: 'tab_add_staff', label_bn: 'নতুন স্টাফ নিয়োগ ফরম', label_en: 'Add Staff Form', type: 'tab' },
    { key: 'action_salary_view', label_bn: 'বেতন দেখার অনুমতি', label_en: 'View Salary Info', type: 'action' },
    { key: 'action_export_staff', label_bn: 'স্টাফ তালিকা এক্সপোর্ট', label_en: 'Export Staff List', type: 'action' },
  ],

  // ছাত্র ফি
  '/admin/students-fees': [
    { key: 'tab_fees_collect', label_bn: 'ফি আদায়', label_en: 'Collect Fees', type: 'tab' },
    { key: 'tab_fees_dues', label_bn: 'বকেয়া তালিকা', label_en: 'Dues List', type: 'tab' },
    { key: 'tab_fees_reports', label_bn: 'ফি আদায় রিপোর্ট', label_en: 'Fee Reports', type: 'tab' },
    { key: 'action_waiver_discount', label_bn: 'ফি মওকুফ বা ছাড় প্রদান', label_en: 'Grant Waiver / Discount', type: 'action' },
    { key: 'action_delete_receipt', label_bn: 'জমা রসিদ বাতিল বা মোছা', label_en: 'Delete Payment Receipt', type: 'action' },
  ],

  // হিসাব ও খরচ (Expenses)
  '/admin/expenses': [
    { key: 'tab_expenses_list', label_bn: 'খরচ তালিকা', label_en: 'Expense List', type: 'tab' },
    { key: 'tab_income_list', label_bn: 'আয় তালিকা', label_en: 'Income List', type: 'tab' },
    { key: 'tab_accounts_reports', label_bn: 'আয়-ব্যয় ক্যাশ রিপোর্ট', label_en: 'Cash Flow Reports', type: 'tab' },
    { key: 'tab_bank_accounts', label_bn: 'ব্যাংক একাউন্ট ব্যালেন্স', label_en: 'Bank Accounts', type: 'tab' },
    { key: 'action_export_statement', label_bn: 'হিসাব স্টেটমেন্ট ডাউনলোড', label_en: 'Export Account Statement', type: 'action' },
  ],

  // ফলাফল ও পরীক্ষা
  '/admin/results': [
    { key: 'tab_marks_entry', label_bn: 'নম্বর এন্ট্রি', label_en: 'Marks Entry', type: 'tab' },
    { key: 'tab_tabulation_sheet', label_bn: 'ট্যাবুলেশন শিট', label_en: 'Tabulation Sheet', type: 'tab' },
    { key: 'tab_publish_settings', label_bn: 'ফলাফল প্রকাশ ও লক সেটিংস', label_en: 'Result Publish & Lock', type: 'tab' },
    { key: 'action_publish_result', label_bn: 'ফলাফল পাবলিশ বোতাম', label_en: 'Publish Result Button', type: 'action' },
  ],

  // প্রশ্নপত্র
  '/admin/question-papers': [
    { key: 'tab_all_papers', label_bn: 'সকল প্রশ্নপত্র', label_en: 'All Question Papers', type: 'tab' },
    { key: 'tab_create_paper', label_bn: 'নতুন প্রশ্নপত্র তৈরি', label_en: 'Create Question Paper', type: 'tab' },
    { key: 'action_approve_paper', label_bn: 'প্রশ্নপত্র চূড়ান্ত অনুমোদন বাটন', label_en: 'Approve Question Paper', type: 'action' },
  ],

  // হাজিরা (Attendance)
  '/admin/attendance': [
    { key: 'tab_student_att', label_bn: 'ছাত্র হাজিরা', label_en: 'Student Attendance', type: 'tab' },
    { key: 'tab_staff_att', label_bn: 'শিক্ষক/স্টাফ হাজিরা', label_en: 'Staff Attendance', type: 'tab' },
    { key: 'tab_att_reports', label_bn: 'মাসিক হাজিরা রিপোর্ট', label_en: 'Monthly Attendance Report', type: 'tab' },
    { key: 'tab_att_settings', label_bn: 'হাজিরা শিফট সেটিংস', label_en: 'Attendance Shift Settings', type: 'tab' },
  ],

  // বেতন (Salary)
  '/admin/salary': [
    { key: 'tab_salary_disburse', label_bn: 'বেতন তৈরি ও প্রদান', label_en: 'Disburse Salary', type: 'tab' },
    { key: 'tab_bonus', label_bn: 'বোনাস ও ভাতা', label_en: 'Bonus & Allowance', type: 'tab' },
    { key: 'tab_savings_fund', label_bn: 'কল্যাণ ও প্রভিডেন্ট ফান্ড', label_en: 'Savings Fund', type: 'tab' },
    { key: 'tab_salary_settings', label_bn: 'বেতন স্ট্রাকচার ও ফর্মুলা', label_en: 'Salary Formula Settings', type: 'tab' },
  ],

  // হোস্টেল
  '/admin/hostel': [
    { key: 'tab_hostels', label_bn: 'হোস্টেল ও ভবন', label_en: 'Hostels & Buildings', type: 'tab' },
    { key: 'tab_rooms', label_bn: 'রুম ও সিট বিন্যাস', label_en: 'Rooms & Seats', type: 'tab' },
    { key: 'tab_allocations', label_bn: 'সিট বরাদ্দ', label_en: 'Seat Allocations', type: 'tab' },
    { key: 'tab_meals', label_bn: 'মিল ও খাবার মিল-অফ', label_en: 'Meals & Meal Off', type: 'tab' },
  ],

  // লাইব্রেরি
  '/admin/library': [
    { key: 'tab_lib_dashboard', label_bn: 'ড্যাশবোর্ড', label_en: 'Dashboard', type: 'tab' },
    { key: 'tab_lib_inventory', label_bn: 'বইয়ের তালিকা ও ক্যাটালগ', label_en: 'Book Catalog', type: 'tab' },
    { key: 'tab_lib_issue', label_bn: 'বই ইস্যু ও রিটার্ন', label_en: 'Issue & Return', type: 'tab' },
    { key: 'tab_lib_reports', label_bn: 'লাইব্রেরি রিপোর্ট', label_en: 'Library Reports', type: 'tab' },
  ],

  // সেটিংস (Settings)
  '/admin/settings': [
    { key: 'tab_general', label_bn: 'সাধারণ সেটিংস', label_en: 'General Settings', type: 'tab' },
    { key: 'tab_sms', label_bn: 'এসএমএস গেটওয়ে কনফিগার', label_en: 'SMS Gateway Config', type: 'tab' },
    { key: 'tab_whatsapp', label_bn: 'হোয়াটসঅ্যাপ গেটওয়ে', label_en: 'WhatsApp Gateway', type: 'tab' },
    { key: 'tab_payment', label_bn: 'পেমেন্ট গেটওয়ে (বিকাশ/নগদ)', label_en: 'Payment Gateway', type: 'tab' },
    { key: 'tab_security', label_bn: 'সিকিউরিটি ও ডিভাইস অডিট', label_en: 'Security & Device Audit', type: 'tab' },
  ],

  // ইউজার ম্যানেজমেন্ট
  '/admin/user-management': [
    { key: 'tab_users', label_bn: 'ইউজার তালিকা', label_en: 'User List', type: 'tab' },
    { key: 'tab_roles', label_bn: 'রোল ও পারমিশন কার্ড', label_en: 'Roles & Permissions', type: 'tab' },
    { key: 'tab_access', label_bn: 'কুইক অ্যাক্সেস কন্ট্রোল', label_en: 'Quick Access', type: 'tab' },
    { key: 'action_reset_password', label_bn: 'পাসওয়ার্ড রিসেট বাটন', label_en: 'Reset Password Button', type: 'action' },
    { key: 'action_delete_user', label_bn: 'ইউজার ডিলিট বাটন', label_en: 'Delete User Button', type: 'action' },
  ],
};
