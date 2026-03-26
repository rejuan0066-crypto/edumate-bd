import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CreditCard, Smartphone, Building } from 'lucide-react';
import { toast } from 'sonner';

const FeePaymentPage = () => {
  const { language } = useLanguage();
  const [feeType, setFeeType] = useState('');

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(language === 'bn' ? 'পেমেন্ট সফলভাবে প্রক্রিয়াধীন' : 'Payment processing successfully');
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 text-center">
          {language === 'bn' ? 'ফি পরিশোধ' : 'Fee Payment'}
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          {language === 'bn' ? 'অনলাইনে ফি পরিশোধ করুন' : 'Pay your fees online'}
        </p>

        <form className="space-y-6" onSubmit={handlePayment}>
          <div className="card-elevated p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'ফি এর ধরন' : 'Fee Type'}</label>
                <Select value={feeType} onValueChange={setFeeType}>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admission">{language === 'bn' ? 'ভর্তি ফি' : 'Admission Fee'}</SelectItem>
                    <SelectItem value="monthly">{language === 'bn' ? 'মাসিক ফি' : 'Monthly Fee'}</SelectItem>
                    <SelectItem value="exam">{language === 'bn' ? 'পরীক্ষা ফি' : 'Exam Fee'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'ছাত্রের রোল' : 'Student Roll'}</label>
                <Input className="bg-background mt-1" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'ভর্তি সেশন' : 'Admission Session'}</label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">২০২৬</SelectItem>
                    <SelectItem value="2025">২০২৫</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</label>
                <Input type="number" className="bg-background mt-1" required placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}</label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="card">{language === 'bn' ? 'কার্ড' : 'Card'}</SelectItem>
                    <SelectItem value="bank">{language === 'bn' ? 'ব্যাংক' : 'Bank'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-elevated p-4 text-center">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">bKash / Nagad</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{language === 'bn' ? 'কার্ড' : 'Card'}</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Building className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{language === 'bn' ? 'ব্যাংক' : 'Bank'}</p>
            </div>
          </div>

          <Button type="submit" className="btn-primary-gradient w-full text-lg py-6">
            <CreditCard className="w-5 h-5 mr-2" /> {language === 'bn' ? 'পেমেন্ট করুন' : 'Make Payment'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
};

export default FeePaymentPage;
