import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx-js-style';
import {
  Utensils,
  Package,
  PackageCheck,
  PackagePlus,
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
  Users,
  Sparkles,
  Calendar,
  ArrowDownToLine,
  ArrowUpRight
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
  sort_order?: number | null;
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
  unit_price?: number | null;
  total_price?: number | null;
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

export type FoodCategory = 'all' | 'vegetables' | 'meat' | 'fish' | 'grocery';

export const getFoodItemCategory = (item: { name_bn?: string; name_en?: string | null }): 'vegetables' | 'meat' | 'fish' | 'grocery' => {
  const bn = (item.name_bn || '').toLowerCase();
  const en = (item.name_en || '').toLowerCase();

  // 1. Meat & Eggs (মাংস ও ডিম)
  if (
    bn.includes('মাংস') || bn.includes('মুরগি') || bn.includes('ডিম') || bn.includes('গরু') || 
    bn.includes('খাসি') || bn.includes('হাঁস') || bn.includes('ব্রয়লার') || bn.includes('সোনালী') ||
    en.includes('meat') || en.includes('chicken') || en.includes('beef') || en.includes('mutton') || en.includes('egg')
  ) {
    return 'meat';
  }

  // 2. Fish (মাছ)
  if (
    bn.includes('মাছ') || bn.includes('রুই') || bn.includes('কাতলা') || bn.includes('কাতল') || 
    bn.includes('তেলাপিয়া') || bn.includes('পাঙ্গাশ') || bn.includes('পাঙ্গাস') || bn.includes('ইলিশ') || 
    bn.includes('শিং') || bn.includes('মাগুর') || bn.includes('কই') || bn.includes('চিংড়ি') ||
    en.includes('fish') || en.includes('prawn') || en.includes('shrimp')
  ) {
    return 'fish';
  }

  // 3. Vegetables / Raw Produce (কাঁচা মাল ও শাকসবজি)
  if (
    bn.includes('আলু') || bn.includes('পেঁয়াজ') || bn.includes('রসুন') || bn.includes('আদা') || 
    bn.includes('মরিচ') || bn.includes('টমেটো') || bn.includes('শাক') || bn.includes('সবজি') || 
    bn.includes('লেবু') || bn.includes('ধনেপাতা') || bn.includes('লাউ') || bn.includes('বেগুন') ||
    bn.includes('পটল') || bn.includes('কাঁচা') || bn.includes('শসা') || bn.includes('গাজর') || 
    bn.includes('পেঁপে') || bn.includes('ঝিঙে') || bn.includes('করলা') || bn.includes('কপি') ||
    en.includes('potato') || en.includes('onion') || en.includes('garlic') || en.includes('ginger') || 
    en.includes('chili') || en.includes('tomato') || en.includes('vegetable')
  ) {
    return 'vegetables';
  }

  // 4. Default: Dry Grocery & Spices (মুদি ও শুকনা সামগ্রী)
  return 'grocery';
};

export const STANDARD_FOOD_ITEMS = [
  { name_bn: 'সয়াবিন তেল', name_en: 'Soybean Oil', unit: 'লিটার', min_stock_level: 15 },
  { name_bn: 'সরিষার তেল', name_en: 'Mustard Oil', unit: 'লিটার', min_stock_level: 5 },
  { name_bn: 'আলু', name_en: 'Potato', unit: 'কেজি', min_stock_level: 25 },
  { name_bn: 'পেঁয়াজ', name_en: 'Onion', unit: 'কেজি', min_stock_level: 15 },
  { name_bn: 'রসুন', name_en: 'Garlic', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'আদা', name_en: 'Ginger', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'লবণ', name_en: 'Salt', unit: 'কেজি', min_stock_level: 10 },
  { name_bn: 'হলুদ গুঁড়া', name_en: 'Turmeric Powder', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'মরিচ গুঁড়া', name_en: 'Chili Powder', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'ধনিয়া গুঁড়া', name_en: 'Coriander Powder', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'জিরা গুঁড়া', name_en: 'Cumin Powder', unit: 'কেজি', min_stock_level: 3 },
  { name_bn: 'গোটা জিরা', name_en: 'Whole Cumin', unit: 'প্যাকেট', min_stock_level: 3 },
  { name_bn: 'গরম মসলা (এলাচ, দারুচিনি, লবঙ্গ)', name_en: 'Garam Masala', unit: 'প্যাকেট', min_stock_level: 5 },
  { name_bn: 'তেজপাতা', name_en: 'Bay Leaves', unit: 'প্যাকেট', min_stock_level: 5 },
  { name_bn: 'চিনি', name_en: 'Sugar', unit: 'কেজি', min_stock_level: 10 },
  { name_bn: 'চা পাতা', name_en: 'Tea Leaves', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'ডিম', name_en: 'Eggs', unit: 'পিস', min_stock_level: 50 },
  { name_bn: 'ব্রয়লার / সোনালী মুরগি', name_en: 'Chicken', unit: 'কেজি', min_stock_level: 20 },
  { name_bn: 'গরু / খাসির মাংস', name_en: 'Beef / Mutton', unit: 'কেজি', min_stock_level: 15 },
  { name_bn: 'মাছ (রুই / কাতলা / তেলাপিয়া)', name_en: 'Fish', unit: 'কেজি', min_stock_level: 15 },
  { name_bn: 'কাঁচা মরিচ', name_en: 'Green Chili', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'শুকনা মরিচ', name_en: 'Dry Red Chili', unit: 'কেজি', min_stock_level: 3 },
  { name_bn: 'মুগ ডাল', name_en: 'Moong Dal', unit: 'কেজি', min_stock_level: 10 },
  { name_bn: 'ছোলা / বুট', name_en: 'Chickpeas', unit: 'কেজি', min_stock_level: 10 },
  { name_bn: 'আটা / ময়দা', name_en: 'Flour / Atta', unit: 'কেজি', min_stock_level: 20 },
  { name_bn: 'সুজি', name_en: 'Semolina (Suji)', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'গুঁড়া দুধ', name_en: 'Milk Powder', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'তরল দুধ', name_en: 'Liquid Milk', unit: 'লিটার', min_stock_level: 10 },
  { name_bn: 'কালোজিরা', name_en: 'Black Cumin', unit: 'প্যাকেট', min_stock_level: 2 },
  { name_bn: 'সিরকা / ভিনেগার', name_en: 'Vinegar', unit: 'বোতল', min_stock_level: 2 },
  { name_bn: 'ঘি', name_en: 'Ghee', unit: 'কেজি', min_stock_level: 2 },
  { name_bn: 'পাঁচফোড়ন', name_en: 'Panch Phoron', unit: 'প্যাকেট', min_stock_level: 2 },
  { name_bn: 'টমেটো', name_en: 'Tomato', unit: 'কেজি', min_stock_level: 10 },
  { name_bn: 'মৌসুমি শাকসবজি', name_en: 'Seasonal Vegetables', unit: 'কেজি', min_stock_level: 20 },
  { name_bn: 'সয়া বড়ি / নাগেটস', name_en: 'Soya Chunks', unit: 'কেজি', min_stock_level: 5 },
  { name_bn: 'গ্যাস সিলিন্ডার', name_en: 'LP Gas Cylinder', unit: 'পিস', min_stock_level: 2 }
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
  const [activeCategoryTab, setActiveCategoryTab] = useState<FoodCategory>('all');

  // Modals
  const [consumeDialog, setConsumeDialog] = useState(false);
  const [stockInDialog, setStockInDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deletingLog, setDeletingLog] = useState<InventoryLog | null>(null);

  // Quick Consume Form
  const [consumeForm, setConsumeForm] = useState({
    item_id: '',
    quantity: '',
    meal_slot: 'lunch',
    consumption_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Stock In (নতুন মজুদ জমা / ক্রয়) Form
  const [stockInForm, setStockInForm] = useState({
    item_id: '',
    quantity: '',
    unit_price: '',
    stock_date: new Date().toISOString().split('T')[0],
    voucher_no: '',
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
    sort_order: '',
  });

  // Serial number management state
  const [serialVersion, setSerialVersion] = useState(0);
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [editingSerialVal, setEditingSerialVal] = useState<string>('');

  const getLocalSerialMap = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem('hostel_boarding_item_serials');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveLocalSerial = (id: string, serial: number) => {
    try {
      const current = getLocalSerialMap();
      current[id] = serial;
      localStorage.setItem('hostel_boarding_item_serials', JSON.stringify(current));
    } catch (e) {
      console.warn('Could not save local serial:', e);
    }
  };

  const saveAllLocalSerials = (serialMap: Record<string, number>) => {
    try {
      localStorage.setItem('hostel_boarding_item_serials', JSON.stringify(serialMap));
    } catch (e) {
      console.warn('Could not save all local serials:', e);
    }
  };

  // 1. Fetch Boarding Food Items (category === 'hostel_boarding')
  const { data: foodItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['hostel-boarding-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('category', 'hostel_boarding')
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name_bn');

      if (error) {
        if (error.code === '42703' || error.message?.includes('sort_order')) {
          const { data: fbData, error: fbErr } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('category', 'hostel_boarding')
            .eq('is_active', true)
            .order('name_bn');
          if (fbErr) throw fbErr;
          return (fbData || []) as InventoryItem[];
        }
        throw error;
      }
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InventoryLog[];
    },
  });

  // 3. Fetch Meal Attendance for the selected month to calculate meal count & per-student cost
  const monthStartDate = useMemo(() => new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0), [selectedYear, selectedMonth]);
  const monthEndDate = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999), [selectedYear, selectedMonth]);
  const startOfMonth = monthStartDate.toISOString().split('T')[0];
  const endOfMonth = monthEndDate.toISOString().split('T')[0];

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

  // 1. Full food items sorted strictly by custom serial order without duplicates
  const orderedFoodItems = useMemo(() => {
    const localMap = getLocalSerialMap();

    return [...foodItems].sort((a, b) => {
      const getPriority = (item: InventoryItem) => {
        if (localMap[item.id] !== undefined && localMap[item.id] !== null) {
          return Number(localMap[item.id]);
        }
        if (item.sort_order && Number(item.sort_order) > 0) {
          return Number(item.sort_order);
        }
        if (item.name_bn?.includes('চাউল')) return 1;
        if (item.name_bn?.includes('ডাল') && !item.name_bn?.includes('মুগ')) return 2;
        return 9999;
      };

      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return a.name_bn.localeCompare(b.name_bn, 'bn');
    });
  }, [foodItems, serialVersion]);

  // 2. Strict unique 1-to-N serial mapping guaranteed to never duplicate
  const itemSerialMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedFoodItems.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [orderedFoodItems]);

  // 3. Tab-specific items belonging to current active category
  const currentTabItems = useMemo(() => {
    if (activeCategoryTab === 'all') {
      return orderedFoodItems;
    }
    return orderedFoodItems.filter(item => getFoodItemCategory(item) === activeCategoryTab);
  }, [orderedFoodItems, activeCategoryTab]);

  // 4. Tab-specific clean sequential serial 1 to K for each category
  const currentTabSerialMap = useMemo(() => {
    const map = new Map<string, number>();
    currentTabItems.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [currentTabItems]);

  // Reorder items by moving an item from its current index to a new target position (1-based)
  // Supports reordering within specific category tab or across all items
  const reorderItemPosition = async (itemId: string, newTargetPosition: number) => {
    const tabItems = [...currentTabItems];
    const currentIndex = tabItems.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;

    const clampedPos = Math.max(1, Math.min(newTargetPosition, tabItems.length));
    const targetIndex = clampedPos - 1;

    if (currentIndex === targetIndex) return;

    // Remove from current position and insert at target position inside current tab
    const [movedItem] = tabItems.splice(currentIndex, 1);
    tabItems.splice(targetIndex, 0, movedItem);

    // Map reordered items back to global ordered food items
    let newFullOrdered: InventoryItem[];
    if (activeCategoryTab === 'all') {
      newFullOrdered = tabItems;
    } else {
      let pointer = 0;
      newFullOrdered = orderedFoodItems.map(item => {
        if (getFoodItemCategory(item) === activeCategoryTab) {
          return tabItems[pointer++];
        }
        return item;
      });
    }

    // Re-assign strictly unique sequential serial numbers 1 to N
    const newSerialMap: Record<string, number> = {};
    const updates: { id: string; sort_order: number }[] = [];

    newFullOrdered.forEach((item, idx) => {
      const serial = idx + 1;
      newSerialMap[item.id] = serial;
      updates.push({ id: item.id, sort_order: serial });
    });

    saveAllLocalSerials(newSerialMap);
    setSerialVersion(v => v + 1);

    // Persist to Supabase in background
    try {
      for (const u of updates) {
        await supabase
          .from('inventory_items')
          .update({ sort_order: u.sort_order } as any)
          .eq('id', u.id);
      }
    } catch (e) {
      console.warn('Background sort_order update failed:', e);
    }

    qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
    toast({
      title: bn ? 'সিরিয়াল নাম্বার পরিবর্তন হয়েছে' : 'Item re-ordered',
      description: bn ? `"${movedItem.name_bn}" কে ${clampedPos} নং ক্রমিকে সাজানো হয়েছে।` : `Moved to position ${clampedPos}`,
    });
  };

  const handleMoveUp = (item: InventoryItem) => {
    const currentPos = currentTabSerialMap.get(item.id) || 1;
    if (currentPos > 1) {
      reorderItemPosition(item.id, currentPos - 1);
    }
  };

  const handleMoveDown = (item: InventoryItem) => {
    const currentPos = currentTabSerialMap.get(item.id) || 1;
    if (currentPos < currentTabItems.length) {
      reorderItemPosition(item.id, currentPos + 1);
    }
  };

  // Helper to format stock in dates
  const formatStockDate = (isoDate: string | null) => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString(bn ? 'bn-BD' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Monthly Stock Ledger calculation per item for the selected month
  // Automatic carryover: Closing Stock of month M === Opening Stock of month M+1
  const monthlyStockLedger = useMemo(() => {
    const startTime = monthStartDate.getTime();
    const endTime = monthEndDate.getTime();

    return orderedFoodItems.map((item, idx) => {
      const serial = itemSerialMap.get(item.id) || (idx + 1);
      const itemLogs = boardingLogs.filter(l => l.item_id === item.id);

      let lastStockInTime: number | null = null;
      let lastStockInDateStr: string | null = null;

      let sumAllLogs = 0;
      let openingStockLogs = 0;
      let monthInQty = 0;
      let monthInCost = 0;
      let monthOutQty = 0;
      let monthOutCost = 0;

      itemLogs.forEach(l => {
        const logTime = l.created_at ? new Date(l.created_at).getTime() : 0;
        const amt = Number(l.change_amount) || 0;
        sumAllLogs += amt;

        const isPositive = l.type === 'in' || l.type === 'initial' || amt > 0;

        if (isPositive && logTime > 0) {
          if (!lastStockInTime || logTime > lastStockInTime) {
            lastStockInTime = logTime;
            lastStockInDateStr = l.created_at;
          }
        }

        if (logTime < startTime) {
          openingStockLogs += amt;
        } else if (logTime <= endTime) {
          if (isPositive) {
            const inAmt = Math.abs(amt);
            monthInQty += inAmt;
            const cost = l.total_price || (inAmt * (l.unit_price || item.buying_price || 0));
            monthInCost += cost;
          } else {
            const outAmt = Math.abs(amt);
            monthOutQty += outAmt;
            const cost = outAmt * (item.buying_price || 0);
            monthOutCost += cost;
          }
        }
      });

      // Baseline reconciles items created with initial stock prior to log history
      const currentStockNum = Number(item.current_stock) || 0;
      const baseline = Math.max(0, currentStockNum - sumAllLogs);
      const openingStock = Math.max(0, Number((baseline + openingStockLogs).toFixed(2)));
      const closingStock = Math.max(0, Number((openingStock + monthInQty - monthOutQty).toFixed(2)));
      const unitPrice = Number(item.buying_price) || 0;
      const closingValue = Number((closingStock * unitPrice).toFixed(2));
      const openingValue = Number((openingStock * unitPrice).toFixed(2));

      // Fallback for lastStockInDate if no explicit log
      if (!lastStockInDateStr && (currentStockNum > 0 || item.created_at)) {
        lastStockInDateStr = item.created_at || null;
      }

      return {
        item,
        serial,
        lastStockInDate: lastStockInDateStr,
        openingStock,
        openingValue,
        monthInQty: Number(monthInQty.toFixed(2)),
        monthInCost: Number(monthInCost.toFixed(2)),
        monthOutQty: Number(monthOutQty.toFixed(2)),
        monthOutCost: Number(monthOutCost.toFixed(2)),
        closingStock,
        unitPrice,
        closingValue,
      };
    });
  }, [orderedFoodItems, boardingLogs, monthStartDate, monthEndDate, itemSerialMap]);

  // Aggregate monthly ledger totals
  const monthlySummary = useMemo(() => {
    let totalOpeningVal = 0;
    let totalMonthInCost = 0;
    let totalMonthInQty = 0;
    let totalMonthOutCost = 0;
    let totalMonthOutQty = 0;
    let totalClosingVal = 0;

    monthlyStockLedger.forEach(row => {
      totalOpeningVal += row.openingValue;
      totalMonthInCost += row.monthInCost;
      totalMonthInQty += row.monthInQty;
      totalMonthOutCost += row.monthOutCost;
      totalMonthOutQty += row.monthOutQty;
      totalClosingVal += row.closingValue;
    });

    return {
      totalOpeningVal,
      totalMonthInCost,
      totalMonthInQty,
      totalMonthOutCost,
      totalMonthOutQty,
      totalClosingVal,
    };
  }, [monthlyStockLedger]);

  // Counts per food category (কাঁচা মাল, মাংস, মাছ, মুদি সামগ্রী)
  const categoryCounts = useMemo(() => {
    let all = monthlyStockLedger.length;
    let vegetables = 0;
    let meat = 0;
    let fish = 0;
    let grocery = 0;

    monthlyStockLedger.forEach(row => {
      const cat = getFoodItemCategory(row.item);
      if (cat === 'vegetables') vegetables++;
      else if (cat === 'meat') meat++;
      else if (cat === 'fish') fish++;
      else grocery++;
    });

    return { all, vegetables, meat, fish, grocery };
  }, [monthlyStockLedger]);

  // Filtered Food Items based on category tab, search and stock status while strictly preserving unique serial order
  const filteredFoodItems = useMemo(() => {
    return monthlyStockLedger.filter(({ item, closingStock }) => {
      // 1. Food Category Filter (কাঁচা মাল, মাংস, মাছ, মুদি)
      if (activeCategoryTab !== 'all') {
        const cat = getFoodItemCategory(item);
        if (cat !== activeCategoryTab) return false;
      }

      // 2. Search query filter
      const matchSearch = searchQuery.trim() === '' ||
        item.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.name_en && item.name_en.toLowerCase().includes(searchQuery.toLowerCase()));

      // 3. Stock status filter
      const isLow = closingStock <= Number(item.min_stock_level || 5);
      if (stockStatusFilter === 'low') return matchSearch && isLow;
      if (stockStatusFilter === 'available') return matchSearch && !isLow;
      return matchSearch;
    });
  }, [monthlyStockLedger, activeCategoryTab, searchQuery, stockStatusFilter]);

  // Duplicate item name validation
  const isDuplicateItemName = useMemo(() => {
    const rawBn = itemForm.name_bn?.trim().toLowerCase();
    const rawEn = itemForm.name_en?.trim().toLowerCase();
    if (!rawBn && !rawEn) return false;
    return foodItems.some(i => {
      if (editingItem && i.id === editingItem.id) return false;
      const iBn = i.name_bn?.trim().toLowerCase();
      const iEn = i.name_en?.trim().toLowerCase();
      if (rawBn && iBn === rawBn) return true;
      if (rawEn && iEn && iEn === rawEn) return true;
      return false;
    });
  }, [foodItems, itemForm.name_bn, itemForm.name_en, editingItem]);

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

    return {
      totalItems,
      totalStockValue,
      lowStockCount,
      thisMonthConsumptionCost: monthlySummary.totalMonthOutCost,
    };
  }, [foodItems, monthlySummary.totalMonthOutCost]);

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

      // Set timestamp accurately according to selected date
      const consDateObj = new Date(consumeForm.consumption_date);
      const consNow = new Date();
      consDateObj.setHours(consNow.getHours(), consNow.getMinutes(), consNow.getSeconds());
      const consCreatedAtIso = consDateObj.toISOString();

      // Insert log
      const { error: logErr } = await supabase.from('inventory_logs').insert({
        item_id: item.id,
        type: 'consumption',
        change_amount: -qty,
        reason: reasonText,
        performed_by: userName,
        created_at: consCreatedAtIso,
      } as any);
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

  // 1.1 Stock In (নতুন মজুদ জমা / ক্রয়) Mutation
  const stockInMutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(stockInForm.quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(bn ? 'সঠিক পরিমাণ প্রদান করুন' : 'Please enter a valid quantity');
      }
      const item = itemsMap.get(stockInForm.item_id);
      if (!item) {
        throw new Error(bn ? 'আইটেম খুঁজে পাওয়া যায়নি' : 'Item not found');
      }
      const price = parseFloat(stockInForm.unit_price) || 0;
      const totalPrice = Number((qty * price).toFixed(2));
      const userName = user?.email || 'হিসাব শাখা';

      const voucherPart = stockInForm.voucher_no ? `ভাউচার/মেমো: ${stockInForm.voucher_no}` : '';
      const notePart = stockInForm.notes ? ` - ${stockInForm.notes}` : '';
      const reasonText = `খাদ্য মজুদ জমা / ক্রয় (${stockInForm.stock_date})${voucherPart ? ` [${voucherPart}]` : ''}${notePart}`;

      // Set timestamp accurately according to selected date
      const stockDateObj = new Date(stockInForm.stock_date);
      const stockNow = new Date();
      stockDateObj.setHours(stockNow.getHours(), stockNow.getMinutes(), stockNow.getSeconds());
      const stockCreatedAtIso = stockDateObj.toISOString();

      // Insert log
      const { error: logErr } = await supabase.from('inventory_logs').insert({
        item_id: item.id,
        type: 'in',
        change_amount: qty,
        reason: reasonText,
        performed_by: userName,
        created_at: stockCreatedAtIso,
        unit_price: price > 0 ? price : null,
        total_price: totalPrice > 0 ? totalPrice : null,
      } as any);
      if (logErr) throw logErr;

      // Update current_stock in inventory_items & unit buying_price if supplied
      const newStock = Number((Number(item.current_stock || 0) + qty).toFixed(2));
      const updatePayload: Record<string, any> = {
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      };
      if (price > 0) {
        updatePayload.buying_price = price;
      }

      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update(updatePayload as any)
        .eq('id', item.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['hostel-boarding-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      setStockInDialog(false);
      setStockInForm({
        item_id: '',
        quantity: '',
        unit_price: '',
        stock_date: new Date().toISOString().split('T')[0],
        voucher_no: '',
        notes: '',
      });
      toast({
        title: bn ? 'খাদ্য মজুদ সফলভাবে যোগ হয়েছে' : 'Stock In recorded',
        description: bn ? 'স্টকে নতুন খাদ্য সামগ্রী ও তারিখ সংরক্ষিত হয়েছে।' : 'Stock quantity updated successfully.',
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
      const trimmedBn = itemForm.name_bn.trim();
      const trimmedEn = itemForm.name_en.trim();
      if (!trimmedBn) {
        throw new Error(bn ? 'আইটেমের বাংলা নাম আবশ্যক' : 'Bangla name is required');
      }

      const existing = foodItems.find(i => {
        if (editingItem && i.id === editingItem.id) return false;
        const iBn = i.name_bn?.trim().toLowerCase();
        const iEn = i.name_en?.trim().toLowerCase();
        if (trimmedBn && iBn === trimmedBn.toLowerCase()) return true;
        if (trimmedEn && iEn && iEn === trimmedEn.toLowerCase()) return true;
        return false;
      });

      if (existing) {
        throw new Error(
          bn 
            ? `"${existing.name_bn}" নামের খাদ্য সামগ্রী ইতোমধ্যে তালিকায় বিদ্যমান আছে! একই নামে ডুপ্লিকেট আইটেম তৈরি করা যাবে না।`
            : `An item named "${existing.name_bn}" already exists in the food list!`
        );
      }

      const stock = parseFloat(itemForm.current_stock) || 0;
      const price = parseFloat(itemForm.buying_price) || 0;
      const minStock = parseFloat(itemForm.min_stock_level) || 5;
      const sortOrder = parseInt(itemForm.sort_order) || 0;

      const payload: Record<string, any> = {
        name_bn: trimmedBn,
        name_en: trimmedEn || null,
        category: 'hostel_boarding',
        current_stock: stock,
        unit: itemForm.unit,
        buying_price: price,
        min_stock_level: minStock,
        notes: itemForm.notes.trim() || null,
        sort_order: sortOrder > 0 ? sortOrder : 0,
        is_active: true,
      };

      if (editingItem) {
        const oldStock = Number(editingItem.current_stock) || 0;
        const diffStock = Number((stock - oldStock).toFixed(2));

        if (sortOrder > 0) {
          await reorderItemPosition(editingItem.id, sortOrder);
        }

        const { error } = await supabase
          .from('inventory_items')
          .update(payload as any)
          .eq('id', editingItem.id);
        if (error) {
          // Fallback if advanced columns don't exist
          const fallbackPayload = {
            name_bn: trimmedBn,
            name_en: trimmedEn || null,
            category: 'hostel_boarding',
            current_stock: stock,
            unit: itemForm.unit,
            buying_price: price,
            min_stock_level: minStock,
            notes: itemForm.notes.trim() || null,
            is_active: true,
          };
          const { error: fbErr } = await supabase
            .from('inventory_items')
            .update(fallbackPayload)
            .eq('id', editingItem.id);
          if (fbErr) throw fbErr;
        }

        // If stock was adjusted directly during edit, log the adjustment
        if (diffStock !== 0) {
          try {
            await supabase.from('inventory_logs').insert({
              item_id: editingItem.id,
              type: diffStock > 0 ? 'in' : 'adjustment',
              change_amount: diffStock,
              reason: bn 
                ? `স্টক সংশোধন/সম্পাদনা (${oldStock} ${itemForm.unit} থেকে ${stock} ${itemForm.unit})` 
                : `Stock adjusted during edit (${oldStock} to ${stock})`,
              performed_by: user?.email || 'ম্যানেজার',
            });
          } catch (logErr) {
            console.warn('Edit stock log error:', logErr);
          }
        }
      } else {
        const { data: created, error } = await supabase
          .from('inventory_items')
          .insert(payload as any)
          .select('id')
          .single();
        if (error) {
          const fallbackPayload = {
            name_bn: trimmedBn,
            name_en: trimmedEn || null,
            category: 'hostel_boarding',
            current_stock: stock,
            unit: itemForm.unit,
            buying_price: price,
            min_stock_level: minStock,
            notes: itemForm.notes.trim() || null,
            is_active: true,
          };
          const { data: fbCreated, error: fbErr } = await supabase
            .from('inventory_items')
            .insert(fallbackPayload)
            .select('id')
            .single();
          if (fbErr) throw fbErr;

          if (fbCreated && sortOrder > 0) {
            await reorderItemPosition(fbCreated.id, sortOrder);
          }

          if (stock > 0 && fbCreated) {
            await supabase.from('inventory_logs').insert({
              item_id: fbCreated.id,
              type: 'in',
              change_amount: stock,
              reason: 'হোস্টেল বোর্ডিংয়ে প্রাথমিক খাদ্য স্টক অন্তর্ভুক্তি',
              performed_by: user?.email || 'ম্যানেজার',
            });
          }
        } else {
          if (created && sortOrder > 0) {
            await reorderItemPosition(created.id, sortOrder);
          }

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
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['hostel-boarding-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      qc.refetchQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.refetchQueries({ queryKey: ['hostel-boarding-logs'] });
      setSerialVersion(v => v + 1);
      const wasEditing = !!editingItem;
      const itemName = itemForm.name_bn;
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
        sort_order: '',
      });
      toast({
        title: wasEditing ? (bn ? 'আইটেম আপডেট সফল হয়েছে' : 'Item updated successfully') : (bn ? 'নতুন খাদ্য আইটেম যুক্ত হয়েছে' : 'Added'),
        description: bn ? `"${itemName}" এর তথ্য সংরক্ষিত হয়েছে।` : undefined,
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

  // Helper to insert missing food items robustly (handles column variations and conflicts)
  const insertMissingFoodItems = async (itemsToInsert: typeof STANDARD_FOOD_ITEMS) => {
    let successCount = 0;
    
    for (const item of itemsToInsert) {
      try {
        // Try full payload with tracking columns
        const fullPayload = {
          name_bn: item.name_bn,
          name_en: item.name_en,
          category: 'hostel_boarding',
          current_stock: 0,
          total_purchased: 0,
          total_consumed: 0,
          item_type: 'consumable',
          unit: item.unit,
          buying_price: 0,
          min_stock_level: item.min_stock_level,
          notes: 'হোস্টেল রান্না ও বোর্ডিং খাদ্য সামগ্রী',
          is_active: true,
        };

        const { error: fullErr } = await supabase.from('inventory_items').insert(fullPayload as any);
        if (!fullErr) {
          successCount++;
          continue;
        }

        // Fallback payload without advanced columns
        const fallbackPayload = {
          name_bn: item.name_bn,
          name_en: item.name_en,
          category: 'hostel_boarding',
          current_stock: 0,
          unit: item.unit,
          buying_price: 0,
          min_stock_level: item.min_stock_level,
          notes: 'হোস্টেল রান্না ও বোর্ডিং খাদ্য সামগ্রী',
          is_active: true,
        };

        const { error: fbErr } = await supabase.from('inventory_items').insert(fallbackPayload);
        if (!fbErr) {
          successCount++;
        }
      } catch (e) {
        console.warn(`Could not insert ${item.name_bn}:`, e);
      }
    }

    return successCount;
  };

  // Auto-seed missing standard cooking items on mount
  const hasAutoSeededRef = useRef(false);
  const [isAutoSeeding, setIsAutoSeeding] = useState(false);

  useEffect(() => {
    if (loadingItems || hasAutoSeededRef.current) return;

    const existingNames = new Set(
      foodItems.map(i => (i.name_bn || '').trim().toLowerCase())
    );

    const missing = STANDARD_FOOD_ITEMS.filter(
      item => !existingNames.has(item.name_bn.trim().toLowerCase())
    );

    if (missing.length > 0) {
      hasAutoSeededRef.current = true;
      setIsAutoSeeding(true);

      insertMissingFoodItems(missing)
        .then((count) => {
          if (count > 0) {
            qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
            qc.invalidateQueries({ queryKey: ['inventory-items'] });
            qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
            toast({
              title: bn ? 'রান্নার খাদ্য সামগ্রী যুক্ত হয়েছে' : 'Food items loaded',
              description: bn 
                ? `${count} টি রান্নার খাদ্য সামগ্রী স্বয়ংক্রিয়ভাবে তালিকায় যুক্ত করা হয়েছে।` 
                : `${count} standard cooking food items added to stock list.`,
            });
          }
        })
        .finally(() => {
          setIsAutoSeeding(false);
        });
    } else {
      hasAutoSeededRef.current = true;
    }
  }, [loadingItems, foodItems, bn, qc]);

  // 4. Seed Standard Food Items Mutation (Manual Button)
  const seedStandardItemsMutation = useMutation({
    mutationFn: async () => {
      const existingNames = new Set(foodItems.map(i => (i.name_bn || '').trim().toLowerCase()));
      const missing = STANDARD_FOOD_ITEMS.filter(
        item => !existingNames.has(item.name_bn.trim().toLowerCase())
      );

      if (missing.length === 0) {
        throw new Error(bn ? 'সকল প্রয়োজনীয় খাদ্য সামগ্রী ইতোমধ্যে তালিকায় বিদ্যমান আছে!' : 'All standard food items already exist!');
      }

      const count = await insertMissingFoodItems(missing);
      if (count === 0) {
        throw new Error(bn ? 'আইটেম যোগ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Failed to add items.');
      }
      return count;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      toast({
        title: bn ? 'খাদ্য সামগ্রী সফলভাবে যুক্ত হয়েছে' : 'Food items added',
        description: bn ? `${count} টি খাদ্য সামগ্রী তালিকায় যুক্ত করা হয়েছে।` : `${count} items added to stock list.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: bn ? 'নোটিশ' : 'Notice',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
  // 5. Delete Food Item Mutation (Soft delete with hard delete fallback)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First try soft delete (is_active: false)
      const { error: softErr } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', id);

      if (softErr) {
        // Fallback to hard delete
        const { error: hardErr } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id);
        if (hardErr) throw hardErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      const deletedName = deletingItem?.name_bn;
      setDeletingItem(null);
      toast({
        title: bn ? 'খাদ্য সামগ্রী মুছে ফেলা হয়েছে' : 'Item deleted',
        description: deletedName ? (bn ? `"${deletedName}" সফলভাবে তালিকা থেকে অপসারিত হয়েছে।` : `"${deletedName}" removed from stock list.`) : undefined,
      });
    },
    onError: (err: any) => {
      toast({
        title: bn ? 'মুছতে ব্যর্থ হয়েছে' : 'Failed to delete',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // 6. Delete Cooking / Stock Log Mutation (Reverses stock consumption / addition)
  const deleteLogMutation = useMutation({
    mutationFn: async (log: InventoryLog) => {
      // If it was cooking consumption, restore stock quantity (add back)
      if (log.change_amount < 0 && log.item_id) {
        const item = itemsMap.get(log.item_id);
        if (item) {
          const restoredStock = Number((Number(item.current_stock || 0) + Math.abs(log.change_amount)).toFixed(2));
          await supabase
            .from('inventory_items')
            .update({ current_stock: restoredStock })
            .eq('id', item.id);
        }
      } else if (log.change_amount > 0 && log.item_id) {
        // If it was stock addition, deduct back
        const item = itemsMap.get(log.item_id);
        if (item) {
          const restoredStock = Math.max(0, Number((Number(item.current_stock || 0) - log.change_amount).toFixed(2)));
          await supabase
            .from('inventory_items')
            .update({ current_stock: restoredStock })
            .eq('id', item.id);
        }
      }

      const { error } = await supabase
        .from('inventory_logs')
        .delete()
        .eq('id', log.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-boarding-stock'] });
      qc.invalidateQueries({ queryKey: ['hostel-boarding-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      setDeletingLog(null);
      toast({
        title: bn ? 'লগ রেকর্ড মুছে ফেলা হয়েছে' : 'Log deleted',
        description: bn ? 'রেকর্ডটি মুছে ফেলা হয়েছে এবং মজুত পরিমাণ সমন্বয় করা হয়েছে।' : 'Log deleted and stock adjusted.',
      });
    },
    onError: (err: any) => {
      toast({
        title: bn ? 'মুছতে ব্যর্থ হয়েছে' : 'Failed to delete log',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Open Edit Item
  const handleEditItem = (item: InventoryItem) => {
    const effectiveSerial = currentTabSerialMap.get(item.id) || itemSerialMap.get(item.id) || 1;
    setEditingItem(item);
    setItemForm({
      name_bn: item.name_bn || '',
      name_en: item.name_en || '',
      current_stock: String(item.current_stock || 0),
      unit: item.unit || 'কেজি',
      buying_price: String(item.buying_price || ''),
      min_stock_level: String(item.min_stock_level || 10),
      notes: item.notes || '',
      sort_order: String(effectiveSerial),
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

  // Open Stock In Dialog (নতুন খাদ্য মজুদ জমা / ক্রয়)
  const handleOpenStockIn = (item?: InventoryItem) => {
    const defaultItem = item || foodItems[0];
    setStockInForm({
      item_id: defaultItem?.id || '',
      quantity: '',
      unit_price: defaultItem?.buying_price ? String(defaultItem.buying_price) : '',
      stock_date: new Date().toISOString().split('T')[0],
      voucher_no: '',
      notes: '',
    });
    setStockInDialog(true);
  };

  // Export Monthly Food Stock Ledger to Excel
  const handleExportMonthlyStock = () => {
    const listToExport = filteredFoodItems;
    const rows = listToExport.map((row) => ({
      'ক্রমিক': currentTabSerialMap.get(row.item.id) || row.serial,
      'শ্রেণি / ক্যাটাগরি': bn 
        ? (getFoodItemCategory(row.item) === 'meat' ? 'মাংস ও ডিম' : getFoodItemCategory(row.item) === 'fish' ? 'মাছ' : getFoodItemCategory(row.item) === 'vegetables' ? 'কাঁচা মাল ও শাকসবজি' : 'মুদি ও শুকনা খাদ্য')
        : getFoodItemCategory(row.item),
      'খাদ্য সামগ্রীর নাম': row.item.name_bn,
      'ইংরেজি নাম': row.item.name_en || '-',
      'সর্বশেষ মজুদের তারিখ': formatStockDate(row.lastStockInDate),
      'প্রারম্ভিক জের (গত মাস হতে)': `${row.openingStock} ${row.item.unit}`,
      'চলতি মাসে ক্রয়/জমা (+)': `${row.monthInQty} ${row.item.unit}`,
      'চলতি মাসে রান্নায় খরচ (-)': `${row.monthOutQty} ${row.item.unit}`,
      'মাস শেষে সমাপনী মজুদ (=)': `${row.closingStock} ${row.item.unit}`,
      'একক দর (৳)': row.unitPrice > 0 ? row.unitPrice : 0,
      'সমাপনী মজুদ মূল্য (৳)': Math.round(row.closingValue),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = activeCategoryTab === 'all' ? 'All_Items' : activeCategoryTab;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Hostel_Stock_Ledger_${activeCategoryTab}_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`);
    toast({ title: bn ? 'মাসিক খাদ্য মজুদ রেজিস্টার ডাউনলোড হয়েছে' : 'Monthly stock excel downloaded' });
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
  const selectedStockInItem = itemsMap.get(stockInForm.item_id);
  const stockInQtyNum = parseFloat(stockInForm.quantity) || 0;
  const stockInPriceNum = parseFloat(stockInForm.unit_price) || 0;
  const stockInTotal = Number((stockInQtyNum * stockInPriceNum).toFixed(2));

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
            onClick={() => handleOpenStockIn()}
            className="flex-1 sm:flex-none gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{bn ? 'খাদ্য মজুদ / ক্রয় যোগ' : 'Stock In'}</span>
          </Button>

          <Button
            type="button"
            onClick={() => handleOpenConsume()}
            className="flex-1 sm:flex-none gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
          >
            <Flame className="w-4 h-4" />
            <span>{bn ? 'রান্নায় ব্যবহার এন্ট্রি' : 'Log Daily Cooking'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => seedStandardItemsMutation.mutate()}
            disabled={seedStandardItemsMutation.isPending || isAutoSeeding}
            className="flex-1 sm:flex-none gap-2 border-emerald-400/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
            title={bn ? 'তেল, আলু, পেঁয়াজ, রসুন, মসলা, চিনি, ডিম, মাংস ইত্যাদি রান্নার সকল সামগ্রী যোগ করুন' : 'Add all standard cooking food items'}
          >
            <Sparkles className={`w-4 h-4 text-emerald-600 ${(seedStandardItemsMutation.isPending || isAutoSeeding) ? 'animate-spin' : ''}`} />
            <span>{(seedStandardItemsMutation.isPending || isAutoSeeding) ? (bn ? 'যোগ হচ্ছে...' : 'Adding...') : (bn ? 'সব রান্নার সামগ্রী যোগ' : 'Add Cooking Items')}</span>
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
                sort_order: String(foodItems.length + 1),
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
          <TabsList className="bg-muted/70 p-1.5 rounded-xl border border-border/60">
            <TabsTrigger value="stock-list" className="rounded-lg gap-2 text-xs md:text-sm font-semibold data-[state=active]:!bg-emerald-600 data-[state=active]:!text-white shadow-xs">
              <PackageCheck className="w-4 h-4" />
              <span>{bn ? 'খাদ্য সামগ্রী মজুদ' : 'Current Stock'}</span>
            </TabsTrigger>
            <TabsTrigger value="cooking-logs" className="rounded-lg gap-2 text-xs md:text-sm font-semibold data-[state=active]:!bg-emerald-600 data-[state=active]:!text-white shadow-xs">
              <History className="w-4 h-4" />
              <span>{bn ? 'রান্না ও খরচের ইতিহাস' : 'Cooking Logs'}</span>
            </TabsTrigger>
            <TabsTrigger value="cost-analysis" className="rounded-lg gap-2 text-xs md:text-sm font-semibold data-[state=active]:!bg-emerald-600 data-[state=active]:!text-white shadow-xs">
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

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportMonthlyStock}
                  className="h-9 gap-1.5 text-xs border-border bg-card hover:bg-muted"
                  title={bn ? 'চলতি মাসের পূর্ণাঙ্গ খাদ্য মজুদ খতিয়ান এক্সেল ডাউনলোড করুন' : 'Export monthly inventory register'}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{bn ? 'স্টক এক্সেল' : 'Export Excel'}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => seedStandardItemsMutation.mutate()}
                  disabled={seedStandardItemsMutation.isPending || isAutoSeeding}
                  className="h-9 gap-1.5 text-xs border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${(seedStandardItemsMutation.isPending || isAutoSeeding) ? 'animate-spin' : ''}`} />
                  <span>{(seedStandardItemsMutation.isPending || isAutoSeeding) ? (bn ? 'যোগ হচ্ছে...' : 'Adding...') : (bn ? 'বাকি রান্নার সামগ্রী যোগ' : 'Add Cooking Items')}</span>
                </Button>
              </div>
            </CardHeader>

            {/* Category Filter Tabs: কাঁচা মাল, মাংস, মাছ, মুদি */}
            <div className="px-6 pb-3 pt-1 flex flex-wrap items-center gap-2 border-b border-border/50">
              <button
                type="button"
                onClick={() => setActiveCategoryTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCategoryTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-muted/40 border border-border/60'
                }`}
              >
                <span>🍱</span>
                <span>{bn ? 'সকল সামগ্রী' : 'All Items'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeCategoryTab === 'all' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                }`}>
                  {categoryCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab('vegetables')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCategoryTab === 'vegetables'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-muted/40 border border-border/60'
                }`}
              >
                <span>🥬</span>
                <span>{bn ? 'কাঁচা মাল ও শাকসবজি' : 'Vegetables & Produce'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeCategoryTab === 'vegetables' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                }`}>
                  {categoryCounts.vegetables}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab('meat')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCategoryTab === 'meat'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-muted/40 border border-border/60'
                }`}
              >
                <span>🥩</span>
                <span>{bn ? 'মাংস ও ডিম' : 'Meat & Eggs'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeCategoryTab === 'meat' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                }`}>
                  {categoryCounts.meat}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab('fish')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCategoryTab === 'fish'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-muted/40 border border-border/60'
                }`}
              >
                <span>🐟</span>
                <span>{bn ? 'মাছ' : 'Fish'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeCategoryTab === 'fish' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                }`}>
                  {categoryCounts.fish}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab('grocery')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCategoryTab === 'grocery'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-muted/40 border border-border/60'
                }`}
              >
                <span>🌾</span>
                <span>{bn ? 'মুদি ও শুকনা খাদ্য' : 'Grocery & Spices'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeCategoryTab === 'grocery' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                }`}>
                  {categoryCounts.grocery}
                </span>
              </button>
            </div>

            {/* Monthly Balance & Automatic Carryover Ribbon */}
            <div className="mx-6 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-500/5 border border-slate-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">{bn ? '১. প্রারম্ভিক জের (গত মাস হতে)' : '1. Opening Stock'}</span>
                  <ArrowDownToLine className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="text-lg font-bold text-foreground">
                  ৳ {Math.round(monthlySummary.totalOpeningVal).toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {bn ? `${MONTHS_BN[(selectedMonth + 11) % 12]} মাসের সমাপনী জের` : 'Carried from previous month'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{bn ? '২. চলতি মাসে ক্রয়/জমা (+)' : '2. Month Inflow (+)'}</span>
                  <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  +৳ {Math.round(monthlySummary.totalMonthInCost).toLocaleString()}
                </div>
                <p className="text-[10px] text-emerald-600/80">
                  {bn ? `${monthlySummary.totalMonthInQty} মোট পরিমাণ নতুন জমা` : `${monthlySummary.totalMonthInQty} total items added`}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">{bn ? '৩. চলতি মাসে রান্নায় খরচ (-)' : '3. Month Cooking (-)'}</span>
                  <Flame className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div className="text-lg font-bold text-orange-700 dark:text-orange-400">
                  -৳ {Math.round(monthlySummary.totalMonthOutCost).toLocaleString()}
                </div>
                <p className="text-[10px] text-orange-600/80">
                  {bn ? `${monthlySummary.totalMonthOutQty} মোট পরিমাণ রান্নায় ব্যবহার` : `${monthlySummary.totalMonthOutQty} total items consumed`}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300">{bn ? '৪. মাস শেষে সমাপনী মজুদ (=)' : '4. Month-End Closing (=)'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="text-lg font-bold text-teal-800 dark:text-teal-300">
                  ৳ {Math.round(monthlySummary.totalClosingVal).toLocaleString()}
                </div>
                <p className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">
                  {bn ? `পরবর্তি মাসে (${MONTHS_BN[(selectedMonth + 1) % 12]}) স্বয়ংক্রিয় প্রারম্ভিক জের` : 'Auto carryover to next month'}
                </p>
              </div>
            </div>

            {foodItems.length < 15 && (
              <div className="mx-6 mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className={`w-4 h-4 ${(seedStandardItemsMutation.isPending || isAutoSeeding) ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      {isAutoSeeding 
                        ? (bn ? 'রান্নার খাদ্য সামগ্রী স্বয়ংক্রিয়ভাবে তালিকায় প্রস্তুত করা হচ্ছে...' : 'Automatically loading cooking ingredients...')
                        : (bn ? 'বোর্ডিং রান্নায় ব্যবহৃত বাকি সকল খাদ্য সামগ্রী যোগ করতে চান?' : 'Add all other cooking pantry items?')}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {bn ? 'তেল, আলু, পেঁয়াজ, রসুন, আদা, লবণ, হলুদ, মরিচ, গরম মসলা, চিনি, চা পাতা, ডিম, মাংস, মাছ, গ্যাস সিলিন্ডার ইত্যাদি' : 'Oil, potato, onion, spices, sugar, eggs, chicken, meat, fish, gas etc.'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => seedStandardItemsMutation.mutate()}
                  disabled={seedStandardItemsMutation.isPending || isAutoSeeding}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0 gap-1.5 shadow-sm"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${(seedStandardItemsMutation.isPending || isAutoSeeding) ? 'animate-spin' : ''}`} />
                  <span>{(seedStandardItemsMutation.isPending || isAutoSeeding) ? (bn ? 'যুক্ত হচ্ছে...' : 'Adding...') : (bn ? 'এক ক্লিকে সকল সামগ্রী যোগ করুন' : 'Add All Items')}</span>
                </Button>
              </div>
            )}

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
                          sort_order: String(foodItems.length + 1),
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
                        <TableHead className="w-[85px]">{bn ? 'ক্রমিক' : 'Serial #'}</TableHead>
                        <TableHead>{bn ? 'খাদ্য সামগ্রীর নাম' : 'Item Name'}</TableHead>
                        <TableHead className="text-center min-w-[130px]">{bn ? 'সর্বশেষ মজুদের তারিখ' : 'Last Stock Date'}</TableHead>
                        <TableHead className="text-right min-w-[100px]">{bn ? 'প্রারম্ভিক জের' : 'Opening'}</TableHead>
                        <TableHead className="text-right min-w-[100px]">{bn ? 'মাসে ক্রয় (+)' : 'Inflow (+)'}</TableHead>
                        <TableHead className="text-right min-w-[100px]">{bn ? 'রান্নায় খরচ (-)' : 'Used (-)'}</TableHead>
                        <TableHead className="text-right min-w-[115px]">{bn ? 'সমাপনী মজুদ (=)' : 'Closing'}</TableHead>
                        <TableHead className="text-right min-w-[90px]">{bn ? 'একক দর' : 'Unit Price'}</TableHead>
                        <TableHead className="text-right min-w-[110px]">{bn ? 'সমাপনী মূল্য' : 'Total Value'}</TableHead>
                        <TableHead className="text-right min-w-[140px]">{bn ? 'পদক্ষেপ' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFoodItems.map((row, idx) => {
                        const { item, serial, lastStockInDate, openingStock, monthInQty, monthOutQty, closingStock, unitPrice, closingValue } = row;
                        const min = Number(item.min_stock_level) || 5;
                        const isLow = closingStock <= min;
                        const itemSerial = currentTabSerialMap.get(item.id) || (idx + 1);

                        return (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell className="w-[85px] py-1.5">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={editingSerialId === item.id ? editingSerialVal : itemSerial}
                                  onFocus={() => {
                                    setEditingSerialId(item.id);
                                    setEditingSerialVal(String(itemSerial));
                                  }}
                                  onChange={(e) => setEditingSerialVal(e.target.value)}
                                  onBlur={() => {
                                    if (editingSerialId === item.id) {
                                      const val = parseInt(editingSerialVal);
                                      if (!isNaN(val) && val > 0 && val !== itemSerial) {
                                        reorderItemPosition(item.id, val);
                                      }
                                      setEditingSerialId(null);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-11 h-7 px-1 text-center font-bold text-xs bg-background/90 border-border focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-md shadow-none"
                                  title={bn ? 'সিরিয়াল নাম্বার পরিবর্তন করতে সংখ্যাটি পরিবর্তন করে এন্টার দিন বা বাইরে ক্লিক করুন' : 'Edit serial number and press enter'}
                                />
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveUp(item)}
                                    className="w-4 h-3 flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded text-[9px] leading-none"
                                    title={bn ? 'উপরে নিন (সিরিয়াল ১ কমান)' : 'Move up'}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveDown(item)}
                                    className="w-4 h-3 flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded text-[9px] leading-none"
                                    title={bn ? 'নিচে নিন (সিরিয়াল ১ বাড়ান)' : 'Move down'}
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground text-sm">{item.name_bn}</div>
                              {item.name_en && (
                                <div className="text-[11px] text-muted-foreground">{item.name_en}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {lastStockInDate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/70 text-foreground border border-border/60">
                                  <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                  {formatStockDate(lastStockInDate)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-muted-foreground">
                              {openingStock} <span className="text-[10px] font-normal">{item.unit}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {monthInQty > 0 ? (
                                <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs font-semibold">
                                  +{monthInQty} {item.unit}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {monthOutQty > 0 ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 text-xs font-semibold">
                                  -{monthOutQty} {item.unit}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-sm text-foreground">
                                {closingStock} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                              </div>
                              {isLow && (
                                <span className="text-[10px] text-amber-600 font-semibold block">{bn ? 'স্বল্প মজুত' : 'Low Stock'}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              {unitPrice > 0 ? `৳ ${unitPrice.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              ৳ {Math.round(closingValue).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenStockIn(item)}
                                  className="h-7 px-2 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 shadow-none"
                                  title={bn ? 'এই আইটেমে নতুন মজুদ জমা / ক্রয়' : 'Add Stock'}
                                >
                                  <PackagePlus className="w-3 h-3" />
                                  <span>{bn ? '+মজুদ' : '+In'}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenConsume(item)}
                                  className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 gap-1"
                                  title={bn ? 'রান্নায় ব্যবহার' : 'Consume'}
                                >
                                  <Flame className="w-3 h-3" />
                                  <span>{bn ? 'ব্যবহার' : 'Use'}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  title={bn ? 'সম্পাদনা করুন' : 'Edit item'}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeletingItem(item)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  title={bn ? 'মুছে ফেলুন' : 'Delete item'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter className="bg-muted/70 font-semibold border-t-2 border-border/80">
                      <TableRow>
                        <TableCell colSpan={3} className="text-left font-bold text-xs py-3">
                          {bn ? `মোট সারাংশ (${MONTHS_BN[selectedMonth]} ${selectedYear}):` : 'Monthly Totals:'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                          ৳ {Math.round(monthlySummary.totalOpeningVal).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          +৳ {Math.round(monthlySummary.totalMonthInCost).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-orange-700 dark:text-orange-400">
                          -৳ {Math.round(monthlySummary.totalMonthOutCost).toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={2} className="text-right text-xs font-semibold text-muted-foreground">
                          {bn ? 'সমাপনী মূল্যায়ন:' : 'Valuation:'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-extrabold text-teal-800 dark:text-teal-300">
                          ৳ {Math.round(monthlySummary.totalClosingVal).toLocaleString()}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
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
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Actions'}</TableHead>
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
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingLog(log)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title={bn ? 'রেকর্ডটি মুছুন ও স্টক ফেরত দিন' : 'Delete log & restore stock'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
              {isDuplicateItemName && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {bn ? 'এই নামের খাদ্য সামগ্রী ইতোমধ্যে তালিকায় বিদ্যমান আছে! ডুপ্লিকেট নাম পরিহার করুন।' : 'An item with this name already exists in the food list!'}
                </p>
              )}
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

            <div>
              <Label className="text-xs font-semibold">{bn ? 'ক্রমিক / সিরিয়াল নাম্বার' : 'Serial / Order Number'}</Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={itemForm.sort_order}
                onChange={e => setItemForm(f => ({ ...f, sort_order: e.target.value }))}
                className="mt-1 text-xs font-bold"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {bn ? 'তালিকায় যে ক্রমানুসারে দেখতে চান (যেমন: ১, ২, ৩...)' : 'Order in which item should appear in table'}
              </p>
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
                disabled={itemMutation.isPending || !itemForm.name_bn.trim() || isDuplicateItemName}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {itemMutation.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ করুন' : 'Save Item')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION MODAL: DELETE FOOD ITEM */}
      <AlertDialog open={!!deletingItem} onOpenChange={open => { if (!open) setDeletingItem(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span>{bn ? 'খাদ্য সামগ্রী মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Delete Food Item'}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2 text-foreground/80 leading-relaxed">
              {bn ? (
                <>
                  আপনি কি নিশ্চিতভাবে <strong className="text-foreground font-semibold">"{deletingItem?.name_bn}"</strong> আইটেমটি খাদ্য তালিকা থেকে মুছে ফেলতে চান?
                  <br />
                  <span className="text-xs text-muted-foreground mt-2 block bg-muted/40 p-2 rounded-lg border border-border/50">
                    বর্তমান মজুত: <strong className="text-foreground">{deletingItem?.current_stock} {deletingItem?.unit}</strong>
                    {deletingItem?.buying_price ? ` | গড় ক্রয়মূল্য: ৳${deletingItem.buying_price}` : ''}
                  </span>
                </>
              ) : (
                `Are you sure you want to delete "${deletingItem?.name_bn}"? This action will remove it from the active pantry list.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-xl">{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingItem) {
                  deleteMutation.mutate(deletingItem.id);
                }
              }}
            >
              {deleteMutation.isPending ? (bn ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...') : (bn ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRMATION MODAL: DELETE COOKING LOG (RESTORE STOCK) */}
      <AlertDialog open={!!deletingLog} onOpenChange={open => { if (!open) setDeletingLog(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span>{bn ? 'রান্নার ব্যবহার রেকর্ড মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Delete Cooking Log'}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2 text-foreground/80 leading-relaxed">
              {bn ? (
                <>
                  আপনি কি নিশ্চিতভাবে এই রান্নার রেকর্ডটি মুছে ফেলতে চান?
                  <br />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 block bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-300 dark:border-emerald-800 font-medium">
                    (রেকর্ডটি মুছে ফেললে ব্যবহৃত পরিমাণ <strong>{Math.abs(deletingLog?.change_amount || 0)} {itemsMap.get(deletingLog?.item_id || '')?.unit}</strong> স্বয়ংক্রিয়ভাবে বর্তমান খাদ্য মজুতে পুনরায় ফেরত (Restored) যোগ করা হবে)
                  </span>
                </>
              ) : (
                `Are you sure you want to delete this cooking log? The consumed quantity will be restored to current stock.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-xl">{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLogMutation.isPending}
              className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingLog) {
                  deleteLogMutation.mutate(deletingLog);
                }
              }}
            >
              {deleteLogMutation.isPending ? (bn ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...') : (bn ? 'হ্যাঁ, মুছে ফেরত দিন' : 'Yes, Delete & Restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* MODAL: STOCK IN (নতুন খাদ্য মজুদ জমা / ক্রয়) */}
      <Dialog open={stockInDialog} onOpenChange={setStockInDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <PackagePlus className="w-5 h-5 text-emerald-600" />
              <span>{bn ? 'নতুন খাদ্য মজুদ জমা / ক্রয় এন্ট্রি' : 'Stock In Entry'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {bn
                ? 'কোন তারিখে কতটুকু খাদ্য সামগ্রী মজুদ বা ক্রয় করা হয়েছে তা এন্ট্রি করুন। সমাপনী ব্যালেন্স ও আগামী মাসের প্রারম্ভিক মজুদ স্বয়ংক্রিয়ভাবে আপডেট হবে।'
                : 'Record date and quantity of newly purchased or received stock.'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={e => {
              e.preventDefault();
              stockInMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-xs font-semibold">{bn ? 'মজুদের তারিখ' : 'Stock In Date'} *</Label>
              <DatePicker
                bengali={bn}
                value={stockInForm.stock_date}
                onChange={v => setStockInForm(f => ({ ...f, stock_date: v }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {bn ? 'যে তারিখে খাদ্য সামগ্রীটি গোডাউনে বা বোর্ডিংয়ে মজুদ হয়েছে' : 'The date when item was received into stock'}
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'খাদ্য সামগ্রী বাছাই করুন' : 'Select Food Item'} *</Label>
              <Select
                value={stockInForm.item_id || undefined}
                onValueChange={val => {
                  const itm = itemsMap.get(val);
                  setStockInForm(f => ({
                    ...f,
                    item_id: val,
                    unit_price: itm?.buying_price ? String(itm.buying_price) : f.unit_price,
                  }));
                }}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder={bn ? 'আইটেম বেছে নিন...' : 'Select item...'} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {foodItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name_bn} — {bn ? 'বর্তমান মজুত:' : 'Current:'} {item.current_stock} {item.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStockInItem && (
                <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {bn ? `বর্তমান মজুত: ${selectedStockInItem.current_stock} ${selectedStockInItem.unit}` : `In Stock: ${selectedStockInItem.current_stock} ${selectedStockInItem.unit}`}
                  {selectedStockInItem.buying_price ? ` | প্রচলিত একক দর: ৳ ${selectedStockInItem.buying_price}` : ''}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  {bn ? `জমা / ক্রয় পরিমাণ (${selectedStockInItem?.unit || 'একক'})` : `Quantity (${selectedStockInItem?.unit || 'unit'})`} *
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder={bn ? 'যেমন: ৫০' : 'e.g. 50'}
                  value={stockInForm.quantity}
                  onChange={e => setStockInForm(f => ({ ...f, quantity: e.target.value }))}
                  className="mt-1 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{bn ? 'একক ক্রয় দর (৳)' : 'Unit Price (BDT)'}</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={bn ? 'যেমন: ৬৫' : 'e.g. 65'}
                  value={stockInForm.unit_price}
                  onChange={e => setStockInForm(f => ({ ...f, unit_price: e.target.value }))}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            {stockInTotal > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{bn ? 'মোট ক্রয়মূল্য হিসাব:' : 'Computed Total Cost:'}</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  ৳ {stockInTotal.toLocaleString()}
                </span>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">{bn ? 'ভাউচার / মেমো নং বা সরবরাহকারী (ঐচ্ছিক)' : 'Voucher / Memo No (Optional)'}</Label>
              <Input
                placeholder={bn ? 'যেমন: মেমো #৪১২ / কাওরান বাজার' : 'e.g. Memo #412 / Local Market'}
                value={stockInForm.voucher_no}
                onChange={e => setStockInForm(f => ({ ...f, voucher_no: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">{bn ? 'বিবরণ / নোট (ঐচ্ছিক)' : 'Notes / Remarks (Optional)'}</Label>
              <Input
                placeholder={bn ? 'যেমন: ২ বস্তা মিনিকেট চাল ক্রয়' : 'e.g. 2 bags of Miniket rice'}
                value={stockInForm.notes}
                onChange={e => setStockInForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStockInDialog(false)}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={stockInMutation.isPending || !stockInForm.item_id || !stockInForm.quantity}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {stockInMutation.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'মজুদ জমা নিশ্চিত করুন' : 'Confirm Stock In')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HostelBoardingStockTab;
