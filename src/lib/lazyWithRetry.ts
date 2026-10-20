import { lazy, type ComponentType } from 'react';

type Factory<T> = () => Promise<{ default: T }>;

/**
 * Wraps React.lazy with automatic retry + page reload recovery.
 *
 * Dynamic imports can fail with "Importing a module script failed" / "Failed to
 * fetch dynamically imported module" — typically a transient network blip or a
 * stale chunk hash after a new deploy.
 *   1. retry the import a few times with a short backoff, then
 *   2. if it still fails, force a full reload to fetch the new manifest.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: Factory<T>,
  retries = 3,
  interval = 400,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const reloadKey = 'chunk_reload_' + window.location.pathname;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await factory();
        // Success: clear reload key so subsequent deployments can reload smoothly
        try { sessionStorage.removeItem(reloadKey); } catch { /* ignore */ }
        return mod;
      } catch (err) {
        const isLast = attempt === retries;
        if (!isLast) {
          await new Promise((r) => setTimeout(r, interval * (attempt + 1)));
          continue;
        }

        // Final failure — try a reload to pick up fresh chunks (guarded against tight loops)
        let lastReload = 0;
        try { lastReload = Number(sessionStorage.getItem(reloadKey) || '0'); } catch { /* ignore */ }
        const now = Date.now();

        if (now - lastReload > 12000) {
          try { sessionStorage.setItem(reloadKey, String(now)); } catch { /* ignore */ }
          window.location.reload();
          // Return a never-resolving promise so React keeps the Suspense
          // fallback visible while the reload happens (no error flash).
          return new Promise<{ default: T }>(() => {});
        }

        throw err;
      }
    }
    // Unreachable, but satisfies TypeScript.
    throw new Error('lazyWithRetry: exhausted retries');
  });
}
