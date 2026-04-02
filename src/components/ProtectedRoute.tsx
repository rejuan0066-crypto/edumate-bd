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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role } = useAuth();
  const { canView, hasUserPermission, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  // Load dynamic access control from website_settings
  const { data: accessControl, isLoading: acLoading } = useQuery({
    queryKey: ['admin-only-paths'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'admin_only_paths')
        .maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        if (val.access_map && typeof val.access_map === 'object') {
          return { accessMap: val.access_map as Record<string, Record<string, boolean>>, paths: val.paths as string[] || [] };
        }
        if (Array.isArray(val.paths)) {
          return { accessMap: null, paths: val.paths as string[] };
        }
      }
      return null;
    },
    staleTime: 60000,
  });

  if (loading || permLoading || acLoading) {
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

    if (accessControl?.accessMap) {
      // New format: check per-role access map
      const roleAccess = accessControl.accessMap[path];
      const userBaseRole = role as string;
      const roleAllowed = roleAccess && roleAccess[userBaseRole];
      
      if (roleAllowed) {
        // Role explicitly allowed by access control - check view permission
        if (!canView(path)) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      } else {
        // Role NOT allowed - only individual user_permissions can override
        if (!hasUserPermission(path, 'view')) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      }
    } else if (accessControl?.paths) {
      // Old format: all listed paths are admin-only
      const isAdminOnly = accessControl.paths.some(p => path === p || path.startsWith(p + '/'));
      if (isAdminOnly) {
        // Admin-only path: only individual user_permissions can override (NOT role_permissions)
        if (!hasUserPermission(path, 'view')) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      } else {
        // Not in admin-only list - check normal view permission
        if (!canView(path)) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      }
    } else {
      // No access control data - block all admin routes for non-admin
      return <Navigate to="/staff-dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
