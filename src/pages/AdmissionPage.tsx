import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import PhoneInput from '@/components/PhoneInput';
import { Camera, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const AdmissionPage = () => {
  const { language } = useLanguage();
  const [photo, setPhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [studentType, setStudentType] = useState<'new' | 'old'>('new');
  const [sameAddress, setSameAddress] = useState(false);
  const [guardianType, setGuardianType] = useState('');
  const [parentAddrSameAsStudent, setParentAddrSameAsStudent] = useState(false);
  const [permanentAddr, setPermanentAddr] = useState<AddressData>(emptyAddress);
  const [presentAddr, setPresentAddr] = useState<AddressData>(emptyAddress);
  const [parentPermanentAddr, setParentPermanentAddr] = useState<AddressData>(emptyAddress);
  const [parentPresentAddr, setParentPresentAddr] = useState<AddressData>(emptyAddress);
  const [guardianAddr, setGuardianAddr] = useState<AddressData>(emptyAddress);
  const [guardianPresentAddr, setGuardianPresentAddr] = useState<AddressData>(emptyAddress);
  const [guardianSameAddr, setGuardianSameAddr] = useState(false);
  const [dob, setDob] = useState('');
  const [birthRegNo, setBirthRegNo] = useState('');
  const [birthRegError, setBirthRegError] = useState('');
  const [fatherNid, setFatherNid] = useState('');
  const [motherNid, setMotherNid] = useState('');
  const [fatherNidError, setFatherNidError] = useState('');
  const [motherNidError, setMotherNidError] = useState('');
  const [guardianNid, setGuardianNid] = useState('');
  const [guardianNidError, setGuardianNidError] = useState('');

  // Old student search fields
  const [oldRoll, setOldRoll] = useState('');
  const [oldSession, setOldSession] = useState('');
  const [oldClass, setOldClass] = useState('');

  // Fetch form_settings for field visibility & footer
  const { data: formSettings = [] } = useQuery({
    queryKey: ['form-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('form_settings').select('*');
      if (error) throw error;
      return data as Array<{ id: string; field_name: string; is_visible: boolean; footer_text: string | null }>;
    },
  });

  // Fetch website_settings overrides
  const { data: websiteAdmissionSettings } = useQuery({
    queryKey: ['website-admission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .in('key', ['show_roll_no', 'show_session', 'admission_footer_text']);
      if (error) throw error;
      const result: Record<string, any> = {};
      data?.forEach(row => { result[row.key] = row.value; });
      return result;
    },
  });

  // Fetch academic sessions
  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Visibility helper
  const isFormFieldVisible = (fieldName: string) => {
    const setting = formSettings.find(s => s.field_name === fieldName);
    return setting ? setting.is_visible : true;
  };

  const showRollNo = websiteAdmissionSettings?.show_roll_no !== undefined
    ? String(websiteAdmissionSettings.show_roll_no) === 'true'
    : isFormFieldVisible('roll_no');
  const showSession = websiteAdmissionSettings?.show_session !== undefined
    ? String(websiteAdmissionSettings.show_session) === 'true'
    : isFormFieldVisible('admission_session');
  const showRegistrationNo = isFormFieldVisible('registration_no');
  const showSessionYear = isFormFieldVisible('session_year');
  const showBirthRegNo = isFormFieldVisible('birth_reg_no');
  const showIsOrphan = isFormFieldVisible('is_orphan');
  const showIsPoor = isFormFieldVisible('is_poor');
  const showFatherNid = isFormFieldVisible('father_nid');
  const showMotherNid = isFormFieldVisible('mother_nid');
  const showGuardianNid = isFormFieldVisible('guardian_nid');
  const showPreviousClass = isFormFieldVisible('previous_class');
  const showPreviousInstitute = isFormFieldVisible('previous_institute');
  const footerParagraph = formSettings.find(s => s.field_name === 'footer_paragraph');
  const websiteFooterText = websiteAdmissionSettings?.admission_footer_text as string | undefined;


    const calculateAge = useCallback((dateStr: string) => {
    const birth = new Date(dateStr);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    const days = today.getDate() - birth.getDate();
    const adjustedMonths = days < 0 ? months - 1 : months;
    const adjustedYears = adjustedMonths < 0 ? years - 1 : years;
    const finalMonths = adjustedMonths < 0 ? adjustedMonths + 12 : adjustedMonths;
    return `${adjustedYears} ${language === 'bn' ? 'বছর' : 'years'} ${finalMonths} ${language === 'bn' ? 'মাস' : 'months'}`;
  }, [language]);

  const validateBirthReg = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setBirthRegNo(cleaned);
    if (cleaned.length > 0 && cleaned.length !== 17) {
      setBirthRegError(language === 'bn' ? 'জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিট হতে হবে' : 'Birth Reg must be exactly 17 digits');
    } else {
      setBirthRegError('');
    }
  };

  const validateNid = (val: string, setter: (v: string) => void, errorSetter: (v: string) => void) => {
    const cleaned = val.replace(/\D/g, '');
    setter(cleaned);
    if (cleaned.length > 0 && cleaned.length !== 10 && cleaned.length !== 17) {
      errorSetter(language === 'bn' ? 'NID অবশ্যই ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits');
    } else {
      errorSetter('');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(language === 'bn' ? 'ছবির সাইজ ২MB এর কম হতে হবে' : 'Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate at least one parent NID
    if (!fatherNid && !motherNid) {
      toast.error(language === 'bn' ? 'কমপক্ষে একটি NID প্রয়োজন (পিতা বা মাতা)' : 'At least one NID required (Father or Mother)');
      return;
    }
    if (birthRegNo && birthRegNo.length !== 17) {
      toast.error(language === 'bn' ? 'জন্ম নিবন্ধন নম্বর ১৭ ডিজিট হতে হবে' : 'Birth Reg must be 17 digits');
      return;
    }
    toast.success(language === 'bn' ? 'আবেদন সফলভাবে জমা হয়েছে! অ্যাডমিন অনুমোদনের অপেক্ষায়।' : 'Application submitted successfully! Waiting for admin approval.');
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {language === 'bn' ? 'ভর্তি আবেদন ফর্ম' : 'Admission Application Form'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {language === 'bn' ? 'সকল তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all information correctly'}
        </p>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Student Details */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '১. ছাত্রের তথ্য' : '1. Student Details'}
            </h2>

            {/* Photo Upload + Student Type */}
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="shrink-0">
                <Label className="mb-2 block">{language === 'bn' ? 'ছবি আপলোড' : 'Photo Upload'}</Label>
                <div
                  onClick={() => photoRef.current?.click()}
                  className="w-32 h-40 border-2 border-dashed border-primary/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all overflow-hidden"
                >
                  {photo ? (
                    <img src={photo} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">{language === 'bn' ? 'ছবি তুলুন' : 'Upload'}</span>
                    </>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              <div className="flex-1 space-y-4">
                {/* New / Old Student */}
                <div>
                  <Label>{language === 'bn' ? 'ছাত্রের ধরন' : 'Student Type'}</Label>
                  <div className="flex gap-4 mt-1">
                    <button type="button" onClick={() => setStudentType('new')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${studentType === 'new' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                      {language === 'bn' ? 'নতুন ছাত্র' : 'New Student'}
                    </button>
                    <button type="button" onClick={() => setStudentType('old')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${studentType === 'old' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                      {language === 'bn' ? 'পুরাতন ছাত্র' : 'Old Student'}
                    </button>
                  </div>
                </div>

                {/* Old Student Search */}
                {studentType === 'old' && (
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                    <p className="text-sm font-medium text-foreground">{language === 'bn' ? 'পুরাতন ছাত্রের তথ্য অনুসন্ধান' : 'Search Old Student'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input placeholder={language === 'bn' ? 'রোল' : 'Roll'} value={oldRoll} onChange={(e) => setOldRoll(e.target.value)} className="bg-background" />
                      <Input placeholder={language === 'bn' ? 'ভর্তি সেশন' : 'Session'} value={oldSession} onChange={(e) => setOldSession(e.target.value)} className="bg-background" />
                      <Input placeholder={language === 'bn' ? 'শ্রেণী' : 'Class'} value={oldClass} onChange={(e) => setOldClass(e.target.value)} className="bg-background" />
                    </div>
                    <Button type="button" variant="outline" className="flex items-center gap-2">
                      <Search className="w-4 h-4" /> {language === 'bn' ? 'অনুসন্ধান' : 'Search'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showSession && (
              <div>
                <Label>{language === 'bn' ? 'ভর্তি সেশন' : 'Admission Session'} <span className="text-destructive">*</span></Label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {academicSessions.length > 0 ? academicSessions.map((s: any) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    )) : (
                      <>
                        <SelectItem value="2026">২০২৬</SelectItem>
                        <SelectItem value="2025">২০২৫</SelectItem>
                        <SelectItem value="2024">২০২৪</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              )}
              {showRollNo && (
              <div>
                <Label>{language === 'bn' ? 'রোল' : 'Roll'} ({language === 'bn' ? 'স্বয়ংক্রিয় ও সম্পাদনযোগ্য' : 'Auto & Editable'})</Label>
                <Input className="bg-background mt-1" placeholder={language === 'bn' ? 'স্বয়ংক্রিয়' : 'Auto'} />
              </div>
              )}
              {showRegistrationNo && (
              <div>
                <Label>{language === 'bn' ? 'রেজিস্ট্রেশন নং' : 'Registration No'} ({language === 'bn' ? 'স্বয়ংক্রিয় ও সম্পাদনযোগ্য' : 'Auto & Editable'})</Label>
                <Input className="bg-background mt-1" placeholder={language === 'bn' ? 'স্বয়ংক্রিয়' : 'Auto'} />
              </div>
              )}
              <div>
                <Label>{language === 'bn' ? 'ভর্তির তারিখ' : 'Admission Date'}</Label>
                <Input type="date" className="bg-background mt-1" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              {showSessionYear && (
              <div>
                <Label>{language === 'bn' ? 'সেশন বছর' : 'Session Year'}</Label>
                <Input className="bg-background mt-1" placeholder="2026" />
              </div>
              )}
              <div>
                <Label>{language === 'bn' ? 'প্রথম নাম' : 'First Name'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" required />
              </div>
              <div>
                <Label>{language === 'bn' ? 'শেষ নাম' : 'Last Name'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" required />
              </div>
              <div>
                <Label>{language === 'bn' ? 'লিঙ্গ' : 'Gender'} <span className="text-destructive">*</span></Label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{language === 'bn' ? 'পুরুষ' : 'Male'}</SelectItem>
                    <SelectItem value="female">{language === 'bn' ? 'মহিলা' : 'Female'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'ধর্ম' : 'Religion'}</Label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="islam">{language === 'bn' ? 'ইসলাম' : 'Islam'}</SelectItem>
                    <SelectItem value="hinduism">{language === 'bn' ? 'হিন্দু' : 'Hinduism'}</SelectItem>
                    <SelectItem value="christianity">{language === 'bn' ? 'খ্রিস্টান' : 'Christianity'}</SelectItem>
                    <SelectItem value="buddhism">{language === 'bn' ? 'বৌদ্ধ' : 'Buddhism'}</SelectItem>
                    <SelectItem value="other">{language === 'bn' ? 'অন্যান্য' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'} <span className="text-destructive">*</span></Label>
                <Input type="date" className="bg-background mt-1" value={dob} onChange={(e) => setDob(e.target.value)} required />
                {dob && (
                  <p className="text-xs text-primary mt-1 font-medium">
                    {language === 'bn' ? 'বয়স: ' : 'Age: '}{calculateAge(dob)}
                  </p>
                )}
              </div>
              {showBirthRegNo && (
              <div>
                <Label>{language === 'bn' ? 'জন্ম নিবন্ধন নম্বর (১৭ ডিজিট)' : 'Birth Reg No (17 digits)'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" maxLength={17} value={birthRegNo} onChange={(e) => validateBirthReg(e.target.value)} required />
                {birthRegError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {birthRegError}</p>
                )}
                {birthRegNo.length === 17 && !birthRegError && (
                  <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'bn' ? 'সঠিক' : 'Valid'}</p>
                )}
              </div>
              )}
              <div className="sm:col-span-2 flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="nonOrphanPoor" />
                  <Label htmlFor="nonOrphanPoor">{language === 'bn' ? 'সাধারণ (এতিম/গরীব নয়)' : 'Non Orphan & Poor'}</Label>
                </div>
                {showIsOrphan && (
                <div className="flex items-center gap-2">
                  <Checkbox id="orphan" />
                  <Label htmlFor="orphan">{language === 'bn' ? 'এতিম' : 'Orphan'}</Label>
                </div>
                )}
                {showIsPoor && (
                <div className="flex items-center gap-2">
                  <Checkbox id="poor" />
                  <Label htmlFor="poor">{language === 'bn' ? 'গরীব' : 'Poor'}</Label>
                </div>
                )}
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="resident" />
                  <Label htmlFor="resident">{language === 'bn' ? 'আবাসিক' : 'Resident'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="nonResident" />
                  <Label htmlFor="nonResident">{language === 'bn' ? 'অনাবাসিক' : 'Non-Resident'}</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
            </h2>
            <AddressFields
              label={language === 'bn' ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
              value={permanentAddr}
              onChange={setPermanentAddr}
            />

            <div className="mt-6 flex items-center gap-2">
              <Checkbox id="sameAddr" checked={sameAddress} onCheckedChange={(v) => {
                setSameAddress(!!v);
                if (v) setPresentAddr({ ...permanentAddr });
              }} />
              <Label htmlFor="sameAddr">{language === 'bn' ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present address same as permanent'}</Label>
            </div>

            {!sameAddress && (
              <div className="mt-6">
                <AddressFields
                  label={language === 'bn' ? 'বর্তমান ঠিকানা' : 'Present Address'}
                  value={presentAddr}
                  onChange={setPresentAddr}
                />
              </div>
            )}
          </div>

          {/* Parents Information */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '২. অভিভাবকের তথ্য' : '2. Parents Information'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'bn' ? 'পিতার নাম' : 'Father Name'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" required />
              </div>
              <div>
                <Label>{language === 'bn' ? 'পিতার পেশা' : 'Father Occupation'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              {showFatherNid && (
              <div>
                <Label>{language === 'bn' ? 'পিতার NID (১০/১৭ ডিজিট)' : 'Father NID (10/17 digits)'}</Label>
                <Input className="bg-background mt-1" maxLength={17} value={fatherNid}
                  onChange={(e) => validateNid(e.target.value, setFatherNid, setFatherNidError)} />
                {fatherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fatherNidError}</p>}
                {(fatherNid.length === 10 || fatherNid.length === 17) && !fatherNidError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'bn' ? 'সঠিক' : 'Valid'}</p>}
              </div>
              )}
              <PhoneInput label={language === 'bn' ? 'পিতার মোবাইল' : 'Father Mobile'} required />
              <div>
                <Label>{language === 'bn' ? 'মাতার নাম' : 'Mother Name'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" required />
              </div>
              <div>
                <Label>{language === 'bn' ? 'মাতার পেশা' : 'Mother Occupation'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              {showMotherNid && (
              <div>
                <Label>{language === 'bn' ? 'মাতার NID (১০/১৭ ডিজিট)' : 'Mother NID (10/17 digits)'}</Label>
                <Input className="bg-background mt-1" maxLength={17} value={motherNid}
                  onChange={(e) => validateNid(e.target.value, setMotherNid, setMotherNidError)} />
                {motherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {motherNidError}</p>}
                {(motherNid.length === 10 || motherNid.length === 17) && !motherNidError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'bn' ? 'সঠিক' : 'Valid'}</p>}
              </div>
              )}
              <PhoneInput label={language === 'bn' ? 'মাতার মোবাইল' : 'Mother Mobile'} required />
            </div>

            {/* Parent Address */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox id="parentAddrSame" checked={parentAddrSameAsStudent} onCheckedChange={(v) => {
                  setParentAddrSameAsStudent(!!v);
                  if (v) {
                    setParentPermanentAddr({ ...permanentAddr });
                    setParentPresentAddr(sameAddress ? { ...permanentAddr } : { ...presentAddr });
                  }
                }} />
                <Label htmlFor="parentAddrSame">{language === 'bn' ? 'ছাত্রের ঠিকানার মতো' : 'Same as student address'}</Label>
              </div>
              {!parentAddrSameAsStudent && (
                <>
                  <AddressFields
                    label={language === 'bn' ? 'অভিভাবক স্থায়ী ঠিকানা' : 'Parent Permanent Address'}
                    value={parentPermanentAddr}
                    onChange={setParentPermanentAddr}
                  />
                  <div className="mt-4">
                    <AddressFields
                      label={language === 'bn' ? 'অভিভাবক বর্তমান ঠিকানা' : 'Parent Present Address'}
                      value={parentPresentAddr}
                      onChange={setParentPresentAddr}
                    />
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-destructive mt-4 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {language === 'bn' ? 'কমপক্ষে একটি NID এবং একটি মোবাইল নম্বর প্রয়োজন' : 'At least one NID and one mobile number required'}
            </p>
          </div>

          {/* Guardian Information */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '৩. অভিভাবক তথ্য' : '3. Guardian Information'}
            </h2>
            <div className="mb-4">
              <Label>{language === 'bn' ? 'অভিভাবক' : 'Guardian'} <span className="text-destructive">*</span></Label>
              <Select value={guardianType} onValueChange={setGuardianType}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">{language === 'bn' ? 'পিতা' : 'Father'}</SelectItem>
                  <SelectItem value="mother">{language === 'bn' ? 'মাতা' : 'Mother'}</SelectItem>
                  <SelectItem value="other">{language === 'bn' ? 'অন্যান্য' : 'Others'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(guardianType === 'father' || guardianType === 'mother') && (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm text-success flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {language === 'bn'
                    ? `${guardianType === 'father' ? 'পিতার' : 'মাতার'} তথ্য থেকে স্বয়ংক্রিয়ভাবে পূরণ হবে`
                    : `Will auto-fill from ${guardianType === 'father' ? "father's" : "mother's"} information`}
                </p>
              </div>
            )}

            {guardianType === 'other' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'পূর্ণ নাম' : 'Full Name'} <span className="text-destructive">*</span></Label>
                    <Input className="bg-background mt-1" required />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'সম্পর্ক' : 'Relation'} <span className="text-destructive">*</span></Label>
                    <Input className="bg-background mt-1" required />
                  </div>
                  <PhoneInput label={language === 'bn' ? 'মোবাইল' : 'Mobile'} required />
                  {showGuardianNid && (
                  <div>
                    <Label>{language === 'bn' ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'} <span className="text-destructive">*</span></Label>
                    <Input className="bg-background mt-1" maxLength={17} value={guardianNid}
                      onChange={(e) => validateNid(e.target.value, setGuardianNid, setGuardianNidError)} required />
                    {guardianNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {guardianNidError}</p>}
                  </div>
                  )}
                </div>
                <AddressFields
                  label={language === 'bn' ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
                  value={guardianAddr}
                  onChange={setGuardianAddr}
                />
                <div className="flex items-center gap-2">
                  <Checkbox id="guardianSameAddr" checked={guardianSameAddr} onCheckedChange={(v) => {
                    setGuardianSameAddr(!!v);
                    if (v) setGuardianPresentAddr({ ...guardianAddr });
                  }} />
                  <Label htmlFor="guardianSameAddr">{language === 'bn' ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present address same as permanent'}</Label>
                </div>
                {!guardianSameAddr && (
                  <AddressFields
                    label={language === 'bn' ? 'বর্তমান ঠিকানা' : 'Present Address'}
                    value={guardianPresentAddr}
                    onChange={setGuardianPresentAddr}
                  />
                )}
              </div>
            )}
          </div>

          <Button type="submit" className="btn-primary-gradient w-full text-lg py-6">
            {language === 'bn' ? 'আবেদন জমা দিন' : 'Submit Application'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {language === 'bn' ? 'জমা দেওয়ার পর অ্যাডমিনের অনুমোদন প্রয়োজন' : 'Admin approval required after submission'}
          </p>
        </form>
      </div>
    </PublicLayout>
  );
};

export default AdmissionPage;
