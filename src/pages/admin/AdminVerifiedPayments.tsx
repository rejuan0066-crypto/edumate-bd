import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2, Trash2, Plus, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const toEn = (s: string) => s.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());

const AdminVerifiedPayments = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  const [form, setForm] = useState({ trx_id: '', amount: '', method: 'bkash', sender_number: '', note: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unconsumed' | 'consumed'>('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['verified-payments', filter],
    queryFn: async () => {
      let q = (supabase as any).from('verified_payments').select('*').order('created_at', { ascending: false });
      if (filter === 'unconsumed') q = q.is('consumed_at', null);
      if (filter === 'consumed') q = q.not('consumed_at', 'is', null);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const trx = form.trx_id.trim();
      const amt = parseFloat(toEn(form.amount));
      if (!trx) throw new Error(bn ? 'TrxID আবশ্যক' : 'TrxID required');
      if (!amt || amt <= 0) throw new Error(bn ? 'বৈধ পরিমাণ দিন' : 'Valid amount required');
      const { error } = await (supabase as any).from('verified_payments').insert({
        trx_id: trx,
        amount: amt,
        method: form.method,
        sender_number: form.sender_number.trim() || null,
        note: form.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'যোগ করা হয়েছে' : 'Added');
      setForm({ trx_id: '', amount: '', method: 'bkash', sender_number: '', note: '' });
      qc.invalidateQueries({ queryKey: ['verified-payments'] });
    },
    onError: (e: any) => toast.error(e.message?.includes('duplicate') ? (bn ? 'এই TrxID আগে থেকেই আছে' : 'TrxID already exists') : e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('verified_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['verified-payments'] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'ভেরিফায়েড পেমেন্ট তালিকা' : 'Verified Payments'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {bn
                ? 'এখানে আগে থেকে এন্ট্রি করা TrxID ও পরিমাণের সাথে মিলে গেলে দাতার ম্যানুয়াল ট্রানজেকশন স্বয়ংক্রিয়ভাবে যাচাই হয়ে যাবে।'
                : 'Donor manual transactions auto-verify when their TrxID + amount match an entry here.'}
            </p>
          </div>
        </div>

        {/* Add form */}
        <div className="card-elevated p-5">
          <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            {bn ? 'নতুন TrxID যোগ করুন' : 'Add new TrxID'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">TrxID *</Label>
              <Input className="mt-1" value={form.trx_id} onChange={(e) => setForm((p) => ({ ...p, trx_id: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'পরিমাণ (৳)' : 'Amount (৳)'} *</Label>
              <Input className="mt-1" inputMode="decimal" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: toEn(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'মাধ্যম' : 'Method'}</Label>
              <Select value={form.method} onValueChange={(v) => setForm((p) => ({ ...p, method: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="upay">Upay</SelectItem>
                  <SelectItem value="bank">{bn ? 'ব্যাংক' : 'Bank'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'প্রেরকের নম্বর' : 'Sender No.'}</Label>
              <Input className="mt-1" value={form.sender_number} onChange={(e) => setForm((p) => ({ ...p, sender_number: toEn(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'নোট' : 'Note'}</Label>
              <Input className="mt-1" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
            </div>
          </div>
          <Button className="btn-primary-gradient mt-4" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
            {addMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {bn ? 'যোগ করুন' : 'Add'}
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'unconsumed', 'consumed'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border'
              }`}
            >
              {k === 'all' ? (bn ? 'সব' : 'All') : k === 'unconsumed' ? (bn ? 'অব্যবহৃত' : 'Unused') : (bn ? 'ব্যবহৃত' : 'Consumed')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card-elevated p-2 overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 mx-auto animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{bn ? 'কোনো ডেটা নেই' : 'No data'}</div>
          ) : (
            <table className="w-full text-sm border-separate border-spacing-y-1">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2">TrxID</th>
                  <th className="text-right px-3 py-2">{bn ? 'পরিমাণ' : 'Amount'}</th>
                  <th className="text-left px-3 py-2">{bn ? 'মাধ্যম' : 'Method'}</th>
                  <th className="text-left px-3 py-2">{bn ? 'প্রেরক' : 'Sender'}</th>
                  <th className="text-left px-3 py-2">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="bg-background hover:-translate-y-[3px] transition-transform [&>td]:py-3 [&>td:first-child]:rounded-l-[20px] [&>td:last-child]:rounded-r-[20px]">
                    <td className="px-3 font-mono font-semibold">{r.trx_id}</td>
                    <td className="px-3 text-right font-bold">৳ {Number(r.amount).toLocaleString()}</td>
                    <td className="px-3 capitalize">{r.method}</td>
                    <td className="px-3 font-mono text-xs">{r.sender_number || '—'}</td>
                    <td className="px-3">
                      {r.consumed_at ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> {bn ? 'ব্যবহৃত' : 'Consumed'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" /> {bn ? 'অব্যবহৃত' : 'Unused'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          onConfirm={() => deleteId && delMut.mutate(deleteId)}
          title={bn ? 'মুছবেন?' : 'Delete?'}
          description={bn ? 'এই এন্ট্রি মুছে ফেলা হবে।' : 'This entry will be removed.'}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminVerifiedPayments;
