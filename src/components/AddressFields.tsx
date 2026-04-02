import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SearchableSelect, { type SelectOption } from '@/components/SearchableSelect';
import { useMergedAddressData } from '@/hooks/useAddressData';
import { useAddressLevels } from '@/components/admin/AddressLevelManager';

export interface AddressData {
  division: string;
  district: string;
  upazila: string;
  union: string;
  postOffice: string;
  village: string;
  [key: string]: string; // support dynamic custom fields
}

interface AddressFieldsProps {
  label: string;
  value: AddressData;
  onChange: (data: AddressData) => void;
  disabled?: boolean;
}

// Default labels used as fallback if address_levels table is empty
const DEFAULT_LABELS: Record<string, { en: string; bn: string }> = {
  division: { en: 'Division', bn: 'বিভাগ' },
  district: { en: 'District', bn: 'জেলা' },
  upazila: { en: 'Upazila / City Corp / Municipality', bn: 'উপজেলা / সিটি কর্পোরেশন / পৌরসভা' },
  union: { en: 'Union / Ward', bn: 'ইউনিয়ন / ওয়ার্ড' },
  post_office: { en: 'Post Office', bn: 'পোস্ট অফিস' },
  village: { en: 'Village', bn: 'গ্রাম' },
};

// Map address_levels keys to AddressData field keys
const LEVEL_KEY_TO_FIELD: Record<string, string> = {
  division: 'division',
  district: 'district',
  upazila: 'upazila',
  union: 'union',
  post_office: 'postOffice',
  village: 'village',
};

const FIELD_TO_LEVEL_KEY: Record<string, string> = {
  division: 'division',
  district: 'district',
  upazila: 'upazila',
  union: 'union',
  postOffice: 'post_office',
  village: 'village',
};

const AddressFields = ({ label, value, onChange, disabled }: AddressFieldsProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getDivisions, getDistricts, getUpazilas, getUnions, getPostOffices } = useMergedAddressData();
  const { data: addressLevels = [] } = useAddressLevels();

  // Build dynamic label map from address_levels table
  const levelLabels = useMemo(() => {
    const labels: Record<string, { en: string; bn: string }> = { ...DEFAULT_LABELS };
    addressLevels.forEach(level => {
      labels[level.key] = { en: level.label, bn: level.label_bn };
    });
    return labels;
  }, [addressLevels]);

  // Get sorted active levels - use DB order if available, else default
  const sortedLevelKeys = useMemo(() => {
    if (addressLevels.length > 0) {
      return addressLevels
        .filter(l => l.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(l => l.key);
    }
    return ['division', 'district', 'upazila', 'union', 'post_office', 'village'];
  }, [addressLevels]);

  // Known data-providing levels
  const KNOWN_LEVELS = new Set(['division', 'district', 'upazila', 'union', 'post_office', 'village']);

  const divisions = getDivisions();
  const districts = value.division ? getDistricts(value.division) : [];
  const upazilas = value.division && value.district ? getUpazilas(value.division, value.district) : [];
  const unions = value.division && value.district && value.upazila ? getUnions(value.division, value.district, value.upazila) : [];
  const postOffices = value.division && value.district && value.upazila ? getPostOffices(value.division, value.district, value.upazila) : [];

  const getFieldKey = (levelKey: string) => LEVEL_KEY_TO_FIELD[levelKey] || levelKey;

  const update = (field: string, val: string) => {
    const newData = { ...value, [field]: val };
    // Clear downstream fields based on sorted level order
    const fieldLevelKey = FIELD_TO_LEVEL_KEY[field] || field;
    const fieldIndex = sortedLevelKeys.indexOf(fieldLevelKey);
    if (fieldIndex >= 0) {
      for (let i = fieldIndex + 1; i < sortedLevelKeys.length; i++) {
        const downstreamField = getFieldKey(sortedLevelKeys[i]);
        newData[downstreamField] = '';
      }
    }
    onChange(newData);
  };

  const placeholder = bn ? 'নির্বাচন করুন' : 'Select';
  const searchPh = bn ? 'টাইপ করে খুঁজুন...' : 'Type to search...';
  const addLabel = bn ? 'যোগ করুন' : 'Add';

  const getLabel = (levelKey: string) => {
    const l = levelLabels[levelKey];
    return l ? (bn ? l.bn : l.en) : levelKey;
  };

  const divisionOptions: SelectOption[] = divisions.map(d => ({
    value: d.nameEn, label: bn ? d.name : d.nameEn,
  }));

  const districtOptions: SelectOption[] = districts.map(d => ({
    value: d.nameEn, label: bn ? d.name : d.nameEn,
  }));

  const upazilaOptions: SelectOption[] = useMemo(() => {
    return upazilas.map(u => ({
      value: u.nameEn,
      label: bn ? u.name : u.nameEn,
      group: u.type === 'city_corporation' ? 'cc' : u.type === 'municipality' ? 'muni' : 'upazila',
    }));
  }, [upazilas, bn]);

  const upazilaGroups = useMemo(() => {
    const groups = [];
    if (upazilas.some(u => u.type === 'city_corporation')) groups.push({ key: 'cc', label: bn ? '🏛️ সিটি কর্পোরেশন' : '🏛️ City Corporation' });
    if (upazilas.some(u => u.type === 'municipality')) groups.push({ key: 'muni', label: bn ? '🏘️ পৌরসভা' : '🏘️ Municipality' });
    if (upazilas.some(u => !u.type || u.type === 'upazila')) groups.push({ key: 'upazila', label: bn ? '🏡 উপজেলা' : '🏡 Upazila' });
    return groups;
  }, [upazilas, bn]);

  const unionOptions: SelectOption[] = unions.map(u => ({
    value: u.nameEn, label: bn ? u.name : u.nameEn,
  }));

  const postOfficeOptions: SelectOption[] = postOffices.map(po => ({
    value: `${po.nameEn} - ${po.code}`, label: `${po.nameEn} - ${po.code}`,
  }));

  // Render a field based on level key
  const renderField = (levelKey: string) => {
    const fieldKey = getFieldKey(levelKey);
    const fieldLabel = getLabel(levelKey);

    switch (levelKey) {
      case 'division':
        return (
          <div key={levelKey}>
            <Label>{fieldLabel}</Label>
            <SearchableSelect
              options={divisionOptions}
              value={value.division}
              onValueChange={(v) => update('division', v)}
              placeholder={placeholder}
              searchPlaceholder={searchPh}
              disabled={disabled}
              allowCustom
              customLabel={addLabel}
              className="mt-1"
            />
          </div>
        );
      case 'district':
        return (
          <div key={levelKey}>
            <Label>{fieldLabel}</Label>
            <SearchableSelect
              options={districtOptions}
              value={value.district}
              onValueChange={(v) => update('district', v)}
              placeholder={placeholder}
              searchPlaceholder={searchPh}
              disabled={disabled || !value.division}
              allowCustom
              customLabel={addLabel}
              className="mt-1"
            />
          </div>
        );
      case 'upazila':
        return (
          <div key={levelKey}>
            <Label>{fieldLabel}</Label>
            <SearchableSelect
              options={upazilaOptions}
              value={value.upazila}
              onValueChange={(v) => update('upazila', v)}
              placeholder={placeholder}
              searchPlaceholder={searchPh}
              disabled={disabled || !value.district}
              groups={upazilaGroups}
              allowCustom
              customLabel={addLabel}
              className="mt-1"
            />
          </div>
        );
      case 'union':
        return (
          <div key={levelKey}>
            <Label>{fieldLabel}</Label>
            <SearchableSelect
              options={unionOptions}
              value={value.union}
              onValueChange={(v) => update('union', v)}
              placeholder={placeholder}
              searchPlaceholder={searchPh}
              disabled={disabled || !value.upazila}
              allowCustom
              customLabel={addLabel}
              className="mt-1"
            />
          </div>
        );
      case 'post_office':
        return (
          <div key={levelKey}>
            <Label>{fieldLabel}</Label>
            {postOffices.length > 0 ? (
              <SearchableSelect
                options={postOfficeOptions}
                value={value.postOffice}
                onValueChange={(v) => update('postOffice', v)}
                placeholder={placeholder}
                searchPlaceholder={searchPh}
                disabled={disabled || !value.upazila}
                allowCustom
                customLabel={addLabel}
                className="mt-1"
              />
            ) : (
              <Input className="bg-background mt-1" value={value.postOffice} onChange={(e) => update('postOffice', e.target.value)} disabled={disabled} placeholder={bn ? 'পোস্ট অফিস লিখুন' : 'Enter post office'} />
            )}
          </div>
        );
      case 'village':
        return (
          <div key={levelKey}>
            <Label>{fieldLabel}</Label>
            <Input className="bg-background mt-1" value={value.village || ''} onChange={(e) => update('village', e.target.value)} disabled={disabled} />
          </div>
        );
      default:
        // Custom/unknown levels render as text input
        return (
          <div key={levelKey}>
            <Label>{fieldLabel}</Label>
            <Input 
              className="bg-background mt-1" 
              value={value[fieldKey] || ''} 
              onChange={(e) => update(fieldKey, e.target.value)} 
              disabled={disabled} 
              placeholder={bn ? `${fieldLabel} লিখুন` : `Enter ${fieldLabel}`}
            />
          </div>
        );
    }
  };

  return (
    <div>
      <h3 className="text-md font-display font-semibold text-foreground mb-3">{label}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedLevelKeys.map(levelKey => renderField(levelKey))}
      </div>
    </div>
  );
};

export default AddressFields;
