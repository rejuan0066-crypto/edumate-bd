import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Edit, Trash2 } from 'lucide-react';

const staff = [
  { id: 1, name: 'মাওলানা আহমেদ', designation: 'প্রধান শিক্ষক', mobile: '01712345678', type: 'teacher', status: 'active' },
  { id: 2, name: 'হাফিজ করিম', designation: 'সহকারী শিক্ষক', mobile: '01812345678', type: 'teacher', status: 'active' },
  { id: 3, name: 'আব্দুল হাকিম', designation: 'অফিস সহকারী', mobile: '01912345678', type: 'staff', status: 'active' },
  { id: 4, name: 'মুফতি রহিম', designation: 'আরবি শিক্ষক', mobile: '01612345678', type: 'teacher', status: 'active' },
];

const AdminStaff = () => {
  const { t, language } = useLanguage();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('staff')}</h1>
            <p className="text-sm text-muted-foreground">{language === 'bn' ? 'শিক্ষক ও কর্মী ব্যবস্থাপনা' : 'Teachers & Staff Management'}</p>
          </div>
          <Button className="btn-primary-gradient flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('addNew')}
          </Button>
        </div>

        <div className="card-elevated p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={language === 'bn' ? 'নাম বা পদবী দিয়ে খুঁজুন...' : 'Search by name or designation...'} className="pl-10 bg-background" />
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'নাম' : 'Name'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'পদবী' : 'Designation'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'মোবাইল' : 'Mobile'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'ধরন' : 'Type'}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground font-bold text-sm">
                          {s.name[0]}
                        </div>
                        <span className="font-medium text-foreground text-sm">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.designation}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.mobile}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.type === 'teacher' ? 'bg-info/10 text-info' : 'bg-accent/20 text-accent-foreground'}`}>
                        {s.type === 'teacher' ? (language === 'bn' ? 'শিক্ষক' : 'Teacher') : (language === 'bn' ? 'কর্মী' : 'Staff')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-info"><Eye className="w-4 h-4" /></button>
                        <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                        <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
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

export default AdminStaff;
