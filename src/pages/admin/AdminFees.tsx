import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CreditCard, Printer, Search, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

type FeeTab = 'admission' | 'monthly' | 'exam';

const students = [
  { roll: '001', name: 'মুহাম্মদ আলী', class: 'মুতাওয়াসসিতাহ ১ম', session: '২০২৬' },
  { roll: '002', name: 'আব্দুল করিম', class: 'এবতেদায়ী ২য়', session: '২০২৬' },
  { roll: '003', name: 'হাফিজ রহমান', class: 'হিফয ১ম', session: '২০২৫' },
  { roll: '004', name: 'ইউসুফ আহমেদ', class: 'নূরানী ১ম', session: '২০২৬' },
  { roll: '005', name: 'তানভীর ইসলাম', class: 'মুতাওয়াসসিতাহ ২য়', session: '২০২৬' },
];

const AdminFees = () => {
  const { language } = useLanguage();
  const [tab, setTab] = useState<FeeTab>('monthly');
  const [session, setSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedRoll, setSelectedRoll] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [showList, setShowList] = useState(false);
  const [listType, setListType] = useState<'paid' | 'unpaid'>('paid');

  const filteredStudents = students.filter(s => {
    if (session && s.session !== session) return false;
    if (selectedClass && s.class !== selectedClass) return false;
    return true;
  });

  const handleRollSelect = (roll: string) => {
    setSelectedRoll(roll);
    const st = students.find(s => s.roll === roll);
    setSelectedStudent(st?.name || '');
  };

  const handlePayment = () => {
    if (!selectedRoll || !paidAmount) {
      toast.error(language === 'bn' ? 'সকল তথ্য পূরণ করুন' : 'Fill all fields');
      return;
    }
    toast.success(language === 'bn' ? 'ফি সফলভাবে পরিশোধ হয়েছে এবং প্রোফাইলে সংরক্ষিত' : 'Fee paid successfully and saved to profile');
    setPaidAmount(''); setSelectedRoll(''); setSelectedStudent('');
  };

  const tabs: { key: FeeTab; bn: string; en: string; }[] = [
    { key: 'monthly', bn: 'মাসিক ফি', en: 'Monthly Fee' },
    { key: 'exam', bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
    { key: 'admission', bn: 'ভর্তি ফি', en: 'Admission Fee' },
  ];

  // Mock paid/unpaid lists
  const paidStudents = [
    { roll: '001', name: 'মুহাম্মদ আলী', class: 'মুতাওয়াসসিতাহ ১ম', amount: '৳ 2,500', month: 'মার্চ ২০২৬' },
    { roll: '002', name: 'আব্দুল করিম', class: 'এবতেদায়ী ২য়', amount: '৳ 2,000', month: 'মার্চ ২০২৬' },
    { roll: '004', name: 'ইউসুফ আহমেদ', class: 'নূরানী ১ম', amount: '৳ 1,500', month: 'মার্চ ২০২৬' },
  ];
  const unpaidStudents = [
    { roll: '003', name: 'হাফিজ রহমান', class: 'হিফয ১ম', month: 'মার্চ ২০২৬' },
    { roll: '005', name: 'তানভীর ইসলাম', class: 'মুতাওয়াসসিতাহ ২য়', month: 'মার্চ ২০২৬' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'ফি ব্যবস্থাপনা' : 'Fee Management'}</h1>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowList(false); }}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {language === 'bn' ? t.bn : t.en}
            </button>
          ))}
        </div>

        {/* Fee Input */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {language === 'bn' ? `${tabs.find(t => t.key === tab)?.bn} পরিশোধ` : `Pay ${tabs.find(t => t.key === tab)?.en}`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'ভর্তি সেশন' : 'Admission Session'}</label>
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="২০২৬">২০২৬</SelectItem>
                  <SelectItem value="২০২৫">২০২৫</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'শ্রেণী' : 'Class'}</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {['হিফয ১ম', 'নূরানী ১ম', 'এবতেদায়ী ২য়', 'মুতাওয়াসসিতাহ ১ম', 'মুতাওয়াসসিতাহ ২য়'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</label>
              <Select value={selectedRoll} onValueChange={handleRollSelect}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>{filteredStudents.map(s => <SelectItem key={s.roll} value={s.roll}>{s.roll} - {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedStudent && (
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'ছাত্রের নাম' : 'Student Name'}</label>
                <Input className="bg-secondary/50 mt-1" value={selectedStudent} readOnly />
              </div>
            )}
            {tab === 'monthly' && (
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'মাস-বছর' : 'Month-Year'}</label>
                <Input type="month" className="bg-background mt-1" />
              </div>
            )}
            {tab === 'exam' && (
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পরীক্ষা সেশন' : 'Exam Session'}</label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">{language === 'bn' ? 'বার্ষিক' : 'Annual'}</SelectItem>
                    <SelectItem value="half">{language === 'bn' ? 'অর্ধবার্ষিক' : 'Half Yearly'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পরিশোধ পরিমাণ' : 'Paid Amount'}</label>
              <Input type="number" className="bg-background mt-1" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="৳" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পরিশোধের তারিখ' : 'Paid Date'}</label>
              <Input type="date" className="bg-background mt-1" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <Button onClick={handlePayment} className="btn-primary-gradient mt-4">{language === 'bn' ? 'পরিশোধ করুন (Unpaid → Paid)' : 'Pay (Unpaid → Paid)'}</Button>
        </div>

        {/* Paid / Unpaid Lists */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-display font-bold text-foreground">{language === 'bn' ? 'ফি তালিকা' : 'Fee List'}</h3>
            <div className="flex gap-2">
              <button onClick={() => { setListType('paid'); setShowList(true); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'paid' && showList ? 'bg-success text-success-foreground' : 'bg-success/10 text-success'}`}>
                <CheckCircle className="w-3 h-3 inline mr-1" /> {language === 'bn' ? 'পরিশোধিত' : 'Paid'}
              </button>
              <button onClick={() => { setListType('unpaid'); setShowList(true); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'unpaid' && showList ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive'}`}>
                <Clock className="w-3 h-3 inline mr-1" /> {language === 'bn' ? 'অপরিশোধিত' : 'Unpaid'}
              </button>
            </div>
            {showList && <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> {language === 'bn' ? 'প্রিন্ট' : 'Print'}</Button>}
          </div>

          {showList && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'শ্রেণী' : 'Class'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'মাস/সেশন' : 'Month/Session'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{listType === 'paid' ? (language === 'bn' ? 'পরিশোধ' : 'Amount') : (language === 'bn' ? 'স্ট্যাটাস' : 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listType === 'paid' ? paidStudents.map(s => (
                    <tr key={s.roll} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.roll}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.class}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.month}</td>
                      <td className="px-4 py-3 font-bold text-success">{s.amount}</td>
                    </tr>
                  )) : unpaidStudents.map(s => (
                    <tr key={s.roll} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.roll}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.class}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.month}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">{language === 'bn' ? 'অপরিশোধিত' : 'Unpaid'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFees;
