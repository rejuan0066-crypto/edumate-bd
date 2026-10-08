/**
 * Automated route-guard checks.
 *
 * Covers, for admin / staff / teacher:
 *  - direct URL entry into a protected page
 *  - refresh (a fresh mount on the same URL)
 *  - the "/user/..." masked address used by non-admin roles
 *  - logout behaviour (protected pages bounce to /login)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

type AuthState = {
  user: { id: string } | null;
  role: string | null;
  userStatus: string | null;
  loading: boolean;
};

const authState: AuthState = { user: null, role: null, userStatus: null, loading: false };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/PageLoader', () => ({
  default: () => <div>loading</div>,
}));

import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminUrlMask, UserPathRedirect } from '@/components/AdminUrlMask';

const setAuth = (next: Partial<AuthState>) => Object.assign(authState, next);

const AdminPage = ({ label }: { label: string }) => <div>page:{label}</div>;

const renderApp = (initialPath: string) => {
  window.history.replaceState({}, '', initialPath);
  return render(
    <BrowserRouter>
      <AdminUrlMask />
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/waiting-approval" element={<div>waiting page</div>} />
        <Route path="/user/*" element={<UserPathRedirect />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage label="dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute>
              <AdminPage label="students" />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<div>not found</div>} />
      </Routes>
    </BrowserRouter>,
  );
};

const currentUrl = () => window.location.pathname + window.location.search + window.location.hash;

beforeEach(() => {
  cleanup();
  setAuth({ user: null, role: null, userStatus: null, loading: false });
  sessionStorage.clear();
});

describe.each([
  { role: 'admin', masked: false },
  { role: 'super_admin', masked: false },
  { role: 'staff', masked: true },
  { role: 'teacher', masked: true },
])('route guards for $role', ({ role, masked }) => {
  it('allows direct URL entry into a protected page', async () => {
    setAuth({ user: { id: 'u1' }, role, userStatus: 'approved' });
    renderApp('/admin/students');
    expect(await screen.findByText('page:students')).toBeInTheDocument();
  });

  it('keeps the page after a refresh (fresh mount on the same URL)', async () => {
    setAuth({ user: { id: 'u1' }, role, userStatus: 'approved' });
    const first = renderApp('/admin/students');
    await screen.findByText('page:students');
    first.unmount();

    renderApp(currentUrl());
    expect(await screen.findByText('page:students')).toBeInTheDocument();
  });

  it(`${masked ? 'masks' : 'keeps'} the address bar path`, async () => {
    setAuth({ user: { id: 'u1' }, role, userStatus: 'approved' });
    renderApp('/admin/students?tab=list#top');
    await screen.findByText('page:students');
    await waitFor(() => {
      expect(currentUrl()).toBe(
        masked ? '/user/students?tab=list#top' : '/admin/students?tab=list#top',
      );
    });
  });

  it('serves the same page when a /user/... link is opened directly', async () => {
    setAuth({ user: { id: 'u1' }, role, userStatus: 'approved' });
    renderApp('/user/students');
    expect(await screen.findByText('page:students')).toBeInTheDocument();
  });

  it('sends a logged-out visitor to the login page', async () => {
    setAuth({ user: null, role: null, userStatus: null, loading: false });
    renderApp('/admin/students');
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('sends a logged-out visitor on a /user/... link to the login page', async () => {
    setAuth({ user: null, role: null, userStatus: null, loading: false });
    renderApp('/user/students');
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('holds a pending non-admin account on the waiting screen', async () => {
    setAuth({ user: { id: 'u1' }, role, userStatus: 'pending' });
    renderApp('/admin/students');
    if (role === 'admin' || role === 'super_admin') {
      expect(await screen.findByText('page:students')).toBeInTheDocument();
    } else {
      expect(await screen.findByText('waiting page')).toBeInTheDocument();
    }
  });
});

describe('route guards: shared behaviour', () => {
  it('shows the loader while the session is still resolving', () => {
    setAuth({ user: null, role: null, userStatus: null, loading: true });
    renderApp('/admin');
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('forces a pending login OTP session back to /login', async () => {
    setAuth({ user: { id: 'u1' }, role: 'staff', userStatus: 'approved' });
    sessionStorage.setItem('pending_login_otp_v1', '1');
    renderApp('/admin/students');
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('never masks public routes', async () => {
    setAuth({ user: { id: 'u1' }, role: 'staff', userStatus: 'approved' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <AdminUrlMask />
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/admin" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('home')).toBeInTheDocument();
  });

  it('unmasks /user to /admin when an admin accesses /user', async () => {
    setAuth({ user: { id: 'u1' }, role: 'admin', userStatus: 'approved' });
    renderApp('/user/students');
    expect(await screen.findByText('page:students')).toBeInTheDocument();
    await waitFor(() => {
      expect(currentUrl()).toBe('/admin/students');
    });
  });

  it('does not mask to /user while role is null during initial load', async () => {
    setAuth({ user: { id: 'u1' }, role: null, userStatus: null, loading: false });
    renderApp('/admin/students');
    // While role is null, currentUrl must remain /admin/students, not masked to /user
    expect(currentUrl()).toBe('/admin/students');
  });
});
