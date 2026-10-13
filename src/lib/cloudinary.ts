import CryptoJS from 'crypto-js';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'fjiynfbg';
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '127363587554279';
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'LehgK6fNg1ARbYaTwuD4cCpyrlI';

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
  const timestamp = Math.round(Date.now() / 1000);
  const folder = options.folder ? `edumate-bd/${options.folder}` : 'edumate-bd/general';

  // Build params string to sign in alphabetical order
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  const signature = CryptoJS.SHA1(paramsToSign).toString();

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
