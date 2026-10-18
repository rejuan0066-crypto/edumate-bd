import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, User } from 'lucide-react';

interface CollectorSelectorProps {
  value: string;
  onChange: (collectorName: string) => void;
  defaultCollectorName?: string;
  label?: string;
  className?: string;
}

export default function CollectorSelector({
  value,
  onChange,
  defaultCollectorName = '',
  label,
  className = '',
}: CollectorSelectorProps) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [selectedOption, setSelectedOption] = useState<string>('default');
  const [customName, setCustomName] = useState<string>('');

  // Fetch active staff/teachers
  const { data: staffList = [] } = useQuery({
    queryKey: ['active_staff_collectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, staff_id, designation')
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('name_bn');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sync initial state
  useEffect(() => {
    if (!value && defaultCollectorName) {
      onChange(defaultCollectorName);
      setSelectedOption('default');
    } else if (value) {
      if (value === defaultCollectorName) {
        setSelectedOption('default');
      } else {
        const found = staffList.find(
          (s: any) => s.name_bn === value || s.name_en === value || `${s.name_bn || s.name_en} (${s.designation || ''})`.trim() === value
        );
        if (found) {
          setSelectedOption(found.id);
        } else {
          setSelectedOption('custom');
          setCustomName(value);
        }
      }
    }
  }, [value, defaultCollectorName, staffList]);

  const handleSelect = (val: string) => {
    setSelectedOption(val);
    if (val === 'default') {
      onChange(defaultCollectorName);
    } else if (val === 'custom') {
      onChange(customName.trim());
    } else {
      const staff = staffList.find((s: any) => s.id === val);
      const name = staff ? (staff.name_bn || staff.name_en || '') : '';
      onChange(name);
    }
  };

  const handleCustomInput = (text: string) => {
    setCustomName(text);
    onChange(text);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <UserCheck className="w-3.5 h-3.5 text-primary" />
        {label || (bn ? 'আদায়কারী (টাকা গ্রহণকারী)' : 'Collector / Received By')}
      </Label>
      <Select value={selectedOption} onValueChange={handleSelect}>
        <SelectTrigger className="w-full bg-background text-xs">
          <SelectValue placeholder={bn ? 'আদায়কারী নির্বাচন করুন...' : 'Select collector...'} />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {defaultCollectorName && (
            <SelectItem value="default" className="text-xs font-semibold text-primary">
              {defaultCollectorName} ({bn ? 'বর্তমান ইউজার / আপনি' : 'Current User / You'})
            </SelectItem>
          )}
          {staffList.map((st: any) => {
            const displayName = st.name_bn || st.name_en;
            const extra = st.designation ? ` (${st.designation})` : '';
            return (
              <SelectItem key={st.id} value={st.id} className="text-xs">
                {displayName}{extra}
              </SelectItem>
            );
          })}
          <SelectItem value="custom" className="text-xs text-muted-foreground font-medium">
            ➕ {bn ? 'অন্যান্য / কাস্টম নাম লিখুন...' : 'Other / Type custom name...'}
          </SelectItem>
        </SelectContent>
      </Select>

      {selectedOption === 'custom' && (
        <div className="pt-1">
          <Input
            value={customName}
            onChange={(e) => handleCustomInput(e.target.value)}
            placeholder={bn ? 'আদায়কারীর নাম লিখুন...' : 'Enter collector name...'}
            className="text-xs bg-background h-8"
          />
        </div>
      )}
    </div>
  );
}
