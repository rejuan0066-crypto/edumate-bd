import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

const students = [
  { id: 1, name: 'মুহাম্মদ আলী', roll: '001', class: 'মুতাওয়াসসিতাহ ১ম', session: '২০২৬', status: 'active', type: 'resident' },
  { id: 2, name: 'আব্দুল করিম', roll: '002', class: 'এবতেদায়ী ২য়', session: '২০২৬', status: 'active', type: 'non-resident' },
  { id: 3, name: 'হাফিজ রহমান', roll: '003', class: 'হিফয ১ম', session: '২০২৫', status: 'inactive', type: 'resident' },
  { id: 4, name: 'ইউসুফ আহমেদ', roll: '004', class: 'নূরানী ১ম', session: '২০২৬', status: 'active', type: 'resident' },
  { id: 5, name: 'তানভীর ইসলাম', roll: '005', class: 'মুতাওয়াসসিতাহ ২য়', session: '২০২৬', status: 'active', type: 'non-resident' },
];

const AdminStudents = () => {
  const { t, language } = useLanguage();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('students')}</h1>
            <p className="text-sm text-muted-foreground">{language === 'bn' ? 'সকল ছাত্রের তালিকা ও ব্যবস্থাপনা' : 'All students list and management'}</p>
          </div>
          <Button className="btn-primary-gradient flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('addNew')}
          </Button>
        </div>

        {/* Search */}
        <div className="card-elevated p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={language === 'bn' ? 'নাম, রোল বা রেজি. নং দিয়ে খুঁজুন...' : 'Search by name, roll or reg no...'} className="pl-10 bg-background" />
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'নাম' : 'Name'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'শ্রেণী' : 'Class'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'সেশন' : 'Session'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {s.name[0]}
                        </div>
                        <span className="font-medium text-foreground text-sm">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.roll}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.class}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.session}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {s.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {s.status === 'active' ? t('active') : t('inactive')}
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

export default AdminStudents;
