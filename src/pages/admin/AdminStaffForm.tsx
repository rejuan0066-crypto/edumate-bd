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
import CardVerifySection from '@/components/CardVerifySection';
import { useApiVerificationEnabled } from '@/hooks/useApiVerification';
import { useState, useRef, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle, Loader2, Upload, Trash2, Eye, Printer, Download, FileText, X, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useValidationRules } from '@/hooks/useValidationRules';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const formatAddress = (addr: AddressData) => {
  return [addr.village, addr.postOffice, addr.union, addr.upazila, addr.district, addr.division].filter(Boolean).join(', ');
};

interface DocFile {
  id: string;
  type: string;
  name: string;
  url: string;
  file?: File;
}

const RELIGIONS = [
  { value: 'islam', bn: 'ইসলাম', en: 'Islam' },
  { value: 'hinduism', bn: 'হিন্দু', en: 'Hinduism' },
  { value: 'christianity', bn: 'খ্রিস্টান', en: 'Christianity' },
  { value: 'buddhism', bn: 'বৌদ্ধ', en: 'Buddhism' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

const DOC_TYPES = [
  { value: 'nid', bn: 'জাতীয় পরিচয়পত্র', en: 'NID' },
  { value: 'birth_certificate', bn: 'জন্ম সনদ', en: 'Birth Certificate' },
  { value: 'education_certificate', bn: 'শিক্ষা সনদ', en: 'Education Certificate' },
  { value: 'citizenship_certificate', bn: 'নাগরিকত্ব সনদ', en: 'Citizenship Certificate' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

const AdminStaffForm = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const { validate, validateAll } = useValidationRules('staff');
  const { data: apiVerifyEnabled } = useApiVerificationEnabled();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  // Load existing staff data for edit mode
  const { data: existingStaff } = useQuery({
    queryKey: ['staff', editId],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').eq('id', editId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });


  // Section 1: Employee
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [salary, setSalary] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileCode, setMobileCode] = useState('+880');
  const [employmentType, setEmploymentType] = useState('');
  const [designation, setDesignation] = useState('');
  const [residenceType, setResidenceType] = useState('');
  const [dob, setDob] = useState('');
  const [religion, setReligion] = useState('');
  const [customReligion, setCustomReligion] = useState('');
  const [nid, setNid] = useState('');
  const [nidError, setNidError] = useState('');
  const [fatherNidError, setFatherNidError] = useState('');
  const [motherNidError, setMotherNidError] = useState('');
  const [guardianNidError, setGuardianNidError] = useState('');
  const [identifierNidError, setIdentifierNidError] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [prevInstitute, setPrevInstitute] = useState('');
  const [permanentAddr, setPermanentAddr] = useState<AddressData>(emptyAddress);
  const [presentAddr, setPresentAddr] = useState<AddressData>(emptyAddress);
  const [sameAddress, setSameAddress] = useState(false);

  // Section 2: Parents
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
  const [parentPermAddr, setParentPermAddr] = useState<AddressData>(emptyAddress);
  const [parentPresAddr, setParentPresAddr] = useState<AddressData>(emptyAddress);
  const [parentSameAsStaff, setParentSameAsStaff] = useState(false);
  const [parentPresSameAsPerm, setParentPresSameAsPerm] = useState(false);

  // Section 3: Guardian
  const [guardianType, setGuardianType] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianMobile, setGuardianMobile] = useState('');
  const [guardianMobileCode, setGuardianMobileCode] = useState('+880');
  const [guardianNid, setGuardianNid] = useState('');
  const [guardianPermAddr, setGuardianPermAddr] = useState<AddressData>(emptyAddress);
  const [guardianPresAddr, setGuardianPresAddr] = useState<AddressData>(emptyAddress);
  const [guardianSameAddr, setGuardianSameAddr] = useState(false);

  // Section 4: Identifier
  const [identifierName, setIdentifierName] = useState('');
  const [identifierRelation, setIdentifierRelation] = useState('');
  const [identifierMobile, setIdentifierMobile] = useState('');
  const [identifierMobileCode, setIdentifierMobileCode] = useState('+880');
  const [identifierNid, setIdentifierNid] = useState('');
  const [identifierAddr, setIdentifierAddr] = useState<AddressData>(emptyAddress);

  // Section 5: Documents
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [docType, setDocType] = useState('');
  const [customDocType, setCustomDocType] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Print signatures
  const [principalName, setPrincipalName] = useState('');
  const [principalPosition, setPrincipalPosition] = useState(bn ? 'অধ্যক্ষ' : 'Principal');
  const [otherSignName, setOtherSignName] = useState('');
  const [otherSignPosition, setOtherSignPosition] = useState('');

  // Approver fields
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [approverSignatureUrl, setApproverSignatureUrl] = useState('');
  const [approverDate, setApproverDate] = useState('');
  const approverSigRef = useRef<HTMLInputElement>(null);

  const designations = [
    { value: 'head_teacher', bn: 'প্রধান শিক্ষক', en: 'Head Teacher' },
    { value: 'asst_head_teacher', bn: 'সহকারী প্রধান শিক্ষক', en: 'Asst. Head Teacher' },
    { value: 'asst_teacher', bn: 'সহকারী শিক্ষক', en: 'Asst. Teacher' },
    { value: 'arabic_teacher', bn: 'আরবি শিক্ষক', en: 'Arabic Teacher' },
    { value: 'hifz_teacher', bn: 'হিফয শিক্ষক', en: 'Hifz Teacher' },
    { value: 'quran_teacher', bn: 'কোরআন শিক্ষক', en: 'Quran Teacher' },
    { value: 'bangla_teacher', bn: 'বাংলা শিক্ষক', en: 'Bengali Teacher' },
    { value: 'english_teacher', bn: 'ইংরেজি শিক্ষক', en: 'English Teacher' },
    { value: 'math_teacher', bn: 'গণিত শিক্ষক', en: 'Math Teacher' },
    { value: 'office_asst', bn: 'অফিস সহকারী', en: 'Office Assistant' },
    { value: 'peon', bn: 'পিয়ন', en: 'Peon' },
    { value: 'cook', bn: 'রান্না বিভাগ', en: 'Cook' },
    { value: 'guard', bn: 'নিরাপত্তা প্রহরী', en: 'Security Guard' },
    { value: 'other', bn: 'অন্যান্য', en: 'Other' },
  ];
  // Populate form fields when editing
  useEffect(() => {
    if (!isEditMode || !existingStaff || dataLoaded) return;
    const sd = (existingStaff.staff_data as any) || {};
    setFirstName(sd.first_name || existingStaff.name_bn?.split(' ')[0] || '');
    setLastName(sd.last_name || existingStaff.name_bn?.split(' ').slice(1).join(' ') || '');
    setMobile(existingStaff.phone?.replace(/^\+\d{1,3}/, '') || '');
    setMobileCode(sd.mobile_code || '+880');
    setEmploymentType(existingStaff.employment_type || '');
    const desigMatch = designations.find(d => d.bn === existingStaff.designation || d.en === existingStaff.designation);
    setDesignation(desigMatch?.value || existingStaff.designation || '');
    setResidenceType(existingStaff.residence_type || '');
    setDob(existingStaff.date_of_birth || '');
    setReligion(existingStaff.religion || '');
    setNid(existingStaff.nid || '');
    setEducation(existingStaff.education || '');
    setExperience(existingStaff.experience || '');
    setPrevInstitute(existingStaff.previous_institute || '');
    setSalary(existingStaff.salary?.toString() || '');
    setPhotoUrl(existingStaff.photo_url || null);
    if (sd.permanent_address) setPermanentAddr(sd.permanent_address);
    if (sd.present_address) setPresentAddr(sd.present_address);
    if (sd.parents) {
      const p = sd.parents;
      setFatherName(p.father?.name || '');
      setFatherMobile(p.father?.mobile || '');
      setFatherMobileCode(p.father?.mobile_code || '+880');
      setFatherNid(p.father?.nid || '');
      setFatherOccupation(p.father?.occupation || '');
      setMotherName(p.mother?.name || '');
      setMotherMobile(p.mother?.mobile || '');
      setMotherMobileCode(p.mother?.mobile_code || '+880');
      setMotherNid(p.mother?.nid || '');
      setMotherOccupation(p.mother?.occupation || '');
      if (p.permanent_address) setParentPermAddr(p.permanent_address);
      if (p.present_address) setParentPresAddr(p.present_address);
    }
    if (sd.guardian) {
      const g = sd.guardian;
      setGuardianType(g.type || '');
      setGuardianName(g.name || '');
      setGuardianRelation(g.relation || '');
      setGuardianMobile(g.mobile || '');
      setGuardianMobileCode(g.mobile_code || '+880');
      setGuardianNid(g.nid || '');
      if (g.permanent_address) setGuardianPermAddr(g.permanent_address);
      if (g.present_address) setGuardianPresAddr(g.present_address);
    }
    if (sd.identifier) {
      const ii = sd.identifier;
      setIdentifierName(ii.name || '');
      setIdentifierRelation(ii.relation || '');
      setIdentifierMobile(ii.mobile || '');
      setIdentifierMobileCode(ii.mobile_code || '+880');
      setIdentifierNid(ii.nid || '');
      if (ii.address) setIdentifierAddr(ii.address);
    }
    if (sd.documents) setDocuments(sd.documents.map((d: any) => ({ ...d, id: d.id || crypto.randomUUID() })));
    if (sd.signatures) {
      setPrincipalName(sd.signatures.principal?.name || '');
      setPrincipalPosition(sd.signatures.principal?.position || (bn ? 'অধ্যক্ষ' : 'Principal'));
      setOtherSignName(sd.signatures.other?.name || '');
      setOtherSignPosition(sd.signatures.other?.position || '');
    }
    if (sd.approver) {
      setApproverName(sd.approver.name || '');
      setApproverPosition(sd.approver.position || '');
      setApproverSignatureUrl(sd.approver.signature_url || '');
      setApproverDate(sd.approver.date || '');
    }
    setDataLoaded(true);
  }, [isEditMode, existingStaff, dataLoaded]);

  const validateNid = (val: string, setter: (v: string) => void, errorSetter?: (v: string) => void) => {
    const cleaned = val.replace(/\D/g, '');
    setter(cleaned);
    if (errorSetter) {
      if (cleaned.length > 0 && cleaned.length !== 10 && cleaned.length !== 17) {
        errorSetter(bn ? 'NID অবশ্যই ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits');
      } else {
        errorSetter('');
      }
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

  // Document upload
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

    const ext = file.name.split('.').pop();
    const path = `staff-docs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);

    setDocuments(prev => [...prev, {
      id: crypto.randomUUID(),
      type: selectedType,
      name: file.name,
      url: urlData.publicUrl,
    }]);
    setDocType('');
    setCustomDocType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(bn ? 'ডকুমেন্ট আপলোড হয়েছে' : 'Document uploaded');
  };

  const removeDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Submit
  const saveMutation = useMutation({
    mutationFn: async () => {
      const fullName = `${firstName} ${lastName}`.trim();
      const desigLabel = designations.find(d => d.value === designation)?.[bn ? 'bn' : 'en'] || designation;

      const staffData = {
        first_name: firstName,
        last_name: lastName,
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
          permanent_address: parentSameAsStaff ? permanentAddr : parentPermAddr,
          present_address: parentSameAsStaff ? (sameAddress ? permanentAddr : presentAddr) : (parentPresSameAsPerm ? (parentSameAsStaff ? permanentAddr : parentPermAddr) : parentPresAddr),
        },
        guardian: {
          type: guardianType,
          name: guardianType === 'other' ? guardianName : (guardianType === 'father' ? fatherName : motherName),
          relation: guardianType === 'other' ? guardianRelation : (guardianType === 'father' ? (bn ? 'পিতা' : 'Father') : (bn ? 'মাতা' : 'Mother')),
          mobile: guardianType === 'other' ? guardianMobile : (guardianType === 'father' ? fatherMobile : motherMobile),
          mobile_code: guardianType === 'other' ? guardianMobileCode : (guardianType === 'father' ? fatherMobileCode : motherMobileCode),
          nid: guardianType === 'other' ? guardianNid : (guardianType === 'father' ? fatherNid : motherNid),
          permanent_address: guardianSameAddr ? permanentAddr : guardianPermAddr,
          present_address: guardianSameAddr ? (sameAddress ? permanentAddr : presentAddr) : guardianPresAddr,
        },
        identifier: {
          name: identifierName,
          relation: identifierRelation,
          mobile: identifierMobile,
          mobile_code: identifierMobileCode,
          nid: identifierNid,
          address: identifierAddr,
        },
        documents: documents.map(d => ({ type: d.type, name: d.name, url: d.url })),
        signatures: {
          principal: { name: principalName, position: principalPosition },
          other: { name: otherSignName, position: otherSignPosition },
        },
        approver: {
          name: approverName,
          position: approverPosition,
          signature_url: approverSignatureUrl,
          date: approverDate,
        },
      };

      const record = {
        name_bn: fullName,
        name_en: fullName,
        designation: desigLabel,
        phone: mobile ? `${mobileCode}${mobile}` : null,
        department: designation?.includes('teacher') ? 'শিক্ষা বিভাগ' : 'প্রশাসন',
        address: formatAddress(permanentAddr) || null,
        salary: salary ? parseFloat(salary) : null,
        photo_url: photoUrl || null,
        date_of_birth: dob || null,
        religion: religion === 'other' ? customReligion : religion || null,
        nid: nid || null,
        education: education || null,
        employment_type: employmentType || null,
        residence_type: residenceType || null,
        experience: experience || null,
        previous_institute: prevInstitute || null,
        staff_data: staffData as any,
      };

      if (isEditMode && editId) {
        const { error } = await supabase.from('staff').update(record).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff').insert({
          ...record,
          joining_date: new Date().toISOString().split('T')[0],
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? (isEditMode ? 'কর্মী/শিক্ষক সফলভাবে আপডেট হয়েছে' : 'কর্মী/শিক্ষক সফলভাবে যোগ হয়েছে') : (isEditMode ? 'Staff/Teacher updated successfully' : 'Staff/Teacher added successfully'));
      navigate('/admin/staff');
    },
    onError: (e: any) => toast.error(e.message || 'Error saving staff'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors['first_name'] = bn ? 'প্রথম নাম আবশ্যক' : 'First name required';
    if (!lastName.trim()) errors['last_name'] = bn ? 'শেষ নাম আবশ্যক' : 'Last name required';
    if (!mobile.trim()) errors['mobile'] = bn ? 'মোবাইল নম্বর আবশ্যক' : 'Mobile required';
    if (!employmentType) errors['employment_type'] = bn ? 'চাকরির ধরন নির্বাচন করুন' : 'Select employment type';
    if (!designation) errors['designation'] = bn ? 'পদবী নির্বাচন করুন' : 'Select designation';
    if (!residenceType) errors['residence_type'] = bn ? 'আবাসিক ধরন নির্বাচন করুন' : 'Select residence type';
    if (!dob) errors['dob'] = bn ? 'জন্ম তারিখ আবশ্যক' : 'Date of birth required';
    if (!religion) errors['religion'] = bn ? 'ধর্ম নির্বাচন করুন' : 'Select religion';
    if (!nid || (nid.length !== 10 && nid.length !== 17)) errors['nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits';
    if (!education.trim()) errors['education'] = bn ? 'শিক্ষাগত যোগ্যতা আবশ্যক' : 'Education required';
    if (experience && !prevInstitute.trim()) errors['prev_institute'] = bn ? 'পূর্ববর্তী কর্মস্থল আবশ্যক' : 'Previous institute required';
    if (!salary) errors['salary'] = bn ? 'বেতন আবশ্যক' : 'Salary required';

    // Parents validation
    if (!fatherName.trim()) errors['father_name'] = bn ? 'পিতার নাম আবশ্যক' : 'Father name required';
    if (!fatherNid && !motherNid) errors['parent_nid'] = bn ? 'অন্তত একটি NID আবশ্যক' : 'At least one parent NID required';
    if (!fatherMobile && !motherMobile) errors['parent_mobile'] = bn ? 'অন্তত একটি মোবাইল নম্বর আবশ্যক' : 'At least one parent mobile required';
    if (!fatherOccupation.trim()) errors['father_occupation'] = bn ? 'পিতার পেশা আবশ্যক' : 'Father occupation required';

    // Guardian validation
    if (!guardianType) errors['guardian_type'] = bn ? 'অভিভাবক নির্বাচন করুন' : 'Select guardian';
    if (guardianType === 'other') {
      if (!guardianName.trim()) errors['guardian_name'] = bn ? 'অভিভাবকের নাম আবশ্যক' : 'Guardian name required';
      if (!guardianRelation.trim()) errors['guardian_relation'] = bn ? 'সম্পর্ক আবশ্যক' : 'Relation required';
      if (!guardianMobile.trim()) errors['guardian_mobile'] = bn ? 'মোবাইল আবশ্যক' : 'Mobile required';
      if (!guardianNid || (guardianNid.length !== 10 && guardianNid.length !== 17)) errors['guardian_nid'] = bn ? 'NID ১০/১৭ ডিজিট হতে হবে' : 'NID 10/17 digits required';
    }

    // Identifier validation
    if (!identifierName.trim()) errors['identifier_name'] = bn ? 'পরিচয়দাতার নাম আবশ্যক' : 'Identifier name required';
    if (!identifierRelation.trim()) errors['identifier_relation'] = bn ? 'সম্পর্ক আবশ্যক' : 'Relation required';
    if (!identifierMobile.trim()) errors['identifier_mobile'] = bn ? 'মোবাইল আবশ্যক' : 'Mobile required';
    if (!identifierNid || (identifierNid.length !== 10 && identifierNid.length !== 17)) errors['identifier_nid'] = bn ? 'NID ১০/১৭ ডিজিট হতে হবে' : 'NID 10/17 digits required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    saveMutation.mutate();
  };

  const handleApproverSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) { toast.error(bn ? 'ফাইল সাইজ ৩০০KB এর বেশি' : 'File size exceeds 300KB'); return; }
    const ext = file.name.split('.').pop();
    const path = `approver-signatures/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file);
    if (error) { toast.error(bn ? 'আপলোড ব্যর্থ' : 'Upload failed'); return; }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
    setApproverSignatureUrl(urlData.publicUrl);
    toast.success(bn ? 'স্বাক্ষর আপলোড হয়েছে' : 'Signature uploaded');
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) { toast.error('Popup blocked'); return; }
    const styles = getPrintStyles();
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Staff Form</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>${styles}</style></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    // Wait for fonts to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 600);
    };
  };

  const getPrintStyles = () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', sans-serif; font-size: 11pt; color: #000; padding: 15mm; }
    .form-header { text-align: center; border-bottom: 3px double #1a5c2e; padding-bottom: 10px; margin-bottom: 12px; position: relative; }
    .form-header .logo { width: 60px; height: 60px; object-fit: contain; }
    .form-header h1 { font-size: 16pt; font-weight: 700; margin: 4px 0 2px; color: #1a5c2e; }
    .form-header h2 { font-size: 12pt; font-weight: 600; color: #333; margin: 2px 0; }
    .form-header p { font-size: 9pt; color: #555; }
    .form-title { background: #1a5c2e; color: #fff; text-align: center; padding: 6px; font-size: 13pt; font-weight: 700; margin: 10px 0; border-radius: 2px; }
    .photo-area { position: absolute; top: 0; right: 0; width: 90px; height: 110px; border: 2px solid #1a5c2e; overflow: hidden; background: #f9f9f9; display: flex; align-items: center; justify-content: center; }
    .photo-area img { width: 100%; height: 100%; object-fit: cover; }
    .photo-area .placeholder { font-size: 8pt; color: #999; text-align: center; padding: 5px; }
    .section { margin: 10px 0; }
    .section-title { background: #e8f5e9; padding: 5px 10px; font-size: 11pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 6px; }
    .form-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .form-table td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10pt; vertical-align: top; }
    .form-table .label { background: #f5f5f5; font-weight: 600; width: 28%; color: #333; white-space: nowrap; }
    .form-table .value { color: #000; }
    .doc-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
    .doc-table th { background: #e8f5e9; border: 1px solid #ccc; padding: 4px 8px; font-size: 9pt; font-weight: 600; text-align: left; }
    .doc-table td { border: 1px solid #ccc; padding: 3px 8px; font-size: 9pt; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 10px; }
    .sig-box { text-align: center; min-width: 180px; }
    .sig-line { border-top: 1px solid #000; padding-top: 5px; margin-top: 35px; }
    .sig-name { font-weight: 600; font-size: 10pt; }
    .sig-position { font-size: 9pt; color: #555; }
    .form-date { text-align: right; font-size: 9pt; color: #555; margin-top: 8px; }
    .approver-section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
    .approver-section .section-title { background: #e8f5e9; padding: 5px 10px; font-size: 11pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 6px; }
    @media print { body { padding: 10mm; } @page { size: A4; margin: 0; } }
  `;

  const getGuardianInfo = () => {
    if (guardianType === 'father') return { name: fatherName, relation: bn ? 'পিতা' : 'Father', mobile: fatherMobileCode + fatherMobile, nid: fatherNid };
    if (guardianType === 'mother') return { name: motherName, relation: bn ? 'মাতা' : 'Mother', mobile: motherMobileCode + motherMobile, nid: motherNid };
    return { name: guardianName, relation: guardianRelation, mobile: guardianMobileCode + guardianMobile, nid: guardianNid };
  };

  const guardianInfo = getGuardianInfo();
  const desigLabel = designations.find(d => d.value === designation)?.[bn ? 'bn' : 'en'] || '';
  const religionLabel = religion === 'other' ? customReligion : RELIGIONS.find(r => r.value === religion)?.[bn ? 'bn' : 'en'] || '';
  const todayDate = new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB');

  // Edit mode overrides for print preview
  const [editMode, setEditMode] = useState(false);
  const [editInstitutionName, setEditInstitutionName] = useState('');
  const [editInstitutionNameEn, setEditInstitutionNameEn] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editPrincipalName, setEditPrincipalName] = useState('');
  const [editPrincipalPosition, setEditPrincipalPosition] = useState('');
  const [editOtherSignName, setEditOtherSignName] = useState('');
  const [editOtherSignPosition, setEditOtherSignPosition] = useState('');
  const [editNote, setEditNote] = useState('');

  // Initialize edit values when preview opens
  const openPrintPreview = () => {
    setEditInstitutionName(institution?.name || '');
    setEditInstitutionNameEn(institution?.name_en || '');
    setEditAddress(institution?.address || '');
    setEditFormTitle(bn ? 'কর্মী/শিক্ষক তথ্য ফরম' : 'Staff/Teacher Information Form');
    setEditPrincipalName(principalName);
    setEditPrincipalPosition(principalPosition);
    setEditOtherSignName(otherSignName);
    setEditOtherSignPosition(otherSignPosition);
    setEditNote('');
    setEditMode(false);
    setShowPrintPreview(true);
  };

  // Use edit overrides or originals
  const pInstName = editMode ? editInstitutionName : (institution?.name || '');
  const pInstNameEn = editMode ? editInstitutionNameEn : (institution?.name_en || '');
  const pInstAddr = editMode ? editAddress : (institution?.address || '');
  const pFormTitle = editMode ? editFormTitle : (bn ? 'কর্মী/শিক্ষক তথ্য ফরম' : 'Staff/Teacher Information Form');
  const pPrincipalName = editMode ? editPrincipalName : principalName;
  const pPrincipalPosition = editMode ? editPrincipalPosition : principalPosition;
  const pOtherSignName = editMode ? editOtherSignName : otherSignName;
  const pOtherSignPosition = editMode ? editOtherSignPosition : otherSignPosition;

  const PrintableForm = () => (
    <div>
      <div className="form-header" style={{ position: 'relative' }}>
        {institution?.logo_url && <img src={institution.logo_url} alt="" className="logo" style={{ position: 'absolute', left: 0, top: 0, width: 60, height: 60 }} />}
        <h1>{pInstName || (bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}</h1>
        {pInstNameEn && <h2>{pInstNameEn}</h2>}
        {pInstAddr && <p>{pInstAddr}</p>}
        {(institution?.phone || institution?.email) && <p>{[institution?.phone, institution?.email].filter(Boolean).join(' | ')}</p>}
        <div className="photo-area">
          {photoUrl ? <img src={photoUrl} alt="Photo" /> : <div className="placeholder">{bn ? 'ছবি' : 'Photo'}<br/>Passport Size</div>}
        </div>
      </div>

      <div className="form-title">{pFormTitle}</div>

      <div className="section">
        <div className="section-title">{bn ? '১. ব্যক্তিগত তথ্য' : '1. Employee Details'}</div>
        <table className="form-table">
          <tbody>
            <tr><td className="label">{bn ? 'নাম' : 'Full Name'}</td><td className="value" colSpan={3}>{firstName} {lastName}</td></tr>
            <tr><td className="label">{bn ? 'বেতন' : 'Salary'}</td><td className="value">৳{salary}</td><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value">{mobileCode}{mobile}</td></tr>
            <tr><td className="label">{bn ? 'চাকরির ধরন' : 'Employment'}</td><td className="value">{employmentType === 'full_time' ? (bn ? 'পূর্ণকালীন' : 'Full Time') : (bn ? 'খণ্ডকালীন' : 'Part Time')}</td><td className="label">{bn ? 'পদবী' : 'Designation'}</td><td className="value">{desigLabel}</td></tr>
            <tr><td className="label">{bn ? 'আবাসিক/অনাবাসিক' : 'Residential'}</td><td className="value">{residenceType === 'residential' ? (bn ? 'আবাসিক' : 'Residential') : (bn ? 'অনাবাসিক' : 'Non-Residential')}</td><td className="label">{bn ? 'জন্ম তারিখ' : 'Date of Birth'}</td><td className="value">{dob}</td></tr>
            <tr><td className="label">{bn ? 'ধর্ম' : 'Religion'}</td><td className="value">{religionLabel}</td><td className="label">{bn ? 'জাতীয় পরিচয়পত্র' : 'NID'}</td><td className="value">{nid}</td></tr>
            <tr><td className="label">{bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</td><td className="value" colSpan={3}>{education}</td></tr>
            <tr><td className="label">{bn ? 'অভিজ্ঞতা' : 'Experience'}</td><td className="value">{experience || '-'}</td><td className="label">{bn ? 'পূর্ববর্তী কর্মস্থল' : 'Previous Institute'}</td><td className="value">{prevInstitute || '-'}</td></tr>
            <tr><td className="label">{bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}</td><td className="value" colSpan={3}>{formatAddress(permanentAddr)}</td></tr>
            <tr><td className="label">{bn ? 'বর্তমান ঠিকানা' : 'Present Address'}</td><td className="value" colSpan={3}>{formatAddress(sameAddress ? permanentAddr : presentAddr)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">{bn ? '২. পিতা-মাতার তথ্য' : '2. Parents Details'}</div>
        <table className="form-table">
          <tbody>
            <tr><td className="label">{bn ? 'পিতার নাম' : "Father's Name"}</td><td className="value">{fatherName}</td><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value">{fatherMobileCode}{fatherMobile}</td></tr>
            <tr><td className="label">{bn ? 'পিতার NID' : "Father's NID"}</td><td className="value">{fatherNid}</td><td className="label">{bn ? 'পেশা' : 'Occupation'}</td><td className="value">{fatherOccupation}</td></tr>
            <tr><td className="label">{bn ? 'মাতার নাম' : "Mother's Name"}</td><td className="value">{motherName}</td><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value">{motherMobileCode}{motherMobile}</td></tr>
            <tr><td className="label">{bn ? 'মাতার NID' : "Mother's NID"}</td><td className="value">{motherNid}</td><td className="label">{bn ? 'পেশা' : 'Occupation'}</td><td className="value">{motherOccupation}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">{bn ? '৩. অভিভাবক তথ্য' : '3. Guardian Details'}</div>
        <table className="form-table">
          <tbody>
            <tr><td className="label">{bn ? 'অভিভাবকের নাম' : 'Guardian Name'}</td><td className="value">{guardianInfo.name}</td><td className="label">{bn ? 'সম্পর্ক' : 'Relation'}</td><td className="value">{guardianInfo.relation}</td></tr>
            <tr><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value">{guardianInfo.mobile}</td><td className="label">NID</td><td className="value">{guardianInfo.nid}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">{bn ? '৪. পরিচয়দাতার তথ্য' : '4. Identifier Details'}</div>
        <table className="form-table">
          <tbody>
            <tr><td className="label">{bn ? 'নাম' : 'Name'}</td><td className="value">{identifierName}</td><td className="label">{bn ? 'সম্পর্ক' : 'Relation'}</td><td className="value">{identifierRelation}</td></tr>
            <tr><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value">{identifierMobileCode}{identifierMobile}</td><td className="label">NID</td><td className="value">{identifierNid}</td></tr>
            <tr><td className="label">{bn ? 'ঠিকানা' : 'Address'}</td><td className="value" colSpan={3}>{formatAddress(identifierAddr)}</td></tr>
          </tbody>
        </table>
      </div>

      {documents.length > 0 && (
        <div className="section">
          <div className="section-title">{bn ? '৫. সংযুক্ত ডকুমেন্টসমূহ' : '5. Attached Documents'}</div>
          <table className="doc-table">
            <thead><tr><th>{bn ? 'ক্রমিক' : '#'}</th><th>{bn ? 'ডকুমেন্টের ধরন' : 'Document Type'}</th><th>{bn ? 'ফাইলের নাম' : 'File Name'}</th></tr></thead>
            <tbody>
              {documents.map((d, i) => (
                <tr key={d.id}><td>{i + 1}</td><td>{d.type}</td><td>{d.name}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editNote && (
        <div className="section">
          <div className="section-title">{bn ? 'অতিরিক্ত নোট' : 'Additional Note'}</div>
          <p style={{ padding: '5px 10px', fontSize: '10pt', border: '1px solid #ccc' }}>{editNote}</p>
        </div>
      )}

      <div className="signatures">
        <div className="sig-box">
          <div className="sig-line">
            <div className="sig-name">{bn ? 'আবেদনকারীর স্বাক্ষর' : "Applicant's Signature"}</div>
          </div>
        </div>
        {pOtherSignName && (
          <div className="sig-box">
            <div className="sig-line">
              <div className="sig-name">{pOtherSignName}</div>
              <div className="sig-position">{pOtherSignPosition}</div>
            </div>
          </div>
        )}
        {pPrincipalName && (
          <div className="sig-box">
            <div className="sig-line">
              <div className="sig-name">{pPrincipalName}</div>
              <div className="sig-position">{pPrincipalPosition}</div>
            </div>
          </div>
        )}
      </div>

      {/* Approver Section */}
      {approverName && (
        <div className="approver-section">
          <div className="section-title">{bn ? 'অনুমোদনকারী' : 'Approved By'}</div>
          <table className="form-table">
            <tbody>
              <tr><td className="label">{bn ? 'নাম' : 'Name'}</td><td className="value">{approverName}</td><td className="label">{bn ? 'পদবী' : 'Position'}</td><td className="value">{approverPosition}</td></tr>
              <tr>
                <td className="label">{bn ? 'স্বাক্ষর' : 'Signature'}</td>
                <td className="value">
                  {approverSignatureUrl ? (
                    <img src={approverSignatureUrl} alt="Signature" style={{ height: '40px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ height: '40px', border: '1px dashed #999', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt', color: '#999' }}>
                      {bn ? 'স্বাক্ষর' : 'Signature'}
                    </div>
                  )}
                </td>
                <td className="label">{bn ? 'তারিখ' : 'Date'}</td>
                <td className="value">{approverDate || todayDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="form-date">{bn ? 'তারিখ' : 'Date'}: {todayDate}</div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {bn ? (isEditMode ? 'কর্মী/শিক্ষক সম্পাদনা' : 'নতুন কর্মী/শিক্ষক যোগ করুন') : (isEditMode ? 'Edit Staff/Teacher' : 'Add New Staff/Teacher')}
          </h1>
          <Button variant="outline" onClick={() => navigate('/admin/staff')}>{bn ? 'ফিরে যান' : 'Back'}</Button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <CardVerifySection
            formType="staff"
            isEnabled={apiVerifyEnabled === true}
            onDataReceived={(data) => {
              if (data.name_bn) setFirstName(data.name_bn);
              if (data.name_en) setLastName(data.name_en);
              if (data.father_name) setFatherName(data.father_name);
              if (data.date_of_birth) setDob(data.date_of_birth);
              if (data.phone) setMobile(data.phone);
              if (data.email) { /* setEmail if exists */ }
              if (data.nid) setNid(data.nid);
              if (data.education) setEducation(data.education);
            }}
          />
          {/* ========== SECTION 1: Employee Details ========== */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
              {bn ? '১. ব্যক্তিগত তথ্য (Employee Details)' : '1. Employee Details'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <PhotoUpload value={photoUrl} onChange={setPhotoUrl} folder="staff" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'বেতন (টাকা)' : 'Salary (BDT)'} <span className="text-destructive">*</span></Label>
                  <Input type="number" className={`bg-background mt-1 ${fieldErrors['salary'] ? 'border-destructive' : ''}`} value={salary} onChange={e => handleFieldChange('salary', e.target.value, setSalary)} placeholder="৳" />
                  <FieldError field="salary" />
                </div>
                <div>
                  <Label>{bn ? 'প্রথম নাম' : 'First Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['first_name'] ? 'border-destructive' : ''}`} value={firstName} onChange={e => handleFieldChange('first_name', e.target.value, setFirstName)} />
                  <FieldError field="first_name" />
                </div>
                <div>
                  <Label>{bn ? 'শেষ নাম' : 'Last Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['last_name'] ? 'border-destructive' : ''}`} value={lastName} onChange={e => handleFieldChange('last_name', e.target.value, setLastName)} />
                  <FieldError field="last_name" />
                </div>
                <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} required value={mobile} countryCode={mobileCode} onChange={(p, c) => { setMobile(p); setMobileCode(c); }} />
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
                <div>
                  <Label>{bn ? 'পদবী' : 'Designation'} <span className="text-destructive">*</span></Label>
                  <Select value={designation} onValueChange={setDesignation}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['designation'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {designations.map(d => (
                        <SelectItem key={d.value} value={d.value}>{bn ? d.bn : d.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError field="designation" />
                </div>
                <div>
                  <Label>{bn ? 'আবাসিক ধরন' : 'Residential Status'} <span className="text-destructive">*</span></Label>
                  <Select value={residenceType} onValueChange={setResidenceType}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['residence_type'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">{bn ? 'আবাসিক' : 'Residential'}</SelectItem>
                      <SelectItem value="non_residential">{bn ? 'অনাবাসিক' : 'Non-Residential'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError field="residence_type" />
                </div>
                <div>
                  <Label>{bn ? 'জন্ম তারিখ' : 'Date of Birth'} <span className="text-destructive">*</span></Label>
                  <Input type="date" className={`bg-background mt-1 ${fieldErrors['dob'] ? 'border-destructive' : ''}`} value={dob} onChange={e => { setDob(e.target.value); setFieldErrors(p => { const n = {...p}; delete n['dob']; return n; }); }} />
                  <FieldError field="dob" />
                </div>
                <div>
                  <Label>{bn ? 'ধর্ম' : 'Religion'} <span className="text-destructive">*</span></Label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['religion'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {RELIGIONS.map(r => <SelectItem key={r.value} value={r.value}>{bn ? r.bn : r.en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {religion === 'other' && <Input className="bg-background mt-2" placeholder={bn ? 'ধর্মের নাম লিখুন' : 'Type religion'} value={customReligion} onChange={e => setCustomReligion(e.target.value)} />}
                  <FieldError field="religion" />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 mb-4">
              <h3 className="text-md font-semibold text-foreground mb-3">{bn ? 'পরিচিতি (Identity)' : 'Identity'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'NID (১০/১৭ ডিজিট) বা জন্ম নিবন্ধন (১৭ ডিজিট)' : 'NID (10/17) or Birth Reg (17)'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['nid'] || nidError ? 'border-destructive' : ''}`} maxLength={17} value={nid} onChange={e => validateNid(e.target.value, setNid, setNidError)} />
                  {nidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {nidError}</p>}
                  <FieldError field="nid" />
                </div>
                <div>
                  <Label>{bn ? 'শিক্ষাগত যোগ্যতা' : 'Education Qualification'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['education'] ? 'border-destructive' : ''}`} value={education} onChange={e => handleFieldChange('education', e.target.value, setEducation)} />
                  <FieldError field="education" />
                </div>
                <div>
                  <Label>{bn ? 'অভিজ্ঞতা' : 'Experience'}</Label>
                  <Input className="bg-background mt-1" value={experience} onChange={e => setExperience(e.target.value)} />
                </div>
                {experience && (
                  <div>
                    <Label>{bn ? 'পূর্ববর্তী কর্মস্থল' : 'Previous Job Institute'} <span className="text-destructive">*</span></Label>
                    <Input className={`bg-background mt-1 ${fieldErrors['prev_institute'] ? 'border-destructive' : ''}`} value={prevInstitute} onChange={e => handleFieldChange('prev_institute', e.target.value, setPrevInstitute)} />
                    <FieldError field="prev_institute" />
                  </div>
                )}
              </div>
            </div>

            <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={permanentAddr} onChange={setPermanentAddr} />
            <div className="mt-4 flex items-center gap-2">
              <Checkbox id="sameAddr" checked={sameAddress} onCheckedChange={(v) => { setSameAddress(!!v); if (v) setPresentAddr({ ...permanentAddr }); }} />
              <Label htmlFor="sameAddr">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
            </div>
            {!sameAddress && (
              <div className="mt-4">
                <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={presentAddr} onChange={setPresentAddr} />
              </div>
            )}
          </div>

          {/* ========== SECTION 2: Parents Details ========== */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
              {bn ? '২. পিতা-মাতার তথ্য (Parents Details)' : '2. Parents Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'পিতার নাম' : 'Father Name'} <span className="text-destructive">*</span></Label>
                <Input className={`bg-background mt-1 ${fieldErrors['father_name'] ? 'border-destructive' : ''}`} value={fatherName} onChange={e => handleFieldChange('father_name', e.target.value, setFatherName)} />
                <FieldError field="father_name" />
              </div>
              <PhoneInput label={bn ? 'পিতার মোবাইল' : 'Father Mobile'} required value={fatherMobile} countryCode={fatherMobileCode} onChange={(p, c) => { setFatherMobile(p); setFatherMobileCode(c); }} />
              <div>
                <Label>{bn ? 'পিতার NID' : 'Father NID'} <span className="text-destructive">*</span></Label>
                <Input className={`bg-background mt-1 ${fatherNidError ? 'border-destructive' : ''}`} maxLength={17} value={fatherNid} onChange={e => validateNid(e.target.value, setFatherNid, setFatherNidError)} />
                {fatherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fatherNidError}</p>}
              </div>
              <div>
                <Label>{bn ? 'পিতার পেশা' : 'Father Occupation'} <span className="text-destructive">*</span></Label>
                <Input className={`bg-background mt-1 ${fieldErrors['father_occupation'] ? 'border-destructive' : ''}`} value={fatherOccupation} onChange={e => handleFieldChange('father_occupation', e.target.value, setFatherOccupation)} />
                <FieldError field="father_occupation" />
              </div>
              <div>
                <Label>{bn ? 'মাতার নাম' : 'Mother Name'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" value={motherName} onChange={e => setMotherName(e.target.value)} />
              </div>
              <PhoneInput label={bn ? 'মাতার মোবাইল' : 'Mother Mobile'} value={motherMobile} countryCode={motherMobileCode} onChange={(p, c) => { setMotherMobile(p); setMotherMobileCode(c); }} />
              <div>
                <Label>{bn ? 'মাতার NID' : 'Mother NID'}</Label>
                <Input className={`bg-background mt-1 ${motherNidError ? 'border-destructive' : ''}`} maxLength={17} value={motherNid} onChange={e => validateNid(e.target.value, setMotherNid, setMotherNidError)} />
                {motherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {motherNidError}</p>}
              </div>
              <div>
                <Label>{bn ? 'মাতার পেশা' : 'Mother Occupation'}</Label>
                <Input className="bg-background mt-1" value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} />
              </div>
            </div>
            {fieldErrors['parent_nid'] && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors['parent_nid']}</p>}
            {fieldErrors['parent_mobile'] && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors['parent_mobile']}</p>}

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="parentSameStaff" checked={parentSameAsStaff} onCheckedChange={(v) => { setParentSameAsStaff(!!v); if (v) { setParentPermAddr({...permanentAddr}); setParentPresAddr(sameAddress ? {...permanentAddr} : {...presentAddr}); }}} />
                <Label htmlFor="parentSameStaff">{bn ? 'কর্মীর ঠিকানার মতো (উভয়)' : 'Same as staff address (both)'}</Label>
              </div>
            </div>
            {!parentSameAsStaff && (
              <div className="mt-4 space-y-4">
                <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={parentPermAddr} onChange={setParentPermAddr} />
                <div className="flex items-center gap-2">
                  <Checkbox id="parentPresSame" checked={parentPresSameAsPerm} onCheckedChange={(v) => { setParentPresSameAsPerm(!!v); if (v) setParentPresAddr({...parentPermAddr}); }} />
                  <Label htmlFor="parentPresSame">{bn ? 'বর্তমান ঠিকানা স্থায়ীর মতো' : 'Present same as permanent'}</Label>
                </div>
                {!parentPresSameAsPerm && <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={parentPresAddr} onChange={setParentPresAddr} />}
              </div>
            )}
          </div>

          {/* ========== SECTION 3: Guardian Details ========== */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
              {bn ? '৩. অভিভাবক তথ্য (Guardian Details)' : '3. Guardian Details'}
            </h2>
            <div>
              <Label>{bn ? 'অভিভাবক' : 'Guardian'} <span className="text-destructive">*</span></Label>
              <Select value={guardianType} onValueChange={setGuardianType}>
                <SelectTrigger className={`bg-background mt-1 ${fieldErrors['guardian_type'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">{bn ? 'পিতা' : 'Father'}</SelectItem>
                  <SelectItem value="mother">{bn ? 'মাতা' : 'Mother'}</SelectItem>
                  <SelectItem value="other">{bn ? 'অন্যান্য' : 'Others'}</SelectItem>
                </SelectContent>
              </Select>
              <FieldError field="guardian_type" />
            </div>
            {(guardianType === 'father' || guardianType === 'mother') && (
              <p className="mt-3 text-sm text-primary flex items-center gap-2 bg-primary/10 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4" /> {bn ? 'পিতা/মাতার তথ্য থেকে স্বয়ংক্রিয়ভাবে পূরণ হবে' : 'Will auto-fill from parent info'}
              </p>
            )}
            {guardianType === 'other' && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'পূর্ণ নাম' : 'Full Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['guardian_name'] ? 'border-destructive' : ''}`} value={guardianName} onChange={e => handleFieldChange('guardian_name', e.target.value, setGuardianName)} />
                  <FieldError field="guardian_name" />
                </div>
                <div>
                  <Label>{bn ? 'সম্পর্ক' : 'Relation'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['guardian_relation'] ? 'border-destructive' : ''}`} value={guardianRelation} onChange={e => handleFieldChange('guardian_relation', e.target.value, setGuardianRelation)} />
                  <FieldError field="guardian_relation" />
                </div>
                <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} required value={guardianMobile} countryCode={guardianMobileCode} onChange={(p, c) => { setGuardianMobile(p); setGuardianMobileCode(c); }} />
                <div>
                  <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['guardian_nid'] || guardianNidError ? 'border-destructive' : ''}`} maxLength={17} value={guardianNid} onChange={e => validateNid(e.target.value, setGuardianNid, setGuardianNidError)} />
                  {guardianNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {guardianNidError}</p>}
                  <FieldError field="guardian_nid" />
                </div>
                <div className="sm:col-span-2">
                  <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={guardianPermAddr} onChange={setGuardianPermAddr} />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox id="guardSameAddr" checked={guardianSameAddr} onCheckedChange={(v) => { setGuardianSameAddr(!!v); if (v) setGuardianPresAddr({...guardianPermAddr}); }} />
                    <Label htmlFor="guardSameAddr">{bn ? 'বর্তমান ঠিকানা স্থায়ীর মতো' : 'Present same as permanent'}</Label>
                  </div>
                  {!guardianSameAddr && <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={guardianPresAddr} onChange={setGuardianPresAddr} />}
                </div>
              </div>
            )}
          </div>

          {/* ========== SECTION 4: Identifier Details ========== */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
              {bn ? '৪. পরিচয়দাতার তথ্য (Identifier Details)' : '4. Identifier Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'পূর্ণ নাম' : 'Full Name'} <span className="text-destructive">*</span></Label>
                <Input className={`bg-background mt-1 ${fieldErrors['identifier_name'] ? 'border-destructive' : ''}`} value={identifierName} onChange={e => handleFieldChange('identifier_name', e.target.value, setIdentifierName)} />
                <FieldError field="identifier_name" />
              </div>
              <div>
                <Label>{bn ? 'সম্পর্ক' : 'Relation'} <span className="text-destructive">*</span></Label>
                <Input className={`bg-background mt-1 ${fieldErrors['identifier_relation'] ? 'border-destructive' : ''}`} value={identifierRelation} onChange={e => handleFieldChange('identifier_relation', e.target.value, setIdentifierRelation)} />
                <FieldError field="identifier_relation" />
              </div>
              <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} required value={identifierMobile} countryCode={identifierMobileCode} onChange={(p, c) => { setIdentifierMobile(p); setIdentifierMobileCode(c); }} />
              <div>
                <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'} <span className="text-destructive">*</span></Label>
                <Input className={`bg-background mt-1 ${fieldErrors['identifier_nid'] || identifierNidError ? 'border-destructive' : ''}`} maxLength={17} value={identifierNid} onChange={e => validateNid(e.target.value, setIdentifierNid, setIdentifierNidError)} />
                {identifierNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {identifierNidError}</p>}
                <FieldError field="identifier_nid" />
              </div>
              <div className="sm:col-span-2">
                <AddressFields label={bn ? 'পূর্ণ ঠিকানা' : 'Full Address'} value={identifierAddr} onChange={setIdentifierAddr} />
              </div>
            </div>
          </div>

          {/* ========== SECTION 5: Document Upload ========== */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
              {bn ? '৫. ডকুমেন্ট আপলোড (Document Upload)' : '5. Document Upload'}
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
                            <button type="button" onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></button>
                            <button type="button" onClick={() => removeDoc(doc.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
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

          {/* ========== Signature for Print ========== */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
              {bn ? 'স্বাক্ষর (প্রিন্ট/ডাউনলোডে দেখাবে)' : 'Signatures (shown in print/download)'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'অধ্যক্ষের নাম' : 'Principal Name'}</Label>
                <Input className="bg-background mt-1" value={principalName} onChange={e => setPrincipalName(e.target.value)} />
              </div>
              <div>
                <Label>{bn ? 'অধ্যক্ষের পদবী' : 'Principal Position'}</Label>
                <Input className="bg-background mt-1" value={principalPosition} onChange={e => setPrincipalPosition(e.target.value)} />
              </div>
              <div>
                <Label>{bn ? 'অন্য স্বাক্ষরকারীর নাম' : 'Other Signatory Name'}</Label>
                <Input className="bg-background mt-1" value={otherSignName} onChange={e => setOtherSignName(e.target.value)} />
              </div>
              <div>
                <Label>{bn ? 'অন্য স্বাক্ষরকারীর পদবী' : 'Other Signatory Position'}</Label>
                <Input className="bg-background mt-1" value={otherSignPosition} onChange={e => setOtherSignPosition(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ========== Approver Section ========== */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
              {bn ? 'এপ্রোভকারীর তথ্য' : 'Approver Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'এপ্রোভকারীর নাম' : "Approver's Name"} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" value={approverName} onChange={e => setApproverName(e.target.value)} placeholder={bn ? 'নাম লিখুন' : 'Enter name'} />
              </div>
              <div>
                <Label>{bn ? 'পদবী' : 'Position'} <span className="text-destructive">*</span></Label>
                <Input className="bg-background mt-1" value={approverPosition} onChange={e => setApproverPosition(e.target.value)} placeholder={bn ? 'পদবী লিখুন' : 'Enter position'} />
              </div>
              <div>
                <Label>{bn ? 'স্বাক্ষর (আপলোড বা প্রিন্টে বক্স দেখাবে)' : 'Signature (upload or box shown in print)'}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input ref={approverSigRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleApproverSignatureUpload} />
                  <Button type="button" variant="outline" size="sm" onClick={() => approverSigRef.current?.click()} className="gap-1">
                    <Upload className="w-3.5 h-3.5" /> {bn ? 'আপলোড' : 'Upload'}
                  </Button>
                  {approverSignatureUrl && (
                    <div className="flex items-center gap-2">
                      <img src={approverSignatureUrl} alt="Signature" className="h-8 border border-border rounded" />
                      <button type="button" onClick={() => setApproverSignatureUrl('')} className="text-destructive hover:text-destructive/80"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {!approverSignatureUrl && <span className="text-xs text-muted-foreground">{bn ? 'প্রিন্টে স্বাক্ষরের বক্স দেখাবে' : 'Signature box will show in print'}</span>}
                </div>
              </div>
              <div>
                <Label>{bn ? 'তারিখ' : 'Date'}</Label>
                <Input type="date" className="bg-background mt-1" value={approverDate} onChange={e => setApproverDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="btn-primary-gradient flex-1 text-lg py-6" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
              {bn ? (isEditMode ? 'আপডেট করুন' : 'কর্মী/শিক্ষক যোগ করুন') : (isEditMode ? 'Update' : 'Add Staff/Teacher')}
            </Button>
            <Button type="button" variant="outline" className="py-6 gap-2" onClick={openPrintPreview}>
              <Eye className="w-5 h-5" /> {bn ? 'প্রিভিউ' : 'Preview'}
            </Button>
            <Button type="button" variant="outline" className="py-6 gap-2" onClick={handlePrint}>
              <Printer className="w-5 h-5" /> {bn ? 'প্রিন্ট' : 'Print'}
            </Button>
          </div>
        </form>
      </div>

      {/* Hidden printable content */}
      <div className="hidden">
        <div ref={printRef}>
          <PrintableForm />
        </div>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{bn ? 'ফরম প্রিভিউ' : 'Form Preview'}</span>
              <div className="flex gap-2">
                <Button variant={editMode ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setEditMode(!editMode)}>
                  <FileText className="w-4 h-4" /> {editMode ? (bn ? 'এডিট বন্ধ' : 'Close Edit') : (bn ? 'এডিট মোড' : 'Edit Mode')}
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
                  <Printer className="w-4 h-4" /> {bn ? 'প্রিন্ট' : 'Print'}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Edit Mode Panel */}
          {editMode && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-4">
              <p className="text-xs text-muted-foreground italic">{bn ? '* এই পরিবর্তনগুলো শুধুমাত্র এই প্রিন্টের জন্য, ডাটাবেসে সেভ হবে না' : '* These changes are temporary, only for this print'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{bn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Institution Name'}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editInstitutionName} onChange={e => setEditInstitutionName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institution Name (English)'}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editInstitutionNameEn} onChange={e => setEditInstitutionNameEn(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">{bn ? 'ঠিকানা' : 'Address'}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">{bn ? 'ফরমের শিরোনাম' : 'Form Title'}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editFormTitle} onChange={e => setEditFormTitle(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'প্রিন্সিপালের নাম' : "Principal's Name"}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editPrincipalName} onChange={e => setEditPrincipalName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'প্রিন্সিপালের পদবী' : "Principal's Position"}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editPrincipalPosition} onChange={e => setEditPrincipalPosition(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'অন্য স্বাক্ষরকারীর নাম' : "Other Signatory Name"}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editOtherSignName} onChange={e => setEditOtherSignName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'অন্য স্বাক্ষরকারীর পদবী' : "Other Signatory Position"}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editOtherSignPosition} onChange={e => setEditOtherSignPosition(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">{bn ? 'অতিরিক্ত নোট (ঐচ্ছিক)' : 'Additional Note (optional)'}</Label>
                  <Input className="bg-background mt-1 h-8 text-sm" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder={bn ? 'প্রিন্টে নোট যোগ করুন...' : 'Add a note to print...'} />
                </div>
              </div>
            </div>
          )}

          <div className="border border-border rounded-lg bg-white text-black p-8" style={{ fontFamily: "'Noto Sans Bengali', sans-serif", fontSize: '11pt' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              .preview-form .form-header { text-align: center; border-bottom: 3px double #1a5c2e; padding-bottom: 10px; margin-bottom: 12px; position: relative; }
              .preview-form .form-header h1 { font-size: 16pt; font-weight: 700; margin: 4px 0 2px; color: #1a5c2e; }
              .preview-form .form-header h2 { font-size: 12pt; font-weight: 600; color: #333; margin: 2px 0; }
              .preview-form .form-header p { font-size: 9pt; color: #555; }
              .preview-form .form-title { background: #1a5c2e; color: #fff; text-align: center; padding: 6px; font-size: 13pt; font-weight: 700; margin: 10px 0; border-radius: 2px; }
              .preview-form .photo-area { position: absolute; top: 0; right: 0; width: 90px; height: 110px; border: 2px solid #1a5c2e; overflow: hidden; background: #f9f9f9; display: flex; align-items: center; justify-content: center; }
              .preview-form .photo-area img { width: 100%; height: 100%; object-fit: cover; }
              .preview-form .photo-area .placeholder { font-size: 8pt; color: #999; text-align: center; padding: 5px; }
              .preview-form .section { margin: 10px 0; }
              .preview-form .section-title { background: #e8f5e9; padding: 5px 10px; font-size: 11pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 6px; }
              .preview-form .form-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
              .preview-form .form-table td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10pt; vertical-align: top; }
              .preview-form .form-table .label { background: #f5f5f5; font-weight: 600; width: 28%; color: #333; white-space: nowrap; }
              .preview-form .doc-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
              .preview-form .doc-table th { background: #e8f5e9; border: 1px solid #ccc; padding: 4px 8px; font-size: 9pt; font-weight: 600; text-align: left; }
              .preview-form .doc-table td { border: 1px solid #ccc; padding: 3px 8px; font-size: 9pt; }
              .preview-form .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 10px; }
              .preview-form .sig-box { text-align: center; min-width: 180px; }
              .preview-form .sig-line { border-top: 1px solid #000; padding-top: 5px; margin-top: 35px; }
              .preview-form .sig-name { font-weight: 600; font-size: 10pt; }
              .preview-form .sig-position { font-size: 9pt; color: #555; }
              .preview-form .form-date { text-align: right; font-size: 9pt; color: #555; margin-top: 8px; }
              .preview-form .approver-section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
              .preview-form .approver-section .section-title { background: #e8f5e9; padding: 5px 10px; font-size: 11pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 6px; }
            `}} />
            <div className="preview-form">
              <PrintableForm />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{previewDoc?.type} - {previewDoc?.name}</DialogTitle></DialogHeader>
          <div className="flex justify-center p-4">
            {previewDoc?.name?.toLowerCase().endsWith('.pdf') ? (
              <embed
                src={previewDoc.url + '#toolbar=1&navpanes=0'}
                type="application/pdf"
                className="w-full h-[500px] border border-border rounded"
              />
            ) : (
              <img src={previewDoc?.url} alt={previewDoc?.name} className="max-w-full max-h-[500px] object-contain rounded" />
            )}
          </div>
          <div className="flex justify-end gap-2">
            {previewDoc?.name?.toLowerCase().endsWith('.pdf') && (
              <Button variant="outline" asChild>
                <a href={`https://docs.google.com/gview?url=${encodeURIComponent(previewDoc?.url || '')}&embedded=true`} target="_blank" rel="noopener noreferrer" className="gap-2"><Eye className="w-4 h-4" /> {bn ? 'Google এ দেখুন' : 'View in Google'}</a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={previewDoc?.url} download={previewDoc?.name} className="gap-2"><Download className="w-4 h-4" /> {bn ? 'ডাউনলোড' : 'Download'}</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStaffForm;

