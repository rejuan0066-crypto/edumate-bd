import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SearchableSelect, { type SelectOption } from '@/components/SearchableSelect';
import { bangladeshAddresses, type District, type Upazila, type Union, type PostOffice } from '@/data/bangladeshAddresses';

export interface AddressData {
  division: string;
  district: string;
  upazila: string;
  union: string;
  postOffice: string;
  village: string;
}

interface AddressFieldsProps {
  label: string;
  value: AddressData;
  onChange: (data: AddressData) => void;
  disabled?: boolean;
}

const AddressFields = ({ label, value, onChange, disabled }: AddressFieldsProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [postOffices, setPostOffices] = useState<PostOffice[]>([]);

  useEffect(() => {
    if (value.division) {
      const div = bangladeshAddresses.find(d => d.nameEn === value.division);
      setDistricts(div?.districts || []);
    } else {
      setDistricts([]);
    }
  }, [value.division]);

  useEffect(() => {
    if (value.district) {
      const dist = districts.find(d => d.nameEn === value.district);
      setUpazilas(dist?.upazilas || []);
    } else {
      setUpazilas([]);
    }
  }, [value.district, districts]);

  useEffect(() => {
    if (value.upazila) {
      const upz = upazilas.find(u => u.nameEn === value.upazila);
      setUnions(upz?.unions || []);
      setPostOffices(upz?.postOffices || []);
    } else {
      setUnions([]);
      setPostOffices([]);
    }
  }, [value.upazila, upazilas]);

  const update = (field: keyof AddressData, val: string) => {
    const newData = { ...value, [field]: val };
    if (field === 'division') { newData.district = ''; newData.upazila = ''; newData.union = ''; newData.postOffice = ''; }
    if (field === 'district') { newData.upazila = ''; newData.union = ''; newData.postOffice = ''; }
    if (field === 'upazila') { newData.union = ''; newData.postOffice = ''; }
    onChange(newData);
  };

  const divisionOptions: SelectOption[] = bangladeshAddresses.map(d => ({
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

  const placeholder = bn ? 'নির্বাচন করুন' : 'Select';
  const searchPh = bn ? 'টাইপ করে খুঁজুন...' : 'Type to search...';
  const addLabel = bn ? 'যোগ করুন' : 'Add';

  return (
    <div>
      <h3 className="text-md font-display font-semibold text-foreground mb-3">{label}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>{bn ? 'বিভাগ' : 'Division'}</Label>
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
        <div>
          <Label>{bn ? 'জেলা' : 'District'}</Label>
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
        <div>
          <Label>{bn ? 'উপজেলা / সিটি কর্পোরেশন / পৌরসভা' : 'Upazila / City Corp / Municipality'}</Label>
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
        <div>
          <Label>{bn ? 'ইউনিয়ন / ওয়ার্ড' : 'Union / Ward'}</Label>
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
        <div>
          <Label>{bn ? 'পোস্ট অফিস' : 'Post Office'}</Label>
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
        <div>
          <Label>{bn ? 'গ্রাম' : 'Village'}</Label>
          <Input className="bg-background mt-1" value={value.village} onChange={(e) => update('village', e.target.value)} disabled={disabled} />
        </div>
      </div>
    </div>
  );
};

export default AddressFields;
