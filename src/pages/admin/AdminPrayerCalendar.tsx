import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerCalendarSettings, PrayerCalendarConfig, HolidayRecord } from '@/hooks/usePrayerCalendarSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Pencil, Trash2, Clock, Calendar, MapPin, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const CALC_METHODS = [
  { value: 1, label: 'University of Islamic Sciences, Karachi', labelBn: 'করাচী ইউনিভার্সিটি' },
  { value: 2, label: 'ISNA (North America)', labelBn: 'ISNA (উত্তর আমেরিকা)' },
  { value: 3, label: 'MWL (Muslim World League)', labelBn: 'MWL (মুসলিম বিশ্ব লীগ)' },
  { value: 4, label: 'Umm Al-Qura, Makkah', labelBn: 'উম্মুল কুরা, মক্কা' },
  { value: 5, label: 'Egyptian General Authority', labelBn: 'মিশরীয় কর্তৃপক্ষ' },
];

const COUNTRIES = [
  { code: 'BD', en: 'Bangladesh', bn: 'বাংলাদেশ' },
  { code: 'SA', en: 'Saudi Arabia', bn: 'সৌদি আরব' },
  { code: 'IN', en: 'India', bn: 'ভারত' },
  { code: 'PK', en: 'Pakistan', bn: 'পাকিস্তান' },
  { code: 'AE', en: 'UAE', bn: 'সংযুক্ত আরব আমিরাত' },
];

const BD_DIVISIONS: Record<string, { en: string; bn: string; cities: { en: string; bn: string }[] }> = {
  dhaka: { en: 'Dhaka', bn: 'ঢাকা', cities: [{ en: 'Dhaka', bn: 'ঢাকা' }, { en: 'Gazipur', bn: 'গাজীপুর' }] },
  chittagong: { en: 'Chittagong', bn: 'চট্টগ্রাম', cities: [{ en: 'Chittagong', bn: 'চট্টগ্রাম' }, { en: 'Comilla', bn: 'কুমিল্লা' }] },
  sylhet: { en: 'Sylhet', bn: 'সিলেট', cities: [{ en: 'Sylhet', bn: 'সিলেট' }, { en: 'Moulvibazar', bn: 'মৌলভীবাজার' }] },
  rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী', cities: [{ en: 'Rajshahi', bn: 'রাজশাহী' }] },
  khulna: { en: 'Khulna', bn: 'খুলনা', cities: [{ en: 'Khulna', bn: 'খুলনা' }] },
  barishal: { en: 'Barishal', bn: 'বরিশাল', cities: [{ en: 'Barishal', bn: 'বরিশাল' }] },
  rangpur: { en: 'Rangpur', bn: 'রংপুর', cities: [{ en: 'Rangpur', bn: 'রংপুর' }] },
  mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ', cities: [{ en: 'Mymensingh', bn: 'ময়মনসিংহ' }] },
};

const HOLIDAY_TYPES = [
  { value: 'islamic', labelBn: 'ইসলামিক', labelEn: 'Islamic' },
  { value: 'government', labelBn: 'সরকারি', labelEn: 'Government' },
  { value: 'festival', labelBn: 'উৎসব', labelEn: 'Festival' },
  { value: 'other', labelBn: 'অন্যান্য', labelEn: 'Other' },
];

const TYPE_COLORS: Record<string, string> = {
  islamic: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  government: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  festival: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  other: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const AdminPrayerCalendar = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const {
    config, configLoading, updateConfig,
    holidays, holidaysLoading, addHoliday, updateHoliday, deleteHoliday,
  } = usePrayerCalendarSettings();

  const [localConfig, setLocalConfig] = useState<PrayerCalendarConfig | null>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [editHoliday, setEditHoliday] = useState<Partial<HolidayRecord> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const cfg = localConfig || config;

  const handleSaveConfig = async () => {
    try {
      await updateConfig.mutateAsync(cfg);
      setLocalConfig(null);
      toast.success(bn ? 'সেটিংস সংরক্ষিত হয়েছে' : 'Settings saved');
    } catch {
      toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Save failed');
    }
  };

  const updateCfg = (updates: Partial<PrayerCalendarConfig>) => {
    setLocalConfig({ ...cfg, ...updates });
  };

  const handleSaveHoliday = async () => {
    if (!editHoliday?.name_bn || !editHoliday?.name_en || !editHoliday?.date) {
      toast.error(bn ? 'সব ফিল্ড পূরণ করুন' : 'Fill all fields');
      return;
    }
    try {
      if (editHoliday.id) {
        await updateHoliday.mutateAsync(editHoliday as HolidayRecord);
      } else {
        await addHoliday.mutateAsync({
          year: editHoliday.year || filterYear,
          date: editHoliday.date,
          name_bn: editHoliday.name_bn,
          name_en: editHoliday.name_en,
          type: editHoliday.type || 'islamic',
          approximate: editHoliday.approximate || false,
          is_active: editHoliday.is_active !== false,
          sort_order: editHoliday.sort_order || 0,
        });
      }
      setDialogOpen(false);
      setEditHoliday(null);
      toast.success(bn ? 'ছুটি সংরক্ষিত' : 'Holiday saved');
    } catch {
      toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error occurred');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm(bn ? 'মুছে ফেলতে চান?' : 'Delete this holiday?')) return;
    try {
      await deleteHoliday.mutateAsync(id);
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    } catch {
      toast.error(bn ? 'ত্রুটি' : 'Error');
    }
  };

  const filteredHolidays = holidays.filter(h => h.year === filterYear);
  const years = [...new Set(holidays.map(h => h.year))].sort();
  if (!years.includes(filterYear)) years.push(filterYear);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-display font-bold text-foreground">
          {bn ? '🕌 নামাজ ও ক্যালেন্ডার সেটিংস' : '🕌 Prayer & Calendar Settings'}
        </h1>

        <Tabs defaultValue="settings">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              {bn ? 'সেটিংস' : 'Settings'}
            </TabsTrigger>
            <TabsTrigger value="holidays" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {bn ? 'ছুটির তালিকা' : 'Holidays'}
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Location */}
            <div className="card-elevated p-5">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {bn ? 'ডিফল্ট লোকেশন' : 'Default Location'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>{bn ? 'দেশ' : 'Country'}</Label>
                  <Select value={cfg.default_country} onValueChange={v => updateCfg({ default_country: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{bn ? c.bn : c.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cfg.default_country === 'BD' && (
                  <>
                    <div>
                      <Label>{bn ? 'বিভাগ' : 'Division'}</Label>
                      <Select value={cfg.default_division} onValueChange={v => {
                        updateCfg({ default_division: v, default_city: BD_DIVISIONS[v]?.cities[0]?.en || '' });
                      }}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(BD_DIVISIONS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{bn ? v.bn : v.en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{bn ? 'জেলা' : 'City'}</Label>
                      <Select value={cfg.default_city} onValueChange={v => updateCfg({ default_city: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BD_DIVISIONS[cfg.default_division]?.cities.map(c => (
                            <SelectItem key={c.en} value={c.en}>{bn ? c.bn : c.en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Calculation Method */}
            <div className="card-elevated p-5">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {bn ? 'গণনা পদ্ধতি ও ফরম্যাট' : 'Calculation Method & Format'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'নামাজের সময় গণনা পদ্ধতি' : 'Prayer Calculation Method'}</Label>
                  <Select value={String(cfg.calculation_method)} onValueChange={v => updateCfg({ calculation_method: parseInt(v) })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CALC_METHODS.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{bn ? m.labelBn : m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'টাইম ফরম্যাট' : 'Time Format'}</Label>
                  <Select value={cfg.time_format} onValueChange={(v: '12h' | '24h') => updateCfg({ time_format: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 Hour</SelectItem>
                      <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Hijri Offset */}
            <div className="card-elevated p-5">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {bn ? 'হিজরি তারিখ অফসেট' : 'Hijri Date Offset'}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {bn ? 'চাঁদ দেখার ভিত্তিতে হিজরি তারিখ সমন্বয় করুন। -1 মানে ১ দিন পিছিয়ে, +1 মানে ১ দিন এগিয়ে।' 
                     : 'Adjust hijri date based on moon sighting. -1 means 1 day behind, +1 means 1 day ahead.'}
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  className="w-24 bg-background"
                  value={cfg.hijri_offset}
                  onChange={e => updateCfg({ hijri_offset: parseInt(e.target.value) || 0 })}
                  min={-3}
                  max={3}
                />
                <span className="text-sm text-muted-foreground">
                  {bn ? 'দিন' : 'days'}
                </span>
              </div>
            </div>

            {/* Visibility */}
            <div className="card-elevated p-5">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                {bn ? 'দৃশ্যমানতা নিয়ন্ত্রণ' : 'Visibility Controls'}
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'show_prayer_times' as const, bn: 'নামাজের সময়সূচী দেখান', en: 'Show Prayer Times' },
                  { key: 'show_calendar' as const, bn: 'ক্যালেন্ডার দেখান', en: 'Show Calendar' },
                  { key: 'show_bangla_date' as const, bn: 'বাংলা তারিখ দেখান', en: 'Show Bangla Date' },
                  { key: 'show_hijri_date' as const, bn: 'হিজরি তারিখ দেখান', en: 'Show Hijri Date' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{bn ? item.bn : item.en}</span>
                    <Switch checked={cfg[item.key]} onCheckedChange={v => updateCfg({ [item.key]: v })} />
                  </div>
                ))}
              </div>
            </div>

            <Button className="btn-primary-gradient w-full" onClick={handleSaveConfig} disabled={updateConfig.isPending}>
              <Save className="w-4 h-4 mr-2" /> {bn ? 'সেটিংস সংরক্ষণ করুন' : 'Save Settings'}
            </Button>
          </TabsContent>

          {/* Holidays Tab */}
          <TabsContent value="holidays" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label>{bn ? 'বছর' : 'Year'}</Label>
                <Select value={String(filterYear)} onValueChange={v => setFilterYear(parseInt(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditHoliday({ year: filterYear, type: 'islamic', approximate: false, is_active: true, sort_order: 0 })}>
                    <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন ছুটি' : 'Add Holiday'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editHoliday?.id ? (bn ? 'ছুটি সম্পাদনা' : 'Edit Holiday') : (bn ? 'নতুন ছুটি যোগ' : 'Add Holiday')}</DialogTitle>
                  </DialogHeader>
                  {editHoliday && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>{bn ? 'বছর' : 'Year'}</Label>
                          <Input type="number" value={editHoliday.year || filterYear} onChange={e => setEditHoliday({ ...editHoliday, year: parseInt(e.target.value) })} className="mt-1" />
                        </div>
                        <div>
                          <Label>{bn ? 'তারিখ (MM-DD)' : 'Date (MM-DD)'}</Label>
                          <Input placeholder="03-19" value={editHoliday.date || ''} onChange={e => setEditHoliday({ ...editHoliday, date: e.target.value })} className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label>{bn ? 'বাংলা নাম' : 'Name (Bangla)'}</Label>
                        <Input value={editHoliday.name_bn || ''} onChange={e => setEditHoliday({ ...editHoliday, name_bn: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label>{bn ? 'ইংরেজি নাম' : 'Name (English)'}</Label>
                        <Input value={editHoliday.name_en || ''} onChange={e => setEditHoliday({ ...editHoliday, name_en: e.target.value })} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>{bn ? 'ধরন' : 'Type'}</Label>
                          <Select value={editHoliday.type || 'islamic'} onValueChange={v => setEditHoliday({ ...editHoliday, type: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HOLIDAY_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{bn ? t.labelBn : t.labelEn}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-3 pb-1">
                          <div className="flex items-center gap-2">
                            <Switch checked={editHoliday.approximate || false} onCheckedChange={v => setEditHoliday({ ...editHoliday, approximate: v })} />
                            <Label className="text-xs">{bn ? 'সম্ভাব্য' : 'Approx'}</Label>
                          </div>
                        </div>
                      </div>
                      <Button className="w-full btn-primary-gradient" onClick={handleSaveHoliday}>
                        <Save className="w-4 h-4 mr-2" /> {bn ? 'সংরক্ষণ' : 'Save'}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Holiday List */}
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">{bn ? 'তারিখ' : 'Date'}</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">{bn ? 'নাম' : 'Name'}</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">{bn ? 'ধরন' : 'Type'}</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">{bn ? 'কার্যক্রম' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHolidays.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো ছুটি নেই' : 'No holidays'}</td></tr>
                    ) : filteredHolidays.map(h => (
                      <tr key={h.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{h.date}</td>
                        <td className="p-3">
                          <div className="text-foreground font-medium">{bn ? h.name_bn : h.name_en}</div>
                          <div className="text-xs text-muted-foreground">{bn ? h.name_en : h.name_bn}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${TYPE_COLORS[h.type] || ''}`}>
                            {HOLIDAY_TYPES.find(t => t.value === h.type)?.[bn ? 'labelBn' : 'labelEn'] || h.type}
                          </Badge>
                          {h.approximate && <span className="ml-1 text-[10px] text-muted-foreground">~</span>}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditHoliday(h); setDialogOpen(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteHoliday(h.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {bn ? `মোট ${filteredHolidays.length}টি ছুটি (${filterYear})` : `Total ${filteredHolidays.length} holidays (${filterYear})`}
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPrayerCalendar;
