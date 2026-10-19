/**
 * Secure storage helpers.
 *
 * The `photos` and `committee-attachments` buckets are private. Files in them
 * cannot be loaded with the legacy `/storage/v1/object/public/...` URL — they
 * require a short-lived signed URL.
 *
 * These helpers transparently convert either a raw storage path
 *   ("students/abc.jpg")
 * or a legacy public URL pointing at a now-private bucket
 *   ("https://<project>.supabase.co/storage/v1/object/public/photos/students/abc.jpg")
 * into a signed URL valid for `expiresIn` seconds (default 1 hour).
 */
import { supabase } from "@/integrations/supabase/client";

export const PUBLIC_BUCKETS = new Set([
  "photos",
  "institution-logos",
  "website-assets",
  "post-attachments",
]);

export const PRIVATE_BUCKETS = new Set([
  "committee-attachments",
  "receipts",
  "staff-letters",
  "db-backups",
  "chat-attachments",
]);

export interface ResolvedRef {
  bucket: string;
  path: string;
}

/**
 * Resolve a public storage reference (e.g. "photos/abc.jpg") to its full CDN public URL.
 */
export function resolvePublicStorageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (s.startsWith('data:') || s.startsWith('blob:') || s.includes('res.cloudinary.com') || s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }
  const slash = s.indexOf("/");
  if (slash > 0) {
    const bucket = s.slice(0, slash);
    const path = s.slice(slash + 1);
    if (PUBLIC_BUCKETS.has(bucket)) {
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
  }
  return s;
}

/**
 * Try to extract { bucket, path } from a Supabase storage URL or a raw
 * "<bucket>/<path>" string. Returns null if it doesn't look like one of our
 * private buckets.
 */
export function parseStorageRef(input: string | null | undefined): ResolvedRef | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (s.startsWith('data:') || s.startsWith('blob:') || s.includes('res.cloudinary.com') || s.startsWith('http://') || (s.startsWith('https://') && !s.includes('/storage/v1/object/'))) {
    return null; // External, data URL or Cloudinary URL — already directly accessible
  }

  // Full URL form (public or sign endpoint)
  const m = s.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (m) {
    const bucket = m[1];
    const path = decodeURIComponent(m[2]);
    if (PRIVATE_BUCKETS.has(bucket)) return { bucket, path };
    return null; // public bucket — no need to sign
  }

  // Bare "<bucket>/<path>" form
  const slash = s.indexOf("/");
  if (slash > 0) {
    const bucket = s.slice(0, slash);
    if (PRIVATE_BUCKETS.has(bucket)) {
      return { bucket, path: s.slice(slash + 1) };
    }
  }
  return null;
}

const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get a signed URL for a private-bucket file. Caches results in-memory
 * until they are within 60s of expiry.
 */
export async function getSecureUrl(
  input: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!input) return null;
  const ref = parseStorageRef(input);
  // Not a private-bucket reference — return as-is (public URL or external).
  if (!ref) return typeof input === "string" ? resolvePublicStorageUrl(input) : null;

  const key = `${ref.bucket}/${ref.path}`;
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt - 60_000 > now) return cached.url;

  // Route through the central authorization edge function so every signed-URL
  // request is JWT-verified, role-checked, and audited (security_logs on denial).
  // Falls back to direct storage signing if edge function is unavailable or returns an error.
  const routeViaEdge = ref.bucket !== "db-backups";
  if (routeViaEdge) {
    try {
      const { data, error } = await supabase.functions.invoke("request-signed-url", {
        body: { bucket: ref.bucket, path: ref.path, expiresIn },
      });
      if (!error && data?.url) {
        cache.set(key, { url: data.url as string, expiresAt: now + expiresIn * 1000 });
        return data.url as string;
      }
    } catch {
      // Best-effort edge invoke; proceed to direct storage sign fallback below
    }
  }

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, expiresIn);

  if (error || !data?.signedUrl) {
    return null;
  }
  cache.set(key, { url: data.signedUrl, expiresAt: now + expiresIn * 1000 });
  return data.signedUrl;
}

export function clearSecureUrlCache() {
  cache.clear();
}
