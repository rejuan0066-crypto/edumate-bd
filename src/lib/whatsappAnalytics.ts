import { supabase } from '@/integrations/supabase/client';

export type WAEventType =
  | 'button_open'
  | 'button_close'
  | 'send_click'
  | 'send_open_browser'
  | 'send_open_native'
  | 'test_link'
  | 'invalid_phone';

interface LogParams {
  event_type: WAEventType;
  phone_number?: string | null;
  success: boolean;
  error_reason?: string | null;
  meta?: Record<string, unknown>;
}

const isPwa = (): boolean => {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  } catch {
    return false;
  }
};

export async function logWhatsAppEvent(params: LogParams): Promise<void> {
  const payload = {
    event_type: params.event_type,
    phone_number: params.phone_number ?? null,
    success: params.success,
    error_reason: params.error_reason ?? null,
    page_url: typeof window !== 'undefined' ? window.location.href : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    is_pwa: isPwa(),
    meta: (params.meta ?? {}) as any,
  };

  // Console echo for in-browser debugging
  // eslint-disable-next-line no-console
  console.log('[WhatsApp]', params.event_type, payload);

  try {
    const { error } = await supabase.from('whatsapp_click_events').insert([payload]);
    if (error) console.warn('[WhatsApp] log insert failed:', error.message);
  } catch (e) {
    // Swallow — analytics must never break UX
    console.warn('[WhatsApp] log threw:', e);
  }
}
