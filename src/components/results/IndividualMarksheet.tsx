import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, FileDown } from 'lucide-react';
import { getGrade } from './ClassResultTable';
import { useQuery } from '@tanstack/react-query';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { toBnDigits } from '@/lib/digits';

interface IndividualMarksheetProps {
  student: any;
  subjects: any[];
  marksMap: Record<string, number>;
  examTitle: string;
  onBack: () => void;
  rank?: number;
  className?: string;
  examName?: string;
  sessionName?: string;
}

const getMorjada = (grade: string) => {
  if (grade === 'A+') return 'মুমতাজ';
  if (grade === 'A') return 'জায়্যিদ জিদ্দান';
  if (grade === 'B') return 'জায়্যিদ';
  if (grade === 'C') return 'মকবুল';
  if (grade === 'D') return 'মকবুল';
  return 'রাসিব'; 
};

const IndividualMarksheet = ({ student, subjects, marksMap, examTitle, onBack, rank, className, examName, sessionName }: IndividualMarksheetProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade } = useGradingSystem();
  
  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => await fetchInstitutionInfo(),
    staleTime: 10 * 60 * 1000,
  });

  const subjectResults = subjects.map((sub: any) => {
    const marks = marksMap[`${student.id}_${sub.id}`] ?? 0;
    const { grade, gpa } = getGrade(marks);
    return { subject: sub, marks, grade, gpa };
  });

  const totalMarks = subjectResults.reduce((sum, r) => sum + r.marks, 0);
  const avgMarks = subjects.length > 0 ? totalMarks / subjects.length : 0;
  const overall: any = getOverallGrade(subjectResults.map(r => r.marks), student?.class_id);
  const morjada = (bn ? overall.title_bn : overall.title) || overall.title_bn || getMorjada(overall.grade);

  const instName = bn ? institution?.name : (institution?.name_en || institution?.name);
  const studentName = bn ? student.name_bn : (student.name_en || student.name_bn);

  // [Roll] - [Name] - [Class] - [Exam] - [Session]
  const titleParts = String(examTitle || '').split('—').map(x => x.trim()).filter(Boolean);
  const resolvedExam = examName || titleParts[0] || '';
  const resolvedClass = className || titleParts[1] || '';
  const resolvedSession = sessionName || titleParts[2] || '';
  const docName = [
    student?.roll_number ? (bn ? toBnDigits(student.roll_number) : String(student.roll_number)) : '',
    studentName,
    resolvedClass,
    resolvedExam,
    bn ? toBnDigits(resolvedSession) : resolvedSession,
  ].map(x => (x || '').trim()).filter(Boolean).join(' - ');
  const safeDocName = docName.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() || 'marksheet';

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="space-y-4 print:space-y-0">
      <style dangerouslySetInnerHTML={{ __html: `
        .marksheet-table {
          width: 100% !important;
          table-layout: auto !important;
        }

        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          html, body { 
            height: 100vh !important; 
            overflow: hidden !important; 
            background: #ffffff !important; 
          }
          
          body * { visibility: hidden; }
          #marksheet-printable-area, #marksheet-printable-area * { visibility: visible; }
          
          /* ব্যাকগ্রাউন্ড ও অতিরিক্ত জিনিস হাইড */
          body::before, .bg-image, img:not(.marksheet-logo), .no-print {
            display: none !important;
          }

          #marksheet-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: auto !important;
            max-height: 100vh !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-inside: avoid !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-hidden { display: none !important; }
          .bg-\\[\\#1e5d3b\\] { 
            background-color: #1e5d3b !important; 
          }
          #signature-section {
            margin-top: auto !important;
            padding-bottom: 2mm;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
          }
          
          .my-4, .my-3 { margin-top: 4px !important; margin-bottom: 4px !important; }
          .p-4, .p-3 { padding: 4px !important; }
          table td, table th { padding: 2px 4px !important; }
        }
      `}} />
      
      <div className="flex justify-between items-center print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          {bn ? 'ফিরে যান' : 'Back'}
        </Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800">
            <Printer className="w-4 h-4" />
            {bn ? 'ডাউনলোড / প্রিন্ট' : 'Download / Print'}
          </Button>
        </div>
      </div>


      <div id="marksheet-printable-area" className="mx-auto max-w-[210mm] min-h-[297mm] bg-white text-black p-[10mm] shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="marksheet-banner bg-[#1e5d3b] text-white p-4 print:p-3 text-center rounded-t-lg w-full">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {institution?.logo_url && <img src={institution.logo_url} alt="Logo" className="marksheet-logo w-16 h-16 print:w-14 print:h-14 object-contain bg-white p-1 rounded-full" />}
            <div>
              <h1 className="text-xl print:text-lg font-extrabold tracking-tight">{instName || (bn ? 'মাদ্রাসা' : 'Institution')}</h1>
              <p className="text-xs opacity-90 mt-0.5">{institution?.address}</p>
              <p className="text-xs opacity-90">{institution?.phone}</p>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-emerald-500/50">
            <h2 className="text-xl font-bold tracking-wider">{bn ? 'মার্কশিট' : 'Marksheet'}</h2>
            <p className="text-sm opacity-90">{examTitle}</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="marksheet-info bg-gray-50 p-4 print:p-3 my-4 print:my-3 rounded-lg border border-gray-200 grid grid-cols-2 gap-y-2 gap-x-4 text-[13px] print:text-[12px] w-full">
          <div className="flex items-center gap-2"><span className="font-bold text-gray-700 w-20">নাম:</span> <span>{studentName}</span></div>
          <div className="flex items-center gap-2"><span className="font-bold text-gray-700 w-20">রোল নম্বর:</span> <span>{student.roll_number}</span></div>
          <div className="flex items-center gap-2"><span className="font-bold text-gray-700 w-20">রেজিস্ট্রেশন:</span> <span>{student.registration_number || student.student_id}</span></div>
          <div className="flex items-center gap-2"><span className="font-bold text-gray-700 w-20">জন্ম তারিখ:</span> <span>{student.date_of_birth}</span></div>
        </div>

        {/* Subjects Table */}
        <div className="w-full overflow-x-auto block rounded-lg border border-gray-300 my-4 print:my-3">
          <table className="marksheet-table w-full min-w-[700px] table-auto border-collapse text-sm print:text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 p-1.5 w-[10%] text-center">#</th>
                <th className="border-r border-gray-300 p-1.5 w-[55%] text-left">বিষয়</th>
                <th className="border-r border-gray-300 p-1.5 w-[10%] text-center">পূর্ণমান</th>
                <th className="border-r border-gray-300 p-1.5 w-[12%] text-center">প্রাপ্ত নম্বর</th>
                <th className="border-r border-gray-300 p-1.5 w-[8%] text-center">গ্রেড</th>
                <th className="p-1.5 w-[5%] text-center">GPA</th>
              </tr>
            </thead>
            <tbody>
              {subjectResults.map((r, i) => (
                <tr key={i} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="border-r border-gray-300 p-1.5 text-center text-gray-500">{i + 1}</td>
                  <td className="border-r border-gray-300 p-1.5 font-medium" title={bn ? r.subject.name_bn : r.subject.name}>{bn ? r.subject.name_bn : r.subject.name}</td>
                  <td className="border-r border-gray-300 p-1.5 text-center">100</td>
                  <td className="border-r border-gray-300 p-1.5 text-center font-bold">{r.marks}</td>
                  <td className="border-r border-gray-300 p-1.5 text-center font-semibold">{r.grade}</td>
                  <td className="p-1.5 text-center font-semibold text-emerald-700">{r.gpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-2 my-4 print:my-3">
          {[
            { label: 'মোট নম্বর', value: totalMarks, color: 'bg-blue-50 text-blue-800 border-blue-200' },
            { label: 'গড়', value: avgMarks.toFixed(1), color: 'bg-amber-50 text-amber-800 border-amber-200' },
            { label: 'গ্রেড', value: overall.grade, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
            { label: 'GPA', value: overall.gpa, color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
            { label: 'ফলাফল', value: morjada, color: 'bg-rose-50 text-rose-800 border-rose-200' },
          ].map((item, i) => (
            <div key={i} className={`summary-card border p-2 text-center rounded-lg shadow-sm ${item.color}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-70">{item.label}</div>
              <div className="text-base print:text-sm font-black">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Footer Signatures */}
        <div id="signature-section" className="mt-auto flex justify-between gap-12 text-center text-[12px] print:text-[11px] font-bold text-gray-800 pb-2">
          {['শ্রেণি শিক্ষক', 'পরীক্ষা নিয়ন্ত্রক', 'শিক্ষা সচিব', 'মুহতামিম / অধ্যক্ষ'].map((role, i) => (
            <div key={i} className="flex-1">
              <div className="border-t border-gray-900 pt-2">{role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IndividualMarksheet;
