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
    'gap:10px',
    'align-items:center',
    'justify-content:space-between',
    'padding:10px 14px',
    'background:#0f172a',
    'color:#fff',
    'font:600 14px system-ui,-apple-system,Segoe UI,Roboto',
    'padding-top:max(10px,env(safe-area-inset-top))',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'প্রিন্ট প্রিভিউ';
  title.style.cssText = 'flex:1;min-width:0;color:#fff;font:600 14px system-ui;opacity:.9';

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;gap:8px;align-items:center;flex-shrink:0';

  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.textContent = '🖨 প্রিন্ট';
  printBtn.style.cssText =
    'background:#10b981;color:#fff;border:none;border-radius:10px;padding:10px 14px;font:600 14px system-ui;cursor:pointer;min-height:44px';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'বন্ধ');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText =
    'background:#ef4444;color:#fff;border:none;border-radius:10px;padding:10px 16px;font:700 18px system-ui;cursor:pointer;min-width:48px;min-height:44px;line-height:1';

  btnGroup.appendChild(printBtn);
  btnGroup.appendChild(closeBtn);
  bar.appendChild(title);
  bar.appendChild(btnGroup);
  overlay.appendChild(bar);

  // Floating close button (fallback) — bottom-right circle, always visible
  const floatingClose = document.createElement('button');
  floatingClose.type = 'button';
  floatingClose.setAttribute('aria-label', 'বন্ধ');
  floatingClose.textContent = '✕';
  floatingClose.style.cssText = [
    'position:absolute',
    'bottom:max(16px,env(safe-area-inset-bottom))',
    'right:16px',
    'z-index:1',
    'width:56px',
    'height:56px',
    'border-radius:50%',
    'background:#ef4444',
    'color:#fff',
    'border:none',
    'font:700 22px system-ui',
    'box-shadow:0 6px 18px rgba(0,0,0,0.4)',
    'cursor:pointer',
  ].join(';');
  overlay.appendChild(floatingClose);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-pwa-print-frame', 'true');
  iframe.style.cssText = 'flex:1 1 auto;width:100%;height:100%;border:0;background:#fff';
  overlay.appendChild(iframe);

  // Ensure @media print isolates the overlay and hides main app background
  const printStyle = document.createElement('style');
  printStyle.textContent = '@media print { body > *:not([data-pwa-print-overlay]) { display: none !important; } [data-pwa-print-overlay] { position: static !important; background: #fff !important; } [data-pwa-print-overlay] > div:first-child, [data-pwa-print-overlay] > button { display: none !important; } }';
  overlay.appendChild(printStyle);

  document.body.appendChild(overlay);

  // Push history state so Android back button closes the overlay.
  // Use a unique marker so we only react to OUR popstate (not unrelated ones).
  const overlayId = `pwa-print-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let historyPushed = false;
  try {
    history.pushState({ pwaPrintOverlay: true, overlayId }, '');
    historyPushed = true;
  } catch {}

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try { overlay.remove(); } catch {}
    try { document.removeEventListener('keydown', escHandler); } catch {}
    try { window.removeEventListener('popstate', popHandler); } catch {}
    try { window.removeEventListener('pagehide', pageHideHandler); } catch {}
    // If our history entry is still on the stack, pop it so the URL stays clean.
    if (historyPushed) {
      try {
        const st: any = history.state;
        if (st && st.pwaPrintOverlay && st.overlayId === overlayId) {
          history.back();
        }
      } catch {}
    }
  };
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanup();
  };
  // Only close when OUR pushed state is popped (Android back button).
  // Ignore unrelated popstates (e.g. from print dialog or other code).
  const popHandler = (e: PopStateEvent) => {
    const st: any = e.state;
    // After popping our entry, current state will NOT have our overlayId.
    if (!st || !st.pwaPrintOverlay || st.overlayId !== overlayId) {
      historyPushed = false; // already consumed by browser
      cleanup();
    }
  };
  // Safety net: if user closes the PWA / app, remove overlay so no orphan UI persists.
  const pageHideHandler = () => cleanup();
  document.addEventListener('keydown', escHandler);
  window.addEventListener('popstate', popHandler);
  window.addEventListener('pagehide', pageHideHandler);

  closeBtn.onclick = cleanup;
  floatingClose.onclick = cleanup;

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

  // ONLY patch standalone PWA mode (installed home screen apps).
  // Standard mobile browsers (iOS Safari, Android Chrome) must NOT be patched
  // because monkey-patching window.open breaks standard tabs and triggers blank iframe printing.
  const shouldPatch = isStandalonePWA();
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
