import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const countryCodes = [
  { code: '+880', country: '🇧🇩 BD', name: 'Bangladesh' },
  { code: '+91', country: '🇮🇳 IN', name: 'India' },
  { code: '+966', country: '🇸🇦 SA', name: 'Saudi Arabia' },
  { code: '+971', country: '🇦🇪 AE', name: 'UAE' },
  { code: '+974', country: '🇶🇦 QA', name: 'Qatar' },
  { code: '+965', country: '🇰🇼 KW', name: 'Kuwait' },
  { code: '+968', country: '🇴🇲 OM', name: 'Oman' },
  { code: '+973', country: '🇧🇭 BH', name: 'Bahrain' },
  { code: '+60', country: '🇲🇾 MY', name: 'Malaysia' },
  { code: '+44', country: '🇬🇧 UK', name: 'United Kingdom' },
  { code: '+1', country: '🇺🇸 US', name: 'United States' },
];

interface PhoneInputProps {
  label: string;
  value?: string;
  countryCode?: string;
  onChange?: (phone: string, countryCode: string) => void;
  required?: boolean;
}

const PhoneInput = ({ label, value = '', countryCode = '+880', onChange, required }: PhoneInputProps) => {
  const [code, setCode] = useState(countryCode);
  const [phone, setPhone] = useState(value);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onChange?.(phone, newCode);
  };

  const handlePhoneChange = (newPhone: string) => {
    const cleaned = newPhone.replace(/[^\d]/g, '');
    setPhone(cleaned);
    onChange?.(cleaned, code);
  };

  return (
    <div>
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      <div className="flex gap-2 mt-1">
        <Select value={code} onValueChange={handleCodeChange}>
          <SelectTrigger className="bg-background w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.country} {c.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="bg-background flex-1"
          type="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="1XXXXXXXXX"
        />
      </div>
    </div>
  );
};

export default PhoneInput;
