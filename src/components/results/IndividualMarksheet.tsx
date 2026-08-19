import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { getGrade } from './ClassResultTable';
import { useQuery } from '@tanstack/react-query';
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
  return 'রাসিব'; 
};

const IndividualMarksheet = ({ student, subjects, marksMap, examTitle, onBack, rank }: IndividualMarksheetProps) => {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          {bn ? 'ফিরে যান' : 'Back'}
        </Button>
        <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800">
          <Printer className="w-4 h-4" />
          {bn ? 'প্রিন্ট' : 'Print'}
        </Button>
      </div>

      <div className="printable-sheet mx-auto max-w-[210mm] min-h-[297mm] bg-white text-black p-[10mm] shadow-lg border border-gray-200">
        <style>{`
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            .print\\:hidden { display: none !important; }
            .printable-sheet { box-shadow: none; border: none; }
          }
        `}</style>
        
        {/* Header */}
        <div className="bg-[#1e5d3b] text-white p-4 text-center rounded-t-lg">
          <div className="flex items-center justify-center gap-4">
            {institution?.logo_url && <img src={institution.logo_url} alt="Logo" className="w-16 h-16 object-contain bg-white p-1 rounded-full" />}
            <div>
              <h1 className="text-xl font-bold">আল-আরাবিয়া ছোবহানিয়া হাফিজিয়া মাদ্রাসা</h1>
              <p className="text-sm opacity-90">{institution?.address}</p>
              <p className="text-sm opacity-90">{institution?.phone}</p>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-emerald-500">
            <h2 className="text-lg font-bold">মার্কশিট</h2>
            <p className="text-sm italic">{examTitle}</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-gray-100 p-4 my-4 rounded border border-gray-300 grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-bold">নাম:</span> {studentName}</div>
          <div><span className="font-bold">রোল নম্বর:</span> {student.roll_number}</div>
          <div><span className="font-bold">রেজিস্ট্রেশন:</span> {student.registration_number || student.student_id}</div>
          <div><span className="font-bold">জন্ম তারিখ:</span> {student.date_of_birth}</div>
        </div>

        {/* Subjects Table */}
        <table className="w-full border-collapse border border-gray-400 my-4 text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 p-2">#</th>
              <th className="border border-gray-400 p-2 text-left">বিষয়</th>
              <th className="border border-gray-400 p-2">পূর্ণমান</th>
              <th className="border border-gray-400 p-2">প্রাপ্ত নম্বর</th>
              <th className="border border-gray-400 p-2">গ্রেড</th>
              <th className="border border-gray-400 p-2">GPA</th>
            </tr>
          </thead>
          <tbody>
            {subjectResults.map((r, i) => (
              <tr key={i}>
                <td className="border border-gray-400 p-2 text-center">{i + 1}</td>
                <td className="border border-gray-400 p-2">{bn ? r.subject.name_bn : r.subject.name}</td>
                <td className="border border-gray-400 p-2 text-center">100</td>
                <td className="border border-gray-400 p-2 text-center font-bold">{r.marks}</td>
                <td className="border border-gray-400 p-2 text-center">{r.grade}</td>
                <td className="border border-gray-400 p-2 text-center">{r.gpa}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-2 my-4">
          {[
            { label: 'মোট নম্বর', value: totalMarks },
            { label: 'গড়', value: avgMarks.toFixed(1) },
            { label: 'গ্রেড', value: overall.grade },
            { label: 'GPA', value: overall.gpa },
            { label: 'ফলাফল', value: morjada },
          ].map((item, i) => (
            <div key={i} className="border border-gray-400 p-2 text-center rounded bg-gray-50">
              <div className="text-[10px] font-bold uppercase">{item.label}</div>
              <div className="text-xl font-bold">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Footer Signatures */}
        <div className="mt-16 flex justify-between gap-4 text-center text-xs">
          {['শ্রেণি শিক্ষক', 'পরীক্ষা নিয়ন্ত্রক', 'শিক্ষা সচিব', 'মুহতামিম / অধ্যক্ষ'].map((role, i) => (
            <div key={i} className="w-full">
              <div className="border-t border-gray-400 pt-2">{role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IndividualMarksheet;
