import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebsiteSettings, FALLBACK_LOGO_URL } from '@/hooks/useWebsiteSettings';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';
import { GraduationCap, Edit2, Save, X, Upload, Link2, MapPin, Phone, Mail, Calendar, Sparkles } from 'lucide-react';
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
  const { data: linkedPrincipal } = usePrincipalOfficer();
  const principalLinked = !!linkedPrincipal;
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
    accountant_name: '',
    accountant_name_en: '',
    verifier_name: '',
    verifier_name_en: '',
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

  // Auto-heal broken legacy Supabase URLs in DB when admin loads the dashboard
  useEffect(() => {
    if (!isAdmin || !institution) return;
    const isBroken = institution.logo_url && institution.logo_url.includes('wwhunyzobtuibhvkipwk');
    if (isBroken) {
      const validLogo = settings.logo_url && !settings.logo_url.includes('wwhunyzobtuibhvkipwk')
        ? settings.logo_url
        : FALLBACK_LOGO_URL;

      supabase
        .from('institutions')
        .update({ logo_url: validLogo })
        .eq('id', institution.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['institution-default'] });
        });

      updateMultiple.mutateAsync([
        { key: 'logo_url', value: validLogo },
        { key: 'favicon_url', value: validLogo },
        { key: 'loader_logo_url', value: validLogo },
      ]).catch(() => {});
    }
  }, [isAdmin, institution, settings.logo_url, queryClient, updateMultiple]);

  useEffect(() => {
    if (institution) {
      const cleanLogo = (institution.logo_url && !institution.logo_url.includes('wwhunyzobtuibhvkipwk'))
        ? institution.logo_url
        : (settings.logo_url && !settings.logo_url.includes('wwhunyzobtuibhvkipwk') ? settings.logo_url : FALLBACK_LOGO_URL);

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
        logo_url: cleanLogo,
        established_year: (institution as any).established_year || '',
        established_year_en: (institution as any).established_year_en || '',
        registration_number: (institution as any).registration_number || '',
        registration_number_en: (institution as any).registration_number_en || '',
      });
    }
  }, [institution, settings.logo_url]);

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
        accountant_name: (settings as any).accountant_name || '',
        accountant_name_en: (settings as any).accountant_name_en || '',
        verifier_name: (settings as any).verifier_name || '',
        verifier_name_en: (settings as any).verifier_name_en || '',
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
      // Sync institution info, principal info + global footer to website_settings
      const updates = [
        { key: 'institution_name', value: form.name },
        { key: 'institution_name_en', value: form.name_en },
        { key: 'address', value: form.address },
        { key: 'phone', value: form.phone },
        { key: 'email', value: form.email },
        { key: 'logo_url', value: form.logo_url },
        { key: 'favicon_url', value: form.logo_url },
        { key: 'loader_logo_url', value: form.logo_url },
        { key: 'established_year', value: form.established_year },
        ...Object.entries(principalForm).map(([key, value]) => ({ key, value: value as any })),
        ...Object.entries(footerForm).map(([key, value]) => ({ key, value: value as any })),
      ];
      await updateMultiple.mutateAsync(updates);
    },
    onSuccess: () => {
      try {
        localStorage.removeItem('institution-info-cache');
        localStorage.removeItem('website-settings-cache');
        localStorage.removeItem('website-settings-cache-time');
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['institution-default'] });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['institution-info'] });
      queryClient.invalidateQueries({ queryKey: ['institution-info-merged'] });
      queryClient.invalidateQueries({ queryKey: ['website-settings'] });
      window.dispatchEvent(new CustomEvent('institution-info-updated'));
      window.dispatchEvent(new CustomEvent('website-settings-updated'));
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
                {form.logo_url && (
                  <img
                    src={form.logo_url}
                    alt="Logo"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = 'true';
                        img.src = '/loader-logo.png';
                      }
                    }}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="text-sm font-semibold text-primary">{language === 'bn' ? 'অধ্যক্ষের তথ্য' : 'Principal Info'}</h4>
            {principalLinked && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <Link2 className="w-3 h-3" />
                {language === 'bn'
                  ? `স্বয়ংক্রিয় লিংক: ${linkedPrincipal?.principal_name} (${linkedPrincipal?.principal_title_bn})`
                  : `Auto-linked: ${linkedPrincipal?.principal_name_en || linkedPrincipal?.principal_name} (${linkedPrincipal?.principal_title_bn})`}
              </span>
            )}
          </div>
          {principalLinked && (
            <p className="text-[11px] text-muted-foreground">
              {language === 'bn'
                ? 'নাম, পদবি ও ছবি প্রশাসনিক কর্মকর্তার প্রোফাইল থেকে স্বয়ংক্রিয়ভাবে নেওয়া হচ্ছে। পরিবর্তন করতে /admin/administrative থেকে এডিট করুন।'
                : 'Name, designation & photo are auto-pulled from the Administrative Officer profile. Edit at /admin/administrative to change.'}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের নাম (বাংলা)' : 'Principal Name (Bangla)'}</label>
              <Input disabled={principalLinked} value={principalLinked ? (linkedPrincipal?.principal_name || '') : principalForm.principal_name} onChange={e => setPrincipalForm(f => ({ ...f, principal_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের নাম (ইংরেজি)' : 'Principal Name (English)'}</label>
              <Input disabled={principalLinked} value={principalLinked ? (linkedPrincipal?.principal_name_en || '') : principalForm.principal_name_en} onChange={e => setPrincipalForm(f => ({ ...f, principal_name_en: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'পদবি (বাংলা)' : 'Designation (Bangla)'}</label>
              <Input disabled={principalLinked} value={principalLinked ? (linkedPrincipal?.principal_title_bn || '') : principalForm.principal_title_bn} onChange={e => setPrincipalForm(f => ({ ...f, principal_title_bn: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'পদবি (ইংরেজি)' : 'Designation (English)'}</label>
              <Input disabled={principalLinked} value={principalLinked ? (linkedPrincipal?.principal_title_en || '') : principalForm.principal_title_en} onChange={e => setPrincipalForm(f => ({ ...f, principal_title_en: e.target.value }))} className="mt-1" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষের ছবি' : 'Principal Photo'}</label>
              <div className="flex items-center gap-2 mt-1">
                {(principalLinked ? linkedPrincipal?.principal_photo_url : principalForm.principal_photo_url) && (
                  <img src={(principalLinked ? linkedPrincipal?.principal_photo_url : principalForm.principal_photo_url) as string} alt="Principal" className="w-10 h-10 rounded-full object-cover" />
                )}
                {!principalLinked && (
                  <label className="cursor-pointer px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-secondary flex items-center gap-1">
                    <Upload className="w-4 h-4" /> {language === 'bn' ? 'আপলোড' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePrincipalPhotoUpload} />
                  </label>
                )}
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

        {/* Accountant & Verifier (used in Salary Sheet & official documents) */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-primary">{language === 'bn' ? 'হিসাবরক্ষক ও যাচাইকারী (বেতন বিবরণী ও অফিসিয়াল ডকুমেন্টে ব্যবহৃত হবে)' : 'Accountant & Verifier (used in Salary Sheet & official documents)'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'হিসাবরক্ষকের নাম (বাংলা)' : 'Accountant Name (Bangla)'}</label>
              <Input value={principalForm.accountant_name} onChange={e => setPrincipalForm(f => ({ ...f, accountant_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'হিসাবরক্ষকের নাম (ইংরেজি)' : 'Accountant Name (English)'}</label>
              <Input value={principalForm.accountant_name_en} onChange={e => setPrincipalForm(f => ({ ...f, accountant_name_en: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'যাচাইকারীর নাম (বাংলা)' : 'Verifier Name (Bangla)'}</label>
              <Input value={principalForm.verifier_name} onChange={e => setPrincipalForm(f => ({ ...f, verifier_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{language === 'bn' ? 'যাচাইকারীর নাম (ইংরেজি)' : 'Verifier Name (English)'}</label>
              <Input value={principalForm.verifier_name_en} onChange={e => setPrincipalForm(f => ({ ...f, verifier_name_en: e.target.value }))} className="mt-1" />
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
                value={footerForm.global_footer_spacing_top || ''}
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
                value={footerForm.global_footer_spacing_bottom || ''}
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
                value={footerForm.global_footer_font_size || ''}
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

  const rawInstLogo = institution?.logo_url || settings.logo_url;
  const displayLogo = (!rawInstLogo || rawInstLogo.includes('wwhunyzobtuibhvkipwk'))
    ? (settings.logo_url && !settings.logo_url.includes('wwhunyzobtuibhvkipwk') ? settings.logo_url : FALLBACK_LOGO_URL)
    : rawInstLogo;

  const displayName = (language === 'bn' ? institution?.name : (institution?.name_en || institution?.name)) || '';
  const hasName = !!displayName;
  const hasAnyContact = !!(institution?.address || institution?.phone || institution?.email);
  const setupHint = isAdmin
    ? (language === 'bn' ? 'প্রতিষ্ঠানের তথ্য সেট করতে "সম্পাদনা" বাটনে ক্লিক করুন' : 'Click "Edit" to set up institution info')
    : (language === 'bn' ? 'প্রতিষ্ঠানের তথ্য এখনো সেট করা হয়নি' : 'Institution info not configured yet');

    return (
    <div className="relative rounded-3xl border border-emerald-600/25 bg-gradient-to-br from-emerald-500/[0.04] via-card to-emerald-600/[0.02] dark:from-emerald-950/40 dark:via-card dark:to-slate-900/60 p-5 sm:p-7 lg:p-8 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-600/35">
      {/* Decorative ambient backdrop */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      {isAdmin && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 h-8 px-3 rounded-xl border-emerald-600/30 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/60 shadow-2xs font-semibold"
        >
          <Edit2 className="w-3.5 h-3.5 mr-1.5" />
          <span>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</span>
        </Button>
      )}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-1 pr-0 sm:pr-20">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-slate-900 p-1.5 shadow-md ring-2 ring-emerald-500/25 border border-emerald-500/20">
          {displayLogo ? (
            <img
              src={displayLogo}
              alt={displayName || "Logo"}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('loader-logo.png')) {
                  target.src = '/loader-logo.png';
                }
              }}
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center shadow-inner">
              <GraduationCap className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
          {hasName ? (
            <>
              {(institution as any)?.name_ar && (
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-lg sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-400 leading-tight mb-1"
                  style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
                >
                  {(institution as any).name_ar}
                </p>
              )}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                {displayName}
              </h1>
              {institution?.name_en && institution?.name && (
                <p className="text-xs sm:text-sm font-semibold text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                  {language === 'bn' ? institution.name_en : institution.name}
                </p>
              )}
            </>
          ) : (
            <h1 className="text-lg sm:text-2xl font-display font-semibold text-muted-foreground/80">
              {language === 'bn' ? 'প্রতিষ্ঠানের নাম যোগ করা হয়নি' : 'Institution name not set'}
            </h1>
          )}

          {/* Contact & Meta Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-3 w-full">
            {institution?.address && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{institution.address}</span>
              </span>
            )}
            {institution?.phone && (
              <a href={`tel:${institution.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 shadow-2xs transition-colors">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{institution.phone}</span>
              </a>
            )}
            {institution?.email && (
              <a href={`mailto:${institution.email}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 shadow-2xs transition-colors">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{institution.email}</span>
              </a>
            )}
            {(() => {
              const inst: any = institution || {};
              const est = language === 'bn' ? (inst.established_year || inst.established_year_en) : (inst.established_year_en || inst.established_year);
              const reg = language === 'bn' ? (inst.registration_number || inst.registration_number_en) : (inst.registration_number_en || inst.registration_number);
              if (!est && !reg) return null;
              return (
                <>
                  {est && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 text-xs font-semibold shadow-2xs">
                      <Calendar className="w-3 h-3" />
                      <span>{language === 'bn' ? `স্থাপিত: ${est}` : `Est: ${est}`}</span>
                    </span>
                  )}
                  {reg && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100/70 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 text-xs font-semibold shadow-2xs">
                      <Sparkles className="w-3 h-3" />
                      <span>{language === 'bn' ? `রেজি/EIIN: ${reg}` : `Reg: ${reg}`}</span>
                    </span>
                  )}
                </>
              );
            })()}
            {!hasAnyContact && (
              <p className="text-xs italic text-muted-foreground/70 mt-1">{setupHint}</p>
            )}
          </div>
          {institution?.other_info && <p className="text-xs text-muted-foreground mt-2">{institution.other_info}</p>}
        </div>
      </div>
    </div>
  );
};

export default DashboardInstitutionCard;