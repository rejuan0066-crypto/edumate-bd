import { normalizeGender } from '@/lib/ocrCardParser';
import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmissionFormConfig, SECTION_INFO, type AdmissionFieldConfig } from '@/hooks/useAdmissionFormConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import PhotoUpload from '@/components/PhotoUpload';
import ApplicationTrackingBox from '@/components/application/ApplicationTrackingBox';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import PhoneInput from '@/components/PhoneInput';
import {
  Search, Loader2, AlertCircle, CheckCircle, Plus,
  Printer, Download, RotateCcw, ArrowLeft, ArrowRight,
  GraduationCap, User, UserCheck, Heart, MapPin, ShieldCheck, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { generateStudentApplicationNo } from '@/lib/applicationIdGenerator';
import { buildStudentApplicationHTML, downloadHTMLAsPDF, printHTML } from '@/lib/applicationSlipGenerator';
import { Copy } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { formatAddress as formatAddressBn } from '@/lib/banglaAddressHelper';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const formatAddress = (addr: AddressData, bn = true) => formatAddressBn(addr, bn);

const AdmissionPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { fields: configFields, isLoaded, isFieldActive, getField, getFieldsBySection, getCustomFields, sections } = useAdmissionFormConfig();

  // Form state
  const [pageMode, setPageMode] = useState<'apply' | 'track'>('apply');
  const [classStepConfirmed, setClassStepConfirmed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<Record<string, any>>({
    student_type: 'new', residence_type: 'non-resident',
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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);

  // Old student search
  const [oldRoll, setOldRoll] = useState('');
  const [oldSession, setOldSession] = useState('');
  const [oldClass, setOldClass] = useState('');

  // Inline errors
  const [fatherNidError, setFatherNidError] = useState('');
  const [motherNidError, setMotherNidError] = useState('');
  const [guardianNidError, setGuardianNidError] = useState('');
  const [birthRegError, setBirthRegError] = useState('');

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

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  // Fetch form_settings for visibility & footer
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
        .in('key', ['show_roll_no', 'show_session', 'admission_footer_text', 'admission_form_public', 'global_footer_text_bn', 'global_footer_text_en', 'global_footer_spacing_top', 'global_footer_spacing_bottom', 'global_footer_font_size']);
      if (error) throw error;
      const result: Record<string, any> = {};
      data?.forEach(row => { result[row.key] = row.value; });
      return result;
    },
  });

  const isAdmissionOpen = websiteAdmissionSettings?.admission_form_public === true || websiteAdmissionSettings?.admission_form_public === 'true';

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
  const footerParagraph = formSettings.find(s => s.field_name === 'footer_paragraph');
  const websiteFooterText = websiteAdmissionSettings?.admission_footer_text as string | undefined;
  const globalFooterText = (language === 'bn'
    ? websiteAdmissionSettings?.global_footer_text_bn
    : websiteAdmissionSettings?.global_footer_text_en) as string | undefined;
  const footerSpacingTop = Number(websiteAdmissionSettings?.global_footer_spacing_top ?? 8);
  const footerSpacingBottom = Number(websiteAdmissionSettings?.global_footer_spacing_bottom ?? 6);
  const footerFontSize = Number(websiteAdmissionSettings?.global_footer_font_size ?? 10);

  const filteredClasses = selectedDivisionId
    ? classes.filter((c: any) => c.division_id === selectedDivisionId)
    : classes;

  const bnToEn = (str: any) => String(str || '').replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

  const updateRegistrationFromRoll = useCallback((sessionYear: any, rollNumber: any, force = false) => {
    if (!sessionYear || !rollNumber) return;
    const year = bnToEn(String(sessionYear).trim()).slice(0, 4);
    const cleanRoll = bnToEn(String(rollNumber).trim());
    const div = divisions.find((d: any) => d.id === selectedDivisionId);
    const prefix = (div as any)?.prefix || '';
    const newReg = prefix ? `${prefix}-${year}${cleanRoll}` : `${year}${cleanRoll}`;
    setForm(prev => {
      if (force || !prev.registration_no) {
        return { ...prev, registration_no: newReg };
      }
      return prev;
    });
  }, [divisions, selectedDivisionId]);

  // Auto-prefill running session if not set
  useEffect(() => {
    if (academicSessions.length > 0) {
      setForm(prev => {
        if (prev.admission_session) return prev;
        const running = academicSessions.find((s: any) => s.is_active) || academicSessions[0];
        if (running) {
          return {
            ...prev,
            admission_session: running.id,
            session_year: running.name || prev.session_year,
          };
        }
        return prev;
      });
    }
  }, [academicSessions]);

  // Auto-prefill from URL: ?class=<classId> → admission_class + division + running session/year
  const [searchParams] = useSearchParams();
  const urlClassId = searchParams.get('class');
  const urlMode = searchParams.get('mode');

  useEffect(() => {
    if (urlMode === 'track') setPageMode('track');
  }, [urlMode]);

  useEffect(() => {
    if (!urlClassId) return;
    setClassStepConfirmed(true);
    if (classes.length === 0) return;
    const cls = classes.find((c: any) => c.id === urlClassId);
    if (!cls) return;
    if (cls.division_id) setSelectedDivisionId(cls.division_id);
    setForm(prev => {
      const next: Record<string, any> = { ...prev };
      if (!prev.admission_class) next.admission_class = urlClassId;
      if (!prev.admission_session && academicSessions.length > 0) {
        const running = academicSessions.find((s: any) => s.is_active) || academicSessions[0];
        next.admission_session = running.id;
        next.session_year = running.name || prev.session_year;
      }
      return next;
    });
  }, [urlClassId, classes, academicSessions]);

  useEffect(() => {
    if (form.admission_class && classes.length > 0 && !selectedDivisionId) {
      const cls = classes.find((c: any) => c.id === form.admission_class);
      if (cls?.division_id) {
        setSelectedDivisionId(cls.division_id);
      }
    }
  }, [form.admission_class, classes, selectedDivisionId]);

  const calculateAge = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    const days = today.getDate() - birth.getDate();
    if (days < 0) months--;
    if (months < 0) { years--; months += 12; }
    return `${years} ${bn ? 'বছর' : 'years'} ${months} ${bn ? 'মাস' : 'months'}`;
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
    const { data } = await supabase.rpc('check_duplicate_birth_reg', { p_birth_reg: regNo });
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
        father_name: s.father_name || '', mother_name: s.mother_name || '',
        father_nid: s.father_nid || '', mother_nid: s.mother_nid || '',
        photo_url: s.photo_url || '', religion: s.religion || 'islam',
        admission_session: s.admission_session || '', registration_no: s.registration_no || '',
      }));
      if (s.division_id) setSelectedDivisionId(s.division_id);
      if (s.class_id) setForm(prev => ({ ...prev, admission_class: s.class_id }));
      const admData = s.admission_data || {};
      if (admData.permanentAddr) setPermanentAddr(admData.permanentAddr);
      if (admData.presentAddr) setPresentAddr(admData.presentAddr);
      toast.success(bn ? 'ছাত্রের তথ্য পাওয়া গেছে' : 'Student data found');
    } else {
      toast.error(bn ? 'কোনো তথ্য পাওয়া যায়নি' : 'No data found');
    }
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
    is_free: form.is_free,
    student_category: form.student_category,
    custom_fields: customFieldValues,
    signature_url: signatureUrl,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const appNo = await generateStudentApplicationNo();
      const admissionData = {
        ...buildAdmissionData(),
        application_no: appNo,
      };
      const selectedSession = academicSessions.find((s: any) => s.id === form.admission_session)
        || academicSessions.find((s: any) => s.name === form.admission_session || s.name_bn === form.admission_session || s.name === form.session_year || s.name_bn === form.session_year);
      const finalSessionName = selectedSession?.name || form.admission_session || form.session_year || null;
      const finalSessionId = selectedSession?.id || (form.admission_session && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(form.admission_session) ? form.admission_session : null);
      const finalSessionYear = form.session_year || selectedSession?.name || form.admission_session || null;
      const studentId = appNo;

      const payload = {
        name_bn: form.first_name.trim(),
        name_en: form.last_name.trim() || null,
        roll_number: form.roll_number?.trim() || null,
        father_name: form.father_name.trim() || null,
        mother_name: form.mother_name.trim() || null,
        phone: form.father_phone || null,
        guardian_phone: form.guardian_type === 'other' ? form.guardian_phone : (form.guardian_type === 'mother' ? form.mother_phone : form.father_phone) || null,
        address: formatAddress(permanentAddr) || null,
        division_id: selectedDivisionId || (form.admission_class ? (classes.find((c: any) => c.id === form.admission_class) as any)?.division_id || null : null),
        class_id: form.admission_class || null,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        photo_url: form.photo_url || null,
        student_category: form.student_category || (form.is_orphan ? 'orphan' : form.is_poor ? 'poor' : 'general'),
        residence_type: form.residence_type,
        admission_date: form.admission_date || null,
        birth_reg_no: form.birth_reg_no || null,
        religion: form.religion,
        admission_session: finalSessionName,
        session_id: finalSessionId,
        registration_no: form.registration_no || null,
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
        student_id: studentId,
        approval_status: 'pending',
      };
      const { error } = await supabase.from('students').insert(payload as any);
      if (error) throw error;
      return payload;
    },
    onSuccess: (payload) => {
      toast.success(bn ? 'ভর্তি আবেদন সফলভাবে জমা হয়েছে! অনুমোদনের অপেক্ষায়।' : 'Admission submitted! Pending approval.');
      setSubmittedData({
        ...payload,
        application_no: payload.student_id,
      });
    },
    onError: (e: any) => toast.error(e.message || 'Error submitting application'),
  });

  const handleSubmit = () => {
    const errors: Record<string, string> = {};

    if (!selectedDivisionId && isFormFieldVisible('admission_class')) {
      errors['admission_division'] = bn ? 'বিভাগ নির্বাচন আবশ্যক' : 'Division is required';
    }

    configFields.forEach(f => {
      const key = f.default_value;
      if (!key || !f.is_active || !f.is_required) return;
      const val = form[key];
      if (key === 'address_permanent' || key === 'address_present' || key === 'roll_number' || key === 'registration_no' || key === 'student_type' || key === 'student_category' || key === 'is_free' || key === 'admission_division') return;
      if (key === 'guardian_name' || key === 'guardian_relation' || key === 'guardian_phone' || key === 'guardian_nid') {
        if (form.guardian_type !== 'other') return;
      }
      if (!val || (typeof val === 'string' && !val.trim())) {
        errors[key] = bn ? `${f.label_bn} আবশ্যক` : `${f.label} is required`;
      }
    });

    if (isFieldActive('birth_reg_no') && form.birth_reg_no && form.birth_reg_no.length !== 17) {
      errors['birth_reg_no'] = bn ? 'জন্ম নিবন্ধন ১৭ ডিজিট হতে হবে' : 'Birth Reg must be 17 digits';
    }
    if (isFieldActive('father_nid') && isFieldActive('mother_nid')) {
      if (!form.father_nid && !form.mother_nid) {
        const nidMsg = bn ? 'পিতা বা মাতার যে কোন একজনের NID আবশ্যক' : 'At least one parent NID is required';
        errors['father_nid'] = nidMsg;
        errors['mother_nid'] = nidMsg;
      }
    }
    if (isFieldActive('father_nid') && form.father_nid && form.father_nid.length !== 10 && form.father_nid.length !== 17) {
      errors['father_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
    }
    if (isFieldActive('mother_nid') && form.mother_nid && form.mother_nid.length !== 10 && form.mother_nid.length !== 17) {
      errors['mother_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
    }
    if (isFieldActive('guardian_type') && !form.guardian_type) {
      errors['guardian_type'] = bn ? 'অভিভাবক নির্বাচন করুন' : 'Select guardian';
    }
    if (form.guardian_type === 'other' && isFieldActive('guardian_nid')) {
      if (form.guardian_nid && form.guardian_nid.length !== 10 && form.guardian_nid.length !== 17) {
        errors['guardian_nid'] = bn ? 'NID ১০/১৭ ডিজিট' : 'NID 10/17 digits required';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const errorCount = Object.keys(errors).length;
      const errorDetails = Object.entries(errors).slice(0, 5).map(([key, msg]) => {
        const fieldConfig = configFields.find(f => f.default_value === key);
        const fieldLabel = fieldConfig ? (bn ? fieldConfig.label_bn : fieldConfig.label) : key;
        return `• ${fieldLabel}: ${msg}`;
      }).join('\n');
      toast.error(bn ? `ফর্মে ${errorCount}টি ত্রুটি রয়েছে` : `Form has ${errorCount} error(s)`, {
        description: errorDetails,
        duration: 8000,
      });
      setTimeout(() => {
        const firstErrorKey = Object.keys(errors)[0];
        const errorEl = document.querySelector(`[data-field="${firstErrorKey}"]`);
        if (errorEl) errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    setFieldErrors({});
    if (!declarationAgreed) {
      toast.error(bn ? 'দয়া করে ঘোষণাপত্রে সম্মতি দিন' : 'Please agree to the declaration');
      return;
    }
    addMutation.mutate();
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors[field]}</p>;
  };

  // ===== RENDER SYSTEM FIELD =====
  const renderSystemField = (fieldKey: string, config: AdmissionFieldConfig) => {
    const label = bn ? config.label_bn : config.label;
    const required = config.is_required;
    const reqStar = required ? <span className="text-destructive">*</span> : null;
    const hasError = !!fieldErrors[fieldKey];
    const errorBorder = hasError ? 'border-destructive ring-1 ring-destructive/30' : '';
    const errorLabel = hasError ? 'text-destructive' : '';

    switch (fieldKey) {
      case 'photo_url':
        return (
          <div>
            <Label className="mb-2 block">{label}</Label>
            <PhotoUpload
              value={form.photo_url || null}
              onChange={(url) => setForm(prev => ({ ...prev, photo_url: url || '' }))}
              folder="students"
            />
          </div>
        );

      case 'student_type':
      case 'student_category':
      case 'is_free':
        return null;

      case 'residence_type':
        return (
          <div className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                {bn ? 'আবাসন ধরন (Residence)' : 'Residence'}
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
        );

      case 'roll_number':
      case 'registration_no':
        // Assigned by admin / office upon admission approval
        return null;

      case 'admission_session':
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
                  const match = academicSessions.find((s: any) => s.name === val || s.name_bn === val);
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
                <SelectItem value="hindu">{bn ? 'হিন্দু' : 'Hindu'}</SelectItem>
                <SelectItem value="christian">{bn ? 'খ্রিস্টান' : 'Christian'}</SelectItem>
                <SelectItem value="buddhist">{bn ? 'বৌদ্ধ' : 'Buddhist'}</SelectItem>
                <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'date_of_birth':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <DatePicker bengali={bn} className={`mt-1 ${errorBorder}`}
              value={form.date_of_birth} onChange={v => setForm(prev => ({ ...prev, date_of_birth: v }))} />
            {form.date_of_birth && <p className="text-xs text-primary mt-1 font-medium">{bn ? 'বয়স: ' : 'Age: '}{calculateAge(form.date_of_birth)}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'birth_reg_no':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder || (birthRegError ? 'border-destructive ring-1 ring-destructive/30' : '')}`}
              maxLength={17} value={form.birth_reg_no}
              onChange={e => validateBirthReg(e.target.value)}
              placeholder={bn ? '১৭ ডিজিটের নম্বর' : '17 digit number'} />
            {birthRegError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {birthRegError}</p>}
            {form.birth_reg_no.length === 17 && !birthRegError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'সঠিক' : 'Valid'}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'is_orphan':
      case 'is_poor':
        return null; // Handled in student category block

      case 'father_nid':
        return (
          <div data-field={fieldKey}>
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
        return (
          <div data-field={fieldKey}>
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
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder || (guardianNidError ? 'border-destructive ring-1 ring-destructive/30' : '')}`}
              maxLength={17} value={form.guardian_nid}
              onChange={e => validateNid(e.target.value, 'guardian_nid', setGuardianNidError)} />
            {guardianNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {guardianNidError}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'father_phone':
        return <div data-field={fieldKey}><PhoneInput label={label} value={form.father_phone} countryCode={form.father_phone_code}
          onChange={(phone, code) => setForm(prev => ({ ...prev, father_phone: phone, father_phone_code: code }))} required={required} error={hasError} />
          <FieldError field={fieldKey} /></div>;

      case 'mother_phone':
        return <div data-field={fieldKey}><PhoneInput label={label} value={form.mother_phone} countryCode={form.mother_phone_code}
          onChange={(phone, code) => setForm(prev => ({ ...prev, mother_phone: phone, mother_phone_code: code }))} required={required} error={hasError} />
          <FieldError field={fieldKey} /></div>;

      case 'guardian_phone':
        return <div data-field={fieldKey}><PhoneInput label={label} value={form.guardian_phone} countryCode={form.guardian_phone_code}
          onChange={(phone, code) => setForm(prev => ({ ...prev, guardian_phone: phone, guardian_phone_code: code }))} required={required} error={hasError} />
          <FieldError field={fieldKey} /></div>;

      case 'guardian_type':
        return (
          <div data-field={fieldKey}>
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
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{bn ? 'আবেদনের তারিখ' : 'Application Date'} {reqStar}</Label>
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
              value={form.last_name || ''}
              onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder={bn ? 'ইংরেজিতে লিখুন' : 'Full Name (English)'} />
            <FieldError field={fieldKey} />
          </div>
        );

      default:
        if (!isFormFieldVisible(fieldKey)) return null;
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              value={form[fieldKey] || ''} onChange={e => setForm(prev => ({ ...prev, [fieldKey]: e.target.value }))}
              placeholder={config.placeholder || ''} />
            <FieldError field={fieldKey} />
          </div>
        );
    }
  };

  // ===== RENDER CUSTOM FIELD =====
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
        {config.field_type === 'text' && <Input className="bg-background mt-1" value={val} onChange={e => update(e.target.value)} placeholder={config.placeholder || ''} />}
        {config.field_type === 'number' && <Input type="number" className="bg-background mt-1" value={val || ''} onChange={e => update(e.target.value)} />}
        {config.field_type === 'textarea' && <Textarea className="bg-background mt-1" rows={3} value={val} onChange={e => update(e.target.value)} />}
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
      </div>
    );
  };

  const SYSTEM_KEYS = [
    'photo_url', 'student_type', 'residence_type', 'admission_session', 'roll_number',
    'registration_no', 'admission_date', 'session_year', 'admission_division', 'admission_class',
    'first_name', 'last_name', 'gender', 'religion', 'date_of_birth', 'birth_reg_no',
    'previous_class', 'previous_institute', 'is_orphan', 'is_poor',
    'address_permanent', 'address_present',
    'father_name', 'father_occupation', 'father_nid', 'father_phone',
    'mother_name', 'mother_occupation', 'mother_nid', 'mother_phone',
    'guardian_type', 'guardian_name', 'guardian_relation', 'guardian_phone', 'guardian_nid',
  ];

  const renderSection = (sectionKey: string) => {
    const sectionInfo = SECTION_INFO[sectionKey as keyof typeof SECTION_INFO];
    if (!sectionInfo) return null;
    const sectionFields = getFieldsBySection(sectionKey as any);
    if (sectionFields.length === 0) return null;
    const title = bn ? sectionInfo.bn : sectionInfo.en;

    if (sectionKey === 'student_details') {
      const photoField = sectionFields.find(f => f.default_value === 'photo_url');
      const typeField = sectionFields.find(f => f.default_value === 'student_type');
      const resField = sectionFields.find(f => f.default_value === 'residence_type');
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

      const ACADEMIC_KEYS = ['admission_session', 'admission_division', 'admission_class', 'admission_date', 'session_year'];
      const academicFields = otherFields
        .filter(f => !['roll_number', 'registration_no'].includes(f.default_value || ''))
        .filter(f => ACADEMIC_KEYS.includes(f.default_value || ''));
      const personalFields = otherFields.filter(f => !ACADEMIC_KEYS.includes(f.default_value || ''));

      return (
        <div key={sectionKey} className="space-y-5">
          {/* Residence Type (Full Width) */}
          <div>
            {resField ? renderSystemField('residence_type', resField) : renderSystemField('residence_type', { label: 'Residence', label_bn: 'আবাসন ধরন', default_value: 'residence_type' } as any)}
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
              
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

    // Guardian section
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

    return (
      <div key={sectionKey} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{bn ? 'বিবরণ সঠিকভাবে পূরণ করুন' : 'Fill in the information accurately'}</p>
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
  };

  const validateCurrentStep = (stepKey: string): boolean => {
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

  const baseSections = sections.filter(section => getFieldsBySection(section).length > 0);
  const activeSections = [...baseSections, 'review_submit'];

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(bn ? 'স্বাক্ষরের ফাইলের সাইজ ২MB এর বেশি হতে পারবে না' : 'Signature file size must be under 2MB');
      return;
    }
    setUploadingSig(true);
    try {
      const res = await uploadToCloudinary(file, { folder: 'student-signatures' });
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

  const resetForm = () => {
    setSubmittedData(null);
    setSignatureUrl(null);
    setDeclarationAgreed(true);
    setCurrentStep(0);
    setForm({
      student_type: 'new', residence_type: 'non-resident',
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
    });
    setFieldErrors({});
    setCustomFieldValues({});
    setPermanentAddr(emptyAddress); setPresentAddr(emptyAddress);
    setParentPermanentAddr(emptyAddress); setParentPresentAddr(emptyAddress);
    setGuardianPermAddr(emptyAddress); setGuardianPresAddr(emptyAddress);
    setSameAddress(false); setParentAddrSameAsStudent(false);
    setParentSamePresAddr(false); setGuardianSameAddr(false);
  };

  const buildFormHTML = (blank = false) => {
    const d = blank ? {} as any : submittedData;
    const instName = institution?.name || '';
    const instNameEn = institution?.name_en || '';
    const instAddr = institution?.address || '';
    const instLogo = institution?.logo_url || '';
    const className = !blank && d?.class_id ? (classes.find((c: any) => c.id === d.class_id) as any)?.name_bn || '' : '';
    const blankVal = blank ? '&nbsp;' : '';

    return `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>ভর্তি আবেদন ফর্ম</title>
      <style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'SutonnyOMJ', 'Noto Sans Bengali', sans-serif; padding: 10mm 12mm; font-size: 11px; color: #333; }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 6px; }
        .header img { height: 50px; margin-bottom: 3px; }
        .header h1 { font-size: 16px; font-weight: 700; }
        .header p { font-size: 10px; color: #666; }
        .form-title { text-align: center; font-size: 14px; font-weight: 700; margin: 8px 0; padding: 5px; background: #f5f5f5; border: 1px solid #ddd; }
        .photo-section { float: right; width: 90px; height: 110px; border: 1px solid #999; display: flex; align-items: center; justify-content: center; margin-left: 10px; }
        .photo-section img { width: 100%; height: 100%; object-fit: cover; }
        .section { margin-bottom: 8px; clear: both; }
        .section-title { font-size: 12px; font-weight: 700; padding: 3px 8px; background: #e8e8e8; border-left: 3px solid #333; margin-bottom: 5px; }
        .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 12px; }
        .field { display: flex; gap: 4px; padding: 2px 0; border-bottom: 1px dotted #ccc; }
        .field-label { font-weight: 600; min-width: 100px; color: #555; font-size: 10px; }
        .field-value { flex: 1; font-size: 10px; }
        .status-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 600; background: #fff3cd; color: #856404; border: 1px solid #ffc107; }
        .footer { margin-top: 15px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 5px; }
        @media print { body { padding: 8mm; } @page { margin: 8mm; } }
      </style>
    </head><body>
      <div class="header">
        ${instLogo ? `<img src="${instLogo}" alt="Logo">` : ''}
        <h1>${instName}</h1>
        ${instNameEn ? `<p>${instNameEn}</p>` : ''}
        ${instAddr ? `<p>${instAddr}</p>` : ''}
      </div>
      <div class="form-title">ভর্তি আবেদন ফর্ম</div>

      ${!blank && d?.photo_url ? `<div class="photo-section"><img src="${d.photo_url}" /></div>` : '<div class="photo-section">ছবি</div>'}

      <div class="section">
        <div class="section-title">১. শিক্ষার্থীর তথ্য</div>
        <div class="field-grid">
          <div class="field"><span class="field-label">নাম (বাংলা):</span><span class="field-value">${blank ? blankVal : (d.name_bn || '-')}</span></div>
          <div class="field"><span class="field-label">নাম (ইংরেজি):</span><span class="field-value">${blank ? blankVal : (d.name_en || '-')}</span></div>
          <div class="field"><span class="field-label">রোল নম্বর:</span><span class="field-value">${blank ? blankVal : (d.roll_number || '-')}</span></div>
          <div class="field"><span class="field-label">রেজিস্ট্রেশন নং:</span><span class="field-value">${blank ? blankVal : (d.registration_no || '-')}</span></div>
          <div class="field"><span class="field-label">ভর্তি সেশন:</span><span class="field-value">${blank ? blankVal : (d.admission_session || '-')}</span></div>
          <div class="field"><span class="field-label">শ্রেণী:</span><span class="field-value">${blank ? blankVal : (className || '-')}</span></div>
          <div class="field"><span class="field-label">লিঙ্গ:</span><span class="field-value">${blank ? blankVal : (d.gender === 'male' ? 'পুরুষ' : d.gender === 'female' ? 'মহিলা' : d.gender || '-')}</span></div>
          <div class="field"><span class="field-label">ধর্ম:</span><span class="field-value">${blank ? blankVal : (d.religion || '-')}</span></div>
          <div class="field"><span class="field-label">জন্ম তারিখ:</span><span class="field-value">${blank ? blankVal : (d.date_of_birth || '-')}</span></div>
          <div class="field"><span class="field-label">জন্ম নিবন্ধন:</span><span class="field-value">${blank ? blankVal : (d.birth_reg_no || '-')}</span></div>
          <div class="field"><span class="field-label">ভর্তির তারিখ:</span><span class="field-value">${blank ? blankVal : (d.admission_date || '-')}</span></div>
          <div class="field"><span class="field-label">আবাসিক ধরন:</span><span class="field-value">${blank ? blankVal : (d.residence_type || '-')}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">২. পিতা-মাতার তথ্য</div>
        <div class="field-grid">
          <div class="field"><span class="field-label">পিতার নাম (বাংলা):</span><span class="field-value">${blank ? blankVal : (d.father_name || '-')}</span></div>
          <div class="field"><span class="field-label">পিতার নাম (ইংরেজি):</span><span class="field-value">${blank ? blankVal : (d.father_name_en || '-')}</span></div>
          <div class="field"><span class="field-label">পিতার পেশা:</span><span class="field-value">${blank ? blankVal : (d.father_occupation || '-')}</span></div>
          <div class="field"><span class="field-label">পিতার ফোন:</span><span class="field-value">${blank ? blankVal : (d.father_phone || '-')}</span></div>
          <div class="field"><span class="field-label">পিতার NID:</span><span class="field-value">${blank ? blankVal : (d.father_nid || '-')}</span></div>
          <div class="field"><span class="field-label">মাতার নাম (বাংলা):</span><span class="field-value">${blank ? blankVal : (d.mother_name || '-')}</span></div>
          <div class="field"><span class="field-label">মাতার নাম (ইংরেজি):</span><span class="field-value">${blank ? blankVal : (d.mother_name_en || '-')}</span></div>
          <div class="field"><span class="field-label">মাতার পেশা:</span><span class="field-value">${blank ? blankVal : (d.mother_occupation || '-')}</span></div>
          <div class="field"><span class="field-label">মাতার ফোন:</span><span class="field-value">${blank ? blankVal : (d.mother_phone || '-')}</span></div>
          <div class="field"><span class="field-label">মাতার NID:</span><span class="field-value">${blank ? blankVal : (d.mother_nid || '-')}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">৩. ঠিকানা</div>
        <div class="field-grid">
          <div class="field"><span class="field-label">ঠিকানা:</span><span class="field-value">${blank ? blankVal : (d.address || '-')}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">৪. অফিস কর্তৃক পূরণীয়</div>
        <div class="field-grid">
          <div class="field"><span class="field-label">অনুমোদনকারীর নাম:</span><span class="field-value" style="border-bottom: 1px solid #999; min-height: 20px;">&nbsp;</span></div>
          <div class="field"><span class="field-label">পদবী:</span><span class="field-value" style="border-bottom: 1px solid #999; min-height: 20px;">&nbsp;</span></div>
          <div class="field"><span class="field-label">তারিখ:</span><span class="field-value" style="border-bottom: 1px solid #999; min-height: 20px;">&nbsp;</span></div>
          <div class="field"><span class="field-label">স্বাক্ষর:</span><span class="field-value" style="border-bottom: 1px solid #999; min-height: 40px;">&nbsp;</span></div>
        </div>
      </div>

      ${!blank ? `<div class="section" style="margin-top: 25px; text-align: center;">
        <span class="status-badge">অনুমোদনের অপেক্ষায়</span>
      </div>` : ''}

      <div class="footer">
        <p>${instName} — ভর্তি আবেদন ফর্ম</p>
      </div>
    </body></html>`;
  };

  const handlePrint = (blank = false) => {
    if (!blank && !submittedData) return;
    const html = buildFormHTML(blank);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 800);
  };

  const handleDownloadPDF = async (blank = false) => {
    if (!blank && !submittedData) return;
    const html = buildFormHTML(blank);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = 'auto';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const body = iframeDoc.body;
      const actualHeight = body.scrollHeight;
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        height: actualHeight,
        windowWidth: 794,
        windowHeight: actualHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pageHeight = 297;
      const imgAspect = canvas.height / canvas.width;
      let imgW = pdfWidth;
      let imgH = pdfWidth * imgAspect;
      if (imgH > pageHeight) {
        imgH = pageHeight;
        imgW = pageHeight / imgAspect;
      }
      const offsetX = (pdfWidth - imgW) / 2;
      pdf.addImage(imgData, 'JPEG', offsetX, 0, imgW, imgH);

      const fileName = blank ? 'ভর্তি_আবেদন_ফর্ম.pdf' : `ভর্তি_আবেদন_${submittedData?.student_id || ''}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error(bn ? 'PDF তৈরি করতে সমস্যা হয়েছে' : 'Failed to generate PDF');
    } finally {
      document.body.removeChild(iframe);
    }
  };

  // If submitted, show success screen
  if (submittedData) {
    const appNo = submittedData.student_id || submittedData.application_no || '';
    const className = submittedData.class_id ? (classes.find((c: any) => c.id === submittedData.class_id) as any)?.name_bn || '' : '';
    const applyDate = submittedData.admission_date || new Date().toISOString().split('T')[0];

    const handlePrintSlip = () => {
      const html = buildStudentApplicationHTML(submittedData, institution);
      printHTML(html);
    };

    const handleDownloadSlipPDF = async () => {
      try {
        setIsDownloading(true);
        const html = buildStudentApplicationHTML(submittedData, institution);
        await downloadHTMLAsPDF(html, `ভর্তি_আবেদন_${appNo}.pdf`);
        toast.success(bn ? 'পিডিএফ ডাউনলোড সম্পন্ন হয়েছে' : 'PDF downloaded successfully');
      } catch (err: any) {
        toast.error(err.message || 'Error downloading PDF');
      } finally {
        setIsDownloading(false);
      }
    };

    const copyAppId = (num: string) => {
      navigator.clipboard.writeText(num);
      toast.success(bn ? 'আবেদন নম্বর কপি করা হয়েছে!' : 'Application number copied!');
    };

    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="card-elevated p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {bn ? 'ভর্তি আবেদন সফলভাবে জমা হয়েছে!' : 'Admission Submitted Successfully!'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {bn
                  ? 'আপনার ভর্তি আবেদনটি সফলভাবে গৃহীত হয়েছে এবং অনুমোদনের অপেক্ষায় রয়েছে।'
                  : 'Your admission application has been received and is pending review.'}
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
                  onClick={() => copyAppId(appNo)}
                  className="h-8 px-2.5 bg-white dark:bg-card border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                  title={bn ? 'কপি করুন' : 'Copy ID'}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  <span className="text-xs">{bn ? 'কপি' : 'Copy'}</span>
                </Button>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
                {bn
                  ? 'ভবিষ্যতে আবেদনের অগ্রগতি জানতে এবং স্লিপ পুনঃডাউনলোড করতে এই নম্বরটি সংরক্ষণ করুন।'
                  : 'Save this Application ID for tracking and re-downloading.'}
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 dark:bg-secondary/40 rounded-xl p-4 text-left space-y-2 border border-slate-200 dark:border-border text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{bn ? 'শিক্ষার্থীর নাম (বাংলা):' : 'Student Name (Bangla):'}</span>
                <span className="font-semibold text-foreground">{submittedData.name_bn}</span>
              </div>
              {submittedData.name_en && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{bn ? 'নাম (ইংরেজি):' : 'Name (English):'}</span>
                  <span className="font-medium text-foreground">{submittedData.name_en}</span>
                </div>
              )}
              {className && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{bn ? 'ভর্তি শ্রেণি:' : 'Admission Class:'}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{className}</span>
                </div>
              )}
              {submittedData.phone && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{bn ? 'যোগাযোগ মোবাইল:' : 'Contact Phone:'}</span>
                  <span className="font-mono text-foreground">{submittedData.phone}</span>
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
                onClick={handlePrintSlip}
                className="flex-1 flex items-center justify-center gap-2"
                variant="outline"
              >
                <Printer className="w-4 h-4" />
                {bn ? 'আবেদন স্লিপ প্রিন্ট' : 'Print Slip'}
              </Button>
              <Button
                type="button"
                onClick={handleDownloadSlipPDF}
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

  if (isLoaded && !isAdmissionOpen) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
          <div className="card-elevated p-10 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'অনলাইন ভর্তি বন্ধ আছে' : 'Online Admission is Closed'}
            </h2>
            <p className="text-muted-foreground">
              {bn ? 'বর্তমানে অনলাইন ভর্তি আবেদন গ্রহণ করা হচ্ছে না। পরবর্তী আপডেটের জন্য অপেক্ষা করুন।' : 'Online admission applications are not being accepted at this time. Please check back later.'}
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const safeCurrentStep = Math.min(currentStep, Math.max(0, activeSections.length - 1));

  const getStepTitle = (key: string) => {
    if (key === 'review_submit') return bn ? 'পর্যালোচনা ও সাবমিট' : 'Review & Submit';
    const info = SECTION_INFO[key as keyof typeof SECTION_INFO];
    if (info) return bn ? info.bn.trim() : info.en.trim();
    return key;
  };

  const handleStepClick = (targetIdx: number) => {
    if (targetIdx === safeCurrentStep) return;
    if (targetIdx < safeCurrentStep) {
      setCurrentStep(targetIdx);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      if (validateCurrentStep(activeSections[safeCurrentStep])) {
        setCurrentStep(targetIdx);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    }
  };

  const activeSessionObj = academicSessions.find((s: any) => s.id === form.admission_session || s.name === form.admission_session);
  const sessionDisplayName = (bn ? (activeSessionObj?.name_bn || activeSessionObj?.name) : activeSessionObj?.name) || form.session_year || (bn ? 'চলতি' : 'Current');

  const selectedDivObj = divisions.find((d: any) => d.id === selectedDivisionId);
  const selectedClassObj = classes.find((c: any) => c.id === form.admission_class);

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
              <GraduationCap className="w-4 h-4" />
              {bn ? 'নতুন ছাত্র আবেদন' : 'Student Application'}
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
              {bn ? 'ছাত্র ট্র্যাকিং ও স্লিপ ডাউনলোড' : 'Track Application & Slip'}
            </button>
          </div>
        </div>

        {/* TRACKING MODE */}
        {pageMode === 'track' && (
          <ApplicationTrackingBox targetType="student" onSwitchToApply={() => setPageMode('apply')} />
        )}

        {/* APPLY MODE */}
        {pageMode === 'apply' && (
          <>
            {/* Step A: Division & Class Selection (If not confirmed yet) */}
            {!classStepConfirmed && !submitted && (
              <div className="border border-slate-200/90 dark:border-border rounded-3xl shadow-xl overflow-hidden bg-white dark:bg-card p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-2 pb-4 border-b border-border/70">
                  <Badge variant="outline" className="px-3 py-0.5 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 font-semibold">
                    {bn ? 'ধাপ ১: বিভাগ ও শ্রেণী নির্বাচন' : 'Step 1: Division & Class Selection'}
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {bn ? 'আপনার কাঙ্ক্ষিত বিভাগ ও শ্রেণী নির্বাচন করুন' : 'Select Desired Division & Class'}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                    {bn
                      ? 'প্রতিষ্ঠানটিতে যেসব বিভাগের ভর্তি আবেদন চালু রয়েছে, সেখান থেকে প্রথমে বিভাগ এবং পরবর্তীতে শ্রেণী নির্বাচন করে এগিয়ে যান।'
                      : 'Choose an active division, then pick your class to proceed to the admission form.'}
                  </p>
                </div>

                {/* Division Cards */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">১</span>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      {bn ? 'বিভাগ নির্বাচন করুন' : 'Select Division'} <span className="text-destructive">*</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {divisions.filter((d: any) => d.is_active).map((d: any) => {
                      const isSelected = selectedDivisionId === d.id;
                      const classesInDiv = classes.filter((c: any) => c.division_id === d.id && c.is_active);
                      return (
                        <div
                          key={d.id}
                          onClick={() => {
                            setSelectedDivisionId(d.id);
                            setForm(prev => ({ ...prev, admission_class: '' }));
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-md shadow-emerald-600/10'
                              : 'border-border/80 bg-card hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                            )}
                          </div>
                          <div className="mt-3">
                            <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">{d.name_bn || d.name}</h4>
                            {d.name && d.name !== d.name_bn && <p className="text-xs text-muted-foreground mt-0.5">{d.name}</p>}
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-2">
                              {bn ? `${classesInDiv.length} টি শ্রেণী সচল` : `${classesInDiv.length} active classes`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Class Selection Grid */}
                {selectedDivisionId && (
                  <div className="space-y-3 pt-4 border-t border-border/80 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">২</span>
                      <h3 className="font-bold text-sm sm:text-base text-foreground">
                        {bn ? 'শ্রেণী নির্বাচন করুন' : 'Select Class'} <span className="text-destructive">*</span>
                      </h3>
                    </div>
                    {filteredClasses.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">{bn ? 'এই বিভাগে কোনো সচল শ্রেণী পাওয়া যায়নি।' : 'No active classes found in this division.'}</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {filteredClasses.map((cls: any) => {
                          const isSelected = form.admission_class === cls.id;
                          return (
                            <div
                              key={cls.id}
                              onClick={() => setForm(prev => ({ ...prev, admission_class: cls.id }))}
                              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                                  : 'border-border/80 bg-card hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-muted/30 text-foreground font-medium'
                              }`}
                            >
                              <span className="text-xs sm:text-sm">{cls.name_bn || cls.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Proceed Button */}
                <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground text-center sm:text-left">
                    {selectedDivisionId && form.admission_class
                      ? (bn ? 'বিভাগ ও শ্রেণী নির্বাচিত হয়েছে। ফর্মে যেতে পরবর্তী বাটনে চাপুন।' : 'Division and Class selected. Click next to proceed.')
                      : (bn ? 'অনুগ্রহ করে বিভাগ ও শ্রেণী নির্বাচন করুন।' : 'Please select a division and class.')}
                  </span>
                  <Button
                    type="button"
                    onClick={() => setClassStepConfirmed(true)}
                    disabled={!selectedDivisionId || !form.admission_class}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs btn-primary-gradient gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
                  >
                    <span>{bn ? 'পরবর্তী (ফরম পূরণ করুন)' : 'Proceed to Form'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step B: Admission Form (When class is confirmed) */}

        <div className="border border-slate-200/90 dark:border-border rounded-3xl shadow-xl overflow-hidden bg-white dark:bg-card">
          
          {(classStepConfirmed || submitted) && (
            <>
              {/* Selected Division & Class Floating Pill */}
              {classStepConfirmed && !submitted && (
                <div className="px-6 pt-4 pb-0">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{bn ? 'নির্বাচিত বিভাগ ও শ্রেণী:' : 'Selected Division & Class:'}</p>
                        <p className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                          {selectedDivObj?.name_bn || selectedDivObj?.name} ➔ {selectedClassObj?.name_bn || selectedClassObj?.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setClassStepConfirmed(false)}
                      className="h-7 text-[11px] font-semibold rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50"
                    >
                      {bn ? 'বিভাগ/শ্রেণী পরিবর্তন' : 'Change'}
                    </Button>
                  </div>
                </div>
              )}

          {/* Top Header (1:1 Mockup Match) */}
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20 border-b border-slate-200/80 dark:border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">
                    {bn ? 'ভর্তি আবেদন ফরম' : 'Admission Application Form'}
                  </h1>
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                    {sessionDisplayName} {bn ? 'শিক্ষাবর্ষ' : 'Academic Year'}
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
                  {bn ? `ধাপ ${safeCurrentStep + 1} / ${activeSections.length}` : `Step ${safeCurrentStep + 1} of ${activeSections.length}`}
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
                  style={{ width: `${(safeCurrentStep / Math.max(1, activeSections.length - 1)) * 100}%` }}
                />
              </div>

              {activeSections.map((stepKey, idx) => {
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
            <div className="p-5 sm:p-6 lg:p-8 space-y-6 bg-slate-50/40 dark:bg-transparent">

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
                {renderSection(activeSections[safeCurrentStep])}
              </div>

              {/* Footer on final step */}
              {safeCurrentStep === activeSections.length - 1 && (() => {
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

          {/* Modern Sticky Bottom Navigation Bar */}
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
                {bn ? `ধাপ ${safeCurrentStep + 1} : ${getStepTitle(activeSections[safeCurrentStep])}` : `Step ${safeCurrentStep + 1} : ${getStepTitle(activeSections[safeCurrentStep])}`}
              </span>
            </div>

            {safeCurrentStep < activeSections.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  if (validateCurrentStep(activeSections[safeCurrentStep])) {
                    setCurrentStep(prev => Math.min(activeSections.length - 1, prev + 1));
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }
                }}
                className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>{bn ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                  {bn ? 'আবেদন জমা দিন' : 'Submit Application'}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownloadPDF(true)}
                  variant="outline"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-border text-xs font-semibold"
                >
                  <Download className="w-4 h-4 mr-1.5" /> {bn ? 'ফর্ম ডাউনলোড' : 'Download Form'}
                </Button>
              </div>
            )}
          </div>
            </>
          )}
        </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
};

export default AdmissionPage;
