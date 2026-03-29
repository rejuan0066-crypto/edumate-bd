import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2, UserCheck, UserX, Loader2, Edit, AlertCircle, CheckCircle, Eye, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useValidationRules } from '@/hooks/useValidationRules';
import PhotoUpload from '@/components/PhotoUpload';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import PhoneInput from '@/components/PhoneInput';

const emptyAddress: AddressData = { division: '', district: '', upazila: '', union: '', postOffice: '', village: '' };

const formatAddress = (addr: AddressData) =>
  [addr.village, addr.postOffice, addr.union, addr.upazila, addr.district, addr.division].filter(Boolean).join(', ');

const initialForm = {
  student_type: 'new' as 'new' | 'old',
  residence_type: 'non-resident',
  admission_session: '',
  roll_number: '',
  registration_no: '',
  admission_date: new Date().toISOString().split('T')[0],
  session_year: new Date().getFullYear().toString(),
  admission_class: '',
  first_name: '',
  last_name: '',
  gender: 'male',
  religion: 'islam',
  date_of_birth: '',
  birth_reg_no: '',
  previous_class: '',
  previous_institute: '',
  is_orphan: false,
  is_poor: false,
  photo_url: '',
  // Parents
  father_name: '',
  father_occupation: '',
  father_nid: '',
  father_phone: '',
  father_phone_code: '+880',
  mother_name: '',
  mother_occupation: '',
  mother_nid: '',
  mother_phone: '',
  mother_phone_code: '+880',
  // Guardian
  guardian_type: '',
  guardian_name: '',
  guardian_relation: '',
  guardian_phone: '',
  guardian_phone_code: '+880',
  guardian_nid: '',
};

const AdminStudents = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const bn = language === 'bn';
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { validate, validateAll } = useValidationRules('student');

  // Addresses
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

  // NID errors
  const [fatherNidError, setFatherNidError] = useState('');
  const [motherNidError, setMotherNidError] = useState('');
  const [guardianNidError, setGuardianNidError] = useState('');
  const [birthRegError, setBirthRegError] = useState('');

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
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

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*, divisions(name, name_bn)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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

  const validateNid = (val: string, setter: (v: string) => void, errorSetter: (v: string) => void) => {
    const cleaned = val.replace(/\D/g, '');
    setter(cleaned);
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
      // Check duplicate
      if (cleaned.length === 17) {
        checkDuplicateBirthReg(cleaned);
      }
    }
  };

  const checkDuplicateBirthReg = async (regNo: string) => {
    const { data } = await supabase.from('students').select('roll_number, registration_no, admission_session, student_id').eq('birth_reg_no', regNo).limit(1);
    if (data && data.length > 0) {
      const s = data[0];
      toast.info(
        bn
          ? `এই জন্ম নিবন্ধন নম্বরে ইতিমধ্যে ভর্তি আছে! রোল: ${s.roll_number || 'N/A'}, রেজি: ${s.registration_no || s.student_id}, সেশন: ${s.admission_session || 'N/A'}`
          : `Already admitted with this Birth Reg! Roll: ${s.roll_number || 'N/A'}, Reg: ${s.registration_no || s.student_id}, Session: ${s.admission_session || 'N/A'}`,
        { duration: 8000 }
      );
    }
  };

  const handleOldStudentSearch = async () => {
    if (!oldRoll && !oldSession) {
      toast.error(bn ? 'রোল বা সেশন দিন' : 'Enter roll or session');
      return;
    }
    let query = supabase.from('students').select('*');
    if (oldRoll) query = query.eq('roll_number', oldRoll);
    if (oldSession) query = query.eq('admission_session', oldSession);
    const { data } = await query.limit(1);
    if (data && data.length > 0) {
      const s = data[0];
      const admData = (s as any).admission_data || {};
      setForm(prev => ({
        ...prev,
        first_name: s.name_bn || '',
        last_name: s.name_en || '',
        roll_number: s.roll_number || '',
        gender: s.gender || 'male',
        date_of_birth: s.date_of_birth || '',
        birth_reg_no: (s as any).birth_reg_no || '',
        father_name: s.father_name || '',
        mother_name: s.mother_name || '',
        father_nid: (s as any).father_nid || '',
        mother_nid: (s as any).mother_nid || '',
        photo_url: s.photo_url || '',
        religion: (s as any).religion || 'islam',
        admission_session: (s as any).admission_session || '',
        registration_no: (s as any).registration_no || '',
      }));
      if (admData.permanentAddr) setPermanentAddr(admData.permanentAddr);
      if (admData.presentAddr) setPresentAddr(admData.presentAddr);
      toast.success(bn ? 'ছাত্রের তথ্য পাওয়া গেছে' : 'Student data found');
    } else {
      toast.error(bn ? 'কোনো তথ্য পাওয়া যায়নি' : 'No data found');
    }
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const admissionData = {
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
      };

      const studentId = form.registration_no || `STU-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase.from('students').insert({
        student_id: studentId,
        name_bn: form.first_name.trim(),
        name_en: form.last_name.trim() || null,
        roll_number: form.roll_number.trim() || null,
        father_name: form.father_name.trim() || null,
        mother_name: form.mother_name.trim() || null,
        phone: form.father_phone || null,
        guardian_phone: form.guardian_type === 'other' ? form.guardian_phone : (form.guardian_type === 'mother' ? form.mother_phone : form.father_phone) || null,
        email: null,
        address: formatAddress(permanentAddr) || null,
        division_id: form.admission_class ? (classes.find((c: any) => c.id === form.admission_class) as any)?.division_id || null : null,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        photo_url: form.photo_url || null,
        student_category: form.is_orphan ? 'orphan' : form.is_poor ? 'poor' : 'general',
        residence_type: form.residence_type,
        admission_date: form.admission_date || null,
        birth_reg_no: form.birth_reg_no || null,
        religion: form.religion,
        admission_session: form.admission_session || null,
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
        approval_status: 'pending',
        admission_data: admissionData,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      resetForm();
      setShowAdd(false);
      toast.success(bn ? 'ভর্তি আবেদন সফলভাবে জমা হয়েছে! অনুমোদনের অপেক্ষায়।' : 'Admission submitted! Pending approval.');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('students').update({ approval_status: status, status: status === 'approved' ? 'active' : status === 'rejected' ? 'inactive' : 'active' } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(bn ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
    },
    onError: () => toast.error('Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(bn ? 'ছাত্র মুছে ফেলা হয়েছে' : 'Student deleted');
    },
    onError: () => toast.error('Error'),
  });

  const resetForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setPermanentAddr(emptyAddress);
    setPresentAddr(emptyAddress);
    setParentPermanentAddr(emptyAddress);
    setParentPresentAddr(emptyAddress);
    setGuardianPermAddr(emptyAddress);
    setGuardianPresAddr(emptyAddress);
    setSameAddress(false);
    setParentAddrSameAsStudent(false);
    setParentSamePresAddr(false);
    setGuardianSameAddr(false);
    setFatherNidError('');
    setMotherNidError('');
    setGuardianNidError('');
    setBirthRegError('');
    setOldRoll('');
    setOldSession('');
    setOldClass('');
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};

    if (!form.first_name.trim()) errors['first_name'] = bn ? 'নাম আবশ্যক' : 'First name required';
    if (!form.admission_session) errors['admission_session'] = bn ? 'ভর্তি সেশন আবশ্যক' : 'Admission session required';
    if (!form.date_of_birth) errors['date_of_birth'] = bn ? 'জন্ম তারিখ আবশ্যক' : 'Date of birth required';
    if (!form.birth_reg_no || form.birth_reg_no.length !== 17) errors['birth_reg_no'] = bn ? 'জন্ম নিবন্ধন ১৭ ডিজিট হতে হবে' : 'Birth Reg must be 17 digits';
    if (!form.father_name.trim()) errors['father_name'] = bn ? 'পিতার নাম আবশ্যক' : 'Father name required';
    if (!form.mother_name.trim()) errors['mother_name'] = bn ? 'মাতার নাম আবশ্যক' : 'Mother name required';

    // At least one NID
    if (!form.father_nid && !form.mother_nid) {
      errors['father_nid'] = bn ? 'কমপক্ষে একটি NID প্রয়োজন' : 'At least one NID required';
    }
    if (form.father_nid && form.father_nid.length !== 10 && form.father_nid.length !== 17) {
      errors['father_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
    }
    if (form.mother_nid && form.mother_nid.length !== 10 && form.mother_nid.length !== 17) {
      errors['mother_nid'] = bn ? 'NID ১০ বা ১৭ ডিজিট' : 'NID must be 10 or 17 digits';
    }

    // At least one mobile
    if (!form.father_phone && !form.mother_phone) {
      errors['father_phone'] = bn ? 'কমপক্ষে একটি মোবাইল নম্বর প্রয়োজন' : 'At least one mobile required';
    }

    // Guardian
    if (!form.guardian_type) errors['guardian_type'] = bn ? 'অভিভাবক নির্বাচন করুন' : 'Select guardian';
    if (form.guardian_type === 'other') {
      if (!form.guardian_name.trim()) errors['guardian_name'] = bn ? 'অভিভাবকের নাম আবশ্যক' : 'Guardian name required';
      if (!form.guardian_nid || (form.guardian_nid.length !== 10 && form.guardian_nid.length !== 17)) {
        errors['guardian_nid'] = bn ? 'NID ১০/১৭ ডিজিট' : 'NID 10/17 digits required';
      }
    }

    // Also run validation manager rules
    const vmErrors = validateAll(form);
    Object.assign(errors, vmErrors);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(bn ? 'ফর্মে ত্রুটি রয়েছে: ' + firstError : 'Form error: ' + firstError);
      return;
    }
    setFieldErrors({});
    addMutation.mutate();
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors[field]}</p>;
  };

  const filtered = students.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name_bn?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q);
  });

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success"><CheckCircle className="w-3 h-3" />{bn ? 'অনুমোদিত' : 'Approved'}</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"><XCircle className="w-3 h-3" />{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</span>;
      default: return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning"><Clock className="w-3 h-3" />{bn ? 'অপেক্ষমাণ' : 'Pending'}</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('students')}</h1>
            <p className="text-sm text-muted-foreground">{bn ? `মোট ${students.length} জন ছাত্র` : `Total ${students.length} students`}</p>
          </div>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary-gradient flex items-center gap-2">
            <Plus className="w-4 h-4" /> {bn ? 'নতুন ভর্তি' : 'New Admission'}
          </Button>
        </div>

        <div className="card-elevated p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={bn ? 'নাম, আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, ID or roll...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম' : 'Name'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'আইডি' : 'ID'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'রোল' : 'Roll'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'সেশন' : 'Session'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অনুমোদন' : 'Approval'}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.photo_url ? (
                            <img src={s.photo_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {s.name_bn?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-foreground text-sm block">{s.name_bn}</span>
                            {s.name_en && <span className="text-xs text-muted-foreground">{s.name_en}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.student_id}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.roll_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(s as any).admission_session || '-'}</td>
                      <td className="px-4 py-3">{getApprovalBadge((s as any).approval_status || 'pending')}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowDetail(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></button>
                          {((s as any).approval_status !== 'approved') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'approved' })} className="p-2 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success" title={bn ? 'অনুমোদন' : 'Approve'}><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {((s as any).approval_status !== 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'rejected' })} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title={bn ? 'প্রত্যাখ্যান' : 'Reject'}><XCircle className="w-4 h-4" /></button>
                          )}
                          {((s as any).approval_status === 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'pending' })} className="p-2 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning" title={bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}><Clock className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =================== ADMISSION FORM DIALOG =================== */}
      <Dialog open={showAdd} onOpenChange={o => { setShowAdd(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{bn ? 'ভর্তি আবেদন ফর্ম' : 'Admission Application Form'}</DialogTitle></DialogHeader>

          <div className="space-y-6 py-4">
            {/* ===== SECTION 1: STUDENT DETAILS ===== */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-md font-display font-semibold text-foreground border-b pb-2">{bn ? '১. ছাত্রের তথ্য' : '1. Student Details'}</h3>

              {/* Photo + Student/Resident type */}
              <div className="flex flex-col sm:flex-row gap-6">
                <PhotoUpload value={form.photo_url || null} onChange={(url) => setForm(prev => ({ ...prev, photo_url: url || '' }))} folder="students" />

                <div className="flex-1 space-y-4">
                  {/* New/Old */}
                  <div>
                    <Label>{bn ? 'ছাত্রের ধরন' : 'Student Type'} <span className="text-destructive">*</span></Label>
                    <div className="flex gap-3 mt-1">
                      {(['new', 'old'] as const).map(type => (
                        <button key={type} type="button" onClick={() => setForm(prev => ({ ...prev, student_type: type }))}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${form.student_type === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                          {type === 'new' ? (bn ? 'নতুন ছাত্র' : 'New Student') : (bn ? 'পুরাতন ছাত্র' : 'Old Student')}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Resident/Non-resident */}
                  <div>
                    <Label>{bn ? 'আবাসিক ধরন' : 'Residence Type'} <span className="text-destructive">*</span></Label>
                    <div className="flex gap-3 mt-1">
                      {[{ v: 'resident', l: bn ? 'আবাসিক' : 'Resident' }, { v: 'non-resident', l: bn ? 'অনাবাসিক' : 'Non-Resident' }].map(r => (
                        <button key={r.v} type="button" onClick={() => setForm(prev => ({ ...prev, residence_type: r.v }))}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${form.residence_type === r.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                          {r.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Old Student Search */}
              {form.student_type === 'old' && (
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

              {/* Academic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>{bn ? 'ভর্তি সেশন' : 'Admission Session'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['admission_session'] ? 'border-destructive' : ''}`} value={form.admission_session} onChange={e => setForm(prev => ({ ...prev, admission_session: e.target.value }))} placeholder="2026" />
                  <FieldError field="admission_session" />
                </div>
                <div>
                  <Label>{bn ? 'রোল' : 'Roll'} ({bn ? 'স্বয়ংক্রিয় ও সম্পাদনযোগ্য' : 'Auto & Editable'})</Label>
                  <Input className="bg-background mt-1" value={form.roll_number} onChange={e => setForm(prev => ({ ...prev, roll_number: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'রেজিস্ট্রেশন নং' : 'Reg No'} ({bn ? 'স্বয়ংক্রিয় ও সম্পাদনযোগ্য' : 'Auto & Editable'})</Label>
                  <Input className="bg-background mt-1" value={form.registration_no} onChange={e => setForm(prev => ({ ...prev, registration_no: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'ভর্তির তারিখ' : 'Admission Date'} <span className="text-destructive">*</span></Label>
                  <Input type="date" className="bg-background mt-1" value={form.admission_date} onChange={e => setForm(prev => ({ ...prev, admission_date: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'সেশন বছর' : 'Session Year'}</Label>
                  <Input className="bg-background mt-1" value={form.session_year} onChange={e => setForm(prev => ({ ...prev, session_year: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'ভর্তি শ্রেণী' : 'Admission Class'} <span className="text-destructive">*</span></Label>
                  <Select value={form.admission_class} onValueChange={v => setForm(prev => ({ ...prev, admission_class: v }))}>
                    <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Personal fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'প্রথম নাম' : 'First Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['first_name'] ? 'border-destructive' : ''}`} value={form.first_name} onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))} />
                  <FieldError field="first_name" />
                </div>
                <div>
                  <Label>{bn ? 'শেষ নাম' : 'Last Name'}</Label>
                  <Input className="bg-background mt-1" value={form.last_name} onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'লিঙ্গ' : 'Gender'} <span className="text-destructive">*</span></Label>
                  <Select value={form.gender} onValueChange={v => setForm(prev => ({ ...prev, gender: v }))}>
                    <SelectTrigger className="bg-background mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{bn ? 'পুরুষ' : 'Male'}</SelectItem>
                      <SelectItem value="female">{bn ? 'মহিলা' : 'Female'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'ধর্ম' : 'Religion'} <span className="text-destructive">*</span></Label>
                  <Select value={form.religion} onValueChange={v => setForm(prev => ({ ...prev, religion: v }))}>
                    <SelectTrigger className="bg-background mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="islam">{bn ? 'ইসলাম' : 'Islam'}</SelectItem>
                      <SelectItem value="hinduism">{bn ? 'হিন্দু' : 'Hinduism'}</SelectItem>
                      <SelectItem value="christianity">{bn ? 'খ্রিস্টান' : 'Christianity'}</SelectItem>
                      <SelectItem value="buddhism">{bn ? 'বৌদ্ধ' : 'Buddhism'}</SelectItem>
                      <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'জন্ম তারিখ' : 'Date of Birth'} <span className="text-destructive">*</span></Label>
                  <Input type="date" className={`bg-background mt-1 ${fieldErrors['date_of_birth'] ? 'border-destructive' : ''}`} value={form.date_of_birth} onChange={e => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))} />
                  {form.date_of_birth && <p className="text-xs text-primary mt-1 font-medium">{bn ? 'বয়স: ' : 'Age: '}{calculateAge(form.date_of_birth)}</p>}
                  <FieldError field="date_of_birth" />
                </div>
                <div>
                  <Label>{bn ? 'জন্ম নিবন্ধন নম্বর (১৭ ডিজিট)' : 'Birth Reg No (17 digits)'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['birth_reg_no'] || birthRegError ? 'border-destructive' : ''}`} maxLength={17} value={form.birth_reg_no} onChange={e => validateBirthReg(e.target.value)} />
                  {birthRegError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {birthRegError}</p>}
                  {form.birth_reg_no.length === 17 && !birthRegError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'সঠিক' : 'Valid'}</p>}
                  <FieldError field="birth_reg_no" />
                </div>
                <div>
                  <Label>{bn ? 'পূর্ববর্তী শ্রেণী' : 'Previous Class'}</Label>
                  <Input className="bg-background mt-1" value={form.previous_class} onChange={e => setForm(prev => ({ ...prev, previous_class: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'পূর্ববর্তী প্রতিষ্ঠান' : 'Previous Institute'}</Label>
                  <Input className="bg-background mt-1" value={form.previous_institute} onChange={e => setForm(prev => ({ ...prev, previous_institute: e.target.value }))} />
                </div>
              </div>

              {/* Orphan/Poor status */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="isOrphan" checked={form.is_orphan} onCheckedChange={v => setForm(prev => ({ ...prev, is_orphan: !!v, is_poor: false }))} />
                  <Label htmlFor="isOrphan">{bn ? 'এতিম' : 'Orphan'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isPoor" checked={form.is_poor} onCheckedChange={v => setForm(prev => ({ ...prev, is_poor: !!v, is_orphan: false }))} />
                  <Label htmlFor="isPoor">{bn ? 'গরীব' : 'Poor'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isNormal" checked={!form.is_orphan && !form.is_poor} onCheckedChange={() => setForm(prev => ({ ...prev, is_orphan: false, is_poor: false }))} />
                  <Label htmlFor="isNormal">{bn ? 'সাধারণ' : 'General'}</Label>
                </div>
              </div>
            </div>

            {/* ===== STUDENT ADDRESS ===== */}
            <div className="border rounded-lg p-4 space-y-4">
              <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={permanentAddr} onChange={setPermanentAddr} />
              <div className="flex items-center gap-2 mt-4">
                <Checkbox id="sameAddr" checked={sameAddress} onCheckedChange={v => { setSameAddress(!!v); if (v) setPresentAddr({ ...permanentAddr }); }} />
                <Label htmlFor="sameAddr">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present address same as permanent'}</Label>
              </div>
              {!sameAddress && (
                <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={presentAddr} onChange={setPresentAddr} />
              )}
            </div>

            {/* ===== SECTION 2: PARENTS INFORMATION ===== */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-md font-display font-semibold text-foreground border-b pb-2">{bn ? '২. অভিভাবকের তথ্য' : '2. Parents Information'}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'পিতার নাম' : 'Father Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['father_name'] ? 'border-destructive' : ''}`} value={form.father_name} onChange={e => setForm(prev => ({ ...prev, father_name: e.target.value }))} />
                  <FieldError field="father_name" />
                </div>
                <div>
                  <Label>{bn ? 'পিতার পেশা' : 'Father Occupation'}</Label>
                  <Input className="bg-background mt-1" value={form.father_occupation} onChange={e => setForm(prev => ({ ...prev, father_occupation: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'পিতার NID (১০/১৭ ডিজিট)' : 'Father NID (10/17 digits)'}</Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['father_nid'] || fatherNidError ? 'border-destructive' : ''}`} maxLength={17} value={form.father_nid}
                    onChange={e => validateNid(e.target.value, v => setForm(prev => ({ ...prev, father_nid: v })), setFatherNidError)} />
                  {fatherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fatherNidError}</p>}
                  {(form.father_nid.length === 10 || form.father_nid.length === 17) && !fatherNidError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'সঠিক' : 'Valid'}</p>}
                  <FieldError field="father_nid" />
                </div>
                <PhoneInput label={bn ? 'পিতার মোবাইল' : 'Father Mobile'} value={form.father_phone} countryCode={form.father_phone_code}
                  onChange={(phone, code) => setForm(prev => ({ ...prev, father_phone: phone, father_phone_code: code }))} required />

                <div>
                  <Label>{bn ? 'মাতার নাম' : 'Mother Name'} <span className="text-destructive">*</span></Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['mother_name'] ? 'border-destructive' : ''}`} value={form.mother_name} onChange={e => setForm(prev => ({ ...prev, mother_name: e.target.value }))} />
                  <FieldError field="mother_name" />
                </div>
                <div>
                  <Label>{bn ? 'মাতার পেশা' : 'Mother Occupation'}</Label>
                  <Input className="bg-background mt-1" value={form.mother_occupation} onChange={e => setForm(prev => ({ ...prev, mother_occupation: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'মাতার NID (১০/১৭ ডিজিট)' : 'Mother NID (10/17 digits)'}</Label>
                  <Input className={`bg-background mt-1 ${fieldErrors['mother_nid'] || motherNidError ? 'border-destructive' : ''}`} maxLength={17} value={form.mother_nid}
                    onChange={e => validateNid(e.target.value, v => setForm(prev => ({ ...prev, mother_nid: v })), setMotherNidError)} />
                  {motherNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {motherNidError}</p>}
                  {(form.mother_nid.length === 10 || form.mother_nid.length === 17) && !motherNidError && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {bn ? 'সঠিক' : 'Valid'}</p>}
                  <FieldError field="mother_nid" />
                </div>
                <PhoneInput label={bn ? 'মাতার মোবাইল' : 'Mother Mobile'} value={form.mother_phone} countryCode={form.mother_phone_code}
                  onChange={(phone, code) => setForm(prev => ({ ...prev, mother_phone: phone, mother_phone_code: code }))} required />
              </div>

              <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" />
                {bn ? 'কমপক্ষে একটি NID এবং একটি মোবাইল নম্বর প্রয়োজন' : 'At least one NID and one mobile number required'}
              </p>

              {/* Parent Address */}
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
                  {!parentSamePresAddr && (
                    <AddressFields label={bn ? 'অভিভাবক বর্তমান ঠিকানা' : 'Parent Present Address'} value={parentPresentAddr} onChange={setParentPresentAddr} />
                  )}
                </>
              )}
            </div>

            {/* ===== SECTION 3: GUARDIAN INFORMATION ===== */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-md font-display font-semibold text-foreground border-b pb-2">{bn ? '৩. অভিভাবক তথ্য' : '3. Guardian Information'}</h3>

              <div>
                <Label>{bn ? 'অভিভাবক' : 'Guardian'} <span className="text-destructive">*</span></Label>
                <Select value={form.guardian_type} onValueChange={v => setForm(prev => ({ ...prev, guardian_type: v }))}>
                  <SelectTrigger className={`bg-background mt-1 ${fieldErrors['guardian_type'] ? 'border-destructive' : ''}`}><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">{bn ? 'পিতা' : 'Father'}</SelectItem>
                    <SelectItem value="mother">{bn ? 'মাতা' : 'Mother'}</SelectItem>
                    <SelectItem value="other">{bn ? 'অন্যান্য' : 'Others'}</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError field="guardian_type" />
              </div>

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
                    <div>
                      <Label>{bn ? 'পূর্ণ নাম' : 'Full Name'} <span className="text-destructive">*</span></Label>
                      <Input className={`bg-background mt-1 ${fieldErrors['guardian_name'] ? 'border-destructive' : ''}`} value={form.guardian_name} onChange={e => setForm(prev => ({ ...prev, guardian_name: e.target.value }))} />
                      <FieldError field="guardian_name" />
                    </div>
                    <div>
                      <Label>{bn ? 'সম্পর্ক' : 'Relation'} <span className="text-destructive">*</span></Label>
                      <Input className="bg-background mt-1" value={form.guardian_relation} onChange={e => setForm(prev => ({ ...prev, guardian_relation: e.target.value }))} />
                    </div>
                    <PhoneInput label={bn ? 'মোবাইল' : 'Mobile'} value={form.guardian_phone} countryCode={form.guardian_phone_code}
                      onChange={(phone, code) => setForm(prev => ({ ...prev, guardian_phone: phone, guardian_phone_code: code }))} required />
                    <div>
                      <Label>{bn ? 'NID (১০/১৭ ডিজিট)' : 'NID (10/17 digits)'} <span className="text-destructive">*</span></Label>
                      <Input className={`bg-background mt-1 ${fieldErrors['guardian_nid'] || guardianNidError ? 'border-destructive' : ''}`} maxLength={17} value={form.guardian_nid}
                        onChange={e => validateNid(e.target.value, v => setForm(prev => ({ ...prev, guardian_nid: v })), setGuardianNidError)} />
                      {guardianNidError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {guardianNidError}</p>}
                      <FieldError field="guardian_nid" />
                    </div>
                  </div>
                  <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={guardianPermAddr} onChange={setGuardianPermAddr} />
                  <div className="flex items-center gap-2">
                    <Checkbox id="guardianSameAddr" checked={guardianSameAddr} onCheckedChange={v => { setGuardianSameAddr(!!v); if (v) setGuardianPresAddr({ ...guardianPermAddr }); }} />
                    <Label htmlFor="guardianSameAddr">{bn ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present same as permanent'}</Label>
                  </div>
                  {!guardianSameAddr && (
                    <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={guardianPresAddr} onChange={setGuardianPresAddr} />
                  )}
                </div>
              )}
            </div>

            {/* ===== SIGNATURE NOTE ===== */}
            <div className="border rounded-lg p-4 bg-secondary/30">
              <p className="text-sm text-muted-foreground italic">
                {bn
                  ? '* প্রিন্ট/ডাউনলোড ফাইলে প্রিন্সিপাল ও শিক্ষকের নাম, পদবী ও স্বাক্ষরের স্থান থাকবে'
                  : '* Print/Download file will include Principal & Teacher name, designation and signature fields'}
              </p>
            </div>

            {/* ===== SUBMIT ===== */}
            <Button onClick={handleSubmit} className="btn-primary-gradient w-full text-lg py-5" disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              {bn ? 'আবেদন জমা দিন' : 'Submit Application'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {bn ? 'জমা দেওয়ার পর অ্যাডমিনের অনুমোদন প্রয়োজন' : 'Admin approval required after submission'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* =================== DETAIL VIEW DIALOG =================== */}
      <Dialog open={!!showDetail} onOpenChange={o => { if (!o) setShowDetail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{bn ? 'ছাত্রের বিস্তারিত' : 'Student Details'}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4">
                {showDetail.photo_url ? (
                  <img src={showDetail.photo_url} className="w-24 h-28 rounded-lg object-cover border" alt="" />
                ) : (
                  <div className="w-24 h-28 rounded-lg bg-secondary flex items-center justify-center text-3xl font-bold text-muted-foreground">{showDetail.name_bn?.[0]}</div>
                )}
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-bold text-foreground">{showDetail.name_bn}</h3>
                  {showDetail.name_en && <p className="text-sm text-muted-foreground">{showDetail.name_en}</p>}
                  <p className="text-sm">{bn ? 'আইডি: ' : 'ID: '}{showDetail.student_id}</p>
                  <p className="text-sm">{bn ? 'রোল: ' : 'Roll: '}{showDetail.roll_number || '-'}</p>
                  <div className="mt-2">{getApprovalBadge((showDetail as any).approval_status || 'pending')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{bn ? 'পিতা: ' : 'Father: '}</span>{showDetail.father_name || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'মাতা: ' : 'Mother: '}</span>{showDetail.mother_name || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'জন্ম তারিখ: ' : 'DOB: '}</span>{showDetail.date_of_birth || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'লিঙ্গ: ' : 'Gender: '}</span>{showDetail.gender || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'ফোন: ' : 'Phone: '}</span>{showDetail.phone || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'অভিভাবক ফোন: ' : 'Guardian: '}</span>{showDetail.guardian_phone || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'জন্ম নিবন্ধন: ' : 'Birth Reg: '}</span>{(showDetail as any).birth_reg_no || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'ধর্ম: ' : 'Religion: '}</span>{(showDetail as any).religion || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'সেশন: ' : 'Session: '}</span>{(showDetail as any).admission_session || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'আবাসিক: ' : 'Residence: '}</span>{showDetail.residence_type || '-'}</div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {(showDetail as any).approval_status !== 'approved' && (
                  <Button onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'approved' }); setShowDetail(null); }} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                    <CheckCircle className="w-4 h-4 mr-2" /> {bn ? 'অনুমোদন' : 'Approve'}
                  </Button>
                )}
                {(showDetail as any).approval_status !== 'rejected' && (
                  <Button variant="destructive" onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'rejected' }); setShowDetail(null); }} className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" /> {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                  </Button>
                )}
                {(showDetail as any).approval_status === 'rejected' && (
                  <Button variant="outline" onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'pending' }); setShowDetail(null); }} className="flex-1">
                    <Clock className="w-4 h-4 mr-2" /> {bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStudents;
