import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_DOMAIN = 'subhaniabd.vercel.app';
const PORTAL_DOMAIN = 'portal-subhaniabd.vercel.app';

/**
 * Enforces strict domain role separation (Option 2):
 * - subhaniabd.vercel.app is STRICTLY for the public website.
 *   Any attempt to access /admin, /user, /login is immediately bounced to portal-subhaniabd.vercel.app.
 * - portal-subhaniabd.vercel.app is STRICTLY for the management portal / login.
 *   Root (/) bounces to /login or /admin.
 */
export const DomainRoleRouter = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hostname = window.location.hostname.toLowerCase();

    // 1. If currently on the public website (subhaniabd.vercel.app)
    if (hostname === PUBLIC_DOMAIN) {
      const pathname = location.pathname.toLowerCase();
      const isAdminOrPortalPath =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/user') ||
        pathname === '/login' ||
        pathname === '/login/';

      if (isAdminOrPortalPath) {
        // Redirect seamlessly to the dedicated portal domain preserving path, query and hash
        const targetUrl = `https://${PORTAL_DOMAIN}${location.pathname}${location.search}${location.hash}`;
        window.location.replace(targetUrl);
      }
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default DomainRoleRouter;
