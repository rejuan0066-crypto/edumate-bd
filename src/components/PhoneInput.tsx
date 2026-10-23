import { useState, useEffect } from 'react';
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
  error?: boolean;
}

function sanitizeNumberForCode(raw: string, code: string): string {
  let cleaned = raw.replace(/[^\d]/g, '');
  if (code === '+880') {
    // Strip redundant 880 or leading 0s
    while (cleaned.startsWith('880')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.replace(/^0+/, '');
    }
  }
  return cleaned;
}

const PhoneInput = ({ label, value = '', countryCode = '+880', onChange, required, error }: PhoneInputProps) => {
  const [code, setCode] = useState(countryCode || '+880');
  const [phone, setPhone] = useState(() => sanitizeNumberForCode(value, countryCode || '+880'));

  // Sync internal state if parent value or countryCode changes
  useEffect(() => {
    setCode(countryCode || '+880');
  }, [countryCode]);

  useEffect(() => {
    setPhone(sanitizeNumberForCode(value || '', code));
  }, [value, code]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    const cleaned = sanitizeNumberForCode(phone, newCode);
    setPhone(cleaned);
    onChange?.(cleaned, newCode);
  };

  const handlePhoneChange = (newPhone: string) => {
    const cleaned = sanitizeNumberForCode(newPhone, code);
    setPhone(cleaned);
    onChange?.(cleaned, code);
  };

  return (
    <div>
      <Label className={error ? 'text-destructive' : ''}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2 mt-1">
        <Select value={code} onValueChange={handleCodeChange}>
          <SelectTrigger className={`bg-background w-28 shrink-0 ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.country} {c.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className={`bg-background flex-1 ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
          type="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={code === '+880' ? '1XXXXXXXXX' : 'Phone number'}
        />
      </div>
    </div>
  );
};

export default PhoneInput;
