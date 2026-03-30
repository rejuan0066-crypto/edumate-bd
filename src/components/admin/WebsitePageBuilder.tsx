import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Save, Eye, EyeOff, GripVertical, Settings2, ChevronUp, ChevronDown,
  Layout, Paintbrush, ArrowUpDown, Smartphone, Tablet, Monitor,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, RotateCcw,
  Columns2, Columns3, Columns4, Square, MoveVertical, Play
} from 'lucide-react';
import { HomeSectionConfig, WebsiteSettings, ALL_SECTION_CONFIGS, SectionStyleConfig, DEFAULT_SECTION_STYLE } from '@/hooks/useWebsiteSettings';
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

  // Color picker helper
  const colorField = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded border cursor-pointer p-0.5" />
        <Input className="h-8 text-xs bg-background flex-1" value={value} onChange={e => onChange(e.target.value)} placeholder="auto" />
        {value && <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onChange('')}><RotateCcw className="w-3 h-3" /></Button>}
      </div>
    </div>
  );

  // Slider helper
  const sliderField = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit: string = 'px') => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono text-primary">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="w-full" />
    </div>
  );

  // Content editor per section
  const renderContentEditor = () => {
    if (!selectedSection) return null;
    switch (selectedSection) {
      case 'principalMessage':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div>
              <Label className="text-xs">{bn ? 'অধ্যক্ষের নাম' : 'Principal Name'}</Label>
              <Input className="bg-background mt-1 h-8 text-sm" value={form.principal_name} onChange={e => updateField('principal_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{bn ? 'পদবী (বাংলা)' : 'Title (BN)'}</Label>
                <Input className="bg-background mt-1 h-8 text-sm" value={form.principal_title_bn} onChange={e => updateField('principal_title_bn', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'পদবী (EN)' : 'Title (EN)'}</Label>
                <Input className="bg-background mt-1 h-8 text-sm" value={form.principal_title_en} onChange={e => updateField('principal_title_en', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'বাণী (বাংলা)' : 'Message (BN)'}</Label>
              <Textarea className="bg-background mt-1 min-h-[60px] text-sm" value={form.principal_message_bn} onChange={e => updateField('principal_message_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ছবি' : 'Photo'}</Label>
              <ImageUpload value={form.principal_photo_url} onChange={(url) => updateField('principal_photo_url', url)} folder="principal" className="mt-1" aspectRatio="aspect-square w-20" />
            </div>
          </div>
        );
      case 'adminMessage':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{bn ? 'নাম' : 'Name'}</Label>
                <Input className="bg-background mt-1 h-8 text-sm" value={form.admin_name} onChange={e => updateField('admin_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'পদবী' : 'Title'}</Label>
                <Input className="bg-background mt-1 h-8 text-sm" value={form.admin_title_bn} onChange={e => updateField('admin_title_bn', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{bn ? 'ইমেইল' : 'Email'}</Label>
                <Input className="bg-background mt-1 h-8 text-sm" value={form.admin_email} onChange={e => updateField('admin_email', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'ফোন' : 'Phone'}</Label>
                <Input className="bg-background mt-1 h-8 text-sm" value={form.admin_phone} onChange={e => updateField('admin_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'বাণী (বাংলা)' : 'Message (BN)'}</Label>
              <Textarea className="bg-background mt-1 min-h-[60px] text-sm" value={form.admin_message_bn} onChange={e => updateField('admin_message_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ছবি' : 'Photo'}</Label>
              <ImageUpload value={form.admin_photo_url} onChange={(url) => updateField('admin_photo_url', url)} folder="admin" className="mt-1" aspectRatio="aspect-square w-20" />
            </div>
          </div>
        );
      case 'banner':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{bn ? 'কন্টেন্ট' : 'Content'}</h4>
            <div>
              <Label className="text-xs">{bn ? 'শিরোনাম (বাংলা)' : 'Title (BN)'}</Label>
              <Input className="bg-background mt-1 h-8 text-sm" value={form.hero_title_bn} onChange={e => updateField('hero_title_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'শিরোনাম (EN)' : 'Title (EN)'}</Label>
              <Input className="bg-background mt-1 h-8 text-sm" value={form.hero_title_en} onChange={e => updateField('hero_title_en', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'সাবটাইটেল (বাংলা)' : 'Subtitle (BN)'}</Label>
              <Input className="bg-background mt-1 h-8 text-sm" value={form.hero_subtitle_bn} onChange={e => updateField('hero_subtitle_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ব্যাকগ্রাউন্ড ছবি' : 'Background Image'}</Label>
              <ImageUpload value={form.hero_bg_image_url} onChange={(url) => updateField('hero_bg_image_url', url)} folder="hero" className="mt-1" aspectRatio="aspect-video" />
            </div>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{bn ? 'পরিসংখ্যান' : 'Statistics'}</h4>
            <div>
              <Label className="text-xs">{bn ? 'মোট ছাত্র' : 'Total Students'}</Label>
              <Input className="bg-background mt-1 h-8 text-sm" value={form.stat_students} onChange={e => updateField('stat_students', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'শিক্ষক' : 'Teachers'}</Label>
              <Input className="bg-background mt-1 h-8 text-sm" value={form.stat_teachers} onChange={e => updateField('stat_teachers', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'বছরের অভিজ্ঞতা' : 'Years'}</Label>
              <Input className="bg-background mt-1 h-8 text-sm" value={form.stat_years} onChange={e => updateField('stat_years', e.target.value)} />
            </div>
          </div>
        );
      default:
        return (
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
            {bn ? 'এই সেকশনের কন্টেন্ট স্বয়ংক্রিয়ভাবে ডাটাবেস থেকে আসে।' : "This section's content is auto-generated from the database."}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0 border rounded-xl overflow-hidden bg-background" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
      {/* ===== LEFT SIDEBAR: Section List ===== */}
      <div className="lg:w-[280px] w-full border-b lg:border-b-0 lg:border-r bg-muted/20 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Layout className="w-4 h-4 text-primary" />
            {bn ? 'সেকশনসমূহ' : 'Sections'}
          </h3>
          <Button size="sm" className="h-7 text-xs btn-primary-gradient" onClick={() => onSave(['section_order', 'sections'])} disabled={saving}>
            <Save className="w-3 h-3 mr-1" /> {bn ? 'সেভ' : 'Save'}
          </Button>
        </div>

        {/* Device View Toggle */}
        <div className="px-3 py-2 border-b flex items-center justify-center gap-1">
          {[
            { key: 'desktop' as DeviceView, icon: Monitor, label: bn ? 'ডেস্কটপ' : 'Desktop' },
            { key: 'tablet' as DeviceView, icon: Tablet, label: bn ? 'ট্যাবলেট' : 'Tablet' },
            { key: 'mobile' as DeviceView, icon: Smartphone, label: bn ? 'মোবাইল' : 'Mobile' },
          ].map(d => (
            <Button
              key={d.key}
              variant={deviceView === d.key ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2.5 text-xs ${deviceView === d.key ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setDeviceView(d.key)}
            >
              <d.icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>

        {/* Section List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sectionOrder.map((section, index) => (
              <div
                key={section.key}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-all text-sm group
                  ${selectedSection === section.key ? 'bg-primary/10 border border-primary/30 shadow-sm' : 'hover:bg-muted/50 border border-transparent'}
                  ${!section.visible ? 'opacity-50' : ''}`}
                onClick={() => setSelectedSection(section.key)}
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
                <span className="text-base shrink-0">{section.icon}</span>
                <span className="flex-1 truncate text-xs font-medium">
                  {bn ? section.label_bn : section.label_en}
                </span>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }} disabled={index === 0}>
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }} disabled={index === sectionOrder.length - 1}>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 shrink-0 ${section.visible ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(index); }}
                >
                  {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ===== RIGHT PANEL: Style & Content Editor ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSection && selectedConfig && selectedStyle ? (
          <>
            {/* Editor Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedConfig.icon}</span>
                <div>
                  <h3 className="text-sm font-bold">{bn ? selectedConfig.label_bn : selectedConfig.label_en}</h3>
                  <p className="text-[10px] text-muted-foreground">{bn ? 'স্টাইল ও কন্টেন্ট কাস্টমাইজ' : 'Customize style & content'}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => resetSectionStyle(selectedSection)}>
                  <RotateCcw className="w-3 h-3 mr-1" /> {bn ? 'রিসেট' : 'Reset'}
                </Button>
                <Button size="sm" className="h-7 text-xs btn-primary-gradient" onClick={() => onSave(['section_order', 'principal_name', 'principal_title_bn', 'principal_title_en', 'principal_message_bn', 'principal_message_en', 'principal_photo_url', 'admin_name', 'admin_title_bn', 'admin_title_en', 'admin_message_bn', 'admin_message_en', 'admin_photo_url', 'admin_email', 'admin_phone', 'hero_title_bn', 'hero_title_en', 'hero_subtitle_bn', 'hero_subtitle_en', 'hero_bg_image_url', 'stat_students', 'stat_teachers', 'stat_years', 'sections'])} disabled={saving}>
                  <Save className="w-3 h-3 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Editor Tabs */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                <Tabs defaultValue="layout" className="w-full">
                  <TabsList className="w-full grid grid-cols-5 h-9">
                    <TabsTrigger value="layout" className="text-xs px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Layout className="w-3 h-3 mr-1" /> {bn ? 'লেআউট' : 'Layout'}
                    </TabsTrigger>
                    <TabsTrigger value="style" className="text-xs px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Paintbrush className="w-3 h-3 mr-1" /> {bn ? 'স্টাইল' : 'Style'}
                    </TabsTrigger>
                    <TabsTrigger value="scroll" className="text-xs px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <MoveVertical className="w-3 h-3 mr-1" /> {bn ? 'স্ক্রল' : 'Scroll'}
                    </TabsTrigger>
                    <TabsTrigger value="animation" className="text-xs px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Play className="w-3 h-3 mr-1" /> {bn ? 'মার্কি' : 'Marquee'}
                    </TabsTrigger>
                    <TabsTrigger value="content" className="text-xs px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Settings2 className="w-3 h-3 mr-1" /> {bn ? 'কন্টেন্ট' : 'Content'}
                    </TabsTrigger>
                  </TabsList>

                  {/* ===== LAYOUT TAB ===== */}
                  <TabsContent value="layout" className="mt-4 space-y-5">
                    {/* Grid Columns */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bn ? 'গ্রিড কলাম' : 'Grid Columns'}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Monitor className="w-3 h-3" /> {bn ? 'ডেস্কটপ কলাম' : 'Desktop Columns'}
                          </Label>
                          <div className="flex gap-2 mt-1.5">
                            {[1, 2, 3, 4].map(c => (
                              <Button key={c} variant={selectedStyle.columns === c ? 'default' : 'outline'} size="sm" className={`h-8 flex-1 ${selectedStyle.columns === c ? 'bg-primary text-primary-foreground' : ''}`}
                                onClick={() => updateSectionStyle(selectedSection, 'columns', c)}>
                                {c}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Tablet className="w-3 h-3" /> {bn ? 'ট্যাবলেট কলাম' : 'Tablet Columns'}
                          </Label>
                          <div className="flex gap-2 mt-1.5">
                            {[1, 2, 3].map(c => (
                              <Button key={c} variant={selectedStyle.columnsTablet === c ? 'default' : 'outline'} size="sm" className={`h-8 flex-1 ${selectedStyle.columnsTablet === c ? 'bg-primary text-primary-foreground' : ''}`}
                                onClick={() => updateSectionStyle(selectedSection, 'columnsTablet', c)}>
                                {c}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> {bn ? 'মোবাইল কলাম' : 'Mobile Columns'}
                          </Label>
                          <div className="flex gap-2 mt-1.5">
                            {[1, 2].map(c => (
                              <Button key={c} variant={selectedStyle.columnsMobile === c ? 'default' : 'outline'} size="sm" className={`h-8 flex-1 ${selectedStyle.columnsMobile === c ? 'bg-primary text-primary-foreground' : ''}`}
                                onClick={() => updateSectionStyle(selectedSection, 'columnsMobile', c)}>
                                {c}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gap */}
                    {sliderField(bn ? 'গ্যাপ (আইটেমের মধ্যে ফাঁক)' : 'Gap (Space between items)', selectedStyle.gap, 0, 48, 4, v => updateSectionStyle(selectedSection, 'gap', v))}

                    {/* Section Width */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{bn ? 'সেকশন প্রস্থ' : 'Section Width'}</Label>
                      <div className="flex gap-2">
                        {(['full', 'boxed'] as const).map(w => (
                          <Button key={w} variant={selectedStyle.width === w ? 'default' : 'outline'} size="sm" className={`h-8 flex-1 text-xs ${selectedStyle.width === w ? 'bg-primary text-primary-foreground' : ''}`}
                            onClick={() => updateSectionStyle(selectedSection, 'width', w)}>
                            {w === 'full' ? (bn ? 'পূর্ণ প্রস্থ' : 'Full Width') : (bn ? 'বক্সড' : 'Boxed')}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Spacing */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bn ? 'স্পেসিং' : 'Spacing'}
                      </h4>
                      {sliderField(bn ? 'প্যাডিং (ভেতরের ফাঁক)' : 'Padding (Inner space)', selectedStyle.padding, 0, 80, 4, v => updateSectionStyle(selectedSection, 'padding', v))}
                      {sliderField(bn ? 'মার্জিন (বাইরের ফাঁক)' : 'Margin (Outer space)', selectedStyle.margin, 0, 80, 4, v => updateSectionStyle(selectedSection, 'margin', v))}
                      {sliderField(bn ? 'বর্ডার রেডিয়াস' : 'Border Radius', selectedStyle.borderRadius, 0, 32, 2, v => updateSectionStyle(selectedSection, 'borderRadius', v))}
                    </div>
                  </TabsContent>

                  {/* ===== STYLE TAB ===== */}
                  <TabsContent value="style" className="mt-4 space-y-5">
                    {/* Colors */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bn ? 'রঙ' : 'Colors'}
                      </h4>
                      {colorField(bn ? 'ব্যাকগ্রাউন্ড রঙ' : 'Background Color', selectedStyle.bgColor, v => updateSectionStyle(selectedSection, 'bgColor', v))}
                      {colorField(bn ? 'টেক্সট রঙ' : 'Text Color', selectedStyle.textColor, v => updateSectionStyle(selectedSection, 'textColor', v))}
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bn ? 'টাইপোগ্রাফি' : 'Typography'}
                      </h4>
                      {sliderField(bn ? 'হেডিং ফন্ট সাইজ' : 'Heading Font Size', selectedStyle.headingFontSize, 12, 80, 1, v => updateSectionStyle(selectedSection, 'headingFontSize', v))}
                      {sliderField(bn ? 'বডি ফন্ট সাইজ' : 'Body Font Size', selectedStyle.bodyFontSize, 10, 36, 1, v => updateSectionStyle(selectedSection, 'bodyFontSize', v))}
                      
                      {/* Font Style Toggles */}
                      <div className="flex gap-2">
                        <Button variant={selectedStyle.headingBold ? 'default' : 'outline'} size="sm" className={`h-8 ${selectedStyle.headingBold ? 'bg-primary text-primary-foreground' : ''}`}
                          onClick={() => updateSectionStyle(selectedSection, 'headingBold', !selectedStyle.headingBold)}>
                          <Bold className="w-3.5 h-3.5 mr-1" /> Bold
                        </Button>
                        <Button variant={selectedStyle.headingItalic ? 'default' : 'outline'} size="sm" className={`h-8 ${selectedStyle.headingItalic ? 'bg-primary text-primary-foreground' : ''}`}
                          onClick={() => updateSectionStyle(selectedSection, 'headingItalic', !selectedStyle.headingItalic)}>
                          <Italic className="w-3.5 h-3.5 mr-1" /> Italic
                        </Button>
                      </div>

                      {/* Text Alignment */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{bn ? 'টেক্সট অ্যালাইনমেন্ট' : 'Text Alignment'}</Label>
                        <div className="flex gap-2">
                          {[
                            { val: 'left', icon: AlignLeft },
                            { val: 'center', icon: AlignCenter },
                            { val: 'right', icon: AlignRight },
                          ].map(a => (
                            <Button key={a.val} variant={selectedStyle.textAlign === a.val ? 'default' : 'outline'} size="sm" className={`h-8 flex-1 ${selectedStyle.textAlign === a.val ? 'bg-primary text-primary-foreground' : ''}`}
                              onClick={() => updateSectionStyle(selectedSection, 'textAlign', a.val)}>
                              <a.icon className="w-3.5 h-3.5" />
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Responsive Font Sizes */}
                      <div className="pt-2 border-t space-y-3">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> {bn ? 'মোবাইল ফন্ট সাইজ' : 'Mobile Font Sizes'}
                        </Label>
                        {sliderField(bn ? 'মোবাইল হেডিং' : 'Mobile Heading', selectedStyle.headingFontSizeMobile, 12, 48, 1, v => updateSectionStyle(selectedSection, 'headingFontSizeMobile', v))}
                        {sliderField(bn ? 'মোবাইল বডি' : 'Mobile Body', selectedStyle.bodyFontSizeMobile, 10, 24, 1, v => updateSectionStyle(selectedSection, 'bodyFontSizeMobile', v))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ===== SCROLL TAB ===== */}
                  <TabsContent value="scroll" className="mt-4 space-y-5">
                    {/* Fixed Height */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bn ? 'উচ্চতা নিয়ন্ত্রণ' : 'Height Control'}
                      </h4>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <span className="text-xs font-medium">{bn ? 'নির্দিষ্ট উচ্চতা' : 'Fixed Height'}</span>
                        <Switch checked={selectedStyle.fixedHeight} onCheckedChange={v => updateSectionStyle(selectedSection, 'fixedHeight', v)} />
                      </div>
                      {selectedStyle.fixedHeight && (
                        sliderField(bn ? 'উচ্চতা' : 'Height', selectedStyle.height, 100, 800, 10, v => updateSectionStyle(selectedSection, 'height', v))
                      )}
                    </div>

                    {/* Overflow */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{bn ? 'ওভারফ্লো কন্ট্রোল' : 'Overflow Control'}</Label>
                      <div className="flex gap-2">
                        {(['auto', 'scroll', 'hidden'] as const).map(o => (
                          <Button key={o} variant={selectedStyle.overflow === o ? 'default' : 'outline'} size="sm" className={`h-8 flex-1 text-xs ${selectedStyle.overflow === o ? 'bg-primary text-primary-foreground' : ''}`}
                            onClick={() => updateSectionStyle(selectedSection, 'overflow', o)}>
                            {o === 'auto' ? (bn ? 'অটো' : 'Auto') : o === 'scroll' ? (bn ? 'স্ক্রল' : 'Scroll') : (bn ? 'হিডেন' : 'Hidden')}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Scrollbar Styling */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bn ? 'স্ক্রলবার স্টাইলিং' : 'Scrollbar Styling'}
                      </h4>
                      {colorField(bn ? 'স্ক্রলবার ট্র্যাক রঙ' : 'Scrollbar Track Color', selectedStyle.scrollbarTrackColor, v => updateSectionStyle(selectedSection, 'scrollbarTrackColor', v))}
                      {colorField(bn ? 'স্ক্রলবার থাম্ব রঙ' : 'Scrollbar Thumb Color', selectedStyle.scrollbarThumbColor, v => updateSectionStyle(selectedSection, 'scrollbarThumbColor', v))}
                    </div>
                  </TabsContent>

                  {/* ===== MARQUEE / AUTO-SCROLL TAB ===== */}
                  <TabsContent value="animation" className="mt-4 space-y-5">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bn ? 'অটো-স্ক্রল / মার্কি ইফেক্ট' : 'Auto-Scroll / Marquee Effect'}
                      </h4>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <span className="text-xs font-medium">{bn ? 'অটো-স্ক্রল চালু' : 'Enable Auto-Scroll'}</span>
                        <Switch checked={selectedStyle.autoScroll} onCheckedChange={v => updateSectionStyle(selectedSection, 'autoScroll', v)} />
                      </div>

                      {selectedStyle.autoScroll && (
                        <>
                          {/* Direction */}
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">{bn ? 'দিক' : 'Direction'}</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { val: 'ltr', label: bn ? 'বাম → ডান' : 'Left → Right' },
                                { val: 'rtl', label: bn ? 'ডান → বাম' : 'Right → Left' },
                                { val: 'ttb', label: bn ? 'উপর → নিচ' : 'Top → Bottom' },
                                { val: 'btt', label: bn ? 'নিচ → উপর' : 'Bottom → Top' },
                              ].map(d => (
                                <Button key={d.val} variant={selectedStyle.scrollDirection === d.val ? 'default' : 'outline'} size="sm"
                                  className={`h-8 text-xs ${selectedStyle.scrollDirection === d.val ? 'bg-primary text-primary-foreground' : ''}`}
                                  onClick={() => updateSectionStyle(selectedSection, 'scrollDirection', d.val)}>
                                  {d.label}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Speed */}
                          {sliderField(bn ? 'গতি' : 'Speed', selectedStyle.scrollSpeed, 1, 10, 1, v => updateSectionStyle(selectedSection, 'scrollSpeed', v), '')}

                          {/* Pause on Hover */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <span className="text-xs font-medium">{bn ? 'হোভারে থামবে' : 'Pause on Hover'}</span>
                            <Switch checked={selectedStyle.pauseOnHover} onCheckedChange={v => updateSectionStyle(selectedSection, 'pauseOnHover', v)} />
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* ===== CONTENT TAB ===== */}
                  <TabsContent value="content" className="mt-4">
                    {renderContentEditor()}
                  </TabsContent>
                </Tabs>

                {/* Live Style Preview */}
                <div className="mt-6 border-t pt-4">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
                    {bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}
                  </Label>
                  <div
                    className={`border rounded-lg transition-all overflow-hidden ${deviceView === 'mobile' ? 'max-w-[320px] mx-auto' : deviceView === 'tablet' ? 'max-w-[600px] mx-auto' : 'w-full'}`}
                    style={{
                      backgroundColor: selectedStyle.bgColor || 'hsl(var(--muted))',
                      color: selectedStyle.textColor || 'hsl(var(--foreground))',
                      padding: `${selectedStyle.padding}px`,
                      margin: `${selectedStyle.margin}px 0`,
                      borderRadius: `${selectedStyle.borderRadius}px`,
                      ...(selectedStyle.fixedHeight ? { height: `${Math.min(selectedStyle.height, 300)}px`, overflow: selectedStyle.overflow } : {}),
                    }}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${deviceView === 'mobile' ? selectedStyle.columnsMobile : deviceView === 'tablet' ? selectedStyle.columnsTablet : selectedStyle.columns}, 1fr)`,
                      gap: `${selectedStyle.gap}px`,
                      textAlign: selectedStyle.textAlign as any,
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: `${deviceView === 'mobile' ? selectedStyle.headingFontSizeMobile : selectedStyle.headingFontSize}px`,
                          fontWeight: selectedStyle.headingBold ? 'bold' : 'normal',
                          fontStyle: selectedStyle.headingItalic ? 'italic' : 'normal',
                        }}>
                          {bn ? selectedConfig.label_bn : selectedConfig.label_en}
                        </h3>
                        <p style={{ fontSize: `${deviceView === 'mobile' ? selectedStyle.bodyFontSizeMobile : selectedStyle.bodyFontSize}px`, marginTop: '4px', opacity: 0.7 }}>
                          {bn ? 'এটি একটি নমুনা কন্টেন্ট।' : 'This is sample content.'}
                        </p>
                      </div>
                      {selectedStyle.columns > 1 && deviceView === 'desktop' && (
                        <div className="bg-foreground/5 rounded p-2">
                          <div className="h-8 bg-foreground/10 rounded mb-2" />
                          <div className="h-4 bg-foreground/5 rounded w-3/4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Layout className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">{bn ? 'সেকশন নির্বাচন করুন' : 'Select a Section'}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                {bn ? 'বাম পাশ থেকে একটি সেকশনে ক্লিক করুন তার লেআউট, স্টাইল, এবং কন্টেন্ট কাস্টমাইজ করতে।' : 'Click a section from the left sidebar to customize its layout, style, and content.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsitePageBuilder;
