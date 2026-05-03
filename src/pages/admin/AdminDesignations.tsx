import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Loader2, Search, Tag, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { checkBanglaDesignation } from '@/lib/banglaDesignationSpellCheck';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  { value: 'cyan', label: 'Cyan', className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  { value: 'green', label: 'Green', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  { value: 'red', label: 'Red', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  { value: 'yellow', label: 'Yellow', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  { value: 'gray', label: 'Gray', className: 'bg-gray-500/10 text-gray-600 border-gray-500/30' },
];

const getColorClass = (color: string) => COLOR_OPTIONS.find(c => c.value === color)?.className || 'bg-gray-500/10 text-gray-600 border-gray-500/30';

const AdminDesignations = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/designations');

  // ─── Staff Categories ───
  const { data: staffCategories = [], isLoading: catLoading } = useQuery({
    queryKey: ['staff_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_categories').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ─── Designations ───
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [staffCategory, setStaffCategory] = useState('');

  // ─── Category Dialog ───
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditItem, setCatEditItem] = useState<any>(null);
  const [catDeleteId, setCatDeleteId] = useState<string | null>(null);
  const [catKey, setCatKey] = useState('');
  const [catName, setCatName] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catRoutePath, setCatRoutePath] = useState('');
  const [catColor, setCatColor] = useState('gray');
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [catIsActive, setCatIsActive] = useState(true);
  const [catDescription, setCatDescription] = useState('');

  const { data: designations = [], isLoading } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('designations').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ─── Designation helpers ───
  const resetForm = () => { setName(''); setNameBn(''); setDescription(''); setSortOrder(0); setIsActive(true); setStaffCategory(staffCategories[0]?.key || ''); setEditItem(null); };
  const openAdd = () => { resetForm(); setStaffCategory(staffCategories[0]?.key || ''); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setName(item.name || ''); setNameBn(item.name_bn || ''); setDescription(item.description || ''); setSortOrder(item.sort_order || 0); setIsActive(item.is_active ?? true); setStaffCategory(item.staff_category || ''); setDialogOpen(true); };

  // Spelling check (excluding the row being edited)
  const nameBnCheck = useMemo(() => {
    const others = (designations as any[])
      .filter((d) => !editItem || d.id !== editItem.id)
      .map((d) => d.name_bn);
    return checkBanglaDesignation(nameBn, others);
  }, [nameBn, designations, editItem]);

  const catNameBnCheck = useMemo(() => {
    const others = (staffCategories as any[])
      .filter((c) => !catEditItem || c.id !== catEditItem.id)
      .map((c) => c.name_bn);
    return checkBanglaDesignation(catNameBn, others);
  }, [catNameBn, staffCategories, catEditItem]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !nameBn.trim()) throw new Error(bn ? 'নাম আবশ্যক' : 'Name is required');
      if (nameBnCheck.level === 'error') throw new Error(nameBnCheck.message || (bn ? 'বানান যাচাই করুন' : 'Check spelling'));
      const record = { name: name.trim(), name_bn: nameBn.trim(), description: description.trim() || null, sort_order: sortOrder, is_active: isActive, staff_category: staffCategory };
      if (editItem) { const { error } = await supabase.from('designations').update(record).eq('id', editItem.id); if (error) throw error; }
      else { const { error } = await supabase.from('designations').insert(record); if (error) throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      queryClient.invalidateQueries({ queryKey: ['designations-all'] });
      queryClient.invalidateQueries({ queryKey: ['designations-for-form-all'] });
      toast.success(editItem ? (bn ? 'পদবি আপডেট হয়েছে' : 'Designation updated') : (bn ? 'পদবি যোগ হয়েছে' : 'Designation added'));
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('designations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['designations'] }); queryClient.invalidateQueries({ queryKey: ['designations-all'] }); queryClient.invalidateQueries({ queryKey: ['designations-for-form-all'] }); toast.success(bn ? 'পদবি মুছে ফেলা হয়েছে' : 'Designation deleted'); setDeleteId(null); },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  // ─── Category helpers ───
  const [catIdPrefix, setCatIdPrefix] = useState('');
  const [catIdStartRange, setCatIdStartRange] = useState(1001);

  const resetCatForm = () => { setCatKey(''); setCatName(''); setCatNameBn(''); setCatRoutePath(''); setCatColor('gray'); setCatSortOrder(0); setCatIsActive(true); setCatDescription(''); setCatIdPrefix(''); setCatIdStartRange(1001); setCatEditItem(null); };
  const openCatAdd = () => { resetCatForm(); setCatDialogOpen(true); };
  const openCatEdit = (item: any) => { setCatEditItem(item); setCatKey(item.key || ''); setCatName(item.name || ''); setCatNameBn(item.name_bn || ''); setCatRoutePath(item.route_path || ''); setCatColor(item.color || 'gray'); setCatSortOrder(item.sort_order || 0); setCatIsActive(item.is_active ?? true); setCatDescription(item.description || ''); setCatIdPrefix((item as any).id_prefix || ''); setCatIdStartRange((item as any).id_start_range || 1001); setCatDialogOpen(true); };

  const saveCatMutation = useMutation({
    mutationFn: async () => {
      if (!catName.trim() || !catNameBn.trim() || !catKey.trim()) throw new Error(bn ? 'নাম ও কী আবশ্যক' : 'Name and Key are required');
      if (catNameBnCheck.level === 'error') throw new Error(catNameBnCheck.message || (bn ? 'বানান যাচাই করুন' : 'Check spelling'));
      const record = { key: catKey.trim().toLowerCase().replace(/\s+/g, '_'), name: catName.trim(), name_bn: catNameBn.trim(), description: catDescription.trim() || null, route_path: catRoutePath.trim() || null, color: catColor, sort_order: catSortOrder, is_active: catIsActive, id_prefix: catIdPrefix.trim().toUpperCase() || null, id_start_range: catIdStartRange } as any;
      if (catEditItem) { const { error } = await supabase.from('staff_categories').update(record).eq('id', catEditItem.id); if (error) throw error; }
      else { const { error } = await supabase.from('staff_categories').insert(record); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff_categories'] }); queryClient.invalidateQueries({ queryKey: ['staff-categories-for-shift'] }); queryClient.invalidateQueries({ queryKey: ['designations-all'] }); queryClient.invalidateQueries({ queryKey: ['designations-for-form-all'] }); toast.success(catEditItem ? (bn ? 'ডিপার্টমেন্ট আপডেট হয়েছে' : 'Department updated') : (bn ? 'ডিপার্টমেন্ট যোগ হয়েছে' : 'Department added')); setCatDialogOpen(false); resetCatForm(); },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('staff_categories').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff_categories'] }); queryClient.invalidateQueries({ queryKey: ['staff-categories-for-shift'] }); queryClient.invalidateQueries({ queryKey: ['designations-all'] }); queryClient.invalidateQueries({ queryKey: ['designations-for-form-all'] }); toast.success(bn ? 'ডিপার্টমেন্ট মুছে ফেলা হয়েছে' : 'Department deleted'); setCatDeleteId(null); },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  const filtered = designations.filter((d: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.name?.toLowerCase().includes(q) || d.name_bn?.toLowerCase().includes(q);
  });

  const getCategoryLabel = (key: string) => {
    const cat = staffCategories.find((c: any) => c.key === key);
    return cat ? (bn ? cat.name_bn : cat.name) : key;
  };

  const getCategoryColor = (key: string) => {
    const cat = staffCategories.find((c: any) => c.key === key);
    return getColorClass(cat?.color || 'gray');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            {bn ? 'পদবি ও ডিপার্টমেন্ট ব্যবস্থাপনা' : 'Designation & Department Management'}
          </h1>
          <p className="text-sm text-muted-foreground">{bn ? 'পদবি ও স্টাফ ডিপার্টমেন্ট পরিচালনা করুন' : 'Manage designations and staff departments'}</p>
        </div>

        <Tabs defaultValue="designations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="designations" className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> {bn ? 'পদবি' : 'Designations'}</TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5"><FolderOpen className="w-4 h-4" /> {bn ? 'ডিপার্টমেন্ট' : 'Departments'}</TabsTrigger>
          </TabsList>

          {/* ─── Designations Tab ─── */}
          <TabsContent value="designations" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder={bn ? 'পদবি খুঁজুন...' : 'Search designations...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {canAddItem && (
                <Button onClick={openAdd} className="btn-primary-gradient flex items-center gap-2">
                  <Plus className="w-4 h-4" /> {bn ? 'নতুন পদবি' : 'Add Designation'}
                </Button>
              )}
            </div>

            <div className="card-elevated overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'পদবি (বাংলা)' : 'Name (BN)'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'পদবি (ইংরেজি)' : 'Name (EN)'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'ডিপার্টমেন্ট' : 'Department'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((d: any, i: number) => (
                        <tr key={d.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{d.name_bn}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{d.name}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className={getCategoryColor(d.staff_category)}>{getCategoryLabel(d.staff_category)}</Badge></td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={d.is_active ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}>
                              {d.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEditItem && <button onClick={() => openEdit(d)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>}
                              {canDeleteItem && <button onClick={() => setDeleteId(d.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো পদবি পাওয়া যায়নি' : 'No designations found'}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Categories Tab ─── */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{bn ? `মোট ${staffCategories.length}টি ডিপার্টমেন্ট` : `Total ${staffCategories.length} departments`}</p>
              {canAddItem && (
                <Button onClick={openCatAdd} className="btn-primary-gradient flex items-center gap-2">
                  <Plus className="w-4 h-4" /> {bn ? 'নতুন ডিপার্টমেন্ট' : 'Add Department'}
                </Button>
              )}
            </div>

            <div className="card-elevated overflow-hidden">
              {catLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                         <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'কী' : 'Key'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম (ইংরেজি)' : 'Name (EN)'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'আইডি প্রিফিক্স' : 'ID Prefix'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'শুরু রেঞ্জ' : 'Start Range'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'রঙ' : 'Color'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {staffCategories.map((c: any, i: number) => (
                        <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{c.key}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{c.name_bn}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{c.name}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className="font-mono">{(c as any).id_prefix || '—'}</Badge></td>
                          <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{(c as any).id_start_range || '—'}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className={getColorClass(c.color)}>{c.color}</Badge></td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={c.is_active ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}>
                              {c.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEditItem && <button onClick={() => openCatEdit(c)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>}
                              {canDeleteItem && <button onClick={() => setCatDeleteId(c.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {staffCategories.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো ডিপার্টমেন্ট নেই' : 'No departments found'}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Designation Add/Edit Dialog ─── */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> {editItem ? (bn ? 'পদবি সম্পাদনা' : 'Edit Designation') : (bn ? 'নতুন পদবি যোগ করুন' : 'Add New Designation')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>{bn ? 'পদবি (বাংলা)' : 'Name (Bangla)'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1" value={nameBn} onChange={e => setNameBn(e.target.value)} placeholder={bn ? 'যেমন: প্রধান শিক্ষক' : 'e.g. প্রধান শিক্ষক'} /></div>
              <div><Label>{bn ? 'পদবি (ইংরেজি)' : 'Name (English)'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1" value={name} onChange={e => setName(e.target.value)} placeholder={bn ? 'যেমন: Head Teacher' : 'e.g. Head Teacher'} /></div>
              <div><Label>{bn ? 'বিবরণ' : 'Description'}</Label><Input className="bg-background mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} /></div>
              <div>
                <Label>{bn ? 'ডিপার্টমেন্ট' : 'Department'} <span className="text-destructive">*</span></Label>
                <Select value={staffCategory} onValueChange={setStaffCategory}>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'ডিপার্টমেন্ট নির্বাচন করুন' : 'Select department'} /></SelectTrigger>
                  <SelectContent>
                    {staffCategories.filter((c: any) => c.is_active).map((c: any) => (
                      <SelectItem key={c.key} value={c.key}>{bn ? c.name_bn : c.name} {c.route_path ? `(${c.route_path})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{bn ? 'ক্রম' : 'Sort Order'}</Label><Input type="number" className="bg-background mt-1 w-24" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} /></div>
              <div className="flex items-center gap-3"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>{bn ? 'সক্রিয়' : 'Active'}</Label></div>
              <Button onClick={() => saveMutation.mutate()} className="btn-primary-gradient w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'যোগ করুন' : 'Add')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Category Add/Edit Dialog ─── */}
        <Dialog open={catDialogOpen} onOpenChange={(open) => { if (!open) { setCatDialogOpen(false); resetCatForm(); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary" /> {catEditItem ? (bn ? 'ডিপার্টমেন্ট সম্পাদনা' : 'Edit Department') : (bn ? 'নতুন ডিপার্টমেন্ট যোগ করুন' : 'Add New Department')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>{bn ? 'কী (ইউনিক)' : 'Key (unique)'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1 font-mono" value={catKey} onChange={e => setCatKey(e.target.value)} placeholder="e.g. teacher" disabled={!!catEditItem} /></div>
              <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1" value={catNameBn} onChange={e => setCatNameBn(e.target.value)} placeholder={bn ? 'যেমন: শিক্ষক' : 'e.g. শিক্ষক'} /></div>
              <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Teacher" /></div>
              <div><Label>{bn ? 'বিবরণ' : 'Description'}</Label><Input className="bg-background mt-1" value={catDescription} onChange={e => setCatDescription(e.target.value)} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} /></div>
              <div><Label>{bn ? 'রাউট পাথ' : 'Route Path'}</Label><Input className="bg-background mt-1 font-mono" value={catRoutePath} onChange={e => setCatRoutePath(e.target.value)} placeholder="/admin/teachers" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'আইডি প্রিফিক্স' : 'ID Prefix'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1 font-mono uppercase" value={catIdPrefix} onChange={e => setCatIdPrefix(e.target.value)} placeholder="TCH" maxLength={5} /></div>
                <div><Label>{bn ? 'শুরু রেঞ্জ' : 'Start Range'}</Label><Input type="number" className="bg-background mt-1 font-mono" value={catIdStartRange} onChange={e => setCatIdStartRange(parseInt(e.target.value) || 1001)} placeholder="2001" /></div>
              </div>
              <div>
                <Label>{bn ? 'রঙ' : 'Color'}</Label>
                <Select value={catColor} onValueChange={setCatColor}>
                  <SelectTrigger className="bg-background mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full bg-${c.value}-500`} /> {c.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{bn ? 'ক্রম' : 'Sort Order'}</Label><Input type="number" className="bg-background mt-1 w-24" value={catSortOrder} onChange={e => setCatSortOrder(parseInt(e.target.value) || 0)} /></div>
              <div className="flex items-center gap-3"><Switch checked={catIsActive} onCheckedChange={setCatIsActive} /><Label>{bn ? 'সক্রিয়' : 'Active'}</Label></div>
              <Button onClick={() => saveCatMutation.mutate()} className="btn-primary-gradient w-full" disabled={saveCatMutation.isPending}>
                {saveCatMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {catEditItem ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'যোগ করুন' : 'Add')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Designation Delete ─── */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}</AlertDialogTitle><AlertDialogDescription>{bn ? 'এই পদবি স্থায়ীভাবে মুছে ফেলা হবে।' : 'This designation will be permanently deleted.'}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{bn ? 'মুছুন' : 'Delete'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Category Delete ─── */}
        <AlertDialog open={!!catDeleteId} onOpenChange={(open) => !open && setCatDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}</AlertDialogTitle><AlertDialogDescription>{bn ? 'এই ডিপার্টমেন্ট মুছে ফেলা হলে সংশ্লিষ্ট পদবিগুলো প্রভাবিত হতে পারে।' : 'Deleting this department may affect related designations.'}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={() => catDeleteId && deleteCatMutation.mutate(catDeleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{bn ? 'মুছুন' : 'Delete'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDesignations;
