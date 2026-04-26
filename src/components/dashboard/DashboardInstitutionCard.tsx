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
  const [form, setForm] = useState({ name: '', name_en: '', name_ar: '', address: '', address_en: '', phone: '', email: '', other_info: '', other_info_en: '', logo_url: '', established_year: '', established_year_en: '', registration_number: '', registration_number_en: '' });
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
    global_footer_spacing_top: 8,
    global_footer_spacing_bottom: 6,
    global_footer_font_size: 10,
  });

  const { data: institution, isLoading: institutionLoading } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const { data, error } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (institution) {
      setForm({
        name: institution.name || '',
        name_en: institution.name_en || '',
        name_ar: (institution as any).name_ar || '',
        address: institution.address || '',
        address_en: (institution as any).address_en || '',
        phone: institution.phone || '',
        email: institution.email || '',
        other_info: institution.other_info || '',
        other_info_en: (institution as any).other_info_en || '',
        logo_url: institution.logo_url || '',
        established_year: (institution as any).established_year || '',
        established_year_en: (institution as any).established_year_en || '',
        registration_number: (institution as any).registration_number || '',
        registration_number_en: (institution as any).registration_number_en || '',
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
        global_footer_spacing_top: Number((settings as any).global_footer_spacing_top ?? 8),
        global_footer_spacing_bottom: Number((settings as any).global_footer_spacing_bottom ?? 6),
        global_footer_font_size: Number((settings as any).global_footer_font_size ?? 10),
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
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'নাম (আরবি)' : 'Name (Arabic)'}</label>
              <Input
                value={form.name_ar}
                onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                className="mt-1 text-right"
                dir="rtl"
                lang="ar"
                style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
                placeholder="اسم المدرسة بالعربية"
              />
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
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'মাদরাসা স্থাপিত (বাংলা)' : 'Established (Bangla)'}</label>
              <Input value={form.established_year} onChange={e => setForm(f => ({ ...f, established_year: e.target.value }))} className="mt-1" placeholder="যেমন: ১৯৮৫" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'মাদরাসা স্থাপিত (ইংরেজি)' : 'Established (English)'}</label>
              <Input value={form.established_year_en} onChange={e => setForm(f => ({ ...f, established_year_en: e.target.value }))} className="mt-1" placeholder="e.g. 1985" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'রেজি: নং / EIIN (বাংলা)' : 'Reg. No / EIIN (Bangla)'}</label>
              <Input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} className="mt-1" placeholder="রেজিস্ট্রেশন বা EIIN নম্বর" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'রেজি: নং / EIIN (ইংরেজি)' : 'Reg. No / EIIN (English)'}</label>
              <Input value={form.registration_number_en} onChange={e => setForm(f => ({ ...f, registration_number_en: e.target.value }))} className="mt-1" placeholder="Registration or EIIN number" />
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

        {/* Global Footer (used in all forms & templates) */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-primary">{language === 'bn' ? 'গ্লোবাল ফুটার (সকল ফর্ম ও টেমপ্লেটে ব্যবহৃত হবে)' : 'Global Footer (used in all forms & templates)'}</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'ফুটার টেক্সট (বাংলা)' : 'Footer Text (Bangla)'}</label>
              <Textarea rows={3} value={footerForm.global_footer_text_bn} onChange={e => setFooterForm(f => ({ ...f, global_footer_text_bn: e.target.value }))} className="mt-1" placeholder={language === 'bn' ? 'উদাহরণ: সকল অধিকার সংরক্ষিত © প্রতিষ্ঠানের নাম' : 'e.g. All rights reserved © Institution Name'} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'ফুটার টেক্সট (ইংরেজি)' : 'Footer Text (English)'}</label>
              <Textarea rows={3} value={footerForm.global_footer_text_en} onChange={e => setFooterForm(f => ({ ...f, global_footer_text_en: e.target.value }))} className="mt-1" placeholder="e.g. All rights reserved © Institution Name" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {language === 'bn' ? 'উপরের স্পেস (mm)' : 'Top Spacing (mm)'}
              </label>
              <Input
                type="number"
                min={0}
                max={50}
                step={1}
                value={footerForm.global_footer_spacing_top}
                onChange={e => setFooterForm(f => ({ ...f, global_footer_spacing_top: Math.max(0, Number(e.target.value) || 0) }))}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {language === 'bn' ? 'প্রিন্ট/PDF-এ ফুটারের উপরের প্যাডিং' : 'Padding above footer on print/PDF'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {language === 'bn' ? 'নিচের মার্জিন (mm)' : 'Bottom Margin (mm)'}
              </label>
              <Input
                type="number"
                min={0}
                max={50}
                step={1}
                value={footerForm.global_footer_spacing_bottom}
                onChange={e => setFooterForm(f => ({ ...f, global_footer_spacing_bottom: Math.max(0, Number(e.target.value) || 0) }))}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {language === 'bn' ? 'পাতার নিচের কিনারা থেকে দূরত্ব' : 'Distance from page bottom edge'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {language === 'bn' ? 'ফন্ট সাইজ (pt)' : 'Font Size (pt)'}
              </label>
              <Input
                type="number"
                min={6}
                max={20}
                step={1}
                value={footerForm.global_footer_font_size}
                onChange={e => setFooterForm(f => ({ ...f, global_footer_font_size: Math.max(6, Number(e.target.value) || 10) }))}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {language === 'bn' ? 'প্রিন্টে ফুটার টেক্সটের আকার' : 'Footer text size on print'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (institutionLoading) {
    return (
      <div className="card-elevated p-5 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 animate-pulse">
        <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 w-full space-y-3">
          <div className="h-8 lg:h-10 bg-muted rounded w-2/3 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
        </div>
      </div>
    );
  }

  const displayName = (language === 'bn' ? institution?.name : (institution?.name_en || institution?.name)) || '';
  const hasName = !!displayName;
  const hasAnyContact = !!(institution?.address || institution?.phone || institution?.email);
  const setupHint = isAdmin
    ? (language === 'bn' ? 'প্রতিষ্ঠানের তথ্য সেট করতে "সম্পাদনা" বাটনে ক্লিক করুন' : 'Click "Edit" to set up institution info')
    : (language === 'bn' ? 'প্রতিষ্ঠানের তথ্য এখনো সেট করা হয়নি' : 'Institution info not configured yet');

  return (
    <div className="card-elevated p-5 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
      <div className={`w-16 h-16 lg:w-24 lg:h-24 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${institution?.logo_url ? 'bg-transparent' : 'bg-primary'}`}>
        {institution?.logo_url ? (
          <img src={institution.logo_url} alt="Logo" className="w-full h-full object-contain" />
        ) : (
          <GraduationCap className="w-9 h-9 lg:w-12 lg:h-12 text-primary-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0 w-full flex flex-col items-center">
        {hasName ? (
          <>
            {(institution as any)?.name_ar && (
              <p
                dir="rtl"
                lang="ar"
                className="text-2xl lg:text-4xl font-semibold text-center text-primary/90 leading-tight mb-1"
                style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
              >
                {(institution as any).name_ar}
              </p>
            )}
            <h1 className="text-3xl font-display font-bold truncate text-center text-primary lg:text-5xl">{displayName}</h1>
            {institution?.name_en && institution?.name && (
              <p className="text-lg font-display font-semibold text-center text-primary/70 lg:text-3xl">{language === 'bn' ? institution.name_en : institution.name}</p>
            )}
          </>
        ) : (
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-center text-muted-foreground/80">
            {language === 'bn' ? 'প্রতিষ্ঠানের নাম যোগ করা হয়নি' : 'Institution name not set'}
          </h1>
        )}
        <div className="text-sm lg:text-base text-muted-foreground space-y-0.5 lg:space-y-1 w-full">
          {institution?.address && <p className="truncate text-center text-lg lg:text-xl">{institution.address}</p>}
          {institution?.phone && <p className="truncate text-center lg:text-lg">{institution.phone}</p>}
          {institution?.email && <p className="truncate text-center text-base lg:text-lg font-serif">{institution.email}</p>}
          {(() => {
            const inst: any = institution || {};
            const est = language === 'bn' ? (inst.established_year || inst.established_year_en) : (inst.established_year_en || inst.established_year);
            const reg = language === 'bn' ? (inst.registration_number || inst.registration_number_en) : (inst.registration_number_en || inst.registration_number);
            if (!est && !reg) return null;
            return (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-xs lg:text-sm">
                {est && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 text-primary/90 font-medium">
                    <span className="opacity-70">{language === 'bn' ? 'স্থাপিত:' : 'Est.'}</span>
                    <span>{est}</span>
                  </span>
                )}
                {reg && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 text-primary/90 font-medium">
                    <span className="opacity-70">{language === 'bn' ? 'রেজি/EIIN:' : 'Reg/EIIN:'}</span>
                    <span>{reg}</span>
                  </span>
                )}
              </div>
            );
          })()}
          {!hasAnyContact && (
            <p className="text-center text-xs lg:text-sm italic text-muted-foreground/70 mt-1">{setupHint}</p>
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
