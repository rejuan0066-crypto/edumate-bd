/**
 * Visitor Identity Linking Helper
 * Stores and retrieves known visitor identity across visits on this browser.
 * 
 * Strict Truthfulness Guarantee:
 * - Never guesses or fabricates emails/identities.
 * - Never captures from admin, staff, or teacher management forms.
 * - Only links identity if explicitly logged in or submitted via a public application form.
 * - Auto-expires guest-cached identity after 24 hours to prevent cross-contamination on shared PCs.
 */

export interface KnownVisitorIdentity {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
  source?: 'auth' | 'cached_session' | 'admission_form' | 'staff_form' | 'contact_form' | 'donation_form' | 'portal_input';
  source_label?: string;
  identified_at?: string;
}

const STORAGE_KEY = 'edumate.known_visitor_identity';
const GUEST_IDENTITY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getIdentitySourceLabel(source?: string | null): string {
  switch (source) {
    case 'auth':
      return 'লগইন একাউন্ট (যাচাইকৃত)';
    case 'cached_session':
      return 'পূর্ববর্তী লগইন রেকর্ড';
    case 'admission_form':
      return 'ভর্তি আবেদন ফরম';
    case 'staff_form':
      return 'চাকরির আবেদন ফরম';
    case 'contact_form':
      return 'যোগাযোগ ফরম';
    case 'donation_form':
      return 'ডোনেশন ফরম';
    case 'portal_input':
      return 'পাবলিক ফরম ইনপুট';
    default:
      return 'অজ্ঞাত ভিজিটর';
  }
}

/**
 * Saves a known identity for this browser device.
 */
export function recordKnownVisitor(identity: Partial<KnownVisitorIdentity>): void {
  if (typeof window === 'undefined') return;

  // STRICT GUARD: Never record or overwrite identity from internal/administrative dashboards
  const pathname = window.location.pathname.toLowerCase();
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/accountant')
  ) {
    // If the identity is not an authenticated user, reject recording admin form edits
    if (identity.source !== 'auth') return;
  }

  try {
    const existing = getStoredVisitorIdentity();
    const merged: KnownVisitorIdentity = {
      ...existing,
      ...identity,
      source_label: getIdentitySourceLabel(identity.source || existing?.source),
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
 * Gets stored identity from localStorage (with 24h expiration check for guest forms)
 */
function getStoredVisitorIdentity(): KnownVisitorIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as KnownVisitorIdentity;

    // If source is not direct auth, check if it expired (shared device protection)
    if (data.source !== 'auth' && data.identified_at) {
      const elapsed = Date.now() - new Date(data.identified_at).getTime();
      if (elapsed > GUEST_IDENTITY_EXPIRY_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }

    return data;
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
              source_label: 'পূর্ববর্তী লগইন রেকর্ড',
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
  // 1. Direct logged in user (100% authoritative)
  if (currentUser?.id && currentUser?.email) {
    const currentIdentity: KnownVisitorIdentity = {
      email: currentUser.email,
      name: currentUser.user_metadata?.full_name || null,
      phone: currentUser.user_metadata?.phone || null,
      role: 'authenticated',
      source: 'auth',
      source_label: 'লগইন একাউন্ট (যাচাইকৃত)',
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

  return { email: null, name: null, phone: null, role: null, source_label: 'অজ্ঞাত ভিজিটর' };
}

/**
 * Installs auto-capture for email and phone inputs across the website.
 * STRICTLY restricted to public guest pages (Admission, Contact, Job application, etc.)
 * NEVER runs on administrative routes.
 */
export function initVisitorIdentityAutoCapture(): void {
  if (typeof window === 'undefined') return;

  const handleBlur = (e: Event) => {
    // 1. Safety check: Never capture if on administrative / management path
    const pathname = window.location.pathname.toLowerCase();
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/staff') ||
      pathname.startsWith('/teacher') ||
      pathname.startsWith('/accountant')
    ) {
      return;
    }

    const target = e.target as HTMLInputElement;
    if (!target || !target.value) return;

    // Identify public source from URL
    let source: KnownVisitorIdentity['source'] = 'portal_input';
    if (pathname.includes('admission')) source = 'admission_form';
    else if (pathname.includes('staff-application') || pathname.includes('career')) source = 'staff_form';
    else if (pathname.includes('contact')) source = 'contact_form';
    else if (pathname.includes('donat')) source = 'donation_form';

    // Check if input is an applicant/visitor email
    if (target.type === 'email' || target.name?.toLowerCase().includes('email') || target.id?.toLowerCase().includes('email')) {
      const email = target.value.trim().toLowerCase();
      // Valid email regex, ignore generic examples or test domains
      if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && !email.includes('example.com') && !email.includes('test.com')) {
        recordKnownVisitor({ email, source });
      }
    }

    // Check if input is applicant phone
    if (target.type === 'tel' || target.name?.toLowerCase().includes('phone') || target.name?.toLowerCase().includes('mobile')) {
      const phone = target.value.trim();
      if (/(^(\+8801|01))[1-9]\d{8}$/.test(phone)) {
        recordKnownVisitor({ phone, source });
      }
    }
  };

  window.addEventListener('blur', handleBlur, true);
}
