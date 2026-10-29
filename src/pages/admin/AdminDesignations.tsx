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
import { Plus, Pencil, Trash2, Loader2, Search, Tag, FolderOpen, Upload, Download, FileSpreadsheet, SlidersHorizontal, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useRef } from 'react';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { checkBanglaDesignation } from '@/lib/banglaDesignationSpellCheck';
import { validateDesignationCsv, type ImportSummary } from '@/lib/bulkDesignationImport';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import SignatoryAuthoritiesTab from '@/components/admin/SignatoryAuthoritiesTab';
import { CORE_SIGNATORY_ROLES } from '@/hooks/useSignatoryAuthorities';

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
      const cats = [...(data || [])];

      // Auto-migrate: rename 'teacher' -> 'teacher_nurani_kitab' and ensure 'teacher_hifz' exists
      const teacherCat = cats.find((c: any) => c.key === 'teacher');
      const nuraniKitabCat = cats.find((c: any) => c.key === 'teacher_nurani_kitab');
      const hifzCat = cats.find((c: any) => c.key === 'teacher_hifz');

      if (teacherCat && !nuraniKitabCat) {
        await supabase.from('staff_categories').update({
          key: 'teacher_nurani_kitab',
          name: 'Teacher (Noorani & Kitab)',
          name_bn: 'নূরানী ও কিতাব বিভাগ',
        }).eq('id', teacherCat.id);
        teacherCat.key = 'teacher_nurani_kitab';
        teacherCat.name = 'Teacher (Noorani & Kitab)';
        teacherCat.name_bn = 'নূরানী ও কিতাব বিভাগ';

        // Cascade to designations and staff
        await supabase.from('designations').update({ staff_category: 'teacher_nurani_kitab' }).eq('staff_category', 'teacher');
        await supabase.from('staff').update({ staff_category: 'teacher_nurani_kitab' }).eq('staff_category', 'teacher');
      }

      if (!hifzCat) {
        const hifzRecord = {
          key: 'teacher_hifz',
          name: 'Teacher (Hifz)',
          name_bn: 'হিফজ বিভাগ',
          color: 'emerald',
          sort_order: 2,
          is_active: true,
          description: 'হিফজ ও নাজেরা বিভাগের শিক্ষকবৃন্দের জন্য',
        };
        const { data: inserted } = await supabase.from('staff_categories').insert(hifzRecord).select().maybeSingle();
        if (inserted) {
          cats.push(inserted);
        }
      }

      // Map any Hifz-specific designations and staff to teacher_hifz
      await supabase.from('designations').update({ staff_category: 'teacher_hifz' })
        .or('name_bn.ilike.%হিফয%,name_bn.ilike.%হিফজ%,name.ilike.%hifz%');
      await supabase.from('staff').update({ staff_category: 'teacher_hifz' })
        .or('designation.ilike.%হিফয%,designation.ilike.%হিফজ%,designation.ilike.%hifz%');

      return cats;
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
  const [authorityRole, setAuthorityRole] = useState<string>('none');

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

  // Fallback map stored in website_settings if authority_role column has not yet been added to remote DB
  const { data: desigAuthorityMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['desig_authority_mapping'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('value')
          .eq('key', 'desig_authority_roles')
          .maybeSingle();
        if (!error && data?.value && typeof data.value === 'object') {
          return data.value as Record<string, string>;
        }
      } catch (err) {
        console.warn('Fallback desig authority map fetch error:', err);
      }
      return {};
    },
  });

  const getDesignationAuthorityRole = (d: any) => {
    return d?.authority_role || desigAuthorityMap[d?.id] || desigAuthorityMap[d?.name_bn] || null;
  };

  // ─── Designation helpers ───
  const resetForm = () => { setName(''); setNameBn(''); setDescription(''); setSortOrder(0); setIsActive(true); setStaffCategory(staffCategories[0]?.key || ''); setAuthorityRole('none'); setEditItem(null); };
  const openAdd = () => { resetForm(); setStaffCategory(staffCategories[0]?.key || ''); setAuthorityRole('none'); setDialogOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setName(item.name || '');
    setNameBn(item.name_bn || '');
    setDescription(item.description || '');
    setSortOrder(item.sort_order || 0);
    setIsActive(item.is_active ?? true);
    setStaffCategory(item.staff_category || '');
    setAuthorityRole(getDesignationAuthorityRole(item) || 'none');
    setDialogOpen(true);
  };

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

      const baseRecord = {
        name: name.trim(),
        name_bn: nameBn.trim(),
        description: description.trim() || null,
        sort_order: sortOrder,
        is_active: isActive,
        staff_category: staffCategory,
      };

      const recordWithAuth = {
        ...baseRecord,
        authority_role: authorityRole === 'none' ? null : authorityRole,
      };

      let savedId = editItem?.id;

      if (editItem) {
        // Try with authority_role first; if column does not exist in schema cache, fallback cleanly to baseRecord
        const { error } = await supabase.from('designations').update(recordWithAuth).eq('id', editItem.id);
        if (error) {
          if (error.message?.includes('authority_role') || (error as any).code === 'PGRST204') {
            const retry = await supabase.from('designations').update(baseRecord).eq('id', editItem.id);
            if (retry.error) throw retry.error;
          } else {
            throw error;
          }
        }
      } else {
        const { data, error } = await supabase.from('designations').insert(recordWithAuth).select('id').maybeSingle();
        if (error) {
          if (error.message?.includes('authority_role') || (error as any).code === 'PGRST204') {
            const retry = await supabase.from('designations').insert(baseRecord).select('id').maybeSingle();
            if (retry.error) throw retry.error;
            savedId = retry.data?.id;
          } else {
            throw error;
          }
        } else {
          savedId = data?.id;
        }
      }

      // Persist in website_settings mapping so authority_role is 100% saved without failing schema cache
      try {
        const updatedMap = { ...(desigAuthorityMap || {}) };
        if (savedId) {
          if (authorityRole && authorityRole !== 'none') {
            updatedMap[savedId] = authorityRole;
            updatedMap[nameBn.trim()] = authorityRole;
          } else {
            delete updatedMap[savedId];
            delete updatedMap[nameBn.trim()];
          }
          await supabase.from('website_settings').upsert({
            key: 'desig_authority_roles',
            value: updatedMap,
          });
        }
      } catch (mapErr) {
        console.warn('Failed to persist fallback desig authority map:', mapErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      queryClient.invalidateQueries({ queryKey: ['designations-all'] });
      queryClient.invalidateQueries({ queryKey: ['designations-for-form-all'] });
      queryClient.invalidateQueries({ queryKey: ['desig_authority_mapping'] });
      queryClient.invalidateQueries({ queryKey: ['signatory-authorities'] });
      toast.success(editItem ? (bn ? 'পদবি আপডেট হয়েছে' : 'Designation updated') : (bn ? 'পদবি যোগ হয়েছে' : 'Designation added'));
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('designations').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      queryClient.invalidateQueries({ queryKey: ['designations-all'] });
      queryClient.invalidateQueries({ queryKey: ['designations-public'] });
      queryClient.invalidateQueries({ queryKey: ['designations-for-form-all'] });
      toast.success(bn ? 'পদবির স্ট্যাটাস আপডেট হয়েছে' : 'Designation status updated');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const { data: staffOpenDesignations = null } = useQuery<string[] | null>({
    queryKey: ['staff-open-designations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'staff_open_designations')
        .maybeSingle();
      if (data?.value && Array.isArray(data.value)) return data.value as string[];
      return null;
    },
  });

  const toggleApplicationOpenMutation = useMutation({
    mutationFn: async ({ id, open }: { id: string; open: boolean }) => {
      const currentList: string[] = staffOpenDesignations !== null
        ? [...staffOpenDesignations]
        : (designations as any[]).filter(d => d.is_active).map(d => d.id);

      let nextList: string[];
      if (open) {
        nextList = Array.from(new Set([...currentList, id]));
      } else {
        nextList = currentList.filter(dId => dId !== id);
      }

      const { data: existing } = await supabase
        .from('website_settings')
        .select('id')
        .eq('key', 'staff_open_designations')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('website_settings')
          .update({ value: nextList as any, updated_at: new Date().toISOString() })
          .eq('key', 'staff_open_designations');
      } else {
        await supabase
          .from('website_settings')
          .insert({ key: 'staff_open_designations', value: nextList as any });
      }
      return nextList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-open-designations'] });
      queryClient.invalidateQueries({ queryKey: ['designations-public'] });
      toast.success(bn ? 'নিয়োগ আবেদন স্ট্যাটাস আপডেট হয়েছে' : 'Job application status updated');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('designations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['designations'] }); queryClient.invalidateQueries({ queryKey: ['designations-all'] }); queryClient.invalidateQueries({ queryKey: ['designations-for-form-all'] }); toast.success(bn ? 'পদবি মুছে ফেলা হয়েছে' : 'Designation deleted'); setDeleteId(null); },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  // ─── Bulk CSV import ───────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  const handleCsvFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error(bn ? 'শুধু .csv ফাইল গ্রহণযোগ্য' : 'Only .csv files allowed');
      return;
    }
    const text = await file.text();
    const summary = validateDesignationCsv(text, {
      existingNamesBn: (designations as any[]).map((d) => d.name_bn),
      allowedCategoryKeys: (staffCategories as any[]).map((c) => c.key),
    });
    setImportSummary(summary);
    setImportOpen(true);
  };

  const downloadCsvTemplate = () => {
    const csv = 'name,name_bn,staff_category\nPrincipal,প্রিন্সিপাল,management\nTreasurer,কোষাধ্যক্ষ,management\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'designations_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const commitImport = async () => {
    if (!importSummary) return;
    const okRows = importSummary.rows.filter((r) => r.status === 'ok' && r.name && r.nameBn);
    if (!okRows.length) {
      toast.error(bn ? 'কোনো বৈধ রো নেই' : 'No valid rows to import');
      return;
    }
    setImporting(true);
    try {
      const records = okRows.map((r) => ({
        name: r.name!.trim(),
        name_bn: r.nameBn!.trim(),
        staff_category: r.staffCategory || (staffCategories[0] as any)?.key || null,
        is_active: true,
        sort_order: 0,
      }));
      const { error } = await supabase.from('designations').insert(records);
      if (error) throw error;
      toast.success(bn ? `${okRows.length}টি পদবি যোগ হয়েছে` : `${okRows.length} designations imported`);
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      queryClient.invalidateQueries({ queryKey: ['designations-all'] });
      setImportOpen(false);
      setImportSummary(null);
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setImporting(false);
    }
  };

  // ─── Category helpers ───
  const [catIdPrefix, setCatIdPrefix] = useState('');
  const [catIdStartRange, setCatIdStartRange] = useState(1001);

  const resetCatForm = () => { setCatKey(''); setCatName(''); setCatNameBn(''); setCatRoutePath(''); setCatColor('gray'); setCatSortOrder(0); setCatIsActive(true); setCatDescription(''); setCatIdPrefix(''); setCatIdStartRange(1001); setCatEditItem(null); };
  const openCatAdd = () => { resetCatForm(); setCatDialogOpen(true); };
  const openCatEdit = (item: any) => {
    setCatEditItem(item);
    setCatKey(item.key || '');
    setCatName(item.name || '');
    setCatNameBn(item.name_bn || '');
    setCatRoutePath(item.route_path || '');
    setCatColor(item.color || 'gray');
    setCatSortOrder(item.sort_order || 0);
    setCatIsActive(item.is_active ?? true);
    setCatDescription(item.description || '');
    setCatIdPrefix((item as any).id_prefix || '');
    setCatIdStartRange((item as any).id_start_range || 1001);
    setCatDialogOpen(true);
  };

  const saveCatMutation = useMutation({
    mutationFn: async () => {
      if (!catName.trim() || !catNameBn.trim() || !catKey.trim()) throw new Error(bn ? 'নাম ও কী আবশ্যক' : 'Name and Key are required');
      if (catNameBnCheck.level === 'error') throw new Error(catNameBnCheck.message || (bn ? 'বানান যাচাই করুন' : 'Check spelling'));
      const record = { key: catKey.trim().toLowerCase().replace(/\s+/g, '_'), name: catName.trim(), name_bn: catNameBn.trim(), description: catDescription.trim() || null, route_path: catRoutePath.trim() || null, color: catColor, sort_order: catSortOrder, is_active: catIsActive, id_prefix: catIdPrefix.trim().toUpperCase() || null, id_start_range: catIdStartRange } as any;
      if (catEditItem) {
        const { error } = await supabase.from('staff_categories').update(record).eq('id', catEditItem.id);
        if (error) throw error;
        // Cascade key change if user edited key
        if (catEditItem.key !== record.key) {
          await supabase.from('designations').update({ staff_category: record.key }).eq('staff_category', catEditItem.key);
          await supabase.from('staff').update({ staff_category: record.key }).eq('staff_category', catEditItem.key);
        }
      } else {
        const { error } = await supabase.from('staff_categories').insert(record);
        if (error) throw error;
      }
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

        {/* Online Job Application Designation Control Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {bn ? 'অনলাইন নিয়োগ আবেদন পদবি নিয়ন্ত্রণ' : 'Online Job Application Designation Control'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {bn
                  ? 'চাকরির আবেদন ফর্মে প্রার্থীরা কোন কোন পদবিতে আবেদন করতে পারবেন তা নিচের "নিয়োগে উন্মুক্ত" সুইচ দিয়ে বা ওয়েবসাইট আবেদন সেটিংস থেকে নিয়ন্ত্রণ করতে পারেন।'
                  : 'Control which designations are available for public job applications using the "Job Open" switch below or via website application settings.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/admin/website?tab=form-settings'}
            className="shrink-0 text-xs font-semibold border-emerald-400/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {bn ? 'অনলাইন আবেদন সেটিংস' : 'Application Settings'}
          </Button>
        </div>

        <Tabs defaultValue="designations" className="space-y-4">
          <TabsList className="grid grid-cols-3 max-w-xl">
            <TabsTrigger value="designations" className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> {bn ? 'পদবি' : 'Designations'}</TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5"><FolderOpen className="w-4 h-4" /> {bn ? 'ডিপার্টমেন্ট' : 'Departments'}</TabsTrigger>
            <TabsTrigger value="authorities" className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> {bn ? 'স্বাক্ষরকারী কর্তৃপক্ষ' : 'Signatory Authority'}</TabsTrigger>
          </TabsList>

          {/* ─── Designations Tab ─── */}
          <TabsContent value="designations" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder={bn ? 'পদবি খুঁজুন...' : 'Search designations...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={downloadCsvTemplate} className="flex items-center gap-2">
                  <Download className="w-4 h-4" /> {bn ? 'টেমপ্লেট' : 'Template'}
                </Button>
                {canAddItem && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleCsvFile(f);
                        e.target.value = '';
                      }}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                      <Upload className="w-4 h-4" /> {bn ? 'CSV ইম্পোর্ট' : 'Import CSV'}
                    </Button>
                    <Button onClick={openAdd} className="btn-primary-gradient flex items-center gap-2">
                      <Plus className="w-4 h-4" /> {bn ? 'নতুন পদবি' : 'Add Designation'}
                    </Button>
                  </>
                )}
              </div>
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
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'সিস্টেম স্ট্যাটাস' : 'System Status'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নিয়োগে উন্মুক্ত' : 'Job Open'}</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((d: any, i: number) => {
                        const isJobOpen = staffOpenDesignations !== null
                          ? staffOpenDesignations.includes(d.id)
                          : d.is_active;

                        return (
                          <tr key={d.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{d.name_bn}</span>
                                {getDesignationAuthorityRole(d) && (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-400/40 text-[11px] gap-1 py-0 font-normal">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    {CORE_SIGNATORY_ROLES.find(r => r.key === getDesignationAuthorityRole(d))?.label_bn || getDesignationAuthorityRole(d)}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{d.name}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className={getCategoryColor(d.staff_category)}>{getCategoryLabel(d.staff_category)}</Badge></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={!!d.is_active}
                                  disabled={!canEditItem || toggleActiveMutation.isPending}
                                  onCheckedChange={(val) => toggleActiveMutation.mutate({ id: d.id, is_active: val })}
                                />
                                <span className={`text-xs font-medium ${d.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                  {d.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={!!isJobOpen && !!d.is_active}
                                  disabled={!canEditItem || !d.is_active || toggleApplicationOpenMutation.isPending}
                                  onCheckedChange={(val) => toggleApplicationOpenMutation.mutate({ id: d.id, open: val })}
                                />
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isJobOpen && d.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                  {isJobOpen && d.is_active ? (bn ? 'উন্মুক্ত' : 'Open') : (bn ? 'বন্ধ' : 'Closed')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEditItem && <button onClick={() => openEdit(d)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>}
                                {canDeleteItem && <button onClick={() => setDeleteId(d.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো পদবি পাওয়া যায়নি' : 'No designations found'}</td></tr>}
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

          {/* ─── Signatory Authorities Tab ─── */}
          <TabsContent value="authorities" className="space-y-4">
            <SignatoryAuthoritiesTab canEdit={canEditItem} />
          </TabsContent>
        </Tabs>

        {/* ─── Designation Add/Edit Dialog ─── */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> {editItem ? (bn ? 'পদবি সম্পাদনা' : 'Edit Designation') : (bn ? 'নতুন পদবি যোগ করুন' : 'Add New Designation')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>{bn ? 'পদবি (বাংলা)' : 'Name (Bangla)'} <span className="text-destructive">*</span></Label>
                <Input
                  className={`bg-background mt-1 ${nameBnCheck.level === 'error' ? 'border-destructive focus-visible:ring-destructive' : nameBnCheck.level === 'warn' ? 'border-amber-500 focus-visible:ring-amber-500' : ''}`}
                  value={nameBn}
                  onChange={e => setNameBn(e.target.value)}
                  placeholder={bn ? 'যেমন: প্রধান শিক্ষক' : 'e.g. প্রধান শিক্ষক'}
                />
                {nameBn.trim() && nameBnCheck.level !== 'ok' && (
                  <div className={`mt-1.5 flex items-start gap-1.5 text-xs ${nameBnCheck.level === 'error' ? 'text-destructive' : 'text-amber-600 dark:text-amber-500'}`}>
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span>{nameBnCheck.message}</span>
                      {nameBnCheck.suggestion && nameBnCheck.suggestion !== nameBn && (
                        <button type="button" className="ml-2 underline font-semibold hover:opacity-80" onClick={() => setNameBn(nameBnCheck.suggestion!)}>
                          {bn ? 'প্রয়োগ করুন' : 'Apply'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {nameBn.trim() && nameBnCheck.level === 'ok' && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {bn ? 'বানান ঠিক আছে' : 'Spelling OK'}
                  </div>
                )}
              </div>
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
              <div>
                <Label>{bn ? 'স্বাক্ষরকারী / নীতিগত দায়িত্ব' : 'Signatory Authority Role'}</Label>
                <Select value={authorityRole} onValueChange={setAuthorityRole}>
                  <SelectTrigger className="bg-background mt-1">
                    <SelectValue placeholder={bn ? 'দায়িত্ব নির্বাচন করুন (ঐচ্ছিক)' : 'Select authority role (Optional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{bn ? '— কোনো বিশেষ স্বাক্ষরকারী দায়িত্ব নেই —' : '— None —'}</SelectItem>
                    {CORE_SIGNATORY_ROLES.map((r) => (
                      <SelectItem key={r.key} value={r.key}>
                        <div className="flex items-center gap-2">
                          <span>{r.icon}</span>
                          <span>{bn ? r.label_bn : r.label_en}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {bn ? 'এই পদবিটি কি প্রতিষ্ঠানের কোনো বিশেষ স্বাক্ষরকারী বা নীতিগত দায়িত্ব পালন করবে?' : 'Select if this designation holds a signing authority role.'}
                </p>
              </div>
              <div><Label>{bn ? 'ক্রম' : 'Sort Order'}</Label><Input type="number" className="bg-background mt-1 w-24" value={sortOrder || ''} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} /></div>
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
              <div><Label>{bn ? 'কী (ইউনিক)' : 'Key (unique)'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1 font-mono" value={catKey} onChange={e => setCatKey(e.target.value)} placeholder="e.g. teacher_nurani_kitab" /></div>
              <div>
                <Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} <span className="text-destructive">*</span></Label>
                <Input
                  className={`bg-background mt-1 ${catNameBnCheck.level === 'error' ? 'border-destructive focus-visible:ring-destructive' : catNameBnCheck.level === 'warn' ? 'border-amber-500 focus-visible:ring-amber-500' : ''}`}
                  value={catNameBn}
                  onChange={e => setCatNameBn(e.target.value)}
                  placeholder={bn ? 'যেমন: শিক্ষক' : 'e.g. শিক্ষক'}
                />
                {catNameBn.trim() && catNameBnCheck.level !== 'ok' && (
                  <div className={`mt-1.5 flex items-start gap-1.5 text-xs ${catNameBnCheck.level === 'error' ? 'text-destructive' : 'text-amber-600 dark:text-amber-500'}`}>
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span>{catNameBnCheck.message}</span>
                      {catNameBnCheck.suggestion && catNameBnCheck.suggestion !== catNameBn && (
                        <button type="button" className="ml-2 underline font-semibold hover:opacity-80" onClick={() => setCatNameBn(catNameBnCheck.suggestion!)}>
                          {bn ? 'প্রয়োগ করুন' : 'Apply'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Teacher" /></div>
              <div><Label>{bn ? 'বিবরণ' : 'Description'}</Label><Input className="bg-background mt-1" value={catDescription} onChange={e => setCatDescription(e.target.value)} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} /></div>
              <div><Label>{bn ? 'রাউট পাথ' : 'Route Path'}</Label><Input className="bg-background mt-1 font-mono" value={catRoutePath} onChange={e => setCatRoutePath(e.target.value)} placeholder="/admin/teachers" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'আইডি প্রিফিক্স' : 'ID Prefix'} <span className="text-destructive">*</span></Label><Input className="bg-background mt-1 font-mono uppercase" value={catIdPrefix} onChange={e => setCatIdPrefix(e.target.value)} placeholder="TCH" maxLength={5} /></div>
                <div><Label>{bn ? 'শুরু রেঞ্জ' : 'Start Range'}</Label><Input type="number" className="bg-background mt-1 font-mono" value={catIdStartRange || ''} onChange={e => setCatIdStartRange(parseInt(e.target.value) || 1001)} placeholder="2001" /></div>
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
              <div><Label>{bn ? 'ক্রম' : 'Sort Order'}</Label><Input type="number" className="bg-background mt-1 w-24" value={catSortOrder || ''} onChange={e => setCatSortOrder(parseInt(e.target.value) || 0)} /></div>
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

        {/* ─── Bulk CSV Import Preview ─── */}
        <Dialog open={importOpen} onOpenChange={(open) => { if (!importing) { setImportOpen(open); if (!open) setImportSummary(null); } }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-[38px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                {bn ? 'CSV ইম্পোর্ট পূর্বরূপ' : 'CSV Import Preview'}
              </DialogTitle>
            </DialogHeader>
            {importSummary && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">{bn ? 'সফল' : 'OK'}: {importSummary.okRows}</Badge>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">{bn ? 'সতর্ক' : 'Warn'}: {importSummary.warnRows}</Badge>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{bn ? 'ত্রুটি' : 'Error'}: {importSummary.errorRows}</Badge>
                  <Badge variant="outline">{bn ? 'মোট' : 'Total'}: {importSummary.totalRows}</Badge>
                </div>
                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left px-3 py-2">#</th>
                        <th className="text-left px-3 py-2">name_bn</th>
                        <th className="text-left px-3 py-2">name</th>
                        <th className="text-left px-3 py-2">{bn ? 'অবস্থা' : 'Status'}</th>
                        <th className="text-left px-3 py-2">{bn ? 'মন্তব্য' : 'Issues'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {importSummary.rows.map((r, i) => (
                        <tr key={i} className={r.status === 'error' ? 'bg-destructive/5' : r.status === 'warn' ? 'bg-warning/5' : ''}>
                          <td className="px-3 py-2 text-muted-foreground">{r.line || '-'}</td>
                          <td className="px-3 py-2">
                            {r.nameBn || '-'}
                            {r.suggestion && r.suggestion !== r.raw.name_bn && (
                              <div className="text-xs text-warning">→ {r.suggestion}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">{r.name || '-'}</td>
                          <td className="px-3 py-2">
                            {r.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-success" />}
                            {r.status === 'warn' && <AlertCircle className="w-4 h-4 text-warning" />}
                            {r.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {r.issues.map((m, j) => <div key={j}>• {m}</div>)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setImportOpen(false); setImportSummary(null); }} disabled={importing}>
                    {bn ? 'বাতিল' : 'Cancel'}
                  </Button>
                  <Button onClick={commitImport} disabled={importing || importSummary.okRows === 0} className="btn-primary-gradient">
                    {importing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    {bn ? `${importSummary.okRows}টি সফল রো ইম্পোর্ট করুন` : `Import ${importSummary.okRows} valid rows`}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDesignations;
