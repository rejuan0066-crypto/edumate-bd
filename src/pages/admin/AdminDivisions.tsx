import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Plus, Edit, Trash2, ChevronRight, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface ClassItem { id: string; name: string; nameEn: string; }
interface DivisionItem { id: string; name: string; nameEn: string; classes: ClassItem[]; }

const initialDivisions: DivisionItem[] = [
  { id: '1', name: 'হিফয বিভাগ', nameEn: 'Hifz Division', classes: [
    { id: '1a', name: 'হিফয ১ম বর্ষ', nameEn: 'Hifz 1st Year' },
    { id: '1b', name: 'হিফয ২য় বর্ষ', nameEn: 'Hifz 2nd Year' },
  ]},
  { id: '2', name: 'নূরানী বিভাগ', nameEn: 'Nurani Division', classes: [
    { id: '2a', name: 'নূরানী ১ম', nameEn: 'Nurani 1st' },
    { id: '2b', name: 'নূরানী ২য়', nameEn: 'Nurani 2nd' },
  ]},
  { id: '3', name: 'এবতেদায়ী বিভাগ', nameEn: 'Ebtedayee Division', classes: [
    { id: '3a', name: 'এবতেদায়ী ১ম', nameEn: 'Ebtedayee 1st' },
    { id: '3b', name: 'এবতেদায়ী ২য়', nameEn: 'Ebtedayee 2nd' },
    { id: '3c', name: 'এবতেদায়ী ৩য়', nameEn: 'Ebtedayee 3rd' },
  ]},
  { id: '4', name: 'মুতাওয়াসসিতাহ বিভাগ', nameEn: 'Mutawassitah Division', classes: [
    { id: '4a', name: 'মুতাওয়াসসিতাহ ১ম', nameEn: 'Mutawassitah 1st' },
    { id: '4b', name: 'মুতাওয়াসসিতাহ ২য়', nameEn: 'Mutawassitah 2nd' },
  ]},
];

const AdminDivisions = () => {
  const { language } = useLanguage();
  const [divisions, setDivisions] = useState<DivisionItem[]>(initialDivisions);
  const [selectedDiv, setSelectedDiv] = useState<string | null>(null);
  const [newDivName, setNewDivName] = useState('');
  const [newDivNameEn, setNewDivNameEn] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassNameEn, setNewClassNameEn] = useState('');

  const addDivision = () => {
    if (!newDivName.trim()) return;
    const newDiv: DivisionItem = { id: Date.now().toString(), name: newDivName, nameEn: newDivNameEn || newDivName, classes: [] };
    setDivisions([...divisions, newDiv]);
    setNewDivName(''); setNewDivNameEn('');
    toast.success(language === 'bn' ? 'বিভাগ যোগ হয়েছে' : 'Division added');
  };

  const deleteDivision = (id: string) => {
    setDivisions(divisions.filter(d => d.id !== id));
    if (selectedDiv === id) setSelectedDiv(null);
    toast.success(language === 'bn' ? 'বিভাগ মুছে ফেলা হয়েছে' : 'Division deleted');
  };

  const addClass = () => {
    if (!selectedDiv || !newClassName.trim()) return;
    setDivisions(divisions.map(d => d.id === selectedDiv ? {
      ...d, classes: [...d.classes, { id: Date.now().toString(), name: newClassName, nameEn: newClassNameEn || newClassName }]
    } : d));
    setNewClassName(''); setNewClassNameEn('');
    toast.success(language === 'bn' ? 'শ্রেণী যোগ হয়েছে' : 'Class added');
  };

  const deleteClass = (divId: string, classId: string) => {
    setDivisions(divisions.map(d => d.id === divId ? { ...d, classes: d.classes.filter(c => c.id !== classId) } : d));
    toast.success(language === 'bn' ? 'শ্রেণী মুছে ফেলা হয়েছে' : 'Class deleted');
  };

  const selected = divisions.find(d => d.id === selectedDiv);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">
          {language === 'bn' ? 'বিভাগ ও শ্রেণী ব্যবস্থাপনা' : 'Division & Class Management'}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Divisions */}
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'বিভাগসমূহ' : 'Divisions'}</h3>
            <div className="flex gap-2 mb-4">
              <Input placeholder={language === 'bn' ? 'বিভাগের নাম (বাংলা)' : 'Division Name (BN)'} value={newDivName} onChange={(e) => setNewDivName(e.target.value)} className="bg-background" />
              <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newDivNameEn} onChange={(e) => setNewDivNameEn(e.target.value)} className="bg-background" />
              <Button onClick={addDivision} size="sm" className="shrink-0 btn-primary-gradient"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {divisions.map(d => (
                <div key={d.id}
                  onClick={() => setSelectedDiv(d.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedDiv === d.id ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{language === 'bn' ? d.name : d.nameEn}</p>
                      <p className="text-xs text-muted-foreground">{d.classes.length} {language === 'bn' ? 'টি শ্রেণী' : 'classes'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); deleteDivision(d.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classes */}
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4">
              {selected ? (language === 'bn' ? `${selected.name} - শ্রেণীসমূহ` : `${selected.nameEn} - Classes`) : (language === 'bn' ? 'শ্রেণীসমূহ' : 'Classes')}
            </h3>
            {selected ? (
              <>
                <div className="flex gap-2 mb-4">
                  <Input placeholder={language === 'bn' ? 'শ্রেণীর নাম (বাংলা)' : 'Class Name (BN)'} value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="bg-background" />
                  <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newClassNameEn} onChange={(e) => setNewClassNameEn(e.target.value)} className="bg-background" />
                  <Button onClick={addClass} size="sm" className="shrink-0 btn-primary-gradient"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2">
                  {selected.classes.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm font-medium text-foreground">{language === 'bn' ? c.name : c.nameEn}</span>
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => deleteClass(selected.id, c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {selected.classes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{language === 'bn' ? 'কোনো শ্রেণী নেই' : 'No classes yet'}</p>}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{language === 'bn' ? 'একটি বিভাগ নির্বাচন করুন' : 'Select a division'}</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDivisions;
