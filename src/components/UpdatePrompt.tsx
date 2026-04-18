import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BUILD_ID_KEY = 'app_build_id';
const CHECK_INTERVAL = 60_000; // 1 minute

const extractBuildId = (html: string): string | null => {
  const match = html.match(/assets\/[^"']+-([a-zA-Z0-9_]+)\.js/);
  return match ? match[1] : null;
};

const UpdatePrompt = () => {
  const { language } = useLanguage();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip on Lovable preview/iframe
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    const host = window.location.hostname;
    if (host.includes('id-preview--') || host.includes('lovableproject.com') || host === 'localhost') return;

    const checkForUpdate = async () => {
      try {
        const res = await fetch(`/index.html?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const html = await res.text();
        const newBuildId = extractBuildId(html);
        if (!newBuildId) return;
        const currentBuildId = localStorage.getItem(BUILD_ID_KEY);
        if (currentBuildId && newBuildId !== currentBuildId) {
          setUpdateAvailable(true);
        }
      } catch {
        // silent
      }
    };

    // Initial check after 5s, then every minute
    const initialTimer = window.setTimeout(checkForUpdate, 5000);
    intervalRef.current = window.setInterval(checkForUpdate, CHECK_INTERVAL);

    // Check when tab regains focus
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

  const handleUpdate = async () => {
    try {
      // Clear caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // Unregister and re-register service worker
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }
    } catch {
      // ignore
    }
    // Hard reload
    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in px-4 w-full max-w-md">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3 backdrop-blur-xl">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">
            {language === 'bn' ? 'নতুন আপডেট পাওয়া গেছে' : 'New update available'}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' ? 'অ্যাপের নতুন ভার্সন প্রস্তুত' : 'A new version of the app is ready'}
          </p>
        </div>
        <Button size="sm" onClick={handleUpdate} className="rounded-full">
          {language === 'bn' ? 'আপডেট' : 'Update'}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;
