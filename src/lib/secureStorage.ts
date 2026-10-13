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

export const PRIVATE_BUCKETS = new Set([
  "photos",
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
 * Try to extract { bucket, path } from a Supabase storage URL or a raw
 * "<bucket>/<path>" string. Returns null if it doesn't look like one of our
 * private buckets.
 */
export function parseStorageRef(input: string | null | undefined): ResolvedRef | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (s.includes('res.cloudinary.com') || s.startsWith('http://') || (s.startsWith('https://') && !s.includes('/storage/v1/object/'))) {
    return null; // External or Cloudinary URL — already directly accessible
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
  if (!ref) return typeof input === "string" ? input : null;

  const key = `${ref.bucket}/${ref.path}`;
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt - 60_000 > now) return cached.url;

  // Route through the central authorization edge function so every signed-URL
  // request is JWT-verified, role-checked, and audited (security_logs on denial).
  // Falls back to direct storage signing only for buckets where RLS is the sole
  // gate (e.g., db-backups handled by super_admin policy).
  const routeViaEdge = ref.bucket !== "db-backups";
  if (routeViaEdge) {
    const { data, error } = await supabase.functions.invoke("request-signed-url", {
      body: { bucket: ref.bucket, path: ref.path, expiresIn },
    });
    if (error || !data?.url) return null;
    cache.set(key, { url: data.url as string, expiresAt: now + expiresIn * 1000 });
    return data.url as string;
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
