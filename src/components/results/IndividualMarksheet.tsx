import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { getGrade } from './ClassResultTable';
import { useQuery } from '@tanstack/react-query';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { toBnDigits } from '@/lib/digits';
import { cn } from '@/lib/utils';

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

const IndividualMarksheet = ({ student, subjects, marksMap, examTitle, onBack, rank, className, examName, sessionName }: IndividualMarksheetProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade } = useGradingSystem();
  const [isSample, setIsSample] = useState(false);

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => await fetchInstitutionInfo(),
    staleTime: 10 * 60 * 1000,
  });

  const subjectResults = subjects.map((sub: any) => {
    const marks = isSample ? (Math.random() > 0.2 ? 70 + Math.floor(Math.random() * 30) : 30 + Math.floor(Math.random() * 10)) : (marksMap[`${student.id}_${sub.id}`] ?? 0);
    const { grade, gpa } = getGrade(marks);
    return { subject: sub, marks, grade, gpa };
  });

  const totalMarks = subjectResults.reduce((sum, r) => sum + r.marks, 0);
  const avgMarks = subjects.length > 0 ? totalMarks / subjects.length : 0;
  const overall: any = getOverallGrade(subjectResults.map(r => r.marks), student?.class_id);

  const instName = institution?.name || "আল-আরাবিয়া হোসাইনিয়া হাফিজিয়া মাদরাসা";
  const addressLine = institution?.address || "এম.এইচ সেন্ট্রাল, খাজাঞ্চী রোড, বিশ্বনাথ, সিলেট • মোবাইল: ০১৭৪৯৮৪২৪০১";
  const studentName = isSample ? "তাহমিন আলী" : (bn ? student.name_bn : (student.name_en || student.name_bn));
  
  const titleParts = String(examTitle || '').split('—').map(x => x.trim()).filter(Boolean);
  const resolvedExam = examName || titleParts[0] || '১ম সাময়িক পরীক্ষা ২০২৬';
  const resolvedClass = className || titleParts[1] || 'নুরানি ১ম শ্রেণি';
  const resolvedSession = sessionName || titleParts[2] || '২০২৬-২৭';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-4 print:p-0 print:bg-white printable-area">
      {/* Top Utility Bar */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 no-print print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-slate-600 hover:text-emerald-700">
          <ArrowLeft className="w-4 h-4" />
          {bn ? 'ফিরে যান' : 'Back'}
        </Button>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsSample(!isSample)}
            className={cn("border-emerald-200", isSample ? "bg-emerald-50 text-emerald-700" : "text-slate-600")}
          >
            {isSample ? 'Sample Active' : 'Toggle Sample'}
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-[#065f46] hover:bg-[#044e3a] text-white px-6">
            <Printer className="w-4 h-4" />
            {bn ? 'প্রিন্ট / পিডিএফ' : 'Print / PDF'}
          </Button>
        </div>
      </div>

      {/* Main A4 Container */}
      <div 
        id="marksheet-printable-area" 
        className="relative bg-white shadow-[0_0_20px_rgba(0,0,0,0.1)] w-[210mm] min-h-[297mm] p-[10mm] flex flex-col print:shadow-none print:w-full print:p-[10mm] printable-marksheet"
        style={{ boxSizing: 'border-box' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
          
          #marksheet-printable-area {
            font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif;
            color: #334155;
          }

          @media print {
            /* Hide every single element on the page by default */
            body * {
              visibility: hidden !important;
            }

            /* Force clean white page background */
            html, body {
              background: #ffffff !important;
              background-image: none !important;
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Make ONLY the printable marksheet and its children visible */
            .printable-marksheet, 
            .printable-marksheet * {
              visibility: visible !important;
            }

            /* Position the marksheet at the absolute top-left of the A4 page */
            .printable-marksheet {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 210mm !important;
              max-height: 270mm !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
              padding: 10mm !important;
              margin: 0 !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }

            @page {
              size: A4 portrait;
              margin: 0;
            }
          }

          .marksheet-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .marksheet-table th, .marksheet-table td {
            border: 1px solid #e2e8f0;
            padding: 3px 6px;
            text-align: center;
          }
          .marksheet-table th {
            background-color: #065f46;
            color: white;
            font-weight: 600;
            font-size: 14px;
          }
          .marksheet-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .marksheet-table td {
            font-size: 14px;
          }
          .marksheet-table .subject-col {
            text-align: left;
            font-weight: 500;
          }

          .grade-badge {
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
          }
          .grade-a-plus { background-color: #dcfce7; color: #166534; }
          .grade-a { background-color: #dcfce7; color: #15803d; }
          .grade-b { background-color: #fef9c3; color: #854d0e; }
          .grade-c { background-color: #ffedd5; color: #9a3412; }
          .grade-f { background-color: #fee2e2; color: #991b1b; }
        `}} />

        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-[6px] bg-[#065f46]"></div>
        <div className="absolute top-[6px] left-0 w-full h-[2px] bg-[#d97706]"></div>

        {/* Header Section */}
        <div className="flex justify-between items-start mt-4 mb-8">
          {/* Logo */}
          <div className="w-[80px] h-[80px] rounded-full border-[3px] border-[#065f46] p-[2px] flex items-center justify-center bg-white shadow-sm overflow-hidden">
            <div className="w-full h-full rounded-full border border-[#d97706] flex items-center justify-center">
              {institution?.logo_url ? (
                <img src={institution.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <div className="text-[#065f46] font-bold text-xs text-center leading-tight">LOGO</div>
              )}
            </div>
          </div>

          {/* Institution Info */}
          <div className="flex-1 text-center px-4">
            <h1 className="text-[#065f46] text-[24px] font-bold mb-1 leading-tight">
              {instName}
            </h1>
            <p className="text-slate-500 text-[13px] font-medium max-w-[450px] mx-auto">
              {addressLine}
            </p>
          </div>

          {/* QR/Document ID */}
          <div className="w-[80px] text-right">
            <div className="inline-block border border-slate-200 p-2 rounded-lg bg-slate-50">
              <div className="w-12 h-12 bg-white border border-slate-100 flex items-center justify-center text-[8px] text-slate-400 font-mono">
                QR CODE
              </div>
              <div className="text-[9px] mt-1 font-mono text-slate-500">ID: {student.student_id || '20261002'}</div>
            </div>
          </div>
        </div>

        {/* Divider & Title */}
        <div className="relative mb-8 text-center">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-emerald-100"></div>
          <div className="relative inline-block bg-white px-6">
            <div className="text-emerald-700 flex items-center gap-2">
              <span className="text-[10px]">◆</span>
              <div className="bg-emerald-50 px-8 py-2 rounded-full border border-emerald-100 shadow-sm">
                <h2 className="text-[#065f46] text-[18px] font-bold leading-none mb-1">একাডেমিক ট্রান্সক্রিপ্ট / মার্কশিট</h2>
                <p className="text-amber-700 text-[12px] font-medium">{resolvedExam} — {resolvedClass}</p>
              </div>
              <span className="text-[10px]">◆</span>
            </div>
          </div>
        </div>

        {/* Student Information Card */}
        <div className="bg-[#fafaf9] border border-emerald-100 rounded-2xl p-6 mb-8 grid grid-cols-3 gap-y-4 gap-x-8">
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">শিক্ষার্থী নাম (Student Name)</span>
            <span className="text-[15px] font-bold text-slate-700">{studentName}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">রোল নম্বর (Roll No)</span>
            <span className="text-[15px] font-bold text-slate-700">{isSample ? '1001' : toBnDigits(student.roll_number)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">রেজিস্ট্রেশন (Reg No)</span>
            <span className="text-[15px] font-bold text-slate-700">{student.registration_number || '20261002'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">জন্ম তারিখ (DOB)</span>
            <span className="text-[15px] font-bold text-slate-700">{student.date_of_birth || '১৫ মে, ২০১৮'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">শ্রেণি (Class)</span>
            <span className="text-[15px] font-bold text-slate-700">{resolvedClass}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">শিক্ষাবর্ষ (Session)</span>
            <span className="text-[15px] font-bold text-slate-700">{resolvedSession}</span>
          </div>
        </div>

        {/* Marks Details Table */}
        <div className="flex-1 overflow-visible">
          <table className="marksheet-table">
            <thead>
              <tr>
                <th className="w-[50px]">Sl</th>
                <th className="text-left">বিষয় (Subject)</th>
                <th className="w-[100px]">পূর্ণমান</th>
                <th className="w-[120px]">প্রাপ্ত নম্বর</th>
                <th className="w-[100px]">লেটার গ্রেড</th>
                <th className="w-[100px]">গ্রেড পয়েন্ট</th>
              </tr>
            </thead>
            <tbody>
              {subjectResults.map((r, i) => (
                <tr key={i}>
                  <td className="text-slate-400">{i + 1}</td>
                  <td className="subject-col text-slate-700">{bn ? r.subject.name_bn : r.subject.name}</td>
                  <td className="font-medium text-slate-600">100</td>
                  <td className="font-bold text-slate-900">{isSample ? toBnDigits(r.marks) : (bn ? toBnDigits(r.marks) : r.marks)}</td>
                  <td>
                    <span className={cn(
                      "grade-badge",
                      r.grade === 'A+' ? 'grade-a-plus' : 
                      r.grade === 'A' ? 'grade-a' :
                      r.grade === 'A-' ? 'grade-a' :
                      r.grade === 'B' ? 'grade-b' :
                      r.grade === 'C' ? 'grade-c' :
                      r.grade === 'D' ? 'grade-c' : 'grade-f'
                    )}>
                      {r.grade}
                    </span>
                  </td>
                  <td className="font-bold text-emerald-700">
                    {isSample ? toBnDigits(Number(r.gpa).toFixed(2)) : (bn ? toBnDigits(Number(r.gpa).toFixed(2)) : Number(r.gpa).toFixed(2))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary & Result Statistics Cards */}
        <div className="grid grid-cols-5 gap-4 mt-8 mb-8">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
            <span className="text-[10px] text-blue-500 font-bold uppercase block mb-1">মোট নম্বর</span>
            <span className="text-[18px] font-black text-blue-900">
              {bn ? toBnDigits(student.total_marks || totalMarks) : (student.total_marks || totalMarks)}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-center">
            <span className="text-[10px] text-amber-500 font-bold uppercase block mb-1">মেধা স্থান</span>
            <span className="text-[18px] font-black text-amber-900">
              {student.rank ? toBnDigits(student.rank) + 'তম' : '-'}
            </span>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-center">
            <span className="text-[10px] text-indigo-500 font-bold uppercase block mb-1">সর্বমোট GPA</span>
            <span className="text-[18px] font-black text-indigo-900">
              {bn ? toBnDigits(Number(student.gpa || overall.gpa).toFixed(2)) : Number(student.gpa || overall.gpa).toFixed(2)}
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
            <span className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">মর্যাদা</span>
            <span className="text-[18px] font-black text-emerald-900">
              {(() => {
                const gpa = Number(student.gpa || overall.gpa);
                // Check if any subject mark is below pass mark or grade is F
                const hasFailedSubject = subjectResults.some(r => r.grade === 'F');
                const isFail = student.letter_grade === 'F' || overall.grade === 'F' || gpa === 0 || hasFailedSubject;
                
                if (isFail) return "রাসিব";
                
                // If there's an explicit division from backend, use it
                if (student.division || student.status_text || student.madrasha_grade) {
                  return student.division || student.status_text || student.madrasha_grade;
                }
                
                if (gpa >= 5.0) return "মুমতাজ";
                if (gpa >= 4.0) return "জায়্যিদ জিদ্দান";
                if (gpa >= 3.0) return "জয়্যিদ";
                if (gpa >= 1.0) return "মাকবুল";
                return "রাসিব";
              })()}
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center shadow-sm">
            <span className="text-[10px] text-emerald-600 font-bold uppercase block mb-1">চূড়ান্ত গ্রেড</span>
            <span className={cn(
              "text-white text-[12px] px-3 py-0.5 rounded-full font-bold",
              (() => {
                const hasFailedSubject = subjectResults.some(r => r.grade === 'F');
                const isFail = (student.letter_grade || overall.grade) === 'F' || hasFailedSubject;
                return !isFail ? 'bg-emerald-600' : 'bg-rose-600';
              })()
            )}>
              {(() => {
                const hasFailedSubject = subjectResults.some(r => r.grade === 'F');
                return hasFailedSubject ? 'F' : (student.letter_grade || overall.grade);
              })()}
            </span>
          </div>
        </div>

        {/* Grading Scale & Signatures */}
        <div className="mt-5 flex justify-between items-end gap-12">
          {/* Reference Key */}
          <div className="w-[200px] border border-slate-100 p-3 rounded-lg bg-slate-50/50">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2 border-b border-slate-200 pb-1">Grading Scale</h4>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-medium text-slate-500">
              <div className="flex justify-between"><span>80-100</span> <span className="text-emerald-700 font-bold">A+ (5.0)</span></div>
              <div className="flex justify-between"><span>70-79</span> <span className="text-emerald-700 font-bold">A (4.0)</span></div>
              <div className="flex justify-between"><span>60-69</span> <span className="text-emerald-700 font-bold">A- (3.5)</span></div>
              <div className="flex justify-between"><span>50-59</span> <span className="text-emerald-700 font-bold">B (3.0)</span></div>
              <div className="flex justify-between"><span>40-49</span> <span className="text-emerald-700 font-bold">C (2.0)</span></div>
              <div className="flex justify-between"><span>33-39</span> <span className="text-emerald-700 font-bold">D (1.0)</span></div>
              <div className="flex justify-between"><span>00-32</span> <span className="text-rose-700 font-bold">F (0.0)</span></div>
            </div>
          </div>

          {/* Signature Grid */}
          <div className="flex-1 grid grid-cols-4 gap-4 text-center">
            <div className="flex flex-col gap-1">
              <div className="w-full border-t border-dotted border-slate-400 pt-1"></div>
              <span className="text-[11px] font-bold text-slate-600">শ্রেণি শিক্ষক</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="w-full border-t border-dotted border-slate-400 pt-1"></div>
              <span className="text-[11px] font-bold text-slate-600">পরীক্ষা নিয়ন্ত্রক</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="w-full border-t border-dotted border-slate-400 pt-1"></div>
              <span className="text-[11px] font-bold text-slate-600">অভিভাবক</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <div className="w-16 h-16 border-2 border-dashed border-emerald-100 rounded-full flex items-center justify-center mb-1">
                <span className="text-[7px] text-slate-300 font-bold opacity-50">OFFICIAL SEAL</span>
              </div>
              <div className="w-full border-t border-dotted border-slate-400 pt-1"></div>
              <span className="text-[11px] font-bold text-slate-600 uppercase">মুহতামিম / অধ্যক্ষ</span>
            </div>
          </div>
        </div>

        {/* Branding Subtitle */}
        <div className="absolute bottom-4 left-0 w-full text-center text-[8px] text-slate-300 pointer-events-none">
          Generated via Academic Management System
        </div>
      </div>
    </div>
  );
};

export default IndividualMarksheet;