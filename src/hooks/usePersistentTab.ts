import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UsePersistentTabOptions<T extends string> {
  paramName?: string;
  storageKey?: string;
  validTabs?: readonly T[];
  syncWithUrl?: boolean;
}

/**
 * Custom hook to persist tab selection across page reloads and browser history.
 *
 * Priority on mount:
 * 1. URL search parameter (?tab=...)
 * 2. Browser sessionStorage (if previously selected)
 * 3. Default fallback tab
 *
 * Automatically updates both sessionStorage and the URL search query (using { replace: true }
 * to prevent polluting browser history with every tab switch).
 */
export function usePersistentTab<T extends string>(
  defaultTab: T,
  options?: UsePersistentTabOptions<T>
): [T, (tab: T) => void] {
  const paramName = options?.paramName || 'tab';
  const validTabs = options?.validTabs;
  const syncWithUrl = options?.syncWithUrl !== false;
  const storageKey =
    options?.storageKey ||
    (typeof window !== 'undefined'
      ? `edumate_tab_${window.location.pathname.replace(/\//g, '_')}_${paramName}`
      : `edumate_tab_${paramName}`);

  const [searchParams, setSearchParams] = useSearchParams();

  const isValid = useCallback(
    (val: unknown): val is T => {
      if (typeof val !== 'string' || !val) return false;
      if (validTabs && validTabs.length > 0) {
        return (validTabs as readonly string[]).includes(val);
      }
      return true;
    },
    [validTabs]
  );

  const getInitialValue = (): T => {
    if (syncWithUrl) {
      const qVal = searchParams.get(paramName);
      if (isValid(qVal)) return qVal;
    }
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (isValid(stored)) return stored;
    } catch {}
    return defaultTab;
  };

  const [activeTab, setActiveTabState] = useState<T>(getInitialValue);

  const setActiveTab = useCallback(
    (nextTab: T) => {
      const target = isValid(nextTab) ? nextTab : defaultTab;
      setActiveTabState(target);
      try {
        sessionStorage.setItem(storageKey, target);
      } catch {}

      if (syncWithUrl) {
        setSearchParams(
          prev => {
            const next = new URLSearchParams(prev);
            if (target === defaultTab) {
              next.delete(paramName);
            } else {
              next.set(paramName, target);
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [isValid, defaultTab, storageKey, syncWithUrl, setSearchParams, paramName]
  );

  // Sync if URL search params change externally (e.g. browser back/forward buttons or direct navigation)
  useEffect(() => {
    if (!syncWithUrl) return;
    const qVal = searchParams.get(paramName);
    if (isValid(qVal)) {
      if (qVal !== activeTab) {
        setActiveTabState(qVal);
        try {
          sessionStorage.setItem(storageKey, qVal);
        } catch {}
      }
    } else {
      // URL has no tab param: check if sessionStorage has a saved tab that should be mirrored to URL
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (isValid(stored) && stored !== defaultTab) {
          setActiveTabState(stored);
          setSearchParams(
            prev => {
              const next = new URLSearchParams(prev);
              next.set(paramName, stored);
              return next;
            },
            { replace: true }
          );
          return;
        }
      } catch {}

      if (activeTab !== defaultTab) {
        setActiveTabState(defaultTab);
      }
    }
  }, [searchParams, paramName, isValid, activeTab, storageKey, defaultTab, syncWithUrl, setSearchParams]);

  return [activeTab, setActiveTab];
}
