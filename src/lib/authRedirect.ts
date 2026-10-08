import { isAdminRole } from '@/lib/roles';

type AuthRedirectState = {
  role: string | null | undefined;
  userStatus: string | null | undefined;
};

type ProtectedRouteState = AuthRedirectState & {
  pathname: string;
};

export const hasResolvedAuthRedirectState = ({ role, userStatus }: AuthRedirectState): boolean => {
  return isAdminRole(role) || typeof role === 'string' || typeof userStatus === 'string';
};

export const getAuthenticatedHomePath = ({ role, userStatus }: AuthRedirectState): string => {
  if (userStatus === 'pending' && !isAdminRole(role)) return '/waiting-approval';
  // Admins go to /admin, non-admins go to /user
  if (role && !isAdminRole(role)) return '/user';
  return '/admin';
};

export const getProtectedRouteRedirect = ({ pathname, role, userStatus }: ProtectedRouteState): string | null => {
  if (!hasResolvedAuthRedirectState({ role, userStatus })) {
    return null;
  }

  if (userStatus === 'pending' && !isAdminRole(role)) {
    return pathname === '/waiting-approval' ? null : '/waiting-approval';
  }

  // Redirect legacy /staff-dashboard to /admin for all roles
  if (pathname === '/staff-dashboard') {
    return '/admin';
  }

  return null;
};

export const getWaitingApprovalRedirect = ({ role, userStatus }: AuthRedirectState): string | null => {
  if (!hasResolvedAuthRedirectState({ role, userStatus })) {
    return null;
  }

  if (isAdminRole(role) || userStatus === 'pending') {
    return null;
  }

  return '/admin';
};
