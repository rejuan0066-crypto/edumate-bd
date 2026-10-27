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
        const defaultExport = (mod as any)?.default;
        const fallbackExport =
          typeof mod === 'function'
            ? mod
            : mod && typeof mod === 'object'
              ? Object.values(mod).find((v) => typeof v === 'function')
              : null;
        const resolvedComponent = defaultExport || fallbackExport;

        if (!resolvedComponent) {
          throw new Error('Module has no default export or returned undefined');
        }

        // Success: clear reload key so subsequent deployments can reload smoothly
        try { sessionStorage.removeItem(reloadKey); } catch { /* ignore */ }
        return { default: resolvedComponent as T };
      } catch (err) {
        const isLast = attempt === retries;
        if (!isLast) {
          await new Promise((r) => setTimeout(r, interval * (attempt + 1)));
          continue;
        }

        // Final failure — try a cache-busting reload to pick up fresh chunks (guarded against tight loops)
        let lastReload = 0;
        try { lastReload = Number(sessionStorage.getItem(reloadKey) || '0'); } catch { /* ignore */ }
        const now = Date.now();

        if (now - lastReload > 8000) {
          try { sessionStorage.setItem(reloadKey, String(now)); } catch { /* ignore */ }
          const url = new URL(window.location.href);
          url.searchParams.set('_upd', Date.now().toString());
          window.location.replace(url.toString());
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
