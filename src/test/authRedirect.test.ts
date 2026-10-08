import { describe, expect, it } from 'vitest';
import {
  getAuthenticatedHomePath,
  getProtectedRouteRedirect,
  getWaitingApprovalRedirect,
  hasResolvedAuthRedirectState,
} from '@/lib/authRedirect';

describe('auth redirect logic', () => {
  it('routes admins to /admin', () => {
    expect(getAuthenticatedHomePath({ role: 'admin', userStatus: 'approved' })).toBe('/admin');
    expect(getAuthenticatedHomePath({ role: 'super_admin', userStatus: 'pending' })).toBe('/admin');
  });

  it('routes pending non-admin users to waiting approval', () => {
    expect(getAuthenticatedHomePath({ role: 'staff', userStatus: 'pending' })).toBe('/waiting-approval');
  });

  it('routes approved non-admin users to /user and admins to /admin', () => {
    expect(getAuthenticatedHomePath({ role: 'staff', userStatus: 'approved' })).toBe('/user');
    expect(getAuthenticatedHomePath({ role: null, userStatus: 'approved' })).toBe('/admin');
    expect(getAuthenticatedHomePath({ role: 'teacher', userStatus: 'approved' })).toBe('/user');
    expect(getAuthenticatedHomePath({ role: 'admin', userStatus: 'approved' })).toBe('/admin');
  });

  it('does not redirect until access state is resolved', () => {
    expect(hasResolvedAuthRedirectState({ role: null, userStatus: null })).toBe(false);
    expect(getProtectedRouteRedirect({ pathname: '/admin', role: null, userStatus: null })).toBeNull();
    expect(getWaitingApprovalRedirect({ role: null, userStatus: null })).toBeNull();
  });

  it('prevents pending users from bouncing away from waiting approval', () => {
    expect(getProtectedRouteRedirect({ pathname: '/waiting-approval', role: 'staff', userStatus: 'pending' })).toBeNull();
    expect(getProtectedRouteRedirect({ pathname: '/admin', role: 'staff', userStatus: 'pending' })).toBe('/waiting-approval');
  });

  it('keeps approved users away from waiting approval', () => {
    expect(getWaitingApprovalRedirect({ role: 'staff', userStatus: 'approved' })).toBe('/admin');
  });

  it('redirects legacy /staff-dashboard to /admin for all roles', () => {
    expect(getProtectedRouteRedirect({ pathname: '/staff-dashboard', role: 'staff', userStatus: 'approved' })).toBe('/admin');
    expect(getProtectedRouteRedirect({ pathname: '/staff-dashboard', role: 'admin', userStatus: 'approved' })).toBe('/admin');
  });

  it('allows all approved users to access /admin routes', () => {
    expect(getProtectedRouteRedirect({ pathname: '/admin/staff', role: 'staff', userStatus: 'approved' })).toBeNull();
    expect(getProtectedRouteRedirect({ pathname: '/admin/students', role: 'teacher', userStatus: 'approved' })).toBeNull();
  });
});
