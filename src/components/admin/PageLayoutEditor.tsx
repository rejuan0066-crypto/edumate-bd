import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  PAGE_REGISTRY, PageSection, PageCardStyle, PageRegistryEntry,
  useGlobalCardPreset, GlobalCardPreset, DEFAULT_GLOBAL_PRESET,
} from '@/hooks/usePageLayout';
import { HoverEffect } from '@/hooks/useDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  GripVertical, Save, RotateCcw, Settings2, Eye, EyeOff, Sparkles,
  Users, UserCog, CreditCard, Heart, BookOpen, FileText,
  GraduationCap, History, Layers, ClipboardList, Search, Star, Award, LayoutDashboard, Receipt,
  type LucideIcon,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Users, UserCog, CreditCard, Heart, BookOpen, FileText, Receipt,
  GraduationCap, History, Layers, ClipboardList, Search, Star, Award, LayoutDashboard, Settings2,
};

const SortableSection = ({ section, bn, onToggle, onEdit, isEditing }: {
  section: PageSection; bn: boolean; onToggle: (id: string) => void; onEdit: (id: string) => void; isEditing: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const Icon = ICON_MAP[section.icon || 'Star'] || Star;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.8 : 1 }}
      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
        isDragging ? 'bg-accent/20 border-accent shadow-lg' : isEditing ? 'bg-primary/5 border-primary' : 'bg-card border-border hover:border-accent/50'
      } ${!section.visible ? 'opacity-60' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground p-0.5">
        <GripVertical className="w-4 h-4" />
      </button>
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="flex-1 truncate text-foreground">{bn ? section.titleBn : section.titleEn}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(section.id)} className={`p-1 rounded transition-colors ${isEditing ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <Switch checked={section.visible} onCheckedChange={() => onToggle(section.id)} className="scale-75" />
      </div>
    </div>
  );
};

const SectionStyleEditor = ({ section, bn, onChange }: {
  section: PageSection; bn: boolean; onChange: (s: PageSection) => void;
}) => {
  const style = section.style || {};
  const hover = style.hover || {};

  const updateStyle = (key: keyof PageCardStyle, value: any) => onChange({ ...section, style: { ...style, [key]: value } });
  const updateHover = (key: keyof HoverEffect, value: any) => onChange({ ...section, style: { ...style, hover: { ...hover, [key]: value } } });

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">{bn ? 'বাংলা নাম' : 'Title (BN)'}</Label>
          <Input value={section.titleBn} onChange={e => onChange({ ...section, titleBn: e.target.value })} className="h-7 text-xs" />
        </div>
        <div>
          <Label className="text-xs">{bn ? 'ইংরেজি নাম' : 'Title (EN)'}</Label>
          <Input value={section.titleEn} onChange={e => onChange({ ...section, titleEn: e.target.value })} className="h-7 text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">{bn ? 'কলাম' : 'Columns'}</Label>
          <Select value={String(style.columns || 4)} onValueChange={v => updateStyle('columns', Number(v))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{bn ? 'মোবাইল কলাম' : 'Mobile Cols'}</Label>
          <Select value={String(style.columnsMobile || 2)} onValueChange={v => updateStyle('columnsMobile', Number(v))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[1, 2, 3].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{bn ? 'সাইজ' : 'Card Size'}</Label>
          <Select value={style.cardSize || 'default'} onValueChange={v => updateStyle('cardSize', v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">{bn ? 'ছোট' : 'Compact'}</SelectItem>
              <SelectItem value="default">{bn ? 'ডিফল্ট' : 'Default'}</SelectItem>
              <SelectItem value="large">{bn ? 'বড়' : 'Large'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">{bn ? 'গ্যাপ' : 'Gap'}: {style.gap || 12}px</Label>
        <Slider value={[style.gap || 12]} min={4} max={24} step={2} onValueChange={([v]) => updateStyle('gap', v)} />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox checked={style.showBorder !== false} onCheckedChange={v => updateStyle('showBorder', !!v)} />
          {bn ? 'বর্ডার' : 'Border'}
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox checked={style.showShadow !== false} onCheckedChange={v => updateStyle('showShadow', !!v)} />
          {bn ? 'শ্যাডো' : 'Shadow'}
        </label>
      </div>

      {/* Hover */}
      <div className="pt-2 border-t border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">🎯 {bn ? 'হোভার ইফেক্ট' : 'Hover Effect'}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{bn ? 'স্কেল' : 'Scale'}: {(hover.scale || 1).toFixed(2)}x</Label>
            <Slider value={[hover.scale ? hover.scale * 100 : 100]} min={100} max={115} step={1} onValueChange={([v]) => updateHover('scale', v / 100)} />
          </div>
          <div>
            <Label className="text-xs">{bn ? 'লিফট' : 'Lift'}: {hover.lift || 0}px</Label>
            <Slider value={[hover.lift || 0]} min={0} max={8} step={1} onValueChange={([v]) => updateHover('lift', v)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{bn ? 'শ্যাডো' : 'Shadow'}</Label>
            <Select value={hover.shadow || 'md'} onValueChange={v => updateHover('shadow', v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['none', 'sm', 'md', 'lg', 'xl'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{bn ? 'গতি' : 'Speed'}: {hover.speed || 200}ms</Label>
            <Slider value={[hover.speed || 200]} min={100} max={500} step={50} onValueChange={([v]) => updateHover('speed', v)} />
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox checked={hover.borderGlow === true} onCheckedChange={v => updateHover('borderGlow', !!v)} />
          {bn ? 'বর্ডার গ্লো' : 'Border Glow'}
        </label>
      </div>
    </div>
  );
};

// Page-level editor (inside accordion)
const PageEditor = ({ entry, bn, savedSections, onSave }: {
  entry: PageRegistryEntry; bn: boolean;
  savedSections: PageSection[] | undefined;
  onSave: (pageId: string, sections: PageSection[]) => void;
}) => {
  const [items, setItems] = useState<PageSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (savedSections) {
      // Merge saved with defaults for new sections
      const savedIds = new Set(savedSections.map(s => s.id));
      const merged = [...savedSections];
      entry.sections.forEach(def => {
        if (!savedIds.has(def.id)) merged.push({ ...def, sort_order: merged.length });
      });
      setItems(merged.sort((a, b) => a.sort_order - b.sort_order));
    } else {
      setItems([...entry.sections]);
    }
  }, [savedSections, entry.sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const newItems = arrayMove(prev, prev.findIndex(i => i.id === active.id), prev.findIndex(i => i.id === over.id));
        return newItems;
      });
    }
  };

  const toggleVis = (id: string) => setItems(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  const updateSec = (updated: PageSection) => setItems(prev => prev.map(s => s.id === updated.id ? updated : s));

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(sec => (
            <div key={sec.id} className="space-y-1">
              <SortableSection section={sec} bn={bn} onToggle={toggleVis} onEdit={id => setEditingId(editingId === id ? null : id)} isEditing={editingId === sec.id} />
              {editingId === sec.id && <SectionStyleEditor section={sec} bn={bn} onChange={updateSec} />}
            </div>
          ))}
        </SortableContext>
      </DndContext>
      <Button size="sm" className="w-full mt-2" onClick={() => onSave(entry.pageId, items)}>
        <Save className="w-3.5 h-3.5 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
      </Button>
    </div>
  );
};

// Global Preset Editor
const GlobalPresetEditor = ({ bn }: { bn: boolean }) => {
  const { preset, savePreset } = useGlobalCardPreset();
  const [draft, setDraft] = useState<GlobalCardPreset>(preset);

  useEffect(() => { setDraft(preset); }, [preset]);

  const updateHover = (key: keyof HoverEffect, value: any) => setDraft(prev => ({ ...prev, hover: { ...prev.hover, [key]: value } }));

  const handleSave = () => {
    savePreset.mutate(draft, {
      onSuccess: () => toast.success(bn ? 'গ্লোবাল প্রিসেট সেভ হয়েছে' : 'Global preset saved'),
      onError: () => toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save'),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          {bn ? 'গ্লোবাল কার্ড প্রিসেট' : 'Global Card Preset'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{bn ? 'এই সেটিংস সব পেইজের কার্ডে ডিফল্ট হিসেবে প্রযোজ্য হবে (পার-পেইজ সেটিংস থাকলে সেটি প্রাধান্য পাবে)' : 'These defaults apply to all pages (per-page overrides take priority)'}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">{bn ? 'কার্ড সাইজ' : 'Card Size'}</Label>
            <Select value={draft.cardSize} onValueChange={v => setDraft(prev => ({ ...prev, cardSize: v as any }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">{bn ? 'ছোট' : 'Compact'}</SelectItem>
                <SelectItem value="default">{bn ? 'ডিফল্ট' : 'Default'}</SelectItem>
                <SelectItem value="large">{bn ? 'বড়' : 'Large'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs pt-5">
            <Checkbox checked={draft.showBorder} onCheckedChange={v => setDraft(prev => ({ ...prev, showBorder: !!v }))} />
            {bn ? 'বর্ডার' : 'Border'}
          </label>
          <label className="flex items-center gap-2 text-xs pt-5">
            <Checkbox checked={draft.showShadow} onCheckedChange={v => setDraft(prev => ({ ...prev, showShadow: !!v }))} />
            {bn ? 'শ্যাডো' : 'Shadow'}
          </label>
        </div>

        <div className="pt-3 border-t border-border space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">🎯 {bn ? 'হোভার ইফেক্ট' : 'Hover Effect'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{bn ? 'স্কেল' : 'Scale'}: {(draft.hover.scale || 1).toFixed(2)}x</Label>
              <Slider value={[(draft.hover.scale || 1) * 100]} min={100} max={115} step={1} onValueChange={([v]) => updateHover('scale', v / 100)} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'লিফট' : 'Lift'}: {draft.hover.lift || 0}px</Label>
              <Slider value={[draft.hover.lift || 0]} min={0} max={8} step={1} onValueChange={([v]) => updateHover('lift', v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{bn ? 'শ্যাডো' : 'Shadow'}</Label>
              <Select value={draft.hover.shadow || 'md'} onValueChange={v => updateHover('shadow', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['none', 'sm', 'md', 'lg', 'xl'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'গতি' : 'Speed'}: {draft.hover.speed || 200}ms</Label>
              <Slider value={[draft.hover.speed || 200]} min={100} max={500} step={50} onValueChange={([v]) => updateHover('speed', v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{bn ? 'ব্রাইটনেস' : 'Brightness'}: {((draft.hover.brightness || 1) * 100).toFixed(0)}%</Label>
              <Slider value={[(draft.hover.brightness || 1) * 100]} min={90} max={120} step={1} onValueChange={([v]) => updateHover('brightness', v / 100)} />
            </div>
            <label className="flex items-center gap-2 text-xs pt-5">
              <Checkbox checked={draft.hover.borderGlow === true} onCheckedChange={v => updateHover('borderGlow', !!v)} />
              {bn ? 'বর্ডার গ্লো' : 'Border Glow'}
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setDraft(DEFAULT_GLOBAL_PRESET)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> {bn ? 'রিসেট' : 'Reset'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={savePreset.isPending}>
            <Save className="w-3.5 h-3.5 mr-1" /> {savePreset.isPending ? '...' : (bn ? 'সেভ' : 'Save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main component
const PageLayoutEditor = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [allLayouts, setAllLayouts] = useState<Record<string, PageSection[]>>({});

  // Load all page layouts
  useEffect(() => {
    supabase
      .from('website_settings')
      .select('key, value')
      .like('key', 'page_layout_%')
      .then(({ data }) => {
        const map: Record<string, PageSection[]> = {};
        data?.forEach(row => {
          const pageId = row.key.replace('page_layout_', '');
          map[pageId] = row.value as unknown as PageSection[];
        });
        setAllLayouts(map);
      });
  }, []);

  const handleSave = async (pageId: string, sections: PageSection[]) => {
    const ordered = sections.map((s, i) => ({ ...s, sort_order: i }));
    const { error } = await supabase
      .from('website_settings')
      .upsert(
        { key: `page_layout_${pageId}`, value: ordered as unknown as Json, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (error) {
      toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save');
    } else {
      setAllLayouts(prev => ({ ...prev, [pageId]: ordered }));
      toast.success(bn ? `${pageId} পেইজ লেআউট সেভ হয়েছে` : `${pageId} page layout saved`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Global Preset */}
      <GlobalPresetEditor bn={bn} />

      {/* Per-page editors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            {bn ? 'পেইজ লেআউট কাস্টমাইজ' : 'Page Layout Customization'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {bn ? 'প্রতিটি পেইজের সেকশন সাজান, লুকান এবং স্টাইল কাস্টমাইজ করুন' : 'Reorder, hide, and style sections for each page'}
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-1">
            {PAGE_REGISTRY.map(entry => {
              const Icon = ICON_MAP[entry.icon] || Star;
              return (
                <AccordionItem key={entry.pageId} value={entry.pageId} className="border rounded-lg px-3">
                  <AccordionTrigger className="py-2.5 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{bn ? entry.titleBn : entry.titleEn}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({entry.sections.length} {bn ? 'সেকশন' : 'sections'})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <PageEditor entry={entry} bn={bn} savedSections={allLayouts[entry.pageId]} onSave={handleSave} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default PageLayoutEditor;
