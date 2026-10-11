import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { toBnDigits } from '@/lib/digits';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

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

const formatDob = (dobStr: string | null | undefined, isBn: boolean): string => {
  if (!dobStr) return '-';
  const str = String(dobStr).trim();
  const parts = str.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
      const bnMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
      const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (isBn) {
        return `${toBnDigits(day)} ${bnMonths[month - 1]}, ${toBnDigits(year)}`;
      } else {
        return `${day} ${enMonths[month - 1]}, ${year}`;
      }
    }
  }
  return isBn ? toBnDigits(str) : str;
};

const IndividualMarksheet = ({ student, subjects, marksMap, examTitle, onBack, rank, className, examName, sessionName }: IndividualMarksheetProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade, getGrade: getSubjectGrade, maxMarks } = useGradingSystem();
  const [isSample, setIsSample] = useState(false);

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => await fetchInstitutionInfo(),
    staleTime: 10 * 60 * 1000,
  });

  const subjectResults = subjects.map((sub: any) => {
    const raw = isSample ? (Math.random() > 0.2 ? 70 + Math.floor(Math.random() * 30) : 30 + Math.floor(Math.random() * 10)) : marksMap[`${student.id}_${sub.id}`];
    const entered = raw !== undefined && raw !== null && (raw as any) !== '' && !Number.isNaN(Number(raw));
    const marks = entered ? Number(raw) : 0;
    const g = getSubjectGrade(marks);
    const grade = entered ? g.grade : '-';
    const gpa = entered ? g.gpa : '-';
    return { subject: sub, marks, grade, gpa, entered };

  });

  // Blank subjects are excluded from grading so they can't wrongly fail a student.
  const gradedMarks = subjectResults.filter(r => r.entered).map(r => r.marks);
  const totalMarks = gradedMarks.reduce((sum, m) => sum + m, 0);
  const overall: any = getOverallGrade(gradedMarks, student?.class_id);
  // Only subjects with an actual mark can cause a fail — blank subjects are ignored.
  const hasFailedSubject = !overall.graced && subjectResults.some(r => r.entered && r.grade === 'F');



  const instName = bn ? (institution?.name || "আল-আরাবিয়া হোসাইনিয়া হাফিজিয়া মাদরাসা") : (institution?.name_en || "Al-Arabia Subhania Hafizia Madrasa");
  const addressLine = bn ? (institution?.address || "এম.এইচ সেন্ট্রাল, খাজাঞ্চী রোড, বিশ্বনাথ, সিলেট • মোবাইল: ০১৭৪৯৮৪২৪০১") : (institution?.address_en || "M.H Central, Khajanchi Road, Bishwanath, Sylhet • Mobile: 01749842401");
  const studentName = isSample ? (bn ? "তাহমিন আলী" : "Tahmin Ali") : (bn ? student.name_bn : (student.name_en || student.name_bn));
  
  const titleParts = String(examTitle || '').split('—').map(x => x.trim()).filter(Boolean);
  const resolvedExam = examName || titleParts[0] || '১ম সাময়িক পরীক্ষা ২০২৬';
  const resolvedClass = className || titleParts[1] || (bn ? 'নুরানি ১ম শ্রেণি' : 'Noorani Class 1');
  const resolvedSession = sessionName || titleParts[2] || (bn ? '২০২৬-২৭' : '2026-27');

  const handlePrint = () => {
    const el = document.getElementById('marksheet-printable-area');
    if (!el) {
      window.print();
      return;
    }

    try {
      let iframe = document.getElementById('marksheet-print-frame') as HTMLIFrameElement | null;
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe = document.createElement('iframe');
      iframe.id = 'marksheet-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-99999px';
      iframe.style.left = '-99999px';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map(s => s.outerHTML)
          .join('\n');

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>${bn ? 'মার্কশিট' : 'Marksheet'} - ${studentName}</title>
              ${styles}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  box-sizing: border-box;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  overflow: hidden !important;
                  font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif;
                }
                #marksheet-printable-area {
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  max-height: 297mm !important;
                  margin: 0 !important;
                  padding: 8mm 10mm !important;
                  box-sizing: border-box !important;
                  box-shadow: none !important;
                  border: 2px solid #064e3b !important;
                  background: #ffffff !important;
                  overflow: hidden !important;
                }
                .marksheet-table th {
                  background-color: #064e3b !important;
                  color: #ffffff !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              </style>
            </head>
            <body>
              ${el.outerHTML}
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe?.contentWindow?.focus();
            iframe?.contentWindow?.print();
          } catch (e) {
            window.print();
          }
        }, 350);
        return;
      }
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print', e);
    }

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
        className="relative bg-white shadow-[0_0_20px_rgba(0,0,0,0.1)] w-[210mm] min-h-[297mm] p-[8mm] flex flex-col print:shadow-none print:w-full print:p-[8mm] printable-marksheet border-2 border-[#064e3b]"
        style={{ boxSizing: 'border-box' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
          
          #marksheet-printable-area {
            font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif;
            color: #0f172a;
          }

          @media print {
            header, nav, footer, .no-print, [role="navigation"], .public-header, .top-bar {
              display: none !important;
            }

            body * {
              visibility: hidden;
            }

            html, body {
              background: #ffffff !important;
              background-image: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            #marksheet-printable-area,
            #marksheet-printable-area * {
              visibility: visible !important;
            }

            #marksheet-printable-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: 2px solid #064e3b !important;
              padding: 8mm 10mm !important;
              margin: 0 !important;
              overflow: hidden !important;
              z-index: 9999999 !important;
              box-sizing: border-box !important;
            }

            @page {
              size: A4 portrait;
              margin: 0;
            }
          }

          .marksheet-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            border: 1.5px solid #064e3b;
          }
          .marksheet-table th, .marksheet-table td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            text-align: center;
          }
          .marksheet-table th {
            background-color: #064e3b !important;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 13px;
            padding: 6.5px 6px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .marksheet-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .marksheet-table td {
            font-size: 13.5px;
            color: #0f172a;
          }
          .marksheet-table .subject-col {
            text-align: left;
            font-weight: 600;
            color: #0f172a;
          }

          .grade-badge {
            padding: 2.5px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            display: inline-block;
            min-width: 42px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .grade-a-plus { background-color: #047857; color: #FFFFFF; border: 1px solid #065f46; }
          .grade-a { background-color: #059669; color: #FFFFFF; border: 1px solid #047857; }
          .grade-a-minus { background-color: #0d9488; color: #FFFFFF; border: 1px solid #0f766e; }
          .grade-b { background-color: #2563EB; color: #FFFFFF; border: 1px solid #1D4ED8; }
          .grade-c { background-color: #D97706; color: #FFFFFF; border: 1px solid #B45309; }
          .grade-d { background-color: #EA580C; color: #FFFFFF; border: 1px solid #C2410C; }
          .grade-f { background-color: #DC2626; color: #FFFFFF; border: 1px solid #B91C1C; }
          .grade-none { background-color: #F1F5F9; color: #64748B; border: 1px solid #CBD5E1; }
        `}} />

        {/* Watermark Logo */}
        {institution?.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none z-0 overflow-hidden">
            <img 
              src={institution.logo_url} 
              alt="" 
              className="w-[350px] h-[350px] object-contain grayscale"
              style={{ filter: 'grayscale(100%) brightness(0.9)' }}
            />
          </div>
        )}

        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-[6px] bg-[#065f46]"></div>
        <div className="absolute top-[6px] left-0 w-full h-[2px] bg-[#d97706]"></div>

        {/* Header Section */}
        <div className="flex justify-between items-center py-1 mb-2">
          {/* Logo */}
          <div className="w-[80px] h-[80px] rounded-full border-[2px] border-[#064e3b] p-[2px] flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0">
            <div className="w-full h-full rounded-full border border-emerald-100 flex items-center justify-center bg-emerald-50/30">
              {institution?.logo_url ? (
                <img src={institution.logo_url} alt="Logo" className="w-14 h-14 object-contain" />
              ) : (
                <div className="text-[#064e3b] font-bold text-[10px] text-center leading-tight">LOGO</div>
              )}
            </div>
          </div>

          {/* Institution Info */}
          <div className="flex-1 text-center px-3">
            <div className="text-[11px] text-emerald-800 font-medium mb-0.5 tracking-wider">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <h1 className="text-[#064e3b] text-[22px] font-bold mb-0.5 leading-tight tracking-tight">
              {instName}
            </h1>
            <p className="text-slate-600 text-[11.5px] font-medium leading-relaxed max-w-[480px] mx-auto">
              {addressLine}
            </p>
          </div>

          {/* QR/Document ID */}
          <div className="w-[80px] text-right shrink-0">
            <div className="inline-block border border-slate-300 p-1 rounded-md bg-white shadow-sm">
              <div className="bg-white p-0.5 rounded flex items-center justify-center">
                <QRCodeSVG 
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/result?roll=${student.roll_number || student.student_id}`}
                  size={52}
                  level="L"
                  includeMargin={false}
                />
              </div>
              <div className="text-[7.5px] mt-0.5 font-mono text-slate-600 text-center leading-none tracking-tighter">ID: {student.student_id || student.registration_no || (isSample ? '20261002' : '-')}</div>
            </div>
          </div>
        </div>

        {/* Title Banner */}
        <div className="mb-2.5 text-center">
          <div className="inline-block bg-[#064e3b] text-white px-8 py-1.5 rounded-md shadow-sm border border-[#043e2f]">
            <h2 className="text-[15.5px] font-bold tracking-wider leading-none text-white">
              {bn ? 'একাডেমিক ট্রান্সক্রিপ্ট / নম্বরপত্র' : 'ACADEMIC TRANSCRIPT / MARKSHEET'}
            </h2>
            <p className="text-emerald-100 text-[10.5px] font-medium tracking-wide uppercase mt-1">
              {resolvedExam} • {resolvedClass} • {bn ? 'শিক্ষাবর্ষ:' : 'Session:'} {resolvedSession}
            </p>
          </div>
        </div>

        {/* Student Information Card */}
        <div className="bg-slate-50/90 border border-slate-300 rounded-lg px-3.5 py-2 mb-2.5 grid grid-cols-3 gap-y-1.5 gap-x-6 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'শিক্ষার্থীর নাম (STUDENT NAME)' : 'STUDENT NAME'}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">{studentName}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? "পিতার নাম (FATHER'S NAME)" : "FATHER'S NAME"}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">
              {isSample 
                ? (bn ? 'আব্দুর রহমান' : 'Abdur Rahman') 
                : (bn ? (student.father_name || student.fathers_name || student.father_name_en || '-') : (student.father_name_en || student.father_name || student.fathers_name || '-'))}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'রোল নম্বর (ROLL NO)' : 'ROLL NO'}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">{isSample ? (bn ? '১০০১' : '1001') : (bn ? toBnDigits(student.roll_number) : student.roll_number)}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'রেজিস্ট্রেশন (REG NO)' : 'REG NO'}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">
              {(() => {
                const reg = student.registration_no || student.registration_number || student.student_id;
                if (isSample) return bn ? '২০২৬১০০২' : '20261002';
                return reg ? (bn ? toBnDigits(reg) : reg) : '-';
              })()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'শ্রেণি (CLASS)' : 'CLASS'}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">{resolvedClass}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'শিক্ষাবর্ষ (SESSION)' : 'SESSION'}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">{resolvedSession}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'জন্ম তারিখ (DOB)' : 'DATE OF BIRTH'}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">
              {(() => {
                if (isSample) return bn ? '১৫ মে, ২০১৮' : '15 May, 2018';
                return formatDob(student.date_of_birth, bn);
              })()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'বিভাগ/শাখা (SECTION)' : 'SECTION'}</span>
            <span className="text-[13.5px] font-bold text-slate-900 leading-tight">
              {isSample 
                ? (bn ? 'ক' : 'A') 
                : (student.section || student.branch || (bn ? (student.divisions?.name_bn || student.division_name_bn) : (student.divisions?.name || student.division_name)) || student.division_name || '-')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">{bn ? 'ফলাফল অবস্থা (STATUS)' : 'RESULT STATUS'}</span>
            <span className={cn(
              "text-[13.5px] font-bold leading-tight",
              hasFailedSubject ? "text-rose-700" : "text-emerald-700"
            )}>
              {hasFailedSubject ? (bn ? 'অকৃতকার্য' : 'FAILED') : (bn ? 'কৃতকার্য' : 'PASSED')}
            </span>
          </div>
        </div>

        {/* Marks Details Table */}
        <div className="flex-1 overflow-visible">
          <table className="marksheet-table">
            <thead>
              <tr>
                <th style={{ backgroundColor: '#064e3b', color: '#ffffff' }} className="w-[50px] font-bold">{bn ? 'ক্রমিক' : 'Sl No'}</th>
                <th style={{ backgroundColor: '#064e3b', color: '#ffffff' }} className="text-left font-bold">{bn ? 'বিষয়\u00a0' : 'Subject'}</th>
                <th style={{ backgroundColor: '#064e3b', color: '#ffffff' }} className="w-[100px] font-bold">{bn ? 'পূর্ণমান' : 'Full Marks'}</th>
                <th style={{ backgroundColor: '#064e3b', color: '#ffffff' }} className="w-[120px] font-bold">{bn ? 'প্রাপ্ত নম্বর' : 'Obtained Marks'}</th>
                <th style={{ backgroundColor: '#064e3b', color: '#ffffff' }} className="w-[100px] font-bold">{bn ? 'লেটার গ্রেড' : 'Letter Grade'}</th>
                <th style={{ backgroundColor: '#064e3b', color: '#ffffff' }} className="w-[100px] font-bold">{bn ? 'গ্রেড পয়েন্ট' : 'Grade Point'}</th>
              </tr>
            </thead>
            <tbody>
              {subjectResults.map((r, i) => (
                <tr key={i}>
                  <td className="text-slate-700 font-medium">{bn ? toBnDigits(i + 1) : (i + 1)}</td>
                  <td className="subject-col text-slate-900 font-semibold">{bn ? r.subject.name_bn : (r.subject.name_en || r.subject.name)}</td>
                  <td className="font-semibold text-slate-700">{bn ? toBnDigits(r.subject.full_marks || maxMarks || 100) : (r.subject.full_marks || maxMarks || 100)}</td>
                  <td className="font-bold text-slate-900 text-[14.5px]">{!r.entered ? '-' : (isSample || bn ? toBnDigits(r.marks) : r.marks)}</td>
                  <td>
                     <span className={cn(
                       "grade-badge",
                       !r.entered ? 'grade-none' :
                       r.grade === 'A+' ? 'grade-a-plus' : 
                       r.grade === 'A' ? 'grade-a' :
                       r.grade === 'A-' ? 'grade-a-minus' :
                       r.grade === 'B' ? 'grade-b' :
                       r.grade === 'C' ? 'grade-c' :
                       r.grade === 'D' ? 'grade-d' : 'grade-f'
                     )}>
                      {r.grade}
                    </span>
                  </td>
                  <td className="font-bold text-slate-900 text-[14px]">
                    {!r.entered ? '-' : (isSample || bn ? toBnDigits(Number(r.gpa).toFixed(2)) : Number(r.gpa).toFixed(2))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary & Result Statistics Cards */}
        <div className="grid grid-cols-5 gap-3 my-3">
          <div className="bg-white border border-slate-200 p-3 rounded-lg text-center shadow-sm">
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">{bn ? 'মোট নম্বর' : 'Total Marks'}</span>
            <span className="text-[22px] font-bold text-slate-800">
              {bn ? toBnDigits(student.total_marks || totalMarks) : (student.total_marks || totalMarks)}
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg text-center shadow-sm">
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">{bn ? 'মেধা স্থান' : 'Merit Rank'}</span>
            <span className="text-[22px] font-bold text-slate-800">
              {(() => {
                const meritRank = rank ?? student.rank ?? student.merit_rank ?? student.merit_position;
                if (isSample) return bn ? '১ম' : '1st';

                if (meritRank === undefined || meritRank === null || meritRank === '') return '-';

                const rankNum = Number(meritRank);
                if (!Number.isInteger(rankNum) || rankNum <= 0) return '-';

                if (bn) {
                  const specials: Record<number, string> = {
                    1: '১ম', 2: '২য়', 3: '৩য়', 4: '৪র্থ', 5: '৫ম', 6: '৬ষ্ঠ',
                    7: '৭ম', 8: '৮ম', 9: '৯ম', 10: '১০ম'
                  };
                  return specials[rankNum] || `${toBnDigits(rankNum)}তম`;
                }

                const s = ['th', 'st', 'nd', 'rd'];
                const v = rankNum % 100;
                return rankNum + (s[(v - 20) % 10] || s[v] || s[0]);
              })()
            }</span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg text-center shadow-sm">
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">{bn ? 'সর্বমোট GPA' : 'Overall GPA'}</span>
            <span className="text-[22px] font-bold text-slate-800">
              {(() => {
                const g = Number(overall.graced ? overall.gpa : (student.gpa || overall.gpa));
                return bn ? toBnDigits(g.toFixed(2)) : g.toFixed(2);
              })()}
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg text-center shadow-sm flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">{bn ? 'চুড়ান্ত গ্রেড' : 'Grade'}</span>
            <span className={cn(
              "text-white text-[14px] px-5 py-1 rounded-full font-bold shadow-sm",
              (() => {
                const isFail = !overall.graced && ((student.letter_grade || overall.grade) === 'F' || hasFailedSubject);
                return !isFail ? 'bg-emerald-600' : 'bg-rose-600';
              })()
            )}>
              {(() => {
                if (overall.graced) return overall.grade;
                return hasFailedSubject ? 'F' : (student.letter_grade || overall.grade);
              })()}
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg text-center shadow-sm flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">{bn ? 'মর্যাদা' : 'Division'}</span>
            <span className={cn(
              "text-[14px] font-bold px-4 py-1 rounded-full",
              (() => {
                const gpa = Number(overall.graced ? overall.gpa : (student.gpa || overall.gpa));
                const isFail = !overall.graced && (student.letter_grade === 'F' || overall.grade === 'F' || gpa === 0 || hasFailedSubject);
                return isFail ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
              })()
            )}>
              {(() => {
                if (overall.graced) return bn ? (overall.title_bn || 'মাকবুল (বিবেচনায়)') : (overall.title || 'MAQBUL (Considered)');
                const gpa = Number(student.gpa || overall.gpa);
                const isFail = student.letter_grade === 'F' || overall.grade === 'F' || gpa === 0 || hasFailedSubject;

                if (isFail) return bn ? "রাসিব" : "FAIL";
                if (student.division || student.status_text || student.madrasha_grade) {
                  return student.division || student.status_text || student.madrasha_grade;
                }
                if (bn && overall.title_bn) return overall.title_bn;
                if (!bn && overall.title) return overall.title;

                if (gpa >= 5.0) return bn ? "মুমতাজ" : "MUMTAZ";
                if (gpa >= 4.0) return bn ? "জায়্যিদ জিদ্দান" : "JAYYID JIDDAN";
                if (gpa >= 3.5) return bn ? "জায়্যিদ" : "JAYYID";
                if (gpa >= 1.0) return bn ? "মাকবুল" : "MAQBUL";
                return bn ? "রাসিব" : "FAIL";
              })()}
            </span>
          </div>

        </div>

        {/* Grading Scale & Signatures */}
        <div className="mt-auto flex justify-between items-end gap-12 pt-4 pb-2" style={{ pageBreakInside: 'avoid' }}>
          {/* Reference Key */}
          <div className="w-[200px] border border-slate-200 p-2 rounded-lg bg-slate-50/50 shadow-sm">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-200 pb-1">Grading Scale</h4>
            <div className="grid grid-cols-1 gap-y-1 text-[9px] font-medium text-slate-600">
              <div className="flex justify-between items-center"><span>80-100</span> <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-100">A+ (5.0)</span></div>
              <div className="flex justify-between items-center"><span>70-79</span> <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-100">A (4.0)</span></div>
              <div className="flex justify-between items-center"><span>60-69</span> <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-100">A- (3.5)</span></div>
              <div className="flex justify-between items-center"><span>50-59</span> <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-100">B (3.0)</span></div>
              <div className="flex justify-between items-center"><span>40-49</span> <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-bold border border-orange-100">C (2.0)</span></div>
              <div className="flex justify-between items-center"><span>33-39</span> <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-bold border border-orange-100">D (1.0)</span></div>
              <div className="flex justify-between items-center"><span>00-32</span> <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold border border-rose-100">F (0.0)</span></div>
            </div>
          </div>

          {/* Signature Grid */}
          <div className="flex-1 flex justify-between items-end px-4 mb-4">
            <div className="flex flex-col items-center w-[180px]">
              <div className="w-full border-t border-dotted border-slate-400 mb-2"></div>
              <span className="text-[11px] font-bold text-slate-700">{bn ? 'পরীক্ষা নিয়ন্ত্রক' : 'EXAM CONTROLLER'}</span>
              <span className="text-[8px] text-slate-400 font-medium uppercase tracking-tighter">{bn ? '(EXAM CONTROLLER)' : ''}</span>
            </div>
            
            <div className="flex flex-col items-center w-[200px]">
              <div className="w-14 h-14 border border-dashed border-emerald-200 rounded-full flex items-center justify-center mb-1 bg-emerald-50/20">
                <span className="text-[7px] text-emerald-600/30 font-bold tracking-tighter uppercase leading-none">OFFICIAL SEAL</span>
              </div>
              <div className="w-full border-t border-dotted border-slate-400 mb-2"></div>
              <span className="text-[11px] font-bold text-slate-700 uppercase">{bn ? 'মুহতামিম' : 'PRINCIPAL'}</span>
              <span className="text-[8px] text-slate-400 font-medium uppercase tracking-tighter">{bn ? '(PRINCIPAL)' : ''}</span>
            </div>
          </div>
        </div>

        {/* Branding Subtitle */}
        <div className="absolute bottom-2 left-0 w-full text-center text-[7px] text-slate-300 pointer-events-none">
          Generated via Academic Management System
        </div>
      </div>
    </div>
  );
};

export default IndividualMarksheet;