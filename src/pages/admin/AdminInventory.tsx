import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Package, AlertTriangle, Plus, Edit2, Trash2, Loader2,
  Box, Monitor, ArrowDownUp, BarChart3, Search, TrendingDown
} from 'lucide-react';
import InventoryConsumptionReport from '@/components/inventory/InventoryConsumptionReport';
import { useConfirm } from "@/contexts/ConfirmContext";

const UNITS = ['pcs', 'kg', 'gram', 'liter', 'meter', 'feet', 'set', 'packet', 'bag', 'ream', 'box'];
const UNITS_BN: Record<string, string> = { pcs: 'পিস', kg: 'কেজি', gram: 'গ্রাম', liter: 'লিটার', meter: 'মিটার', feet: 'ফুট', set: 'সেট', packet: 'প্যাকেট', bag: 'বস্তা', ream: 'রিম', box: 'বক্স' };
const ITEM_CATS = ['general', 'stationery', 'cleaning', 'grocery', 'electrical', 'other'];
const ITEM_CATS_BN: Record<string, string> = { general: 'সাধারণ', stationery: 'স্টেশনারি', cleaning: 'পরিষ্কার', grocery: 'মুদি', electrical: 'ইলেক্ট্রিক্যাল', other: 'অন্যান্য' };
const ASSET_CATS = ['furniture', 'electronics', 'appliance', 'vehicle', 'equipment', 'other'];
const ASSET_CATS_BN: Record<string, string> = { furniture: 'ফার্নিচার', electronics: 'ইলেকট্রনিক্স', appliance: 'যন্ত্রপাতি', vehicle: 'যানবাহন', equipment: 'সরঞ্জাম', other: 'অন্যান্য' };
const ASSET_STATUS = ['good', 'damaged', 'repairing', 'disposed'];
const ASSET_STATUS_BN: Record<string, string> = { good: 'ভালো', damaged: 'নষ্ট', repairing: 'মেরামত', disposed: 'পরিত্যক্ত' };

const AdminInventory = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [search, setSearch] = useState('');

  // Item dialog
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ name_bn: '', name_en: '', category: 'general', current_stock: '0', unit: 'pcs', min_stock_level: '0', buying_price: '0', notes: '' });

  // Asset dialog
  const [assetOpen, setAssetOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [assetForm, setAssetForm] = useState({ asset_name_bn: '', asset_name_en: '', category: 'furniture', location: '', location_bn: '', purchase_date: '', purchase_price: '0', status: 'good', quantity: '1', condition_notes: '' });

  // Stock adjustment dialog
  const [stockOpen, setStockOpen] = useState(false);
  const [stockItem, setStockItem] = useState<any>(null);
  const [stockForm, setStockForm] = useState({ change_amount: '', type: 'in', reason: '' });

  // Queries
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_items').select('*').eq('is_active', true).order('name_bn');
      return data || [];
    },
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => {
      const { data } = await supabase.from('fixed_assets').select('*').eq('is_active', true).order('asset_name_bn');
      return data || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['inventory-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_logs').select('*, inventory_items(name_bn, name_en)').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  // Mutations
  const saveItem = useMutation({
    mutationFn: async (form: any) => {
      const payload = { ...form, current_stock: Number(form.current_stock), min_stock_level: Number(form.min_stock_level), buying_price: Number(form.buying_price) };
      if (editItem) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সংরক্ষিত' : 'Saved');
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      setItemOpen(false);
      setEditItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });

  const saveAsset = useMutation({
    mutationFn: async (form: any) => {
      const payload = { ...form, purchase_price: Number(form.purchase_price), quantity: Number(form.quantity), purchase_date: form.purchase_date || null };
      if (editAsset) {
        const { error } = await supabase.from('fixed_assets').update(payload).eq('id', editAsset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fixed_assets').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সংরক্ষিত' : 'Saved');
      qc.invalidateQueries({ queryKey: ['fixed-assets'] });
      setAssetOpen(false);
      setEditAsset(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fixed_assets').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
  });

  const adjustStock = useMutation({
    mutationFn: async () => {
      if (!stockItem) return;
      const amt = Number(stockForm.change_amount);
      if (!amt || amt <= 0) throw new Error(bn ? 'পরিমাণ দিন' : 'Enter amount');
      const newStock = stockForm.type === 'in' ? stockItem.current_stock + amt : stockItem.current_stock - amt;
      if (newStock < 0) throw new Error(bn ? 'স্টক নেগেটিভ হতে পারে না' : 'Stock cannot be negative');

      const { error: logErr } = await supabase.from('inventory_logs').insert({
        item_id: stockItem.id,
        change_amount: stockForm.type === 'in' ? amt : -amt,
        type: stockForm.type,
        reason: stockForm.reason,
      });
      if (logErr) throw logErr;

      const { error } = await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', stockItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'স্টক আপডেট হয়েছে' : 'Stock updated');
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      setStockOpen(false);
      setStockItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openItemEdit = (item?: any) => {
    if (item) {
      setEditItem(item);
      setItemForm({ name_bn: item.name_bn, name_en: item.name_en || '', category: item.category, current_stock: String(item.current_stock), unit: item.unit, min_stock_level: String(item.min_stock_level), buying_price: String(item.buying_price || 0), notes: item.notes || '' });
    } else {
      setEditItem(null);
      setItemForm({ name_bn: '', name_en: '', category: 'general', current_stock: '0', unit: 'pcs', min_stock_level: '0', buying_price: '0', notes: '' });
    }
    setItemOpen(true);
  };

  const openAssetEdit = (asset?: any) => {
    if (asset) {
      setEditAsset(asset);
      setAssetForm({ asset_name_bn: asset.asset_name_bn, asset_name_en: asset.asset_name_en || '', category: asset.category, location: asset.location || '', location_bn: asset.location_bn || '', purchase_date: asset.purchase_date || '', purchase_price: String(asset.purchase_price || 0), status: asset.status, quantity: String(asset.quantity || 1), condition_notes: asset.condition_notes || '' });
    } else {
      setEditAsset(null);
      setAssetForm({ asset_name_bn: '', asset_name_en: '', category: 'furniture', location: '', location_bn: '', purchase_date: '', purchase_price: '0', status: 'good', quantity: '1', condition_notes: '' });
    }
    setAssetOpen(true);
  };

  const openStockAdjust = (item: any) => {
    setStockItem(item);
    setStockForm({ change_amount: '', type: 'in', reason: '' });
    setStockOpen(true);
  };

  const lowStockItems = items.filter((i: any) => i.current_stock <= i.min_stock_level && i.min_stock_level > 0);
  const totalValue = items.reduce((s: number, i: any) => s + (i.current_stock * (i.buying_price || 0)), 0);
  const totalAssetValue = assets.reduce((s: number, a: any) => s + ((a.purchase_price || 0) * (a.quantity || 1)), 0);
  const damagedAssets = assets.filter((a: any) => a.status === 'damaged' || a.status === 'repairing');

  const filteredItems = items.filter((i: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return i.name_bn?.includes(s) || i.name_en?.toLowerCase().includes(s);
  });

  const filteredAssets = assets.filter((a: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.asset_name_bn?.includes(s) || a.asset_name_en?.toLowerCase().includes(s);
  });

  if (itemsLoading || assetsLoading) {
    return <AdminLayout><div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{bn ? 'ইনভেন্টরি ও সম্পদ ব্যবস্থাপনা' : 'Inventory & Asset Management'}</h1>
              <p className="text-sm text-muted-foreground">{bn ? 'স্টক, সম্পদ ও লগ ম্যানেজমেন্ট' : 'Stock, assets & log management'}</p>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm"><BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">{bn ? 'ড্যাশবোর্ড' : 'Dashboard'}</span></TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-1.5 text-xs sm:text-sm"><Box className="w-4 h-4" /><span className="hidden sm:inline">{bn ? 'আইটেম' : 'Items'}</span></TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-1.5 text-xs sm:text-sm"><Monitor className="w-4 h-4" /><span className="hidden sm:inline">{bn ? 'সম্পদ' : 'Assets'}</span></TabsTrigger>
            <TabsTrigger value="consumption" className="flex items-center gap-1.5 text-xs sm:text-sm"><TrendingDown className="w-4 h-4" /><span className="hidden sm:inline">{bn ? 'ব্যবহার' : 'Usage'}</span></TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs sm:text-sm"><ArrowDownUp className="w-4 h-4" /><span className="hidden sm:inline">{bn ? 'লগ' : 'Logs'}</span></TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
              {[
                { label: bn ? 'মোট আইটেম' : 'Total Items', value: items.length, gradient: 'from-violet-500 to-purple-600', icon: Box },
                { label: bn ? 'মোট সম্পদ' : 'Total Assets', value: assets.length, gradient: 'from-blue-500 to-indigo-600', icon: Monitor },
                { label: bn ? 'কম স্টক' : 'Low Stock', value: lowStockItems.length, gradient: lowStockItems.length > 0 ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-green-600', icon: AlertTriangle },
                { label: bn ? 'স্টক ভ্যালু' : 'Stock Value', value: `৳${totalValue.toLocaleString()}`, gradient: 'from-emerald-500 to-green-600', icon: Package },
                { label: bn ? 'সম্পদ ভ্যালু' : 'Asset Value', value: `৳${totalAssetValue.toLocaleString()}`, gradient: 'from-cyan-500 to-blue-500', icon: Monitor },
              ].map((s, i) => (
                <div key={i} className={`relative overflow-hidden rounded-xl p-4 flex flex-col items-center text-center gap-2 bg-gradient-to-br ${s.gradient} text-white shadow-md`}>
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm"><s.icon className="w-5 h-5 text-white" /></div>
                  <p className="text-2xl font-bold drop-shadow-sm">{s.value}</p>
                  <p className="text-xs text-white/90 font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
              <Card className="mt-6 border-destructive/30">
                <CardContent className="p-4">
                  <h3 className="font-bold text-destructive flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    {bn ? 'কম স্টক সতর্কতা' : 'Low Stock Alerts'}
                  </h3>
                  <div className="space-y-2">
                    {lowStockItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div>
                          <p className="font-medium text-sm">{bn ? item.name_bn : (item.name_en || item.name_bn)}</p>
                          <p className="text-xs text-muted-foreground">{bn ? 'ন্যূনতম:' : 'Min:'} {item.min_stock_level} {bn ? UNITS_BN[item.unit] || item.unit : item.unit}</p>
                        </div>
                        <Badge variant="destructive" className="text-sm font-bold">
                          {item.current_stock} {bn ? UNITS_BN[item.unit] || item.unit : item.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Damaged Assets */}
            {damagedAssets.length > 0 && (
              <Card className="mt-4 border-orange-500/30">
                <CardContent className="p-4">
                  <h3 className="font-bold text-orange-600 flex items-center gap-2 mb-3">
                    <Monitor className="w-5 h-5" />
                    {bn ? 'নষ্ট/মেরামতের সম্পদ' : 'Damaged/Repairing Assets'}
                  </h3>
                  <div className="space-y-2">
                    {damagedAssets.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <div>
                          <p className="font-medium text-sm">{bn ? a.asset_name_bn : (a.asset_name_en || a.asset_name_bn)}</p>
                          <p className="text-xs text-muted-foreground">{a.location_bn || a.location || '-'}</p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          {bn ? ASSET_STATUS_BN[a.status] : a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items">
            <div className="flex items-center justify-between gap-3 mt-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={bn ? 'আইটেম খুঁজুন...' : 'Search items...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Button onClick={() => openItemEdit()} className="gap-1.5"><Plus className="w-4 h-4" />{bn ? 'নতুন আইটেম' : 'Add Item'}</Button>
            </div>

            {filteredItems.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground"><Box className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{bn ? 'কোনো আইটেম নেই' : 'No items found'}</p></CardContent></Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">{bn ? 'নাম' : 'Name'}</th>
                      <th className="p-3 text-center">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
                      <th className="p-3 text-center">{bn ? 'স্টক' : 'Stock'}</th>
                      <th className="p-3 text-center">{bn ? 'ন্যূনতম' : 'Min'}</th>
                      <th className="p-3 text-center">{bn ? 'দাম' : 'Price'}</th>
                      <th className="p-3 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item: any, idx: number) => {
                      const isLow = item.current_stock <= item.min_stock_level && item.min_stock_level > 0;
                      return (
                        <tr key={item.id} className={`border-t hover:bg-muted/30 ${isLow ? 'bg-destructive/5' : ''}`}>
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3 font-medium">{bn ? item.name_bn : (item.name_en || item.name_bn)}</td>
                          <td className="p-3 text-center"><Badge variant="secondary">{bn ? ITEM_CATS_BN[item.category] || item.category : item.category}</Badge></td>
                          <td className="p-3 text-center">
                            <span className={isLow ? 'text-destructive font-bold' : ''}>{item.current_stock}</span>
                            <span className="text-muted-foreground ml-1">{bn ? UNITS_BN[item.unit] || item.unit : item.unit}</span>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">{item.min_stock_level}</td>
                          <td className="p-3 text-center">৳{item.buying_price}</td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openStockAdjust(item)} title={bn ? 'স্টক সমন্বয়' : 'Adjust Stock'}><ArrowDownUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openItemEdit(item)}><Edit2 className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { if ((await confirm({ description: bn ? 'নিশ্চিত?' : 'Sure?', variant: 'destructive' }))) deleteItem.mutate(item.id); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets">
            <div className="flex items-center justify-between gap-3 mt-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={bn ? 'সম্পদ খুঁজুন...' : 'Search assets...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Button onClick={() => openAssetEdit()} className="gap-1.5"><Plus className="w-4 h-4" />{bn ? 'নতুন সম্পদ' : 'Add Asset'}</Button>
            </div>

            {filteredAssets.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground"><Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{bn ? 'কোনো সম্পদ নেই' : 'No assets found'}</p></CardContent></Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">{bn ? 'নাম' : 'Name'}</th>
                      <th className="p-3 text-center">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
                      <th className="p-3 text-center">{bn ? 'লোকেশন' : 'Location'}</th>
                      <th className="p-3 text-center">{bn ? 'সংখ্যা' : 'Qty'}</th>
                      <th className="p-3 text-center">{bn ? 'অবস্থা' : 'Status'}</th>
                      <th className="p-3 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((a: any, idx: number) => (
                      <tr key={a.id} className="border-t hover:bg-muted/30">
                        <td className="p-3">{idx + 1}</td>
                        <td className="p-3 font-medium">{bn ? a.asset_name_bn : (a.asset_name_en || a.asset_name_bn)}</td>
                        <td className="p-3 text-center"><Badge variant="secondary">{bn ? ASSET_CATS_BN[a.category] || a.category : a.category}</Badge></td>
                        <td className="p-3 text-center text-muted-foreground">{bn ? (a.location_bn || a.location || '-') : (a.location || '-')}</td>
                        <td className="p-3 text-center">{a.quantity}</td>
                        <td className="p-3 text-center">
                          <Badge className={a.status === 'good' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : a.status === 'damaged' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}>
                            {bn ? ASSET_STATUS_BN[a.status] || a.status : a.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openAssetEdit(a)}><Edit2 className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { if ((await confirm({ description: bn ? 'নিশ্চিত?' : 'Sure?', variant: 'destructive' }))) deleteAsset.mutate(a.id); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Consumption Tab */}
          <TabsContent value="consumption">
            <div className="mt-4">
              <InventoryConsumptionReport />
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <div className="mt-4">
              {logs.length === 0 ? (
                <Card><CardContent className="p-12 text-center text-muted-foreground"><ArrowDownUp className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{bn ? 'কোনো লগ নেই' : 'No logs found'}</p></CardContent></Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left">{bn ? 'সময়' : 'Time'}</th>
                        <th className="p-3 text-left">{bn ? 'আইটেম' : 'Item'}</th>
                        <th className="p-3 text-center">{bn ? 'ধরন' : 'Type'}</th>
                        <th className="p-3 text-center">{bn ? 'পরিমাণ' : 'Amount'}</th>
                        <th className="p-3 text-left">{bn ? 'কারণ' : 'Reason'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log: any) => (
                        <tr key={log.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td className="p-3 font-medium">{bn ? log.inventory_items?.name_bn : (log.inventory_items?.name_en || log.inventory_items?.name_bn)}</td>
                          <td className="p-3 text-center">
                            <Badge className={log.type === 'in' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                              {log.type === 'in' ? (bn ? 'ইন' : 'In') : (bn ? 'আউট' : 'Out')}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-mono">{log.change_amount > 0 ? '+' : ''}{log.change_amount}</td>
                          <td className="p-3 text-muted-foreground">{log.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Item Form Dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? (bn ? 'আইটেম সম্পাদনা' : 'Edit Item') : (bn ? 'নতুন আইটেম' : 'New Item')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label><Input value={itemForm.name_bn} onChange={e => setItemForm(f => ({ ...f, name_bn: e.target.value }))} /></div>
            <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label><Input value={itemForm.name_en} onChange={e => setItemForm(f => ({ ...f, name_en: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
                <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ITEM_CATS.map(c => <SelectItem key={c} value={c}>{bn ? ITEM_CATS_BN[c] : c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'ইউনিট' : 'Unit'}</Label>
                <Select value={itemForm.unit} onValueChange={v => setItemForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{bn ? UNITS_BN[u] : u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{bn ? 'স্টক' : 'Stock'}</Label><NumberInput value={itemForm.current_stock === '' ? null : Number(itemForm.current_stock)} onValueChange={n => setItemForm(f => ({ ...f, current_stock: n ? String(n) : '' }))} /></div>
              <div><Label>{bn ? 'ন্যূনতম' : 'Min Level'}</Label><NumberInput value={itemForm.min_stock_level === '' ? null : Number(itemForm.min_stock_level)} onValueChange={n => setItemForm(f => ({ ...f, min_stock_level: n ? String(n) : '' }))} /></div>
              <div><Label>{bn ? 'দাম' : 'Price'}</Label><NumberInput value={itemForm.buying_price === '' ? null : Number(itemForm.buying_price)} onValueChange={n => setItemForm(f => ({ ...f, buying_price: n ? String(n) : '' }))} /></div>
            </div>
            <div><Label>{bn ? 'নোট' : 'Notes'}</Label><Textarea value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveItem.mutate(itemForm)} disabled={saveItem.isPending || !itemForm.name_bn}>
              {saveItem.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {bn ? 'সংরক্ষণ করুন' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Form Dialog */}
      <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAsset ? (bn ? 'সম্পদ সম্পাদনা' : 'Edit Asset') : (bn ? 'নতুন সম্পদ' : 'New Asset')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label><Input value={assetForm.asset_name_bn} onChange={e => setAssetForm(f => ({ ...f, asset_name_bn: e.target.value }))} /></div>
            <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label><Input value={assetForm.asset_name_en} onChange={e => setAssetForm(f => ({ ...f, asset_name_en: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
                <Select value={assetForm.category} onValueChange={v => setAssetForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_CATS.map(c => <SelectItem key={c} value={c}>{bn ? ASSET_CATS_BN[c] : c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'অবস্থা' : 'Status'}</Label>
                <Select value={assetForm.status} onValueChange={v => setAssetForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_STATUS.map(s => <SelectItem key={s} value={s}>{bn ? ASSET_STATUS_BN[s] : s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'লোকেশন (বাংলা)' : 'Location (BN)'}</Label><Input value={assetForm.location_bn} onChange={e => setAssetForm(f => ({ ...f, location_bn: e.target.value }))} /></div>
              <div><Label>{bn ? 'লোকেশন (EN)' : 'Location (EN)'}</Label><Input value={assetForm.location} onChange={e => setAssetForm(f => ({ ...f, location: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block">{bn ? 'তারিখ' : 'Date'}</Label>
                <DatePicker value={assetForm.purchase_date} onChange={v => setAssetForm(f => ({ ...f, purchase_date: v }))} bengali={bn} clearable />
              </div>
              <div><Label>{bn ? 'দাম' : 'Price'}</Label><NumberInput value={assetForm.purchase_price === '' ? null : Number(assetForm.purchase_price)} onValueChange={n => setAssetForm(f => ({ ...f, purchase_price: n ? String(n) : '' }))} /></div>
              <div><Label>{bn ? 'সংখ্যা' : 'Qty'}</Label><NumberInput value={assetForm.quantity === '' ? null : Number(assetForm.quantity)} onValueChange={n => setAssetForm(f => ({ ...f, quantity: n ? String(n) : '' }))} /></div>
            </div>
            <div><Label>{bn ? 'অবস্থার বিবরণ' : 'Condition Notes'}</Label><Textarea value={assetForm.condition_notes} onChange={e => setAssetForm(f => ({ ...f, condition_notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveAsset.mutate(assetForm)} disabled={saveAsset.isPending || !assetForm.asset_name_bn}>
              {saveAsset.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {bn ? 'সংরক্ষণ করুন' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{bn ? 'স্টক সমন্বয়' : 'Adjust Stock'}</DialogTitle>
          </DialogHeader>
          {stockItem && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{bn ? stockItem.name_bn : (stockItem.name_en || stockItem.name_bn)}</p>
              <p className="text-xs text-muted-foreground">{bn ? 'বর্তমান স্টক:' : 'Current:'} {stockItem.current_stock} {bn ? UNITS_BN[stockItem.unit] || stockItem.unit : stockItem.unit}</p>
              <div>
                <Label>{bn ? 'ধরন' : 'Type'}</Label>
                <Select value={stockForm.type} onValueChange={v => setStockForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{bn ? 'স্টক ইন (+)' : 'Stock In (+)'}</SelectItem>
                    <SelectItem value="out">{bn ? 'স্টক আউট (-)' : 'Stock Out (-)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{bn ? 'পরিমাণ' : 'Amount'}</Label><NumberInput value={stockForm.change_amount === '' ? null : Number(stockForm.change_amount)} onValueChange={n => setStockForm(f => ({ ...f, change_amount: n ? String(n) : '' }))} /></div>
              <div><Label>{bn ? 'কারণ' : 'Reason'}</Label><Input value={stockForm.reason} onChange={e => setStockForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => adjustStock.mutate()} disabled={adjustStock.isPending}>
                {adjustStock.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {bn ? 'আপডেট করুন' : 'Update'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminInventory;
