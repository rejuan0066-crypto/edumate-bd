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
  route_mode: 'allow' | 'deny';
  route_patterns: string[];
}

/**
 * Decide whether the floating WhatsApp button should be visible on a given pathname,
 * based on admin-configured allow/deny patterns. Patterns are treated as path prefixes.
 *  - mode='deny'  → hide if path matches any pattern (default).
 *  - mode='allow' → show ONLY if path matches at least one pattern.
 */
export const isWhatsAppRouteAllowed = (
  pathname: string,
  mode: 'allow' | 'deny' | null | undefined,
  patterns: string[] | null | undefined,
): boolean => {
  const list = (patterns || []).map((p) => (p || '').trim()).filter(Boolean);
  const matches = list.some((p) => pathname === p || pathname.startsWith(p));
  if ((mode || 'deny') === 'allow') return matches;
  return !matches;
};

export const useWhatsAppConfig = () => {
  return useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: async (): Promise<WhatsAppConfig | null> => {
      // Public-safe function that excludes sensitive Meta business IDs
      // (business_account_id, phone_number_id, cloud_api_enabled).
      const { data, error } = await (supabase as any).rpc('get_whatsapp_public_config');
      if (error) {
        console.warn('WhatsApp config fetch failed:', error.message);
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as unknown as WhatsAppConfig | null;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
 * Generate the primary click-to-chat URL — uses wa.me, the official format
 * that works everywhere (mobile app intercept, desktop app, web fallback).
 *
 * Note: wa.me redirects through api.whatsapp.com which is blocked on some
 * ISPs. The diagnostic panel exposes web.whatsapp.com & whatsapp:// as
 * manual fallbacks for those cases.
 */
export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const text = message?.trim() ? `?text=${encodeURIComponent(message.trim())}` : '';
  return `https://wa.me/${cleanPhone}${text}`;
};

/**
 * Direct web.whatsapp.com URL — bypasses wa.me / api.whatsapp.com redirect.
 * Useful when the primary URL is blocked by the user's network.
 */
export const buildWhatsAppWebUrl = (phone: string, message?: string): string => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const text = message?.trim() ? `&text=${encodeURIComponent(message.trim())}` : '';
  return `https://web.whatsapp.com/send/?phone=${cleanPhone}${text}`;
};

/**
 * Native app scheme URL — for explicit "Open in WhatsApp app" fallback.
 */
export const buildWhatsAppAppUrl = (phone: string, message?: string): string => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const text = message?.trim() ? `&text=${encodeURIComponent(message.trim())}` : '';
  return `whatsapp://send?phone=${cleanPhone}${text}`;
};

