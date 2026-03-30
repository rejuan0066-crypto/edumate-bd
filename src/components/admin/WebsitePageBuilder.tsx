import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, ChevronUp, ChevronDown, Eye, EyeOff, GripVertical, Settings2, ChevronRight } from 'lucide-react';
import { HomeSectionConfig, WebsiteSettings, ALL_SECTION_CONFIGS } from '@/hooks/useWebsiteSettings';
import { Json } from '@/integrations/supabase/types';
import ImageUpload from '@/components/ImageUpload';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  form: WebsiteSettings;
  setForm: React.Dispatch<React.SetStateAction<WebsiteSettings | null>>;
  language: string;
  saving: boolean;
  onSave: (keys: (keyof WebsiteSettings)[]) => Promise<void>;
}

const WebsitePageBuilder = ({ form, setForm, language, saving, onSave }: Props) => {
  const bn = language === 'bn';
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
      // Also sync the sections object
      const newSections = { ...prev.sections };
      const key = newOrder[index].key;
      if (key in newSections) {
        (newSections as any)[key] = newOrder[index].visible;
      }
      return { ...prev, section_order: newOrder, sections: newSections };
    });
  };

  const updateField = (key: keyof WebsiteSettings, value: any) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const renderInlineEditor = (section: HomeSectionConfig) => {
    switch (section.key) {
      case 'principalMessage':
        return (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{bn ? 'অধ্যক্ষের নাম' : 'Principal Name'}</Label>
                <Input className="bg-background mt-1" value={form.principal_name} onChange={e => updateField('principal_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'পদবী (বাংলা)' : 'Title (BN)'}</Label>
                <Input className="bg-background mt-1" value={form.principal_title_bn} onChange={e => updateField('principal_title_bn', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'বাণী (বাংলা)' : 'Message (BN)'}</Label>
              <Textarea className="bg-background mt-1 min-h-[60px]" value={form.principal_message_bn} onChange={e => updateField('principal_message_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ছবি' : 'Photo'}</Label>
              <ImageUpload value={form.principal_photo_url} onChange={(url) => updateField('principal_photo_url', url)} folder="principal" className="mt-1" aspectRatio="aspect-square w-24" />
            </div>
            <Button size="sm" className="btn-primary-gradient" onClick={() => onSave(['principal_name', 'principal_title_bn', 'principal_title_en', 'principal_message_bn', 'principal_message_en', 'principal_photo_url', 'section_order'])} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        );
      case 'adminMessage':
        return (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{bn ? 'নাম' : 'Name'}</Label>
                <Input className="bg-background mt-1" value={form.admin_name} onChange={e => updateField('admin_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'পদবী (বাংলা)' : 'Title (BN)'}</Label>
                <Input className="bg-background mt-1" value={form.admin_title_bn} onChange={e => updateField('admin_title_bn', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'ইমেইল' : 'Email'}</Label>
                <Input className="bg-background mt-1" value={form.admin_email} onChange={e => updateField('admin_email', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'ফোন' : 'Phone'}</Label>
                <Input className="bg-background mt-1" value={form.admin_phone} onChange={e => updateField('admin_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'বাণী (বাংলা)' : 'Message (BN)'}</Label>
              <Textarea className="bg-background mt-1 min-h-[60px]" value={form.admin_message_bn} onChange={e => updateField('admin_message_bn', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ছবি' : 'Photo'}</Label>
              <ImageUpload value={form.admin_photo_url} onChange={(url) => updateField('admin_photo_url', url)} folder="admin" className="mt-1" aspectRatio="aspect-square w-24" />
            </div>
            <Button size="sm" className="btn-primary-gradient" onClick={() => onSave(['admin_name', 'admin_title_bn', 'admin_title_en', 'admin_message_bn', 'admin_message_en', 'admin_photo_url', 'admin_email', 'admin_phone', 'section_order'])} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        );
      case 'banner':
        return (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{bn ? 'শিরোনাম (বাংলা)' : 'Title (BN)'}</Label>
                <Input className="bg-background mt-1" value={form.hero_title_bn} onChange={e => updateField('hero_title_bn', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'শিরোনাম (ইংরেজি)' : 'Title (EN)'}</Label>
                <Input className="bg-background mt-1" value={form.hero_title_en} onChange={e => updateField('hero_title_en', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ব্যাকগ্রাউন্ড ছবি' : 'Background Image'}</Label>
              <ImageUpload value={form.hero_bg_image_url} onChange={(url) => updateField('hero_bg_image_url', url)} folder="hero" className="mt-1" aspectRatio="aspect-[21/9]" />
            </div>
            <Button size="sm" className="btn-primary-gradient" onClick={() => onSave(['hero_title_bn', 'hero_title_en', 'hero_subtitle_bn', 'hero_subtitle_en', 'hero_bg_image_url', 'section_order'])} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{bn ? 'মোট ছাত্র' : 'Total Students'}</Label>
                <Input className="bg-background mt-1" value={form.stat_students} onChange={e => updateField('stat_students', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'শিক্ষক' : 'Teachers'}</Label>
                <Input className="bg-background mt-1" value={form.stat_teachers} onChange={e => updateField('stat_teachers', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'বছরের অভিজ্ঞতা' : 'Years'}</Label>
                <Input className="bg-background mt-1" value={form.stat_years} onChange={e => updateField('stat_years', e.target.value)} />
              </div>
            </div>
            <Button size="sm" className="btn-primary-gradient" onClick={() => onSave(['stat_students', 'stat_teachers', 'stat_years', 'section_order'])} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        );
      case 'gallery':
        return (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">{bn ? 'গ্যালারি আইটেমগুলো "গ্যালারি" ট্যাব থেকে ম্যানেজ করুন।' : 'Manage gallery items from the "Gallery" tab.'}</p>
            <Button size="sm" className="btn-primary-gradient" onClick={() => onSave(['section_order'])} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        );
      case 'admissionButtons':
        return (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">{bn ? 'ভর্তি বিভাগসমূহ "বিভাগ" ট্যাব থেকে ম্যানেজ করুন।' : 'Manage admission divisions from the "Divisions" tab.'}</p>
            <Button size="sm" className="btn-primary-gradient" onClick={() => onSave(['section_order'])} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        );
      default:
        return (
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">{bn ? 'এই সেকশনের কন্টেন্ট স্বয়ংক্রিয়ভাবে ডাটাবেস থেকে আসে।' : 'This section\'s content comes automatically from the database.'}</p>
            <Button size="sm" className="btn-primary-gradient mt-2" onClick={() => onSave(['section_order'])} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </div>
        );
    }
  };

  // Row groups info
  const row1Label = bn ? '🔲 রো ১: অধ্যক্ষ | ব্যানার | এডমিন' : '🔲 Row 1: Principal | Banner | Admin';
  const row2Label = bn ? '🔲 রো ২: লিংক | নোটিশ | ভর্তি' : '🔲 Row 2: Links | Notices | Admission';
  const row1Keys = ['principalMessage', 'banner', 'adminMessage'];
  const row2Keys = ['infoLinks', 'latestNotice', 'admissionButtons'];
  const standaloneKeys = sectionOrder.filter(s => !row1Keys.includes(s.key) && !row2Keys.includes(s.key));

  const row1Sections = sectionOrder.filter(s => row1Keys.includes(s.key));
  const row2Sections = sectionOrder.filter(s => row2Keys.includes(s.key));

  const renderSectionItem = (section: HomeSectionConfig, globalIndex: number, canMove: boolean = true) => {
    const isExpanded = expandedSection === section.key;

    return (
      <div key={section.key} className={`border rounded-lg overflow-hidden transition-all ${section.visible ? 'border-primary/30 bg-card' : 'border-border bg-muted/20 opacity-70'}`}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <span className="text-lg shrink-0">{section.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground truncate block">
              {bn ? section.label_bn : section.label_en}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canMove && (
              <>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveSection(globalIndex, 'up')} disabled={globalIndex === 0}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveSection(globalIndex, 'down')} disabled={globalIndex === sectionOrder.length - 1}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${section.visible ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => toggleVisibility(globalIndex)}
            >
              {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setExpandedSection(isExpanded ? null : section.key)}
            >
              <Settings2 className={`w-4 h-4 transition-transform ${isExpanded ? 'text-primary rotate-90' : ''}`} />
            </Button>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t px-3 py-3">
            {renderInlineEditor(section)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Builder Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-foreground text-lg">
            {bn ? '📄 পেইজ বিল্ডার' : '📄 Page Builder'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {bn ? 'সেকশন দেখান/লুকান, ক্রম পরিবর্তন করুন এবং প্রতিটি সেকশনের কন্টেন্ট এডিট করুন' : 'Show/hide sections, reorder them, and edit content inline'}
          </p>
        </div>
        <Button className="btn-primary-gradient" size="sm" onClick={() => onSave(['section_order', 'sections'])} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {bn ? 'সব সংরক্ষণ' : 'Save All'}
        </Button>
      </div>

      {/* Row 1 Group */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{row1Label}</h4>
        <div className="space-y-2">
          {row1Sections.map(s => {
            const idx = sectionOrder.findIndex(so => so.key === s.key);
            return renderSectionItem(s, idx, false);
          })}
        </div>
      </div>

      {/* Row 2 Group */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{row2Label}</h4>
        <div className="space-y-2">
          {row2Sections.map(s => {
            const idx = sectionOrder.findIndex(so => so.key === s.key);
            return renderSectionItem(s, idx, false);
          })}
        </div>
      </div>

      {/* Standalone Sections */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {bn ? '📦 স্বতন্ত্র সেকশন (ক্রম পরিবর্তনযোগ্য)' : '📦 Standalone Sections (Reorderable)'}
        </h4>
        <div className="space-y-2">
          {standaloneKeys.map(s => {
            const idx = sectionOrder.findIndex(so => so.key === s.key);
            return renderSectionItem(s, idx, true);
          })}
        </div>
      </div>
    </div>
  );
};

export default WebsitePageBuilder;
