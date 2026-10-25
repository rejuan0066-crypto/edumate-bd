import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

export interface MenuItemConfig {
  id: string;
  path: string;
  label_bn: string;
  label_en: string;
  icon: string;
  visible: boolean;
  sort_order: number;
  children?: MenuItemConfig[];
  tab_of?: string; // path of the parent page this item is a tab of
}

export interface MenuConfig {
  sidebar: MenuItemConfig[];
  public: MenuItemConfig[];
}

const DEFAULT_SIDEBAR: MenuItemConfig[] = [
  // ড্যাশবোর্ড
  { id: 'dashboard', path: '/admin', label_bn: 'ড্যাশবোর্ড', label_en: 'Dashboard', icon: 'LayoutDashboard', visible: true, sort_order: 0, children: [
    { id: 'profile', path: '/admin/profile', label_bn: 'প্রোফাইল', label_en: 'Profile', icon: 'UserCircle', visible: true, sort_order: 0 },
    { id: 'analytics', path: '/admin/analytics', label_bn: 'অ্যানালিটিক্স', label_en: 'Analytics', icon: 'BarChart3', visible: true, sort_order: 1 },
  ]},

  // ছাত্র ব্যবস্থাপনা
  { id: 'student-management', path: '/admin/students', label_bn: 'ছাত্র ব্যবস্থাপনা', label_en: 'Student Management', icon: 'Users', visible: true, sort_order: 1, children: [
    { id: 'students', path: '/admin/students', label_bn: 'ছাত্র তালিকা', label_en: 'Student List', icon: 'Users', visible: true, sort_order: 0 },
    { id: 'student-promotion', path: '/admin/student-promotion', label_bn: 'প্রমোশন/ডিমোশন', label_en: 'Promotion/Demotion', icon: 'ArrowUpDown', visible: true, sort_order: 1 },
    { id: 'admission-letters', path: '/admin/admission-letters', label_bn: 'ভর্তি পত্র', label_en: 'Admission Letters', icon: 'FileCheck', visible: true, sort_order: 2 },
    { id: 'id-cards', path: '/admin/id-cards', label_bn: 'আইডি কার্ড', label_en: 'ID Cards', icon: 'CreditCard', visible: true, sort_order: 3 },
    { id: 'student-certificates', path: '/admin/student-certificates', label_bn: 'সার্টিফিকেট/ছাড়পত্র', label_en: 'Certificates', icon: 'Award', visible: true, sort_order: 3.5 },
    { id: 'attendance-student', path: '/admin/student-attendance', label_bn: 'ছাত্র উপস্থিতি', label_en: 'Student Attendance', icon: 'CalendarCheck', visible: true, sort_order: 4 },
  ]},

  // স্টাফ ব্যবস্থাপনা
  { id: 'staff', path: '/admin/staff', label_bn: 'স্টাফ ব্যবস্থাপনা', label_en: 'Staff Management', icon: 'UserCog', visible: true, sort_order: 2, children: [
    { id: 'teachers', path: '/admin/teachers', label_bn: 'শিক্ষক', label_en: 'Teachers', icon: 'GraduationCap', visible: true, sort_order: 0 },
    { id: 'administrative-staff', path: '/admin/administrative-staff', label_bn: 'প্রশাসনিক স্টাফ', label_en: 'Administrative Staff', icon: 'Briefcase', visible: true, sort_order: 1 },
    { id: 'support-staff', path: '/admin/support-staff', label_bn: 'সহায়ক স্টাফ', label_en: 'Support Staff', icon: 'Wrench', visible: true, sort_order: 2 },
    { id: 'general-staff', path: '/admin/general-staff', label_bn: 'সাধারণ স্টাফ', label_en: 'General Staff', icon: 'HardHat', visible: true, sort_order: 3 },
    { id: 'directors', path: '/admin/directors', label_bn: 'পরিচালকবৃন্দ', label_en: 'Directors', icon: 'Crown', visible: true, sort_order: 35 },
    { id: 'committee-members', path: '/admin/committee-members', label_bn: 'কমিটি সদস্য', label_en: 'Committee Members', icon: 'Users', visible: true, sort_order: 36 },
    { id: 'designations', path: '/admin/designations', label_bn: 'পদবি তৈরি', label_en: 'Designations', icon: 'Tag', visible: true, sort_order: 4 },
    { id: 'joining-letters', path: '/admin/joining-letters', label_bn: 'যোগদান পত্র', label_en: 'Joining Letters', icon: 'FilePlus', visible: true, sort_order: 5 },
    { id: 'resign-letters', path: '/admin/resign-letters', label_bn: 'পদত্যাগ পত্র', label_en: 'Resign Letters', icon: 'FileSignature', visible: true, sort_order: 6 },
    { id: 'salary', path: '/admin/salary', label_bn: 'বেতন ব্যবস্থাপনা', label_en: 'Salary Management', icon: 'Wallet', visible: true, sort_order: 7 },
    { id: 'attendance-staff', path: '/admin/staff-attendance', label_bn: 'স্টাফ উপস্থিতি', label_en: 'Staff Attendance', icon: 'CalendarCheck', visible: true, sort_order: 8 },
    { id: 'staff-reports', path: '/admin/staff-reports', label_bn: 'স্টাফ রিপোর্ট', label_en: 'Staff Reports', icon: 'BarChart3', visible: true, sort_order: 9 },
    { id: 'staff-holidays', path: '/admin/staff-holidays', label_bn: 'ছুটির ক্যালেন্ডার', label_en: 'Holiday Calendar', icon: 'CalendarDays', visible: true, sort_order: 10 },
    { id: 'duty-roster', path: '/admin/duty-roster', label_bn: 'ডিউটি রোস্টার', label_en: 'Duty Roster', icon: 'CalendarClock', visible: true, sort_order: 11 },
  ]},

  // একাডেমিক
  { id: 'academic', path: '/admin/divisions', label_bn: 'একাডেমিক', label_en: 'Academic', icon: 'GraduationCap', visible: true, sort_order: 3, children: [
    { id: 'divisions', path: '/admin/divisions', label_bn: 'বিভাগ ও শ্রেণী', label_en: 'Division & Class', icon: 'Layers', visible: true, sort_order: 0 },
    { id: 'academic-sessions', path: '/admin/academic-sessions', label_bn: 'একাডেমিক সেশন', label_en: 'Academic Session', icon: 'CalendarDays', visible: true, sort_order: 1 },
    { id: 'subjects', path: '/admin/subjects', label_bn: 'বিষয়সমূহ', label_en: 'Subjects', icon: 'BookOpen', visible: true, sort_order: 2 },
    { id: 'class-routine', path: '/admin/class-routine', label_bn: 'ক্লাস রুটিন', label_en: 'Class Routine', icon: 'CalendarClock', visible: true, sort_order: 3 },
    { id: 'library', path: '/admin/library', label_bn: 'লাইব্রেরি', label_en: 'Library', icon: 'BookOpen', visible: true, sort_order: 4 },
  ]},

  // পরীক্ষা ও ফলাফল
  { id: 'exam-result', path: '/admin/results', label_bn: 'পরীক্ষা ও ফলাফল', label_en: 'Exam & Results', icon: 'FileText', visible: true, sort_order: 4, children: [
    { id: 'exam-sessions', path: '/admin/exam-sessions', label_bn: 'পরীক্ষা সেশন', label_en: 'Exam Sessions', icon: 'CalendarDays', visible: true, sort_order: 0 },
    { id: 'exam-routine', path: '/admin/exam-routine', label_bn: 'পরীক্ষার রুটিন', label_en: 'Exam Routine', icon: 'ClipboardList', visible: true, sort_order: 1 },
    { id: 'results', path: '/admin/results', label_bn: 'ফলাফল', label_en: 'Results', icon: 'FileText', visible: true, sort_order: 2 },
    { id: 'merit-list', path: '/admin/merit-list', label_bn: 'মেধা তালিকা', label_en: 'Merit List', icon: 'Trophy', visible: true, sort_order: 3 },
    { id: 'question-papers', path: '/admin/question-papers', label_bn: 'প্রশ্নপত্র', label_en: 'Question Papers', icon: 'FileText', visible: true, sort_order: 3 },
    { id: 'online-exams', path: '/admin/online-exams', label_bn: 'অনলাইন পরীক্ষা', label_en: 'Online Exams', icon: 'ListChecks', visible: true, sort_order: 4 },
    { id: 'admission-tests', path: '/admin/admission-tests', label_bn: 'অনলাইন ভর্তি পরীক্ষা', label_en: 'Admission Tests', icon: 'ClipboardCheck', visible: true, sort_order: 4.5 },
    { id: 'live-classes', path: '/admin/live-classes', label_bn: 'লাইভ ক্লাস', label_en: 'Live Classes', icon: 'Video', visible: true, sort_order: 5 },
    { id: 'meetings', path: '/admin/meetings', label_bn: 'মিটিং', label_en: 'Meetings', icon: 'Briefcase', visible: true, sort_order: 6 },
  ]},

  // আর্থিক
  { id: 'finance', path: '/admin/students-fees', label_bn: 'আর্থিক ব্যবস্থাপনা', label_en: 'Finance', icon: 'Wallet', visible: true, sort_order: 6, children: [
    { id: 'fees', path: '/admin/students-fees', label_bn: 'ছাত্র ফি', label_en: 'Student Fees', icon: 'CreditCard', visible: true, sort_order: 0 },
    { id: 'fee-receipts', path: '/admin/fee-receipts', label_bn: 'ফি রসিদ', label_en: 'Fee Receipts', icon: 'ReceiptText', visible: true, sort_order: 1 },
    { id: 'expenses', path: '/admin/expenses', label_bn: 'হিসাব ব্যবস্থাপনা', label_en: 'Expenses', icon: 'Receipt', visible: true, sort_order: 2 },
    { id: 'accounts-audit', path: '/admin/accounts-audit', label_bn: 'হিসাব অডিট লগ', label_en: 'Accounts Audit Log', icon: 'FileSearch', visible: true, sort_order: 2.5 },
    { id: 'payments', path: '/admin/payments', label_bn: 'পেমেন্ট', label_en: 'Payments', icon: 'CreditCard', visible: true, sort_order: 3 },
    { id: 'donors', path: '/admin/donors', label_bn: 'দাতা তালিকা', label_en: 'Donor List', icon: 'Heart', visible: true, sort_order: 4 },
    { id: 'scholarships', path: '/admin/scholarships', label_bn: 'বৃত্তি ব্যবস্থাপনা', label_en: 'Scholarships', icon: 'Award', visible: true, sort_order: 4.5 },
    { id: 'budgets', path: '/admin/budgets', label_bn: 'বাজেট ব্যবস্থাপনা', label_en: 'Budgets', icon: 'PiggyBank', visible: true, sort_order: 4.7 },
    { id: 'receipt-designer', path: '/admin/receipt-designer', label_bn: 'রসিদ ডিজাইনার', label_en: 'Receipt Designer', icon: 'ReceiptText', visible: true, sort_order: 5 },
  ]},

  // যোগাযোগ
  { id: 'communication', path: '/admin/notices', label_bn: 'যোগাযোগ', label_en: 'Communication', icon: 'Bell', visible: true, sort_order: 7, children: [
    { id: 'notices', path: '/admin/notices', label_bn: 'নোটিশ', label_en: 'Notices', icon: 'Bell', visible: true, sort_order: 0 },
    { id: 'posts', path: '/admin/posts', label_bn: 'পোস্ট', label_en: 'Posts', icon: 'FileText', visible: true, sort_order: 1 },
    { id: 'guardian-notify', path: '/admin/guardian-notify', label_bn: 'অভিভাবক নোটিফিকেশন', label_en: 'Guardian Notify', icon: 'MessageSquare', visible: true, sort_order: 2 },
    { id: 'whatsapp-queue', path: '/admin/whatsapp-queue', label_bn: 'WhatsApp কিউ', label_en: 'WhatsApp Queue', icon: 'MessageCircle', visible: true, sort_order: 3 },
    { id: 'complaints', path: '/admin/complaints', label_bn: 'অভিযোগ বক্স', label_en: 'Complaint Box', icon: 'Inbox', visible: true, sort_order: 4 },
  ]},

  // ওয়েবসাইট ও ডিজাইন
  { id: 'website-design', path: '/admin/website', label_bn: 'ওয়েবসাইট ও ডিজাইন', label_en: 'Website & Design', icon: 'Globe', visible: true, sort_order: 8, children: [
    { id: 'website', path: '/admin/website', label_bn: 'ওয়েবসাইট নিয়ন্ত্রণ', label_en: 'Website Control', icon: 'Globe', visible: true, sort_order: 0 },
    { id: 'theme', path: '/admin/theme', label_bn: 'থিম কাস্টমাইজার', label_en: 'Theme Customizer', icon: 'Palette', visible: true, sort_order: 1 },
    { id: 'widget-builder', path: '/admin/widget-builder', label_bn: 'উইজেট বিল্ডার', label_en: 'Widget Builder', icon: 'LayoutGrid', visible: true, sort_order: 2 },
    { id: 'photo-tools', path: '/admin/photo-tools', label_bn: 'ফটো টুলস', label_en: 'Photo Tools', icon: 'Camera', visible: true, sort_order: 3 },
    { id: 'design-studio', path: '/admin/design-studio', label_bn: 'ডিজাইন স্টুডিও', label_en: 'Design Studio', icon: 'Palette', visible: true, sort_order: 4 },
    { id: 'prayer-calendar', path: '/admin/prayer-calendar', label_bn: 'নামাজ ও ক্যালেন্ডার', label_en: 'Prayer & Calendar', icon: 'Clock', visible: true, sort_order: 4 },
  ]},

  // ইনভেন্টরি ও সম্পদ
  { id: 'inventory-assets', path: '/admin/inventory', label_bn: 'ইনভেন্টরি ও সম্পদ', label_en: 'Inventory & Assets', icon: 'Folder', visible: true, sort_order: 5.5 },

  // হোস্টেল
  { id: 'hostel', path: '/admin/hostel', label_bn: 'হোস্টেল ব্যবস্থাপনা', label_en: 'Hostel Management', icon: 'Building2', visible: true, sort_order: 5.7 },

  // হেলথ ও মেডিকেল
  { id: 'health-records', path: '/admin/health-records', label_bn: 'হেলথ ও মেডিকেল', label_en: 'Health & Medical', icon: 'HeartPulse', visible: true, sort_order: 5.8 },

  // অভ্যন্তরীণ বার্তা
  { id: 'messages', path: '/admin/messages', label_bn: 'বার্তা', label_en: 'Messages', icon: 'MessageSquare', visible: true, sort_order: 5.85 },

  // কমিটি ব্যবস্থাপনা
  { id: 'committees', path: '/admin/committees', label_bn: 'কমিটি ব্যবস্থাপনা', label_en: 'Committees', icon: 'Users', visible: true, sort_order: 5.9 },

  // ফি সেটআপ
  { id: 'fee-setup', path: '/admin/fee-types', label_bn: 'ফি সেটআপ', label_en: 'Fee Setup', icon: 'Settings2', visible: true, sort_order: 6.5, children: [
    { id: 'fee-types', path: '/admin/fee-types', label_bn: 'ফি ধরন', label_en: 'Fee Types', icon: 'Settings', visible: true, sort_order: 0 },
    { id: 'fee-categories', path: '/admin/fee-categories', label_bn: 'ফি ক্যাটাগরি', label_en: 'Fee Categories', icon: 'Settings', visible: true, sort_order: 1 },
    { id: 'student-categories', path: '/admin/student-categories', label_bn: 'ছাত্র ক্যাটাগরি', label_en: 'Student Categories', icon: 'Users', visible: true, sort_order: 2 },
  ]},



  // প্রশাসন
  { id: 'administration', path: '/admin/administrative', label_bn: 'প্রশাসন', label_en: 'Administration', icon: 'ShieldCheck', visible: true, sort_order: 8.5, children: [
    { id: 'administrative-officers', path: '/admin/administrative', label_bn: 'প্রশাসনিক কর্মকর্তা', label_en: 'Administrative Officers', icon: 'ShieldCheck', visible: true, sort_order: 0 },
    { id: 'parent-link-audit', path: '/admin/parent-link-audit', label_bn: 'অভিভাবক লিংক অডিট', label_en: 'Parent Link Audit', icon: 'GitBranch', visible: true, sort_order: 1 },
    { id: 'receipt-audit', path: '/admin/receipt-audit', label_bn: 'রসিদ অডিট', label_en: 'Receipt Audit', icon: 'ClipboardList', visible: true, sort_order: 2 },
    { id: 'verified-payments', path: '/admin/verified-payments', label_bn: 'যাচাইকৃত পেমেন্ট', label_en: 'Verified Payments', icon: 'BadgeCheck', visible: true, sort_order: 3 },
    { id: 'complaint-fields', path: '/admin/complaints/fields', label_bn: 'অভিযোগ ফিল্ড সেটিংস', label_en: 'Complaint Fields', icon: 'ListChecks', visible: true, sort_order: 4 },
    { id: 'parent-signup-fields', path: '/admin/parent-signup-fields', label_bn: 'অভিভাবক সাইনআপ ফিল্ড', label_en: 'Parent Signup Fields', icon: 'UserPlus', visible: true, sort_order: 5 },
    { id: 'donors-role-audit', path: '/admin/donors-role-audit', label_bn: 'দাতা মডিউল রোল অডিট', label_en: 'Donors Role Audit', icon: 'ShieldCheck', visible: true, sort_order: 6 },
    { id: 'device-management', path: '/admin/device-management', label_bn: 'ডিভাইস ও ভিজিটর সিকিউরিটি', label_en: 'Device & Visitor Security', icon: 'Smartphone', visible: true, sort_order: 9.5 },
    { id: 'blocked-devices', path: '/admin/blocked-devices', label_bn: 'ব্লকড ডিভাইস', label_en: 'Blocked Devices', icon: 'ShieldX', visible: true, sort_order: 9.6 },
    { id: 'audit-device-allowlist', path: '/admin/audit-device-allowlist', label_bn: 'অডিট ডিভাইস অ্যালাউলিস্ট', label_en: 'Audit Device Allowlist', icon: 'ShieldCheck', visible: true, sort_order: 10 },
    { id: 'verified-payments-role-audit', path: '/admin/verified-payments-role-audit', label_bn: 'ভেরিফায়েড পেমেন্ট রোল অডিট', label_en: 'Verified Payments Role Audit', icon: 'ShieldCheck', visible: true, sort_order: 7 },
    { id: 'complaints-role-audit', path: '/admin/complaints-role-audit', label_bn: 'অভিযোগ রোল অডিট', label_en: 'Complaints Role Audit', icon: 'ShieldCheck', visible: true, sort_order: 8 },
    { id: 'receipts-role-audit', path: '/admin/receipts-role-audit', label_bn: 'রসিদ রোল অডিট', label_en: 'Receipts Role Audit', icon: 'ShieldCheck', visible: true, sort_order: 9 },
  ]},

  // সিস্টেম ও সেটিংস
  { id: 'system', path: '/admin/settings', label_bn: 'সিস্টেম', label_en: 'System', icon: 'Settings', visible: true, sort_order: 9, children: [
    { id: 'settings', path: '/admin/settings', label_bn: 'সেটিংস', label_en: 'Settings', icon: 'Settings', visible: true, sort_order: 0 },
    { id: 'permissions', path: '/admin/permissions', label_bn: 'পারমিশন', label_en: 'Permissions', icon: 'KeyRound', visible: true, sort_order: 1 },
    { id: 'user-management', path: '/admin/user-management', label_bn: 'ইউজার ম্যানেজমেন্ট', label_en: 'User Management', icon: 'UserPlus', visible: true, sort_order: 2 },
    { id: 'email-templates', path: '/admin/email-templates', label_bn: 'ইমেইল টেমপ্লেট', label_en: 'Email Templates', icon: 'Mail', visible: true, sort_order: 2.3 },
    { id: 'otp-recovery', path: '/admin/otp-recovery', label_bn: 'OTP রিকভারি', label_en: 'OTP Recovery', icon: 'KeyRound', visible: true, sort_order: 2.6 },
    { id: 'approvals', path: '/admin/approvals', label_bn: 'অনুমোদন', label_en: 'Approvals', icon: 'ShieldCheck', visible: true, sort_order: 3 },
    { id: 'parent-approvals', path: '/admin/parent-approvals', label_bn: 'অভিভাবকবৃন্দ তালিকা', label_en: 'Parent Approvals', icon: 'UserCheck', visible: true, sort_order: 3.5 },
    { id: 'student-approvals', path: '/admin/student-approvals', label_bn: 'ছাত্র একাউন্ট অনুমোদন', label_en: 'Student Approvals', icon: 'GraduationCap', visible: true, sort_order: 3.55 },
    { id: 'parent-messages', path: '/admin/parent-messages', label_bn: 'অভিভাবক বার্তা', label_en: 'Parent Messages', icon: 'MessageSquare', visible: true, sort_order: 3.6 },
    { id: 'push-notifications', path: '/admin/push-notifications', label_bn: 'পুশ নোটিফিকেশন', label_en: 'Push Notifications', icon: 'Bell', visible: true, sort_order: 3.7 },
    { id: 'menu-manager', path: '/admin/menu-manager', label_bn: 'মেনু ম্যানেজার', label_en: 'Menu Manager', icon: 'ListOrdered', visible: true, sort_order: 4 },
    { id: 'backup', path: '/admin/backup', label_bn: 'ব্যাকআপ', label_en: 'Backup', icon: 'HardDrive', visible: true, sort_order: 5 },
    { id: 'recycle-bin', path: '/admin/recycle-bin', label_bn: 'রিসাইকেল বিন', label_en: 'Recycle Bin', icon: 'Trash2', visible: true, sort_order: 5.5 },
    { id: 'system-logs', path: '/admin/system-logs', label_bn: 'সিস্টেম লগ', label_en: 'System Logs', icon: 'ClipboardList', visible: true, sort_order: 5.6 },
    { id: 'address-manager', path: '/admin/address-manager', label_bn: 'ঠিকানা ব্যবস্থাপনা', label_en: 'Address Manager', icon: 'MapPin', visible: true, sort_order: 6 },
    { id: 'api-verification', path: '/admin/api-verification', label_bn: 'API ভেরিফিকেশন', label_en: 'API Verification', icon: 'KeyRound', visible: true, sort_order: 7 },
    { id: 'form-builder', path: '/admin/form-builder', label_bn: 'কাস্টম বিল্ডার', label_en: 'Custom Builder', icon: 'Wrench', visible: true, sort_order: 8 },
    { id: 'module-manager', path: '/admin/module-manager', label_bn: 'মডিউল ম্যানেজার', label_en: 'Module Manager', icon: 'Blocks', visible: true, sort_order: 9 },
    { id: 'formula-builder', path: '/admin/formula-builder', label_bn: 'ফর্মুলা বিল্ডার', label_en: 'Formula Builder', icon: 'FlaskConical', visible: true, sort_order: 10 },
    { id: 'validation-manager', path: '/admin/validation-manager', label_bn: 'ভ্যালিডেশন ম্যানেজার', label_en: 'Validation Manager', icon: 'ShieldCheck', visible: true, sort_order: 11 },
    { id: 'reports', path: '/admin/reports', label_bn: 'রিপোর্ট ও অ্যানালিটিক্স', label_en: 'Reports & Analytics', icon: 'BarChart3', visible: true, sort_order: 12 },
    { id: 'bulk-import', path: '/admin/bulk-import', label_bn: 'বাল্ক ইমপোর্ট', label_en: 'Bulk Import', icon: 'Upload', visible: true, sort_order: 13 },
  ]},
];

const DEFAULT_PUBLIC: MenuItemConfig[] = [
  { id: 'home', path: '/', label_bn: 'হোম', label_en: 'Home', icon: '', visible: true, sort_order: 0 },
  { id: 'about', path: '/about', label_bn: 'আমাদের সম্পর্কে', label_en: 'About', icon: '', visible: true, sort_order: 1 },
  { id: 'gallery', path: '/gallery', label_bn: 'গ্যালারি', label_en: 'Gallery', icon: '', visible: true, sort_order: 2 },
  { id: 'admission', path: '/admission', label_bn: 'ভর্তি', label_en: 'Admission', icon: '', visible: true, sort_order: 3 },
  { id: 'staff-application', path: '/staff-application', label_bn: 'শিক্ষক/স্টাফ আবেদন', label_en: 'Staff Application', icon: '', visible: true, sort_order: 3.3 },
  { id: 'admission-tests-public', path: '/admission-tests', label_bn: 'ভর্তি পরীক্ষা', label_en: 'Admission Tests', icon: '', visible: true, sort_order: 3.5 },
  { id: 'result', path: '/result', label_bn: 'ফলাফল', label_en: 'Result', icon: '', visible: true, sort_order: 4 },
  { id: 'student-info', path: '/student-info', label_bn: 'শিক্ষার্থী তথ্য', label_en: 'Student Info', icon: '', visible: true, sort_order: 5 },
  { id: 'notices', path: '/notices', label_bn: 'নোটিশ', label_en: 'Notices', icon: '', visible: true, sort_order: 6 },
  { id: 'donation', path: '/donation', label_bn: 'দান', label_en: 'Donation', icon: '', visible: true, sort_order: 7 },
  { id: 'fee-payment', path: '/fee-payment', label_bn: 'ফি প্রদান', label_en: 'Fee Payment', icon: '', visible: true, sort_order: 8 },
  { id: 'live-classes-public', path: '/live-classes', label_bn: 'লাইভ ক্লাস', label_en: 'Live Classes', icon: '', visible: true, sort_order: 8.5 },
  { id: 'contact', path: '/contact', label_bn: 'যোগাযোগ', label_en: 'Contact', icon: '', visible: true, sort_order: 9 },
  { id: 'complaints-public', path: '/complaints', label_bn: 'অভিযোগ বক্স', label_en: 'Complaint Box', icon: '', visible: true, sort_order: 9.5 },
  { id: 'quran-public', path: '/quran', label_bn: 'কুরআন', label_en: 'Quran', icon: '', visible: true, sort_order: 9.7 },
  { id: 'zakat-fitra-public', path: '/zakat-fitra', label_bn: 'যাকাত ও ফিতরা', label_en: 'Zakat & Fitra', icon: '', visible: true, sort_order: 9.8 },
];

export const DEFAULT_MENU_CONFIG: MenuConfig = {
  sidebar: DEFAULT_SIDEBAR,
  public: DEFAULT_PUBLIC,
};

// Collect all IDs (top-level + nested children) from the saved menu
const collectAllIds = (items: MenuItemConfig[]): Set<string> => {
  const ids = new Set<string>();
  for (const item of items) {
    ids.add(item.id);
    if (item.children) {
      for (const child of item.children) {
        ids.add(child.id);
      }
    }
  }
  return ids;
};

// Merge saved menu with defaults so newly added default items appear automatically
const mergeWithDefaults = (saved: MenuItemConfig[], defaults: MenuItemConfig[]): MenuItemConfig[] => {
  // Auto-fix known path corrections and updated labels
  saved = saved.filter(item => item.id !== 'application-tracking' && item.path !== '/application-tracking').map(item => {
    if (item.id === 'fees' && item.path === '/admin/fees') {
      return { ...item, path: '/admin/students-fees' };
    }
    if (item.id === 'staff' || item.path === '/admin/staff') {
      return { ...item, label_bn: 'স্টাফ ব্যবস্থাপনা', label_en: 'Staff Management' };
    }
    return item;
  });

  const savedIds = collectAllIds(saved);
  // Also collect child IDs from defaults to check
  const missingTopLevel = defaults.filter(d => !savedIds.has(d.id));
  // Check for missing children in existing parents
  const merged = saved.map(item => {
    const defaultItem = defaults.find(d => d.id === item.id);
    if (defaultItem?.children && defaultItem.children.length > 0) {
      const existingChildIds = new Set((item.children || []).map(c => c.id));
      const missingChildren = defaultItem.children.filter(dc => !existingChildIds.has(dc.id) && !savedIds.has(dc.id));
      if (missingChildren.length > 0) {
        const existingChildren = item.children || [];
        const maxChildOrder = Math.max(...existingChildren.map(c => c.sort_order), -1);
        return {
          ...item,
          children: [
            ...existingChildren,
            ...missingChildren.map((mc, idx) => ({ ...mc, sort_order: maxChildOrder + 1 + idx })),
          ],
        };
      }
    }
    return item;
  });

  if (missingTopLevel.length === 0) return merged;

  const maxOrder = Math.max(...merged.map(i => i.sort_order), -1);
  return [
    ...merged,
    ...missingTopLevel.map((m, idx) => ({ ...m, sort_order: maxOrder + 1 + idx })),
  ];
};

const sanitizeConfig = (config: MenuConfig): MenuConfig => {
  if (!config) return config;
  const fixItems = (items: MenuItemConfig[] = [], isPublic = false) =>
    items
      .filter(item => {
        if (isPublic && (item.id === 'application-tracking' || item.path === '/application-tracking')) {
          return false;
        }
        return true;
      })
      .map(item => {
        if (item.id === 'staff' || item.path === '/admin/staff') {
          return { ...item, label_bn: 'স্টাফ ব্যবস্থাপনা', label_en: 'Staff Management' };
        }
        if (item.children) {
          item.children = item.children.filter(child => child.id !== 'application-tracking' && child.path !== '/application-tracking');
        }
        return item;
      });

  return {
    ...config,
    sidebar: fixItems(config.sidebar, false),
    public: fixItems(config.public, true),
  };
};

const MENU_CACHE_KEY = 'menu-settings-cache';
const readMenuCache = (): MenuConfig => {
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    if (raw) return sanitizeConfig(JSON.parse(raw));
  } catch {}
  return DEFAULT_MENU_CONFIG;
};

export const useMenuSettings = () => {
  const queryClient = useQueryClient();

  const { data: menuConfig, isLoading } = useQuery({
    queryKey: ['menu-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .in('key', ['sidebar_menu', 'public_menu']);

      if (error) throw error;
      
      const result = { ...DEFAULT_MENU_CONFIG };
      data?.forEach(row => {
        if (row.key === 'sidebar_menu' && row.value) {
          result.sidebar = mergeWithDefaults(row.value as unknown as MenuItemConfig[], DEFAULT_SIDEBAR);
        }
        if (row.key === 'public_menu' && row.value) {
          result.public = mergeWithDefaults(row.value as unknown as MenuItemConfig[], DEFAULT_PUBLIC);
        }
      });
      const sanitized = sanitizeConfig(result);
      try { localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(sanitized)); } catch {}
      return sanitized;
    },
    initialData: readMenuCache,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const saveMenuConfig = useMutation({
    mutationFn: async (config: MenuConfig) => {
      const rows = [
        { key: 'sidebar_menu', value: config.sidebar as unknown as Json, updated_at: new Date().toISOString() },
        { key: 'public_menu', value: config.public as unknown as Json, updated_at: new Date().toISOString() },
      ];
      const { error } = await supabase
        .from('website_settings')
        .upsert(rows, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-settings'] });
    },
  });

  return {
    menuConfig: menuConfig || DEFAULT_MENU_CONFIG,
    isLoading,
    saveMenuConfig,
  };
};
