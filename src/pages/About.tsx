import PublicLayout from '@/components/PublicLayout';
import { Seo } from '@/components/Seo';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';
import { motion } from 'framer-motion';
import { Target, Eye, BookOpen } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const About = () => {
  const { language } = useLanguage();
  const { settings: rawSettings } = useWebsiteSettings();
  const { data: principal } = usePrincipalOfficer();
  const bn = language === 'bn';
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(t);
  }, [hash, rawSettings]);

  const settings: any = principal
    ? {
        ...rawSettings,
        principal_name: bn
          ? (principal.principal_name || rawSettings.principal_name)
          : (principal.principal_name_en || principal.principal_name || rawSettings.principal_name),
        principal_title_bn: principal.principal_title_bn || rawSettings.principal_title_bn,
        principal_title_en: principal.principal_title_en || rawSettings.principal_title_en,
        principal_photo_url: principal.principal_photo_url || rawSettings.principal_photo_url,
      }
    : rawSettings;

  return (
    <PublicLayout>
      <Seo
        title="About Us — Al-Arabia Subhania Hafizia Madrasah"
        description="Learn about the history, mission, vision, and leadership of Al-Arabia Subhania Hafizia Madrasah and its commitment to Islamic education."
        path="/about"
      />
      <div className="container mx-auto px-4 py-12 space-y-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-6">
            {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card-elevated p-8 prose max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {language === 'bn' ? settings.about_content_bn : settings.about_content_en}
              </p>
            </div>
            {settings.about_image_url ? (
              <div className="card-elevated overflow-hidden">
                <img src={settings.about_image_url} alt="About" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="card-elevated p-8 flex items-center justify-center bg-secondary/30">
                <BookOpen className="w-24 h-24 text-primary/20" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="card-elevated p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">
                {language === 'bn' ? 'আমাদের মিশন' : 'Our Mission'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {language === 'bn' ? settings.about_mission_bn : settings.about_mission_en}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="card-elevated p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">
                {language === 'bn' ? 'আমাদের ভিশন' : 'Our Vision'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {language === 'bn' ? settings.about_vision_bn : settings.about_vision_en}
            </p>
          </motion.div>
        </div>

        {/* Principal Section */}
        <motion.div id="principal-message" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-elevated p-8 scroll-mt-28">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">
            {language === 'bn' ? 'অধ্যক্ষের বাণী' : "Principal's Message"}
          </h2>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-32 h-32 rounded-xl bg-secondary shrink-0 flex items-center justify-center text-4xl overflow-hidden">
              {settings.principal_photo_url ? (
                <img src={settings.principal_photo_url} alt="Principal" className="w-full h-full object-cover" />
              ) : '👤'}
            </div>
            <div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {language === 'bn' ? settings.principal_message_bn : settings.principal_message_en}
              </p>
              <p className="mt-4 font-semibold text-foreground">{settings.principal_name}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? settings.principal_title_bn : settings.principal_title_en}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Admin Section */}
        {(bn ? settings.admin_message_bn : settings.admin_message_en) && (
          <motion.div id="admin-message" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-elevated p-8 scroll-mt-28">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">
              {bn ? 'পরিচালকের বাণী' : "Administrator's Message"}
            </h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-32 h-32 rounded-xl bg-secondary shrink-0 flex items-center justify-center text-4xl overflow-hidden">
                {settings.admin_photo_url ? (
                  <img src={settings.admin_photo_url} alt="Administrator" className="w-full h-full object-cover" />
                ) : '👤'}
              </div>
              <div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {bn ? settings.admin_message_bn : settings.admin_message_en}
                </p>
                <p className="mt-4 font-semibold text-foreground">{settings.admin_name}</p>
                <p className="text-xs text-muted-foreground">
                  {bn ? settings.admin_title_bn || 'এডমিন' : settings.admin_title_en || 'Admin'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </PublicLayout>
  );
};

export default About;
