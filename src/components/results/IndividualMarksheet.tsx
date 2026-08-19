import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, ArrowLeft, FileDown } from 'lucide-react';
import { getGrade } from './ClassResultTable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useGradingSystem } from '@/hooks/useGradingSystem';

interface IndividualMarksheetProps {
  student: any;
  subjects: any[];
  marksMap: Record<string, number>;
  examTitle: string;
  onBack: () => void;
  rank?: number;
}

const getMorjada = (grade: string) => {
  if (grade === 'A+') return 'মুমতাজ';
  if (grade === 'A') return 'জায়্যিদ জিদ্দান';
  if (grade === 'B') return 'জায়্যিদ';
  if (grade === 'C') return 'মকবুল';
  if (grade === 'D') return 'মকবুল';
  return 'রাসিব'; // F
};

const getGradeColor = (grade: string) => {
  if (grade === 'F') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
  if (grade === 'D') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  if (grade === 'C') return { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' };
  if (grade === 'B') return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
  if (grade === 'A') return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
  return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
};

const getGradeTwColor = (grade: string) => {
  if (grade === 'F') return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
  if (grade === 'D') return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800';
  if (grade === 'C') return 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800';
  if (grade === 'B') return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
  if (grade === 'A') return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
  return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'; // A+
};

const IndividualMarksheet = ({ student, subjects, marksMap, examTitle, onBack, rank }: IndividualMarksheetProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade, passMark } = useGradingSystem();
  const [sigNames, setSigNames] = useState({ classTeacher: '', examController: '', eduSecretary: '', principal: '' });

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const subjectResults = subjects.map((sub: any) => {
    const marks = marksMap[`${student.id}_${sub.id}`] ?? 0;
    const { grade, gpa, color } = getGrade(marks);
    return { subject: sub, marks, grade, gpa, color };
  });

  const totalMarks = subjectResults.reduce((sum, r) => sum + r.marks, 0);
  const avgMarks = subjects.length > 0 ? totalMarks / subjects.length : 0;
  const overall: any = getOverallGrade(subjectResults.map(r => r.marks), student?.class_id);
  const morjada = (bn ? overall.title_bn : overall.title) || overall.title_bn || getMorjada(overall.grade);

  const instName = bn ? institution?.name : (institution?.name_en || institution?.name);
  const studentName = bn ? student.name_bn : (student.name_en || student.name_bn);

  let rankDisplay = rank ? rank.toString() : '-';
  if (rank === 1) rankDisplay = bn ? '১ম' : '1st';
  else if (rank === 2) rankDisplay = bn ? '২য়' : '2nd';
  else if (rank === 3) rankDisplay = bn ? '৩য়' : '3rd';


  const getMarksheetHtml = () => {
    const gradeClass = (g: string) => {
      if (g === 'F') return 'grade-f';
      if (g === 'D') return 'grade-d';
      if (g === 'C') return 'grade-c';
      if (g === 'B') return 'grade-b';
      if (g === 'A') return 'grade-a';
      return 'grade-aplus';
    };

    const subjectRows = subjectResults.map((r, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${bn ? r.subject.name_bn : r.subject.name}</td>
        <td style="text-align:center;">100</td>
        <td style="text-align:center;font-weight:700;">${r.marks}</td>
        <td style="text-align:center;"><span class="grade-badge ${gradeClass(r.grade)}">${r.grade}</span></td>
        <td style="text-align:center;font-weight:600;">${r.gpa}</td>
      </tr>
    `).join('');

    const photoHtml = student.photo_url
      ? `<img src="${student.photo_url}" style="width:80px;height:96px;object-fit:cover;border:2px solid #bbf7d0;border-radius:6px;" crossorigin="anonymous" />`
      : '';

    const overallGC = getGradeColor(overall.grade);

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${examTitle} - ${studentName}</title>
<style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif; padding:15mm; max-width:800px; margin:0 auto; color:#1f2937; background:#fff; }
  @media print { body { padding:10mm; } }
  .sheet { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; }
  .header { text-align:center; margin-bottom:16px; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; padding:18px 20px; border-radius:12px; }
  .header-logo { width:54px; height:54px; object-fit:contain; margin:0 auto 8px; display:block; border-radius:50%; background:#fff; padding:3px; }
  .header h1 { font-size:18px; margin-bottom:3px; font-weight:800; }
  .header .sub { font-size:11px; color:#d1fae5; }
  .marksheet-title { text-align:center; margin:12px 0; }
  .marksheet-title h2 { display:inline-block; font-size:15px; font-weight:700; color:#15803d; border-bottom:2px solid #16a34a; padding-bottom:2px; }
  .marksheet-title .exam-name { font-size:12px; color:#6b7280; margin-top:4px; }
  .student-info { display:flex; gap:16px; margin:16px 0; padding:14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; }
  .student-photo { flex-shrink:0; }
  .student-details { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:12px; }
  .student-details .row { display:flex; gap:4px; }
  .student-details .label { color:#6b7280; font-size:11px; min-width:80px; }
  .student-details .value { font-weight:700; color:#111827; }
  table { width:100%; border-collapse:collapse; margin:16px 0; }
  th { padding:8px; border:1px solid #d1d5db; background:#f0fdf4; font-size:11px; text-align:center; color:#15803d; font-weight:700; }
  td { padding:7px 8px; border:1px solid #e5e7eb; font-size:12px; }
  .grade-badge { display:inline-block; padding:2px 12px; border-radius:12px; font-weight:700; font-size:11px; }
  .grade-f { background:#fef2f2; color:#dc2626; }
  .grade-d { background:#fffbeb; color:#d97706; }
  .grade-c { background:#fefce8; color:#ca8a04; }
  .grade-b { background:#eff6ff; color:#2563eb; }
  .grade-a { background:#f0fdf4; color:#16a34a; }
  .grade-aplus { background:#ecfdf5; color:#059669; }
  .summary { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin:16px 0; text-align:center; page-break-inside: avoid; }
  .summary-box { border-radius:12px; padding:14px 8px; border: 1.5px solid #e5e7eb; }
  .summary-box .label { font-size:10px; font-weight:700; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px; }
  .summary-box .val { font-size:24px; font-weight:800; line-height:1.1; }
  .summary-box .sub-label { font-size:10px; margin-top:2px; }
  .box-total { background:#eff6ff; color:#2563eb; border:2px solid #bfdbfe; }
  .box-avg { background:#fefce8; color:#ca8a04; border:2px solid #fde68a; }
  .box-grade { background:${overallGC.bg}; color:${overallGC.text}; border:2px solid ${overallGC.border}; }
  .box-gpa { background:#f0fdf4; color:#16a34a; border:2px solid #bbf7d0; }
  .box-morjada { background:#faf5ff; color:#7c3aed; border:2px solid #ddd6fe; }
  .signatures { display:flex; justify-content:space-between; margin-top:50px; padding:0 10px; }
  .sig-block { text-align:center; min-width:140px; flex: 1; }
  .sig-line { border-top:1.5px dashed #9ca3af; padding-top:6px; margin-top:36px; margin-left: 10px; margin-right: 10px; }
  .sig-title { font-size:11px; font-weight:700; color:#374151; }
  .sig-name { font-size:11px; color:#6b7280; margin-top:2px; min-height: 14px; }
  .marksheet-page { break-after: page; page-break-after: always; padding: 2px; box-sizing: border-box; }
</style>
</head><body>
<div class="marksheet-page">
<div class="sheet slip">
<div class="header">
  ${institution?.logo_url ? `<img src="${institution.logo_url}" class="header-logo" crossorigin="anonymous" />` : ''}
  <h1>${instName || ''}</h1>
  ${institution?.address ? `<p class="sub">${institution.address}</p>` : ''}
  ${institution?.phone ? `<p class="sub">${bn ? 'ফোন' : 'Phone'}: ${institution.phone}</p>` : ''}
</div>

<div class="marksheet-title">
  <h2>${bn ? 'মার্কশিট' : 'Marksheet'}</h2>
  <p class="exam-name">${examTitle}</p>
</div>

<div class="student-info">
  ${photoHtml ? `<div class="student-photo">${photoHtml}</div>` : ''}
  <div class="student-details">
    <div class="row"><span class="label">${bn ? 'নাম:' : 'Name:'}</span><span class="value">${studentName}</span></div>
    <div class="row"><span class="label">${bn ? 'রোল নম্বর:' : 'Roll:'}</span><span class="value">${student.roll_number || '-'}</span></div>
    <div class="row"><span class="label">${bn ? 'রেজিস্ট্রেশন:' : 'Reg:'}</span><span class="value">${student.registration_number || student.student_id || '-'}</span></div>
    <div class="row"><span class="label">${bn ? 'পিতার নাম:' : "Father:"}</span><span class="value">${student.father_name_bn || student.father_name || '-'}</span></div>
    <div class="row"><span class="label">${bn ? 'জন্ম তারিখ:' : 'DOB:'}</span><span class="value">${student.date_of_birth || '-'}</span></div>
  </div>
</div>

<table>
  <thead><tr>
    <th>#</th>
    <th style="text-align:left;">${bn ? 'বিষয়' : 'Subject'}</th>
    <th>${bn ? 'পূর্ণমান' : 'Full Marks'}</th>
    <th>${bn ? 'প্রাপ্ত নম্বর' : 'Obtained'}</th>
    <th>${bn ? 'গ্রেড' : 'Grade'}</th>
    <th>GPA</th>
  </tr></thead>
  <tbody>${subjectRows}</tbody>
</table>

<div class="summary">
  <div class="summary-box box-total"><div class="label">${bn ? 'মোট নম্বর' : 'Total'}</div><div class="val">${totalMarks}</div><div class="sub-label">/ ${subjects.length * 100}</div></div>
  <div class="summary-box box-avg"><div class="label">${bn ? 'গড়' : 'Average'}</div><div class="val">${avgMarks.toFixed(1)}</div></div>
  <div class="summary-box box-grade"><div class="label">${bn ? 'গ্রেড' : 'Grade'}</div><div class="val">${overall.grade}</div></div>
  <div class="summary-box box-gpa"><div class="label">GPA</div><div class="val">${overall.gpa}</div></div>
  <div class="summary-box box-morjada"><div class="label">${bn ? 'মর্যাদা' : 'Merit'}</div><div class="val" style="font-size:16px;">${morjada}</div></div>
  ${rank && rank <= 3 ? `
  <div class="summary-box box-morjada" style="background:#ecfdf5;color:#059669;border-color:#a7f3d0;">
    <div class="label">${bn ? 'মেধা স্থান' : 'Merit Rank'}</div>
    <div class="val" style="font-size:20px;">${rankDisplay}</div>
  </div>
  ` : ''}
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-title">${bn ? 'শ্রেণি শিক্ষক' : 'Class Teacher'}</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-title">${bn ? 'পরীক্ষা নিয়ন্ত্রক' : 'Exam Controller'}</p>
    ${sigNames.examController ? `<p class="sig-name">${sigNames.examController}</p>` : ''}
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-title">${bn ? 'শিক্ষা সচিব' : 'Education Secretary'}</p>
    ${sigNames.eduSecretary ? `<p class="sig-name">${sigNames.eduSecretary}</p>` : ''}
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-title">${bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal'}</p>
    ${sigNames.principal ? `<p class="sig-name">${sigNames.principal}</p>` : ''}
  </div>
</div>
</div>
</div>
</body></html>`;
  };

  const handlePrint = () => {
    const html = getMarksheetHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
        }, 600);
      };
    } else {
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadPdf = async () => {
    const { downloadSlipAsPdf } = await import('@/lib/salarySlipPdf');
    const html = getMarksheetHtml();
    await downloadSlipAsPdf(html, `${studentName}_marksheet.pdf`);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        {bn ? 'ফিরে যান' : 'Back to List'}
      </Button>

      <div className="card-elevated rounded-xl overflow-hidden max-w-2xl mx-auto relative">
        {/* Logo Watermark */}
        {institution?.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
            <img src={institution.logo_url} alt="" className="w-64 h-64 object-contain opacity-[0.04] dark:opacity-[0.06]" />
          </div>
        )}

        {/* Institution Header - Green gradient */}
        <div className="relative z-10 px-6 py-5 text-center bg-gradient-to-br from-emerald-600 to-green-700 text-white">
          <div className="flex items-center justify-center gap-4">
            {institution?.logo_url && (
              <img src={institution.logo_url} alt="" className="w-14 h-14 object-contain rounded-full bg-white p-1" />
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{instName || ''}</h2>
              {institution?.address && <p className="text-xs text-emerald-100">{institution.address}</p>}
              {institution?.phone && <p className="text-xs text-emerald-100">{bn ? 'ফোন' : 'Phone'}: {institution.phone}</p>}
            </div>
            {institution?.logo_url && <div className="w-14 h-14 opacity-0" />}
          </div>
        </div>

        {/* Marksheet Title */}
        <div className="relative z-10 text-center py-3 bg-background border-b border-border">
          <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500 inline-block pb-1">
            {bn ? 'মার্কশিট' : 'Marksheet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{examTitle}</p>
        </div>

        {/* Student Info - Light green bg */}
        <div className="relative z-10 p-5 bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-emerald-200 dark:border-emerald-900/30">
          <div className="flex gap-4">
            {student.photo_url && (
              <div className="flex-shrink-0">
                <img
                  src={student.photo_url}
                  alt={student.name_bn || student.name_en}
                  className="w-20 h-24 object-cover rounded-md border-2 border-emerald-300 dark:border-emerald-700"
                />
              </div>
            )}
            <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">{bn ? 'নাম' : 'Name'}:</span>
                <p className="font-bold text-foreground">{bn ? student.name_bn : (student.name_en || student.name_bn)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">{bn ? 'রোল নম্বর' : 'Roll Number'}:</span>
                <p className="font-bold text-foreground">{student.roll_number || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">{bn ? 'রেজিস্ট্রেশন' : 'Registration'}:</span>
                <p className="font-bold text-foreground">{student.registration_number || student.student_id || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">{bn ? 'পিতার নাম' : "Father's Name"}:</span>
                <p className="font-bold text-foreground">{student.father_name_bn || student.father_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">{bn ? 'জন্ম তারিখ' : 'Date of Birth'}:</span>
                <p className="font-bold text-foreground">{student.date_of_birth || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject-wise Results */}
        <div className="relative z-10 p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-emerald-200 dark:border-emerald-800">
                <th className="text-left py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">#</th>
                <th className="text-left py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">{bn ? 'বিষয়' : 'Subject'}</th>
                <th className="text-center py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">{bn ? 'পূর্ণমান' : 'Full Marks'}</th>
                <th className="text-center py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">{bn ? 'প্রাপ্ত নম্বর' : 'Obtained'}</th>
                <th className="text-center py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">{bn ? 'গ্রেড' : 'Grade'}</th>
                <th className="text-center py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">GPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {subjectResults.map((r, idx) => (
                <tr key={r.subject.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2.5 font-medium text-foreground">{bn ? r.subject.name_bn : r.subject.name}</td>
                  <td className="py-2.5 text-center text-muted-foreground">100</td>
                  <td className="py-2.5 text-center font-bold text-foreground">{r.marks}</td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-bold border ${getGradeTwColor(r.grade)}`}>
                      {r.grade}
                    </span>
                  </td>
                  <td className="py-2.5 text-center font-semibold text-foreground">{r.gpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary - Colorful boxes */}
        <div className="relative z-10 p-5 border-t border-border">
          <div className="grid grid-cols-5 gap-3 text-center">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3 border-2 border-blue-200 dark:border-blue-800">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">{bn ? 'মোট নম্বর' : 'Total'}</p>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{totalMarks}</p>
              <p className="text-[10px] text-blue-500 dark:text-blue-500">/ {subjects.length * 100}</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 border-2 border-amber-200 dark:border-amber-800">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">{bn ? 'গড়' : 'Average'}</p>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{avgMarks.toFixed(1)}</p>
            </div>
            <div className={`rounded-xl p-3 border-2 ${getGradeTwColor(overall.grade)}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1">{bn ? 'গ্রেড' : 'Grade'}</p>
              <p className="text-2xl font-extrabold">{overall.grade}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 border-2 border-emerald-200 dark:border-emerald-800">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">GPA</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{overall.gpa}</p>
            </div>
            <div className={`rounded-xl p-3 border-2 ${rank && rank <= 3 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${rank && rank <= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                {rank && rank <= 3 ? (bn ? 'মেধা স্থান' : 'Rank') : (bn ? 'মর্যাদা' : 'Merit')}
              </p>
              <p className={`text-base font-extrabold ${rank && rank <= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                {rank && rank <= 3 ? rankDisplay : morjada}
              </p>
            </div>
          </div>
          {rank && rank <= 3 && (
            <div className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {bn ? `${morjada} (${rankDisplay} মেধা স্থান)` : `${morjada} (${rankDisplay} Merit Rank)`}
              </p>
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className="relative z-10 p-6 border-t border-border">
          <div className="grid grid-cols-4 gap-4 mt-8 pt-4">
            {[
              { label: bn ? 'শ্রেণি শিক্ষক' : 'Class Teacher', key: 'classTeacher' as const },
              { label: bn ? 'পরীক্ষা নিয়ন্ত্রক' : 'Exam Controller', key: 'examController' as const },
              { label: bn ? 'শিক্ষা সচিব' : 'Education Secretary', key: 'eduSecretary' as const },
              { label: bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal', key: 'principal' as const },
            ].map(sig => (
              <div key={sig.key} className="text-center space-y-2">
                <div className="border-b border-dashed border-muted-foreground/40 mx-2 pb-1 min-h-[40px]" />
                <p className="text-[10px] font-bold text-foreground">{sig.label}</p>
                <Input
                  className="text-center text-[10px] h-7 border-dashed"
                  placeholder={bn ? 'নাম লিখুন' : 'Enter name'}
                  value={sigNames[sig.key]}
                  onChange={(e) => setSigNames(prev => ({ ...prev, [sig.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-1.5">
              <FileDown className="w-4 h-4" /> {bn ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> {bn ? 'প্রিন্ট মার্কশিট' : 'Print Marksheet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualMarksheet;
