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
import { Award, FileText, ScrollText, Printer, Trash2, Plus, Search, Loader2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import SearchableSelect from '@/components/SearchableSelect';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

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

  /* ── Print handler ──────────────────── */
  const handlePrint = (cert: any) => {
    const s = cert.students || {};
    const inst = institution || ({} as any);
    const meta = TYPE_META[cert.certificate_type as CertType];
    const pName = principalInfo?.principal_name || '';
    const pTitle = bn ? (principalInfo?.principal_title_bn || 'মুহতামিম / প্রিন্সিপাল') : (principalInfo?.principal_title_en || 'Principal');
    const studentName = bn ? (s.name_bn || s.name_en || '') : (s.name_en || s.name_bn || '');
    const fatherName = s.father_name || '';
    const motherName = s.mother_name || '';
    const className = bn ? (s.classes?.name_bn || s.classes?.name || '') : (s.classes?.name || '');
    const sessionName = s.academic_sessions?.name || '';
    const dob = s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString(bn ? 'bn-BD' : 'en-GB') : '';
    const admDate = s.admission_date ? new Date(s.admission_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB') : '';
    const issueDateStr = new Date(cert.issue_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB');
    const leavingStr = cert.date_of_leaving ? new Date(cert.date_of_leaving).toLocaleDateString(bn ? 'bn-BD' : 'en-GB') : '';

    const escapeHtml = (v: string) => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const labels = bn
      ? {
          ref: 'রেফারেন্স', date: 'তারিখ', name: 'নাম', father: 'পিতার নাম', mother: 'মাতার নাম',
          dob: 'জন্ম তারিখ', studentId: 'আইডি', roll: 'রোল', class: 'শ্রেণী', session: 'সেশন',
          conduct: 'আচরণ', purpose: 'উদ্দেশ্য', reason: 'কারণ', achievements: 'অর্জনসমূহ',
          remarks: 'মন্তব্য', lastClass: 'সর্বশেষ অধ্যয়নকৃত শ্রেণী', dateOfLeaving: 'প্রতিষ্ঠান ত্যাগের তারিখ',
          admDate: 'ভর্তির তারিখ', principal: pTitle, sig: 'স্বাক্ষর',
        }
      : {
          ref: 'Reference', date: 'Date', name: 'Name', father: "Father's Name", mother: "Mother's Name",
          dob: 'Date of Birth', studentId: 'Student ID', roll: 'Roll', class: 'Class', session: 'Session',
          conduct: 'Conduct', purpose: 'Purpose', reason: 'Reason', achievements: 'Achievements',
          remarks: 'Remarks', lastClass: 'Last Class Attended', dateOfLeaving: 'Date of Leaving',
          admDate: 'Date of Admission', principal: pTitle, sig: 'Signature',
        };

    const categoryLabel = cert.certificate_category
      ? (CERT_CATEGORIES.find(c => c.key === cert.certificate_category)?.[bn ? 'bn' : 'en'] || '')
      : '';

    // Body builder per type
    let bodyHtml = '';
    if (cert.certificate_type === 'certificate') {
      const subject = categoryLabel || (bn ? 'কৃতিত্ব' : 'Achievement');
      bodyHtml = bn
        ? `এই সনদপত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${escapeHtml(studentName)}</span>, পিতা: ${escapeHtml(fatherName)}, মাতা: ${escapeHtml(motherName)}, ${className ? `${className} শ্রেণীর` : ''} একজন কৃতি ছাত্র। সে <span class="hl">${escapeHtml(subject)}</span> এর ক্ষেত্রে অসাধারণ দক্ষতা ও কৃতিত্বের পরিচয় দিয়েছে। ${achievements ? `<br/><br/><b>${labels.achievements}:</b> ${escapeHtml(achievements)}` : ''} <br/><br/>আমরা তার ভবিষ্যৎ সাফল্য ও মঙ্গল কামনা করছি।`
        : `This is to certify that <span class="hl">${escapeHtml(studentName)}</span>, son/daughter of ${escapeHtml(fatherName)} and ${escapeHtml(motherName)}, ${className ? `a student of class ${className},` : ''} has demonstrated exceptional skill and achievement in <span class="hl">${escapeHtml(subject)}</span>. ${achievements ? `<br/><br/><b>${labels.achievements}:</b> ${escapeHtml(achievements)}` : ''}<br/><br/>We wish them continued success in their future endeavours.`;
    } else if (cert.certificate_type === 'transfer') {
      bodyHtml = bn
        ? `এই ছাড়পত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${escapeHtml(studentName)}</span>, পিতা: ${escapeHtml(fatherName)}, মাতা: ${escapeHtml(motherName)}, জন্ম তারিখ: ${dob}, ${admDate ? `${admDate} তারিখে` : ''} এই প্রতিষ্ঠানে ভর্তি হয়েছিল এবং ${leavingStr ? `${leavingStr} তারিখ পর্যন্ত` : ''} <b>${escapeHtml(cert.last_class_attended_bn || lastClass || className)}</b> পর্যন্ত অধ্যয়ন করেছে। তার আচরণ ছিল <span class="hl">${escapeHtml(cert.conduct_bn || conduct)}</span>। ${reason ? `<br/><br/><b>${labels.reason}:</b> ${escapeHtml(reason)}` : ''}<br/><br/>আমরা তার ভবিষ্যৎ জীবনের সর্বাঙ্গীণ মঙ্গল কামনা করছি।`
        : `This is to certify that <span class="hl">${escapeHtml(studentName)}</span>, son/daughter of ${escapeHtml(fatherName)} and ${escapeHtml(motherName)}, born on ${dob}, was admitted to this institution ${admDate ? `on ${admDate}` : ''} and studied up to <b>${escapeHtml(cert.last_class_attended_bn || lastClass || className)}</b> ${leavingStr ? `until ${leavingStr}` : ''}. Their conduct was <span class="hl">${escapeHtml(cert.conduct_bn || conduct)}</span>. ${reason ? `<br/><br/><b>${labels.reason}:</b> ${escapeHtml(reason)}` : ''}<br/><br/>We wish them all the best for their future.`;
    } else {
      bodyHtml = bn
        ? `এই প্রশংসাপত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${escapeHtml(studentName)}</span>, পিতা: ${escapeHtml(fatherName)}, মাতা: ${escapeHtml(motherName)}, ${className ? `${className} শ্রেণীর` : ''} একজন মেধাবী ছাত্র। অধ্যয়নকালে তার আচরণ ছিল <span class="hl">${escapeHtml(cert.conduct_bn || conduct)}</span> এবং সে শিক্ষা ও সহশিক্ষা কার্যক্রমে সক্রিয় ভূমিকা পালন করেছে। ${achievements ? `<br/><br/><b>${labels.achievements}:</b> ${escapeHtml(achievements)}` : ''}<br/><br/>আমরা তার উজ্জ্বল ভবিষ্যৎ কামনা করছি।`
        : `This is to certify that <span class="hl">${escapeHtml(studentName)}</span>, son/daughter of ${escapeHtml(fatherName)} and ${escapeHtml(motherName)}, ${className ? `a student of class ${className},` : ''} has been a meritorious student. Their conduct throughout the period of study has been <span class="hl">${escapeHtml(cert.conduct_bn || conduct)}</span>, and they have actively participated in academic and co-curricular activities. ${achievements ? `<br/><br/><b>${labels.achievements}:</b> ${escapeHtml(achievements)}` : ''}<br/><br/>We wish them a bright future.`;
    }

    const purposeBlock = (cert.purpose_bn || purpose)
      ? `<div class="purpose"><b>${labels.purpose}:</b> ${escapeHtml(cert.purpose_bn || purpose)}</div>` : '';
    const remarksBlock = (cert.remarks_bn || remarks)
      ? `<div class="remarks"><b>${labels.remarks}:</b> ${escapeHtml(cert.remarks_bn || remarks)}</div>` : '';

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${meta.titleBn} - ${escapeHtml(studentName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4;margin:0}
  html,body{width:210mm;height:297mm;font-family:'Noto Serif Bengali','Cormorant Garamond',serif;color:#1a1a1a;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;background:#fff}
  .page{width:210mm;height:297mm;padding:14mm;position:relative;overflow:hidden;background:#fffef9}
  .border-outer{position:absolute;inset:8mm;border:3px double #8b6f3a;pointer-events:none}
  .border-inner{position:absolute;inset:11mm;border:1px solid #c9a961;pointer-events:none}
  .corner{position:absolute;width:30px;height:30px;border:2px solid #8b6f3a}
  .corner.tl{top:6mm;left:6mm;border-right:none;border-bottom:none}
  .corner.tr{top:6mm;right:6mm;border-left:none;border-bottom:none}
  .corner.bl{bottom:6mm;left:6mm;border-right:none;border-top:none}
  .corner.br{bottom:6mm;right:6mm;border-left:none;border-top:none}
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:.04;pointer-events:none;z-index:0;font-size:200px;font-weight:900;color:#8b6f3a}
  .content{position:relative;z-index:1;padding:14mm 8mm;height:100%;display:flex;flex-direction:column}
  .header{text-align:center;margin-bottom:14px;display:flex;align-items:center;gap:14px;justify-content:center}
  .header img{width:60px;height:60px;object-fit:contain}
  .header-text{text-align:center}
  .header-text h1{font-size:24px;font-weight:700;color:#5c4524;letter-spacing:1px}
  .header-text p{font-size:11px;color:#7a6243;margin-top:2px}
  .ribbon{margin:14px auto 18px;text-align:center}
  .ribbon h2{display:inline-block;font-size:32px;font-weight:700;color:#8b6f3a;letter-spacing:6px;border-top:2px solid #c9a961;border-bottom:2px solid #c9a961;padding:8px 30px;font-family:'Cormorant Garamond',serif}
  .ribbon .sub{font-size:12px;color:#7a6243;margin-top:6px;letter-spacing:3px}
  .meta{display:flex;justify-content:space-between;font-size:12px;color:#5c4524;margin:10px 4px 16px}
  .meta b{color:#3d2f18}
  .name-block{text-align:center;margin:18px 0 14px}
  .name-block .label{font-size:13px;color:#7a6243;margin-bottom:4px;letter-spacing:1px;text-transform:uppercase}
  .name-block .name{font-size:30px;font-weight:700;color:#3d2f18;font-family:'Cormorant Garamond','Noto Serif Bengali',serif;border-bottom:1px dashed #c9a961;padding-bottom:6px;display:inline-block;min-width:60%}
  .body{font-size:14px;line-height:2;text-align:center;margin:14px 8mm;color:#2a2418;flex:1}
  .body .hl{color:#8b6f3a;font-weight:700}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:11.5px;margin:12px 8mm;color:#3d2f18}
  .info-grid div{padding:3px 0;border-bottom:1px dotted #d4c5a0}
  .info-grid b{color:#5c4524}
  .purpose,.remarks{font-size:12px;color:#3d2f18;margin:6px 8mm;font-style:italic}
  .footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding:0 8mm}
  .sig-block{text-align:center;min-width:180px}
  .sig-line{border-top:1.5px solid #5c4524;margin-bottom:4px;padding-top:30px}
  .sig-block .name{font-size:13px;font-weight:700;color:#3d2f18}
  .sig-block .title{font-size:10.5px;color:#7a6243}
  .seal{width:90px;height:90px;border:2px dashed #8b6f3a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#8b6f3a;text-align:center;line-height:1.2}
  .serial{position:absolute;bottom:14mm;left:14mm;font-size:9px;color:#8b6f3a;letter-spacing:1px}
  @media print{body{margin:0}.page{box-shadow:none}}
</style>
</head>
<body>
<div class="page">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
  <div class="watermark">★</div>
  <div class="content">
    <div class="header">
      ${inst.logo_url ? `<img src="${inst.logo_url}" alt=""/>` : ''}
      <div class="header-text">
        <h1>${escapeHtml(inst.name || '')}</h1>
        <p>${escapeHtml(inst.address || '')} ${inst.phone ? `· ${escapeHtml(inst.phone)}` : ''}</p>
      </div>
    </div>
    <div class="ribbon">
      <h2>${bn ? meta.titleBn : meta.titleEn}</h2>
      ${categoryLabel ? `<div class="sub">${escapeHtml(categoryLabel)}</div>` : ''}
    </div>
    <div class="meta">
      <span><b>${labels.ref}:</b> ${escapeHtml(cert.serial_number)}</span>
      <span><b>${labels.date}:</b> ${issueDateStr}</span>
    </div>
    <div class="name-block">
      <div class="label">${labels.name}</div>
      <div class="name">${escapeHtml(studentName)}</div>
    </div>
    <div class="info-grid">
      <div><b>${labels.studentId}:</b> ${escapeHtml(s.student_id || '')}</div>
      <div><b>${labels.roll}:</b> ${escapeHtml(s.roll_number || '')}</div>
      <div><b>${labels.father}:</b> ${escapeHtml(fatherName)}</div>
      <div><b>${labels.mother}:</b> ${escapeHtml(motherName)}</div>
      <div><b>${labels.dob}:</b> ${dob}</div>
      ${className ? `<div><b>${labels.class}:</b> ${escapeHtml(className)}</div>` : ''}
      ${sessionName ? `<div><b>${labels.session}:</b> ${escapeHtml(sessionName)}</div>` : ''}
      ${cert.certificate_type === 'transfer' && admDate ? `<div><b>${labels.admDate}:</b> ${admDate}</div>` : ''}
      ${cert.certificate_type === 'transfer' && leavingStr ? `<div><b>${labels.dateOfLeaving}:</b> ${leavingStr}</div>` : ''}
      ${cert.certificate_type !== 'certificate' ? `<div><b>${labels.conduct}:</b> ${escapeHtml(cert.conduct_bn || conduct)}</div>` : ''}
    </div>
    <div class="body">${bodyHtml}</div>
    ${purposeBlock}
    ${remarksBlock}
    <div class="footer">
      <div class="seal">${bn ? 'প্রাতিষ্ঠানিক<br/>সিল' : 'Institutional<br/>Seal'}</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="name">${escapeHtml(pName)}</div>
        <div class="title">${escapeHtml(pTitle)}</div>
      </div>
    </div>
  </div>
  <div class="serial">${escapeHtml(cert.serial_number)}</div>
</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),300);};</script>
</body></html>`;

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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-amber-600" />
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
      </div>
    </AdminLayout>
  );
};

export default AdminCertificates;
