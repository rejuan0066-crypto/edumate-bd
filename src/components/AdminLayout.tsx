import { ReactNode, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMenuSettings, MenuItemConfig } from '@/hooks/useMenuSettings';
import LanguageToggle from './LanguageToggle';
import NotificationPanel from './NotificationPanel';
import {
  LayoutDashboard, Users, UserCog, BookOpen, FileText, Bell,
  CreditCard, Settings, Globe, GraduationCap, Menu, X, LogOut,
  ChevronRight, Layers, Receipt, Heart, ReceiptText, FileSignature,
  FilePlus, FileCheck, Tag, Wrench, UserCircle, ChevronDown, FileBox,
  Blocks, FlaskConical, CalendarDays, ShieldCheck, BarChart3, KeyRound, Palette,
  ListOrdered, Home, Image, Mail, Phone, MapPin, Star, Award, Clock, Folder, LayoutGrid,
  HardDrive, MessageSquare, Wallet,
  type LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, UserCog, BookOpen, FileText, Bell,
  CreditCard, Settings, Globe, GraduationCap, Heart, Layers,
  Receipt, ReceiptText, FileSignature, FilePlus, FileCheck, Tag,
  Wrench, Blocks, FlaskConical, CalendarDays, ShieldCheck, BarChart3,
  KeyRound, Palette, ListOrdered, UserCircle, FileBox, Home,
  Image, Mail, Phone, MapPin, Star, Award, Clock, Folder, LayoutGrid, HardDrive, MessageSquare, Wallet,
};

const MENU_SCROLL_STORAGE_KEYS = {
  desktop: 'admin-layout-menu-scroll-desktop',
  mobile: 'admin-layout-menu-scroll-mobile',
} as const;

const getIcon = (name: string): LucideIcon => ICON_MAP[name] || FileBox;

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { t, language } = useLanguage();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { menuConfig } = useMenuSettings();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const menuScrollPositionsRef = useRef({ desktop: 0, mobile: 0 });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const persistMenuScroll = (mobile: boolean, scrollTop: number) => {
    const storageKey = mobile ? MENU_SCROLL_STORAGE_KEYS.mobile : MENU_SCROLL_STORAGE_KEYS.desktop;
    menuScrollPositionsRef.current[mobile ? 'mobile' : 'desktop'] = scrollTop;
    window.sessionStorage.setItem(storageKey, String(scrollTop));
  };

  const restoreMenuScroll = (element: HTMLElement | null, mobile: boolean) => {
    if (!element) return;

    const storageKey = mobile ? MENU_SCROLL_STORAGE_KEYS.mobile : MENU_SCROLL_STORAGE_KEYS.desktop;
    const savedScrollTop = window.sessionStorage.getItem(storageKey);
    const fallbackScrollTop = menuScrollPositionsRef.current[mobile ? 'mobile' : 'desktop'];
    const scrollTop = savedScrollTop ? Number(savedScrollTop) : fallbackScrollTop;

    requestAnimationFrame(() => {
      element.scrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;
    });
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

  // Convert MenuItemConfig to MenuItem using dynamic config
  const configToMenuItem = (cfg: MenuItemConfig): MenuItem => ({
    path: cfg.path,
    label: language === 'bn' ? cfg.label_bn : cfg.label_en,
    icon: getIcon(cfg.icon),
    children: cfg.children?.filter(c => c.visible).map(c => ({
      path: c.path,
      label: language === 'bn' ? c.label_bn : c.label_en,
      icon: getIcon(c.icon),
    })),
  });

  const baseMenuItems: MenuItem[] = menuConfig.sidebar
    .filter(item => item.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(configToMenuItem);

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
      {mobile && (
        <div
          className="flex-1 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div className={`${mobile ? 'w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-300' : sidebarOpen ? 'w-64' : 'w-16'} bg-sidebar flex flex-col h-full transition-all duration-300 ${mobile ? 'order-first shadow-2xl' : ''}`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border shrink-0">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {(sidebarOpen || mobile) && (
            <div className="overflow-hidden flex-1 min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">মাদরাসা ম্যানেজমেন্ট</h2>
              <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
            </div>
          )}
          {mobile && (
            <button onClick={() => setMobileSidebarOpen(false)} className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground shrink-0">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu - scrollable area */}
        <nav
          ref={(element) => restoreMenuScroll(element, mobile)}
          onScroll={(event) => persistMenuScroll(mobile, event.currentTarget.scrollTop)}
          className="flex-1 min-h-0 p-2 space-y-0.5 overflow-y-auto overscroll-contain scrollbar-thin"
        >
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const hasChildren = item.children && item.children.length > 0;
            const isGroupOpen = openGroups[item.path] || item.children?.some(c => location.pathname === c.path);

            return (
              <div key={item.path}>
                <div className="flex items-center">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleGroup(item.path)}
                      className={`sidebar-item flex-1 ${isActive ? 'active' : ''}`}
                      title={!sidebarOpen && !mobile ? item.label : undefined}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {(sidebarOpen || mobile) && <span className="truncate">{item.label}</span>}
                      {(sidebarOpen || mobile) && (
                        <ChevronDown className={`w-4 h-4 ml-auto shrink-0 transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={() => mobile && setMobileSidebarOpen(false)}
                      className={`sidebar-item flex-1 ${isActive ? 'active' : ''}`}
                      title={!sidebarOpen && !mobile ? item.label : undefined}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {(sidebarOpen || mobile) && <span className="truncate">{item.label}</span>}
                      {isActive && (sidebarOpen || mobile) && <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
                    </Link>
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

        {/* Bottom - fixed logout */}
        {(sidebarOpen || mobile) && (
          <div className="p-2 border-t border-sidebar-border shrink-0">
            <button
              onClick={async () => { await signOut(); navigate('/login'); }}
              className="sidebar-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
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
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar />
      {mobileSidebarOpen && <Sidebar mobile />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
          <div className="flex items-center gap-2">
            <NotificationPanel />
            <LanguageToggle />
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Globe className="w-4 h-4" /> {t('home')}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
