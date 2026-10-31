import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPwaPrintAdapter } from "./lib/pwaPrintAdapter";

// Handle Vite preload errors cleanly without unprompted page reloads
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[vite] Preload error intercepted:', event);
});

// Patch window.open / blob downloads so receipts, salary slips, certificates,
// reports etc. work inside installed PWAs (Android Chrome standalone + iOS A2HS)
// where popups and printing are otherwise blocked.
installPwaPrintAdapter();

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker — required for PWA install on Android Chrome
// Skip in iframe/preview to avoid stale cache issues in Lovable editor
(function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  // Skip inside iframes (Lovable preview)
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }

  // Skip on Lovable preview hosts
  const host = window.location.hostname;
  if (host.includes('id-preview--') || host.includes('lovableproject.com')) {
    // Unregister any existing SW in preview to prevent staleness
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        // Trigger immediate check for new worker version
        try { reg.update(); } catch {}

        // Register one-shot Background Sync for next online opportunity
        try {
          // @ts-ignore — sync is not in lib.dom.d.ts
          await reg.sync?.register('refresh-shell');
        } catch {}

        // Register Periodic Background Sync (Chrome/Android, requires permission)
        try {
          // @ts-ignore — periodicSync is experimental
          const periodic = reg.periodicSync;
          if (periodic && 'permissions' in navigator) {
            const status = await navigator.permissions.query({
              // @ts-ignore — periodic-background-sync is experimental
              name: 'periodic-background-sync',
            });
            if (status.state === 'granted') {
              await periodic.register('refresh-shell', {
                minInterval: 6 * 60 * 60 * 1000, // 6 hours
              });
            }
          }
        } catch {}

        // Foreground fallback: nudge SW to refresh shell after each load
        try {
          const ctrl = navigator.serviceWorker.controller;
          if (ctrl) ctrl.postMessage({ type: 'REFRESH_SHELL' });
        } catch {}
      })
      .catch(() => {
        // Silent fail — PWA install just won't be available
      });
  });
})();
