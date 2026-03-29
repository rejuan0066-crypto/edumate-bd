import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import PhoneInput from '@/components/PhoneInput';
import PhotoUpload from '@/components/PhotoUpload';
import { useState } from 'react';
import { Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useValidationRules } from '@/hooks/useValidationRules';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const formatAddress = (addr: AddressData) => {
  return [addr.village, addr.postOffice, addr.union, addr.upazila, addr.district, addr.division].filter(Boolean).join(', ');
};

const AdminStaffForm = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { validate, validateAll } = useValidationRules('staff');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sameAddress, setSameAddress] = useState(false);
  const [parentSameAddr, setParentSameAddr] = useState(false);
  const [guardianType, setGuardianType] = useState('');
  const [permanentAddr, setPermanentAddr] = useState<AddressData>(emptyAddress);
  const [presentAddr, setPresentAddr] = useState<AddressData>(emptyAddress);
  const [parentPermAddr, setParentPermAddr] = useState<AddressData>(emptyAddress);
  const [parentPresAddr, setParentPresAddr] = useState<AddressData>(emptyAddress);
  const [guardianAddr, setGuardianAddr] = useState<AddressData>(emptyAddress);
  const [identifierAddr, setIdentifierAddr] = useState<AddressData>(emptyAddress);
  const [nid, setNid] = useState('');
  const [nidError, setNidError] = useState('');
  const [hasExperience, setHasExperience] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [prevInstitute, setPrevInstitute] = useState('');
  const [email, setEmail] = useState('');
  const [salary, setSalary] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  const designationMap: Record<string, string> = {
    head_teacher: 'প্রধান শিক্ষক',
    asst_head_teacher: 'সহকারী প্রধান শিক্ষক',
    asst_teacher: 'সহকারী শিক্ষক',
    arabic_teacher: 'আরবি শিক্ষক',
    hifz_teacher: 'হিফয শিক্ষক',
    quran_teacher: 'কোরআন শিক্ষক',
    bangla_teacher: 'বাংলা শিক্ষক',
    english_teacher: 'ইংরেজি শিক্ষক',
    math_teacher: 'গণিত শিক্ষক',
    office_asst: 'অফিস সহকারী',
    peon: 'পিয়ন',
    cook: 'রান্না বিভাগ',
    guard: 'নিরাপত্তা প্রহরী',
    other: 'অন্যান্য',
  };

  const validateNid = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setNid(cleaned);
    // Check DB validation rules first
    const dbError = validate('nid', cleaned);
    if (dbError) {
      setNidError(dbError);
    } else if (cleaned.length > 0 && cleaned.length !== 10 && cleaned.length !== 17) {
      setNidError(bn ? 'NID অবশ্যই ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits');
    } else {
      setNidError('');
    }
  };

  const handleFieldChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    const error = validate(field, value);
    setFieldErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error; else delete next[field];
      return next;
    });
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return (
      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {fieldErrors[field]}
      </p>
    );
  };

  // Photo upload handled by PhotoUpload component

  const addMutation = useMutation({
    mutationFn: async () => {
      const fullName = `${firstName} ${lastName}`.trim();
      const addr = formatAddress(permanentAddr);
      const { error } = await supabase.from('staff').insert({
        name_bn: fullName,
        name_en: fullName,
        designation: designationMap[designation] || designation,
        phone: mobile || null,
        email: email || null,
        department: designation?.includes('teacher') ? 'শিক্ষা বিভাগ' : 'প্রশাসন',
        address: addr || null,
        salary: salary ? parseFloat(salary) : null,
        joining_date: new Date().toISOString().split('T')[0],
        photo_url: photoUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(language === 'bn' ? 'কর্মী/শিক্ষক সফলভাবে যোগ হয়েছে' : 'Staff/Teacher added successfully');
      navigate('/admin/staff');
    },
    onError: (e: any) => toast.error(e.message || 'Error saving staff'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Run DB validation rules
    const allValues: Record<string, any> = {
      first_name: firstName, last_name: lastName, mobile, designation,
      email, salary, nid, dob, education, experience,
    };
    const dbErrors = validateAll(allValues);
    
    if (!firstName.trim()) dbErrors['first_name'] = bn ? 'প্রথম নাম আবশ্যক' : 'First name is required';
    if (!designation) dbErrors['designation'] = bn ? 'পদবী নির্বাচন করুন' : 'Select designation';
    
    if (Object.keys(dbErrors).length > 0) {
      setFieldErrors(dbErrors);
      toast.error(Object.values(dbErrors)[0]);
      return;
    }
    addMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {language === 'bn' ? 'নতুন কর্মী/শিক্ষক যোগ করুন' : 'Add New Staff/Teacher'}
          </h1>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Employee Details */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '১. ব্যক্তিগত তথ্য' : '1. Employee Details'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <PhotoUpload
                value={photoUrl}
                onChange={setPhotoUrl}
                folder="staff"
              />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'প্রথম নাম' : 'First Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['first_name'] ? 'border-destructive' : ''}`} required value={firstName} onChange={e => handleFieldChange('first_name', e.target.value, setFirstName)} />
                  <FieldError field="first_name" />
                </div>
                <div>
                  <Label>{bn ? 'শেষ নাম' : 'Last Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['last_name'] ? 'border-destructive' : ''}`} required value={lastName} onChange={e => handleFieldChange('last_name', e.target.value, setLastName)} />
                  <FieldError field="last_name" />
                </div>
                <PhoneInput label={language === 'bn' ? 'মোবাইল' : 'Mobile'} required />
                <div>
                  <Label>{language === 'bn' ? 'পদবী' : 'Designation'} <span className="text-destructive">*</span></Label>
                  <Select value={designation} onValueChange={setDesignation}>
                    <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head_teacher">{language === 'bn' ? 'প্রধান শিক্ষক' : 'Head Teacher'}</SelectItem>
                      <SelectItem value="asst_head_teacher">{language === 'bn' ? 'সহকারী প্রধান শিক্ষক' : 'Asst. Head Teacher'}</SelectItem>
                      <SelectItem value="asst_teacher">{language === 'bn' ? 'সহকারী শিক্ষক' : 'Asst. Teacher'}</SelectItem>
                      <SelectItem value="arabic_teacher">{language === 'bn' ? 'আরবি শিক্ষক' : 'Arabic Teacher'}</SelectItem>
                      <SelectItem value="hifz_teacher">{language === 'bn' ? 'হিফয শিক্ষক' : 'Hifz Teacher'}</SelectItem>
                      <SelectItem value="quran_teacher">{language === 'bn' ? 'কোরআন শিক্ষক' : 'Quran Teacher'}</SelectItem>
                      <SelectItem value="bangla_teacher">{language === 'bn' ? 'বাংলা শিক্ষক' : 'Bengali Teacher'}</SelectItem>
                      <SelectItem value="english_teacher">{language === 'bn' ? 'ইংরেজি শিক্ষক' : 'English Teacher'}</SelectItem>
                      <SelectItem value="math_teacher">{language === 'bn' ? 'গণিত শিক্ষক' : 'Math Teacher'}</SelectItem>
                      <SelectItem value="office_asst">{language === 'bn' ? 'অফিস সহকারী' : 'Office Assistant'}</SelectItem>
                      <SelectItem value="peon">{language === 'bn' ? 'পিয়ন' : 'Peon'}</SelectItem>
                      <SelectItem value="cook">{language === 'bn' ? 'রান্না বিভাগ' : 'Cook'}</SelectItem>
                      <SelectItem value="guard">{language === 'bn' ? 'নিরাপত্তা প্রহরী' : 'Security Guard'}</SelectItem>
                      <SelectItem value="other">{language === 'bn' ? 'অন্যান্য' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                  <Input type="email" className={`bg-background mt-1 ${fieldErrors['email'] ? 'border-destructive' : ''}`} value={email} onChange={e => handleFieldChange('email', e.target.value, setEmail)} />
                  <FieldError field="email" />
                </div>
                <div>
                  <Label>{bn ? 'বেতন (টাকা)' : 'Salary (BDT)'}</Label>
                  <Input type="number" className={`bg-background mt-1 ${fieldErrors['salary'] ? 'border-destructive' : ''}`} value={salary} onChange={e => handleFieldChange('salary', e.target.value, setSalary)} placeholder="৳" />
                  <FieldError field="salary" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="staffResident" />
                  <Label htmlFor="staffResident">{language === 'bn' ? 'আবাসিক' : 'Residential'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="staffNonResident" />
                  <Label htmlFor="staffNonResident">{language === 'bn' ? 'অনাবাসিক' : 'Non-Residential'}</Label>
                </div>
              </div>
              <div>
                <Label>{language === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}</Label>
                <Input type="date" className="bg-background mt-1" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div>
                <Label>{language === 'bn' ? 'ধর্ম' : 'Religion'}</Label>
                <Input className="bg-background mt-1" value={religion} onChange={e => setReligion(e.target.value)} />
              </div>
              <div>
                <Label>{language === 'bn' ? 'NID (১০/১৭ ডিজিট) বা জন্ম নিবন্ধন (১৭ ডিজিট)' : 'NID (10/17) or Birth Reg (17)'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" maxLength={17} value={nid} onChange={(e) => validateNid(e.target.value)} required />
                {nidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {nidError}</p>}
              </div>
              <div>
                <Label>{language === 'bn' ? 'শিক্ষাগত যোগ্যতা' : 'Education Qualification'}</Label>
                <Input className="bg-background mt-1" value={education} onChange={e => setEducation(e.target.value)} />
              </div>
              <div>
                <Label>{language === 'bn' ? 'অভিজ্ঞতা' : 'Experience'}</Label>
                <Input className="bg-background mt-1" value={experience} onChange={(e) => { setExperience(e.target.value); setHasExperience(e.target.value.length > 0); }} />
              </div>
              {hasExperience && (
                <div className="sm:col-span-2">
                  <Label>{language === 'bn' ? 'পূর্ববর্তী কর্মস্থল' : 'Previous Job Institute'} <span className="text-destructive">*</span></Label>
                  <Input className="bg-background mt-1" required value={prevInstitute} onChange={e => setPrevInstitute(e.target.value)} />
                </div>
              )}
            </div>

            <div className="mt-6">
              <AddressFields label={language === 'bn' ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={permanentAddr} onChange={setPermanentAddr} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Checkbox id="staffSameAddr" checked={sameAddress} onCheckedChange={(v) => { setSameAddress(!!v); if (v) setPresentAddr({ ...permanentAddr }); }} />
              <Label htmlFor="staffSameAddr">{language === 'bn' ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
            </div>
            {!sameAddress && (
              <div className="mt-4">
                <AddressFields label={language === 'bn' ? 'বর্তমান ঠিকানা' : 'Present Address'} value={presentAddr} onChange={setPresentAddr} />
              </div>
            )}
          </div>

          {/* Parents */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '২. পিতা-মাতার তথ্য' : '2. Parents Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>{language === 'bn' ? 'পিতার নাম' : 'Father Name'}</Label><Input className="bg-background mt-1" value={fatherName} onChange={e => setFatherName(e.target.value)} /></div>
              <PhoneInput label={language === 'bn' ? 'পিতার মোবাইল' : 'Father Mobile'} />
              <div><Label>{language === 'bn' ? 'পিতার NID' : 'Father NID'}</Label><Input className="bg-background mt-1" maxLength={17} /></div>
              <div><Label>{language === 'bn' ? 'পিতার পেশা' : 'Father Occupation'}</Label><Input className="bg-background mt-1" /></div>
              <div><Label>{language === 'bn' ? 'মাতার নাম' : 'Mother Name'}</Label><Input className="bg-background mt-1" value={motherName} onChange={e => setMotherName(e.target.value)} /></div>
              <PhoneInput label={language === 'bn' ? 'মাতার মোবাইল' : 'Mother Mobile'} />
              <div><Label>{language === 'bn' ? 'মাতার NID' : 'Mother NID'}</Label><Input className="bg-background mt-1" maxLength={17} /></div>
              <div><Label>{language === 'bn' ? 'মাতার পেশা' : 'Mother Occupation'}</Label><Input className="bg-background mt-1" /></div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Checkbox id="parentSameAddr2" checked={parentSameAddr} onCheckedChange={(v) => { setParentSameAddr(!!v); if (v) { setParentPermAddr({ ...permanentAddr }); setParentPresAddr(sameAddress ? { ...permanentAddr } : { ...presentAddr }); }}} />
              <Label htmlFor="parentSameAddr2">{language === 'bn' ? 'কর্মীর ঠিকানার মতো' : 'Same as employee address'}</Label>
            </div>
            {!parentSameAddr && (
              <div className="mt-4 space-y-4">
                <AddressFields label={language === 'bn' ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={parentPermAddr} onChange={setParentPermAddr} />
                <AddressFields label={language === 'bn' ? 'বর্তমান ঠিকানা' : 'Present Address'} value={parentPresAddr} onChange={setParentPresAddr} />
              </div>
            )}
          </div>

          {/* Guardian */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '৩. অভিভাবক তথ্য' : '3. Guardian Details'}
            </h2>
            <Select value={guardianType} onValueChange={setGuardianType}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="father">{language === 'bn' ? 'পিতা' : 'Father'}</SelectItem>
                <SelectItem value="mother">{language === 'bn' ? 'মাতা' : 'Mother'}</SelectItem>
                <SelectItem value="other">{language === 'bn' ? 'অন্যান্য' : 'Others'}</SelectItem>
              </SelectContent>
            </Select>
            {(guardianType === 'father' || guardianType === 'mother') && (
              <p className="mt-3 text-sm text-success flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {language === 'bn' ? 'স্বয়ংক্রিয়ভাবে পূরণ হবে' : 'Will auto-fill'}</p>
            )}
            {guardianType === 'other' && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>{language === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}</Label><Input className="bg-background mt-1" /></div>
                <PhoneInput label={language === 'bn' ? 'মোবাইল' : 'Mobile'} />
                <div><Label>{language === 'bn' ? 'সম্পর্ক' : 'Relation'}</Label><Input className="bg-background mt-1" /></div>
                <div><Label>{language === 'bn' ? 'NID (১০/১৭)' : 'NID (10/17)'}</Label><Input className="bg-background mt-1" maxLength={17} /></div>
                <div className="sm:col-span-2">
                  <AddressFields label={language === 'bn' ? 'ঠিকানা' : 'Address'} value={guardianAddr} onChange={setGuardianAddr} />
                </div>
              </div>
            )}
          </div>

          {/* Identifier */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '৪. পরিচয়দাতার তথ্য' : '4. Identifier Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>{language === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}</Label><Input className="bg-background mt-1" /></div>
              <PhoneInput label={language === 'bn' ? 'মোবাইল' : 'Mobile'} />
              <div><Label>{language === 'bn' ? 'সম্পর্ক' : 'Relation'}</Label><Input className="bg-background mt-1" /></div>
              <div><Label>{language === 'bn' ? 'NID (১০/১৭)' : 'NID (10/17)'}</Label><Input className="bg-background mt-1" maxLength={17} /></div>
              <div><Label>{language === 'bn' ? 'পেশা' : 'Occupation'}</Label><Input className="bg-background mt-1" /></div>
              <div className="sm:col-span-2">
                <AddressFields label={language === 'bn' ? 'ঠিকানা' : 'Full Address'} value={identifierAddr} onChange={setIdentifierAddr} />
              </div>
            </div>
          </div>

          <Button type="submit" className="btn-primary-gradient w-full text-lg py-6" disabled={addMutation.isPending}>
            {addMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
            {language === 'bn' ? 'কর্মী/শিক্ষক যোগ করুন' : 'Add Staff/Teacher'}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffForm;
