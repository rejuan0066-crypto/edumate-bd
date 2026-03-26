import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const StudentInfoPage = () => {
  const { language } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">
          {language === 'bn' ? 'ছাত্র তথ্য' : 'Student Info'}
        </h1>
        <div className="card-elevated p-6 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={language === 'bn' ? 'নাম, রোল বা রেজিস্ট্রেশন নম্বর দিয়ে খুঁজুন...' : 'Search by name, roll or reg no...'}
              className="pl-10 bg-background"
            />
          </div>
          <p className="text-center text-muted-foreground mt-8 text-sm">
            {language === 'bn' ? 'ছাত্রের তথ্য খুঁজতে উপরে সার্চ করুন' : 'Search above to find student information'}
          </p>
        </div>
      </div>
    </PublicLayout>
  );
};

export default StudentInfoPage;
