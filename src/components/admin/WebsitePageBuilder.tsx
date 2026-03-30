import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Save, Eye, EyeOff, GripVertical, Settings2, ChevronUp, ChevronDown,
  Layout, Paintbrush, ArrowUpDown, Smartphone, Tablet, Monitor,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, RotateCcw,
  MoveVertical, Play, X, PanelTop, PanelBottom, GraduationCap,
  Bell, ArrowRight, Calendar, MapPin, Users, BookOpen, Award, Phone, Mail, Image
} from 'lucide-react';
import { HomeSectionConfig, WebsiteSettings, ALL_SECTION_CONFIGS, SectionStyleConfig, DEFAULT_SECTION_STYLE, HomeSectionKey } from '@/hooks/useWebsiteSettings';
import { Json } from '@/integrations/supabase/types';
import ImageUpload from '@/components/ImageUpload';

interface Props {
  form: WebsiteSettings;
  setForm: React.Dispatch<React.SetStateAction<WebsiteSettings | null>>;
  language: string;
  saving: boolean;
  onSave: (keys: (keyof WebsiteSettings)[]) => Promise<void>;
}

type DeviceView = 'desktop' | 'tablet' | 'mobile';

const WebsitePageBuilder = ({ form, setForm, language, saving, onSave }: Props) => {
  const bn = language === 'bn';
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');

  const sectionOrder = form.section_order || ALL_SECTION_CONFIGS;

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionOrder];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]];
    setForm(prev => prev ? { ...prev, section_order: newOrder } : prev);
  };

  const toggleVisibility = (index: number) => {
    const newOrder = [...sectionOrder];
    newOrder[index] = { ...newOrder[index], visible: !newOrder[index].visible };
    setForm(prev => {
      if (!prev) return prev;
      const newSections = { ...prev.sections };
      const key = newOrder[index].key;
      if (key in newSections) {
        (newSections as any)[key] = newOrder[index].visible;
      }
      return { ...prev, section_order: newOrder, sections: newSections };
    });
  };

  const getStyle = (key: string): SectionStyleConfig => {
    const section = sectionOrder.find(s => s.key === key);
    return section?.styles || { ...DEFAULT_SECTION_STYLE };
  };

  const updateSectionStyle = (key: string, styleProp: keyof SectionStyleConfig, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      const newOrder = [...(prev.section_order || ALL_SECTION_CONFIGS)];
      const idx = newOrder.findIndex(s => s.key === key);
      if (idx === -1) return prev;
      const currentStyles = newOrder[idx].styles || { ...DEFAULT_SECTION_STYLE };
      newOrder[idx] = { ...newOrder[idx], styles: { ...currentStyles, [styleProp]: value } };
      return { ...prev, section_order: newOrder };
    });
  };

  const updateField = (key: keyof WebsiteSettings, value: any) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const resetSectionStyle = (key: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const newOrder = [...(prev.section_order || ALL_SECTION_CONFIGS)];
      const idx = newOrder.findIndex(s => s.key === key);
      if (idx === -1) return prev;
      newOrder[idx] = { ...newOrder[idx], styles: { ...DEFAULT_SECTION_STYLE } };
      return { ...prev, section_order: newOrder };
    });
  };

  const selectedConfig = sectionOrder.find(s => s.key === selectedSection);
  const selectedStyle = selectedSection ? getStyle(selectedSection) : null;

  const colorField = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)} className="w-7 h-7 rounded border cursor-pointer p-0.5" />
        <Input className="h-7 text-xs bg-background flex-1" value={value} onChange={e => onChange(e.target.value)} placeholder="auto" />
        {value && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onChange('')}><RotateCcw className="w-3 h-3" /></Button>}
      </div>
    </div>
  );

  const sliderField = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit: string = 'px') => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="text-[11px] font-mono text-primary">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="w-full" />
    </div>
  );

  // ===== LIVE PREVIEW SECTION RENDERERS =====
  const getSectionInlineStyle = (key: HomeSectionKey): React.CSSProperties => {
    const st = getStyle(key);
    const style: React.CSSProperties = {};
    if (st.bgColor) style.backgroundColor = st.bgColor;
    if (st.textColor) style.color = st.textColor;
    if (st.padding) style.padding = `${st.padding * 0.4}px`; // scaled down
    if (st.margin) style.marginTop = `${st.margin * 0.4}px`;
    if (st.borderRadius) style.borderRadius = `${st.borderRadius}px`;
    return style;
  };

  const isVisible = (key: HomeSectionKey) => {
    return sectionOrder.find(s => s.key === key)?.visible;
  };

  const row1Keys: HomeSectionKey[] = ['principalMessage', 'banner', 'adminMessage'];
  const row2Keys: HomeSectionKey[] = ['infoLinks', 'latestNotice', 'admissionButtons'];
  const standaloneKeys: HomeSectionKey[] = ['latestPosts', 'gallery', 'prayerCalendar', 'stats'];

  const renderPreviewSection = (key: HomeSectionKey) => {
    const isSelected = selectedSection === key;
    const visible = isVisible(key);
    if (!visible) return null;

    const wrapClass = `relative cursor-pointer transition-all border-2 rounded-md mb-1 ${
      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/30'
    }`;

    const labelOverlay = (
      <div className={`absolute top-0 left-0 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-br-md ${
        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {sectionOrder.find(s => s.key === key)?.icon} {bn ? sectionOrder.find(s => s.key === key)?.label_bn : sectionOrder.find(s => s.key === key)?.label_en}
      </div>
    );

    switch (key) {
      case 'principalMessage':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-[10px] font-bold truncate">{form.principal_name || 'Principal'}</div>
              <div className="text-[8px] text-muted-foreground truncate">{form.principal_title_bn}</div>
            </div>
          </div>
        );
      case 'banner':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5 bg-gradient-to-br from-primary/10 to-accent/10 rounded min-h-[60px] flex flex-col items-center justify-center">
              {form.hero_bg_image_url ? (
                <img src={form.hero_bg_image_url} alt="" className="w-full h-14 object-cover rounded" />
              ) : (
                <>
                  <Image className="w-6 h-6 text-primary/40 mb-1" />
                  <div className="text-[10px] font-bold">{form.hero_title_bn || 'Hero Banner'}</div>
                  <div className="text-[8px] text-muted-foreground">{form.hero_subtitle_bn}</div>
                </>
              )}
            </div>
          </div>
        );
      case 'adminMessage':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div className="text-[10px] font-bold truncate">{form.admin_name || 'Admin'}</div>
              <div className="text-[8px] text-muted-foreground truncate">{form.admin_title_bn}</div>
            </div>
          </div>
        );
      case 'infoLinks':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5 space-y-1">
              {['🔗 Link 1', '🔗 Link 2', '🔗 Link 3'].map((l, i) => (
                <div key={i} className="text-[9px] bg-muted/50 rounded px-2 py-1">{l}</div>
              ))}
            </div>
          </div>
        );
      case 'latestNotice':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5">
              <div className="bg-primary rounded-t px-2 py-1 flex items-center justify-between">
                <span className="text-[9px] font-bold text-primary-foreground flex items-center gap-1">
                  <Bell className="w-3 h-3" /> {bn ? 'নোটিশ বোর্ড' : 'Notice Board'}
                </span>
              </div>
              <div className="border border-t-0 rounded-b p-1.5 space-y-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bell className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <div className="h-2 bg-muted rounded flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'admissionButtons':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5 space-y-1">
              <div className="bg-accent px-2 py-1 rounded-t text-center">
                <span className="text-[9px] font-bold text-accent-foreground flex items-center justify-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {bn ? 'অনলাইন ভর্তি' : 'Admission'}
                </span>
              </div>
              {(form.divisions || []).slice(0, 3).map((d, i) => (
                <div key={i} className="bg-primary text-primary-foreground text-[9px] text-center py-1 rounded font-bold">
                  {bn ? d.name : d.nameEn}
                </div>
              ))}
            </div>
          </div>
        );
      case 'latestPosts':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5">
              <div className="text-[10px] font-bold mb-1">📰 {bn ? 'সর্বশেষ সংবাদ' : 'Latest News'}</div>
              <div className="grid grid-cols-2 gap-1">
                {[1, 2].map(i => (
                  <div key={i} className="border rounded p-1">
                    <div className="h-6 bg-muted rounded mb-1" />
                    <div className="h-2 bg-muted/60 rounded w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5">
              <div className="text-[10px] font-bold mb-1">📷 {bn ? 'গ্যালারি' : 'Gallery'}</div>
              <div className="grid grid-cols-4 gap-0.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square bg-muted rounded" />
                ))}
              </div>
            </div>
          </div>
        );
      case 'prayerCalendar':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5 grid grid-cols-2 gap-1">
              <div className="bg-muted/30 rounded p-1.5 text-center">
                <div className="text-[9px] font-bold">🕌 {bn ? 'নামাজ' : 'Prayer'}</div>
                <div className="h-4 bg-muted rounded mt-1" />
              </div>
              <div className="bg-muted/30 rounded p-1.5 text-center">
                <div className="text-[9px] font-bold">📅 {bn ? 'ক্যালেন্ডার' : 'Calendar'}</div>
                <div className="h-4 bg-muted rounded mt-1" />
              </div>
            </div>
          </div>
        );
      case 'stats':
        return (
          <div key={key} className={wrapClass} onClick={() => setSelectedSection(key)} style={getSectionInlineStyle(key)}>
            {labelOverlay}
            <div className="p-2 pt-5 bg-primary/10 rounded">
              <div className="grid grid-cols-3 gap-1 text-center">
                {[
                  { v: form.stat_students, l: bn ? 'ছাত্র' : 'Students', Icon: Users },
                  { v: form.stat_teachers, l: bn ? 'শিক্ষক' : 'Teachers', Icon: BookOpen },
                  { v: form.stat_years, l: bn ? 'বছর' : 'Years', Icon: Award },
                ].map((s, i) => (
                  <div key={i} className="p-1">
                    <s.Icon className="w-3 h-3 mx-auto text-primary mb-0.5" />
                    <div className="text-[10px] font-bold">{s.v}</div>
                    <div className="text-[8px] text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // ===== CONTENT EDITOR =====
  const renderContentEditor = () => {
    if (!selectedSection) return null;
    switch (selectedSection) {
      case 'principalMessage':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div>
              <Label className="text-[11px]">{bn ? 'নাম' : 'Name'}</Label>
              <Input className="bg-background mt-0.5 h-7 text-xs" value={form.principal_name} onChange={e => updateField('principal_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-[11px]">{bn ? 'পদবী (BN)' : 'Title (BN)'}</Label>
                <Input className="bg-background mt-0.5 h-7 text-xs" value={form.principal_title_bn} onChange={e => updateField('principal_title_bn', e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">{bn ? 'পদবী (EN)' : 'Title (EN)'}</Label>
                <Input className="bg-background mt-0.5 h-7 text-xs" value={form.principal_title_en} onChange={e => updateField('principal_title_en', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'বাণী' : 'Message'}</Label>
              <Textarea className="bg-background mt-0.5 min-h-[50px] text-xs" value={form.principal_message_bn} onChange={e => updateField('principal_message_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'ছবি' : 'Photo'}</Label>
              <ImageUpload value={form.principal_photo_url} onChange={(url) => updateField('principal_photo_url', url)} folder="principal" className="mt-0.5" aspectRatio="aspect-square w-16" />
            </div>
          </div>
        );
      case 'adminMessage':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-[11px]">{bn ? 'নাম' : 'Name'}</Label>
                <Input className="bg-background mt-0.5 h-7 text-xs" value={form.admin_name} onChange={e => updateField('admin_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">{bn ? 'পদবী' : 'Title'}</Label>
                <Input className="bg-background mt-0.5 h-7 text-xs" value={form.admin_title_bn} onChange={e => updateField('admin_title_bn', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'বাণী' : 'Message'}</Label>
              <Textarea className="bg-background mt-0.5 min-h-[50px] text-xs" value={form.admin_message_bn} onChange={e => updateField('admin_message_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'ছবি' : 'Photo'}</Label>
              <ImageUpload value={form.admin_photo_url} onChange={(url) => updateField('admin_photo_url', url)} folder="admin" className="mt-0.5" aspectRatio="aspect-square w-16" />
            </div>
          </div>
        );
      case 'banner':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div>
              <Label className="text-[11px]">{bn ? 'শিরোনাম (BN)' : 'Title (BN)'}</Label>
              <Input className="bg-background mt-0.5 h-7 text-xs" value={form.hero_title_bn} onChange={e => updateField('hero_title_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'শিরোনাম (EN)' : 'Title (EN)'}</Label>
              <Input className="bg-background mt-0.5 h-7 text-xs" value={form.hero_title_en} onChange={e => updateField('hero_title_en', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'সাবটাইটেল' : 'Subtitle'}</Label>
              <Input className="bg-background mt-0.5 h-7 text-xs" value={form.hero_subtitle_bn} onChange={e => updateField('hero_subtitle_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'ব্যাকগ্রাউন্ড ছবি' : 'Background Image'}</Label>
              <ImageUpload value={form.hero_bg_image_url} onChange={(url) => updateField('hero_bg_image_url', url)} folder="hero" className="mt-0.5" aspectRatio="aspect-video" />
            </div>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'পরিসংখ্যান' : 'Statistics'}</h4>
            <div>
              <Label className="text-[11px]">{bn ? 'মোট ছাত্র' : 'Total Students'}</Label>
              <Input className="bg-background mt-0.5 h-7 text-xs" value={form.stat_students} onChange={e => updateField('stat_students', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'শিক্ষক' : 'Teachers'}</Label>
              <Input className="bg-background mt-0.5 h-7 text-xs" value={form.stat_teachers} onChange={e => updateField('stat_teachers', e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">{bn ? 'বছর' : 'Years'}</Label>
              <Input className="bg-background mt-0.5 h-7 text-xs" value={form.stat_years} onChange={e => updateField('stat_years', e.target.value)} />
            </div>
          </div>
        );
      default:
        return (
          <div className="text-[11px] text-muted-foreground p-2 bg-muted/30 rounded">
            {bn ? 'এই সেকশনের কন্টেন্ট ডাটাবেস থেকে স্বয়ংক্রিয়।' : 'Content auto-generated from database.'}
          </div>
        );
    }
  };

  // ===== RIGHT PANEL STYLE EDITOR =====
  const renderStyleEditor = () => {
    if (!selectedSection || !selectedStyle) return null;
    return (
      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-8">
          <TabsTrigger value="layout" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layout className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="style" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Paintbrush className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="scroll" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MoveVertical className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="marquee" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Play className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="content" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings2 className="w-3 h-3" />
          </TabsTrigger>
        </TabsList>

        {/* LAYOUT */}
        <TabsContent value="layout" className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Monitor className="w-3 h-3" /> {bn ? 'ডেস্কটপ কলাম' : 'Desktop Cols'}</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(c => (
                <Button key={c} variant={selectedStyle.columns === c ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-xs ${selectedStyle.columns === c ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => updateSectionStyle(selectedSection, 'columns', c)}>{c}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Smartphone className="w-3 h-3" /> {bn ? 'মোবাইল কলাম' : 'Mobile Cols'}</Label>
            <div className="flex gap-1">
              {[1, 2].map(c => (
                <Button key={c} variant={selectedStyle.columnsMobile === c ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-xs ${selectedStyle.columnsMobile === c ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => updateSectionStyle(selectedSection, 'columnsMobile', c)}>{c}</Button>
              ))}
            </div>
          </div>
          {sliderField(bn ? 'গ্যাপ' : 'Gap', selectedStyle.gap, 0, 48, 4, v => updateSectionStyle(selectedSection, 'gap', v))}
          {sliderField(bn ? 'প্যাডিং' : 'Padding', selectedStyle.padding, 0, 80, 4, v => updateSectionStyle(selectedSection, 'padding', v))}
          {sliderField(bn ? 'মার্জিন' : 'Margin', selectedStyle.margin, 0, 80, 4, v => updateSectionStyle(selectedSection, 'margin', v))}
          {sliderField(bn ? 'রেডিয়াস' : 'Radius', selectedStyle.borderRadius, 0, 32, 2, v => updateSectionStyle(selectedSection, 'borderRadius', v))}
          <div className="flex gap-1">
            {(['full', 'boxed'] as const).map(w => (
              <Button key={w} variant={selectedStyle.width === w ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-xs ${selectedStyle.width === w ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => updateSectionStyle(selectedSection, 'width', w)}>
                {w === 'full' ? (bn ? 'পূর্ণ' : 'Full') : (bn ? 'বক্সড' : 'Boxed')}
              </Button>
            ))}
          </div>
        </TabsContent>

        {/* STYLE */}
        <TabsContent value="style" className="mt-3 space-y-3">
          {colorField(bn ? 'ব্যাকগ্রাউন্ড' : 'Background', selectedStyle.bgColor, v => updateSectionStyle(selectedSection, 'bgColor', v))}
          {colorField(bn ? 'টেক্সট রঙ' : 'Text Color', selectedStyle.textColor, v => updateSectionStyle(selectedSection, 'textColor', v))}
          {sliderField(bn ? 'হেডিং সাইজ' : 'Heading Size', selectedStyle.headingFontSize, 12, 80, 1, v => updateSectionStyle(selectedSection, 'headingFontSize', v))}
          {sliderField(bn ? 'বডি সাইজ' : 'Body Size', selectedStyle.bodyFontSize, 10, 36, 1, v => updateSectionStyle(selectedSection, 'bodyFontSize', v))}
          <div className="flex gap-1">
            <Button variant={selectedStyle.headingBold ? 'default' : 'outline'} size="sm" className={`h-7 ${selectedStyle.headingBold ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => updateSectionStyle(selectedSection, 'headingBold', !selectedStyle.headingBold)}><Bold className="w-3 h-3" /></Button>
            <Button variant={selectedStyle.headingItalic ? 'default' : 'outline'} size="sm" className={`h-7 ${selectedStyle.headingItalic ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => updateSectionStyle(selectedSection, 'headingItalic', !selectedStyle.headingItalic)}><Italic className="w-3 h-3" /></Button>
            {[
              { val: 'left' as const, icon: AlignLeft },
              { val: 'center' as const, icon: AlignCenter },
              { val: 'right' as const, icon: AlignRight },
            ].map(a => (
              <Button key={a.val} variant={selectedStyle.textAlign === a.val ? 'default' : 'outline'} size="sm" className={`h-7 ${selectedStyle.textAlign === a.val ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => updateSectionStyle(selectedSection, 'textAlign', a.val)}><a.icon className="w-3 h-3" /></Button>
            ))}
          </div>
          <div className="border-t pt-2">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1.5"><Smartphone className="w-3 h-3" /> {bn ? 'মোবাইল ফন্ট' : 'Mobile Font'}</Label>
            {sliderField(bn ? 'মোবাইল হেডিং' : 'Mobile Heading', selectedStyle.headingFontSizeMobile, 12, 48, 1, v => updateSectionStyle(selectedSection, 'headingFontSizeMobile', v))}
            {sliderField(bn ? 'মোবাইল বডি' : 'Mobile Body', selectedStyle.bodyFontSizeMobile, 10, 24, 1, v => updateSectionStyle(selectedSection, 'bodyFontSizeMobile', v))}
          </div>
        </TabsContent>

        {/* SCROLL */}
        <TabsContent value="scroll" className="mt-3 space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
            <span className="text-[11px] font-medium">{bn ? 'নির্দিষ্ট উচ্চতা' : 'Fixed Height'}</span>
            <Switch checked={selectedStyle.fixedHeight} onCheckedChange={v => updateSectionStyle(selectedSection, 'fixedHeight', v)} />
          </div>
          {selectedStyle.fixedHeight && sliderField(bn ? 'উচ্চতা' : 'Height', selectedStyle.height, 100, 800, 10, v => updateSectionStyle(selectedSection, 'height', v))}
          <div className="flex gap-1">
            {(['auto', 'scroll', 'hidden'] as const).map(o => (
              <Button key={o} variant={selectedStyle.overflow === o ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-[10px] ${selectedStyle.overflow === o ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => updateSectionStyle(selectedSection, 'overflow', o)}>{o}</Button>
            ))}
          </div>
          {colorField(bn ? 'ট্র্যাক রঙ' : 'Track Color', selectedStyle.scrollbarTrackColor, v => updateSectionStyle(selectedSection, 'scrollbarTrackColor', v))}
          {colorField(bn ? 'থাম্ব রঙ' : 'Thumb Color', selectedStyle.scrollbarThumbColor, v => updateSectionStyle(selectedSection, 'scrollbarThumbColor', v))}
        </TabsContent>

        {/* MARQUEE */}
        <TabsContent value="marquee" className="mt-3 space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
            <span className="text-[11px] font-medium">{bn ? 'অটো-স্ক্রল' : 'Auto-Scroll'}</span>
            <Switch checked={selectedStyle.autoScroll} onCheckedChange={v => updateSectionStyle(selectedSection, 'autoScroll', v)} />
          </div>
          {selectedStyle.autoScroll && (
            <>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { val: 'ltr', label: bn ? 'বাম→ডান' : 'L→R' },
                  { val: 'rtl', label: bn ? 'ডান→বাম' : 'R→L' },
                  { val: 'ttb', label: bn ? 'উপর→নিচ' : 'T→B' },
                  { val: 'btt', label: bn ? 'নিচ→উপর' : 'B→T' },
                ].map(d => (
                  <Button key={d.val} variant={selectedStyle.scrollDirection === d.val ? 'default' : 'outline'} size="sm"
                    className={`h-7 text-[10px] ${selectedStyle.scrollDirection === d.val ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => updateSectionStyle(selectedSection, 'scrollDirection', d.val)}>{d.label}</Button>
                ))}
              </div>
              {sliderField(bn ? 'গতি' : 'Speed', selectedStyle.scrollSpeed, 1, 10, 1, v => updateSectionStyle(selectedSection, 'scrollSpeed', v), '')}
              <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
                <span className="text-[11px] font-medium">{bn ? 'হোভারে থামবে' : 'Pause on Hover'}</span>
                <Switch checked={selectedStyle.pauseOnHover} onCheckedChange={v => updateSectionStyle(selectedSection, 'pauseOnHover', v)} />
              </div>
            </>
          )}
        </TabsContent>

        {/* CONTENT */}
        <TabsContent value="content" className="mt-3">
          {renderContentEditor()}
        </TabsContent>
      </Tabs>
    );
  };

  const visibleSections = sectionOrder.filter(s => s.visible);
  const hasRow1 = row1Keys.some(k => isVisible(k));
  const hasRow2 = row2Keys.some(k => isVisible(k));
  const orderedStandalone = visibleSections.filter(s => standaloneKeys.includes(s.key));

  const previewWidth = deviceView === 'mobile' ? 'max-w-[360px]' : deviceView === 'tablet' ? 'max-w-[600px]' : 'max-w-full';

  const saveAllKeys: (keyof WebsiteSettings)[] = [
    'section_order', 'sections', 'principal_name', 'principal_title_bn', 'principal_title_en',
    'principal_message_bn', 'principal_message_en', 'principal_photo_url',
    'admin_name', 'admin_title_bn', 'admin_title_en', 'admin_message_bn', 'admin_message_en',
    'admin_photo_url', 'admin_email', 'admin_phone',
    'hero_title_bn', 'hero_title_en', 'hero_subtitle_bn', 'hero_subtitle_en', 'hero_bg_image_url',
    'stat_students', 'stat_teachers', 'stat_years'
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-0 border rounded-xl overflow-hidden bg-background" style={{ height: 'calc(100vh - 200px)', minHeight: '520px' }}>
      {/* ===== LEFT SIDEBAR: Section List ===== */}
      <div className="w-full lg:w-[220px] border-b lg:border-b-0 lg:border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-2 border-b flex items-center justify-between">
          <h3 className="text-xs font-bold flex items-center gap-1">
            <Layout className="w-3.5 h-3.5 text-primary" />
            {bn ? 'সেকশন' : 'Sections'}
          </h3>
          <Button size="sm" className="h-6 text-[10px] bg-primary text-primary-foreground" onClick={() => onSave(saveAllKeys)} disabled={saving}>
            <Save className="w-3 h-3 mr-0.5" /> {bn ? 'সেভ' : 'Save'}
          </Button>
        </div>

        {/* Device Toggle */}
        <div className="px-2 py-1.5 border-b flex items-center justify-center gap-0.5">
          {[
            { key: 'desktop' as DeviceView, icon: Monitor },
            { key: 'tablet' as DeviceView, icon: Tablet },
            { key: 'mobile' as DeviceView, icon: Smartphone },
          ].map(d => (
            <Button key={d.key} variant={deviceView === d.key ? 'default' : 'ghost'} size="sm"
              className={`h-6 w-8 p-0 ${deviceView === d.key ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setDeviceView(d.key)}>
              <d.icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>

        {/* Section List */}
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {sectionOrder.map((section, index) => (
              <div
                key={section.key}
                className={`flex items-center gap-1 px-1.5 py-1.5 rounded cursor-pointer transition-all text-xs group
                  ${selectedSection === section.key ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'}
                  ${!section.visible ? 'opacity-40' : ''}`}
                onClick={() => setSelectedSection(section.key)}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                <span className="text-sm shrink-0">{section.icon}</span>
                <span className="flex-1 truncate text-[11px] font-medium">
                  {bn ? section.label_bn : section.label_en}
                </span>
                <div className="flex items-center gap-0 shrink-0 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }} disabled={index === 0}>
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }} disabled={index === sectionOrder.length - 1}>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm"
                  className={`h-5 w-5 p-0 shrink-0 ${section.visible ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(index); }}>
                  {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ===== CENTER: Live Preview ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
        <div className="px-3 py-1.5 border-b flex items-center justify-between bg-muted/10">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {deviceView === 'mobile' ? '360px' : deviceView === 'tablet' ? '600px' : '100%'}
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className={`mx-auto p-3 ${previewWidth}`}>
            {/* Preview Header */}
            <div className="bg-primary text-primary-foreground rounded-t-lg px-3 py-1.5 flex items-center justify-between text-[9px]" onClick={() => setSelectedSection(null)}>
              <div className="flex items-center gap-1">
                <Phone className="w-2.5 h-2.5" /> {form.phone}
                <Mail className="w-2.5 h-2.5 ml-2" /> {form.email}
              </div>
              <span className="text-[8px]">{bn ? 'বাংলা | EN' : 'BN | English'}</span>
            </div>
            <div className="bg-card border-x px-3 py-2 flex items-center gap-2" onClick={() => setSelectedSection(null)}>
              {form.logo_url ? (
                <img src={form.logo_url} className="w-7 h-7 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div>
                <div className="text-[11px] font-bold leading-tight">{form.institution_name}</div>
                <div className="text-[8px] text-muted-foreground">{form.institution_name_en}</div>
              </div>
            </div>

            {/* Row 1 */}
            {hasRow1 && (
              <div className={`grid gap-1.5 border-x px-2 py-2 ${
                deviceView === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'
              }`}>
                {isVisible('principalMessage') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('principalMessage')}</div>}
                {isVisible('banner') && <div className={deviceView === 'mobile' ? '' : 'col-span-6'}>{renderPreviewSection('banner')}</div>}
                {isVisible('adminMessage') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('adminMessage')}</div>}
              </div>
            )}

            {/* Row 2 */}
            {hasRow2 && (
              <div className={`grid gap-1.5 border-x px-2 py-2 ${
                deviceView === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'
              }`}>
                {isVisible('infoLinks') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('infoLinks')}</div>}
                {isVisible('latestNotice') && <div className={deviceView === 'mobile' ? '' : 'col-span-6'}>{renderPreviewSection('latestNotice')}</div>}
                {isVisible('admissionButtons') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('admissionButtons')}</div>}
              </div>
            )}

            {/* Standalone */}
            <div className="border-x px-2 py-1">
              {orderedStandalone.map(s => renderPreviewSection(s.key))}
            </div>

            {/* Preview Footer */}
            <div className="bg-primary text-primary-foreground rounded-b-lg px-3 py-2 text-center" onClick={() => setSelectedSection(null)}>
              <div className="text-[9px] font-bold">{form.institution_name}</div>
              <div className="text-[8px] opacity-60 mt-0.5">© {new Date().getFullYear()} {bn ? 'সর্বস্বত্ব সংরক্ষিত' : 'All rights reserved'}</div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ===== RIGHT PANEL: Customization ===== */}
      {selectedSection && selectedConfig && selectedStyle ? (
        <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l bg-muted/10 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">{selectedConfig.icon}</span>
              <span className="text-xs font-bold truncate">{bn ? selectedConfig.label_bn : selectedConfig.label_en}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => resetSectionStyle(selectedSection)}>
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedSection(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {renderStyleEditor()}
            </div>
          </ScrollArea>
          <div className="p-2 border-t">
            <Button size="sm" className="w-full h-7 text-xs bg-primary text-primary-foreground" onClick={() => onSave(saveAllKeys)} disabled={saving}>
              <Save className="w-3 h-3 mr-1" /> {bn ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l bg-muted/10 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Settings2 className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs font-bold">{bn ? 'সেকশন নির্বাচন করুন' : 'Select a Section'}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {bn ? 'প্রিভিউ বা সাইডবার থেকে ক্লিক করুন' : 'Click on preview or sidebar'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsitePageBuilder;
