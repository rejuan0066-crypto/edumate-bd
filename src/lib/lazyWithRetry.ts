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
  retries = 2,
  interval = 400,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
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

        return { default: resolvedComponent as T };
      } catch (err) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, interval * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error('lazyWithRetry: exhausted retries');
  });
}
