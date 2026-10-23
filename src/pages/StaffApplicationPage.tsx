import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import PhoneInput from '@/components/PhoneInput';
import PhotoUpload from '@/components/PhotoUpload';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import { useState, useRef } from 'react';
import { AlertCircle, CheckCircle, Loader2, Upload, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { supabase } from '@/integrations/supabase/client';
import { resolveStaffFormNames, hasBangla } from '@/lib/nameFormatter';
import { formatAddress as formatAddressBn } from '@/lib/banglaAddressHelper';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };
const formatAddress = (addr: AddressData, bn = true) => formatAddressBn(addr, bn);

const RELIGIONS = [
  { value: 'islam', bn: 'ইসলাম', en: 'Islam' },
  { value: 'hinduism', bn: 'হিন্দু', en: 'Hinduism' },
  { value: 'christianity', bn: 'খ্রিস্টান', en: 'Christianity' },
  { value: 'buddhism', bn: 'বৌদ্ধ', en: 'Buddhism' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

// Designations are now fetched from database

const DOC_TYPES = [
  { value: 'nid', bn: 'জাতীয় পরিচয়পত্র', en: 'NID' },
  { value: 'birth_certificate', bn: 'জন্ম সনদ', en: 'Birth Certificate' },
  { value: 'education_certificate', bn: 'শিক্ষা সনদ', en: 'Education Certificate' },
  { value: 'citizenship_certificate', bn: 'নাগরিকত্ব সনদ', en: 'Citizenship Certificate' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

const StaffApplicationPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [submitted, setSubmitted] = useState(false);

  // Check if form is open
  const { data: isOpen, isLoading: checkingOpen } = useQuery({
    queryKey: ['staff-form-public-check'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'staff_form_public').maybeSingle();
      return data?.value === true || data?.value === 'true';
    },
  });

  // Load field visibility settings
  const { data: fieldConfig } = useQuery({
    queryKey: ['staff-form-fields-public'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'staff_form_fields').maybeSingle();
      return (data?.value as Record<string, boolean>) || {};
    },
  });

  // Load designations from database
  const { data: designationsList = [] } = useQuery({
    queryKey: ['designations-public'],
    queryFn: async () => {
      const { data } = await supabase.from('designations').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Load footer text
  const { data: footerText } = useQuery({
    queryKey: ['staff-form-footer-text-public'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'staff_form_footer_text').maybeSingle();
      return (data?.value as string) || '';
    },
  });

  const isVisible = (key: string) => fieldConfig?.[key] !== false;

  // Form state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileCode, setMobileCode] = useState('+880');
  const [staffEmail, setStaffEmail] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [designation, setDesignation] = useState('');
  const [residenceType, setResidenceType] = useState('');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('');
  const [customReligion, setCustomReligion] = useState('');
  const [nid, setNid] = useState('');
  const [nidError, setNidError] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [prevInstitute, setPrevInstitute] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [permanentAddr, setPermanentAddr] = useState<AddressData>(emptyAddress);
  const [presentAddr, setPresentAddr] = useState<AddressData>(emptyAddress);
  const [sameAddress, setSameAddress] = useState(false);

  // Parents
  const [fatherName, setFatherName] = useState('');
  const [fatherMobile, setFatherMobile] = useState('');
  const [fatherMobileCode, setFatherMobileCode] = useState('+880');
  const [fatherNid, setFatherNid] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherMobile, setMotherMobile] = useState('');
  const [motherMobileCode, setMotherMobileCode] = useState('+880');
  const [motherNid, setMotherNid] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');

  // Identifier
  const [identifierName, setIdentifierName] = useState('');
  const [identifierRelation, setIdentifierRelation] = useState('');
  const [identifierMobile, setIdentifierMobile] = useState('');
  const [identifierMobileCode, setIdentifierMobileCode] = useState('+880');
  const [identifierNid, setIdentifierNid] = useState('');
  const [identifierNidError, setIdentifierNidError] = useState('');
  const [identifierAddr, setIdentifierAddr] = useState<AddressData>(emptyAddress);

  // Relatives Identifier
  const [relIdName, setRelIdName] = useState('');
  const [relIdRelation, setRelIdRelation] = useState('');
  const [relIdMobile, setRelIdMobile] = useState('');
  const [relIdMobileCode, setRelIdMobileCode] = useState('+880');
  const [relIdNid, setRelIdNid] = useState('');
  const [relIdNidError, setRelIdNidError] = useState('');
  const [relIdAddr, setRelIdAddr] = useState<AddressData>(emptyAddress);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Document upload state
  const [documents, setDocuments] = useState<{ id: string; type: string; name: string; url: string }[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{ id: string; type: string; name: string; url: string } | null>(null);
  const [docType, setDocType] = useState('');
  const [customDocType, setCustomDocType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(bn ? 'ফাইল সাইজ ৫MB এর বেশি হতে পারবে না' : 'File size must be under 5MB');
      return;
    }
    const selectedType = docType === 'other' ? customDocType : (DOC_TYPES.find(d => d.value === docType)?.[bn ? 'bn' : 'en'] || docType);
    if (!selectedType) {
      toast.error(bn ? 'ডকুমেন্টের ধরন নির্বাচন করুন' : 'Select document type');
      return;
    }
    try {
      const res = await uploadToCloudinary(file, { folder: 'staff-docs' });
      setDocuments(prev => [...prev, { id: crypto.randomUUID(), type: selectedType, name: file.name, url: res.secure_url }]);
      setDocType('');
      setCustomDocType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(bn ? 'ডকুমেন্ট আপলোড হয়েছে' : 'Document uploaded');
    } catch (cErr) {
      console.warn('Cloudinary upload failed, falling back to Supabase:', cErr);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const userPrefix = user?.id || 'public-uploads';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `${userPrefix}/staff-docs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: false });
      if (error) { toast.error(error.message); return; }
      setDocuments(prev => [...prev, { id: crypto.randomUUID(), type: selectedType, name: file.name, url: `photos/${path}` }]);
      setDocType('');
      setCustomDocType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(bn ? 'ডকুমেন্ট আপলোড হয়েছে' : 'Document uploaded');
    }
  };

  const validateNid = (val: string, setter: (v: string) => void, errorSetter?: (v: string) => void) => {
    const cleaned = val.replace(/\D/g, '');
    setter(cleaned);
    if (errorSetter) {
      if (cleaned.length > 0 && cleaned.length !== 10 && cleaned.length !== 17) {
        errorSetter(bn ? 'NID ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits');
      } else {
        errorSetter('');
      }
    }
  };

  const handleFieldChange = (key: string, value: string, setter: (v: string) => void) => {
    setter(value);
    setFieldErrors(p => { const n = { ...p }; delete n[key]; return n; });
  };

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors[field]}</p> : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { name_bn: resolvedBn, name_en: resolvedEn } = resolveStaffFormNames(firstName, lastName);
      const fullName = bn ? (resolvedBn || resolvedEn || '') : (resolvedEn || resolvedBn || '');
      const desigObj = designationsList.find(d => d.id === designation);
      const desigLabel = desigObj ? (bn ? desigObj.name_bn : desigObj.name) : designation;

      const staffData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        mobile_code: mobileCode,
        employment_type: employmentType,
        residence_type: residenceType,
        religion: religion === 'other' ? customReligion : religion,
        education,
        experience,
        previous_institute: prevInstitute,
        permanent_address: permanentAddr,
        present_address: sameAddress ? permanentAddr : presentAddr,
        parents: {
          father: { name: fatherName, mobile: fatherMobile, mobile_code: fatherMobileCode, nid: fatherNid, occupation: fatherOccupation },
          mother: { name: motherName, mobile: motherMobile, mobile_code: motherMobileCode, nid: motherNid, occupation: motherOccupation },
        },
        identifier: {
          name: identifierName, relation: identifierRelation,
          mobile: identifierMobile, mobile_code: identifierMobileCode,
          nid: identifierNid, address: identifierAddr,
        },
        relatives_identifier: {
          name: relIdName, relation: relIdRelation,
          mobile: relIdMobile, mobile_code: relIdMobileCode,
          nid: relIdNid, address: relIdAddr,
        },
      };

      const record = {
        name_bn: resolvedBn || fullName,
        name_en: resolvedEn || null,
        designation: desigLabel,
        phone: mobile ? `${mobileCode}${mobile}` : null,
        email: staffEmail || null,
        department: designation?.includes('teacher') ? 'শিক্ষা বিভাগ' : 'প্রশাসন',
        address: formatAddress(permanentAddr) || null,
        photo_url: photoUrl || null,
        date_of_birth: dob || null,
        religion: religion === 'other' ? customReligion : religion || null,
        nid: nid || null,
        education: education || null,
        employment_type: employmentType || null,
        residence_type: residenceType || null,
        experience: experience || null,
        previous_institute: prevInstitute || null,
        joining_date: joiningDate || new Date().toISOString().split('T')[0],
        staff_data: { ...staffData, documents } as any,
        status: 'pending',
      };

      const { error } = await supabase.from('staff').insert(record);
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success(bn ? 'আবেদন সফলভাবে জমা হয়েছে' : 'Application submitted successfully');
    },
    onError: (e: any) => toast.error(e.message || 'Error submitting'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const req = (key: string, val: string, label: string) => { if (!val?.trim()) errors[key] = `${label} ${bn ? 'আবশ্যক' : 'is required'}`; };

    req('first_name', firstName, bn ? 'সম্পুর্ণ নাম (বাংলা)' : 'Full Name (Bangla)');
    req('last_name', lastName, bn ? 'সম্পুর্ণ নাম (ইংরেজি)' : 'Full Name (English)');
    req('mobile', mobile, bn ? 'মোবাইল' : 'Mobile');
    req('employment_type', employmentType, bn ? 'চাকরির ধরন' : 'Employment Type');
    req('designation', designation, bn ? 'পদবী' : 'Designation');
    req('dob', dob, bn ? 'জন্ম তারিখ' : 'Date of Birth');
    req('father_name', fatherName, bn ? 'পিতার নাম' : "Father's Name");

    if (nidError) errors['nid'] = nidError;
    if (identifierNidError) errors['identifier_nid'] = identifierNidError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(bn ? 'সকল আবশ্যক ফিল্ড পূরণ করুন' : 'Please fill all required fields');
      return;
    }
    saveMutation.mutate();
  };

  if (checkingOpen) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
        <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={() => setPreviewDoc(null)}
        fileUrl={previewDoc?.url}
        fileName={previewDoc?.name}
        title={previewDoc ? `${previewDoc.type} - ${previewDoc.name}` : undefined}
      />
    </PublicLayout>
    );
  }

  if (!isOpen) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
          <div className="card-elevated p-10 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'অনলাইন স্টাফ/শিক্ষক আবেদন বন্ধ আছে' : 'Online Staff Application is Closed'}
            </h2>
            <p className="text-muted-foreground">
              {bn ? 'বর্তমানে অনলাইন স্টাফ/শিক্ষক আবেদন গ্রহণ করা হচ্ছে না।' : 'Online staff applications are not being accepted at this time.'}
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (submitted) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
          <div className="card-elevated p-10 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'আবেদন সফলভাবে জমা হয়েছে!' : 'Application Submitted Successfully!'}
            </h2>
            <p className="text-muted-foreground">
              {bn ? 'আপনার আবেদন পর্যালোচনা করা হবে। অনুমোদনের পর আপনাকে জানানো হবে।' : 'Your application will be reviewed. You will be notified after approval.'}
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 text-center">
          {bn ? 'স্টাফ/শিক্ষক আবেদন ফর্ম' : 'Staff/Teacher Application Form'}
        </h1>
        <p className="text-muted-foreground mb-8 text-center">
          {bn ? 'নিচের ফর্মটি পূরণ করে আবেদন জমা দিন' : 'Fill out the form below to submit your application'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Personal Details */}
          {isVisible('section_personal') && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? 'ব্যক্তিগত তথ্য (Employee Details)' : 'Employee Details'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              {isVisible('staff_photo') && <PhotoUpload value={photoUrl} onChange={setPhotoUrl} folder="staff" />}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'সম্পূর্ণ নাম (বাংলা)' : 'Full Name (Bangla)'} <span className="text-destructive">*</span></Label>
                  <Input
                    className={`bg-background mt-1 ${fieldErrors['first_name'] ? 'border-destructive' : ''}`}
                    value={firstName}
                    onChange={e => handleFieldChange('first_name', e.target.value, setFirstName)}
                    placeholder={bn ? 'বাংলায় সম্পূর্ণ নাম লিখুন' : 'Enter full name in Bangla'}
                  />
                  <FieldError field="first_name" />
                </div>
                <div>
                  <Label>{bn ? 'সম্পূর্ণ নাম (ইংরেজি)' : 'Full Name (English)'} <span className="text-destructive">*</span></Label>
                  <Input
                    className={`bg-background mt-1 ${fieldErrors['last_name'] ? 'border-destructive' : ''}`}
                    value={lastName}
                    onChange={e => handleFieldChange('last_name', e.target.value, setLastName)}
                    placeholder={bn ? 'ইংরেজিতে সম্পূর্ণ নাম লিখুন' : 'Enter full name in English'}
                  />
                  {hasBangla(lastName) && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {bn ? 'ইংরেজি নাম ফিল্ডে বাংলা অক্ষর দেওয়া হয়েছে। দয়া করে ইংরেজিতে লিখুন।' : 'Bangla script detected in English name field. Please enter in English.'}
                    </p>
                  )}
                  <FieldError field="last_name" />
                </div>
                <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} required value={mobile} countryCode={mobileCode} onChange={(p, c) => { setMobile(p); setMobileCode(c); }} />
                {isVisible('staff_email') && (
                <div>
                  <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                  <Input type="email" className="bg-background mt-1" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder={bn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'} />
                </div>
                )}
                {isVisible('staff_employment_type') && (
                <div>
                  <Label>{bn ? 'চাকরির ধরন' : 'Employment Type'} <span className="text-destructive">*</span></Label>
                  <Select value={employmentType} onValueChange={setEmploymentType}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['employment_type'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">{bn ? 'পূর্ণকালীন' : 'Full Time'}</SelectItem>
                      <SelectItem value="part_time">{bn ? 'খণ্ডকালীন' : 'Part Time'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError field="employment_type" />
                </div>
                )}
                {isVisible('staff_designation') && (
                <div>
                  <Label>{bn ? 'পদবী' : 'Designation'} <span className="text-destructive">*</span></Label>
                  <Select value={designation} onValueChange={setDesignation}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['designation'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {designationsList.map(d => <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError field="designation" />
                </div>
                )}
                {isVisible('staff_residence_type') && (
                <div>
                  <Label>{bn ? 'আবাসিক ধরন' : 'Residential Status'}</Label>
                  <Select value={residenceType} onValueChange={setResidenceType}>
                    <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">{bn ? 'আবাসিক' : 'Residential'}</SelectItem>
                      <SelectItem value="non_residential">{bn ? 'অনাবাসিক' : 'Non-Residential'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                )}
                {isVisible('staff_dob') && (
                <div>
                  <Label>{bn ? 'জন্ম তারিখ' : 'Date of Birth'} <span className="text-destructive">*</span></Label>
                  <DatePicker bengali={bn} className={`mt-1 ${fieldErrors['dob'] ? 'border-destructive' : ''}`} value={dob} onChange={v => handleFieldChange('dob', v, setDob)} />
                  <FieldError field="dob" />
                </div>
                )}
                {isVisible('staff_joining_date') && (
                <div>
                  <Label>{bn ? 'আবেদন তারিখ' : 'Application Date'}</Label>
                  <DatePicker bengali={bn} className="mt-1" value={joiningDate} onChange={v => setJoiningDate(v)} />
                </div>
                )}
                {isVisible('staff_religion') && (
                <div>
                  <Label>{bn ? 'ধর্ম' : 'Religion'}</Label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {RELIGIONS.map(r => <SelectItem key={r.value} value={r.value}>{bn ? r.bn : r.en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {religion === 'other' && <Input className="bg-background mt-2" placeholder={bn ? 'ধর্মের নাম' : 'Religion name'} value={customReligion} onChange={e => setCustomReligion(e.target.value)} />}
                </div>
                )}
                {isVisible('staff_nid') && (
                <div>
                  <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'}</Label>
                  <Input className={`bg-background mt-1 ${nidError ? 'border-destructive' : ''}`} maxLength={17} value={nid} onChange={e => validateNid(e.target.value, setNid, setNidError)} />
                  {nidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nidError}</p>}
                </div>
                )}
                {isVisible('staff_education') && (
                <div>
                  <Label>{bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</Label>
                  <Input className="bg-background mt-1" value={education} onChange={e => setEducation(e.target.value)} />
                </div>
                )}
                {isVisible('staff_experience') && (
                <div>
                  <Label>{bn ? 'অভিজ্ঞতা' : 'Experience'}</Label>
                  <Input className="bg-background mt-1" value={experience} onChange={e => setExperience(e.target.value)} />
                </div>
                )}
                {isVisible('staff_prev_institute') && (
                <div>
                  <Label>{bn ? 'পূর্ববর্তী কর্মস্থল' : 'Previous Institute'}</Label>
                  <Input className="bg-background mt-1" value={prevInstitute} onChange={e => setPrevInstitute(e.target.value)} />
                </div>
                )}
              </div>
            </div>
            {/* Address */}
            <div className="space-y-4">
              {isVisible('staff_permanent_addr') && <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={permanentAddr} onChange={setPermanentAddr} />}
              {isVisible('staff_present_addr') && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox checked={sameAddress} onCheckedChange={(v) => setSameAddress(!!v)} />
                  <Label className="text-sm">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতই' : 'Present address same as permanent'}</Label>
                </div>
                {!sameAddress && <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={presentAddr} onChange={setPresentAddr} />}
              </>
              )}
            </div>
          </div>
          )}

          {/* Section 2: Parents */}
          {isVisible('section_parents') && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? 'পিতা-মাতার তথ্য (Parents Details)' : 'Parents Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'পিতার নাম' : "Father's Name"} <span className="text-destructive">*</span></Label>
                <Input className={`bg-background mt-1 ${fieldErrors['father_name'] ? 'border-destructive' : ''}`} value={fatherName} onChange={e => handleFieldChange('father_name', e.target.value, setFatherName)} />
                <FieldError field="father_name" />
              </div>
              {isVisible('staff_father_mobile') && <PhoneInput label={bn ? 'পিতার মোবাইল' : "Father's Mobile"} value={fatherMobile} countryCode={fatherMobileCode} onChange={(p, c) => { setFatherMobile(p); setFatherMobileCode(c); }} />}
              {isVisible('staff_father_nid') && (
              <div>
                <Label>{bn ? 'পিতার NID' : "Father's NID"}</Label>
                <Input className="bg-background mt-1" maxLength={17} value={fatherNid} onChange={e => setFatherNid(e.target.value.replace(/\D/g, ''))} />
              </div>
              )}
              {isVisible('staff_father_occupation') && (
              <div>
                <Label>{bn ? 'পিতার পেশা' : "Father's Occupation"}</Label>
                <Input className="bg-background mt-1" value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} />
              </div>
              )}
              {isVisible('staff_mother_name') && (
              <div>
                <Label>{bn ? 'মাতার নাম' : "Mother's Name"}</Label>
                <Input className="bg-background mt-1" value={motherName} onChange={e => setMotherName(e.target.value)} />
              </div>
              )}
              {isVisible('staff_mother_mobile') && <PhoneInput label={bn ? 'মাতার মোবাইল' : "Mother's Mobile"} value={motherMobile} countryCode={motherMobileCode} onChange={(p, c) => { setMotherMobile(p); setMotherMobileCode(c); }} />}
              {isVisible('staff_mother_nid') && (
              <div>
                <Label>{bn ? 'মাতার NID' : "Mother's NID"}</Label>
                <Input className="bg-background mt-1" maxLength={17} value={motherNid} onChange={e => setMotherNid(e.target.value.replace(/\D/g, ''))} />
              </div>
              )}
              {isVisible('staff_mother_occupation') && (
              <div>
                <Label>{bn ? 'মাতার পেশা' : "Mother's Occupation"}</Label>
                <Input className="bg-background mt-1" value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} />
              </div>
              )}
            </div>
          </div>
          )}

          {/* Section 3: Identifier */}
          {isVisible('section_identifier') && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? 'পরিচয সনাক্তকারী তথ্য (Identifier Details)' : 'Identifier Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'পূর্ণ নাম' : 'Full Name'}</Label>
                <Input className="bg-background mt-1" value={identifierName} onChange={e => setIdentifierName(e.target.value)} />
              </div>
              <div>
                <Label>{bn ? 'সম্পর্ক' : 'Relation'}</Label>
                <Input className="bg-background mt-1" value={identifierRelation} onChange={e => setIdentifierRelation(e.target.value)} />
              </div>
              <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} value={identifierMobile} countryCode={identifierMobileCode} onChange={(p, c) => { setIdentifierMobile(p); setIdentifierMobileCode(c); }} />
              <div>
                <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'}</Label>
                <Input className={`bg-background mt-1 ${identifierNidError ? 'border-destructive' : ''}`} maxLength={17} value={identifierNid} onChange={e => validateNid(e.target.value, setIdentifierNid, setIdentifierNidError)} />
                {identifierNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{identifierNidError}</p>}
              </div>
              <div className="sm:col-span-2">
                <AddressFields label={bn ? 'পূর্ণ ঠিকানা' : 'Full Address'} value={identifierAddr} onChange={setIdentifierAddr} />
              </div>
            </div>
          </div>
          )}

          {/* Section 4: Relatives Identifier */}
          {isVisible('section_relatives') && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? 'আত্মীয় শনাক্তকারীর তথ্য (Relatives Identifier Information)' : 'Relatives Identifier Information'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'পূর্ণ নাম' : 'Full Name'}</Label>
                <Input className="bg-background mt-1" value={relIdName} onChange={e => setRelIdName(e.target.value)} />
              </div>
              <div>
                <Label>{bn ? 'সম্পর্ক' : 'Relation'}</Label>
                <Input className="bg-background mt-1" value={relIdRelation} onChange={e => setRelIdRelation(e.target.value)} />
              </div>
              <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} value={relIdMobile} countryCode={relIdMobileCode} onChange={(p, c) => { setRelIdMobile(p); setRelIdMobileCode(c); }} />
              <div>
                <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'}</Label>
                <Input className={`bg-background mt-1 ${relIdNidError ? 'border-destructive' : ''}`} maxLength={17} value={relIdNid} onChange={e => validateNid(e.target.value, setRelIdNid, setRelIdNidError)} />
                {relIdNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{relIdNidError}</p>}
              </div>
              <div className="sm:col-span-2">
                <AddressFields label={bn ? 'পূর্ণ ঠিকানা' : 'Full Address'} value={relIdAddr} onChange={setRelIdAddr} />
              </div>
            </div>
          </div>
          )}

          {/* Section 5: Document Upload */}
          {isVisible('section_documents') && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? 'ডকুমেন্ট আপলোড (Document Upload)' : 'Document Upload'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="bg-background w-full sm:w-48"><SelectValue placeholder={bn ? 'ধরন নির্বাচন' : 'Select type'} /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{bn ? d.bn : d.en}</SelectItem>)}
                </SelectContent>
              </Select>
              {docType === 'other' && (
                <Input className="bg-background sm:w-48" placeholder={bn ? 'ধরনের নাম লিখুন' : 'Type name'} value={customDocType} onChange={e => setCustomDocType(e.target.value)} />
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleDocUpload} />
              <Button type="button" variant="outline" onClick={() => { if (!docType) { toast.error(bn ? 'ধরন নির্বাচন করুন' : 'Select type first'); return; } fileInputRef.current?.click(); }} className="gap-2">
                <Upload className="w-4 h-4" /> {bn ? 'আপলোড' : 'Upload'}
              </Button>
            </div>

            {documents.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{bn ? 'ধরন' : 'Type'}</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{bn ? 'ফাইল নাম' : 'File Name'}</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map((doc, i) => (
                      <tr key={doc.id} className="hover:bg-secondary/20">
                        <td className="px-4 py-2 text-sm">{i + 1}</td>
                        <td className="px-4 py-2 text-sm font-medium">{doc.type}</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{doc.name}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button type="button" onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title={bn ? 'প্রিভিউ দেখুন' : 'Preview'}><Eye className="w-4 h-4" /></button>
                            <button type="button" onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{bn ? 'কোনো ডকুমেন্ট আপলোড করা হয়নি' : 'No documents uploaded'}</p>
            )}
          </div>
          )}

          {/* Footer Text */}
          {footerText && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground whitespace-pre-wrap">
              {footerText}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="btn-primary-gradient w-full text-lg py-6" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {bn ? 'আবেদন জমা দিন' : 'Submit Application'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
};

export default StaffApplicationPage;
