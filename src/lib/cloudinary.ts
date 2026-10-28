import { supabase } from '@/integrations/supabase/client';

export interface CloudinaryUploadOptions {
  folder?: string;
  tags?: string[];
  transformation?: string;
}

/**
 * Upload a file (Image, PDF, Receipt, etc.) directly to Cloudinary.
 * Generates an authenticated SHA-1 signature on the fly.
 * Automatically compresses images and delivers high-speed CDN URLs.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options: CloudinaryUploadOptions = {}
): Promise<{ url: string; secure_url: string; public_id: string; format: string }> {
  // Signature is generated server-side; the Cloudinary secret never ships to the browser.
  const { data: sig, error: sigErr } = await supabase.functions.invoke('cloudinary-sign', {
    body: { folder: options.folder || 'general' },
  });
  if (sigErr || !sig?.signature) {
    throw new Error('Cloudinary upload failed: could not sign upload');
  }
  const { signature, timestamp, folder, api_key: API_KEY, cloud_name: CLOUD_NAME } = sig as {
    signature: string; timestamp: number; folder: string; api_key: string; cloud_name: string;
  };

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Cloudinary upload failed: ${response.statusText}`;
    throw new Error(message);
  }

  const result = await response.json();
  return {
    url: result.url,
    secure_url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
  };
}

/**
 * Checks if a given URL or reference is from Cloudinary
 */
export function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('res.cloudinary.com') || url.includes('cloudinary');
}
