import { normalizeGender } from '@/lib/ocrCardParser';
import React, { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useValidationRules } from '@/hooks/useValidationRules';
import { useAdmissionFormConfig, SECTION_INFO, type AdmissionFieldConfig } from '@/hooks/useAdmissionFormConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import PhotoUpload from '@/components/PhotoUpload';
import FileUploadField from '@/components/FileUploadField';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import PhoneInput from '@/components/PhoneInput';
import { useApiVerificationEnabled } from '@/hooks/useApiVerification';
import { Plus, Search, Loader2, AlertCircle, CheckCircle, Save, ArrowLeft, ArrowRight, GraduationCap, User, UserCheck, Heart, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { invalidateAllStudentQueries } from '@/lib/studentQueryInvalidator';
import { formatAddress as formatAddressBn } from '@/lib/banglaAddressHelper';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const formatAddress = (addr: AddressData, bn = true) => formatAddressBn(addr, bn);

interface AdmissionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editStudent?: any; // pass existing student record for edit mode
}

const AdmissionForm = ({ open, onOpenChange, editStudent }: AdmissionFormProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { validate, validateAll } = useValidationRules('student');
  const { data: apiVerifyEnabled } = useApiVerificationEnabled();
  const { fields: configFields, isLoaded, isFieldActive, getField, getFieldsBySection, getCustomFields, sections } = useAdmissionFormConfig();

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<Record<string, any>>({
    student_type: '', residence_type: '',
    admission_session: '', roll_number: '', registration_no: '',
    admission_date: new Date().toISOString().split('T')[0],
    session_year: new Date().getFullYear().toString(),
    admission_class: '', first_name: '', last_name: '',
    gender: 'male', religion: 'islam', date_of_birth: '',
    birth_reg_no: '', previous_class: '', previous_institute: '',
    is_orphan: false, is_poor: false, is_free: false, student_category: '', photo_url: '',
    father_name: '', father_name_en: '', father_occupation: '', father_nid: '', father_phone: '', father_phone_code: '+880',
    mother_name: '', mother_name_en: '', mother_occupation: '', mother_nid: '', mother_phone: '', mother_phone_code: '+880',
    guardian_type: '', guardian_name: '', guardian_relation: '', guardian_phone: '', guardian_phone_code: '+880', guardian_nid: '',
    approver_name: '', approver_designation: '', approver_date: '', approver_signature: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [permanentAddr, setPermanentAddr] = useState<AddressData>(emptyAddress);
  const [presentAddr, setPresentAddr] = useState<AddressData>(emptyAddress);
  const [sameAddress, setSameAddress] = useState(false);
  const [parentPermanentAddr, setParentPermanentAddr] = useState<AddressData>(emptyAddress);
  const [parentPresentAddr, setParentPresentAddr] = useState<AddressData>(emptyAddress);
  const [parentAddrSameAsStudent, setParentAddrSameAsStudent] = useState(false);
  const [parentSamePresAddr, setParentSamePresAddr] = useState(false);
  const [guardianPermAddr, setGuardianPermAddr] = useState<AddressData>(emptyAddress);
  const [guardianPresAddr, setGuardianPresAddr] = useState<AddressData>(emptyAddress);
  const [guardianSameAddr, setGuardianSameAddr] = useState(false);

  // Old student search
  const [oldRoll, setOldRoll] = useState('');
  const [oldSession, setOldSession] = useState('');
  const [oldClass, setOldClass] = useState('');

  // Inline errors
  const [fatherNidError, setFatherNidError] = useState('');
  const [motherNidError, setMotherNidError] = useState('');
  const [guardianNidError, setGuardianNidError] = useState('');
  const [birthRegError, setBirthRegError] = useState('');

  // Custom field values (for admin-added fields)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const isEditMode = !!editStudent;

  const [selectedDivisionId, setSelectedDivisionId] = useState('');

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: studentCategories = [] } = useQuery({
    queryKey: ['student_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_categories').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Filter classes by selected division
  const filteredClasses = selectedDivisionId
    ? classes.filter((c: any) => c.division_id === selectedDivisionId)
    : classes;

  const inferClassFromRoll = useCallback((roll: any, divId: string | null | undefined) => {
    if (!roll || !classes.length) return '';
    const cleanRoll = String(roll).replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const num = parseInt(cleanRoll, 10);
    if (isNaN(num) || num < 1000) return '';
    const order = Math.floor(num / 1000);
    const divClasses = divId 
      ? classes.filter((c: any) => c.division_id === divId)
      : classes;
    if (divClasses.length > 0 && order >= 1 && order <= divClasses.length) {
      return divClasses[order - 1].id;
    }
    return '';
  }, [classes]);

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const findMatchingSession = useCallback((
    sessionId?: string | null,
    admissionSession?: string | null,
    sessionYear?: string | null
  ) => {
    if (!academicSessions || academicSessions.length === 0) return null;

    const normalizeYear = (val: string | null | undefined) => {
      if (!val) return '';
      return String(val)
        .trim()
        .replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
        .toLowerCase();
    };

    const candidates = [sessionId, admissionSession, sessionYear].filter(Boolean) as string[];

    // 1. Direct ID match
    for (const c of candidates) {
      const match = academicSessions.find((as: any) => as.id === c);
      if (match) return match;
    }

    // 2. Exact match on name or name_bn
    for (const c of candidates) {
      const norm = normalizeYear(c);
      const match = academicSessions.find(
        (as: any) => normalizeYear(as.name) === norm || normalizeYear(as.name_bn) === norm
      );
      if (match) return match;
    }

    // 3. 4-digit year match (e.g. "2026" or "২০২৬" matches "2026-27" / "২০২৬-২৭")
    for (const c of candidates) {
      const norm = normalizeYear(c);
      const digits = norm.match(/\d{4}/)?.[0];
      if (digits) {
        const match = academicSessions.find((as: any) => {
          const asName = normalizeYear(as.name);
          const asNameBn = normalizeYear(as.name_bn);
          return asName.includes(digits) || asNameBn.includes(digits);
        });
        if (match) return match;
      }
    }

    // 4. Default to active session if available
    const active = academicSessions.find((as: any) => as.is_active);
    if (active) return active;

    return academicSessions[0] || null;
  }, [academicSessions]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editStudent && open) {
      const s = editStudent;
      const admData = s.admission_data || {};
      const matchSession = findMatchingSession(s.session_id, s.admission_session, s.session_year);
      const studentSessionId = matchSession?.id || s.session_id || (s.admission_session && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.admission_session) ? s.admission_session : '');
      const studentSessionYear = s.session_year || matchSession?.name || s.admission_session || new Date().getFullYear().toString();
      const studentDivisionId = s.division_id || (s.class_id ? (classes.find((c: any) => c.id === s.class_id) as any)?.division_id : '') || '';
      const studentClassId = admData.admission_class || s.class_id || inferClassFromRoll(s.roll_number, studentDivisionId) || '';

      setForm({
        student_type: admData.student_type || (s.student_type || 'new'),
        residence_type: s.residence_type || 'non-resident',
        admission_session: studentSessionId,
        roll_number: bnToEn(s.roll_number || ''),
        registration_no: bnToEn(s.registration_no || s.student_id || ''),
        admission_date: s.admission_date || new Date().toISOString().split('T')[0],
        session_year: studentSessionYear,
        admission_class: studentClassId,
        first_name: s.name_bn || '',
        last_name: s.name_en || '',
        gender: s.gender || 'male',
        religion: s.religion || 'islam',
        date_of_birth: s.date_of_birth || '',
        birth_reg_no: s.birth_reg_no || '',
        previous_class: s.previous_class || '',
        previous_institute: s.previous_institute || '',
        is_orphan: s.is_orphan || false,
        is_poor: s.is_poor || false,
        is_free: s.is_free || false,
        student_category: s.student_category || '',
        photo_url: s.photo_url || '',
        father_name: s.father_name || '',
        father_name_en: s.father_name_en || '',
        father_occupation: s.father_occupation || '',
        father_nid: s.father_nid || '',
        father_phone: s.father_phone || '',
        father_phone_code: admData.father_phone_code || '+880',
        mother_name: s.mother_name || '',
        mother_name_en: s.mother_name_en || '',
        mother_occupation: s.mother_occupation || '',
        mother_nid: s.mother_nid || '',
        mother_phone: s.mother_phone || '',
        mother_phone_code: admData.mother_phone_code || '+880',
        guardian_type: admData.guardian_type || '',
        guardian_name: admData.guardian_name || '',
        guardian_relation: admData.guardian_relation || '',
        guardian_phone: admData.guardian_phone || '',
        guardian_phone_code: admData.guardian_phone_code || '+880',
        guardian_nid: admData.guardian_nid || '',
        approver_name: admData.approver_name || '',
        approver_designation: admData.approver_designation || '',
        approver_date: admData.approver_date || '',
        approver_signature: admData.approver_signature || '',
      });
      if (studentDivisionId) setSelectedDivisionId(studentDivisionId);
      if (admData.permanentAddr) setPermanentAddr(admData.permanentAddr);
      if (admData.presentAddr) setPresentAddr(admData.presentAddr);
      if (admData.parentPermanentAddr) setParentPermanentAddr(admData.parentPermanentAddr);
      if (admData.parentPresentAddr) setParentPresentAddr(admData.parentPresentAddr);
      if (admData.guardianPermAddr) setGuardianPermAddr(admData.guardianPermAddr);
      if (admData.guardianPresAddr) setGuardianPresAddr(admData.guardianPresAddr);
      if (admData.custom_fields) setCustomFieldValues(admData.custom_fields);
    }
  }, [editStudent, open, academicSessions, classes, inferClassFromRoll, findMatchingSession]);

  // Synchronize session if academicSessions loads after form is opened
  useEffect(() => {
    if (open && academicSessions.length > 0) {
      setForm(prev => {
        if (prev.admission_session && academicSessions.some((as: any) => as.id === prev.admission_session)) return prev;
        const s = editStudent || {};
        const match = findMatchingSession(
          s.session_id || prev.admission_session,
          s.admission_session || prev.admission_session,
          s.session_year || prev.session_year
        );
        if (match) {
          return {
            ...prev,
            admission_session: match.id,
            session_year: prev.session_year || match.name,
          };
        }
        return prev;
      });
    }
  }, [editStudent, open, academicSessions, findMatchingSession]);

  // Synchronize division and class if classes loads after form is opened
  useEffect(() => {
    if (editStudent && open && classes.length > 0) {
      const clsId = editStudent.class_id || editStudent.admission_data?.admission_class;
      if (clsId && !selectedDivisionId) {
        const cls = classes.find((c: any) => c.id === clsId);
        if (cls?.division_id) {
          setSelectedDivisionId(cls.division_id);
        }
      }
      setForm(prev => {
        if (prev.admission_class) return prev;
        const inferred = inferClassFromRoll(editStudent.roll_number, editStudent.division_id || selectedDivisionId);
        if (inferred) {
          return { ...prev, admission_class: inferred };
        }
        return prev;
      });
    }
  }, [editStudent, open, classes, selectedDivisionId, inferClassFromRoll]);

  // Fetch form_settings for field visibility & footer text
  const { data: formSettings = [] } = useQuery({
    queryKey: ['form-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('form_settings').select('*');
      if (error) throw error;
      return data as Array<{ id: string; field_name: string; is_visible: boolean; footer_text: string | null }>;
    },
  });

  // Fetch website_settings for admission-specific overrides
  const { data: websiteAdmissionSettings } = useQuery({
    queryKey: ['website-admission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .in('key', ['show_roll_no', 'show_session', 'admission_footer_text', 'global_footer_text_bn', 'global_footer_text_en', 'global_footer_spacing_top', 'global_footer_spacing_bottom', 'global_footer_font_size']);
      if (error) throw error;
      const result: Record<string, any> = {};
      data?.forEach(row => { result[row.key] = row.value; });
      return result;
    },
  });

  // Derive visibility from form_settings
  const isFormFieldVisible = (fieldName: string) => {
    const setting = formSettings.find(s => s.field_name === fieldName);
    return setting ? setting.is_visible : true;
  };

  // Merge: website_settings overrides form_settings for roll & session
  const showRollNo = websiteAdmissionSettings?.show_roll_no !== undefined
    ? String(websiteAdmissionSettings.show_roll_no) === 'true'
    : isFormFieldVisible('roll_no');
  const showSession = websiteAdmissionSettings?.show_session !== undefined
    ? String(websiteAdmissionSettings.show_session) === 'true'
    : isFormFieldVisible('admission_session');
  const footerParagraph = formSettings.find(s => s.field_name === 'footer_paragraph');
  const websiteFooterText = websiteAdmissionSettings?.admission_footer_text as string | undefined;
  const globalFooterText = bn
    ? (websiteAdmissionSettings?.global_footer_text_bn as string | undefined)
    : (websiteAdmissionSettings?.global_footer_text_en as string | undefined);
  const footerSpacingTop = Number(websiteAdmissionSettings?.global_footer_spacing_top ?? 8);
  const footerSpacingBottom = Number(websiteAdmissionSettings?.global_footer_spacing_bottom ?? 6);
  const footerFontSize = Number(websiteAdmissionSettings?.global_footer_font_size ?? 10);

  const getRollStartForClass = useCallback((classId: string) => {
    // Sort classes globally: first by division sort_order, then by class sort_order
    const globalSorted = [...classes].sort((a: any, b: any) => {
      const divA = divisions.findIndex((d: any) => d.id === a.division_id);
      const divB = divisions.findIndex((d: any) => d.id === b.division_id);
      if (divA !== divB) return divA - divB;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    const idx = globalSorted.findIndex((c: any) => c.id === classId);
    const order = idx >= 0 ? idx + 1 : 1;
    return order * 1000 + 1;
  }, [classes, divisions]);

  // Auto-generate roll number based on class + session (Atomic DB RPC with local fallback)
  const generateRollNumber = useCallback(async (classId: string, sessionId?: string) => {
    if (!classId || isEditMode) return;
    const rollStart = getRollStartForClass(classId);
    const rollPrefix = Math.floor(rollStart / 1000);

    const matchS = academicSessions.find((as: any) => as.id === sessionId || as.name === sessionId || as.name_bn === sessionId);
    const sId = matchS?.id || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId || '') ? sessionId : null);

    try {
      const { data: rpcRoll, error: rpcErr } = await (supabase as any).rpc('get_next_student_roll', {
        p_class_id: classId,
        p_session_id: sId,
        p_session_year: matchS?.name || sessionId || null,
        p_roll_start: rollStart,
      });
      if (!rpcErr && rpcRoll) {
        setForm(prev => ({ ...prev, roll_number: String(rpcRoll) }));
        return;
      }
    } catch {
      // fallback to client-side calculation
    }

    let query = supabase
      .from('students')
      .select('roll_number, class_id')
      .not('roll_number', 'is', null)
      .limit(100);

    query = query.or(`class_id.eq.${classId},roll_number.gte.${rollStart}`);

    if (sId) {
      query = query.eq('session_id', sId);
    }

    const { data } = await query;

    let maxRoll = rollStart - 1;
    if (data && data.length > 0) {
      for (const s of data) {
        const num = parseInt(s.roll_number || '0', 10);
        if (!isNaN(num) && num >= rollStart && num < (rollPrefix + 1) * 1000) {
          maxRoll = Math.max(maxRoll, num);
        }
      }
    }
    const nextRoll = String(maxRoll + 1);
    setForm(prev => ({ ...prev, roll_number: nextRoll }));
  }, [isEditMode, getRollStartForClass, academicSessions]);

  // Convert Bengali digits to English
  const bnToEn = (str: any) => String(str || '').replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

  // Auto-generate registration number = divisionPrefix + session first 4 digits + roll number
  const updateRegistrationFromRoll = useCallback((sessionYear: any, rollNumber: any, force = false) => {
    if (!sessionYear || !rollNumber || (isEditMode && !force)) return;
    const year = bnToEn(String(sessionYear).trim()).slice(0, 4);
    const enRoll = bnToEn(String(rollNumber).trim());
    // Find division prefix from selectedDivisionId
    const div = divisions.find((d: any) => d.id === selectedDivisionId);
    const prefix = (div as any)?.prefix || '';
    const regNo = prefix ? `${prefix}-${year}${enRoll}` : `${year}${enRoll}`;
    setForm(prev => ({ ...prev, registration_no: regNo }));
  }, [isEditMode, divisions, selectedDivisionId]);

  // Trigger roll & registration generation when class or session changes
  useEffect(() => {
    if (!open || isEditMode) return;
    if (form.admission_class) {
      generateRollNumber(form.admission_class, form.admission_session || undefined);
    }
  }, [open, form.admission_class, form.admission_session, form.session_year, isEditMode, generateRollNumber]);

  // Update registration whenever roll or session changes
  useEffect(() => {
    if (!open || isEditMode) return;
    if (form.session_year && form.roll_number) {
      updateRegistrationFromRoll(form.session_year, form.roll_number);
    }
  }, [open, form.session_year, form.roll_number, isEditMode, updateRegistrationFromRoll]);

  const calculateAge = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) { years--; months += 12; }
    return `${years} ${bn ? 'বছর' : 'years'} ${months} ${bn ? 'মাস' : 'months'} ${days} ${bn ? 'দিন' : 'days'}`;
  }, [bn]);

  const validateNid = (val: string, key: string, errorSetter: (v: string) => void) => {
    const cleaned = val.replace(/\D/g, '');
    setForm(prev => ({ ...prev, [key]: cleaned }));
    if (cleaned.length > 0 && cleaned.length !== 10 && cleaned.length !== 17) {
      errorSetter(bn ? 'NID অবশ্যই ১০ বা ১৭ ডিজিট হতে হবে' : 'NID must be 10 or 17 digits');
    } else {
      errorSetter('');
    }
  };

  const validateBirthReg = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setForm(prev => ({ ...prev, birth_reg_no: cleaned }));
    if (cleaned.length > 0 && cleaned.length !== 17) {
      setBirthRegError(bn ? 'জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিট হতে হবে' : 'Birth Reg must be exactly 17 digits');
    } else {
      setBirthRegError('');
      if (cleaned.length === 17) checkDuplicateBirthReg(cleaned);
    }
  };

  const checkDuplicateBirthReg = async (regNo: string) => {
    const { data } = await supabase.from('students').select('roll_number, registration_no, admission_session, student_id').eq('birth_reg_no', regNo).limit(1);
    if (data && data.length > 0) {
      const s = data[0];
      toast.info(
        bn ? `এই জন্ম নিবন্ধন নম্বরে ইতিমধ্যে ভর্তি আছে! রোল: ${s.roll_number || 'N/A'}, রেজি: ${s.registration_no || s.student_id}, সেশন: ${s.admission_session || 'N/A'}`
          : `Already admitted! Roll: ${s.roll_number || 'N/A'}, Reg: ${s.registration_no || s.student_id}, Session: ${s.admission_session || 'N/A'}`,
        { duration: 8000 }
      );
    }
  };

  const handleOldStudentSearch = async () => {
    if (!oldRoll && !oldSession) { toast.error(bn ? 'রোল বা সেশন দিন' : 'Enter roll or session'); return; }
    let query = supabase.from('students').select('*');
    if (oldRoll) query = query.eq('roll_number', oldRoll);
    if (oldSession) query = query.eq('admission_session', oldSession);
    const { data } = await query.limit(1);
    if (data && data.length > 0) {
      const s = data[0] as any;
      setForm(prev => ({
        ...prev,
        first_name: s.name_bn || '', last_name: s.name_en || '', roll_number: s.roll_number || '',
        gender: s.gender || 'male', date_of_birth: s.date_of_birth || '', birth_reg_no: s.birth_reg_no || '',
        father_name: s.father_name || '', father_name_en: s.father_name_en || '', mother_name: s.mother_name || '', mother_name_en: s.mother_name_en || '',
        father_nid: s.father_nid || '', mother_nid: s.mother_nid || '',
        photo_url: s.photo_url || '', religion: s.religion || 'islam',
        admission_session: s.admission_session || '', registration_no: s.registration_no || '',
      }));
      const admData = s.admission_data || {};
      if (admData.permanentAddr) setPermanentAddr(admData.permanentAddr);
      if (admData.presentAddr) setPresentAddr(admData.presentAddr);
      toast.success(bn ? 'ছাত্রের তথ্য পাওয়া গেছে' : 'Student data found');
    } else {
      toast.error(bn ? 'কোনো তথ্য পাওয়া যায়নি' : 'No data found');
    }
  };

  const resetForm = () => {
    const defaultActiveSession = academicSessions.find((as: any) => as.is_active) || academicSessions[0];
    setForm({
      student_type: '', residence_type: '',
      admission_session: defaultActiveSession?.id || '',
      roll_number: '', registration_no: '',
      admission_date: new Date().toISOString().split('T')[0],
      session_year: defaultActiveSession?.name || new Date().getFullYear().toString(),
      admission_class: '', first_name: '', last_name: '',
      gender: 'male', religion: 'islam', date_of_birth: '',
      birth_reg_no: '', previous_class: '', previous_institute: '',
      is_orphan: false, is_poor: false, is_free: false, student_category: '', photo_url: '',
      father_name: '', father_name_en: '', father_occupation: '', father_nid: '', father_phone: '', father_phone_code: '+880',
      mother_name: '', mother_name_en: '', mother_occupation: '', mother_nid: '', mother_phone: '', mother_phone_code: '+880',
      guardian_type: '', guardian_name: '', guardian_relation: '', guardian_phone: '', guardian_phone_code: '+880', guardian_nid: '',
      approver_name: '', approver_designation: '', approver_date: '', approver_signature: '',
    });
    setFieldErrors({});
    setCustomFieldValues({});
    setPermanentAddr(emptyAddress); setPresentAddr(emptyAddress);
    setParentPermanentAddr(emptyAddress); setParentPresentAddr(emptyAddress);
    setGuardianPermAddr(emptyAddress); setGuardianPresAddr(emptyAddress);
    setSameAddress(false); setParentAddrSameAsStudent(false);
    setParentSamePresAddr(false); setGuardianSameAddr(false);
    setFatherNidError(''); setMotherNidError('');
    setGuardianNidError(''); setBirthRegError('');
    setOldRoll(''); setOldSession(''); setOldClass('');
    setSelectedDivisionId('');
    setCurrentStep(0);
  };

  const buildAdmissionData = (): Record<string, any> => ({
    permanentAddr,
    presentAddr: sameAddress ? permanentAddr : presentAddr,
    parentPermanentAddr: parentAddrSameAsStudent ? permanentAddr : parentPermanentAddr,
    parentPresentAddr: parentAddrSameAsStudent ? (sameAddress ? permanentAddr : presentAddr) : (parentSamePresAddr ? parentPermanentAddr : parentPresentAddr),
    guardianPermAddr: form.guardian_type === 'other' ? guardianPermAddr : undefined,
    guardianPresAddr: form.guardian_type === 'other' ? (guardianSameAddr ? guardianPermAddr : guardianPresAddr) : undefined,
    guardian_type: form.guardian_type,
    guardian_name: form.guardian_name,
    guardian_relation: form.guardian_relation,
    guardian_phone: form.guardian_phone,
    guardian_phone_code: form.guardian_phone_code,
    guardian_nid: form.guardian_nid,
    father_phone_code: form.father_phone_code,
    mother_phone_code: form.mother_phone_code,
    previous_class: form.previous_class,
    previous_institute: form.previous_institute,
    admission_class: form.admission_class,
    student_type: form.student_type,
    custom_fields: customFieldValues,
    approver_name: form.approver_name,
    approver_designation: form.approver_designation,
    approver_date: form.approver_date,
    approver_signature: form.approver_signature,
  });

  const buildStudentPayload = () => {
    const admissionData = buildAdmissionData();
    const selectedSession = findMatchingSession(form.admission_session, form.session_year);

    const finalSessionName = selectedSession?.name || form.admission_session || form.session_year || null;
    const finalSessionId = selectedSession?.id || (form.admission_session && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(form.admission_session) ? form.admission_session : null);
    const finalSessionYear = form.session_year || selectedSession?.name || form.admission_session || null;

    const studentRegNo = form.registration_no?.trim() ? bnToEn(form.registration_no.trim()) : null;
    const studentId = studentRegNo || (isEditMode ? (editStudent.student_id ? bnToEn(editStudent.student_id) : null) : null);
    const studentRoll = form.roll_number?.trim() ? bnToEn(form.roll_number.trim()) : null;

    return {
      name_bn: form.first_name.trim(),
      name_en: form.last_name.trim() || null,
      roll_number: studentRoll,
      father_name: form.father_name.trim() || null,
      father_name_en: form.father_name_en?.trim() || null,
      mother_name: form.mother_name.trim() || null,
      mother_name_en: form.mother_name_en?.trim() || null,
      phone: form.father_phone || null,
      guardian_phone: form.guardian_type === 'other' ? form.guardian_phone : (form.guardian_type === 'mother' ? form.mother_phone : form.father_phone) || null,
      address: formatAddress(permanentAddr) || null,
      division_id: selectedDivisionId || (form.admission_class ? (classes.find((c: any) => c.id === form.admission_class) as any)?.division_id || null : null),
      class_id: form.admission_class || null,
      gender: form.gender,
      date_of_birth: form.date_of_birth || null,
      photo_url: form.photo_url || null,
      student_category: form.student_category || (form.is_orphan ? 'orphan' : form.is_poor ? 'poor' : 'general'),
      is_free: form.is_free,
      residence_type: form.residence_type,
      admission_date: form.admission_date || null,
      birth_reg_no: form.birth_reg_no || null,
      religion: form.religion,
      admission_session: finalSessionName,
      session_id: finalSessionId,
      registration_no: studentRegNo,
      student_id: studentId,
      session_year: finalSessionYear,
      previous_class: form.previous_class || null,
      previous_institute: form.previous_institute || null,
      father_occupation: form.father_occupation || null,
      father_nid: form.father_nid || null,
      father_phone: form.father_phone || null,
      mother_occupation: form.mother_occupation || null,
      mother_nid: form.mother_nid || null,
      mother_phone: form.mother_phone || null,
      is_orphan: form.is_orphan,
      is_poor: form.is_poor,
      admission_data: admissionData,
    };
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = buildStudentPayload();
      const studentId = (form.registration_no?.trim() ? bnToEn(form.registration_no.trim()) : null) || `STU-${Date.now().toString().slice(-8)}`;
      const { error } = await supabase.from('students').insert({
        ...payload,
        student_id: studentId,
        registration_no: studentId,
        approval_status: 'pending',
      } as any);
      if (error) throw error;
      // Best-effort welcome email via SMTP (Mailtrap)
      const recipientEmail = (payload as any).email;
      if (recipientEmail) {
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: recipientEmail,
              full_name: (payload as any).name_en || (payload as any).name_bn,
              kind: 'student',
              student_id: studentId,
              login_url: `${window.location.origin}/parent-portal`,
            },
          });
        } catch (mailErr) {
          console.error('send-welcome-email failed (non-fatal):', mailErr);
        }
      }
    },
    onSuccess: async () => {
      await invalidateAllStudentQueries(queryClient);
      await queryClient.refetchQueries({ queryKey: ['students'] });
      resetForm();
      onOpenChange(false);
      toast.success(bn ? 'ভর্তি আবেদন সফলভাবে জমা হয়েছে! অনুমোদনের অপেক্ষায়।' : 'Admission submitted! Pending approval.');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = buildStudentPayload();
      const updatedStudentId = (form.registration_no?.trim() ? bnToEn(form.registration_no.trim()) : null) || editStudent.student_id;
      const { error } = await supabase.from('students').update({
        ...payload,
        student_id: updatedStudentId,
        registration_no: updatedStudentId,
      } as any).eq('id', editStudent.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAllStudentQueries(queryClient);
      await queryClient.refetchQueries({ queryKey: ['students'] });
      resetForm();
      onOpenChange(false);
      toast.success(bn ? 'ছাত্রের তথ্য সফলভাবে আপডেট হয়েছে!' : 'Student updated successfully!');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    console.log('[AdmissionForm] handleSubmit called');
    console.log('[AdmissionForm] form state:', JSON.stringify(form, null, 2));
    console.log('[AdmissionForm] selectedDivisionId:', selectedDivisionId);
    console.log('[AdmissionForm] configFields count:', configFields.length, 'isLoaded:', isLoaded);

    // Division & Class selection is required in both add and edit mode
    if (!selectedDivisionId) {
      errors['admission_class'] = bn ? 'বিভাগ নির্বাচন আবশ্যক' : 'Division selection is required';
    } else if (!form.admission_class) {
      errors['admission_class'] = bn ? 'শ্রেণী নির্বাচন আবশ্যক' : 'Class selection is required';
    }

    // Admin panel form: minimal validation to allow flexible adding and updating
    if (!form.first_name?.trim()) {
      errors['first_name'] = bn ? 'শিক্ষার্থীর নাম আবশ্যক' : 'Student name is required';
    }

    // Special format validations: only trigger if value is actually provided
    if (form.birth_reg_no && form.birth_reg_no.length !== 17) {
      errors['birth_reg_no'] = bn ? 'জন্ম নিবন্ধন ১৭ ডিজিট হতে হবে' : 'Birth Reg must be 17 digits';
    }
    if (form.father_nid && form.father_nid.length !== 10 && form.father_nid.length !== 17) {
      errors['father_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
    }
    if (form.mother_nid && form.mother_nid.length !== 10 && form.mother_nid.length !== 17) {
      errors['mother_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
    }
    if (form.guardian_type === 'other' && form.guardian_nid) {
      if (form.guardian_nid.length !== 10 && form.guardian_nid.length !== 17) {
        errors['guardian_nid'] = bn ? 'NID ১০/১৭ ডিজিট' : 'NID 10/17 digits required';
      }
    }
    console.log('[AdmissionForm] final errors:', errors);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Build detailed error summary
      const errorCount = Object.keys(errors).length;
      const errorDetails = Object.entries(errors).slice(0, 5).map(([key, msg]) => {
        const fieldConfig = configFields.find(f => f.default_value === key);
        const fieldLabel = fieldConfig ? (bn ? fieldConfig.label_bn : fieldConfig.label) : key;
        return `• ${fieldLabel}: ${msg}`;
      }).join('\n');
      const moreText = errorCount > 5 ? (bn ? `\n...আরো ${errorCount - 5}টি ত্রুটি` : `\n...and ${errorCount - 5} more errors`) : '';
      toast.error(bn ? `ফর্মে ${errorCount}টি ত্রুটি রয়েছে` : `Form has ${errorCount} error(s)`, {
        description: errorDetails + moreText,
        duration: 8000,
      });
      // Scroll to first error field
      setTimeout(() => {
        const firstErrorKey = Object.keys(errors)[0];
        const errorEl = document.querySelector(`[data-field="${firstErrorKey}"]`) || document.querySelector(`[name="${firstErrorKey}"]`);
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    setFieldErrors({});
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const validateCurrentStep = (stepKey: string): boolean => {
    if (isEditMode) return true;
    const errors: Record<string, string> = {};

    if (stepKey === 'student_details') {
      if (birthRegError) errors['birth_reg_no'] = birthRegError;
      if (!selectedDivisionId && isFormFieldVisible('admission_class')) {
        errors['admission_division'] = bn ? 'বিভাগ নির্বাচন আবশ্যক' : 'Division is required';
      }
      const secFields = getFieldsBySection('student_details');
      secFields.forEach(f => {
        const k = f.default_value;
        if (f.is_required && f.is_active && k) {
          if (!form[k] || (typeof form[k] === 'string' && !form[k].trim())) {
            errors[k] = bn ? `${f.label_bn} আবশ্যক` : `${f.label} is required`;
          }
        }
      });
    } else if (stepKey === 'student_address') {
      const secFields = getFieldsBySection('student_address');
      secFields.forEach(f => {
        const k = f.default_value;
        if (f.is_required && f.is_active && k) {
          if (k === 'present_address' && !sameAddress && !presentAddr.district) {
            errors['present_address'] = bn ? 'বর্তমান ঠিকানা আবশ্যক' : 'Present address required';
          }
        }
      });
    } else if (stepKey === 'father_info') {
      if (fatherNidError) errors['father_nid'] = fatherNidError;
      if (isFieldActive('father_nid') && form.father_nid && form.father_nid.length !== 10 && form.father_nid.length !== 17) {
        errors['father_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
      }
      const secFields = getFieldsBySection('father_info');
      secFields.forEach(f => {
        const k = f.default_value;
        if (f.is_required && f.is_active && k) {
          if (!form[k] || (typeof form[k] === 'string' && !form[k].trim())) {
            errors[k] = bn ? `${f.label_bn} আবশ্যক` : `${f.label} is required`;
          }
        }
      });
    } else if (stepKey === 'mother_info') {
      if (motherNidError) errors['mother_nid'] = motherNidError;
      if (isFieldActive('mother_nid') && form.mother_nid && form.mother_nid.length !== 10 && form.mother_nid.length !== 17) {
        errors['mother_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
      }
      const secFields = getFieldsBySection('mother_info');
      secFields.forEach(f => {
        const k = f.default_value;
        if (f.is_required && f.is_active && k) {
          if (!form[k] || (typeof form[k] === 'string' && !form[k].trim())) {
            errors[k] = bn ? `${f.label_bn} আবশ্যক` : `${f.label} is required`;
          }
        }
      });
      // Check phone rule: at least father or mother phone
      if (isFieldActive('father_phone') && isFieldActive('mother_phone') && !form.father_phone && !form.mother_phone) {
        const phoneMsg = bn ? 'পিতা বা মাতার যে কোন একজনের মোবাইল আবশ্যক' : 'At least one parent mobile is required';
        errors['father_phone'] = phoneMsg;
        errors['mother_phone'] = phoneMsg;
      }
    } else if (stepKey === 'guardian_info') {
      if (isFieldActive('guardian_type') && !form.guardian_type) {
        errors['guardian_type'] = bn ? 'অভিভাবক নির্বাচন করুন' : 'Select guardian';
      }
      if (form.guardian_type === 'other') {
        if (guardianNidError) errors['guardian_nid'] = guardianNidError;
        if (isFieldActive('guardian_nid') && form.guardian_nid && form.guardian_nid.length !== 10 && form.guardian_nid.length !== 17) {
          errors['guardian_nid'] = bn ? 'NID ১০/১৭ ডিজিট' : 'NID 10/17 digits required';
        }
        if (!form.guardian_name?.trim()) errors['guardian_name'] = bn ? 'অভিভাবকের নাম আবশ্যক' : 'Guardian name required';
        if (!form.guardian_relation?.trim()) errors['guardian_relation'] = bn ? 'সম্পর্ক আবশ্যক' : 'Relation required';
        if (!form.guardian_phone?.trim()) errors['guardian_phone'] = bn ? 'মোবাইল আবশ্যক' : 'Phone required';
      }
    }

    // Check custom fields for this section
    const customSecFields = getFieldsBySection(stepKey as any).filter(f => !f.default_value);
    customSecFields.forEach(f => {
      if (f.is_required && f.is_active) {
        const val = customFieldValues[f.id];
        if (val === undefined || val === null || val === '') {
          errors[f.id] = bn ? `${f.label_bn} আবশ্যক` : `${f.label} is required`;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      const errorCount = Object.keys(errors).length;
      toast.error(bn ? `এই সেকশনে ${errorCount}টি আবশ্যক তথ্য বাকি রয়েছে` : `Please fill ${errorCount} required field(s) in this section`);
      return false;
    }

    return true;
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors[field]}</p>;
  };

  // ===== RENDER A SYSTEM FIELD BY field_key =====
  const renderSystemField = (fieldKey: string, config: AdmissionFieldConfig) => {
    const label = bn ? config.label_bn : config.label;
    const required = config.is_required;
    const reqStar = required ? <span className="text-destructive">*</span> : null;
    const hasError = !!fieldErrors[fieldKey];
    const errorBorder = hasError ? 'border-destructive ring-1 ring-destructive/30' : '';
    const errorLabel = hasError ? 'text-destructive' : '';

    switch (fieldKey) {
      case 'photo_url':
        return <PhotoUpload value={form.photo_url || null} onChange={(url) => setForm(prev => ({ ...prev, photo_url: url || '' }))} folder="students" />;

      case 'student_type':
        return (
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label} {reqStar}</Label>
            <div className="flex gap-2.5 mt-1.5">
              {(['new', 'old'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, student_type: type }))}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                    form.student_type === type
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {type === 'new' ? (bn ? 'নতুন ছাত্র' : 'New Student') : (bn ? 'পুরাতন ছাত্র' : 'Old Student')}
                </button>
              ))}
            </div>
          </div>
        );

      case 'residence_type':
        return (
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label} {reqStar}</Label>
            <div className="flex gap-2.5 mt-1.5">
              {[{ v: 'resident', l: bn ? 'আবাসিক' : 'Resident' }, { v: 'non-resident', l: bn ? 'অনাবাসিক' : 'Non-Resident' }].map(r => (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, residence_type: r.v }))}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                    form.residence_type === r.v
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </div>
        );

      case 'roll_number':
        if (!showRollNo) return null;
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`${isEditMode ? 'bg-background' : 'bg-muted'} mt-1 ${errorBorder}`}
              value={form.roll_number || ''}
              readOnly={!isEditMode}
              onChange={isEditMode ? (e => {
                const val = bnToEn(e.target.value);
                setForm(prev => {
                  const year = bnToEn(prev.session_year || '').trim().slice(0, 4);
                  const prevRoll = bnToEn(prev.roll_number || '').trim();
                  const newRoll = val.trim();
                  const div = divisions.find((d: any) => d.id === selectedDivisionId);
                  const prefix = (div as any)?.prefix || '';
                  const oldReg = prefix ? `${prefix}-${year}${prevRoll}` : `${year}${prevRoll}`;
                  const isAuto = !prev.registration_no || prev.registration_no === oldReg;
                  const newReg = isAuto && val ? (prefix ? `${prefix}-${year}${newRoll}` : `${year}${newRoll}`) : prev.registration_no;
                  return {
                    ...prev,
                    roll_number: val,
                    registration_no: newReg,
                  };
                });
              }) : undefined}
              placeholder={bn ? 'রোল নম্বর' : 'Roll Number'} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'registration_no':
        if (!isFormFieldVisible('registration_no')) return null;
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <div className="relative">
              <Input className={`bg-background mt-1 pr-24 ${errorBorder}`}
                value={form.registration_no || ''}
                onChange={e => {
                  const converted = bnToEn(e.target.value);
                  setForm(prev => ({ ...prev, registration_no: converted }));
                }}
                placeholder={bn ? 'রেজিস্ট্রেশন নম্বর লিখুন' : 'Registration Number'} />
              <button type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 mt-0.5 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                onClick={() => updateRegistrationFromRoll(form.session_year, form.roll_number || '', true)}>
                {bn ? 'অটো' : 'Auto'}
              </button>
            </div>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'admission_session':
        if (!showSession) return null;
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Select value={form.admission_session} onValueChange={v => {
              const session = academicSessions.find((s: any) => s.id === v);
              setForm(prev => ({ ...prev, admission_session: v, session_year: session?.name || prev.session_year }));
            }}>
              <SelectTrigger className={`bg-background mt-1 ${errorBorder}`}><SelectValue placeholder={bn ? 'সেশন নির্বাচন' : 'Select Session'} /></SelectTrigger>
              <SelectContent>
                {academicSessions.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'session_year':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              value={form.session_year || ''}
              onChange={e => {
                const val = bnToEn(e.target.value);
                setForm(prev => {
                  const match = findMatchingSession(val, val);
                  return {
                    ...prev,
                    session_year: val,
                    admission_session: match ? match.id : prev.admission_session,
                  };
                });
              }}
              placeholder={bn ? 'যেমন: ২০২৬ বা 2026' : 'e.g. 2026'} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'admission_division':
        return (
          <div data-field="admission_division">
            <Label className="text-sm font-medium text-foreground">{bn ? 'বিভাগ' : 'Division'} <span className="text-destructive">*</span></Label>
            <Select value={selectedDivisionId} onValueChange={(v) => {
              setSelectedDivisionId(v);
              setForm(prev => ({ ...prev, admission_class: '' }));
              if (fieldErrors['admission_division']) {
                setFieldErrors(prev => {
                  const copy = { ...prev };
                  delete copy['admission_division'];
                  return copy;
                });
              }
            }}>
              <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'বিভাগ নির্বাচন' : 'Select Division'} /></SelectTrigger>
              <SelectContent>{divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError field="admission_division" />
          </div>
        );

      case 'admission_class':
        if (!isFormFieldVisible('admission_class')) return null;
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Select value={form.admission_class} onValueChange={v => setForm(prev => ({ ...prev, admission_class: v }))} disabled={!selectedDivisionId}>
              <SelectTrigger className={`bg-background mt-1 ${errorBorder}`}><SelectValue placeholder={!selectedDivisionId ? (bn ? 'প্রথমে বিভাগ নির্বাচন করুন' : 'Select Division first') : (bn ? 'নির্বাচন' : 'Select')} /></SelectTrigger>
              <SelectContent>
                {filteredClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}
                {filteredClasses.length === 0 && <SelectItem value="none" disabled>{bn ? 'এই বিভাগে কোনো শ্রেণী নেই' : 'No classes in this division'}</SelectItem>}
              </SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'gender':
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Select value={normalizeGender(form.gender)} onValueChange={v => setForm(prev => ({ ...prev, gender: normalizeGender(v) }))}>
              <SelectTrigger className={`bg-background mt-1 ${errorBorder}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{bn ? 'পুরুষ' : 'Male'}</SelectItem>
                <SelectItem value="female">{bn ? 'মহিলা' : 'Female'}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'religion':
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Select value={form.religion} onValueChange={v => setForm(prev => ({ ...prev, religion: v }))}>
              <SelectTrigger className={`bg-background mt-1 ${errorBorder}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="islam">{bn ? 'ইসলাম' : 'Islam'}</SelectItem>
                <SelectItem value="hinduism">{bn ? 'হিন্দু' : 'Hinduism'}</SelectItem>
                <SelectItem value="christianity">{bn ? 'খ্রিস্টান' : 'Christianity'}</SelectItem>
                <SelectItem value="buddhism">{bn ? 'বৌদ্ধ' : 'Buddhism'}</SelectItem>
                <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'date_of_birth':
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <DatePicker bengali={bn} className={`mt-1 ${errorBorder}`}
              value={form.date_of_birth} onChange={v => setForm(prev => ({ ...prev, date_of_birth: v }))} />
            {form.date_of_birth && <p className="text-xs text-primary mt-1 font-medium">{bn ? 'বয়স: ' : 'Age: '}{calculateAge(form.date_of_birth)}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'birth_reg_no':
        if (!isFormFieldVisible('birth_reg_no')) return null;
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder || (birthRegError ? 'border-destructive ring-1 ring-destructive/30' : '')}`}
              maxLength={17} value={form.birth_reg_no} onChange={e => validateBirthReg(e.target.value)} />
            {birthRegError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {birthRegError}</p>}
            {form.birth_reg_no.length === 17 && !birthRegError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'সঠিক' : 'Valid'}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'is_orphan':
      case 'is_poor':
        return null; // Rendered together in special block

      case 'father_nid':
        if (!isFormFieldVisible('father_nid')) return null;
        return (
          <div>
            <Label className={errorLabel}>{label}</Label>
            <Input className={`bg-background mt-1 ${errorBorder || (fatherNidError ? 'border-destructive ring-1 ring-destructive/30' : '')}`}
              maxLength={17} value={form.father_nid}
              onChange={e => validateNid(e.target.value, 'father_nid', setFatherNidError)} />
            {fatherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fatherNidError}</p>}
            {(form.father_nid.length === 10 || form.father_nid.length === 17) && !fatherNidError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'সঠিক' : 'Valid'}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'mother_nid':
        if (!isFormFieldVisible('mother_nid')) return null;
        return (
          <div>
            <Label className={errorLabel}>{label}</Label>
            <Input className={`bg-background mt-1 ${errorBorder || (motherNidError ? 'border-destructive ring-1 ring-destructive/30' : '')}`}
              maxLength={17} value={form.mother_nid}
              onChange={e => validateNid(e.target.value, 'mother_nid', setMotherNidError)} />
            {motherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {motherNidError}</p>}
            {(form.mother_nid.length === 10 || form.mother_nid.length === 17) && !motherNidError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'সঠিক' : 'Valid'}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'guardian_nid':
        if (!isFormFieldVisible('guardian_nid')) return null;
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder || (guardianNidError ? 'border-destructive ring-1 ring-destructive/30' : '')}`}
              maxLength={17} value={form.guardian_nid}
              onChange={e => validateNid(e.target.value, 'guardian_nid', setGuardianNidError)} />
            {guardianNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {guardianNidError}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'father_phone':
        return <div><PhoneInput label={label} value={form.father_phone} countryCode={form.father_phone_code}
          onChange={(phone, code) => setForm(prev => ({ ...prev, father_phone: phone, father_phone_code: code }))} required={required} error={hasError} />
          <FieldError field={fieldKey} /></div>;

      case 'mother_phone':
        return <div><PhoneInput label={label} value={form.mother_phone} countryCode={form.mother_phone_code}
          onChange={(phone, code) => setForm(prev => ({ ...prev, mother_phone: phone, mother_phone_code: code }))} required={required} error={hasError} />
          <FieldError field={fieldKey} /></div>;

      case 'guardian_phone':
        return <div><PhoneInput label={label} value={form.guardian_phone} countryCode={form.guardian_phone_code}
          onChange={(phone, code) => setForm(prev => ({ ...prev, guardian_phone: phone, guardian_phone_code: code }))} required={required} error={hasError} />
          <FieldError field={fieldKey} /></div>;

      case 'guardian_type':
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Select value={form.guardian_type} onValueChange={v => setForm(prev => ({ ...prev, guardian_type: v }))}>
              <SelectTrigger className={`bg-background mt-1 ${errorBorder}`}><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="father">{bn ? 'পিতা' : 'Father'}</SelectItem>
                <SelectItem value="mother">{bn ? 'মাতা' : 'Mother'}</SelectItem>
                <SelectItem value="other">{bn ? 'অন্যান্য' : 'Others'}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'address_permanent':
        return <AddressFields label={label} value={permanentAddr} onChange={setPermanentAddr} />;

      case 'address_present':
        return (
          <>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox id="sameAddr" checked={sameAddress} onCheckedChange={v => { setSameAddress(!!v); if (v) setPresentAddr({ ...permanentAddr }); }} />
              <Label htmlFor="sameAddr">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present address same as permanent'}</Label>
            </div>
            {!sameAddress && <AddressFields label={label} value={presentAddr} onChange={setPresentAddr} />}
          </>
        );

      case 'admission_date':
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <DatePicker bengali={bn} className={`mt-1 ${errorBorder}`} value={form.admission_date}
              onChange={v => setForm(prev => ({ ...prev, admission_date: v }))} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'first_name':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              name="first_name"
              id="first_name"
              langType="bn"
              value={form.first_name || ''}
              onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder={bn ? 'বাংলায় লিখুন' : 'Full Name (Bangla)'} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'last_name':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              name="last_name"
              id="last_name"
              langType="en"
              value={form.last_name || ''}
              onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder={bn ? 'ইংরেজিতে লিখুন (শুধুমাত্র ইংরেজি অক্ষর)' : 'Full Name (English)'} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'father_name_en':
      case 'mother_name_en':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              name={fieldKey}
              id={fieldKey}
              langType="en"
              value={form[fieldKey] || ''}
              onChange={e => setForm(prev => ({ ...prev, [fieldKey]: e.target.value }))}
              placeholder={bn ? 'ইংরেজিতে লিখুন (শুধুমাত্র ইংরেজি অক্ষর)' : 'Enter in English'} />
            <FieldError field={fieldKey} />
          </div>
        );

      default:
        if (!isFormFieldVisible(fieldKey)) return null;
        return (
          <div>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              name={fieldKey}
              id={fieldKey}
              value={form[fieldKey] || ''} onChange={e => setForm(prev => ({ ...prev, [fieldKey]: e.target.value }))}
              placeholder={config.placeholder || ''} />
            <FieldError field={fieldKey} />
          </div>
        );
    }
  };

  // ===== RENDER GENERIC CUSTOM FIELD =====
  const renderCustomField = (config: AdmissionFieldConfig) => {
    const label = bn ? config.label_bn : config.label;
    const required = config.is_required;
    const val = customFieldValues[config.id] || '';
    let opts: string[] = [];
    try { opts = Array.isArray(config.options) ? (config.options as string[]) : []; } catch { opts = []; }

    const update = (v: any) => setCustomFieldValues(prev => ({ ...prev, [config.id]: v }));

    return (
      <div key={config.id}>
        <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
        {config.field_type === 'text' && (
          <Input
            className="bg-background mt-1"
            name={config.id}
            id={config.id}
            langType={config.default_value?.endsWith('_en') || config.label?.toLowerCase().includes('english') || config.label_bn?.includes('ইংরেজি') ? 'en' : undefined}
            value={val}
            onChange={e => update(e.target.value)}
            placeholder={config.placeholder || ''}
          />
        )}
        {config.field_type === 'number' && <Input type="number" name={config.id} id={config.id} className="bg-background mt-1" value={val || ''} onChange={e => update(e.target.value)} />}
        {config.field_type === 'textarea' && (
          <Textarea
            className="bg-background mt-1"
            name={config.id}
            id={config.id}
            langType={config.default_value?.endsWith('_en') || config.label?.toLowerCase().includes('english') || config.label_bn?.includes('ইংরেজি') ? 'en' : undefined}
            rows={3}
            value={val}
            onChange={e => update(e.target.value)}
          />
        )}
        {config.field_type === 'date' && <DatePicker bengali={bn} className="mt-1" value={val} onChange={v => update(v)} />}
        {config.field_type === 'email' && <Input type="email" className="bg-background mt-1" value={val} onChange={e => update(e.target.value)} />}
        {config.field_type === 'switch' && <Switch checked={!!val} onCheckedChange={c => update(c)} />}
        {config.field_type === 'select' && (
          <Select value={val} onValueChange={update}>
            <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
            <SelectContent>{opts.map((o, i) => <SelectItem key={i} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {config.field_type === 'radio' && (
          <div className="flex flex-wrap gap-3 mt-1">{opts.map((o, i) => (
            <label key={i} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name={config.id} value={o} checked={val === o} onChange={() => update(o)} className="accent-primary" />{o}
            </label>
          ))}</div>
        )}
        {config.field_type === 'checkbox' && (
          <div className="flex flex-wrap gap-3 mt-1">{opts.map((o, i) => {
            const checked = Array.isArray(val) ? val.includes(o) : false;
            return (
              <label key={i} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" value={o} checked={checked} onChange={e => {
                  const arr = Array.isArray(val) ? [...val] : [];
                  if (e.target.checked) arr.push(o); else { const idx = arr.indexOf(o); if (idx > -1) arr.splice(idx, 1); }
                  update(arr);
                }} className="accent-primary" />{o}
              </label>
            );
          })}</div>
        )}
        {config.field_type === 'file' && (
          <div className="mt-1">
            <FileUploadField
              value={val}
              onChange={url => update(url || '')}
              folder="admission-docs"
            />
          </div>
        )}
      </div>
    );
  };

  // Known system field keys
  const SYSTEM_KEYS = [
    'photo_url', 'student_type', 'residence_type', 'admission_session', 'roll_number',
    'registration_no', 'admission_date', 'session_year', 'admission_division', 'admission_class',
    'first_name', 'last_name', 'gender', 'religion', 'date_of_birth', 'birth_reg_no',
    'previous_class', 'previous_institute', 'is_orphan', 'is_poor',
    'address_permanent', 'address_present',
    'father_name', 'father_name_en', 'father_occupation', 'father_nid', 'father_phone',
    'mother_name', 'mother_name_en', 'mother_occupation', 'mother_nid', 'mother_phone',
    'guardian_type', 'guardian_name', 'guardian_relation', 'guardian_phone', 'guardian_nid',
  ];

  // Render a section
  const renderSection = (sectionKey: string) => {
    const sectionInfo = SECTION_INFO[sectionKey as keyof typeof SECTION_INFO];
    if (!sectionInfo) return null;

    const sectionFields = getFieldsBySection(sectionKey as any);

    if (sectionFields.length === 0) return null;

    const title = bn ? sectionInfo.bn : sectionInfo.en;

    // Student details section: special layout with photo + type selectors
    if (sectionKey === 'student_details') {
      const photoField = sectionFields.find(f => f.default_value === 'photo_url');
      const typeField = sectionFields.find(f => f.default_value === 'student_type');
      const resField = sectionFields.find(f => f.default_value === 'residence_type');
      const orphanField = sectionFields.find(f => f.default_value === 'is_orphan');
      const poorField = sectionFields.find(f => f.default_value === 'is_poor');
      const rawOtherFields = sectionFields.filter(f =>
        !['photo_url', 'student_type', 'residence_type', 'is_orphan', 'is_poor'].includes(f.default_value || '')
      );

      const syntheticDivisionField: any = {
        id: 'synthetic_admission_division',
        default_value: 'admission_division',
        label: 'Division',
        label_bn: 'বিভাগ',
        field_type: 'select',
        is_required: true,
        section: 'student_details',
      };

      const otherWithDiv = [...rawOtherFields];
      if (!otherWithDiv.some(f => f.default_value === 'admission_division')) {
        otherWithDiv.push(syntheticDivisionField);
      }

      // Ordered strictly: সেশন -> বিভাগ -> শ্রেণী -> রোল -> রেজিস্ট্রেশন -> ভর্তির তারিখ -> নাম ...
      const FIELD_ORDER = [
        'admission_session',
        'admission_division',
        'admission_class',
        'roll_number',
        'registration_no',
        'admission_date',
        'session_year',
        'first_name',
        'last_name',
        'gender',
        'date_of_birth',
        'religion',
        'birth_reg_no',
        'previous_class',
        'previous_institute',
      ];

      const otherFields = otherWithDiv.sort((a, b) => {
        const orderA = a.default_value ? FIELD_ORDER.indexOf(a.default_value) : -1;
        const orderB = b.default_value ? FIELD_ORDER.indexOf(b.default_value) : -1;
        if (orderA !== -1 && orderB !== -1) return orderA - orderB;
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });

      const ACADEMIC_KEYS = ['admission_session', 'admission_division', 'admission_class', 'roll_number', 'registration_no', 'admission_date', 'session_year'];
      const academicFields = otherFields.filter(f => ACADEMIC_KEYS.includes(f.default_value || ''));
      const personalFields = otherFields.filter(f => !ACADEMIC_KEYS.includes(f.default_value || ''));

      return (
        <div key={sectionKey} className="space-y-5">
          {/* Top Row: Student Type & Residence Type Segmented Cards (Exact Mockup Matching) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeField && (
              <div className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-foreground flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    {bn ? 'ছাত্রের ধরণ (Student Type)' : 'Student Type'}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                    {bn ? 'আবশ্যক' : 'Required'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-muted/70 p-1.5 rounded-xl border border-slate-200 dark:border-border">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, student_type: 'new' }))}
                    className={`py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 ${
                      form.student_type === 'new'
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 scale-[1.02]'
                        : 'bg-white dark:bg-card text-slate-600 dark:text-muted-foreground hover:text-slate-900 font-semibold border border-slate-200/80 dark:border-border/60 shadow-2xs'
                    }`}
                  >
                    {form.student_type === 'new' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span>{bn ? 'নতুন ছাত্র' : 'New Student'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, student_type: 'old' }))}
                    className={`py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 ${
                      form.student_type === 'old'
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 scale-[1.02]'
                        : 'bg-white dark:bg-card text-slate-600 dark:text-muted-foreground hover:text-slate-900 font-semibold border border-slate-200/80 dark:border-border/60 shadow-2xs'
                    }`}
                  >
                    {form.student_type === 'old' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />
                    ) : (
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span>{bn ? 'পুরাতন ছাত্র' : 'Old Student'}</span>
                  </button>
                </div>
              </div>
            )}

            {resField && (
              <div className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    {bn ? 'আবাসন ধরণ (Residence)' : 'Residence'}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                    {bn ? 'আবশ্যক' : 'Required'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-muted/70 p-1.5 rounded-xl border border-slate-200 dark:border-border">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, residence_type: 'non-resident' }))}
                    className={`py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 ${
                      form.residence_type === 'non-resident'
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 scale-[1.02]'
                        : 'bg-white dark:bg-card text-slate-600 dark:text-muted-foreground hover:text-slate-900 font-semibold border border-slate-200/80 dark:border-border/60 shadow-2xs'
                    }`}
                  >
                    {form.residence_type === 'non-resident' && (
                      <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />
                    )}
                    <span>{bn ? 'অনাবাসিক (Day Scholar)' : 'Non-Resident'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, residence_type: 'resident' }))}
                    className={`py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 ${
                      form.residence_type === 'resident'
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 scale-[1.02]'
                        : 'bg-white dark:bg-card text-slate-600 dark:text-muted-foreground hover:text-slate-900 font-semibold border border-slate-200/80 dark:border-border/60 shadow-2xs'
                    }`}
                  >
                    {form.residence_type === 'resident' && (
                      <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />
                    )}
                    <span>{bn ? 'আবাসিক (Hostel/Boarding)' : 'Resident'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Old student search */}
          {isFieldActive('student_type') && form.student_type === 'old' && (
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3 shadow-2xs">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                {bn ? 'পুরাতন ছাত্রের তথ্য অনুসন্ধান' : 'Search Old Student'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder={bn ? 'রোল' : 'Roll'} value={oldRoll} onChange={e => setOldRoll(e.target.value)} className="bg-background rounded-xl" />
                <Input placeholder={bn ? 'ভর্তি সেশন' : 'Session'} value={oldSession} onChange={e => setOldSession(e.target.value)} className="bg-background rounded-xl" />
                <Select value={oldClass} onValueChange={setOldClass}>
                  <SelectTrigger className="bg-background rounded-xl"><SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={handleOldStudentSearch} className="flex items-center gap-2 rounded-xl text-xs">
                <Search className="w-3.5 h-3.5" /> {bn ? 'অনুসন্ধান' : 'Search'}
              </Button>
            </div>
          )}

          {/* Student Category & Free Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/5 via-background to-secondary/30 shadow-2xs">
            <div>
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">{bn ? 'ছাত্রের ক্যাটাগরি' : 'Student Category'} <span className="text-destructive">*</span></Label>
              <Select value={form.student_category} onValueChange={v => {
                setForm(prev => ({
                  ...prev,
                  student_category: v,
                  is_orphan: v === 'orphan',
                  is_poor: v === 'poor',
                }));
              }}>
                <SelectTrigger className="bg-background mt-1.5 h-10 rounded-xl"><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {studentCategories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.name}>{bn ? cat.name_bn : cat.name}</SelectItem>
                  ))}
                  {studentCategories.length === 0 && (
                    <SelectItem value="general">{bn ? 'সাধারণ' : 'General'}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-background self-end shadow-2xs">
              <div className="flex items-center gap-3">
                <Switch id="isFree" checked={form.is_free} onCheckedChange={v => setForm(prev => ({ ...prev, is_free: !!v }))} />
                <Label htmlFor="isFree" className="text-xs sm:text-sm font-semibold cursor-pointer">
                  {bn ? 'বিনা বেতন (Free Student)' : 'Free Student (No Fee)'}
                </Label>
              </div>
              {form.is_free && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  {bn ? 'সক্রিয়' : 'Active'}
                </span>
              )}
            </div>
          </div>

          {/* Group 1: Academic Information (Exact Mockup Match) */}
          <div className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100 dark:border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-foreground">
                    {bn ? 'একাডেমিক তথ্য' : 'Academic Information'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    {bn ? 'ভর্তি সেশন, বিভাগ ও শ্রেণীর তথ্য নির্বাচন করুন' : 'Select admission session, division and class'}
                  </p>
                </div>
              </div>
              <span className="text-xs bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground px-3 py-1 rounded-full border border-slate-200 dark:border-border font-semibold">
                {bn ? 'সঠিক ক্রম সাজানো' : 'Sequential Order'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {academicFields.map(f => {
                const key = f.default_value;
                if (!key) return <div key={f.id} data-field={f.id}>{renderCustomField(f)}</div>;
                if (SYSTEM_KEYS.includes(key)) return <div key={f.id} data-field={key}>{renderSystemField(key, f)}</div>;
                return <div key={f.id} data-field={key}>{renderCustomField(f)}</div>;
              })}
            </div>
          </div>

          {/* Group 2: Personal Information (With Avatar Photo Box from Mockup) */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-foreground">
                  {bn ? 'ব্যক্তিগত বিবরণ' : 'Personal Details'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {bn ? 'শিক্ষার্থীর ছবি, নাম, লিঙ্গ, জন্ম তারিখ ও অন্যান্য তথ্য' : 'Student photo, name, gender, birth date and details'}
                </p>
              </div>
            </div>

            {/* Photo Avatar Uploader */}
            {photoField && (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
                <div className="shrink-0">
                  <PhotoUpload value={form.photo_url || null} onChange={(url) => setForm(prev => ({ ...prev, photo_url: url || '' }))} folder="students" />
                </div>
                <div className="space-y-1 text-center sm:text-left self-center">
                  <h5 className="text-xs font-bold text-foreground">{bn ? 'শিক্ষার্থীর ছবি' : 'Student Photo'}</h5>
                  <p className="text-[11px] text-muted-foreground">{bn ? 'পরিচ্ছন্ন পাসপোর্ট সাইজ ছবি আপলোড করুন' : 'Upload a clear passport size photo'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personalFields.map(f => {
                const key = f.default_value;
                if (!key) return <div key={f.id} data-field={f.id}>{renderCustomField(f)}</div>;
                if (SYSTEM_KEYS.includes(key)) return <div key={f.id} data-field={key}>{renderSystemField(key, f)}</div>;
                return <div key={f.id} data-field={key}>{renderCustomField(f)}</div>;
              })}
            </div>
          </div>
        </div>
      );
    }

    // Father info section
    if (sectionKey === 'father_info') {
      return (
        <div key={sectionKey} className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">{title}</h4>
              <p className="text-xs text-muted-foreground">{bn ? 'পিতার নাম, পেশা, মোবাইল ও জাতীয় পরিচয়পত্র' : "Father's name, occupation, mobile and NID"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sectionFields.map(f => {
              const key = f.default_value;
              if (!key) return <div key={f.id} data-field={f.id}>{renderCustomField(f)}</div>;
              if (SYSTEM_KEYS.includes(key)) return <div key={f.id} data-field={key}>{renderSystemField(key, f)}</div>;
              return <div key={f.id} data-field={key}>{renderCustomField(f)}</div>;
            })}
          </div>
        </div>
      );
    }

    // Student address section
    if (sectionKey === 'student_address') {
      return (
        <div key={sectionKey} className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">{title}</h4>
              <p className="text-xs text-muted-foreground">{bn ? 'শিক্ষার্থীর স্থায়ী ও বর্তমান ঠিকানা' : 'Student permanent and present address'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {sectionFields.map(f => {
              const key = f.default_value;
              if (!key) return <div key={f.id} data-field={f.id}>{renderCustomField(f)}</div>;
              if (SYSTEM_KEYS.includes(key)) return <div key={f.id} data-field={key}>{renderSystemField(key, f)}</div>;
              return <div key={f.id} data-field={key}>{renderCustomField(f)}</div>;
            })}
          </div>
        </div>
      );
    }

    // Mother info section - also renders parent address after it
    if (sectionKey === 'mother_info') {
      return (
        <React.Fragment key={sectionKey}>
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-border/60">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">{title}</h4>
                <p className="text-xs text-muted-foreground">{bn ? 'মাতার নাম, পেশা, মোবাইল ও জাতীয় পরিচয়পত্র' : "Mother's name, occupation, mobile and NID"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sectionFields.map(f => {
                const key = f.default_value;
                if (!key) return <div key={f.id} data-field={f.id}>{renderCustomField(f)}</div>;
                if (SYSTEM_KEYS.includes(key)) return <div key={f.id} data-field={key}>{renderSystemField(key, f)}</div>;
                return <div key={f.id} data-field={key}>{renderCustomField(f)}</div>;
              })}
            </div>
            <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bn ? 'কমপক্ষে একটি NID এবং একটি মোবাইল নম্বর আবশ্যক' : 'At least one NID and one mobile number required'}</span>
            </div>
          </div>

          {/* Parent address */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-xs mt-5">
            <div className="flex items-center gap-3 pb-3 border-b border-border/60">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">{bn ? 'পিতা/মাতার ঠিকানা' : 'Parent Address'}</h4>
                <p className="text-xs text-muted-foreground">{bn ? 'পিতা বা মাতার স্থায়ী ও বর্তমান ঠিকানা' : "Parent's permanent and present address"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
              <Checkbox id="parentAddrSame" checked={parentAddrSameAsStudent} onCheckedChange={v => {
                setParentAddrSameAsStudent(!!v);
                if (v) { setParentPermanentAddr({ ...permanentAddr }); setParentPresentAddr(sameAddress ? { ...permanentAddr } : { ...presentAddr }); }
              }} />
              <Label htmlFor="parentAddrSame" className="text-sm font-medium cursor-pointer">{bn ? 'ছাত্রের ঠিকানার মতো' : 'Same as student address'}</Label>
            </div>
            {!parentAddrSameAsStudent && (
              <div className="space-y-4">
                <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={parentPermanentAddr} onChange={setParentPermanentAddr} />
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <Checkbox id="parentSamePres" checked={parentSamePresAddr} onCheckedChange={v => { setParentSamePresAddr(!!v); if (v) setParentPresentAddr({ ...parentPermanentAddr }); }} />
                  <Label htmlFor="parentSamePres" className="text-sm font-medium cursor-pointer">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
                </div>
                {!parentSamePresAddr && <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={parentPresentAddr} onChange={setParentPresentAddr} />}
              </div>
            )}
          </div>
        </React.Fragment>
      );
    }

    // Guardian section: auto-fill logic + conditional fields
    if (sectionKey === 'guardian_info') {
      const guardianTypeField = sectionFields.find(f => f.default_value === 'guardian_type');
      const otherGuardianFields = sectionFields.filter(f => f.default_value !== 'guardian_type');

      return (
        <div key={sectionKey} className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">{title}</h4>
              <p className="text-xs text-muted-foreground">{bn ? 'আইনগত অভিভাবক নির্বাচন ও যোগাযোগের বিবরণ' : 'Legal guardian selection and contact details'}</p>
            </div>
          </div>
          {guardianTypeField && renderSystemField('guardian_type', guardianTypeField)}

          {(form.guardian_type === 'father' || form.guardian_type === 'mother') && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {bn ? `${form.guardian_type === 'father' ? 'পিতার' : 'মাতার'} তথ্য থেকে স্বয়ংক্রিয়ভাবে পূরণ হবে` : `Will auto-fill from ${form.guardian_type === 'father' ? "father's" : "mother's"} information`}
              </p>
            </div>
          )}

          {form.guardian_type === 'other' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherGuardianFields.map(f => {
                  const key = f.default_value;
                  if (!key) return <div key={f.id} data-field={f.id}>{renderCustomField(f)}</div>;
                  if (SYSTEM_KEYS.includes(key)) return <div key={f.id} data-field={key}>{renderSystemField(key, f)}</div>;
                  return <div key={f.id} data-field={key}>{renderCustomField(f)}</div>;
                })}
              </div>
              <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={guardianPermAddr} onChange={setGuardianPermAddr} />
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                <Checkbox id="guardianSameAddr" checked={guardianSameAddr} onCheckedChange={v => { setGuardianSameAddr(!!v); if (v) setGuardianPresAddr({ ...guardianPermAddr }); }} />
                <Label htmlFor="guardianSameAddr" className="text-sm font-medium cursor-pointer">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
              </div>
              {!guardianSameAddr && <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={guardianPresAddr} onChange={setGuardianPresAddr} />}
            </div>
          )}
        </div>
      );
    }

    // Generic section (address etc.)
    return (
      <div key={sectionKey} className="border rounded-lg p-4 space-y-4 shadow-md">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{bn ? 'বিবরণ সঠিকভাবে পূরণ করুন' : 'Fill in the information accurately'}</p>
          </div>
        </div>
        {sectionFields.map(f => {
          const key = f.default_value;
          if (!key) return <div key={f.id} data-field={f.id}>{renderCustomField(f)}</div>;
          if (SYSTEM_KEYS.includes(key)) return <div key={f.id} data-field={key}>{renderSystemField(key, f)}</div>;
          return <div key={f.id} data-field={key}>{renderCustomField(f)}</div>;
        })}
      </div>
    );
  };

  // Get unique sections from fields - use sections from hook which covers all known sections
  const activeSections = sections.filter(section => getFieldsBySection(section).length > 0);
  const allStepKeys = isEditMode ? [...activeSections, 'approver'] : activeSections;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, allStepKeys.length - 1));

  const getStepTitle = (key: string) => {
    if (key === 'approver') return bn ? 'অফিস অনুমোদন' : 'Approval';
    const info = SECTION_INFO[key as keyof typeof SECTION_INFO];
    if (info) return bn ? info.bn.trim() : info.en.trim();
    return key;
  };

  const handleStepClick = (targetIdx: number) => {
    if (targetIdx === safeCurrentStep) return;
    if (targetIdx < safeCurrentStep || isEditMode) {
      setCurrentStep(targetIdx);
      const dialogContent = document.querySelector('[role="dialog"]');
      if (dialogContent) dialogContent.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (validateCurrentStep(allStepKeys[safeCurrentStep])) {
        setCurrentStep(targetIdx);
        const dialogContent = document.querySelector('[role="dialog"]');
        if (dialogContent) dialogContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto dialog-content-scroll border border-slate-200/90 dark:border-border rounded-3xl shadow-2xl p-0 bg-white dark:bg-card overflow-hidden">
        
        {/* Top Modal Header (1:1 Mockup Match) */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20 border-b border-slate-200/80 dark:border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
              {isEditMode ? <Save className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">
                  {isEditMode ? (bn ? 'ছাত্রের তথ্য সম্পাদনা' : 'Edit Student Details') : (bn ? 'ভর্তি আবেদন ফরম' : 'Admission Application Form')}
                </h2>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                  {form.admission_session || '২০২৬'} শিক্ষাবর্ষ
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                {bn ? 'আবশ্যকীয় তথ্যগুলো পূরণ করে পরবর্তী ধাপে এগিয়ে যান। ' : 'Fill in required fields to proceed. '}
                <span className="text-rose-500 font-bold">*</span>
                {bn ? ' চিহ্নিত ঘর বাধ্যতামূলক।' : ' denotes required.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-700 dark:text-foreground">
                {bn ? `ধাপ ${safeCurrentStep + 1} / ${allStepKeys.length}` : `Step ${safeCurrentStep + 1} of ${allStepKeys.length}`}
              </span>
            </div>
          </div>
        </div>

        {/* Stepper Wizard (1:1 Mockup Match) */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50/80 dark:bg-muted/40 border-b border-slate-200/70 dark:border-border/70">
          <div className="relative flex items-center justify-between max-w-2xl mx-auto">
            {/* Background Progress Line */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-200 dark:bg-muted rounded-full -z-0">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-400"
                style={{ width: `${(safeCurrentStep / Math.max(1, allStepKeys.length - 1)) * 100}%` }}
              />
            </div>

            {allStepKeys.map((stepKey, idx) => {
              const isCurrent = idx === safeCurrentStep;
              const isCompleted = idx < safeCurrentStep;
              return (
                <button
                  key={stepKey}
                  type="button"
                  onClick={() => handleStepClick(idx)}
                  className={`relative z-10 flex flex-col items-center group focus:outline-none transition-all ${
                    idx < safeCurrentStep ? 'cursor-pointer' : isCurrent ? 'cursor-default' : 'cursor-pointer hover:opacity-100 opacity-80'
                  }`}
                >
                  {/* Step Circle */}
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

                  {/* Step Title */}
                  <span
                    className={`mt-1.5 text-xs text-center font-semibold line-clamp-1 max-w-[90px] sm:max-w-none transition-colors ${
                      isCurrent ? 'text-emerald-700 dark:text-emerald-400 font-bold' : isCompleted ? 'text-slate-700 dark:text-foreground' : 'text-slate-400 dark:text-muted-foreground'
                    }`}
                  >
                    {getStepTitle(stepKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!isLoaded ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : (
          <div className="p-5 sm:p-6 lg:p-8 space-y-6 max-h-[66vh] overflow-y-auto custom-scroll bg-slate-50/40 dark:bg-transparent">

            {/* Error summary banner */}
            {Object.keys(fieldErrors).length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {bn ? `${Object.keys(fieldErrors).length}টি ত্রুটি সংশোধন করুন` : `Please fix ${Object.keys(fieldErrors).length} error(s)`}
                </p>
                <ul className="space-y-1 ml-6 list-disc">
                  {Object.entries(fieldErrors).map(([key, msg]) => {
                    const fieldConfig = configFields.find(f => f.default_value === key);
                    const fieldLabel = fieldConfig ? (bn ? fieldConfig.label_bn : fieldConfig.label) : key;
                    return (
                      <li key={key} className="text-xs text-destructive">
                        <button type="button" className="underline hover:no-underline text-left"
                          onClick={() => {
                            const el = document.querySelector(`[data-field="${key}"]`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}>
                          <span className="font-medium">{fieldLabel}</span>: {msg}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Active Section Content */}
            <div className="transition-all duration-200">
              {allStepKeys[safeCurrentStep] === 'approver' ? (
                /* Approver Section - Only in edit/approve mode */
                <div className="border rounded-lg p-4 sm:p-5 space-y-4 border-primary/30 bg-primary/5 shadow-sm">
                  <h3 className="text-md font-display font-semibold text-foreground border-b pb-2 flex items-center gap-2 text-xl">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    {bn ? '৪. অফিস কর্তৃক পূরণীয়' : '4. To be filled by Office'}
                  </h3>
                  <p className="text-xs text-muted-foreground italic">
                    {bn ? 'এই অংশ শুধুমাত্র অনুমোদন ও প্রিন্টের সময় দেখা যাবে' : 'This section is only visible during approval and printing'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{bn ? 'অনুমোদনকারীর নাম' : 'Approver Name'}</Label>
                      <Input className="bg-background mt-1" value={form.approver_name || ''}
                        onChange={e => setForm(prev => ({ ...prev, approver_name: e.target.value }))}
                        placeholder={bn ? 'নাম লিখুন' : 'Enter name'} />
                    </div>
                    <div>
                      <Label>{bn ? 'পদবী' : 'Designation'}</Label>
                      <Select value={form.approver_designation || ''} onValueChange={v => setForm(prev => ({ ...prev, approver_designation: v }))}>
                        <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'পদবী নির্বাচন করুন' : 'Select Designation'} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principal">{bn ? 'প্রিন্সিপাল' : 'Principal'}</SelectItem>
                          <SelectItem value="vice_principal">{bn ? 'ভাইস প্রিন্সিপাল' : 'Vice Principal'}</SelectItem>
                          <SelectItem value="head_teacher">{bn ? 'প্রধান শিক্ষক' : 'Head Teacher'}</SelectItem>
                          <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                          <SelectItem value="office_staff">{bn ? 'অফিস স্টাফ' : 'Office Staff'}</SelectItem>
                          <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{bn ? 'অনুমোদনের তারিখ' : 'Approval Date'}</Label>
                      <DatePicker bengali={bn} className="mt-1" value={form.approver_date || ''}
                        onChange={v => setForm(prev => ({ ...prev, approver_date: v }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'স্বাক্ষর' : 'Signature'}</Label>
                      <div className="mt-1">
                        <PhotoUpload
                          value={form.approver_signature || null}
                          onChange={(url) => setForm(prev => ({ ...prev, approver_signature: url || '' }))}
                          folder="students"
                        />
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {bn ? 'স্বাক্ষর আপলোড করুন অথবা প্রিন্টের পর বক্সে স্বাক্ষর করুন' : 'Upload signature or sign in box after print'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                renderSection(allStepKeys[safeCurrentStep])
              )}
            </div>

            {/* Footer: on the final step */}
            {safeCurrentStep === allStepKeys.length - 1 && (() => {
              const overrideText = (footerParagraph?.is_visible && footerParagraph?.footer_text)
                ? footerParagraph.footer_text
                : websiteFooterText;
              const finalFooter = overrideText || globalFooterText;
              if (!finalFooter) return null;
              return (
                <div
                  className="border rounded-lg bg-muted/50 print-footer"
                  style={{
                    marginTop: `${footerSpacingTop}mm`,
                    marginBottom: `${footerSpacingBottom}mm`,
                    padding: '1rem',
                  }}
                >
                  <p
                    className="text-foreground whitespace-pre-wrap text-center"
                    style={{ fontSize: `${footerFontSize}pt`, lineHeight: 1.4 }}
                  >
                    {finalFooter}
                  </p>
                </div>
              );
            })()}

                      </div>
        )}

        {/* Modern Sticky Bottom Navigation Bar (Exact 1:1 Mockup Match) */}
        <div className="px-6 py-4 bg-white dark:bg-card border-t border-slate-200 dark:border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner sticky bottom-0 z-20">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCurrentStep(prev => Math.max(0, prev - 1));
              const dialogContent = document.querySelector('[role="dialog"]');
              if (dialogContent) dialogContent.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={safeCurrentStep === 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-border bg-white dark:bg-card text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            {bn ? 'পূর্ববর্তী ধাপ' : 'Previous Step'}
          </Button>

          <div className="text-xs text-slate-600 dark:text-muted-foreground font-medium order-first sm:order-none flex items-center gap-2 bg-slate-100 dark:bg-muted/70 px-4 py-1.5 rounded-full border border-slate-200 dark:border-border">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-foreground">
              {bn ? `ধাপ ${safeCurrentStep + 1} : ${getStepTitle(allStepKeys[safeCurrentStep])}` : `Step ${safeCurrentStep + 1} : ${getStepTitle(allStepKeys[safeCurrentStep])}`}
            </span>
          </div>

          {safeCurrentStep < allStepKeys.length - 1 ? (
            <Button
              type="button"
              onClick={() => {
                if (validateCurrentStep(allStepKeys[safeCurrentStep])) {
                  setCurrentStep(prev => Math.min(allStepKeys.length - 1, prev + 1));
                  const dialogContent = document.querySelector('[role="dialog"]');
                  if (dialogContent) dialogContent.scrollTo({ top: 0, behavior: 'smooth' });
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
              onClick={handleSubmit}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {(addMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : isEditMode ? (
                <Save className="w-4 h-4 mr-1.5" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              {isEditMode ? (bn ? 'আপডেট সম্পন্ন করুন' : 'Complete Update') : (bn ? 'আবেদন জমা দিন' : 'Submit Application')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdmissionForm;
