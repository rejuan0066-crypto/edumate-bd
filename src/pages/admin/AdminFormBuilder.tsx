import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminFormBuilder = () => {
  const { language } = useLanguage();
  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4">🛠️</div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {language === 'bn' ? 'কাস্টম ফর্ম বিল্ডার' : 'Custom Form Builder'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'bn' ? 'এই পেজটি শীঘ্রই তৈরি হবে' : 'This page is coming soon'}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFormBuilder;
