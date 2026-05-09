import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppConfig {
  id: string;
  phone_number: string | null;
  welcome_message: string | null;
  show_floating_button: boolean;
  button_position: 'bottom-right' | 'bottom-left';
  button_label: string | null;
  cloud_api_enabled: boolean;
  phone_number_id: string | null;
  business_account_id: string | null;
  default_language: string | null;
  business_hours: string | null;
  away_message: string | null;
}

export const useWhatsAppConfig = () => {
  return useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: async (): Promise<WhatsAppConfig | null> => {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn('WhatsApp config fetch failed:', error.message);
        return null;
      }
      return data as WhatsAppConfig | null;
    },
    staleTime: 60_000,
    retry: 1,
  });
};

/**
 * Normalize a phone number to WhatsApp's required international format (digits only, no '+').
 * - Strips all non-digit characters
 * - If 11-digit BD local format starting with '01', converts to '8801XXXXXXXXX'
 * - Otherwise returns the digit string as-is (assumes already international)
 */
export const normalizeWhatsAppPhone = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('01')) {
    return '88' + digits;
  }
  // Some users save with leading 0 + country code accidentally
  if (digits.startsWith('0') && digits.length > 11) {
    return digits.replace(/^0+/, '');
  }
  return digits;
};

/**
 * Detect if the current device is mobile (so we can prefer the whatsapp:// scheme).
 */
const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
};

/**
 * Generate a click-to-chat URL.
 * - Mobile: uses the whatsapp:// app scheme (most reliable, no domain block).
 * - Desktop: uses https://web.whatsapp.com/send (avoids api.whatsapp.com which is
 *   blocked on some ISPs / corporate networks).
 */
export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const text = message?.trim() ? `&text=${encodeURIComponent(message.trim())}` : '';
  if (isMobileDevice()) {
    return `whatsapp://send?phone=${cleanPhone}${text}`;
  }
  return `https://web.whatsapp.com/send?phone=${cleanPhone}${text.replace(/^&/, '&')}`;
};

/**
 * Always-web URL for "Test link" connectivity check (must be HTTP for fetch()).
 */
export const buildWhatsAppWebUrl = (phone: string, message?: string): string => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const text = message?.trim() ? `&text=${encodeURIComponent(message.trim())}` : '';
  return `https://web.whatsapp.com/send?phone=${cleanPhone}${text}`;
};
