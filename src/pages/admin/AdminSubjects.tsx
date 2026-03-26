import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Subject { id: string; name: string; nameEn: string; assignedClass: string; }

const initialSubjects: Subject[] = [
  { id: '1', name: 'কুরআন মাজীদ', nameEn: 'Quran Majeed', assignedClass: 'হিফয ১ম বর্ষ' },
  { id: '2', name: 'আরবি ব্যাকরণ', nameEn: 'Arabic Grammar', assignedClass: 'মুতাওয়াসসিতাহ ১ম' },
  { id: '3', name: 'ফিকাহ', nameEn: 'Fiqah', assignedClass: 'এবতেদায়ী ২য়' },
  { id: '4', name: 'বাংলা', nameEn: 'Bangla', assignedClass: 'এবতেদায়ী ১ম' },
  { id: '5', name: 'গণিত', nameEn: 'Mathematics', assignedClass: 'মুতাওয়াসসিতাহ ২য়' },
  { id: '6', name: 'ইংরেজি', nameEn: 'English', assignedClass: 'মুতাওয়াসসিতাহ ১ম' },
  { id: '7', name: 'হাদীস', nameEn: 'Hadith', assignedClass: 'মুতাওয়াসসিতাহ ২য়' },
  { id: '8', name: 'তাজবীদ', nameEn: 'Tajweed', assignedClass: 'নূরানী ১ম' },
];

const classes = ['হিফয ১ম বর্ষ', 'হিফয ২য় বর্ষ', 'নূরানী ১ম', 'নূরানী ২য়', 'এবতেদায়ী ১ম', 'এবতেদায়ী ২য়', 'এবতেদায়ী ৩য়', 'মুতাওয়াসসিতাহ ১ম', 'মুতাওয়াসসিতাহ ২য়'];

const AdminSubjects = () => {
  const { language } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [newName, setNewName] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newClass, setNewClass] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  const addSubject = () => {
    if (!newName.trim() || !newClass) return;
    setSubjects([...subjects, { id: Date.now().toString(), name: newName, nameEn: newNameEn || newName, assignedClass: newClass }]);
    setNewName(''); setNewNameEn(''); setNewClass('');
    toast.success(language === 'bn' ? 'বিষয় যোগ হয়েছে' : 'Subject added');
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    toast.success(language === 'bn' ? 'বিষয় মুছে ফেলা হয়েছে' : 'Subject deleted');
  };

  const filtered = filterClass === 'all' ? subjects : subjects.filter(s => s.assignedClass === filterClass);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'বিষয় ব্যবস্থাপনা' : 'Subject Management'}</h1>

        {/* Add Subject */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'নতুন বিষয় যোগ' : 'Add New Subject'}</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder={language === 'bn' ? 'বিষয়ের নাম (বাংলা)' : 'Subject Name (BN)'} value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-background" />
            <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} className="bg-background" />
            <Select value={newClass} onValueChange={setNewClass}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'শ্রেণী নির্বাচন' : 'Select Class'} /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={addSubject} className="btn-primary-gradient shrink-0"><Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'যোগ' : 'Add'}</Button>
          </div>
        </div>

        {/* Filter + List */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-foreground">{language === 'bn' ? 'বিষয় তালিকা' : 'Subject List'}</h3>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="bg-background w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
                {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'বিষয়' : 'Subject'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'ইংরেজি নাম' : 'English Name'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'শ্রেণী' : 'Class'}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />{s.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.nameEn}</td>
                    <td className="px-4 py-3 text-sm"><span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s.assignedClass}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => deleteSubject(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSubjects;
