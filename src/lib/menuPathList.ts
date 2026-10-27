import type { MenuItemConfig } from '@/hooks/useMenuSettings';

export type MenuPathItem = {
  path: string;
  label_bn: string;
  label_en: string;
  group_bn?: string;
  group_en?: string;
};

/**
 * COMPLETE MASTER LIST OF ALL ADMIN PAGES & MODULES
 * Every page in App.tsx is catalogued here with proper category group & bilingual labels.
 */
export const DEFAULT_MENU_PATHS: MenuPathItem[] = [
  // ===== ড্যাশবোর্ড ও রিপোর্ট =====
  { path: '/admin', label_bn: 'ড্যাশবোর্ড', label_en: 'Dashboard', group_bn: 'ড্যাশবোর্ড ও রিপোর্ট', group_en: 'Dashboard & Reports' },
  { path: '/admin/analytics', label_bn: 'অ্যানালিটিক্স ও পরিসংখ্যান', label_en: 'Analytics & Stats', group_bn: 'ড্যাশবোর্ড ও রিপোর্ট', group_en: 'Dashboard & Reports' },
  { path: '/admin/reports', label_bn: 'রিপোর্ট ও অ্যানালিটিক্স', label_en: 'Reports & Analytics', group_bn: 'ড্যাশবোর্ড ও রিপোর্ট', group_en: 'Dashboard & Reports' },
  { path: '/admin/staff-reports', label_bn: 'স্টাফ রিপোর্ট ও রেকর্ড', label_en: 'Staff Reports', group_bn: 'ড্যাশবোর্ড ও রিপোর্ট', group_en: 'Dashboard & Reports' },
  { path: '/admin/profile', label_bn: 'ব্যক্তিগত প্রোফাইল', label_en: 'Profile', group_bn: 'ড্যাশবোর্ড ও রিপোর্ট', group_en: 'Dashboard & Reports' },

  // ===== শিক্ষার্থী ও ভর্তি =====
  { path: '/admin/students', label_bn: 'শিক্ষার্থী ব্যবস্থাপনা', label_en: 'Students Management', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/bulk-import', label_bn: 'বাল্ক শিক্ষার্থী ইমপোর্ট', label_en: 'Bulk Student Import', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/student-categories', label_bn: 'শিক্ষার্থী ক্যাটাগরি', label_en: 'Student Categories', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/divisions', label_bn: 'বিভাগ, শ্রেণি ও শাখা', label_en: 'Divisions & Classes', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/academic-sessions', label_bn: 'একাডেমিক সেশন ও বর্ষ', label_en: 'Academic Sessions', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/subjects', label_bn: 'বিষয়সমূহ ও সিলেবাস', label_en: 'Subjects & Syllabus', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/student-promotion', label_bn: 'শ্রেণি প্রমোশন ও পাস', label_en: 'Student Promotion', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/student-certificates', label_bn: 'সার্টিফিকেট ও প্রশংসাপত্র', label_en: 'Certificates & Testimonials', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/admission-letters', label_bn: 'ভর্তি পত্র ও অফার লেটার', label_en: 'Admission Letters', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/admission-tests', label_bn: 'ভর্তি পরীক্ষা ও মূল্যায়ন', label_en: 'Admission Tests', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/scholarships', label_bn: 'বৃত্তি ও উপবৃত্তি', label_en: 'Scholarships & Stipends', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/student-approvals', label_bn: 'শিক্ষার্থী তথ্য অনুমোদন', label_en: 'Student Approvals', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/parent-approvals', label_bn: 'অভিভাবক তথ্য অনুমোদন', label_en: 'Parent Approvals', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/parent-link-audit', label_bn: 'অভিভাবক সংযোগ অডিট', label_en: 'Parent Link Audit', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },
  { path: '/admin/parent-signup-fields', label_bn: 'অভিভাবক সাইনআপ ফিল্ড', label_en: 'Parent Signup Fields', group_bn: 'শিক্ষার্থী ও অ্যাকাডেমিক', group_en: 'Students & Academics' },

  // ===== পরীক্ষা ও ফলাফল =====
  { path: '/admin/results', label_bn: 'ফলাফল ও গ্রেডশিট', label_en: 'Results & Grade Sheets', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/merit-list', label_bn: 'মেধা তালিকা ও র‍্যাঙ্কিং', label_en: 'Merit List & Rankings', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/exam-sessions', label_bn: 'পরীক্ষার সেশন ও টার্ম', label_en: 'Exam Sessions', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/exam-routine', label_bn: 'পরীক্ষার রুটিন ও আসন', label_en: 'Exam Routine & Seats', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/class-routine', label_bn: 'ক্লাস রুটিন ও পিরিয়ড', label_en: 'Class Routine & Timetable', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/question-papers', label_bn: 'প্রশ্নপত্র প্রণয়ন ও ব্যাংক', label_en: 'Question Papers Bank', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/online-exams', label_bn: 'অনলাইন পরীক্ষা (MCQ/লিখিত)', label_en: 'Online Exams', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/live-classes', label_bn: 'লাইভ ক্লাস ও অনলাইন সেশন', label_en: 'Live Classes', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },
  { path: '/admin/meetings', label_bn: 'অনলাইন সভা ও মিটিং', label_en: 'Online Meetings', group_bn: 'পরীক্ষা ও ফলাফল', group_en: 'Exams & Results' },

  // ===== শিক্ষক, স্টাফ ও প্রশাসন =====
  { path: '/admin/staff', label_bn: 'সকল স্টাফ ও শিক্ষক', label_en: 'All Staff & Teachers', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/teachers', label_bn: 'শিক্ষক প্যানেল', label_en: 'Teachers Panel', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/administrative-staff', label_bn: 'প্রশাসনিক কর্মকর্তা তালিকা', label_en: 'Administrative Staff', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/administrative', label_bn: 'প্রশাসনিক শাখা ও দায়িত্ব', label_en: 'Administrative Wings', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/support-staff', label_bn: 'সাপোর্ট স্টাফ', label_en: 'Support Staff', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/general-staff', label_bn: 'সহায়ক ও সাধারণ কর্মচারী', label_en: 'General Staff', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/directors', label_bn: 'পরিচালকবৃন্দ ও ট্রাস্টি', label_en: 'Directors & Trustees', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/committees', label_bn: 'কমিটি ব্যবস্থাপনা', label_en: 'Committees Management', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/committee-members', label_bn: 'কমিটি সদস্যবৃন্দ', label_en: 'Committee Members', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/committee-audit-log', label_bn: 'কমিটি অডিট লগ', label_en: 'Committee Audit Log', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/designations', label_bn: 'পদবি তৈরি ও গ্রেড', label_en: 'Designations & Hierarchy', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/duty-roster', label_bn: 'ডিউটি রোস্টার ও শিফট', label_en: 'Duty Roster', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/staff-holidays', label_bn: 'স্টাফ ছুটির তালিকা ও ক্যালেন্ডার', label_en: 'Staff Holidays Calendar', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/resign-letters', label_bn: 'পদত্যাগ পত্র ও ছাড়পত্র', label_en: 'Resign Letters', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/joining-letters', label_bn: 'যোগদান পত্র ও নিয়োগপত্র', label_en: 'Joining Letters', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },
  { path: '/admin/health-records', label_bn: 'স্বাস্থ্য ও মেডিকেল রেকর্ড', label_en: 'Health Records', group_bn: 'শিক্ষক ও স্টাফ', group_en: 'Teachers & Staff' },

  // ===== হাজিরা (Attendance) =====
  { path: '/admin/attendance', label_bn: 'হাজিরা নিয়ন্ত্রণ হাব', label_en: 'Attendance Hub', group_bn: 'হাজিরা ব্যবস্থাপনা', group_en: 'Attendance Management' },
  { path: '/admin/student-attendance', label_bn: 'শিক্ষার্থী হাজিরা', label_en: 'Student Attendance', group_bn: 'হাজিরা ব্যবস্থাপনা', group_en: 'Attendance Management' },
  { path: '/admin/staff-attendance', label_bn: 'শিক্ষক ও স্টাফ হাজিরা', label_en: 'Staff Attendance', group_bn: 'হাজিরা ব্যবস্থাপনা', group_en: 'Attendance Management' },
  { path: '/admin/shift-audit-log', label_bn: 'শিফট ও বায়োমেট্রিক লগ', label_en: 'Shift & Biometric Audit', group_bn: 'হাজিরা ব্যবস্থাপনা', group_en: 'Attendance Management' },

  // ===== হিসাব, ফি ও বেতন =====
  { path: '/admin/expenses', label_bn: 'আয়-ব্যয় ও হিসাব ব্যবস্থাপনা', label_en: 'Accounts & Expenses', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/students-fees', label_bn: 'শিক্ষার্থী ফি ও বকেয়া', label_en: 'Student Fees & Dues', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/fee-types', label_bn: 'ফি এর ধরন ও কাঠামো', label_en: 'Fee Types Structure', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/fee-categories', label_bn: 'ফি ক্যাটাগরি ও হেড', label_en: 'Fee Categories & Heads', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/fee-receipts', label_bn: 'ফি রসিদ ও ভাউচার', label_en: 'Fee Receipts & Vouchers', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/receipt-designer', label_bn: 'রসিদ ডিজাইন ও ফরম্যাট', label_en: 'Receipt Designer', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/receipt-audit', label_bn: 'রসিদ যাচাই ও অডিট', label_en: 'Receipt Audit', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/receipts-role-audit', label_bn: 'রসিদ রোল অডিট', label_en: 'Receipts Role Audit', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/verified-payments', label_bn: 'অনলাইন ভেরিফাইড পেমেন্টস', label_en: 'Verified Online Payments', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/verified-payments-role-audit', label_bn: 'ভেরিফাইড পেমেন্ট রোল অডিট', label_en: 'Verified Payments Role Audit', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/payments', label_bn: 'পেমেন্ট গেটওয়ে কনফিগারেশন', label_en: 'Payments Gateway Config', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/salary', label_bn: 'বেতন ও ভাতাদি ব্যবস্থাপনা', label_en: 'Salary & Payroll', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/budgets', label_bn: 'বাজেট ও বার্ষিক পরিকল্পনা', label_en: 'Budgets Planning', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/donors', label_bn: 'দাতা ও অনুদান তালিকা', label_en: 'Donors & Donations', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/donors-role-audit', label_bn: 'দাতা রোল অডিট', label_en: 'Donors Role Audit', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/zakat-fitra', label_bn: 'যাকাত ও ফিতরা তহবিল', label_en: 'Zakat & Fitra Fund', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/zakat-logs', label_bn: 'যাকাত বিতরণ লগ', label_en: 'Zakat Distribution Logs', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },
  { path: '/admin/accounts-audit', label_bn: 'হিসাব নিরীক্ষা ও অডিট', label_en: 'Accounts Audit', group_bn: 'হিসাব ও আর্থিক ব্যবস্থাপনা', group_en: 'Finance & Accounts' },

  // ===== হোস্টেল, লাইব্রেরি ও ইনভেন্টরি =====
  { path: '/admin/hostel', label_bn: 'হোস্টেল ও আবাসন', label_en: 'Hostel & Housing', group_bn: 'হোস্টেল ও সম্পদ', group_en: 'Hostel & Assets' },
  { path: '/admin/library', label_bn: 'লাইব্রেরি ও বই ব্যবস্থাপনা', label_en: 'Library Management', group_bn: 'হোস্টেল ও সম্পদ', group_en: 'Hostel & Assets' },
  { path: '/admin/library-audit', label_bn: 'লাইব্রেরি অডিট ও স্টক', label_en: 'Library Stock Audit', group_bn: 'হোস্টেল ও সম্পদ', group_en: 'Hostel & Assets' },
  { path: '/admin/inventory', label_bn: 'ইনভেন্টরি ও সম্পদ মালামাল', label_en: 'Inventory & Assets', group_bn: 'হোস্টেল ও সম্পদ', group_en: 'Hostel & Assets' },

  // ===== যোগাযোগ ও নোটিফিকেশন =====
  { path: '/admin/notices', label_bn: 'নোটিশ বোর্ড ও প্রজ্ঞাপন', label_en: 'Notices Board', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/guardian-notify', label_bn: 'বাল্ক মেসেজ ও নোটিফিকেশন সেন্টার', label_en: 'Bulk Messaging & Notification Center', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/messages', label_bn: 'ইনবক্স ও অভ্যন্তরীণ বার্তা', label_en: 'Internal Messages', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/parent-messages', label_bn: 'অভিভাবক মেসেজ ইনবক্স', label_en: 'Parent Messages Inbox', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/push-notifications', label_bn: 'পুশ নোটিফিকেশন ব্রডকাস্ট', label_en: 'Push Notifications', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/whatsapp-queue', label_bn: 'হোয়াটসঅ্যাপ বার্তা কিউ', label_en: 'WhatsApp Queue', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/whatsapp-logs', label_bn: 'হোয়াটসঅ্যাপ বার্তা লগ', label_en: 'WhatsApp Logs', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/email-templates', label_bn: 'ইমেইল টেমপ্লেট ও ফরম্যাট', label_en: 'Email Templates', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/email-delivery-log', label_bn: 'ইমেইল ডেলিভারি লগ', label_en: 'Email Delivery Logs', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/complaints', label_bn: 'অভিযোগ ও পরামর্শ বক্স', label_en: 'Complaints & Feedback Box', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },
  { path: '/admin/complaints-role-audit', label_bn: 'অভিযোগ রোল অডিট', label_en: 'Complaints Role Audit', group_bn: 'যোগাযোগ ও বার্তা', group_en: 'Communication & Notices' },

  // ===== ওয়েবসাইট ও স্টুডিও =====
  { path: '/admin/website', label_bn: 'ওয়েবসাইট ফ্রন্টেন্ড নিয়ন্ত্রণ', label_en: 'Website Frontend Control', group_bn: 'ওয়েবসাইট ও পাবলিশিং', group_en: 'Website & Publishing' },
  { path: '/admin/posts', label_bn: 'নিউজ, ব্লগ ও পোস্ট', label_en: 'News & Blog Posts', group_bn: 'ওয়েবসাইট ও পাবলিশিং', group_en: 'Website & Publishing' },
  { path: '/admin/design-studio', label_bn: 'ডিজাইন স্টুডিও ও ব্যানার বিল্ডার', label_en: 'Design Studio & Banners', group_bn: 'ওয়েবসাইট ও পাবলিশিং', group_en: 'Website & Publishing' },
  { path: '/admin/photo-tools', label_bn: 'ছবি টুলস ও সাইজ কনভার্টার', label_en: 'Photo Tools', group_bn: 'ওয়েবসাইট ও পাবলিশিং', group_en: 'Website & Publishing' },
  { path: '/admin/id-cards', label_bn: 'আইডি কার্ড জেনারেটর', label_en: 'ID Cards Generator', group_bn: 'ওয়েবসাইট ও পাবলিশিং', group_en: 'Website & Publishing' },
  { path: '/admin/prayer-calendar', label_bn: 'নামাজ ও ইসলামিক ক্যালেন্ডার', label_en: 'Prayer & Calendar', group_bn: 'ওয়েবসাইট ও পাবলিশিং', group_en: 'Website & Publishing' },

  // ===== সিস্টেম, নিরাপত্তা ও সেটিংস =====
  { path: '/admin/user-management', label_bn: 'ইউজার ম্যানেজমেন্ট ও অ্যাকাউন্ট', label_en: 'User Management', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/permissions', label_bn: 'রোল ও পারমিশন কন্ট্রোল হাব', label_en: 'Role & Permissions Hub', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/approvals', label_bn: 'মেকার-চেকার অনুমোদন কিউ', label_en: 'Maker-Checker Approvals Queue', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/settings', label_bn: 'সিস্টেম সাধারণ সেটিংস', label_en: 'System General Settings', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/theme', label_bn: 'থিম ও কালার কাস্টমাইজার', label_en: 'Theme Customizer', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/menu-manager', label_bn: 'মেনু ও নেভিগেশন ম্যানেজার', label_en: 'Menu Manager', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/widget-builder', label_bn: 'উইজেট ও কম্পোনেন্ট বিল্ডার', label_en: 'Widget Builder', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/form-builder', label_bn: 'কাস্টম ফর্ম বিল্ডার', label_en: 'Custom Form Builder', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/module-manager', label_bn: 'মডিউল অন/অফ ম্যানেজার', label_en: 'Module Manager', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/formula-builder', label_bn: 'ফর্মুলা ও হিসাব বিল্ডার', label_en: 'Formula Builder', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/validation-manager', label_bn: 'ভ্যালিডেশন ম্যানেজার', label_en: 'Validation Manager', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/address-manager', label_bn: 'ঠিকানা ও লোকেশন ম্যানেজার', label_en: 'Address Location Manager', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/api-verification', label_bn: 'API ভেরিফিকেশন ও সিকিউরিটি', label_en: 'API Verification', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/device-management', label_bn: 'ডিভাইস ম্যানেজমেন্ট ও সেশন', label_en: 'Device Management', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/blocked-devices', label_bn: 'ব্লকড ডিভাইস ও আইপি তালিকা', label_en: 'Blocked Devices & IPs', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/audit-device-allowlist', label_bn: 'অনুমোদিত ডিভাইস অডিট', label_en: 'Audit Device Allowlist', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/backup', label_bn: 'ডাটাবেস ও সিস্টেম ব্যাকআপ', label_en: 'Database & System Backup', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/recycle-bin', label_bn: 'রিসাইকেল বিন ও পুনরুদ্ধার', label_en: 'Recycle Bin', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/system-logs', label_bn: 'সিস্টেম অডিট লগ', label_en: 'System Audit Logs', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/health-check', label_bn: 'সিস্টেম হেলথ চেক ও ডায়াগনস্টিক', label_en: 'System Health Check', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/otp-recovery', label_bn: 'OTP রিকভারি ও বাইপাস', label_en: 'OTP Recovery', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
  { path: '/admin/translations', label_bn: 'বহুভাষিক অনুবাদ সেটিংস', label_en: 'Translations Settings', group_bn: 'সিস্টেম ও নিরাপত্তা', group_en: 'System & Security' },
];

/**
 * Flatten the nested sidebar menu tree into a de-duplicated list of pages so
 * every tab of the site can be permission-controlled from one place.
 */
export const flattenMenuPaths = (items: MenuItemConfig[] = []): MenuPathItem[] => {
  const seen = new Set<string>();
  const out: MenuPathItem[] = [];
  [...items]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach((parent) => {
      if (!seen.has(parent.path)) {
        seen.add(parent.path);
        out.push({
          path: parent.path,
          label_bn: parent.label_bn,
          label_en: parent.label_en,
          group_bn: parent.label_bn,
          group_en: parent.label_en,
        });
      }
      [...(parent.children ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .forEach((child) => {
          if (seen.has(child.path)) return;
          seen.add(child.path);
          out.push({
            path: child.path,
            label_bn: child.label_bn,
            label_en: child.label_en,
            group_bn: parent.label_bn,
            group_en: parent.label_en,
          });
        });
    });
  return out;
};

/** Merge the dynamic sidebar list with the master list, keeping order and eliminating duplicates. */
export const mergeMenuPaths = (
  dynamic: MenuPathItem[],
  fallback: MenuPathItem[] = DEFAULT_MENU_PATHS,
): MenuPathItem[] => {
  const map = new Map<string, MenuPathItem>();
  // 1. Put all comprehensive fallback items first
  fallback.forEach((m) => map.set(m.path, m));
  // 2. Overlay dynamic sidebar labels/order if configured
  dynamic.forEach((m) => {
    const existing = map.get(m.path);
    map.set(m.path, {
      ...existing,
      ...m,
      group_bn: m.group_bn || existing?.group_bn,
      group_en: m.group_en || existing?.group_en,
    });
  });
  return Array.from(map.values());
};
