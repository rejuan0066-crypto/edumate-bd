import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, MapPin, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { bangladeshAddresses } from '@/data/bangladeshAddresses';
import SearchableSelect from '@/components/SearchableSelect';

const LEVELS = [
  { value: 'division', label: 'Division', label_bn: 'বিভাগ' },
  { value: 'district', label: 'District', label_bn: 'জেলা' },
  { value: 'upazila', label: 'Upazila', label_bn: 'উপজেলা' },
  { value: 'union', label: 'Union', label_bn: 'ইউনিয়ন' },
  { value: 'post_office', label: 'Post Office', label_bn: 'পোস্ট অফিস' },
];

const SUB_TYPES = [
  { value: 'upazila', label: 'Upazila', label_bn: 'উপজেলা' },
  { value: 'municipality', label: 'Municipality', label_bn: 'পৌরসভা' },
  { value: 'city_corporation', label: 'City Corporation', label_bn: 'সিটি কর্পোরেশন' },
];

const AdminAddressManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formAction, setFormAction] = useState<'add' | 'edit'>('add');
  const [formLevel, setFormLevel] = useState('division');
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formSubType, setFormSubType] = useState('upazila');
  const [formPostCode, setFormPostCode] = useState('');
  const [formOriginalNameEn, setFormOriginalNameEn] = useState('');
  // Parent selection
  const [selDivision, setSelDivision] = useState('');
  const [selDistrict, setSelDistrict] = useState('');
  const [selUpazila, setSelUpazila] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['address-custom-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('address_custom').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: any) => {
      if (entry.id) {
        const { error } = await supabase.from('address_custom').update(entry).eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('address_custom').insert(entry);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['address-custom-all'] });
      queryClient.invalidateQueries({ queryKey: ['address-custom'] });
      toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
      resetForm();
    },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('address_custom').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['address-custom-all'] });
      queryClient.invalidateQueries({ queryKey: ['address-custom'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
    onError: () => toast.error('Error'),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditItem(null);
    setFormAction('add');
    setFormLevel('division');
    setFormName('');
    setFormNameEn('');
    setFormSubType('upazila');
    setFormPostCode('');
    setFormOriginalNameEn('');
    setSelDivision('');
    setSelDistrict('');
    setSelUpazila('');
  };

  const openAdd = () => {
    resetForm();
    setFormAction('add');
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormAction(item.action);
    setFormLevel(item.level);
    setFormName(item.name);
    setFormNameEn(item.name_en);
    setFormSubType(item.sub_type || 'upazila');
    setFormPostCode(item.post_code || '');
    setFormOriginalNameEn(item.original_name_en || '');
    // Parse parent_path
    if (item.parent_path) {
      const parts = item.parent_path.split('/');
      setSelDivision(parts[0] || '');
      setSelDistrict(parts[1] || '');
      setSelUpazila(parts[2] || '');
    }
    setShowForm(true);
  };

  const getParentPath = () => {
    if (formLevel === 'division') return null;
    if (formLevel === 'district') return selDivision;
    if (formLevel === 'upazila') return `${selDivision}/${selDistrict}`;
    return `${selDivision}/${selDistrict}/${selUpazila}`;
  };

  const handleSave = () => {
    if (!formName.trim() || !formNameEn.trim()) {
      toast.error(bn ? 'নাম দিন' : 'Enter name');
      return;
    }
    if (formLevel !== 'division' && !selDivision) {
      toast.error(bn ? 'প্যারেন্ট নির্বাচন করুন' : 'Select parent');
      return;
    }

    const entry: any = {
      level: formLevel,
      parent_path: getParentPath(),
      name: formName.trim(),
      name_en: formNameEn.trim(),
      action: formAction,
      sub_type: formLevel === 'upazila' ? formSubType : null,
      post_code: formLevel === 'post_office' ? formPostCode : null,
      original_name_en: formAction === 'edit' ? formOriginalNameEn : null,
      is_active: true,
    };

    if (editItem) entry.id = editItem.id;
    saveMutation.mutate(entry);
  };

  // Build parent options from static data
  const divisionOptions = bangladeshAddresses.map(d => ({ value: d.nameEn, label: bn ? d.name : d.nameEn }));
  const districtOptions = selDivision
    ? (bangladeshAddresses.find(d => d.nameEn === selDivision)?.districts || []).map(d => ({ value: d.nameEn, label: bn ? d.name : d.nameEn }))
    : [];
  const upazilaOptions = selDistrict
    ? (bangladeshAddresses.find(d => d.nameEn === selDivision)?.districts.find(d => d.nameEn === selDistrict)?.upazilas || []).map(u => ({ value: u.nameEn, label: bn ? u.name : u.nameEn }))
    : [];

  const filtered = entries.filter((e: any) => {
    if (filterLevel !== 'all' && e.level !== filterLevel) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.name?.toLowerCase().includes(q) || e.name_en?.toLowerCase().includes(q) || e.parent_path?.toLowerCase().includes(q);
    }
    return true;
  });

  const getLevelLabel = (level: string) => {
    const l = LEVELS.find(lv => lv.value === level);
    return bn ? l?.label_bn : l?.label;
  };

  const getActionBadge = (action: string) => {
    if (action === 'add') return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">{bn ? 'নতুন' : 'New'}</span>;
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{bn ? 'সংশোধন' : 'Edit'}</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              {bn ? 'ঠিকানা ব্যবস্থাপনা' : 'Address Manager'}
            </h1>
            <p className="text-sm text-muted-foreground">{bn ? 'বিভাগ, জেলা, উপজেলা, ইউনিয়ন ও পোস্ট অফিস যোগ/সংশোধন করুন' : 'Add or edit divisions, districts, upazilas, unions & post offices'}</p>
          </div>
          <Button onClick={openAdd} className="btn-primary-gradient flex items-center gap-2">
            <Plus className="w-4 h-4" /> {bn ? 'নতুন যোগ করুন' : 'Add New'}
          </Button>
        </div>

        <div className="card-elevated p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={bn ? 'নাম দিয়ে খুঁজুন...' : 'Search by name...'} className="pl-10 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব লেভেল' : 'All Levels'}</SelectItem>
              {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{bn ? l.label_bn : l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{bn ? 'কোনো কাস্টম ঠিকানা ডেটা নেই' : 'No custom address data yet'}</p>
              <p className="text-xs text-muted-foreground mt-1">{bn ? 'উপরের বাটনে ক্লিক করে নতুন যোগ করুন' : 'Click the button above to add new'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'লেভেল' : 'Level'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম (ইংরেজি)' : 'Name (EN)'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'প্যারেন্ট' : 'Parent'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'ধরন' : 'Type'}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((e: any) => (
                    <tr key={e.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">{getLevelLabel(e.level)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{e.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.name_en}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.parent_path || '-'}</td>
                      <td className="px-4 py-3">{getActionBadge(e.action)}</td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(e)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteId(e.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && entries.length > 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো ফলাফল নেই' : 'No results'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editItem ? (bn ? 'সম্পাদনা করুন' : 'Edit Entry') : (bn ? 'নতুন যোগ করুন' : 'Add New')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'অ্যাকশন' : 'Action'}</Label>
                  <Select value={formAction} onValueChange={(v: 'add' | 'edit') => setFormAction(v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">{bn ? 'নতুন যোগ' : 'Add New'}</SelectItem>
                      <SelectItem value="edit">{bn ? 'নাম সংশোধন' : 'Edit Name'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'লেভেল' : 'Level'}</Label>
                  <Select value={formLevel} onValueChange={v => { setFormLevel(v); setSelDivision(''); setSelDistrict(''); setSelUpazila(''); }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{bn ? l.label_bn : l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Parent selection based on level */}
              {formLevel !== 'division' && (
                <div>
                  <Label>{bn ? 'বিভাগ' : 'Division'}</Label>
                  <SearchableSelect
                    options={divisionOptions}
                    value={selDivision}
                    onValueChange={v => { setSelDivision(v); setSelDistrict(''); setSelUpazila(''); }}
                    placeholder={bn ? 'বিভাগ নির্বাচন' : 'Select division'}
                    searchPlaceholder={bn ? 'খুঁজুন...' : 'Search...'}
                    className="mt-1"
                  />
                </div>
              )}
              {['upazila', 'union', 'post_office'].includes(formLevel) && selDivision && (
                <div>
                  <Label>{bn ? 'জেলা' : 'District'}</Label>
                  <SearchableSelect
                    options={districtOptions}
                    value={selDistrict}
                    onValueChange={v => { setSelDistrict(v); setSelUpazila(''); }}
                    placeholder={bn ? 'জেলা নির্বাচন' : 'Select district'}
                    searchPlaceholder={bn ? 'খুঁজুন...' : 'Search...'}
                    className="mt-1"
                  />
                </div>
              )}
              {['union', 'post_office'].includes(formLevel) && selDistrict && (
                <div>
                  <Label>{bn ? 'উপজেলা' : 'Upazila'}</Label>
                  <SearchableSelect
                    options={upazilaOptions}
                    value={selUpazila}
                    onValueChange={setSelUpazila}
                    placeholder={bn ? 'উপজেলা নির্বাচন' : 'Select upazila'}
                    searchPlaceholder={bn ? 'খুঁজুন...' : 'Search...'}
                    className="mt-1"
                  />
                </div>
              )}

              {formAction === 'edit' && (
                <div>
                  <Label>{bn ? 'আসল ইংরেজি নাম (যেটি সংশোধন করবেন)' : 'Original English Name'}</Label>
                  <Input className="mt-1 bg-background" value={formOriginalNameEn} onChange={e => setFormOriginalNameEn(e.target.value)} placeholder={bn ? 'আসল নাম লিখুন' : 'Original name'} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'বাংলা নাম' : 'Bengali Name'}</Label>
                  <Input className="mt-1 bg-background" value={formName} onChange={e => setFormName(e.target.value)} placeholder={bn ? 'বাংলা নাম' : 'Bengali name'} />
                </div>
                <div>
                  <Label>{bn ? 'ইংরেজি নাম' : 'English Name'}</Label>
                  <Input className="mt-1 bg-background" value={formNameEn} onChange={e => setFormNameEn(e.target.value)} placeholder={bn ? 'ইংরেজি নাম' : 'English name'} />
                </div>
              </div>

              {formLevel === 'upazila' && (
                <div>
                  <Label>{bn ? 'ধরন' : 'Sub Type'}</Label>
                  <Select value={formSubType} onValueChange={setFormSubType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUB_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{bn ? s.label_bn : s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formLevel === 'post_office' && (
                <div>
                  <Label>{bn ? 'পোস্ট কোড' : 'Post Code'}</Label>
                  <Input className="mt-1 bg-background" value={formPostCode} onChange={e => setFormPostCode(e.target.value)} placeholder="1234" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary-gradient">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {bn ? 'সেভ করুন' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}</AlertDialogTitle>
              <AlertDialogDescription>{bn ? 'এই এন্ট্রি স্থায়ীভাবে মুছে ফেলা হবে।' : 'This entry will be permanently deleted.'}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}>
                {bn ? 'মুছে ফেলুন' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAddressManager;
