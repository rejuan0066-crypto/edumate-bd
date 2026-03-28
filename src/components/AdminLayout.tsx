import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LanguageToggle from './LanguageToggle';
import {
  LayoutDashboard, Users, UserCog, BookOpen, FileText, Bell,
  CreditCard, Settings, Globe, GraduationCap, Menu, X, LogOut,
  ChevronRight, Layers, Receipt, Heart, ReceiptText, FileSignature,
  FilePlus, FileCheck, Tag, Wrench, UserCircle, ChevronDown, FileBox,
  Blocks, FlaskConical, CalendarDays, ShieldCheck
} from 'lucide-react';

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { t, language } = useLanguage();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Fetch published custom forms for dynamic menu
  const { data: publishedForms = [] } = useQuery({
    queryKey: ['published-custom-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .neq('publish_to', 'none')
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  type MenuItem = {
    path: string;
    label: string;
    icon: any;
    children?: { path: string; label: string; icon: any }[];
  };

  const baseMenuItems: MenuItem[] = [
    {
      path: '/admin', label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard', icon: LayoutDashboard,
      children: [
        { path: '/admin/profile', label: language === 'bn' ? 'প্রোফাইল' : 'Profile', icon: UserCircle },
      ]
    },
    { path: '/admin/donors', label: language === 'bn' ? 'দাতা তালিকা' : 'Donor List', icon: Heart },
    { path: '/admin/students', label: language === 'bn' ? 'ছাত্র ব্যবস্থাপনা' : 'Student Management', icon: Users },
    { path: '/admin/staff', label: language === 'bn' ? 'স্টাফ/শিক্ষক ব্যবস্থাপনা' : 'Staff/Teacher Management', icon: UserCog },
    { path: '/admin/divisions', label: language === 'bn' ? 'বিভাগ ও শ্রেণী' : 'Division & Class', icon: Layers },
    { path: '/admin/fee-receipts', label: language === 'bn' ? 'ফি রসিদ' : 'Fee Receipts', icon: ReceiptText },
    { path: '/admin/resign-letters', label: language === 'bn' ? 'পদত্যাগ পত্র' : 'Resign Letters', icon: FileSignature },
    { path: '/admin/joining-letters', label: language === 'bn' ? 'যোগদান পত্র' : 'Joining Letters', icon: FilePlus },
    { path: '/admin/admission-letters', label: language === 'bn' ? 'ভর্তি পত্র' : 'Admission Letters', icon: FileCheck },
    { path: '/admin/results', label: language === 'bn' ? 'ফলাফল' : 'Results', icon: FileText },
    { path: '/admin/notices', label: language === 'bn' ? 'নোটিশ (অনুমোদন)' : 'Notice (Approval)', icon: Bell },
    { path: '/admin/fees', label: language === 'bn' ? 'ফি (অনুমোদন)' : 'Fees (Approval)', icon: CreditCard },
    { path: '/admin/expenses', label: language === 'bn' ? 'খরচ ব্যবস্থাপনা' : 'Expenses', icon: Receipt },
    { path: '/admin/website', label: language === 'bn' ? 'ওয়েবসাইট নিয়ন্ত্রণ' : 'Website Control', icon: Globe },
    { path: '/admin/designations', label: language === 'bn' ? 'পদবি তৈরি' : 'Designations', icon: Tag },
    { path: '/admin/subjects', label: language === 'bn' ? 'বিষয়সমূহ' : 'Subjects', icon: BookOpen },
    { path: '/admin/form-builder', label: language === 'bn' ? 'কাস্টম বিল্ডার' : 'Custom Builder', icon: Wrench,
      children: [
        { path: '/admin/module-manager', label: language === 'bn' ? 'মডিউল ম্যানেজার' : 'Module Manager', icon: Blocks },
        { path: '/admin/formula-builder', label: language === 'bn' ? 'ফর্মুলা বিল্ডার' : 'Formula Builder', icon: FlaskConical },
        { path: '/admin/attendance', label: language === 'bn' ? 'অ্যাটেন্ডেন্স' : 'Attendance', icon: CalendarDays },
        { path: '/admin/validation-manager', label: language === 'bn' ? 'ভ্যালিডেশন ম্যানেজার' : 'Validation Manager', icon: ShieldCheck },
      ]
    },
    { path: '/admin/settings', label: language === 'bn' ? 'সেটিংস' : 'Settings', icon: Settings },
  ];

  // Build final menu items with published custom forms injected
  const menuItems: MenuItem[] = baseMenuItems.map(item => {
    // Find sub_menu forms that belong under this menu item
    const subForms = publishedForms.filter(f => f.publish_to === 'sub_menu' && f.parent_menu === item.path);
    if (subForms.length > 0) {
      const existingChildren = item.children || [];
      const newChildren = subForms.map(f => ({
        path: `/admin/custom/${f.menu_slug}`,
        label: language === 'bn' ? f.name_bn : f.name,
        icon: FileBox,
      }));
      return { ...item, children: [...existingChildren, ...newChildren] };
    }
    return item;
  });

  // Add main_menu published forms
  const mainMenuForms = publishedForms.filter(f => f.publish_to === 'main_menu');
  mainMenuForms.forEach(f => {
    // Insert before Settings (last item)
    const settingsIdx = menuItems.findIndex(m => m.path === '/admin/settings');
    const newItem: MenuItem = {
      path: `/admin/custom/${f.menu_slug}`,
      label: language === 'bn' ? f.name_bn : f.name,
      icon: FileBox,
    };
    if (settingsIdx !== -1) {
      menuItems.splice(settingsIdx, 0, newItem);
    } else {
      menuItems.push(newItem);
    }
  });

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`${mobile ? 'fixed inset-0 z-50' : 'hidden lg:flex'} flex`}>
      {mobile && <div className="flex-1 bg-foreground/40" onClick={() => setMobileSidebarOpen(false)} />}
      <div className={`${mobile ? 'w-72' : sidebarOpen ? 'w-64' : 'w-16'} bg-sidebar flex flex-col transition-all duration-300 ${mobile ? 'order-first' : ''}`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {(sidebarOpen || mobile) && (
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">মাদরাসা ম্যানেজমেন্ট</h2>
              <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
            </div>
          )}
          {mobile && (
            <button onClick={() => setMobileSidebarOpen(false)} className="ml-auto text-sidebar-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const hasChildren = item.children && item.children.length > 0;
            const isGroupOpen = openGroups[item.path] || item.children?.some(c => location.pathname === c.path);

            return (
              <div key={item.path}>
                <div className="flex items-center">
                  <Link
                    to={item.path}
                    onClick={() => mobile && setMobileSidebarOpen(false)}
                    className={`sidebar-item flex-1 ${isActive && !hasChildren ? 'active' : ''} ${isActive && hasChildren ? 'active' : ''}`}
                    title={!sidebarOpen && !mobile ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {(sidebarOpen || mobile) && <span className="truncate">{item.label}</span>}
                    {isActive && !hasChildren && (sidebarOpen || mobile) && <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
                  </Link>
                  {hasChildren && (sidebarOpen || mobile) && (
                    <button
                      onClick={() => toggleGroup(item.path)}
                      className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {hasChildren && isGroupOpen && (sidebarOpen || mobile) && (
                  <div className="ml-6 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                    {item.children!.map(child => {
                      const childActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => mobile && setMobileSidebarOpen(false)}
                          className={`sidebar-item text-sm ${childActive ? 'active' : ''}`}
                        >
                          <child.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        {(sidebarOpen || mobile) && (
          <div className="p-3 border-t border-sidebar-border">
            <button
              onClick={async () => { await signOut(); navigate('/login'); }}
              className="sidebar-item w-full text-destructive/80 hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span>লগআউট</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      {mobileSidebarOpen && <Sidebar mobile />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40" style={{ boxShadow: 'var(--shadow-soft)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => { if (window.innerWidth < 1024) setMobileSidebarOpen(true); else setSidebarOpen(!sidebarOpen); }} className="p-2 rounded-lg hover:bg-secondary">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-display font-semibold text-foreground hidden sm:block">
              {menuItems.find(i => i.path === location.pathname)?.label || t('dashboard')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Globe className="w-4 h-4" /> {t('home')}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
