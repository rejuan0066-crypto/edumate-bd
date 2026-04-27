/**
 * Lightweight client-side analytics hook for OTP lockout events.
 *
 * Records WHEN a user hits a lockout — never the OTP code itself.
 * Captured fields: code, scope ('verify' | 'both'), retryAfterSeconds,
 * purpose, and a sha256-truncated email hash (for de-anonymized funnel
 * analysis without storing PII in plaintext).
 *
 * Sinks (in order, all best-effort, never throw to caller):
 *   1. window.dispatchEvent(new CustomEvent('otp:lockout', { detail }))
 *   2. window.dataLayer.push({ event: 'otp_lockout', ... })  (GTM)
 *   3. window.gtag?.('event', 'otp_lockout', { ... })        (GA4)
 *   4. console.info (dev only)
 *   5. localStorage ring buffer (last 20 events) for in-app debugging
 */

export type OtpLockoutScope = 'verify' | 'both';

export interface OtpLockoutEvent {
  code: string;
  scope: OtpLockoutScope;
  retryAfterSeconds?: number;
  purpose?: string;
  /** SHA-256 of email, truncated to 12 chars. Never the raw email. */
  emailHash?: string;
  /** ISO timestamp */
  at: string;
}

const STORAGE_KEY = 'otp_lockout_events';
const MAX_EVENTS = 20;

async function hashEmail(email?: string): Promise<string | undefined> {
  if (!email) return undefined;
  try {
    const enc = new TextEncoder().encode(email.trim().toLowerCase());
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

function pushToRingBuffer(event: OtpLockoutEvent) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: OtpLockoutEvent[] = raw ? JSON.parse(raw) : [];
    list.push(event);
    while (list.length > MAX_EVENTS) list.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / serialization errors
  }
}

export async function trackOtpLockout(input: {
  code: string;
  scope: OtpLockoutScope;
  retryAfterSeconds?: number;
  purpose?: string;
  email?: string;
}): Promise<void> {
  const event: OtpLockoutEvent = {
    code: input.code,
    scope: input.scope,
    retryAfterSeconds: input.retryAfterSeconds,
    purpose: input.purpose,
    emailHash: await hashEmail(input.email),
    at: new Date().toISOString(),
  };

  if (typeof window === 'undefined') return;

  try {
    window.dispatchEvent(new CustomEvent('otp:lockout', { detail: event }));
  } catch { /* noop */ }

  try {
    const w = window as any;
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: 'otp_lockout', ...event });
    }
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'otp_lockout', {
        otp_code: event.code,
        otp_scope: event.scope,
        retry_after_seconds: event.retryAfterSeconds,
        purpose: event.purpose,
      });
    }
  } catch { /* noop */ }

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.info('[otp:lockout]', event);
  }

  pushToRingBuffer(event);
}

export function readOtpLockoutEvents(): OtpLockoutEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
