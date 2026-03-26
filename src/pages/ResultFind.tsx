import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

const ResultFind = () => {
  const { t, language } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">{t('result')}</h1>
        <div className="card-elevated p-8 max-w-2xl mx-auto">
          <h2 className="text-xl font-display font-bold mb-6 text-center">
            {language === 'bn' ? 'ফলাফল অনুসন্ধান' : 'Search Result'}
          </h2>
          <form className="space-y-4">
            <Select>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={language === 'bn' ? 'পরীক্ষার বছর নির্বাচন' : 'Select Exam Year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">২০২৬</SelectItem>
                <SelectItem value="2025">২০২৫</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={language === 'bn' ? 'শ্রেণী নির্বাচন' : 'Select Class'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">১ম শ্রেণী</SelectItem>
                <SelectItem value="2">২য় শ্রেণী</SelectItem>
                <SelectItem value="3">৩য় শ্রেণী</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={language === 'bn' ? 'রোল নম্বর' : 'Roll Number'} className="bg-background" />
            <Button className="btn-primary-gradient w-full flex items-center gap-2">
              <Search className="w-4 h-4" /> {t('search')}
            </Button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ResultFind;
