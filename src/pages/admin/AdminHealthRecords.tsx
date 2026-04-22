import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, Stethoscope, Syringe, Plus, Pencil, Trash2, Users, Activity, AlertTriangle, ShieldCheck, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { generateBilingualReport, type ReportSection, type ReportSummaryStat } from '@/lib/reportPdfGenerator';
import { resolvePersonType, makePersonMatcher, type PersonTypeInput } from '@/lib/personType';

type PersonType = 'student' | 'staff';

type HealthProfile = {
  id: string;
  person_type: PersonType;
  student_id?: string | null;
  staff_id?: string | null;
  blood_group?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  current_medications?: string | null;
  family_history?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  notes?: string | null;
};

type MedicalVisit = {
  id: string;
  person_type: PersonType;
  student_id?: string | null;
  staff_id?: string | null;
  visit_date: string;
  visit_time?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  prescription?: string | null;
  attended_by?: string | null;
  temperature_c?: number | null;
  blood_pressure?: string | null;
  pulse_rate?: number | null;
  follow_up_date?: string | null;
  severity: 'mild' | 'moderate' | 'severe' | 'emergency';
  notes?: string | null;
};

type Vaccination = {
  id: string;
  person_type: PersonType;
  student_id?: string | null;
  staff_id?: string | null;
  vaccine_name: string;
  vaccine_name_bn?: string | null;
  dose_number: number;
  vaccination_date: string;
  next_due_date?: string | null;
  administered_by?: string | null;
  batch_number?: string | null;
  notes?: string | null;
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const SEVERITY_OPTIONS: Array<{ v: MedicalVisit['severity']; en: string; bn: string }> = [
  { v: 'mild', en: 'Mild', bn: 'সামান্য' },
  { v: 'moderate', en: 'Moderate', bn: 'মাঝারি' },
  { v: 'severe', en: 'Severe', bn: 'গুরুতর' },
  { v: 'emergency', en: 'Emergency', bn: 'জরুরি' },
];

const severityVariant = (s: string) => {
  if (s === 'emergency') return 'destructive';
  if (s === 'severe') return 'destructive';
  if (s === 'moderate') return 'secondary';
  return 'outline';
};

const AdminHealthRecords = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  // Permission & approval workflow (one menuPath, three target tables)
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/health-records');
  const profApproval = useApprovalCheck('/admin/health-records', 'health_profiles');
  const visitApproval = useApprovalCheck('/admin/health-records', 'medical_visits');
  const vaccApproval = useApprovalCheck('/admin/health-records', 'vaccinations');

  // ─── Roster (students + staff) ─────────────────────────────────────────
  const { data: students = [] } = useQuery({
    queryKey: ['health-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name_bn, name_en, student_id')
        .is('deleted_at', null)
        .order('name_bn');
      if (error) throw error;
      return data as Array<{ id: string; name_bn: string; name_en?: string | null; student_id: string }>;
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['health-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, staff_id')
        .order('name_bn');
      if (error) throw error;
      return data as Array<{ id: string; name_bn: string; name_en?: string | null; staff_id?: string | null }>;
    },
  });

  // Institution info for printable report header
  const { data: institution } = useQuery({
    queryKey: ['institution-default-health'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  /**
   * Render a label for a person referenced by a health record.
   * Accepts the raw record so person type is resolved from the populated id
   * field via the shared `resolvePersonType` utility (tolerates legacy rows
   * where person_type disagrees with which id is set).
   */
  const personLabel = (record: PersonTypeInput) => {
    const { resolvedType, personId } = resolvePersonType(record);
    if (!personId) return '—';
    if (resolvedType === 'student') {
      const s = students.find(x => x.id === personId);
      if (!s) return '—';
      return `${bn ? s.name_bn : (s.name_en || s.name_bn)} (${s.student_id})`;
    }
    const st = staff.find(x => x.id === personId);
    if (!st) return '—';
    return `${bn ? st.name_bn : (st.name_en || st.name_bn)}${st.staff_id ? ` (${st.staff_id})` : ''}`;
  };

  // ─── Health Profiles ───────────────────────────────────────────────────
  const { data: profiles = [] } = useQuery({
    queryKey: ['health-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_profiles' as any)
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as HealthProfile[];
    },
  });

  const [profDlg, setProfDlg] = useState(false);
  const [editProf, setEditProf] = useState<HealthProfile | null>(null);
  const [profForm, setProfForm] = useState<Partial<HealthProfile>>({ person_type: 'student' });
  const [delProfId, setDelProfId] = useState<string | null>(null);

  const saveProf = useMutation({
    mutationFn: async (payload: Partial<HealthProfile>) => {
      const clean: any = { ...payload };
      if (clean.person_type === 'student') clean.staff_id = null;
      else clean.student_id = null;
      if (editProf) {
        if (await profApproval.checkApproval('edit', clean, editProf.id, bn ? 'হেলথ প্রোফাইল সম্পাদনা' : 'Edit health profile')) return;
        const { error } = await supabase.from('health_profiles' as any).update(clean).eq('id', editProf.id);
        if (error) throw error;
      } else {
        if (await profApproval.checkApproval('add', clean, undefined, bn ? 'নতুন হেলথ প্রোফাইল' : 'New health profile')) return;
        const { error } = await supabase.from('health_profiles' as any).insert(clean);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-profiles'] });
      setProfDlg(false); setEditProf(null); setProfForm({ person_type: 'student' });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteProf = useMutation({
    mutationFn: async (id: string) => {
      if (await profApproval.checkApproval('delete', { id }, id, bn ? 'হেলথ প্রোফাইল মুছুন' : 'Delete health profile')) return;
      const { error } = await supabase.from('health_profiles' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health-profiles'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelProfId(null); },
  });

  // ─── Medical Visits ────────────────────────────────────────────────────
  const { data: visits = [] } = useQuery({
    queryKey: ['medical-visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_visits' as any)
        .select('*')
        .is('deleted_at', null)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return data as unknown as MedicalVisit[];
    },
  });

  const [visitDlg, setVisitDlg] = useState(false);
  const [editVisit, setEditVisit] = useState<MedicalVisit | null>(null);
  const [visitForm, setVisitForm] = useState<Partial<MedicalVisit>>({ person_type: 'student', severity: 'mild', visit_date: new Date().toISOString().split('T')[0] });
  const [delVisitId, setDelVisitId] = useState<string | null>(null);

  const saveVisit = useMutation({
    mutationFn: async (payload: Partial<MedicalVisit>) => {
      const clean: any = { ...payload };
      if (clean.person_type === 'student') clean.staff_id = null;
      else clean.student_id = null;
      ['temperature_c', 'pulse_rate'].forEach(k => {
        if (clean[k] === '' || clean[k] === undefined) clean[k] = null;
        else if (clean[k] !== null) clean[k] = Number(clean[k]);
      });
      if (editVisit) {
        if (await visitApproval.checkApproval('edit', clean, editVisit.id, bn ? 'মেডিকেল ভিজিট সম্পাদনা' : 'Edit medical visit')) return;
        const { error } = await supabase.from('medical_visits' as any).update(clean).eq('id', editVisit.id);
        if (error) throw error;
      } else {
        if (await visitApproval.checkApproval('add', clean, undefined, bn ? 'নতুন মেডিকেল ভিজিট' : 'New medical visit')) return;
        const { error } = await supabase.from('medical_visits' as any).insert(clean);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-visits'] });
      setVisitDlg(false); setEditVisit(null);
      setVisitForm({ person_type: 'student', severity: 'mild', visit_date: new Date().toISOString().split('T')[0] });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteVisit = useMutation({
    mutationFn: async (id: string) => {
      if (await visitApproval.checkApproval('delete', { id }, id, bn ? 'ভিজিট মুছুন' : 'Delete visit')) return;
      const { error } = await supabase.from('medical_visits' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['medical-visits'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelVisitId(null); },
  });

  // ─── Vaccinations ──────────────────────────────────────────────────────
  const { data: vaccinations = [] } = useQuery({
    queryKey: ['vaccinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vaccinations' as any)
        .select('*')
        .is('deleted_at', null)
        .order('vaccination_date', { ascending: false });
      if (error) throw error;
      return data as unknown as Vaccination[];
    },
  });

  const [vaccDlg, setVaccDlg] = useState(false);
  const [editVacc, setEditVacc] = useState<Vaccination | null>(null);
  const [vaccForm, setVaccForm] = useState<Partial<Vaccination>>({ person_type: 'student', dose_number: 1, vaccination_date: new Date().toISOString().split('T')[0] });
  const [delVaccId, setDelVaccId] = useState<string | null>(null);

  const saveVacc = useMutation({
    mutationFn: async (payload: Partial<Vaccination>) => {
      const clean: any = { ...payload };
      if (clean.person_type === 'student') clean.staff_id = null;
      else clean.student_id = null;
      clean.dose_number = Number(clean.dose_number) || 1;
      if (editVacc) {
        if (await vaccApproval.checkApproval('edit', clean, editVacc.id, bn ? 'টিকা সম্পাদনা' : 'Edit vaccination')) return;
        const { error } = await supabase.from('vaccinations' as any).update(clean).eq('id', editVacc.id);
        if (error) throw error;
      } else {
        if (await vaccApproval.checkApproval('add', clean, undefined, bn ? 'নতুন টিকা' : 'New vaccination')) return;
        const { error } = await supabase.from('vaccinations' as any).insert(clean);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccinations'] });
      setVaccDlg(false); setEditVacc(null);
      setVaccForm({ person_type: 'student', dose_number: 1, vaccination_date: new Date().toISOString().split('T')[0] });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteVacc = useMutation({
    mutationFn: async (id: string) => {
      if (await vaccApproval.checkApproval('delete', { id }, id, bn ? 'টিকা মুছুন' : 'Delete vaccination')) return;
      const { error } = await supabase.from('vaccinations' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vaccinations'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelVaccId(null); },
  });

  // ─── KPIs ──────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
    const visitsThisMonth = visits.filter(v => new Date(v.visit_date) >= monthAgo).length;
    const emergencies = visits.filter(v => v.severity === 'emergency' || v.severity === 'severe').length;
    const dueVaccines = vaccinations.filter(v => v.next_due_date && new Date(v.next_due_date) <= new Date(today.getTime() + 30 * 86400000) && new Date(v.next_due_date) >= today).length;
    return { profiles: profiles.length, visitsMonth: visitsThisMonth, emergencies, dueVaccines };
  }, [profiles, visits, vaccinations]);

  // ─── Printable Health Summary ──────────────────────────────────────────
  const printSummary = (profile: HealthProfile) => {
    // Use the shared resolver so person type is determined from the populated
    // id field (tolerant of legacy rows where person_type disagrees).
    const resolved = resolvePersonType(profile);
    const { resolvedType, personId, ambiguous, missing, mismatch } = resolved;
    const personName = personLabel(profile);

    // ─── Debug-safe cross-check ──────────────────────────────────────────
    if (ambiguous) {
      const msg = bn
        ? `⚠️ এই প্রোফাইলে student_id ও staff_id দুটোই আছে — "${resolvedType === 'student' ? 'ছাত্র' : 'স্টাফ'}" হিসেবে প্রিন্ট করা হচ্ছে।`
        : `⚠️ Profile has BOTH student_id and staff_id — printing as "${resolvedType}".`;
      toast({ title: bn ? 'অস্পষ্ট ম্যাপিং' : 'Ambiguous mapping', description: msg, variant: 'destructive' });
      console.warn('[HealthSummary] Ambiguous profile id mapping', {
        profileId: profile.id, person_type: profile.person_type,
        student_id: profile.student_id, staff_id: profile.staff_id, resolvedType,
      });
    } else if (missing) {
      toast({
        title: bn ? 'কোনো আইডি নেই' : 'No linked ID',
        description: bn
          ? 'এই প্রোফাইলে student_id বা staff_id কোনোটাই নেই — সম্পর্কিত ভিজিট/টিকা পাওয়া যাবে না।'
          : 'Profile has neither student_id nor staff_id — related visits/vaccinations cannot be matched.',
        variant: 'destructive',
      });
      console.warn('[HealthSummary] Profile missing both ids', { profileId: profile.id, person_type: profile.person_type });
    } else if (mismatch) {
      console.warn('[HealthSummary] person_type mismatch — using id-based resolution', {
        profileId: profile.id, declared: profile.person_type, resolvedType,
      });
    }
    console.info('[HealthSummary] matched on', resolvedType + '_id', '=', personId, 'for profile', profile.id);

    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 86400000);
    const next30 = new Date(today.getTime() + 30 * 86400000);

    // Match related records strictly against the resolved id+side so a mis-set
    // person_type can never cross-link a student's id to a staff record (or vice versa).
    const matchesPerson = makePersonMatcher(resolved);

    const personVisits = visits
      .filter(matchesPerson)
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    const lastVisit = personVisits[0];
    const recentVisits = personVisits.filter(v => new Date(v.visit_date) >= monthAgo);

    const sevCount: Record<string, number> = { mild: 0, moderate: 0, severe: 0, emergency: 0 };
    recentVisits.forEach(v => { sevCount[v.severity] = (sevCount[v.severity] || 0) + 1; });

    const personVaccs = vaccinations
      .filter(matchesPerson)
      .sort((a, b) => new Date(b.vaccination_date).getTime() - new Date(a.vaccination_date).getTime());
    const upcomingDue = personVaccs.filter(v =>
      v.next_due_date && new Date(v.next_due_date) >= today && new Date(v.next_due_date) <= next30
    );

    const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
    const sevLabel = (s: string) => SEVERITY_OPTIONS.find(o => o.v === s);

    const summaryStats: ReportSummaryStat[] = [
      { label_bn: 'মোট ভিজিট', label_en: 'Total Visits', value: personVisits.length, tone: 'accent' },
      { label_bn: '৩০ দিনে ভিজিট', label_en: 'Visits (30d)', value: recentVisits.length, tone: 'neutral' },
      { label_bn: 'গুরুতর/জরুরি', label_en: 'Severe/Emergency', value: (sevCount.severe || 0) + (sevCount.emergency || 0), tone: 'negative' },
      { label_bn: 'আসন্ন টিকা', label_en: 'Upcoming Vaccines', value: upcomingDue.length, tone: 'positive' },
    ];

    const sections: ReportSection[] = [
      {
        title_bn: 'প্রোফাইল তথ্য',
        title_en: 'Profile Information',
        headers: [{ bn: 'ক্ষেত্র', en: 'Field' }, { bn: 'মান', en: 'Value' }],
        rows: [
          [bn ? 'নাম' : 'Name', personName],
          [bn ? 'ধরন' : 'Type', resolvedType === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'স্টাফ' : 'Staff')],
          [bn ? 'রক্তের গ্রুপ' : 'Blood Group', profile.blood_group || '—'],
          [bn ? 'উচ্চতা' : 'Height', profile.height_cm ? `${profile.height_cm} cm` : '—'],
          [bn ? 'ওজন' : 'Weight', profile.weight_kg ? `${profile.weight_kg} kg` : '—'],
          [bn ? 'এলার্জি' : 'Allergies', profile.allergies || '—'],
          [bn ? 'দীর্ঘমেয়াদী রোগ' : 'Chronic Conditions', profile.chronic_conditions || '—'],
          [bn ? 'বর্তমান ঔষধ' : 'Current Medications', profile.current_medications || '—'],
          [bn ? 'পারিবারিক ইতিহাস' : 'Family History', profile.family_history || '—'],
          [bn ? 'জরুরি যোগাযোগ' : 'Emergency Contact',
            profile.emergency_contact_name
              ? `${profile.emergency_contact_name}${profile.emergency_contact_phone ? ' • ' + profile.emergency_contact_phone : ''}${profile.emergency_contact_relation ? ' (' + profile.emergency_contact_relation + ')' : ''}`
              : '—'],
        ],
      },
      {
        title_bn: 'সর্বশেষ ভিজিট',
        title_en: 'Last Medical Visit',
        headers: [{ bn: 'ক্ষেত্র', en: 'Field' }, { bn: 'মান', en: 'Value' }],
        rows: lastVisit ? [
          [bn ? 'তারিখ' : 'Date', fmt(lastVisit.visit_date) + (lastVisit.visit_time ? ` ${lastVisit.visit_time}` : '')],
          [bn ? 'লক্ষণ' : 'Symptoms', lastVisit.symptoms || '—'],
          [bn ? 'ডায়াগনোসিস' : 'Diagnosis', lastVisit.diagnosis || '—'],
          [bn ? 'চিকিৎসা' : 'Treatment', lastVisit.treatment || '—'],
          [bn ? 'প্রেসক্রিপশন' : 'Prescription', lastVisit.prescription || '—'],
          [bn ? 'গুরুত্ব' : 'Severity', sevLabel(lastVisit.severity) ? `${sevLabel(lastVisit.severity)!.bn} / ${sevLabel(lastVisit.severity)!.en}` : lastVisit.severity],
          [bn ? 'তাপমাত্রা' : 'Temperature', lastVisit.temperature_c ? `${lastVisit.temperature_c} °C` : '—'],
          [bn ? 'রক্তচাপ' : 'Blood Pressure', lastVisit.blood_pressure || '—'],
          [bn ? 'নাড়ির গতি' : 'Pulse', lastVisit.pulse_rate ? `${lastVisit.pulse_rate} bpm` : '—'],
          [bn ? 'ফলোআপ' : 'Follow-up', fmt(lastVisit.follow_up_date)],
          [bn ? 'প্রদানকারী' : 'Attended By', lastVisit.attended_by || '—'],
        ] : [],
      },
      {
        title_bn: 'গত ৩০ দিনের ভিজিট ও গুরুত্ব',
        title_en: 'Last 30 Days — Visits & Severity',
        headers: [
          { bn: 'তারিখ', en: 'Date' },
          { bn: 'লক্ষণ', en: 'Symptoms' },
          { bn: 'ডায়াগনোসিস', en: 'Diagnosis' },
          { bn: 'গুরুত্ব', en: 'Severity' },
          { bn: 'ফলোআপ', en: 'Follow-up' },
        ],
        rows: recentVisits.map(v => [
          fmt(v.visit_date),
          v.symptoms || '—',
          v.diagnosis || '—',
          sevLabel(v.severity) ? `${sevLabel(v.severity)!.bn} / ${sevLabel(v.severity)!.en}` : v.severity,
          fmt(v.follow_up_date),
        ]),
        totals: [
          { bn: 'সামান্য', en: 'Mild', value: sevCount.mild || 0 },
          { bn: 'মাঝারি', en: 'Moderate', value: sevCount.moderate || 0 },
          { bn: 'গুরুতর', en: 'Severe', value: sevCount.severe || 0 },
          { bn: 'জরুরি', en: 'Emergency', value: sevCount.emergency || 0 },
        ],
      },
      {
        title_bn: 'পরবর্তী ৩০ দিনে টিকার ডিউ',
        title_en: 'Vaccinations Due (Next 30 Days)',
        headers: [
          { bn: 'টিকার নাম', en: 'Vaccine' },
          { bn: 'শেষ ডোজ', en: 'Last Dose' },
          { bn: 'ডোজ #', en: 'Dose #' },
          { bn: 'পরবর্তী ডিউ', en: 'Next Due' },
          { bn: 'প্রদানকারী', en: 'Administered By' },
        ],
        rows: upcomingDue.map(v => [
          bn ? (v.vaccine_name_bn || v.vaccine_name) : v.vaccine_name,
          fmt(v.vaccination_date),
          v.dose_number,
          fmt(v.next_due_date),
          v.administered_by || '—',
        ]),
      },
      {
        title_bn: 'টিকার সম্পূর্ণ ইতিহাস',
        title_en: 'Complete Vaccination History',
        headers: [
          { bn: 'তারিখ', en: 'Date' },
          { bn: 'টিকার নাম', en: 'Vaccine' },
          { bn: 'ডোজ #', en: 'Dose #' },
          { bn: 'ব্যাচ', en: 'Batch' },
          { bn: 'প্রদানকারী', en: 'By' },
        ],
        rows: personVaccs.map(v => [
          fmt(v.vaccination_date),
          bn ? (v.vaccine_name_bn || v.vaccine_name) : v.vaccine_name,
          v.dose_number,
          v.batch_number || '—',
          v.administered_by || '—',
        ]),
      },
    ];

    generateBilingualReport(
      {
        institution_name: institution?.name || (bn ? 'প্রতিষ্ঠান' : 'Institution'),
        institution_name_en: (institution as any)?.name_en || institution?.name || 'Institution',
        address: institution?.address || '',
        phone: institution?.phone || '',
        email: (institution as any)?.email || '',
        logo_url: institution?.logo_url || undefined,
        report_title_bn: `স্বাস্থ্য সারসংক্ষেপ — ${personName}`,
        report_title_en: `Health Summary — ${personName}`,
        period_label_bn: `তারিখ পর্যন্ত: ${today.toLocaleDateString('bn-BD')}`,
        period_label_en: `As of: ${today.toLocaleDateString('en-GB')}`,
      },
      sections,
      summaryStats,
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-3">
          <HeartPulse className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{bn ? 'হেলথ ও মেডিকেল রেকর্ড' : 'Health & Medical Records'}</h1>
          <p className="text-sm text-muted-foreground">{bn ? 'ছাত্র ও স্টাফদের স্বাস্থ্য তথ্য, ভিজিট লগ ও টিকা ব্যবস্থাপনা' : 'Manage health profiles, medical visits and vaccinations'}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{kpis.profiles}</div>
              <div className="text-xs text-muted-foreground">{bn ? 'হেলথ প্রোফাইল' : 'Health Profiles'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{kpis.visitsMonth}</div>
              <div className="text-xs text-muted-foreground">{bn ? '৩০ দিনে ভিজিট' : 'Visits (30d)'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <div className="text-2xl font-bold">{kpis.emergencies}</div>
              <div className="text-xs text-muted-foreground">{bn ? 'গুরুতর/জরুরি কেস' : 'Severe/Emergency'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{kpis.dueVaccines}</div>
              <div className="text-xs text-muted-foreground">{bn ? '৩০ দিনে টিকার ডিউ' : 'Vaccines Due (30d)'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="profiles"><Users className="h-4 w-4 mr-1" />{bn ? 'প্রোফাইল' : 'Profiles'}</TabsTrigger>
          <TabsTrigger value="visits"><Stethoscope className="h-4 w-4 mr-1" />{bn ? 'ভিজিট' : 'Visits'}</TabsTrigger>
          <TabsTrigger value="vaccines"><Syringe className="h-4 w-4 mr-1" />{bn ? 'টিকা' : 'Vaccines'}</TabsTrigger>
        </TabsList>

        {/* ─── PROFILES TAB ────────────────────────────────────────────── */}
        <TabsContent value="profiles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'হেলথ প্রোফাইলসমূহ' : 'Health Profiles'}</CardTitle>
              {canAddItem && (
                <Button onClick={() => { setEditProf(null); setProfForm({ person_type: 'student' }); setProfDlg(true); }}>
                  <Plus className="h-4 w-4 mr-1" />{bn ? 'নতুন প্রোফাইল' : 'Add Profile'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'ব্যক্তি' : 'Person'}</TableHead>
                      <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                      <TableHead>{bn ? 'রক্তের গ্রুপ' : 'Blood'}</TableHead>
                      <TableHead>{bn ? 'উচ্চতা/ওজন' : 'H/W'}</TableHead>
                      <TableHead>{bn ? 'এলার্জি' : 'Allergies'}</TableHead>
                      <TableHead>{bn ? 'জরুরি যোগাযোগ' : 'Emergency'}</TableHead>
                      <TableHead className="text-right">{bn ? 'কাজ' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{bn ? 'কোনো প্রোফাইল নেই' : 'No profiles yet'}</TableCell></TableRow>
                    )}
                    {profiles.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{personLabel(p)}</TableCell>
                        <TableCell><Badge variant="outline">{resolvePersonType(p).resolvedType === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'স্টাফ' : 'Staff')}</Badge></TableCell>
                        <TableCell>{p.blood_group || '—'}</TableCell>
                        <TableCell>{p.height_cm ? `${p.height_cm}cm` : '—'} / {p.weight_kg ? `${p.weight_kg}kg` : '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.allergies || '—'}</TableCell>
                        <TableCell>{p.emergency_contact_name ? `${p.emergency_contact_name} (${p.emergency_contact_phone || ''})` : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" title={bn ? 'প্রিন্ট সারসংক্ষেপ' : 'Print Summary'} onClick={() => printSummary(p)}>
                            <Printer className="h-4 w-4 text-primary" />
                          </Button>
                          {canEditItem && (
                            <Button size="icon" variant="ghost" onClick={() => { setEditProf(p); setProfForm(p); setProfDlg(true); }}><Pencil className="h-4 w-4" /></Button>
                          )}
                          {canDeleteItem && (
                            <Button size="icon" variant="ghost" onClick={() => setDelProfId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── VISITS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="visits">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'মেডিকেল ভিজিট' : 'Medical Visits'}</CardTitle>
              {canAddItem && (
                <Button onClick={() => { setEditVisit(null); setVisitForm({ person_type: 'student', severity: 'mild', visit_date: new Date().toISOString().split('T')[0] }); setVisitDlg(true); }}>
                  <Plus className="h-4 w-4 mr-1" />{bn ? 'নতুন ভিজিট' : 'Add Visit'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                      <TableHead>{bn ? 'ব্যক্তি' : 'Person'}</TableHead>
                      <TableHead>{bn ? 'লক্ষণ' : 'Symptoms'}</TableHead>
                      <TableHead>{bn ? 'ডায়াগনোসিস' : 'Diagnosis'}</TableHead>
                      <TableHead>{bn ? 'গুরুত্ব' : 'Severity'}</TableHead>
                      <TableHead>{bn ? 'ফলোআপ' : 'Follow-up'}</TableHead>
                      <TableHead className="text-right">{bn ? 'কাজ' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{bn ? 'কোনো ভিজিট নেই' : 'No visits yet'}</TableCell></TableRow>
                    )}
                    {visits.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>{v.visit_date}</TableCell>
                        <TableCell className="font-medium">{personLabel(v.person_type, v.student_id, v.staff_id)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{v.symptoms || '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{v.diagnosis || '—'}</TableCell>
                        <TableCell><Badge variant={severityVariant(v.severity) as any}>{SEVERITY_OPTIONS.find(s => s.v === v.severity)?.[bn ? 'bn' : 'en']}</Badge></TableCell>
                        <TableCell>{v.follow_up_date || '—'}</TableCell>
                        <TableCell className="text-right">
                          {canEditItem && (
                            <Button size="icon" variant="ghost" onClick={() => { setEditVisit(v); setVisitForm(v); setVisitDlg(true); }}><Pencil className="h-4 w-4" /></Button>
                          )}
                          {canDeleteItem && (
                            <Button size="icon" variant="ghost" onClick={() => setDelVisitId(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── VACCINATIONS TAB ────────────────────────────────────────── */}
        <TabsContent value="vaccines">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'টিকার রেকর্ড' : 'Vaccination Records'}</CardTitle>
              {canAddItem && (
                <Button onClick={() => { setEditVacc(null); setVaccForm({ person_type: 'student', dose_number: 1, vaccination_date: new Date().toISOString().split('T')[0] }); setVaccDlg(true); }}>
                  <Plus className="h-4 w-4 mr-1" />{bn ? 'টিকা যোগ' : 'Add Vaccine'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                      <TableHead>{bn ? 'ব্যক্তি' : 'Person'}</TableHead>
                      <TableHead>{bn ? 'টিকার নাম' : 'Vaccine'}</TableHead>
                      <TableHead>{bn ? 'ডোজ' : 'Dose'}</TableHead>
                      <TableHead>{bn ? 'পরবর্তী ডিউ' : 'Next Due'}</TableHead>
                      <TableHead>{bn ? 'প্রদানকারী' : 'By'}</TableHead>
                      <TableHead className="text-right">{bn ? 'কাজ' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vaccinations.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{bn ? 'কোনো রেকর্ড নেই' : 'No records yet'}</TableCell></TableRow>
                    )}
                    {vaccinations.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>{v.vaccination_date}</TableCell>
                        <TableCell className="font-medium">{personLabel(v.person_type, v.student_id, v.staff_id)}</TableCell>
                        <TableCell>{bn ? (v.vaccine_name_bn || v.vaccine_name) : v.vaccine_name}</TableCell>
                        <TableCell><Badge variant="outline">#{v.dose_number}</Badge></TableCell>
                        <TableCell>{v.next_due_date || '—'}</TableCell>
                        <TableCell>{v.administered_by || '—'}</TableCell>
                        <TableCell className="text-right">
                          {canEditItem && (
                            <Button size="icon" variant="ghost" onClick={() => { setEditVacc(v); setVaccForm(v); setVaccDlg(true); }}><Pencil className="h-4 w-4" /></Button>
                          )}
                          {canDeleteItem && (
                            <Button size="icon" variant="ghost" onClick={() => setDelVaccId(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── PROFILE DIALOG ────────────────────────────────────────────── */}
      <Dialog open={profDlg} onOpenChange={setProfDlg}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProf ? (bn ? 'প্রোফাইল সম্পাদনা' : 'Edit Profile') : (bn ? 'নতুন হেলথ প্রোফাইল' : 'New Health Profile')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{bn ? 'ব্যক্তির ধরন' : 'Person Type'}</Label>
              <Select value={profForm.person_type} onValueChange={(v: PersonType) => setProfForm({ ...profForm, person_type: v, student_id: null, staff_id: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
                  <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{profForm.person_type === 'student' ? (bn ? 'ছাত্র নির্বাচন' : 'Select Student') : (bn ? 'স্টাফ নির্বাচন' : 'Select Staff')}</Label>
              <Select
                value={profForm.person_type === 'student' ? (profForm.student_id || '') : (profForm.staff_id || '')}
                onValueChange={(v) => profForm.person_type === 'student' ? setProfForm({ ...profForm, student_id: v }) : setProfForm({ ...profForm, staff_id: v })}
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(profForm.person_type === 'student' ? students : staff).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : (p.name_en || p.name_bn)} ({p.student_id || p.staff_id || ''})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'রক্তের গ্রুপ' : 'Blood Group'}</Label>
              <Select value={profForm.blood_group || ''} onValueChange={(v) => setProfForm({ ...profForm, blood_group: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{bn ? 'উচ্চতা (cm)' : 'Height (cm)'}</Label>
                <Input type="number" value={profForm.height_cm || ''} onChange={(e) => setProfForm({ ...profForm, height_cm: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>{bn ? 'ওজন (kg)' : 'Weight (kg)'}</Label>
                <Input type="number" value={profForm.weight_kg || ''} onChange={(e) => setProfForm({ ...profForm, weight_kg: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'এলার্জি' : 'Allergies'}</Label>
              <Textarea value={profForm.allergies || ''} onChange={(e) => setProfForm({ ...profForm, allergies: e.target.value })} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'দীর্ঘমেয়াদী রোগ' : 'Chronic Conditions'}</Label>
              <Textarea value={profForm.chronic_conditions || ''} onChange={(e) => setProfForm({ ...profForm, chronic_conditions: e.target.value })} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'বর্তমান ঔষধ' : 'Current Medications'}</Label>
              <Textarea value={profForm.current_medications || ''} onChange={(e) => setProfForm({ ...profForm, current_medications: e.target.value })} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'পারিবারিক ইতিহাস' : 'Family History'}</Label>
              <Textarea value={profForm.family_history || ''} onChange={(e) => setProfForm({ ...profForm, family_history: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>{bn ? 'জরুরি যোগাযোগ - নাম' : 'Emergency Contact Name'}</Label>
              <Input value={profForm.emergency_contact_name || ''} onChange={(e) => setProfForm({ ...profForm, emergency_contact_name: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'ফোন' : 'Phone'}</Label>
              <Input value={profForm.emergency_contact_phone || ''} onChange={(e) => setProfForm({ ...profForm, emergency_contact_phone: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'সম্পর্ক' : 'Relation'}</Label>
              <Input value={profForm.emergency_contact_relation || ''} onChange={(e) => setProfForm({ ...profForm, emergency_contact_relation: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveProf.mutate(profForm)} disabled={saveProf.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VISIT DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={visitDlg} onOpenChange={setVisitDlg}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editVisit ? (bn ? 'ভিজিট সম্পাদনা' : 'Edit Visit') : (bn ? 'নতুন মেডিকেল ভিজিট' : 'New Medical Visit')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{bn ? 'ব্যক্তির ধরন' : 'Person Type'}</Label>
              <Select value={visitForm.person_type} onValueChange={(v: PersonType) => setVisitForm({ ...visitForm, person_type: v, student_id: null, staff_id: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
                  <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{visitForm.person_type === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'স্টাফ' : 'Staff')}</Label>
              <Select
                value={visitForm.person_type === 'student' ? (visitForm.student_id || '') : (visitForm.staff_id || '')}
                onValueChange={(v) => visitForm.person_type === 'student' ? setVisitForm({ ...visitForm, student_id: v }) : setVisitForm({ ...visitForm, staff_id: v })}
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(visitForm.person_type === 'student' ? students : staff).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : (p.name_en || p.name_bn)} ({p.student_id || p.staff_id || ''})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'ভিজিটের তারিখ' : 'Visit Date'}</Label>
              <Input type="date" value={visitForm.visit_date || ''} onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'সময়' : 'Time'}</Label>
              <Input type="time" value={visitForm.visit_time || ''} onChange={(e) => setVisitForm({ ...visitForm, visit_time: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'লক্ষণ' : 'Symptoms'}</Label>
              <Textarea value={visitForm.symptoms || ''} onChange={(e) => setVisitForm({ ...visitForm, symptoms: e.target.value })} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'ডায়াগনোসিস' : 'Diagnosis'}</Label>
              <Textarea value={visitForm.diagnosis || ''} onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'চিকিৎসা / প্রেসক্রিপশন' : 'Treatment / Prescription'}</Label>
              <Textarea value={visitForm.prescription || ''} onChange={(e) => setVisitForm({ ...visitForm, prescription: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>{bn ? 'তাপমাত্রা (°C)' : 'Temperature (°C)'}</Label>
              <Input type="number" step="0.1" value={visitForm.temperature_c || ''} onChange={(e) => setVisitForm({ ...visitForm, temperature_c: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>{bn ? 'রক্তচাপ' : 'Blood Pressure'}</Label>
              <Input placeholder="120/80" value={visitForm.blood_pressure || ''} onChange={(e) => setVisitForm({ ...visitForm, blood_pressure: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'পালস (bpm)' : 'Pulse (bpm)'}</Label>
              <Input type="number" value={visitForm.pulse_rate || ''} onChange={(e) => setVisitForm({ ...visitForm, pulse_rate: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>{bn ? 'গুরুত্ব' : 'Severity'}</Label>
              <Select value={visitForm.severity} onValueChange={(v: any) => setVisitForm({ ...visitForm, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(s => <SelectItem key={s.v} value={s.v}>{bn ? s.bn : s.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'চিকিৎসক / স্টাফ' : 'Attended By'}</Label>
              <Input value={visitForm.attended_by || ''} onChange={(e) => setVisitForm({ ...visitForm, attended_by: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'ফলোআপ তারিখ' : 'Follow-up Date'}</Label>
              <Input type="date" value={visitForm.follow_up_date || ''} onChange={(e) => setVisitForm({ ...visitForm, follow_up_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'নোট' : 'Notes'}</Label>
              <Textarea value={visitForm.notes || ''} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveVisit.mutate(visitForm)} disabled={saveVisit.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VACCINATION DIALOG ────────────────────────────────────────── */}
      <Dialog open={vaccDlg} onOpenChange={setVaccDlg}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editVacc ? (bn ? 'টিকা সম্পাদনা' : 'Edit Vaccine') : (bn ? 'নতুন টিকা' : 'New Vaccine')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{bn ? 'ব্যক্তির ধরন' : 'Person Type'}</Label>
              <Select value={vaccForm.person_type} onValueChange={(v: PersonType) => setVaccForm({ ...vaccForm, person_type: v, student_id: null, staff_id: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
                  <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{vaccForm.person_type === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'স্টাফ' : 'Staff')}</Label>
              <Select
                value={vaccForm.person_type === 'student' ? (vaccForm.student_id || '') : (vaccForm.staff_id || '')}
                onValueChange={(v) => vaccForm.person_type === 'student' ? setVaccForm({ ...vaccForm, student_id: v }) : setVaccForm({ ...vaccForm, staff_id: v })}
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(vaccForm.person_type === 'student' ? students : staff).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : (p.name_en || p.name_bn)} ({p.student_id || p.staff_id || ''})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'টিকার নাম (English)' : 'Vaccine Name (English)'}</Label>
              <Input value={vaccForm.vaccine_name || ''} onChange={(e) => setVaccForm({ ...vaccForm, vaccine_name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'টিকার নাম (বাংলা)' : 'Vaccine Name (Bangla)'}</Label>
              <Input value={vaccForm.vaccine_name_bn || ''} onChange={(e) => setVaccForm({ ...vaccForm, vaccine_name_bn: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'ডোজ নম্বর' : 'Dose Number'}</Label>
              <Input type="number" value={vaccForm.dose_number || 1} onChange={(e) => setVaccForm({ ...vaccForm, dose_number: Number(e.target.value) })} />
            </div>
            <div>
              <Label>{bn ? 'ব্যাচ নম্বর' : 'Batch Number'}</Label>
              <Input value={vaccForm.batch_number || ''} onChange={(e) => setVaccForm({ ...vaccForm, batch_number: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'টিকা প্রদানের তারিখ' : 'Vaccination Date'}</Label>
              <Input type="date" value={vaccForm.vaccination_date || ''} onChange={(e) => setVaccForm({ ...vaccForm, vaccination_date: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'পরবর্তী ডিউ তারিখ' : 'Next Due Date'}</Label>
              <Input type="date" value={vaccForm.next_due_date || ''} onChange={(e) => setVaccForm({ ...vaccForm, next_due_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'প্রদানকারী' : 'Administered By'}</Label>
              <Input value={vaccForm.administered_by || ''} onChange={(e) => setVaccForm({ ...vaccForm, administered_by: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>{bn ? 'নোট' : 'Notes'}</Label>
              <Textarea value={vaccForm.notes || ''} onChange={(e) => setVaccForm({ ...vaccForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVaccDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveVacc.mutate(vaccForm)} disabled={saveVacc.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!delProfId} onOpenChange={(o) => !o && setDelProfId(null)} onConfirm={() => delProfId && deleteProf.mutate(delProfId)} />
      <DeleteConfirmDialog open={!!delVisitId} onOpenChange={(o) => !o && setDelVisitId(null)} onConfirm={() => delVisitId && deleteVisit.mutate(delVisitId)} />
      <DeleteConfirmDialog open={!!delVaccId} onOpenChange={(o) => !o && setDelVaccId(null)} onConfirm={() => delVaccId && deleteVacc.mutate(delVaccId)} />
    </div>
  );
};

export default AdminHealthRecords;
