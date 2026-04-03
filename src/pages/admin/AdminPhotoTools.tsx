import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import PhotoToolsCore from '@/components/PhotoToolsCore';
import { Camera } from 'lucide-react';

const AdminPhotoTools = () => {
  const { language } = useLanguage();
  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">
              {language === 'bn' ? 'ফটো টুলস' : 'Photo Tools'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'রিসাইজ, ক্রপ, কম্প্রেস ও ব্যাকগ্রাউন্ড রিমুভ' : 'Resize, crop, compress & remove background'}
            </p>
          </div>
        </div>
        <PhotoToolsCore language={language} />
      </div>
    </AdminLayout>
  );
};

export default AdminPhotoTools;
