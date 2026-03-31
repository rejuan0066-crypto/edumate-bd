import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface MenuItemConfig {
  id: string;
  path: string;
  label_bn: string;
  label_en: string;
  icon: string;
  visible: boolean;
  sort_order: number;
  children?: MenuItemConfig[];
}

export interface MenuConfig {
  sidebar: MenuItemConfig[];
  public: MenuItemConfig[];
}

const DEFAULT_SIDEBAR: MenuItemConfig[] = [
  { id: 'dashboard', path: '/admin', label_bn: 'ড্যাশবোর্ড', label_en: 'Dashboard', icon: 'LayoutDashboard', visible: true, sort_order: 0, children: [
    { id: 'profile', path: '/admin/profile', label_bn: 'প্রোফাইল', label_en: 'Profile', icon: 'UserCircle', visible: true, sort_order: 0 },
  ]},
  { id: 'donors', path: '/admin/donors', label_bn: 'দাতা তালিকা', label_en: 'Donor List', icon: 'Heart', visible: true, sort_order: 1 },
  { id: 'students', path: '/admin/students', label_bn: 'ছাত্র ব্যবস্থাপনা', label_en: 'Student Management', icon: 'Users', visible: true, sort_order: 2 },
  { id: 'staff', path: '/admin/staff', label_bn: 'স্টাফ/শিক্ষক ব্যবস্থাপনা', label_en: 'Staff/Teacher Management', icon: 'UserCog', visible: true, sort_order: 3 },
  { id: 'divisions', path: '/admin/divisions', label_bn: 'বিভাগ ও শ্রেণী', label_en: 'Division & Class', icon: 'Layers', visible: true, sort_order: 4 },
  { id: 'fee-receipts', path: '/admin/fee-receipts', label_bn: 'ফি রসিদ', label_en: 'Fee Receipts', icon: 'ReceiptText', visible: true, sort_order: 5 },
  { id: 'resign-letters', path: '/admin/resign-letters', label_bn: 'পদত্যাগ পত্র', label_en: 'Resign Letters', icon: 'FileSignature', visible: true, sort_order: 6 },
  { id: 'joining-letters', path: '/admin/joining-letters', label_bn: 'যোগদান পত্র', label_en: 'Joining Letters', icon: 'FilePlus', visible: true, sort_order: 7 },
  { id: 'admission-letters', path: '/admin/admission-letters', label_bn: 'ভর্তি পত্র', label_en: 'Admission Letters', icon: 'FileCheck', visible: true, sort_order: 8 },
  { id: 'results', path: '/admin/results', label_bn: 'ফলাফল', label_en: 'Results', icon: 'FileText', visible: true, sort_order: 9 },
  { id: 'notices', path: '/admin/notices', label_bn: 'নোটিশ (অনুমোদন)', label_en: 'Notice (Approval)', icon: 'Bell', visible: true, sort_order: 10 },
  { id: 'fees', path: '/admin/fees', label_bn: 'ফি (অনুমোদন)', label_en: 'Fees (Approval)', icon: 'CreditCard', visible: true, sort_order: 11 },
  { id: 'expenses', path: '/admin/expenses', label_bn: 'খরচ ব্যবস্থাপনা', label_en: 'Expenses', icon: 'Receipt', visible: true, sort_order: 12 },
  { id: 'website', path: '/admin/website', label_bn: 'ওয়েবসাইট নিয়ন্ত্রণ', label_en: 'Website Control', icon: 'Globe', visible: true, sort_order: 13 },
  { id: 'designations', path: '/admin/designations', label_bn: 'পদবি তৈরি', label_en: 'Designations', icon: 'Tag', visible: true, sort_order: 14 },
  { id: 'subjects', path: '/admin/subjects', label_bn: 'বিষয়সমূহ', label_en: 'Subjects', icon: 'BookOpen', visible: true, sort_order: 15 },
  { id: 'form-builder', path: '/admin/form-builder', label_bn: 'কাস্টম বিল্ডার', label_en: 'Custom Builder', icon: 'Wrench', visible: true, sort_order: 16, children: [
    { id: 'module-manager', path: '/admin/module-manager', label_bn: 'মডিউল ম্যানেজার', label_en: 'Module Manager', icon: 'Blocks', visible: true, sort_order: 0 },
    { id: 'formula-builder', path: '/admin/formula-builder', label_bn: 'ফর্মুলা বিল্ডার', label_en: 'Formula Builder', icon: 'FlaskConical', visible: true, sort_order: 1 },
    { id: 'attendance', path: '/admin/attendance', label_bn: 'অ্যাটেন্ডেন্স', label_en: 'Attendance', icon: 'CalendarDays', visible: true, sort_order: 2 },
    { id: 'validation-manager', path: '/admin/validation-manager', label_bn: 'ভ্যালিডেশন ম্যানেজার', label_en: 'Validation Manager', icon: 'ShieldCheck', visible: true, sort_order: 3 },
    { id: 'reports', path: '/admin/reports', label_bn: 'রিপোর্ট ও অ্যানালিটিক্স', label_en: 'Reports & Analytics', icon: 'BarChart3', visible: true, sort_order: 4 },
  ]},
  { id: 'permissions', path: '/admin/permissions', label_bn: 'পারমিশন', label_en: 'Permissions', icon: 'KeyRound', visible: true, sort_order: 17 },
  { id: 'theme', path: '/admin/theme', label_bn: 'থিম কাস্টমাইজার', label_en: 'Theme Customizer', icon: 'Palette', visible: true, sort_order: 18 },
  { id: 'menu-manager', path: '/admin/menu-manager', label_bn: 'মেনু ম্যানেজার', label_en: 'Menu Manager', icon: 'ListOrdered', visible: true, sort_order: 19 },
  { id: 'widget-builder', path: '/admin/widget-builder', label_bn: 'উইজেট বিল্ডার', label_en: 'Widget Builder', icon: 'LayoutGrid', visible: true, sort_order: 20 },
  { id: 'backup', path: '/admin/backup', label_bn: 'ব্যাকআপ', label_en: 'Backup', icon: 'HardDrive', visible: true, sort_order: 21 },
  { id: 'guardian-notify', path: '/admin/guardian-notify', label_bn: 'অভিভাবক নোটিফিকেশন', label_en: 'Guardian Notify', icon: 'MessageSquare', visible: true, sort_order: 22 },
  { id: 'prayer-calendar', path: '/admin/prayer-calendar', label_bn: 'নামাজ ও ক্যালেন্ডার', label_en: 'Prayer & Calendar', icon: 'Clock', visible: true, sort_order: 23 },
  { id: 'salary', path: '/admin/salary', label_bn: 'বেতন ব্যবস্থাপনা', label_en: 'Salary Management', icon: 'Wallet', visible: true, sort_order: 24 },
  { id: 'settings', path: '/admin/settings', label_bn: 'সেটিংস', label_en: 'Settings', icon: 'Settings', visible: true, sort_order: 25 },
];

const DEFAULT_PUBLIC: MenuItemConfig[] = [
  { id: 'home', path: '/', label_bn: 'হোম', label_en: 'Home', icon: '', visible: true, sort_order: 0 },
  { id: 'about', path: '/about', label_bn: 'আমাদের সম্পর্কে', label_en: 'About', icon: '', visible: true, sort_order: 1 },
  { id: 'gallery', path: '/gallery', label_bn: 'গ্যালারি', label_en: 'Gallery', icon: '', visible: true, sort_order: 2 },
  { id: 'admission', path: '/admission', label_bn: 'ভর্তি', label_en: 'Admission', icon: '', visible: true, sort_order: 3 },
  { id: 'result', path: '/result', label_bn: 'ফলাফল', label_en: 'Result', icon: '', visible: true, sort_order: 4 },
  { id: 'student-info', path: '/student-info', label_bn: 'শিক্ষার্থী তথ্য', label_en: 'Student Info', icon: '', visible: true, sort_order: 5 },
  { id: 'notices', path: '/notices', label_bn: 'নোটিশ', label_en: 'Notices', icon: '', visible: true, sort_order: 6 },
  { id: 'donation', path: '/donation', label_bn: 'দান', label_en: 'Donation', icon: '', visible: true, sort_order: 7 },
  { id: 'fee-payment', path: '/fee-payment', label_bn: 'ফি প্রদান', label_en: 'Fee Payment', icon: '', visible: true, sort_order: 8 },
  { id: 'contact', path: '/contact', label_bn: 'যোগাযোগ', label_en: 'Contact', icon: '', visible: true, sort_order: 9 },
];

export const DEFAULT_MENU_CONFIG: MenuConfig = {
  sidebar: DEFAULT_SIDEBAR,
  public: DEFAULT_PUBLIC,
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
          result.sidebar = row.value as unknown as MenuItemConfig[];
        }
        if (row.key === 'public_menu' && row.value) {
          result.public = row.value as unknown as MenuItemConfig[];
        }
      });
      return result;
    },
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
