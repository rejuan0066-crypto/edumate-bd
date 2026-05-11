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
    setProgress(5);
    setStatusText(bn ? 'ক্যাশ পরিষ্কার করা হচ্ছে…' : 'Clearing cache…');

    // 1) Clear window-side Cache Storage
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        let done = 0;
        for (const k of keys) {
          await caches.delete(k);
          done++;
          setProgress(5 + Math.round((done / Math.max(keys.length, 1)) * 35));
        }
      }
    } catch {}

    setProgress(45);
    setStatusText(bn ? 'সার্ভিস ওয়ার্কার আপডেট হচ্ছে…' : 'Updating service worker…');

    // 2) Tell SW to clear its caches too (covers mobile where window+SW caches differ)
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          const ch = new MessageChannel();
          const t = setTimeout(() => resolve(), 1500);
          ch.port1.onmessage = () => { clearTimeout(t); resolve(); };
          navigator.serviceWorker.controller!.postMessage({ type: 'CLEAR_CACHES' }, [ch.port2]);
        });
      }
    } catch {}

    setProgress(65);

    // 3) Force SW update + activate any waiting worker
    let didReloadViaController = false;
    try {
      if ('serviceWorker' in navigator) {
        // One-shot reload when the new SW takes control (mobile-safe path)
        const onControllerChange = () => {
          if (didReloadViaController) return;
          didReloadViaController = true;
          try {
            const u = new URL(window.location.href);
            u.searchParams.set('_v', Date.now().toString());
            window.location.replace(u.toString());
          } catch {
            window.location.reload();
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, { once: true });

        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(async (r) => {
          try { await r.update(); } catch {}
          const waiting = r.waiting || r.installing;
          if (waiting) {
            try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
          }
        }));
      }
    } catch {}

    setProgress(90);
    setStatusText(bn ? 'রিলোড হচ্ছে…' : 'Reloading…');
    setProgress(100);

    // 4) Fallback hard reload — shorter timeout so it always fires reliably,
    //    even when controllerchange never triggers (no waiting SW, identical SW build,
    //    iOS PWA quirks, etc.). The cache-busted URL forces a fresh shell fetch.
    const doReload = () => {
      if (didReloadViaController) return;
      didReloadViaController = true;
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('_v', Date.now().toString());
        // Clear stored build id so the new shell re-seeds it
        try { localStorage.removeItem(BUILD_ID_KEY); } catch {}
        window.location.replace(u.toString());
      } catch {
        window.location.reload();
      }
    };
    setTimeout(doReload, 600);
    // Safety net in case the first reload was suppressed by the browser
    setTimeout(() => { try { window.location.reload(); } catch {} }, 2500);
  };

  // Floating update button: ALWAYS clickable in the installed PWA.
  // - If we already know an update is available → install immediately.
  // - Otherwise → run a fresh check, and install if found, else show "up to date".
  // Only show the floating refresh button when an update is actually available
  // AND the user has dismissed the main banner. Otherwise keep the UI clean.
  const showFloatingButton = enabled && !updating && updateAvailable && dismissed;

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
          className={`fixed right-3 z-[90] w-11 h-11 rounded-full border shadow-lg backdrop-blur-xl flex items-center justify-center transition-colors ${
            updateAvailable
              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 cursor-pointer animate-pulse'
              : 'bg-card/90 text-primary border-border hover:bg-muted cursor-pointer'
          }`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <RefreshCw className={`w-5 h-5 ${checking ? 'animate-spin' : ''}`} />
          {noUpdateMsg && (
            <span className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap bg-card border border-border text-foreground text-xs rounded-full px-3 py-1 shadow-md">
              {bn ? 'সর্বশেষ ভার্সন চলছে' : 'Up to date'}
            </span>
          )}
        </button>
      )}

      {updateAvailable && !dismissed && (
        <div
          className="fixed left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md z-[100] animate-fade-in"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', maxWidth: 'calc(100vw - 24px)' }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <RefreshCw className={`w-5 h-5 text-primary ${updating ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">
                  {updating
                    ? (bn ? 'আপডেট হচ্ছে…' : 'Updating…')
                    : (bn ? 'নতুন আপডেট পাওয়া গেছে' : 'New update available')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {updating
                    ? statusText
                    : (bn ? 'অ্যাপের নতুন ভার্সন প্রস্তুত' : 'A new version of the app is ready')}
                </p>
              </div>
              {!updating ? (
                <>
                  <Button size="sm" onClick={handleUpdate} className="rounded-full">
                    {bn ? 'আপডেট' : 'Update'}
                  </Button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </>
              ) : (
                <span className="text-xs font-semibold text-primary tabular-nums w-10 text-right">
                  {progress}%
                </span>
              )}
            </div>
            {updating && (
              <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UpdatePrompt;
