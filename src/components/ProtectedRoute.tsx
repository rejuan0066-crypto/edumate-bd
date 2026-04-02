import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

// Paths that are always accessible to any authenticated user
const ALWAYS_ALLOWED = [
  '/admin',           // dashboard
  '/admin/profile',   // own profile
];

// Admin-only paths that non-admin users should never access
const ADMIN_ONLY_PATHS = [
  '/admin/settings',
  '/admin/user-management',
  '/admin/permissions',
  '/admin/module-manager',
  '/admin/theme',
  '/admin/menu-manager',
  '/admin/widget-builder',
  '/admin/backup',
  '/admin/website',
  '/admin/form-builder',
  '/admin/formula-builder',
  '/admin/validation-manager',
  '/admin/api-verification',
  '/admin/address-manager',
  '/admin/prayer-calendar',
  '/admin/guardian-notify',
  '/admin/approvals',
  '/admin/designations',
  '/admin/academic-sessions',
];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role } = useAuth();
  const { canView, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const path = location.pathname;
  const isAdminRoute = path.startsWith('/admin');

  // Admin has full access
  if (role === 'admin') {
    return <>{children}</>;
  }

  // Non-admin on admin routes
  if (isAdminRoute) {
    // Always-allowed paths (dashboard, profile)
    const isAlwaysAllowed = ALWAYS_ALLOWED.some(p => path === p || path.startsWith(p + '/'));
    if (isAlwaysAllowed) {
      return <>{children}</>;
    }

    // Admin-only paths → block immediately
    const isAdminOnly = ADMIN_ONLY_PATHS.some(p => path === p || path.startsWith(p + '/'));
    if (isAdminOnly) {
      return <Navigate to="/staff-dashboard" replace />;
    }

    // For all other admin paths, check if user has view permission
    // e.g. /admin/students, /admin/fees, /admin/notices
    if (!canView(path)) {
      return <Navigate to="/staff-dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
