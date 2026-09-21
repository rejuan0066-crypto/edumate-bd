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
    if (loading) return;
    if (isAdminRole(role)) return;
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
