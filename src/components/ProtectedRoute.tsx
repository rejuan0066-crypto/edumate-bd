import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { isAdminRole } from '@/lib/roles';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role, userStatus } = useAuth();
  const location = useLocation();

  if (loading) {
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
