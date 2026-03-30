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
  Bell, ArrowRight, Calendar, MapPin, Users, BookOpen, Award, Phone, Mail, Image,
  Pencil, Plus, Trash2, Check, Globe, Facebook, Youtube, Link2
} from 'lucide-react';
import { HomeSectionConfig, WebsiteSettings, ALL_SECTION_CONFIGS, SectionStyleConfig, DEFAULT_SECTION_STYLE, HomeSectionKey, GalleryItem, SocialLink, FooterLink } from '@/hooks/useWebsiteSettings';
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
type SpecialSection = 'header' | 'footer' | null;

const WebsitePageBuilder = ({ form, setForm, language, saving, onSave }: Props) => {
  const bn = language === 'bn';
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [specialSection, setSpecialSection] = useState<SpecialSection>(null);
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelBn, setEditLabelBn] = useState('');
  const [editLabelEn, setEditLabelEn] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionBn, setNewSectionBn] = useState('');
  const [newSectionEn, setNewSectionEn] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState('📄');

  const sectionOrder = form.section_order || ALL_SECTION_CONFIGS;

  const selectSection = (key: string) => {
    setSelectedSection(key);
    setSpecialSection(null);
  };

  const selectSpecial = (s: SpecialSection) => {
    setSpecialSection(s);
    setSelectedSection(null);
  };

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
      if (key in newSections) (newSections as any)[key] = newOrder[index].visible;
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

  const updateHeaderStyle = (prop: string, value: any) => {
    setForm(prev => prev ? { ...prev, header_style: { ...prev.header_style, [prop]: value } } : prev);
  };

  const updateNavStyle = (prop: string, value: any) => {
    setForm(prev => prev ? { ...prev, nav_style: { ...prev.nav_style, [prop]: value } } : prev);
  };

  const updateFooterStyle = (prop: string, value: any) => {
    setForm(prev => prev ? { ...prev, footer_style: { ...prev.footer_style, [prop]: value } } : prev);
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

  const startEditLabel = (key: string) => {
    const section = sectionOrder.find(s => s.key === key);
    if (!section) return;
    setEditingLabel(key);
    setEditLabelBn(section.label_bn);
    setEditLabelEn(section.label_en);
  };

  const saveLabel = () => {
    if (!editingLabel) return;
    setForm(prev => {
      if (!prev) return prev;
      const newOrder = [...(prev.section_order || ALL_SECTION_CONFIGS)];
      const idx = newOrder.findIndex(s => s.key === editingLabel);
      if (idx === -1) return prev;
      newOrder[idx] = { ...newOrder[idx], label_bn: editLabelBn, label_en: editLabelEn };
      return { ...prev, section_order: newOrder };
    });
    setEditingLabel(null);
  };

  const addCustomSection = () => {
    if (!newSectionBn.trim() && !newSectionEn.trim()) return;
    const key = `custom_${Date.now()}` as HomeSectionKey;
    const newSection: HomeSectionConfig = { key, visible: true, label_bn: newSectionBn || newSectionEn, label_en: newSectionEn || newSectionBn, icon: newSectionIcon };
    setForm(prev => prev ? { ...prev, section_order: [...(prev.section_order || ALL_SECTION_CONFIGS), newSection] } : prev);
    setNewSectionBn(''); setNewSectionEn(''); setNewSectionIcon('📄'); setShowAddSection(false);
  };

  const removeSection = (key: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const newOrder = (prev.section_order || ALL_SECTION_CONFIGS).filter(s => s.key !== key);
      const newSections = { ...prev.sections };
      if (key in newSections) (newSections as any)[key] = false;
      return { ...prev, section_order: newOrder, sections: newSections };
    });
    if (selectedSection === key) setSelectedSection(null);
  };

  const selectedConfig = sectionOrder.find(s => s.key === selectedSection);
  const selectedStyle = selectedSection ? getStyle(selectedSection) : null;

  // ===== HELPERS =====
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

  const sliderField = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit = 'px') => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="text-[11px] font-mono text-primary">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="w-full" />
    </div>
  );

  const isVisible = (key: HomeSectionKey) => sectionOrder.find(s => s.key === key)?.visible;

  // ===== GALLERY CRUD =====
  const addGalleryItem = () => {
    const items = [...(form.gallery_items || [])];
    items.push({ title_bn: '', title_en: '', image_url: '', sort_order: items.length + 1 });
    updateField('gallery_items', items);
  };
  const removeGalleryItem = (idx: number) => {
    updateField('gallery_items', (form.gallery_items || []).filter((_, i) => i !== idx));
  };
  const updateGalleryItem = (idx: number, prop: keyof GalleryItem, value: any) => {
    const items = [...(form.gallery_items || [])];
    items[idx] = { ...items[idx], [prop]: value };
    updateField('gallery_items', items);
  };

  // ===== SOCIAL LINKS CRUD =====
  const addSocialLink = () => {
    const links = [...(form.social_links || [])];
    links.push({ platform: '', url: '', icon: 'globe' });
    updateField('social_links', links);
  };
  const removeSocialLink = (idx: number) => {
    updateField('social_links', (form.social_links || []).filter((_, i) => i !== idx));
  };
  const updateSocialLink = (idx: number, prop: keyof SocialLink, value: string) => {
    const links = [...(form.social_links || [])];
    links[idx] = { ...links[idx], [prop]: value };
    updateField('social_links', links);
  };

  // ===== FOOTER LINKS CRUD =====
  const addFooterLink = () => {
    const links = [...(form.footer_links || [])];
    links.push({ label_bn: '', label_en: '', url: '' });
    updateField('footer_links', links);
  };
  const removeFooterLink = (idx: number) => {
    updateField('footer_links', (form.footer_links || []).filter((_, i) => i !== idx));
  };
  const updateFooterLink = (idx: number, prop: keyof FooterLink, value: string) => {
    const links = [...(form.footer_links || [])];
    links[idx] = { ...links[idx], [prop]: value };
    updateField('footer_links', links);
  };

  // ===== DIVISIONS CRUD =====
  const addDivision = () => {
    const divs = [...(form.divisions || [])];
    divs.push({ name: '', nameEn: '', icon: '📚' });
    updateField('divisions', divs);
  };
  const removeDivision = (idx: number) => {
    updateField('divisions', (form.divisions || []).filter((_, i) => i !== idx));
  };
  const updateDivision = (idx: number, prop: string, value: string) => {
    const divs = [...(form.divisions || [])];
    divs[idx] = { ...divs[idx], [prop]: value };
    updateField('divisions', divs);
  };

  // ===== PREVIEW HELPERS =====
  const getSectionInlineStyle = (key: HomeSectionKey): React.CSSProperties => {
    const st = getStyle(key);
    const style: React.CSSProperties = {};
    if (st.bgColor) style.backgroundColor = st.bgColor;
    if (st.textColor) style.color = st.textColor;
    if (st.padding) style.padding = `${st.padding * 0.4}px`;
    if (st.margin) style.marginTop = `${st.margin * 0.4}px`;
    if (st.borderRadius) style.borderRadius = `${st.borderRadius}px`;
    return style;
  };

  const row1Keys: HomeSectionKey[] = ['principalMessage', 'banner', 'adminMessage'];
  const row2Keys: HomeSectionKey[] = ['infoLinks', 'latestNotice', 'admissionButtons'];
  const standaloneKeys: HomeSectionKey[] = ['latestPosts', 'gallery', 'prayerCalendar', 'stats', 'donation', 'feePayment', 'classInfo', 'teachersList', 'studentInfo'];

  const renderPreviewSection = (key: HomeSectionKey) => {
    const isSelected = selectedSection === key;
    const visible = isVisible(key);
    if (!visible) return null;
    const cfg = sectionOrder.find(s => s.key === key);
    const wrapClass = `relative cursor-pointer transition-all border-2 rounded-md mb-1 ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/30'}`;
    const labelOverlay = (
      <div className={`absolute top-0 left-0 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-br-md ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        {cfg?.icon} {bn ? cfg?.label_bn : cfg?.label_en}
      </div>
    );

    const renderMap: Record<string, () => JSX.Element> = {
      principalMessage: () => (
        <div className="p-2 pt-5 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-1">
            {form.principal_photo_url ? <img src={form.principal_photo_url} className="w-10 h-10 rounded-full object-cover" alt="" /> : <Users className="w-5 h-5 text-primary" />}
          </div>
          <div className="text-[10px] font-bold truncate">{form.principal_name || 'Principal'}</div>
          <div className="text-[8px] text-muted-foreground truncate">{bn ? form.principal_title_bn : form.principal_title_en}</div>
        </div>
      ),
      banner: () => (
        <div className="p-2 pt-5 bg-gradient-to-br from-primary/10 to-accent/10 rounded min-h-[60px] flex flex-col items-center justify-center">
          {form.hero_bg_image_url ? <img src={form.hero_bg_image_url} alt="" className="w-full h-14 object-cover rounded" /> : (
            <><Image className="w-6 h-6 text-primary/40 mb-1" /><div className="text-[10px] font-bold">{bn ? form.hero_title_bn : form.hero_title_en}</div><div className="text-[8px] text-muted-foreground">{bn ? form.hero_subtitle_bn : form.hero_subtitle_en}</div></>
          )}
        </div>
      ),
      adminMessage: () => (
        <div className="p-2 pt-5 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-1">
            {form.admin_photo_url ? <img src={form.admin_photo_url} className="w-10 h-10 rounded-full object-cover" alt="" /> : <Users className="w-5 h-5 text-accent" />}
          </div>
          <div className="text-[10px] font-bold truncate">{form.admin_name || 'Admin'}</div>
          <div className="text-[8px] text-muted-foreground truncate">{bn ? form.admin_title_bn : form.admin_title_en}</div>
        </div>
      ),
      infoLinks: () => (
        <div className="p-2 pt-5 space-y-1">
          {['🔗 Link 1', '🔗 Link 2', '🔗 Link 3'].map((l, i) => <div key={i} className="text-[9px] bg-muted/50 rounded px-2 py-1">{l}</div>)}
        </div>
      ),
      latestNotice: () => (
        <div className="p-2 pt-5">
          <div className="bg-primary rounded-t px-2 py-1"><span className="text-[9px] font-bold text-primary-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> {bn ? 'নোটিশ বোর্ড' : 'Notice Board'}</span></div>
          <div className="border border-t-0 rounded-b p-1.5 space-y-1">
            {[1, 2, 3].map(i => <div key={i} className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bell className="w-2.5 h-2.5 text-primary" /></div><div className="h-2 bg-muted rounded flex-1" /></div>)}
          </div>
        </div>
      ),
      admissionButtons: () => (
        <div className="p-2 pt-5 space-y-1">
          <div className="bg-accent px-2 py-1 rounded-t text-center"><span className="text-[9px] font-bold text-accent-foreground flex items-center justify-center gap-1"><GraduationCap className="w-3 h-3" /> {bn ? 'অনলাইন ভর্তি' : 'Admission'}</span></div>
          {(form.divisions || []).slice(0, 3).map((d, i) => <div key={i} className="bg-primary text-primary-foreground text-[9px] text-center py-1 rounded font-bold">{bn ? d.name : d.nameEn}</div>)}
        </div>
      ),
      latestPosts: () => (
        <div className="p-2 pt-5">
          <div className="text-[10px] font-bold mb-1">📰 {bn ? 'সর্বশেষ সংবাদ' : 'Latest News'}</div>
          <div className="grid grid-cols-2 gap-1">{[1, 2].map(i => <div key={i} className="border rounded p-1"><div className="h-6 bg-muted rounded mb-1" /><div className="h-2 bg-muted/60 rounded w-3/4" /></div>)}</div>
        </div>
      ),
      gallery: () => (
        <div className="p-2 pt-5">
          <div className="text-[10px] font-bold mb-1">📷 {bn ? 'গ্যালারি' : 'Gallery'}</div>
          <div className="grid grid-cols-4 gap-0.5">
            {(form.gallery_items || []).slice(0, 4).map((g, i) => (
              <div key={i} className="aspect-square bg-muted rounded overflow-hidden">
                {g.image_url ? <img src={g.image_url} className="w-full h-full object-cover" alt="" /> : null}
              </div>
            ))}
          </div>
        </div>
      ),
      prayerCalendar: () => (
        <div className="p-2 pt-5 grid grid-cols-2 gap-1">
          <div className="bg-muted/30 rounded p-1.5 text-center"><div className="text-[9px] font-bold">🕌 {bn ? 'নামাজ' : 'Prayer'}</div><div className="h-4 bg-muted rounded mt-1" /></div>
          <div className="bg-muted/30 rounded p-1.5 text-center"><div className="text-[9px] font-bold">📅 {bn ? 'ক্যালেন্ডার' : 'Calendar'}</div><div className="h-4 bg-muted rounded mt-1" /></div>
        </div>
      ),
      stats: () => (
        <div className="p-2 pt-5 bg-primary/10 rounded">
          <div className="grid grid-cols-3 gap-1 text-center">
            {[{ v: form.stat_students, l: bn ? 'ছাত্র' : 'Students', Icon: Users }, { v: form.stat_teachers, l: bn ? 'শিক্ষক' : 'Teachers', Icon: BookOpen }, { v: form.stat_years, l: bn ? 'বছর' : 'Years', Icon: Award }].map((s, i) => (
              <div key={i} className="p-1"><s.Icon className="w-3 h-3 mx-auto text-primary mb-0.5" /><div className="text-[10px] font-bold">{s.v}</div><div className="text-[8px] text-muted-foreground">{s.l}</div></div>
            ))}
          </div>
        </div>
      ),
    };

    const renderFn = renderMap[key];
    return (
      <div key={key} className={wrapClass} onClick={() => selectSection(key)} style={getSectionInlineStyle(key)}>
        {labelOverlay}
        {renderFn ? renderFn() : (
          <div className="p-2 pt-5 text-center">
            <div className="text-[10px] font-bold">{cfg?.icon} {bn ? cfg?.label_bn : cfg?.label_en}</div>
            <div className="text-[8px] text-muted-foreground">{bn ? 'কন্টেন্ট' : 'Content'}</div>
          </div>
        )}
      </div>
    );
  };

  // ===== HEADER EDITOR =====
  const renderHeaderEditor = () => (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        <h4 className="text-xs font-bold border-b pb-1">{bn ? '🏠 হেডার সেটিংস' : '🏠 Header Settings'}</h4>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold">{bn ? 'প্রতিষ্ঠানের তথ্য' : 'Institution Info'}</Label>
          <Input className="h-7 text-xs bg-background" placeholder={bn ? 'নাম (বাংলা)' : 'Name (BN)'} value={form.institution_name} onChange={e => updateField('institution_name', e.target.value)} />
          <Input className="h-7 text-xs bg-background" placeholder={bn ? 'নাম (ইংরেজি)' : 'Name (EN)'} value={form.institution_name_en} onChange={e => updateField('institution_name_en', e.target.value)} />
          <Input className="h-7 text-xs bg-background" placeholder={bn ? 'ফোন' : 'Phone'} value={form.phone} onChange={e => updateField('phone', e.target.value)} />
          <Input className="h-7 text-xs bg-background" placeholder={bn ? 'ইমেইল' : 'Email'} value={form.email} onChange={e => updateField('email', e.target.value)} />
          <Input className="h-7 text-xs bg-background" placeholder={bn ? 'ঠিকানা' : 'Address'} value={form.address} onChange={e => updateField('address', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold">{bn ? 'লোগো' : 'Logo'}</Label>
          <ImageUpload value={form.logo_url} onChange={(url) => updateField('logo_url', url)} folder="logo" aspectRatio="aspect-square w-16" />
        </div>

        <div className="space-y-2 border-t pt-2">
          <Label className="text-[11px] font-semibold">{bn ? 'টপবার' : 'Topbar'}</Label>
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'টপবার দেখান' : 'Show Topbar'}</span><Switch checked={form.header_style.topbar_visible} onCheckedChange={v => updateHeaderStyle('topbar_visible', v)} /></div>
          {form.header_style.topbar_visible && (
            <>
              <Input className="h-7 text-xs bg-background" placeholder={bn ? 'ঘোষণা (বাংলা)' : 'Announcement (BN)'} value={form.header_style.topbar_announcement_bn} onChange={e => updateHeaderStyle('topbar_announcement_bn', e.target.value)} />
              <Input className="h-7 text-xs bg-background" placeholder={bn ? 'ঘোষণা (ইংরেজি)' : 'Announcement (EN)'} value={form.header_style.topbar_announcement_en} onChange={e => updateHeaderStyle('topbar_announcement_en', e.target.value)} />
              {colorField(bn ? 'টপবার ব্যাকগ্রাউন্ড' : 'Topbar BG', form.header_style.topbar_bg_color, v => updateHeaderStyle('topbar_bg_color', v))}
              {colorField(bn ? 'টপবার টেক্সট' : 'Topbar Text', form.header_style.topbar_text_color, v => updateHeaderStyle('topbar_text_color', v))}
            </>
          )}
        </div>

        <div className="space-y-2 border-t pt-2">
          <Label className="text-[11px] font-semibold">{bn ? 'হেডার স্টাইল' : 'Header Style'}</Label>
          {colorField(bn ? 'হেডার ব্যাকগ্রাউন্ড' : 'Header BG', form.header_style.header_bg_color, v => updateHeaderStyle('header_bg_color', v))}
          {colorField(bn ? 'হেডার টেক্সট' : 'Header Text', form.header_style.header_text_color, v => updateHeaderStyle('header_text_color', v))}
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'বর্ডার' : 'Border'}</span><Switch checked={form.header_style.header_border} onCheckedChange={v => updateHeaderStyle('header_border', v)} /></div>
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'শ্যাডো' : 'Shadow'}</span><Switch checked={form.header_style.header_shadow} onCheckedChange={v => updateHeaderStyle('header_shadow', v)} /></div>
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'স্টিকি' : 'Sticky'}</span><Switch checked={form.header_style.header_sticky} onCheckedChange={v => updateHeaderStyle('header_sticky', v)} /></div>
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'প্রতিষ্ঠানের নাম দেখান' : 'Show Name'}</span><Switch checked={form.header_style.show_institution_name} onCheckedChange={v => updateHeaderStyle('show_institution_name', v)} /></div>
          <div>
            <Label className="text-[11px]">{bn ? 'লোগো সাইজ' : 'Logo Size'}</Label>
            <div className="flex gap-1 mt-1">
              {(['small', 'medium', 'large'] as const).map(s => (
                <Button key={s} size="sm" variant={form.header_style.logo_size === s ? 'default' : 'outline'} className={`h-7 flex-1 text-[10px] ${form.header_style.logo_size === s ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => updateHeaderStyle('logo_size', s)}>{s === 'small' ? (bn ? 'ছোট' : 'S') : s === 'medium' ? (bn ? 'মধ্যম' : 'M') : (bn ? 'বড়' : 'L')}</Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t pt-2">
          <Label className="text-[11px] font-semibold">{bn ? 'নেভিগেশন স্টাইল' : 'Nav Style'}</Label>
          {colorField(bn ? 'নেভ ব্যাকগ্রাউন্ড' : 'Nav BG', form.nav_style.nav_bg_color, v => updateNavStyle('nav_bg_color', v))}
          {colorField(bn ? 'নেভ টেক্সট' : 'Nav Text', form.nav_style.nav_text_color, v => updateNavStyle('nav_text_color', v))}
          {colorField(bn ? 'অ্যাক্টিভ BG' : 'Active BG', form.nav_style.nav_active_bg, v => updateNavStyle('nav_active_bg', v))}
          {colorField(bn ? 'হোভার BG' : 'Hover BG', form.nav_style.nav_hover_bg, v => updateNavStyle('nav_hover_bg', v))}
          <div>
            <Label className="text-[11px]">{bn ? 'স্টাইল' : 'Style'}</Label>
            <div className="flex gap-1 mt-1">
              {(['pills', 'underline', 'flat', 'rounded'] as const).map(s => (
                <Button key={s} size="sm" variant={form.nav_style.nav_style === s ? 'default' : 'outline'} className={`h-7 flex-1 text-[10px] ${form.nav_style.nav_style === s ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => updateNavStyle('nav_style', s)}>{s}</Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );

  // ===== FOOTER EDITOR =====
  const renderFooterEditor = () => (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        <h4 className="text-xs font-bold border-b pb-1">{bn ? '📎 ফুটার সেটিংস' : '📎 Footer Settings'}</h4>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold">{bn ? 'বিবরণ' : 'Description'}</Label>
          <Textarea className="min-h-[40px] text-xs bg-background" value={form.footer_description_bn} onChange={e => updateField('footer_description_bn', e.target.value)} placeholder={bn ? 'বাংলা' : 'BN'} />
          <Textarea className="min-h-[40px] text-xs bg-background" value={form.footer_description_en} onChange={e => updateField('footer_description_en', e.target.value)} placeholder={bn ? 'ইংরেজি' : 'EN'} />
        </div>

        <div className="space-y-2 border-t pt-2">
          <Label className="text-[11px] font-semibold">{bn ? 'ফুটার স্টাইল' : 'Footer Style'}</Label>
          {colorField(bn ? 'ব্যাকগ্রাউন্ড' : 'Background', form.footer_style.footer_bg_color, v => updateFooterStyle('footer_bg_color', v))}
          {colorField(bn ? 'টেক্সট রঙ' : 'Text Color', form.footer_style.footer_text_color, v => updateFooterStyle('footer_text_color', v))}
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'কুইক লিংক' : 'Quick Links'}</span><Switch checked={form.footer_style.show_quick_links} onCheckedChange={v => updateFooterStyle('show_quick_links', v)} /></div>
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'যোগাযোগ' : 'Contact Info'}</span><Switch checked={form.footer_style.show_contact_info} onCheckedChange={v => updateFooterStyle('show_contact_info', v)} /></div>
          <div className="flex items-center justify-between"><span className="text-[11px]">{bn ? 'সোশ্যাল লিংক' : 'Social Links'}</span><Switch checked={form.footer_style.show_social_links} onCheckedChange={v => updateFooterStyle('show_social_links', v)} /></div>
          <div>
            <Label className="text-[11px]">{bn ? 'কলাম সংখ্যা' : 'Columns'}</Label>
            <div className="flex gap-1 mt-1">
              {[2, 3, 4].map(c => (
                <Button key={c} size="sm" variant={form.footer_style.footer_columns === c ? 'default' : 'outline'} className={`h-7 flex-1 text-xs ${form.footer_style.footer_columns === c ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => updateFooterStyle('footer_columns', c)}>{c}</Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t pt-2">
          <Label className="text-[11px] font-semibold">{bn ? 'কপিরাইট' : 'Copyright'}</Label>
          <Input className="h-7 text-xs bg-background" value={form.footer_style.copyright_text_bn} onChange={e => updateFooterStyle('copyright_text_bn', e.target.value)} />
          <Input className="h-7 text-xs bg-background" value={form.footer_style.copyright_text_en} onChange={e => updateFooterStyle('copyright_text_en', e.target.value)} />
        </div>

        {/* Footer Links CRUD */}
        <div className="space-y-2 border-t pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold">{bn ? 'কুইক লিংক' : 'Quick Links'}</Label>
            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addFooterLink}><Plus className="w-3 h-3 mr-0.5" /> {bn ? 'যোগ' : 'Add'}</Button>
          </div>
          {(form.footer_links || []).map((link, idx) => (
            <div key={idx} className="p-2 border rounded space-y-1 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeFooterLink(idx)}><Trash2 className="w-3 h-3" /></Button>
              </div>
              <Input className="h-6 text-[10px] bg-muted/30" placeholder={bn ? 'লেবেল (বাংলা)' : 'Label BN'} value={link.label_bn} onChange={e => updateFooterLink(idx, 'label_bn', e.target.value)} />
              <Input className="h-6 text-[10px] bg-muted/30" placeholder={bn ? 'লেবেল (ইংরেজি)' : 'Label EN'} value={link.label_en} onChange={e => updateFooterLink(idx, 'label_en', e.target.value)} />
              <Input className="h-6 text-[10px] bg-muted/30" placeholder="URL" value={link.url} onChange={e => updateFooterLink(idx, 'url', e.target.value)} />
            </div>
          ))}
        </div>

        {/* Social Links CRUD */}
        <div className="space-y-2 border-t pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold">{bn ? 'সোশ্যাল লিংক' : 'Social Links'}</Label>
            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addSocialLink}><Plus className="w-3 h-3 mr-0.5" /> {bn ? 'যোগ' : 'Add'}</Button>
          </div>
          {(form.social_links || []).map((link, idx) => (
            <div key={idx} className="p-2 border rounded space-y-1 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">{link.platform || `#${idx + 1}`}</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeSocialLink(idx)}><Trash2 className="w-3 h-3" /></Button>
              </div>
              <Input className="h-6 text-[10px] bg-muted/30" placeholder={bn ? 'প্ল্যাটফর্ম' : 'Platform'} value={link.platform} onChange={e => updateSocialLink(idx, 'platform', e.target.value)} />
              <Input className="h-6 text-[10px] bg-muted/30" placeholder="URL" value={link.url} onChange={e => updateSocialLink(idx, 'url', e.target.value)} />
              <Input className="h-6 text-[10px] bg-muted/30" placeholder={bn ? 'আইকন' : 'Icon'} value={link.icon} onChange={e => updateSocialLink(idx, 'icon', e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );

  // ===== CONTENT EDITORS FOR SECTIONS =====
  const renderContentEditor = () => {
    if (!selectedSection) return null;
    switch (selectedSection) {
      case 'principalMessage':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div><Label className="text-[11px]">{bn ? 'নাম' : 'Name'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.principal_name} onChange={e => updateField('principal_name', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-1.5">
              <div><Label className="text-[11px]">{bn ? 'পদবী (BN)' : 'Title (BN)'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.principal_title_bn} onChange={e => updateField('principal_title_bn', e.target.value)} /></div>
              <div><Label className="text-[11px]">{bn ? 'পদবী (EN)' : 'Title (EN)'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.principal_title_en} onChange={e => updateField('principal_title_en', e.target.value)} /></div>
            </div>
            <div><Label className="text-[11px]">{bn ? 'বাণী (BN)' : 'Message (BN)'}</Label><Textarea className="bg-background mt-0.5 min-h-[50px] text-xs" value={form.principal_message_bn} onChange={e => updateField('principal_message_bn', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'বাণী (EN)' : 'Message (EN)'}</Label><Textarea className="bg-background mt-0.5 min-h-[50px] text-xs" value={form.principal_message_en} onChange={e => updateField('principal_message_en', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'ছবি' : 'Photo'}</Label><ImageUpload value={form.principal_photo_url} onChange={(url) => updateField('principal_photo_url', url)} folder="principal" className="mt-0.5" aspectRatio="aspect-square w-16" /></div>
          </div>
        );
      case 'adminMessage':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div className="grid grid-cols-2 gap-1.5">
              <div><Label className="text-[11px]">{bn ? 'নাম' : 'Name'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.admin_name} onChange={e => updateField('admin_name', e.target.value)} /></div>
              <div><Label className="text-[11px]">{bn ? 'পদবী' : 'Title'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.admin_title_bn} onChange={e => updateField('admin_title_bn', e.target.value)} /></div>
            </div>
            <div><Label className="text-[11px]">{bn ? 'বাণী (BN)' : 'Message (BN)'}</Label><Textarea className="bg-background mt-0.5 min-h-[50px] text-xs" value={form.admin_message_bn} onChange={e => updateField('admin_message_bn', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'বাণী (EN)' : 'Message (EN)'}</Label><Textarea className="bg-background mt-0.5 min-h-[50px] text-xs" value={form.admin_message_en} onChange={e => updateField('admin_message_en', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'ছবি' : 'Photo'}</Label><ImageUpload value={form.admin_photo_url} onChange={(url) => updateField('admin_photo_url', url)} folder="admin" className="mt-0.5" aspectRatio="aspect-square w-16" /></div>
          </div>
        );
      case 'banner':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div><Label className="text-[11px]">{bn ? 'শিরোনাম (BN)' : 'Title (BN)'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.hero_title_bn} onChange={e => updateField('hero_title_bn', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'শিরোনাম (EN)' : 'Title (EN)'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.hero_title_en} onChange={e => updateField('hero_title_en', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'সাবটাইটেল (BN)' : 'Subtitle (BN)'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.hero_subtitle_bn} onChange={e => updateField('hero_subtitle_bn', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'সাবটাইটেল (EN)' : 'Subtitle (EN)'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.hero_subtitle_en} onChange={e => updateField('hero_subtitle_en', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'ব্যাকগ্রাউন্ড ছবি' : 'Background Image'}</Label><ImageUpload value={form.hero_bg_image_url} onChange={(url) => updateField('hero_bg_image_url', url)} folder="hero" className="mt-0.5" aspectRatio="aspect-video" /></div>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold border-b pb-1">{bn ? 'পরিসংখ্যান' : 'Statistics'}</h4>
            <div><Label className="text-[11px]">{bn ? 'মোট ছাত্র' : 'Students'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.stat_students} onChange={e => updateField('stat_students', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'শিক্ষক' : 'Teachers'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.stat_teachers} onChange={e => updateField('stat_teachers', e.target.value)} /></div>
            <div><Label className="text-[11px]">{bn ? 'বছর' : 'Years'}</Label><Input className="bg-background mt-0.5 h-7 text-xs" value={form.stat_years} onChange={e => updateField('stat_years', e.target.value)} /></div>
          </div>
        );
      case 'gallery':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b pb-1">
              <h4 className="text-xs font-semibold">{bn ? '📷 গ্যালারি আইটেম' : '📷 Gallery Items'}</h4>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addGalleryItem}><Plus className="w-3 h-3 mr-0.5" /> {bn ? 'যোগ' : 'Add'}</Button>
            </div>
            {(form.gallery_items || []).map((item, idx) => (
              <div key={idx} className="p-2 border rounded space-y-1.5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">#{idx + 1}</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeGalleryItem(idx)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <Input className="h-6 text-[10px] bg-background" placeholder={bn ? 'শিরোনাম (বাংলা)' : 'Title BN'} value={item.title_bn} onChange={e => updateGalleryItem(idx, 'title_bn', e.target.value)} />
                <Input className="h-6 text-[10px] bg-background" placeholder={bn ? 'শিরোনাম (ইংরেজি)' : 'Title EN'} value={item.title_en} onChange={e => updateGalleryItem(idx, 'title_en', e.target.value)} />
                <ImageUpload value={item.image_url} onChange={(url) => updateGalleryItem(idx, 'image_url', url)} folder="gallery" aspectRatio="aspect-video w-full" />
              </div>
            ))}
          </div>
        );
      case 'admissionButtons':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b pb-1">
              <h4 className="text-xs font-semibold">{bn ? '🎓 বিভাগসমূহ' : '🎓 Divisions'}</h4>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addDivision}><Plus className="w-3 h-3 mr-0.5" /> {bn ? 'যোগ' : 'Add'}</Button>
            </div>
            {(form.divisions || []).map((div, idx) => (
              <div key={idx} className="p-2 border rounded space-y-1 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">{div.icon} #{idx + 1}</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeDivision(idx)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <div className="flex gap-1">
                  <Input className="h-6 text-[10px] bg-background w-10" value={div.icon} onChange={e => updateDivision(idx, 'icon', e.target.value)} maxLength={2} />
                  <Input className="h-6 text-[10px] bg-background flex-1" placeholder={bn ? 'নাম (বাংলা)' : 'Name BN'} value={div.name} onChange={e => updateDivision(idx, 'name', e.target.value)} />
                </div>
                <Input className="h-6 text-[10px] bg-background" placeholder={bn ? 'নাম (ইংরেজি)' : 'Name EN'} value={div.nameEn} onChange={e => updateDivision(idx, 'nameEn', e.target.value)} />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="text-[11px] text-muted-foreground p-2 bg-muted/30 rounded">
            {bn ? 'এই সেকশনের কন্টেন্ট ডাটাবেস থেকে স্বয়ংক্রিয় লোড হয়।' : 'Content auto-loaded from database.'}
          </div>
        );
    }
  };

  // ===== SECTION LABEL EDITOR =====
  const renderSectionLabelEditor = () => {
    if (!selectedSection) return null;
    const section = sectionOrder.find(s => s.key === selectedSection);
    if (!section) return null;
    return (
      <div className="space-y-2 mb-3 pb-3 border-b">
        <h4 className="text-xs font-semibold">{bn ? 'সেকশন লেবেল' : 'Section Label'}</h4>
        <div className="grid grid-cols-2 gap-1.5">
          <div><Label className="text-[11px]">{bn ? 'নাম (বাংলা)' : 'Label (BN)'}</Label>
            <Input className="bg-background mt-0.5 h-7 text-xs" value={section.label_bn} onChange={e => {
              setForm(prev => { if (!prev) return prev; const o = [...(prev.section_order || ALL_SECTION_CONFIGS)]; const i = o.findIndex(s => s.key === selectedSection); if (i === -1) return prev; o[i] = { ...o[i], label_bn: e.target.value }; return { ...prev, section_order: o }; });
            }} /></div>
          <div><Label className="text-[11px]">{bn ? 'নাম (ইংরেজি)' : 'Label (EN)'}</Label>
            <Input className="bg-background mt-0.5 h-7 text-xs" value={section.label_en} onChange={e => {
              setForm(prev => { if (!prev) return prev; const o = [...(prev.section_order || ALL_SECTION_CONFIGS)]; const i = o.findIndex(s => s.key === selectedSection); if (i === -1) return prev; o[i] = { ...o[i], label_en: e.target.value }; return { ...prev, section_order: o }; });
            }} /></div>
        </div>
        <div><Label className="text-[11px]">{bn ? 'আইকন' : 'Icon'}</Label>
          <Input className="bg-background mt-0.5 h-7 text-xs w-16" value={section.icon} maxLength={2} onChange={e => {
            setForm(prev => { if (!prev) return prev; const o = [...(prev.section_order || ALL_SECTION_CONFIGS)]; const i = o.findIndex(s => s.key === selectedSection); if (i === -1) return prev; o[i] = { ...o[i], icon: e.target.value }; return { ...prev, section_order: o }; });
          }} /></div>
      </div>
    );
  };

  // ===== STYLE EDITOR (RIGHT PANEL FOR SECTIONS) =====
  const renderStyleEditor = () => {
    if (!selectedSection || !selectedStyle) return null;
    return (
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-8">
          <TabsTrigger value="content" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Settings2 className="w-3 h-3" /></TabsTrigger>
          <TabsTrigger value="layout" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Layout className="w-3 h-3" /></TabsTrigger>
          <TabsTrigger value="style" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Paintbrush className="w-3 h-3" /></TabsTrigger>
          <TabsTrigger value="scroll" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MoveVertical className="w-3 h-3" /></TabsTrigger>
          <TabsTrigger value="marquee" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Play className="w-3 h-3" /></TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-3">
          {renderSectionLabelEditor()}
          {renderContentEditor()}
        </TabsContent>

        <TabsContent value="layout" className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Monitor className="w-3 h-3" /> {bn ? 'ডেস্কটপ কলাম' : 'Desktop Cols'}</Label>
            <div className="flex gap-1">{[1, 2, 3, 4].map(c => <Button key={c} variant={selectedStyle.columns === c ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-xs ${selectedStyle.columns === c ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'columns', c)}>{c}</Button>)}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Smartphone className="w-3 h-3" /> {bn ? 'মোবাইল কলাম' : 'Mobile Cols'}</Label>
            <div className="flex gap-1">{[1, 2].map(c => <Button key={c} variant={selectedStyle.columnsMobile === c ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-xs ${selectedStyle.columnsMobile === c ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'columnsMobile', c)}>{c}</Button>)}</div>
          </div>
          {sliderField(bn ? 'গ্যাপ' : 'Gap', selectedStyle.gap, 0, 48, 4, v => updateSectionStyle(selectedSection, 'gap', v))}
          {sliderField(bn ? 'প্যাডিং' : 'Padding', selectedStyle.padding, 0, 80, 4, v => updateSectionStyle(selectedSection, 'padding', v))}
          {sliderField(bn ? 'মার্জিন' : 'Margin', selectedStyle.margin, 0, 80, 4, v => updateSectionStyle(selectedSection, 'margin', v))}
          {sliderField(bn ? 'রেডিয়াস' : 'Radius', selectedStyle.borderRadius, 0, 32, 2, v => updateSectionStyle(selectedSection, 'borderRadius', v))}
          <div className="flex gap-1">
            {(['full', 'boxed'] as const).map(w => <Button key={w} variant={selectedStyle.width === w ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-xs ${selectedStyle.width === w ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'width', w)}>{w === 'full' ? (bn ? 'পূর্ণ' : 'Full') : (bn ? 'বক্সড' : 'Boxed')}</Button>)}
          </div>
        </TabsContent>

        <TabsContent value="style" className="mt-3 space-y-3">
          {colorField(bn ? 'ব্যাকগ্রাউন্ড' : 'Background', selectedStyle.bgColor, v => updateSectionStyle(selectedSection, 'bgColor', v))}
          {colorField(bn ? 'টেক্সট রঙ' : 'Text Color', selectedStyle.textColor, v => updateSectionStyle(selectedSection, 'textColor', v))}
          {sliderField(bn ? 'হেডিং সাইজ' : 'Heading Size', selectedStyle.headingFontSize, 12, 80, 1, v => updateSectionStyle(selectedSection, 'headingFontSize', v))}
          {sliderField(bn ? 'বডি সাইজ' : 'Body Size', selectedStyle.bodyFontSize, 10, 36, 1, v => updateSectionStyle(selectedSection, 'bodyFontSize', v))}
          <div className="flex gap-1">
            <Button variant={selectedStyle.headingBold ? 'default' : 'outline'} size="sm" className={`h-7 ${selectedStyle.headingBold ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'headingBold', !selectedStyle.headingBold)}><Bold className="w-3 h-3" /></Button>
            <Button variant={selectedStyle.headingItalic ? 'default' : 'outline'} size="sm" className={`h-7 ${selectedStyle.headingItalic ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'headingItalic', !selectedStyle.headingItalic)}><Italic className="w-3 h-3" /></Button>
            {[{ val: 'left' as const, icon: AlignLeft }, { val: 'center' as const, icon: AlignCenter }, { val: 'right' as const, icon: AlignRight }].map(a => (
              <Button key={a.val} variant={selectedStyle.textAlign === a.val ? 'default' : 'outline'} size="sm" className={`h-7 ${selectedStyle.textAlign === a.val ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'textAlign', a.val)}><a.icon className="w-3 h-3" /></Button>
            ))}
          </div>
          <div className="border-t pt-2">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1.5"><Smartphone className="w-3 h-3" /> {bn ? 'মোবাইল ফন্ট' : 'Mobile Font'}</Label>
            {sliderField(bn ? 'মোবাইল হেডিং' : 'Mobile Heading', selectedStyle.headingFontSizeMobile, 12, 48, 1, v => updateSectionStyle(selectedSection, 'headingFontSizeMobile', v))}
            {sliderField(bn ? 'মোবাইল বডি' : 'Mobile Body', selectedStyle.bodyFontSizeMobile, 10, 24, 1, v => updateSectionStyle(selectedSection, 'bodyFontSizeMobile', v))}
          </div>
        </TabsContent>

        <TabsContent value="scroll" className="mt-3 space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-secondary/30"><span className="text-[11px] font-medium">{bn ? 'নির্দিষ্ট উচ্চতা' : 'Fixed Height'}</span><Switch checked={selectedStyle.fixedHeight} onCheckedChange={v => updateSectionStyle(selectedSection, 'fixedHeight', v)} /></div>
          {selectedStyle.fixedHeight && sliderField(bn ? 'উচ্চতা' : 'Height', selectedStyle.height, 100, 800, 10, v => updateSectionStyle(selectedSection, 'height', v))}
          <div className="flex gap-1">{(['auto', 'scroll', 'hidden'] as const).map(o => <Button key={o} variant={selectedStyle.overflow === o ? 'default' : 'outline'} size="sm" className={`h-7 flex-1 text-[10px] ${selectedStyle.overflow === o ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'overflow', o)}>{o}</Button>)}</div>
          {colorField(bn ? 'ট্র্যাক রঙ' : 'Track Color', selectedStyle.scrollbarTrackColor, v => updateSectionStyle(selectedSection, 'scrollbarTrackColor', v))}
          {colorField(bn ? 'থাম্ব রঙ' : 'Thumb Color', selectedStyle.scrollbarThumbColor, v => updateSectionStyle(selectedSection, 'scrollbarThumbColor', v))}
        </TabsContent>

        <TabsContent value="marquee" className="mt-3 space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-secondary/30"><span className="text-[11px] font-medium">{bn ? 'অটো-স্ক্রল' : 'Auto-Scroll'}</span><Switch checked={selectedStyle.autoScroll} onCheckedChange={v => updateSectionStyle(selectedSection, 'autoScroll', v)} /></div>
          {selectedStyle.autoScroll && (
            <>
              <div className="grid grid-cols-2 gap-1">
                {[{ val: 'ltr', label: bn ? 'বাম→ডান' : 'L→R' }, { val: 'rtl', label: bn ? 'ডান→বাম' : 'R→L' }, { val: 'ttb', label: bn ? 'উপর→নিচ' : 'T→B' }, { val: 'btt', label: bn ? 'নিচ→উপর' : 'B→T' }].map(d => (
                  <Button key={d.val} variant={selectedStyle.scrollDirection === d.val ? 'default' : 'outline'} size="sm" className={`h-7 text-[10px] ${selectedStyle.scrollDirection === d.val ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => updateSectionStyle(selectedSection, 'scrollDirection', d.val)}>{d.label}</Button>
                ))}
              </div>
              {sliderField(bn ? 'গতি' : 'Speed', selectedStyle.scrollSpeed, 1, 10, 1, v => updateSectionStyle(selectedSection, 'scrollSpeed', v), '')}
              <div className="flex items-center justify-between p-2 rounded bg-secondary/30"><span className="text-[11px] font-medium">{bn ? 'হোভারে থামবে' : 'Pause on Hover'}</span><Switch checked={selectedStyle.pauseOnHover} onCheckedChange={v => updateSectionStyle(selectedSection, 'pauseOnHover', v)} /></div>
            </>
          )}
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
    'stat_students', 'stat_teachers', 'stat_years',
    'institution_name', 'institution_name_en', 'address', 'phone', 'email', 'logo_url',
    'header_style', 'nav_style', 'footer_style',
    'footer_description_bn', 'footer_description_en', 'footer_links', 'social_links',
    'gallery_items', 'divisions',
  ];

  const isHeaderSelected = specialSection === 'header';
  const isFooterSelected = specialSection === 'footer';

  return (
    <div className="flex flex-col lg:flex-row gap-0 border rounded-xl overflow-hidden bg-background" style={{ height: 'calc(100vh - 200px)', minHeight: '520px' }}>
      {/* ===== LEFT SIDEBAR ===== */}
      <div className="w-full lg:w-[220px] border-b lg:border-b-0 lg:border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-2 border-b flex items-center justify-between">
          <h3 className="text-xs font-bold flex items-center gap-1"><Layout className="w-3.5 h-3.5 text-primary" /> {bn ? 'সেকশন' : 'Sections'}</h3>
          <Button size="sm" className="h-6 text-[10px] bg-primary text-primary-foreground" onClick={() => onSave(saveAllKeys)} disabled={saving}><Save className="w-3 h-3 mr-0.5" /> {bn ? 'সেভ' : 'Save'}</Button>
        </div>
        <div className="px-2 py-1.5 border-b flex items-center justify-center gap-0.5">
          {[{ key: 'desktop' as DeviceView, icon: Monitor }, { key: 'tablet' as DeviceView, icon: Tablet }, { key: 'mobile' as DeviceView, icon: Smartphone }].map(d => (
            <Button key={d.key} variant={deviceView === d.key ? 'default' : 'ghost'} size="sm" className={`h-6 w-8 p-0 ${deviceView === d.key ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setDeviceView(d.key)}><d.icon className="w-3.5 h-3.5" /></Button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {/* Header shortcut */}
            <div className={`flex items-center gap-1 px-1.5 py-1.5 rounded cursor-pointer transition-all text-xs ${isHeaderSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'}`}
              onClick={() => selectSpecial('header')}>
              <PanelTop className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="flex-1 text-[11px] font-medium">{bn ? '🏠 হেডার ও নেভিগেশন' : '🏠 Header & Nav'}</span>
            </div>

            {/* Sections */}
            {sectionOrder.map((section, index) => (
              <div key={section.key}
                className={`flex items-center gap-1 px-1.5 py-1.5 rounded cursor-pointer transition-all text-xs group
                  ${selectedSection === section.key ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'}
                  ${!section.visible ? 'opacity-40' : ''}`}
                onClick={() => selectSection(section.key)}>
                <GripVertical className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                <span className="text-sm shrink-0">{section.icon}</span>
                {editingLabel === section.key ? (
                  <div className="flex-1 flex items-center gap-1 min-w-0" onClick={e => e.stopPropagation()}>
                    <Input className="h-5 text-[10px] bg-background px-1 flex-1 min-w-0" value={bn ? editLabelBn : editLabelEn}
                      onChange={e => bn ? setEditLabelBn(e.target.value) : setEditLabelEn(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveLabel()} autoFocus />
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-green-600" onClick={saveLabel}><Check className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditingLabel(null)}><X className="w-3 h-3" /></Button>
                  </div>
                ) : (
                  <span className="flex-1 truncate text-[11px] font-medium">{bn ? section.label_bn : section.label_en}</span>
                )}
                <div className="flex items-center gap-0 shrink-0 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={e => { e.stopPropagation(); startEditLabel(section.key); }}><Pencil className="w-2.5 h-2.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={e => { e.stopPropagation(); moveSection(index, 'up'); }} disabled={index === 0}><ChevronUp className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={e => { e.stopPropagation(); moveSection(index, 'down'); }} disabled={index === sectionOrder.length - 1}><ChevronDown className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); removeSection(section.key); }}><Trash2 className="w-2.5 h-2.5" /></Button>
                </div>
                <Button variant="ghost" size="sm" className={`h-5 w-5 p-0 shrink-0 ${section.visible ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={e => { e.stopPropagation(); toggleVisibility(index); }}>{section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</Button>
              </div>
            ))}

            {showAddSection ? (
              <div className="p-2 border border-dashed border-primary/30 rounded-lg space-y-1.5 mt-1" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <Input className="h-6 text-[10px] bg-background px-1.5 w-10" value={newSectionIcon} onChange={e => setNewSectionIcon(e.target.value)} maxLength={2} />
                  <Input className="h-6 text-[10px] bg-background px-1.5 flex-1" value={newSectionBn} onChange={e => setNewSectionBn(e.target.value)} placeholder={bn ? 'নাম (বাংলা)' : 'Name (BN)'} />
                </div>
                <Input className="h-6 text-[10px] bg-background px-1.5" value={newSectionEn} onChange={e => setNewSectionEn(e.target.value)} placeholder={bn ? 'নাম (ইংরেজি)' : 'Name (EN)'} />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-[10px] flex-1 bg-primary text-primary-foreground" onClick={addCustomSection}><Plus className="w-3 h-3 mr-0.5" /> {bn ? 'যোগ' : 'Add'}</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setShowAddSection(false)}><X className="w-3 h-3" /></Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full h-7 text-[10px] mt-1 border-dashed" onClick={() => setShowAddSection(true)}><Plus className="w-3 h-3 mr-0.5" /> {bn ? 'নতুন সেকশন' : 'Add Section'}</Button>
            )}

            {/* Footer shortcut */}
            <div className={`flex items-center gap-1 px-1.5 py-1.5 rounded cursor-pointer transition-all text-xs mt-1 ${isFooterSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'}`}
              onClick={() => selectSpecial('footer')}>
              <PanelBottom className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="flex-1 text-[11px] font-medium">{bn ? '📎 ফুটার' : '📎 Footer'}</span>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ===== CENTER: Live Preview ===== */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
        <div className="px-3 py-1.5 border-b flex items-center justify-between bg-muted/10">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}</span>
          <span className="text-[10px] text-muted-foreground">{deviceView === 'mobile' ? '360px' : deviceView === 'tablet' ? '600px' : '100%'}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className={`mx-auto p-3 ${previewWidth}`}>
            {/* Preview Header */}
            <div className={`rounded-t-lg overflow-hidden cursor-pointer border-2 ${isHeaderSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/30'}`} onClick={() => selectSpecial('header')}>
              <div className="bg-primary text-primary-foreground px-3 py-1.5 flex items-center justify-between text-[9px]" style={{ backgroundColor: form.header_style.topbar_bg_color || undefined, color: form.header_style.topbar_text_color || undefined }}>
                <div className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {form.phone} <Mail className="w-2.5 h-2.5 ml-2" /> {form.email}</div>
                <span className="text-[8px]">{form.header_style.topbar_announcement_bn || (bn ? 'বাংলা | EN' : 'BN | English')}</span>
              </div>
              <div className="bg-card border-x px-3 py-2 flex items-center gap-2" style={{ backgroundColor: form.header_style.header_bg_color || undefined, color: form.header_style.header_text_color || undefined }}>
                {form.logo_url ? <img src={form.logo_url} className="w-7 h-7 rounded-full object-cover" alt="" /> : <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"><GraduationCap className="w-4 h-4 text-primary-foreground" /></div>}
                <div>
                  <div className="text-[11px] font-bold leading-tight">{form.institution_name}</div>
                  {form.header_style.show_institution_name_en && <div className="text-[8px] text-muted-foreground">{form.institution_name_en}</div>}
                </div>
              </div>
              <div className="absolute top-0 left-0 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-br-md bg-muted text-muted-foreground">🏠 Header</div>
            </div>

            {/* Row 1 */}
            {hasRow1 && (
              <div className={`grid gap-1.5 border-x px-2 py-2 ${deviceView === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'}`}>
                {isVisible('principalMessage') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('principalMessage')}</div>}
                {isVisible('banner') && <div className={deviceView === 'mobile' ? '' : 'col-span-6'}>{renderPreviewSection('banner')}</div>}
                {isVisible('adminMessage') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('adminMessage')}</div>}
              </div>
            )}

            {/* Row 2 */}
            {hasRow2 && (
              <div className={`grid gap-1.5 border-x px-2 py-2 ${deviceView === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'}`}>
                {isVisible('infoLinks') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('infoLinks')}</div>}
                {isVisible('latestNotice') && <div className={deviceView === 'mobile' ? '' : 'col-span-6'}>{renderPreviewSection('latestNotice')}</div>}
                {isVisible('admissionButtons') && <div className={deviceView === 'mobile' ? '' : 'col-span-3'}>{renderPreviewSection('admissionButtons')}</div>}
              </div>
            )}

            {/* Standalone */}
            <div className="border-x px-2 py-1">{orderedStandalone.map(s => renderPreviewSection(s.key))}</div>

            {/* Preview Footer */}
            <div className={`rounded-b-lg overflow-hidden cursor-pointer border-2 ${isFooterSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/30'}`} onClick={() => selectSpecial('footer')}
              style={{ backgroundColor: form.footer_style.footer_bg_color || undefined, color: form.footer_style.footer_text_color || undefined }}>
              <div className="bg-primary text-primary-foreground px-3 py-2">
                <div className="grid grid-cols-3 gap-2 text-[8px] mb-2">
                  <div><div className="font-bold text-[9px] mb-1">{form.institution_name}</div><div className="opacity-70 leading-relaxed">{bn ? form.footer_description_bn : form.footer_description_en}</div></div>
                  {form.footer_style.show_quick_links && <div><div className="font-bold text-[9px] mb-1">{bn ? 'কুইক লিংক' : 'Quick Links'}</div>{(form.footer_links || []).slice(0, 3).map((l, i) => <div key={i} className="opacity-70">{bn ? l.label_bn : l.label_en}</div>)}</div>}
                  {form.footer_style.show_contact_info && <div><div className="font-bold text-[9px] mb-1">{bn ? 'যোগাযোগ' : 'Contact'}</div><div className="opacity-70">{form.phone}</div><div className="opacity-70">{form.email}</div></div>}
                </div>
                <div className="text-center border-t border-primary-foreground/20 pt-1">
                  {form.footer_style.show_social_links && (form.social_links || []).length > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {(form.social_links || []).map((s, i) => <span key={i} className="text-[8px] opacity-70">{s.platform}</span>)}
                    </div>
                  )}
                  <div className="text-[8px] opacity-60">© {new Date().getFullYear()} {form.institution_name}</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      {specialSection === 'header' ? (
        <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l bg-muted/10 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs font-bold">🏠 {bn ? 'হেডার ও নেভিগেশন' : 'Header & Navigation'}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSpecialSection(null)}><X className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          {renderHeaderEditor()}
          <div className="p-2 border-t"><Button size="sm" className="w-full h-7 text-xs bg-primary text-primary-foreground" onClick={() => onSave(saveAllKeys)} disabled={saving}><Save className="w-3 h-3 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}</Button></div>
        </div>
      ) : specialSection === 'footer' ? (
        <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l bg-muted/10 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs font-bold">📎 {bn ? 'ফুটার' : 'Footer'}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSpecialSection(null)}><X className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          {renderFooterEditor()}
          <div className="p-2 border-t"><Button size="sm" className="w-full h-7 text-xs bg-primary text-primary-foreground" onClick={() => onSave(saveAllKeys)} disabled={saving}><Save className="w-3 h-3 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}</Button></div>
        </div>
      ) : selectedSection && selectedConfig && selectedStyle ? (
        <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l bg-muted/10 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0"><span className="text-sm">{selectedConfig.icon}</span><span className="text-xs font-bold truncate">{bn ? selectedConfig.label_bn : selectedConfig.label_en}</span></div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => resetSectionStyle(selectedSection)}><RotateCcw className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedSection(null)}><X className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          <ScrollArea className="flex-1"><div className="p-3">{renderStyleEditor()}</div></ScrollArea>
          <div className="p-2 border-t"><Button size="sm" className="w-full h-7 text-xs bg-primary text-primary-foreground" onClick={() => onSave(saveAllKeys)} disabled={saving}><Save className="w-3 h-3 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}</Button></div>
        </div>
      ) : (
        <div className="w-full lg:w-[280px] border-t lg:border-t-0 lg:border-l bg-muted/10 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"><Settings2 className="w-6 h-6 text-primary" /></div>
            <p className="text-xs font-bold">{bn ? 'সেকশন নির্বাচন করুন' : 'Select a Section'}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{bn ? 'প্রিভিউ বা সাইডবার থেকে ক্লিক করুন' : 'Click on preview or sidebar'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsitePageBuilder;
