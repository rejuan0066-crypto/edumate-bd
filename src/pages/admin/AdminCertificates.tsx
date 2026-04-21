import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Award, FileText, ScrollText, Printer, Trash2, Plus, Search, Loader2, GraduationCap, Palette, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import SearchableSelect from '@/components/SearchableSelect';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import CertificateTemplateDesigner from '@/components/admin/CertificateTemplateDesigner';
import { renderCertificateHTML, mergeTemplate, CertTemplateConfig, CertType as RenderCertType } from '@/lib/certificateTemplate';

type CertType = 'certificate' | 'transfer' | 'testimonial';

const TYPE_META: Record<CertType, { bn: string; en: string; icon: any; titleBn: string; titleEn: string; color: string }> = {
  certificate: {
    bn: 'সার্টিফিকেট', en: 'Certificate', icon: Award,
    titleBn: 'প্রশংসা সনদপত্র', titleEn: 'Certificate of Achievement',
    color: 'from-amber-500 to-orange-500',
  },
  transfer: {
    bn: 'ছাড়পত্র', en: 'Transfer Certificate', icon: FileText,
    titleBn: 'ছাড়পত্র', titleEn: 'Transfer Certificate',
    color: 'from-blue-500 to-cyan-500',
  },
  testimonial: {
    bn: 'প্রশংসাপত্র', en: 'Testimonial', icon: ScrollText,
    titleBn: 'প্রশংসাপত্র', titleEn: 'Testimonial',
    color: 'from-emerald-500 to-teal-500',
  },
};

const CERT_CATEGORIES: { key: string; bn: string; en: string }[] = [
  { key: 'academic', bn: 'একাডেমিক কৃতিত্ব', en: 'Academic Achievement' },
  { key: 'attendance', bn: 'নিয়মিত উপস্থিতি', en: 'Regular Attendance' },
  { key: 'participation', bn: 'অংশগ্রহণ', en: 'Participation' },
  { key: 'sports', bn: 'ক্রীড়া কৃতিত্ব', en: 'Sports Achievement' },
  { key: 'cultural', bn: 'সাংস্কৃতিক কৃতিত্ব', en: 'Cultural Achievement' },
  { key: 'leadership', bn: 'নেতৃত্ব', en: 'Leadership' },
  { key: 'merit', bn: 'মেধা পুরস্কার', en: 'Merit Award' },
  { key: 'completion', bn: 'কোর্স সম্পন্ন', en: 'Course Completion' },
];

const AdminCertificates = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CertType>('certificate');
  const [issueOpen, setIssueOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [printLangCert, setPrintLangCert] = useState<any | null>(null);

  // Issue form state
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('academic');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [conduct, setConduct] = useState(bn ? 'সন্তোষজনক' : 'Satisfactory');
  const [reason, setReason] = useState('');
  const [achievements, setAchievements] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lastClass, setLastClass] = useState('');
  const [dateOfLeaving, setDateOfLeaving] = useState('');

  /* ── Data ──────────────────────────── */
  const { data: institution } = useQuery({
    queryKey: ['institution-info'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  const { data: principalInfo } = useQuery({
    queryKey: ['principal-settings-cert'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('key, value')
        .in('key', ['principal_name', 'principal_title_bn', 'principal_title_en']);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = typeof r.value === 'string' ? r.value : ''; });
      return map;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('certificate_templates').select('*');
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-cert'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name_bn, name_en, student_id, roll_number, class_id, session_id, father_name, mother_name, date_of_birth, admission_date, classes(name_bn, name), academic_sessions(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['student-certificates', tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_certificates')
        .select('*, students(name_bn, name_en, student_id, roll_number, father_name, mother_name, date_of_birth, classes(name_bn, name), academic_sessions(name))')
        .eq('certificate_type', tab)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  /* ── Filtered list ───────────────────── */
  const filteredCerts = useMemo(() => {
    if (!searchTerm.trim()) return certs;
    const q = searchTerm.toLowerCase();
    return certs.filter((c: any) => {
      const s = c.students;
      return (
        c.serial_number?.toLowerCase().includes(q) ||
        s?.name_bn?.toLowerCase().includes(q) ||
        s?.name_en?.toLowerCase().includes(q) ||
        s?.student_id?.toLowerCase().includes(q)
      );
    });
  }, [certs, searchTerm]);

  /* ── Generate next serial ─────────────── */
  const generateSerial = (type: CertType) => {
    const prefix = type === 'certificate' ? 'CERT' : type === 'transfer' ? 'TC' : 'TM';
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-${random}`;
  };

  /* ── Reset form ───────────────────────── */
  const resetForm = () => {
    setStudentId('');
    setCategory('academic');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setPurpose('');
    setConduct(bn ? 'সন্তোষজনক' : 'Satisfactory');
    setReason('');
    setAchievements('');
    setRemarks('');
    setLastClass('');
    setDateOfLeaving('');
  };

  /* ── Issue mutation ──────────────────── */
  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error(bn ? 'একজন ছাত্র নির্বাচন করুন' : 'Please select a student');
      const payload: any = {
        student_id: studentId,
        certificate_type: tab,
        certificate_category: tab === 'certificate' ? category : null,
        serial_number: generateSerial(tab),
        issue_date: issueDate,
        purpose_bn: purpose,
        conduct_bn: conduct,
        reason_bn: reason,
        achievements_bn: achievements,
        remarks_bn: remarks,
        last_class_attended_bn: lastClass,
        date_of_leaving: dateOfLeaving || null,
      };
      const { error } = await supabase.from('student_certificates').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
      toast.success(bn ? 'সফলভাবে ইস্যু হয়েছে' : 'Issued successfully');
      setIssueOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || (bn ? 'ইস্যু করা যায়নি' : 'Failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_certificates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      setDeleteId(null);
    },
  });

  /* ── Print handler — uses shared template renderer ─────── */
  const handlePrint = (cert: any, langChoice: 'bilingual' | 'bn-only' | 'en-only' = 'bilingual') => {
    const s = cert.students || {};
    const inst = institution || ({} as any);
    const meta = TYPE_META[cert.certificate_type as CertType];
    const tplRow = templates.find((t: any) => t.template_type === cert.certificate_type);
    const cfg = mergeTemplate((tplRow?.config ?? null) as Partial<CertTemplateConfig> | null);

    const cat = cert.certificate_category
      ? CERT_CATEGORIES.find(c => c.key === cert.certificate_category)
      : null;
    const catBn = cat?.bn || '';
    const catEn = cat?.en || '';

    const nameBn = s.name_bn || s.name_en || '';
    const nameEn = s.name_en || s.name_bn || '';
    const fatherName = s.father_name || '';
    const motherName = s.mother_name || '';
    const classBn = s.classes?.name_bn || s.classes?.name || '';
    const classEn = s.classes?.name || '';
    const sessionName = s.academic_sessions?.name || '';
    const conductVal = cert.conduct_bn || conduct || '';
    const reasonVal = cert.reason_bn || reason || '';
    const achievementsVal = cert.achievements_bn || achievements || '';
    const purposeVal = cert.purpose_bn || purpose || '';
    const remarksVal = cert.remarks_bn || remarks || '';
    const lastClassVal = cert.last_class_attended_bn || lastClass || classBn;

    const dobBn = s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('bn-BD') : '';
    const dobEn = s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB') : '';
    const admBn = s.admission_date ? new Date(s.admission_date).toLocaleDateString('bn-BD') : '';
    const admEn = s.admission_date ? new Date(s.admission_date).toLocaleDateString('en-GB') : '';
    const issueBn = new Date(cert.issue_date).toLocaleDateString('bn-BD');
    const issueEn = new Date(cert.issue_date).toLocaleDateString('en-GB');
    const leavingBn = cert.date_of_leaving ? new Date(cert.date_of_leaving).toLocaleDateString('bn-BD') : '';
    const leavingEn = cert.date_of_leaving ? new Date(cert.date_of_leaving).toLocaleDateString('en-GB') : '';

    const esc = (v: string) => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let bodyBn = '';
    let bodyEn = '';
    if (cert.certificate_type === 'certificate') {
      const subjectBn = catBn || 'কৃতিত্ব';
      const subjectEn = catEn || 'Achievement';
      bodyBn = `এই সনদপত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${esc(nameBn)}</span>, পিতা: <b>${esc(fatherName)}</b>, মাতা: <b>${esc(motherName)}</b>${classBn ? `, ${esc(classBn)} শ্রেণীর একজন কৃতী শিক্ষার্থী।` : '।'} সে <span class="hl">${esc(subjectBn)}</span> ক্ষেত্রে অসাধারণ দক্ষতা ও কৃতিত্বের পরিচয় দিয়েছে।${achievementsVal ? ` বিশেষ অর্জন: <i>${esc(achievementsVal)}</i>।` : ''} আমরা তার উজ্জ্বল ভবিষ্যৎ ও সর্বাঙ্গীণ মঙ্গল কামনা করছি।`;
      bodyEn = `This is to certify that <span class="hl">${esc(nameEn)}</span>, son/daughter of <b>${esc(fatherName)}</b> and <b>${esc(motherName)}</b>${classEn ? `, a student of Class <b>${esc(classEn)}</b>,` : ','} has demonstrated exceptional skill and accomplishment in <span class="hl">${esc(subjectEn)}</span>.${achievementsVal ? ` Notable achievement: <i>${esc(achievementsVal)}</i>.` : ''} We wish them continued success and prosperity in all future endeavours.`;
    } else if (cert.certificate_type === 'transfer') {
      bodyBn = `এই ছাড়পত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${esc(nameBn)}</span>, পিতা: <b>${esc(fatherName)}</b>, মাতা: <b>${esc(motherName)}</b>, জন্ম তারিখ: ${dobBn || '—'}, ${admBn ? `${admBn} তারিখে` : ''} এই প্রতিষ্ঠানে ভর্তি হয়েছিল এবং ${leavingBn ? `${leavingBn} তারিখ পর্যন্ত` : ''} <b>${esc(lastClassVal)}</b> শ্রেণী পর্যন্ত অধ্যয়ন করেছে। অধ্যয়নকালে তার আচরণ ছিল <span class="hl">${esc(conductVal)}</span>।${reasonVal ? ` ছাড়পত্র গ্রহণের কারণ: <i>${esc(reasonVal)}</i>।` : ''} আমরা তার ভবিষ্যৎ জীবনের সর্বাঙ্গীণ মঙ্গল কামনা করছি।`;
      bodyEn = `This is to certify that <span class="hl">${esc(nameEn)}</span>, son/daughter of <b>${esc(fatherName)}</b> and <b>${esc(motherName)}</b>, born on <b>${dobEn || '—'}</b>, was admitted to this institution ${admEn ? `on <b>${admEn}</b>` : ''} and continued studies up to Class <b>${esc(lastClassVal)}</b>${leavingEn ? ` until <b>${leavingEn}</b>` : ''}. Their conduct during the period of study was <span class="hl">${esc(conductVal)}</span>.${reasonVal ? ` Reason for leaving: <i>${esc(reasonVal)}</i>.` : ''} We wish them all the best in their future endeavours.`;
    } else {
      bodyBn = `এই প্রশংসাপত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${esc(nameBn)}</span>, পিতা: <b>${esc(fatherName)}</b>, মাতা: <b>${esc(motherName)}</b>${classBn ? `, ${esc(classBn)} শ্রেণীর একজন মেধাবী শিক্ষার্থী।` : '।'} অধ্যয়নকালে তার আচরণ ছিল <span class="hl">${esc(conductVal)}</span> এবং সে শিক্ষা ও সহশিক্ষা কার্যক্রমে সক্রিয় ভূমিকা পালন করেছে।${achievementsVal ? ` বিশেষ অর্জন: <i>${esc(achievementsVal)}</i>।` : ''} আমরা তার উজ্জ্বল ভবিষ্যৎ ও সর্বাঙ্গীণ মঙ্গল কামনা করছি।`;
      bodyEn = `This is to certify that <span class="hl">${esc(nameEn)}</span>, son/daughter of <b>${esc(fatherName)}</b> and <b>${esc(motherName)}</b>${classEn ? `, a student of Class <b>${esc(classEn)}</b>,` : ','} has been a meritorious student of this institution. Their conduct throughout the period of study has been <span class="hl">${esc(conductVal)}</span>, and they have actively participated in academic and co-curricular activities.${achievementsVal ? ` Notable achievement: <i>${esc(achievementsVal)}</i>.` : ''} We wish them a bright future ahead.`;
    }

    const monogramText = (inst.name_en || inst.name || 'A').trim().charAt(0).toUpperCase();

    const html = renderCertificateHTML({
      cfg,
      certType: cert.certificate_type as RenderCertType,
      defaultTitleBn: meta.titleBn,
      defaultTitleEn: meta.titleEn,
      data: {
        institutionNameBn: inst.name || '',
        institutionNameEn: inst.name_en || '',
        institutionAddress: inst.address || '',
        institutionPhone: inst.phone || '',
        institutionEmail: inst.email || '',
        institutionLogo: inst.logo_url || '',
        monogram: monogramText,
        serial: cert.serial_number || '',
        issueDateBn: issueBn,
        issueDateEn: issueEn,
        nameBn, nameEn, fatherName, motherName, classBn, classEn,
        sessionName,
        studentId: s.student_id || '',
        rollNumber: s.roll_number ? String(s.roll_number) : '',
        dobBn, dobEn,
        admissionDateBn: admBn, admissionDateEn: admEn,
        leavingDateBn: leavingBn, leavingDateEn: leavingEn,
        conduct: conductVal,
        reason: reasonVal,
        achievements: achievementsVal,
        purpose: purposeVal,
        remarks: remarksVal,
        lastClass: lastClassVal,
        categoryBn: catBn,
        categoryEn: catEn,
        bodyBn,
        bodyEn,
        principalName: principalInfo?.principal_name || '',
        principalTitleBn: principalInfo?.principal_title_bn || 'মুহতামিম / প্রিন্সিপাল',
        principalTitleEn: principalInfo?.principal_title_en || 'Principal',
      },
    }) + `<script>window.onload=()=>{setTimeout(()=>window.print(),400);};</script>`;

    const w = window.open('', '_blank');
    if (!w) { toast.error(bn ? 'প্রিন্ট পপআপ ব্লক করা হয়েছে' : 'Print popup blocked'); return; }
    w.document.write(html);
    w.document.close();
  };

  /* ── Student options ────────────────── */
  const studentOptions = useMemo(() =>
    students.map((s: any) => ({
      value: s.id,
      label: `${s.name_bn || s.name_en} · ${s.student_id || ''}${s.roll_number ? ` · রোল: ${s.roll_number}` : ''}`,
    })), [students]);

  const selectedStudent = useMemo(() => students.find((s: any) => s.id === studentId), [students, studentId]);

  /* ── Render ─────────────────────────── */
  const TabIcon = TYPE_META[tab].icon;

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'ছাত্রদের সার্টিফিকেট' : 'Student Certificates'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {bn ? 'সার্টিফিকেট, ছাড়পত্র এবং প্রশংসাপত্র ইস্যু ও ব্যবস্থাপনা' : 'Issue and manage certificates, transfers & testimonials'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_META) as CertType[]).map(k => {
            const m = TYPE_META[k];
            const Icon = m.icon;
            const active = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all border-2 ${
                  active
                    ? `bg-gradient-to-r ${m.color} text-white border-transparent shadow-lg`
                    : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}>
                <Icon className="w-4 h-4" />
                {bn ? m.bn : m.en}
              </button>
            );
          })}
        </div>

        {/* Search + Issue button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'সিরিয়াল, নাম বা আইডি দিয়ে খুঁজুন...' : 'Search by serial, name or ID...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl"
            />
          </div>
          <Button variant="outline" onClick={() => setDesignerOpen(true)} className="rounded-2xl">
            <Palette className="w-4 h-4" />
            {bn ? 'টেমপ্লেট ডিজাইনার' : 'Template Designer'}
          </Button>
          <Button onClick={() => { resetForm(); setIssueOpen(true); }} className="rounded-2xl">
            <Plus className="w-4 h-4" />
            {bn ? 'নতুন ইস্যু' : 'Issue New'}
          </Button>
        </div>

        {/* List */}
        <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredCerts.length === 0 ? (
            <div className="text-center py-16">
              <TabIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                {bn ? 'কোনো রেকর্ড পাওয়া যায়নি' : 'No records found'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  <TableHead>{bn ? 'সিরিয়াল' : 'Serial'}</TableHead>
                  <TableHead>{bn ? 'ছাত্রের নাম' : 'Student Name'}</TableHead>
                  <TableHead>{bn ? 'আইডি' : 'ID'}</TableHead>
                  <TableHead>{bn ? 'শ্রেণী' : 'Class'}</TableHead>
                  {tab === 'certificate' && <TableHead>{bn ? 'ক্যাটেগরি' : 'Category'}</TableHead>}
                  <TableHead>{bn ? 'ইস্যুর তারিখ' : 'Issue Date'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCerts.map((c: any) => {
                  const s = c.students || {};
                  const className = bn ? (s.classes?.name_bn || s.classes?.name) : (s.classes?.name);
                  const catLabel = c.certificate_category
                    ? CERT_CATEGORIES.find(x => x.key === c.certificate_category)?.[bn ? 'bn' : 'en']
                    : '';
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30 border-b border-border/20">
                      <TableCell className="font-mono text-xs">{c.serial_number}</TableCell>
                      <TableCell className="font-medium">{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</TableCell>
                      <TableCell className="text-muted-foreground">{s.student_id}</TableCell>
                      <TableCell>{className || '-'}</TableCell>
                      {tab === 'certificate' && (
                        <TableCell>
                          {catLabel ? <Badge variant="secondary" className="rounded-full">{catLabel}</Badge> : '-'}
                        </TableCell>
                      )}
                      <TableCell>{new Date(c.issue_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handlePrint(c)}
                            className="rounded-full h-9 w-9 hover:bg-primary/10 hover:text-primary">
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)}
                            className="rounded-full h-9 w-9 hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Issue dialog */}
        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                <TabIcon className="w-5 h-5 text-primary" />
                {bn ? `নতুন ${TYPE_META[tab].bn} ইস্যু` : `Issue New ${TYPE_META[tab].en}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>{bn ? 'ছাত্র নির্বাচন করুন *' : 'Select Student *'}</Label>
                <SearchableSelect
                  options={studentOptions}
                  value={studentId}
                  onValueChange={setStudentId}
                  placeholder={bn ? 'ছাত্র বেছে নিন...' : 'Pick a student...'}
                  searchPlaceholder={bn ? 'নাম বা আইডি দিয়ে খুঁজুন' : 'Search by name or ID'}
                />
                {selectedStudent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {bn ? 'পিতা' : 'Father'}: {selectedStudent.father_name || '-'} ·
                    {bn ? ' মাতা' : ' Mother'}: {selectedStudent.mother_name || '-'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'ইস্যুর তারিখ' : 'Issue Date'}</Label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                {tab === 'certificate' && (
                  <div>
                    <Label>{bn ? 'ক্যাটেগরি' : 'Category'}</Label>
                    <SearchableSelect
                      options={CERT_CATEGORIES.map(c => ({ value: c.key, label: bn ? c.bn : c.en }))}
                      value={category}
                      onValueChange={setCategory}
                      placeholder={bn ? 'ক্যাটেগরি বেছে নিন' : 'Select category'}
                    />
                  </div>
                )}
                {(tab === 'transfer' || tab === 'testimonial') && (
                  <div>
                    <Label>{bn ? 'আচরণ' : 'Conduct'}</Label>
                    <Input value={conduct} onChange={e => setConduct(e.target.value)}
                      placeholder={bn ? 'যেমন: সন্তোষজনক / উত্তম' : 'e.g. Satisfactory / Excellent'} />
                  </div>
                )}
              </div>

              {tab === 'transfer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{bn ? 'সর্বশেষ অধ্যয়নকৃত শ্রেণী' : 'Last Class Attended'}</Label>
                    <Input value={lastClass} onChange={e => setLastClass(e.target.value)}
                      placeholder={bn ? 'যেমন: ৮ম শ্রেণী' : 'e.g. Class 8'} />
                  </div>
                  <div>
                    <Label>{bn ? 'প্রতিষ্ঠান ত্যাগের তারিখ' : 'Date of Leaving'}</Label>
                    <Input type="date" value={dateOfLeaving} onChange={e => setDateOfLeaving(e.target.value)} />
                  </div>
                </div>
              )}

              {tab === 'transfer' && (
                <div>
                  <Label>{bn ? 'ছেড়ে যাওয়ার কারণ' : 'Reason for Leaving'}</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                    placeholder={bn ? 'যেমন: পারিবারিক স্থানান্তর' : 'e.g. Family relocation'} />
                </div>
              )}

              {(tab === 'certificate' || tab === 'testimonial') && (
                <div>
                  <Label>{bn ? 'অর্জনসমূহ' : 'Achievements'}</Label>
                  <Textarea value={achievements} onChange={e => setAchievements(e.target.value)} rows={2}
                    placeholder={bn ? 'বিশেষ কৃতিত্ব বা অর্জন' : 'Notable achievements'} />
                </div>
              )}

              <div>
                <Label>{bn ? 'উদ্দেশ্য' : 'Purpose'}</Label>
                <Input value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder={bn ? 'এই সনদটি কোন কাজে ব্যবহৃত হবে' : 'What this certificate will be used for'} />
              </div>

              <div>
                <Label>{bn ? 'মন্তব্য' : 'Remarks'}</Label>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIssueOpen(false)} className="rounded-full">
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending} className="rounded-full">
                {issueMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {bn ? 'ইস্যু করুন' : 'Issue'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          isPending={deleteMutation.isPending}
        />

        <CertificateTemplateDesigner open={designerOpen} onOpenChange={setDesignerOpen} />
      </div>
    </AdminLayout>
  );
};

export default AdminCertificates;
