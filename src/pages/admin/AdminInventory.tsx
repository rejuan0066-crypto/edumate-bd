import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Package, AlertTriangle, Plus, Edit2, Trash2, Loader2,
  Box, Monitor, ArrowDownUp, BarChart3, Search, TrendingDown,
  PlusCircle, MinusCircle, Eye, CheckCircle2, History, Wrench, XCircle
} from 'lucide-react';
import InventoryConsumptionReport from '@/components/inventory/InventoryConsumptionReport';

// Comprehensive units supporting construction, food, and general materials
const UNITS = [
  'pcs', 'bag', 'ton', 'kg', 'gram', 'cft', 'truck',
  'sqft', 'liter', 'meter', 'feet', 'set', 'packet', 'ream', 'box'
];

const UNITS_BN: Record<string, string> = {
  pcs: 'পিস',
  bag: 'বস্তা/ব্যাগ',
  ton: 'টন',
  kg: 'কেজি',
  gram: 'গ্রাম',
  cft: 'সিএফটি (ঘনফুট)',
  truck: 'ট্রাক/গাড়ি',
  sqft: 'স্কয়ার ফিট',
  liter: 'লিটার',
  meter: 'মিটার',
  feet: 'ফুট',
  set: 'সেট',
  packet: 'প্যাকেট',
  ream: 'রিম',
  box: 'বক্স'
};

const ITEM_CATS = [
  'construction',
  'stationery',
  'grocery',
  'cleaning',
  'electrical',
  'hardware',
  'general',
  'other'
];

const ITEM_CATS_BN: Record<string, string> = {
  construction: 'বিল্ডিং ও নির্মাণ সামগ্রী',
  stationery: 'শিক্ষা ও স্টেশনারি',
  grocery: 'মুদি ও খাদ্যসামগ্রী',
  cleaning: 'পরিচ্ছন্নতা সামগ্রী',
  electrical: 'ইলেকট্রিক্যাল ও লাইটিং',
  hardware: 'হার্ডওয়্যার ও স্যানিটারি',
  general: 'সাধারণ সামগ্রী',
  other: 'অন্যান্য'
};

const ASSET_CATS = [
  'furniture',
  'electronics',
  'appliance',
  'sound_system',
  'vehicle',
  'equipment',
  'other'
];

const ASSET_CATS_BN: Record<string, string> = {
  furniture: 'আসবাবপত্র / ফার্নিচার',
  electronics: 'ইলেকট্রনিক্স ও কম্পিউটার',
  appliance: 'যন্ত্রপাতি ও মোটর',
  sound_system: 'সাউন্ড সিস্টেম ও মাইক',
  vehicle: 'যানবাহন',
  equipment: 'সরঞ্জাম ও যন্ত্রপাতি',
  other: 'অন্যান্য সম্পদ'
};

const ASSET_STATUS = ['good', 'damaged', 'repairing', 'disposed'];
const ASSET_STATUS_BN: Record<string, string> = {
  good: 'ভালো / সক্রিয়',
  damaged: 'নষ্ট',
  repairing: 'মেরামতাধীন',
  disposed: 'পরিত্যক্ত'
};

const AdminInventory = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  const [tab, setTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  // Dedicated Delete Confirmation Dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'item' | 'asset' } | null>(null);

  // Item Create / Edit dialog
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    name_bn: '',
    name_en: '',
    category: 'construction',
    current_stock: '0',
    total_purchased: '0',
    unit: 'bag',
    min_stock_level: '5',
    buying_price: '0',
    notes: '',
  });

  // Direct Stock In (ক্রয় / স্টক বৃদ্ধি) dialog
  const [stockInOpen, setStockInOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<any>(null);
  const [stockInForm, setStockInForm] = useState({
    amount: '',
    unit_price: '',
    total_price: '',
    project_name: '',
    memo_no: '',
    notes: '',
  });

  // Direct Stock Out (ব্যবহার / ইস্যু) dialog
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [stockOutForm, setStockOutForm] = useState({
    amount: '',
    recipient: '',
    project_name: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Item Detail Drilldown Modal
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Asset Create / Edit dialog
  const [assetOpen, setAssetOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [assetForm, setAssetForm] = useState({
    asset_name_bn: '',
    asset_name_en: '',
    category: 'furniture',
    location: '',
    location_bn: '',
    purchase_date: '',
    purchase_price: '0',
    status: 'good',
    quantity: '1',
    damaged_quantity: '0',
    condition_notes: '',
  });

  // Asset Condition/Damage Update dialog
  const [assetStatusOpen, setAssetStatusOpen] = useState(false);
  const [statusAsset, setStatusAsset] = useState<any>(null);
  const [statusForm, setStatusForm] = useState({
    damaged_quantity: '0',
    status: 'good',
    condition_notes: '',
  });

  // Queries
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fixed_assets')
        .select('*')
        .eq('is_active', true)
        .order('asset_name_bn');
      return data || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['inventory-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_logs')
        .select('*, inventory_items(name_bn, name_en, unit, category)')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  // Item Mutations
  const saveItem = useMutation({
    mutationFn: async (form: any) => {
      const curStock = Number(form.current_stock) || 0;
      const totalPurchased = form.total_purchased !== undefined && form.total_purchased !== '' 
        ? Number(form.total_purchased) 
        : (editItem ? Number(editItem.total_purchased ?? curStock) : curStock);

      const payload: Record<string, any> = {
        name_bn: form.name_bn,
        name_en: form.name_en || null,
        category: form.category,
        current_stock: curStock,
        total_purchased: totalPurchased,
        unit: form.unit,
        min_stock_level: Number(form.min_stock_level) || 0,
        buying_price: Number(form.buying_price) || 0,
        notes: form.notes || null,
      };

      if (editItem) {
        // Try update with all columns
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editItem.id);
        if (error) {
          // Fallback if advanced columns do not exist in remote table
          if (error.message?.includes('column') || error.code === '42703') {
            const fallbackPayload = {
              name_bn: form.name_bn,
              name_en: form.name_en || null,
              category: form.category,
              current_stock: curStock,
              unit: form.unit,
              min_stock_level: Number(form.min_stock_level) || 0,
              buying_price: Number(form.buying_price) || 0,
              notes: form.notes || null,
            };
            const { error: fallbackErr } = await supabase.from('inventory_items').update(fallbackPayload).eq('id', editItem.id);
            if (fallbackErr) throw fallbackErr;
          } else {
            throw error;
          }
        }
      } else {
        payload.total_purchased = curStock;
        payload.total_consumed = 0;
        let inserted: any = null;
        const { data, error } = await supabase.from('inventory_items').insert(payload as any).select().single();
        if (error) {
          if (error.message?.includes('column') || error.code === '42703') {
            const fallbackPayload = {
              name_bn: form.name_bn,
              name_en: form.name_en || null,
              category: form.category,
              current_stock: curStock,
              unit: form.unit,
              min_stock_level: Number(form.min_stock_level) || 0,
              buying_price: Number(form.buying_price) || 0,
              notes: form.notes || null,
            };
            const { data: fbData, error: fbErr } = await supabase.from('inventory_items').insert(fallbackPayload).select().single();
            if (fbErr) throw fbErr;
            inserted = fbData;
          } else {
            throw error;
          }
        } else {
          inserted = data;
        }

        // If initial stock was provided, create an initial stock in log
        if (curStock > 0 && inserted) {
          try {
            await supabase.from('inventory_logs').insert({
              item_id: inserted.id,
              change_amount: curStock,
              type: 'in',
              reason: bn ? 'প্রারম্ভিক স্টক এন্ট্রি' : 'Initial Stock Entry',
              unit_price: Number(form.buying_price) || 0,
              total_price: curStock * (Number(form.buying_price) || 0),
            });
          } catch (logErr) {
            console.warn('Initial stock log error:', logErr);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(editItem ? (bn ? 'আইটেম আপডেট করা হয়েছে' : 'Item updated') : (bn ? 'আইটেম সংরক্ষিত হয়েছে' : 'Item saved'));
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      setItemOpen(false);
      setEditItem(null);
    },
    onError: (e: any) => {
      console.error('Save item error:', e);
      toast.error(e.message || (bn ? 'আইটেম সংরক্ষণ করা যায়নি' : 'Failed to save item'));
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      // First try soft delete (is_active: false)
      const { error: softErr } = await supabase.from('inventory_items').update({ is_active: false }).eq('id', id);
      if (softErr) {
        // Fallback to hard delete
        const { error: hardErr } = await supabase.from('inventory_items').delete().eq('id', id);
        if (hardErr) throw hardErr;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'আইটেম মুছে ফেলা হয়েছে' : 'Item deleted');
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
    },
    onError: (e: any) => {
      console.error('Delete item error:', e);
      toast.error(e.message || (bn ? 'আইটেম মুছে ফেলা সম্ভব হয়নি' : 'Failed to delete item'));
    },
  });

  // Stock In (ক্রয় / যোগ) Mutation
  const saveStockIn = useMutation({
    mutationFn: async () => {
      if (!selectedStockItem) return;
      const amt = Number(stockInForm.amount);
      if (!amt || amt <= 0) throw new Error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid amount');

      const unitPrice = Number(stockInForm.unit_price) || Number(selectedStockItem.buying_price) || 0;
      const totalPrice = Number(stockInForm.total_price) || (amt * unitPrice);

      const currentStock = Number(selectedStockItem.current_stock || 0);
      const totalPurchased = Number(selectedStockItem.total_purchased || currentStock || 0);

      const newStock = currentStock + amt;
      const newTotalPurchased = totalPurchased + amt;

      // Update item
      const updatePayload: any = {
        current_stock: newStock,
        total_purchased: newTotalPurchased,
      };
      if (unitPrice > 0) updatePayload.buying_price = unitPrice;

      const { error: itemErr } = await supabase
        .from('inventory_items')
        .update(updatePayload)
        .eq('id', selectedStockItem.id);
      if (itemErr) throw itemErr;

      // Insert log
      const reasonText = [
        bn ? 'ক্রয় / স্টক যোগ' : 'Stock In / Purchase',
        stockInForm.memo_no ? `(মেমো: ${stockInForm.memo_no})` : '',
        stockInForm.notes ? `- ${stockInForm.notes}` : '',
      ].filter(Boolean).join(' ');

      const { error: logErr } = await supabase.from('inventory_logs').insert({
        item_id: selectedStockItem.id,
        change_amount: amt,
        type: 'in',
        reason: reasonText,
        project_name: stockInForm.project_name || null,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      toast.success(bn ? 'ক্রয় সফলভাবে স্টক-এ যোগ হয়েছে' : 'Stock In added successfully');
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      setStockInOpen(false);
      setSelectedStockItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Stock Out (ব্যবহার / ইস্যু) Mutation
  const saveStockOut = useMutation({
    mutationFn: async () => {
      if (!selectedStockItem) return;
      const amt = Number(stockOutForm.amount);
      if (!amt || amt <= 0) throw new Error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid amount');

      const currentStock = Number(selectedStockItem.current_stock || 0);
      if (amt > currentStock) {
        throw new Error(bn ? `মজুত স্টকের চেয়ে বেশি দেওয়া সম্ভব নয় (সর্বোচ্চ: ${currentStock})` : `Cannot issue more than available stock (${currentStock})`);
      }

      const totalConsumed = Number(selectedStockItem.total_consumed || 0);
      const newStock = Math.max(0, currentStock - amt);
      const newTotalConsumed = totalConsumed + amt;

      const { error: itemErr } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          total_consumed: newTotalConsumed,
        })
        .eq('id', selectedStockItem.id);
      if (itemErr) throw itemErr;

      const reasonText = [
        bn ? 'ব্যবহার / বিতরণ' : 'Stock Out / Issued',
        stockOutForm.recipient ? `(গ্রহীতা: ${stockOutForm.recipient})` : '',
        stockOutForm.notes ? `- ${stockOutForm.notes}` : '',
      ].filter(Boolean).join(' ');

      const { error: logErr } = await supabase.from('inventory_logs').insert({
        item_id: selectedStockItem.id,
        change_amount: -amt,
        type: 'out',
        reason: reasonText,
        project_name: stockOutForm.project_name || null,
        recipient: stockOutForm.recipient || null,
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      toast.success(bn ? 'ব্যবহার/ইস্যু সফলভাবে লিপিবদ্ধ হয়েছে' : 'Usage logged successfully');
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      setStockOutOpen(false);
      setSelectedStockItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Asset Mutations
  const saveAsset = useMutation({
    mutationFn: async (form: any) => {
      const qty = Number(form.quantity) || 1;
      const damagedQty = Math.min(qty, Number(form.damaged_quantity) || 0);

      let status = form.status;
      if (damagedQty >= qty && qty > 0) status = 'damaged';
      else if (damagedQty > 0 && status === 'good') status = 'repairing';

      const payload: Record<string, any> = {
        asset_name_bn: form.asset_name_bn,
        asset_name_en: form.asset_name_en || null,
        category: form.category,
        location: form.location || null,
        location_bn: form.location_bn || null,
        purchase_date: form.purchase_date || null,
        purchase_price: Number(form.purchase_price) || 0,
        status: status,
        quantity: qty,
        damaged_quantity: damagedQty,
        condition_notes: form.condition_notes || null,
      };

      if (editAsset) {
        const { error } = await supabase.from('fixed_assets').update(payload).eq('id', editAsset.id);
        if (error) {
          if (error.message?.includes('column') || error.code === '42703') {
            delete payload.damaged_quantity;
            delete payload.expense_id;
            const { error: retryErr } = await supabase.from('fixed_assets').update(payload).eq('id', editAsset.id);
            if (retryErr) throw retryErr;
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase.from('fixed_assets').insert(payload as any);
        if (error) {
          if (error.message?.includes('column') || error.code === '42703') {
            delete payload.damaged_quantity;
            delete payload.expense_id;
            const { error: retryErr } = await supabase.from('fixed_assets').insert(payload as any);
            if (retryErr) throw retryErr;
          } else {
            throw error;
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(editAsset ? (bn ? 'সম্পদ আপডেট হয়েছে' : 'Asset updated') : (bn ? 'সম্পদ সংরক্ষিত হয়েছে' : 'Asset saved'));
      qc.invalidateQueries({ queryKey: ['fixed-assets'] });
      setAssetOpen(false);
      setEditAsset(null);
    },
    onError: (e: any) => {
      console.error('Save asset error:', e);
      toast.error(e.message || (bn ? 'সম্পদ সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save asset'));
    },
  });

  const updateAssetStatus = useMutation({
    mutationFn: async () => {
      if (!statusAsset) return;
      const totalQty = Number(statusAsset.quantity) || 1;
      const damagedQty = Math.min(totalQty, Math.max(0, Number(statusForm.damaged_quantity) || 0));

      const { error } = await supabase.from('fixed_assets').update({
        damaged_quantity: damagedQty,
        status: statusForm.status,
        condition_notes: statusForm.condition_notes || null,
      }).eq('id', statusAsset.id);
      if (error) {
        if (error.message?.includes('column') || error.code === '42703') {
          const { error: retryErr } = await supabase.from('fixed_assets').update({
            status: statusForm.status,
            condition_notes: statusForm.condition_notes || null,
          }).eq('id', statusAsset.id);
          if (retryErr) throw retryErr;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সম্পদের অবস্থা আপডেট হয়েছে' : 'Asset condition updated');
      qc.invalidateQueries({ queryKey: ['fixed-assets'] });
      setAssetStatusOpen(false);
      setStatusAsset(null);
    },
    onError: (e: any) => {
      console.error('Update asset status error:', e);
      toast.error(e.message || (bn ? 'অবস্থা আপডেট ব্যর্থ হয়েছে' : 'Failed to update asset status'));
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error: softErr } = await supabase.from('fixed_assets').update({ is_active: false }).eq('id', id);
      if (softErr) {
        const { error: hardErr } = await supabase.from('fixed_assets').delete().eq('id', id);
        if (hardErr) throw hardErr;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সম্পদ মুছে ফেলা হয়েছে' : 'Asset deleted');
      qc.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
    onError: (e: any) => {
      console.error('Delete asset error:', e);
      toast.error(e.message || (bn ? 'সম্পদ মুছে ফেলা সম্ভব হয়নি' : 'Failed to delete asset'));
    },
  });

  // Modal openers
  const openItemEdit = (item?: any) => {
    if (item) {
      setEditItem(item);
      setItemForm({
        name_bn: item.name_bn || '',
        name_en: item.name_en || '',
        category: item.category || 'construction',
        current_stock: String(item.current_stock ?? 0),
        total_purchased: String(item.total_purchased ?? item.current_stock ?? 0),
        unit: item.unit || 'bag',
        min_stock_level: String(item.min_stock_level ?? 5),
        buying_price: String(item.buying_price ?? 0),
        notes: item.notes || '',
      });
    } else {
      setEditItem(null);
      setItemForm({
        name_bn: '',
        name_en: '',
        category: 'construction',
        current_stock: '0',
        total_purchased: '0',
        unit: 'bag',
        min_stock_level: '5',
        buying_price: '0',
        notes: '',
      });
    }
    setItemOpen(true);
  };

  const openStockInModal = (item: any) => {
    setSelectedStockItem(item);
    setStockInForm({
      amount: '',
      unit_price: String(item.buying_price || ''),
      total_price: '',
      project_name: '',
      memo_no: '',
      notes: '',
    });
    setStockInOpen(true);
  };

  const openStockOutModal = (item: any) => {
    setSelectedStockItem(item);
    setStockOutForm({
      amount: '',
      recipient: '',
      project_name: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setStockOutOpen(true);
  };

  const openItemDetailModal = (item: any) => {
    setDetailItem(item);
    setDetailModalOpen(true);
  };

  const openAssetEdit = (asset?: any) => {
    if (asset) {
      setEditAsset(asset);
      setAssetForm({
        asset_name_bn: asset.asset_name_bn,
        asset_name_en: asset.asset_name_en || '',
        category: asset.category || 'furniture',
        location: asset.location || '',
        location_bn: asset.location_bn || '',
        purchase_date: asset.purchase_date || '',
        purchase_price: String(asset.purchase_price || 0),
        status: asset.status || 'good',
        quantity: String(asset.quantity || 1),
        damaged_quantity: String(asset.damaged_quantity || 0),
        condition_notes: asset.condition_notes || '',
      });
    } else {
      setEditAsset(null);
      setAssetForm({
        asset_name_bn: '',
        asset_name_en: '',
        category: 'furniture',
        location: '',
        location_bn: '',
        purchase_date: '',
        purchase_price: '0',
        status: 'good',
        quantity: '1',
        damaged_quantity: '0',
        condition_notes: '',
      });
    }
    setAssetOpen(true);
  };

  const openAssetStatusModal = (asset: any) => {
    setStatusAsset(asset);
    setStatusForm({
      damaged_quantity: String(asset.damaged_quantity || (asset.status === 'damaged' ? asset.quantity : 0)),
      status: asset.status || 'good',
      condition_notes: asset.condition_notes || '',
    });
    setAssetStatusOpen(true);
  };

  // Calculations
  const lowStockItems = items.filter((i: any) => Number(i.current_stock || 0) <= Number(i.min_stock_level || 0) && Number(i.min_stock_level || 0) > 0);
  const totalStockValue = items.reduce((s: number, i: any) => s + (Number(i.current_stock || 0) * Number(i.buying_price || 0)), 0);
  const totalPurchasedValue = items.reduce((s: number, i: any) => s + (Number(i.total_purchased || i.current_stock || 0) * Number(i.buying_price || 0)), 0);

  const totalAssetCount = assets.reduce((s: number, a: any) => s + Number(a.quantity || 1), 0);
  const totalDamagedAssetCount = assets.reduce((s: number, a: any) => s + Number(a.damaged_quantity || (a.status === 'damaged' ? a.quantity : 0)), 0);
  const totalActiveAssetCount = Math.max(0, totalAssetCount - totalDamagedAssetCount);
  const totalAssetValue = assets.reduce((s: number, a: any) => s + (Number(a.purchase_price || 0) * Number(a.quantity || 1)), 0);

  // Filtered Items
  const filteredItems = items.filter((i: any) => {
    if (search) {
      const s = search.toLowerCase();
      const match = i.name_bn?.toLowerCase().includes(s) || i.name_en?.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    if (stockStatusFilter === 'low') {
      return Number(i.current_stock || 0) <= Number(i.min_stock_level || 0) && Number(i.min_stock_level || 0) > 0;
    }
    if (stockStatusFilter === 'out') {
      return Number(i.current_stock || 0) <= 0;
    }
    if (stockStatusFilter === 'available') {
      return Number(i.current_stock || 0) > 0;
    }
    return true;
  });

  // Filtered Assets
  const filteredAssets = assets.filter((a: any) => {
    if (search) {
      const s = search.toLowerCase();
      const match = a.asset_name_bn?.toLowerCase().includes(s) || a.asset_name_en?.toLowerCase().includes(s) || a.location_bn?.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  // Logs for specific detail item
  const itemLogs = detailItem ? logs.filter((l: any) => l.item_id === detailItem.id) : [];

  if (itemsLoading || assetsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Standard Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            {bn ? 'ইনভেন্টরি ও সম্পদ ব্যবস্থাপনা' : 'Inventory & Asset Management'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {bn ? 'বিল্ডিং সামগ্রী, আসবাবপত্র, মালামাল ক্রয়-ব্যবহার ও অবশিষ্ট স্টক ট্র্যাকিং' : 'Materials, furniture, assets purchase, usage & stock tracking'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5 p-1 bg-muted/60 border border-border/70 rounded-xl h-auto gap-1">
          <TabsTrigger value="dashboard" className="rounded-lg flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">{bn ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-medium py-1.5 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <Box className="w-4 h-4" />
            <span>{bn ? 'মালামাল' : 'Items'}</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{items.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-medium py-1.5 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <Monitor className="w-4 h-4" />
            <span>{bn ? 'আসবাব' : 'Assets'}</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{assets.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="consumption" className="rounded-lg flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <TrendingDown className="w-4 h-4" />
            <span className="hidden sm:inline">{bn ? 'ব্যবহার' : 'Usage'}</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <ArrowDownUp className="w-4 h-4" />
            <span className="hidden sm:inline">{bn ? 'লগ' : 'Logs'}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Dashboard Tab ── */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { label: bn ? 'মোট মালামাল ধরন' : 'Item Types', value: items.length, icon: Box, gradient: 'from-blue-600 to-indigo-700' },
              { label: bn ? 'মোট মজুত মূল্য' : 'Stock Value', value: `৳${Math.round(totalStockValue).toLocaleString()}`, icon: Package, gradient: 'from-emerald-600 to-teal-700' },
              { label: bn ? 'কম স্টক অ্যালার্ট' : 'Low Stock', value: lowStockItems.length, icon: AlertTriangle, gradient: lowStockItems.length > 0 ? 'from-rose-500 to-red-600' : 'from-slate-600 to-slate-700' },
              { label: bn ? 'মোট সম্পদ সংখ্যা' : 'Total Assets', value: totalAssetCount, icon: Monitor, gradient: 'from-violet-600 to-purple-700' },
              { label: bn ? 'সক্রিয় ভালো সম্পদ' : 'Usable Assets', value: totalActiveAssetCount, icon: CheckCircle2, gradient: 'from-teal-600 to-emerald-700' },
              { label: bn ? 'নষ্ট/মেরামতে' : 'Damaged/Repair', value: totalDamagedAssetCount, icon: Wrench, gradient: totalDamagedAssetCount > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-600 to-slate-700' },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-4 flex flex-col justify-between bg-gradient-to-br ${s.gradient} text-white shadow-md transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white/80">{s.label}</span>
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold tracking-tight mt-2 drop-shadow-sm tabular-nums">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Shortcuts & Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low Stock Alerts */}
            <Card className="rounded-2xl border border-destructive/30 shadow-sm overflow-hidden">
              <div className="p-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between">
                <h3 className="font-bold text-destructive text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {bn ? 'কম স্টক সতর্কতা (পুনরায় ক্রয় প্রয়োজন)' : 'Low Stock Alerts'}
                </h3>
                <Badge variant="destructive" className="text-xs">{lowStockItems.length}</Badge>
              </div>
              <CardContent className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-center py-6 text-muted-foreground">
                    {bn ? 'সব আইটেমের পর্যাপ্ত স্টক মজুত রয়েছে ✅' : 'All items have sufficient stock'}
                  </p>
                ) : (
                  lowStockItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                      <div>
                        <p className="font-bold text-sm">{bn ? item.name_bn : (item.name_en || item.name_bn)}</p>
                        <p className="text-xs text-muted-foreground">
                          {bn ? 'ন্যূনতম মাত্রা:' : 'Min Level:'} {item.min_stock_level} {bn ? UNITS_BN[item.unit] || item.unit : item.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="font-bold text-xs">
                          {item.current_stock} {bn ? UNITS_BN[item.unit] || item.unit : item.unit}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStockInModal(item)}
                          className="h-8 gap-1 rounded-lg text-xs font-semibold text-primary border-primary/30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {bn ? 'স্টক ইন' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Damaged Assets Status */}
            <Card className="rounded-2xl border border-orange-500/30 shadow-sm overflow-hidden">
              <div className="p-4 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
                <h3 className="font-bold text-orange-700 dark:text-orange-400 text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  {bn ? 'নষ্ট / মেরামত / পরিত্যক্ত সম্পদ তালিকা' : 'Damaged / Repairing Assets'}
                </h3>
                <Badge className="bg-orange-500 text-white text-xs">{totalDamagedAssetCount}</Badge>
              </div>
              <CardContent className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                {assets.filter((a: any) => Number(a.damaged_quantity || 0) > 0 || a.status !== 'good').length === 0 ? (
                  <p className="text-sm text-center py-6 text-muted-foreground">
                    {bn ? 'সব আসবাব ও যন্ত্রপাতি ভালো অবস্থায় আছে ✅' : 'All assets in good condition'}
                  </p>
                ) : (
                  assets.filter((a: any) => Number(a.damaged_quantity || 0) > 0 || a.status !== 'good').map((a: any) => {
                    const damaged = Number(a.damaged_quantity || (a.status === 'damaged' ? a.quantity : 0));
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                        <div>
                          <p className="font-bold text-sm">{bn ? a.asset_name_bn : (a.asset_name_en || a.asset_name_bn)}</p>
                          <p className="text-xs text-muted-foreground">
                            {bn ? 'লোকেশন:' : 'Loc:'} {a.location_bn || a.location || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-semibold text-xs">
                            {damaged} {bn ? 'টি নষ্ট' : 'damaged'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAssetStatusModal(a)}
                            className="h-8 rounded-lg text-xs font-semibold"
                          >
                            {bn ? 'আপডেট' : 'Update'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── 2. Items Tab (মালামাল ও নির্মাণ সামগ্রী) ── */}
        <TabsContent value="items" className="space-y-4 mt-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={bn ? 'নাম বা বিবরণ দিয়ে খুঁজুন...' : 'Search items...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] rounded-xl text-xs font-medium">
                  <SelectValue placeholder={bn ? 'সব ক্যাটাগরি' : 'Category'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">{bn ? 'সব ক্যাটাগরি' : 'All Categories'}</SelectItem>
                  {ITEM_CATS.map(c => (
                    <SelectItem key={c} value={c}>{bn ? ITEM_CATS_BN[c] : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                <SelectTrigger className="w-[130px] rounded-xl text-xs font-medium">
                  <SelectValue placeholder={bn ? 'স্টক অবস্থা' : 'Stock'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সব স্টক' : 'All Stock'}</SelectItem>
                  <SelectItem value="available">{bn ? 'মজুত আছে' : 'Available'}</SelectItem>
                  <SelectItem value="low">{bn ? 'কম স্টক' : 'Low Stock'}</SelectItem>
                  <SelectItem value="out">{bn ? 'স্টক শূন্য' : 'Out of Stock'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => openItemEdit()} className="gap-2 rounded-xl font-bold shadow-md">
              <Plus className="w-4 h-4" />
              {bn ? 'নতুন আইটেম যোগ করুন' : 'Add New Item'}
            </Button>
          </div>

          {/* Items Table */}
          {filteredItems.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Box className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                <p className="font-medium">{bn ? 'কোনো আইটেম পাওয়া যায়নি' : 'No items found'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 text-left w-12">#</th>
                      <th className="p-3.5 text-left">{bn ? 'আইটেমের নাম ও ক্যাটাগরি' : 'Item & Category'}</th>
                      <th className="p-3.5 text-center font-bold text-foreground/80">{bn ? 'মোট ক্রয় / ইন' : 'Total In'}</th>
                      <th className="p-3.5 text-center font-bold text-foreground/80">{bn ? 'মোট ব্যবহার' : 'Total Used'}</th>
                      <th className="p-3.5 text-center font-bold text-emerald-700 dark:text-emerald-400">{bn ? 'বর্তমান মজুত' : 'In Stock'}</th>
                      <th className="p-3.5 text-center">{bn ? 'দর ও মোট মূল্য' : 'Price / Value'}</th>
                      <th className="p-3.5 text-center">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="p-3.5 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredItems.map((item: any, idx: number) => {
                      const curStock = Number(item.current_stock || 0);
                      const totalIn = Number(item.total_purchased || curStock || 0);
                      const totalOut = Number(item.total_consumed || 0);
                      const minStock = Number(item.min_stock_level || 0);
                      const unitLabel = bn ? (UNITS_BN[item.unit] || item.unit) : item.unit;
                      const isLow = curStock <= minStock && minStock > 0;
                      const isOut = curStock <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3.5 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="p-3.5">
                            <div className="flex flex-col">
                              <span
                                onClick={() => openItemDetailModal(item)}
                                className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                              >
                                {bn ? item.name_bn : (item.name_en || item.name_bn)}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                                  {bn ? ITEM_CATS_BN[item.category] || item.category : item.category}
                                </Badge>
                                {item.notes && (
                                  <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                    {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Total Purchased / In */}
                          <td className="p-3.5 text-center font-semibold tabular-nums text-foreground/80">
                            {totalIn} <span className="text-xs text-muted-foreground font-normal">{unitLabel}</span>
                          </td>
                          {/* Total Used / Out */}
                          <td className="p-3.5 text-center font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                            {totalOut} <span className="text-xs text-muted-foreground font-normal">{unitLabel}</span>
                          </td>
                          {/* In Stock */}
                          <td className="p-3.5 text-center">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tabular-nums shadow-sm",
                              isOut
                                ? "bg-destructive/15 text-destructive"
                                : isLow
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            )}>
                              {curStock} {unitLabel}
                            </span>
                          </td>
                          {/* Price & Value */}
                          <td className="p-3.5 text-center">
                            <div className="text-xs font-semibold tabular-nums">৳{item.buying_price || 0}</div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">
                              {bn ? 'মজুত:' : 'Val:'} ৳{Math.round(curStock * (item.buying_price || 0)).toLocaleString()}
                            </div>
                          </td>
                          {/* Status */}
                          <td className="p-3.5 text-center">
                            {isOut ? (
                              <Badge variant="destructive" className="text-[10px] font-bold">
                                {bn ? 'মজুত শেষ' : 'Out'}
                              </Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                {bn ? 'কম স্টক' : 'Low'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px] font-bold">
                                {bn ? 'পর্যাপ্ত' : 'Good'}
                              </Badge>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Stock In Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStockInModal(item)}
                                className="h-7 px-2 rounded-lg text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title={bn ? 'ক্রয় / স্টক যোগ করুন' : 'Stock In'}
                              >
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                {bn ? 'ক্রয়' : 'In'}
                              </Button>
                              {/* Stock Out Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStockOutModal(item)}
                                className="h-7 px-2 rounded-lg text-xs font-semibold text-orange-700 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                                title={bn ? 'ব্যবহার / বিতরণ এন্ট্রি' : 'Stock Out'}
                              >
                                <MinusCircle className="w-3.5 h-3.5 mr-1" />
                                {bn ? 'ব্যবহার' : 'Out'}
                              </Button>
                              {/* Detail Drilldown */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openItemDetailModal(item)}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                                title={bn ? 'সম্পূর্ণ হিসাব ও বিস্তারিত' : 'View Details'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {/* Edit */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openItemEdit(item)}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                title={bn ? 'এডিট' : 'Edit'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              {/* Delete */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setDeleteTarget({
                                    id: item.id,
                                    name: bn ? item.name_bn : (item.name_en || item.name_bn),
                                    type: 'item'
                                  });
                                }}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                                title={bn ? 'মুছুন' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── 3. Assets Tab (আসবাবপত্র ও যন্ত্রপাতি) ── */}
        <TabsContent value="assets" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={bn ? 'সম্পদের নাম বা রুম দিয়ে খুঁজুন...' : 'Search assets...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] rounded-xl text-xs font-medium">
                  <SelectValue placeholder={bn ? 'সব ক্যাটাগরি' : 'Category'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সব সম্পদ ক্যাটাগরি' : 'All Categories'}</SelectItem>
                  {ASSET_CATS.map(c => (
                    <SelectItem key={c} value={c}>{bn ? ASSET_CATS_BN[c] : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => openAssetEdit()} className="gap-2 rounded-xl font-bold shadow-md">
              <Plus className="w-4 h-4" />
              {bn ? 'নতুন সম্পদ যোগ করুন' : 'Add Asset'}
            </Button>
          </div>

          {filteredAssets.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                <p className="font-medium">{bn ? 'কোনো সম্পদ পাওয়া যায়নি' : 'No assets found'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 text-left w-12">#</th>
                      <th className="p-3.5 text-left">{bn ? 'সম্পদ ও ক্যাটাগরি' : 'Asset & Category'}</th>
                      <th className="p-3.5 text-center">{bn ? 'অবস্থান / রুম' : 'Location'}</th>
                      <th className="p-3.5 text-center font-bold text-foreground/80">{bn ? 'মোট সংখ্যা' : 'Total Qty'}</th>
                      <th className="p-3.5 text-center font-bold text-orange-600 dark:text-orange-400">{bn ? 'নষ্ট / মেরামত' : 'Damaged / Repair'}</th>
                      <th className="p-3.5 text-center font-bold text-emerald-700 dark:text-emerald-400">{bn ? 'সক্রিয় ভালো সম্পদ' : 'Active Usable'}</th>
                      <th className="p-3.5 text-center">{bn ? 'ক্রয়মূল্য' : 'Purchase Price'}</th>
                      <th className="p-3.5 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredAssets.map((a: any, idx: number) => {
                      const totalQty = Number(a.quantity || 1);
                      const damagedQty = Number(a.damaged_quantity || (a.status === 'damaged' ? totalQty : 0));
                      const activeQty = Math.max(0, totalQty - damagedQty);

                      return (
                        <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3.5 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="p-3.5">
                            <p className="font-bold text-foreground">
                              {bn ? a.asset_name_bn : (a.asset_name_en || a.asset_name_bn)}
                            </p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">
                              {bn ? ASSET_CATS_BN[a.category] || a.category : a.category}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-center text-xs text-muted-foreground font-medium">
                            {bn ? (a.location_bn || a.location || '—') : (a.location || '—')}
                          </td>
                          <td className="p-3.5 text-center font-bold text-foreground/80 tabular-nums">
                            {totalQty} {bn ? 'টি' : ''}
                          </td>
                          <td className="p-3.5 text-center font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                            {damagedQty > 0 ? (
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold text-xs">
                                {damagedQty} {bn ? 'টি' : ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground font-normal">০</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                              {activeQty} {bn ? 'টি ভালো' : 'active'}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-center font-semibold text-xs tabular-nums">
                            ৳{Math.round(a.purchase_price || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Condition / Damaged status updater */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAssetStatusModal(a)}
                                className="h-7 px-2 rounded-lg text-xs font-semibold gap-1 text-orange-700 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                                title={bn ? 'অবস্থা ও নষ্টের হিসাব আপডেট' : 'Update Condition'}
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                {bn ? 'অবস্থা' : 'Status'}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openAssetEdit(a)}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setDeleteTarget({
                                    id: a.id,
                                    name: bn ? a.asset_name_bn : (a.asset_name_en || a.asset_name_bn),
                                    type: 'asset'
                                  });
                                }}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── 4. Consumption Report Tab ── */}
        <TabsContent value="consumption" className="mt-4">
          <InventoryConsumptionReport />
        </TabsContent>

        {/* ── 5. Logs & History Tab ── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {logs.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                <ArrowDownUp className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                <p>{bn ? 'কোনো লেনদেন হিস্ট্রি নেই' : 'No logs found'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 text-left">{bn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                      <th className="p-3.5 text-left">{bn ? 'আইটেমের নাম' : 'Item Name'}</th>
                      <th className="p-3.5 text-center">{bn ? 'ধরন' : 'Type'}</th>
                      <th className="p-3.5 text-center">{bn ? 'পরিমাণ' : 'Amount'}</th>
                      <th className="p-3.5 text-left">{bn ? 'প্রকল্প / কাজের নাম' : 'Project / Purpose'}</th>
                      <th className="p-3.5 text-left">{bn ? 'গ্রহীতা / বিবরণ' : 'Recipient / Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {logs.map((log: any) => {
                      const isIn = log.type === 'in';
                      const itemObj = log.inventory_items;
                      const unitLabel = itemObj?.unit ? (bn ? (UNITS_BN[itemObj.unit] || itemObj.unit) : itemObj.unit) : '';

                      return (
                        <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3.5 text-xs text-muted-foreground font-medium">
                            {new Date(log.created_at).toLocaleDateString('bn-BD', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3.5 font-bold text-foreground">
                            {itemObj ? (bn ? itemObj.name_bn : (itemObj.name_en || itemObj.name_bn)) : '—'}
                          </td>
                          <td className="p-3.5 text-center">
                            <Badge className={isIn ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs" : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold text-xs"}>
                              {isIn ? (bn ? 'ক্রয় / স্টক ইন' : 'In') : (bn ? 'ব্যবহার / ইস্যু' : 'Out')}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-center font-bold tabular-nums">
                            <span className={isIn ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400"}>
                              {isIn ? `+${log.change_amount}` : log.change_amount} {unitLabel}
                            </span>
                          </td>
                          <td className="p-3.5 text-xs font-medium text-foreground/80">
                            {log.project_name || '—'}
                          </td>
                          <td className="p-3.5 text-xs text-muted-foreground">
                            {log.recipient && <span className="font-semibold text-foreground/80">{bn ? 'গ্রহীতা: ' : 'To: '}{log.recipient} | </span>}
                            {log.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog 1: Item Create / Edit ── */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editItem ? (bn ? 'আইটেম সম্পাদন করুন' : 'Edit Item') : (bn ? 'নতুন আইটেম যোগ করুন' : 'Add New Item')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">{bn ? 'আইটেমের নাম (বাংলায়) *' : 'Name (Bangla) *'}</Label>
              <Input
                placeholder={bn ? 'যেমন: সিমেন্ট (শাহ), রড ১০মিমি, চাল ইত্যাদি' : 'Item name...'}
                value={itemForm.name_bn}
                onChange={e => setItemForm(f => ({ ...f, name_bn: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">{bn ? 'আইটেমের নাম (ইংরেজিতে)' : 'Name (English)'}</Label>
              <Input
                placeholder="e.g. Cement, Steel Rod, Rice..."
                value={itemForm.name_en}
                onChange={e => setItemForm(f => ({ ...f, name_en: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{bn ? 'ক্যাটাগরি *' : 'Category *'}</Label>
                <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ITEM_CATS.map(c => (
                      <SelectItem key={c} value={c}>{bn ? ITEM_CATS_BN[c] : c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">{bn ? 'পরিমাপের একক *' : 'Unit *'}</Label>
                <Select value={itemForm.unit} onValueChange={v => setItemForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {UNITS.map(u => (
                      <SelectItem key={u} value={u}>{bn ? UNITS_BN[u] : u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={`grid ${editItem ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3`}>
              <div>
                <Label className="text-xs font-semibold">
                  {editItem ? (bn ? 'বর্তমান মজুত *' : 'In Stock *') : (bn ? 'প্রারম্ভিক স্টক' : 'Initial Stock')}
                </Label>
                <Input
                  type="number"
                  value={itemForm.current_stock}
                  onChange={e => setItemForm(f => ({ ...f, current_stock: e.target.value }))}
                  className="mt-1 rounded-xl font-bold tabular-nums"
                />
              </div>
              {editItem && (
                <div>
                  <Label className="text-xs font-semibold">{bn ? 'মোট ক্রয়/ইন' : 'Total In'}</Label>
                  <Input
                    type="number"
                    value={itemForm.total_purchased}
                    onChange={e => setItemForm(f => ({ ...f, total_purchased: e.target.value }))}
                    className="mt-1 rounded-xl font-semibold tabular-nums"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs font-semibold">{bn ? 'একক মূল্য (দর)' : 'Buying Price'}</Label>
                <Input
                  type="number"
                  value={itemForm.buying_price}
                  onChange={e => setItemForm(f => ({ ...f, buying_price: e.target.value }))}
                  className="mt-1 rounded-xl tabular-nums"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">{bn ? 'ন্যূনতম সতর্কতা' : 'Min Stock'}</Label>
                <Input
                  type="number"
                  value={itemForm.min_stock_level}
                  onChange={e => setItemForm(f => ({ ...f, min_stock_level: e.target.value }))}
                  className="mt-1 rounded-xl tabular-nums"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">{bn ? 'নোট বা অতিরিক্ত তথ্য' : 'Notes'}</Label>
              <Textarea
                placeholder={bn ? 'কোথা থেকে কেনা বা ব্যবহারের নির্দেশিকা...' : 'Additional notes...'}
                value={itemForm.notes}
                onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1 rounded-xl min-h-[70px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setItemOpen(false)} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => saveItem.mutate(itemForm)} disabled={!itemForm.name_bn || saveItem.isPending} className="rounded-xl font-bold">
              {saveItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {bn ? 'সংরক্ষণ করুন' : 'Save Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Stock In (ক্রয় / স্টক যোগ) ── */}
      <Dialog open={stockInOpen} onOpenChange={setStockInOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <PlusCircle className="w-5 h-5" />
              {bn ? 'স্টক ইন / নতুন ক্রয় এন্ট্রি' : 'Stock In / Purchase'}
            </DialogTitle>
          </DialogHeader>
          {selectedStockItem && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">
                    {bn ? selectedStockItem.name_bn : (selectedStockItem.name_en || selectedStockItem.name_bn)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'ক্যাটাগরি: ' : 'Category: '}
                    {bn ? ITEM_CATS_BN[selectedStockItem.category] || selectedStockItem.category : selectedStockItem.category}
                  </p>
                </div>
                <Badge variant="outline" className="font-bold text-emerald-700 border-emerald-300">
                  {bn ? 'বর্তমান স্টক: ' : 'Current: '} {selectedStockItem.current_stock} {bn ? UNITS_BN[selectedStockItem.unit] || selectedStockItem.unit : selectedStockItem.unit}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">{bn ? 'যোগকৃত পরিমাণ *' : 'Quantity *'}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={stockInForm.amount}
                    onChange={e => {
                      const amt = e.target.value;
                      const unitPrice = Number(stockInForm.unit_price) || 0;
                      setStockInForm(f => ({
                        ...f,
                        amount: amt,
                        total_price: amt && unitPrice ? String(Number(amt) * unitPrice) : f.total_price
                      }));
                    }}
                    className="mt-1 rounded-xl text-lg font-bold tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">{bn ? 'একক দর (প্রতি ' + (bn ? UNITS_BN[selectedStockItem.unit] || selectedStockItem.unit : selectedStockItem.unit) + ')' : 'Unit Price'}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={stockInForm.unit_price}
                    onChange={e => {
                      const up = e.target.value;
                      const amt = Number(stockInForm.amount) || 0;
                      setStockInForm(f => ({
                        ...f,
                        unit_price: up,
                        total_price: up && amt ? String(amt * Number(up)) : f.total_price
                      }));
                    }}
                    className="mt-1 rounded-xl font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'মোট খরচ (৳)' : 'Total Cost'}</Label>
                <Input
                  type="number"
                  value={stockInForm.total_price}
                  onChange={e => setStockInForm(f => ({ ...f, total_price: e.target.value }))}
                  className="mt-1 rounded-xl font-bold tabular-nums"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'প্রকল্প বা কাজের নাম (যেমন: ২য় তলা ছাদ ঢালাই)' : 'Project / Purpose'}</Label>
                <Input
                  placeholder={bn ? 'কাজের নাম লিখুন...' : 'e.g. 2nd floor roof casting...'}
                  value={stockInForm.project_name}
                  onChange={e => setStockInForm(f => ({ ...f, project_name: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'মেমো / চালান নম্বর' : 'Memo / Invoice No'}</Label>
                <Input
                  placeholder={bn ? 'চালান নং...' : 'Invoice #...'}
                  value={stockInForm.memo_no}
                  onChange={e => setStockInForm(f => ({ ...f, memo_no: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'মন্তব্য বা অতিরিক্ত নোট' : 'Notes'}</Label>
                <Input
                  placeholder={bn ? 'সরবরাহকারী বা বিবরণ...' : 'Supplier or details...'}
                  value={stockInForm.notes}
                  onChange={e => setStockInForm(f => ({ ...f, notes: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setStockInOpen(false)} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => saveStockIn.mutate()} disabled={!stockInForm.amount || saveStockIn.isPending} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
              {saveStockIn.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {bn ? 'স্টক ইন নিশ্চিত করুন' : 'Confirm Stock In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: Stock Out (ব্যবহার / ইস্যু) ── */}
      <Dialog open={stockOutOpen} onOpenChange={setStockOutOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <MinusCircle className="w-5 h-5" />
              {bn ? 'ব্যবহার / বিতরণ এন্ট্রি (স্টক আউট)' : 'Stock Out / Issue'}
            </DialogTitle>
          </DialogHeader>
          {selectedStockItem && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">
                    {bn ? selectedStockItem.name_bn : (selectedStockItem.name_en || selectedStockItem.name_bn)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'মোট মজুত আছে: ' : 'Available: '}
                    <span className="font-bold text-foreground">{selectedStockItem.current_stock}</span> {bn ? UNITS_BN[selectedStockItem.unit] || selectedStockItem.unit : selectedStockItem.unit}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'ব্যবহার বা বিতরণের পরিমাণ *' : 'Quantity to Issue *'}</Label>
                <Input
                  type="number"
                  placeholder="0"
                  max={selectedStockItem.current_stock}
                  value={stockOutForm.amount}
                  onChange={e => setStockOutForm(f => ({ ...f, amount: e.target.value }))}
                  className="mt-1 rounded-xl text-lg font-bold tabular-nums"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'কে গ্রহণ করেছে / প্রাপক *' : 'Recipient / Issued To *'}</Label>
                <Input
                  placeholder={bn ? 'যেমন: ফোরম্যান রফিক, বাবুর্চি করিম, অফিস স্টাফ' : 'Name of recipient...'}
                  value={stockOutForm.recipient}
                  onChange={e => setStockOutForm(f => ({ ...f, recipient: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'কোন প্রকল্প বা কাজের জন্য' : 'Project / Purpose'}</Label>
                <Input
                  placeholder={bn ? 'যেমন: মাদরাসা নতুন ভবন ছাদ ঢালাই, মেস রান্না' : 'Purpose or location...'}
                  value={stockOutForm.project_name}
                  onChange={e => setStockOutForm(f => ({ ...f, project_name: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'ব্যবহারের তারিখ' : 'Date'}</Label>
                <div className="mt-1"><DatePicker value={stockOutForm.date} onChange={val => setStockOutForm(f => ({ ...f, date: val }))} bengali={bn} className="rounded-xl" /></div>
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'অতিরিক্ত মন্তব্য বা নোট' : 'Notes'}</Label>
                <Input
                  placeholder={bn ? 'কোনো বিশেষ নির্দেশিকা...' : 'Optional notes...'}
                  value={stockOutForm.notes}
                  onChange={e => setStockOutForm(f => ({ ...f, notes: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setStockOutOpen(false)} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => saveStockOut.mutate()} disabled={!stockOutForm.amount || saveStockOut.isPending} className="rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white">
              {saveStockOut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {bn ? 'ব্যবহার রেকর্ড করুন' : 'Confirm Usage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 4: Item Drilldown & History Modal ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          {detailItem && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center justify-between">
                  <span>{bn ? detailItem.name_bn : (detailItem.name_en || detailItem.name_bn)}</span>
                  <Badge variant="outline" className="font-semibold text-xs">
                    {bn ? ITEM_CATS_BN[detailItem.category] || detailItem.category : detailItem.category}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground">{bn ? 'মোট ক্রয় / ইন' : 'Total In'}</p>
                  <p className="text-lg font-bold text-foreground mt-1 tabular-nums">
                    {Number(detailItem.total_purchased || detailItem.current_stock || 0)} {bn ? UNITS_BN[detailItem.unit] || detailItem.unit : detailItem.unit}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground">{bn ? 'মোট ব্যবহার' : 'Total Used'}</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
                    {Number(detailItem.total_consumed || 0)} {bn ? UNITS_BN[detailItem.unit] || detailItem.unit : detailItem.unit}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">{bn ? 'বর্তমান মজুত' : 'In Stock'}</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                    {Number(detailItem.current_stock || 0)} {bn ? UNITS_BN[detailItem.unit] || detailItem.unit : detailItem.unit}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground">{bn ? 'মজুত স্টক মূল্য' : 'Stock Value'}</p>
                  <p className="text-lg font-bold text-foreground mt-1 tabular-nums">
                    ৳{Math.round(Number(detailItem.current_stock || 0) * (detailItem.buying_price || 0)).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Transaction Logs */}
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 mb-2.5">
                  <History className="w-4 h-4 text-primary" />
                  {bn ? 'এই আইটেমের সকল ক্রয় ও ব্যবহারের ইতিহাস' : 'Transaction History'}
                </h4>
                {itemLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 border rounded-2xl bg-muted/20">
                    {bn ? 'এখনো কোনো লেনদেন লগ পাওয়া যায়নি' : 'No logs recorded yet'}
                  </p>
                ) : (
                  <div className="border border-border/60 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 border-b border-border/60 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-left">{bn ? 'তারিখ' : 'Date'}</th>
                          <th className="p-2.5 text-center">{bn ? 'ধরন' : 'Type'}</th>
                          <th className="p-2.5 text-center">{bn ? 'পরিমাণ' : 'Amount'}</th>
                          <th className="p-2.5 text-left">{bn ? 'প্রকল্প / কাজের নাম' : 'Project'}</th>
                          <th className="p-2.5 text-left">{bn ? 'বিবরণ / গ্রহীতা' : 'Details'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {itemLogs.map((l: any) => {
                          const isIn = l.type === 'in';
                          return (
                            <tr key={l.id} className="hover:bg-muted/30">
                              <td className="p-2.5 text-muted-foreground">
                                {new Date(l.created_at).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge className={isIn ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]" : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-[10px]"}>
                                  {isIn ? (bn ? 'ক্রয় / ইন' : 'In') : (bn ? 'ব্যবহার' : 'Out')}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-center font-bold tabular-nums">
                                <span className={isIn ? "text-emerald-700" : "text-orange-700"}>
                                  {isIn ? `+${l.change_amount}` : l.change_amount} {bn ? UNITS_BN[detailItem.unit] || detailItem.unit : detailItem.unit}
                                </span>
                              </td>
                              <td className="p-2.5 font-medium">{l.project_name || '—'}</td>
                              <td className="p-2.5 text-muted-foreground">
                                {l.recipient && <span className="font-semibold text-foreground">{l.recipient} | </span>}
                                {l.reason || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-3">
            <Button onClick={() => setDetailModalOpen(false)} className="rounded-xl">
              {bn ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 5: Asset Create / Edit ── */}
      <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editAsset ? (bn ? 'সম্পদ সম্পাদন করুন' : 'Edit Asset') : (bn ? 'নতুন সম্পদ যোগ করুন' : 'Add Fixed Asset')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">{bn ? 'সম্পদের নাম (বাংলায়) *' : 'Asset Name (Bangla) *'}</Label>
              <Input
                placeholder={bn ? 'যেমন: কাঠের চেয়ার, সিলিং ফ্যান, কম্পিউটার...' : 'Asset name...'}
                value={assetForm.asset_name_bn}
                onChange={e => setAssetForm(f => ({ ...f, asset_name_bn: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">{bn ? 'সম্পদের নাম (ইংরেজিতে)' : 'Asset Name (English)'}</Label>
              <Input
                placeholder="e.g. Wooden Chair, Ceiling Fan..."
                value={assetForm.asset_name_en}
                onChange={e => setAssetForm(f => ({ ...f, asset_name_en: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{bn ? 'ক্যাটাগরি *' : 'Category *'}</Label>
                <Select value={assetForm.category} onValueChange={v => setAssetForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_CATS.map(c => (
                      <SelectItem key={c} value={c}>{bn ? ASSET_CATS_BN[c] : c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">{bn ? 'মোট সংখ্যা (টি) *' : 'Quantity *'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={assetForm.quantity}
                  onChange={e => setAssetForm(f => ({ ...f, quantity: e.target.value }))}
                  className="mt-1 rounded-xl font-bold tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{bn ? 'লোকেশন বা রুম' : 'Location / Room'}</Label>
                <Input
                  placeholder={bn ? 'যেমন: হেফজখানা, রুম ২০৩' : 'Location...'}
                  value={assetForm.location_bn}
                  onChange={e => setAssetForm(f => ({ ...f, location_bn: e.target.value, location: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">{bn ? 'নষ্ট / মেরামত সংখ্যা' : 'Damaged Qty'}</Label>
                <Input
                  type="number"
                  min="0"
                  value={assetForm.damaged_quantity}
                  onChange={e => setAssetForm(f => ({ ...f, damaged_quantity: e.target.value }))}
                  className="mt-1 rounded-xl tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{bn ? 'ক্রয় তারিখ' : 'Purchase Date'}</Label>
                <div className="mt-1"><DatePicker value={assetForm.purchase_date} onChange={val => setAssetForm(f => ({ ...f, purchase_date: val }))} bengali={bn} className="rounded-xl" /></div>
              </div>
              <div>
                <Label className="text-xs font-semibold">{bn ? 'মোট ক্রয়মূল্য (৳)' : 'Purchase Price'}</Label>
                <Input
                  type="number"
                  value={assetForm.purchase_price}
                  onChange={e => setAssetForm(f => ({ ...f, purchase_price: e.target.value }))}
                  className="mt-1 rounded-xl tabular-nums"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">{bn ? 'অবস্থা বা বিবরণ' : 'Condition Notes'}</Label>
              <Textarea
                placeholder={bn ? 'সম্পদের বর্তমান অবস্থা...' : 'Condition notes...'}
                value={assetForm.condition_notes}
                onChange={e => setAssetForm(f => ({ ...f, condition_notes: e.target.value }))}
                className="mt-1 rounded-xl min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssetOpen(false)} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => saveAsset.mutate(assetForm)} disabled={!assetForm.asset_name_bn || saveAsset.isPending} className="rounded-xl font-bold">
              {saveAsset.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {bn ? 'সংরক্ষণ করুন' : 'Save Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 6: Asset Status & Damage Updater ── */}
      <Dialog open={assetStatusOpen} onOpenChange={setAssetStatusOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Wrench className="w-5 h-5" />
              {bn ? 'সম্পদের অবস্থা ও নষ্ট সংখ্যা আপডেট' : 'Update Asset Condition'}
            </DialogTitle>
          </DialogHeader>
          {statusAsset && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                <p className="font-bold text-sm text-foreground">
                  {bn ? statusAsset.asset_name_bn : (statusAsset.asset_name_en || statusAsset.asset_name_bn)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn ? 'মোট সংখ্যা: ' : 'Total: '}
                  <span className="font-bold text-foreground">{statusAsset.quantity}</span> {bn ? 'টি' : ''}
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'নষ্ট বা মেরামতাধীন সংখ্যা (টি)' : 'Damaged / Under Repair Qty'}</Label>
                <Input
                  type="number"
                  min="0"
                  max={statusAsset.quantity}
                  value={statusForm.damaged_quantity}
                  onChange={e => setStatusForm(f => ({ ...f, damaged_quantity: e.target.value }))}
                  className="mt-1 rounded-xl text-lg font-bold tabular-nums text-orange-600"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'সার্বিক অবস্থা নির্ধারণ' : 'Overall Status'}</Label>
                <Select value={statusForm.status} onValueChange={v => setStatusForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUS.map(st => (
                      <SelectItem key={st} value={st}>{bn ? ASSET_STATUS_BN[st] : st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'নষ্ট হওয়ার কারণ বা মেরামতের নোট' : 'Condition / Repair Notes'}</Label>
                <Textarea
                  placeholder={bn ? 'কোন যন্ত্রাংশ নষ্ট বা মেরামতে পাঠানো হয়েছে...' : 'Notes...'}
                  value={statusForm.condition_notes}
                  onChange={e => setStatusForm(f => ({ ...f, condition_notes: e.target.value }))}
                  className="mt-1 rounded-xl min-h-[70px]"
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssetStatusOpen(false)} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => updateAssetStatus.mutate()} disabled={updateAssetStatus.isPending} className="rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white">
              {updateAssetStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {bn ? 'আপডেট সম্পন্ন করুন' : 'Save Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 7: Dedicated Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-3xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              {deleteTarget?.type === 'item' ? (bn ? 'আইটেম মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Delete Item') : (bn ? 'সম্পদ মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Delete Asset')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2 text-foreground/80">
              {bn
                ? `আপনি কি নিশ্চিতভাবে "${deleteTarget?.name}" মুছে ফেলতে চান? এটি মুছে ফেললে তা সক্রিয় তালিকা থেকে অপসারিত হবে।`
                : `Are you sure you want to delete "${deleteTarget?.name}"? This action will remove it from the active list.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl">{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  if (deleteTarget.type === 'item') {
                    deleteItem.mutate(deleteTarget.id);
                  } else {
                    deleteAsset.mutate(deleteTarget.id);
                  }
                  setDeleteTarget(null);
                }
              }}
            >
              {bn ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInventory;
