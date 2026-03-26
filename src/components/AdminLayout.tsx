import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import {
  LayoutDashboard, Users, UserCog, BookOpen, FileText, Bell,
  CreditCard, Settings, Globe, GraduationCap, Menu, X, LogOut,
  ChevronRight, Layers
} from 'lucide-react';

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/admin/students', label: t('students'), icon: Users },
    { path: '/admin/staff', label: t('staff'), icon: UserCog },
    { path: '/admin/divisions', label: t('division'), icon: Layers },
    { path: '/admin/subjects', label: t('subjects'), icon: BookOpen },
    { path: '/admin/results', label: t('results'), icon: FileText },
    { path: '/admin/notices', label: t('notices'), icon: Bell },
    { path: '/admin/fees', label: t('fees'), icon: CreditCard },
    { path: '/admin/website', label: t('websiteControl'), icon: Globe },
    { path: '/admin/settings', label: t('settings'), icon: Settings },
  ];

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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => mobile && setMobileSidebarOpen(false)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={!sidebarOpen && !mobile ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {(sidebarOpen || mobile) && <span>{item.label}</span>}
                {isActive && (sidebarOpen || mobile) && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        {(sidebarOpen || mobile) && (
          <div className="p-3 border-t border-sidebar-border">
            <button
              onClick={() => navigate('/login')}
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
