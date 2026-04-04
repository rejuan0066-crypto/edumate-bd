import { lazy, Suspense, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMenuSettings, MenuItemConfig } from '@/hooks/useMenuSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmbeddedProvider } from '@/contexts/EmbeddedContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy-load map: path → component
const PAGE_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  '/admin': lazy(() => import('@/pages/admin/Dashboard')),
  '/admin/students': lazy(() => import('@/pages/admin/AdminStudents')),
  '/admin/staff': lazy(() => import('@/pages/admin/AdminStaff')),
  '/admin/divisions': lazy(() => import('@/pages/admin/AdminDivisions')),
  '/admin/subjects': lazy(() => import('@/pages/admin/AdminSubjects')),
  '/admin/results': lazy(() => import('@/pages/admin/AdminResults')),
  '/admin/notices': lazy(() => import('@/pages/admin/AdminNotices')),
  '/admin/students-fees': lazy(() => import('@/pages/admin/AdminStudentsFees')),
  '/admin/expenses': lazy(() => import('@/pages/admin/AdminExpenses')),
  '/admin/donors': lazy(() => import('@/pages/admin/AdminDonors')),
  '/admin/profile': lazy(() => import('@/pages/admin/AdminProfile')),
  '/admin/fee-receipts': lazy(() => import('@/pages/admin/AdminFeeReceipts')),
  '/admin/resign-letters': lazy(() => import('@/pages/admin/AdminResignLetters')),
  '/admin/joining-letters': lazy(() => import('@/pages/admin/AdminJoiningLetters')),
  '/admin/admission-letters': lazy(() => import('@/pages/admin/AdminAdmissionLetters')),
  '/admin/designations': lazy(() => import('@/pages/admin/AdminDesignations')),
  '/admin/form-builder': lazy(() => import('@/pages/admin/AdminFormBuilder')),
  '/admin/module-manager': lazy(() => import('@/pages/admin/AdminModuleManager')),
  '/admin/formula-builder': lazy(() => import('@/pages/admin/AdminFormulaBuilder')),
  '/admin/attendance': lazy(() => import('@/pages/admin/AdminAttendance')),
  '/admin/validation-manager': lazy(() => import('@/pages/admin/AdminValidationManager')),
  '/admin/reports': lazy(() => import('@/pages/admin/AdminReports')),
  '/admin/permissions': lazy(() => import('@/pages/admin/AdminPermissions')),
  '/admin/theme': lazy(() => import('@/pages/admin/AdminThemeCustomizer')),
  '/admin/menu-manager': lazy(() => import('@/pages/admin/AdminMenuManager')),
  '/admin/widget-builder': lazy(() => import('@/pages/admin/AdminWidgetBuilder')),
  '/admin/backup': lazy(() => import('@/pages/admin/AdminBackup')),
  '/admin/guardian-notify': lazy(() => import('@/pages/admin/AdminGuardianNotifications')),
  '/admin/salary': lazy(() => import('@/pages/admin/AdminSalary')),
  '/admin/posts': lazy(() => import('@/pages/admin/AdminPosts')),
  '/admin/prayer-calendar': lazy(() => import('@/pages/admin/AdminPrayerCalendar')),
  '/admin/academic-sessions': lazy(() => import('@/pages/admin/AdminAcademicSessions')),
  '/admin/address-manager': lazy(() => import('@/pages/admin/AdminAddressManager')),
  '/admin/api-verification': lazy(() => import('@/pages/admin/AdminApiVerification')),
  '/admin/user-management': lazy(() => import('@/pages/admin/AdminUserManagement')),
  '/admin/approvals': lazy(() => import('@/pages/admin/AdminApprovals')),
  '/admin/payments': lazy(() => import('@/pages/admin/AdminPayments')),
  '/admin/settings': lazy(() => import('@/pages/admin/AdminSettings')),
  '/admin/website': lazy(() => import('@/pages/admin/AdminWebsite')),
};

// Collect all tab items (including from children) that point to currentPath
const collectTabItems = (items: MenuItemConfig[], currentPath: string): MenuItemConfig[] => {
  const tabs: MenuItemConfig[] = [];
  for (const item of items) {
    if (item.tab_of === currentPath && item.visible) {
      tabs.push(item);
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.tab_of === currentPath && child.visible) {
          tabs.push(child);
        }
      }
    }
  }
  return tabs.sort((a, b) => a.sort_order - b.sort_order);
};

interface Props {
  children: React.ReactNode;
}

const AdminPageWithTabs = ({ children }: Props) => {
  const location = useLocation();
  const { language } = useLanguage();
  const { menuConfig } = useMenuSettings();
  const bn = language === 'bn';

  const tabItems = useMemo(
    () => collectTabItems(menuConfig.sidebar, location.pathname),
    [menuConfig.sidebar, location.pathname]
  );

  const [activeTab, setActiveTab] = useState('main');

  // Reset to main tab when route changes
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setActiveTab('main');
  }

  if (tabItems.length === 0) {
    return <>{children}</>;
  }

  // Find current page label for main tab
  const currentMenuItem = menuConfig.sidebar.find(i => i.path === location.pathname)
    || menuConfig.sidebar.flatMap(i => i.children || []).find(i => i.path === location.pathname);
  const mainLabel = currentMenuItem
    ? (bn ? currentMenuItem.label_bn : currentMenuItem.label_en)
    : (bn ? 'মূল পেজ' : 'Main');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setActiveTab('main')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${activeTab === 'main' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
          {mainLabel}
        </button>
        {tabItems.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
            {bn ? tab.label_bn : tab.label_en}
          </button>
        ))}
      </div>

      <TabsContent value="main" className="mt-0">
        {children}
      </TabsContent>

      {tabItems.map(tab => {
        const PageComponent = PAGE_MAP[tab.path];
        if (!PageComponent) return null;
        return (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              }>
                <EmbeddedProvider>
                  <PageComponent />
                </EmbeddedProvider>
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default AdminPageWithTabs;
