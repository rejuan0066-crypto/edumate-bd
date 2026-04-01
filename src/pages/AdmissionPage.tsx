import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useCallback, useEffect } from 'react';
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
import AddressFields, { type AddressData } from '@/components/AddressFields';
import PhoneInput from '@/components/PhoneInput';
import { Camera, Search, Loader2, AlertCircle, CheckCircle, Plus, Printer, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const formatAddress = (addr: AddressData) =>
  [addr.village, addr.postOffice, addr.union, addr.upazila, addr.district, addr.division].filter(Boolean).join(', ');

const AdmissionPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { fields: configFields, isLoaded, isFieldActive, getField, getFieldsBySection, getCustomFields, sections } = useAdmissionFormConfig();

  // Form state (same as admin form)
  const [form, setForm] = useState<Record<string, any>>({
    student_type: 'new', residence_type: 'non-resident',
    admission_session: '', roll_number: '', registration_no: '',
    admission_date: new Date().toISOString().split('T')[0],
    session_year: new Date().getFullYear().toString(),
    admission_class: '', first_name: '', last_name: '',
    gender: 'male', religion: 'islam', date_of_birth: '',
    birth_reg_no: '', previous_class: '', previous_institute: '',
    is_orphan: false, is_poor: false, photo_url: '',
    father_name: '', father_occupation: '', father_nid: '', father_phone: '', father_phone_code: '+880',
    mother_name: '', mother_occupation: '', mother_nid: '', mother_phone: '', mother_phone_code: '+880',
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

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
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
        .in('key', ['show_roll_no', 'show_session', 'admission_footer_text']);
      if (error) throw error;
      const result: Record<string, any> = {};
      data?.forEach(row => { result[row.key] = row.value; });
      return result;
    },
  });

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

  const getRollStartForClass = useCallback((classId: string) => {
    const cls = classes.find((c: any) => c.id === classId);
    if (!cls) return 1001;
    const order = cls.sort_order || 1;
    return order * 1000 + 1;
  }, [classes]);

  const generateRollNumber = useCallback(async (classId: string, sessionId: string) => {
    if (!classId || !sessionId) return;
    const rollStart = getRollStartForClass(classId);
    const rollPrefix = Math.floor(rollStart / 1000);
    const { data } = await supabase
      .from('students')
      .select('roll_number')
      .eq('class_id', classId)
      .eq('session_id', sessionId)
      .not('roll_number', 'is', null)
      .order('roll_number', { ascending: false })
      .limit(50);
    let maxRoll = rollStart - 1;
    if (data && data.length > 0) {
      for (const s of data) {
        const num = parseInt(s.roll_number || '0', 10);
        if (!isNaN(num) && num >= rollStart && num < (rollPrefix + 1) * 1000) {
          maxRoll = Math.max(maxRoll, num);
        }
      }
    }
    setForm(prev => ({ ...prev, roll_number: String(maxRoll + 1) }));
  }, [getRollStartForClass]);

  const bnToEn = (str: string) => str.replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

  const updateRegistrationFromRoll = useCallback((sessionYear: string, rollNumber: string) => {
    if (!sessionYear || !rollNumber) return;
    const year = bnToEn(sessionYear.trim()).slice(0, 4);
    setForm(prev => ({ ...prev, registration_no: `${year}${rollNumber}` }));
  }, []);

  useEffect(() => {
    if (form.admission_class && form.admission_session) {
      generateRollNumber(form.admission_class, form.admission_session);
    }
  }, [form.admission_class, form.admission_session, generateRollNumber]);

  useEffect(() => {
    if (form.session_year && form.roll_number) {
      updateRegistrationFromRoll(form.session_year, form.roll_number);
    }
  }, [form.session_year, form.roll_number, updateRegistrationFromRoll]);

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
        father_name: s.father_name || '', mother_name: s.mother_name || '',
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 300 * 1024) {
        toast.error(bn ? 'ছবির সাইজ ৩০০KB এর কম হতে হবে' : 'Image must be less than 300KB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return form.photo_url || null;
    const ext = photoFile.name.split('.').pop();
    const path = `students/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, photoFile);
    if (error) { toast.error('Photo upload failed'); return null; }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
    return urlData.publicUrl;
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
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const photoUrl = await uploadPhoto();
      const admissionData = buildAdmissionData();
      const studentId = form.registration_no || `STU-${Date.now().toString().slice(-8)}`;
      const payload = {
        name_bn: form.first_name.trim(),
        name_en: form.last_name.trim() || null,
        roll_number: form.roll_number.trim() || null,
        father_name: form.father_name.trim() || null,
        mother_name: form.mother_name.trim() || null,
        phone: form.father_phone || null,
        guardian_phone: form.guardian_type === 'other' ? form.guardian_phone : (form.guardian_type === 'mother' ? form.mother_phone : form.father_phone) || null,
        address: formatAddress(permanentAddr) || null,
        division_id: form.admission_class ? (classes.find((c: any) => c.id === form.admission_class) as any)?.division_id || null : null,
        class_id: form.admission_class || null,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        photo_url: photoUrl,
        student_category: form.is_orphan ? 'orphan' : form.is_poor ? 'poor' : 'general',
        residence_type: form.residence_type,
        admission_date: form.admission_date || null,
        birth_reg_no: form.birth_reg_no || null,
        religion: form.religion,
        admission_session: academicSessions.find((s: any) => s.id === form.admission_session)?.name || form.admission_session || null,
        session_id: form.admission_session || null,
        registration_no: form.registration_no || null,
        session_year: form.session_year || null,
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
      // Store submitted data for print/download
      setSubmittedData(payload);
    },
    onError: (e: any) => toast.error(e.message || 'Error submitting application'),
  });

  const handleSubmit = () => {
    const errors: Record<string, string> = {};

    configFields.forEach(f => {
      const key = f.default_value;
      if (!key || !f.is_active || !f.is_required) return;
      const val = form[key];
      if (key === 'address_permanent' || key === 'address_present') return;
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
            <div
              onClick={() => document.getElementById('public-photo-input')?.click()}
              className="w-32 h-40 border-2 border-dashed border-primary/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all overflow-hidden"
            >
              {photoPreview || form.photo_url ? (
                <img src={photoPreview || form.photo_url} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{bn ? 'ছবি তুলুন' : 'Upload'}</span>
                </>
              )}
            </div>
            <input id="public-photo-input" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
        );

      case 'student_type':
        return (
          <div>
            <Label>{label} {reqStar}</Label>
            <div className="flex gap-3 mt-1">
              {(['new', 'old'] as const).map(type => (
                <button key={type} type="button" onClick={() => setForm(prev => ({ ...prev, student_type: type }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${form.student_type === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                  {type === 'new' ? (bn ? 'নতুন ছাত্র' : 'New Student') : (bn ? 'পুরাতন ছাত্র' : 'Old Student')}
                </button>
              ))}
            </div>
          </div>
        );

      case 'residence_type':
        return (
          <div>
            <Label>{label} {reqStar}</Label>
            <div className="flex gap-3 mt-1">
              {[{ v: 'resident', l: bn ? 'আবাসিক' : 'Resident' }, { v: 'non-resident', l: bn ? 'অনাবাসিক' : 'Non-Resident' }].map(r => (
                <button key={r.v} type="button" onClick={() => setForm(prev => ({ ...prev, residence_type: r.v }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${form.residence_type === r.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
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
            <Input className={`bg-muted mt-1 ${errorBorder}`} value={form.roll_number || ''} readOnly
              placeholder={bn ? 'অটো জেনারেট' : 'Auto-generated'} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'registration_no':
        if (!isFormFieldVisible('registration_no')) return null;
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-muted mt-1 ${errorBorder}`}
              value={form.registration_no || ''}
              readOnly
              placeholder={bn ? 'অটো জেনারেট' : 'Auto-generated'} />
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
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'admission_class':
        if (!isFormFieldVisible('admission_class')) return null;
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Select value={form.admission_class} onValueChange={v => setForm(prev => ({ ...prev, admission_class: v }))}>
              <SelectTrigger className={`bg-background mt-1 ${errorBorder}`}><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
              <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError field={fieldKey} />
          </div>
        );

      case 'gender':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Select value={form.gender} onValueChange={v => setForm(prev => ({ ...prev, gender: v }))}>
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
          <div data-field={fieldKey}>
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
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input type="date" className={`bg-background mt-1 ${errorBorder}`}
              value={form.date_of_birth} onChange={e => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))} />
            {form.date_of_birth && <p className="text-xs text-primary mt-1 font-medium">{bn ? 'বয়স: ' : 'Age: '}{calculateAge(form.date_of_birth)}</p>}
            <FieldError field={fieldKey} />
          </div>
        );

      case 'birth_reg_no':
        if (!isFormFieldVisible('birth_reg_no')) return null;
        return (
          <div data-field={fieldKey}>
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
        if (!isFormFieldVisible('mother_nid')) return null;
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
        if (!isFormFieldVisible('guardian_nid')) return null;
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
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input type="date" className={`bg-background mt-1 ${errorBorder}`} value={form.admission_date}
              onChange={e => setForm(prev => ({ ...prev, admission_date: e.target.value }))} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'first_name':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              value={form.first_name || ''}
              onChange={e => {
                const val = e.target.value.replace(/[a-zA-Z0-9]/g, '');
                setForm(prev => ({ ...prev, first_name: val }));
              }}
              placeholder={bn ? 'বাংলায় লিখুন' : 'Type in Bangla only'} />
            <FieldError field={fieldKey} />
          </div>
        );

      case 'last_name':
        return (
          <div data-field={fieldKey}>
            <Label className={errorLabel}>{label} {reqStar}</Label>
            <Input className={`bg-background mt-1 ${errorBorder}`}
              value={form.last_name || ''}
              onChange={e => {
                const val = e.target.value.replace(/[^\x00-\x7F]/g, '');
                setForm(prev => ({ ...prev, last_name: val }));
              }}
              placeholder={bn ? 'ইংরেজিতে লিখুন' : 'Type in English only'} />
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
        {config.field_type === 'number' && <Input type="number" className="bg-background mt-1" value={val} onChange={e => update(e.target.value)} />}
        {config.field_type === 'textarea' && <Textarea className="bg-background mt-1" rows={3} value={val} onChange={e => update(e.target.value)} />}
        {config.field_type === 'date' && <Input type="date" className="bg-background mt-1" value={val} onChange={e => update(e.target.value)} />}
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
    'registration_no', 'admission_date', 'session_year', 'admission_class',
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
      const orphanField = sectionFields.find(f => f.default_value === 'is_orphan');
      const poorField = sectionFields.find(f => f.default_value === 'is_poor');
      const otherFields = sectionFields.filter(f =>
        !['photo_url', 'student_type', 'residence_type', 'is_orphan', 'is_poor'].includes(f.default_value || '')
      );

      return (
        <div key={sectionKey} className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-display font-bold text-foreground border-b pb-2">{title}</h2>
          <div className="flex flex-col sm:flex-row gap-6">
            {photoField && renderSystemField('photo_url', photoField)}
            <div className="flex-1 space-y-4">
              {typeField && renderSystemField('student_type', typeField)}
              {resField && renderSystemField('residence_type', resField)}
            </div>
          </div>

          {isFieldActive('student_type') && form.student_type === 'old' && (
            <div className="p-4 rounded-lg bg-secondary/50 border space-y-3">
              <p className="text-sm font-medium">{bn ? 'পুরাতন ছাত্রের তথ্য অনুসন্ধান' : 'Search Old Student'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder={bn ? 'রোল' : 'Roll'} value={oldRoll} onChange={e => setOldRoll(e.target.value)} className="bg-background" />
                <Input placeholder={bn ? 'ভর্তি সেশন' : 'Session'} value={oldSession} onChange={e => setOldSession(e.target.value)} className="bg-background" />
                <Select value={oldClass} onValueChange={setOldClass}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={handleOldStudentSearch} className="flex items-center gap-2">
                <Search className="w-4 h-4" /> {bn ? 'অনুসন্ধান' : 'Search'}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherFields.map(f => {
              const key = f.default_value;
              if (!key) return <div key={f.id}>{renderCustomField(f)}</div>;
              if (SYSTEM_KEYS.includes(key)) return <div key={f.id}>{renderSystemField(key, f)}</div>;
              return <div key={f.id}>{renderCustomField(f)}</div>;
            })}
          </div>

          {(orphanField && isFormFieldVisible('is_orphan') || poorField && isFormFieldVisible('is_poor')) && (
            <div className="flex flex-wrap gap-6">
              {orphanField && isFormFieldVisible('is_orphan') && (
                <div className="flex items-center gap-2">
                  <Checkbox id="isOrphan" checked={form.is_orphan} onCheckedChange={v => setForm(prev => ({ ...prev, is_orphan: !!v, is_poor: false }))} />
                  <Label htmlFor="isOrphan">{bn ? orphanField.label_bn : orphanField.label}</Label>
                </div>
              )}
              {poorField && isFormFieldVisible('is_poor') && (
                <div className="flex items-center gap-2">
                  <Checkbox id="isPoor" checked={form.is_poor} onCheckedChange={v => setForm(prev => ({ ...prev, is_poor: !!v, is_orphan: false }))} />
                  <Label htmlFor="isPoor">{bn ? poorField.label_bn : poorField.label}</Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="isNormal" checked={!form.is_orphan && !form.is_poor} onCheckedChange={() => setForm(prev => ({ ...prev, is_orphan: false, is_poor: false }))} />
                <Label htmlFor="isNormal">{bn ? 'সাধারণ' : 'General'}</Label>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (sectionKey === 'parents') {
      return (
        <div key={sectionKey} className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-display font-bold text-foreground border-b pb-2">{title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sectionFields.map(f => {
              const key = f.default_value;
              if (!key) return <div key={f.id}>{renderCustomField(f)}</div>;
              if (SYSTEM_KEYS.includes(key)) return <div key={f.id}>{renderSystemField(key, f)}</div>;
              return <div key={f.id}>{renderCustomField(f)}</div>;
            })}
          </div>
          <p className="text-xs text-destructive flex items-center gap-1 mt-2">
            <AlertCircle className="w-3 h-3" />
            {bn ? 'কমপক্ষে একটি NID এবং একটি মোবাইল নম্বর প্রয়োজন' : 'At least one NID and one mobile number required'}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Checkbox id="parentAddrSame" checked={parentAddrSameAsStudent} onCheckedChange={v => {
              setParentAddrSameAsStudent(!!v);
              if (v) { setParentPermanentAddr({ ...permanentAddr }); setParentPresentAddr(sameAddress ? { ...permanentAddr } : { ...presentAddr }); }
            }} />
            <Label htmlFor="parentAddrSame">{bn ? 'ছাত্রের ঠিকানার মতো' : 'Same as student address'}</Label>
          </div>
          {!parentAddrSameAsStudent && (
            <>
              <AddressFields label={bn ? 'অভিভাবক স্থায়ী ঠিকানা' : 'Parent Permanent Address'} value={parentPermanentAddr} onChange={setParentPermanentAddr} />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox id="parentSamePres" checked={parentSamePresAddr} onCheckedChange={v => { setParentSamePresAddr(!!v); if (v) setParentPresentAddr({ ...parentPermanentAddr }); }} />
                <Label htmlFor="parentSamePres">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
              </div>
              {!parentSamePresAddr && <AddressFields label={bn ? 'অভিভাবক বর্তমান ঠিকানা' : 'Parent Present Address'} value={parentPresentAddr} onChange={setParentPresentAddr} />}
            </>
          )}
        </div>
      );
    }

    if (sectionKey === 'guardian') {
      const guardianTypeField = sectionFields.find(f => f.default_value === 'guardian_type');
      const otherGuardianFields = sectionFields.filter(f => f.default_value !== 'guardian_type');

      return (
        <div key={sectionKey} className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-display font-bold text-foreground border-b pb-2">{title}</h2>
          {guardianTypeField && renderSystemField('guardian_type', guardianTypeField)}

          {(form.guardian_type === 'father' || form.guardian_type === 'mother') && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm text-success flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {bn ? `${form.guardian_type === 'father' ? 'পিতার' : 'মাতার'} তথ্য থেকে স্বয়ংক্রিয়ভাবে পূরণ হবে` : `Will auto-fill from ${form.guardian_type === 'father' ? "father's" : "mother's"} information`}
              </p>
            </div>
          )}

          {form.guardian_type === 'other' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherGuardianFields.map(f => {
                  const key = f.default_value;
                  if (!key) return <div key={f.id}>{renderCustomField(f)}</div>;
                  if (SYSTEM_KEYS.includes(key)) return <div key={f.id}>{renderSystemField(key, f)}</div>;
                  return <div key={f.id}>{renderCustomField(f)}</div>;
                })}
              </div>
              <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={guardianPermAddr} onChange={setGuardianPermAddr} />
              <div className="flex items-center gap-2">
                <Checkbox id="guardianSameAddr" checked={guardianSameAddr} onCheckedChange={v => { setGuardianSameAddr(!!v); if (v) setGuardianPresAddr({ ...guardianPermAddr }); }} />
                <Label htmlFor="guardianSameAddr">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
              </div>
              {!guardianSameAddr && <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={guardianPresAddr} onChange={setGuardianPresAddr} />}
            </div>
          )}
        </div>
      );
    }

    // Generic section (address)
    return (
      <div key={sectionKey} className="card-elevated p-6 space-y-4">
        <h2 className="text-lg font-display font-bold text-foreground border-b pb-2">{title}</h2>
        {sectionFields.map(f => {
          const key = f.default_value;
          if (!key) return <div key={f.id}>{renderCustomField(f)}</div>;
          if (SYSTEM_KEYS.includes(key)) return <div key={f.id}>{renderSystemField(key, f)}</div>;
          return <div key={f.id}>{renderCustomField(f)}</div>;
        })}
      </div>
    );
  };

  const activeSections = sections.filter(section => getFieldsBySection(section).length > 0);

  const resetForm = () => {
    setSubmittedData(null);
    setForm({
      student_type: 'new', residence_type: 'non-resident',
      admission_session: '', roll_number: '', registration_no: '',
      admission_date: new Date().toISOString().split('T')[0],
      session_year: new Date().getFullYear().toString(),
      admission_class: '', first_name: '', last_name: '',
      gender: 'male', religion: 'islam', date_of_birth: '',
      birth_reg_no: '', previous_class: '', previous_institute: '',
      is_orphan: false, is_poor: false, photo_url: '',
      father_name: '', father_occupation: '', father_nid: '', father_phone: '', father_phone_code: '+880',
      mother_name: '', mother_occupation: '', mother_nid: '', mother_phone: '', mother_phone_code: '+880',
      guardian_type: '', guardian_name: '', guardian_relation: '', guardian_phone: '', guardian_phone_code: '+880', guardian_nid: '',
    });
    setFieldErrors({});
    setCustomFieldValues({});
    setPermanentAddr(emptyAddress); setPresentAddr(emptyAddress);
    setParentPermanentAddr(emptyAddress); setParentPresentAddr(emptyAddress);
    setGuardianPermAddr(emptyAddress); setGuardianPresAddr(emptyAddress);
    setSameAddress(false); setParentAddrSameAsStudent(false);
    setParentSamePresAddr(false); setGuardianSameAddr(false);
    setPhotoFile(null); setPhotoPreview(null);
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
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans Bengali', sans-serif; padding: 20mm; font-size: 12px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header img { height: 60px; margin-bottom: 5px; }
        .header h1 { font-size: 18px; font-weight: 700; }
        .header p { font-size: 11px; color: #666; }
        .form-title { text-align: center; font-size: 16px; font-weight: 700; margin: 15px 0; padding: 8px; background: #f5f5f5; border: 1px solid #ddd; }
        .photo-section { float: right; width: 100px; height: 120px; border: 1px solid #999; display: flex; align-items: center; justify-content: center; margin-left: 15px; }
        .photo-section img { width: 100%; height: 100%; object-fit: cover; }
        .section { margin-bottom: 15px; clear: both; }
        .section-title { font-size: 13px; font-weight: 700; padding: 5px 10px; background: #e8e8e8; border-left: 3px solid #333; margin-bottom: 8px; }
        .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 15px; }
        .field { display: flex; gap: 5px; padding: 3px 0; border-bottom: 1px dotted #ccc; }
        .field-label { font-weight: 600; min-width: 120px; color: #555; }
        .field-value { flex: 1; }
        .status-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #fff3cd; color: #856404; border: 1px solid #ffc107; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { padding: 10mm; } @page { margin: 10mm; } }
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
          <div class="field"><span class="field-label">পিতার নাম:</span><span class="field-value">${blank ? blankVal : (d.father_name || '-')}</span></div>
          <div class="field"><span class="field-label">পিতার পেশা:</span><span class="field-value">${blank ? blankVal : (d.father_occupation || '-')}</span></div>
          <div class="field"><span class="field-label">পিতার ফোন:</span><span class="field-value">${blank ? blankVal : (d.father_phone || '-')}</span></div>
          <div class="field"><span class="field-label">পিতার NID:</span><span class="field-value">${blank ? blankVal : (d.father_nid || '-')}</span></div>
          <div class="field"><span class="field-label">মাতার নাম:</span><span class="field-value">${blank ? blankVal : (d.mother_name || '-')}</span></div>
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

    // Use a hidden iframe to render the HTML properly
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '794px'; // A4 width at 96dpi
    iframe.style.height = '1123px'; // A4 height at 96dpi
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

    // Wait for fonts and content to load
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const body = iframeDoc.body;
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = 297;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

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
    const className = submittedData.class_id ? (classes.find((c: any) => c.id === submittedData.class_id) as any)?.name_bn || '' : '';
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="card-elevated p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'আবেদন সফলভাবে জমা হয়েছে!' : 'Application Submitted Successfully!'}
            </h1>
            <p className="text-muted-foreground">
              {bn ? 'আপনার ভর্তি আবেদন অনুমোদনের অপেক্ষায় রয়েছে।' : 'Your admission application is pending approval.'}
            </p>

            <div className="bg-secondary/50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{bn ? 'নাম:' : 'Name:'}</span>
                <span className="font-medium">{submittedData.name_bn}</span>
              </div>
              {submittedData.name_en && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{bn ? 'নাম (ইংরেজি):' : 'Name (English):'}</span>
                  <span className="font-medium">{submittedData.name_en}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{bn ? 'আইডি:' : 'ID:'}</span>
                <span className="font-medium">{submittedData.student_id}</span>
              </div>
              {submittedData.roll_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{bn ? 'রোল:' : 'Roll:'}</span>
                  <span className="font-medium">{submittedData.roll_number}</span>
                </div>
              )}
              {className && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{bn ? 'শ্রেণী:' : 'Class:'}</span>
                  <span className="font-medium">{className}</span>
                </div>
              )}
              {submittedData.registration_no && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{bn ? 'রেজিস্ট্রেশন:' : 'Registration:'}</span>
                  <span className="font-medium">{submittedData.registration_no}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handlePrint(false)} className="flex-1 flex items-center justify-center gap-2" variant="outline">
                <Printer className="w-4 h-4" /> {bn ? 'প্রিন্ট করুন' : 'Print'}
              </Button>
              <Button onClick={() => handleDownloadPDF(false)} className="flex-1 flex items-center justify-center gap-2 btn-primary-gradient">
                <Download className="w-4 h-4" /> {bn ? 'ডাউনলোড (PDF)' : 'Download (PDF)'}
              </Button>
            </div>

            <Button onClick={resetForm} variant="ghost" className="flex items-center gap-2 mx-auto text-muted-foreground">
              <RotateCcw className="w-4 h-4" /> {bn ? 'নতুন আবেদন করুন' : 'Submit New Application'}
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {bn ? 'ভর্তি আবেদন ফর্ম' : 'Admission Application Form'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {bn ? 'সকল তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all information correctly'}
        </p>

        {!isLoaded ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-8">
            {/* Error summary */}
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

            {activeSections.map(section => renderSection(section))}

            {/* Footer from form_settings */}
            {footerParagraph?.is_visible && footerParagraph?.footer_text && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-foreground whitespace-pre-wrap">{footerParagraph.footer_text}</p>
              </div>
            )}

            {/* Footer from website_settings */}
            {websiteFooterText && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-foreground whitespace-pre-wrap">{websiteFooterText}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSubmit} className="btn-primary-gradient flex-1 text-lg py-6" disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {bn ? 'আবেদন জমা দিন' : 'Submit Application'}
              </Button>
              <Button onClick={() => handleDownloadPDF(true)} variant="outline" className="flex-1 text-lg py-6 flex items-center justify-center gap-2">
                <Download className="w-5 h-5" /> {bn ? 'ফর্ম ডাউনলোড করুন' : 'Download Form'}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {bn ? 'জমা দেওয়ার পর অ্যাডমিনের অনুমোদন প্রয়োজন' : 'Admin approval required after submission'}
            </p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default AdmissionPage;
