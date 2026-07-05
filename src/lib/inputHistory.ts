// Per-field input history stored in localStorage.
// Used by the global <Input /> component to show past values as suggestions.

const PREFIX = 'ih:';
const MAX_PER_FIELD = 8;
const MAX_VALUE_LEN = 200;

// Types where suggesting past values is useless or unsafe.
const EXCLUDED_TYPES = new Set([
  'password', 'file', 'hidden', 'checkbox', 'radio',
  'submit', 'reset', 'button', 'image', 'color', 'range',
]);

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

export const historyKey = (name?: string, id?: string, placeholder?: string) =>
  `${PREFIX}${name || id || placeholder}`;

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
