import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx-js-style';
import {
  Utensils,
  Package,
  PackageCheck,
  Plus,
  Search,
  AlertTriangle,
  Flame,
  History,
  Calculator,
  Download,
  Trash2,
  Pencil,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  ExternalLink,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InventoryItem {
  id: string;
  name_bn: string;
  name_en: string | null;
  category: string;
  current_stock: number;
  unit: string;
  buying_price: number | null;
  min_stock_level: number;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface InventoryLog {
  id: string;
  item_id: string;
  change_amount: number;
  type: string;
  reason: string | null;
  performed_by: string | null;
  expense_id: string | null;
  created_at: string | null;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_BN = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

const FOOD_UNITS = [
  { value: 'কেজি', label: 'কেজি (Kg)' },
  { value: 'গ্রাম', label: 'গ্রাম (Gram)' },
  { value: 'লিটার', label: 'লিটার (Liter)' },
  { value: 'মিলি', label: 'মিলি (ml)' },
  { value: 'বস্তা', label: 'বস্তা (Bag)' },
  { value: 'প্যাকেট', label: 'প্যাকেট (Packet)' },
  { value: 'পিস', label: 'পিস (Pcs)' },
  { value: 'ডজন', label: 'ডজন (Dozen)' },
  { value: 'টিন/কার্টুন', label: 'টিন/কার্টুন (Can/Box)' },
];

const MEAL_SLOTS = [
  { value: 'breakfast', label_bn: 'সকালের নাস্তা', label_en: 'Breakfast' },
  { value: 'lunch', label_bn: 'দুপুরের খাবার', label_en: 'Lunch' },
  { value: 'dinner', label_bn: 'রাতের খাবার', label_en: 'Dinner' },
  { value: 'special', label_bn: 'বিশেষ আয়োজন / মেহমানদারি', label_en: 'Special Feast' },
  { value: 'other', label_bn: 'সাধারণ রান্না / অন্যান্য', label_en: 'General Cooking' },
];

export const HostelBoardingStockTab: React.FC = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'available'>('all');

  // Modals
  const [consumeDialog, setConsumeDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Quick Consume Form
  const [consumeForm, setConsumeForm] = useState({
    item_id: '',
    quantity: '',
    meal_slot: 'lunch',
    consumption_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // New / Edit Item Form
  const [itemForm, setItemForm] = useState({
    name_bn: '',
    name_en: '',
    current_stock: '',
    unit: 'কেজি',
    buying_price: '',
    min_stock_level: '10',
    notes: '',
  });

  // 1. Fetch Boarding Food Items (category === 'hostel_boarding')
  const { data: foodItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['hostel-boarding-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('category', 'hostel_boarding')
        .eq('is_active', true)
        .order('name_bn');
      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
  });

  // 2. Fetch Boarding Consumption Logs
  const { data: rawLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['hostel-boarding-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as InventoryLog[];
    },
  });

  // 3. Fetch Meal Attendance for the selected month to calculate meal count & per-student cost
  const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

  const { data: monthAttendance = [] } = useQuery({
    queryKey: ['hostel-month-attendance', startOfMonth, endOfMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hostel_meal_attendance' as any)
        .select('*')
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // 4. Fetch Active Allocations for student names & room mapping
  const { data: allocations = [] } = useQuery({
    queryKey: ['hostel-allocations-for-boarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hostel_allocations')
        .select(`
          id,
          student_id,
          bed_number,
          status,
          students:student_id (id, full_name, roll_number, student_id),
          room:room_id (room_number, hostel:hostel_id (name))
        `);
      if (error) throw error;
      return data || [];
    },
  });

  // Create quick lookup for food items
  const itemsMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    foodItems.forEach(item => map.set(item.id, item));
    return map;
  }, [foodItems]);

  // Filter logs that belong to hostel boarding items or have boarding reason
  const boardingLogs = useMemo(() => {
    return rawLogs.filter(log => {
      const isBoardingItem = itemsMap.has(log.item_id);
      const isBoardingReason = (log.reason || '').toLowerCase().includes('হোস্টেল') ||
        (log.reason || '').toLowerCase().includes('বোর্ডিং') ||
        (log.reason || '').toLowerCase().includes('রান্না') ||
        (log.reason || '').toLowerCase().includes('boarding');
      return isBoardingItem || isBoardingReason;
    });
  }, [rawLogs, itemsMap]);

  // Filtered Food Items based on search and stock status
  const filteredFoodItems = useMemo(() => {
    return foodItems.filter(item => {
      const matchSearch = searchQuery.trim() === '' ||
        item.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.name_en && item.name_en.toLowerCase().includes(searchQuery.toLowerCase()));

      const isLow = Number(item.current_stock) <= Number(item.min_stock_level || 5);
      if (stockStatusFilter === 'low') return matchSearch && isLow;
      if (stockStatusFilter === 'available') return matchSearch && !isLow;
      return matchSearch;
    });
  }, [foodItems, searchQuery, stockStatusFilter]);

  // Key Statistics
  const stats = useMemo(() => {
    const totalItems = foodItems.length;
    let totalStockValue = 0;
    let lowStockCount = 0;

    foodItems.forEach(item => {
      const stock = Number(item.current_stock) || 0;
      const price = Number(item.buying_price) || 0;
      totalStockValue += (stock * price);
      if (stock <= Number(item.min_stock_level || 5)) {
        lowStockCount++;
      }
    });

    // Consumption this month
    let thisMonthConsumptionCost = 0;
    boardingLogs.forEach(log => {
      if (!log.created_at) return;
      const d = new Date(log.created_at);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        if (log.type === 'consumption' || log.type === 'out' || log.change_amount < 0) {
          const item = itemsMap.get(log.item_id);
          const unitPrice = item?.buying_price || 0;
          const consumedQty = Math.abs(log.change_amount);
          thisMonthConsumptionCost += (consumedQty * unitPrice);
        }
      }
    });

    return {
      totalItems,
      totalStockValue,
      lowStockCount,
      thisMonthConsumptionCost,
    };
  }, [foodItems, boardingLogs, itemsMap, selectedMonth, selectedYear]);

  // Total meals calculation for the month
  const mealMetrics = useMemo(() => {
    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;

    const studentMealMap = new Map<string, { breakfast: number; lunch: number; dinner: number; total: number }>();

    monthAttendance.forEach(att => {
      const key = att.allocation_id || att.person_name || att.person_id || 'unknown';
      if (!studentMealMap.has(key)) {
        studentMealMap.set(key, { breakfast: 0, lunch: 0, dinner: 0, total: 0 });
      }
      const studentStat = studentMealMap.get(key)!;

      if (att.breakfast) {
        breakfastCount++;
        studentStat.breakfast++;
        studentStat.total++;
      }
      if (att.lunch) {
        lunchCount++;
        studentStat.lunch++;
        studentStat.total++;
      }
      if (att.dinner) {
        dinnerCount++;
        studentStat.dinner++;
        studentStat.total++;
      }
    });

    const totalMealsServed = breakfastCount + lunchCount + dinnerCount;
    const avgCostPerMeal = totalMealsServed > 0
      ? (stats.thisMonthConsumptionCost / totalMealsServed)
      : 0;

    return {
      breakfastCount,
      lunchCount,
      dinnerCount,
      totalMealsServed,
      avgCostPerMeal,
      studentMealMap,
    };
  }, [monthAttendance, stats.thisMonthConsumptionCost]);

  // Mutations
  // 1. Consume Item Mutation
  const consumeMutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(consumeForm.quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(bn ? 'সঠিক পরিমাণ প্রদান করুন' : 'Please enter a valid quantity');
      }
      const item = itemsMap.get(consumeForm.item_id);
      if (!item) {
        throw new Error(bn ? 'আইটেম খুঁজে পাওয়া যায়নি' : 'Item not found');
      }
      if (qty > item.current_stock) {
        throw new Error(bn ? `বর্তমান মজুত (${item.current_stock} ${item.unit}) এর চেয়ে বেশি ব্যবহার করা যাবে না` : 'Quantity exceeds current stock');
      }

      const mealObj = MEAL_SLOTS.find(m => m.value === consumeForm.meal_slot);
      const mealName = bn ? mealObj?.label_bn : mealObj?.label_en;
      const userName = user?.email || 'হিসাব শাখা';

      const reasonText = `বোর্ডিং রান্না: ${mealName} (${consumeForm.consumption_date})${consumeForm.notes ? ` - ${consumeForm.notes}` : ''}`;

      // Insert log
      const { error: logErr } = await supabase.from('inventory_logs').insert({
        item_id: item.id,
        type: 'consumption',
        change_amount: -qty,
        reason: reasonText,
        performed_by: userName,
      });
      if (logErr) throw logErr;

      // Update current_stock in inventory_items
      const newStock = Math.max(0, Number((item.current_stock - qty).toFixed(2)));
      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['hostel-boarding-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      setConsumeDialog(false);
      setConsumeForm({
        item_id: '',
        quantity: '',
        meal_slot: 'lunch',
        consumption_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      toast({
        title: bn ? 'রান্নায় ব্যবহার সফল হয়েছে' : 'Consumption recorded',
        description: bn ? 'স্টক থেকে স্বয়ংক্রিয়ভাবে কর্তন করা হয়েছে।' : 'Stock updated successfully.',
      });
    },
    onError: (err: any) => {
      toast({
        title: bn ? 'ব্যর্থ হয়েছে' : 'Failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // 2. Create / Update Item Mutation
  const itemMutation = useMutation({
    mutationFn: async () => {
      if (!itemForm.name_bn.trim()) {
        throw new Error(bn ? 'আইটেমের বাংলা নাম আবশ্যক' : 'Bangla name is required');
      }
      const stock = parseFloat(itemForm.current_stock) || 0;
      const price = parseFloat(itemForm.buying_price) || 0;
      const minStock = parseFloat(itemForm.min_stock_level) || 5;

      const payload = {
        name_bn: itemForm.name_bn.trim(),
        name_en: itemForm.name_en.trim() || null,
        category: 'hostel_boarding',
        current_stock: stock,
        unit: itemForm.unit,
        buying_price: price,
        min_stock_level: minStock,
        notes: itemForm.notes.trim() || null,
        is_active: true,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('inventory_items')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;

        // Log initial stock if > 0
        if (stock > 0 && created) {
          await supabase.from('inventory_logs').insert({
            item_id: created.id,
            type: 'in',
            change_amount: stock,
            reason: 'হোস্টেল বোর্ডিংয়ে প্রাথমিক খাদ্য স্টক অন্তর্ভুক্তি',
            performed_by: user?.email || 'ম্যানেজার',
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['hostel-boarding-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      setItemDialog(false);
      setEditingItem(null);
      setItemForm({
        name_bn: '',
        name_en: '',
        current_stock: '',
        unit: 'কেজি',
        buying_price: '',
        min_stock_level: '10',
        notes: '',
      });
      toast({
        title: editingItem ? (bn ? 'আইটেম আপডেট হয়েছে' : 'Updated') : (bn ? 'নতুন খাদ্য আইটেম যুক্ত হয়েছে' : 'Added'),
      });
    },
    onError: (err: any) => {
      toast({
        title: bn ? 'ব্যর্থ হয়েছে' : 'Failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // 3. Delete / Inactivate Item Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({ title: bn ? 'আইটেম নিষ্ক্রিয় করা হয়েছে' : 'Item removed' });
    },
  });

  // Open Edit Item
  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name_bn: item.name_bn || '',
      name_en: item.name_en || '',
      current_stock: String(item.current_stock || 0),
      unit: item.unit || 'কেজি',
      buying_price: String(item.buying_price || ''),
      min_stock_level: String(item.min_stock_level || 10),
      notes: item.notes || '',
    });
    setItemDialog(true);
  };

  // Open Quick Consume for a specific item
  const handleOpenConsume = (item?: InventoryItem) => {
    setConsumeForm({
      item_id: item?.id || (foodItems[0]?.id || ''),
      quantity: '',
      meal_slot: 'lunch',
      consumption_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setConsumeDialog(true);
  };

  // Export Per-Student Meal Cost to Excel
  const handleExportAnalysis = () => {
    const rows: any[] = [];
    allocations.forEach((alloc: any) => {
      const studentName = alloc.students?.full_name || 'নাম নেই';
      const studentRoll = alloc.students?.roll_number || alloc.students?.student_id || '-';
      const roomNumber = alloc.room?.room_number || '-';
      const hostelName = alloc.room?.hostel?.name || '-';

      const stat = mealMetrics.studentMealMap.get(alloc.id) || { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
      const estCost = Math.round(stat.total * mealMetrics.avgCostPerMeal);

      rows.push({
        'শিক্ষার্থীর নাম': studentName,
        'রোল/আইডি': studentRoll,
        'হোস্টেল': hostelName,
        'রুম নং': roomNumber,
        'সকালের নাস্তা': stat.breakfast,
        'দুপুরের খাবার': stat.lunch,
        'রাতের খাবার': stat.dinner,
        'মোট গৃহীত মিল': stat.total,
        'মিল প্রতি গড় খরচ (৳)': Math.round(mealMetrics.avgCostPerMeal * 100) / 100,
        'বোর্ডিং খাবার খরচ (৳)': estCost,
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Boarding_Meal_Cost');
    XLSX.writeFile(wb, `Hostel_Meal_Cost_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`);
    toast({ title: bn ? 'এক্সেল ফাইল ডাউনলোড হয়েছে' : 'Excel downloaded' });
  };

  const selectedConsumeItem = itemsMap.get(consumeForm.item_id);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {bn ? 'হোস্টেল বোর্ডিং খাদ্য স্টক ও মিল খরচ' : 'Hostel Boarding Stock & Meal Costs'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {bn
                  ? 'হিসাব বিভাগের ভাউচার থেকে স্বয়ংক্রিয় খাদ্য মজুদ, রান্নায় ব্যবহার এবং শিক্ষার্থী প্রতি মিল খরচ হিসাব'
                  : 'Automated food stock from accounts vouchers, kitchen consumption logs & meal costs'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            onClick={() => handleOpenConsume()}
            className="flex-1 sm:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Flame className="w-4 h-4" />
            <span>{bn ? 'রান্নায় ব্যবহার এন্ট্রি' : 'Log Daily Cooking'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingItem(null);
              setItemForm({
                name_bn: '',
                name_en: '',
                current_stock: '',
                unit: 'কেজি',
                buying_price: '',
                min_stock_level: '10',
                notes: '',
              });
              setItemDialog(true);
            }}
            className="flex-1 sm:flex-none gap-2 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-foreground"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>{bn ? 'খাদ্য আইটেম যোগ' : 'Add Food Item'}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/expenses?tab=dashboard')}
            className="flex-1 sm:flex-none gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title={bn ? 'হিসাব শাখা থেকে খরচ এন্ট্রি' : 'Add Expense in Accounts'}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{bn ? 'বাজার খরচ এন্ট্রি' : 'Market Expense'}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{bn ? 'মোট খাদ্য আইটেম' : 'Food Items'}</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{stats.totalItems}</h3>
              <p className="text-[11px] text-emerald-600 font-medium">{bn ? 'বোর্ডিং খাদ্য মজুদ' : 'Boarding items'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{bn ? 'বর্তমান মজুদ মূল্য' : 'Stock Value'}</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">৳ {stats.totalStockValue.toLocaleString()}</h3>
              <p className="text-[11px] text-blue-600 font-medium">{bn ? 'গোডাউনে অবশিষ্ট' : 'Remaining Value'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stats.lowStockCount > 0 ? 'bg-amber-500/15 text-amber-600 animate-pulse' : 'bg-emerald-500/10 text-emerald-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{bn ? 'স্বল্প মজুদ সতর্কতা' : 'Low Stock Alert'}</p>
              <h3 className={`text-2xl font-bold mt-0.5 ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {stats.lowStockCount}
              </h3>
              <p className="text-[11px] text-muted-foreground">{bn ? 'সীমার নিচে আইটেম' : 'Items below min'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{bn ? 'চলতি মাসের রান্না খরচ' : 'Month Consumption'}</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">৳ {Math.round(stats.thisMonthConsumptionCost).toLocaleString()}</h3>
              <p className="text-[11px] text-purple-600 font-medium">{bn ? `${mealMetrics.totalMealsServed} টি মিল পরিবেশিত` : `${mealMetrics.totalMealsServed} meals served`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Inner Tabs: Stock List | Consumption History | Cost Analysis */}
      <Tabs defaultValue="stock-list" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="stock-list" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
              <PackageCheck className="w-4 h-4" />
              <span>{bn ? 'খাদ্য সামগ্রী মজুদ' : 'Current Stock'}</span>
            </TabsTrigger>
            <TabsTrigger value="cooking-logs" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
              <History className="w-4 h-4" />
              <span>{bn ? 'রান্না ও খরচের ইতিহাস' : 'Cooking Logs'}</span>
            </TabsTrigger>
            <TabsTrigger value="cost-analysis" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
              <Users className="w-4 h-4" />
              <span>{bn ? 'মিল ও শিক্ষার্থী খরচ হিসাব' : 'Per-Student Meal Analysis'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Month / Year Selector for context */}
          <div className="flex items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={String(idx)}>
                    {bn ? MONTHS_BN[idx] : m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* SUBTAB 1: CURRENT STOCK LIST */}
        <TabsContent value="stock-list" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  {bn ? 'বোর্ডিং খাদ্য মজুদ তালিকা' : 'Boarding Food Stock Inventory'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {bn ? 'চাল, ডাল, তেল, চিনি, মসলা, গ্যাস সিলিন্ডার ইত্যাদির বর্তমান স্থিতি' : 'Real-time stock of pantry and cooking groceries'}
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={bn ? 'আইটেম খুঁজুন...' : 'Search items...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <Select value={stockStatusFilter} onValueChange={(v: any) => setStockStatusFilter(v)}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল অবস্থা' : 'All Status'}</SelectItem>
                    <SelectItem value="available">{bn ? 'পর্যাপ্ত মজুদ' : 'Adequate Stock'}</SelectItem>
                    <SelectItem value="low">{bn ? 'সতর্কতামূলক কম মজুদ' : 'Low Stock'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingItems ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {bn ? 'তথ্য লোড হচ্ছে...' : 'Loading stock...'}
                </div>
              ) : filteredFoodItems.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Package className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? (bn ? 'কোনো আইটেম খুঁজে পাওয়া যায়নি' : 'No items match your search') : (bn ? 'কোনো বোর্ডিং খাদ্য আইটেম এখনো যোগ করা হয়নি।' : 'No boarding stock items found.')}
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingItem(null);
                        setItemForm({
                          name_bn: '',
                          name_en: '',
                          current_stock: '',
                          unit: 'কেজি',
                          buying_price: '',
                          min_stock_level: '10',
                          notes: '',
                        });
                        setItemDialog(true);
                      }}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      {bn ? 'প্রথম আইটেম যোগ করুন' : 'Add First Item'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>{bn ? 'খাদ্য সামগ্রীর নাম' : 'Item Name'}</TableHead>
                        <TableHead>{bn ? 'বর্তমান মজুত' : 'Current Stock'}</TableHead>
                        <TableHead>{bn ? 'গড় একক মূল্য' : 'Avg Unit Price'}</TableHead>
                        <TableHead>{bn ? 'মোট মজুত মূল্য' : 'Total Value'}</TableHead>
                        <TableHead>{bn ? 'সর্বনিম্ন সীমা' : 'Min Alert'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFoodItems.map((item, idx) => {
                        const stock = Number(item.current_stock) || 0;
                        const min = Number(item.min_stock_level) || 5;
                        const price = Number(item.buying_price) || 0;
                        const totalVal = stock * price;
                        const isLow = stock <= min;

                        return (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground text-sm">{item.name_bn}</div>
                              {item.name_en && (
                                <div className="text-[11px] text-muted-foreground">{item.name_en}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-sm text-foreground">
                                {stock} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {price > 0 ? `৳ ${price.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              ৳ {Math.round(totalVal).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {min} {item.unit}
                            </TableCell>
                            <TableCell>
                              {isLow ? (
                                <Badge variant="destructive" className="gap-1 text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                                  <AlertTriangle className="w-3 h-3" />
                                  {bn ? 'স্বল্প মজুত' : 'Low Stock'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  {bn ? 'পর্যাপ্ত' : 'Adequate'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenConsume(item)}
                                  className="h-8 px-2.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                                  title={bn ? 'রান্নায় ব্যবহার' : 'Consume'}
                                >
                                  <Flame className="w-3.5 h-3.5" />
                                  <span>{bn ? 'ব্যবহার' : 'Use'}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title={bn ? 'সম্পাদনা' : 'Edit'}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm(bn ? 'আপনি কি এই আইটেমটি নিষ্ক্রিয় করতে চান?' : 'Deactivate item?')) {
                                      deleteMutation.mutate(item.id);
                                    }
                                  }}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  title={bn ? 'মুছুন' : 'Delete'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBTAB 2: COOKING & CONSUMPTION LOGS */}
        <TabsContent value="cooking-logs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-600" />
                  {bn ? 'দৈনিক রান্না ও খাদ্য ব্যবহারের ইতিহাস' : 'Daily Cooking & Consumption Log'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {bn ? 'কখন কতটুকু খাদ্য রান্না করা হয়েছে তার বিস্তারিত রেকর্ড' : 'Track quantities consumed for breakfast, lunch, dinner and special meals'}
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => handleOpenConsume()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Flame className="w-4 h-4" />
                <span>{bn ? 'নতুন রান্নার ব্যবহার এন্ট্রি' : 'Log Daily Cooking'}</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {bn ? 'লগ লোড হচ্ছে...' : 'Loading logs...'}
                </div>
              ) : boardingLogs.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  {bn ? 'এখনো কোনো রান্নায় ব্যবহারের রেকর্ড নেই।' : 'No consumption records logged yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead>{bn ? 'তারিখ ও সময়' : 'Date & Time'}</TableHead>
                        <TableHead>{bn ? 'খাদ্য সামগ্রী' : 'Item'}</TableHead>
                        <TableHead>{bn ? 'পরিমাণ' : 'Amount'}</TableHead>
                        <TableHead>{bn ? 'আনুমানিক মূল্য' : 'Estimated Cost'}</TableHead>
                        <TableHead>{bn ? 'বিবরণ / উপলক্ষ্য' : 'Reason / Slot'}</TableHead>
                        <TableHead>{bn ? 'দায়িত্বপ্রাপ্ত' : 'Performed By'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {boardingLogs.map(log => {
                        const item = itemsMap.get(log.item_id);
                        const unitPrice = item?.buying_price || 0;
                        const qty = Math.abs(log.change_amount);
                        const cost = qty * unitPrice;
                        const d = log.created_at ? new Date(log.created_at) : null;
                        const dateFormatted = d ? d.toLocaleDateString(bn ? 'bn-BD' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-';

                        const isOut = log.type === 'consumption' || log.type === 'out' || log.change_amount < 0;

                        return (
                          <TableRow key={log.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {dateFormatted}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {item ? item.name_bn : (bn ? 'অন্যান্য সামগ্রী' : 'Item')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isOut ? 'outline' : 'secondary'} className={isOut ? 'text-orange-600 border-orange-300 dark:border-orange-800' : 'text-emerald-600'}>
                                {isOut ? '-' : '+'}{qty} {item?.unit || ''}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                              {cost > 0 ? `৳ ${Math.round(cost).toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={log.reason || ''}>
                              {log.reason || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.performed_by || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBTAB 3: PER-STUDENT MEAL COST ANALYSIS */}
        <TabsContent value="cost-analysis" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  {bn ? `${MONTHS_BN[selectedMonth]} ${selectedYear} - মিল খরচ ও শিক্ষার্থী প্রতি ব্যয় বণ্টন` : `Meal Cost & Per-Student Breakdown (${MONTHS[selectedMonth]} ${selectedYear})`}
                </CardTitle>
                <CardDescription className="text-xs">
                  {bn ? 'খাবার হাজিরা ও রান্নার খরচের উপর ভিত্তি করে মিল প্রতি গড় খরচ এবং প্রত্যেক শিক্ষার্থীর আনুমানিক অংশ' : 'Calculates average meal cost based on food consumed and attendance count'}
                </CardDescription>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportAnalysis}
                className="gap-1.5 border-border"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>{bn ? 'এক্সেল ডাউনলোড' : 'Export Excel'}</span>
              </Button>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{bn ? 'মোট খাদ্য খরচ (চলতি মাস)' : 'Total Food Cost'}</span>
                  <div className="text-xl font-bold text-foreground">৳ {Math.round(stats.thisMonthConsumptionCost).toLocaleString()}</div>
                  <span className="text-[11px] text-muted-foreground">{bn ? 'রান্নায় ব্যবহৃত খাদ্য মজুদ' : 'Based on consumption logs'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{bn ? 'মোট পরিবেশিত মিল' : 'Total Meals Served'}</span>
                  <div className="text-xl font-bold text-primary">{mealMetrics.totalMealsServed}</div>
                  <span className="text-[11px] text-muted-foreground">
                    {bn ? `নাস্তা: ${mealMetrics.breakfastCount} | দুপুর: ${mealMetrics.lunchCount} | রাত: ${mealMetrics.dinnerCount}` : `B: ${mealMetrics.breakfastCount} | L: ${mealMetrics.lunchCount} | D: ${mealMetrics.dinnerCount}`}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{bn ? 'মিল প্রতি গড় খরচ' : 'Avg Cost Per Meal'}</span>
                  <div className="text-xl font-bold text-emerald-600">
                    ৳ {mealMetrics.avgCostPerMeal > 0 ? (Math.round(mealMetrics.avgCostPerMeal * 100) / 100).toFixed(2) : '০.০০'}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{bn ? 'মোট খরচ ÷ মোট মিল' : 'Total Cost ÷ Total Meals'}</span>
                </div>
              </div>

              {/* Student Table */}
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>{bn ? 'শিক্ষার্থীর নাম' : 'Student Name'}</TableHead>
                      <TableHead>{bn ? 'হোস্টেল ও রুম' : 'Hostel & Room'}</TableHead>
                      <TableHead className="text-center">{bn ? 'নাস্তা' : 'Breakfast'}</TableHead>
                      <TableHead className="text-center">{bn ? 'দুপুর' : 'Lunch'}</TableHead>
                      <TableHead className="text-center">{bn ? 'রাত' : 'Dinner'}</TableHead>
                      <TableHead className="text-center">{bn ? 'মোট মিল' : 'Total Meals'}</TableHead>
                      <TableHead className="text-right">{bn ? 'খাবার খরচ (৳)' : 'Meal Share (৳)'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center p-8 text-sm text-muted-foreground">
                          {bn ? 'কোনো সক্রিয় বোর্ডার বরাদ্দ পাওয়া যায়নি।' : 'No active allocations.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      allocations.map((alloc: any, idx: number) => {
                        const studentName = alloc.students?.full_name || 'নাম নেই';
                        const studentRoll = alloc.students?.roll_number || alloc.students?.student_id || '';
                        const roomNumber = alloc.room?.room_number || '-';
                        const hostelName = alloc.room?.hostel?.name || '';

                        const stat = mealMetrics.studentMealMap.get(alloc.id) || { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
                        const estCost = Math.round(stat.total * mealMetrics.avgCostPerMeal);

                        return (
                          <TableRow key={alloc.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-semibold text-sm text-foreground">{studentName}</div>
                              {studentRoll && <div className="text-[11px] text-muted-foreground">আইডি: {studentRoll}</div>}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-medium text-foreground">{hostelName}</span>
                              <span className="text-muted-foreground block text-[11px]">রুম #{roomNumber} (বেড #{alloc.bed_number})</span>
                            </TableCell>
                            <TableCell className="text-center text-xs font-medium">{stat.breakfast}</TableCell>
                            <TableCell className="text-center text-xs font-medium">{stat.lunch}</TableCell>
                            <TableCell className="text-center text-xs font-medium">{stat.dinner}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-bold">
                                {stat.total}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm text-emerald-700 dark:text-emerald-400">
                              ৳ {estCost.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: LOG DAILY CONSUMPTION */}
      <Dialog open={consumeDialog} onOpenChange={setConsumeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Flame className="w-5 h-5 text-emerald-600" />
              <span>{bn ? 'দৈনিক রান্না ও খাদ্য ব্যবহার এন্ট্রি' : 'Log Daily Cooking Consumption'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {bn ? 'আজকের নাস্তা, দুপুর বা রাতের রান্নায় ব্যবহৃত সামগ্রী এন্ট্রি করুন। স্টক থেকে স্বয়ংক্রিয়ভাবে কমে যাবে।' : 'Select item and amount consumed for cooking'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={e => {
              e.preventDefault();
              consumeMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-xs font-semibold">{bn ? 'তারিখ' : 'Date'} *</Label>
              <DatePicker
                bengali={bn}
                value={consumeForm.consumption_date}
                onChange={v => setConsumeForm(f => ({ ...f, consumption_date: v }))}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'খাবারের বেলা / উপলক্ষ্য' : 'Meal Slot'} *</Label>
              <Select
                value={consumeForm.meal_slot}
                onValueChange={v => setConsumeForm(f => ({ ...f, meal_slot: v }))}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_SLOTS.map(slot => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {bn ? slot.label_bn : slot.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'খাদ্য সামগ্রী বাছাই করুন' : 'Select Item'} *</Label>
              <Select
                value={consumeForm.item_id || undefined}
                onValueChange={v => setConsumeForm(f => ({ ...f, item_id: v }))}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder={bn ? 'আইটেম বেছে নিন...' : 'Select item...'} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {foodItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name_bn} — {bn ? 'মজুত:' : 'Stock:'} {item.current_stock} {item.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedConsumeItem && (
                <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                  {bn ? `বর্তমান মজুত: ${selectedConsumeItem.current_stock} ${selectedConsumeItem.unit}` : `In Stock: ${selectedConsumeItem.current_stock} ${selectedConsumeItem.unit}`}
                  {selectedConsumeItem.buying_price ? ` (একক মূল্য: ৳ ${selectedConsumeItem.buying_price})` : ''}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold">
                {bn ? `ব্যবহৃত পরিমাণ (${selectedConsumeItem?.unit || 'একক'})` : `Quantity Used (${selectedConsumeItem?.unit || 'unit'})`} *
              </Label>
              <Input
                type="number"
                step="any"
                min="0.01"
                placeholder={bn ? 'যেমন: ৫০' : 'e.g. 50'}
                value={consumeForm.quantity}
                onChange={e => setConsumeForm(f => ({ ...f, quantity: e.target.value }))}
                className="mt-1 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'বিবরণ / নোট (ঐচ্ছিক)' : 'Notes / Menu (Optional)'}</Label>
              <Input
                placeholder={bn ? 'যেমন: ৬০ জন ছাত্রের দুপুরের মাংস-খিচুড়ি' : 'e.g. Lunch for 60 students'}
                value={consumeForm.notes}
                onChange={e => setConsumeForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setConsumeDialog(false)}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={consumeMutation.isPending || !consumeForm.item_id || !consumeForm.quantity}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {consumeMutation.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'ব্যবহার নিশ্চিত করুন' : 'Confirm Consumption')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD / EDIT FOOD ITEM */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Package className="w-5 h-5 text-emerald-600" />
              <span>{editingItem ? (bn ? 'খাদ্য সামগ্রী সম্পাদনা' : 'Edit Food Item') : (bn ? 'নতুন খাদ্য সামগ্রী যুক্ত করুন' : 'Add New Food Item')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {bn ? 'হোস্টেল বোর্ডিং খাদ্য সামগ্রীর নাম, একক ও ক্রয়মূল্য নির্ধারণ করুন' : 'Configure pantry item details and stock levels'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={e => {
              e.preventDefault();
              itemMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-xs font-semibold">{bn ? 'খাদ্য সামগ্রীর নাম (বাংলায়)' : 'Item Name (Bangla)'} *</Label>
              <Input
                placeholder={bn ? 'যেমন: মিনিকেট চাল / মসুর ডাল / সয়াবিন তেল' : 'e.g. Rice, Lentils, Oil'}
                value={itemForm.name_bn}
                onChange={e => setItemForm(f => ({ ...f, name_bn: e.target.value }))}
                className="mt-1 text-sm font-medium"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'নাম (ইংরেজিতে - ঐচ্ছিক)' : 'Item Name (English)'}</Label>
              <Input
                placeholder="e.g. Miniket Rice, Soybean Oil"
                value={itemForm.name_en}
                onChange={e => setItemForm(f => ({ ...f, name_en: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{bn ? 'পরিমাপের একক' : 'Unit'} *</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={v => setItemForm(f => ({ ...f, unit: v }))}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'বর্তমান মজুত' : 'Current Stock'}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={itemForm.current_stock}
                  onChange={e => setItemForm(f => ({ ...f, current_stock: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{bn ? 'গড় একক মূল্য (৳)' : 'Unit Price (BDT)'}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={itemForm.buying_price}
                  onChange={e => setItemForm(f => ({ ...f, buying_price: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'সতর্কতা সীমা (Min Stock)' : 'Min Stock Alert'}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="10"
                  value={itemForm.min_stock_level}
                  onChange={e => setItemForm(f => ({ ...f, min_stock_level: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'মন্তব্য (ঐচ্ছিক)' : 'Notes'}</Label>
              <Textarea
                rows={2}
                placeholder={bn ? 'আইটেম সংক্রান্ত বিবরণ বা ব্র্যান্ড...' : 'Brand or notes...'}
                value={itemForm.notes}
                onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setItemDialog(false)}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={itemMutation.isPending || !itemForm.name_bn.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {itemMutation.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ করুন' : 'Save Item')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HostelBoardingStockTab;
