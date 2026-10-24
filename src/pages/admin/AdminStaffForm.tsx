import AdminLayout from '@/components/AdminLayout';
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
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useApiVerificationEnabled } from '@/hooks/useApiVerification';
import { useState, useRef, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle, Check, Loader2, Upload, Trash2, Eye, Printer, Download, FileText, X, CalendarIcon, Mail, ArrowLeft, ArrowRight, Clock, Users, ShieldCheck, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useValidationRules } from '@/hooks/useValidationRules';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { useStaffFormConfig } from '@/hooks/useStaffFormConfig';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { invalidateAllStaffQueries } from '@/lib/staffQueryInvalidator';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { isFutureJoiningDate } from '@/lib/joiningDate';
import { resolveStaffFormNames, cleanStaffName, deduplicateRepeatedWords, hasBangla, hasEnglish } from '@/lib/nameFormatter';
import { formatAddress as formatBanglaAddress } from '@/lib/banglaAddressHelper';
import { cleanPhoneNumber } from '@/lib/phoneUtils';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const formatAddress = (addr: AddressData, bn = true) => {
  return formatBanglaAddress(addr, bn);
};

interface DocFile {
  id: string;
  type: string;
  name: string;
  url: string;
  file?: File;
}


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
  { value: 'nid', bn: 'জাতীয় পরিচয়পত্র', en: 'NID' },
  { value: 'birth_certificate', bn: 'জন্ম সনদ', en: 'Birth Certificate' },
  { value: 'education_certificate', bn: 'শিক্ষা সনদ', en: 'Education Certificate' },
  { value: 'citizenship_certificate', bn: 'নাগরিকত্ব সনদ', en: 'Citizenship Certificate' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

export type StaffCategory = 'teacher' | 'administrative' | 'general' | 'support' | 'director' | 'committee_member' | 'all';

// Section visibility config per category — all categories show all sections equally
const CATEGORY_SECTIONS: Record<StaffCategory, { showEducation: boolean; showIdentifier: boolean; showRelativesIdentifier: boolean; showGuardian: boolean; showParentAddress: boolean }> = {
  teacher: { showEducation: true, showIdentifier: true, showRelativesIdentifier: true, showGuardian: true, showParentAddress: true },
  administrative: { showEducation: true, showIdentifier: true, showRelativesIdentifier: true, showGuardian: true, showParentAddress: true },
  general: { showEducation: true, showIdentifier: true, showRelativesIdentifier: true, showGuardian: true, showParentAddress: true },
  support: { showEducation: true, showIdentifier: true, showRelativesIdentifier: true, showGuardian: true, showParentAddress: true },
  director: { showEducation: true, showIdentifier: true, showRelativesIdentifier: true, showGuardian: true, showParentAddress: true },
  committee_member: { showEducation: true, showIdentifier: true, showRelativesIdentifier: true, showGuardian: true, showParentAddress: true },
  all: { showEducation: true, showIdentifier: true, showRelativesIdentifier: true, showGuardian: true, showParentAddress: true },
};

const CATEGORY_TITLES: Record<StaffCategory, { bn: string; en: string; addBn: string; addEn: string; editBn: string; editEn: string }> = {
  teacher: { bn: 'শিক্ষক', en: 'Teacher', addBn: 'নতুন শিক্ষক যোগ করুন', addEn: 'Add New Teacher', editBn: 'শিক্ষক সম্পাদনা', editEn: 'Edit Teacher' },
  administrative: { bn: 'প্রশাসনিক কর্মকর্তা', en: 'Administrative Staff', addBn: 'নতুন প্রশাসনিক কর্মকর্তা যোগ করুন', addEn: 'Add Administrative Staff', editBn: 'প্রশাসনিক কর্মকর্তা সম্পাদনা', editEn: 'Edit Administrative Staff' },
  general: { bn: 'সহায়ক কর্মী', en: 'General Staff', addBn: 'নতুন সহায়ক কর্মী যোগ করুন', addEn: 'Add General Staff', editBn: 'সহায়ক কর্মী সম্পাদনা', editEn: 'Edit General Staff' },
  support: { bn: 'অফিস কর্মচারী', en: 'Support Staff', addBn: 'নতুন অফিস কর্মচারী যোগ করুন', addEn: 'Add Support Staff', editBn: 'অফিস কর্মচারী সম্পাদনা', editEn: 'Edit Support Staff' },
  director: { bn: 'পরিচালক', en: 'Director', addBn: 'নতুন পরিচালক যোগ করুন', addEn: 'Add Director', editBn: 'পরিচালক সম্পাদনা', editEn: 'Edit Director' },
  committee_member: { bn: 'কমিটি সদস্য', en: 'Committee Member', addBn: 'নতুন কমিটি সদস্য যোগ করুন', addEn: 'Add Committee Member', editBn: 'কমিটি সদস্য সম্পাদনা', editEn: 'Edit Committee Member' },
  all: { bn: 'কর্মী/শিক্ষক', en: 'Staff/Teacher', addBn: 'নতুন কর্মী/শিক্ষক যোগ করুন', addEn: 'Add New Staff/Teacher', editBn: 'কর্মী/শিক্ষক সম্পাদনা', editEn: 'Edit Staff/Teacher' },
};

const CATEGORY_BACK_PATH: Record<StaffCategory, string> = {
  teacher: '/admin/teachers',
  administrative: '/admin/administrative-staff',
  general: '/admin/general-staff',
  support: '/admin/support-staff',
  director: '/admin/directors',
  committee_member: '/admin/committee-members',
  all: '/admin/staff',
};

const AdminStaffForm = ({ staffCategory = 'all' }: { staffCategory?: StaffCategory }) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const backPath = CATEGORY_BACK_PATH[staffCategory];
  const { canAddItem, canEditItem } = usePagePermissions(backPath);
  const { checkApproval, isRecordPending, needsApproval } = useApprovalCheck(backPath, 'staff');
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const [searchParams] = useSearchParams();
  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
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

  const isPendingStaff = (existingStaff as any)?.status === 'pending';
  const isApprovalMode = searchParams.get('mode') === 'approve' || isPendingStaff;
  const [approveOnSave, setApproveOnSave] = useState(false);
  const { validate, validateAll } = useValidationRules('staff');
  const { data: apiVerifyEnabled } = useApiVerificationEnabled();
  const { isFieldActive, isFieldRequired, getField, isLoaded: staffConfigLoaded } = useStaffFormConfig();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const sectionConfig = CATEGORY_SECTIONS[staffCategory];
  const titleConfig = CATEGORY_TITLES[staffCategory];
  const initialStaffCategory = staffCategory !== 'all' ? staffCategory : 'general';
  const [selectedStaffCategory, setSelectedStaffCategory] = useState<string>(initialStaffCategory);
  const [currentStep, setCurrentStep] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);


  // Section 1: Employee
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [salary, setSalary] = useState('');
  // Director/committee visibility flags (default true so existing categories don't change behaviour)
  const [includeInPayroll, setIncludeInPayroll] = useState(true);
  const [includeInAttendance, setIncludeInAttendance] = useState(true);
  const [customRoleId, setCustomRoleId] = useState<string>('none');

  // Load custom roles for selection
  const { data: customRolesList = [] } = useQuery({
    queryKey: ['custom-roles-active-form'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_roles').select('id, name, name_bn, base_role').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');

  // Prefill from URL query params (?email=&full_name=) when creating new staff from User Management
  useEffect(() => {
    if (isEditMode) return;
    const qEmail = searchParams.get('email');
    const qName = searchParams.get('full_name');
    if (qEmail) setStaffEmail((prev) => prev || qEmail);
    if (qName) {
      const parts = qName.trim().split(/\s+/);
      setFirstName((prev) => prev || (parts[0] || ''));
      setLastName((prev) => prev || (parts.slice(1).join(' ') || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [emailVerified, setEmailVerified] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [mobile, setMobile] = useState('');
  const [mobileCode, setMobileCode] = useState('+880');
  const [employmentType, setEmploymentType] = useState('');
  const [designation, setDesignation] = useState('');
  const [residenceType, setResidenceType] = useState('');
  const [dob, setDob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
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
  const [joiningDate, setJoiningDate] = useState('');
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
  const [activeIdentifierTab, setActiveIdentifierTab] = useState<'identifier' | 'introducer'>('identifier');

  // Section 4b: Relatives Identifier
  const [relIdName, setRelIdName] = useState('');
  const [relIdRelation, setRelIdRelation] = useState('');
  const [relIdMobile, setRelIdMobile] = useState('');
  const [relIdMobileCode, setRelIdMobileCode] = useState('+880');
  const [relIdNid, setRelIdNid] = useState('');
  const [relIdNidError, setRelIdNidError] = useState('');
  const [relIdAddr, setRelIdAddr] = useState<AddressData>(emptyAddress);

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

  const designationsHardcoded = [
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

  // Load all active designations (no category filter so user can pick any title)
  const { data: staffCategories = [] } = useQuery({
    queryKey: ['staff_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_categories')
        .select('key, name, name_bn, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dbDesignations = [] } = useQuery({
    queryKey: ['designations-for-form-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Load administrative officers & staff for approver selection
  const { data: administrativeOfficers = [] } = useQuery({
    queryKey: ['administrative-officers-approver-list', bn],
    queryFn: async () => {
      // 1. Fetch from administrative_officers table
      const { data: officers } = await supabase
        .from('administrative_officers' as any)
        .select('id, name_bn, name_en, designation, photo_url')
        .is('deleted_at', null)
        .order('name_bn');

      // 2. Fetch staff categorized as administrative or director
      const { data: adminStaff } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, designation, photo_url')
        .or('staff_category.eq.administrative,staff_category.eq.director,department.ilike.%প্রশাসন%')
        .is('deleted_at', null)
        .order('name_bn');

      const map = new Map<string, { id: string; name: string; position: string; photo_url?: string | null }>();

      (officers || []).forEach((o: any) => {
        const primary = (bn ? (o.name_bn || o.name_en) : (o.name_en || o.name_bn)) || '';
        if (primary && primary.trim()) {
          map.set(primary.trim().toLowerCase(), {
            id: `off_${o.id}`,
            name: primary.trim(),
            position: (o.designation || (bn ? 'প্রশাসনিক কর্মকর্তা' : 'Administrative Officer')).trim(),
            photo_url: o.photo_url || null,
          });
        }
      });

      (adminStaff || []).forEach((s: any) => {
        const primary = (bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)) || '';
        if (primary && primary.trim() && !map.has(primary.trim().toLowerCase())) {
          map.set(primary.trim().toLowerCase(), {
            id: `st_${s.id}`,
            name: primary.trim(),
            position: (s.designation || (bn ? 'প্রশাসনিক কর্মকর্তা' : 'Administrative Officer')).trim(),
            photo_url: s.photo_url || null,
          });
        }
      });

      return Array.from(map.values());
    },
  });
  // Use unique id for keys (multiple designations may share the same English name with different Bangla labels).
  const designations = dbDesignations.length > 0
    ? dbDesignations.map((d: any) => ({ value: d.name, bn: d.name_bn, en: d.name, staff_category: d.staff_category, id: d.id }))
    : designationsHardcoded.map(d => ({ ...d, staff_category: initialStaffCategory, id: d.value }));
  const filteredDesignations = designations.filter((d: any) => !selectedStaffCategory || !d.staff_category || d.staff_category === selectedStaffCategory);
  // Populate form fields when editing
  useEffect(() => {
    if (!isEditMode || !existingStaff || dataLoaded) return;
    const sd = (existingStaff.staff_data as any) || {};
    setSelectedStaffCategory(existingStaff.staff_category || initialStaffCategory);
    const cleaned = cleanStaffName(existingStaff.name_bn, existingStaff.name_en);
    const rawFirst = sd.first_name || '';
    const rawLast = sd.last_name || '';

    // Field 1 (first_name) = সম্পূর্ণ নাম (বাংলা)
    // Field 2 (last_name) = সম্পূর্ণ নাম (ইংরেজি)
    const fHasBn = hasBangla(rawFirst);
    const lHasBn = hasBangla(rawLast);
    const fHasEn = hasEnglish(rawFirst);
    const lHasEn = hasEnglish(rawLast);

    if (fHasBn && lHasBn && !fHasEn && !lHasEn) {
      // Both are purely Bengali! (e.g. rawFirst="মাওলানাঃ ফারহান হোসাইন", rawLast="ফারহান হোসাইন")
      let fullBn = '';
      if (rawFirst.toLowerCase().includes(rawLast.toLowerCase())) {
        fullBn = rawFirst;
      } else if (rawLast.toLowerCase().includes(rawFirst.toLowerCase())) {
        fullBn = rawLast;
      } else {
        fullBn = `${rawFirst} ${rawLast}`;
      }
      setFirstName(deduplicateRepeatedWords(fullBn));
      // English field must NOT contain Bengali!
      setLastName(cleaned.has_distinct_english ? (cleaned.name_en || '') : '');
    } else if (fHasBn && lHasEn && !fHasEn && !lHasBn) {
      // Standard: first is Bengali, last is English
      setFirstName(deduplicateRepeatedWords(rawFirst));
      setLastName(deduplicateRepeatedWords(rawLast));
    } else if (lHasBn && fHasEn && !lHasEn && !fHasBn) {
      // Inverted: first is English, last is Bengali
      setFirstName(deduplicateRepeatedWords(rawLast));
      setLastName(deduplicateRepeatedWords(rawFirst));
    } else if (rawFirst || rawLast) {
      if (lHasBn && !lHasEn) {
        // rawLast contains only Bengali, do not let it into English field
        const combined = rawFirst.toLowerCase().includes(rawLast.toLowerCase())
          ? rawFirst
          : `${rawFirst} ${rawLast}`;
        setFirstName(deduplicateRepeatedWords(combined));
        setLastName(cleaned.has_distinct_english ? (cleaned.name_en || '') : '');
      } else {
        setFirstName(cleaned.name_bn || deduplicateRepeatedWords(rawFirst));
        setLastName(lHasEn ? deduplicateRepeatedWords(rawLast) : (cleaned.has_distinct_english ? (cleaned.name_en || '') : ''));
      }
    } else {
      setFirstName(cleaned.name_bn || '');
      setLastName(cleaned.has_distinct_english ? (cleaned.name_en || '') : '');
    }
    const parsedPhone = cleanPhoneNumber(existingStaff.phone, sd.mobile_code);
    setMobile(parsedPhone ? parsedPhone.number : '');
    setMobileCode(parsedPhone ? parsedPhone.code : (sd.mobile_code || '+880'));
    setEmploymentType(existingStaff.employment_type || '');
    const desigMatch = designations.find(d => d.bn === existingStaff.designation || d.en === existingStaff.designation || d.value === existingStaff.designation);
    setDesignation(desigMatch?.value || existingStaff.designation || '');
    setResidenceType(existingStaff.residence_type || '');
    setDob(existingStaff.date_of_birth || '');
    setReligion(existingStaff.religion || '');
      setMaritalStatus((existingStaff as any)?.marital_status || sd.marital_status || '');
    setNid(existingStaff.nid || '');
    setEducation(existingStaff.education || '');
    setExperience(existingStaff.experience || '');
    setPrevInstitute(existingStaff.previous_institute || '');
    setJoiningDate(existingStaff.joining_date || '');
    setSalary(existingStaff.salary?.toString() || '');
    setPhotoUrl(existingStaff.photo_url || null);
    setIncludeInPayroll((existingStaff as any).include_in_payroll ?? true);
    setIncludeInAttendance((existingStaff as any).include_in_attendance ?? true);
    setCustomRoleId((existingStaff as any).custom_role_id || 'none');
    if (sd.permanent_address) setPermanentAddr(sd.permanent_address);
    if (sd.present_address) setPresentAddr(sd.present_address);
    if (sd.parents) {
      const p = sd.parents;
      const parsedFather = cleanPhoneNumber(p.father?.mobile, p.father?.mobile_code);
      const parsedMother = cleanPhoneNumber(p.mother?.mobile, p.mother?.mobile_code);
      setFatherName(p.father?.name || '');
      setFatherMobile(parsedFather ? parsedFather.number : (p.father?.mobile || ''));
      setFatherMobileCode(parsedFather ? parsedFather.code : (p.father?.mobile_code || '+880'));
      setFatherNid(p.father?.nid || '');
      setFatherOccupation(p.father?.occupation || '');
      setMotherName(p.mother?.name || '');
      setMotherMobile(parsedMother ? parsedMother.number : (p.mother?.mobile || ''));
      setMotherMobileCode(parsedMother ? parsedMother.code : (p.mother?.mobile_code || '+880'));
      setMotherNid(p.mother?.nid || '');
      setMotherOccupation(p.mother?.occupation || '');
      if (p.permanent_address) setParentPermAddr(p.permanent_address);
      if (p.present_address) setParentPresAddr(p.present_address);
    }
    if (sd.guardian) {
      const g = sd.guardian;
      const parsedGuardian = cleanPhoneNumber(g.mobile, g.mobile_code);
      setGuardianType(g.type || '');
      setGuardianName(g.name || '');
      setGuardianRelation(g.relation || '');
      setGuardianMobile(parsedGuardian ? parsedGuardian.number : (g.mobile || ''));
      setGuardianMobileCode(parsedGuardian ? parsedGuardian.code : (g.mobile_code || '+880'));
      setGuardianNid(g.nid || '');
      if (g.permanent_address) setGuardianPermAddr(g.permanent_address);
      if (g.present_address) setGuardianPresAddr(g.present_address);
    }
    if (sd.identifier) {
      const ii = sd.identifier;
      const parsedIdentifier = cleanPhoneNumber(ii.mobile, ii.mobile_code);
      setIdentifierName(ii.name || '');
      setIdentifierRelation(ii.relation || '');
      setIdentifierMobile(parsedIdentifier ? parsedIdentifier.number : (ii.mobile || ''));
      setIdentifierMobileCode(parsedIdentifier ? parsedIdentifier.code : (ii.mobile_code || '+880'));
      setIdentifierNid(ii.nid || '');
      if (ii.address) setIdentifierAddr(ii.address);
    }
    if (sd.relatives_identifier) {
      const ri = sd.relatives_identifier;
      const parsedRel = cleanPhoneNumber(ri.mobile, ri.mobile_code);
      setRelIdName(ri.name || '');
      setRelIdRelation(ri.relation || '');
      setRelIdMobile(parsedRel ? parsedRel.number : (ri.mobile || ''));
      setRelIdMobileCode(parsedRel ? parsedRel.code : (ri.mobile_code || '+880'));
      setRelIdNid(ri.nid || '');
      if (ri.address) setRelIdAddr(ri.address);
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

  // Live duplicate check for the staff's own NID (debounced).
  // Only runs once a valid 10/13/17-digit value is typed; checks staff,
  // administrative_officers, and committee_members tables.
  const [nidChecking, setNidChecking] = useState(false);
  useEffect(() => {
    const cleaned = (nid || '').replace(/\D/g, '');
    if (![10, 13, 17].includes(cleaned.length)) return;
    // Don't override format error
    if (nidError && /১০|১৭|10|17/.test(nidError)) return;
    let cancelled = false;
    setNidChecking(true);
    const t = setTimeout(async () => {
      try {
        // Parallel checks across the 3 tables
        const [staffRes, adminRes, commRes] = await Promise.all([
          supabase
            .from('staff')
            .select('id')
            .eq('nid', cleaned)
            .is('deleted_at', null)
            .limit(1),
          supabase
            .from('administrative_officers')
            .select('id')
            .eq('nid', cleaned)
            .is('deleted_at', null)
            .limit(1),
          supabase
            .from('committee_members')
            .select('id')
            .eq('nid', cleaned)
            .is('deleted_at', null)
            .limit(1),
        ]);
        if (cancelled) return;
        const staffHit = (staffRes.data || []).find((r: any) => r.id !== editId);
        const adminHit = (adminRes.data || [])[0];
        const commHit = (commRes.data || [])[0];
        if (staffHit) {
          setNidError(bn ? 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।' : 'This NID is already registered to a staff member.');
        } else if (adminHit) {
          setNidError(bn ? 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।' : 'This NID is already registered to an administrative officer.');
        } else if (commHit) {
          setNidError(bn ? 'এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।' : 'This NID is already registered to a committee member.');
        } else {
          // Clear only previous duplicate-style messages, keep format errors
          setNidError(prev => (prev && /রেজিস্টার্ড|registered/i.test(prev) ? '' : prev));
        }
      } catch {
        // Silent fail — server-side trigger will still block on submit
      } finally {
        if (!cancelled) setNidChecking(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); setNidChecking(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nid, editId, bn]);


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

    try {
      const res = await uploadToCloudinary(file, { folder: 'staff-docs' });
      setDocuments(prev => [...prev, {
        id: crypto.randomUUID(),
        type: selectedType,
        name: file.name,
        url: res.secure_url,
      }]);
      setDocType('');
      setCustomDocType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(bn ? 'ডকুমেন্ট আপলোড হয়েছে' : 'Document uploaded');
    } catch (cErr: any) {
      console.warn('Cloudinary upload failed, falling back to Supabase:', cErr?.message || cErr);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const userPrefix = user?.id || 'public-uploads';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `${userPrefix}/staff-docs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: false });
      if (error) { toast.error(error.message); return; }
      const storageRef = `photos/${path}`;

      setDocuments(prev => [...prev, {
        id: crypto.randomUUID(),
        type: selectedType,
        name: file.name,
        url: storageRef,
      }]);
      setDocType('');
      setCustomDocType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(bn ? 'ডকুমেন্ট আপলোড হয়েছে' : 'Document uploaded');
    }
  };

  const removeDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Submit
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { name_bn: resolvedBn, name_en: resolvedEn } = resolveStaffFormNames(firstName, lastName);
      const fullName = bn ? (resolvedBn || resolvedEn || '') : (resolvedEn || resolvedBn || '');
      const desigLabel = designations.find(d => d.value === designation)?.[bn ? 'bn' : 'en'] || designation;

      const cleanStaff = cleanPhoneNumber(mobile, mobileCode);
      const cleanFather = cleanPhoneNumber(fatherMobile, fatherMobileCode);
      const cleanMother = cleanPhoneNumber(motherMobile, motherMobileCode);
      const cleanGuardian = cleanPhoneNumber(guardianMobile, guardianMobileCode);
      const cleanIdentifier = cleanPhoneNumber(identifierMobile, identifierMobileCode);
      const cleanRelId = cleanPhoneNumber(relIdMobile, relIdMobileCode);

      const staffData = {
        first_name: resolvedBn || firstName,
        last_name: resolvedEn || (hasEnglish(lastName) ? lastName : ''),
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
          permanent_address: parentSameAsStaff ? permanentAddr : parentPermAddr,
          present_address: parentSameAsStaff ? (sameAddress ? permanentAddr : presentAddr) : (parentPresSameAsPerm ? (parentSameAsStaff ? permanentAddr : parentPermAddr) : parentPresAddr),
        },
        guardian: {
          type: guardianType,
          name: guardianType === 'other' ? guardianName : (guardianType === 'father' ? fatherName : motherName),
          relation: guardianType === 'other' ? guardianRelation : (guardianType === 'father' ? (bn ? 'পিতা' : 'Father') : (bn ? 'মাতা' : 'Mother')),
          mobile: guardianType === 'other' ? (cleanGuardian ? cleanGuardian.number : guardianMobile) : (guardianType === 'father' ? (cleanFather ? cleanFather.number : fatherMobile) : (cleanMother ? cleanMother.number : motherMobile)),
          mobile_code: guardianType === 'other' ? (cleanGuardian ? cleanGuardian.code : guardianMobileCode) : (guardianType === 'father' ? (cleanFather ? cleanFather.code : fatherMobileCode) : (cleanMother ? cleanMother.code : motherMobileCode)),
          nid: guardianType === 'other' ? guardianNid : (guardianType === 'father' ? fatherNid : motherNid),
          permanent_address: guardianSameAddr ? permanentAddr : guardianPermAddr,
          present_address: guardianSameAddr ? (sameAddress ? permanentAddr : presentAddr) : guardianPresAddr,
        },
        identifier: {
          name: identifierName,
          relation: identifierRelation,
          mobile: cleanIdentifier ? cleanIdentifier.number : identifierMobile,
          mobile_code: cleanIdentifier ? cleanIdentifier.code : identifierMobileCode,
          nid: identifierNid,
          address: identifierAddr,
        },
        relatives_identifier: {
          name: relIdName,
          relation: relIdRelation,
          mobile: cleanRelId ? cleanRelId.number : relIdMobile,
          mobile_code: cleanRelId ? cleanRelId.code : relIdMobileCode,
          nid: relIdNid,
          address: relIdAddr,
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
        name_bn: resolvedBn || fullName,
        name_en: resolvedEn || null,
        designation: desigLabel,
        phone: cleanStaff ? cleanStaff.full : (mobile ? `${mobileCode}${mobile}` : null),
        email: staffEmail || null,
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
        joining_date: joiningDate || null,
        staff_data: staffData as any,
        staff_category: selectedStaffCategory || initialStaffCategory,
        include_in_payroll: includeInPayroll,
        include_in_attendance: includeInAttendance,
        custom_role_id: customRoleId !== 'none' ? customRoleId : null,
      };

      if (isEditMode && editId) {
        // If the staff_category changed, clear staff_id so the BEFORE UPDATE
        // trigger (auto_generate_staff_id) regenerates it with the new
        // department's prefix (TCH/SUP/GEN/DIR/ADM …).
        const prevCategory = (existingStaff as any)?.staff_category || null;
        const nextCategory = record.staff_category;
        const updatePayload: any = { ...record };
        if (approveOnSave || isApprovalMode) {
          updatePayload.status = 'active';
        }
        if (prevCategory && nextCategory && prevCategory !== nextCategory) {
          updatePayload.staff_id = null;
        }

        // If staff_id has legacy format missing year (e.g. TCH-2017), normalize it to include year
        const currentStaffId = (existingStaff as any)?.staff_id;
        if (currentStaffId && /^([A-Za-z]+)-(\d{4,})$/.test(currentStaffId)) {
          const match = currentStaffId.match(/^([A-Za-z]+)-(\d{4,})$/);
          if (match) {
            const jYear = (updatePayload.joining_date || (existingStaff as any)?.joining_date || new Date().toISOString()).slice(0, 4);
            updatePayload.staff_id = `${match[1]}-${jYear}-${match[2]}`;
          }
        }

        if (await checkApproval('edit', updatePayload, editId, `কর্মী তথ্য সম্পাদনা: ${fullName} (${desigLabel || ''})`)) {
          return { intercepted: true };
        }

        const { error } = await supabase.from('staff').update(updatePayload).eq('id', editId);
        if (error) throw error;
        return { intercepted: false };
      } else {
        const insertPayload = {
          ...record,
          // Do NOT auto-fill today's date when left blank — that caused the
          // joining month to be wrongly prorated. Keep it null so admins must
          // enter the real joining date explicitly.
          joining_date: joiningDate || null,
        };

        if (await checkApproval('add', insertPayload as any, undefined, `নতুন কর্মী যোগ: ${fullName} (${desigLabel || ''})`)) {
          return { intercepted: true };
        }

        const { error } = await supabase.from('staff').insert(insertPayload);
        if (error) throw error;
        return { intercepted: false };
      }
    },
    onSuccess: async (res) => {
      // Invalidate every cache that may show this staff record so the UI
      // (sidebar, dashboard, profile, user list, id-cards, attendance, salary, etc.) reflects the change immediately.
      await invalidateAllStaffQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-profile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['all-pending-actions'] });
      if (!res?.intercepted) {
        if (approveOnSave || isPendingStaff || searchParams.get('from') === 'approvals') {
          toast.success(bn ? '✅ শিক্ষক/স্টাফ আবেদন সফলভাবে সংরক্ষিত ও অনুমোদিত হয়েছে' : '✅ Staff application updated & approved successfully');
          navigate('/admin/approvals');
          return;
        }
        toast.success(bn ? (isEditMode ? `${titleConfig.bn} সফলভাবে আপডেট হয়েছে` : `${titleConfig.bn} সফলভাবে যোগ হয়েছে`) : (isEditMode ? `${titleConfig.en} updated successfully` : `${titleConfig.en} added successfully`));
      }
      navigate(backPath);
    },
    onError: (e: any) => {
      const raw: string = String(e?.message || e?.error_description || e || 'Error saving staff');
      const upper = raw.toUpperCase();
      if (upper.includes('JOINING_DATE_REQUIRED')) {
        const msg = bn ? 'যোগদানের তারিখ দিন' : 'Joining date is required';
        setFieldErrors(prev => ({ ...prev, joining_date: msg }));
        toast.error(msg);
        return;
      }
      if (upper.includes('JOINING_DATE_FUTURE')) {
        const msg = bn ? 'যোগদানের তারিখ ভবিষ্যতের হতে পারে না — সঠিক তারিখ দিন' : 'Joining date cannot be in the future';
        setFieldErrors(prev => ({ ...prev, joining_date: msg }));
        toast.error(msg);
        return;
      }
      if (upper.includes('CUSTOM_ROLE_CATEGORY_MISMATCH')) {
        toast.error(bn
          ? 'নির্বাচিত কাস্টম রোলটি এই স্টাফ ক্যাটেগরির জন্য অনুমোদিত নয়। অনুগ্রহ করে অন্য রোল বাছাই করুন।'
          : 'The selected custom role is not allowed for this staff category. Please choose a different role.');
        return;
      }
      if (upper.includes('INVALID_CUSTOM_ROLE')) {
        toast.error(bn ? 'নির্বাচিত কাস্টম রোলটি অস্তিত্বহীন' : 'Selected custom role does not exist');
        return;
      }
      // Duplicate NID across staff / administrative_officers / committee_members
      if (
        upper.includes('DUPLICATE_NID') ||
        (upper.includes('CROSS_TABLE_DUPLICATE') && /nid|এনআইডি/i.test(raw))
      ) {
        let nidMsg = bn
          ? 'এই NID দিয়ে ইতিমধ্যে একজন রেজিস্টার্ড আছেন।'
          : 'This NID is already registered.';
        if (/staff|স্টাফ/i.test(raw)) {
          nidMsg = bn ? 'এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।' : 'This NID is already registered to a staff member.';
        } else if (/admin|প্রশাসনিক/i.test(raw)) {
          nidMsg = bn ? 'এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।' : 'This NID is already registered to an administrative officer.';
        } else if (/committee|কমিটি/i.test(raw)) {
          nidMsg = bn ? 'এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।' : 'This NID is already registered to a committee member.';
        }
        setFieldErrors(prev => ({ ...prev, nid: nidMsg }));
        toast.error(nidMsg);
        // Scroll the NID field into view for visibility
        setTimeout(() => {
          const el = document.querySelector<HTMLInputElement>('input[maxlength="17"]');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el?.focus();
        }, 100);
        return;
      }
      toast.error(raw);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (isEditMode && editId && isRecordPending(editId)) {
      toast.warning(bn ? '⏳ এই কর্মীর পূর্ববর্তী পরিবর্তন ইতিমধ্যে অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন করার পর কার্যকর হবে।' : '⏳ Previous changes for this staff are already awaiting approval. It will take effect after approval.');
      return;
    }

    // Joining date is mandatory for new staff/teacher (prevents wrong salary proration)
    if (!isEditMode && !joiningDate) {
      const msg = bn ? 'যোগদানের তারিখ দিন — তারিখ ছাড়া নতুন কর্মী/শিক্ষক যোগ করা যাবে না' : 'Joining date is required to add a new staff/teacher';
      setFieldErrors({ joining_date: msg });
      toast.error(msg);
      return;
    }

    // Joining date can never be in the future (prevents salary list hiding staff)
    if (isFutureJoiningDate(joiningDate)) {
      const msg = bn ? 'যোগদানের তারিখ ভবিষ্যতের হতে পারে না — সঠিক তারিখ দিন' : 'Joining date cannot be in the future';
      setFieldErrors({ joining_date: msg });
      toast.error(msg);
      return;
    }

    // Admin bypass: skip all field validation (still requires saveMutation server-side checks)
    if (isAdmin) {
      // If email provided and not verified (and not edit mode), still require OTP
      if (staffEmail.trim() && !emailVerified && !isEditMode) {
        setPendingSave(true);
        setShowOtpDialog(true);
        return;
      }
      saveMutation.mutate();
      return;
    }

    // Helper: only validate if field is active AND required (from custom builder config)
    const reqCheck = (key: string, value: string, msgBn: string, msgEn: string) => {
      if (isFieldActive(key) && isFieldRequired(key) && !value.trim()) {
        errors[key] = bn ? msgBn : msgEn;
      }
    };

    reqCheck('first_name', firstName, 'প্রথম নাম আবশ্যক', 'First name required');
    if (!firstName.trim() || firstName.trim().split(/\s+/).length < 2) {
      reqCheck('last_name', lastName, 'শেষ নাম আবশ্যক', 'Last name required');
    }
    reqCheck('mobile', mobile, 'মোবাইল নম্বর আবশ্যক', 'Mobile required');
    if (isFieldActive('employment_type') && isFieldRequired('employment_type') && !employmentType) errors['employment_type'] = bn ? 'চাকরির ধরন নির্বাচন করুন' : 'Select employment type';
    if (isFieldActive('designation') && isFieldRequired('designation') && !designation) errors['designation'] = bn ? 'পদবী নির্বাচন করুন' : 'Select designation';
    if (isFieldActive('residence_type') && isFieldRequired('residence_type') && !residenceType) errors['residence_type'] = bn ? 'আবাসিক ধরন নির্বাচন করুন' : 'Select residence type';
    if (isFieldActive('dob') && isFieldRequired('dob') && !dob) errors['dob'] = bn ? 'জন্ম তারিখ আবশ্যক' : 'Date of birth required';
    if (isFieldActive('religion') && isFieldRequired('religion') && !religion) errors['religion'] = bn ? 'ধর্ম নির্বাচন করুন' : 'Select religion';
    if (isFieldActive('nid') && isFieldRequired('nid') && (!nid || (nid.length !== 10 && nid.length !== 17))) errors['nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits';
    reqCheck('education', education, 'শিক্ষাগত যোগ্যতা আবশ্যক', 'Education required');
    if (isFieldActive('prev_institute') && experience && !prevInstitute.trim()) errors['prev_institute'] = bn ? 'পূর্ববর্তী কর্মস্থল আবশ্যক' : 'Previous institute required';
    if (isFieldActive('salary') && (existingStaff?.status === 'active' || approveOnSave) && isFieldRequired('salary')) reqCheck('salary', salary, 'বেতন আবশ্যক', 'Salary required');

    // Parents validation
    reqCheck('father_name', fatherName, 'পিতার নাম আবশ্যক', 'Father name required');
    if (isFieldActive('father_nid') && isFieldActive('mother_nid') && !fatherNid && !motherNid) errors['parent_nid'] = bn ? 'অন্তত একটি NID আবশ্যক' : 'At least one parent NID required';
    if (isFieldActive('father_mobile') && isFieldActive('mother_mobile') && !fatherMobile && !motherMobile) errors['parent_mobile'] = bn ? 'অন্তত একটি মোবাইল নম্বর আবশ্যক' : 'At least one parent mobile required';
    reqCheck('father_occupation', fatherOccupation, 'পিতার পেশা আবশ্যক', 'Father occupation required');

    // Guardian validation
    if (isFieldActive('guardian_type') && isFieldRequired('guardian_type') && !guardianType) errors['guardian_type'] = bn ? 'অভিভাবক নির্বাচন করুন' : 'Select guardian';
    if (guardianType === 'other') {
      reqCheck('guardian_name', guardianName, 'অভিভাবকের নাম আবশ্যক', 'Guardian name required');
      reqCheck('guardian_relation', guardianRelation, 'সম্পর্ক আবশ্যক', 'Relation required');
      reqCheck('guardian_mobile', guardianMobile, 'মোবাইল আবশ্যক', 'Mobile required');
      if (isFieldActive('guardian_nid') && isFieldRequired('guardian_nid') && (!guardianNid || (guardianNid.length !== 10 && guardianNid.length !== 17))) errors['guardian_nid'] = bn ? 'NID ১০/১৭ ডিজিট হতে হবে' : 'NID 10/17 digits required';
    }

    // Identifier validation (only if section is visible)
    if (sectionConfig.showIdentifier) {
      reqCheck('identifier_name', identifierName, 'সনাক্তকারীর নাম আবশ্যক', 'Identifier name required');
      reqCheck('identifier_relation', identifierRelation, 'সম্পর্ক আবশ্যক', 'Relation required');
      reqCheck('identifier_mobile', identifierMobile, 'মোবাইল আবশ্যক', 'Mobile required');
      if (isFieldActive('identifier_nid') && isFieldRequired('identifier_nid') && (!identifierNid || (identifierNid.length !== 10 && identifierNid.length !== 17))) { errors['identifier_nid'] = bn ? 'NID ১০/১৭ ডিজিট হতে হবে' : 'NID 10/17 digits required'; setActiveIdentifierTab('identifier'); }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    // If email is provided and not verified (and not edit mode), require OTP verification
    if (staffEmail.trim() && !emailVerified && !isEditMode) {
      setPendingSave(true);
      setShowOtpDialog(true);
      return;
    }

    saveMutation.mutate();
  };

  const handleOtpVerified = () => {
    setEmailVerified(true);
    setShowOtpDialog(false);
    if (pendingSave) {
      setPendingSave(false);
      saveMutation.mutate();
    }
  };

  const handleSaveAndApprove = (e: React.MouseEvent) => {
    e.preventDefault();
    setApproveOnSave(true);
    if (!joiningDate) {
      setJoiningDate(new Date().toISOString().split('T')[0]);
    }
    if (!approverName.trim()) {
      setApproverName(institution?.name ? (bn ? 'প্রধান কর্তৃপক্ষ' : 'Authorized Authority') : 'Admin');
    }
    if (!approverPosition.trim()) {
      setApproverPosition(bn ? 'অধ্যক্ষ / অ্যাডমিন' : 'Principal / Admin');
    }
    if (!approverDate) {
      setApproverDate(new Date().toISOString().split('T')[0]);
    }
    setTimeout(() => {
      saveMutation.mutate();
    }, 50);
  };

  const rawSteps = [
    { id: 'employee', bn: 'ব্যক্তিগত তথ্য', en: 'Personal Info' },
    { id: 'address', bn: 'ঠিকানা', en: 'Address' },
    { id: 'parents', bn: 'পিতা-মাতা', en: 'Parents' },
    ...(sectionConfig.showGuardian ? [{ id: 'guardian', bn: 'অভিভাবক', en: 'Guardian' }] : []),
    ...(sectionConfig.showIdentifier ? [{ id: 'identifier', bn: 'সনাক্তকারী', en: 'Identifier' }] : []),
    ...(sectionConfig.showRelativesIdentifier ? [{ id: 'introducer', bn: 'পরিচয়কারী', en: 'Introducer' }] : []),
    { id: 'documents', bn: 'ডকুমেন্ট আপলোড', en: 'Document Upload' },
    ...(isAdmin ? [{ id: 'approval', bn: 'অনুমোদন ও বেতন', en: 'Approval & Salary' }] : []),
  ];

  const steps = rawSteps.map((s, idx) => ({
    ...s,
    stepNumber: idx + 1,
    displayBn: `${idx + 1}. ${s.bn}`,
    displayEn: `${idx + 1}. ${s.en}`,
  }));

  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepId = steps[safeCurrentStep].id;

  const validateStaffStep = (stepId: string): boolean => {
    const errors: Record<string, string> = {};

    if (stepId === 'employee') {
      if (nidError) errors['nid'] = nidError;
      if (isFutureJoiningDate(joiningDate)) {
        errors['joining_date'] = bn ? 'যোগদানের তারিখ ভবিষ্যতের হতে পারে না — সঠিক তারিখ দিন' : 'Joining date cannot be in the future';
      }
      if (!isAdmin) {
        if (isFieldActive('first_name') && isFieldRequired('first_name') && !firstName.trim()) errors['first_name'] = bn ? 'প্রথম নাম আবশ্যক' : 'First name required';
        if (isFieldActive('last_name') && isFieldRequired('last_name') && !lastName.trim() && (!firstName.trim() || firstName.trim().split(/\s+/).length < 2)) errors['last_name'] = bn ? 'শেষ নাম আবশ্যক' : 'Last name required';
        if (isFieldActive('mobile') && isFieldRequired('mobile') && !mobile.trim()) errors['mobile'] = bn ? 'মোবাইল নম্বর আবশ্যক' : 'Mobile required';
        if (isFieldActive('employment_type') && isFieldRequired('employment_type') && !employmentType) errors['employment_type'] = bn ? 'চাকরির ধরন নির্বাচন করুন' : 'Select employment type';
        if (isFieldActive('designation') && isFieldRequired('designation') && !designation) errors['designation'] = bn ? 'পদবী নির্বাচন করুন' : 'Select designation';
        if (isFieldActive('residence_type') && isFieldRequired('residence_type') && !residenceType) errors['residence_type'] = bn ? 'আবাসিক ধরন নির্বাচন করুন' : 'Select residence type';
        if (isFieldActive('dob') && isFieldRequired('dob') && !dob) errors['dob'] = bn ? 'জন্ম তারিখ আবশ্যক' : 'Date of birth required';
        if (isFieldActive('religion') && isFieldRequired('religion') && !religion) errors['religion'] = bn ? 'ধর্ম নির্বাচন করুন' : 'Select religion';
        if (isFieldActive('nid') && isFieldRequired('nid') && (!nid || (nid.length !== 10 && nid.length !== 17))) errors['nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits';
        if (isFieldActive('education') && isFieldRequired('education') && !education.trim()) errors['education'] = bn ? 'শিক্ষাগত যোগ্যতা আবশ্যক' : 'Education required';
      }
    } else if (stepId === 'address') {
      if (!isAdmin) {
        if (isFieldActive('address_permanent') && isFieldRequired('address_permanent') && !permanentAddr.district) {
          errors['address_permanent'] = bn ? 'স্থায়ী ঠিকানা আবশ্যক' : 'Permanent address required';
        }
      }
    } else if (stepId === 'parents') {
      if (!isAdmin) {
        if (isFieldActive('father_name') && isFieldRequired('father_name') && !fatherName.trim()) errors['father_name'] = bn ? 'পিতার নাম আবশ্যক' : 'Father name required';
        if (isFieldActive('father_nid') && isFieldActive('mother_nid') && !fatherNid && !motherNid) errors['parent_nid'] = bn ? 'অন্তত একটি NID আবশ্যক' : 'At least one parent NID required';
        if (isFieldActive('father_mobile') && isFieldActive('mother_mobile') && !fatherMobile && !motherMobile) errors['parent_mobile'] = bn ? 'অন্তত একটি মোবাইল নম্বর আবশ্যক' : 'At least one parent mobile required';
      }
    } else if (stepId === 'guardian') {
      if (!isAdmin) {
        if (isFieldActive('guardian_type') && isFieldRequired('guardian_type') && !guardianType) errors['guardian_type'] = bn ? 'অভিভাবক নির্বাচন করুন' : 'Select guardian';
        if (guardianType === 'other') {
          if (!guardianName.trim()) errors['guardian_name'] = bn ? 'অভিভাবকের নাম আবশ্যক' : 'Guardian name required';
          if (!guardianRelation.trim()) errors['guardian_relation'] = bn ? 'সম্পর্ক আবশ্যক' : 'Relation required';
          if (!guardianMobile.trim()) errors['guardian_mobile'] = bn ? 'মোবাইল আবশ্যক' : 'Phone required';
          if (isFieldActive('guardian_nid') && isFieldRequired('guardian_nid') && (!guardianNid || (guardianNid.length !== 10 && guardianNid.length !== 17))) errors['guardian_nid'] = bn ? 'NID ১০/১৭ ডিজিট হতে হবে' : 'NID 10/17 digits required';
        }
      }
    } else if (stepId === 'identifier') {
      if (!isAdmin && sectionConfig.showIdentifier) {
        if (isFieldActive('identifier_name') && isFieldRequired('identifier_name') && !identifierName.trim()) { errors['identifier_name'] = bn ? 'সনাক্তকারীর নাম আবশ্যক' : 'Identifier name required'; setActiveIdentifierTab('identifier'); }
        if (isFieldActive('identifier_relation') && isFieldRequired('identifier_relation') && !identifierRelation.trim()) { errors['identifier_relation'] = bn ? 'সম্পর্ক আবশ্যক' : 'Relation required'; setActiveIdentifierTab('identifier'); }
        if (isFieldActive('identifier_mobile') && isFieldRequired('identifier_mobile') && !identifierMobile.trim()) { errors['identifier_mobile'] = bn ? 'মোবাইল আবশ্যক' : 'Mobile required'; setActiveIdentifierTab('identifier'); }
        if (isFieldActive('identifier_nid') && isFieldRequired('identifier_nid') && (!identifierNid || (identifierNid.length !== 10 && identifierNid.length !== 17))) errors['identifier_nid'] = bn ? 'NID ১০/১৭ ডিজিট হতে হবে' : 'NID 10/17 digits required';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      toast.error(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const handleStaffStepClick = (targetIdx: number) => {
    if (targetIdx === safeCurrentStep) return;
    if (targetIdx < safeCurrentStep || isEditMode || isAdmin) {
      setCurrentStep(targetIdx);
      window.scrollTo({ top: 80, behavior: 'smooth' });
    } else {
      if (validateStaffStep(steps[safeCurrentStep].id)) {
        setCurrentStep(targetIdx);
        window.scrollTo({ top: 80, behavior: 'smooth' });
      }
    }
  };

  const handleApproverSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) { toast.error(bn ? 'ফাইল সাইজ ৩০০KB এর বেশি' : 'File size exceeds 300KB'); return; }
    try {
      const res = await uploadToCloudinary(file, { folder: 'approver-signatures' });
      setApproverSignatureUrl(res.secure_url);
      toast.success(bn ? 'স্বাক্ষর আপলোড হয়েছে' : 'Signature uploaded');
    } catch (cErr: any) {
      console.warn('Cloudinary signature upload failed, falling back to Supabase:', cErr?.message || cErr);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const userPrefix = user?.id || 'public-uploads';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${userPrefix}/approver-signatures/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: false });
      if (error) { toast.error(bn ? 'আপলোড ব্যর্থ' : 'Upload failed'); return; }
      setApproverSignatureUrl(`photos/${path}`);
      toast.success(bn ? 'স্বাক্ষর আপলোড হয়েছে' : 'Signature uploaded');
    }
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
    body { font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif; font-size: 10pt; color: #000; padding: 10mm 12mm; line-height: 1.35; }
    .form-header { text-align: center; border-bottom: 2px solid #1a5c2e; padding-bottom: 8px; margin-bottom: 10px; position: relative; }
    .form-header .logo { width: 55px; height: 55px; object-fit: contain; }
    .form-header h1 { font-size: 15pt; font-weight: 700; margin: 3px 0 1px; color: #1a5c2e; }
    .form-header h2 { font-size: 11pt; font-weight: 600; color: #333; margin: 1px 0; }
    .form-header p { font-size: 8.5pt; color: #555; }
    .form-title { background: #1a5c2e; color: #fff; text-align: center; padding: 5px; font-size: 12pt; font-weight: 700; margin: 8px 0; border-radius: 2px; }
    .photo-area { position: absolute; top: 0; right: 0; width: 85px; height: 100px; border: 2px solid #1a5c2e; overflow: hidden; background: #f9f9f9; display: flex; align-items: center; justify-content: center; }
    .photo-area img { width: 100%; height: 100%; object-fit: cover; }
    .photo-area .placeholder { font-size: 8pt; color: #999; text-align: center; padding: 4px; }
    .section { margin: 8px 0; page-break-inside: avoid; }
    .section-title { background: #e8f5e9; padding: 4px 8px; font-size: 10pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 4px; }
    .form-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
    .form-table tr { page-break-inside: avoid; }
    .form-table td { border: 1px solid #ccc; padding: 3px 6px; font-size: 9pt; vertical-align: middle; word-break: break-word; }
    .form-table .label { background: #f8f9fa; font-weight: 600; width: 22%; color: #333; }
    .form-table .value { color: #000; width: 28%; }
    .form-table td.value[colspan="3"] { width: 78%; }
    .doc-table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
    .doc-table tr { page-break-inside: avoid; }
    .doc-table th { background: #e8f5e9; border: 1px solid #ccc; padding: 3px 6px; font-size: 8.5pt; font-weight: 600; text-align: left; }
    .doc-table td { border: 1px solid #ccc; padding: 3px 6px; font-size: 8.5pt; }
    .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 5px; page-break-inside: avoid; }
    .sig-box { text-align: center; min-width: 140px; }
    .sig-line { border-top: 1px solid #000; padding-top: 4px; margin-top: 30px; }
    .sig-name { font-weight: 600; font-size: 9pt; }
    .sig-position { font-size: 8pt; color: #555; }
    .form-date { text-align: right; font-size: 8.5pt; color: #555; margin-top: 6px; }
    .approver-section { margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 8px; page-break-inside: avoid; }
    .approver-section .section-title { background: #e8f5e9; padding: 4px 8px; font-size: 10pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 4px; }
    @media print {
      body { padding: 8mm 10mm; }
      @page { size: A4 portrait; margin: 8mm 10mm; }
      .section, .approver-section, .signatures, tr { page-break-inside: avoid; }
    }
  `;

  const getGuardianInfo = () => {
    if (guardianType === 'father') return { name: fatherName, relation: bn ? 'পিতা' : 'Father', mobile: fatherMobileCode + fatherMobile, nid: fatherNid };
    if (guardianType === 'mother') return { name: motherName, relation: bn ? 'মাতা' : 'Mother', mobile: motherMobileCode + motherMobile, nid: motherNid };
    return { name: guardianName, relation: guardianRelation, mobile: guardianMobileCode + guardianMobile, nid: guardianNid };
  };

  const guardianInfo = getGuardianInfo();
  const desigLabel = designations.find(d => d.value === designation)?.[bn ? 'bn' : 'en'] || '';
  const maritalLabel = MARITAL_STATUSES.find(m => m.value === maritalStatus)?.[bn ? 'bn' : 'en'] || maritalStatus || '-';
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
            {(() => {
              const { name_bn: previewBn, name_en: previewEn } = resolveStaffFormNames(firstName, lastName);
              return (
                <>
                  <tr><td className="label">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'}</td><td className="value" colSpan={3}>{previewBn || firstName || '-'}</td></tr>
                  <tr><td className="label">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</td><td className="value" colSpan={3}>{previewEn || '-'}</td></tr>
                </>
              );
            })()}
            <tr><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value" colSpan={3}>{mobileCode}{mobile}</td></tr>
            <tr><td className="label">{bn ? 'চাকরির ধরন' : 'Employment'}</td><td className="value">{employmentType === 'full_time' ? (bn ? 'পূর্ণকালীন' : 'Full Time') : (bn ? 'খণ্ডকালীন' : 'Part Time')}</td><td className="label">{bn ? 'পদবী' : 'Designation'}</td><td className="value">{desigLabel}</td></tr>
            <tr><td className="label">{bn ? 'আবাসিক/অনাবাসিক' : 'Residential'}</td><td className="value">{residenceType === 'residential' ? (bn ? 'আবাসিক' : 'Residential') : (bn ? 'অনাবাসিক' : 'Non-Residential')}</td><td className="label">{bn ? 'জন্ম তারিখ' : 'Date of Birth'}</td><td className="value">{dob}</td></tr>
            <tr><td className="label">{bn ? 'ধর্ম' : 'Religion'}</td><td className="value">{religionLabel}</td><td className="label">{bn ? 'জাতীয় পরিচয়পত্র' : 'NID'}</td><td className="value">{nid}</td></tr>
            <tr><td className="label">{bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</td><td className="value" colSpan={3}>{education}</td></tr>
            <tr><td className="label">{bn ? 'অভিজ্ঞতা' : 'Experience'}</td><td className="value">{experience || '-'}</td><td className="label">{bn ? 'পূর্ববর্তী কর্মস্থল' : 'Previous Institute'}</td><td className="value">{prevInstitute || '-'}</td></tr>
            <tr><td className="label">{bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}</td><td className="value" colSpan={3}>{formatAddress(permanentAddr, bn)}</td></tr>
            <tr><td className="label">{bn ? 'বর্তমান ঠিকানা' : 'Present Address'}</td><td className="value" colSpan={3}>{formatAddress(sameAddress ? permanentAddr : presentAddr, bn)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">{bn ? '২. পিতা-মাতার তথ্য' : '2. Parents Details'}</div>
        <table className="form-table">
          <tbody>
            <tr><td className="label">{bn ? 'পিতার নাম' : "Father's Name"}</td><td className="value" colSpan={3}>{fatherName || '-'}</td></tr>
            <tr><td className="label">{bn ? 'পিতার NID' : "Father's NID"}</td><td className="value">{fatherNid || '-'}</td><td className="label">{bn ? 'পেশা' : 'Occupation'}</td><td className="value">{fatherOccupation || '-'}</td></tr>
            <tr><td className="label">{bn ? 'পিতার মোবাইল' : "Father's Mobile"}</td><td className="value" colSpan={3}>{fatherMobile ? `${fatherMobileCode}${fatherMobile}` : '-'}</td></tr>
            <tr><td className="label">{bn ? 'মাতার নাম' : "Mother's Name"}</td><td className="value" colSpan={3}>{motherName || '-'}</td></tr>
            <tr><td className="label">{bn ? 'মাতার NID' : "Mother's NID"}</td><td className="value">{motherNid || '-'}</td><td className="label">{bn ? 'পেশা' : 'Occupation'}</td><td className="value">{motherOccupation || '-'}</td></tr>
            <tr><td className="label">{bn ? 'মাতার মোবাইল' : "Mother's Mobile"}</td><td className="value" colSpan={3}>{motherMobile ? `${motherMobileCode}${motherMobile}` : '-'}</td></tr>
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
        <div className="section-title">{bn ? '৪. সনাক্তকারীর তথ্য' : '4. Identifier Details'}</div>
        <table className="form-table">
          <tbody>
            <tr><td className="label">{bn ? 'নাম' : 'Name'}</td><td className="value">{identifierName}</td><td className="label">{bn ? 'সম্পর্ক' : 'Relation'}</td><td className="value">{identifierRelation}</td></tr>
            <tr><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value">{identifierMobileCode}{identifierMobile}</td><td className="label">NID</td><td className="value">{identifierNid}</td></tr>
            <tr><td className="label">{bn ? 'ঠিকানা' : 'Address'}</td><td className="value" colSpan={3}>{formatAddress(identifierAddr, bn)}</td></tr>
          </tbody>
        </table>
      </div>

      {relIdName && (
        <div className="section">
          <div className="section-title">{bn ? '৪.১ পরিচয়কারীর তথ্য' : '4.1 Introducer Details'}</div>
          <table className="form-table">
            <tbody>
              <tr><td className="label">{bn ? 'নাম' : 'Name'}</td><td className="value">{relIdName}</td><td className="label">{bn ? 'সম্পর্ক' : 'Relation'}</td><td className="value">{relIdRelation}</td></tr>
              <tr><td className="label">{bn ? 'মোবাইল' : 'Mobile'}</td><td className="value">{relIdMobileCode}{relIdMobile}</td><td className="label">NID</td><td className="value">{relIdNid}</td></tr>
              <tr><td className="label">{bn ? 'ঠিকানা' : 'Address'}</td><td className="value" colSpan={3}>{formatAddress(relIdAddr, bn)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

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
          <div className="section-title">{bn ? 'অনুমোদন বিবরণ' : 'Approval Details'}</div>
          <table className="form-table">
            <tbody>
              <tr>
                <td className="label">{bn ? 'অনুমোদনকারীর নাম' : "Approver's Name"}</td>
                <td className="value">{approverName}</td>
                <td className="label">{bn ? 'পদবী' : 'Position'}</td>
                <td className="value">{approverPosition}</td>
              </tr>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? (isEditMode ? titleConfig.editBn : titleConfig.addBn) : (isEditMode ? titleConfig.editEn : titleConfig.addEn)}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {bn ? `ধাপ ${safeCurrentStep + 1} / ${steps.length} : ${steps[safeCurrentStep].bn}` : `Step ${safeCurrentStep + 1} of ${steps.length} : ${steps[safeCurrentStep].en}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openPrintPreview}>
              <Eye className="w-4 h-4" /> {bn ? 'প্রিভিউ' : 'Preview'}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> {bn ? 'প্রিন্ট' : 'Print'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(backPath)}>{bn ? 'ফিরে যান' : 'Back'}</Button>
          </div>
        </div>

        {isEditMode && editId && isRecordPending(editId) && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center gap-3 text-xs sm:text-sm shadow-sm">
            <Clock className="w-5 h-5 shrink-0 animate-pulse text-amber-600" />
            <div className="flex-1">
              <p className="font-semibold">
                {bn ? '⏳ এই কর্মীর তথ্য ইতিমধ্যে অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন করার পর কার্যকর হবে।' : '⏳ This staff record is already awaiting approval. It will take effect after approval.'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {bn ? 'পূর্ববর্তী পরিবর্তনের অনুরোধ প্রধান অ্যাডমিন কর্তৃক অনুমোদিত বা প্রত্যাখ্যাত না হওয়া পর্যন্ত পুনরায় সাবমিট করা যাবে না।' : 'New modifications cannot be submitted until the pending request is approved or rejected.'}
              </p>
            </div>
          </div>
        )}

        {/* Step Wizard Progress Bar */}
        <div className="w-full bg-card border border-border rounded-xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 sm:gap-4 scrollbar-none">
            {steps.map((st, idx) => {
              const isCurrent = idx === safeCurrentStep;
              const isCompleted = idx < safeCurrentStep;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleStaffStepClick(idx)}
                  className={`flex flex-col items-center flex-1 min-w-[70px] sm:min-w-[95px] relative focus:outline-none transition-all group ${
                    idx < safeCurrentStep ? 'cursor-pointer' : isCurrent ? 'cursor-default' : 'cursor-pointer hover:opacity-100 opacity-70'
                  }`}
                >
                  {/* Connecting Line */}
                  {idx > 0 && (
                    <div
                      className={`hidden sm:block absolute top-4 -left-1/2 w-full h-[2px] -z-0 transition-colors ${
                        idx <= safeCurrentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}

                  {/* Step Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all shadow-sm ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/25 scale-110'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>

                  {/* Step Title */}
                  <span
                    className={`mt-2 text-[11px] sm:text-xs text-center font-medium line-clamp-1 max-w-[85px] sm:max-w-none transition-colors ${
                      isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {bn ? st.bn : st.en}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isAdmin && (isPendingStaff || isApprovalMode) && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">
                  {bn ? '📋 অপেক্ষমান শিক্ষক/স্টাফ আবেদন পর্যালোচনা ও কারেকশন মোড' : '📋 Pending Staff Application Review & Correction Mode'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn ? 'প্রয়োজনে যেকোনো তথ্য সংশোধন করুন, বেতন নির্ধারণ করুন এবং শেষ ধাপে অনুমোদনকারী স্বাক্ষর যুক্ত করে সংরক্ষণ ও অনুমোদন করুন।' : 'Review or correct any field, set salary, and approve with signatures in the final step.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium shadow-sm"
                onClick={() => {
                  setCurrentStep(steps.length - 1);
                  window.scrollTo({ top: 80, behavior: 'smooth' });
                }}
              >
                <Check className="w-4 h-4" />
                {bn ? 'অনুমোদন ধাপে যান' : 'Go to Approval Step'}
              </Button>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          

          {/* ========== SECTION 1: Employee Details ========== */}
          {currentStepId === 'employee' && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-2xl text-center">
              {bn ? '১. কর্মচারীর ব্যক্তিগত তথ্য' : '1. Employee Details'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              {isFieldActive('photo_url') && <PhotoUpload value={photoUrl} onChange={setPhotoUrl} folder="staff" />}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isFieldActive('first_name') && (
                <div>
                  <Label>{bn ? (getField('first_name')?.label_bn || 'সম্পূর্ণ নাম (বাংলা)') : (getField('first_name')?.label || 'Full Name (Bangla)')} {isFieldRequired('first_name') && <span className="text-destructive">*</span>}</Label>
                  <Input
                    name="first_name"
                    id="first_name"
                    langType="bn"
                    className={`bg-background mt-1 ${fieldErrors['first_name'] ? 'border-destructive' : ''}`}
                    value={firstName}
                    onChange={e => handleFieldChange('first_name', e.target.value, setFirstName)}
                    placeholder={bn ? 'বাংলায় সম্পূর্ণ নাম লিখুন' : 'Enter full name in Bangla'}
                  />
                  <FieldError field="first_name" />
                </div>
                )}
                {isFieldActive('last_name') && (
                <div>
                  <Label>{bn ? (getField('last_name')?.label_bn || 'সম্পূর্ণ নাম (ইংরেজি)') : (getField('last_name')?.label || 'Full Name (English)')} {isFieldRequired('last_name') && <span className="text-destructive">*</span>}</Label>
                  <Input
                    name="last_name"
                    id="last_name"
                    langType="en"
                    className={`bg-background mt-1 ${fieldErrors['last_name'] ? 'border-destructive' : ''}`}
                    value={lastName}
                    onChange={e => handleFieldChange('last_name', e.target.value, setLastName)}
                    placeholder={bn ? 'ইংরেজিতে সম্পূর্ণ নাম লিখুন (শুধুমাত্র ইংরেজি)' : 'Enter full name in English'}
                  />
                  {hasBangla(lastName) && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {bn ? 'ইংরেজি নাম ফিল্ডে বাংলা অক্ষর দেওয়া হয়েছে। দয়া করে ইংরেজিতে লিখুন।' : 'Bangla script detected in English name field. Please enter in English.'}
                    </p>
                  )}
                  <FieldError field="last_name" />
                </div>
                )}
                {isFieldActive('mobile') && <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} required={isFieldRequired('mobile')} value={mobile} countryCode={mobileCode} onChange={(p, c) => { setMobile(p); setMobileCode(c); }} />}
                {isFieldActive('email') && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {bn ? (getField('email')?.label_bn || 'ইমেইল') : (getField('email')?.label || 'Email')}
                    {emailVerified && <CheckCircle className="w-4 h-4 text-primary" />}
                  </Label>
                  <Input
                    type="email"
                    className="bg-background mt-1"
                    value={staffEmail}
                    onChange={(e) => { setStaffEmail(e.target.value); setEmailVerified(false); }}
                    placeholder={bn ? 'ইমেইল এড্রেস (ঐচ্ছিক)' : 'Email address (optional)'}
                  />
                  {staffEmail && !emailVerified && !isEditMode && (
                    <p className="text-xs text-destructive mt-1">{bn ? 'সাবমিটের সময় ইমেইল যাচাই করা হবে' : 'Email will be verified on submit'}</p>
                  )}
                </div>
                )}
                {isFieldActive('employment_type') && (
                <div>
                  <Label>{bn ? (getField('employment_type')?.label_bn || 'চাকরির ধরন') : (getField('employment_type')?.label || 'Employment Type')} {isFieldRequired('employment_type') && <span className="text-destructive">*</span>}</Label>
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
                <div>
                  <Label>{bn ? 'ডিপার্টমেন্ট' : 'Department'} <span className="text-destructive">*</span></Label>
                  <Select value={selectedStaffCategory} onValueChange={(value) => { setSelectedStaffCategory(value); setDesignation(''); }}>
                    <SelectTrigger className="bg-background mt-1">
                      <SelectValue placeholder={bn ? 'ডিপার্টমেন্ট নির্বাচন' : 'Select department'} />
                    </SelectTrigger>
                    <SelectContent>
                      {staffCategories.map((cat) => (
                        <SelectItem key={cat.key} value={cat.key}>{bn ? cat.name_bn : cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isFieldActive('designation') && (
                <div>
                  <Label>{bn ? (getField('designation')?.label_bn || 'পদবী') : (getField('designation')?.label || 'Designation')} {isFieldRequired('designation') && <span className="text-destructive">*</span>}</Label>
                  <Select value={designation} onValueChange={setDesignation}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['designation'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {filteredDesignations.map((d: any) => (
                        <SelectItem key={d.id} value={d.value}>{bn ? d.bn : d.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError field="designation" />
                </div>
                )}
                {isFieldActive('residence_type') && (
                <div>
                  <Label>{bn ? (getField('residence_type')?.label_bn || 'আবাসিক ধরন') : (getField('residence_type')?.label || 'Residential Status')} {isFieldRequired('residence_type') && <span className="text-destructive">*</span>}</Label>
                  <Select value={residenceType} onValueChange={setResidenceType}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['residence_type'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">{bn ? 'আবাসিক' : 'Residential'}</SelectItem>
                      <SelectItem value="non_residential">{bn ? 'অনাবাসিক' : 'Non-Residential'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError field="residence_type" />
                </div>
                )}
                {isFieldActive('dob') && (
                <div>
                  <Label>{bn ? (getField('dob')?.label_bn || 'জন্ম তারিখ') : (getField('dob')?.label || 'Date of Birth')} {isFieldRequired('dob') && <span className="text-destructive">*</span>}</Label>
                  <DatePicker bengali={bn} className={`mt-1 ${fieldErrors['dob'] ? 'border-destructive' : ''}`} value={dob} onChange={v => { setDob(v); setFieldErrors(p => { const n = {...p}; delete n['dob']; return n; }); }} />
                  <FieldError field="dob" />
                </div>
                )}
                <div>
                  <Label>{bn ? 'যোগদান তারিখ' : 'Joining Date'}</Label>
                  <DatePicker bengali={bn} className="mt-1" value={joiningDate} onChange={v => setJoiningDate(v)} />
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-6 items-center pt-2 border-t border-border/50">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={includeInPayroll} onCheckedChange={(v) => setIncludeInPayroll(!!v)} />
                    <span>{bn ? 'বেতন তালিকায় অন্তর্ভুক্ত করুন' : 'Include in payroll/salary'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={includeInAttendance} onCheckedChange={(v) => setIncludeInAttendance(!!v)} />
                    <span>{bn ? 'হাজিরা তালিকায় অন্তর্ভুক্ত করুন' : 'Include in attendance'}</span>
                  </label>
                </div>
                {isFieldActive('religion') && (
                <div>
                  <Label>{bn ? (getField('religion')?.label_bn || 'ধর্ম') : (getField('religion')?.label || 'Religion')} {isFieldRequired('religion') && <span className="text-destructive">*</span>}</Label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger className={`bg-background mt-1 ${fieldErrors['religion'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {RELIGIONS.map(r => <SelectItem key={r.value} value={r.value}>{bn ? r.bn : r.en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {religion === 'other' && <Input className="bg-background mt-2" placeholder={bn ? 'ধর্মের নাম লিখুন' : 'Type religion'} value={customReligion} onChange={e => setCustomReligion(e.target.value)} />}
                  <FieldError field="religion" />
                </div>
                )}
              </div>
            </div>

            {sectionConfig.showEducation && (isFieldActive('nid') || isFieldActive('education') || isFieldActive('experience') || isFieldActive('prev_institute')) && (
            <div className="border-t border-border pt-4 mb-4">
              <h3 className="text-md font-semibold text-foreground mb-3 text-center text-2xl">{bn ? 'পরিচিতি' : 'Identity'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isFieldActive('nid') && (
                <div>
                  <Label className="flex items-center gap-2">
                    {bn ? (getField('nid')?.label_bn || 'NID (১০/১৭ ডিজিট)') : (getField('nid')?.label || 'NID (10/17)')} {isFieldRequired('nid') && <span className="text-destructive">*</span>}
                    {nidChecking && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  </Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['nid'] || nidError ? 'border-destructive' : ''}`} maxLength={17} value={nid} onChange={e => validateNid(e.target.value, setNid, setNidError)} />
                  {nidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {nidError}</p>}
                  {!nidError && nid && [10, 13, 17].includes(nid.length) && !nidChecking && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'NID যাচাই সম্পন্ন' : 'NID is available'}</p>
                  )}
                  <FieldError field="nid" />
                </div>
                )}
                {isFieldActive('education') && (
                <div>
                  <Label>{bn ? (getField('education')?.label_bn || 'শিক্ষাগত যোগ্যতা') : (getField('education')?.label || 'Education Qualification')} {isFieldRequired('education') && <span className="text-destructive">*</span>}</Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['education'] ? 'border-destructive' : ''}`} value={education} onChange={e => handleFieldChange('education', e.target.value, setEducation)} />
                  <FieldError field="education" />
                </div>
                )}
                {isFieldActive('experience') && (
                <div>
                  <Label>{bn ? (getField('experience')?.label_bn || 'অভিজ্ঞতা') : (getField('experience')?.label || 'Experience')}</Label>
                  <Input className="bg-background mt-1" value={experience} onChange={e => setExperience(e.target.value)} />
                </div>
                )}
                {isFieldActive('prev_institute') && experience && (
                  <div>
                    <Label>{bn ? (getField('prev_institute')?.label_bn || 'পূর্ববর্তী কর্মস্থল') : (getField('prev_institute')?.label || 'Previous Job Institute')} {isFieldRequired('prev_institute') && <span className="text-destructive">*</span>}</Label>
                    <Input className={`bg-background mt-1 ${fieldErrors['prev_institute'] ? 'border-destructive' : ''}`} value={prevInstitute} onChange={e => handleFieldChange('prev_institute', e.target.value, setPrevInstitute)} />
                    <FieldError field="prev_institute" />
                  </div>
                )}
              </div>
            </div>
            )}

          </div>
          )}

          {/* ========== SECTION 2: Employee Address ========== */}
          {currentStepId === 'address' && (
            <div className="card-elevated p-6 space-y-4">
              <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
                {bn ? '২. ঠিকানা' : '2. Address'}
              </h2>
              {isFieldActive('address_permanent') && <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={permanentAddr} onChange={setPermanentAddr} />}
              {isFieldActive('address_present') && (
              <>
                <div className="mt-4 flex items-center gap-2">
                  <Checkbox id="sameAddr" checked={sameAddress} onCheckedChange={(v) => { setSameAddress(!!v); if (v) setPresentAddr({ ...permanentAddr }); }} />
                  <Label htmlFor="sameAddr">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
                </div>
                {!sameAddress && (
                  <div className="mt-4">
                    <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={presentAddr} onChange={setPresentAddr} />
                  </div>
                )}
              </>
              )}
            </div>
          )}

          {/* ========== SECTION 3: Parents Details ========== */}
          {currentStepId === 'parents' && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? '৩. পিতা-মাতার তথ্য' : '3. Parents Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isFieldActive('father_name') && (
              <div>
                <Label>{bn ? (getField('father_name')?.label_bn || 'পিতার নাম') : (getField('father_name')?.label || 'Father Name')} {isFieldRequired('father_name') && <span className="text-destructive">*</span>}</Label>
                <Input className={`bg-background mt-1 ${fieldErrors['father_name'] ? 'border-destructive' : ''}`} value={fatherName} onChange={e => handleFieldChange('father_name', e.target.value, setFatherName)} />
                <FieldError field="father_name" />
              </div>
              )}
              {isFieldActive('father_mobile') && <PhoneInput label={bn ? 'পিতার মোবাইল' : 'Father Mobile'} required={isFieldRequired('father_mobile')} value={fatherMobile} countryCode={fatherMobileCode} onChange={(p, c) => { setFatherMobile(p); setFatherMobileCode(c); }} />}
              {isFieldActive('father_nid') && (
              <div>
                <Label>{bn ? (getField('father_nid')?.label_bn || 'পিতার NID') : (getField('father_nid')?.label || 'Father NID')} {isFieldRequired('father_nid') && <span className="text-destructive">*</span>}</Label>
                <Input className={`bg-background mt-1 ${fatherNidError ? 'border-destructive' : ''}`} maxLength={17} value={fatherNid} onChange={e => validateNid(e.target.value, setFatherNid, setFatherNidError)} />
                {fatherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fatherNidError}</p>}
              </div>
              )}
              {isFieldActive('father_occupation') && (
              <div>
                <Label>{bn ? (getField('father_occupation')?.label_bn || 'পিতার পেশা') : (getField('father_occupation')?.label || 'Father Occupation')} {isFieldRequired('father_occupation') && <span className="text-destructive">*</span>}</Label>
                <Input className={`bg-background mt-1 ${fieldErrors['father_occupation'] ? 'border-destructive' : ''}`} value={fatherOccupation} onChange={e => handleFieldChange('father_occupation', e.target.value, setFatherOccupation)} />
                <FieldError field="father_occupation" />
              </div>
              )}
              {isFieldActive('mother_name') && (
              <div>
                <Label>{bn ? (getField('mother_name')?.label_bn || 'মাতার নাম') : (getField('mother_name')?.label || 'Mother Name')}</Label>
                <Input className="bg-background mt-1" value={motherName} onChange={e => setMotherName(e.target.value)} />
              </div>
              )}
              {isFieldActive('mother_mobile') && <PhoneInput label={bn ? 'মাতার মোবাইল' : 'Mother Mobile'} value={motherMobile} countryCode={motherMobileCode} onChange={(p, c) => { setMotherMobile(p); setMotherMobileCode(c); }} />}
              {isFieldActive('mother_nid') && (
              <div>
                <Label>{bn ? (getField('mother_nid')?.label_bn || 'মাতার NID') : (getField('mother_nid')?.label || 'Mother NID')}</Label>
                <Input className={`bg-background mt-1 ${motherNidError ? 'border-destructive' : ''}`} maxLength={17} value={motherNid} onChange={e => validateNid(e.target.value, setMotherNid, setMotherNidError)} />
                {motherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {motherNidError}</p>}
              </div>
              )}
              {isFieldActive('mother_occupation') && (
              <div>
                <Label>{bn ? (getField('mother_occupation')?.label_bn || 'মাতার পেশা') : (getField('mother_occupation')?.label || 'Mother Occupation')}</Label>
                <Input className="bg-background mt-1" value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} />
              </div>
              )}
            </div>
            {fieldErrors['parent_nid'] && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors['parent_nid']}</p>}
            {fieldErrors['parent_mobile'] && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors['parent_mobile']}</p>}

            {sectionConfig.showParentAddress && (
            <>
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
            </>
            )}
          </div>
          )}

          {/* ========== SECTION 4: Guardian Details ========== */}
          {sectionConfig.showGuardian && currentStepId === 'guardian' && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? '৪. অভিভাবক তথ্য' : '4. Guardian Details'}
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
          )}

          {/* ========== SECTION 5: Identifier (সনাক্তকারী) ========== */}
          {sectionConfig.showIdentifier && currentStepId === 'identifier' && (
            <div className="card-elevated p-6 space-y-6">
              <div className="text-center border-b border-border pb-4">
                <h2 className="font-display font-bold text-foreground text-2xl flex items-center justify-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  <span>{bn ? 'সনাক্তকারীর তথ্য' : 'Identifier Information'}</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {bn ? 'স্টাফের ব্যক্তিগত বা প্রাতিষ্ঠানিক সনাক্তকারী ব্যক্তির বিবরণ পূরণ করুন' : 'Fill in details of staff institutional / personal identifier'}
                </p>
              </div>

              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{bn ? 'পূর্ণ নাম' : 'Full Name'} <span className="text-destructive">*</span></Label>
                    <Input
                      className={`bg-background mt-1 ${fieldErrors['identifier_name'] ? 'border-destructive' : ''}`}
                      value={identifierName}
                      onChange={e => handleFieldChange('identifier_name', e.target.value, setIdentifierName)}
                      placeholder={bn ? 'সনাক্তকারীর পূর্ণ নাম' : 'Full name'}
                    />
                    <FieldError field="identifier_name" />
                  </div>
                  <div>
                    <Label>{bn ? 'সম্পর্ক' : 'Relation'} <span className="text-destructive">*</span></Label>
                    <Input
                      className={`bg-background mt-1 ${fieldErrors['identifier_relation'] ? 'border-destructive' : ''}`}
                      value={identifierRelation}
                      onChange={e => handleFieldChange('identifier_relation', e.target.value, setIdentifierRelation)}
                      placeholder={bn ? 'সম্পর্ক (যেমন: প্রতিবেশী, পরিচিতজন)' : 'Relation'}
                    />
                    <FieldError field="identifier_relation" />
                  </div>
                  <PhoneInput
                    label={bn ? 'মোবাইল' : 'Mobile'}
                    required
                    value={identifierMobile}
                    countryCode={identifierMobileCode}
                    onChange={(p, c) => { setIdentifierMobile(p); setIdentifierMobileCode(c); }}
                  />
                  <div>
                    <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'} <span className="text-destructive">*</span></Label>
                    <Input
                      className={`bg-background mt-1 ${fieldErrors['identifier_nid'] || identifierNidError ? 'border-destructive' : ''}`}
                      maxLength={17}
                      value={identifierNid}
                      onChange={e => validateNid(e.target.value, setIdentifierNid, setIdentifierNidError)}
                      placeholder="0123456789"
                    />
                    {identifierNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {identifierNidError}</p>}
                    <FieldError field="identifier_nid" />
                  </div>
                  <div className="sm:col-span-2">
                    <AddressFields label={bn ? 'পূর্ণ ঠিকানা' : 'Full Address'} value={identifierAddr} onChange={setIdentifierAddr} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== SECTION 6: Introducer (পরিচয়কারী) ========== */}
          {sectionConfig.showRelativesIdentifier && currentStepId === 'introducer' && (
            <div className="card-elevated p-6 space-y-6">
              <div className="text-center border-b border-border pb-4">
                <h2 className="font-display font-bold text-foreground text-2xl flex items-center justify-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  <span>{bn ? 'পরিচয়কারীর তথ্য' : 'Introducer Information'}</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {bn ? 'স্টাফের পরিচয় প্রদানকারী ব্যক্তি বা আত্মীয়ের বিবরণ পূরণ করুন' : 'Fill in details of introducer or relative reference'}
                </p>
              </div>

              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{bn ? 'পূর্ণ নাম' : 'Full Name'}</Label>
                    <Input
                      className="bg-background mt-1"
                      value={relIdName}
                      onChange={e => setRelIdName(e.target.value)}
                      placeholder={bn ? 'পরিচয়কারীর পূর্ণ নাম' : 'Full name'}
                    />
                  </div>
                  <div>
                    <Label>{bn ? 'সম্পর্ক' : 'Relation'}</Label>
                    <Input
                      className="bg-background mt-1"
                      value={relIdRelation}
                      onChange={e => setRelIdRelation(e.target.value)}
                      placeholder={bn ? 'সম্পর্ক (যেমন: চাচা, মামা)' : 'Relation'}
                    />
                  </div>
                  <PhoneInput
                    label={bn ? 'মোবাইল' : 'Mobile'}
                    value={relIdMobile}
                    countryCode={relIdMobileCode}
                    onChange={(p, c) => { setRelIdMobile(p); setRelIdMobileCode(c); }}
                  />
                  <div>
                    <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'}</Label>
                    <Input
                      className={`bg-background mt-1 ${relIdNidError ? 'border-destructive' : ''}`}
                      maxLength={17}
                      value={relIdNid}
                      onChange={e => validateNid(e.target.value, setRelIdNid, setRelIdNidError)}
                      placeholder="0123456789"
                    />
                    {relIdNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {relIdNidError}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <AddressFields label={bn ? 'পূর্ণ ঠিকানা' : 'Full Address'} value={relIdAddr} onChange={setRelIdAddr} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== SECTION 7: Document Upload ========== */}
          {currentStepId === 'documents' && (
          <div className="card-elevated p-6">
            <h2 className="font-display font-bold text-foreground mb-4 pb-2 border-b border-border text-center text-2xl">
              {bn ? 'ডকুমেন্ট আপলোড' : 'Document Upload'}
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
          )}

          {/* ========== SECTION 7: Approval & Salary (Admin Only) ========== */}
          {isAdmin && currentStepId === 'approval' && (
          <>
          {/* Signature for Print */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-border">
              <h2 className="font-display font-bold text-foreground text-xl sm:text-2xl">
                {bn ? 'স্বাক্ষর (প্রিন্ট/ডাউনলোডে দেখাবে)' : 'Signatures (shown in print/download)'}
              </h2>
              {(principalName || principalPosition || otherSignName || otherSignPosition) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPrincipalName('');
                    setPrincipalPosition('');
                    setOtherSignName('');
                    setOtherSignPosition('');
                  }}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  {bn ? 'সব মুছুন' : 'Clear All'}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'অধ্যক্ষের নাম' : 'Principal Name'}</Label>
                  {principalName && (
                    <button type="button" onClick={() => setPrincipalName('')} className="text-xs text-muted-foreground hover:text-destructive">
                      {bn ? 'মুছুন' : 'Clear'}
                    </button>
                  )}
                </div>
                <Input className="bg-background mt-1" value={principalName} onChange={e => setPrincipalName(e.target.value)} placeholder={bn ? 'অধ্যক্ষের নাম লিখুন' : 'Enter principal name'} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'অধ্যক্ষের পদবী' : 'Principal Position'}</Label>
                  {principalPosition && (
                    <button type="button" onClick={() => setPrincipalPosition('')} className="text-xs text-muted-foreground hover:text-destructive">
                      {bn ? 'মুছুন' : 'Clear'}
                    </button>
                  )}
                </div>
                <Input className="bg-background mt-1" value={principalPosition} onChange={e => setPrincipalPosition(e.target.value)} placeholder={bn ? 'পদবী লিখুন' : 'Enter position'} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'অন্য স্বাক্ষরকারীর নাম' : 'Other Signatory Name'}</Label>
                  {otherSignName && (
                    <button type="button" onClick={() => setOtherSignName('')} className="text-xs text-muted-foreground hover:text-destructive">
                      {bn ? 'মুছুন' : 'Clear'}
                    </button>
                  )}
                </div>
                <Input className="bg-background mt-1" value={otherSignName} onChange={e => setOtherSignName(e.target.value)} placeholder={bn ? 'অন্য স্বাক্ষরকারীর নাম লিখুন' : 'Enter signatory name'} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'অন্য স্বাক্ষরকারীর পদবী' : 'Other Signatory Position'}</Label>
                  {otherSignPosition && (
                    <button type="button" onClick={() => setOtherSignPosition('')} className="text-xs text-muted-foreground hover:text-destructive">
                      {bn ? 'মুছুন' : 'Clear'}
                    </button>
                  )}
                </div>
                <Input className="bg-background mt-1" value={otherSignPosition} onChange={e => setOtherSignPosition(e.target.value)} placeholder={bn ? 'পদবী লিখুন' : 'Enter position'} />
              </div>
            </div>
          </div>

          {/* Approver Section & Salary */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-border">
              <div>
                <h2 className="font-display font-bold text-foreground text-xl sm:text-2xl">
                  {bn ? 'অনুমোদন ও বেতন নির্ধারণ' : 'Approval & Salary Details'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn ? 'শুধুমাত্র অ্যাডমিন দেখতে, যোগ করতে, এডিট ও মুছতে পারবেন।' : 'Only Admin can view, add, edit, and delete.'}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {bn ? 'অ্যাডমিন অধিকার' : 'Admin Privileges'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isFieldActive('salary') && (
              <div className="sm:col-span-2 bg-primary/5 border border-primary/20 rounded-xl p-4 mb-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {bn ? (getField('salary')?.label_bn || 'নির্ধারিত মাসিক বেতন (টাকা)') : (getField('salary')?.label || 'Assigned Monthly Salary (BDT)')}
                    {((existingStaff?.status === 'active' || approveOnSave) && isFieldRequired('salary')) && <span className="text-destructive">*</span>}
                  </Label>
                  {salary && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('salary', '', setSalary)}
                      className="text-xs text-destructive hover:underline font-medium"
                    >
                      {bn ? 'বেতন মুছুন / ক্লিয়ার' : 'Clear Salary'}
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5 max-w-sm">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">৳</span>
                  <Input
                    type="number"
                    className={`bg-background pl-8 text-base font-medium ${fieldErrors['salary'] ? 'border-destructive' : ''}`}
                    value={salary || ''}
                    onChange={e => handleFieldChange('salary', e.target.value, setSalary)}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {bn ? 'এখানে অ্যাডমিন কর্মীর মাসিক বেতন যোগ, এডিট বা মুছতে পারবেন।' : 'Admin can add, edit, or clear staff monthly salary here.'}
                </p>
                <FieldError field="salary" />
              </div>
              )}
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-foreground flex items-center justify-between">
                  <span>{bn ? 'প্রশাসনিক কর্মকর্তা নির্বাচন করুন' : 'Select from Administrative Officers'}</span>
                  {approverName && (
                    <button
                      type="button"
                      onClick={() => { setApproverName(''); setApproverPosition(''); }}
                      className="text-xs text-destructive hover:underline font-medium"
                    >
                      {bn ? 'কর্মকর্তা মুছুন / ক্লিয়ার' : 'Clear Officer'}
                    </button>
                  )}
                </Label>
                <Select
                  value=""
                  onValueChange={(val) => {
                    const selected = administrativeOfficers.find(o => o.id === val);
                    if (selected) {
                      setApproverName(selected.name);
                      if (selected.position) setApproverPosition(selected.position);
                    }
                  }}
                >
                  <SelectTrigger className="bg-background mt-1">
                    <SelectValue placeholder={bn ? '-- প্রশাসনিক কর্মকর্তা তালিকা থেকে বাছাই করুন --' : '-- Choose from administrative officers --'} />
                  </SelectTrigger>
                  <SelectContent>
                    {administrativeOfficers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {bn ? 'কোনো প্রশাসনিক কর্মকর্তা পাওয়া যায়নি' : 'No administrative officers found'}
                      </SelectItem>
                    ) : (
                      administrativeOfficers.map(officer => (
                        <SelectItem key={officer.id} value={officer.id}>
                          {officer.name} {officer.position ? `(${officer.position})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {bn ? 'প্রশাসনিক কর্মকর্তা সিলেক্ট করলে নাম ও পদবী নিজে থেকেই বসে যাবে, অথবা নিচে লিখে বা এডিট করতে পারেন।' : 'Selecting an officer auto-fills name and position, or you can manually enter/edit below.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'এপ্রোভকারীর নাম' : "Approver's Name"} <span className="text-destructive">*</span></Label>
                  {approverName && (
                    <button type="button" onClick={() => setApproverName('')} className="text-xs text-muted-foreground hover:text-destructive">
                      {bn ? 'মুছুন' : 'Clear'}
                    </button>
                  )}
                </div>
                <Input className="bg-background mt-1" value={approverName} onChange={e => setApproverName(e.target.value)} placeholder={bn ? 'নাম লিখুন' : 'Enter name'} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'পদবী' : 'Position'} <span className="text-destructive">*</span></Label>
                  {approverPosition && (
                    <button type="button" onClick={() => setApproverPosition('')} className="text-xs text-muted-foreground hover:text-destructive">
                      {bn ? 'মুছুন' : 'Clear'}
                    </button>
                  )}
                </div>
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
                      <button type="button" onClick={() => setApproverSignatureUrl('')} className="text-destructive hover:text-destructive/80" title={bn ? 'স্বাক্ষর মুছুন' : 'Delete Signature'}><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {!approverSignatureUrl && <span className="text-xs text-muted-foreground">{bn ? 'প্রিন্টে স্বাক্ষরের বক্স দেখাবে' : 'Signature box will show in print'}</span>}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'তারিখ' : 'Date'}</Label>
                  {approverDate && (
                    <button type="button" onClick={() => setApproverDate('')} className="text-xs text-muted-foreground hover:text-destructive">
                      {bn ? 'মুছুন' : 'Clear'}
                    </button>
                  )}
                </div>
                <DatePicker bengali={bn} className="mt-1" value={approverDate} onChange={v => setApproverDate(v)} />
              </div>
            </div>
          </div>
          </>
          )}

          {/* Step Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentStep(prev => Math.max(0, prev - 1));
                window.scrollTo({ top: 80, behavior: 'smooth' });
              }}
              disabled={safeCurrentStep === 0}
              className="w-full sm:w-auto px-6 py-5 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {bn ? 'পূর্ববর্তী ধাপ' : 'Previous Step'}
            </Button>

            <div className="text-xs sm:text-sm font-medium text-muted-foreground order-first sm:order-none">
              {bn ? `ধাপ ${safeCurrentStep + 1} / ${steps.length} : ${steps[safeCurrentStep].bn}` : `Step ${safeCurrentStep + 1} of ${steps.length} : ${steps[safeCurrentStep].en}`}
            </div>

            {safeCurrentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  if (validateStaffStep(steps[safeCurrentStep].id)) {
                    setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
                    window.scrollTo({ top: 80, behavior: 'smooth' });
                  }
                }}
                className="btn-primary-gradient w-full sm:w-auto px-8 py-5 gap-2"
              >
                {bn ? 'পরবর্তী ধাপ' : 'Next Step'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {(isPendingStaff || isApprovalMode) ? (
                  <>
                    <Button
                      type="button"
                      onClick={handleSaveAndApprove}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-5 gap-2 font-bold shadow-md shadow-emerald-600/20"
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
                      {bn ? 'অনুমোদন ও সংরক্ষণ করুন' : 'Save & Approve Application'}
                    </Button>
                    <Button
                      type="submit"
                      variant="outline"
                      className="px-6 py-5 gap-2"
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {bn ? 'শুধুমাত্র তথ্য আপডেট করুন' : 'Update Info Only'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="submit"
                    className="btn-primary-gradient px-8 py-5 gap-2"
                    disabled={saveMutation.isPending || (isEditMode && !!editId && isRecordPending(editId))}
                  >
                    {saveMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                    {bn ? (isEditMode ? 'আপডেট করুন' : `${titleConfig.bn} যোগ করুন`) : (isEditMode ? 'Update' : `Add ${titleConfig.en}`)}
                  </Button>
                )}
                <Button type="button" variant="outline" className="py-5 gap-2" onClick={openPrintPreview}>
                  <Eye className="w-4 h-4" /> {bn ? 'প্রিভিউ' : 'Preview'}
                </Button>
                <Button type="button" variant="outline" className="py-5 gap-2" onClick={handlePrint}>
                  <Printer className="w-4 h-4" /> {bn ? 'প্রিন্ট' : 'Print'}
                </Button>
              </div>
            )}
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

          <div className="border border-border rounded-lg bg-white text-black p-4 sm:p-6" style={{ fontFamily: "'Noto Sans Bengali', 'Kalpurush', sans-serif", fontSize: '10pt' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              .preview-form .form-header { text-align: center; border-bottom: 2px solid #1a5c2e; padding-bottom: 8px; margin-bottom: 10px; position: relative; }
              .preview-form .form-header h1 { font-size: 15pt; font-weight: 700; margin: 3px 0 1px; color: #1a5c2e; }
              .preview-form .form-header h2 { font-size: 11pt; font-weight: 600; color: #333; margin: 1px 0; }
              .preview-form .form-header p { font-size: 8.5pt; color: #555; }
              .preview-form .form-title { background: #1a5c2e; color: #fff; text-align: center; padding: 5px; font-size: 12pt; font-weight: 700; margin: 8px 0; border-radius: 2px; }
              .preview-form .photo-area { position: absolute; top: 0; right: 0; width: 85px; height: 100px; border: 2px solid #1a5c2e; overflow: hidden; background: #f9f9f9; display: flex; align-items: center; justify-content: center; }
              .preview-form .photo-area img { width: 100%; height: 100%; object-fit: cover; }
              .preview-form .photo-area .placeholder { font-size: 8pt; color: #999; text-align: center; padding: 4px; }
              .preview-form .section { margin: 8px 0; }
              .preview-form .section-title { background: #e8f5e9; padding: 4px 8px; font-size: 10pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 4px; }
              .preview-form .form-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
              .preview-form .form-table td { border: 1px solid #ccc; padding: 3px 6px; font-size: 9pt; vertical-align: middle; word-break: break-word; }
              .preview-form .form-table .label { background: #f8f9fa; font-weight: 600; width: 22%; color: #333; }
              .preview-form .form-table .value { color: #000; width: 28%; }
              .preview-form .form-table td.value[colspan="3"] { width: 78%; }
              .preview-form .doc-table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
              .preview-form .doc-table th { background: #e8f5e9; border: 1px solid #ccc; padding: 3px 6px; font-size: 8.5pt; font-weight: 600; text-align: left; }
              .preview-form .doc-table td { border: 1px solid #ccc; padding: 3px 6px; font-size: 8.5pt; }
              .preview-form .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 5px; }
              .preview-form .sig-box { text-align: center; min-width: 140px; }
              .preview-form .sig-line { border-top: 1px solid #000; padding-top: 4px; margin-top: 30px; }
              .preview-form .sig-name { font-weight: 600; font-size: 9pt; }
              .preview-form .sig-position { font-size: 8pt; color: #555; }
              .preview-form .form-date { text-align: right; font-size: 8.5pt; color: #555; margin-top: 6px; }
              .preview-form .approver-section { margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 8px; }
              .preview-form .approver-section .section-title { background: #e8f5e9; padding: 4px 8px; font-size: 10pt; font-weight: 700; color: #1a5c2e; border-left: 4px solid #1a5c2e; margin-bottom: 4px; }
            `}} />
            <div className="preview-form">
              <PrintableForm />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Universal Document Preview Modal */}
      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={() => setPreviewDoc(null)}
        fileUrl={previewDoc?.url}
        fileName={previewDoc?.name}
        title={previewDoc ? `${previewDoc.type} - ${previewDoc.name}` : undefined}
      />

      {/* Email OTP Verification */}
      <OtpVerificationDialog
        open={showOtpDialog}
        onOpenChange={(val) => {
          setShowOtpDialog(val);
          if (!val) setPendingSave(false);
        }}
        email={staffEmail}
        purpose="email_verification"
        recipientName={`${firstName} ${lastName}`.trim()}
        onVerified={handleOtpVerified}
        title={bn ? 'ইমেইল যাচাইকরণ' : 'Email Verification'}
        description={bn ? `${staffEmail} এ একটি যাচাইকরণ কোড পাঠানো হয়েছে` : `A verification code has been sent to ${staffEmail}`}
      />
    </AdminLayout>
  );
};

export default AdminStaffForm;

