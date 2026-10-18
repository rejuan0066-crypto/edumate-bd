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

  // Module disabled - render completely blank without message
  if (!currentEnabled) {
    return <div className="min-h-[60vh]" />;
  }

  // Wait for auth + permissions
  if (authLoading || permLoading) {
    return <RouteShimmer />;
  }

  // Permission check (admin/super_admin bypass) - when no permission, render completely blank without message
  if (!isAdminRole(role) && !hasPermission(menuPath, action)) {
    return <div className="min-h-[60vh]" />;
  }

  return <>{children}</>;
};

export default ModuleGuard;
