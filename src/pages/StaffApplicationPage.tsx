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
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertCircle, CheckCircle, Loader2, Upload, Trash2, Eye,
  Copy, Download, Printer, ArrowLeft, ArrowRight, RotateCcw,
  Sparkles, Briefcase, User, GraduationCap, Users, ShieldCheck,
  FileText, MapPin, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';
import ApplicationTrackingBox from '@/components/application/ApplicationTrackingBox';
import { generateStaffApplicationNo } from '@/lib/applicationIdGenerator';
import { buildStaffApplicationHTML, downloadHTMLAsPDF, printHTML } from '@/lib/applicationSlipGenerator';
import { useMutation, useQuery } from '@tanstack/react-query';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { supabase } from '@/integrations/supabase/client';
import { resolveStaffFormNames, hasBangla } from '@/lib/nameFormatter';
import { formatAddress as formatAddressBn } from '@/lib/banglaAddressHelper';
import { cleanPhoneNumber } from '@/lib/phoneUtils';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };
const formatAddress = (addr: AddressData, bn = true) => formatAddressBn(addr, bn);


const MARITAL_STATUSES = [
  { value: 'unmarried', bn: 'অবিবাহিত', en: 'Unmarried' },
  { value: 'married', bn: 'বিবাহিত', en: 'Married' },
];

const RELIGIONS = [
  { value: 'islam', bn: 'ইসলাম', en: 'Islam' },
  { value: 'hinduism', bn: 'হিন্দু', en: 'Hinduism' },
  { value: 'christianity', bn: 'খ্রিস্টান', en: 'Christianity' },
  { value: 'buddhism', bn: 'বৌদ্ধ', en: 'Buddhism' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

const DOC_TYPES = [
  { value: 'nid', bn: 'জাতীয় পরিচয়পত্র (NID)', en: 'NID' },
  { value: 'birth_certificate', bn: 'জন্ম সনদ', en: 'Birth Certificate' },
  { value: 'education_certificate', bn: 'শিক্ষা সনদ (Educational Certificate)', en: 'Education Certificate' },
  { value: 'experience_certificate', bn: 'অভিজ্ঞতা সনদ (Experience Certificate)', en: 'Experience Certificate' },
  { value: 'citizenship_certificate', bn: 'নাগরিকত্ব সনদ / চারিত্রিক সনদ', en: 'Citizenship Certificate' },
  { value: 'other', bn: 'অন্যান্য কাগজপত্র', en: 'Other' },
];

interface StepDef {
  id: string;
  bn: string;
  en: string;
  icon: any;
}

const ALL_STEPS: StepDef[] = [
  { id: 'personal', bn: 'মৌলিক তথ্য', en: 'Basic Info', icon: User },
  { id: 'education_address', bn: 'যোগ্যতা ও ঠিকানা', en: 'Education & Address', icon: GraduationCap },
  { id: 'parents', bn: 'পিতা-মাতার তথ্য', en: 'Parents Info', icon: Users },
  { id: 'references', bn: 'পরিচয়কারী ও শনাক্তকারী', en: 'References', icon: ShieldCheck },
  { id: 'documents', bn: 'কাগজপত্র', en: 'Documents', icon: FileText },
  { id: 'review_submit', bn: 'পর্যালোচনা ও সাবমিট', en: 'Review & Submit', icon: Sparkles },
];

const StaffApplicationPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get('mode');
  const urlDesignation = searchParams.get('designation');

  const [pageMode, setPageMode] = useState<'apply' | 'track'>('apply');
  const [designationConfirmed, setDesignationConfirmed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const [declarationAgreed, setDeclarationAgreed] = useState(true);
  const [submittedStaffData, setSubmittedStaffData] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Institution info for printed slips / PDF
  const { data: institution } = useInstitutionInfo();

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

  const { data: openDesignationIds = null } = useQuery<string[] | null>({
    queryKey: ['staff-open-designations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'staff_open_designations')
        .maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        return data.value as string[];
      }
      return null;
    },
  });

  const filteredDesignationsList = useMemo(() => {
    if (!openDesignationIds) return designationsList;
    return designationsList.filter((d: any) => openDesignationIds.includes(d.id));
  }, [designationsList, openDesignationIds]);

  // Sync mode & designation from URL
  useEffect(() => {
    if (urlMode === 'track') setPageMode('track');
  }, [urlMode]);

  useEffect(() => {
    if (!urlDesignation) return;
    setDesignation(urlDesignation);
    setDesignationConfirmed(true);
  }, [urlDesignation]);

  // Load footer text
  const { data: footerText } = useQuery({
    queryKey: ['staff-form-footer-text-public'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'staff_form_footer_text').maybeSingle();
      return (data?.value as string) || '';
    },
  });

  const isVisible = (key: string) => fieldConfig?.[key] !== false;

  // Active steps based on visibility
  const activeSteps = ALL_STEPS.filter(s => {
    if (s.id === 'parents') return isVisible('section_parents');
    if (s.id === 'references') return isVisible('section_identifier') || isVisible('section_relatives');
    if (s.id === 'documents') return isVisible('section_documents');
    return true;
  });

  const safeCurrentStep = Math.min(currentStep, Math.max(0, activeSteps.length - 1));

  // Form states
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileCode, setMobileCode] = useState('+880');
  const [staffEmail, setStaffEmail] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [designation, setDesignation] = useState('');
  const [residenceType, setResidenceType] = useState('non_residential');
  const [dob, setDob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [religion, setReligion] = useState('islam');
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

  // Identifier (শনাক্তকারী)
  const [identifierName, setIdentifierName] = useState('');
  const [identifierRelation, setIdentifierRelation] = useState('');
  const [identifierMobile, setIdentifierMobile] = useState('');
  const [identifierMobileCode, setIdentifierMobileCode] = useState('+880');
  const [identifierNid, setIdentifierNid] = useState('');
  const [identifierNidError, setIdentifierNidError] = useState('');
  const [identifierAddr, setIdentifierAddr] = useState<AddressData>(emptyAddress);

  // Introducer / Relative (পরিচয়কারী)
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

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(bn ? 'স্বাক্ষরের ফাইলের সাইজ ২MB এর বেশি হতে পারবে না' : 'Signature file size must be under 2MB');
      return;
    }
    setUploadingSig(true);
    try {
      const res = await uploadToCloudinary(file, { folder: 'staff-signatures' });
      setSignatureUrl(res.secure_url);
      toast.success(bn ? 'স্বাক্ষর আপলোড হয়েছে' : 'Signature uploaded successfully');
    } catch (cErr) {
      console.warn('Cloudinary upload failed, falling back to Supabase:', cErr);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `signatures/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: false });
      if (error) { toast.error(error.message); return; }
      setSignatureUrl(`photos/${path}`);
      toast.success(bn ? 'স্বাক্ষর আপলোড হয়েছে' : 'Signature uploaded successfully');
    } finally {
      setUploadingSig(false);
      if (sigInputRef.current) sigInputRef.current.value = '';
    }
  };

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

  const validateCurrentStep = (stepId: string): boolean => {
    const errors: Record<string, string> = {};

    if (stepId === 'personal') {
      if (!firstName.trim()) errors['first_name'] = bn ? 'সম্পূর্ণ নাম (বাংলা) আবশ্যক' : 'Full Name (Bangla) is required';
      if (!lastName.trim()) errors['last_name'] = bn ? 'সম্পূর্ণ নাম (ইংরেজি) আবশ্যক' : 'Full Name (English) is required';
      if (!mobile.trim()) errors['mobile'] = bn ? 'মোবাইল নম্বর আবশ্যক' : 'Mobile is required';
      if (isVisible('staff_employment_type') && !employmentType) errors['employment_type'] = bn ? 'চাকরির ধরন নির্বাচন করুন' : 'Select employment type';
      if (isVisible('staff_marital_status') && !maritalStatus) errors['marital_status'] = bn ? 'বৈবাহিক অবস্থা নির্বাচন করুন' : 'Select marital status';
      if (isVisible('staff_designation') && !designation) errors['designation'] = bn ? 'পদবী নির্বাচন করুন' : 'Select designation';
      if (isVisible('staff_dob') && !dob) errors['dob'] = bn ? 'জন্ম তারিখ আবশ্যক' : 'Date of birth is required';
      if (nidError) errors['nid'] = nidError;
    }

    if (stepId === 'parents') {
      if (isVisible('section_parents')) {
        if (!fatherName.trim()) errors['father_name'] = bn ? 'পিতার নাম আবশ্যক' : "Father's name is required";
      }
    }

    if (stepId === 'references') {
      if (identifierNidError) errors['identifier_nid'] = identifierNidError;
      if (relIdNidError) errors['rel_id_nid'] = relIdNidError;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(bn ? 'দয়া করে আবশ্যকীয় ঘরগুলো পূরণ করুন' : 'Please fill all required fields');
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleStepClick = (targetIdx: number) => {
    if (targetIdx === safeCurrentStep) return;
    if (targetIdx < safeCurrentStep) {
      setCurrentStep(targetIdx);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      if (validateCurrentStep(activeSteps[safeCurrentStep].id)) {
        setCurrentStep(targetIdx);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const appNo = await generateStaffApplicationNo();
      const { name_bn: resolvedBn, name_en: resolvedEn } = resolveStaffFormNames(firstName, lastName);
      const fullName = bn ? (resolvedBn || resolvedEn || '') : (resolvedEn || resolvedBn || '');
      const desigObj = designationsList.find(d => d.id === designation);
      const desigLabel = desigObj ? (bn ? desigObj.name_bn : desigObj.name) : designation;

      const cleanStaff = cleanPhoneNumber(mobile, mobileCode);
      const cleanFather = cleanPhoneNumber(fatherMobile, fatherMobileCode);
      const cleanMother = cleanPhoneNumber(motherMobile, motherMobileCode);
      const cleanIdentifier = cleanPhoneNumber(identifierMobile, identifierMobileCode);
      const cleanRelId = cleanPhoneNumber(relIdMobile, relIdMobileCode);

      const staffData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        mobile_code: cleanStaff ? cleanStaff.code : mobileCode,
        employment_type: employmentType,
        residence_type: residenceType,
        marital_status: maritalStatus,
        religion: religion === 'other' ? customReligion : religion,
        education,
        experience,
        previous_institute: prevInstitute,
        permanent_address: permanentAddr,
        present_address: sameAddress ? permanentAddr : presentAddr,
        parents: {
          father: { name: fatherName, mobile: cleanFather ? cleanFather.number : fatherMobile, mobile_code: cleanFather ? cleanFather.code : fatherMobileCode, nid: fatherNid, occupation: fatherOccupation },
          mother: { name: motherName, mobile: cleanMother ? cleanMother.number : motherMobile, mobile_code: cleanMother ? cleanMother.code : motherMobileCode, nid: motherNid, occupation: motherOccupation },
        },
        identifier: {
          name: identifierName, relation: identifierRelation,
          mobile: cleanIdentifier ? cleanIdentifier.number : identifierMobile, mobile_code: cleanIdentifier ? cleanIdentifier.code : identifierMobileCode,
          nid: identifierNid, address: identifierAddr,
        },
        relatives_identifier: {
          name: relIdName, relation: relIdRelation,
          mobile: cleanRelId ? cleanRelId.number : relIdMobile, mobile_code: cleanRelId ? cleanRelId.code : relIdMobileCode,
          nid: relIdNid, address: relIdAddr,
        },
        application_no: appNo,
        signature_url: signatureUrl,
        documents,
      };

      const record: any = {
        staff_id: appNo,
        name_bn: resolvedBn || fullName,
        name_en: resolvedEn || null,
        designation: desigLabel,
        phone: cleanStaff ? cleanStaff.full : (mobile ? `${mobileCode}${mobile}` : null),
        email: staffEmail || null,
        department: desigLabel?.includes('শিক্ষক') || desigLabel?.toLowerCase().includes('teacher') ? 'শিক্ষা বিভাগ' : 'প্রশাসন ও সাধারণ',
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
        staff_data: staffData,
        status: 'pending',
      };

      const { data, error } = await supabase.from('staff').insert(record).select().single();
      if (error) throw error;
      return data || record;
    },
    onSuccess: (data) => {
      setSubmittedStaffData(data);
      setSubmitted(true);
      toast.success(bn ? 'আবেদন সফলভাবে জমা হয়েছে! আবেদন নম্বর সংরক্ষণ করুন।' : 'Application submitted successfully! Please save your application number.');
    },
    onError: (e: any) => toast.error(e.message || 'Error submitting application'),
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check all previous steps
    for (let i = 0; i < activeSteps.length; i++) {
      if (!validateCurrentStep(activeSteps[i].id)) {
        setCurrentStep(i);
        window.scrollTo({ top: 120, behavior: 'smooth' });
        return;
      }
    }

    if (!declarationAgreed) {
      toast.error(bn ? 'দয়া করে ঘোষণাপত্রে সম্মতি দিন' : 'Please agree to the declaration');
      return;
    }
    saveMutation.mutate();
  };

  const handlePrint = () => {
    if (!submittedStaffData) return;
    const html = buildStaffApplicationHTML(submittedStaffData, institution);
    printHTML(html);
  };

  const handleDownloadPDF = async () => {
    if (!submittedStaffData) return;
    try {
      setIsDownloading(true);
      const appNo = submittedStaffData?.staff_data?.application_no || submittedStaffData?.staff_id || 'application';
      const html = buildStaffApplicationHTML(submittedStaffData, institution);
      await downloadHTMLAsPDF(html, `Staff_Application_${appNo}.pdf`);
      toast.success(bn ? 'পিডিএফ ডাউনলোড সম্পন্ন হয়েছে' : 'PDF downloaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error downloading PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const copyApplicationNo = (num: string) => {
    navigator.clipboard.writeText(num);
    toast.success(bn ? 'আবেদন নম্বর কপি করা হয়েছে!' : 'Application number copied!');
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedStaffData(null);
    setCurrentStep(0);
    setPhotoUrl(null);
    setFirstName('');
    setLastName('');
    setMobile('');
    setStaffEmail('');
    setEmploymentType('');
    setDesignation('');
    setDesignationConfirmed(false);
    setResidenceType('non_residential');
    setMaritalStatus('');
    setDob('');
    setReligion('islam');
    setCustomReligion('');
    setNid('');
    setNidError('');
    setEducation('');
    setExperience('');
    setPrevInstitute('');
    setJoiningDate('');
    setPermanentAddr(emptyAddress);
    setPresentAddr(emptyAddress);
    setSameAddress(false);
    setFatherName('');
    setFatherMobile('');
    setFatherNid('');
    setFatherOccupation('');
    setMotherName('');
    setMotherMobile('');
    setMotherNid('');
    setMotherOccupation('');
    setIdentifierName('');
    setIdentifierRelation('');
    setIdentifierMobile('');
    setIdentifierNid('');
    setIdentifierNidError('');
    setIdentifierAddr(emptyAddress);
    setRelIdName('');
    setRelIdRelation('');
    setRelIdMobile('');
    setRelIdNid('');
    setRelIdNidError('');
    setRelIdAddr(emptyAddress);
    setDocuments([]);
    setSignatureUrl(null);
    setDeclarationAgreed(true);
    setFieldErrors({});
  };

  if (checkingOpen) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
        </div>
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
              {bn ? 'বর্তমানে অনলাইন স্টাফ/শিক্ষক আবেদন গ্রহণ করা হচ্ছে না। পরবর্তী বিজ্ঞপ্তির জন্য অপেক্ষা করুন।' : 'Online staff applications are not being accepted at this time. Please check back later.'}
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Success Confirmation Screen
  if (submitted && submittedStaffData) {
    const appNo = submittedStaffData?.staff_data?.application_no || submittedStaffData?.staff_id || '';
    const applyDate = submittedStaffData?.joining_date || new Date().toISOString().split('T')[0];
    const desigObj = designationsList.find(d => d.id === submittedStaffData?.designation || d.name_bn === submittedStaffData?.designation || d.name === submittedStaffData?.designation);
    const desigLabel = submittedStaffData?.designation || (desigObj ? (bn ? desigObj.name_bn : desigObj.name) : '—');

    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="card-elevated p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {bn ? 'নিয়োগ আবেদন সফলভাবে জমা হয়েছে!' : 'Application Submitted Successfully!'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {bn
                  ? 'আপনার আবেদনটি সফলভাবে সিস্টেমে গ্রহণ করা হয়েছে। কর্তৃপক্ষ পর্যালোচনার পর পরবর্তী প্রক্রিয়ার জন্য যোগাযোগ করবে।'
                  : 'Your employment application has been received and is pending administrative review.'}
              </p>
            </div>

            {/* Application ID Card */}
            <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
                {bn ? 'আপনার আবেদন নম্বর (Application ID)' : 'Your Application ID'}
              </div>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 tracking-wider">
                  {appNo}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyApplicationNo(appNo)}
                  className="h-8 px-2.5 bg-white dark:bg-card border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                  title={bn ? 'কপি করুন' : 'Copy ID'}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  <span className="text-xs">{bn ? 'কপি' : 'Copy'}</span>
                </Button>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
                {bn
                  ? 'আবেদনের বর্তমান অবস্থা যাচাই এবং স্লিপ পুনঃডাউনলোড করতে এই নম্বরটি সংরক্ষণ করুন।'
                  : 'Save this Application ID for tracking and slip re-downloading.'}
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 dark:bg-secondary/40 rounded-xl p-4 text-left space-y-2 border border-slate-200 dark:border-border text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{bn ? 'প্রার্থীর নাম (বাংলা):' : 'Candidate Name (Bangla):'}</span>
                <span className="font-semibold text-foreground">{submittedStaffData?.name_bn}</span>
              </div>
              {submittedStaffData?.name_en && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{bn ? 'নাম (ইংরেজি):' : 'Name (English):'}</span>
                  <span className="font-medium text-foreground">{submittedStaffData?.name_en}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{bn ? 'আবেদনকৃত পদবী:' : 'Applied Designation:'}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{desigLabel}</span>
              </div>
              {submittedStaffData?.phone && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{bn ? 'মোবাইল নম্বর:' : 'Mobile:'}</span>
                  <span className="font-mono text-foreground">{submittedStaffData?.phone}</span>
                </div>
              )}
              {submittedStaffData?.employment_type && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{bn ? 'চাকরির ধরন:' : 'Employment Type:'}</span>
                  <span className="font-medium text-foreground">
                    {submittedStaffData.employment_type === 'full_time' ? (bn ? 'পূর্ণকালীন' : 'Full Time') : (bn ? 'খণ্ডকালীন' : 'Part Time')}
                  </span>
                </div>
              )}
              {submittedStaffData?.staff_data?.marital_status && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{bn ? 'বৈবাহিক অবস্থা:' : 'Marital Status:'}</span>
                  <span className="font-medium text-foreground">
                    {MARITAL_STATUSES.find(m => m.value === submittedStaffData.staff_data.marital_status)?.[bn ? 'bn' : 'en'] || submittedStaffData.staff_data.marital_status}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">{bn ? 'আবেদনের তারিখ:' : 'Application Date:'}</span>
                <span className="font-medium text-foreground">{applyDate}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2"
                variant="outline"
              >
                <Printer className="w-4 h-4" />
                {bn ? 'আবেদন স্লিপ প্রিন্ট' : 'Print Slip'}
              </Button>
              <Button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-2 btn-primary-gradient"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {bn ? 'স্লিপ ডাউনলোড (PDF)' : 'Download PDF'}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/application-tracking?id=${appNo}`}>
                  {bn ? 'আবেদনের অবস্থা ট্র্যাক করুন' : 'Track Application Status'}
                </Link>
              </Button>

              <Button
                type="button"
                onClick={resetForm}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                {bn ? 'নতুন আবেদন করুন' : 'Submit Another Application'}
              </Button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Active step renderer
  const renderCurrentStepContent = () => {
    const currentStepId = activeSteps[safeCurrentStep]?.id;

    if (currentStepId === 'personal') {
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {isVisible('staff_photo') && (
              <div className="flex flex-col items-center sm:items-start shrink-0">
                <PhotoUpload value={photoUrl} onChange={setPhotoUrl} folder="staff" />
                <span className="text-xs text-muted-foreground mt-2 text-center">
                  {bn ? 'পাসপোর্ট সাইজ ছবি' : 'Passport Size Photo'}
                </span>
              </div>
            )}
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
                    {bn ? 'ইংরেজি নাম ফিল্ডে বাংলা অক্ষর দেওয়া হয়েছে। দয়া করে ইংরেজিতে লিখুন।' : 'Bangla script detected. Please enter in English.'}
                  </p>
                )}
                <FieldError field="last_name" />
              </div>

              <div>
                <PhoneInput
                  label={bn ? 'মোবাইল নম্বর' : 'Mobile'}
                  required
                  value={mobile}
                  countryCode={mobileCode}
                  onChange={(p, c) => {
                    setMobile(p);
                    setMobileCode(c);
                    setFieldErrors(prev => { const n = { ...prev }; delete n['mobile']; return n; });
                  }}
                />
                <FieldError field="mobile" />
              </div>

              {isVisible('staff_email') && (
                <div>
                  <Label>{bn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}</Label>
                  <Input
                    type="email"
                    className="bg-background mt-1"
                    value={staffEmail}
                    onChange={e => setStaffEmail(e.target.value)}
                    placeholder="example@mail.com"
                  />
                </div>
              )}

              {isVisible('staff_designation') && (
                <div>
                  <Label>{bn ? 'আবেদনকৃত পদবী' : 'Applied Designation'} <span className="text-destructive">*</span></Label>
                  <Select value={designation} onValueChange={v => handleFieldChange('designation', v, setDesignation)}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['designation'] ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={bn ? 'পদবী নির্বাচন করুন' : 'Select Designation'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDesignationsList.map(d => (
                        <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError field="designation" />
                </div>
              )}

              {isVisible('staff_employment_type') && (
                <div>
                  <Label>{bn ? 'চাকরির ধরন' : 'Employment Type'} <span className="text-destructive">*</span></Label>
                  <Select value={employmentType} onValueChange={v => handleFieldChange('employment_type', v, setEmploymentType)}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['employment_type'] ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">{bn ? 'পূর্ণকালীন (Full Time)' : 'Full Time'}</SelectItem>
                      <SelectItem value="part_time">{bn ? 'খণ্ডকালীন (Part Time)' : 'Part Time'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError field="employment_type" />
                </div>
              )}

              {isVisible('staff_marital_status') && (
                <div>
                  <Label>{bn ? 'বৈবাহিক অবস্থা' : 'Marital Status'} <span className="text-destructive">*</span></Label>
                  <Select value={maritalStatus} onValueChange={v => handleFieldChange('marital_status', v, setMaritalStatus)}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['marital_status'] ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUSES.map(m => (
                        <SelectItem key={m.value} value={m.value}>{bn ? m.bn : m.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError field="marital_status" />
                </div>
              )}

              {isVisible('staff_dob') && (
                <div>
                  <Label>{bn ? 'জন্ম তারিখ' : 'Date of Birth'} <span className="text-destructive">*</span></Label>
                  <DatePicker bengali={bn} className={`mt-1 ${fieldErrors['dob'] ? 'border-destructive' : ''}`} value={dob} onChange={v => handleFieldChange('dob', v, setDob)} />
                  <FieldError field="dob" />
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
                  {religion === 'other' && (
                    <Input className="bg-background mt-2" placeholder={bn ? 'ধর্মের নাম' : 'Religion name'} value={customReligion} onChange={e => setCustomReligion(e.target.value)} />
                  )}
                </div>
              )}

              {isVisible('staff_nid') && (
                <div>
                  <Label>{bn ? 'জাতীয় পরিচয়পত্র (NID)' : 'NID (10/17 digits)'}</Label>
                  <Input
                    className={`bg-background mt-1 ${nidError ? 'border-destructive' : ''}`}
                    maxLength={17}
                    value={nid}
                    placeholder={bn ? '১০ বা ১৭ ডিজিট' : '10 or 17 digits'}
                    onChange={e => validateNid(e.target.value, setNid, setNidError)}
                  />
                  {nidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nidError}</p>}
                </div>
              )}

              {isVisible('staff_joining_date') && (
                <div>
                  <Label>{bn ? 'সম্ভাব্য যোগদানের তারিখ / আবেদনের তারিখ' : 'Expected Joining Date'}</Label>
                  <DatePicker bengali={bn} className="mt-1" value={joiningDate} onChange={v => setJoiningDate(v)} />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (currentStepId === 'education_address') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isVisible('staff_education') && (
              <div className="sm:col-span-2">
                <Label>{bn ? 'শিক্ষাগত যোগ্যতা (ডিগ্রী, প্রতিষ্ঠান ও সন)' : 'Educational Qualification'}</Label>
                <Input
                  className="bg-background mt-1"
                  value={education}
                  placeholder={bn ? 'যেমন: কামিল / দাওরায়ে হাদিস / স্নাতক / স্নাতকোত্তর' : 'e.g. Masters, Graduation, Kamil'}
                  onChange={e => setEducation(e.target.value)}
                />
              </div>
            )}

            {isVisible('staff_experience') && (
              <div>
                <Label>{bn ? 'কাজের অভিজ্ঞতা (বছর / বিবরণ)' : 'Experience'}</Label>
                <Input
                  className="bg-background mt-1"
                  value={experience}
                  placeholder={bn ? 'যেমন: ৩ বছর শিক্ষকতা' : 'e.g. 3 years teaching'}
                  onChange={e => setExperience(e.target.value)}
                />
              </div>
            )}

            {isVisible('staff_prev_institute') && (
              <div>
                <Label>{bn ? 'পূর্ববর্তী কর্মস্থল / প্রতিষ্ঠান' : 'Previous Institute'}</Label>
                <Input
                  className="bg-background mt-1"
                  value={prevInstitute}
                  placeholder={bn ? 'প্রতিষ্ঠানের নাম ও পদ' : 'Institute name'}
                  onChange={e => setPrevInstitute(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="border-t border-border/70 pt-5 space-y-4">
            {isVisible('staff_permanent_addr') && (
              <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={permanentAddr} onChange={setPermanentAddr} />
            )}

            {isVisible('staff_present_addr') && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-muted/40 p-3 rounded-xl border border-slate-200 dark:border-border">
                  <Checkbox id="same-addr-check" checked={sameAddress} onCheckedChange={(v) => setSameAddress(!!v)} />
                  <Label htmlFor="same-addr-check" className="text-xs sm:text-sm font-medium cursor-pointer">
                    {bn ? 'বর্তমান ঠিকানা ও স্থায়ী ঠিকানা একই' : 'Present address is same as permanent address'}
                  </Label>
                </div>
                {!sameAddress && (
                  <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={presentAddr} onChange={setPresentAddr} />
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentStepId === 'parents') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{bn ? 'পিতার নাম' : "Father's Name"} <span className="text-destructive">*</span></Label>
              <Input
                className={`bg-background mt-1 ${fieldErrors['father_name'] ? 'border-destructive' : ''}`}
                value={fatherName}
                placeholder={bn ? 'পিতার পূর্ণ নাম' : "Father's Full Name"}
                onChange={e => handleFieldChange('father_name', e.target.value, setFatherName)}
              />
              <FieldError field="father_name" />
            </div>

            {isVisible('staff_father_mobile') && (
              <PhoneInput
                label={bn ? 'পিতার মোবাইল নম্বর' : "Father's Mobile"}
                value={fatherMobile}
                countryCode={fatherMobileCode}
                onChange={(p, c) => { setFatherMobile(p); setFatherMobileCode(c); }}
              />
            )}

            {isVisible('staff_father_nid') && (
              <div>
                <Label>{bn ? 'পিতার NID (১০/১৭ ডিজিট)' : "Father's NID"}</Label>
                <Input
                  className="bg-background mt-1"
                  maxLength={17}
                  value={fatherNid}
                  placeholder={bn ? 'পিতার জাতীয় পরিচয়পত্র নম্বর' : "Father's NID"}
                  onChange={e => setFatherNid(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            )}

            {isVisible('staff_father_occupation') && (
              <div>
                <Label>{bn ? 'পিতার পেশা' : "Father's Occupation"}</Label>
                <Input
                  className="bg-background mt-1"
                  value={fatherOccupation}
                  placeholder={bn ? 'পেশা' : "Occupation"}
                  onChange={e => setFatherOccupation(e.target.value)}
                />
              </div>
            )}

            {isVisible('staff_mother_name') && (
              <div>
                <Label>{bn ? 'মাতার নাম' : "Mother's Name"}</Label>
                <Input
                  className="bg-background mt-1"
                  value={motherName}
                  placeholder={bn ? 'মাতার পূর্ণ নাম' : "Mother's Full Name"}
                  onChange={e => setMotherName(e.target.value)}
                />
              </div>
            )}

            {isVisible('staff_mother_mobile') && (
              <PhoneInput
                label={bn ? 'মাতার মোবাইল নম্বর' : "Mother's Mobile"}
                value={motherMobile}
                countryCode={motherMobileCode}
                onChange={(p, c) => { setMotherMobile(p); setMotherMobileCode(c); }}
              />
            )}

            {isVisible('staff_mother_nid') && (
              <div>
                <Label>{bn ? 'মাতার NID' : "Mother's NID"}</Label>
                <Input
                  className="bg-background mt-1"
                  maxLength={17}
                  value={motherNid}
                  placeholder={bn ? 'মাতার জাতীয় পরিচয়পত্র নম্বর' : "Mother's NID"}
                  onChange={e => setMotherNid(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            )}

            {isVisible('staff_mother_occupation') && (
              <div>
                <Label>{bn ? 'মাতার পেশা' : "Mother's Occupation"}</Label>
                <Input
                  className="bg-background mt-1"
                  value={motherOccupation}
                  placeholder={bn ? 'পেশা' : "Occupation"}
                  onChange={e => setMotherOccupation(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentStepId === 'references') {
      return (
        <div className="space-y-8">
          {/* Section A: Identifier (শনাক্তকারী) */}
          {isVisible('section_identifier') && (
            <div className="space-y-4">
              <div className="border-b border-border pb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-foreground">
                  {bn ? '১. শনাক্তকারীর তথ্য (Identifier Details)' : '1. Identifier Details'}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'শনাক্তকারীর পূর্ণ নাম' : 'Full Name'}</Label>
                  <Input className="bg-background mt-1" value={identifierName} onChange={e => setIdentifierName(e.target.value)} />
                </div>
                <div>
                  <Label>{bn ? 'সম্পর্ক' : 'Relation'}</Label>
                  <Input className="bg-background mt-1" value={identifierRelation} onChange={e => setIdentifierRelation(e.target.value)} />
                </div>
                <PhoneInput label={bn ? 'মোবাইল নম্বর' : 'Mobile'} value={identifierMobile} countryCode={identifierMobileCode} onChange={(p, c) => { setIdentifierMobile(p); setIdentifierMobileCode(c); }} />
                <div>
                  <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'}</Label>
                  <Input className={`bg-background mt-1 ${identifierNidError ? 'border-destructive' : ''}`} maxLength={17} value={identifierNid} onChange={e => validateNid(e.target.value, setIdentifierNid, setIdentifierNidError)} />
                  {identifierNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{identifierNidError}</p>}
                </div>
                <div className="sm:col-span-2">
                  <AddressFields label={bn ? 'শনাক্তকারীর পূর্ণ ঠিকানা' : 'Address'} value={identifierAddr} onChange={setIdentifierAddr} />
                </div>
              </div>
            </div>
          )}

          {/* Section B: Introducer / Relatives (পরিচয়কারী) */}
          {isVisible('section_relatives') && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="border-b border-border pb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-foreground">
                  {bn ? '২. পরিচয়কারীর তথ্য (Introducer / Relative Information)' : '2. Introducer / Relative Information'}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'পরিচয়কারীর পূর্ণ নাম' : 'Full Name'}</Label>
                  <Input className="bg-background mt-1" value={relIdName} onChange={e => setRelIdName(e.target.value)} />
                </div>
                <div>
                  <Label>{bn ? 'সম্পর্ক / পদবি' : 'Relation / Designation'}</Label>
                  <Input className="bg-background mt-1" value={relIdRelation} onChange={e => setRelIdRelation(e.target.value)} />
                </div>
                <PhoneInput label={bn ? 'মোবাইল নম্বর' : 'Mobile'} value={relIdMobile} countryCode={relIdMobileCode} onChange={(p, c) => { setRelIdMobile(p); setRelIdMobileCode(c); }} />
                <div>
                  <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'}</Label>
                  <Input className={`bg-background mt-1 ${relIdNidError ? 'border-destructive' : ''}`} maxLength={17} value={relIdNid} onChange={e => validateNid(e.target.value, setRelIdNid, setRelIdNidError)} />
                  {relIdNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{relIdNidError}</p>}
                </div>
                <div className="sm:col-span-2">
                  <AddressFields label={bn ? 'পরিচয়কারীর পূর্ণ ঠিকানা' : 'Address'} value={relIdAddr} onChange={setRelIdAddr} />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (currentStepId === 'documents') {
      return (
        <div className="space-y-6">
          {/* Document Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-foreground">
                {bn ? 'প্রয়োজনীয় কাগজপত্র আপলোড (ঐচ্ছিক)' : 'Upload Documents (Optional)'}
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="bg-background w-full sm:w-64">
                  <SelectValue placeholder={bn ? 'ডকুমেন্টের ধরন নির্বাচন' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{bn ? d.bn : d.en}</SelectItem>)}
                </SelectContent>
              </Select>
              {docType === 'other' && (
                <Input className="bg-background sm:w-48" placeholder={bn ? 'ধরনের নাম লিখুন' : 'Type name'} value={customDocType} onChange={e => setCustomDocType(e.target.value)} />
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleDocUpload} />
              <Button type="button" variant="outline" onClick={() => { if (!docType) { toast.error(bn ? 'ধরন নির্বাচন করুন' : 'Select type first'); return; } fileInputRef.current?.click(); }} className="gap-2 shrink-0">
                <Upload className="w-4 h-4" /> {bn ? 'ফাইল বাছাই করুন' : 'Choose File'}
              </Button>
            </div>

            {documents.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left px-3.5 py-2.5 font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-3.5 py-2.5 font-semibold text-muted-foreground">{bn ? 'ধরন' : 'Type'}</th>
                      <th className="text-left px-3.5 py-2.5 font-semibold text-muted-foreground">{bn ? 'ফাইল নাম' : 'File Name'}</th>
                      <th className="text-right px-3.5 py-2.5 font-semibold text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map((doc, i) => (
                      <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3.5 py-2.5">{i + 1}</td>
                        <td className="px-3.5 py-2.5 font-medium">{doc.type}</td>
                        <td className="px-3.5 py-2.5 text-muted-foreground truncate max-w-[180px]">{doc.name}</td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex gap-1 justify-end">
                            <button type="button" onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title={bn ? 'প্রিভিউ দেখুন' : 'Preview'}><Eye className="w-4 h-4" /></button>
                            <button type="button" onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title={bn ? 'মুছে ফেলুন' : 'Delete'}><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border">
                {bn ? 'এখনো কোনো ফাইল আপলোড করা হয়নি (প্রয়োজনে NID, শিক্ষাগত সনদ যোগ করতে পারেন)' : 'No documents uploaded yet'}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (currentStepId === 'review_submit') {
      const desigObj = designationsList.find(d => d.id === designation);
      const desigLabel = desigObj ? (bn ? desigObj.name_bn : desigObj.name) : designation;

      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-4">
            <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              {bn ? 'আবেদন তথ্য চূড়ান্ত পর্যালোচনা' : 'Final Review of Application Information'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {bn ? 'দয়া করে আপনার প্রদত্ত সকল তথ্য সতর্কতার সাথে যাচাই করুন। কোনো তথ্য সংশোধন করতে সংশ্লিষ্ট ধাপে ক্লিক করে পরিবর্তন করতে পারেন।' : 'Please review your details carefully before final submission.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white dark:bg-card p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
              <div><span className="text-muted-foreground">{bn ? 'প্রার্থীর নাম (বাংলা): ' : 'Name (Bangla): '}</span><span className="font-bold text-foreground">{firstName || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'নাম (ইংরেজি): ' : 'Name (English): '}</span><span className="font-semibold text-foreground">{lastName || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'আবেদনকৃত পদবী: ' : 'Designation: '}</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{desigLabel || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'চাকরির ধরন: ' : 'Employment: '}</span><span className="font-medium text-foreground">{employmentType === 'full_time' ? (bn ? 'পূর্ণকালীন' : 'Full Time') : (bn ? 'খণ্ডকালীন' : 'Part Time')}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'বৈবাহিক অবস্থা: ' : 'Marital Status: '}</span><span className="font-semibold text-foreground">{MARITAL_STATUSES.find(m => m.value === maritalStatus)?.[bn ? 'bn' : 'en'] || maritalStatus}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'মোবাইল নম্বর: ' : 'Mobile: '}</span><span className="font-mono font-medium text-foreground">{mobile ? `${mobileCode} ${mobile}` : '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'জাতীয় পরিচয়পত্র (NID): ' : 'NID: '}</span><span className="font-mono text-foreground">{nid || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'জন্ম তারিখ: ' : 'Birth Date: '}</span><span className="font-medium text-foreground">{dob || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'শিক্ষাগত যোগ্যতা: ' : 'Education: '}</span><span className="font-medium text-foreground">{education || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'স্থায়ী ঠিকানা: ' : 'Permanent Address: '}</span><span className="font-medium text-foreground">{formatAddress(permanentAddr, bn) || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'পিতার নাম: ' : "Father's Name: "}</span><span className="font-medium text-foreground">{fatherName || '—'}</span></div>
              <div><span className="text-muted-foreground">{bn ? 'মাতার নাম: ' : "Mother's Name: "}</span><span className="font-medium text-foreground">{motherName || '—'}</span></div>
            </div>
          </div>

          {/* Applicant Signature Upload */}
          <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {bn ? 'আবেদনকারীর স্বাক্ষর আপলোড (Applicant Signature)' : 'Upload Applicant Signature'}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {bn ? 'আপনার হস্তলিখিত স্বাক্ষরের ছবি আপলোড করুন (এটি আবেদন স্লিপ ও PDF-এ যুক্ত হবে)' : 'Upload your handwritten signature (will appear on slip and PDF)'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <input
                ref={sigInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleSignatureUpload}
              />

              {signatureUrl ? (
                <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-xl border border-emerald-300 dark:border-emerald-800">
                  <div className="w-36 h-16 bg-white dark:bg-card rounded-lg border flex items-center justify-center p-1 overflow-hidden">
                    <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> {bn ? 'স্বাক্ষর সংযুক্ত হয়েছে' : 'Signature Attached'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSignatureUrl(null)}
                      className="text-xs text-destructive hover:underline block"
                    >
                      {bn ? 'স্বাক্ষর মুছুন / পরিবর্তন' : 'Remove / Change'}
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingSig}
                  onClick={() => sigInputRef.current?.click()}
                  className="border-dashed border-2 px-6 py-6 gap-2 text-xs font-semibold hover:border-emerald-500 hover:bg-emerald-50/50"
                >
                  {uploadingSig ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Upload className="w-4 h-4 text-emerald-600" />}
                  {bn ? 'স্বাক্ষরের ছবি আপলোড করুন' : 'Upload Signature Image'}
                </Button>
              )}
            </div>
          </div>

          {/* Declaration Checkbox */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-muted/30 border border-slate-200 dark:border-border">
            <Checkbox
              id="staff-declaration"
              checked={declarationAgreed}
              onCheckedChange={(c) => setDeclarationAgreed(!!c)}
              className="mt-0.5"
            />
            <Label htmlFor="staff-declaration" className="text-xs text-foreground leading-relaxed cursor-pointer font-medium">
              {bn
                ? 'আমি শপথপূর্বক ঘোষণা করছি যে, এই নিয়োগ আবেদনপত্রে প্রদত্ত সকল তথ্য সম্পূর্ণ সত্য, সঠিক ও নির্ভুল। কোনো তথ্য অসত্য বা গোপন প্রমাণিত হলে কর্তৃপক্ষ আইনানুগ ব্যবস্থা গ্রহণ করতে পারবে।'
                : 'I solemnly declare that all information provided in this employment application is true, accurate and complete.'}
            </Label>
          </div>

          {/* Footer Notice */}
          {footerText && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-200 dark:border-border text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {footerText}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const selectedDesigObj = designationsList.find((d: any) => d.id === designation);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        {/* Mode Switcher Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1.5 rounded-2xl bg-muted/70 border border-border/80 shadow-xs">
            <button
              type="button"
              onClick={() => setPageMode('apply')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                pageMode === 'apply'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              {bn ? 'নতুন স্টাফ আবেদন' : 'Staff Application'}
            </button>
            <button
              type="button"
              onClick={() => setPageMode('track')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                pageMode === 'track'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-4 h-4" />
              {bn ? 'স্টাফ ট্র্যাকিং ও স্লিপ ডাউনলোড' : 'Staff Tracking & Slip'}
            </button>
          </div>
        </div>

        {pageMode === 'track' ? (
          <ApplicationTrackingBox
            targetType="staff"
            onSwitchToApply={() => setPageMode('apply')}
          />
        ) : (
          <>
            {/* Step 1: Active Designation Cards Selection (When designation not yet confirmed) */}
            {!designationConfirmed && (
              <div className="card-elevated p-6 sm:p-8 space-y-6 mb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        {bn ? 'নিয়োগ বিজ্ঞপ্তি ও পদবী নির্বাচন করুন' : 'Select Position for Application'}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bn ? 'যে পদে আবেদন করতে চান তা নির্বাচন করে পরবর্তী ধাপে এগিয়ে যান।' : 'Choose the designation you wish to apply for.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Designation Cards Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">১</span>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      {bn ? 'আবেদনকৃত পদবী নির্বাচন' : 'Select Applied Designation'} <span className="text-destructive">*</span>
                    </h3>
                  </div>

                  {designationsList.length === 0 ? (
                    <div className="text-center py-12 border rounded-2xl bg-muted/20">
                      <p className="text-sm text-muted-foreground">
                        {bn ? 'বর্তমানে কোনো পদে সচল নিয়োগ বিজ্ঞপ্তি পাওয়া যায়নি।' : 'No active designations available for application.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {designationsList.map((d: any) => {
                        const isSelected = designation === d.id;
                        return (
                          <div
                            key={d.id}
                            onClick={() => {
                              handleFieldChange('designation', d.id, setDesignation);
                            }}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-md shadow-emerald-600/10'
                                : 'border-border/80 bg-card hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                              )}
                            </div>
                            <div className="mt-3">
                              <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">{bn ? d.name_bn : (d.name || d.name_bn)}</h4>
                              {d.name && d.name !== d.name_bn && (
                                <p className="text-xs text-muted-foreground mt-0.5">{d.name}</p>
                              )}
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                  {bn ? 'আবেদন চলছে' : 'Accepting Applications'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 2: Proceed Button */}
                <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground text-center sm:text-left">
                    {designation
                      ? (bn ? 'পদবী নির্বাচিত হয়েছে। ফর্মে যেতে পরবর্তী বাটনে চাপুন।' : 'Position selected. Click next to proceed.')
                      : (bn ? 'অনুগ্রহ করে আবেদন করার জন্য একটি পদবী নির্বাচন করুন।' : 'Please select a position to proceed.')}
                  </span>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!designation) {
                        toast.error(bn ? 'দয়া করে একটি পদবী নির্বাচন করুন' : 'Please select a designation');
                        return;
                      }
                      setDesignationConfirmed(true);
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                    disabled={!designation}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs btn-primary-gradient gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
                  >
                    <span>{bn ? 'পরবর্তী (ফরম পূরণ করুন)' : 'Proceed to Form'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Main Staff Form (Visible when designation is confirmed) */}
            {designationConfirmed && (
              <div className="border border-slate-200/90 dark:border-border rounded-3xl shadow-xl overflow-hidden bg-white dark:bg-card">
                
                {/* Selected Designation Floating Banner */}
                <div className="px-6 pt-4 pb-0">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{bn ? 'আবেদনকৃত পদবী:' : 'Applied Designation:'}</p>
                        <p className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                          {selectedDesigObj ? (bn ? selectedDesigObj.name_bn : (selectedDesigObj.name || selectedDesigObj.name_bn)) : designation}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDesignationConfirmed(false)}
                      className="h-7 text-[11px] font-semibold rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50"
                    >
                      {bn ? 'পদবী পরিবর্তন' : 'Change'}
                    </Button>
                  </div>
                </div>
          
          {/* Top Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20 border-b border-slate-200/80 dark:border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">
                    {bn ? 'শিক্ষক / স্টাফ নিয়োগ আবেদন ফরম' : 'Staff / Teacher Employment Application'}
                  </h1>
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                    {bn ? 'অনলাইন আবেদন' : 'Online Form'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                  {bn ? 'আবশ্যকীয় তথ্যগুলো পূরণ করে পরবর্তী ধাপে এগিয়ে যান। ' : 'Fill in required fields to proceed. '}
                  <span className="text-rose-500 font-bold">*</span>
                  {bn ? ' চিহ্নিত ঘর বাধ্যতামূলক।' : ' denotes required.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 dark:text-foreground">
                  {bn ? `ধাপ ${safeCurrentStep + 1} / ${activeSteps.length}` : `Step ${safeCurrentStep + 1} of ${activeSteps.length}`}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Wizard Bar */}
          <div className="px-4 sm:px-6 py-4 bg-slate-50/80 dark:bg-muted/40 border-b border-slate-200/70 dark:border-border/70">
            <div className="relative flex items-center justify-between max-w-2xl mx-auto">
              {/* Background Progress Line */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-200 dark:bg-muted rounded-full -z-0">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${(safeCurrentStep / Math.max(1, activeSteps.length - 1)) * 100}%` }}
                />
              </div>

              {activeSteps.map((step, idx) => {
                const isCurrent = idx === safeCurrentStep;
                const isCompleted = idx < safeCurrentStep;
                const StepIcon = step.icon;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    className={`relative z-10 flex flex-col items-center group focus:outline-none transition-all ${
                      idx < safeCurrentStep ? 'cursor-pointer' : isCurrent ? 'cursor-default' : 'cursor-pointer hover:opacity-100 opacity-80'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center transition-all duration-200 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-200 dark:ring-emerald-800 shadow-sm'
                          : isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950 shadow-md scale-105'
                          : 'bg-white dark:bg-card text-slate-500 dark:text-muted-foreground border-2 border-slate-300 dark:border-border/80'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>

                    <span
                      className={`mt-1.5 text-xs text-center font-semibold line-clamp-1 max-w-[85px] sm:max-w-none transition-colors ${
                        isCurrent ? 'text-emerald-700 dark:text-emerald-400 font-bold' : isCompleted ? 'text-slate-700 dark:text-foreground' : 'text-slate-400 dark:text-muted-foreground'
                      }`}
                    >
                      {bn ? step.bn : step.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Step Body */}
          <div className="p-5 sm:p-6 lg:p-8 space-y-6 bg-slate-50/40 dark:bg-transparent min-h-[380px]">
            {Object.keys(fieldErrors).length > 0 && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 space-y-1">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {bn ? 'দয়া করে নিচের ঘরগুলো সঠিকভাবে পূরণ করুন:' : 'Please fix the required fields below:'}
                </p>
                <ul className="text-xs text-destructive list-disc list-inside ml-2">
                  {Object.values(fieldErrors).map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </div>
            )}

            {renderCurrentStepContent()}
          </div>

          {/* Bottom Sticky Navigation Bar */}
          <div className="px-6 py-4 bg-white dark:bg-card border-t border-slate-200 dark:border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner sticky bottom-0 z-20">
            {safeCurrentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentStep(prev => Math.max(0, prev - 1));
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-border bg-white dark:bg-card text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                {bn ? 'পূর্ববর্তী ধাপ' : 'Previous Step'}
              </Button>
            ) : (
              <div className="hidden sm:block w-[120px]" />
            )}

            <div className="text-xs text-slate-600 dark:text-muted-foreground font-medium order-first sm:order-none flex items-center gap-2 bg-slate-100 dark:bg-muted/70 px-4 py-1.5 rounded-full border border-slate-200 dark:border-border">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-semibold text-slate-800 dark:text-foreground">
                {bn ? `ধাপ ${safeCurrentStep + 1} : ${activeSteps[safeCurrentStep]?.bn}` : `Step ${safeCurrentStep + 1} : ${activeSteps[safeCurrentStep]?.en}`}
              </span>
            </div>

            {safeCurrentStep < activeSteps.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  if (validateCurrentStep(activeSteps[safeCurrentStep].id)) {
                    setCurrentStep(prev => Math.min(activeSteps.length - 1, prev + 1));
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }
                }}
                className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>{bn ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSubmit()}
                className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {bn ? 'আবেদন জমা দিন' : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
            )}
          </>
        )}

        <DocumentPreviewModal
          open={!!previewDoc}
          onOpenChange={() => setPreviewDoc(null)}
          fileUrl={previewDoc?.url}
          fileName={previewDoc?.name}
          title={previewDoc ? `${previewDoc.type} - ${previewDoc.name}` : undefined}
        />
      </div>
    </PublicLayout>
  );
};

export default StaffApplicationPage;