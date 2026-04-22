import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, BedDouble, Users, UtensilsCrossed, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

type Hostel = { id: string; name: string; name_bn: string; hostel_type: string; address?: string | null; warden_name?: string | null; warden_phone?: string | null; total_capacity: number; is_active: boolean; notes?: string | null };
type Room = { id: string; hostel_id: string; room_number: string; floor?: string | null; bed_count: number; monthly_rent: number; room_type?: string | null; is_active: boolean; notes?: string | null };
type Allocation = { id: string; room_id: string; student_id?: string | null; staff_id?: string | null; occupant_type: 'student' | 'staff'; academic_session_id?: string | null; class_id?: string | null; fee_mode: 'free' | 'full' | 'discount'; discount_percent: number; discount_amount: number; bed_number?: number | null; check_in_date: string; check_out_date?: string | null; status: string; monthly_charge: number; notes?: string | null };
type Meal = { id: string; hostel_id: string; day_of_week: string; meal_type: string; items: string; items_bn?: string | null };

const DAYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const DAYS_BN = ['শনিবার','রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার'];
const MEAL_TYPES = [
  { v: 'breakfast', en: 'Breakfast', bn: 'নাশতা' },
  { v: 'lunch', en: 'Lunch', bn: 'দুপুরের খাবার' },
  { v: 'dinner', en: 'Dinner', bn: 'রাতের খাবার' },
  { v: 'snack', en: 'Snack', bn: 'বিকেলের নাশতা' },
];

const AdminHostel = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  // ─── Hostels ────────────────────────────────────────────────────────────
  const { data: hostels = [] } = useQuery({
    queryKey: ['hostels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostels' as any).select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Hostel[];
    },
  });

  const [hostelDlg, setHostelDlg] = useState(false);
  const [editHostel, setEditHostel] = useState<Hostel | null>(null);
  const [hostelForm, setHostelForm] = useState<Partial<Hostel>>({ hostel_type: 'boys', total_capacity: 0, is_active: true });
  const [delHostelId, setDelHostelId] = useState<string | null>(null);

  const saveHostel = useMutation({
    mutationFn: async (payload: Partial<Hostel>) => {
      if (editHostel) {
        const { error } = await supabase.from('hostels' as any).update(payload).eq('id', editHostel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostels' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostels'] });
      setHostelDlg(false); setEditHostel(null); setHostelForm({ hostel_type: 'boys', total_capacity: 0, is_active: true });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteHostel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostels' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostels'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelHostelId(null); },
  });

  // ─── Rooms ──────────────────────────────────────────────────────────────
  const { data: rooms = [] } = useQuery({
    queryKey: ['hostel-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostel_rooms' as any).select('*').order('room_number');
      if (error) throw error;
      return data as unknown as Room[];
    },
  });

  const [roomDlg, setRoomDlg] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<Partial<Room>>({ bed_count: 1, monthly_rent: 0, is_active: true });
  const [delRoomId, setDelRoomId] = useState<string | null>(null);

  const saveRoom = useMutation({
    mutationFn: async (payload: Partial<Room>) => {
      if (editRoom) {
        const { error } = await supabase.from('hostel_rooms' as any).update(payload).eq('id', editRoom.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostel_rooms' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-rooms'] });
      setRoomDlg(false); setEditRoom(null); setRoomForm({ bed_count: 1, monthly_rent: 0, is_active: true });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostel_rooms' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelRoomId(null); },
  });

  // ─── Allocations ────────────────────────────────────────────────────────
  const { data: allocations = [] } = useQuery({
    queryKey: ['hostel-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostel_allocations' as any).select('*').order('check_in_date', { ascending: false });
      if (error) throw error;
      return data as unknown as Allocation[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-min'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id, student_id, name_bn, name_en, academic_session_id, class_id').is('deleted_at', null).limit(2000);
      if (error) throw error;
      return data;
    },
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-min-hostel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('id, staff_id, name_bn, name_en').is('deleted_at', null).limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-hostel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('id, name, name_bn').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: classesList = [] } = useQuery({
    queryKey: ['classes-hostel'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('id, name, name_bn, sort_order').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const [allocDlg, setAllocDlg] = useState(false);
  const [editAlloc, setEditAlloc] = useState<Allocation | null>(null);
  const [allocForm, setAllocForm] = useState<Partial<Allocation>>({ status: 'active', occupant_type: 'student', fee_mode: 'full', discount_percent: 0, discount_amount: 0, monthly_charge: 0, check_in_date: new Date().toISOString().split('T')[0] });
  const [delAllocId, setDelAllocId] = useState<string | null>(null);

  const saveAlloc = useMutation({
    mutationFn: async (payload: Partial<Allocation>) => {
      if (editAlloc) {
        const { error } = await supabase.from('hostel_allocations' as any).update(payload).eq('id', editAlloc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostel_allocations' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-allocations'] });
      setAllocDlg(false); setEditAlloc(null); setAllocForm({ status: 'active', occupant_type: 'student', fee_mode: 'full', discount_percent: 0, discount_amount: 0, monthly_charge: 0, check_in_date: new Date().toISOString().split('T')[0] });
      toast({ title: bn ? 'বরাদ্দ সংরক্ষিত' : 'Allocation saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteAlloc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostel_allocations' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-allocations'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelAllocId(null); },
  });

  // ─── Meals ──────────────────────────────────────────────────────────────
  const { data: meals = [] } = useQuery({
    queryKey: ['hostel-meals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hostel_meal_menu' as any).select('*');
      if (error) throw error;
      return data as unknown as Meal[];
    },
  });

  const [mealDlg, setMealDlg] = useState(false);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [mealForm, setMealForm] = useState<Partial<Meal>>({ day_of_week: 'Saturday', meal_type: 'breakfast' });
  const [delMealId, setDelMealId] = useState<string | null>(null);

  const saveMeal = useMutation({
    mutationFn: async (payload: Partial<Meal>) => {
      if (editMeal) {
        const { error } = await supabase.from('hostel_meal_menu' as any).update(payload).eq('id', editMeal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hostel_meal_menu' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hostel-meals'] });
      setMealDlg(false); setEditMeal(null); setMealForm({ day_of_week: 'Saturday', meal_type: 'breakfast' });
      toast({ title: bn ? 'মেনু সংরক্ষিত' : 'Menu saved' });
    },
    onError: (e: any) => toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hostel_meal_menu' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-meals'] }); toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' }); setDelMealId(null); },
  });

  // ─── Stats ──────────────────────────────────────────────────────────────
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((s, r) => s + (r.bed_count || 0), 0);
  const occupied = allocations.filter(a => a.status === 'active').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  const studentName = (id?: string | null) => {
    if (!id) return '—';
    const s: any = students.find((x: any) => x.id === id);
    return s ? (bn ? s.name_bn : (s.name_en || s.name_bn)) + ` (${s.student_id})` : id.slice(0, 8);
  };
  const staffName = (id?: string | null) => {
    if (!id) return '—';
    const s: any = (staffList as any[]).find((x: any) => x.id === id);
    return s ? (bn ? s.name_bn : (s.name_en || s.name_bn)) + (s.staff_id ? ` (${s.staff_id})` : '') : id.slice(0, 8);
  };
  const occupantLabel = (a: Allocation) => a.occupant_type === 'staff' ? staffName(a.staff_id) : studentName(a.student_id);
  const sessionLabel = (id?: string | null) => {
    if (!id) return '—';
    const s: any = (academicSessions as any[]).find((x: any) => x.id === id);
    return s ? (bn ? (s.name_bn || s.name) : s.name) : '—';
  };
  const classLabel = (id?: string | null) => {
    if (!id) return '—';
    const c: any = (classesList as any[]).find((x: any) => x.id === id);
    return c ? (bn ? c.name_bn : c.name) : '—';
  };
  const roomLabel = (id: string) => {
    const r = rooms.find(x => x.id === id);
    if (!r) return id.slice(0, 8);
    const h = hostels.find(x => x.id === r.hostel_id);
    return `${h ? (bn ? h.name_bn : h.name) : ''} - ${r.room_number}`;
  };
  const hostelLabel = (id: string) => {
    const h = hostels.find(x => x.id === id);
    return h ? (bn ? h.name_bn : h.name) : id.slice(0, 8);
  };

  // Filter students by selected session/class for allocation form
  const filteredStudents = (students as any[]).filter((s: any) => {
    if (allocForm.academic_session_id && s.academic_session_id !== allocForm.academic_session_id) return false;
    if (allocForm.class_id && s.class_id !== allocForm.class_id) return false;
    return true;
  });

  // Auto-calculate net charge based on fee mode + room rent
  const computeNetCharge = (form: Partial<Allocation>): number => {
    const room = rooms.find(r => r.id === form.room_id);
    const base = Number(room?.monthly_rent || 0);
    if (form.fee_mode === 'free') return 0;
    if (form.fee_mode === 'discount') {
      const pct = Number(form.discount_percent || 0);
      const amt = Number(form.discount_amount || 0);
      const afterPct = base - (base * pct / 100);
      return Math.max(0, afterPct - amt);
    }
    return base;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{bn ? 'হোস্টেল ব্যবস্থাপনা' : 'Hostel Management'}</h1>
        <p className="text-muted-foreground">{bn ? 'হোস্টেল, রুম, বরাদ্দ ও খাবার মেনু পরিচালনা করুন' : 'Manage hostels, rooms, allocations and meal menus'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Building2 className="w-6 h-6 text-primary" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'মোট হোস্টেল' : 'Total Hostels'}</p><p className="text-2xl font-bold">{hostels.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center"><BedDouble className="w-6 h-6 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'মোট বেড' : 'Total Beds'}</p><p className="text-2xl font-bold">{totalBeds}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><Users className="w-6 h-6 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'বরাদ্দকৃত' : 'Occupied'}</p><p className="text-2xl font-bold">{occupied}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center"><UtensilsCrossed className="w-6 h-6 text-orange-600" /></div><div><p className="text-xs text-muted-foreground">{bn ? 'অকুপেন্সি' : 'Occupancy'}</p><p className="text-2xl font-bold">{occupancyRate}%</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="hostels" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="hostels">{bn ? 'হোস্টেল' : 'Hostels'}</TabsTrigger>
          <TabsTrigger value="rooms">{bn ? 'রুম' : 'Rooms'}</TabsTrigger>
          <TabsTrigger value="allocations">{bn ? 'বরাদ্দ' : 'Allocations'}</TabsTrigger>
          <TabsTrigger value="meals">{bn ? 'খাবার মেনু' : 'Meal Menu'}</TabsTrigger>
        </TabsList>

        {/* HOSTELS TAB */}
        <TabsContent value="hostels">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'হোস্টেল তালিকা' : 'Hostels'}</CardTitle>
              <Button onClick={() => { setEditHostel(null); setHostelForm({ hostel_type: 'boys', total_capacity: 0, is_active: true }); setHostelDlg(true); }}>
                <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন' : 'New'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                    <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                    <TableHead>{bn ? 'ওয়ার্ডেন' : 'Warden'}</TableHead>
                    <TableHead>{bn ? 'ক্যাপাসিটি' : 'Capacity'}</TableHead>
                    <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hostels.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{bn ? h.name_bn : h.name}</TableCell>
                      <TableCell>{h.hostel_type === 'boys' ? (bn ? 'ছেলে' : 'Boys') : h.hostel_type === 'girls' ? (bn ? 'মেয়ে' : 'Girls') : (bn ? 'মিশ্র' : 'Mixed')}</TableCell>
                      <TableCell>{h.warden_name || '—'}</TableCell>
                      <TableCell>{h.total_capacity}</TableCell>
                      <TableCell><Badge variant={h.is_active ? 'default' : 'secondary'}>{h.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditHostel(h); setHostelForm(h); setHostelDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDelHostelId(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {hostels.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{bn ? 'কোনো হোস্টেল নেই' : 'No hostels yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROOMS TAB */}
        <TabsContent value="rooms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'রুম তালিকা' : 'Rooms'}</CardTitle>
              <Button onClick={() => { setEditRoom(null); setRoomForm({ bed_count: 1, monthly_rent: 0, is_active: true }); setRoomDlg(true); }}>
                <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন রুম' : 'New Room'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{bn ? 'হোস্টেল' : 'Hostel'}</TableHead>
                  <TableHead>{bn ? 'রুম নং' : 'Room #'}</TableHead>
                  <TableHead>{bn ? 'তলা' : 'Floor'}</TableHead>
                  <TableHead>{bn ? 'বেড' : 'Beds'}</TableHead>
                  <TableHead>{bn ? 'মাসিক ভাড়া' : 'Monthly Rent'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rooms.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{hostelLabel(r.hostel_id)}</TableCell>
                      <TableCell className="font-medium">{r.room_number}</TableCell>
                      <TableCell>{r.floor || '—'}</TableCell>
                      <TableCell>{r.bed_count}</TableCell>
                      <TableCell>৳{Number(r.monthly_rent).toLocaleString()}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditRoom(r); setRoomForm(r); setRoomDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDelRoomId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rooms.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{bn ? 'কোনো রুম নেই' : 'No rooms yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALLOCATIONS TAB */}
        <TabsContent value="allocations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'রুম বরাদ্দ' : 'Allocations'}</CardTitle>
              <Button onClick={() => { setEditAlloc(null); setAllocForm({ status: 'active', occupant_type: 'student', fee_mode: 'full', discount_percent: 0, discount_amount: 0, monthly_charge: 0, check_in_date: new Date().toISOString().split('T')[0] }); setAllocDlg(true); }}>
                <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন বরাদ্দ' : 'New Allocation'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                  <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                  <TableHead>{bn ? 'সেশন/শ্রেণী' : 'Session/Class'}</TableHead>
                  <TableHead>{bn ? 'রুম' : 'Room'}</TableHead>
                  <TableHead>{bn ? 'বেড' : 'Bed'}</TableHead>
                  <TableHead>{bn ? 'চেক-ইন' : 'Check-in'}</TableHead>
                  <TableHead>{bn ? 'ফি মোড' : 'Fee Mode'}</TableHead>
                  <TableHead>{bn ? 'মাসিক চার্জ' : 'Monthly'}</TableHead>
                  <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {allocations.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Badge variant={a.occupant_type === 'staff' ? 'secondary' : 'outline'}>
                          {a.occupant_type === 'staff' ? (bn ? 'স্টাফ' : 'Staff') : (bn ? 'ছাত্র' : 'Student')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{occupantLabel(a)}</TableCell>
                      <TableCell className="text-xs">
                        {a.occupant_type === 'student' ? (
                          <>
                            <div>{sessionLabel(a.academic_session_id)}</div>
                            <div className="text-muted-foreground">{classLabel(a.class_id)}</div>
                          </>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{roomLabel(a.room_id)}</TableCell>
                      <TableCell>{a.bed_number || '—'}</TableCell>
                      <TableCell>{a.check_in_date}</TableCell>
                      <TableCell>
                        <Badge variant={a.fee_mode === 'free' ? 'default' : a.fee_mode === 'discount' ? 'secondary' : 'outline'}>
                          {a.fee_mode === 'free' ? (bn ? 'ফ্রি' : 'Free') : a.fee_mode === 'discount' ? (bn ? `ডিসকাউন্ট ${a.discount_percent}%` : `Discount ${a.discount_percent}%`) : (bn ? 'পূর্ণ ফি' : 'Full Fee')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">৳{Number(a.monthly_charge).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditAlloc(a); setAllocForm(a); setAllocDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDelAllocId(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {allocations.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">{bn ? 'কোনো বরাদ্দ নেই' : 'No allocations yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEALS TAB */}
        <TabsContent value="meals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{bn ? 'সাপ্তাহিক খাবার মেনু' : 'Weekly Meal Menu'}</CardTitle>
              <Button onClick={() => { setEditMeal(null); setMealForm({ day_of_week: 'Saturday', meal_type: 'breakfast' }); setMealDlg(true); }}>
                <Plus className="w-4 h-4 mr-2" />{bn ? 'নতুন' : 'New'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{bn ? 'হোস্টেল' : 'Hostel'}</TableHead>
                  <TableHead>{bn ? 'বার' : 'Day'}</TableHead>
                  <TableHead>{bn ? 'খাবার' : 'Meal'}</TableHead>
                  <TableHead>{bn ? 'আইটেম' : 'Items'}</TableHead>
                  <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {meals.map(m => {
                    const dayIdx = DAYS.indexOf(m.day_of_week);
                    const mt = MEAL_TYPES.find(x => x.v === m.meal_type);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>{hostelLabel(m.hostel_id)}</TableCell>
                        <TableCell>{bn && dayIdx >= 0 ? DAYS_BN[dayIdx] : m.day_of_week}</TableCell>
                        <TableCell>{mt ? (bn ? mt.bn : mt.en) : m.meal_type}</TableCell>
                        <TableCell className="max-w-md truncate">{bn ? (m.items_bn || m.items) : m.items}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditMeal(m); setMealForm(m); setMealDlg(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDelMealId(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {meals.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{bn ? 'কোনো মেনু নেই' : 'No menu yet'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* HOSTEL DIALOG */}
      <Dialog open={hostelDlg} onOpenChange={setHostelDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editHostel ? (bn ? 'হোস্টেল সম্পাদনা' : 'Edit Hostel') : (bn ? 'নতুন হোস্টেল' : 'New Hostel')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'নাম (ইং)' : 'Name (EN)'} *</Label><Input value={hostelForm.name || ''} onChange={e => setHostelForm({ ...hostelForm, name: e.target.value })} /></div>
              <div><Label>{bn ? 'নাম (বাং)' : 'Name (BN)'} *</Label><Input value={hostelForm.name_bn || ''} onChange={e => setHostelForm({ ...hostelForm, name_bn: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'ধরন' : 'Type'}</Label>
                <Select value={hostelForm.hostel_type || 'boys'} onValueChange={v => setHostelForm({ ...hostelForm, hostel_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boys">{bn ? 'ছেলেদের' : 'Boys'}</SelectItem>
                    <SelectItem value="girls">{bn ? 'মেয়েদের' : 'Girls'}</SelectItem>
                    <SelectItem value="mixed">{bn ? 'মিশ্র' : 'Mixed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{bn ? 'ক্যাপাসিটি' : 'Capacity'}</Label><Input type="number" value={hostelForm.total_capacity || 0} onChange={e => setHostelForm({ ...hostelForm, total_capacity: Number(e.target.value) })} /></div>
            </div>
            <div><Label>{bn ? 'ঠিকানা' : 'Address'}</Label><Textarea value={hostelForm.address || ''} onChange={e => setHostelForm({ ...hostelForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'ওয়ার্ডেন' : 'Warden'}</Label><Input value={hostelForm.warden_name || ''} onChange={e => setHostelForm({ ...hostelForm, warden_name: e.target.value })} /></div>
              <div><Label>{bn ? 'ফোন' : 'Phone'}</Label><Input value={hostelForm.warden_phone || ''} onChange={e => setHostelForm({ ...hostelForm, warden_phone: e.target.value })} /></div>
            </div>
            <div><Label>{bn ? 'নোট' : 'Notes'}</Label><Textarea value={hostelForm.notes || ''} onChange={e => setHostelForm({ ...hostelForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHostelDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveHostel.mutate(hostelForm)} disabled={!hostelForm.name || !hostelForm.name_bn}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ROOM DIALOG */}
      <Dialog open={roomDlg} onOpenChange={setRoomDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRoom ? (bn ? 'রুম সম্পাদনা' : 'Edit Room') : (bn ? 'নতুন রুম' : 'New Room')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'হোস্টেল' : 'Hostel'} *</Label>
              <Select value={roomForm.hostel_id || ''} onValueChange={v => setRoomForm({ ...roomForm, hostel_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'হোস্টেল বাছাই' : 'Select hostel'} /></SelectTrigger>
                <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{bn ? h.name_bn : h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'রুম নং' : 'Room #'} *</Label><Input value={roomForm.room_number || ''} onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })} /></div>
              <div><Label>{bn ? 'তলা' : 'Floor'}</Label><Input value={roomForm.floor || ''} onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'বেড সংখ্যা' : 'Beds'}</Label><Input type="number" value={roomForm.bed_count || 1} onChange={e => setRoomForm({ ...roomForm, bed_count: Number(e.target.value) })} /></div>
              <div><Label>{bn ? 'মাসিক ভাড়া' : 'Monthly Rent'}</Label><Input type="number" value={roomForm.monthly_rent || 0} onChange={e => setRoomForm({ ...roomForm, monthly_rent: Number(e.target.value) })} /></div>
            </div>
            <div><Label>{bn ? 'রুম টাইপ' : 'Room Type'}</Label>
              <Select value={roomForm.room_type || 'standard'} onValueChange={v => setRoomForm({ ...roomForm, room_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{bn ? 'সাধারণ' : 'Standard'}</SelectItem>
                  <SelectItem value="ac">{bn ? 'এসি' : 'AC'}</SelectItem>
                  <SelectItem value="deluxe">{bn ? 'ডিলাক্স' : 'Deluxe'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveRoom.mutate(roomForm)} disabled={!roomForm.hostel_id || !roomForm.room_number}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALLOCATION DIALOG */}
      <Dialog open={allocDlg} onOpenChange={setAllocDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editAlloc ? (bn ? 'বরাদ্দ সম্পাদনা' : 'Edit Allocation') : (bn ? 'নতুন বরাদ্দ' : 'New Allocation')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'ছাত্র' : 'Student'} *</Label>
              <Select value={allocForm.student_id || ''} onValueChange={v => setAllocForm({ ...allocForm, student_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'ছাত্র বাছাই' : 'Select student'} /></SelectTrigger>
                <SelectContent className="max-h-60">{(students as any[]).map(s => <SelectItem key={s.id} value={s.id}>{(bn ? s.name_bn : (s.name_en || s.name_bn))} ({s.student_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{bn ? 'রুম' : 'Room'} *</Label>
              <Select value={allocForm.room_id || ''} onValueChange={v => setAllocForm({ ...allocForm, room_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'রুম বাছাই' : 'Select room'} /></SelectTrigger>
                <SelectContent className="max-h-60">{rooms.map(r => <SelectItem key={r.id} value={r.id}>{roomLabel(r.id)} ({r.bed_count} beds)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'বেড নং' : 'Bed #'}</Label><Input type="number" value={allocForm.bed_number || ''} onChange={e => setAllocForm({ ...allocForm, bed_number: Number(e.target.value) })} /></div>
              <div><Label>{bn ? 'মাসিক চার্জ' : 'Monthly Charge'}</Label><Input type="number" value={allocForm.monthly_charge || 0} onChange={e => setAllocForm({ ...allocForm, monthly_charge: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'চেক-ইন' : 'Check-in'}</Label><Input type="date" value={allocForm.check_in_date || ''} onChange={e => setAllocForm({ ...allocForm, check_in_date: e.target.value })} /></div>
              <div><Label>{bn ? 'চেক-আউট' : 'Check-out'}</Label><Input type="date" value={allocForm.check_out_date || ''} onChange={e => setAllocForm({ ...allocForm, check_out_date: e.target.value })} /></div>
            </div>
            <div><Label>{bn ? 'স্ট্যাটাস' : 'Status'}</Label>
              <Select value={allocForm.status || 'active'} onValueChange={v => setAllocForm({ ...allocForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{bn ? 'সক্রিয়' : 'Active'}</SelectItem>
                  <SelectItem value="checked_out">{bn ? 'চেক-আউট' : 'Checked Out'}</SelectItem>
                  <SelectItem value="suspended">{bn ? 'স্থগিত' : 'Suspended'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveAlloc.mutate(allocForm)} disabled={!allocForm.student_id || !allocForm.room_id}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MEAL DIALOG */}
      <Dialog open={mealDlg} onOpenChange={setMealDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editMeal ? (bn ? 'মেনু সম্পাদনা' : 'Edit Menu') : (bn ? 'নতুন মেনু' : 'New Menu')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{bn ? 'হোস্টেল' : 'Hostel'} *</Label>
              <Select value={mealForm.hostel_id || ''} onValueChange={v => setMealForm({ ...mealForm, hostel_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'হোস্টেল বাছাই' : 'Select hostel'} /></SelectTrigger>
                <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{bn ? h.name_bn : h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{bn ? 'বার' : 'Day'}</Label>
                <Select value={mealForm.day_of_week || 'Saturday'} onValueChange={v => setMealForm({ ...mealForm, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={d} value={d}>{bn ? DAYS_BN[i] : d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{bn ? 'খাবার' : 'Meal'}</Label>
                <Select value={mealForm.meal_type || 'breakfast'} onValueChange={v => setMealForm({ ...mealForm, meal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEAL_TYPES.map(m => <SelectItem key={m.v} value={m.v}>{bn ? m.bn : m.en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{bn ? 'আইটেম (ইং)' : 'Items (EN)'} *</Label><Textarea value={mealForm.items || ''} onChange={e => setMealForm({ ...mealForm, items: e.target.value })} placeholder="Rice, Dal, Vegetables, Fish curry" /></div>
            <div><Label>{bn ? 'আইটেম (বাং)' : 'Items (BN)'}</Label><Textarea value={mealForm.items_bn || ''} onChange={e => setMealForm({ ...mealForm, items_bn: e.target.value })} placeholder="ভাত, ডাল, সবজি, মাছের তরকারি" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMealDlg(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveMeal.mutate(mealForm)} disabled={!mealForm.hostel_id || !mealForm.items}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMS */}
      <DeleteConfirmDialog open={!!delHostelId} onOpenChange={() => setDelHostelId(null)} onConfirm={() => delHostelId && deleteHostel.mutate(delHostelId)} title={bn ? 'হোস্টেল মুছবেন?' : 'Delete hostel?'} />
      <DeleteConfirmDialog open={!!delRoomId} onOpenChange={() => setDelRoomId(null)} onConfirm={() => delRoomId && deleteRoom.mutate(delRoomId)} title={bn ? 'রুম মুছবেন?' : 'Delete room?'} />
      <DeleteConfirmDialog open={!!delAllocId} onOpenChange={() => setDelAllocId(null)} onConfirm={() => delAllocId && deleteAlloc.mutate(delAllocId)} title={bn ? 'বরাদ্দ মুছবেন?' : 'Delete allocation?'} />
      <DeleteConfirmDialog open={!!delMealId} onOpenChange={() => setDelMealId(null)} onConfirm={() => delMealId && deleteMeal.mutate(delMealId)} title={bn ? 'মেনু মুছবেন?' : 'Delete menu?'} />
    </div>
  );
};

export default AdminHostel;
