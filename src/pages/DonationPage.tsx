import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Smartphone, CreditCard, Building } from 'lucide-react';
import { toast } from 'sonner';

const DonationPage = () => {
  const { language } = useLanguage();

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(language === 'bn' ? 'দানের জন্য ধন্যবাদ! আপনার লেনদেন প্রক্রিয়াধীন।' : 'Thank you for your donation! Transaction is being processed.');
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-accent/20 mx-auto mb-4 flex items-center justify-center">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {language === 'bn' ? 'দান করুন' : 'Make a Donation'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'bn' ? 'আপনার দান ছাত্রদের শিক্ষার জন্য ব্যবহৃত হবে' : 'Your donation will be used for student education'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleDonate}>
          <div className="card-elevated p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'আপনার নাম' : 'Your Name'}</label>
                <Input className="bg-background mt-1" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}</label>
                <Input className="bg-background mt-1" type="tel" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</label>
                <Input type="number" className="bg-background mt-1" required placeholder="1000" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}</label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="card">{language === 'bn' ? 'ক্রেডিট/ডেবিট কার্ড' : 'Credit/Debit Card'}</SelectItem>
                    <SelectItem value="bank">{language === 'bn' ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</SelectItem>
                    <SelectItem value="manual">{language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Payment Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-elevated p-4 text-center">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{language === 'bn' ? 'মোবাইল ব্যাংকিং' : 'Mobile Banking'}</p>
              <p className="text-xs text-muted-foreground mt-1">bKash / Nagad / Rocket</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{language === 'bn' ? 'কার্ড পেমেন্ট' : 'Card Payment'}</p>
              <p className="text-xs text-muted-foreground mt-1">Visa / Mastercard</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Building className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{language === 'bn' ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</p>
              <p className="text-xs text-muted-foreground mt-1">{language === 'bn' ? 'সরাসরি' : 'Direct'}</p>
            </div>
          </div>

          <Button type="submit" className="btn-primary-gradient w-full text-lg py-6">
            <Heart className="w-5 h-5 mr-2" /> {language === 'bn' ? 'দান করুন' : 'Donate Now'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
};

export default DonationPage;
