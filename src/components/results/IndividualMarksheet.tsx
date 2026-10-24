import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { toBnDigits } from '@/lib/digits';
import { isAbsentMark } from '@/lib/grading';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

interface IndividualMarksheetProps {
  student: any;
  subjects: any[];
  marksMap: Record<string, number | string>;
  examTitle: string;
  onBack: () => void;
  rank?: number;
  className?: string;
  examName?: string;
  sessionName?: string;
  overrideStatus?: 'fail' | 'grace_pass' | 'auto';
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

const IndividualMarksheet = ({ student, subjects, marksMap, examTitle, onBack, rank, className, examName, sessionName, overrideStatus }: IndividualMarksheetProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade, getGrade: getSubjectGrade, maxMarks } = useGradingSystem();
  const [isSample, setIsSample] = useState(false);

  const { data: institution } = useInstitutionInfo();

  const subjectResults = subjects.map((sub: any) => {
    const raw = isSample ? (Math.random() > 0.2 ? 70 + Math.floor(Math.random() * 30) : 30 + Math.floor(Math.random() * 10)) : marksMap[`${student.id}_${sub.id}`];
    const isAbsent = isAbsentMark(raw);
    const entered = !isAbsent && raw !== undefined && raw !== null && (raw as any) !== '' && !Number.isNaN(Number(raw));
    const marks = entered ? Number(raw) : 0;
    const g = getSubjectGrade(marks);
    const grade = isAbsent ? 'Abs' : (entered ? g.grade : '-');
    const gpa = isAbsent ? '-' : (entered ? g.gpa : '-');
    return { subject: sub, marks, grade, gpa, entered, isAbsent };
  });

  const absentCount = subjectResults.filter(r => r.isAbsent).length;
  const isAllAbsent = subjects.length > 0 && absentCount === subjects.length;
  const hasPartialAbsent = absentCount > 0 && !isAllAbsent;

  const gradedMarks = subjectResults.filter(r => r.entered).map(r => r.marks);
  const totalMarks = gradedMarks.reduce((sum, m) => sum + m, 0);
  const totalFullMarks = subjects.reduce((sum: number, sub: any) => sum + (Number(sub.full_marks) || maxMarks || 100), 0);
  const blankCount = subjectResults.filter(r => !r.entered && !r.isAbsent).length;
  const hasBlank = blankCount > 0;
  const hasZero = gradedMarks.some(m => m === 0);

  let overall: any;
  if (isAllAbsent) {
    overall = {
      grade: 'Abs',
      gpa: '-',
      title: 'Absent',
      title_bn: 'অনুপস্থিত',
      hasFail: false,
      graced: false,
    };
  } else if (hasPartialAbsent) {
    overall = {
      grade: 'F',
      gpa: '0.00',
      title: 'Rasib',
      title_bn: 'অকৃতকার্য',
      hasFail: true,
      graced: false,
    };
  } else {
    overall = getOverallGrade(gradedMarks, student?.class_id, {
      blankFailCount: blankCount,
      hasBlankOrZero: hasBlank || hasZero,
      override: overrideStatus,
    });
  }

  const hasFailedSubject = !overall.graced && (overall.hasFail || subjectResults.some(r => r.entered && r.grade === 'F') || hasPartialAbsent);
  const finalGPA = isAllAbsent ? '-' : Number(overall.graced ? overall.gpa : (student.gpa || overall.gpa));
  const finalGrade = isAllAbsent ? 'Abs' : (overall.graced ? overall.grade : (hasFailedSubject ? 'F' : (student.letter_grade || overall.grade)));
  const isFail = isAllAbsent ? false : (!overall.graced && (finalGrade === 'F' || hasFailedSubject || finalGPA === 0));
  const displayTotalMarks = isAllAbsent ? '-' : (student.total_marks || totalMarks);

  const remarksText = (() => {
    if (isAllAbsent) {
      return bn 
        ? "পরীক্ষার্থী সকল বিষয়ে অনুপস্থিত ছিল।"
        : "The candidate was absent in all subjects.";
    }
    if (isFail) {
      return bn 
        ? "অকৃতকার্য বিষয়ে বিশেষ মনোযোগ ও নিয়মিত অধ্যয়ন জরুরি। সম্মানিত অভিভাবকের দৃষ্টি আকর্ষণ করছি।"
        : "Special attention is required in failed subjects. Regular study and parental guidance needed.";
    }
    if (typeof finalGPA === 'number' && finalGPA >= 5.0) {
      return bn 
        ? "মাশাআল্লাহ, সার্বিক ফলাফল চমৎকার ও অনুকরণীয়। এই কৃতিত্ব বজায় রাখার শুভকামনা রইল।"
        : "MashaAllah, outstanding and commendable result. Best wishes to maintain this success.";
    }
    if (finalGPA >= 4.0) {
      return bn 
        ? "মাশাআল্লাহ, ফলাফল প্রশংসনীয়। নিয়মিত পড়াশোনায় আরও একাগ্র হলে ভবিষ্যতে আরও ভালো ফল অর্জন সম্ভব।"
        : "Commendable result. With continued dedication and effort, even higher success is achievable.";
    }
    if (finalGPA >= 3.0) {
      return bn 
        ? "সার্বিক ফলাফল সন্তোষজনক। দুর্বল বিষয়গুলোতে বিশেষ যত্ন ও ক্লাসে নিয়মিত উপস্থিতি আবশ্যক।"
        : "Satisfactory performance. More focus on weaker subjects and regular attendance is recommended.";
    }
    return bn 
      ? "ফলাফল মানোন্নয়নের সুযোগ রয়েছে। শিক্ষকদের পরামর্শ অনুযায়ী নিয়মিত অধ্যয়ন অব্যাহত রাখতে হবে।"
      : "Room for improvement. Consistent effort and teacher guidance recommended.";
  })();

  const issueDateFormatted = (() => {
    const d = new Date();
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    const bnMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return bn 
      ? `${toBnDigits(day)} ${bnMonths[month]}, ${toBnDigits(year)}`
      : `${day} ${enMonths[month]}, ${year}`;
  })();

  const instName = bn 
    ? (institution?.name || "আল-আরাবিয়া হোসাইনিয়া হাফিজিয়া মাদরাসা") 
    : (institution?.name_en || institution?.name || "Al-Arabia Subhania Hafizia Madrasa");

  // Construct complete address including phone, email, and madrasa registration number if available
  const addressLine = (() => {
    const addr = bn ? (institution?.address || institution?.address_en) : (institution?.address_en || institution?.address);
    const phone = institution?.phone;
    const email = institution?.email;
    const regNo = institution?.registration_number;
    const estYear = institution?.established_year;

    const parts: string[] = [];
    if (addr) parts.push(addr);
    if (phone) parts.push(bn ? `মোবাইল: ${toBnDigits(phone)}` : `Mobile: ${phone}`);
    if (email) parts.push(bn ? `ইমেইল: ${email}` : `Email: ${email}`);
    if (regNo) parts.push(bn ? `মাদরাসা রেজি: ${toBnDigits(regNo)}` : `Madrasa Reg: ${regNo}`);
    else if (estYear) parts.push(bn ? `স্থাপিত: ${toBnDigits(estYear)}` : `Est: ${estYear}`);

    if (parts.length > 0) return parts.join(' • ');
    return bn 
      ? "এম.এইচ সেন্ট্রাল, খাজাঞ্চী রোড, বিশ্বনাথ, সিলেট • মোবাইল: ০১৭৪৯৮৪২৪০১" 
      : "M.H Central, Khajanchi Road, Bishwanath, Sylhet • Mobile: 01749842401";
  })();
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
                  margin: 8mm;
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
                  font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif;
                }
                #marksheet-printable-area {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: 20px 24px !important;
                  box-sizing: border-box !important;
                  box-shadow: none !important;
                  border: 2px solid #064e3b !important;
                  background: #ffffff !important;
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
      <div className="w-full max-w-[780px] flex justify-between items-center mb-4 no-print print:hidden">
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

      {/* Main Container - Exact Match with Approved Mockup */}
      <div 
        id="marksheet-printable-area" 
        className="relative bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] w-[780px] max-w-full p-[24px_28px] border-2 border-[#064e3b] printable-marksheet text-[#0f172a]"
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
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            #marksheet-printable-area,
            #marksheet-printable-area * {
              visibility: visible !important;
            }

            #marksheet-printable-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: 2px solid #064e3b !important;
              padding: 16px 20px !important;
              margin: 0 auto !important;
              overflow: visible !important;
              z-index: 9999999 !important;
              box-sizing: border-box !important;
            }

            @page {
              size: A4 portrait;
              margin: 8mm;
            }
          }

          .marksheet-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            border: 1.5px solid #064e3b;
            font-size: 13px;
          }
          .marksheet-table th, .marksheet-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
            text-align: center;
          }
          .marksheet-table th {
            background-color: #064e3b !important;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 12.5px;
            padding: 6px 8px;
            border: 1px solid #043e2f;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .marksheet-table tr:nth-child(even):not(.total-row) {
            background-color: #f8fafc;
          }
          .marksheet-table td {
            font-size: 13px;
            color: #0f172a;
          }
          .marksheet-table .subject-col {
            text-align: left;
            font-weight: 600;
            color: #0f172a;
          }

          .grade-badge {
            display: inline-block;
            padding: 1px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            min-width: 34px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .grade-a-plus { background-color: #047857; color: #FFFFFF; }
          .grade-a { background-color: #059669; color: #FFFFFF; }
          .grade-a-minus { background-color: #0d9488; color: #FFFFFF; }
          .grade-b { background-color: #2563EB; color: #FFFFFF; }
          .grade-c { background-color: #D97706; color: #FFFFFF; }
          .grade-d { background-color: #EA580C; color: #FFFFFF; }
          .grade-f { background-color: #DC2626; color: #FFFFFF; }
          .grade-none { background-color: #F1F5F9; color: #64748B; }
        `}} />

        {/* Watermark Logo */}
        {institution?.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none z-0 overflow-hidden">
            <img 
              src={institution.logo_url} 
              alt="" 
              className="w-[320px] h-[320px] object-contain grayscale"
              style={{ filter: 'grayscale(100%) brightness(0.9)' }}
            />
          </div>
        )}

        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-[5px] bg-[#064e3b]"></div>
        <div className="absolute top-[5px] left-0 w-full h-[2px] bg-[#d97706]"></div>

        {/* Header Section */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-100">
          {/* Logo */}
          <div className="w-16 h-16 rounded-full border-2 border-[#064e3b] p-1 flex items-center justify-center bg-white shadow-sm shrink-0">
            <div className="w-full h-full rounded-full bg-emerald-50 flex items-center justify-center text-[#064e3b] font-bold text-xs">
              {institution?.logo_url ? (
                <img src={institution.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                'লোগো'
              )}
            </div>
          </div>

          {/* Institution Info */}
          <div className="flex-1 text-center px-3">
            <div className="text-xs text-emerald-800 font-semibold mb-0.5 tracking-wider">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <h1 className="text-[#064e3b] text-xl font-bold leading-tight">
              {instName}
            </h1>
            <p className="text-slate-600 text-xs mt-0.5 font-medium max-w-[500px] mx-auto">
              {addressLine}
            </p>
          </div>

          {/* QR/Document ID */}
          <div className="w-16 text-right shrink-0">
            <div className="inline-block border border-slate-300 p-1 rounded bg-white shadow-sm text-center">
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/result?roll=${student.roll_number || student.student_id}`}
                size={46}
                level="L"
                includeMargin={false}
              />
              <div className="text-[8px] font-mono text-slate-600 mt-0.5">ID: {student.student_id || student.registration_no || (isSample ? '20261001' : '-')}</div>
            </div>
          </div>
        </div>

        {/* Title Banner */}
        <div className="text-center mb-2.5">
          <div className="inline-block bg-[#064e3b] text-white px-8 py-1 rounded shadow-sm">
            <h2 className="text-sm font-bold tracking-wider uppercase text-white">
              {bn ? 'একাডেমিক ট্রান্সক্রিপ্ট / নম্বরপত্র' : 'ACADEMIC TRANSCRIPT / MARKSHEET'}
            </h2>
            <div className="text-emerald-100 text-[11px] font-medium mt-0.5">
              {resolvedExam} • {resolvedClass} • {bn ? 'শিক্ষাবর্ষ:' : 'Session:'} {resolvedSession}
            </div>
          </div>
        </div>

        {/* Student Information Grid */}
        <div className="bg-slate-50 border border-slate-300 rounded-md p-2 mb-2.5 grid grid-cols-3 gap-y-1.5 gap-x-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'শিক্ষার্থীর নাম' : 'STUDENT NAME'}</span>
            <span className="font-bold text-slate-900 text-sm">{studentName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'পিতার নাম' : "FATHER'S NAME"}</span>
            <span className="font-bold text-slate-900 text-sm">
              {isSample 
                ? (bn ? 'আব্দুর রহমান' : 'Abdur Rahman') 
                : (bn ? (student.father_name || student.fathers_name || student.father_name_en || '-') : (student.father_name_en || student.father_name || student.fathers_name || '-'))}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'রোল নম্বর' : 'ROLL NO'}</span>
            <span className="font-bold text-slate-900 text-sm">{isSample ? (bn ? '১০০১' : '1001') : (bn ? toBnDigits(student.roll_number) : student.roll_number)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'রেজিস্ট্রেশন নম্বর' : 'REG NO'}</span>
            <span className="font-semibold text-slate-800">
              {(() => {
                const reg = student.registration_no || student.registration_number || student.student_id;
                if (isSample) return bn ? '২০২৬১০০১' : '20261001';
                return reg ? (bn ? toBnDigits(reg) : reg) : '-';
              })()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'শ্রেণি ও শাখা' : 'CLASS & SECTION'}</span>
            <span className="font-semibold text-slate-800">
              {resolvedClass} {student.section || student.branch ? `(শাখা: ${student.section || student.branch})` : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'জন্ম তারিখ' : 'DATE OF BIRTH'}</span>
            <span className="font-semibold text-slate-800">
              {isSample ? (bn ? '১৫ মে, ২০১৮' : '15 May, 2018') : formatDob(student.date_of_birth, bn)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'শিক্ষাবর্ষ' : 'SESSION'}</span>
            <span className="font-semibold text-slate-800">{resolvedSession}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'ফলাফল প্রকাশের তারিখ' : 'DATE OF ISSUE'}</span>
            <span className="font-semibold text-slate-800">{issueDateFormatted}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">{bn ? 'ফলাফল অবস্থা' : 'RESULT STATUS'}</span>
            <span className={cn(
              "inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border",
              hasFailedSubject ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"
            )}>
              {hasFailedSubject ? (bn ? 'অকৃতকার্য' : 'FAILED') : (bn ? 'কৃতকার্য' : 'PASSED')}
            </span>
          </div>
        </div>

        {/* Marks Table with Total Row */}
        <div className="mb-2.5">
          <table className="marksheet-table">
            <thead>
              <tr>
                <th className="w-12">{bn ? 'ক্রমিক' : 'Sl No'}</th>
                <th className="text-left px-3">{bn ? 'বিষয়' : 'Subject'}</th>
                <th className="w-24">{bn ? 'পূর্ণমান' : 'Full Marks'}</th>
                <th className="w-28">{bn ? 'প্রাপ্ত নম্বর' : 'Obtained Marks'}</th>
                <th className="w-24">{bn ? 'লেটার গ্রেড' : 'Letter Grade'}</th>
                <th className="w-24">{bn ? 'গ্রেড পয়েন্ট' : 'Grade Point'}</th>
              </tr>
            </thead>
            <tbody>
              {subjectResults.map((r, i) => (
                <tr key={i}>
                  <td>{bn ? toBnDigits(i + 1) : (i + 1)}</td>
                  <td className="subject-col px-3">{bn ? r.subject.name_bn : (r.subject.name_en || r.subject.name)}</td>
                  <td className="font-semibold text-slate-700">{bn ? toBnDigits(r.subject.full_marks || maxMarks || 100) : (r.subject.full_marks || maxMarks || 100)}</td>
                  <td className="font-bold text-slate-900 text-sm">
                    {r.isAbsent ? (
                      <span className="text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded text-xs">{bn ? 'অনুপস্থিত' : 'Abs'}</span>
                    ) : !r.entered ? '-' : (isSample || bn ? toBnDigits(r.marks) : r.marks)}
                  </td>
                  <td>
                     <span className={cn(
                       "grade-badge",
                       r.isAbsent ? 'bg-amber-100 text-amber-800 border-amber-300' :
                       !r.entered ? 'grade-none' :
                       r.grade === 'A+' ? 'grade-a-plus' : 
                       r.grade === 'A' ? 'grade-a' :
                       r.grade === 'A-' ? 'grade-a-minus' :
                       r.grade === 'B' ? 'grade-b' :
                       r.grade === 'C' ? 'grade-c' :
                       r.grade === 'D' ? 'grade-d' : 'grade-f'
                     )}>
                      {r.isAbsent ? 'Abs' : r.grade}
                    </span>
                  </td>
                  <td className="font-bold text-slate-900 text-sm">
                    {r.isAbsent || !r.entered ? '-' : (isSample || bn ? toBnDigits(Number(r.gpa).toFixed(2)) : Number(r.gpa).toFixed(2))}
                  </td>
                </tr>
              ))}
              {/* Total Row in Table */}
              <tr className="total-row">
                <td colSpan={2} className="text-right px-4 font-bold text-emerald-900 text-sm">
                  {bn ? 'সর্বমোট (Total):' : 'Total:'}
                </td>
                <td className="font-bold text-emerald-900 text-sm">
                  {bn ? toBnDigits(totalFullMarks) : totalFullMarks}
                </td>
                <td className="font-bold text-emerald-900 text-base">
                  {isAllAbsent ? '-' : (bn ? toBnDigits(displayTotalMarks) : displayTotalMarks)}
                </td>
                <td>
                  <span className={cn(
                    "grade-badge",
                    isAllAbsent ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    isFail ? 'grade-f' :
                    finalGrade === 'A+' ? 'grade-a-plus' :
                    finalGrade === 'A' ? 'grade-a' :
                    finalGrade === 'A-' ? 'grade-a-minus' :
                    finalGrade === 'B' ? 'grade-b' :
                    finalGrade === 'C' ? 'grade-c' :
                    finalGrade === 'D' ? 'grade-d' : 'grade-none'
                  )}>
                    {finalGrade}
                  </span>
                </td>
                <td className="font-bold text-emerald-900 text-sm">
                  {isAllAbsent ? '-' : (bn ? toBnDigits(typeof finalGPA === 'number' ? finalGPA.toFixed(2) : finalGPA) : (typeof finalGPA === 'number' ? finalGPA.toFixed(2) : finalGPA))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary 5 Cards */}
        <div className="grid grid-cols-5 gap-2 mb-2.5">
          <div className="bg-white border border-slate-300 rounded p-1.5 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 font-bold block uppercase">{bn ? 'মোট নম্বর' : 'Total Marks'}</span>
            <span className="text-base font-bold text-slate-900">
              {isAllAbsent ? '-' : (bn ? toBnDigits(displayTotalMarks) : displayTotalMarks)} / {bn ? toBnDigits(totalFullMarks) : totalFullMarks}
            </span>
          </div>
          <div className="bg-white border border-slate-300 rounded p-1.5 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 font-bold block uppercase">{bn ? 'মেধা স্থান' : 'Merit Rank'}</span>
            <span className="text-base font-bold text-[#064e3b]">
              {(() => {
                if (isAllAbsent) return '-';
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
          <div className="bg-white border border-slate-300 rounded p-1.5 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 font-bold block uppercase">{bn ? 'সর্বমোট GPA' : 'Overall GPA'}</span>
            <span className="text-base font-bold text-slate-900">
              {isAllAbsent ? '-' : (bn ? toBnDigits(typeof finalGPA === 'number' ? finalGPA.toFixed(2) : finalGPA) : (typeof finalGPA === 'number' ? finalGPA.toFixed(2) : finalGPA))}
            </span>
          </div>
          <div className="bg-white border border-slate-300 rounded p-1.5 text-center shadow-sm flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase">{bn ? 'চুড়ান্ত গ্রেড' : 'Grade'}</span>
            <span className={cn(
              "text-white text-xs px-3 py-0.5 rounded-full font-bold",
              isAllAbsent ? 'bg-amber-600' : !isFail ? 'bg-emerald-600' : 'bg-rose-600'
            )}>
              {finalGrade}
            </span>
          </div>
          <div className="bg-white border border-slate-300 rounded p-1.5 text-center shadow-sm flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase">{bn ? 'মর্যাদা / বিভাগ' : 'Division'}</span>
            <span className={cn(
              "text-xs px-2.5 py-0.5 rounded-full font-bold border",
              isAllAbsent ? 'bg-amber-50 text-amber-800 border-amber-200' :
              isFail ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            )}>
              {(() => {
                if (isAllAbsent) return bn ? 'অনুপস্থিত' : 'Absent';
                if (hasPartialAbsent) return bn ? 'অকৃতকার্য' : 'Fail';
                if (overall.graced) return bn ? (overall.title_bn || 'মাকবুল (বিবেচনায়)') : (overall.title || 'MAQBUL (Considered)');
                if (isFail) return bn ? "রাসিব" : "FAIL";
                if (student.division || student.status_text || student.madrasha_grade) {
                  return student.division || student.status_text || student.madrasha_grade;
                }
                if (bn && overall.title_bn) return overall.title_bn;
                if (!bn && overall.title) return overall.title;

                if (typeof finalGPA === 'number') {
                  if (finalGPA >= 5.0) return bn ? "মুমতাজ" : "MUMTAZ";
                  if (finalGPA >= 4.0) return bn ? "জায়্যিদ জিদ্দান" : "JAYYID JIDDAN";
                  if (finalGPA >= 3.5) return bn ? "জায়্যিদ" : "JAYYID";
                  if (finalGPA >= 1.0) return bn ? "মাকবুল" : "MAQBUL";
                }
                return bn ? "রাসিব" : "FAIL";
              })()}
            </span>
          </div>
        </div>

        {/* Teacher Remarks & Date Section - Merged Single Line */}
        <div className="border border-slate-200 rounded p-2 bg-emerald-50/30 text-xs mb-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 flex-1 text-left min-w-0">
            <span className="font-bold text-[#064e3b] shrink-0 whitespace-nowrap">
              {bn ? 'মন্তব্য:' : "Remarks:"}
            </span>
            <span className="text-slate-700 italic leading-normal">
              "{remarksText}"
            </span>
          </div>
          <div className="text-[10.5px] text-slate-500 font-semibold whitespace-nowrap pl-3 border-l border-emerald-200 shrink-0">
            {bn ? `তারিখ: ${issueDateFormatted}` : `Date: ${issueDateFormatted}`}
          </div>
        </div>

        {/* Official Footer: Grading Scale & Signatures */}
        <div className="flex justify-between items-end gap-4 pt-1 border-t border-slate-200" style={{ pageBreakInside: 'avoid' }}>
          {/* Grading Scale Matrix */}
          <div className="w-44 border border-slate-200 p-1.5 rounded bg-slate-50/50 text-[10px] shrink-0">
            <div className="font-bold text-slate-600 uppercase tracking-wider mb-1 border-b border-slate-200 pb-0.5 text-[9px]">
              {bn ? 'গ্রেডিং স্কেল (GRADING SCALE)' : 'GRADING SCALE'}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-600 font-medium">
              <div className="flex justify-between"><span>৮০-১০০</span> <strong className="text-emerald-700">A+ (৫.০)</strong></div>
              <div className="flex justify-between"><span>৭০-৭৯</span> <strong className="text-emerald-700">A (৪.০)</strong></div>
              <div className="flex justify-between"><span>৬০-৬৯</span> <strong className="text-emerald-700">A- (৩.৫)</strong></div>
              <div className="flex justify-between"><span>৫০-৫৯</span> <strong className="text-blue-700">B (৩.০)</strong></div>
              <div className="flex justify-between"><span>৪০-৪৯</span> <strong className="text-amber-700">C (২.০)</strong></div>
              <div className="flex justify-between"><span>৩৩-৩৯</span> <strong className="text-orange-700">D (১.০)</strong></div>
              <div className="flex justify-between col-span-2 border-t border-slate-200 pt-0.5">
                <span>০০-৩২</span> <strong className="text-rose-600">F (অকৃতকার্য - ০.০)</strong>
              </div>
            </div>
          </div>

          {/* 3 Signatures: Class Teacher, Controller, Principal with Seal */}
          <div className="flex-1 flex justify-between items-end px-3">
            {/* Class Teacher */}
            <div className="text-center w-28">
              <div className="w-full border-t border-dotted border-slate-400 mb-1"></div>
              <div className="text-[11px] font-bold text-slate-700">{bn ? 'শ্রেণি শিক্ষক' : 'CLASS TEACHER'}</div>
              <div className="text-[8px] text-slate-400 uppercase tracking-tighter">CLASS TEACHER</div>
            </div>

            {/* Exam Controller */}
            <div className="text-center w-28">
              <div className="w-full border-t border-dotted border-slate-400 mb-1"></div>
              <div className="text-[11px] font-bold text-slate-700">{bn ? 'পরীক্ষা নিয়ন্ত্রক' : 'CONTROLLER'}</div>
              <div className="text-[8px] text-slate-400 uppercase tracking-tighter">CONTROLLER</div>
            </div>

            {/* Official Seal & Principal */}
            <div className="text-center w-32 flex flex-col items-center">
              <div className="w-10 h-10 border border-dashed border-emerald-300 rounded-full flex items-center justify-center mb-1 bg-emerald-50/20">
                <span className="text-[7px] text-emerald-700/50 font-bold uppercase tracking-tighter">{bn ? 'অফিসিয়াল সিল' : 'OFFICIAL SEAL'}</span>
              </div>
              <div className="w-full border-t border-dotted border-slate-400 mb-1"></div>
              <div className="text-[11px] font-bold text-slate-700">{bn ? 'মুহতামিম / অধ্যক্ষ' : 'PRINCIPAL'}</div>
              <div className="text-[8px] text-slate-400 uppercase tracking-tighter">PRINCIPAL</div>
            </div>
          </div>
        </div>

        {/* Bottom Watermark Note */}
        <div className="text-center text-[8px] text-slate-400 mt-2 pointer-events-none">
          {bn 
            ? 'কম্পিউটার জেনারেটেড ট্রান্সক্রিপ্ট • কোনো ধরনের ঘষামাজা গ্রহণযোগ্য নয় • verification url: edumatebd.com/result'
            : 'Computer generated transcript • Any erasure or alteration invalidates this document'}
        </div>
      </div>
    </div>
  );
};

export default IndividualMarksheet;