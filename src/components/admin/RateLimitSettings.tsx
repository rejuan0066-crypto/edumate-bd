import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Save, Shield, Plus, Trash2, Search, Power } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface RateLimitRow {
  id: string;
  action: string;
  max_requests: number;
  window_seconds: number;
  enabled: boolean;
  description: string | null;
  label_bn: string | null;
  label_en: string | null;
  category: string;
  scope: string;
  is_user_managed: boolean;
}

const CATEGORY_LABELS: Record<string, { bn: string; en: string; color: string }> = {
  otp: { bn: 'OTP', en: 'OTP', color: 'bg-blue-100 text-blue-700' },
  user_management: { bn: 'ইউজার ব্যবস্থাপনা', en: 'User Management', color: 'bg-purple-100 text-purple-700' },
  donation: { bn: 'অনুদান', en: 'Donation', color: 'bg-pink-100 text-pink-700' },
  admin_ops: { bn: 'অ্যাডমিন কাজ', en: 'Admin Ops', color: 'bg-indigo-100 text-indigo-700' },
  test_email: { bn: 'টেস্ট ইমেইল', en: 'Test Email', color: 'bg-emerald-100 text-emerald-700' },
  receipt: { bn: 'রসিদ', en: 'Receipt', color: 'bg-amber-100 text-amber-700' },
  payment: { bn: 'পেমেন্ট', en: 'Payment', color: 'bg-rose-100 text-rose-700' },
  custom: { bn: 'কাস্টম', en: 'Custom', color: 'bg-slate-100 text-slate-700' },
  general: { bn: 'সাধারণ', en: 'General', color: 'bg-gray-100 text-gray-700' },
};

const SCOPE_LABELS: Record<string, { bn: string; en: string }> = {
  user: { bn: 'ইউজার', en: 'User' },
  admin: { bn: 'অ্যাডমিন', en: 'Admin' },
  ip: { bn: 'IP', en: 'IP' },
  email: { bn: 'ইমেইল', en: 'Email' },
  phone: { bn: 'ফোন', en: 'Phone' },
};

export default function RateLimitSettings() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [rows, setRows] = useState<RateLimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<RateLimitRow | null>(null);

  // Add-form state
  const [form, setForm] = useState({
    action: '',
    label_bn: '',
    label_en: '',
    description: '',
    max_requests: 10,
    window_seconds: 60,
    category: 'custom',
    scope: 'user',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rate_limit_config')
      .select('*')
      .order('category')
      .order('action');
    if (error) toast.error(bn ? 'লোড করতে ব্যর্থ' : 'Failed to load');
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<RateLimitRow>) => {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const save = async (row: RateLimitRow) => {
    if (row.max_requests < 1 || row.window_seconds < 1) {
      toast.error(bn ? 'সঠিক মান দিন' : 'Invalid values');
      return;
    }
    setSaving(row.id);
    const { error } = await supabase
      .from('rate_limit_config')
      .update({
        max_requests: row.max_requests,
        window_seconds: row.window_seconds,
        enabled: row.enabled,
      })
      .eq('id', row.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success(bn ? '✅ সংরক্ষিত' : '✅ Saved');
  };

  const createCustom = async () => {
    if (!form.action.trim() || !/^[a-z0-9_]+$/.test(form.action.trim())) {
      toast.error(bn ? 'Action key অবশ্যই lowercase letters, digits, underscore হতে হবে' : 'Action key must be lowercase a–z, 0–9, _');
      return;
    }
    if (form.max_requests < 1 || form.window_seconds < 1) {
      toast.error(bn ? 'সঠিক মান দিন' : 'Invalid values');
      return;
    }
    const { error } = await supabase.from('rate_limit_config').insert({
      action: form.action.trim(),
      max_requests: form.max_requests,
      window_seconds: form.window_seconds,
      enabled: true,
      description: form.description || null,
      label_bn: form.label_bn || null,
      label_en: form.label_en || null,
      category: form.category,
      scope: form.scope,
      is_user_managed: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bn ? '✅ নতুন rate-limit key তৈরি হয়েছে' : '✅ New rate-limit key added');
    setAddOpen(false);
    setForm({ action: '', label_bn: '', label_en: '', description: '', max_requests: 10, window_seconds: 60, category: 'custom', scope: 'user' });
    load();
  };

  const performDelete = async () => {
    if (!deleteRow) return;
    const { error } = await supabase.from('rate_limit_config').delete().eq('id', deleteRow.id);
    if (error) toast.error(error.message);
    else {
      toast.success(bn ? '🗑️ মুছে ফেলা হয়েছে' : '🗑️ Deleted');
      load();
    }
    setDeleteRow(null);
  };

  const toggleAll = async (enabled: boolean) => {
    const ids = filtered.map(r => r.id);
    if (!ids.length) return;
    const { error } = await supabase.from('rate_limit_config').update({ enabled }).in('id', ids);
    if (error) toast.error(error.message);
    else {
      toast.success(bn ? `${ids.length}টি ${enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে` : `${ids.length} ${enabled ? 'enabled' : 'disabled'}`);
      load();
    }
  };

  const categories = useMemo(() => {
    const set = new Set(rows.map(r => r.category));
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (!q) return true;
      return (
        r.action.toLowerCase().includes(q) ||
        (r.label_bn || '').toLowerCase().includes(q) ||
        (r.label_en || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterCategory]);

  const grouped = useMemo(() => {
    const g: Record<string, RateLimitRow[]> = {};
    for (const r of filtered) {
      const k = r.category || 'general';
      (g[k] ||= []).push(r);
    }
    return g;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <Card className="rounded-[28px] p-6 bg-white/70 backdrop-blur-xl border-emerald-100/60">
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold">
            {bn ? 'রেট লিমিট কনফিগারেশন' : 'Rate Limit Configuration'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggleAll(true)}>
            <Power className="w-3.5 h-3.5 mr-1 text-emerald-600" /> {bn ? 'সব সক্রিয়' : 'Enable all'}
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggleAll(false)}>
            <Power className="w-3.5 h-3.5 mr-1 text-rose-500" /> {bn ? 'সব নিষ্ক্রিয়' : 'Disable all'}
          </Button>
          <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন কী' : 'Add key'}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {bn
          ? 'ব্রুট-ফোর্স ও স্প্যাম প্রতিরোধে প্রতিটি action-এর জন্য নির্দিষ্ট সময়ে সর্বোচ্চ অনুরোধ সংখ্যা নির্ধারণ করুন। (super_admin বাইপাস করতে পারেন)'
          : 'Limit max requests per window for each action to prevent brute-force and spam. (super_admin bypasses)'}
      </p>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={bn ? 'খুঁজুন (action, label, description)...' : 'Search action / label / description...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-full bg-white/70"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px] h-10 rounded-full bg-white/70">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>
                {c === 'all' ? (bn ? 'সব ক্যাটাগরি' : 'All categories') : (bn ? CATEGORY_LABELS[c]?.bn || c : CATEGORY_LABELS[c]?.en || c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {filtered.length} / {rows.length}
        </div>
      </div>

      {/* Grouped list */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, list]) => {
          const meta = CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${meta.color} hover:${meta.color} rounded-full px-3`}>
                  {bn ? meta.bn : meta.en}
                </Badge>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </div>
              <div className="space-y-3">
                {list.map(row => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-[20px] bg-white/60 border border-emerald-100/50 hover:-translate-y-[3px] transition-transform"
                  >
                    <div className="md:col-span-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium">
                          {bn ? (row.label_bn || row.action) : (row.label_en || row.action)}
                        </div>
                        <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0">
                          {bn ? SCOPE_LABELS[row.scope]?.bn || row.scope : SCOPE_LABELS[row.scope]?.en || row.scope}
                        </Badge>
                        {row.is_user_managed && (
                          <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0">{bn ? 'কাস্টম' : 'Custom'}</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{row.action}</div>
                      {row.description && (
                        <div className="text-xs text-muted-foreground mt-1">{row.description}</div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">{bn ? 'সর্বোচ্চ অনুরোধ' : 'Max Requests'}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={row.max_requests || ''}
                        onChange={e => update(row.id, { max_requests: parseInt(e.target.value) || 1 })}
                        className="h-9"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">{bn ? 'উইন্ডো (সেকেন্ড)' : 'Window (sec)'}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={row.window_seconds || ''}
                        onChange={e => update(row.id, { window_seconds: parseInt(e.target.value) || 1 })}
                        className="h-9"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 pb-1">
                      <Switch checked={row.enabled} onCheckedChange={v => update(row.id, { enabled: v })} />
                      <span className="text-xs">{row.enabled ? (bn ? 'সক্রিয়' : 'Enabled') : (bn ? 'নিষ্ক্রিয়' : 'Disabled')}</span>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => save(row)}
                        disabled={saving === row.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {saving === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />{bn ? 'সংরক্ষণ' : 'Save'}</>}
                      </Button>
                      {row.is_user_managed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => setDeleteRow(row)}
                          title={bn ? 'মুছুন' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {bn ? 'কোনো ফলাফল নেই' : 'No matching keys'}
          </div>
        )}
      </div>

      {/* Add custom key dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-[38px] max-w-2xl bg-white/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Plus className="w-5 h-5" /> {bn ? 'নতুন রেট-লিমিট কী' : 'New Rate-Limit Key'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="md:col-span-2">
              <Label className="text-xs">Action key (lowercase, snake_case)</Label>
              <Input
                value={form.action}
                onChange={e => setForm({ ...form, action: e.target.value.toLowerCase() })}
                placeholder="e.g. custom_export_attempt"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {bn ? 'এই key দিয়েই edge function থেকে check_rate_limit RPC কল করুন।' : 'Use this key when calling check_rate_limit RPC from your edge function.'}
              </p>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'বাংলা লেবেল' : 'Bengali label'}</Label>
              <Input value={form.label_bn} onChange={e => setForm({ ...form, label_bn: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ইংরেজি লেবেল' : 'English label'}</Label>
              <Input value={form.label_en} onChange={e => setForm({ ...form, label_en: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'সর্বোচ্চ অনুরোধ' : 'Max Requests'}</Label>
              <Input type="number" min={1} value={form.max_requests || ''} onChange={e => setForm({ ...form, max_requests: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'উইন্ডো (সেকেন্ড)' : 'Window (sec)'}</Label>
              <Input type="number" min={1} value={form.window_seconds || ''} onChange={e => setForm({ ...form, window_seconds: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORY_LABELS).map(c => (
                    <SelectItem key={c} value={c}>{bn ? CATEGORY_LABELS[c].bn : CATEGORY_LABELS[c].en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'স্কোপ' : 'Scope'}</Label>
              <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{bn ? v.bn : v.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">{bn ? 'বিবরণ' : 'Description'}</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={createCustom} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> {bn ? 'তৈরি করুন' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteRow} onOpenChange={o => !o && setDeleteRow(null)}>
        <AlertDialogContent className="rounded-[38px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{bn ? 'কাস্টম রেট-লিমিট মুছবেন?' : 'Delete custom rate-limit?'}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{deleteRow?.action}</span> — {bn ? 'এটি স্থায়ীভাবে মুছে যাবে।' : 'This will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              <Trash2 className="w-4 h-4 mr-1" /> {bn ? 'মুছুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
