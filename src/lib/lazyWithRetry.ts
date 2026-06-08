import { lazy, type ComponentType } from 'react';

type Factory<T> = () => Promise<{ default: T }>;

const RELOAD_FLAG = 'chunk_reload_attempt_v1';

/**
 * Wraps React.lazy with automatic retry + one-time page reload recovery.
 *
 * Dynamic imports can fail with "Importing a module script failed" / "Failed to
 * fetch dynamically imported module" — typically a transient network blip or a
 * stale chunk hash after a new deploy. Instead of surfacing the ErrorBoundary
 * ("আবার চেষ্টা করুন") on every admin page, we:
 *   1. retry the import a few times with a short backoff, then
 *   2. if it still fails, force a single full reload to fetch the new manifest.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: Factory<T>,
  retries = 3,
  interval = 400,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await factory();
        // Success: clear any prior reload guard so future failures can reload again.
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
        return mod;
      } catch (err) {
        const isLast = attempt === retries;
        if (!isLast) {
          await new Promise((r) => setTimeout(r, interval * (attempt + 1)));
          continue;
        }

        // Final failure — try a single full reload to pick up fresh chunks.
        let alreadyReloaded = false;
        try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* ignore */ }

        if (!alreadyReloaded) {
          try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* ignore */ }
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
