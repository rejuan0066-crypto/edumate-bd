import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSessionTimeoutSettings } from '@/hooks/useSessionTimeoutSettings';
import { toast } from 'sonner';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const LAST_ACTIVE_KEY = 'edumate_session_last_active_time';
const BG_SINCE_KEY = 'edumate_session_bg_since';

export const SessionTimeoutManager: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const { settings } = useSessionTimeoutSettings();

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const lastActivityReported = useRef<number>(Date.now());
  const isLoggingOut = useRef<boolean>(false);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const backgroundMinutes = isAdmin
    ? settings.admin_background_minutes
    : settings.staff_background_minutes;
  const idleMinutes = isAdmin
    ? settings.admin_idle_minutes
    : settings.staff_idle_minutes;

  const handleLogout = useCallback(
    async (reason: 'background' | 'idle' | 'manual') => {
      if (isLoggingOut.current) return;
      isLoggingOut.current = true;
      setShowWarning(false);

      try {
        localStorage.removeItem(LAST_ACTIVE_KEY);
        localStorage.removeItem(BG_SINCE_KEY);
      } catch {
        // ignore
      }

      const message =
        reason === 'background'
          ? 'নিরাপত্তার স্বার্থে দীর্ঘক্ষণ ব্যাকগ্রাউন্ডে থাকায় আপনাকে লগআউট করা হয়েছে।'
          : reason === 'idle'
          ? 'নিরাপত্তার স্বার্থে দীর্ঘক্ষণ নিষ্ক্রিয় থাকায় আপনাকে লগআউট করা হয়েছে।'
          : 'সেশন সমাপ্ত হয়েছে।';

      try {
        await signOut();
      } catch (e) {
        console.warn('Sign out error on session timeout:', e);
      } finally {
        toast.info(message, {
          duration: 6000,
          icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
        });
        isLoggingOut.current = false;
      }
    },
    [signOut]
  );

  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle writing to localStorage to once every 2 seconds
    if (now - lastActivityReported.current > 2000) {
      lastActivityReported.current = now;
      try {
        localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      } catch {}
    }
  }, []);

  const keepAlive = useCallback(() => {
    const now = Date.now();
    lastActivityReported.current = now;
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      localStorage.removeItem(BG_SINCE_KEY);
    } catch {}
    setShowWarning(false);
    toast.success('আপনার সেশন বজায় রাখা হয়েছে', { duration: 2500 });
  }, []);

  // Initialize active timestamp on mount or when user changes
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    const now = Date.now();
    lastActivityReported.current = now;
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      if (document.visibilityState === 'hidden') {
        localStorage.setItem(BG_SINCE_KEY, String(now));
      } else {
        localStorage.removeItem(BG_SINCE_KEY);
      }
    } catch {}
  }, [user]);

  // Activity listeners (mouse, touch, keydown, scroll)
  useEffect(() => {
    if (!user || !settings.enabled) return;

    const onUserInteraction = () => {
      recordActivity();
    };

    window.addEventListener('mousemove', onUserInteraction, { passive: true });
    window.addEventListener('mousedown', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('scroll', onUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onUserInteraction);
      window.removeEventListener('mousedown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('scroll', onUserInteraction);
    };
  }, [user, settings.enabled, recordActivity]);

  // Visibility and background tracking
  useEffect(() => {
    if (!user || !settings.enabled) return;

    const checkBackgroundTimeout = () => {
      if (backgroundMinutes <= 0) return false;
      try {
        const rawBg = localStorage.getItem(BG_SINCE_KEY);
        if (rawBg) {
          const bgSince = parseInt(rawBg, 10);
          if (Number.isFinite(bgSince)) {
            const elapsed = Date.now() - bgSince;
            if (elapsed >= backgroundMinutes * 60 * 1000) {
              handleLogout('background');
              return true;
            }
          }
        }
      } catch {}
      return false;
    };

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        try {
          localStorage.setItem(BG_SINCE_KEY, String(now));
        } catch {}
      } else {
        // Just returned to the foreground
        const timedOut = checkBackgroundTimeout();
        if (!timedOut) {
          try {
            localStorage.removeItem(BG_SINCE_KEY);
            localStorage.setItem(LAST_ACTIVE_KEY, String(now));
          } catch {}
          lastActivityReported.current = now;
        }
      }
    };

    const handleWindowFocus = () => {
      if (document.visibilityState === 'visible') {
        const timedOut = checkBackgroundTimeout();
        if (!timedOut) {
          try {
            localStorage.removeItem(BG_SINCE_KEY);
            localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
          } catch {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [user, settings.enabled, backgroundMinutes, handleLogout]);

  // Periodic interval loop for checking background & idle limits
  useEffect(() => {
    if (!user || !settings.enabled) return;
    if (backgroundMinutes <= 0 && idleMinutes <= 0) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Check background expiration if hidden
      if (document.visibilityState === 'hidden' && backgroundMinutes > 0) {
        try {
          const rawBg = localStorage.getItem(BG_SINCE_KEY);
          if (rawBg) {
            const bgSince = parseInt(rawBg, 10);
            if (Number.isFinite(bgSince) && now - bgSince >= backgroundMinutes * 60 * 1000) {
              handleLogout('background');
              return;
            }
          }
        } catch {}
        return;
      }

      // Check idle expiration if visible
      if (document.visibilityState === 'visible' && idleMinutes > 0) {
        try {
          const rawLast = localStorage.getItem(LAST_ACTIVE_KEY);
          const lastActive = rawLast ? parseInt(rawLast, 10) : now;
          const idleElapsed = now - lastActive;
          const idleLimit = idleMinutes * 60 * 1000;
          const warningLimit = settings.show_warning_dialog
            ? Math.max(0, idleLimit - settings.warning_countdown_seconds * 1000)
            : idleLimit;

          if (idleElapsed >= idleLimit) {
            handleLogout('idle');
          } else if (settings.show_warning_dialog && idleElapsed >= warningLimit) {
            const secondsLeft = Math.max(1, Math.ceil((idleLimit - idleElapsed) / 1000));
            setCountdown(secondsLeft);
            setShowWarning(true);
          } else {
            setShowWarning((prev) => (prev ? false : prev));
          }
        } catch {}
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    user,
    settings.enabled,
    backgroundMinutes,
    idleMinutes,
    settings.show_warning_dialog,
    settings.warning_countdown_seconds,
    handleLogout,
  ]);

  if (!user || !settings.enabled || !showWarning) {
    return null;
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent className="max-w-md border-amber-500/30 bg-card p-6 shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
            <Clock className="h-7 w-7 animate-pulse text-amber-600" />
          </div>
          <AlertDialogTitle className="text-center text-xl font-bold text-foreground">
            সেশন টাইমআউট সতর্কতা
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed text-muted-foreground">
            আপনি কিছু সময় ধরে নিষ্ক্রিয় রয়েছেন। সাইটের নিরাপত্তার স্বার্থে আর{' '}
            <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 font-bold text-amber-700 dark:text-amber-400">
              {countdown} সেকেন্ডের
            </span>{' '}
            মধ্যে আপনাকে স্বয়ংক্রিয়ভাবে লগআউট করা হবে।
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={() => handleLogout('manual')}
            className="w-full sm:w-auto border-destructive/20 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-1.5 h-4 w-4" /> এখনই লগআউট
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={keepAlive}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            লগইন বজায় রাখুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionTimeoutManager;
