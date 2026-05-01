import { useEffect, useState } from "react";
import { getSecureUrl, parseStorageRef } from "@/lib/secureStorage";

/**
 * Resolve a storage reference (raw path, "<bucket>/<path>", or legacy public
 * URL pointing at a now-private bucket) into a signed URL.
 *
 * - If the input is null/empty, returns null.
 * - If the input is already public (e.g. an `institution-logos` URL or an
 *   external https URL), it is returned as-is on first render.
 * - If the input is for a private bucket, the hook returns null on first
 *   render and updates with the signed URL once available.
 */
export function useSecureUrl(
  input: string | null | undefined,
  expiresIn: number = 3600,
): string | null {
  const passthrough = !input || !parseStorageRef(input);
  const [url, setUrl] = useState<string | null>(passthrough ? (input ?? null) : null);

  useEffect(() => {
    let cancelled = false;
    if (!input) {
      setUrl(null);
      return;
    }
    if (!parseStorageRef(input)) {
      setUrl(input);
      return;
    }
    setUrl(null);
    getSecureUrl(input, expiresIn).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [input, expiresIn]);

  return url;
}
