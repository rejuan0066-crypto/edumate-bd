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
 * Generate a wa.me click-to-chat URL.
 * Strips non-digit characters from the phone number (e.g., "+880 1XX..." → "8801XX...")
 */
export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  const base = `https://wa.me/${cleanPhone}`;
  if (message?.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
};
