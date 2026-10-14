import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { usePersistentTab } from '@/hooks/usePersistentTab';
import { Globe, Save, Image, Type, Layout, BarChart3, Plus, Trash2, Eye, ImageIcon, Share2, PanelTop, PanelBottom, Navigation, Menu, RefreshCw, CheckCircle, AlertCircle, Database, FileText, ChevronUp, ChevronDown, EyeOff, Link2, List, SlidersHorizontal, LogIn, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WebsitePageBuilder from '@/components/admin/WebsitePageBuilder';
import { toast } from 'sonner';
import { useWebsiteSettings, WebsiteSettings, InfoLink } from '@/hooks/useWebsiteSettings';
import { useMenuSettings, MenuItemConfig } from '@/hooks/useMenuSettings';
import { Json } from '@/integrations/supabase/types';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/hooks/useAuth';
import { Lock } from 'lucide-react';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';

const AVAILABLE_PAGES = [
  { path: '/', label_bn: 'হোম', label_en: 'Home' },
  { path: '/about', label_bn: 'আমাদের সম্পর্কে', label_en: 'About' },
  { path: '/gallery', label_bn: 'গ্যালারি', label_en: 'Gallery' },
  { path: '/admission', label_bn: 'ভর্তি', label_en: 'Admission' },
  { path: '/result', label_bn: 'ফলাফল', label_en: 'Result' },
  { path: '/student-info', label_bn: 'শিক্ষার্থী তথ্য', label_en: 'Student Info' },
  { path: '/notices', label_bn: 'নোটিশ', label_en: 'Notices' },
  { path: '/donation', label_bn: 'দান', label_en: 'Donation' },
  { path: '/fee-payment', label_bn: 'ফি প্রদান', label_en: 'Fee Payment' },
  { path: '/contact', label_bn: 'যোগাযোগ', label_en: 'Contact' },
  { path: '/photo-tools', label_bn: 'ফটো টুলস', label_en: 'Photo Tools' },
  { path: '/posts', label_bn: 'পোস্ট/সংবাদ', label_en: 'Posts/News' },
];

const INFO_LINK_ICONS = [
  'Users', 'UserCheck', 'BookOpen', 'GraduationCap', 'FileText', 'List', 'Award',
  'Globe', 'Heart', 'Star', 'Shield', 'Clock', 'MapPin', 'Phone', 'Mail', 'Settings', 'Bookmark', 'Layers', 'Tag',
];

const VALID_WEBSITE_TABS = [
  'institution', 'header', 'navigation', 'hero', 'content', 'gallery',
  'footer', 'sections', 'divisions', 'info-links', 'social', 'sync',
  'form-settings', 'login-page'
] as const;
type WebsiteTab = typeof VALID_WEBSITE_TABS[number];

const AdminWebsite = () => {
  const { language } = useLanguage();
  const { settings, isLoading, updateMultiple } = useWebsiteSettings();
  const { data: linkedPrincipal } = usePrincipalOfficer();
  const principalLinked = !!linkedPrincipal;
  const { canEditItem } = usePagePermissions('/admin/website');
  const { menuConfig, saveMenuConfig } = useMenuSettings();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WebsiteSettings | null>(null);
  const [activeTab, setActiveTab] = usePersistentTab<WebsiteTab>('institution', {
    paramName: 'tab',
    validTabs: VALID_WEBSITE_TABS,
    storageKey: 'edumate_website_tab',
  });
  const [publicMenu, setPublicMenu] = useState<MenuItemConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const isSuperAdmin = role === 'super_admin';
  const signatoryLocked = !!(settings?.signatory_edit_super_admin_only);
  // Admins can edit only when not locked; super_admin always can.
  const canEditSignatories = isSuperAdmin || !signatoryLocked;

  useEffect(() => {
    if (settings && !form) {
      setForm({ ...settings });
    }
  }, [settings, form]);

  useEffect(() => {
    setPublicMenu(menuConfig.public || []);
  }, [menuConfig]);

  if (isLoading || !form) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-5xl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  const updateField = (key: keyof WebsiteSettings, value: any) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const updateHeaderStyle = (key: string, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, header_style: { ...prev.header_style, [key]: value } };
    });
  };

  const updateNavStyle = (key: string, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, nav_style: { ...prev.nav_style, [key]: value } };
    });
  };

  const updateFooterStyle = (key: string, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, footer_style: { ...prev.footer_style, [key]: value } };
    });
  };

  const toggleSection = (key: keyof WebsiteSettings['sections']) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, sections: { ...prev.sections, [key]: !prev.sections[key] } };
    });
  };

  // Info Links CRUD
  const addInfoLink = () => {
    setForm(prev => {
      if (!prev) return prev;
      const links = [...(prev.info_links || [])];
      links.push({ id: `info-${Date.now()}`, label_bn: '', label_en: '', path: '/', icon: 'Globe', visible: true, sort_order: links.length });
      return { ...prev, info_links: links };
    });
  };
  const removeInfoLink = (index: number) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, info_links: (prev.info_links || []).filter((_, i) => i !== index) };
    });
  };
  const updateInfoLink = (index: number, field: string, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      const links = [...(prev.info_links || [])];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, info_links: links };
    });
  };
  const moveInfoLink = (index: number, dir: 'up' | 'down') => {
    setForm(prev => {
      if (!prev) return prev;
      const links = [...(prev.info_links || [])];
      const swapIdx = dir === 'up' ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= links.length) return prev;
      [links[index], links[swapIdx]] = [links[swapIdx], links[index]];
      return { ...prev, info_links: links.map((l, i) => ({ ...l, sort_order: i })) };
    });
  };

  const updateDivision = (index: number, field: string, value: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const divs = [...prev.divisions];
      divs[index] = { ...divs[index], [field]: value };
      return { ...prev, divisions: divs };
    });
  };

  const addDivision = () => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, divisions: [...prev.divisions, { name: '', nameEn: '', icon: '📚' }] };
    });
  };

  const removeDivision = (index: number) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, divisions: prev.divisions.filter((_, i) => i !== index) };
    });
  };

  const updateGalleryItem = (index: number, field: string, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      const items = [...(prev.gallery_items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, gallery_items: items };
    });
  };

  const addGalleryItem = () => {
    setForm(prev => {
      if (!prev) return prev;
      const items = [...(prev.gallery_items || [])];
      items.push({ title_bn: '', title_en: '', image_url: '', sort_order: items.length + 1 });
      return { ...prev, gallery_items: items };
    });
  };

  const removeGalleryItem = (index: number) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, gallery_items: (prev.gallery_items || []).filter((_, i) => i !== index) };
    });
  };

  const updateSocialLink = (index: number, field: string, value: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const links = [...(prev.social_links || [])];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, social_links: links };
    });
  };

  const addSocialLink = () => {
    setForm(prev => {
      if (!prev) return prev;
      const links = [...(prev.social_links || [])];
      links.push({ platform: '', url: '', icon: '' });
      return { ...prev, social_links: links };
    });
  };

  const removeSocialLink = (index: number) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, social_links: (prev.social_links || []).filter((_, i) => i !== index) };
    });
  };

  const updateFooterLink = (index: number, field: string, value: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const links = [...(prev.footer_links || [])];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, footer_links: links };
    });
  };

  const addFooterLink = () => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, footer_links: [...(prev.footer_links || []), { label_bn: '', label_en: '', url: '' }] };
    });
  };

  const removeFooterLink = (index: number) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, footer_links: (prev.footer_links || []).filter((_, i) => i !== index) };
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const updates: Array<{ key: string; value: Json }> = Object.entries(form).map(([key, value]) => ({
        key,
        value: value as Json,
      }));
      await updateMultiple.mutateAsync(updates);
      await saveMenuConfig.mutateAsync({ sidebar: menuConfig.sidebar, public: publicMenu });
      toast.success(language === 'bn' ? 'সকল পরিবর্তন সংরক্ষিত!' : 'All changes saved!');
    } catch {
      toast.error(language === 'bn' ? 'সংরক্ষণে ত্রুটি' : 'Error saving');
    }
    setSaving(false);
  };

  const saveSection = async (keys: (keyof WebsiteSettings)[]) => {
    setSaving(true);
    try {
      const updates = keys.map(key => ({ key, value: form[key] as Json }));
      await updateMultiple.mutateAsync(updates);

      // If institution info was updated, sync to primary 'institutions' table and invalidate all institution caches
      const instKeys = ['institution_name', 'institution_name_en', 'address', 'phone', 'email', 'logo_url', 'registration_number', 'established_year'];
      if (keys.some(k => instKeys.includes(k))) {
        try {
          const { data: instRow } = await supabase
            .from('institutions')
            .select('id')
            .eq('is_default', true)
            .maybeSingle();

          const instPayload: Record<string, any> = {};
          if (form.institution_name) instPayload.name = form.institution_name.trim();
          if (form.institution_name_en) instPayload.name_en = form.institution_name_en.trim();
          if (form.address) instPayload.address = form.address.trim();
          if (form.phone) instPayload.phone = form.phone.trim();
          if (form.email) instPayload.email = form.email.trim();
          if (form.logo_url) instPayload.logo_url = form.logo_url.trim();
          if (form.registration_number) instPayload.registration_number = form.registration_number.trim();
          if (form.established_year) instPayload.established_year = form.established_year.trim();

          if (instRow?.id) {
            await supabase.from('institutions').update(instPayload).eq('id', instRow.id);
          } else if (Object.keys(instPayload).length > 0) {
            await supabase.from('institutions').insert({ name: form.institution_name?.trim() || 'Institution', ...instPayload, is_default: true } as any);
          }
        } catch (e) {
          console.warn('Sync to institutions table error:', e);
        }

        await queryClient.invalidateQueries({ queryKey: ['institution-default'] });
        await queryClient.invalidateQueries({ queryKey: ['institution-info-merged'] });
        await queryClient.invalidateQueries({ queryKey: ['institution-info'] });
        await queryClient.invalidateQueries({ queryKey: ['institutions'] });
        window.dispatchEvent(new CustomEvent('institution-info-updated'));
      }

      toast.success(language === 'bn' ? 'সংরক্ষিত!' : 'Saved!');
    } catch {
      toast.error(language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error occurred');
    }
    setSaving(false);
  };

  // Saves principal/accountant/verifier names to BOTH institutions (primary source of truth)
  // AND website_settings (legacy mirror). Conflict-handling rules:
  //   1. Skip the save entirely if nothing changed (no-op detection).
  //   2. If institutions ↔ website_settings already disagree (legacy drift), warn the
  //      user once before overwriting both with the form values.
  //   3. Optimistic concurrency: re-read institutions just before update; if another
  //      session changed it after the form was loaded, ask the user to confirm.
  //   4. Partial-failure rollback: if the legacy mirror write fails after the
  //      institutions write succeeded, restore institutions to its pre-save snapshot
  //      so the two sources never end up out of sync.
  //   5. Auto-create the default institution row if it's missing instead of silently skipping.
  const saveSignatories = async () => {
    if (!form) return;
    if (!canEditSignatories) {
      toast.error(language === 'bn'
        ? 'আপনার এই তথ্য সম্পাদনার অনুমতি নেই। সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।'
        : 'You do not have permission to edit signatories. Contact the Super Admin.');
      return;
    }
    setSaving(true);
    try {
      const principal = (form.principal_name || '').trim();
      const principalEn = (form.principal_name_en || '').trim();
      const accountant = ((form as any).accountant_name || '').trim();
      const verifier = ((form as any).verifier_name || '').trim();

      // --- Step A: read current state from BOTH sources ----------------------------
      const [{ data: instRow, error: instReadErr }, { data: wsRows, error: wsReadErr }] = await Promise.all([
        supabase
          .from('institutions')
          .select('id, principal_name, accountant_name, verifier_name, updated_at')
          .eq('is_default', true)
          .maybeSingle(),
        supabase
          .from('website_settings')
          .select('key, value')
          .in('key', ['principal_name', 'principal_name_en', 'accountant_name', 'verifier_name']),
      ]);
      if (instReadErr) throw instReadErr;
      if (wsReadErr) throw wsReadErr;

      const wsMap: Record<string, string> = {};
      (wsRows || []).forEach((r: any) => {
        const v = r.value;
        wsMap[r.key] = (typeof v === 'string' ? v : (v == null ? '' : String(v))).trim();
      });

      // --- Step B: no-op detection -------------------------------------------------
      const sameAsInst = !!instRow
        && (instRow.principal_name || '').trim() === principal
        && (instRow.accountant_name || '').trim() === accountant
        && (instRow.verifier_name || '').trim() === verifier;
      const sameAsWs =
        (wsMap.principal_name || '') === principal
        && (wsMap.principal_name_en || '') === principalEn
        && (wsMap.accountant_name || '') === accountant
        && (wsMap.verifier_name || '') === verifier;
      if (sameAsInst && sameAsWs) {
        toast.info(language === 'bn' ? 'কোনো পরিবর্তন নেই — সংরক্ষণ এড়ানো হলো।' : 'No changes — skipping save.');
        setSaving(false);
        return;
      }

      // --- Step C: legacy-drift warning -------------------------------------------
      const driftDetected = !!instRow && (
        (instRow.principal_name || '').trim() !== (wsMap.principal_name || '')
        || (instRow.accountant_name || '').trim() !== (wsMap.accountant_name || '')
        || (instRow.verifier_name || '').trim() !== (wsMap.verifier_name || '')
      );
      if (driftDetected) {
        const proceed = window.confirm(language === 'bn'
          ? 'প্রতিষ্ঠানের তথ্য ও পুরাতন সেটিংসে ভিন্ন নাম পাওয়া গেছে। আপনি এখন যেগুলো লিখেছেন সেগুলো দুই জায়গায়ই বসিয়ে সমন্বয় করা হবে। চালিয়ে যাবেন?'
          : 'Institutions and legacy website_settings hold different names. Continuing will overwrite BOTH with the values you just entered. Proceed?');
        if (!proceed) { setSaving(false); return; }
      }

      // --- Step D: optimistic concurrency check (re-read right before write) ------
      // If form was loaded with one snapshot and someone else saved meanwhile, settings
      // (which feeds the form on first load) and the live row will disagree.
      const baselinePrincipal = (settings?.principal_name || '').trim();
      const baselineAccountant = ((settings as any)?.accountant_name || '').trim();
      const baselineVerifier = ((settings as any)?.verifier_name || '').trim();
      if (instRow) {
        const livePrincipal = (instRow.principal_name || '').trim();
        const liveAccountant = (instRow.accountant_name || '').trim();
        const liveVerifier = (instRow.verifier_name || '').trim();
        const concurrentChange =
          livePrincipal !== baselinePrincipal
          || liveAccountant !== baselineAccountant
          || liveVerifier !== baselineVerifier;
        if (concurrentChange) {
          const overwrite = window.confirm(language === 'bn'
            ? `অন্য একজন এই তথ্য পরিবর্তন করেছেন।\n\nবর্তমান সংরক্ষিত:\n• প্রিন্সিপাল: ${livePrincipal || '—'}\n• হিসাবরক্ষক: ${liveAccountant || '—'}\n• যাচাইকারী: ${liveVerifier || '—'}\n\nআপনার এডিট দিয়ে ওভাররাইট করবেন?`
            : `Someone else changed these fields.\n\nCurrently saved:\n• Principal: ${livePrincipal || '—'}\n• Accountant: ${liveAccountant || '—'}\n• Verifier: ${liveVerifier || '—'}\n\nOverwrite with your edits?`);
          if (!overwrite) { setSaving(false); return; }
        }
      }

      // --- Step E: PRIMARY write (institutions) -----------------------------------
      // Snapshot for rollback in case the mirror write fails.
      const snapshot = instRow
        ? {
            principal_name: instRow.principal_name,
            accountant_name: instRow.accountant_name,
            verifier_name: instRow.verifier_name,
          }
        : null;

      let resolvedInstId: string | null = instRow?.id ?? null;
      if (!instRow?.id) {
        // No default row yet → create one so the mirror is never the only source.
        const { data: created, error: createErr } = await supabase
          .from('institutions')
          .insert({
            name: form.institution_name || 'Default Institution',
            name_en: form.institution_name_en || null,
            address: form.address || null,
            phone: form.phone || null,
            email: form.email || null,
            logo_url: form.logo_url || null,
            is_default: true,
            principal_name: principal || null,
            accountant_name: accountant || null,
            verifier_name: verifier || null,
          })
          .select('id')
          .maybeSingle();
        if (createErr) throw createErr;
        resolvedInstId = created?.id ?? null;
      } else {
        const { error: instErr } = await supabase
          .from('institutions')
          .update({
            principal_name: principal || null,
            accountant_name: accountant || null,
            verifier_name: verifier || null,
          })
          .eq('id', instRow.id);
        if (instErr) throw instErr;
      }

      // --- Step F: MIRROR write (website_settings) with rollback on failure -------
      try {
        await updateMultiple.mutateAsync([
          { key: 'principal_name', value: principal as Json },
          { key: 'principal_name_en', value: principalEn as Json },
          { key: 'accountant_name', value: accountant as Json },
          { key: 'verifier_name', value: verifier as Json },
        ]);
      } catch (mirrorErr) {
        // Roll back the primary write so the two sources stay aligned.
        if (snapshot && resolvedInstId) {
          await supabase
            .from('institutions')
            .update(snapshot)
            .eq('id', resolvedInstId);
        }
        throw mirrorErr;
      }

      // --- Step G: invalidate caches & broadcast ----------------------------------
      await queryClient.invalidateQueries({ queryKey: ['website-settings'] });
      await queryClient.refetchQueries({ queryKey: ['website-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['institutions'] });
      window.dispatchEvent(new CustomEvent('institution-info-updated', {
        detail: { principal_name: principal, accountant_name: accountant, verifier_name: verifier },
      }));

      toast.success(language === 'bn'
        ? 'সংরক্ষিত! প্রতিষ্ঠান ও সেটিংস সমন্বিত — পরবর্তী ডকুমেন্টে নতুন নাম দেখাবে।'
        : 'Saved! Institutions and settings are in sync — new names appear on the next generated document.');
    } catch (err: any) {
      console.error('saveSignatories failed:', err);
      toast.error(language === 'bn'
        ? `সংরক্ষণে ত্রুটি: ${err?.message || 'অজানা সমস্যা'}`
        : `Save failed: ${err?.message || 'Unknown error'}`);
    }
    setSaving(false);
  };

  // Super-admin-only: toggle whether regular admins can edit signatory fields.
  const toggleSignatoryLock = async (locked: boolean) => {
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      await updateMultiple.mutateAsync([
        { key: 'signatory_edit_super_admin_only', value: locked as unknown as Json },
      ]);
      await queryClient.invalidateQueries({ queryKey: ['website-settings'] });
      toast.success(locked
        ? (language === 'bn' ? 'এখন থেকে শুধু সুপার অ্যাডমিন স্বাক্ষরকারী সম্পাদনা করতে পারবে' : 'Locked: only Super Admin can edit signatories')
        : (language === 'bn' ? 'অ্যাডমিনদেরও সম্পাদনার অনুমতি দেওয়া হলো' : 'Unlocked: Admins can edit signatories'));
    } catch {
      toast.error(language === 'bn' ? 'পরিবর্তন ব্যর্থ' : 'Update failed');
    }
    setSaving(false);
  };

  const saveNavigation = async () => {
    setSaving(true);
    try {
      await saveMenuConfig.mutateAsync({ sidebar: menuConfig.sidebar, public: publicMenu });
      await updateMultiple.mutateAsync([{ key: 'nav_style', value: JSON.parse(JSON.stringify(form.nav_style)) as Json }]);
      toast.success(language === 'bn' ? 'নেভিগেশন সংরক্ষিত!' : 'Navigation saved!');
    } catch {
      toast.error(language === 'bn' ? 'নেভিগেশন সংরক্ষণে ত্রুটি' : 'Error saving navigation');
    }
    setSaving(false);
  };

  const sectionLabels: { key: keyof WebsiteSettings['sections']; bn: string; en: string }[] = [
    { key: 'banner', bn: 'হিরো ব্যানার', en: 'Hero Banner' },
    { key: 'stats', bn: 'পরিসংখ্যান', en: 'Statistics' },
    { key: 'principalMessage', bn: 'অধ্যক্ষের বাণী', en: "Principal's Message" },
    { key: 'classInfo', bn: 'শ্রেণী তথ্য', en: 'Class Info' },
    { key: 'teachersList', bn: 'শিক্ষক তালিকা', en: 'Teachers List' },
    { key: 'studentInfo', bn: 'ছাত্র তথ্য', en: 'Student Info' },
    { key: 'latestNotice', bn: 'সর্বশেষ নোটিশ', en: 'Latest Notices' },
    { key: 'latestPosts', bn: 'সর্বশেষ পোস্ট/সংবাদ', en: 'Latest Posts/News' },
    { key: 'admissionButtons', bn: 'ভর্তি বাটন', en: 'Admission Buttons' },
    { key: 'gallery', bn: 'গ্যালারি', en: 'Gallery' },
    { key: 'donation', bn: 'দান সেকশন', en: 'Donation Section' },
    { key: 'feePayment', bn: 'ফি পেমেন্ট', en: 'Fee Payment' },
    { key: 'prayerCalendar', bn: 'নামাজ ও ক্যালেন্ডার', en: 'Prayer & Calendar' },
  ];

  const colorInput = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <Input
          type="color"
          value={value || '#1a5e1f'}
          onChange={e => onChange(e.target.value)}
          className="w-12 h-10 p-1 cursor-pointer"
        />
        <Input
          className="bg-background flex-1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={language === 'bn' ? 'ডিফল্ট ব্যবহার হবে' : 'Default will be used'}
        />
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange('')} className="text-xs">
            {language === 'bn' ? 'রিসেট' : 'Reset'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            {language === 'bn' ? 'ওয়েবসাইট UI বিল্ডার' : 'Website UI Builder'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open('/', '_blank')}>
              <Eye className="w-4 h-4 mr-1" /> {language === 'bn' ? 'প্রিভিউ' : 'Preview'}
            </Button>
            {canEditItem && <Button className="btn-primary-gradient" size="sm" onClick={saveAll} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সব সংরক্ষণ' : 'Save All'}
            </Button>}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WebsiteTab)} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="institution" className="text-xs py-2 px-2.5">
              <Globe className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'প্রতিষ্ঠান' : 'Institution'}
            </TabsTrigger>
            <TabsTrigger value="header" className="text-xs py-2 px-2.5">
              <PanelTop className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'হেডার' : 'Header'}
            </TabsTrigger>
            <TabsTrigger value="navigation" className="text-xs py-2 px-2.5">
              <Navigation className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'নেভিগেশন' : 'Navigation'}
            </TabsTrigger>
            <TabsTrigger value="hero" className="text-xs py-2 px-2.5">
              <Image className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'ব্যানার' : 'Banner'}
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs py-2 px-2.5">
              <Type className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'কন্টেন্ট' : 'Content'}
            </TabsTrigger>
            <TabsTrigger value="gallery" className="text-xs py-2 px-2.5">
              <ImageIcon className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'গ্যালারি' : 'Gallery'}
            </TabsTrigger>
            <TabsTrigger value="footer" className="text-xs py-2 px-2.5">
              <PanelBottom className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'ফুটার' : 'Footer'}
            </TabsTrigger>
            <TabsTrigger value="sections" className="text-xs py-2 px-2.5">
              <Layout className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'পেইজ বিল্ডার' : 'Page Builder'}
            </TabsTrigger>
            <TabsTrigger value="divisions" className="text-xs py-2 px-2.5">
              <BarChart3 className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'বিভাগ' : 'Divisions'}
            </TabsTrigger>
            <TabsTrigger value="info-links" className="text-xs py-2 px-2.5">
              <Link2 className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'তথ্য লিংক' : 'Info Links'}
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs py-2 px-2.5">
              <Share2 className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'সোশ্যাল' : 'Social'}
            </TabsTrigger>
            <TabsTrigger value="sync" className="text-xs py-2 px-2.5">
              <Database className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'সিঙ্ক স্ট্যাটাস' : 'Sync Status'}
            </TabsTrigger>
            <TabsTrigger value="form-settings" className="text-xs py-2 px-2.5">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'ফর্ম সেটিংস' : 'Form Settings'}
            </TabsTrigger>
            <TabsTrigger value="login-page" className="text-xs py-2 px-2.5">
              <LogIn className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'লগইন পেইজ' : 'Login Page'}
            </TabsTrigger>
          </TabsList>

          {/* Institution Tab */}
          <TabsContent value="institution">
            <div className="card-elevated p-5 space-y-4">
              <h3 className="font-display font-bold text-foreground">
                {language === 'bn' ? 'প্রতিষ্ঠানের তথ্য' : 'Institution Info'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'bn' ? 'বাংলা নাম' : 'Bangla Name'}</Label>
                  <Input className="bg-background mt-1" value={form.institution_name} onChange={e => updateField('institution_name', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'ইংরেজি নাম' : 'English Name'}</Label>
                  <Input className="bg-background mt-1" value={form.institution_name_en} onChange={e => updateField('institution_name_en', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'ঠিকানা' : 'Address'}</Label>
                  <Input className="bg-background mt-1" value={form.address} onChange={e => updateField('address', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label>
                  <Input className="bg-background mt-1" value={form.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label>
                  <Input className="bg-background mt-1" value={form.email} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'মাদরাসা রেজি/EIIN নম্বর' : 'Madrasa Reg/EIIN Number'}</Label>
                  <Input className="bg-background mt-1" value={form.registration_number || ''} onChange={e => updateField('registration_number', e.target.value)} placeholder="যেমন: REG-2024 / EIIN" />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'স্থাপিত সাল' : 'Established Year'}</Label>
                  <Input className="bg-background mt-1" value={form.established_year || ''} onChange={e => updateField('established_year', e.target.value)} placeholder="যেমন: ২০০৫" />
                </div>
              </div>
              <Button className="btn-primary-gradient mt-3" onClick={() => saveSection(['institution_name', 'institution_name_en', 'address', 'phone', 'email', 'registration_number', 'established_year'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'তথ্য সংরক্ষণ' : 'Save Info'}
              </Button>

              <hr className="my-4 border-border" />

              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {language === 'bn' ? 'অনুমোদনকারী / স্বাক্ষরকারী' : 'Approvers / Signatories'}
                  {signatoryLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      <Lock className="w-3 h-3" />
                      {language === 'bn' ? 'সুপার অ্যাডমিন কেবল' : 'Super Admin only'}
                    </span>
                  )}
                </h4>
                {isSuperAdmin && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sig-lock" className="text-xs text-muted-foreground">
                      {language === 'bn' ? 'সম্পাদনা সীমাবদ্ধ করুন (শুধু সুপার অ্যাডমিন)' : 'Restrict editing (Super Admin only)'}
                    </Label>
                    <Switch
                      id="sig-lock"
                      checked={signatoryLocked}
                      onCheckedChange={toggleSignatoryLock}
                      disabled={saving}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {language === 'bn'
                  ? 'এই নামগুলো বেতন শীট, স্লিপ, সার্টিফিকেট, রসিদ ও ইমেইলের স্বাক্ষর অংশে স্বয়ংক্রিয়ভাবে দেখাবে। সংরক্ষণের পর পরবর্তী জেনারেট করা ডকুমেন্টে নতুন নাম দেখাবে।'
                  : 'These names appear automatically on salary sheets, slips, certificates, receipts and email signatures. New names take effect on the next generated document.'}
              </p>
              {!canEditSignatories && (
                <div className="text-xs rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 mb-3 flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  {language === 'bn'
                    ? 'এই অংশটি লক করা — শুধু সুপার অ্যাডমিন সম্পাদনা করতে পারবেন।'
                    : 'This section is locked — only a Super Admin can edit it.'}
                </div>
              )}
              <fieldset disabled={!canEditSignatories} className={!canEditSignatories ? 'opacity-60' : ''}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'প্রিন্সিপাল (বাংলা)' : 'Principal (Bangla)'}</Label>
                    <Input className="bg-background mt-1" value={form.principal_name} onChange={e => updateField('principal_name', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'প্রিন্সিপাল (ইংরেজি)' : 'Principal (English)'}</Label>
                    <Input className="bg-background mt-1" value={form.principal_name_en} onChange={e => updateField('principal_name_en', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'হিসাবরক্ষক (Accountant)' : 'Accountant'}</Label>
                    <Input className="bg-background mt-1" value={(form as any).accountant_name || ''} onChange={e => updateField('accountant_name' as any, e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'যাচাইকারী (Verifier)' : 'Verifier'}</Label>
                    <Input className="bg-background mt-1" value={(form as any).verifier_name || ''} onChange={e => updateField('verifier_name' as any, e.target.value)} />
                  </div>
                </div>
                <Button className="btn-primary-gradient mt-3" onClick={saveSignatories} disabled={saving || !canEditSignatories}>
                  <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ ও প্রিভিউ রিফ্রেশ' : 'Save & Refresh Preview'}
                </Button>
              </fieldset>

              <hr className="my-4 border-border" />

              <h4 className="text-sm font-semibold text-foreground mb-3">{language === 'bn' ? 'লোগো ও ব্র্যান্ডিং' : 'Logo & Branding'}</h4>
              <div className="grid grid-cols-3 gap-4">
                {/* Main Logo */}
                <div className="flex flex-col items-center">
                  <Label className="mb-1 text-center">{language === 'bn' ? 'মূল লোগো' : 'Main Logo'}</Label>
                  <ImageUpload
                    value={form.logo_url}
                    onChange={(url) => updateField('logo_url', url)}
                    folder="logo"
                    aspectRatio="aspect-square w-24"
                    enableCrop
                    cropShape={form.logo_shape === 'circle' ? 'circle' : 'square'}
                    cropOutputSize={512}
                  />
                  <div className="flex gap-1 mt-2">
                    {(['square', 'rounded', 'circle'] as const).map(s => (
                      <button key={s} type="button" onClick={() => updateField('logo_shape', s)}
                        className={`p-1 border rounded ${form.logo_shape === s ? 'border-primary bg-primary/10' : 'border-border'}`}>
                        <div className={`w-6 h-6 bg-muted border border-border ${s === 'circle' ? 'rounded-full' : s === 'rounded' ? 'rounded-lg' : 'rounded-none'}`} />
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => saveSection(['logo_url', 'logo_shape'])} disabled={saving}>
                    <Save className="w-3 h-3 mr-1" /> {language === 'bn' ? 'সেভ' : 'Save'}
                  </Button>
                </div>
                {/* Favicon */}
                <div className="flex flex-col items-center">
                  <Label className="mb-1 text-center">{language === 'bn' ? 'ফেভিকন' : 'Favicon'}</Label>
                  <p className="text-[10px] text-muted-foreground text-center mb-1">{language === 'bn' ? 'ব্রাউজার ট্যাব' : 'Browser Tab'}</p>
                  <ImageUpload
                    value={form.favicon_url}
                    onChange={(url) => updateField('favicon_url', url)}
                    folder="logo"
                    aspectRatio="aspect-square w-20"
                    enableCrop
                    cropShape={form.favicon_shape === 'circle' ? 'circle' : 'square'}
                    cropOutputSize={256}
                  />
                  <div className="flex gap-1 mt-2">
                    {(['square', 'rounded', 'circle'] as const).map(s => (
                      <button key={s} type="button" onClick={() => updateField('favicon_shape', s)}
                        className={`p-1 border rounded ${form.favicon_shape === s ? 'border-primary bg-primary/10' : 'border-border'}`}>
                        <div className={`w-6 h-6 bg-muted border border-border ${s === 'circle' ? 'rounded-full' : s === 'rounded' ? 'rounded-lg' : 'rounded-none'}`} />
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => saveSection(['favicon_url', 'favicon_shape'])} disabled={saving}>
                    <Save className="w-3 h-3 mr-1" /> {language === 'bn' ? 'সেভ' : 'Save'}
                  </Button>
                </div>
                {/* Loader Logo */}
                <div className="flex flex-col items-center">
                  <Label className="mb-1 text-center">{language === 'bn' ? 'লোডার লোগো' : 'Loader Logo'}</Label>
                  <p className="text-[10px] text-muted-foreground text-center mb-1">{language === 'bn' ? 'পেজ লোডিং' : 'Page Loading'}</p>
                  <ImageUpload
                    value={form.loader_logo_url || ''}
                    onChange={(url) => updateField('loader_logo_url', url)}
                    folder="logo"
                    aspectRatio="aspect-square w-20"
                    enableCrop
                    cropShape={form.loader_logo_shape === 'circle' ? 'circle' : 'square'}
                    cropOutputSize={512}
                  />
                  <div className="flex gap-1 mt-2">
                    {(['square', 'rounded', 'circle'] as const).map(s => (
                      <button key={s} type="button" onClick={() => updateField('loader_logo_shape', s)}
                        className={`p-1 border rounded ${form.loader_logo_shape === s ? 'border-primary bg-primary/10' : 'border-border'}`}>
                        <div className={`w-6 h-6 bg-muted border border-border ${s === 'circle' ? 'rounded-full' : s === 'rounded' ? 'rounded-lg' : 'rounded-none'}`} />
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => saveSection(['loader_logo_url', 'loader_logo_shape'])} disabled={saving}>
                    <Save className="w-3 h-3 mr-1" /> {language === 'bn' ? 'সেভ' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Header Tab */}
          <TabsContent value="header">
            <div className="space-y-6">
              {/* Topbar */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'টপবার সেটিংস' : 'Topbar Settings'}
                </h3>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">{language === 'bn' ? 'টপবার দেখান' : 'Show Topbar'}</span>
                  <Switch checked={form.header_style.topbar_visible} onCheckedChange={v => updateHeaderStyle('topbar_visible', v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {colorInput(language === 'bn' ? 'টপবার ব্যাকগ্রাউন্ড' : 'Topbar Background', form.header_style.topbar_bg_color, v => updateHeaderStyle('topbar_bg_color', v))}
                  {colorInput(language === 'bn' ? 'টপবার টেক্সট রঙ' : 'Topbar Text Color', form.header_style.topbar_text_color, v => updateHeaderStyle('topbar_text_color', v))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'ঘোষণা (বাংলা)' : 'Announcement (Bangla)'}</Label>
                    <Input className="bg-background mt-1" value={form.header_style.topbar_announcement_bn} onChange={e => updateHeaderStyle('topbar_announcement_bn', e.target.value)} placeholder={language === 'bn' ? 'মার্কি টেক্সট...' : 'Marquee text...'} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ঘোষণা (ইংরেজি)' : 'Announcement (English)'}</Label>
                    <Input className="bg-background mt-1" value={form.header_style.topbar_announcement_en} onChange={e => updateHeaderStyle('topbar_announcement_en', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'হেডার স্টাইল' : 'Header Style'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {colorInput(language === 'bn' ? 'হেডার ব্যাকগ্রাউন্ড' : 'Header Background', form.header_style.header_bg_color, v => updateHeaderStyle('header_bg_color', v))}
                  {colorInput(language === 'bn' ? 'হেডার টেক্সট রঙ' : 'Header Text Color', form.header_style.header_text_color, v => updateHeaderStyle('header_text_color', v))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'বর্ডার' : 'Border'}</span>
                    <Switch checked={form.header_style.header_border} onCheckedChange={v => updateHeaderStyle('header_border', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'শ্যাডো' : 'Shadow'}</span>
                    <Switch checked={form.header_style.header_shadow} onCheckedChange={v => updateHeaderStyle('header_shadow', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'স্টিকি' : 'Sticky'}</span>
                    <Switch checked={form.header_style.header_sticky} onCheckedChange={v => updateHeaderStyle('header_sticky', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">{language === 'bn' ? 'লোগো সাইজ' : 'Logo Size'}</Label>
                    <Select value={form.header_style.logo_size} onValueChange={v => updateHeaderStyle('logo_size', v)}>
                      <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">{language === 'bn' ? 'ছোট' : 'Small'}</SelectItem>
                        <SelectItem value="medium">{language === 'bn' ? 'মাঝারি' : 'Medium'}</SelectItem>
                        <SelectItem value="large">{language === 'bn' ? 'বড়' : 'Large'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'বাংলা নাম দেখান' : 'Show Bangla Name'}</span>
                    <Switch checked={form.header_style.show_institution_name} onCheckedChange={v => updateHeaderStyle('show_institution_name', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'ইংরেজি নাম দেখান' : 'Show English Name'}</span>
                    <Switch checked={form.header_style.show_institution_name_en} onCheckedChange={v => updateHeaderStyle('show_institution_name_en', v)} />
                  </div>
                </div>
              </div>

              <Button className="btn-primary-gradient" onClick={() => saveSection(['header_style'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'হেডার সংরক্ষণ' : 'Save Header'}
              </Button>
            </div>
          </TabsContent>

          {/* Navigation Tab */}
          <TabsContent value="navigation">
            <div className="space-y-6">
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'নেভিগেশন স্টাইল' : 'Navigation Style'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {colorInput(language === 'bn' ? 'নেভ ব্যাকগ্রাউন্ড' : 'Nav Background', form.nav_style.nav_bg_color, v => updateNavStyle('nav_bg_color', v))}
                  {colorInput(language === 'bn' ? 'নেভ টেক্সট রঙ' : 'Nav Text Color', form.nav_style.nav_text_color, v => updateNavStyle('nav_text_color', v))}
                  {colorInput(language === 'bn' ? 'অ্যাক্টিভ ব্যাকগ্রাউন্ড' : 'Active Background', form.nav_style.nav_active_bg, v => updateNavStyle('nav_active_bg', v))}
                  {colorInput(language === 'bn' ? 'অ্যাক্টিভ টেক্সট রঙ' : 'Active Text Color', form.nav_style.nav_active_text, v => updateNavStyle('nav_active_text', v))}
                  {colorInput(language === 'bn' ? 'হোভার ব্যাকগ্রাউন্ড' : 'Hover Background', form.nav_style.nav_hover_bg, v => updateNavStyle('nav_hover_bg', v))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'নেভ স্টাইল' : 'Nav Style'}</Label>
                    <Select value={form.nav_style.nav_style} onValueChange={v => updateNavStyle('nav_style', v)}>
                      <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pills">{language === 'bn' ? 'পিলস (গোলাকার)' : 'Pills (Rounded)'}</SelectItem>
                        <SelectItem value="underline">{language === 'bn' ? 'আন্ডারলাইন' : 'Underline'}</SelectItem>
                        <SelectItem value="flat">{language === 'bn' ? 'ফ্ল্যাট' : 'Flat'}</SelectItem>
                        <SelectItem value="rounded">{language === 'bn' ? 'রাউন্ডেড' : 'Rounded'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ফন্ট সাইজ' : 'Font Size'}</Label>
                    <Select value={form.nav_style.nav_font_size} onValueChange={v => updateNavStyle('nav_font_size', v)}>
                      <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">{language === 'bn' ? 'ছোট' : 'Small'}</SelectItem>
                        <SelectItem value="medium">{language === 'bn' ? 'মাঝারি' : 'Medium'}</SelectItem>
                        <SelectItem value="large">{language === 'bn' ? 'বড়' : 'Large'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-foreground">
                    {language === 'bn' ? 'পাবলিক নেভিগেশন মেনু' : 'Public Navigation Menu'}
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setPublicMenu(prev => [...prev, {
                    id: `custom-${Date.now()}`,
                    path: '/',
                    label_bn: 'নতুন মেনু',
                    label_en: 'New Menu',
                    icon: '',
                    visible: true,
                    sort_order: prev.length,
                  }])}>
                    <Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন মেনু যোগ' : 'Add Menu Item'}
                  </Button>
                </div>

                {/* Live Menu Preview */}
                <div className="p-3 rounded-lg border bg-secondary/30">
                  <Label className="text-xs text-muted-foreground mb-2 block">{language === 'bn' ? 'লাইভ মেনু প্রিভিউ' : 'Live Menu Preview'}</Label>
                  <div className="flex flex-wrap gap-2">
                    {publicMenu.filter(m => m.visible).map(item => (
                      <span key={item.id} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                        {language === 'bn' ? item.label_bn : item.label_en}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {publicMenu.map((item, index) => (
                    <div key={item.id} className={`p-4 rounded-lg border bg-card space-y-3 ${!item.visible ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Menu className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <div>
                            <div className="text-sm font-semibold text-foreground">{language === 'bn' ? item.label_bn || `মেনু ${index + 1}` : item.label_en || `Menu ${index + 1}`}</div>
                            <div className="text-xs text-muted-foreground">{item.path}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPublicMenu(prev => prev.map((m, i) => i === index ? { ...m, visible: !m.visible } : m))}>
                            {item.visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === 0} onClick={() => setPublicMenu(prev => {
                            const arr = [...prev];
                            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                            return arr.map((m, i) => ({ ...m, sort_order: i }));
                          })}>
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === publicMenu.length - 1} onClick={() => setPublicMenu(prev => {
                            const arr = [...prev];
                            [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
                            return arr.map((m, i) => ({ ...m, sort_order: i }));
                          })}>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setPublicMenu(prev => prev.filter((_, i) => i !== index))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">{language === 'bn' ? 'নাম (বাংলা)' : 'Label (BN)'}</Label>
                          <Input className="bg-background mt-1 h-9" value={item.label_bn} onChange={e => setPublicMenu(prev => prev.map((m, i) => i === index ? { ...m, label_bn: e.target.value } : m))} />
                        </div>
                        <div>
                          <Label className="text-xs">{language === 'bn' ? 'নাম (ইংরেজি)' : 'Label (EN)'}</Label>
                          <Input className="bg-background mt-1 h-9" value={item.label_en} onChange={e => setPublicMenu(prev => prev.map((m, i) => i === index ? { ...m, label_en: e.target.value } : m))} />
                        </div>
                        <div>
                          <Label className="text-xs">{language === 'bn' ? 'পেইজ লিংক পিকার' : 'Link Picker'}</Label>
                          <Select value={AVAILABLE_PAGES.find(p => p.path === item.path) ? item.path : 'custom'} onValueChange={v => {
                            if (v === 'custom') return;
                            const page = AVAILABLE_PAGES.find(p => p.path === v);
                            setPublicMenu(prev => prev.map((m, i) => i === index ? {
                              ...m,
                              path: v,
                              label_bn: m.label_bn || page?.label_bn || '',
                              label_en: m.label_en || page?.label_en || '',
                            } : m));
                          }}>
                            <SelectTrigger className="mt-1 bg-background h-9"><SelectValue placeholder={language === 'bn' ? 'পেইজ নির্বাচন' : 'Select page'} /></SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_PAGES.map(page => (
                                <SelectItem key={page.path} value={page.path}>
                                  {language === 'bn' ? page.label_bn : page.label_en} ({page.path})
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">{language === 'bn' ? 'কাস্টম লিংক' : 'Custom Link'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{language === 'bn' ? 'কাস্টম পাথ' : 'Custom Path'}</Label>
                          <Input className="bg-background mt-1 h-9" value={item.path} onChange={e => setPublicMenu(prev => prev.map((m, i) => i === index ? { ...m, path: e.target.value } : m))} placeholder="/custom-page" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="btn-primary-gradient" onClick={saveNavigation} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নেভিগেশন সংরক্ষণ' : 'Save Navigation'}
              </Button>
            </div>
          </TabsContent>

          {/* Hero/Banner Tab */}
          <TabsContent value="hero">
            <div className="card-elevated p-5 space-y-4">
              <h3 className="font-display font-bold text-foreground">
                {language === 'bn' ? 'হিরো/ব্যানার সেকশন' : 'Hero/Banner Section'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'bn' ? 'শিরোনাম (বাংলা)' : 'Title (Bangla)'}</Label>
                  <Input className="bg-background mt-1" value={form.hero_title_bn} onChange={e => updateField('hero_title_bn', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'শিরোনাম (ইংরেজি)' : 'Title (English)'}</Label>
                  <Input className="bg-background mt-1" value={form.hero_title_en} onChange={e => updateField('hero_title_en', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{language === 'bn' ? 'সাবটাইটেল (বাংলা)' : 'Subtitle (Bangla)'}</Label>
                  <Textarea className="bg-background mt-1" value={form.hero_subtitle_bn} onChange={e => updateField('hero_subtitle_bn', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{language === 'bn' ? 'সাবটাইটেল (ইংরেজি)' : 'Subtitle (English)'}</Label>
                  <Textarea className="bg-background mt-1" value={form.hero_subtitle_en} onChange={e => updateField('hero_subtitle_en', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{language === 'bn' ? 'হিরো ব্যাকগ্রাউন্ড ছবি' : 'Hero Background Image'}</Label>
                  <ImageUpload
                    value={form.hero_bg_image_url}
                    onChange={(url) => updateField('hero_bg_image_url', url)}
                    folder="hero"
                    className="mt-1"
                    aspectRatio="aspect-[21/9]"
                  />
                </div>
              </div>
              <h3 className="font-display font-bold text-foreground pt-4">
                {language === 'bn' ? 'পরিসংখ্যান' : 'Statistics'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>{language === 'bn' ? 'মোট ছাত্র' : 'Total Students'}</Label>
                  <Input className="bg-background mt-1" value={form.stat_students} onChange={e => updateField('stat_students', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'শিক্ষক' : 'Teachers'}</Label>
                  <Input className="bg-background mt-1" value={form.stat_teachers} onChange={e => updateField('stat_teachers', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'বছরের অভিজ্ঞতা' : 'Years Experience'}</Label>
                  <Input className="bg-background mt-1" value={form.stat_years} onChange={e => updateField('stat_years', e.target.value)} />
                </div>
              </div>
              <Button className="btn-primary-gradient" onClick={() => saveSection(['hero_title_bn', 'hero_title_en', 'hero_subtitle_bn', 'hero_subtitle_en', 'hero_bg_image_url', 'stat_students', 'stat_teachers', 'stat_years'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              {/* Principal */}
              <div className="card-elevated p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-display font-bold text-foreground">
                    {language === 'bn' ? 'অধ্যক্ষের বাণী' : "Principal's Message"}
                  </h3>
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
                      ? 'নাম, পদবি ও ছবি প্রশাসনিক কর্মকর্তার প্রোফাইল থেকে নেওয়া হচ্ছে। পরিবর্তন করতে /admin/administrative -এ গিয়ে এডিট করুন। শুধু বাণী এডিট করা যাবে।'
                      : 'Name, designation & photo are pulled from the Administrative Officer profile. Edit at /admin/administrative. Only the message text is editable here.'}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'নাম (বাংলা)' : 'Name (Bangla)'}</Label>
                    <Input disabled={principalLinked} className="bg-background mt-1" value={principalLinked ? (linkedPrincipal?.principal_name || '') : form.principal_name} onChange={e => updateField('principal_name', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
                    <Input disabled={principalLinked} className="bg-background mt-1" value={principalLinked ? (linkedPrincipal?.principal_name_en || '') : (form.principal_name_en || '')} onChange={e => updateField('principal_name_en', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'পদবী (বাংলা)' : 'Title (Bangla)'}</Label>
                    <Input disabled={principalLinked} className="bg-background mt-1" value={principalLinked ? (linkedPrincipal?.principal_title_bn || '') : form.principal_title_bn} onChange={e => updateField('principal_title_bn', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'পদবী (ইংরেজি)' : 'Title (English)'}</Label>
                    <Input disabled={principalLinked} className="bg-background mt-1" value={principalLinked ? (linkedPrincipal?.principal_title_en || '') : form.principal_title_en} onChange={e => updateField('principal_title_en', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'অধ্যক্ষের ছবি' : "Principal's Photo"}</Label>
                    {principalLinked ? (
                      <div className="mt-1 flex items-center gap-2">
                        {linkedPrincipal?.principal_photo_url
                          ? <img src={linkedPrincipal.principal_photo_url} alt="Principal" className="w-16 h-16 rounded-full object-cover border" />
                          : <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl text-muted-foreground/40">👤</div>}
                        <span className="text-[11px] text-muted-foreground">{language === 'bn' ? 'অফিসার প্রোফাইল থেকে' : 'From officer profile'}</span>
                      </div>
                    ) : (
                      <ImageUpload
                        value={form.principal_photo_url}
                        onChange={(url) => updateField('principal_photo_url', url)}
                        folder="principal"
                        className="mt-1"
                        aspectRatio="aspect-square w-32"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <Label>{language === 'bn' ? 'বাণী (বাংলা)' : 'Message (Bangla)'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[100px]" value={form.principal_message_bn} onChange={e => updateField('principal_message_bn', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'বাণী (ইংরেজি)' : 'Message (English)'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[100px]" value={form.principal_message_en} onChange={e => updateField('principal_message_en', e.target.value)} />
                </div>
                <Button className="btn-primary-gradient" onClick={() => saveSection(['principal_name', 'principal_name_en', 'principal_title_bn', 'principal_title_en', 'principal_message_bn', 'principal_message_en', 'principal_photo_url'])} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
                </Button>
              </div>

              {/* Admin Card */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'এডমিনের বাণী' : "Admin's Message"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
                    <Input className="bg-background mt-1" value={form.admin_name} onChange={e => updateField('admin_name', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'পদবী (বাংলা)' : 'Title (Bangla)'}</Label>
                    <Input className="bg-background mt-1" value={form.admin_title_bn} onChange={e => updateField('admin_title_bn', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'পদবী (ইংরেজি)' : 'Title (English)'}</Label>
                    <Input className="bg-background mt-1" value={form.admin_title_en} onChange={e => updateField('admin_title_en', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label>
                    <Input className="bg-background mt-1" value={form.admin_email} onChange={e => updateField('admin_email', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label>
                    <Input className="bg-background mt-1" value={form.admin_phone} onChange={e => updateField('admin_phone', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ছবি' : 'Photo'}</Label>
                    <ImageUpload
                      value={form.admin_photo_url}
                      onChange={(url) => updateField('admin_photo_url', url)}
                      folder="admin"
                      className="mt-1"
                      aspectRatio="aspect-square w-32"
                    />
                  </div>
                </div>
                <div>
                  <Label>{language === 'bn' ? 'বাণী (বাংলা)' : 'Message (Bangla)'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[100px]" value={form.admin_message_bn} onChange={e => updateField('admin_message_bn', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'বাণী (ইংরেজি)' : 'Message (English)'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[100px]" value={form.admin_message_en} onChange={e => updateField('admin_message_en', e.target.value)} />
                </div>
                <Button className="btn-primary-gradient" onClick={() => saveSection(['admin_name', 'admin_title_bn', 'admin_title_en', 'admin_message_bn', 'admin_message_en', 'admin_photo_url', 'admin_email', 'admin_phone'])} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
                </Button>
              </div>

              {/* About */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}
                </h3>
                <div>
                  <Label>{language === 'bn' ? 'বিবরণ (বাংলা)' : 'Description (Bangla)'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[120px]" value={form.about_content_bn} onChange={e => updateField('about_content_bn', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'বিবরণ (ইংরেজি)' : 'Description (English)'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[120px]" value={form.about_content_en} onChange={e => updateField('about_content_en', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'মিশন (বাংলা)' : 'Mission (Bangla)'}</Label>
                    <Textarea className="bg-background mt-1 min-h-[80px]" value={form.about_mission_bn} onChange={e => updateField('about_mission_bn', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'মিশন (ইংরেজি)' : 'Mission (English)'}</Label>
                    <Textarea className="bg-background mt-1 min-h-[80px]" value={form.about_mission_en} onChange={e => updateField('about_mission_en', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ভিশন (বাংলা)' : 'Vision (Bangla)'}</Label>
                    <Textarea className="bg-background mt-1 min-h-[80px]" value={form.about_vision_bn} onChange={e => updateField('about_vision_bn', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ভিশন (ইংরেজি)' : 'Vision (English)'}</Label>
                    <Textarea className="bg-background mt-1 min-h-[80px]" value={form.about_vision_en} onChange={e => updateField('about_vision_en', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{language === 'bn' ? 'সম্পর্কে পেইজের ছবি' : 'About Page Image'}</Label>
                  <ImageUpload
                    value={form.about_image_url}
                    onChange={(url) => updateField('about_image_url', url)}
                    folder="about"
                    className="mt-1"
                    aspectRatio="aspect-video"
                  />
                </div>
                <Button className="btn-primary-gradient" onClick={() => saveSection(['about_content_bn', 'about_content_en', 'about_mission_bn', 'about_mission_en', 'about_vision_bn', 'about_vision_en', 'about_image_url'])} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'গ্যালারি ম্যানেজমেন্ট' : 'Gallery Management'}
                </h3>
                <Button variant="outline" size="sm" onClick={addGalleryItem}>
                  <Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন ছবি' : 'Add Image'}
                </Button>
              </div>
              <div className="space-y-4">
                {(form.gallery_items || []).map((item, i) => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">#{i + 1}</span>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeGalleryItem(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>{language === 'bn' ? 'শিরোনাম (বাংলা)' : 'Title (Bangla)'}</Label>
                        <Input className="bg-background mt-1" value={item.title_bn} onChange={e => updateGalleryItem(i, 'title_bn', e.target.value)} />
                      </div>
                      <div>
                        <Label>{language === 'bn' ? 'শিরোনাম (ইংরেজি)' : 'Title (English)'}</Label>
                        <Input className="bg-background mt-1" value={item.title_en} onChange={e => updateGalleryItem(i, 'title_en', e.target.value)} />
                      </div>
                      <div>
                        <Label>{language === 'bn' ? 'ছবি' : 'Image'}</Label>
                        <ImageUpload
                          value={item.image_url}
                          onChange={(url) => updateGalleryItem(i, 'image_url', url)}
                          folder="gallery"
                          className="mt-1"
                          aspectRatio="aspect-video"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="btn-primary-gradient" onClick={() => saveSection(['gallery_items'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          </TabsContent>

          {/* Footer Tab */}
          <TabsContent value="footer">
            <div className="space-y-6">
              {/* Footer Style */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'ফুটার স্টাইল' : 'Footer Style'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {colorInput(language === 'bn' ? 'ফুটার ব্যাকগ্রাউন্ড' : 'Footer Background', form.footer_style.footer_bg_color, v => updateFooterStyle('footer_bg_color', v))}
                  {colorInput(language === 'bn' ? 'ফুটার টেক্সট রঙ' : 'Footer Text Color', form.footer_style.footer_text_color, v => updateFooterStyle('footer_text_color', v))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'কুইক লিংক' : 'Quick Links'}</span>
                    <Switch checked={form.footer_style.show_quick_links} onCheckedChange={v => updateFooterStyle('show_quick_links', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'যোগাযোগ তথ্য' : 'Contact Info'}</span>
                    <Switch checked={form.footer_style.show_contact_info} onCheckedChange={v => updateFooterStyle('show_contact_info', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium">{language === 'bn' ? 'সোশ্যাল লিংক' : 'Social Links'}</span>
                    <Switch checked={form.footer_style.show_social_links} onCheckedChange={v => updateFooterStyle('show_social_links', v)} />
                  </div>
                </div>
                <div>
                  <Label>{language === 'bn' ? 'ফুটার কলাম সংখ্যা' : 'Footer Columns'}</Label>
                  <Select value={String(form.footer_style.footer_columns)} onValueChange={v => updateFooterStyle('footer_columns', Number(v))}>
                    <SelectTrigger className="mt-1 bg-background w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Footer Description */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'ফুটার বিবরণ' : 'Footer Description'}
                </h3>
                <div>
                  <Label>{language === 'bn' ? 'বাংলা' : 'Bangla'}</Label>
                  <Textarea className="bg-background mt-1" value={form.footer_description_bn} onChange={e => updateField('footer_description_bn', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'ইংরেজি' : 'English'}</Label>
                  <Textarea className="bg-background mt-1" value={form.footer_description_en} onChange={e => updateField('footer_description_en', e.target.value)} />
                </div>
              </div>

              {/* Copyright */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'কপিরাইট টেক্সট' : 'Copyright Text'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? '{year} = বর্তমান সাল, {name} = প্রতিষ্ঠানের নাম' : '{year} = current year, {name} = institution name'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'বাংলা' : 'Bangla'}</Label>
                    <Input className="bg-background mt-1" value={form.footer_style.copyright_text_bn} onChange={e => updateFooterStyle('copyright_text_bn', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ইংরেজি' : 'English'}</Label>
                    <Input className="bg-background mt-1" value={form.footer_style.copyright_text_en} onChange={e => updateFooterStyle('copyright_text_en', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Footer Quick Links */}
              <div className="card-elevated p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-foreground">
                    {language === 'bn' ? 'কুইক লিংকসমূহ' : 'Quick Links'}
                  </h3>
                  <Button variant="outline" size="sm" onClick={addFooterLink}>
                    <Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন' : 'Add'}
                  </Button>
                </div>
                <div className="space-y-3">
                  {(form.footer_links || []).map((link, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/50 flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input className="bg-background" value={link.label_bn} onChange={e => updateFooterLink(i, 'label_bn', e.target.value)} placeholder={language === 'bn' ? 'বাংলা লেবেল' : 'Bangla Label'} />
                        <Input className="bg-background" value={link.label_en} onChange={e => updateFooterLink(i, 'label_en', e.target.value)} placeholder={language === 'bn' ? 'ইংরেজি লেবেল' : 'English Label'} />
                        <Input className="bg-background" value={link.url} onChange={e => updateFooterLink(i, 'url', e.target.value)} placeholder="/path" />
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeFooterLink(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map */}
              <div className="card-elevated p-5 space-y-4">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'গুগল ম্যাপ' : 'Google Map'}
                </h3>
                <div>
                  <Label>{language === 'bn' ? 'গুগল ম্যাপ এম্বেড কোড' : 'Google Map Embed Code'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[80px]" value={form.contact_map_embed} onChange={e => updateField('contact_map_embed', e.target.value)} placeholder='<iframe src="https://www.google.com/maps/embed?..." ...' />
                </div>
              </div>

              <Button className="btn-primary-gradient" onClick={() => saveSection(['footer_style', 'footer_links', 'footer_description_bn', 'footer_description_en', 'contact_map_embed'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'ফুটার সংরক্ষণ' : 'Save Footer'}
              </Button>
            </div>
          </TabsContent>

          {/* Sections / Page Builder Tab */}
          <TabsContent value="sections">
            <WebsitePageBuilder
              form={form}
              setForm={setForm}
              language={language}
              saving={saving}
              onSave={saveSection}
            />
          </TabsContent>

          {/* Divisions Tab */}
          <TabsContent value="divisions">
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'ভর্তি বিভাগসমূহ' : 'Admission Divisions'}
                </h3>
                <Button variant="outline" size="sm" onClick={addDivision}>
                  <Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন' : 'Add'}
                </Button>
              </div>
              <div className="space-y-4">
                {form.divisions.map((div, i) => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">#{i + 1}</span>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeDivision(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>{language === 'bn' ? 'আইকন' : 'Icon'}</Label>
                        <Input className="bg-background mt-1" value={div.icon} onChange={e => updateDivision(i, 'icon', e.target.value)} />
                      </div>
                      <div>
                        <Label>{language === 'bn' ? 'বাংলা নাম' : 'Bangla Name'}</Label>
                        <Input className="bg-background mt-1" value={div.name} onChange={e => updateDivision(i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <Label>{language === 'bn' ? 'ইংরেজি নাম' : 'English Name'}</Label>
                        <Input className="bg-background mt-1" value={div.nameEn} onChange={e => updateDivision(i, 'nameEn', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="btn-primary-gradient" onClick={() => saveSection(['divisions'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          </TabsContent>

          {/* Info Links Tab */}
          <TabsContent value="info-links">
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'মাদ্রাসা সম্পর্কিত তথ্য লিংক' : 'Institution Info Links'}
                </h3>
                <Button variant="outline" size="sm" onClick={addInfoLink}>
                  <Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন লিংক' : 'Add Link'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'bn'
                  ? 'হোমপেজের "মাদ্রাসা সম্পর্কিত তথ্য" সেকশনে প্রদর্শিত লিংকগুলো এখানে ম্যানেজ করুন।'
                  : 'Manage the links shown in the "Institution Info" section on the homepage.'}
              </p>

              {/* Live Preview */}
              <div className="p-3 rounded-lg border bg-secondary/30">
                <Label className="text-xs text-muted-foreground mb-2 block">{language === 'bn' ? 'লাইভ প্রিভিউ' : 'Live Preview'}</Label>
                <div className="bg-card rounded-lg overflow-hidden border max-w-xs">
                  <div className="bg-primary px-3 py-2 text-center">
                    <span className="text-xs font-bold text-primary-foreground">{language === 'bn' ? '✦ মাদ্রাসা সম্পর্কিত তথ্য' : '✦ Institution Info'}</span>
                  </div>
                  <div className="p-2 space-y-0.5">
                    {(form.info_links || []).filter(l => l.visible).sort((a, b) => a.sort_order - b.sort_order).map(link => (
                      <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground rounded hover:bg-primary/5">
                        <span className="text-primary text-[10px]">●</span>
                        <span>{language === 'bn' ? link.label_bn : link.label_en}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(form.info_links || []).map((link, index) => (
                  <div key={link.id} className={`p-4 rounded-lg border bg-card space-y-3 ${!link.visible ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Menu className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <span className="text-sm font-semibold text-foreground">
                          {language === 'bn' ? link.label_bn || `লিংক ${index + 1}` : link.label_en || `Link ${index + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => updateInfoLink(index, 'visible', !link.visible)}>
                          {link.visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === 0} onClick={() => moveInfoLink(index, 'up')}>
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === (form.info_links || []).length - 1} onClick={() => moveInfoLink(index, 'down')}>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeInfoLink(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">{language === 'bn' ? 'নাম (বাংলা)' : 'Label (BN)'}</Label>
                        <Input className="bg-background mt-1 h-9" value={link.label_bn} onChange={e => updateInfoLink(index, 'label_bn', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">{language === 'bn' ? 'নাম (ইংরেজি)' : 'Label (EN)'}</Label>
                        <Input className="bg-background mt-1 h-9" value={link.label_en} onChange={e => updateInfoLink(index, 'label_en', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">{language === 'bn' ? 'পেইজ লিংক' : 'Page Link'}</Label>
                        <Select value={AVAILABLE_PAGES.find(p => p.path === link.path) ? link.path : 'custom'} onValueChange={v => {
                          if (v !== 'custom') updateInfoLink(index, 'path', v);
                        }}>
                          <SelectTrigger className="mt-1 bg-background h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_PAGES.map(page => (
                              <SelectItem key={page.path} value={page.path}>
                                {language === 'bn' ? page.label_bn : page.label_en}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">{language === 'bn' ? 'কাস্টম' : 'Custom'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{language === 'bn' ? 'আইকন' : 'Icon'}</Label>
                        <Select value={link.icon} onValueChange={v => updateInfoLink(index, 'icon', v)}>
                          <SelectTrigger className="mt-1 bg-background h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INFO_LINK_ICONS.map(icon => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="btn-primary-gradient" onClick={() => saveSection(['info_links'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'তথ্য লিংক সংরক্ষণ' : 'Save Info Links'}
              </Button>
            </div>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social">
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'সোশ্যাল মিডিয়া লিংক' : 'Social Media Links'}
                </h3>
                <Button variant="outline" size="sm" onClick={addSocialLink}>
                  <Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন' : 'Add'}
                </Button>
              </div>
              <div className="space-y-4">
                {(form.social_links || []).map((link, i) => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">#{i + 1}</span>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeSocialLink(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>{language === 'bn' ? 'প্ল্যাটফর্ম' : 'Platform'}</Label>
                        <Input className="bg-background mt-1" value={link.platform} onChange={e => updateSocialLink(i, 'platform', e.target.value)} placeholder="Facebook, YouTube..." />
                      </div>
                      <div>
                        <Label>{language === 'bn' ? 'লিংক' : 'URL'}</Label>
                        <Input className="bg-background mt-1" value={link.url} onChange={e => updateSocialLink(i, 'url', e.target.value)} placeholder="https://..." />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="btn-primary-gradient" onClick={() => saveSection(['social_links'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          </TabsContent>

          {/* Sync Status Tab */}
          <TabsContent value="sync">
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  {language === 'bn' ? 'ব্যাকএন্ড-ফ্রন্টএন্ড সিঙ্ক স্ট্যাটাস' : 'Backend-Frontend Sync Status'}
                </h3>
                <Button className="btn-primary-gradient" size="sm" onClick={saveAll} disabled={saving}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${saving ? 'animate-spin' : ''}`} />
                  {language === 'bn' ? 'সব আপডেট করুন' : 'Update All'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn'
                  ? 'এখানে ব্যাকএন্ড ডাটাবেসের সাথে ফ্রন্টএন্ডের সকল কানেক্টেড সেটিংস দেখানো হচ্ছে। "আপডেট করুন" ক্লিক করলে সাথে সাথে পাবলিক সাইটে পরিবর্তন দেখা যাবে।'
                  : 'All settings connected between backend database and frontend are shown here. Click "Update" to instantly reflect changes on the public site.'}
              </p>

              <div className="space-y-2">
                {(() => {
                  const syncSections: Array<{
                    category_bn: string;
                    category_en: string;
                    icon: React.ReactNode;
                    keys: (keyof WebsiteSettings)[];
                    labels_bn: string[];
                    labels_en: string[];
                  }> = [
                    {
                      category_bn: 'প্রতিষ্ঠান তথ্য',
                      category_en: 'Institution Info',
                      icon: <Globe className="w-4 h-4" />,
                      keys: ['institution_name', 'institution_name_en', 'address', 'phone', 'email', 'logo_url', 'favicon_url', 'loader_logo_url'],
                      labels_bn: ['বাংলা নাম', 'ইংরেজি নাম', 'ঠিকানা', 'ফোন', 'ইমেইল', 'লোগো', 'ফেভিকন', 'লোডার লোগো'],
                      labels_en: ['Bangla Name', 'English Name', 'Address', 'Phone', 'Email', 'Logo', 'Favicon', 'Loader Logo'],
                    },
                    {
                      category_bn: 'হিরো ব্যানার',
                      category_en: 'Hero Banner',
                      icon: <Image className="w-4 h-4" />,
                      keys: ['hero_title_bn', 'hero_title_en', 'hero_subtitle_bn', 'hero_subtitle_en', 'hero_bg_image_url'],
                      labels_bn: ['ব্যানার টাইটেল (বাংলা)', 'ব্যানার টাইটেল (ইংরেজি)', 'সাবটাইটেল (বাংলা)', 'সাবটাইটেল (ইংরেজি)', 'ব্যাকগ্রাউন্ড ইমেজ'],
                      labels_en: ['Banner Title (BN)', 'Banner Title (EN)', 'Subtitle (BN)', 'Subtitle (EN)', 'Background Image'],
                    },
                    {
                      category_bn: 'অধ্যক্ষ ও কন্টেন্ট',
                      category_en: 'Principal & Content',
                      icon: <Type className="w-4 h-4" />,
                      keys: ['principal_name', 'principal_message_bn', 'principal_photo_url', 'about_content_bn', 'about_mission_bn', 'about_vision_bn'],
                      labels_bn: ['অধ্যক্ষের নাম', 'অধ্যক্ষের বাণী', 'অধ্যক্ষের ছবি', 'সম্পর্কে কন্টেন্ট', 'মিশন', 'ভিশন'],
                      labels_en: ['Principal Name', 'Principal Message', 'Principal Photo', 'About Content', 'Mission', 'Vision'],
                    },
                    {
                      category_bn: 'পরিসংখ্যান',
                      category_en: 'Statistics',
                      icon: <BarChart3 className="w-4 h-4" />,
                      keys: ['stat_students', 'stat_teachers', 'stat_years'],
                      labels_bn: ['মোট ছাত্র', 'মোট শিক্ষক', 'প্রতিষ্ঠার বছর'],
                      labels_en: ['Total Students', 'Total Teachers', 'Years'],
                    },
                    {
                      category_bn: 'হেডার স্টাইল',
                      category_en: 'Header Style',
                      icon: <PanelTop className="w-4 h-4" />,
                      keys: ['header_style'],
                      labels_bn: ['হেডার কনফিগারেশন'],
                      labels_en: ['Header Configuration'],
                    },
                    {
                      category_bn: 'নেভিগেশন স্টাইল',
                      category_en: 'Navigation Style',
                      icon: <Navigation className="w-4 h-4" />,
                      keys: ['nav_style'],
                      labels_bn: ['নেভিগেশন কনফিগারেশন'],
                      labels_en: ['Navigation Configuration'],
                    },
                    {
                      category_bn: 'ফুটার',
                      category_en: 'Footer',
                      icon: <PanelBottom className="w-4 h-4" />,
                      keys: ['footer_style', 'footer_links', 'footer_description_bn', 'footer_description_en'],
                      labels_bn: ['ফুটার কনফিগারেশন', 'ফুটার লিংক', 'ফুটার বর্ণনা (বাংলা)', 'ফুটার বর্ণনা (ইংরেজি)'],
                      labels_en: ['Footer Configuration', 'Footer Links', 'Footer Description (BN)', 'Footer Description (EN)'],
                    },
                    {
                      category_bn: 'গ্যালারি ও সোশ্যাল',
                      category_en: 'Gallery & Social',
                      icon: <ImageIcon className="w-4 h-4" />,
                      keys: ['gallery_items', 'social_links'],
                      labels_bn: ['গ্যালারি আইটেম', 'সোশ্যাল লিংক'],
                      labels_en: ['Gallery Items', 'Social Links'],
                    },
                    {
                      category_bn: 'সেকশন ও বিভাগ',
                      category_en: 'Sections & Divisions',
                      icon: <Layout className="w-4 h-4" />,
                      keys: ['sections', 'divisions', 'contact_map_embed'],
                      labels_bn: ['সেকশন টগল', 'বিভাগ তালিকা', 'ম্যাপ এমবেড'],
                      labels_en: ['Section Toggles', 'Division List', 'Map Embed'],
                    },
                  ];

                  return syncSections.map((section, sIdx) => (
                    <div key={sIdx} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-secondary/30">
                        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                          {section.icon}
                          {language === 'bn' ? section.category_bn : section.category_en}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const updates = section.keys.map(key => ({ key, value: form[key] as Json }));
                              await updateMultiple.mutateAsync(updates);
                              toast.success(language === 'bn' ? `${section.category_bn} আপডেট হয়েছে!` : `${section.category_en} updated!`);
                            } catch {
                              toast.error(language === 'bn' ? 'আপডেট ব্যর্থ' : 'Update failed');
                            }
                            setSaving(false);
                          }}
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${saving ? 'animate-spin' : ''}`} />
                          {language === 'bn' ? 'আপডেট করুন' : 'Update'}
                        </Button>
                      </div>
                      <div className="divide-y">
                        {section.keys.map((key, kIdx) => {
                          const val = form[key];
                          const hasValue = val !== undefined && val !== null && val !== '' && 
                            !(typeof val === 'object' && Object.keys(val).length === 0);
                          const displayValue = (() => {
                            if (typeof val === 'string') {
                              if (val.startsWith('http')) return language === 'bn' ? '🔗 লিংক সেট আছে' : '🔗 Link set';
                              return val.length > 60 ? val.substring(0, 60) + '...' : val;
                            }
                            if (Array.isArray(val)) return `${val.length} ${language === 'bn' ? 'টি আইটেম' : 'items'}`;
                            if (typeof val === 'object') return language === 'bn' ? '✅ কনফিগ সেট আছে' : '✅ Config set';
                            return String(val);
                          })();

                          return (
                            <div key={kIdx} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-2">
                                {hasValue ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                )}
                                <span className="font-medium text-foreground">
                                  {language === 'bn' ? section.labels_bn[kIdx] : section.labels_en[kIdx]}
                                </span>
                              </div>
                              <span className={`text-xs max-w-[200px] truncate ${hasValue ? 'text-muted-foreground' : 'text-amber-500'}`}>
                                {hasValue ? displayValue : (language === 'bn' ? 'সেট করা হয়নি' : 'Not set')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </TabsContent>

          {/* Form Settings Tab */}
          <TabsContent value="form-settings">
            <FormSettingsTab language={language} />
          </TabsContent>

          {/* Login Page Tab */}
          <TabsContent value="login-page">
            <div className="card-elevated p-5 space-y-5">
              <h3 className="font-display font-bold text-foreground">
                {language === 'bn' ? 'লগইন পেইজ কাস্টমাইজেশন' : 'Login Page Customization'}
              </h3>

              {/* Background */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">{language === 'bn' ? 'ব্যাকগ্রাউন্ড' : 'Background'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'ব্যাকগ্রাউন্ড ইমেজ' : 'Background Image'}</Label>
                    <ImageUpload
                      value={form.login_bg_image_url}
                      onChange={(url) => updateField('login_bg_image_url', url)}
                      folder="login"
                      className="mt-1"
                      aspectRatio="aspect-video w-full max-w-xs"
                    />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ব্যাকগ্রাউন্ড কালার (ইমেজ না থাকলে)' : 'Background Color (if no image)'}</Label>
                    <Input className="bg-background mt-1" type="color" value={form.login_bg_color || '#1a5e3a'} onChange={e => updateField('login_bg_color', e.target.value)} />
                  </div>
                </div>
                {form.login_bg_image_url && (
                  <div>
                    <Label>{language === 'bn' ? 'ব্যাকগ্রাউন্ড ব্লার (px)' : 'Background Blur (px)'}</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Input className="bg-background w-24" type="number" min={0} max={30} value={form.login_bg_blur ?? ''} onChange={e => updateField('login_bg_blur', Number(e.target.value))} />
                      <span className="text-xs text-muted-foreground">{form.login_bg_blur ?? 0}px</span>
                    </div>
                  </div>
                )}
                <Button size="sm" className="btn-primary-gradient" onClick={() => saveSection(['login_bg_image_url', 'login_bg_color', 'login_bg_blur'])} disabled={saving}>
                  <Save className="w-3 h-3 mr-1" /> {language === 'bn' ? 'ব্যাকগ্রাউন্ড সেভ' : 'Save Background'}
                </Button>
              </div>

              <hr className="border-border" />

              {/* Logo & Institution */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">{language === 'bn' ? 'লোগো ও প্রতিষ্ঠানের নাম' : 'Logo & Institution Name'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.login_show_logo} onCheckedChange={(v) => updateField('login_show_logo', v)} />
                    <Label>{language === 'bn' ? 'লোগো দেখান' : 'Show Logo'}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.login_show_institution_name} onCheckedChange={(v) => updateField('login_show_institution_name', v)} />
                    <Label>{language === 'bn' ? 'প্রতিষ্ঠানের নাম দেখান' : 'Show Institution Name'}</Label>
                  </div>
                </div>
                {form.login_show_institution_name && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{language === 'bn' ? 'প্রতিষ্ঠানের নাম (বাংলা) - লগইনে' : 'Institution Name (Bangla) - Login'}</Label>
                      <Input className="bg-background mt-1" value={form.login_institution_name_bn} onChange={e => updateField('login_institution_name_bn', e.target.value)} placeholder={settings.institution_name} />
                      <p className="text-xs text-muted-foreground mt-1">{language === 'bn' ? 'খালি রাখলে মূল নাম দেখাবে' : 'Leave empty to use main name'}</p>
                    </div>
                    <div>
                      <Label>{language === 'bn' ? 'প্রতিষ্ঠানের নাম (ইংরেজি) - লগইনে' : 'Institution Name (English) - Login'}</Label>
                      <Input className="bg-background mt-1" value={form.login_institution_name_en} onChange={e => updateField('login_institution_name_en', e.target.value)} placeholder={settings.institution_name_en} />
                      <p className="text-xs text-muted-foreground mt-1">{language === 'bn' ? 'খালি রাখলে মূল নাম দেখাবে' : 'Leave empty to use main name'}</p>
                    </div>
                  </div>
                )}
                <Button size="sm" className="btn-primary-gradient" onClick={() => saveSection(['login_show_logo', 'login_show_institution_name', 'login_institution_name_bn', 'login_institution_name_en'])} disabled={saving}>
                  <Save className="w-3 h-3 mr-1" /> {language === 'bn' ? 'সেভ' : 'Save'}
                </Button>
              </div>

              <hr className="border-border" />

              {/* Welcome Message */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">{language === 'bn' ? 'স্বাগতম মেসেজ' : 'Welcome Message'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'বাংলা মেসেজ' : 'Bangla Message'}</Label>
                    <Input className="bg-background mt-1" value={form.login_welcome_bn} onChange={e => updateField('login_welcome_bn', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'ইংরেজি মেসেজ' : 'English Message'}</Label>
                    <Input className="bg-background mt-1" value={form.login_welcome_en} onChange={e => updateField('login_welcome_en', e.target.value)} />
                  </div>
                </div>
                <Button size="sm" className="btn-primary-gradient" onClick={() => saveSection(['login_welcome_bn', 'login_welcome_en'])} disabled={saving}>
                  <Save className="w-3 h-3 mr-1" /> {language === 'bn' ? 'মেসেজ সেভ' : 'Save Message'}
                </Button>
              </div>

              <hr className="border-border" />

              {/* Form Style */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">{language === 'bn' ? 'ফর্ম স্টাইল' : 'Form Style'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'ফর্ম ব্যাকগ্রাউন্ড কালার' : 'Form Background Color'}</Label>
                    <Input className="bg-background mt-1" type="color" value={form.login_form_bg_color || '#ffffff'} onChange={e => updateField('login_form_bg_color', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'বর্ডার রেডিয়াস (px)' : 'Border Radius (px)'}</Label>
                    <Input className="bg-background mt-1" type="number" min={0} max={50} value={form.login_form_border_radius || ''} onChange={e => updateField('login_form_border_radius', Number(e.target.value))} />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <Switch checked={form.login_form_shadow} onCheckedChange={(v) => updateField('login_form_shadow', v)} />
                    <Label>{language === 'bn' ? 'শ্যাডো' : 'Shadow'}</Label>
                  </div>
                </div>
                <Button size="sm" className="btn-primary-gradient" onClick={() => saveSection(['login_form_bg_color', 'login_form_border_radius', 'login_form_shadow'])} disabled={saving}>
                  <Save className="w-3 h-3 mr-1" /> {language === 'bn' ? 'স্টাইল সেভ' : 'Save Style'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

// ─── Form Settings Tab Component ───
const FORM_FIELD_LABELS: Record<string, { bn: string; en: string }> = {
  roll_no: { bn: 'রোল নম্বর', en: 'Roll No' },
  admission_session: { bn: 'ভর্তি সেশন', en: 'Admission Session' },
  admission_class: { bn: 'ভর্তি শ্রেণী', en: 'Admission Class' },
  registration_no: { bn: 'রেজিস্ট্রেশন নং', en: 'Registration No' },
  session_year: { bn: 'সেশন বছর', en: 'Session Year' },
  previous_class: { bn: 'পূর্ববর্তী শ্রেণী', en: 'Previous Class' },
  previous_institute: { bn: 'পূর্ববর্তী প্রতিষ্ঠান', en: 'Previous Institute' },
  birth_reg_no: { bn: 'জন্ম নিবন্ধন নং', en: 'Birth Reg No' },
  father_nid: { bn: 'পিতার NID', en: "Father's NID" },
  mother_nid: { bn: 'মাতার NID', en: "Mother's NID" },
  guardian_nid: { bn: 'অভিভাবকের NID', en: "Guardian's NID" },
  is_orphan: { bn: 'এতিম', en: 'Orphan' },
  is_poor: { bn: 'গরীব', en: 'Poor' },
  footer_paragraph: { bn: 'ফুটার প্যারাগ্রাফ', en: 'Footer Paragraph' },
};

// Staff form field/section labels for visibility control
const STAFF_FORM_FIELD_LABELS: Record<string, { bn: string; en: string }> = {
  // Sections
  section_personal: { bn: '📋 ব্যক্তিগত তথ্য (সেকশন)', en: '📋 Personal Details (Section)' },
  section_parents: { bn: '📋 পিতা-মাতার তথ্য (সেকশন)', en: '📋 Parents Details (Section)' },
  section_identifier: { bn: '📋 পরিচয সনাক্তকারী তথ্য (সেকশন)', en: '📋 Identifier Details (Section)' },
  section_relatives: { bn: '📋 আত্মীয় শনাক্তকারীর তথ্য (সেকশন)', en: '📋 Relatives Identifier (Section)' },
  // Personal fields
  staff_photo: { bn: 'ছবি আপলোড', en: 'Photo Upload' },
  staff_email: { bn: 'ইমেইল', en: 'Email' },
  staff_employment_type: { bn: 'চাকরির ধরন', en: 'Employment Type' },
  staff_designation: { bn: 'পদবী', en: 'Designation' },
  staff_residence_type: { bn: 'আবাসিক ধরন', en: 'Residential Status' },
  staff_dob: { bn: 'জন্ম তারিখ', en: 'Date of Birth' },
  staff_joining_date: { bn: 'যোগদান তারিখ', en: 'Joining Date' },
  staff_religion: { bn: 'ধর্ম', en: 'Religion' },
  staff_nid: { bn: 'NID', en: 'NID' },
  staff_education: { bn: 'শিক্ষাগত যোগ্যতা', en: 'Education' },
  staff_experience: { bn: 'অভিজ্ঞতা', en: 'Experience' },
  staff_prev_institute: { bn: 'পূর্ববর্তী কর্মস্থল', en: 'Previous Institute' },
  staff_permanent_addr: { bn: 'স্থায়ী ঠিকানা', en: 'Permanent Address' },
  staff_present_addr: { bn: 'বর্তমান ঠিকানা', en: 'Present Address' },
  // Parent fields
  staff_father_mobile: { bn: 'পিতার মোবাইল', en: "Father's Mobile" },
  staff_father_nid: { bn: 'পিতার NID', en: "Father's NID" },
  staff_father_occupation: { bn: 'পিতার পেশা', en: "Father's Occupation" },
  staff_mother_name: { bn: 'মাতার নাম', en: "Mother's Name" },
  staff_mother_mobile: { bn: 'মাতার মোবাইল', en: "Mother's Mobile" },
  staff_mother_nid: { bn: 'মাতার NID', en: "Mother's NID" },
  staff_mother_occupation: { bn: 'মাতার পেশা', en: "Mother's Occupation" },
};

type FormSettingRow = {
  id: string;
  field_name: string;
  is_visible: boolean;
  footer_text: string | null;
  updated_at: string | null;
};

const FormSettingsTab = ({ language }: { language: string }) => {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<FormSettingRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [admissionPublic, setAdmissionPublic] = useState(false);
  const [admissionPublicLoading, setAdmissionPublicLoading] = useState(true);
  const [staffFormPublic, setStaffFormPublic] = useState(false);
  const [staffFormPublicLoading, setStaffFormPublicLoading] = useState(true);

  const { data: formSettings, isLoading } = useQuery({
    queryKey: ['form-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_settings')
        .select('*')
        .order('field_name');
      if (error) throw error;
      return (data || []) as FormSettingRow[];
    },
  });

  // Load public toggle settings
  useQuery({
    queryKey: ['website-setting-form-public-toggles'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('*').in('key', ['admission_form_public', 'staff_form_public']);
      data?.forEach(row => {
        if (row.key === 'admission_form_public') setAdmissionPublic(row.value === true || row.value === 'true');
        if (row.key === 'staff_form_public') setStaffFormPublic(row.value === true || row.value === 'true');
      });
      setAdmissionPublicLoading(false);
      setStaffFormPublicLoading(false);
      return data;
    },
  });

  const togglePublicSetting = async (key: string, currentVal: boolean, setter: (v: boolean) => void, labels: { onBn: string; offBn: string; onEn: string; offEn: string }) => {
    const newVal = !currentVal;
    setter(newVal);
    const { data: existing } = await supabase.from('website_settings').select('id').eq('key', key).maybeSingle();
    if (existing) {
      await supabase.from('website_settings').update({ value: newVal, updated_at: new Date().toISOString() }).eq('key', key);
    } else {
      await supabase.from('website_settings').insert({ key, value: newVal });
    }
    queryClient.invalidateQueries({ queryKey: ['website-setting-form-public-toggles'] });
    toast.success(language === 'bn' ? (newVal ? labels.onBn : labels.offBn) : (newVal ? labels.onEn : labels.offEn));
  };

  useEffect(() => {
    if (formSettings) {
      // Ensure all known fields exist locally
      const existing = new Set(formSettings.map(f => f.field_name));
      const merged = [...formSettings];
      Object.keys(FORM_FIELD_LABELS).forEach(key => {
        if (!existing.has(key)) {
          merged.push({ id: '', field_name: key, is_visible: true, footer_text: null, updated_at: null });
        }
      });
      setLocalSettings(merged);
    }
  }, [formSettings]);

  const toggleVisibility = (fieldName: string) => {
    setLocalSettings(prev =>
      prev.map(s => s.field_name === fieldName ? { ...s, is_visible: !s.is_visible } : s)
    );
  };

  const updateFooterText = (fieldName: string, text: string) => {
    setLocalSettings(prev =>
      prev.map(s => s.field_name === fieldName ? { ...s, footer_text: text } : s)
    );
  };

  const saveFormSettings = async () => {
    setSaving(true);
    try {
      for (const setting of localSettings) {
        if (setting.id) {
          await supabase
            .from('form_settings')
            .update({ is_visible: setting.is_visible, footer_text: setting.footer_text, updated_at: new Date().toISOString() })
            .eq('id', setting.id);
        } else {
          await supabase
            .from('form_settings')
            .insert({ field_name: setting.field_name, is_visible: setting.is_visible, footer_text: setting.footer_text });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['form-settings'] });
      toast.success(language === 'bn' ? 'ফর্ম সেটিংস সংরক্ষিত!' : 'Form settings saved!');
    } catch {
      toast.error(language === 'bn' ? 'সংরক্ষণে ত্রুটি' : 'Error saving');
    }
    setSaving(false);
  };

  const footerSetting = localSettings.find(s => s.field_name === 'footer_paragraph');
  const fieldSettings = localSettings.filter(s => s.field_name !== 'footer_paragraph');

  if (isLoading) {
    return <div className="card-elevated p-5"><Skeleton className="h-[300px] w-full" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Online Admission Form Publish Toggle */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-display font-bold text-foreground">
                {language === 'bn' ? 'অনলাইন ভর্তি ফর্ম' : 'Online Admission Form'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'পাবলিক পেইজে ভর্তি ফর্ম দেখান বা লুকান' : 'Show or hide admission form on the public page'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${admissionPublic ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {admissionPublic
                ? (language === 'bn' ? '🟢 পাবলিশড' : '🟢 Published')
                : (language === 'bn' ? '🔴 হাইড' : '🔴 Hidden')}
            </span>
            <Switch
              checked={admissionPublic}
              onCheckedChange={() => togglePublicSetting('admission_form_public', admissionPublic, setAdmissionPublic, {
                onBn: 'অনলাইন ভর্তি ফর্ম পাবলিশ করা হয়েছে', offBn: 'অনলাইন ভর্তি ফর্ম হাইড করা হয়েছে',
                onEn: 'Online admission form published', offEn: 'Online admission form hidden',
              })}
              disabled={admissionPublicLoading}
            />
          </div>
        </div>
      </div>

      {/* Online Staff Form Publish Toggle */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-display font-bold text-foreground">
                {language === 'bn' ? 'অনলাইন স্টাফ/শিক্ষক আবেদন ফর্ম' : 'Online Staff/Teacher Application Form'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'পাবলিক পেইজে স্টাফ/শিক্ষক আবেদন ফর্ম দেখান বা লুকান' : 'Show or hide staff application form on the public page'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${staffFormPublic ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {staffFormPublic
                ? (language === 'bn' ? '🟢 পাবলিশড' : '🟢 Published')
                : (language === 'bn' ? '🔴 হাইড' : '🔴 Hidden')}
            </span>
            <Switch
              checked={staffFormPublic}
              onCheckedChange={() => togglePublicSetting('staff_form_public', staffFormPublic, setStaffFormPublic, {
                onBn: 'অনলাইন স্টাফ/শিক্ষক ফর্ম পাবলিশ করা হয়েছে', offBn: 'অনলাইন স্টাফ/শিক্ষক ফর্ম হাইড করা হয়েছে',
                onEn: 'Online staff form published', offEn: 'Online staff form hidden',
              })}
              disabled={staffFormPublicLoading}
            />
          </div>
        </div>
      </div>

      {/* Staff Form Field Visibility */}
      <StaffFormFieldsControl language={language} />

      {/* Field Visibility Toggles */}
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
          {language === 'bn' ? 'ভর্তি ফর্ম ফিল্ড দৃশ্যমানতা' : 'Admission Form Field Visibility'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {language === 'bn' ? 'কোন ফিল্ড ভর্তি ফর্মে দেখাবে বা লুকাবে তা নিয়ন্ত্রণ করুন।' : 'Control which fields are shown or hidden on the admission form.'}
        </p>
        <div className="space-y-2">
          {fieldSettings.map(setting => {
            const label = FORM_FIELD_LABELS[setting.field_name];
            return (
              <div key={setting.field_name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  {setting.is_visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">
                    {language === 'bn' ? (label?.bn || setting.field_name) : (label?.en || setting.field_name)}
                  </span>
                </div>
                <Switch
                  checked={setting.is_visible}
                  onCheckedChange={() => toggleVisibility(setting.field_name)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Paragraph */}
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {language === 'bn' ? 'ফর্মের নিচের প্যারাগ্রাফ' : 'Form Footer Paragraph'}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          {language === 'bn' ? 'ভর্তি ফর্মের নিচে যে লেখা দেখানো হবে তা এখানে লিখুন।' : 'Write the text that will appear at the bottom of the admission form.'}
        </p>
        <Textarea
          className="bg-background min-h-[120px]"
          placeholder={language === 'bn' ? 'এখানে প্যারাগ্রাফ লিখুন...' : 'Write your paragraph here...'}
          value={footerSetting?.footer_text || ''}
          onChange={e => updateFooterText('footer_paragraph', e.target.value)}
        />
        <div className="flex items-center gap-2 mt-2">
          <Switch
            checked={footerSetting?.is_visible ?? true}
            onCheckedChange={() => toggleVisibility('footer_paragraph')}
          />
          <span className="text-xs text-muted-foreground">
            {language === 'bn' ? 'ফুটার প্যারাগ্রাফ দেখান' : 'Show footer paragraph'}
          </span>
        </div>
      </div>

      {/* Save Button */}
      <Button className="btn-primary-gradient w-full" onClick={saveFormSettings} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {language === 'bn' ? 'ফর্ম সেটিংস সংরক্ষণ করুন' : 'Save Form Settings'}
      </Button>
    </div>
  );
};

// ─── Staff Form Fields Control Component ───
const StaffFormFieldsControl = ({ language }: { language: string }) => {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Record<string, boolean>>({});
  const [footerText, setFooterText] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: savedFields, isLoading } = useQuery({
    queryKey: ['staff-form-fields-config'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'staff_form_fields').maybeSingle();
      return (data?.value as Record<string, boolean>) || {};
    },
  });

  const { data: savedFooter } = useQuery({
    queryKey: ['staff-form-footer-text'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'staff_form_footer_text').maybeSingle();
      return (data?.value as string) || '';
    },
  });

  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    Object.keys(STAFF_FORM_FIELD_LABELS).forEach(k => { defaults[k] = true; });
    if (savedFields) setFields({ ...defaults, ...savedFields });
    else setFields(defaults);
  }, [savedFields]);

  useEffect(() => {
    if (savedFooter !== undefined) setFooterText(savedFooter);
  }, [savedFooter]);

  const toggle = async (key: string) => {
    const updated = { ...fields, [key]: !fields[key] };
    setFields(updated);
    // Auto-save on toggle
    try {
      const { data: existing } = await supabase.from('website_settings').select('id').eq('key', 'staff_form_fields').maybeSingle();
      if (existing) {
        await supabase.from('website_settings').update({ value: updated as any, updated_at: new Date().toISOString() }).eq('key', 'staff_form_fields');
      } else {
        await supabase.from('website_settings').insert({ key: 'staff_form_fields', value: updated as any });
      }
      queryClient.invalidateQueries({ queryKey: ['staff-form-fields-config'] });
      toast.success(language === 'bn' ? 'আপডেট হয়েছে' : 'Updated');
    } catch {
      toast.error(language === 'bn' ? 'ত্রুটি' : 'Error');
    }
  };

  const saveStaffFields = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('website_settings').select('id').eq('key', 'staff_form_fields').maybeSingle();
      if (existing) {
        await supabase.from('website_settings').update({ value: fields as any, updated_at: new Date().toISOString() }).eq('key', 'staff_form_fields');
      } else {
        await supabase.from('website_settings').insert({ key: 'staff_form_fields', value: fields as any });
      }

      const { data: existingFooter } = await supabase.from('website_settings').select('id').eq('key', 'staff_form_footer_text').maybeSingle();
      if (existingFooter) {
        await supabase.from('website_settings').update({ value: footerText as any, updated_at: new Date().toISOString() }).eq('key', 'staff_form_footer_text');
      } else {
        await supabase.from('website_settings').insert({ key: 'staff_form_footer_text', value: footerText as any });
      }

      queryClient.invalidateQueries({ queryKey: ['staff-form-fields-config'] });
      queryClient.invalidateQueries({ queryKey: ['staff-form-footer-text'] });
      toast.success(language === 'bn' ? 'সংরক্ষিত হয়েছে' : 'Saved successfully');
    } catch (err) {
      toast.error(language === 'bn' ? 'সংরক্ষণে ত্রুটি' : 'Error saving');
    }
    setSaving(false);
  };

  if (isLoading) return <Skeleton className="h-[200px] w-full" />;

  const sectionKeys = Object.keys(STAFF_FORM_FIELD_LABELS).filter(k => k.startsWith('section_'));
  const fieldKeys = Object.keys(STAFF_FORM_FIELD_LABELS).filter(k => !k.startsWith('section_'));

  return (
    <div className="card-elevated p-5">
      <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
        <SlidersHorizontal className="w-5 h-5 text-primary" />
        {language === 'bn' ? 'স্টাফ আবেদন ফর্ম ফিল্ড নিয়ন্ত্রণ' : 'Staff Application Form Field Control'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {language === 'bn' ? 'কোন সেকশন ও ফিল্ড পাবলিক স্টাফ আবেদন ফর্মে দেখাবে তা নিয়ন্ত্রণ করুন।' : 'Control which sections and fields appear on the public staff application form.'}
      </p>

      {/* Sections */}
      <h4 className="text-sm font-semibold text-foreground mb-2">{language === 'bn' ? 'সেকশনসমূহ' : 'Sections'}</h4>
      <div className="space-y-2 mb-4">
        {sectionKeys.map(key => {
          const label = STAFF_FORM_FIELD_LABELS[key];
          return (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                {fields[key] ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">{language === 'bn' ? label.bn : label.en}</span>
              </div>
              <Switch checked={fields[key] ?? true} onCheckedChange={() => toggle(key)} />
            </div>
          );
        })}
      </div>

      {/* Individual Fields */}
      <h4 className="text-sm font-semibold text-foreground mb-2">{language === 'bn' ? 'পৃথক ফিল্ডসমূহ' : 'Individual Fields'}</h4>
      <div className="space-y-2 mb-4">
        {fieldKeys.map(key => {
          const label = STAFF_FORM_FIELD_LABELS[key];
          return (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                {fields[key] ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">{language === 'bn' ? label.bn : label.en}</span>
              </div>
              <Switch checked={fields[key] ?? true} onCheckedChange={() => toggle(key)} />
            </div>
          );
        })}
      </div>

      {/* Footer Paragraph */}
      <h4 className="text-sm font-semibold text-foreground mb-2">{language === 'bn' ? 'ফর্মের নিচে প্যারাগ্রাফ / নির্দেশনা' : 'Footer Paragraph / Instructions'}</h4>
      <textarea
        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-4"
        placeholder={language === 'bn' ? 'ফর্মের নিচে যে টেক্সট/নির্দেশনা দেখাতে চান তা লিখুন...' : 'Enter text/instructions to show at the bottom of the form...'}
        value={footerText}
        onChange={e => setFooterText(e.target.value)}
      />

      <Button className="btn-primary-gradient w-full" onClick={saveStaffFields} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {language === 'bn' ? 'স্টাফ ফর্ম ফিল্ড সংরক্ষণ করুন' : 'Save Staff Form Fields'}
      </Button>
    </div>
  );
};

export default AdminWebsite;
