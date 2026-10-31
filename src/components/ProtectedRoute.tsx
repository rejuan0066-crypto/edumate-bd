import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageLoader from '@/components/PageLoader';
import { getProtectedRouteRedirect, hasResolvedAuthRedirectState } from '@/lib/authRedirect';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role, userStatus } = useAuth();
  const location = useLocation();
  const hasResolvedState = hasResolvedAuthRedirectState({ role, userStatus });

  if (loading && !user) {
    return <PageLoader />;
  }

  if (!user) {
    let autoLoggedOut = false;
    try {
      if (sessionStorage.getItem('auto_logout_redirect_home') === '1') {
        sessionStorage.removeItem('auto_logout_redirect_home');
        autoLoggedOut = true;
      }
    } catch {
      /* ignore */
    }

    if (autoLoggedOut) {
      return <Navigate to="/" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  // If a login OTP gate is still pending for this session, force back to /login
  // so the OTP dialog can complete (or the user can sign out / retry).
  let pendingLoginOtp = false;
  try { pendingLoginOtp = sessionStorage.getItem('pending_login_otp_v1') === '1'; } catch { /* ignore */ }
  if (pendingLoginOtp && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (!hasResolvedState) {
    return <PageLoader />;
  }

  const redirectPath = getProtectedRouteRedirect({
    pathname: location.pathname,
    role,
    userStatus,
  });

  if (redirectPath && redirectPath !== location.pathname) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
