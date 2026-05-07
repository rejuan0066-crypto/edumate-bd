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
 * Generate a wa.me click-to-chat URL.
 */
export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const base = `https://wa.me/${cleanPhone}`;
  if (message?.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
};
