import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PUBLIC_DOMAIN = 'subhaniabd.vercel.app';

/**
 * Enforces strict stealth security:
 * - On subhaniabd.vercel.app: Any attempt to access /admin, /user, /login
 *   immediately bounces back to the public Home page (/).
 *   It NEVER redirects to portal-subhaniabd.vercel.app, keeping the portal domain completely hidden!
 */
export const DomainRoleRouter = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hostname = window.location.hostname.toLowerCase();

    // If currently on the public website (subhaniabd.vercel.app)
    if (hostname === PUBLIC_DOMAIN) {
      const pathname = location.pathname.toLowerCase();
      const isAdminOrPortalPath =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/user') ||
        pathname === '/login' ||
        pathname === '/login/';

      if (isAdminOrPortalPath) {
        // Immediately bounce back to public home page (/) on the same domain
        navigate('/', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return null;
};

export default DomainRoleRouter;
