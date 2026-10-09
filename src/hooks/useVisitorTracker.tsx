import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDeviceId } from '@/hooks/useDeviceRegistration';
import { parseUserAgent, detectDeviceInfo, getGeoAndIspDetails, getSilentGpsLocation, DeviceInfo, GeoInfo } from '@/lib/deviceDetector';
import { resolveVisitorIdentity, initVisitorIdentityAutoCapture } from '@/lib/visitorIdentity';
import { ShieldAlert, PhoneCall, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'lovable.visitor_session_id';

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `s-${Date.now().toString(36)}`;
  }
}

export type BlockedStatus = {
  isBlocked: boolean;
  reason?: string;
};

export function useVisitorTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const [blockedStatus, setBlockedStatus] = useState<BlockedStatus>({ isBlocked: false });
  const lastLoggedPath = useRef<string | null>(null);
  const geoRef = useRef<GeoInfo | null>(null);
  const deviceRef = useRef<DeviceInfo | null>(null);

  // Initialize auto-capture of email/phone from form inputs once
  useEffect(() => {
    initVisitorIdentityAutoCapture();
  }, []);

  // 1. Check if device is blocked via app_settings
  const checkBlock = async (deviceId: string, ip?: string) => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'blocked_device_ids')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value)) {
        const list = data.value as Array<{ device_id?: string; ip?: string; reason?: string } | string>;
        const match = list.find((item) => {
          if (typeof item === 'string') {
            return item === deviceId || (ip && item === ip);
          }
          return item.device_id === deviceId || (ip && item.ip === ip);
        });

        if (match) {
          const reason = typeof match === 'string' ? 'নিরাপত্তাজনিত কারণে এডমিন কর্তৃক সাময়িকভাবে ব্লক করা হয়েছে।' : (match.reason || 'এডমিন কর্তৃক সাময়িকভাবে ব্লক করা হয়েছে।');
          setBlockedStatus({ isBlocked: true, reason });
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    return false;
  };

  // 2. Track Route Visits
  useEffect(() => {
    let cancelled = false;
    const pathname = location.pathname;
    const deviceId = getDeviceId();
    const sessionId = getSessionId();

    // Prevent immediate duplicate log on same path
    if (lastLoggedPath.current === pathname) return;
    lastLoggedPath.current = pathname;

    const timer = setTimeout(async () => {
      try {
        // Resolve device details once (async with client hints)
        if (!deviceRef.current) {
          deviceRef.current = await detectDeviceInfo();
        }
        const dev = deviceRef.current;

        // Resolve Geo once or from cache
        if (!geoRef.current) {
          geoRef.current = await getGeoAndIspDetails();
        }
        const geo = geoRef.current;

        if (cancelled) return;

        // Check if device is blocked
        const isBlocked = await checkBlock(deviceId, geo.ip);
        if (isBlocked) return;

        // Identify visitor (logged-in, form-cached, or anonymous)
        const knownIdentity = resolveVisitorIdentity(user);
        const gps = await getSilentGpsLocation();

        const isAuth = Boolean(user?.id);
        const hasIdentified = Boolean(knownIdentity.email || knownIdentity.phone);
        const visitorType = isAuth
          ? 'authenticated_user'
          : hasIdentified
          ? 'identified_public_visitor'
          : 'public_visitor';

        // Extract title or fallback
        const pageTitle = typeof document !== 'undefined' ? document.title || pathname : pathname;

        await supabase.rpc('log_security_event', {
          p_event_type: 'page_visit',
          p_resource: pathname,
          p_ip: geo.ip || '0.0.0.0',
          p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          p_status: 200,
          p_reason: visitorType,
          p_metadata: {
            device_id: deviceId,
            session_id: sessionId,
            device_model: dev.device_model,
            brand: dev.brand,
            os: dev.os,
            browser: dev.browser,
            device_type: dev.device_type,
            network_type: dev.network_type,
            country: geo.country,
            region: geo.region,
            city: geo.city,
            upazila: geo.upazila,
            isp: geo.isp,
            latitude: gps?.latitude ?? geo.latitude,
            longitude: gps?.longitude ?? geo.longitude,
            gps_verified: Boolean(gps),
            is_vpn: geo.is_vpn || false,
            is_proxy: geo.is_proxy || false,
            is_datacenter: geo.is_datacenter || false,
            vpn_note: geo.vpn_note || null,
            vpn_gateway_location: geo.vpn_gateway_location || null,
            display_location: geo.display_location,
            location_accuracy: gps ? 'gps_exact' : geo.location_accuracy,
            page_title: pageTitle,
            visitor_type: visitorType,
            user_id: user?.id || null,
            user_email: user?.email || knownIdentity.email || null,
            user_name: user?.user_metadata?.full_name || knownIdentity.name || null,
            user_phone: knownIdentity.phone || null,
            identity_source: knownIdentity.source || (isAuth ? 'auth' : null),
            source_label: knownIdentity.source_label || (isAuth ? 'লগইন একাউন্ট' : null),
            is_live: true,
            last_ping: new Date().toISOString(),
          },
        });
      } catch {
        /* Non-fatal: visitor tracking never crashes app */
      }
    }, 600); // 600ms debounce

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location.pathname, user?.id]);

  // 3. Heartbeat every 50 seconds for live visitors presence
  useEffect(() => {
    const deviceId = getDeviceId();
    const sessionId = getSessionId();

    const interval = setInterval(async () => {
      // Only ping if tab is active/visible
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const geo = geoRef.current || await getGeoAndIspDetails();
        const dev = deviceRef.current || parseUserAgent();

        // Check block during heartbeat
        const isBlocked = await checkBlock(deviceId, geo.ip);
        if (isBlocked) return;

        const knownIdentity = resolveVisitorIdentity(user);
        const isAuth = Boolean(user?.id);
        const hasIdentified = Boolean(knownIdentity.email || knownIdentity.phone);
        const visitorType = isAuth
          ? 'authenticated_user'
          : hasIdentified
          ? 'identified_public_visitor'
          : 'public_visitor';

        await supabase.rpc('log_security_event', {
          p_event_type: 'live_ping',
          p_resource: location.pathname,
          p_ip: geo.ip || '0.0.0.0',
          p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          p_status: 200,
          p_reason: 'live_heartbeat',
          p_metadata: {
            device_id: deviceId,
            session_id: sessionId,
            device_model: dev.device_model,
            brand: dev.brand,
            os: dev.os,
            browser: dev.browser,
            network_type: dev.network_type,
            country: geo.country,
            region: geo.region,
            city: geo.city,
            isp: geo.isp,
            is_vpn: geo.is_vpn || false,
            is_proxy: geo.is_proxy || false,
            is_datacenter: geo.is_datacenter || false,
            vpn_note: geo.vpn_note || null,
            vpn_gateway_location: geo.vpn_gateway_location || null,
            display_location: geo.display_location,
            user_id: user?.id || null,
            user_email: user?.email || knownIdentity.email || null,
            user_name: user?.user_metadata?.full_name || knownIdentity.name || null,
            user_phone: knownIdentity.phone || null,
            identity_source: knownIdentity.source || (isAuth ? 'auth' : null),
            source_label: knownIdentity.source_label || (isAuth ? 'লগইন একাউন্ট' : null),
            visitor_type: visitorType,
            page_title: typeof document !== 'undefined' ? document.title : location.pathname,
            is_live: true,
            last_ping: new Date().toISOString(),
          },
        });
      } catch {
        /* non-fatal */
      }
    }, 50_000);

    return () => clearInterval(interval);
  }, [location.pathname, user?.id]);

  return { blockedStatus };
}

/**
 * Global component placed inside BrowserRouter to track all visitors
 * and enforce security blocks.
 */
export function VisitorTracker() {
  const { blockedStatus } = useVisitorTracker();

  if (blockedStatus.isBlocked) {
    return (
      <div className="fixed inset-0 z-[999999] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-[32px] p-6 md:p-8 shadow-2xl space-y-6">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-destructive/15 flex items-center justify-center text-destructive">
            <ShieldAlert className="h-9 w-9 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-destructive">অ্যাক্সেস স্থগিত করা হয়েছে</h2>
            <p className="text-sm text-muted-foreground font-medium">
              Access to this site has been restricted from your device / IP.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 text-xs text-left space-y-1.5 border border-border/50">
            <p className="font-semibold text-foreground">নিরাপত্তা নোটিশ:</p>
            <p className="text-muted-foreground">{blockedStatus.reason}</p>
            <p className="text-[11px] text-muted-foreground pt-1 font-mono">
              ডিভাইস আইডি: {getDeviceId().slice(0, 18)}...
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              কোনো ভুল বোঝাবুঝি হলে অনুগ্রহ করে মাদরাসা প্রশাসনিক অফিসে যোগাযোগ করুন:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
                <a href="tel:+8801700000000">
                  <PhoneCall className="h-3.5 w-3.5" />
                  +৮৮০ ১৭০০০০০০০০
                </a>
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
                <a href="mailto:support@edumatebd.com">
                  <Mail className="h-3.5 w-3.5" />
                  ইমেইল যোগাযোগ
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
