import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { verifyCard } from '@/hooks/useApiVerification';

interface CardVerifySectionProps {
  formType: 'student' | 'staff';
  isEnabled: boolean;
  onDataReceived: (data: Record<string, string>) => void;
}

const CardVerifySection = ({ formType, isEnabled, onDataReceived }: CardVerifySectionProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  if (!isEnabled) return null;

  const handleVerify = async () => {
    if (!cardNumber.trim()) {
      toast.error(bn ? 'কার্ড নম্বর দিন' : 'Enter card number');
      return;
    }

    setLoading(true);
    setVerified(false);
    try {
      const result = await verifyCard(cardNumber.trim(), formType);
      if (result?.data && Object.keys(result.data).length > 0) {
        onDataReceived(result.data);
        setVerified(true);
        toast.success(bn ? 'তথ্য সফলভাবে লোড হয়েছে' : 'Data loaded successfully');
      } else {
        toast.warning(bn ? 'কোনো তথ্য পাওয়া যায়নি' : 'No data found');
      }
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'ভেরিফিকেশন ব্যর্থ' : 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {bn ? 'কার্ড ভেরিফিকেশন (অটো-ফিল)' : 'Card Verification (Auto-fill)'}
        </h3>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <Label className="text-xs text-muted-foreground">
            {bn ? 'আইডি / কার্ড নম্বর' : 'ID / Card Number'}
          </Label>
          <Input
            className="mt-1 bg-background"
            value={cardNumber}
            onChange={(e) => { setCardNumber(e.target.value); setVerified(false); }}
            placeholder={bn ? 'কার্ড নম্বর লিখুন...' : 'Enter card number...'}
            disabled={loading}
          />
        </div>
        <Button
          type="button"
          onClick={handleVerify}
          disabled={loading || !cardNumber.trim()}
          className={verified ? 'bg-green-600 hover:bg-green-700' : 'btn-primary-gradient'}
          size="default"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />{bn ? 'যাচাই হচ্ছে...' : 'Verifying...'}</>
          ) : verified ? (
            <><ShieldCheck className="w-4 h-4 mr-2" />{bn ? 'ভেরিফাইড' : 'Verified'}</>
          ) : (
            <><ShieldCheck className="w-4 h-4 mr-2" />{bn ? 'ভেরিফাই করুন' : 'Verify Card'}</>
          )}
        </Button>
      </div>
      {verified && (
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          {bn ? 'ফর্মের ঘরগুলো অটো-ফিল হয়েছে। প্রয়োজনে পরিবর্তন করতে পারেন।' : 'Form fields auto-filled. You can modify if needed.'}
        </p>
      )}
    </div>
  );
};

export default CardVerifySection;
