import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';

const galleryItems = [
  { title: 'মাদরাসা ভবন', color: 'bg-primary/10' },
  { title: 'বার্ষিক সভা', color: 'bg-accent/20' },
  { title: 'ক্লাসরুম', color: 'bg-secondary' },
  { title: 'লাইব্রেরি', color: 'bg-primary/10' },
  { title: 'খেলাধুলা', color: 'bg-accent/20' },
  { title: 'সাংস্কৃতিক অনুষ্ঠান', color: 'bg-secondary' },
];

const Gallery = () => {
  const { language } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">
          {language === 'bn' ? 'গ্যালারি' : 'Gallery'}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, i) => (
            <div key={i} className="card-elevated overflow-hidden group cursor-pointer">
              <div className={`aspect-video ${item.color} flex items-center justify-center text-4xl`}>
                📷
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Gallery;
