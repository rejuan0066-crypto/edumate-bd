import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Route prefetcher with a network-aware priority queue.
 *
 *  - Each prefetch has a priority (1 = highest). The queue always pulls the
 *    highest-priority pending task next.
 *  - Concurrency is throttled by `effectiveType`:
 *      4g  → 2 parallel, up to 8 items, 200ms gap
 *      3g  → 1 parallel, up to 4 items, 600ms gap
 *      2g/slow-2g/Save-Data → 0 (skip entirely)
 *  - The queue is rebuilt on every route change. In-flight tasks finish but
 *    pending lower-priority tasks for the previous route are dropped.
 *  - Each chunk is loaded at most once per session (deduped by label).
 *
 * The queue is built from a small predictor: given the current pathname, what
 * are the most likely next destinations? Higher-priority entries are pages a
 * user is one click away from.
 */

type Loader = () => Promise<unknown>;
type Task = { label: string; priority: number; load: Loader };

interface NetConn {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
}

const getConn = (): NetConn | null => {
  try {
    return (navigator as any).connection || null;
  } catch {
    return null;
  }
};

const networkBudget = (): { concurrency: number; max: number; gapMs: number } | null => {
  const c = getConn();
  if (c?.saveData) return null;
  const t = (c?.effectiveType || '4g') as string;
  if (t === 'slow-2g' || t === '2g') return null;
  if (t === '3g') return { concurrency: 1, max: 4, gapMs: 600 };
  // Preload key admin route chunks in background so clicking navigation is instant
  return { concurrency: 2, max: 12, gapMs: 250 };
};

const idle = (cb: () => void, timeout = 2500) => {
  const ric = (window as any).requestIdleCallback as
    | ((cb: IdleRequestCallback, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(() => cb(), { timeout });
  else setTimeout(cb, 1500);
};

// ───────── Loader registry (label → loader) ─────────
// Labels are stable strings; the actual loaders share Vite's module graph with
// the lazy() imports in App.tsx, so dedup is automatic at the module level too.
const L: Record<string, Loader> = {
  About: () => import('@/pages/About'),
  Notice: () => import('@/pages/NoticePage'),
  Gallery: () => import('@/pages/Gallery'),
  Contact: () => import('@/pages/Contact'),
  Admission: () => import('@/pages/AdmissionPage'),
  AdmissionTests: () => import('@/pages/AdmissionTestsPublic'),
  Result: () => import('@/pages/ResultFind'),
  StudentInfo: () => import('@/pages/StudentInfoPage'),
  Posts: () => import('@/pages/PostsPage'),
  Donation: () => import('@/pages/DonationPage'),
  Login: () => import('@/pages/Login'),
  ParentPortal: () => import('@/pages/ParentPortal'),
  StudentPortal: () => import('@/pages/StudentPortal'),
  Complaint: () => import('@/pages/ComplaintPage'),
  ComplaintTrack: () => import('@/pages/ComplaintTrackPage'),
  AdminLayout: () => import('@/components/AdminLayout'),
  Dashboard: () => import('@/pages/admin/Dashboard'),
  AdminStudents: () => import('@/pages/admin/AdminStudents'),
  AdminStaff: () => import('@/pages/admin/AdminStaff'),
  AdminFees: () => import('@/pages/admin/AdminStudentsFees'),
  AdminFeeReceipts: () => import('@/pages/admin/AdminFeeReceipts'),
  AdminNotices: () => import('@/pages/admin/AdminNotices'),
  AdminSettings: () => import('@/pages/admin/AdminSettings'),
  AdminAttendance: () => import('@/pages/admin/AdminStudentAttendance'),
  AdminSalary: () => import('@/pages/admin/AdminSalary'),
  AdminExpenses: () => import('@/pages/admin/AdminExpenses'),
  AdminUserManagement: () => import('@/pages/admin/AdminUserManagement'),
  AdminPermissions: () => import('@/pages/admin/AdminPermissions'),
};

// ───────── Predictor ─────────
const predict = (pathname: string): Task[] => {
  // Lower priority number = loaded first. Keep gentle so we don't clog network.
  const home: Task[] = [
    { label: 'Notice',         priority: 1, load: L.Notice },
    { label: 'Login',          priority: 2, load: L.Login },
    { label: 'Admission',      priority: 3, load: L.Admission },
  ];

  const onLogin: Task[] = [
    { label: 'AdminLayout',    priority: 1, load: L.AdminLayout },
    { label: 'Dashboard',      priority: 1, load: L.Dashboard },
    { label: 'AdminStudents',  priority: 2, load: L.AdminStudents },
    { label: 'AdminStaff',     priority: 2, load: L.AdminStaff },
    { label: 'AdminExpenses',  priority: 3, load: L.AdminExpenses },
    { label: 'AdminUserManagement', priority: 3, load: L.AdminUserManagement },
    { label: 'AdminFees',      priority: 4, load: L.AdminFees },
  ];

  const onAdminBase: Task[] = [
    { label: 'AdminStudents',  priority: 1, load: L.AdminStudents },
    { label: 'AdminStaff',     priority: 1, load: L.AdminStaff },
    { label: 'AdminExpenses',  priority: 2, load: L.AdminExpenses },
    { label: 'AdminUserManagement', priority: 2, load: L.AdminUserManagement },
    { label: 'AdminSalary',    priority: 3, load: L.AdminSalary },
    { label: 'AdminFees',      priority: 3, load: L.AdminFees },
    { label: 'AdminPermissions', priority: 4, load: L.AdminPermissions },
    { label: 'AdminFeeReceipts', priority: 4, load: L.AdminFeeReceipts },
    { label: 'AdminNotices',   priority: 5, load: L.AdminNotices },
    { label: 'AdminSettings',  priority: 5, load: L.AdminSettings },
  ];

  const onParent: Task[] = [
    { label: 'Login',          priority: 2, load: L.Login },
    { label: 'Notice',         priority: 3, load: L.Notice },
    { label: 'Result',         priority: 3, load: L.Result },
  ];

  if (pathname === '/' || pathname === '') return home;
  if (pathname === '/login') return onLogin;
  if (pathname.startsWith('/parent') || pathname.startsWith('/student-portal')) return onParent;
  if (pathname.startsWith('/admin')) {
    // Boost the page the user is most likely heading to next based on current sub-route
    const boosts: Record<string, string> = {
      '/admin/students': 'AdminFees',
      '/admin/staff': 'AdminSalary',
      '/admin/students-fees': 'AdminFeeReceipts',
      '/admin/notices': 'AdminSettings',
    };
    const boostKey = boosts[pathname];
    if (boostKey && L[boostKey]) {
      return [{ label: boostKey, priority: 0, load: L[boostKey] }, ...onAdminBase];
    }
    return onAdminBase;
  }
  // Other public routes
  return home;
};

// ───────── Module-scoped state (survives remounts in dev/HMR) ─────────
const completed = new Set<string>();
const inflight = new Set<string>();

const RoutePrefetcher = () => {
  const { pathname } = useLocation();
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Cancel any pending tasks scheduled for the previous route
    cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;

    const budget = networkBudget();
    if (!budget) return; // 2g / save-data

    // Build & sort queue, dedupe already-loaded
    const queue: Task[] = predict(pathname)
      .filter((t) => !completed.has(t.label) && !inflight.has(t.label))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, budget.max);

    if (!queue.length) return;

    let active = 0;
    let i = 0;

    const drain = () => {
      if (token.cancelled) return;
      while (active < budget.concurrency && i < queue.length) {
        const task = queue[i++];
        if (completed.has(task.label) || inflight.has(task.label)) continue;
        inflight.add(task.label);
        active++;
        idle(() => {
          if (token.cancelled) {
            inflight.delete(task.label);
            active--;
            return;
          }
          task
            .load()
            .then(() => completed.add(task.label))
            .catch(() => {
              /* swallow — prefetch is best-effort */
            })
            .finally(() => {
              inflight.delete(task.label);
              active--;
              // Stagger next pick to avoid network bursts on weak links
              setTimeout(drain, budget.gapMs);
            });
        });
      }
    };

    // Wait a tick so the new route's own chunk wins the network race
    const startTimer = setTimeout(drain, 400);
    return () => {
      token.cancelled = true;
      clearTimeout(startTimer);
    };
  }, [pathname]);

  return null;
};

export default RoutePrefetcher;
