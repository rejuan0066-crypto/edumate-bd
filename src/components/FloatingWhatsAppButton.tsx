import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useWhatsAppConfig, buildWhatsAppUrl } from '@/hooks/useWhatsAppConfig';
import { useLanguage } from '@/contexts/LanguageContext';

const FloatingWhatsAppButton = () => {
  const { data: config } = useWhatsAppConfig();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [open, setOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  if (!config?.show_floating_button || !config?.phone_number?.trim()) {
    return null;
  }

  const positionClass = config.button_position === 'bottom-left'
    ? 'left-4 sm:left-6'
    : 'right-4 sm:right-6';

  const messageToSend = customMsg.trim() || config.welcome_message || '';
  const waUrl = buildWhatsAppUrl(config.phone_number, messageToSend);

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
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white flex items-center justify-center transition-colors shadow-md"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                {bn ? 'WhatsApp এ চালিয়ে যান' : 'Continues in WhatsApp'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
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
