import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWhatsAppConfig, buildWhatsAppUrl, buildWhatsAppWebUrl, buildWhatsAppAppUrl, normalizeWhatsAppPhone } from '@/hooks/useWhatsAppConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logWhatsAppEvent } from '@/lib/whatsappAnalytics';

const FloatingWhatsAppButton = () => {
  const location = useLocation();
  const { data: config } = useWhatsAppConfig();
  const { language } = useLanguage();
  const { role } = useAuth();
  const bn = language === 'bn';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const [open, setOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);
  const [sendDiag, setSendDiag] = useState<null | {
    ok: boolean;
    at: string;
    url: string;
    in_iframe: boolean;
    probe_ok: boolean;
    probe_error: string | null;
    open_error: string | null;
    duration_ms: number;
  }>(null);

  const path = location.pathname;
  const isHiddenRoute =
    path.startsWith('/admin') ||
    path.startsWith('/student-portal') ||
    path.startsWith('/student-info') ||
    path.startsWith('/parent-portal') ||
    path.startsWith('/auth') ||
    path.startsWith('/login');

  if (isHiddenRoute) return null;

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

  const handleSend = async (e: React.MouseEvent) => {
    e.preventDefault();
    const startedAt = performance.now();

    if (!cleanPhone || cleanPhone.length < 10) {
      if (isAdmin) {
        logWhatsAppEvent({
          event_type: 'invalid_phone',
          phone_number: config.phone_number,
          success: false,
          error_reason: 'Phone number too short or empty',
          meta: { attempted_url: waUrl },
        });
        setSendDiag({
          ok: false, at: new Date().toISOString(), url: waUrl,
          in_iframe: false, probe_ok: false,
          probe_error: 'invalid_phone', open_error: null, duration_ms: 0,
        });
      }
      toast.error(bn ? 'WhatsApp নাম্বার সঠিক নয়' : 'Invalid WhatsApp number');
      return;
    }

    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch { inIframe = true; }

    // Probe is purely a diagnostic — only run for admins to avoid public backend/network noise.
    let probeOk = true;
    let probeError: string | null = null;
    if (isAdmin && waUrl.startsWith('https://')) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        await fetch(waUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
      } catch (err: any) {
        probeOk = false;
        probeError = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network blocked');
      }
    }

    let opened = false;
    let openError: string | null = null;
    try {
      if (inIframe && window.top) {
        try { (window.top as Window).location.href = waUrl; opened = true; }
        catch { /* cross-origin top — fall through */ }
      }
      if (!opened) {
        const w = window.open(waUrl, '_blank', 'noopener,noreferrer');
        if (w) opened = true;
        else openError = 'popup_blocked';
      }
    } catch (err: any) {
      openError = err?.message || 'open_failed';
    }

    const duration = Math.round(performance.now() - startedAt);
    const diagMeta = {
      url: waUrl, has_message: !!messageToSend, in_iframe: inIframe,
      probe_ok: probeOk, probe_error: probeError, open_error: openError,
      duration_ms: duration,
    };

    if (isAdmin) {
      setSendDiag({
        ok: opened && probeOk, at: new Date().toISOString(), url: waUrl,
        in_iframe: inIframe, probe_ok: probeOk,
        probe_error: probeError, open_error: openError, duration_ms: duration,
      });
    }

    if (!opened || (isAdmin && !probeOk)) {
      const reason = openError === 'popup_blocked'
        ? (bn ? 'পপআপ ব্লক করা হয়েছে — ব্রাউজার সেটিংস থেকে অনুমতি দিন' : 'Popup blocked — allow popups in browser settings')
        : probeError === 'timeout'
          ? (bn ? 'সংযোগে সময়সীমা শেষ — নেটওয়ার্ক/ISP হয়তো ব্লক করছে' : 'Connection timed out — network/ISP may be blocking')
          : !probeOk
            ? (bn ? `নেটওয়ার্ক ব্লক/রিডাইরেক্ট: ${probeError}` : `Network blocked/redirected: ${probeError}`)
            : (bn ? `খুলতে ব্যর্থ: ${openError}` : `Failed to open: ${openError}`);
      toast.error(reason, { duration: 6000 });
      if (isAdmin) {
        logWhatsAppEvent({
          event_type: 'send_open_browser', phone_number: cleanPhone,
          success: false, error_reason: openError || probeError || 'unknown', meta: diagMeta,
        });
      }
      return;
    }

    if (isAdmin) {
      logWhatsAppEvent({
        event_type: 'send_open_browser', phone_number: cleanPhone,
        success: true, error_reason: null, meta: diagMeta,
      });
    }

    setTimeout(() => { setOpen(false); setCustomMsg(''); }, 100);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Validate phone number format (country code + at least 9 digits)
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error(bn ? 'ফোন নাম্বার সঠিক নয় (কান্ট্রি কোডসহ দিন)' : 'Invalid phone number (include country code)');
      }
      // Connectivity check to web.whatsapp.com (no-cors). We avoid wa.me because it
      // 302-redirects to api.whatsapp.com, which is blocked on some networks/ISPs.
      await fetch(`https://web.whatsapp.com/send?phone=${cleanPhone}`, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
      const okMsg = bn ? `সফল! লিংক প্রস্তুত (web.whatsapp.com)` : `Success! Link ready (web.whatsapp.com)`;
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

              {/* Test link + Test send buttons + result — admin only */}
              {isAdmin && (
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
              )}
              {isAdmin && testResult && (
                <div className={`mt-2 flex items-start gap-1.5 text-[11px] p-2 rounded-md ${testResult.ok ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                  {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span className="break-all">{testResult.msg}</span>
                </div>
              )}
              {isAdmin && sendDiag && (
                <div className={`mt-2 text-[11px] p-2 rounded-md border ${sendDiag.ok ? 'bg-green-500/5 border-green-500/30' : 'bg-destructive/5 border-destructive/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      {sendDiag.ok
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        : <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                      {bn ? 'ক্লিক ডায়াগনস্টিক' : 'Click diagnostic'}
                    </span>
                    <button type="button" onClick={() => setSendDiag(null)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10.5px]">
                    <dt className="text-muted-foreground">{bn ? 'ফলাফল' : 'Result'}</dt>
                    <dd>{sendDiag.ok ? (bn ? 'সফল' : 'Success') : (bn ? 'ব্যর্থ' : 'Failed')}</dd>
                    <dt className="text-muted-foreground">{bn ? 'প্রোব' : 'Probe'}</dt>
                    <dd>{sendDiag.probe_ok ? 'ok' : (sendDiag.probe_error || 'failed')}</dd>
                    <dt className="text-muted-foreground">{bn ? 'ওপেন' : 'Open'}</dt>
                    <dd>{sendDiag.open_error || 'ok'}</dd>
                    <dt className="text-muted-foreground">iframe</dt>
                    <dd>{sendDiag.in_iframe ? 'yes' : 'no'}</dd>
                    <dt className="text-muted-foreground">{bn ? 'সময়' : 'Time'}</dt>
                    <dd>{sendDiag.duration_ms} ms</dd>
                    <dt className="text-muted-foreground">URL</dt>
                    <dd className="break-all"><a href={sendDiag.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">{sendDiag.url}</a></dd>
                  </dl>
                  {!sendDiag.ok && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground mb-1.5">
                        {bn ? 'বিকল্প উপায়:' : 'Try alternatives:'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <a
                          href={buildWhatsAppWebUrl(config.phone_number, messageToSend)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2 py-1 rounded border border-border bg-background hover:bg-muted"
                        >
                          web.whatsapp.com
                        </a>
                        <a
                          href={buildWhatsAppAppUrl(config.phone_number, messageToSend)}
                          className="text-[10px] px-2 py-1 rounded border border-border bg-background hover:bg-muted"
                        >
                          {bn ? 'WhatsApp অ্যাপ' : 'WhatsApp app'}
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(sendDiag.url);
                              toast.success(bn ? 'লিংক কপি হয়েছে' : 'Link copied');
                            } catch {
                              toast.error(bn ? 'কপি ব্যর্থ' : 'Copy failed');
                            }
                          }}
                          className="text-[10px] px-2 py-1 rounded border border-border bg-background hover:bg-muted"
                        >
                          {bn ? 'লিংক কপি' : 'Copy link'}
                        </button>
                      </div>
                    </div>
                  )}
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
