import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { toast } from 'sonner';
import { useMemo } from 'react';
import DOMPurify from 'dompurify';

// Allowlist of trusted map iframe hosts. Anything else is stripped.
const ALLOWED_MAP_HOSTS = [
  'www.google.com',
  'maps.google.com',
  'www.openstreetmap.org',
  'www.bing.com',
  'maps.apple.com',
  'www.mapbox.com',
  'api.mapbox.com',
];

const sanitizeMapEmbed = (raw: string): string => {
  if (!raw) return '';
  // Only allow <iframe> with a strict attribute allowlist. Strip scripts, styles, event handlers.
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['iframe'],
    ALLOWED_ATTR: [
      'src', 'width', 'height', 'style', 'frameborder',
      'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'title',
    ],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_ATTR: ['srcdoc', 'sandbox', 'name'],
  });

  // Validate src host against allowlist
  if (typeof window === 'undefined') return clean;
  const tpl = document.createElement('template');
  tpl.innerHTML = clean;
  const iframe = tpl.content.querySelector('iframe');
  if (!iframe) return '';
  const src = iframe.getAttribute('src') || '';
  try {
    const url = new URL(src, window.location.origin);
    if (url.protocol !== 'https:') return '';
    if (!ALLOWED_MAP_HOSTS.includes(url.hostname)) return '';
  } catch {
    return '';
  }
  return tpl.innerHTML;
};

const Contact = () => {
  const { t, language } = useLanguage();
  const { settings } = useWebsiteSettings();

  const safeMapEmbed = useMemo(
    () => sanitizeMapEmbed(settings.contact_map_embed || ''),
    [settings.contact_map_embed],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(language === 'bn' ? 'বার্তা পাঠানো হয়েছে!' : 'Message sent!');
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">{t('contact')}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card-elevated p-8">
            <h2 className="text-xl font-display font-bold mb-6">
              {language === 'bn' ? 'বার্তা পাঠান' : 'Send Message'}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input placeholder={language === 'bn' ? 'আপনার নাম' : 'Your Name'} className="bg-background" required />
              <Input placeholder={t('email')} type="email" className="bg-background" />
              <Input placeholder={t('phone')} className="bg-background" />
              <Textarea placeholder={language === 'bn' ? 'আপনার বার্তা' : 'Your Message'} rows={5} className="bg-background" required />
              <Button type="submit" className="btn-primary-gradient w-full">{language === 'bn' ? 'পাঠান' : 'Send'}</Button>
            </form>
          </div>
          <div className="space-y-6">
            {[
              { icon: MapPin, label: language === 'bn' ? 'ঠিকানা' : 'Address', value: settings.address },
              { icon: Phone, label: language === 'bn' ? 'ফোন' : 'Phone', value: settings.phone },
              { icon: Mail, label: language === 'bn' ? 'ইমেইল' : 'Email', value: settings.email },
            ].map((item, i) => (
              <div key={i} className="card-elevated p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            ))}

            {/* Social Links */}
            {settings.social_links?.filter(s => s.url).length > 0 && (
              <div className="card-elevated p-5">
                <p className="text-sm text-muted-foreground mb-3">{language === 'bn' ? 'সোশ্যাল মিডিয়া' : 'Social Media'}</p>
                <div className="flex gap-3">
                  {settings.social_links.filter(s => s.url).map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                      {s.platform}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {safeMapEmbed && (
              <div className="card-elevated overflow-hidden rounded-xl">
                <div dangerouslySetInnerHTML={{ __html: safeMapEmbed }} className="w-full [&>iframe]:w-full [&>iframe]:h-[250px] [&>iframe]:border-0" />
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;
