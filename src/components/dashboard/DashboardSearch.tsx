import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const DashboardSearch = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultType, setResultType] = useState<'students' | 'staff'>('students');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data: studentData } = await supabase.from('students').select('*, divisions(name_bn)')
        .or(`name_bn.ilike.%${query}%,name_en.ilike.%${query}%,student_id.ilike.%${query}%,roll_number.ilike.%${query}%,phone.ilike.%${query}%`);
      const { data: staffData } = await supabase.from('staff').select('*')
        .or(`name_bn.ilike.%${query}%,name_en.ilike.%${query}%,phone.ilike.%${query}%,designation.ilike.%${query}%`);

      const combined = [
        ...(studentData || []).map((s: any) => ({ ...s, _type: 'students' as const })),
        ...(staffData || []).map((s: any) => ({ ...s, _type: 'staff' as const })),
      ];
      setResults(combined);
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const toggleStatus = async (item: any) => {
    const table = item._type;
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', item.id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'bn' ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
    setResults(prev => prev.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const deleteItem = async (item: any) => {
    if (!confirm(language === 'bn' ? 'মুছে ফেলতে চান?' : 'Delete this record?')) return;
    const { error } = await supabase.from(item._type).delete().eq('id', item.id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    setResults(prev => prev.filter(r => r.id !== item.id));
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const studentResults = results.filter(r => r._type === 'students');
  const staffResults = results.filter(r => r._type === 'staff');

  return (
    <div className="card-elevated p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === 'bn' ? 'নাম, আইডি, রোল বা ফোন দিয়ে খুঁজুন...' : 'Search by name, ID, roll or phone...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
          {query && <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <Button onClick={handleSearch} disabled={searching}>{language === 'bn' ? 'খুঁজুন' : 'Search'}</Button>
      </div>

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {studentResults.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">{language === 'bn' ? `ছাত্র (${studentResults.length})` : `Students (${studentResults.length})`}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'আইডি' : 'ID'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'বিভাগ' : 'Division'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {studentResults.map((s: any) => (
                      <tr key={s.id} className="hover:bg-secondary/30">
                        <td className="px-3 py-2 font-medium text-foreground">{s.name_bn}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.student_id}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.roll_number}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.divisions?.name_bn || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                            {s.status === 'active' ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => toggleStatus(s)} className="p-1 rounded hover:bg-secondary" title={s.status === 'active' ? 'Deactivate' : 'Activate'}>
                              {s.status === 'active' ? <UserX className="w-4 h-4 text-warning" /> : <UserCheck className="w-4 h-4 text-success" />}
                            </button>
                            <button onClick={() => deleteItem(s)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {staffResults.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">{language === 'bn' ? `কর্মী/শিক্ষক (${staffResults.length})` : `Staff/Teachers (${staffResults.length})`}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'পদবী' : 'Designation'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'ফোন' : 'Phone'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staffResults.map((s: any) => (
                      <tr key={s.id} className="hover:bg-secondary/30">
                        <td className="px-3 py-2 font-medium text-foreground">{s.name_bn}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.designation || '-'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.phone || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                            {s.status === 'active' ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'পদত্যাগী' : 'Resigned')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => toggleStatus(s)} className="p-1 rounded hover:bg-secondary">
                              {s.status === 'active' ? <UserX className="w-4 h-4 text-warning" /> : <UserCheck className="w-4 h-4 text-success" />}
                            </button>
                            <button onClick={() => deleteItem(s)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardSearch;
