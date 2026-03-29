import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { Globe, Save, Image, Type, Layout, BarChart3, Plus, Trash2, Eye, ImageIcon, Share2, FileText, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Json } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import ImageUpload from '@/components/ImageUpload';

const AdminWebsite = () => {
  const { language } = useLanguage();
  const { settings, isLoading, updateMultiple } = useWebsiteSettings();
  const [form, setForm] = useState<WebsiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !form) {
      setForm({ ...settings });
    }
  }, [settings]);

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

  const toggleSection = (key: keyof WebsiteSettings['sections']) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, sections: { ...prev.sections, [key]: !prev.sections[key] } };
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

  const saveAll = async () => {
    setSaving(true);
    try {
      const updates: Array<{ key: string; value: Json }> = Object.entries(form).map(([key, value]) => ({
        key,
        value: value as Json,
      }));
      await updateMultiple.mutateAsync(updates);
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

  const sectionLabels: { key: keyof WebsiteSettings['sections']; bn: string; en: string }[] = [
    { key: 'banner', bn: 'হিরো ব্যানার', en: 'Hero Banner' },
    { key: 'stats', bn: 'পরিসংখ্যান', en: 'Statistics' },
    { key: 'principalMessage', bn: 'অধ্যক্ষের বাণী', en: "Principal's Message" },
    { key: 'classInfo', bn: 'শ্রেণী তথ্য', en: 'Class Info' },
    { key: 'teachersList', bn: 'শিক্ষক তালিকা', en: 'Teachers List' },
    { key: 'studentInfo', bn: 'ছাত্র তথ্য', en: 'Student Info' },
    { key: 'latestNotice', bn: 'সর্বশেষ নোটিশ', en: 'Latest Notices' },
    { key: 'admissionButtons', bn: 'ভর্তি বাটন', en: 'Admission Buttons' },
    { key: 'gallery', bn: 'গ্যালারি', en: 'Gallery' },
    { key: 'donation', bn: 'দান সেকশন', en: 'Donation Section' },
    { key: 'feePayment', bn: 'ফি পেমেন্ট', en: 'Fee Payment' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            {language === 'bn' ? 'ওয়েবসাইট UI বিল্ডার' : 'Website UI Builder'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open('/', '_blank')}>
              <Eye className="w-4 h-4 mr-1" /> {language === 'bn' ? 'প্রিভিউ' : 'Preview'}
            </Button>
            <Button className="btn-primary-gradient" size="sm" onClick={saveAll} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সব সংরক্ষণ' : 'Save All'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="institution" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="institution" className="text-xs py-2 px-3">
              <Globe className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'প্রতিষ্ঠান' : 'Institution'}
            </TabsTrigger>
            <TabsTrigger value="hero" className="text-xs py-2 px-3">
              <Image className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'হিরো/ব্যানার' : 'Hero'}
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs py-2 px-3">
              <Type className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'কন্টেন্ট' : 'Content'}
            </TabsTrigger>
            <TabsTrigger value="gallery" className="text-xs py-2 px-3">
              <ImageIcon className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'গ্যালারি' : 'Gallery'}
            </TabsTrigger>
            <TabsTrigger value="sections" className="text-xs py-2 px-3">
              <Layout className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'সেকশন' : 'Sections'}
            </TabsTrigger>
            <TabsTrigger value="divisions" className="text-xs py-2 px-3">
              <BarChart3 className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'বিভাগ' : 'Divisions'}
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs py-2 px-3">
              <Share2 className="w-3.5 h-3.5 mr-1" /> {language === 'bn' ? 'সোশ্যাল' : 'Social'}
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
                    aspectRatio="aspect-square w-32"
                  />
                </div>
              </div>
              <Button className="btn-primary-gradient" onClick={() => saveSection(['institution_name', 'institution_name_en', 'address', 'phone', 'email', 'logo_url'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          </TabsContent>

          {/* Hero Tab */}
          <TabsContent value="hero">
            <div className="card-elevated p-5 space-y-4">
              <h3 className="font-display font-bold text-foreground">
                {language === 'bn' ? 'হিরো সেকশন' : 'Hero Section'}
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

              {/* Footer */}
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
                <div>
                  <Label>{language === 'bn' ? 'গুগল ম্যাপ এম্বেড কোড' : 'Google Map Embed Code'}</Label>
                  <Textarea className="bg-background mt-1 min-h-[80px]" value={form.contact_map_embed} onChange={e => updateField('contact_map_embed', e.target.value)} placeholder='<iframe src="https://www.google.com/maps/embed?..." ...' />
                </div>
                <Button className="btn-primary-gradient" onClick={() => saveSection(['footer_description_bn', 'footer_description_en', 'contact_map_embed'])} disabled={saving}>
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
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'গ্যালারি পেইজ এবং হোমপেজে প্রদর্শিত ছবিগুলো এখানে ম্যানেজ করুন' : 'Manage images shown on gallery page and homepage'}
              </p>
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

          {/* Sections Tab */}
          <TabsContent value="sections">
            <div className="card-elevated p-5 space-y-4">
              <h3 className="font-display font-bold text-foreground">
                {language === 'bn' ? 'সেকশন দেখানো/লুকানো' : 'Section Show/Hide'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'হোমপেজে কোন সেকশনগুলো দেখাবে তা নিয়ন্ত্রণ করুন' : 'Control which sections appear on the homepage'}
              </p>
              <div className="space-y-3">
                {sectionLabels.map(s => (
                  <div key={s.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{language === 'bn' ? s.bn : s.en}</span>
                    <Switch checked={form.sections[s.key]} onCheckedChange={() => toggleSection(s.key)} />
                  </div>
                ))}
              </div>
              <Button className="btn-primary-gradient" onClick={() => saveSection(['sections'])} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
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
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'কন্ট্যাক্ট পেইজ এবং ফুটারে প্রদর্শিত হবে' : 'Will be shown on contact page and footer'}
              </p>
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
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminWebsite;
