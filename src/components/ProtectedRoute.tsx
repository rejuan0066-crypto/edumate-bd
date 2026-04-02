import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Paths that are always accessible to any authenticated+approved user
const ALWAYS_ALLOWED = [
  '/admin',           // dashboard
  '/admin/profile',   // own profile
];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role, userStatus } = useAuth();
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

  // Pending users must go to waiting-approval page
  if (userStatus === 'pending' && role !== 'admin') {
    const path = location.pathname;
    if (path !== '/waiting-approval') {
      return <Navigate to="/waiting-approval" replace />;
    }
    return <>{children}</>;
  }

  const path = location.pathname;
  const isAdminRoute = path.startsWith('/admin');

  // Admin has full access
  if (role === 'admin') {
    return <>{children}</>;
  }

  // Non-admin on admin routes — redirect to staff dashboard
  if (isAdminRoute) {
    // Only /admin/profile is allowed for non-admins (own profile)
    if (path === '/admin/profile' || path.startsWith('/admin/profile/')) {
      return <>{children}</>;
    }

    // The main /admin dashboard is NOT allowed for non-admins
    if (path === '/admin') {
      return <Navigate to="/staff-dashboard" replace />;
    }

    if (accessControl?.accessMap) {
      const roleAccess = accessControl.accessMap[path];
      const userBaseRole = role as string;
      const roleAllowed = roleAccess && roleAccess[userBaseRole];
      
      if (roleAllowed) {
        if (!canView(path)) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      } else {
        if (!hasUserPermission(path, 'view')) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      }
    } else if (accessControl?.paths) {
      const isAdminOnly = accessControl.paths.some(p => path === p || path.startsWith(p + '/'));
      if (isAdminOnly) {
        if (!hasUserPermission(path, 'view')) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      } else {
        if (!canView(path)) {
          return <Navigate to="/staff-dashboard" replace />;
        }
      }
    } else {
      return <Navigate to="/staff-dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
