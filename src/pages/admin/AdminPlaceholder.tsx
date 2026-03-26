import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';

const placeholderPages: Record<string, { titleBn: string; titleEn: string }> = {
  divisions: { titleBn: 'বিভাগ ও শ্রেণী', titleEn: 'Division & Class' },
  subjects: { titleBn: 'বিষয়সমূহ', titleEn: 'Subjects' },
  results: { titleBn: 'ফলাফল ব্যবস্থাপনা', titleEn: 'Result Management' },
  notices: { titleBn: 'নোটিশ ব্যবস্থাপনা', titleEn: 'Notice Management' },
  fees: { titleBn: 'ফি ব্যবস্থাপনা', titleEn: 'Fee Management' },
  website: { titleBn: 'ওয়েবসাইট নিয়ন্ত্রণ', titleEn: 'Website Control' },
  settings: { titleBn: 'সেটিংস', titleEn: 'Settings' },
};

const AdminPlaceholder = ({ page }: { page: string }) => {
  const { language } = useLanguage();
  const info = placeholderPages[page] || { titleBn: page, titleEn: page };

  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {language === 'bn' ? info.titleBn : info.titleEn}
          </h1>
          <p className="text-muted-foreground">
            {language === 'bn' ? 'এই পেজটি শীঘ্রই তৈরি হবে' : 'This page is coming soon'}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPlaceholder;
