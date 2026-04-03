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
import { Globe, Save, Image, Type, Layout, BarChart3, Plus, Trash2, Eye, ImageIcon, Share2, PanelTop, PanelBottom, Navigation, Menu, RefreshCw, CheckCircle, AlertCircle, Database, FileText, ChevronUp, ChevronDown, EyeOff, Link2, List, SlidersHorizontal } from 'lucide-react';
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
  { path: '/posts', label_bn: 'পোস্ট/সংবাদ', label_en: 'Posts/News' },
];

const INFO_LINK_ICONS = [
  'Users', 'UserCheck', 'BookOpen', 'GraduationCap', 'FileText', 'List', 'Award',
  'Globe', 'Heart', 'Star', 'Shield', 'Clock', 'MapPin', 'Phone', 'Mail', 'Settings', 'Bookmark', 'Layers', 'Tag',
];

const AdminWebsite = () => {
  const { language } = useLanguage();
  const { settings, isLoading, updateMultiple } = useWebsiteSettings();
  const { canEditItem } = usePagePermissions('/admin/website');
  const { menuConfig, saveMenuConfig } = useMenuSettings();
  const [form, setForm] = useState<WebsiteSettings | null>(null);
  const [publicMenu, setPublicMenu] = useState<MenuItemConfig[]>([]);
  const [saving, setSaving] = useState(false);

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
      toast.success(language === 'bn' ? 'সংরক্ষিত!' : 'Saved!');
    } catch {
      toast.error(language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error occurred');
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

        <Tabs defaultValue="institution" className="w-full">
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
                  <Label>{language === 'bn' ? 'লোগো' : 'Logo'}</Label>
                  <ImageUpload
                    value={form.logo_url}
                    onChange={(url) => updateField('logo_url', url)}
                    folder="logo"
                    className="mt-1"
                    aspectRatio="aspect-square w-28"
                  />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'ফেভিকন (ব্রাউজার ট্যাব)' : 'Favicon (Browser Tab)'}</Label>
                  <p className="text-xs text-muted-foreground mb-1">{language === 'bn' ? 'ব্রাউজার ট্যাবে আলাদা আইকন দেখাতে আপলোড করুন। না দিলে মূল লোগো ব্যবহৃত হবে।' : 'Separate icon for browser tab. Falls back to main logo.'}</p>
                  <ImageUpload
                    value={form.favicon_url}
                    onChange={(url) => updateField('favicon_url', url)}
                    folder="logo"
                    className="mt-1"
                    aspectRatio="aspect-square w-20"
                  />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'লোডার লোগো (পেজ লোডিং)' : 'Loader Logo (Page Loading)'}</Label>
                  <p className="text-xs text-muted-foreground mb-1">{language === 'bn' ? 'পেজ লোড হওয়ার সময় আলাদা লোগো দেখাতে আপলোড করুন। না দিলে ফেভিকন বা মূল লোগো ব্যবহৃত হবে।' : 'Separate logo for page loader. Falls back to favicon or main logo.'}</p>
                  <ImageUpload
                    value={form.loader_logo_url || ''}
                    onChange={(url) => updateField('loader_logo_url', url)}
                    folder="logo"
                    className="mt-1"
                    aspectRatio="aspect-square w-24"
                  />
                </div>
              </div>
              <Button className="btn-primary-gradient" onClick={() => saveSection(['institution_name', 'institution_name_en', 'address', 'phone', 'email', 'logo_url', 'favicon_url', 'loader_logo_url'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
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
                <h3 className="font-display font-bold text-foreground">
                  {language === 'bn' ? 'অধ্যক্ষের বাণী' : "Principal's Message"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
                    <Input className="bg-background mt-1" value={form.principal_name} onChange={e => updateField('principal_name', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'পদবী (বাংলা)' : 'Title (Bangla)'}</Label>
                    <Input className="bg-background mt-1" value={form.principal_title_bn} onChange={e => updateField('principal_title_bn', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'পদবী (ইংরেজি)' : 'Title (English)'}</Label>
                    <Input className="bg-background mt-1" value={form.principal_title_en} onChange={e => updateField('principal_title_en', e.target.value)} />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'অধ্যক্ষের ছবি' : "Principal's Photo"}</Label>
                    <ImageUpload
                      value={form.principal_photo_url}
                      onChange={(url) => updateField('principal_photo_url', url)}
                      folder="principal"
                      className="mt-1"
                      aspectRatio="aspect-square w-32"
                    />
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
                <Button className="btn-primary-gradient" onClick={() => saveSection(['principal_name', 'principal_title_bn', 'principal_title_en', 'principal_message_bn', 'principal_message_en', 'principal_photo_url'])} disabled={saving}>
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

export default AdminWebsite;
