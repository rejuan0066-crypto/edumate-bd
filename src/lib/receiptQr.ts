import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

export type ReceiptType = 'fee_payment' | 'parent_payment_request' | 'donation' | 'salary';

/** Get (or create) a verification token for a receipt. */
export async function getReceiptToken(
  receiptType: ReceiptType,
  receiptId: string,
): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc('get_or_create_receipt_token', {
    _receipt_type: receiptType,
    _receipt_id: receiptId,
  });
  if (error) {
    console.error('getReceiptToken error', error);
    return null;
  }
  return data as string;
}

/** Build the public verification URL for a token. */
export function buildVerifyUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify-receipt/${token}`;
}

/**
 * Validate a QR token via the backend edge endpoint.
 * Returns the same shape as verify_receipt_public / verify_receipt_admin.
 * Use mode='admin' from authenticated admin pages to get full details.
 */
export async function verifyReceiptToken(
  token: string,
  mode: 'public' | 'admin' = 'public',
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('verify-receipt-token', {
    body: { token, mode },
  });
  if (error) {
    return { valid: false, error: error.message || 'NETWORK_ERROR' };
  }
  return data;
}

/** Generate a QR code data URL (PNG) for a verification link. */
export async function generateReceiptQrDataUrl(
  receiptType: ReceiptType,
  receiptId: string,
  size: number = 220,
): Promise<{ dataUrl: string; url: string } | null> {
  const token = await getReceiptToken(receiptType, receiptId);
  if (!token) return null;
  const url = buildVerifyUrl(token);
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#064e3b', light: '#ffffff' },
  });
  return { dataUrl, url };
}
