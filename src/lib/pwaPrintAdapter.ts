/**
 * PWA Print/Download Adapter
 *
 * In installed PWA mode (Android Chrome standalone, iOS Safari home-screen app),
 * `window.open('', '_blank')` returns null or a useless window — there is no
 * browser chrome, no print dialog, and no way to display generated HTML.
 *
 * This adapter monkey-patches `window.open` so that:
 *   1. `window.open('', '_blank', ...)` (used to write print HTML) returns a
 *      proxy window backed by a hidden full-screen iframe inside the current
 *      document. The page's existing `document.open/write/close` and
 *      `window.print()` calls flow through to the iframe instead.
 *   2. `window.open(blobUrl, '_blank')` for PDFs/blobs triggers a download via
 *      a temporary `<a download>` link so the file actually lands in the
 *      user's downloads folder on mobile PWAs.
 *   3. `window.open(httpUrl, '_blank')` falls back to same-window navigation
 *      (location.href) so users aren't left staring at nothing.
 *
 * In normal browser tabs everything is left untouched.
 */

const DEBUG = false;

function isStandalonePWA(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if ((window.navigator as any).standalone === true) return true; // iOS
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return true;
    if (window.matchMedia?.('(display-mode: minimal-ui)').matches) return true;
    return false;
  } catch {
    return false;
  }
}

function isMobile(): boolean {
  try {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

function buildPrintFrame(): {
  doc: Document;
  win: Window;
  cleanup: () => void;
  proxyWindow: any;
} {
  // Outer overlay that contains a close bar + the iframe
  const overlay = document.createElement('div');
  overlay.setAttribute('data-pwa-print-overlay', 'true');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'background:#000',
    'display:flex',
    'flex-direction:column',
  ].join(';');

  const bar = document.createElement('div');
  bar.style.cssText = [
    'flex:0 0 auto',
    'display:flex',
    'gap:8px',
    'align-items:center',
    'justify-content:flex-end',
    'padding:8px 12px',
    'background:#0f172a',
    'color:#fff',
    'font:600 14px system-ui,-apple-system,Segoe UI,Roboto',
    'padding-top:max(8px,env(safe-area-inset-top))',
  ].join(';');

  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.textContent = '🖨 প্রিন্ট / Print';
  printBtn.style.cssText =
    'background:#10b981;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:600 14px system-ui;cursor:pointer';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕ বন্ধ / Close';
  closeBtn.style.cssText =
    'background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:600 14px system-ui;cursor:pointer';

  bar.appendChild(printBtn);
  bar.appendChild(closeBtn);
  overlay.appendChild(bar);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-pwa-print-frame', 'true');
  iframe.style.cssText = 'flex:1 1 auto;width:100%;height:100%;border:0;background:#fff';
  overlay.appendChild(iframe);

  document.body.appendChild(overlay);

  const cleanup = () => {
    try {
      overlay.remove();
    } catch {
    }
  };
  closeBtn.onclick = cleanup;

  const ifrWin = iframe.contentWindow!;
  const ifrDoc = iframe.contentDocument || ifrWin.document;

  printBtn.onclick = () => {
    try {
      ifrWin.focus();
      ifrWin.print();
    } catch (e) {
      if (DEBUG) console.error('[pwa-print] manual print failed', e);
    }
  };

  // Patch the iframe's window.print to also focus first (Android Chrome quirk).
  try {
    const origPrint = ifrWin.print.bind(ifrWin);
    (ifrWin as any).print = () => {
      try {
        ifrWin.focus();
      } catch {
      }
      try {
        origPrint();
      } catch (e) {
        if (DEBUG) console.error('[pwa-print] auto print failed', e);
      }
    };
  } catch {
  }

  // Build a proxy that quacks like a Window so existing code keeps working:
  //   const w = window.open('', '_blank');
  //   w.document.write(html); w.document.close();
  //   w.focus(); w.print();
  const proxy: any = {
    document: ifrDoc,
    focus: () => {
      try {
        ifrWin.focus();
      } catch {
      }
    },
    print: () => {
      try {
        ifrWin.focus();
      } catch {
      }
      try {
        ifrWin.print();
      } catch {
      }
    },
    close: cleanup,
    closed: false,
    location: ifrWin.location,
    addEventListener: ifrWin.addEventListener.bind(ifrWin),
    removeEventListener: ifrWin.removeEventListener.bind(ifrWin),
    onload: null as any,
    // expose underlying iframe window for advanced callers
    __frame: ifrWin,
  };

  return { doc: ifrDoc, win: ifrWin, cleanup, proxyWindow: proxy };
}

function triggerDownload(url: string, filename?: string) {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || '';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  } catch {
    // last resort
    try {
      window.location.href = url;
    } catch {
    }
  }
}

export function installPwaPrintAdapter() {
  if (typeof window === 'undefined') return;
  if ((window as any).__pwaPrintAdapterInstalled) return;

  const shouldPatch = isStandalonePWA() || isMobile();
  if (!shouldPatch) return;

  (window as any).__pwaPrintAdapterInstalled = true;

  const origOpen = window.open.bind(window);

  (window as any).open = function patchedOpen(
    url?: string | URL,
    target?: string,
    features?: string,
  ): Window | null {
    try {
      const u = url == null ? '' : String(url);

      // Case 1: empty URL → caller wants to write HTML and print.
      if (!u || u === 'about:blank') {
        const { proxyWindow } = buildPrintFrame();
        return proxyWindow as unknown as Window;
      }

      // Case 2: blob: or data: URL → trigger download instead of opening tab.
      if (u.startsWith('blob:') || u.startsWith('data:')) {
        triggerDownload(u);
        return null;
      }

      // Case 3: same-origin print routes that pop a print dialog → use frame.
      // (none right now, but keep hook for future)

      // Case 4: regular http(s) URL.
      // In standalone PWA, _blank does nothing on iOS. Prefer same-window nav
      // unless caller explicitly passed noopener (treat as external link).
      if (isStandalonePWA() && (target === '_blank' || !target)) {
        try {
          // Try real open first — works on Android Chrome PWA via custom tab.
          const w = origOpen(u, target, features);
          if (w) return w;
        } catch {
        }
        // Fallback: navigate the current window.
        window.location.href = u;
        return null;
      }

      return origOpen(u, target, features);
    } catch (e) {
      if (DEBUG) console.error('[pwa-print] open() failed', e);
      try {
        return origOpen(url as any, target as any, features);
      } catch {
        return null;
      }
    }
  };

  if (DEBUG) console.log('[pwa-print] adapter installed');
}
