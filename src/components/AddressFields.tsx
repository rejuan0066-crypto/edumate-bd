import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bangladeshAddresses, type District, type Upazila, type Union } from '@/data/bangladeshAddresses';

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
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);

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
    } else {
      setUnions([]);
    }
  }, [value.upazila, upazilas]);

  const update = (field: keyof AddressData, val: string) => {
    const newData = { ...value, [field]: val };
    if (field === 'division') { newData.district = ''; newData.upazila = ''; newData.union = ''; }
    if (field === 'district') { newData.upazila = ''; newData.union = ''; }
    if (field === 'upazila') { newData.union = ''; }
    onChange(newData);
  };

  return (
    <div>
      <h3 className="text-md font-display font-semibold text-foreground mb-3">{label}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>{language === 'bn' ? 'বিভাগ' : 'Division'}</Label>
          <Select value={value.division} onValueChange={(v) => update('division', v)} disabled={disabled}>
            <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              {bangladeshAddresses.map(d => (
                <SelectItem key={d.nameEn} value={d.nameEn}>{language === 'bn' ? d.name : d.nameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{language === 'bn' ? 'জেলা' : 'District'}</Label>
          <Select value={value.district} onValueChange={(v) => update('district', v)} disabled={disabled || !value.division}>
            <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              {districts.map(d => (
                <SelectItem key={d.nameEn} value={d.nameEn}>{language === 'bn' ? d.name : d.nameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{language === 'bn' ? 'উপজেলা' : 'Upazila'}</Label>
          <Select value={value.upazila} onValueChange={(v) => update('upazila', v)} disabled={disabled || !value.district}>
            <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              {upazilas.map(u => (
                <SelectItem key={u.nameEn} value={u.nameEn}>{language === 'bn' ? u.name : u.nameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{language === 'bn' ? 'ইউনিয়ন' : 'Union'}</Label>
          <Select value={value.union} onValueChange={(v) => update('union', v)} disabled={disabled || !value.upazila}>
            <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              {unions.map(u => (
                <SelectItem key={u.nameEn} value={u.nameEn}>{language === 'bn' ? u.name : u.nameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{language === 'bn' ? 'পোস্ট অফিস' : 'Post Office'}</Label>
          <Input className="bg-background mt-1" value={value.postOffice} onChange={(e) => update('postOffice', e.target.value)} disabled={disabled} />
        </div>
        <div>
          <Label>{language === 'bn' ? 'গ্রাম' : 'Village'}</Label>
          <Input className="bg-background mt-1" value={value.village} onChange={(e) => update('village', e.target.value)} disabled={disabled} />
        </div>
      </div>
    </div>
  );
};

export default AddressFields;
