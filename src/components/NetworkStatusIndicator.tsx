import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const NetworkStatusIndicator = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [show, setShow] = useState(false);
  const firstRef = useRef(true);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setShow(true); setTimeout(() => setShow(false), 3000); };
    const handleOffline = () => { setOnline(false); setShow(true); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setShow(true);
    firstRef.current = false;
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-xl border ${
              online
                ? 'bg-emerald-500/90 text-white border-emerald-400/40'
                : 'bg-destructive/90 text-destructive-foreground border-destructive/40'
            }`}
          >
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {online
              ? (bn ? 'অনলাইনে ফিরেছেন' : 'Back online')
              : (bn ? 'অফলাইন মোডে আছেন' : 'You are offline')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusIndicator;
