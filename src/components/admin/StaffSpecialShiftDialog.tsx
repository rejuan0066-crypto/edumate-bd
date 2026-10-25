import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { to12HourFormat } from '@/hooks/useTimeFormat';
import {
  Clock,
  Calendar,
  UserCheck,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
  Filter,
  Check,
} from 'lucide-react';
import {
  StaffSpecialShift,
  fetchSpecialShifts,
  saveSpecialShiftsBatch,
  deleteSpecialShift,
  isDateInRange,
} from '@/lib/shiftResolution';
import { getStaffDisplayNames } from '@/lib/nameFormatter';

interface StaffSpecialShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: any[];
  categories: Array<{ key: string; name: string; name_bn: string }>;
}

export const StaffSpecialShiftDialog: React.FC<StaffSpecialShiftDialogProps> = ({
  open,
  onOpenChange,
  staffList,
  categories,
}) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form State
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState('04:00');
  const [endTime, setEndTime] = useState('23:00');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [isOngoing, setIsOngoing] = useState(false);
  const [shiftNote, setShiftNote] = useState('');

  // Fetch special shifts
  const { data: specialShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['staff_special_shifts'],
    queryFn: async () => {
      return await fetchSpecialShifts(supabase);
    },
    enabled: open,
    staleTime: 0,
  });

  // Filtered staff for selection
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Exclude resigned or strictly inactive if needed
      if (s.status === 'inactive' && !selectedStaffIds.has(s.id)) return false;

      // Department filter
      if (selectedDept !== 'all') {
        const cat = s.staff_category || 'general';
        if (cat !== selectedDept) return false;
      }

      // Search filter
      if (staffSearch.trim()) {
        const q = staffSearch.toLowerCase().trim();
        const nameBn = (s.name_bn || '').toLowerCase();
        const nameEn = (s.name_en || s.name || '').toLowerCase();
        const staffId = (s.staff_id || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        if (!nameBn.includes(q) && !nameEn.includes(q) && !staffId.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [staffList, selectedDept, staffSearch, selectedStaffIds]);

  // Toggle single staff selection
  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible staff
  const selectAllVisible = () => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      filteredStaff.forEach((s) => next.add(s.id));
      return next;
    });
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedStaffIds(new Set());
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedStaffIds.size === 0) {
        throw new Error(bn ? 'কমপক্ষে একজন স্টাফ নির্বাচন করুন' : 'Please select at least one staff member');
      }
      if (!startTime || !endTime) {
        throw new Error(bn ? 'ডিউটি শুরু ও শেষ সময় আবশ্যক' : 'Duty start and end times are required');
      }
      if (!effectiveFrom) {
        throw new Error(bn ? 'কার্যকর শুরুর তারিখ আবশ্যক' : 'Effective from date is required');
      }
      if (!isOngoing && effectiveTo && effectiveTo < effectiveFrom) {
        throw new Error(
          bn ? 'সমাপ্তির তারিখ শুরুর তারিখের পূর্বের হতে পারবে না' : 'End date cannot be earlier than start date'
        );
      }

      const toDate = isOngoing ? null : effectiveTo || null;
      const staffMap = new Map(staffList.map((s) => [s.id, s]));

      const batchToSave: StaffSpecialShift[] = Array.from(selectedStaffIds).map((staffId) => {
        const staffMember = staffMap.get(staffId);
        return {
          id: crypto.randomUUID(),
          staff_id: staffId,
          staff_name: staffMember?.name_bn || staffMember?.name_en || staffMember?.name || null,
          category_key: staffMember?.staff_category || null,
          duty_start_time: startTime,
          duty_end_time: endTime,
          effective_from: effectiveFrom,
          effective_to: toDate,
          note: shiftNote.trim() || (bn ? 'আলাদা বিশেষ ডিউটি' : 'Special Duty'),
          is_active: true,
          created_at: new Date().toISOString(),
        };
      });

      await saveSpecialShiftsBatch(supabase, batchToSave);
      return batchToSave.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['staff_special_shifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      toast.success(
        bn
          ? `${count} জন কর্মীর জন্য বিশেষ ডিউটি শিফট সংরক্ষিত হয়েছে!`
          : `Special shift saved for ${count} staff members!`
      );
      // Reset form
      setSelectedStaffIds(new Set());
      setShiftNote('');
      setActiveTab('list');
    },
    onError: (err: any) => {
      toast.error(err?.message || (bn ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save special shift'));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteSpecialShift(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_special_shifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      toast.success(bn ? 'বিশেষ শিফট মুছে ফেলা হয়েছে' : 'Special shift deleted');
    },
    onError: (err: any) => {
      toast.error(err?.message || (bn ? 'মুছতে সমস্যা হয়েছে' : 'Failed to delete'));
    },
  });

  // Category label helper
  const getDeptLabel = (catKey?: string | null) => {
    if (!catKey) return bn ? 'সাধারণ' : 'General';
    if (catKey === 'teacher') return bn ? 'শিক্ষা বিভাগ' : 'Education Department';
    if (catKey === 'chef' || catKey === 'cook') return bn ? 'রান্না বিভাগ' : 'Kitchen';
    const found = categories.find((c) => c.key === catKey);
    if (found) return bn ? found.name_bn || found.name : found.name || found.name_bn;
    return catKey;
  };

  const toBnDigits = (str: string | number) => String(str).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
  const fmtDate = (dStr?: string | null) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      return bn ? toBnDigits(formatted) : formatted;
    }
    return dStr;
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border-border">
        {/* Header */}
        <div className="p-5 border-b bg-muted/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Clock className="w-5 h-5" />
              </span>
              {bn ? 'তারিখ অনুযায়ী বিশেষ ডিউটি শিফট নির্ধারণ' : 'Special Duty Shift by Date Range'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {bn
                ? 'ব্যক্তিগত প্রোফাইলে হাত না দিয়ে নির্দিষ্ট কর্মীদের জন্য নির্দিষ্ট তারিখ রেঞ্জে আলাদা ডিউটি সময় সেট করুন।'
                : 'Assign custom duty hours for selected staff for a specific date range without editing their profiles.'}
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full mt-3"
          >
            <TabsList className="grid grid-cols-2 max-w-sm">
              <TabsTrigger value="create" className="text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                {bn ? 'নতুন বিশেষ শিফট' : 'Assign Special Shift'}
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {bn ? 'নির্ধারিত শিফটসমূহ' : 'Active Schedules'}
                {specialShifts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                    {specialShifts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'create' ? (
            <div className="space-y-4">
              {/* Step 1: Staff Selection Header */}
              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      ১
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {bn ? 'স্টাফ ও ডিপার্টমেন্ট নির্বাচন করুন' : 'Select Staff & Department'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStaffIds.size > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {bn ? `${selectedStaffIds.size} জন নির্বাচিত` : `${selectedStaffIds.size} selected`}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={selectAllVisible}
                    >
                      {bn ? 'সব নির্বাচন' : 'Select All'}
                    </Button>
                    {selectedStaffIds.size > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={clearSelection}
                      >
                        {bn ? 'মুছুন' : 'Clear'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">
                      {bn ? 'ডিপার্টমেন্ট ফিল্টার' : 'Filter by Department'}
                    </Label>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder={bn ? 'ডিপার্টমেন্ট বাছাই' : 'Select Department'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{bn ? 'সকল ডিপার্টমেন্ট (All)' : 'All Departments'}</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {bn ? c.name_bn || c.name : c.name || c.name_bn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">
                      {bn ? 'স্টাফ খুঁজুন (নাম/আইডি)' : 'Search Staff (Name/ID)'}
                    </Label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        placeholder={bn ? 'নাম বা আইডি দিয়ে খুঁজুন...' : 'Search name or ID...'}
                        className="h-8 pl-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Staff List Grid with Checkboxes */}
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y bg-background/50">
                  {filteredStaff.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      {bn ? 'কোনো স্টাফ পাওয়া যায়নি' : 'No staff found'}
                    </div>
                  ) : (
                    filteredStaff.map((s) => {
                      const isChecked = selectedStaffIds.has(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStaffSelection(s.id)}
                          className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/40 transition select-none ${
                            isChecked ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleStaffSelection(s.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {getStaffDisplayNames(s.name_bn, s.name_en, bn).primary}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {s.staff_id && <span className="font-mono">ID: {s.staff_id}</span>}
                                <span>•</span>
                                <span>{getDeptLabel(s.staff_category)}</span>
                              </div>
                            </div>
                          </div>

                          {s.duty_start_time && s.duty_end_time && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 shrink-0">
                              {to12HourFormat(s.duty_start_time, bn)} - {to12HourFormat(s.duty_end_time, bn)}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 2: Duty Time & Date Range */}
              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    ২
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {bn ? 'ডিউটি সময় ও কার্যকর তারিখ নির্ধারণ করুন' : 'Set Duty Time & Effective Dates'}
                  </span>
                </div>

                {/* Duty Start & End */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">
                      {bn ? 'ডিউটি শুরু (Start Time)' : 'Duty Start Time'}
                    </Label>
                    <TimePicker value={startTime} onChange={setStartTime} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">
                      {bn ? 'ডিউটি শেষ (End Time)' : 'Duty End Time'}
                    </Label>
                    <TimePicker value={endTime} onChange={setEndTime} className="h-8 text-xs" />
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">
                      {bn ? 'কার্যকর শুরুর তারিখ' : 'Effective From Date'} <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      value={effectiveFrom}
                      onChange={(d) => setEffectiveFrom(d || '')}
                      className="h-8 text-xs w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-medium">
                        {bn ? 'কার্যকর সমাপ্তির তারিখ' : 'Effective To Date'}
                      </Label>
                      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-muted-foreground hover:text-foreground">
                        <Checkbox
                          checked={isOngoing}
                          onCheckedChange={(c) => {
                            setIsOngoing(!!c);
                            if (c) setEffectiveTo('');
                          }}
                        />
                        <span>{bn ? 'চলমান (কোনো শেষ নেই)' : 'Ongoing'}</span>
                      </label>
                    </div>
                    <DatePicker
                      value={effectiveTo}
                      onChange={(d) => setEffectiveTo(d || '')}
                      disabled={isOngoing}
                      placeholder={isOngoing ? (bn ? 'পরবর্তী পরিবর্তন পর্যন্ত চলমান' : 'Ongoing indefinitely') : ''}
                      className="h-8 text-xs w-full"
                    />
                  </div>
                </div>

                {/* Shift Note / Label */}
                <div>
                  <Label className="text-xs font-semibold mb-1 flex items-center gap-1.5 text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {bn ? 'আলাদা ডিউটি / শিফটের নাম' : 'Duty / Shift Name'}
                  </Label>
                  <Input
                    value={shiftNote}
                    onChange={(e) => setShiftNote(e.target.value)}
                    placeholder={bn ? 'যেমন: হিফজ বিভাগ বিশেষ ডিউটি, পরীক্ষা ডিউটি...' : 'e.g. Special Hifz Duty, Exam Duty...'}
                    className="h-8 text-xs bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {bn ? '💡 এই নামটি সেটিংস ও হাজিরা তালিকায় ডিপার্টমেন্টের মতো প্রদর্শিত হবে।' : '💡 This name will appear in settings and attendance just like a department.'}
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                className="w-full gap-2 font-semibold"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || selectedStaffIds.size === 0}
              >
                <Check className="w-4 h-4" />
                {saveMutation.isPending
                  ? bn
                    ? 'সংরক্ষণ করা হচ্ছে...'
                    : 'Saving...'
                  : bn
                  ? `${selectedStaffIds.size} জনের জন্য বিশেষ শিফট নিশ্চিত করুন`
                  : `Confirm Special Shift for ${selectedStaffIds.size} Staff`}
              </Button>
            </div>
          ) : (
            /* Tab 2: Existing Special Shifts List */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>{bn ? `মোট ${specialShifts.length}টি বিশেষ শিফট রেকর্ড রয়েছে` : `Total ${specialShifts.length} special shift records`}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setActiveTab('create')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {bn ? 'নতুন যোগ করুন' : 'Add New'}
                </Button>
              </div>

              {shiftsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {bn ? 'লোড হচ্ছে...' : 'Loading schedules...'}
                </div>
              ) : specialShifts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/10">
                  <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    {bn ? 'কোনো বিশেষ শিফট সক্রিয় নেই' : 'No special shifts assigned yet'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {bn
                      ? 'ডিপার্টমেন্টের সাধারণ শিফটের বাইরে কোনো কর্মীর জন্য আলাদা ডিউটি সময় দিতে "নতুন বিশেষ শিফট" ট্যাবে যান।'
                      : 'Assign custom duty hours with a date range in the "Assign Special Shift" tab.'}
                  </p>
                </div>
              ) : (
                <div className="border rounded-xl divide-y overflow-hidden bg-card">
                  {specialShifts.map((shift) => {
                    const isActiveNow = isDateInRange(todayStr, shift.effective_from, shift.effective_to);
                    const isPast = shift.effective_to && shift.effective_to < todayStr;
                    const isFuture = shift.effective_from > todayStr;

                    return (
                      <div
                        key={shift.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">
                              {getStaffDisplayNames(shift.staff_name, null, bn).primary || (bn ? 'স্টাফ সদস্য' : 'Staff Member')}
                            </span>
                            {shift.note && (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                                🌟 {shift.note}
                              </Badge>
                            )}
                            {shift.category_key && (
                              <Badge variant="outline" className="text-[10px]">
                                {getDeptLabel(shift.category_key)}
                              </Badge>
                            )}
                            {isActiveNow && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                {bn ? '🟢 চলমান' : '🟢 Active Now'}
                              </Badge>
                            )}
                            {isFuture && (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                                {bn ? '🟡 আসন্ন' : '🟡 Upcoming'}
                              </Badge>
                            )}
                            {isPast && (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                {bn ? '⚪ মেয়াদোত্তীর্ণ' : '⚪ Expired'}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1 font-semibold text-foreground">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span>{to12HourFormat(shift.duty_start_time, bn)} - {to12HourFormat(shift.duty_end_time, bn)}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                {fmtDate(shift.effective_from)} {shift.effective_to ? (bn ? `থেকে ${fmtDate(shift.effective_to)}` : `to ${fmtDate(shift.effective_to)}`) : (bn ? 'থেকে চলমান' : 'onwards')}
                              </span>
                            </div>
                            {shift.note && (
                              <>
                                <span>•</span>
                                <span className="italic text-foreground/80">{shift.note}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              const ok = await confirm({
                                title: bn ? 'বিশেষ শিফট ডিলিট করবেন?' : 'Delete Special Shift?',
                                description: bn
                                  ? `${shift.staff_name || 'এই কর্মীর'} জন্য নির্ধারিত বিশেষ ডিউটি শিফট মুছে ফেলা হবে।`
                                  : `This special shift assignment for ${shift.staff_name || 'this staff'} will be permanently removed.`,
                                variant: 'destructive',
                              });
                              if (ok) {
                                deleteMutation.mutate(shift.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffSpecialShiftDialog;
