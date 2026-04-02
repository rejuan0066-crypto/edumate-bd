import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Paths that are always accessible to any authenticated user
const ALWAYS_ALLOWED = [
  '/admin',           // dashboard
  '/admin/profile',   // own profile
];

// Fallback if DB setting not loaded yet
const DEFAULT_ADMIN_ONLY_PATHS = [
  '/admin/settings', '/admin/user-management', '/admin/permissions',
  '/admin/module-manager', '/admin/theme', '/admin/menu-manager',
  '/admin/widget-builder', '/admin/backup', '/admin/website',
  '/admin/form-builder', '/admin/formula-builder', '/admin/validation-manager',
  '/admin/api-verification', '/admin/address-manager', '/admin/prayer-calendar',
  '/admin/guardian-notify', '/admin/approvals', '/admin/designations',
  '/admin/academic-sessions',
];

// All admin paths for matching
const ALL_PATHS_LIST = [
  '/admin/settings', '/admin/user-management', '/admin/permissions',
  '/admin/module-manager', '/admin/theme', '/admin/menu-manager',
  '/admin/widget-builder', '/admin/backup', '/admin/website',
  '/admin/form-builder', '/admin/formula-builder', '/admin/validation-manager',
  '/admin/api-verification', '/admin/address-manager', '/admin/prayer-calendar',
  '/admin/guardian-notify', '/admin/approvals', '/admin/designations',
  '/admin/academic-sessions', '/admin/students', '/admin/staff',
  '/admin/divisions', '/admin/subjects', '/admin/results',
  '/admin/notices', '/admin/fees', '/admin/fee-receipts',
  '/admin/expenses', '/admin/donors', '/admin/attendance',
  '/admin/salary', '/admin/reports', '/admin/posts',
  '/admin/resign-letters', '/admin/joining-letters', '/admin/admission-letters',
];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role } = useAuth();
  const { canView, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  // Load dynamic access control from website_settings
  const { data: accessControl } = useQuery({
    queryKey: ['admin-only-paths'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'admin_only_paths')
        .maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        // New format with per-role access map
        if (val.access_map && typeof val.access_map === 'object') {
          return { accessMap: val.access_map as Record<string, Record<string, boolean>>, paths: val.paths as string[] || [] };
        }
        // Old format: just admin-only paths
        if (Array.isArray(val.paths)) {
          return { accessMap: null, paths: val.paths as string[] };
        }
      }
      return { accessMap: null, paths: DEFAULT_ADMIN_ONLY_PATHS };
    },
    staleTime: 60000,
  });

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

    // Check role-based access
    const ac = accessControl ?? { accessMap: null, paths: DEFAULT_ADMIN_ONLY_PATHS };
    const matchedPath = ALL_PATHS_LIST.find(p => path === p || path.startsWith(p + '/'));

    if (matchedPath) {
      // Users without a role → check individual user_permissions only
      if (!role) {
        if (!canView(matchedPath)) {
          return <Navigate to="/staff-dashboard" replace />;
        }
        return <>{children}</>;
      }

      if (ac.accessMap) {
        // New format: check per-role access
        const roleAccess = ac.accessMap[matchedPath];
        const userBaseRole = role as string;
        if (!roleAccess || !roleAccess[userBaseRole]) {
          // Role doesn't have access via access control, but check individual permissions
          if (!canView(matchedPath)) {
            return <Navigate to="/staff-dashboard" replace />;
          }
        }
      } else {
        // Old format: just admin-only paths
        const isAdminOnly = ac.paths.some(p => path === p || path.startsWith(p + '/'));
        if (isAdminOnly) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      }
    }

    // For all other admin paths, check if user has view permission
    if (!canView(path)) {
      return <Navigate to="/staff-dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
