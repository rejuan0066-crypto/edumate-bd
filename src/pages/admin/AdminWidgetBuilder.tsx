import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWidgetSettings, WidgetConfig } from '@/hooks/useWidgetSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Pencil, Eye, EyeOff, ChevronUp, ChevronDown, GripVertical, LayoutGrid } from 'lucide-react';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const ICON_OPTIONS = ['Users', 'UserCog', 'CreditCard', 'Heart', 'Receipt', 'BookOpen', 'FileText', 'GraduationCap', 'UserCheck', 'UserX', 'Layers', 'Star', 'Award', 'Clock'];
const COLOR_PRESETS = [
  { label: 'Green', value: 'hsl(152,55%,28%)' },
  { label: 'Gold', value: 'hsl(42,85%,55%)' },
  { label: 'Blue', value: 'hsl(210,80%,52%)' },
  { label: 'Red', value: 'hsl(0,72%,51%)' },
  { label: 'Purple', value: 'hsl(280,60%,50%)' },
  { label: 'Teal', value: 'hsl(180,50%,40%)' },
];

const BG_PRESETS = [
  { label: 'Green', value: 'hsl(152,55%,28%,0.1)' },
  { label: 'Gold', value: 'hsl(42,85%,55%,0.1)' },
  { label: 'Blue', value: 'hsl(210,80%,52%,0.1)' },
  { label: 'Red', value: 'hsl(0,72%,51%,0.1)' },
  { label: 'Purple', value: 'hsl(280,60%,50%,0.1)' },
  { label: 'Teal', value: 'hsl(180,50%,40%,0.1)' },
];

const emptyWidget = (): WidgetConfig => ({
  id: crypto.randomUUID(),
  title_bn: '',
  title_en: '',
  type: 'stat_card',
  data_source: 'students',
  aggregation: 'count',
  icon: 'Star',
  color: COLOR_PRESETS[0].value,
  bg_color: BG_PRESETS[0].value,
  size: 'small',
  visible: true,
  sort_order: 0,
});

const AdminWidgetBuilder = () => {
  const { language } = useLanguage();
  const { widgets, saveWidgets } = useWidgetSettings();
  const [list, setList] = useState<WidgetConfig[]>(widgets);
  const [editDialog, setEditDialog] = useState<{ open: boolean; widget: WidgetConfig | null; index: number }>({ open: false, widget: null, index: -1 });
  const bn = language === 'bn';

  useEffect(() => { setList(widgets); }, [widgets]);

  const handleSave = () => {
    saveWidgets.mutate(list, {
      onSuccess: () => toast.success(bn ? 'উইজেট সেভ হয়েছে!' : 'Widgets saved!'),
      onError: () => toast.error(bn ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save'),
    });
  };

  const addWidget = () => {
    const w = emptyWidget();
    w.sort_order = list.length;
    setEditDialog({ open: true, widget: w, index: -1 });
  };

  const editWidget = (idx: number) => {
    setEditDialog({ open: true, widget: { ...list[idx] }, index: idx });
  };

  const saveEditDialog = () => {
    if (!editDialog.widget) return;
    setList(prev => {
      if (editDialog.index === -1) return [...prev, editDialog.widget!];
      const newList = [...prev];
      newList[editDialog.index] = editDialog.widget!;
      return newList;
    });
    setEditDialog({ open: false, widget: null, index: -1 });
  };

  const deleteWidget = (idx: number) => {
    setList(prev => prev.filter((_, i) => i !== idx));
  };

  const moveWidget = (idx: number, dir: -1 | 1) => {
    setList(prev => {
      const newList = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= newList.length) return newList;
      [newList[idx], newList[target]] = [newList[target], newList[idx]];
      return newList.map((w, i) => ({ ...w, sort_order: i }));
    });
  };

  const toggleVisible = (idx: number) => {
    setList(prev => {
      const newList = [...prev];
      newList[idx] = { ...newList[idx], visible: !newList[idx].visible };
      return newList;
    });
  };

  const updateField = (field: keyof WidgetConfig, value: any) => {
    setEditDialog(prev => ({
      ...prev,
      widget: prev.widget ? { ...prev.widget, [field]: value } : null,
    }));
  };

  // Chart config helpers
  const updateChartLabel = (idx: number, val: string) => {
    setEditDialog(prev => {
      if (!prev.widget) return prev;
      const labels = [...(prev.widget.chart_config?.labels || [])];
      labels[idx] = val;
      return { ...prev, widget: { ...prev.widget, chart_config: { ...prev.widget.chart_config, labels, values: prev.widget.chart_config?.values || [], colors: prev.widget.chart_config?.colors || [] } } };
    });
  };
  const updateChartValue = (idx: number, val: number) => {
    setEditDialog(prev => {
      if (!prev.widget) return prev;
      const values = [...(prev.widget.chart_config?.values || [])];
      values[idx] = val;
      return { ...prev, widget: { ...prev.widget, chart_config: { ...prev.widget.chart_config, labels: prev.widget.chart_config?.labels || [], values, colors: prev.widget.chart_config?.colors || [] } } };
    });
  };
  const addChartPoint = () => {
    setEditDialog(prev => {
      if (!prev.widget) return prev;
      const cfg = prev.widget.chart_config || { labels: [], values: [], colors: [] };
      return { ...prev, widget: { ...prev.widget, chart_config: { labels: [...(cfg.labels || []), ''], values: [...(cfg.values || []), 0], colors: [...(cfg.colors || []), COLOR_PRESETS[(cfg.labels?.length || 0) % COLOR_PRESETS.length].value] } } };
    });
  };
  const removeChartPoint = (idx: number) => {
    setEditDialog(prev => {
      if (!prev.widget) return prev;
      const cfg = prev.widget.chart_config || { labels: [], values: [], colors: [] };
      return { ...prev, widget: { ...prev.widget, chart_config: { labels: cfg.labels?.filter((_, i) => i !== idx), values: cfg.values?.filter((_, i) => i !== idx), colors: cfg.colors?.filter((_, i) => i !== idx) } } };
    });
  };

  const isChartType = editDialog.widget?.type === 'bar_chart' || editDialog.widget?.type === 'pie_chart' || editDialog.widget?.type === 'line_chart';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              {bn ? '🧩 উইজেট বিল্ডার' : '🧩 Widget Builder'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {bn ? 'ড্যাশবোর্ডে কাস্টম কার্ড ও চার্ট যোগ করুন' : 'Add custom cards & charts to dashboard'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addWidget}>
              <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন উইজেট' : 'New Widget'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveWidgets.isPending}>
              <Save className="w-4 h-4 mr-1" />
              {saveWidgets.isPending ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : (bn ? 'সেভ করুন' : 'Save')}
            </Button>
          </div>
        </div>

        {list.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{bn ? 'কোনো উইজেট নেই। নতুন উইজেট যোগ করুন।' : 'No widgets yet. Add a new widget.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((w, idx) => (
              <div key={w.id} className={`flex items-center gap-3 p-3 rounded-lg border border-border bg-card ${!w.visible ? 'opacity-50' : ''}`}>
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: w.bg_color }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: w.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bn ? w.title_bn : w.title_en || w.title_bn}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.type} • {w.data_source} • {w.aggregation}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => editWidget(idx)} className="p-1.5 rounded hover:bg-muted">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => toggleVisible(idx)} className="p-1.5 rounded hover:bg-muted">
                    {w.visible ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => moveWidget(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveWidget(idx, 1)} disabled={idx === list.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteWidget(idx)} className="p-1.5 rounded hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => !open && setEditDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog.index === -1 ? (bn ? 'নতুন উইজেট যোগ' : 'Add New Widget') : (bn ? 'উইজেট সম্পাদনা' : 'Edit Widget')}</DialogTitle>
          </DialogHeader>
          {editDialog.widget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'বাংলা শিরোনাম' : 'Bengali Title'}</Label>
                  <Input value={editDialog.widget.title_bn} onChange={e => updateField('title_bn', e.target.value)} />
                </div>
                <div>
                  <Label>{bn ? 'ইংরেজি শিরোনাম' : 'English Title'}</Label>
                  <Input value={editDialog.widget.title_en} onChange={e => updateField('title_en', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'উইজেট টাইপ' : 'Widget Type'}</Label>
                  <Select value={editDialog.widget.type} onValueChange={v => updateField('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stat_card">{bn ? 'স্ট্যাট কার্ড' : 'Stat Card'}</SelectItem>
                      <SelectItem value="text_card">{bn ? 'টেক্সট কার্ড' : 'Text Card'}</SelectItem>
                      <SelectItem value="progress_card">{bn ? 'প্রোগ্রেস কার্ড' : 'Progress Card'}</SelectItem>
                      <SelectItem value="bar_chart">{bn ? 'বার চার্ট' : 'Bar Chart'}</SelectItem>
                      <SelectItem value="pie_chart">{bn ? 'পাই চার্ট' : 'Pie Chart'}</SelectItem>
                      <SelectItem value="line_chart">{bn ? 'লাইন চার্ট' : 'Line Chart'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'সাইজ' : 'Size'}</Label>
                  <Select value={editDialog.widget.size} onValueChange={v => updateField('size', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">{bn ? 'ছোট' : 'Small'}</SelectItem>
                      <SelectItem value="medium">{bn ? 'মাঝারি' : 'Medium'}</SelectItem>
                      <SelectItem value="large">{bn ? 'বড়' : 'Large'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isChartType && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{bn ? 'ডেটা সোর্স' : 'Data Source'}</Label>
                      <Select value={editDialog.widget.data_source} onValueChange={v => updateField('data_source', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="students">{bn ? 'ছাত্র' : 'Students'}</SelectItem>
                          <SelectItem value="staff">{bn ? 'কর্মী' : 'Staff'}</SelectItem>
                          <SelectItem value="fee_payments">{bn ? 'ফি পেমেন্ট' : 'Fee Payments'}</SelectItem>
                          <SelectItem value="expenses">{bn ? 'খরচ' : 'Expenses'}</SelectItem>
                          <SelectItem value="donors">{bn ? 'দাতা' : 'Donors'}</SelectItem>
                          <SelectItem value="custom">{bn ? 'কাস্টম মান' : 'Custom Value'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{bn ? 'অ্যাগ্রিগেশন' : 'Aggregation'}</Label>
                      <Select value={editDialog.widget.aggregation} onValueChange={v => updateField('aggregation', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="count">{bn ? 'সংখ্যা গণনা' : 'Count'}</SelectItem>
                          <SelectItem value="sum">{bn ? 'যোগফল' : 'Sum'}</SelectItem>
                          <SelectItem value="avg">{bn ? 'গড়' : 'Average'}</SelectItem>
                          <SelectItem value="custom_value">{bn ? 'কাস্টম মান' : 'Custom Value'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editDialog.widget.aggregation !== 'custom_value' && editDialog.widget.aggregation !== 'count' && (
                    <div>
                      <Label>{bn ? 'যোগফল ফিল্ড' : 'Sum Field'}</Label>
                      <Input value={editDialog.widget.sum_field || ''} onChange={e => updateField('sum_field', e.target.value)} placeholder="e.g. amount, salary, donation_amount" />
                    </div>
                  )}

                  {editDialog.widget.aggregation === 'custom_value' && (
                    <div>
                      <Label>{bn ? 'কাস্টম মান' : 'Custom Value'}</Label>
                      <Input value={editDialog.widget.custom_value || ''} onChange={e => updateField('custom_value', e.target.value)} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{bn ? 'ফিল্টার ফিল্ড' : 'Filter Field'}</Label>
                      <Input value={editDialog.widget.filter_field || ''} onChange={e => updateField('filter_field', e.target.value)} placeholder="e.g. status, gender" />
                    </div>
                    <div>
                      <Label>{bn ? 'ফিল্টার মান' : 'Filter Value'}</Label>
                      <Input value={editDialog.widget.filter_value || ''} onChange={e => updateField('filter_value', e.target.value)} placeholder="e.g. active, male" />
                    </div>
                  </div>
                </>
              )}

              {isChartType && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{bn ? 'চার্ট ডেটা পয়েন্ট' : 'Chart Data Points'}</Label>
                    <Button variant="outline" size="sm" onClick={addChartPoint}>
                      <Plus className="w-3 h-3 mr-1" /> {bn ? 'যোগ' : 'Add'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editDialog.widget.chart_config?.labels?.map((label, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={label} onChange={e => updateChartLabel(i, e.target.value)} placeholder={bn ? 'লেবেল' : 'Label'} className="flex-1" />
                        <Input type="number" value={editDialog.widget.chart_config?.values?.[i] || 0} onChange={e => updateChartValue(i, Number(e.target.value))} className="w-24" />
                        <button onClick={() => removeChartPoint(i)} className="p-1 hover:bg-destructive/10 rounded">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>{bn ? 'আইকন' : 'Icon'}</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ICON_OPTIONS.map(icon => (
                    <button key={icon} onClick={() => updateField('icon', icon)}
                      className={`px-2 py-1 text-xs rounded border transition-all ${editDialog.widget?.icon === icon ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'আইকন কালার' : 'Icon Color'}</Label>
                  <div className="flex gap-2 mt-1">
                    {COLOR_PRESETS.map(c => (
                      <button key={c.value} onClick={() => updateField('color', c.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${editDialog.widget?.color === c.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>{bn ? 'ব্যাকগ্রাউন্ড' : 'Background'}</Label>
                  <div className="flex gap-2 mt-1">
                    {BG_PRESETS.map(c => (
                      <button key={c.value} onClick={() => updateField('bg_color', c.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${editDialog.widget?.bg_color === c.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(prev => ({ ...prev, open: false }))}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={saveEditDialog}>{bn ? 'সেভ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminWidgetBuilder;
