import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Globe, Save, Image, Upload } from 'lucide-react';
import { toast } from 'sonner';

const AdminWebsite = () => {
  const { language } = useLanguage();
  const [sections, setSections] = useState({
    banner: true,
    principalMessage: true,
    classInfo: true,
    teachersList: false,
    studentInfo: false,
    latestNotice: true,
    admissionButtons: true,
    gallery: true,
    donation: false,
    feePayment: false,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections({ ...sections, [key]: !sections[key] });
  };

  const sectionLabels: { key: keyof typeof sections; bn: string; en: string; }[] = [
    { key: 'banner', bn: 'ব্যানার', en: 'Banner' },
    { key: 'principalMessage', bn: 'অধ্যক্ষের বাণী', en: "Principal's Message" },
    { key: 'classInfo', bn: 'শ্রেণী তথ্য', en: 'Class Info' },
    { key: 'teachersList', bn: 'শিক্ষক তালিকা', en: 'Teachers List' },
    { key: 'studentInfo', bn: 'ছাত্র তথ্য', en: 'Student Info' },
    { key: 'latestNotice', bn: 'সর্বশেষ নোটিশ', en: 'Latest Notices' },
    { key: 'admissionButtons', bn: 'ভর্তি বাটন', en: 'Admission Buttons' },
    { key: 'gallery', bn: 'গ্যালারি', en: 'Gallery' },
    { key: 'donation', bn: 'দান সেকশন', en: 'Donation Section' },
    { key: 'feePayment', bn: 'ফি পেমেন্ট', en: 'Fee Payment' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'ওয়েবসাইট নিয়ন্ত্রণ' : 'Website Control'}</h1>

        {/* Madrasa Info */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'মাদরাসার তথ্য' : 'Madrasa Information'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>{language === 'bn' ? 'মাদরাসার নাম' : 'Madrasa Name'}</Label><Input className="bg-background mt-1" defaultValue="নূরুল ইসলাম মাদরাসা" /></div>
            <div><Label>{language === 'bn' ? 'ইংরেজি নাম' : 'English Name'}</Label><Input className="bg-background mt-1" defaultValue="Nurul Islam Madrasa" /></div>
            <div><Label>{language === 'bn' ? 'ঠিকানা' : 'Address'}</Label><Input className="bg-background mt-1" defaultValue="ঢাকা, বাংলাদেশ" /></div>
            <div><Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label><Input className="bg-background mt-1" defaultValue="+880 1XXX-XXXXXX" /></div>
            <div><Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label><Input className="bg-background mt-1" defaultValue="info@madrasa.edu.bd" /></div>
            <div>
              <Label>{language === 'bn' ? 'লোগো' : 'Logo'}</Label>
              <div className="mt-1 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center"><Image className="w-6 h-6 text-muted-foreground" /></div>
                <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> {language === 'bn' ? 'আপলোড' : 'Upload'}</Button>
              </div>
            </div>
          </div>
          <Button className="btn-primary-gradient mt-4" onClick={() => toast.success(language === 'bn' ? 'তথ্য সংরক্ষিত' : 'Info saved')}>
            <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </div>

        {/* Section Visibility */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'সেকশন দেখানো/লুকানো' : 'Section Show/Hide'}</h3>
          <div className="space-y-4">
            {sectionLabels.map(s => (
              <div key={s.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm font-medium text-foreground">{language === 'bn' ? s.bn : s.en}</span>
                <Switch checked={sections[s.key]} onCheckedChange={() => toggleSection(s.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* About Content */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'আমাদের সম্পর্কে (সম্পাদনা)' : 'About Page (Edit)'}</h3>
          <Textarea className="bg-background min-h-[200px]" defaultValue="নূরুল ইসলাম মাদরাসা বাংলাদেশের একটি ঐতিহ্যবাহী ইসলামিক শিক্ষা প্রতিষ্ঠান। আমাদের লক্ষ্য হলো কুরআন ও সুন্নাহর আলোকে ছাত্রদের আদর্শ মানুষ হিসেবে গড়ে তোলা।" />
          <Button className="btn-primary-gradient mt-4" onClick={() => toast.success(language === 'bn' ? 'সংরক্ষিত' : 'Saved')}>
            <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </div>

        {/* Principal Message */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'অধ্যক্ষের বাণী (সম্পাদনা)' : "Principal's Message (Edit)"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div><Label>{language === 'bn' ? 'নাম' : 'Name'}</Label><Input className="bg-background mt-1" defaultValue="মুফতি আব্দুল্লাহ" /></div>
            <div><Label>{language === 'bn' ? 'পদবী' : 'Title'}</Label><Input className="bg-background mt-1" defaultValue="অধ্যক্ষ" /></div>
          </div>
          <Textarea className="bg-background min-h-[120px]" defaultValue="আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম।" />
          <Button className="btn-primary-gradient mt-4" onClick={() => toast.success(language === 'bn' ? 'সংরক্ষিত' : 'Saved')}>
            <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWebsite;
