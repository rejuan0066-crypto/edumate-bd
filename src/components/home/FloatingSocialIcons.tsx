import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebsiteSettings, type SocialLink } from '@/hooks/useWebsiteSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Facebook,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Phone,
  MessageCircle,
  Share2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface FloatingSocialItem {
  id: string;
  name: string;
  nameBn: string;
  url: string;
  icon: any;
  bgClass: string;
  hoverBg: string;
}

export default function FloatingSocialIcons() {
  const { settings } = useWebsiteSettings();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Normalize phone for WhatsApp & Call
  const rawPhone = settings.phone || '';
  const digits = rawPhone.replace(/[^0-9]/g, '');
  const waNumber = digits.startsWith('880')
    ? digits
    : digits.startsWith('0')
    ? `88${digits}`
    : digits ? `880${digits}` : '';

  const socialLinks: SocialLink[] = settings.social_links || [];

  // Build items list
  const items: FloatingSocialItem[] = [];

  // 1. Facebook
  const fbLink = socialLinks.find(
    (s) => s.platform?.toLowerCase().includes('facebook') && s.url?.trim()
  );
  if (fbLink?.url?.trim()) {
    items.push({
      id: 'facebook',
      name: 'Facebook',
      nameBn: 'ফেসবুক পেজ',
      url: fbLink.url.trim(),
      icon: Facebook,
      bgClass: 'bg-[#1877F2] text-white',
      hoverBg: 'hover:bg-[#166fe5]',
    });
  }

  // 2. YouTube
  const ytLink = socialLinks.find(
    (s) => s.platform?.toLowerCase().includes('youtube') && s.url?.trim()
  );
  if (ytLink?.url?.trim()) {
    items.push({
      id: 'youtube',
      name: 'YouTube',
      nameBn: 'ইউটিউব চ্যানেল',
      url: ytLink.url.trim(),
      icon: Youtube,
      bgClass: 'bg-[#FF0000] text-white',
      hoverBg: 'hover:bg-[#e60000]',
    });
  }

  // 3. WhatsApp (from social_links or phone fallback)
  const waLink = socialLinks.find(
    (s) => s.platform?.toLowerCase().includes('whatsapp') && s.url?.trim()
  );
  const waUrl = waLink?.url?.trim() || (waNumber ? `https://wa.me/${waNumber}` : '');
  if (waUrl) {
    items.push({
      id: 'whatsapp',
      name: 'WhatsApp',
      nameBn: 'হোয়াটসঅ্যাপ চ্যাট',
      url: waUrl,
      icon: MessageCircle,
      bgClass: 'bg-[#25D366] text-white',
      hoverBg: 'hover:bg-[#20ba5a]',
    });
  }

  // 4. Other custom social links (Instagram, Twitter, LinkedIn, etc.)
  socialLinks.forEach((s) => {
    const p = s.platform?.toLowerCase() || '';
    if (p.includes('facebook') || p.includes('youtube') || p.includes('whatsapp') || !s.url?.trim()) {
      return;
    }

    if (p.includes('instagram')) {
      items.push({
        id: 'instagram',
        name: 'Instagram',
        nameBn: 'ইনস্টাগ্রাম',
        url: s.url.trim(),
        icon: Instagram,
        bgClass: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white',
        hoverBg: 'hover:opacity-90',
      });
    } else if (p.includes('twitter') || p.includes('x')) {
      items.push({
        id: 'twitter',
        name: 'Twitter (X)',
        nameBn: 'টুইটার (X)',
        url: s.url.trim(),
        icon: Twitter,
        bgClass: 'bg-black text-white',
        hoverBg: 'hover:bg-zinc-800',
      });
    } else if (p.includes('linkedin')) {
      items.push({
        id: 'linkedin',
        name: 'LinkedIn',
        nameBn: 'লিঙ্কডইন',
        url: s.url.trim(),
        icon: Linkedin,
        bgClass: 'bg-[#0A66C2] text-white',
        hoverBg: 'hover:bg-[#095196]',
      });
    } else {
      items.push({
        id: `custom_${p}`,
        name: s.platform || 'Social',
        nameBn: s.platform || 'সোশ্যাল মিডিয়া',
        url: s.url.trim(),
        icon: Share2,
        bgClass: 'bg-primary text-primary-foreground',
        hoverBg: 'hover:opacity-90',
      });
    }
  });

  // 5. Direct Call (if phone exists)
  if (rawPhone) {
    items.push({
      id: 'phone',
      name: 'Call Now',
      nameBn: 'সরাসরি কল করুন',
      url: `tel:${rawPhone}`,
      icon: Phone,
      bgClass: 'bg-emerald-600 text-white',
      hoverBg: 'hover:bg-emerald-700',
    });
  }

  // If no items at all, don't render
  if (items.length === 0) return null;

  return (
    <div
      className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-2 pointer-events-none select-none"
      aria-label={bn ? 'ভাসমান সোশ্যাল মিডিয়া লিংক' : 'Floating Social Media Links'}
    >
      {/* Collapse/Expand Toggle Pill (on mobile or desktop) */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={
          isCollapsed
            ? bn ? 'সোশ্যাল মিডিয়া দেখান' : 'Show Social Media'
            : bn ? 'লুকান' : 'Hide'
        }
        className="pointer-events-auto flex items-center justify-center w-6 h-6 rounded-full bg-background/80 hover:bg-background border border-border shadow-sm text-muted-foreground hover:text-foreground text-[10px] transition-all mb-0.5"
      >
        {isCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </motion.button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-end gap-2.5 pointer-events-auto"
          >
            {items.map((item, index) => {
              const IconComp = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.25 }}
                  className="relative flex items-center group"
                >
                  {/* Tooltip Label (slides out on hover) */}
                  <span
                    className="absolute right-full mr-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap bg-foreground text-background shadow-md opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 pointer-events-none hidden sm:inline-block"
                  >
                    {bn ? item.nameBn : item.name}
                  </span>

                  {/* Floating Action Button */}
                  <motion.a
                    href={item.url}
                    target={item.url.startsWith('tel:') ? '_self' : '_blank'}
                    rel={item.url.startsWith('tel:') ? undefined : 'noopener noreferrer'}
                    whileHover={{ scale: 1.15, x: -3 }}
                    whileTap={{ scale: 0.92 }}
                    aria-label={bn ? item.nameBn : item.name}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 ${item.bgClass} ${item.hoverBg} ring-2 ring-white/20 dark:ring-black/20`}
                  >
                    <IconComp className="w-5 h-5 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:scale-110" />
                  </motion.a>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
