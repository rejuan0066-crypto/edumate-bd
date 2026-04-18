import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent fail — PWA install just won't be available
    });
  });
})();
