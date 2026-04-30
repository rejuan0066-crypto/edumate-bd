import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions, type PermAction } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAdminRole } from '@/lib/roles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

interface PermissionGuardProps {
  menuPath: string;
  /** Action required to render children. Defaults to 'view'. */
  action?: PermAction;
  children: ReactNode;
}

/**
 * Route-level permission guard.
 * Blocks access (with a friendly screen) when the current user lacks the
 * required action permission for the given menu path.
 * Admin / Super Admin bypass all checks.
 */
const PermissionGuard = ({ menuPath, action = 'view', children }: PermissionGuardProps) => {
  const { role, loading: authLoading } = useAuth();
  const { hasPermission, isLoading } = usePermissions();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const bn = language === 'bn';

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (isAdminRole(role) || hasPermission(menuPath, action)) {
    return <>{children}</>;
  }

  return (
    <AdminLayout>
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
                ? `এই পেজটি দেখার অনুমতি আপনার নেই। প্রয়োজনে অ্যাডমিনের সাথে যোগাযোগ করুন।`
                : `You don't have permission to view this page. Please contact an administrator.`}
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
    </AdminLayout>
  );
};

export default PermissionGuard;
