import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, ShieldCheck } from 'lucide-react';
import { cleanRoleSuffix } from '@/lib/paymentUtils';
import { useSignatoryAuthorities } from '@/hooks/useSignatoryAuthorities';

interface CollectorSelectorProps {
  value: string;
  onChange: (collectorName: string) => void;
  defaultCollectorName?: string;
  label?: string;
  className?: string;
}

export interface CollectorOption {
  id: string;
  name: string;
  label: string;
  category: 'signatory' | 'staff' | 'custom_fixed';
  isCurrentUser?: boolean;
}

const normalizePersonName = (n: string | null | undefined): string => {
  if (!n) return '';
  return cleanRoleSuffix(n)
    .replace(/[ঃ:.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

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

  const cleanDefault = cleanRoleSuffix(defaultCollectorName);

  // Fetch signatory authorities and authorized collectors config
  const {
    authorities = [],
    allRoles = [],
    authorizedCollectors = { mode: 'selected', role_keys: ['accountant_cashier'], staff_ids: [], custom_names: [] },
  } = useSignatoryAuthorities();

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

  // Build the list of collectors based on Signatory Authorities configuration
  const collectorOptions = useMemo<CollectorOption[]>(() => {
    const list: CollectorOption[] = [];
    const seenNames = new Set<string>();
    const normDefault = normalizePersonName(cleanDefault);

    const isSelectedMode = authorizedCollectors?.mode !== 'all';
    const allowedRoleKeys = authorizedCollectors?.role_keys || ['accountant_cashier'];
    const allowedStaffIds = authorizedCollectors?.staff_ids || [];
    const customFixedNames = authorizedCollectors?.custom_names || [];

    // 1. Authorized Signatories
    allRoles.forEach((roleDef) => {
      if (!isSelectedMode || allowedRoleKeys.includes(roleDef.key)) {
        const authItem = authorities.find((a) => a.role_key === roleDef.key);
        const name = (authItem?.person_name_bn || authItem?.person_name_en || '').trim();
        const norm = normalizePersonName(name);
        if (name && !seenNames.has(norm)) {
          seenNames.add(norm);
          const isUser = !!normDefault && norm === normDefault;
          const roleLabel = bn ? roleDef.label_bn : roleDef.label_en;
          const youTag = isUser ? ` — ${bn ? 'আপনি' : 'You'}` : '';
          list.push({
            id: `sig_${roleDef.key}`,
            name,
            label: `${name} (${roleLabel}${youTag})`,
            category: 'signatory',
            isCurrentUser: isUser,
          });
        }
      }
    });

    // 2. Authorized Staff
    staffList.forEach((st: any) => {
      const isAllowed = !isSelectedMode || allowedStaffIds.includes(st.id);
      if (isAllowed) {
        const name = (st.name_bn || st.name_en || (st.staff_id ? `User ID: ${st.staff_id}` : '')).trim();
        const norm = normalizePersonName(name);
        if (name && !seenNames.has(norm)) {
          seenNames.add(norm);
          const isUser = !!normDefault && norm === normDefault;
          const youTag = isUser ? ` — ${bn ? 'আপনি' : 'You'}` : '';
          const des = st.designation ? ` (${st.designation}${youTag})` : (isUser ? ` (${bn ? 'আপনি' : 'You'})` : '');
          list.push({
            id: `staff_${st.id}`,
            name,
            label: `${name}${des}`,
            category: 'staff',
            isCurrentUser: isUser,
          });
        }
      }
    });

    // 3. Custom pre-configured collector names
    customFixedNames.forEach((cName) => {
      const trimmed = (cName || '').trim();
      const norm = normalizePersonName(trimmed);
      if (trimmed && !seenNames.has(norm)) {
        seenNames.add(norm);
        const isUser = !!normDefault && norm === normDefault;
        const youTag = isUser ? ` (${bn ? 'আপনি' : 'You'})` : '';
        list.push({
          id: `custom_fixed_${trimmed}`,
          name: trimmed,
          label: `${trimmed}${youTag}`,
          category: 'custom_fixed',
          isCurrentUser: isUser,
        });
      }
    });

    // Fallback: If in selected mode but list is completely empty, include all staff
    if (list.length === 0 && staffList.length > 0) {
      staffList.forEach((st: any) => {
        const name = (st.name_bn || st.name_en || '').trim();
        const norm = normalizePersonName(name);
        if (name && !seenNames.has(norm)) {
          seenNames.add(norm);
          const isUser = !!normDefault && norm === normDefault;
          const youTag = isUser ? ` — ${bn ? 'আপনি' : 'You'}` : '';
          const des = st.designation ? ` (${st.designation}${youTag})` : (isUser ? ` (${bn ? 'আপনি' : 'You'})` : '');
          list.push({
            id: `staff_${st.id}`,
            name,
            label: `${name}${des}`,
            category: 'staff',
            isCurrentUser: isUser,
          });
        }
      });
    }

    return list;
  }, [authorities, allRoles, authorizedCollectors, staffList, bn, cleanDefault]);

  // Check if current user is already in the list
  const matchedCurrentUserOption = useMemo(() => {
    if (!cleanDefault) return undefined;
    const normDefault = normalizePersonName(cleanDefault);
    return collectorOptions.find(
      (opt) =>
        opt.isCurrentUser ||
        normalizePersonName(opt.name) === normDefault ||
        cleanRoleSuffix(opt.name) === cleanDefault
    );
  }, [collectorOptions, cleanDefault]);

  // Sync initial state
  useEffect(() => {
    if (!value && cleanDefault) {
      const defaultId = matchedCurrentUserOption ? matchedCurrentUserOption.id : 'default';
      onChange(cleanDefault);
      setSelectedOption(defaultId);
    } else if (value) {
      const normVal = normalizePersonName(value);
      const normDefault = normalizePersonName(cleanDefault);

      if (normVal === normDefault) {
        setSelectedOption(matchedCurrentUserOption ? matchedCurrentUserOption.id : 'default');
      } else {
        const found = collectorOptions.find(
          (opt) =>
            normalizePersonName(opt.name) === normVal ||
            cleanRoleSuffix(opt.name) === cleanRoleSuffix(value) ||
            opt.name === value ||
            opt.label === value
        );
        if (found) {
          setSelectedOption(found.id);
        } else {
          setSelectedOption('custom');
          setCustomName(value);
        }
      }
    }
  }, [value, cleanDefault, collectorOptions, matchedCurrentUserOption]);

  const handleSelect = (val: string) => {
    setSelectedOption(val);
    if (val === 'default') {
      onChange(cleanDefault);
    } else if (val === 'custom') {
      onChange(customName.trim());
    } else {
      const opt = collectorOptions.find((o) => o.id === val);
      const name = opt ? opt.name : '';
      onChange(cleanRoleSuffix(name));
    }
  };

  const handleCustomInput = (text: string) => {
    setCustomName(text);
    onChange(text);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          {label || (bn ? 'আদায়কারী (টাকা গ্রহণকারী)' : 'Collector / Received By')}
        </span>
        {authorizedCollectors?.mode === 'selected' && collectorOptions.length > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            {bn ? 'অনুমোদিত তালিকা' : 'Authorized'}
          </span>
        )}
      </Label>

      <Select value={selectedOption} onValueChange={handleSelect}>
        <SelectTrigger className="w-full bg-background text-xs h-9">
          <SelectValue placeholder={bn ? 'আদায়কারী নির্বাচন করুন...' : 'Select collector...'} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {cleanDefault && !matchedCurrentUserOption && (
            <SelectItem value="default" className="text-xs font-semibold text-primary">
              {cleanDefault.startsWith('User ID:') ? `${cleanDefault} (${bn ? 'প্রোফাইল বিহীন — আপনি' : 'No Profile — You'})` : `${cleanDefault} (${bn ? 'বর্তমান ইউজার / আপনি' : 'Current User / You'})`}
            </SelectItem>
          )}

          {collectorOptions.map((opt) => (
            <SelectItem key={opt.id} value={opt.id} className="text-xs">
              <div className="flex items-center justify-between gap-2 w-full">
                <span className={opt.isCurrentUser ? 'font-semibold text-primary' : ''}>
                  {opt.label}
                </span>
                {opt.category === 'signatory' && (
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium shrink-0">
                    {bn ? 'কর্তৃপক্ষ' : 'Signatory'}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}

          <SelectItem value="custom" className="text-xs text-muted-foreground font-medium border-t mt-1">
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
