import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Plus, Printer, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

const classes = ['হিফয ১ম বর্ষ', 'নূরানী ১ম', 'এবতেদায়ী ১ম', 'এবতেদায়ী ২য়', 'মুতাওয়াসসিতাহ ১ম', 'মুতাওয়াসসিতাহ ২য়'];
const subjects = ['কুরআন', 'আরবি ব্যাকরণ', 'ফিকাহ', 'বাংলা', 'গণিত', 'ইংরেজি'];
const students = [
  { roll: '001', name: 'মুহাম্মদ আলী', marks: [85, 78, 92, 88, 75, 80] },
  { roll: '002', name: 'আব্দুল করিম', marks: [90, 82, 88, 76, 85, 78] },
  { roll: '003', name: 'হাফিজ রহমান', marks: [95, 90, 85, 92, 88, 85] },
  { roll: '004', name: 'ইউসুফ আহমেদ', marks: [72, 68, 75, 80, 65, 70] },
  { roll: '005', name: 'তানভীর ইসলাম', marks: [88, 85, 90, 82, 78, 83] },
];

const getGrade = (avg: number) => {
  if (avg >= 80) return { grade: 'A+', gpa: '5.00' };
  if (avg >= 70) return { grade: 'A', gpa: '4.00' };
  if (avg >= 60) return { grade: 'A-', gpa: '3.50' };
  if (avg >= 50) return { grade: 'B', gpa: '3.00' };
  if (avg >= 40) return { grade: 'C', gpa: '2.00' };
  if (avg >= 33) return { grade: 'D', gpa: '1.00' };
  return { grade: 'F', gpa: '0.00' };
};

const AdminResults = () => {
  const { language } = useLanguage();
  const [examYear, setExamYear] = useState('2026');
  const [examSession, setExamSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    if (examYear && selectedClass) {
      setShowResults(true);
    } else {
      toast.error(language === 'bn' ? 'বছর ও শ্রেণী নির্বাচন করুন' : 'Select year and class');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'ফলাফল ব্যবস্থাপনা' : 'Result Management'}</h1>

        {/* Search */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'ফলাফল অনুসন্ধান / তৈরি' : 'Search / Create Result'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select value={examYear} onValueChange={setExamYear}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'পরীক্ষার বছর' : 'Exam Year'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">২০২৬</SelectItem>
                <SelectItem value="2025">২০২৫</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={language === 'bn' ? 'পরীক্ষা সেশন (যেমন: বার্ষিক)' : 'Exam Session (e.g. Annual)'} value={examSession} onChange={(e) => setExamSession(e.target.value)} className="bg-background" />
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'শ্রেণী' : 'Class'} /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleSearch} className="btn-primary-gradient"><Search className="w-4 h-4 mr-1" /> {language === 'bn' ? 'অনুসন্ধান' : 'Search'}</Button>
          </div>
        </div>

        {/* Result Matrix */}
        {showResults && (
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">
                {selectedClass} — {examSession || (language === 'bn' ? 'বার্ষিক পরীক্ষা' : 'Annual Exam')} {examYear}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'ছাত্র যোগ' : 'Add Student'}</Button>
                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'বিষয় যোগ' : 'Add Subject'}</Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> {language === 'bn' ? 'প্রিন্ট' : 'Print'}</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                    {subjects.map(s => <th key={s} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{s}</th>)}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'মোট' : 'Total'}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'গ্রেড' : 'Grade'}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">GPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map(st => {
                    const total = st.marks.reduce((a, b) => a + b, 0);
                    const avg = total / st.marks.length;
                    const { grade, gpa } = getGrade(avg);
                    return (
                      <tr key={st.roll} className="hover:bg-secondary/30">
                        <td className="px-3 py-2 font-medium text-foreground">{st.roll}</td>
                        <td className="px-3 py-2 text-foreground">{st.name}</td>
                        {st.marks.map((m, i) => (
                          <td key={i} className="px-3 py-2 text-center">
                            <Input className="w-16 h-8 text-center bg-background text-sm mx-auto" defaultValue={m} type="number" min={0} max={100} />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-bold text-foreground">{total}</td>
                        <td className="px-3 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${grade === 'F' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{grade}</span></td>
                        <td className="px-3 py-2 text-center font-medium text-primary">{gpa}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-3">
              <Button className="btn-primary-gradient" onClick={() => toast.success(language === 'bn' ? 'ফলাফল সংরক্ষিত হয়েছে' : 'Results saved')}>{language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Results'}</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminResults;
