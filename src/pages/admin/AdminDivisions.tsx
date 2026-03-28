import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminDivisions = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedDiv, setSelectedDiv] = useState<string | null>(null);
  const [newDivName, setNewDivName] = useState('');
  const [newDivNameEn, setNewDivNameEn] = useState('');

  const { data: divisions = [], isLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('divisions').insert({
        name_bn: newDivName.trim(),
        name: newDivNameEn.trim() || newDivName.trim(),
        sort_order: divisions.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      setNewDivName('');
      setNewDivNameEn('');
      toast.success(language === 'bn' ? 'বিভাগ যোগ হয়েছে' : 'Division added');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('divisions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      if (selectedDiv === id) setSelectedDiv(null);
      toast.success(language === 'bn' ? 'বিভাগ মুছে ফেলা হয়েছে' : 'Division deleted');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

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
              <Button onClick={() => { if (!newDivName.trim()) { toast.error(language === 'bn' ? 'বিভাগের নাম লিখুন' : 'Enter division name'); return; } addMutation.mutate(); }} size="sm" className="shrink-0 btn-primary-gradient" disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {divisions.map(d => (
                  <div key={d.id}
                    onClick={() => setSelectedDiv(d.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedDiv === d.id ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{language === 'bn' ? d.name_bn : d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.description || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(d.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {divisions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{language === 'bn' ? 'কোনো বিভাগ নেই' : 'No divisions yet'}</p>}
              </div>
            )}
          </div>

          {/* Selected Info */}
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4">
              {selected ? (language === 'bn' ? `${selected.name_bn} - বিস্তারিত` : `${selected.name} - Details`) : (language === 'bn' ? 'বিভাগ নির্বাচন করুন' : 'Select a Division')}
            </h3>
            {selected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{language === 'bn' ? 'বাংলা নাম:' : 'Bengali Name:'} <span className="text-foreground font-medium">{selected.name_bn}</span></p>
                <p className="text-sm text-muted-foreground">{language === 'bn' ? 'ইংরেজি নাম:' : 'English Name:'} <span className="text-foreground font-medium">{selected.name}</span></p>
                <p className="text-sm text-muted-foreground">{language === 'bn' ? 'স্ট্যাটাস:' : 'Status:'} <span className={`px-2 py-1 rounded-full text-xs font-medium ${selected.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{selected.is_active ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}</span></p>
              </div>
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
