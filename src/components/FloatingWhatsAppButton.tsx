import { useState } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWhatsAppConfig, buildWhatsAppUrl, normalizeWhatsAppPhone } from '@/hooks/useWhatsAppConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { logWhatsAppEvent } from '@/lib/whatsappAnalytics';

const FloatingWhatsAppButton = () => {
  const { data: config } = useWhatsAppConfig();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [open, setOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);

  if (!config?.show_floating_button || !config?.phone_number?.trim()) {
    return null;
  }

  const positionClass = config.button_position === 'bottom-left'
    ? 'left-4 sm:left-6'
    : 'right-4 sm:right-6';

  const messageToSend = customMsg.trim() || config.welcome_message || '';
  const waUrl = buildWhatsAppUrl(config.phone_number, messageToSend);
  const cleanPhone = normalizeWhatsAppPhone(config.phone_number);
  const waAppUrl = `whatsapp://send?phone=${cleanPhone}${messageToSend ? `&text=${encodeURIComponent(messageToSend)}` : ''}`;

  const handleSend = (e: React.MouseEvent) => {
    // Validate first; if invalid, block navigation
    if (!cleanPhone || cleanPhone.length < 10) {
      e.preventDefault();
      logWhatsAppEvent({
        event_type: 'invalid_phone',
        phone_number: config.phone_number,
        success: false,
        error_reason: 'Phone number too short or empty',
      });
      toast.error(bn ? 'WhatsApp নাম্বার সঠিক নয়' : 'Invalid WhatsApp number');
      return;
    }

    // Let the anchor's native target="_blank" behavior handle opening WhatsApp.
    // This is the most reliable way across desktop, mobile, in-app browsers, and iframes.
    logWhatsAppEvent({
      event_type: 'send_open_browser',
      phone_number: cleanPhone,
      success: true,
      error_reason: null,
      meta: { url: waUrl, has_message: !!messageToSend },
    });

    // Close the popup after a short delay so the click registers fully
    setTimeout(() => {
      setOpen(false);
      setCustomMsg('');
    }, 100);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Validate phone number format (country code + at least 9 digits)
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error(bn ? 'ফোন নাম্বার সঠিক নয় (কান্ট্রি কোডসহ দিন)' : 'Invalid phone number (include country code)');
      }
      // Connectivity check to wa.me (no-cors so we just confirm reachability)
      await fetch(`https://wa.me/${cleanPhone}`, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
      const okMsg = bn ? `সফল! লিংক প্রস্তুত: wa.me/${cleanPhone}` : `Success! Link ready: wa.me/${cleanPhone}`;
      setTestResult({ ok: true, msg: okMsg });
      toast.success(okMsg);
      logWhatsAppEvent({ event_type: 'test_link', phone_number: cleanPhone, success: true });
    } catch (err: any) {
      const failMsg = err?.message || (bn ? 'ব্যর্থ! WhatsApp লিংকে পৌঁছানো যায়নি' : 'Failed! Could not reach WhatsApp link');
      setTestResult({ ok: false, msg: failMsg });
      toast.error(failMsg);
      logWhatsAppEvent({ event_type: 'test_link', phone_number: cleanPhone, success: false, error_reason: failMsg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {/* Chat Preview Card */}
      {open && (
        <div
          className={`fixed bottom-24 ${positionClass} z-[60] w-[calc(100vw-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-200`}
        >
          <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#25D366] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {bn ? 'WhatsApp চ্যাট' : 'WhatsApp Chat'}
                  </p>
                  <p className="text-xs opacity-90">
                    {bn ? 'সাধারণত মিনিটের মধ্যে উত্তর দেয়' : 'Typically replies in minutes'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Welcome */}
            <div className="p-4 bg-muted/30">
              <div className="bg-card rounded-2xl rounded-tl-sm p-3 shadow-sm text-sm text-foreground inline-block max-w-[85%]">
                {config.welcome_message || (bn ? 'আসসালামু আলাইকুম! আমরা কীভাবে সাহায্য করতে পারি?' : 'Hello! How can we help you?')}
              </div>
              {config.business_hours && (
                <p className="text-xs text-muted-foreground mt-2 px-1">
                  {config.business_hours}
                </p>
              )}
            </div>

            {/* Input */}
            <div className="p-3 bg-card border-t border-border">
              <div className="flex items-end gap-2">
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder={bn ? 'আপনার বার্তা লিখুন...' : 'Type your message...'}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
                />
                <a
                  href={waUrl}
                  onClick={handleSend}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white flex items-center justify-center transition-colors shadow-md"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </a>
              </div>

              {/* Test link + Test send buttons + result */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-secondary/50 hover:bg-secondary text-foreground flex items-center gap-1.5 disabled:opacity-60"
                >
                  {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  {bn ? 'লিংক টেস্ট' : 'Test link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!cleanPhone || cleanPhone.length < 10) {
                      toast.error(bn ? 'WhatsApp নাম্বার সঠিক নয়' : 'Invalid WhatsApp number');
                      logWhatsAppEvent({
                        event_type: 'invalid_phone',
                        phone_number: config.phone_number,
                        success: false,
                        error_reason: 'Test send aborted: invalid phone',
                      });
                      return;
                    }
                    const testMsg = bn
                      ? `✅ এটি একটি পরীক্ষামূলক বার্তা — ${window.location.origin}`
                      : `✅ This is a test message — ${window.location.origin}`;
                    const url = buildWhatsAppUrl(config.phone_number, testMsg);
                    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || (window.navigator as any).standalone === true;
                    let opened = false;
                    let errorReason: string | null = null;
                    try {
                      if (isStandalone) {
                        const w = window.open(url, '_blank', 'noopener,noreferrer');
                        opened = !!w;
                        if (!w) errorReason = 'Popup blocked';
                      } else {
                        window.location.href = url;
                        opened = true;
                      }
                    } catch (err: any) {
                      errorReason = err?.message || 'Unknown error';
                    }
                    logWhatsAppEvent({
                      event_type: 'send_click',
                      phone_number: cleanPhone,
                      success: opened,
                      error_reason: errorReason,
                      meta: { test_send: true, url },
                    });
                    if (opened) {
                      toast.success(bn ? 'WhatsApp খোলা হলো — পরীক্ষা বার্তা পাঠান' : 'WhatsApp opened — send the test message');
                    } else {
                      toast.error(errorReason || (bn ? 'খুলতে ব্যর্থ' : 'Failed to open'));
                    }
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-[#25D366]/40 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C3F] dark:text-[#25D366] flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  {bn ? 'পরীক্ষা বার্তা পাঠান' : 'Send test message'}
                </button>
                <p className="text-[10px] text-muted-foreground ml-auto">
                  {bn ? 'WhatsApp এ চালিয়ে যান' : 'Continues in WhatsApp'}
                </p>
              </div>
              {testResult && (
                <div className={`mt-2 flex items-start gap-1.5 text-[11px] p-2 rounded-md ${testResult.ok ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                  {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span className="break-all">{testResult.msg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          logWhatsAppEvent({
            event_type: next ? 'button_open' : 'button_close',
            phone_number: cleanPhone,
            success: true,
          });
        }}
        className={`fixed bottom-4 sm:bottom-6 ${positionClass} z-50 group`}
        aria-label={config.button_label || 'WhatsApp Chat'}
      >
        <div className="relative">
          {/* Pulse ring */}
          {!open && (
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
          )}
          <div className="relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110">
            {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
          </div>
        </div>
      </button>
    </>
  );
};

export default FloatingWhatsAppButton;
