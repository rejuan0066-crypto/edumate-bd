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
  /** Granular capabilities customizable inside this tab (View, Add, Edit, Delete, Print, Approval) */
  supportsActions?: boolean;
}

export interface PageFeatureGroup {
  menuPath: string;
  features: SubFeatureItem[];
}

export const KNOWN_PAGE_FEATURES: Record<string, SubFeatureItem[]> = {
  // শিক্ষার্থী ব্যবস্থাপনা (/admin/students)
  '/admin/students': [
    { key: 'tab_list', label_bn: 'শিক্ষার্থী তালিকা', label_en: 'Student List', type: 'tab' },
    { key: 'tab_admission', label_bn: 'নতুন ভর্তি ফরম', label_en: 'Admission Form', type: 'tab' },
    { key: 'tab_roll_transfer', label_bn: 'রোল ও শ্রেণি স্থানান্তর', label_en: 'Roll & Class Transfer', type: 'tab' },
    { key: 'action_export_excel', label_bn: 'এক্সেল ডাউনলোড বাটন', label_en: 'Export Excel Button', type: 'action' },
    { key: 'action_print_profile', label_bn: 'প্রোফাইল প্রিন্ট বাটন', label_en: 'Print Profile Button', type: 'action' },
    { key: 'action_status_change', label_bn: 'ছাত্র অবস্থা পরিবর্তন (Active/Inactive)', label_en: 'Change Student Status', type: 'action' },
    { key: 'action_delete_student', label_bn: 'শিক্ষার্থী মুছে ফেলার বাটন', label_en: 'Delete Student Button', type: 'action' },
  ],

  // শিক্ষক ও স্টাফ (/admin/staff)
  '/admin/staff': [
    { key: 'tab_staff_list', label_bn: 'স্টাফ ও শিক্ষক তালিকা', label_en: 'Staff List', type: 'tab' },
    { key: 'tab_add_staff', label_bn: 'নতুন স্টাফ নিয়োগ ফরম', label_en: 'Add Staff Form', type: 'tab' },
    { key: 'tab_designations', label_bn: 'পদবি ও ক্যাটাগরি', label_en: 'Designations & Categories', type: 'tab' },
    { key: 'action_salary_view', label_bn: 'বেতন ও আর্থিক তথ্য দেখার অনুমতি', label_en: 'View Salary Info', type: 'action' },
    { key: 'action_export_staff', label_bn: 'স্টাফ তালিকা এক্সপোর্ট', label_en: 'Export Staff List', type: 'action' },
    { key: 'action_delete_staff', label_bn: 'স্টাফ মুছে ফেলার বাটন', label_en: 'Delete Staff Button', type: 'action' },
  ],

  // শিক্ষক প্যানেল (/admin/teachers)
  '/admin/teachers': [
    { key: 'tab_teacher_list', label_bn: 'শিক্ষক তালিকা', label_en: 'Teachers List', type: 'tab' },
    { key: 'tab_assign_subject', label_bn: 'বিষয় বরাদ্দ', label_en: 'Assign Subjects', type: 'tab' },
    { key: 'action_export_teachers', label_bn: 'শিক্ষক তালিকা এক্সপোর্ট', label_en: 'Export Teachers', type: 'action' },
  ],

  // ছাত্র ফি (/admin/students-fees)
  '/admin/students-fees': [
    { key: 'tab_fees_collect', label_bn: 'ফি আদায় ও জমা', label_en: 'Collect Fees', type: 'tab' },
    { key: 'tab_fees_dues', label_bn: 'বকেয়া তালিকা', label_en: 'Dues List', type: 'tab' },
    { key: 'tab_fees_reports', label_bn: 'ফি আদায় রিপোর্ট ও পরিসংখ্যান', label_en: 'Fee Reports', type: 'tab' },
    { key: 'tab_online_payments', label_bn: 'অনলাইন পেমেন্ট লগ', label_en: 'Online Payments Log', type: 'tab' },
    { key: 'action_waiver_discount', label_bn: 'ফি মওকুফ বা ছাড় প্রদান', label_en: 'Grant Waiver / Discount', type: 'action' },
    { key: 'action_delete_receipt', label_bn: 'জমা রসিদ বাতিল বা মোছা', label_en: 'Delete Payment Receipt', type: 'action' },
    { key: 'action_export_dues', label_bn: 'বকেয়া তালিকা এক্সপোর্ট', label_en: 'Export Dues List', type: 'action' },
  ],

  // ফি রসিদ (/admin/fee-receipts)
  '/admin/fee-receipts': [
    { key: 'tab_receipt_list', label_bn: 'রসিদ তালিকা', label_en: 'Receipt List', type: 'tab' },
    { key: 'action_print_receipt', label_bn: 'রসিদ প্রিন্ট বাটন', label_en: 'Print Receipt Button', type: 'action' },
    { key: 'action_cancel_receipt', label_bn: 'রসিদ বাতিল বাটন', label_en: 'Cancel Receipt Button', type: 'action' },
    { key: 'action_download_pdf', label_bn: 'PDF ডাউনলোড বাটন', label_en: 'Download PDF Button', type: 'action' },
  ],

  // হিসাব ও খরচ (/admin/expenses)
  '/admin/expenses': [
    { key: 'tab_dashboard', label_bn: 'ট্যাব: হিসাব ও ব্যয় এন্ট্রি', label_en: 'Tab: Expenses Entry', type: 'tab', description_bn: 'প্রতিষ্ঠান ভিত্তিক খরচ ও বকেয়া তালিকা দেখার ট্যাব' },
    { key: 'tab_deposits', label_bn: 'ট্যাব: টাকা আয়/উত্তোলন', label_en: 'Tab: Deposits & Incomes', type: 'tab', description_bn: 'টাকা আয় ও ব্যাংকে জমা/উত্তোলন হিসাবের ট্যাব' },
    { key: 'tab_hierarchy', label_bn: 'ট্যাব: প্রতিষ্ঠান ভিত্তিক রিপোর্ট', label_en: 'Tab: Institution Report', type: 'tab', description_bn: 'ব্যয় খাত ও প্রতিষ্ঠান ভিত্তিক বিস্তারিত খরচের রিপোর্ট' },
    { key: 'tab_summary', label_bn: 'ট্যাব: সারাংশ (Summary)', label_en: 'Tab: Financial Summary', type: 'tab', description_bn: 'আয়-ব্যয়, ক্যাশ ও মোট ব্যালেন্সের সারাংশ বিবরণী' },
    { key: 'tab_ledger', label_bn: 'ট্যাব: লেজার (Ledger)', label_en: 'Tab: General Ledger', type: 'tab', description_bn: 'সাধারণ খতিয়ান ও ডেবিট-ক্রেডিট হিসাব খাতা' },
    { key: 'tab_settings', label_bn: 'ট্যাব: প্রতিষ্ঠান ও ব্যয় খাত সেটিংস', label_en: 'Tab: Institution & Expense Head Settings', type: 'tab', description_bn: 'প্রতিষ্ঠান ও ব্যয়ের খাত তৈরি ও কনফিগারেশন' },
    { key: 'tab_audit', label_bn: 'ট্যাব: অডিট লগ (Audit Log)', label_en: 'Tab: Accounts Audit Log', type: 'tab', description_bn: 'হিসাব পরিবর্তন ও নিরীক্ষা ইতিহাস' },
    { key: 'action_add_expense', label_bn: 'বাটন: ব্যয় এন্ট্রি (+ Add Expense)', label_en: 'Button: Add Expense Entry', type: 'action', description_bn: 'নতুন খরচের ভাউচার তৈরি করার বাটন' },
    { key: 'action_add_deposit', label_bn: 'বাটন: টাকা আয়/উত্তোলন যোগ (+ Add Deposit)', label_en: 'Button: Add Deposit', type: 'action', description_bn: 'নতুন আয় অথবা জমা যুক্ত করার বাটন' },
    { key: 'action_export_excel', label_bn: 'বাটন: এক্সেল ডাউনলোড (Excel Export)', label_en: 'Button: Export Excel', type: 'action', description_bn: 'হিসাবের এক্সেল শিট ডাউনলোড করার বাটন' },
    { key: 'action_export_pdf', label_bn: 'বাটন: PDF ডাউনলোড (PDF Export)', label_en: 'Button: Export PDF', type: 'action', description_bn: 'অফিসিয়াল PDF রিপোর্ট ডাউনলোড করার বাটন' },
    { key: 'action_print_voucher', label_bn: 'বাটন: প্রিন্ট ও ভাউচার (Print Voucher)', label_en: 'Button: Print Voucher', type: 'action', description_bn: 'ব্যয় ভাউচার ও রসিদ প্রিন্ট করার বাটন' },
    { key: 'action_edit_transaction', label_bn: 'বাটন: হিসাব সম্পাদনা (Edit Expense/Deposit)', label_en: 'Button: Edit Transaction', type: 'action', description_bn: 'পূর্ববর্তী হিসাবের পরিমাণ বা বিবরণ এডিট করার বাটন' },
    { key: 'action_delete_transaction', label_bn: 'বাটন: হিসাব মুছে ফেলা (Delete Expense/Deposit)', label_en: 'Button: Delete Transaction', type: 'action', description_bn: 'ভুল বা বাতিল লেনদেন মুছে ফেলার বাটন' },
    { key: 'action_manage_categories', label_bn: 'বাটন: প্রতিষ্ঠান ও ব্যয় খাত পরিবর্তন', label_en: 'Button: Manage Expense Heads & Inst', type: 'action', description_bn: 'নতুন ব্যয় খাত বা প্রতিষ্ঠান যুক্ত/মুছে ফেলার সুবিধা' },
  ],

  // বেতন ব্যবস্থাপনা (/admin/salary)
  '/admin/salary': [
    { key: 'tab_salary_disburse', label_bn: 'বেতন তৈরি ও প্রদান', label_en: 'Disburse Salary', type: 'tab' },
    { key: 'tab_bonus', label_bn: 'বোনাস ও বিশেষ ভাতা', label_en: 'Bonus & Allowance', type: 'tab' },
    { key: 'tab_savings_fund', label_bn: 'কল্যাণ ও প্রভিডেন্ট ফান্ড', label_en: 'Savings Fund', type: 'tab' },
    { key: 'tab_salary_settings', label_bn: 'বেতন স্ট্রাকচার ও ফর্মুলা', label_en: 'Salary Formula Settings', type: 'tab' },
    { key: 'action_payslip_print', label_bn: 'পে-স্লিপ প্রিন্ট বাটন', label_en: 'Print Pay Slip', type: 'action' },
    { key: 'action_delete_salary', label_bn: 'বেতন রেকর্ড মোছার বাটন', label_en: 'Delete Salary Record', type: 'action' },
  ],

  // ফলাফল ও পরীক্ষা (/admin/results)
  '/admin/results': [
    { key: 'tab_marks_entry', label_bn: 'নম্বর এন্ট্রি', label_en: 'Marks Entry', type: 'tab' },
    { key: 'tab_tabulation_sheet', label_bn: 'ট্যাবুলেশন শিট', label_en: 'Tabulation Sheet', type: 'tab' },
    { key: 'tab_publish_settings', label_bn: 'ফলাফল প্রকাশ ও লক সেটিংস', label_en: 'Result Publish & Lock', type: 'tab' },
    { key: 'tab_grade_system', label_bn: 'গ্রেডিং পলিসি', label_en: 'Grading Policy', type: 'tab' },
    { key: 'action_publish_result', label_bn: 'ফলাফল পাবলিশ বোতাম', label_en: 'Publish Result Button', type: 'action' },
    { key: 'action_print_marksheet', label_bn: 'মার্কশিট প্রিন্ট বোতাম', label_en: 'Print Marksheet Button', type: 'action' },
  ],

  // হাজিরা (/admin/attendance)
  '/admin/attendance': [
    { key: 'tab_student_att', label_bn: 'ছাত্র হাজিরা', label_en: 'Student Attendance', type: 'tab' },
    { key: 'tab_staff_att', label_bn: 'শিক্ষক/স্টাফ হাজিরা', label_en: 'Staff Attendance', type: 'tab' },
    { key: 'tab_att_reports', label_bn: 'মাসিক হাজিরা রিপোর্ট', label_en: 'Monthly Attendance Report', type: 'tab' },
    { key: 'tab_att_settings', label_bn: 'হাজিরা শিফট সেটিংস', label_en: 'Attendance Shift Settings', type: 'tab' },
    { key: 'action_send_sms', label_bn: 'অনুপস্থিতির SMS পাঠানোর বাটন', label_en: 'Send Absence SMS Button', type: 'action' },
    { key: 'action_export_att', label_bn: 'হাজিরা এক্সপোর্ট বাটন', label_en: 'Export Attendance Button', type: 'action' },
  ],

  // প্রশ্নপত্র (/admin/question-papers)
  '/admin/question-papers': [
    { key: 'tab_all_papers', label_bn: 'সকল প্রশ্নপত্র', label_en: 'All Question Papers', type: 'tab' },
    { key: 'tab_create_paper', label_bn: 'নতুন প্রশ্নপত্র তৈরি', label_en: 'Create Question Paper', type: 'tab' },
    { key: 'tab_question_bank', label_bn: 'প্রশ্ন ব্যাংক', label_en: 'Question Bank', type: 'tab' },
    { key: 'action_approve_paper', label_bn: 'প্রশ্নপত্র চূড়ান্ত অনুমোদন বাটন', label_en: 'Approve Question Paper', type: 'action' },
    { key: 'action_download_paper', label_bn: 'প্রশ্নপত্র PDF ডাউনলোড', label_en: 'Download Paper PDF', type: 'action' },
  ],

  // অনলাইন পরীক্ষা (/admin/online-exams)
  '/admin/online-exams': [
    { key: 'tab_exam_list', label_bn: 'অনলাইন পরীক্ষা তালিকা', label_en: 'Online Exams List', type: 'tab' },
    { key: 'tab_create_exam', label_bn: 'নতুন পরীক্ষা তৈরি', label_en: 'Create Online Exam', type: 'tab' },
    { key: 'tab_exam_monitor', label_bn: 'লাইভ মনিটরিং', label_en: 'Live Exam Monitor', type: 'tab' },
    { key: 'tab_exam_results', label_bn: 'পরীক্ষার মূল্যায়ন ও ফলাফল', label_en: 'Exam Results', type: 'tab' },
  ],

  // হোস্টেল (/admin/hostel)
  '/admin/hostel': [
    { key: 'tab_hostels', label_bn: 'হোস্টেল ও ভবন', label_en: 'Hostels & Buildings', type: 'tab' },
    { key: 'tab_rooms', label_bn: 'রুম ও সিট বিন্যাস', label_en: 'Rooms & Seats', type: 'tab' },
    { key: 'tab_allocations', label_bn: 'সিট বরাদ্দ', label_en: 'Seat Allocations', type: 'tab' },
    { key: 'tab_meals', label_bn: 'মিল ও খাবার মিল-অফ', label_en: 'Meals & Meal Off', type: 'tab' },
  ],

  // লাইব্রেরি (/admin/library)
  '/admin/library': [
    { key: 'tab_lib_dashboard', label_bn: 'ড্যাশবোর্ড', label_en: 'Dashboard', type: 'tab' },
    { key: 'tab_lib_inventory', label_bn: 'বইয়ের তালিকা ও ক্যাটালগ', label_en: 'Book Catalog', type: 'tab' },
    { key: 'tab_lib_issue', label_bn: 'বই ইস্যু ও রিটার্ন', label_en: 'Issue & Return', type: 'tab' },
    { key: 'tab_lib_reports', label_bn: 'লাইব্রেরি রিপোর্ট ও জরিমানা', label_en: 'Library Reports & Fine', type: 'tab' },
  ],

  // ইনভেন্টরি ও সম্পদ (/admin/inventory)
  '/admin/inventory': [
    { key: 'tab_items', label_bn: 'মালামাল ও সম্পদ তালিকা', label_en: 'Items Inventory', type: 'tab' },
    { key: 'tab_add_item', label_bn: 'নতুন মালামাল এন্ট্রি', label_en: 'Add New Item', type: 'tab' },
    { key: 'tab_issue_item', label_bn: 'বিতরণ ও রিলিজ', label_en: 'Issue Item', type: 'tab' },
    { key: 'tab_suppliers', label_bn: 'সরবরাহকারী / ভেন্ডর', label_en: 'Suppliers / Vendors', type: 'tab' },
  ],

  // নোটিশ (/admin/notices)
  '/admin/notices': [
    { key: 'tab_notice_list', label_bn: 'নোটিশ তালিকা', label_en: 'Notice List', type: 'tab' },
    { key: 'tab_add_notice', label_bn: 'নতুন নোটিশ তৈরি', label_en: 'Create Notice', type: 'tab' },
    { key: 'action_publish_website', label_bn: 'ওয়েবসাইটে প্রদর্শনের বাটন', label_en: 'Publish to Website', type: 'action' },
    { key: 'action_push_notify', label_bn: 'SMS/নোটিফিকেশন পুশ বাটন', label_en: 'Push Notification Alert', type: 'action' },
  ],

  // অভিভাবক নোটিফিকেশন (/admin/guardian-notify & /admin/guardian-notifications)
  '/admin/guardian-notify': [
    { key: 'tab_sms_send', label_bn: 'বার্তা প্রেরণ', label_en: 'Send Message', type: 'tab' },
    { key: 'tab_sms_history', label_bn: 'ডেলিভারি ইতিহাস', label_en: 'Delivery History', type: 'tab' },
    { key: 'tab_whatsapp_inbox', label_bn: 'হোয়াটসঅ্যাপ চ্যাট ও ইনবক্স', label_en: 'WhatsApp Live Chat & Inbox', type: 'tab' },
    { key: 'action_reply_message', label_bn: 'চ্যাটে রিপ্লাই দেওয়ার বাটন', label_en: 'Reply to WhatsApp Chat', type: 'action' },
    { key: 'tab_sms_templates', label_bn: 'SMS টেমপ্লেট', label_en: 'SMS Templates', type: 'tab' },
    { key: 'tab_sms_balance', label_bn: 'SMS ব্যালেন্স ও রিচার্জ', label_en: 'SMS Balance', type: 'tab' },
  ],
  '/admin/guardian-notifications': [
    { key: 'tab_sms_send', label_bn: 'বার্তা প্রেরণ', label_en: 'Send Message', type: 'tab' },
    { key: 'tab_sms_history', label_bn: 'ডেলিভারি ইতিহাস', label_en: 'Delivery History', type: 'tab' },
    { key: 'tab_whatsapp_inbox', label_bn: 'হোয়াটসঅ্যাপ চ্যাট ও ইনবক্স', label_en: 'WhatsApp Live Chat & Inbox', type: 'tab' },
    { key: 'action_reply_message', label_bn: 'চ্যাটে রিপ্লাই দেওয়ার বাটন', label_en: 'Reply to WhatsApp Chat', type: 'action' },
  ],

  // হোয়াটসঅ্যাপ লাইভ চ্যাট (/admin/whatsapp-chat)
  '/admin/whatsapp-chat': [
    { key: 'tab_chat_list', label_bn: 'চ্যাট ও বার্তা দেখার অনুমতি', label_en: 'View Chats & Messages', type: 'tab' },
    { key: 'action_reply_message', label_bn: 'সরাসরি মেসেজ ও রিপ্লাই পাঠানো', label_en: 'Send & Reply Message', type: 'action' },
  ],

  // ওয়েবসাইট নিয়ন্ত্রণ (/admin/website)
  '/admin/website': [
    { key: 'tab_hero_slider', label_bn: 'স্লাইডার ব্যানার', label_en: 'Hero Slider', type: 'tab' },
    { key: 'tab_principal_message', label_bn: 'প্রধান শিক্ষকের বাণী', label_en: 'Principal Message', type: 'tab' },
    { key: 'tab_gallery', label_bn: 'ফটো গ্যালারি', label_en: 'Photo Gallery', type: 'tab' },
    { key: 'tab_social_links', label_bn: 'সোশ্যাল মিডিয়া ও যোগাযোগ', label_en: 'Social Links & Contact', type: 'tab' },
    { key: 'tab_custom_css', label_bn: 'কাস্টম ডিজাইন ও সিএসএস', label_en: 'Custom CSS', type: 'tab' },
  ],

  // আইডি কার্ড (/admin/id-cards)
  '/admin/id-cards': [
    { key: 'tab_student_card', label_bn: 'শিক্ষার্থী আইডি কার্ড', label_en: 'Student ID Card', type: 'tab' },
    { key: 'tab_staff_card', label_bn: 'স্টাফ আইডি কার্ড', label_en: 'Staff ID Card', type: 'tab' },
    { key: 'tab_card_template', label_bn: 'কার্ড টেমপ্লেট ডিজাইনার', label_en: 'Card Template Designer', type: 'tab' },
    { key: 'action_bulk_print', label_bn: 'একসাথে সকল কার্ড প্রিন্ট', label_en: 'Bulk Print Cards', type: 'action' },
  ],

  // ক্লাস ও পরীক্ষার রুটিন (/admin/class-routine)
  '/admin/class-routine': [
    { key: 'tab_class_routine', label_bn: 'শ্রেণি অনুযায়ী রুটিন', label_en: 'Class Routine', type: 'tab' },
    { key: 'tab_teacher_routine', label_bn: 'শিক্ষক অনুযায়ী রুটিন', label_en: 'Teacher Routine', type: 'tab' },
    { key: 'action_print_routine', label_bn: 'রুটিন প্রিন্ট বাটন', label_en: 'Print Routine Button', type: 'action' },
  ],

  // দাতা ও যাকাত (/admin/donors)
  '/admin/donors': [
    { key: 'tab_donors_list', label_bn: 'দাতা তালিকা', label_en: 'Donors List', type: 'tab' },
    { key: 'tab_add_donor', label_bn: 'নতুন দাতা সংযুক্তি', label_en: 'Add Donor', type: 'tab' },
    { key: 'tab_donations_history', label_bn: 'অনুদান হিস্ট্রি', label_en: 'Donations History', type: 'tab' },
    { key: 'action_print_certificate', label_bn: 'সম্মাননা সনদ প্রিন্ট বাটন', label_en: 'Print Certificate Button', type: 'action' },
  ],

  // সিস্টেম সেটিংস (/admin/settings)
  '/admin/settings': [
    { key: 'tab_general', label_bn: 'সাধারণ সেটিংস ও প্রতিষ্ঠান তথ্য', label_en: 'General Info', type: 'tab' },
    { key: 'tab_sms', label_bn: 'এসএমএস গেটওয়ে কনফিগারেশন', label_en: 'SMS Gateway Config', type: 'tab' },
    { key: 'tab_whatsapp', label_bn: 'হোয়াটসঅ্যাপ গেটওয়ে', label_en: 'WhatsApp Gateway', type: 'tab' },
    { key: 'tab_payment', label_bn: 'পেমেন্ট গেটওয়ে (বিকাশ/নগদ/SSL)', label_en: 'Payment Gateway', type: 'tab' },
    { key: 'tab_security', label_bn: 'সিকিউরিটি ও ডিভাইস অডিট', label_en: 'Security & Device Audit', type: 'tab' },
    { key: 'tab_email', label_bn: 'ইমেইল SMTP সেটিংস', label_en: 'Email SMTP Settings', type: 'tab' },
  ],

  // ইউজার ম্যানেজমেন্ট (/admin/user-management)
  '/admin/user-management': [
    { key: 'tab_users', label_bn: 'ইউজার তালিকা', label_en: 'User List', type: 'tab' },
    { key: 'tab_roles', label_bn: 'রোল ও পারমিশন হাব', label_en: 'Roles & Permissions', type: 'tab' },
    { key: 'tab_access', label_bn: 'কুইক অ্যাক্সেস কন্ট্রোল', label_en: 'Quick Access', type: 'tab' },
    { key: 'action_create_user', label_bn: 'নতুন ইউজার তৈরি বাটন', label_en: 'Create User Button', type: 'action' },
    { key: 'action_reset_password', label_bn: 'পাসওয়ার্ড রিসেট বাটন', label_en: 'Reset Password Button', type: 'action' },
    { key: 'action_delete_user', label_bn: 'ইউজার ডিলিট বাটন', label_en: 'Delete User Button', type: 'action' },
  ],

  // মেকার-চেকার অনুমোদন (/admin/approvals)
  '/admin/approvals': [
    { key: 'tab_pending', label_bn: 'অপেক্ষমাণ অনুমোদন (Pending)', label_en: 'Pending Approvals', type: 'tab' },
    { key: 'tab_history', label_bn: 'অনুমোদন হিস্ট্রি (History)', label_en: 'Approval History', type: 'tab' },
    { key: 'action_bulk_approve', label_bn: 'একসাথে সকল অনুমোদন বাটন', label_en: 'Bulk Approve Button', type: 'action' },
    { key: 'action_reject', label_bn: 'বাতিল/রিজেক্ট বাটন', label_en: 'Reject Button', type: 'action' },
  ],
};
