import { Suspense, useEffect, useMemo, useState } from 'react';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';
import { useLocation } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMenuSettings, MenuItemConfig } from '@/hooks/useMenuSettings';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { EmbeddedProvider } from '@/contexts/EmbeddedContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

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
  '/admin/receipt-audit': lazy(() => import('@/pages/admin/AdminReceiptStatusAudit')),
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
  '/admin/salary-memo-search': lazy(() => import('@/pages/admin/AdminSalaryMemoSearch')),
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

  const { canView, isFeatureAllowed } = usePermissions();

  const tabItems = useMemo(
    () =>
      collectTabItems(menuConfig.sidebar, location.pathname).filter(
        (t) => canView(t.path) && isFeatureAllowed(location.pathname, t.id)
      ),
    [menuConfig.sidebar, location.pathname, canView, isFeatureAllowed]
  );

  const [activeTab, setActiveTab] = useState('main');

  useEffect(() => {
    setActiveTab('main');
  }, [location.pathname]);

  if (tabItems.length === 0) {
    return <>{children}</>;
  }

  // Find current page label for main tab
  const currentMenuItem = menuConfig.sidebar.find(i => i.path === location.pathname)
    || menuConfig.sidebar.flatMap(i => i.children || []).find(i => i.path === location.pathname);
  const mainLabel = currentMenuItem
    ? (bn ? currentMenuItem.label_bn : currentMenuItem.label_en)
    : (bn ? 'মূল পেজ' : 'Main');

  const toggleTab = (id: string) => {
    setActiveTab(prev => prev === id ? '' : id);
  };

  const allTabs = [
    { id: 'main', label: mainLabel },
    ...tabItems.map(t => ({ id: t.id, label: bn ? t.label_bn : t.label_en })),
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="mb-4">
        <LayoutGroup id="admin-page-tabs">
          <div
            className={cn(
              'inline-flex items-center gap-1 p-1.5 rounded-full max-w-full overflow-x-auto',
              'border border-border/30',
              'bg-gradient-to-r from-muted/70 via-muted/40 to-muted/70',
              'backdrop-blur-xl',
              'shadow-[inset_0_1px_0_hsl(var(--background)/0.4),0_2px_12px_-4px_hsl(var(--foreground)/0.08)]',
              '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
            )}
          >
            {allTabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => toggleTab(tab.id)}
                  className={cn(
                    'relative flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    'border-[1.5px] border-[hsl(var(--aqua)_/_0.38)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.32),0_0_12px_-7px_hsl(var(--aqua)_/_0.45)]',
                    active
                      ? 'text-primary-foreground border-[hsl(var(--aqua)_/_0.62)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 hover:border-[hsl(var(--aqua)_/_0.55)]',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-page-tab-bg"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary/85 shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {activeTab === 'main' && (
        <TabsContent value="main" className="mt-0">
          {children}
        </TabsContent>
      )}

      {tabItems.map(tab => {
        if (activeTab !== tab.id) return null;
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
