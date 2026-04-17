import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { motion } from 'framer-motion';
import { ImageIcon } from 'lucide-react';

const Gallery = () => {
  const { language } = useLanguage();
  const { settings } = useWebsiteSettings();

  const items = settings.gallery_items || [];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">
          {language === 'bn' ? 'গ্যালারি' : 'Gallery'}
        </h1>
        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{language === 'bn' ? 'গ্যালারিতে কোনো ছবি নেই' : 'No images in gallery'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="card-elevated overflow-hidden group cursor-pointer"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={language === 'bn' ? item.title_bn : item.title_en} loading="lazy" decoding="async" className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="aspect-video bg-secondary/50 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground">
                    {language === 'bn' ? item.title_bn : item.title_en}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default Gallery;
