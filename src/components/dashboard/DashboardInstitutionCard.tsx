import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { GraduationCap, Edit2, Save, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const DashboardInstitutionCard = () => {
  const { language } = useLanguage();
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const queryClient = useQueryClient();
  const { settings, updateMultiple } = useWebsiteSettings();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', name_en: '', address: '', address_en: '', phone: '', email: '', other_info: '', other_info_en: '', logo_url: '' });
  const [principalForm, setPrincipalForm] = useState({
    principal_name: '',
    principal_name_en: '',
    principal_title_bn: '',
    principal_title_en: '',
    principal_message_bn: '',
    principal_message_en: '',
    principal_photo_url: '',
  });
  const [footerForm, setFooterForm] = useState({
    global_footer_text_bn: '',
    global_footer_text_en: '',
  });

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
        address_en: (institution as any).address_en || '',
        phone: institution.phone || '',
        email: institution.email || '',
        other_info: institution.other_info || '',
        other_info_en: (institution as any).other_info_en || '',
        logo_url: institution.logo_url || '',
      });
    }
  }, [institution]);

  useEffect(() => {
    if (settings) {
      setPrincipalForm({
        principal_name: settings.principal_name || '',
        principal_name_en: settings.principal_name_en || '',
        principal_title_bn: settings.principal_title_bn || '',
        principal_title_en: settings.principal_title_en || '',
        principal_message_bn: settings.principal_message_bn || '',
        principal_message_en: settings.principal_message_en || '',
        principal_photo_url: settings.principal_photo_url || '',
      });
      setFooterForm({
        global_footer_text_bn: (settings as any).global_footer_text_bn || '',
        global_footer_text_en: (settings as any).global_footer_text_en || '',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (institution) {
        const { error } = await supabase.from('institutions').update(form).eq('id', institution.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('institutions').insert({ ...form, is_default: true });
        if (error) throw error;
      }
      // Save principal info + global footer to website_settings
      const updates = [
        ...Object.entries(principalForm).map(([key, value]) => ({ key, value: value as any })),
        ...Object.entries(footerForm).map(([key, value]) => ({ key, value: value as any })),
      ];
      await updateMultiple.mutateAsync(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-default'] });
      queryClient.invalidateQueries({ queryKey: ['website-settings'] });
      setEditing(false);
      toast.success(language === 'bn' ? 'তথ্য সংরক্ষিত' : 'Info saved');
    },
    onError: (e: any) => {
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

  const handlePrincipalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `principal/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('website-assets').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: urlData } = supabase.storage.from('website-assets').getPublicUrl(path);
    setPrincipalForm(f => ({ ...f, principal_photo_url: urlData.publicUrl }));
  };

  if (editing) {
    return (
      <div className="card-elevated p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-foreground">{language === 'bn' ? 'প্রতিষ্ঠানের তথ্য সম্পাদনা' : 'Edit Institution Info'}</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" />{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-1" />{language === 'bn' ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Institution fields */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-primary">{language === 'bn' ? 'প্রতিষ্ঠান' : 'Institution'}</h4>
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
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'ঠিকানা (বাংলা)' : 'Address (Bangla)'}</label>
              <Input value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'ঠিকানা (ইংরেজি)' : 'Address (English)'}</label>
              <Input value={form.address_en || ''} onChange={e => setForm(f => ({ ...f, address_en: e.target.value }))} className="mt-1" />
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
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অন্যান্য তথ্য (বাংলা)' : 'Other Info (Bangla)'}</label>
              <Input value={form.other_info || ''} onChange={e => setForm(f => ({ ...f, other_info: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অন্যান্য তথ্য (ইংরেজি)' : 'Other Info (English)'}</label>
              <Input value={form.other_info_en || ''} onChange={e => setForm(f => ({ ...f, other_info_en: e.target.value }))} className="mt-1" />
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

        {/* Principal fields */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-primary">{language === 'bn' ? 'অধ্যক্ষের তথ্য' : 'Principal Info'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের নাম (বাংলা)' : 'Principal Name (Bangla)'}</label>
              <Input value={principalForm.principal_name} onChange={e => setPrincipalForm(f => ({ ...f, principal_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের নাম (ইংরেজি)' : 'Principal Name (English)'}</label>
              <Input value={principalForm.principal_name_en} onChange={e => setPrincipalForm(f => ({ ...f, principal_name_en: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'পদবি (বাংলা)' : 'Designation (Bangla)'}</label>
              <Input value={principalForm.principal_title_bn} onChange={e => setPrincipalForm(f => ({ ...f, principal_title_bn: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'পদবি (ইংরেজি)' : 'Designation (English)'}</label>
              <Input value={principalForm.principal_title_en} onChange={e => setPrincipalForm(f => ({ ...f, principal_title_en: e.target.value }))} className="mt-1" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের ছবি' : 'Principal Photo'}</label>
              <div className="flex items-center gap-2 mt-1">
                {principalForm.principal_photo_url && <img src={principalForm.principal_photo_url} alt="Principal" className="w-10 h-10 rounded-full object-cover" />}
                <label className="cursor-pointer px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-secondary flex items-center gap-1">
                  <Upload className="w-4 h-4" /> {language === 'bn' ? 'আপলোড' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePrincipalPhotoUpload} />
                </label>
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের বাণী (বাংলা)' : "Principal's Message (Bangla)"}</label>
              <Textarea rows={3} value={principalForm.principal_message_bn} onChange={e => setPrincipalForm(f => ({ ...f, principal_message_bn: e.target.value }))} className="mt-1" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের বাণী (ইংরেজি)' : "Principal's Message (English)"}</label>
              <Textarea rows={3} value={principalForm.principal_message_en} onChange={e => setPrincipalForm(f => ({ ...f, principal_message_en: e.target.value }))} className="mt-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
      <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-xl bg-primary flex items-center justify-center shrink-0 overflow-hidden">
        {institution?.logo_url ? (
          <img src={institution.logo_url} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <GraduationCap className="w-9 h-9 lg:w-12 lg:h-12 text-primary-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0 w-full flex flex-col items-center">
        <h1 className="text-3xl font-display font-bold truncate text-center text-primary lg:text-5xl">{(language === 'bn' ? institution?.name : (institution?.name_en || institution?.name)) || (language === 'bn' ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}</h1>
        {institution?.name_en && institution?.name && (
          <p className="text-lg font-display font-semibold text-center text-primary/70 lg:text-3xl">{language === 'bn' ? institution.name_en : institution.name}</p>
        )}
        <div className="text-sm lg:text-base text-muted-foreground space-y-0.5 lg:space-y-1 w-full">
          {institution?.address && <p className="truncate text-center text-lg lg:text-xl">{institution.address}</p>}
          {institution?.phone && <p className="truncate text-center lg:text-lg">{institution.phone}</p>}
          {institution?.email && <p className="truncate text-center text-base lg:text-lg font-serif">{institution.email}</p>}
          {!institution?.address && !institution?.phone && !institution?.email && (
            <p>{language === 'bn' ? 'ঠিকানা, ফোন, ইমেইল' : 'Address, Phone, Email'}</p>
          )}
        </div>
        {institution?.other_info && <p className="text-xs text-muted-foreground mt-0.5 break-words">{institution.other_info}</p>}
      </div>
      {isAdmin && (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="w-full sm:w-auto"><Edit2 className="w-4 h-4 mr-1" />{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button>
      )}
    </div>
  );
};

export default DashboardInstitutionCard;
