/**
 * Visitor Identity Linking Helper
 * Stores and retrieves known visitor identity across visits on this browser.
 * 
 * Sources of Identity:
 * 1. Currently authenticated user (useAuth)
 * 2. Previously authenticated user session in localStorage (sb-*-auth-token)
 * 3. Form submissions (Admission, Job Application, Donation, Contact, Portals)
 * 4. Stored visitor identity cache
 */

export interface KnownVisitorIdentity {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
  source?: 'auth' | 'cached_session' | 'admission_form' | 'staff_form' | 'contact_form' | 'portal_input';
  identified_at?: string;
}

const STORAGE_KEY = 'edumate.known_visitor_identity';

/**
 * Saves a known identity for this browser device.
 */
export function recordKnownVisitor(identity: Partial<KnownVisitorIdentity>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredVisitorIdentity();
    const merged: KnownVisitorIdentity = {
      ...existing,
      ...identity,
      identified_at: new Date().toISOString(),
    };
    // Only save if at least one identifying property exists
    if (merged.email || merged.phone || merged.name) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Gets stored identity from localStorage
 */
function getStoredVisitorIdentity(): KnownVisitorIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Attempts to inspect Supabase cached session in localStorage if user is not currently logged in
 */
function inspectSupabaseCachedSession(): KnownVisitorIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token')) && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const user = parsed?.user;
          if (user?.email) {
            return {
              email: user.email,
              name: user.user_metadata?.full_name || null,
              phone: user.phone || null,
              role: user.role || 'former_user',
              source: 'cached_session',
            };
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolves the most accurate identity for the current visitor.
 */
export function resolveVisitorIdentity(currentUser?: { id?: string; email?: string | null; user_metadata?: Record<string, any> } | null): KnownVisitorIdentity {
  // 1. Direct logged in user
  if (currentUser?.id && currentUser?.email) {
    const currentIdentity: KnownVisitorIdentity = {
      email: currentUser.email,
      name: currentUser.user_metadata?.full_name || null,
      phone: currentUser.user_metadata?.phone || null,
      role: 'authenticated',
      source: 'auth',
    };
    recordKnownVisitor(currentIdentity);
    return currentIdentity;
  }

  // 2. Stored visitor identity from previous forms or login
  const stored = getStoredVisitorIdentity();
  if (stored && (stored.email || stored.phone)) {
    return stored;
  }

  // 3. Cached Supabase session (e.g. recently logged out)
  const cached = inspectSupabaseCachedSession();
  if (cached && cached.email) {
    recordKnownVisitor(cached);
    return cached;
  }

  return { email: null, name: null, phone: null, role: null };
}

/**
 * Installs auto-capture for email and phone inputs across the website.
 * Runs once at app initialization to passively link visitor identity when they interact with forms.
 */
export function initVisitorIdentityAutoCapture(): void {
  if (typeof window === 'undefined') return;

  const handleBlur = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target || !target.value) return;

    // Check if input is email
    if (target.type === 'email' || target.name?.toLowerCase().includes('email') || target.id?.toLowerCase().includes('email')) {
      const email = target.value.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        recordKnownVisitor({ email, source: 'portal_input' });
      }
    }

    // Check if input is phone
    if (target.type === 'tel' || target.name?.toLowerCase().includes('phone') || target.name?.toLowerCase().includes('mobile')) {
      const phone = target.value.trim();
      if (/(^(\+8801|01))[1-9]\d{8}$/.test(phone)) {
        recordKnownVisitor({ phone, source: 'portal_input' });
      }
    }
  };

  window.addEventListener('blur', handleBlur, true);
}
