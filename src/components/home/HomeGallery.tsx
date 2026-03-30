import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface Props {
  galleryItems: Array<{ title_bn: string; title_en: string; image_url: string; sort_order: number }>;
  language: string;
}

const HomeGallery = ({ galleryItems, language }: Props) => {
  const bn = language === 'bn';
  const items = galleryItems.filter(g => g.image_url).slice(0, 8);

  if (items.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="bg-primary rounded-t-xl px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-primary-foreground flex items-center gap-2">
            📷 {bn ? 'গ্যালারী' : 'Gallery'}
          </h2>
          <Link to="/gallery" className="text-xs text-primary-foreground/80 hover:text-primary-foreground flex items-center gap-1">
            {bn ? 'সব দেখুন' : 'View All'} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="border border-t-0 rounded-b-xl p-4 bg-card">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden border bg-secondary">
                  <img
                    src={item.image_url}
                    alt={bn ? item.title_bn : item.title_en}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2 font-medium line-clamp-2">
                  {bn ? item.title_bn : item.title_en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeGallery;
