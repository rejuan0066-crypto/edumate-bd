// Per-field input history stored in localStorage, partitioned per-user.
// Used by the global <Input /> component to show past values as suggestions.

const PREFIX = 'ih:';
const MAX_PER_FIELD = 20;
const MAX_VALUE_LEN = 200;

// Types where suggesting past values is useless or unsafe.
const EXCLUDED_TYPES = new Set([
  'password', 'file', 'hidden', 'checkbox', 'radio',
  'submit', 'reset', 'button', 'image', 'color', 'range',
]);

/**
 * Extracts current logged-in user id from Supabase localStorage session (if available)
 * so that site-wide input history is personal and isolated per user account (নিজ নিজ).
 */
export const getCurrentUserId = (): string => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'global';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && ((k.startsWith('sb-') && k.endsWith('-auth-token')) || k === 'supabase.auth.token')) {
        const val = localStorage.getItem(k);
        if (val) {
          const parsed = JSON.parse(val);
          const uid = parsed?.user?.id || parsed?.currentSession?.user?.id;
          if (uid) return uid;
        }
      }
    }
  } catch {
    // ignore parsing errors
  }
  return 'global';
};

export const isHistoryEligible = (
  type: string | undefined,
  name: string | undefined,
  id: string | undefined,
  autoComplete: string | undefined,
  placeholder?: string | undefined,
): boolean => {
  const t = (type || 'text').toLowerCase();
  if (EXCLUDED_TYPES.has(t)) return false;
  if (autoComplete && /off|new-password|current-password|one-time-code/i.test(autoComplete)) return false;
  // Need a stable key (name, id, or placeholder text)
  if (!name && !id && !placeholder) return false;
  // Skip obviously sensitive names
  const key = `${name || ''} ${id || ''} ${placeholder || ''}`.toLowerCase();
  if (/(password|otp|pin|cvv|token|secret|captcha)/.test(key)) return false;
  return true;
};

/**
 * Produces a stable, clean, user-scoped storage key
 */
export const historyKey = (name?: string, id?: string, placeholder?: string, customKey?: string) => {
  const userId = getCurrentUserId();
  const field = customKey || name || id || placeholder || 'field';
  return `${PREFIX}${userId}:${field}`;
};

/**
 * Generates a collision-free, DOM-valid list ID for HTML datalist
 * even when placeholder contains Bengali or unicode characters.
 */
export const safeListId = (name?: string, id?: string, placeholder?: string) => {
  const raw = `${name || ''}::${id || ''}::${placeholder || ''}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  const clean = (name || id || 'inp').replace(/[^a-zA-Z0-9_-]/g, '');
  return `ih_${clean || 'field'}_${Math.abs(h).toString(36)}`;
};

export const loadHistory = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

export const pushHistory = (key: string, value: string) => {
  const v = (value ?? '').toString().trim();
  if (!v || v.length > MAX_VALUE_LEN) return;
  try {
    const cur = loadHistory(key);
    const next = [v, ...cur.filter(x => x !== v)].slice(0, MAX_PER_FIELD);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
};

export const clearHistory = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* noop */ }
};
