/**
 * Password input helper — strips any non-ASCII / non-printable characters
 * so passwords stay English-only (no Bengali digits, no Unicode).
 *
 * Allowed: printable ASCII (codes 33–126) — letters, digits, symbols.
 * Stripped: spaces, Bengali digits (০-৯), Bengali letters, emojis, etc.
 */
export const sanitizePasswordInput = (value: string): string => {
  if (!value) return '';
  // Keep only printable ASCII characters (no whitespace, no unicode)
  return value.replace(/[^\x21-\x7E]/g, '');
};

/**
 * Wraps a setState/onChange-style setter so the value is sanitized before storage.
 * Usage:
 *   <Input onChange={(e) => setPassword(sanitizePasswordInput(e.target.value))} />
 */
export const handlePasswordChange = (
  setter: (val: string) => void
) => (e: React.ChangeEvent<HTMLInputElement>) => {
  setter(sanitizePasswordInput(e.target.value));
};
