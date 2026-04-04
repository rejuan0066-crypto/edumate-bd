import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Edit2, Save, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const DashboardInstitutionCard = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', name_en: '', address: '', phone: '', email: '', other_info: '', logo_url: '' });

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const { data, error } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (institution) {
      setForm({
        name: institution.name || '',
        name_en: institution.name_en || '',
        address: institution.address || '',
        phone: institution.phone || '',
        email: institution.email || '',
        other_info: institution.other_info || '',
        logo_url: institution.logo_url || '',
      });
    }
  }, [institution]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      console.log('Save institution - existing:', !!institution, 'form:', form);
      if (institution) {
        const { error } = await supabase.from('institutions').update(form).eq('id', institution.id);
        if (error) {
          console.error('Institution update error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase.from('institutions').insert({ ...form, is_default: true });
        if (error) {
          console.error('Institution insert error:', error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-default'] });
      setEditing(false);
      toast.success(language === 'bn' ? 'প্রতিষ্ঠানের তথ্য সংরক্ষিত' : 'Institution info saved');
    },
    onError: (e: any) => {
      console.error('Institution save failed:', e);
      toast.error(e.message || (language === 'bn' ? 'সংরক্ষণ ব্যর্থ' : 'Save failed'));
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `logos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('institution-logos').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: urlData } = supabase.storage.from('institution-logos').getPublicUrl(path);
    setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
  };

  if (editing) {
    return (
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-foreground">{language === 'bn' ? 'প্রতিষ্ঠানের তথ্য সম্পাদনা' : 'Edit Institution Info'}</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" />{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-1" />{language === 'bn' ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'নাম (বাংলা)' : 'Name (Bangla)'}</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
            <Input value={form.name_en || ''} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'ঠিকানা' : 'Address'}</label>
            <Input value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'ফোন' : 'Phone'}</label>
            <Input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'ইমেইল' : 'Email'}</label>
            <Input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অন্যান্য তথ্য' : 'Other Info'}</label>
            <Input value={form.other_info || ''} onChange={e => setForm(f => ({ ...f, other_info: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'লোগো' : 'Logo'}</label>
            <div className="flex items-center gap-2 mt-1">
              {form.logo_url && <img src={form.logo_url} alt="Logo" className="w-10 h-10 rounded object-cover" />}
              <label className="cursor-pointer px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-secondary flex items-center gap-1">
                <Upload className="w-4 h-4" /> {language === 'bn' ? 'আপলোড' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shrink-0 overflow-hidden">
        {institution?.logo_url ? (
          <img src={institution.logo_url} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <GraduationCap className="w-9 h-9 text-primary-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-display font-bold text-foreground">{institution?.name || (language === 'bn' ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}</h2>
        <p className="text-sm text-muted-foreground truncate">
          {[institution?.address, institution?.phone, institution?.email].filter(Boolean).join(' | ') || (language === 'bn' ? 'ঠিকানা, ফোন, ইমেইল' : 'Address, Phone, Email')}
        </p>
        {institution?.other_info && <p className="text-xs text-muted-foreground mt-0.5">{institution.other_info}</p>}
      </div>
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit2 className="w-4 h-4 mr-1" />{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button>
    </div>
  );
};

export default DashboardInstitutionCard;
