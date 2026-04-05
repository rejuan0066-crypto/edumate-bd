import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardLayout, DashboardSection, DEFAULT_SECTIONS, SECTION_CARDS, SECTION_ICONS, SectionStyle } from '@/hooks/useDashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, Save, LayoutDashboard, Eye, EyeOff, RotateCcw, Settings2, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Users, UserCog, CreditCard, Heart, BookOpen, FileText,
  GraduationCap, History, Layers, ClipboardList, Home, Search, Star, Award,
  type LucideIcon
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

const ICON_MAP: Record<string, LucideIcon> = {
  Users, UserCog, CreditCard, Heart, BookOpen, FileText,
  GraduationCap, History, Layers, ClipboardList, Home, Search, Star, Award, LayoutDashboard,
};

const SortableItem = ({ section, bn, onToggle, onEdit, isEditing }: {
  section: DashboardSection; bn: boolean; onToggle: (id: string) => void; onEdit: (id: string) => void; isEditing: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const Icon = ICON_MAP[section.icon || 'Star'] || Star;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isDragging ? 'bg-accent/20 border-accent shadow-lg' : isEditing ? 'bg-primary/5 border-primary' : 'bg-card border-border hover:border-accent/50'
      } ${!section.visible ? 'opacity-60' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="w-5 h-5" />
      </button>
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{bn ? section.titleBn : section.titleEn}</p>
        {section.hiddenCards && section.hiddenCards.length > 0 && (
          <p className="text-[10px] text-muted-foreground">{section.hiddenCards.length} {bn ? 'টি কার্ড লুকানো' : 'cards hidden'}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onEdit(section.id)} className={`p-1.5 rounded-md transition-colors ${isEditing ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
          <Settings2 className="w-4 h-4" />
        </button>
        {section.visible ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        <Switch checked={section.visible} onCheckedChange={() => onToggle(section.id)} />
      </div>
    </div>
  );
};

// Per-section editor panel
const SectionEditor = ({ section, bn, onChange }: {
  section: DashboardSection; bn: boolean;
  onChange: (updated: DashboardSection) => void;
}) => {
  const cards = SECTION_CARDS[section.id] || [];
  const style = section.style || {};
  const hiddenCards = section.hiddenCards || [];

  const updateStyle = (key: keyof SectionStyle, value: any) => {
    onChange({ ...section, style: { ...style, [key]: value } });
  };

  const toggleCard = (cardKey: string) => {
    const newHidden = hiddenCards.includes(cardKey)
      ? hiddenCards.filter(k => k !== cardKey)
      : [...hiddenCards, cardKey];
    onChange({ ...section, hiddenCards: newHidden });
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          {bn ? 'সেকশন সেটিংস' : 'Section Settings'}: {bn ? section.titleBn : section.titleEn}
        </h4>
      </div>

      {/* Title */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{bn ? 'বাংলা শিরোনাম' : 'Title (Bangla)'}</Label>
          <Input value={section.titleBn} onChange={e => onChange({ ...section, titleBn: e.target.value })} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">{bn ? 'ইংরেজি শিরোনাম' : 'Title (English)'}</Label>
          <Input value={section.titleEn} onChange={e => onChange({ ...section, titleEn: e.target.value })} className="h-8 text-sm" />
        </div>
      </div>

      {/* Icon */}
      <div>
        <Label className="text-xs">{bn ? 'আইকন' : 'Icon'}</Label>
        <Select value={section.icon || 'Star'} onValueChange={v => onChange({ ...section, icon: v })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SECTION_ICONS.map(icon => {
              const Ic = ICON_MAP[icon] || Star;
              return (
                <SelectItem key={icon} value={icon}>
                  <span className="flex items-center gap-2"><Ic className="w-4 h-4" /> {icon}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Style / Layout */}
      {['main_stats', 'staff_teacher', 'student_category', 'session_wise', 'student_detail', 'donor'].includes(section.id) && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{bn ? 'লেআউট ও স্টাইল' : 'Layout & Style'}</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">{bn ? 'কলাম (ডেস্কটপ)' : 'Columns (Desktop)'}</Label>
              <Select value={String(style.columns || 4)} onValueChange={v => updateStyle('columns', Number(v))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'কলাম (মোবাইল)' : 'Columns (Mobile)'}</Label>
              <Select value={String(style.columnsMobile || 2)} onValueChange={v => updateStyle('columnsMobile', Number(v))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'কার্ড সাইজ' : 'Card Size'}</Label>
              <Select value={style.cardSize || 'default'} onValueChange={v => updateStyle('cardSize', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={style.showBorder !== false} onCheckedChange={v => updateStyle('showBorder', !!v)} />
              {bn ? 'বর্ডার দেখান' : 'Show Border'}
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={style.showShadow !== false} onCheckedChange={v => updateStyle('showShadow', !!v)} />
              {bn ? 'শ্যাডো দেখান' : 'Show Shadow'}
            </label>
          </div>
        </div>
      )}

      {/* Cards/Items visibility */}
      {cards.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{bn ? 'কার্ড দৃশ্যমানতা' : 'Card Visibility'}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {cards.map(card => (
              <label key={card.key} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                <Checkbox
                  checked={!hiddenCards.includes(card.key)}
                  onCheckedChange={() => toggleCard(card.key)}
                />
                <span className={hiddenCards.includes(card.key) ? 'line-through text-muted-foreground' : 'text-foreground'}>
                  {bn ? card.labelBn : card.labelEn}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Dialog version for Dashboard page
interface DialogProps { open: boolean; onClose: () => void; }

export const DashboardLayoutDialog = ({ open, onClose }: DialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sections, saveSections } = useDashboardLayout();
  const [items, setItems] = useState<DashboardSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { if (open) setItems([...sections]); }, [open, sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => arrayMove(prev, prev.findIndex(i => i.id === active.id), prev.findIndex(i => i.id === over.id)));
    }
  };

  const toggleVisibility = (id: string) => setItems(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  const updateSection = (updated: DashboardSection) => setItems(prev => prev.map(s => s.id === updated.id ? updated : s));

  const handleSave = () => {
    saveSections.mutate(items, {
      onSuccess: () => { toast.success(bn ? 'সেভ হয়েছে' : 'Saved'); onClose(); },
      onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Failed'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            {bn ? 'ড্যাশবোর্ড বিল্ডার' : 'Dashboard Builder'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map(section => (
                <div key={section.id} className="space-y-1">
                  <SortableItem section={section} bn={bn} onToggle={toggleVisibility} onEdit={id => setEditingId(editingId === id ? null : id)} isEditing={editingId === section.id} />
                  {editingId === section.id && <SectionEditor section={section} bn={bn} onChange={updateSection} />}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>{bn ? 'বাতিল' : 'Cancel'}</Button>
          <Button onClick={handleSave} disabled={saveSections.isPending} className="btn-primary-gradient">
            <Save className="w-4 h-4 mr-1" />
            {saveSections.isPending ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : (bn ? 'সেভ করুন' : 'Save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Inline version for Theme Customizer page
const DashboardLayoutBuilder = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sections, saveSections } = useDashboardLayout();
  const [items, setItems] = useState<DashboardSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { setItems([...sections]); }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => arrayMove(prev, prev.findIndex(i => i.id === active.id), prev.findIndex(i => i.id === over.id)));
    }
  };

  const toggleVisibility = (id: string) => setItems(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  const updateSection = (updated: DashboardSection) => setItems(prev => prev.map(s => s.id === updated.id ? updated : s));

  const handleSave = () => {
    saveSections.mutate(items, {
      onSuccess: () => toast.success(bn ? 'ড্যাশবোর্ড লেআউট সেভ হয়েছে' : 'Dashboard layout saved'),
      onError: () => toast.error(bn ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save'),
    });
  };

  const handleReset = () => {
    setItems([...DEFAULT_SECTIONS]);
    toast.info(bn ? 'ডিফল্ট লেআউটে রিসেট হয়েছে' : 'Reset to default layout');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              {bn ? 'ড্যাশবোর্ড সেকশন সাজান' : 'Reorder Dashboard Sections'}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" /> {bn ? 'রিসেট' : 'Reset'}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveSections.isPending} className="btn-primary-gradient">
                <Save className="w-4 h-4 mr-1" />
                {saveSections.isPending ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : (bn ? 'সেভ করুন' : 'Save')}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'সেকশন ড্র্যাগ করে সাজান, ⚙️ বাটনে ক্লিক করে ভিতরের কার্ড/স্টাইল কাস্টমাইজ করুন' : 'Drag to reorder, click ⚙️ to customize cards & style per section'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map(section => (
                  <div key={section.id} className="space-y-1">
                    <SortableItem section={section} bn={bn} onToggle={toggleVisibility} onEdit={id => setEditingId(editingId === id ? null : id)} isEditing={editingId === section.id} />
                    {editingId === section.id && <SectionEditor section={section} bn={bn} onChange={updateSection} />}
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardLayoutBuilder;
