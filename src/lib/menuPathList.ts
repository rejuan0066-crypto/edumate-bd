import type { MenuItemConfig } from '@/hooks/useMenuSettings';

export type MenuPathItem = {
  path: string;
  label_bn: string;
  label_en: string;
  group_bn?: string;
  group_en?: string;
};

export const DEFAULT_MENU_PATHS: MenuPathItem[] = [
  { path: '/admin', label_bn: 'ড্যাশবোর্ড', label_en: 'Dashboard' },
  { path: '/admin/profile', label_bn: 'প্রোফাইল', label_en: 'Profile' },
  { path: '/admin/students', label_bn: 'ছাত্র ব্যবস্থাপনা', label_en: 'Students' },
  { path: '/admin/staff', label_bn: 'স্টাফ ব্যবস্থাপনা', label_en: 'Staff Management' },
  { path: '/admin/divisions', label_bn: 'বিভাগ ও শ্রেণী', label_en: 'Divisions' },
  { path: '/admin/academic-sessions', label_bn: 'একাডেমিক সেশন', label_en: 'Academic Sessions' },
  { path: '/admin/subjects', label_bn: 'বিষয়সমূহ', label_en: 'Subjects' },
  { path: '/admin/results', label_bn: 'ফলাফল', label_en: 'Results' },
  { path: '/admin/notices', label_bn: 'নোটিশ', label_en: 'Notices' },
  { path: '/admin/students-fees', label_bn: 'ছাত্র ফি', label_en: 'Student Fees' },
  { path: '/admin/fee-receipts', label_bn: 'ফি রসিদ', label_en: 'Fee Receipts' },
  { path: '/admin/expenses', label_bn: 'হিসাব ব্যবস্থাপনা', label_en: 'Expenses' },
  { path: '/admin/donors', label_bn: 'দাতা তালিকা', label_en: 'Donors' },
  { path: '/admin/attendance', label_bn: 'হাজিরা (সকল)', label_en: 'Attendance (All)' },
  { path: '/admin/student-attendance', label_bn: 'ছাত্র হাজিরা', label_en: 'Student Attendance' },
  { path: '/admin/staff-attendance', label_bn: 'স্টাফ/শিক্ষক হাজিরা', label_en: 'Staff Attendance' },
  { path: '/admin/salary', label_bn: 'বেতন ব্যবস্থাপনা', label_en: 'Salary' },
  { path: '/admin/reports', label_bn: 'রিপোর্ট ও অ্যানালিটিক্স', label_en: 'Reports & Analytics' },
  { path: '/admin/website', label_bn: 'ওয়েবসাইট নিয়ন্ত্রণ', label_en: 'Website Control' },
  { path: '/admin/posts', label_bn: 'পোস্ট', label_en: 'Posts' },
  { path: '/admin/resign-letters', label_bn: 'পদত্যাগ পত্র', label_en: 'Resign Letters' },
  { path: '/admin/joining-letters', label_bn: 'যোগদান পত্র', label_en: 'Joining Letters' },
  { path: '/admin/admission-letters', label_bn: 'ভর্তি পত্র', label_en: 'Admission Letters' },
  { path: '/admin/designations', label_bn: 'পদবি তৈরি', label_en: 'Designations' },
  { path: '/admin/form-builder', label_bn: 'কাস্টম বিল্ডার', label_en: 'Custom Builder' },
  { path: '/admin/module-manager', label_bn: 'মডিউল ম্যানেজার', label_en: 'Module Manager' },
  { path: '/admin/formula-builder', label_bn: 'ফর্মুলা বিল্ডার', label_en: 'Formula Builder' },
  { path: '/admin/validation-manager', label_bn: 'ভ্যালিডেশন ম্যানেজার', label_en: 'Validation Manager' },
  { path: '/admin/permissions', label_bn: 'পারমিশন', label_en: 'Permissions' },
  { path: '/admin/theme', label_bn: 'থিম কাস্টমাইজার', label_en: 'Theme Customizer' },
  { path: '/admin/menu-manager', label_bn: 'মেনু ম্যানেজার', label_en: 'Menu Manager' },
  { path: '/admin/widget-builder', label_bn: 'উইজেট বিল্ডার', label_en: 'Widget Builder' },
  { path: '/admin/backup', label_bn: 'ব্যাকআপ', label_en: 'Backup' },
  { path: '/admin/guardian-notify', label_bn: 'অভিভাবক নোটিফিকেশন', label_en: 'Guardian Notify' },
  { path: '/admin/prayer-calendar', label_bn: 'নামাজ ও ক্যালেন্ডার', label_en: 'Prayer & Calendar' },
  { path: '/admin/address-manager', label_bn: 'ঠিকানা ম্যানেজার', label_en: 'Address Manager' },
  { path: '/admin/api-verification', label_bn: 'API ভেরিফিকেশন', label_en: 'API Verification' },
  { path: '/admin/user-management', label_bn: 'ইউজার ম্যানেজমেন্ট', label_en: 'User Management' },
  { path: '/admin/settings', label_bn: 'সেটিংস', label_en: 'Settings' },
  { path: '/admin/approvals', label_bn: 'অনুমোদন ব্যবস্থাপনা', label_en: 'Approvals' },
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

/** Merge the dynamic sidebar list with a static fallback list, keeping order. */
export const mergeMenuPaths = (
  dynamic: MenuPathItem[],
  fallback: MenuPathItem[],
): MenuPathItem[] => {
  const map = new Map<string, MenuPathItem>();
  dynamic.forEach((m) => map.set(m.path, m));
  fallback.forEach((m) => {
    if (!map.has(m.path)) map.set(m.path, m);
  });
  return Array.from(map.values());
};
