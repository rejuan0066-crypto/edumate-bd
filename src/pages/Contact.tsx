import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const Contact = () => {
  const { t, language } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">{t('contact')}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card-elevated p-8">
            <h2 className="text-xl font-display font-bold mb-6">
              {language === 'bn' ? 'বার্তা পাঠান' : 'Send Message'}
            </h2>
            <form className="space-y-4">
              <Input placeholder={language === 'bn' ? 'আপনার নাম' : 'Your Name'} className="bg-background" />
              <Input placeholder={t('email')} type="email" className="bg-background" />
              <Input placeholder={t('phone')} className="bg-background" />
              <Textarea placeholder={language === 'bn' ? 'আপনার বার্তা' : 'Your Message'} rows={5} className="bg-background" />
              <Button className="btn-primary-gradient w-full">{language === 'bn' ? 'পাঠান' : 'Send'}</Button>
            </form>
          </div>
          <div className="space-y-6">
            {[
              { icon: MapPin, label: t('address'), value: 'ঢাকা, বাংলাদেশ' },
              { icon: Phone, label: t('phone'), value: '+880 1XXX-XXXXXX' },
              { icon: Mail, label: t('email'), value: 'info@madrasa.edu.bd' },
            ].map((item, i) => (
              <div key={i} className="card-elevated p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;
