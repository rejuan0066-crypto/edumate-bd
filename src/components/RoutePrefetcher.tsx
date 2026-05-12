import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Prefetches likely-next route chunks during browser idle time so navigation
 * feels instant. Uses dynamic import() — Vite turns each into a separate chunk
 * and the browser dedupes with the lazy() loaders in App.tsx.
 *
 * Strategy:
 *  - On any public route → prefetch other top public pages + Login.
 *  - On /login → also prefetch admin Dashboard + AdminLayout-heavy pages.
 *  - On /admin/* → prefetch the most-used admin pages (Students, Staff, Fees,
 *    Notices, Settings).
 *  - Skips prefetch on slow networks (2g) or when Save-Data is on.
 */
const idle = (cb: () => void, timeout = 2500) => {
  if (typeof window === 'undefined') return;
  const ric = (window as any).requestIdleCallback as
    | ((cb: IdleRequestCallback, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(() => cb(), { timeout });
  else setTimeout(cb, 1200);
};

const shouldSkipPrefetch = () => {
  try {
    const conn = (navigator as any).connection;
    if (!conn) return false;
    if (conn.saveData) return true;
    const t = conn.effectiveType as string | undefined;
    if (t === 'slow-2g' || t === '2g') return true;
  } catch {}
  return false;
};

const PUBLIC_PREFETCHES: Array<() => Promise<unknown>> = [
  () => import('@/pages/About'),
  () => import('@/pages/NoticePage'),
  () => import('@/pages/Gallery'),
  () => import('@/pages/Contact'),
  () => import('@/pages/AdmissionPage'),
  () => import('@/pages/ResultFind'),
  () => import('@/pages/Login'),
  () => import('@/pages/ParentPortal'),
];

const LOGIN_PREFETCHES: Array<() => Promise<unknown>> = [
  () => import('@/pages/admin/Dashboard'),
  () => import('@/components/AdminLayout'),
  () => import('@/pages/admin/AdminStudents'),
];

const ADMIN_PREFETCHES: Array<() => Promise<unknown>> = [
  () => import('@/pages/admin/AdminStudents'),
  () => import('@/pages/admin/AdminStaff'),
  () => import('@/pages/admin/AdminStudentsFees'),
  () => import('@/pages/admin/AdminFeeReceipts'),
  () => import('@/pages/admin/AdminNotices'),
  () => import('@/pages/admin/AdminSettings'),
];

const runQueue = (queue: Array<() => Promise<unknown>>) => {
  // Stagger so we don't burst the network all at once on weak mobile links.
  queue.forEach((load, i) => {
    idle(() => {
      load().catch(() => {
        /* swallow — just a hint */
      });
    }, 2500 + i * 400);
  });
};

const RoutePrefetcher = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (shouldSkipPrefetch()) return;

    let queue: Array<() => Promise<unknown>> = [];
    if (pathname.startsWith('/admin')) queue = ADMIN_PREFETCHES;
    else if (pathname === '/login') queue = [...LOGIN_PREFETCHES, ...PUBLIC_PREFETCHES];
    else queue = PUBLIC_PREFETCHES;

    runQueue(queue);
  }, [pathname]);

  return null;
};

export default RoutePrefetcher;
