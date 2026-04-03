import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import PhotoToolsCore from '@/components/PhotoToolsCore';

const PhotoToolsPage = () => {
  const { language } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          {language === 'bn' ? '📷 ফটো টুলস' : '📷 Photo Tools'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {language === 'bn' ? 'ছবি রিসাইজ, ক্রপ, কম্প্রেস ও ব্যাকগ্রাউন্ড রিমুভ' : 'Resize, crop, compress & remove background'}
        </p>
        <PhotoToolsCore language={language} />
      </div>
    </PublicLayout>
  );
};

export default PhotoToolsPage;
