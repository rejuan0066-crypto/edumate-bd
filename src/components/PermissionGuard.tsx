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
      <div className="min-h-[60vh]" />
    </AdminLayout>
  );
};

export default PermissionGuard;
