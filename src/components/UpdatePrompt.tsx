import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BUILD_ID_KEY = 'app_build_id';
const CHECK_INTERVAL = 60_000; // 1 minute
const LOG_KEY = 'pwa_update_logs';
const LOG_MAX = 200;

type LogLevel = 'info' | 'warn' | 'error';
const pwaLog = (level: LogLevel, event: string, data?: Record<string, unknown>) => {
  try {
    const entry = {
      t: new Date().toISOString(),
      lvl: level,
      ev: event,
      ...(data || {}),
    };
    const raw = localStorage.getItem(LOG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    if (arr.length > LOG_MAX) arr.splice(0, arr.length - LOG_MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(arr));
    // eslint-disable-next-line no-console
    console.log('[pwa-update]', event, data || '');
  } catch {}
};

const describeReg = (r: ServiceWorkerRegistration) => ({
  scope: r.scope,
  installing: r.installing?.state ?? null,
  waiting: r.waiting?.state ?? null,
  active: r.active?.state ?? null,
});

const buildSignature = (assets: string[]): string | null => {
  const matches = assets
    .map((asset) => asset.replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, ''))
    .filter((asset) => /\/assets\/|^assets\//.test(asset) && /\.(js|css)$/.test(asset));
  if (matches.length === 0) return null;
  // Sort + dedupe so order changes don't trigger false positives
  const sig = Array.from(new Set(matches)).sort().join('|');
  // Compact hash (djb2)
  let h = 5381;
  for (let i = 0; i < sig.length; i++) h = ((h << 5) + h + sig.charCodeAt(i)) | 0;
  return 'b' + (h >>> 0).toString(36);
};

// Build a stable signature from ALL current hashed JS/CSS assets.
// The runtime signature is the source of truth, because localStorage may have
// been advanced by a failed update attempt on an installed PWA.
const extractBuildId = (html: string): string | null => {
  const matches = html.match(/(?:\/)?assets\/[^"'?\s<>]+\.(?:js|css)/g);
  return matches ? buildSignature(matches) : null;
};

const getRuntimeBuildId = (): string | null => {
  const assets = Array.from(
    document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src*="/assets/"],link[href*="/assets/"]')
  )
    .map((node) => node instanceof HTMLScriptElement ? node.src : node.href)
    .filter(Boolean);
  return buildSignature(assets);
};

const isStandalonePWA = () => {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  } catch {
    return false;
  }
};

const UpdatePrompt = () => {
  // Update popup disabled - ?????? ???? ?????? ??? ???? ???? ??? ??????
  return null;

  // @ts-expect-error unreachable
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [standalone, setStandalone] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(false);
  const [noUpdateMsg, setNoUpdateMsg] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const runtimeBuildIdRef = useRef<string | null>(null);

  const checkForUpdate = async (manual = false): Promise<boolean> => {
    if (manual) {
      setChecking(true);
      setNoUpdateMsg(false);
    }
    try {
      const res = await fetch(`/index.html?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return false;
      const html = await res.text();
      const newBuildId = extractBuildId(html);
      if (!newBuildId) return false;
      const currentBuildId = runtimeBuildIdRef.current || getRuntimeBuildId() || localStorage.getItem(BUILD_ID_KEY);
      if (currentBuildId) runtimeBuildIdRef.current = currentBuildId;
      // First-ever load: seed the build id so the next deploy is detectable.
      if (!currentBuildId) {
        localStorage.setItem(BUILD_ID_KEY, newBuildId);
        runtimeBuildIdRef.current = newBuildId;
        return false;
      }
      if (newBuildId !== currentBuildId) {
        setUpdateAvailable(true);
        setDismissed(false);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      if (manual) setChecking(false);
    }
  };

  useEffect(() => {
    const runtimeBuildId = getRuntimeBuildId();
    if (runtimeBuildId) {
      runtimeBuildIdRef.current = runtimeBuildId;
      try { localStorage.setItem(BUILD_ID_KEY, runtimeBuildId); } catch {}
    }

    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    setStandalone(isStandalonePWA());

    const host = window.location.hostname;
    if (host.includes('id-preview--') || host.includes('lovableproject.com') || host === 'localhost') return;
    setEnabled(true);

    // Log page load — useful to confirm a previous update reload succeeded
    pwaLog('info', 'page_loaded', {
      url: window.location.href,
      build_id: runtimeBuildId,
      standalone: isStandalonePWA(),
      had_v_param: new URL(window.location.href).searchParams.has('_v'),
    });

    const initialTimer = window.setTimeout(() => checkForUpdate(), 5000);
    intervalRef.current = window.setInterval(() => checkForUpdate(), CHECK_INTERVAL);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(initialTimer);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleManualCheck = async () => {
    const found = await checkForUpdate(true);
    if (!found) {
      setNoUpdateMsg(true);
      setTimeout(() => setNoUpdateMsg(false), 2500);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setProgress(15);
    setStatusText(bn ? 'আপডেট প্রস্তুত হচ্ছে…' : 'Preparing update…');
    pwaLog('info', 'update_start', {
      url: window.location.href,
      standalone: isStandalonePWA(),
      build_id: runtimeBuildIdRef.current || localStorage.getItem(BUILD_ID_KEY),
      ua: navigator.userAgent,
    });

    // Guarantee the "updating" progress UI is visible for a moment before the
    // page navigates away — otherwise a fast SW takeover reloads instantly and
    // the user never sees any feedback.
    const startedAt = Date.now();
    const MIN_VISIBLE_MS = 1600;

    let didReload = false;
    const reloadOnce = async (reason: string) => {
      if (didReload) return;
      didReload = true;
      pwaLog('info', 'update_reload', { reason });
      // Clear any caches so the fresh HTML + new hashed chunks are fetched from
      // the network instead of being served stale (the main cause of "Update
      // does nothing" — reload re-serving the cached old build).
      setProgress(80);
      setStatusText(bn ? 'পুরোনো ক্যাশ মুছে ফেলা হচ্ছে…' : 'Clearing old cache…');
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          pwaLog('info', 'caches_cleared', { count: keys.length });
        }
      } catch (e) {
        pwaLog('warn', 'cache_clear_fail', { err: String(e) });
      }
      setProgress(100);
      setStatusText(bn ? 'নতুন ভার্সন লোড হচ্ছে…' : 'Loading new version…');
      // Hold the completed progress bar on screen briefly so the user actually
      // sees the update finish before the reload happens.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_VISIBLE_MS) {
        await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));
      }
      try {
        // Cache-busting navigation guarantees a fresh document, even on browsers
        // that would otherwise reload from the memory/HTTP cache.
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now().toString(36));
        window.location.replace(url.toString());
      } catch {
        try { window.location.reload(); } catch { /* no-op */ }
      }
    };


    setProgress(45);
    setStatusText(bn ? 'সার্ভিস ওয়ার্কার আপডেট হচ্ছে…' : 'Updating service worker…');

    try {
      if ('serviceWorker' in navigator) {
        // Reload exactly once when the new worker takes control.
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => reloadOnce('controllerchange'),
          { once: true }
        );

        const regs = await navigator.serviceWorker.getRegistrations();
        pwaLog('info', 'sw_registrations', { count: regs.length, regs: regs.map(describeReg) });
        setProgress(60);
        setStatusText(bn ? 'নতুন ভার্সন আনা হচ্ছে…' : 'Fetching new version…');
        await Promise.all(
          regs.map(async (r) => {
            try {
              await r.update();
              pwaLog('info', 'sw_update_done', describeReg(r));
            } catch (e) {
              pwaLog('warn', 'sw_update_fail', { err: String(e) });
            }
            const waiting = r.waiting || r.installing;
            if (waiting) {
              try {
                waiting.postMessage({ type: 'SKIP_WAITING' });
                pwaLog('info', 'skip_waiting_sent', { state: waiting.state });
              } catch (e) {
                pwaLog('warn', 'skip_waiting_fail', { err: String(e) });
              }
            } else {
              pwaLog('info', 'no_waiting_worker');
            }
          })
        );
        setProgress(70);
        setStatusText(bn ? 'নতুন ভার্সন সক্রিয় হচ্ছে…' : 'Activating new version…');
      } else {
        pwaLog('info', 'sw_unsupported');
      }
    } catch (e) {
      pwaLog('error', 'sw_phase_fail', { err: String(e) });
    }

    // Fallback single reload if no waiting worker existed (already up to date SW,
    // or controllerchange never fires). Network-first navigation guarantees the
    // fresh shell loads — no cache busting needed.
    setTimeout(() => reloadOnce('fallback'), 1200);
  };



  // Floating update button: ALWAYS clickable in the installed PWA.
  // - If we already know an update is available → install immediately.
  // - Otherwise → run a fresh check, and install if found, else show "up to date".
  // Always show the floating refresh button in the installed PWA so the user can
  // manually check/install updates anytime. Hide it only while the main update
  // banner is visible (update available + not dismissed) or during an update.
  const showFloatingButton = enabled && standalone && !updating && !(updateAvailable && !dismissed);

  const handleFloatingClick = async () => {
    if (updateAvailable) {
      setDismissed(false);
      handleUpdate();
      return;
    }
    const found = await checkForUpdate(true);
    if (found) {
      setDismissed(false);
      handleUpdate();
    } else {
      setNoUpdateMsg(true);
      setTimeout(() => setNoUpdateMsg(false), 2500);
    }
  };

  return (
    <>
      {showFloatingButton && (
        <button
          onClick={handleFloatingClick}
          disabled={checking}
          aria-label={bn
            ? (updateAvailable ? 'আপডেট ইনস্টল করুন' : 'আপডেট চেক করুন')
            : (updateAvailable ? 'Install update' : 'Check for update')}
          title={bn
            ? (updateAvailable ? 'নতুন আপডেট পাওয়া গেছে — ক্লিক করে ইনস্টল করুন' : 'আপডেটের জন্য চেক করুন')
            : (updateAvailable ? 'Update available — click to install' : 'Check for update')}
          className={`group fixed right-4 z-[90] w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 active:scale-95 ${
            updateAvailable
              ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/40 shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.6)] hover:shadow-[0_10px_34px_-4px_hsl(var(--primary)/0.7)] hover:-translate-y-0.5'
              : 'bg-card/80 text-primary border-border/60 shadow-[0_6px_22px_-8px_rgba(0,0,0,0.35)] backdrop-blur-2xl hover:bg-card hover:-translate-y-0.5'
          }`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}
        >
          {updateAvailable && (
            <span className="absolute inset-0 rounded-2xl bg-primary/40 animate-ping opacity-60" />
          )}
          <RefreshCw className={`relative w-5 h-5 transition-transform duration-500 ${checking ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          {noUpdateMsg && (
            <span className="absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-card/95 backdrop-blur-xl border border-border/60 text-foreground text-xs font-medium rounded-full px-3.5 py-1.5 shadow-lg animate-fade-in">
              {bn ? 'সর্বশেষ ভার্সন চলছে' : 'Up to date'}
            </span>
          )}
        </button>
      )}

      {standalone && updateAvailable && !dismissed && (
        <div
          className="fixed left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-xs z-[100] animate-fade-in"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', maxWidth: 'calc(100vw - 24px)' }}
        >
          <div className="relative bg-card/85 border border-border/60 rounded-2xl shadow-[0_16px_44px_-16px_rgba(0,0,0,0.45)] p-3 backdrop-blur-2xl overflow-hidden">
            {/* Decorative gradient glow */}
            <div className="pointer-events-none absolute -top-12 -right-8 w-28 h-28 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className={`w-4 h-4 text-primary ${updating ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-foreground leading-tight truncate">
                  {updating
                    ? (bn ? 'আপডেট হচ্ছে…' : 'Updating…')
                    : (bn ? 'নতুন আপডেট পাওয়া গেছে' : 'New update available')}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {updating
                    ? statusText
                    : (bn ? 'নতুন ভার্সন প্রস্তুত' : 'A new version is ready')}
                </p>
              </div>
              {!updating ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    className="h-7 rounded-full px-3 text-xs shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.6)]"
                  >
                    {bn ? 'আপডেট' : 'Update'}
                  </Button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-primary tabular-nums w-9 text-right">
                  {progress}%
                </span>
              )}
            </div>
            {updating && (
              <div className="relative mt-2.5 h-1.5 w-full rounded-full bg-muted/70 overflow-hidden">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/60 transition-all duration-300 ease-out shadow-[0_0_12px_hsl(var(--primary)/0.5)] overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Moving shimmer so it always looks actively working */}
                  <span className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.2s_infinite]" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UpdatePrompt;
