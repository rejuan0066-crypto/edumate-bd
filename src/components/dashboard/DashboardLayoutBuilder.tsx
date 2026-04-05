import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardLayout, DashboardSection, DEFAULT_SECTIONS } from '@/hooks/useDashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Save, LayoutDashboard, Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';


const SortableItem = ({ section, bn, onToggle }: { section: DashboardSection; bn: boolean; onToggle: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

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
        isDragging ? 'bg-accent/20 border-accent shadow-lg' : 'bg-card border-border hover:border-accent/50'
      } ${!section.visible ? 'opacity-60' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{bn ? section.titleBn : section.titleEn}</p>
      </div>
      <div className="flex items-center gap-2">
        {section.visible ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        <Switch checked={section.visible} onCheckedChange={() => onToggle(section.id)} />
      </div>
    </div>
  );
};

// Dialog version for Dashboard page
interface DialogProps {
  open: boolean;
  onClose: () => void;
}

export const DashboardLayoutDialog = ({ open, onClose }: DialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sections, saveSections } = useDashboardLayout();
  const [items, setItems] = useState<DashboardSection[]>([]);

  useEffect(() => {
    if (open) setItems([...sections]);
  }, [open, sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(i => i.id === active.id);
        const newIdx = prev.findIndex(i => i.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const toggleVisibility = (id: string) => {
    setItems(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const handleSave = () => {
    saveSections.mutate(items, {
      onSuccess: () => {
        toast.success(bn ? 'ড্যাশবোর্ড লেআউট সেভ হয়েছে' : 'Dashboard layout saved');
        onClose();
      },
      onError: () => toast.error(bn ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save'),
    });
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
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
                <SortableItem key={section.id} section={section} bn={bn} onToggle={toggleVisibility} />
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

  useEffect(() => {
    setItems([...sections]);
  }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(i => i.id === active.id);
        const newIdx = prev.findIndex(i => i.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const toggleVisibility = (id: string) => {
    setItems(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

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
                <RotateCcw className="w-4 h-4 mr-1" />
                {bn ? 'রিসেট' : 'Reset'}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveSections.isPending} className="btn-primary-gradient">
                <Save className="w-4 h-4 mr-1" />
                {saveSections.isPending ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : (bn ? 'সেভ করুন' : 'Save')}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'সেকশনগুলো ড্র্যাগ করে সাজান এবং দৃশ্যমানতা নিয়ন্ত্রণ করুন। এই অর্ডার ডাটাবেসে সংরক্ষিত থাকবে।' : 'Drag to reorder sections and toggle visibility. The order is saved in the database.'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map(section => (
                  <SortableItem key={section.id} section={section} bn={bn} onToggle={toggleVisibility} />
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
