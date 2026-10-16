import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { usePermissions, type PermAction } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAdminRole } from '@/lib/roles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import RouteShimmer from '@/components/RouteShimmer';

interface ModuleGuardProps {
  menuPath: string;
  /** Action required for this route. Defaults to 'view'. */
  action?: PermAction;
  children: ReactNode;
}

/**
 * Combined module + permission guard for admin routes.
 *  - Blocks if the module is disabled in Module Manager
 *  - Blocks if the current user lacks the required action permission
 * Admin / Super Admin bypass all permission checks (module toggle still applies).
 */
const ModuleGuard = ({ menuPath, action = 'view', children }: ModuleGuardProps) => {
  const { currentEnabled, getModuleInfo } = useModuleAccess(menuPath);
  const { role, loading: authLoading } = useAuth();
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const bn = language === 'bn';
  const info = getModuleInfo(menuPath);

  // Module disabled
  if (!currentEnabled) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {bn ? 'মডিউল নিষ্ক্রিয়' : 'Module Disabled'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {bn
                ? `"${info?.name_bn || menuPath}" মডিউলটি বর্তমানে বন্ধ আছে। সক্রিয় করতে মডিউল ম্যানেজারে যান।`
                : `The "${info?.name || menuPath}" module is currently disabled. Go to Module Manager to enable it.`}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/admin')}>
                {bn ? 'ড্যাশবোর্ড' : 'Dashboard'}
              </Button>
              <Button onClick={() => navigate('/admin/module-manager')}>
                {bn ? 'মডিউল ম্যানেজার' : 'Module Manager'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wait for auth + permissions
  if (authLoading || permLoading) {
    return <RouteShimmer />;
  }

  // Permission check (admin/super_admin bypass)
  if (!isAdminRole(role) && !hasPermission(menuPath, action)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {bn ? 'অনুমতি নেই' : 'Permission Denied'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {bn
                ? `এই পেজটি ${action === 'view' ? 'দেখার' : action === 'add' ? 'নতুন তৈরির' : action === 'edit' ? 'সম্পাদনার' : action === 'delete' ? 'মুছে ফেলার' : 'অনুমোদনের'} অনুমতি আপনার নেই। প্রয়োজনে অ্যাডমিনের সাথে যোগাযোগ করুন।`
                : `You don't have permission to ${action} this page. Please contact an administrator.`}
            </p>
            <div className="text-xs text-muted-foreground/70">
              <code>{menuPath}</code> · {action}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                {bn ? 'ফিরে যান' : 'Go Back'}
              </Button>
              <Button onClick={() => navigate('/admin')}>
                {bn ? 'ড্যাশবোর্ড' : 'Dashboard'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ModuleGuard;
