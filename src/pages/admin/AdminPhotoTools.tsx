import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import PhotoToolsCore from '@/components/PhotoToolsCore';

const AdminPhotoTools = () => {
  const { language } = useLanguage();
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {language === 'bn' ? '📷 ফটো টুলস' : '📷 Photo Tools'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'bn' ? 'ছবি রিসাইজ, ক্রপ, কম্প্রেস ও ব্যাকগ্রাউন্ড রিমুভ' : 'Resize, crop, compress & remove background'}
          </p>
        </div>
        <PhotoToolsCore language={language} />
      </div>
    </AdminLayout>
  );
};

export default AdminPhotoTools;
