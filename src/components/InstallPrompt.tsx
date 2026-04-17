import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 7;

const InstallPrompt = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // Don't show inside iframe (Lovable preview)
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as any).standalone === true) return;

    // Check dismiss cooldown
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const days = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    // iOS Safari detection (no beforeinstallprompt support)
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (ios) {
      setIsIOS(true);
      setTimeout(() => setShow(true), 5000);
      return;
    }

    // Android / Chrome / Edge
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
    setShowIOSHint(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[60]"
      >
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-display font-bold text-sm text-foreground">
                {bn ? 'অ্যাপ ইনস্টল করুন' : 'Install Our App'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {bn
                  ? 'হোম স্ক্রিনে যোগ করে দ্রুত অ্যাক্সেস পান'
                  : 'Add to home screen for quick access'}
              </p>
            </div>
          </div>

          {showIOSHint && isIOS ? (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">
              {bn ? (
                <>
                  Safari তে <strong>Share</strong> বাটন (⬆️) চাপুন → <strong>"Add to Home Screen"</strong> নির্বাচন করুন
                </>
              ) : (
                <>
                  Tap <strong>Share</strong> (⬆️) in Safari → choose <strong>"Add to Home Screen"</strong>
                </>
              )}
            </div>
          ) : (
            <Button onClick={handleInstall} className="w-full rounded-2xl" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {bn ? 'এখনই ইনস্টল করুন' : 'Install Now'}
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;
