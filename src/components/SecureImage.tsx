import { ImgHTMLAttributes } from "react";
import { useSecureUrl } from "@/hooks/useSecureUrl";

interface SecureImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  /** Fallback image shown while the signed URL is being fetched, or if the file is inaccessible. */
  fallbackSrc?: string;
  /** Signed URL TTL in seconds (default 3600). */
  expiresIn?: number;
}

/**
 * Drop-in replacement for <img> that transparently fetches a signed URL when
 * the source points at a private storage bucket (photos, committee-attachments,
 * receipts, staff-letters). Public URLs and external images are passed through
 * unchanged.
 */
export default function SecureImage({
  src,
  fallbackSrc,
  expiresIn = 3600,
  alt = "",
  ...rest
}: SecureImageProps) {
  const resolved = useSecureUrl(src, expiresIn);
  const finalSrc = resolved || fallbackSrc || (typeof src === 'string' && (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) ? src : undefined);
  if (!finalSrc) {
    // Avoid rendering an <img> with empty src (causes a needless network hit).
    return <span aria-label={alt} {...(rest as any)} />;
  }
  return (
    <img
      src={finalSrc}
      alt={alt}
      onError={(e) => {
        if (fallbackSrc && (e.currentTarget as HTMLImageElement).src !== fallbackSrc) {
          (e.currentTarget as HTMLImageElement).src = fallbackSrc;
        }
      }}
      {...rest}
    />
  );
}
