import { useEffect } from 'react';
import { useLocation, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';

/**
 * Cosmetic URL mask: non-admin users see "/user/..." in the address bar while
 * the router keeps rendering the exact same "/admin/..." route. Nothing about
 * routing, permissions or page content changes.
 */
export const AdminUrlMask = () => {
  const { role, loading } = useAuth() as { role?: string | null; loading?: boolean };
  const location = useLocation();

  useEffect(() => {
    // 1. While auth is loading or role is not yet resolved, do NOT touch the URL!
    if (loading || !role) return;

    // 2. If the user is an admin (admin / super_admin):
    //    Ensure their address bar is ALWAYS on /admin. If it somehow starts with /user, unmask it!
    if (isAdminRole(role)) {
      if (window.location.pathname.startsWith('/user')) {
        const unmasked = `/admin${window.location.pathname.slice('/user'.length)}${window.location.search}${window.location.hash}`;
        if (window.location.pathname !== unmasked) {
          window.history.replaceState(window.history.state, '', unmasked);
        }
      }
      return;
    }

    // 3. Non-admin users (staff, teacher, student, parent, etc.):
    //    Mask the /admin address to /user in the address bar.
    if (!location.pathname.startsWith('/admin')) return;

    const masked = `/user${location.pathname.slice('/admin'.length)}${location.search}${location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== masked) {
      window.history.replaceState(window.history.state, '', masked);
    }
  }, [role, loading, location.pathname, location.search, location.hash]);

  return null;
};

/** Handles direct visits / refreshes on a masked "/user/..." address. */
export const UserPathRedirect = () => {
  const params = useParams();
  const location = useLocation();
  const rest = params['*'] ?? '';
  return <Navigate to={`/admin${rest ? `/${rest}` : ''}${location.search}${location.hash}`} replace />;
};

export default AdminUrlMask;
