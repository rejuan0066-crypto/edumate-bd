import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import PageLoader from '@/components/PageLoader';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role, userStatus } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Pending users must go to waiting-approval page
  if (userStatus === 'pending' && !isAdminRole(role)) {
    const path = location.pathname;
    if (path !== '/waiting-approval') {
      return <Navigate to="/waiting-approval" replace />;
    }
    return <>{children}</>;
  }

  const path = location.pathname;
  const isAdminRoute = path.startsWith('/admin');

  // Admin/Super Admin has full access everywhere
  if (isAdminRole(role)) {
    return <>{children}</>;
  }

  // STRICT: Non-admin users can NEVER access /admin routes — redirect to staff dashboard
  if (isAdminRoute) {
    return <Navigate to="/staff-dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
