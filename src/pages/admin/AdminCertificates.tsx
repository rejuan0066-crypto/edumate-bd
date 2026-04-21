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
import { Award, FileText, ScrollText, Printer, Trash2, Plus, Search, Loader2, GraduationCap, Palette } from 'lucide-react';
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

  /* ── Print handler — Professional Bilingual A4 ──────── */
  const handlePrint = (cert: any) => {
    const s = cert.students || {};
    const inst = institution || ({} as any);
    const meta = TYPE_META[cert.certificate_type as CertType];
    const pName = principalInfo?.principal_name || '';
    const pTitleBn = principalInfo?.principal_title_bn || 'মুহতামিম / প্রিন্সিপাল';
    const pTitleEn = principalInfo?.principal_title_en || 'Principal';

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

    const escapeHtml = (v: string) => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const cat = cert.certificate_category
      ? CERT_CATEGORIES.find(c => c.key === cert.certificate_category)
      : null;
    const catBn = cat?.bn || '';
    const catEn = cat?.en || '';

    /* ── Bilingual body builder ── */
    let bodyBn = '';
    let bodyEn = '';
    if (cert.certificate_type === 'certificate') {
      const subjectBn = catBn || 'কৃতিত্ব';
      const subjectEn = catEn || 'Achievement';
      bodyBn = `এই সনদপত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${escapeHtml(nameBn)}</span>, পিতা: <b>${escapeHtml(fatherName)}</b>, মাতা: <b>${escapeHtml(motherName)}</b>${classBn ? `, ${escapeHtml(classBn)} শ্রেণীর একজন কৃতী শিক্ষার্থী।` : '।'} সে <span class="hl">${escapeHtml(subjectBn)}</span> ক্ষেত্রে অসাধারণ দক্ষতা ও কৃতিত্বের পরিচয় দিয়েছে।${achievementsVal ? ` বিশেষ অর্জন: <i>${escapeHtml(achievementsVal)}</i>।` : ''} আমরা তার উজ্জ্বল ভবিষ্যৎ ও সর্বাঙ্গীণ মঙ্গল কামনা করছি।`;
      bodyEn = `This is to certify that <span class="hl">${escapeHtml(nameEn)}</span>, son/daughter of <b>${escapeHtml(fatherName)}</b> and <b>${escapeHtml(motherName)}</b>${classEn ? `, a student of Class <b>${escapeHtml(classEn)}</b>,` : ','} has demonstrated exceptional skill and accomplishment in <span class="hl">${escapeHtml(subjectEn)}</span>.${achievementsVal ? ` Notable achievement: <i>${escapeHtml(achievementsVal)}</i>.` : ''} We wish them continued success and prosperity in all future endeavours.`;
    } else if (cert.certificate_type === 'transfer') {
      bodyBn = `এই ছাড়পত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${escapeHtml(nameBn)}</span>, পিতা: <b>${escapeHtml(fatherName)}</b>, মাতা: <b>${escapeHtml(motherName)}</b>, জন্ম তারিখ: ${dobBn || '—'}, ${admBn ? `${admBn} তারিখে` : ''} এই প্রতিষ্ঠানে ভর্তি হয়েছিল এবং ${leavingBn ? `${leavingBn} তারিখ পর্যন্ত` : ''} <b>${escapeHtml(lastClassVal)}</b> শ্রেণী পর্যন্ত অধ্যয়ন করেছে। অধ্যয়নকালে তার আচরণ ছিল <span class="hl">${escapeHtml(conductVal)}</span>।${reasonVal ? ` ছাড়পত্র গ্রহণের কারণ: <i>${escapeHtml(reasonVal)}</i>।` : ''} আমরা তার ভবিষ্যৎ জীবনের সর্বাঙ্গীণ মঙ্গল কামনা করছি।`;
      bodyEn = `This is to certify that <span class="hl">${escapeHtml(nameEn)}</span>, son/daughter of <b>${escapeHtml(fatherName)}</b> and <b>${escapeHtml(motherName)}</b>, born on <b>${dobEn || '—'}</b>, was admitted to this institution ${admEn ? `on <b>${admEn}</b>` : ''} and continued studies up to Class <b>${escapeHtml(lastClassVal)}</b>${leavingEn ? ` until <b>${leavingEn}</b>` : ''}. Their conduct during the period of study was <span class="hl">${escapeHtml(conductVal)}</span>.${reasonVal ? ` Reason for leaving: <i>${escapeHtml(reasonVal)}</i>.` : ''} We wish them all the best in their future endeavours.`;
    } else {
      bodyBn = `এই প্রশংসাপত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">${escapeHtml(nameBn)}</span>, পিতা: <b>${escapeHtml(fatherName)}</b>, মাতা: <b>${escapeHtml(motherName)}</b>${classBn ? `, ${escapeHtml(classBn)} শ্রেণীর একজন মেধাবী শিক্ষার্থী।` : '।'} অধ্যয়নকালে তার আচরণ ছিল <span class="hl">${escapeHtml(conductVal)}</span> এবং সে শিক্ষা ও সহশিক্ষা কার্যক্রমে সক্রিয় ভূমিকা পালন করেছে।${achievementsVal ? ` বিশেষ অর্জন: <i>${escapeHtml(achievementsVal)}</i>।` : ''} আমরা তার উজ্জ্বল ভবিষ্যৎ ও সর্বাঙ্গীণ মঙ্গল কামনা করছি।`;
      bodyEn = `This is to certify that <span class="hl">${escapeHtml(nameEn)}</span>, son/daughter of <b>${escapeHtml(fatherName)}</b> and <b>${escapeHtml(motherName)}</b>${classEn ? `, a student of Class <b>${escapeHtml(classEn)}</b>,` : ','} has been a meritorious student of this institution. Their conduct throughout the period of study has been <span class="hl">${escapeHtml(conductVal)}</span>, and they have actively participated in academic and co-curricular activities.${achievementsVal ? ` Notable achievement: <i>${escapeHtml(achievementsVal)}</i>.` : ''} We wish them a bright future ahead.`;
    }

    const titleBn = meta.titleBn;
    const titleEn = meta.titleEn;
    const monogramText = (inst.name_en || inst.name || 'A').trim().charAt(0).toUpperCase();

    const html = `<!DOCTYPE html>
<html lang="bn"><head>
<meta charset="utf-8">
<title>${titleEn} — ${escapeHtml(nameEn)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@400;500;600;700&family=Cinzel:wght@500;700&family=Great+Vibes&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4;margin:0}
  html,body{width:210mm;height:297mm;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color:#1a1410;font-family:'Cormorant Garamond','Noto Serif Bengali',serif}
  .page{width:210mm;height:297mm;padding:0;position:relative;overflow:hidden;background:
    radial-gradient(ellipse at top,#fefaf0 0%,#fdf6e3 60%,#f8efd4 100%)}
  /* Decorative borders */
  .frame-outer{position:absolute;inset:7mm;border:4px double #b8860b;border-radius:2px;pointer-events:none}
  .frame-inner{position:absolute;inset:11mm;border:1px solid #d4af37;pointer-events:none}
  .frame-thin{position:absolute;inset:13mm;border:0.5px solid #b8860b;opacity:.55;pointer-events:none}
  /* Ornate corners */
  .corner{position:absolute;width:42px;height:42px;background-repeat:no-repeat;background-size:contain}
  .corner svg{display:block;width:100%;height:100%}
  .corner.tl{top:9mm;left:9mm}
  .corner.tr{top:9mm;right:9mm;transform:rotate(90deg)}
  .corner.br{bottom:9mm;right:9mm;transform:rotate(180deg)}
  .corner.bl{bottom:9mm;left:9mm;transform:rotate(270deg)}
  /* Subtle watermark monogram */
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:340px;font-weight:700;color:#b8860b;opacity:.05;pointer-events:none;z-index:0;letter-spacing:0}
  .content{position:relative;z-index:2;padding:18mm 18mm 14mm;height:100%;display:flex;flex-direction:column}
  /* Header */
  .header{display:flex;align-items:center;gap:16px;justify-content:center;padding-bottom:10px;border-bottom:1px solid #d4af37;margin-bottom:6px}
  .header img{width:62px;height:62px;object-fit:contain}
  .header-text{text-align:center}
  .header-text .name-bn{font-family:'Noto Serif Bengali',serif;font-size:22px;font-weight:700;color:#5c3a0e;letter-spacing:.5px;line-height:1.1}
  .header-text .name-en{font-family:'Cinzel',serif;font-size:13px;font-weight:600;color:#7a5618;letter-spacing:3px;margin-top:3px;text-transform:uppercase}
  .header-text .addr{font-size:10.5px;color:#7a5618;margin-top:3px;font-family:'Cormorant Garamond',serif;letter-spacing:.3px}
  /* Title block */
  .title-wrap{text-align:center;margin:14px 0 10px;position:relative}
  .title-bn{font-family:'Noto Serif Bengali',serif;font-size:26px;font-weight:700;color:#7a4f0d;letter-spacing:4px}
  .title-divider{display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 4px}
  .title-divider .line{width:60px;height:1px;background:linear-gradient(90deg,transparent,#b8860b,transparent)}
  .title-divider .diamond{width:7px;height:7px;background:#b8860b;transform:rotate(45deg);box-shadow:0 0 0 2px #fef6dc}
  .title-en{font-family:'Cinzel',serif;font-size:30px;font-weight:700;color:#5c3a0e;letter-spacing:8px;text-transform:uppercase}
  .title-sub{font-family:'Great Vibes',cursive;font-size:22px;color:#9c7016;margin-top:2px;letter-spacing:1px}
  /* Meta row */
  .meta-row{display:flex;justify-content:space-between;font-size:11px;color:#5c3a0e;padding:8px 6px;margin:6px 0 4px;border-top:1px dashed #d4af37;border-bottom:1px dashed #d4af37;font-family:'Cormorant Garamond',serif;letter-spacing:.4px}
  .meta-row b{color:#3d2606;font-weight:700}
  /* Name presentation */
  .presented{text-align:center;margin:10px 0 4px;font-family:'Noto Serif Bengali',serif;font-size:11.5px;color:#7a5618;letter-spacing:2px;text-transform:uppercase}
  .recipient{text-align:center;margin:2px 0 8px}
  .recipient .name-bn{font-family:'Noto Serif Bengali',serif;font-size:26px;font-weight:700;color:#3d2606;line-height:1.2}
  .recipient .name-en{font-family:'Great Vibes',cursive;font-size:36px;color:#7a4f0d;line-height:1;margin-top:2px}
  .recipient .underline{margin:6px auto 0;width:60%;height:1px;background:linear-gradient(90deg,transparent,#b8860b 20%,#b8860b 80%,transparent)}
  /* Bilingual body */
  .body-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px 0;flex:1}
  .col{padding:10px 12px;background:rgba(255,253,245,.5);border-radius:4px;border:1px solid rgba(184,134,11,.18)}
  .col .lang-tag{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9c7016;text-align:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px dotted #d4af37}
  .col .text{font-size:12px;line-height:1.85;text-align:justify;color:#2a1d0c}
  .col.bn .text{font-family:'Noto Serif Bengali',serif;font-size:12.5px;line-height:1.95}
  .col.en .text{font-family:'Cormorant Garamond',serif;font-size:12.5px;line-height:1.85}
  .text .hl{color:#7a4f0d;font-weight:700}
  .text b{color:#3d2606;font-weight:600}
  /* Info table */
  .info{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 10px;font-size:10.5px;color:#3d2606;margin:6px 0 8px;padding:6px 8px;background:rgba(212,175,55,.06);border-radius:3px}
  .info > div{padding:2px 0;border-bottom:1px dotted rgba(212,175,55,.4);font-family:'Cormorant Garamond',serif}
  .info > div b{color:#5c3a0e;font-weight:600;display:block;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-bottom:1px}
  .info > div span{font-family:'Noto Serif Bengali','Cormorant Garamond',serif;font-size:11px;color:#1f1408;font-weight:500}
  /* Footer signatures */
  .footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding:14px 4px 0;border-top:1px solid rgba(212,175,55,.4)}
  .seal{width:88px;height:88px;border:2px dashed #b8860b;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#9c7016;text-align:center;background:rgba(212,175,55,.05)}
  .seal .seal-en{font-family:'Cinzel',serif;font-size:8px;font-weight:700;letter-spacing:1.5px}
  .seal .seal-bn{font-family:'Noto Serif Bengali',serif;font-size:9px;font-weight:600;margin-top:2px}
  .sig{text-align:center;min-width:200px}
  .sig .line{border-top:1.5px solid #5c3a0e;margin:30px 14px 4px}
  .sig .name{font-family:'Noto Serif Bengali','Cormorant Garamond',serif;font-size:13px;font-weight:700;color:#3d2606}
  .sig .title-bn{font-family:'Noto Serif Bengali',serif;font-size:10.5px;color:#7a5618;margin-top:1px;letter-spacing:.3px}
  .sig .title-en{font-family:'Cinzel',serif;font-size:9px;color:#9c7016;letter-spacing:1.5px;text-transform:uppercase;margin-top:1px}
  /* Bottom note */
  .bottom-note{display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#9c7016;margin-top:8px;padding-top:6px;font-family:'Cormorant Garamond',serif;letter-spacing:.3px}
  .bottom-note .serial-no{font-family:'Cinzel',serif;font-weight:600;letter-spacing:2px}
  @media print{body{margin:0}.page{box-shadow:none}}
</style>
</head>
<body>
<div class="page">
  <div class="frame-outer"></div>
  <div class="frame-inner"></div>
  <div class="frame-thin"></div>
  <div class="corner tl"><svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#b8860b" stroke-width="1.2"><path d="M2 14 Q2 2 14 2"/><path d="M6 14 Q6 6 14 6"/><circle cx="14" cy="14" r="2.5" fill="#b8860b"/><path d="M14 2 L18 6 M2 14 L6 18" stroke-width="1"/></g></svg></div>
  <div class="corner tr"><svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#b8860b" stroke-width="1.2"><path d="M2 14 Q2 2 14 2"/><path d="M6 14 Q6 6 14 6"/><circle cx="14" cy="14" r="2.5" fill="#b8860b"/><path d="M14 2 L18 6 M2 14 L6 18" stroke-width="1"/></g></svg></div>
  <div class="corner bl"><svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#b8860b" stroke-width="1.2"><path d="M2 14 Q2 2 14 2"/><path d="M6 14 Q6 6 14 6"/><circle cx="14" cy="14" r="2.5" fill="#b8860b"/><path d="M14 2 L18 6 M2 14 L6 18" stroke-width="1"/></g></svg></div>
  <div class="corner br"><svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#b8860b" stroke-width="1.2"><path d="M2 14 Q2 2 14 2"/><path d="M6 14 Q6 6 14 6"/><circle cx="14" cy="14" r="2.5" fill="#b8860b"/><path d="M14 2 L18 6 M2 14 L6 18" stroke-width="1"/></g></svg></div>
  <div class="watermark">${escapeHtml(monogramText)}</div>

  <div class="content">
    <!-- Institution Header -->
    <div class="header">
      ${inst.logo_url ? `<img src="${escapeHtml(inst.logo_url)}" alt=""/>` : ''}
      <div class="header-text">
        <div class="name-bn">${escapeHtml(inst.name || '')}</div>
        ${inst.name_en ? `<div class="name-en">${escapeHtml(inst.name_en)}</div>` : ''}
        <div class="addr">${escapeHtml(inst.address || '')}${inst.phone ? ` &middot; ${escapeHtml(inst.phone)}` : ''}${inst.email ? ` &middot; ${escapeHtml(inst.email)}` : ''}</div>
      </div>
    </div>

    <!-- Title -->
    <div class="title-wrap">
      <div class="title-bn">${escapeHtml(titleBn)}</div>
      <div class="title-divider"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
      <div class="title-en">${escapeHtml(titleEn)}</div>
      ${(catBn || catEn) ? `<div class="title-sub">${escapeHtml(catEn || catBn)}</div>` : ''}
    </div>

    <!-- Meta -->
    <div class="meta-row">
      <span><b>Ref / রেফারেন্স:</b> ${escapeHtml(cert.serial_number)}</span>
      <span><b>Date / তারিখ:</b> ${issueEn} &middot; ${issueBn}</span>
    </div>

    <!-- Recipient -->
    <div class="presented">This Is Proudly Presented To &middot; এই সনদ প্রদান করা হলো</div>
    <div class="recipient">
      <div class="name-bn">${escapeHtml(nameBn)}</div>
      ${nameEn && nameEn !== nameBn ? `<div class="name-en">${escapeHtml(nameEn)}</div>` : ''}
      <div class="underline"></div>
    </div>

    <!-- Student info grid -->
    <div class="info">
      ${s.student_id ? `<div><b>Student ID</b><span>${escapeHtml(s.student_id)}</span></div>` : ''}
      ${s.roll_number ? `<div><b>Roll / রোল</b><span>${escapeHtml(String(s.roll_number))}</span></div>` : ''}
      ${classEn ? `<div><b>Class / শ্রেণী</b><span>${escapeHtml(classEn)}</span></div>` : ''}
      ${sessionName ? `<div><b>Session / সেশন</b><span>${escapeHtml(sessionName)}</span></div>` : ''}
      ${fatherName ? `<div><b>Father / পিতা</b><span>${escapeHtml(fatherName)}</span></div>` : ''}
      ${motherName ? `<div><b>Mother / মাতা</b><span>${escapeHtml(motherName)}</span></div>` : ''}
      ${dobEn ? `<div><b>Date of Birth</b><span>${dobEn}</span></div>` : ''}
      ${cert.certificate_type === 'transfer' && admEn ? `<div><b>Admitted On</b><span>${admEn}</span></div>` : ''}
      ${cert.certificate_type === 'transfer' && leavingEn ? `<div><b>Date of Leaving</b><span>${leavingEn}</span></div>` : ''}
      ${cert.certificate_type !== 'certificate' && conductVal ? `<div><b>Conduct / আচরণ</b><span>${escapeHtml(conductVal)}</span></div>` : ''}
    </div>

    <!-- Bilingual body -->
    <div class="body-grid">
      <div class="col bn">
        <div class="lang-tag">বাংলা সংস্করণ</div>
        <div class="text">${bodyBn}</div>
      </div>
      <div class="col en">
        <div class="lang-tag">English Version</div>
        <div class="text">${bodyEn}</div>
      </div>
    </div>

    ${purposeVal ? `<div class="bottom-note"><span><b>Purpose / উদ্দেশ্য:</b> ${escapeHtml(purposeVal)}</span></div>` : ''}
    ${remarksVal ? `<div class="bottom-note"><span><b>Remarks / মন্তব্য:</b> ${escapeHtml(remarksVal)}</span></div>` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="seal">
        <div class="seal-en">OFFICIAL</div>
        <div class="seal-bn">প্রাতিষ্ঠানিক সিল</div>
      </div>
      <div style="text-align:center;font-family:'Great Vibes',cursive;font-size:18px;color:#9c7016;align-self:flex-end;padding-bottom:8px">~ Best Wishes ~</div>
      <div class="sig">
        <div class="line"></div>
        <div class="name">${escapeHtml(pName)}</div>
        <div class="title-bn">${escapeHtml(pTitleBn)}</div>
        <div class="title-en">${escapeHtml(pTitleEn)}</div>
      </div>
    </div>

    <div class="bottom-note">
      <span class="serial-no">${escapeHtml(cert.serial_number)}</span>
      <span>Issued on ${issueEn} &middot; ${issueBn}</span>
    </div>
  </div>
</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),400);};</script>
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
