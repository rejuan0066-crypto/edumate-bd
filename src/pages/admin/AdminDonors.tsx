import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Loader2, CheckCircle, Clock, Printer, Trash2, Banknote, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const AdminDonors = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { checkApproval } = useApprovalCheck('/admin/donors', 'donors');
  const { canAddItem, canEditItem } = usePagePermissions('/admin/donors');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [form, setForm] = useState({
    donorName: '',
    donorPhone: '',
    donorAddress: '',
    donationAmount: '',
    donationType: '',
    purpose: '',
    donationDate: '',
    transactionId: '',
    paymentGateway: '',
  });
  const [showList, setShowList] = useState(false);
  const [listType, setListType] = useState<'active' | 'all'>('active');

  const updateField = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  const { data: donations = [] } = useQuery({
    queryKey: ['donors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('donors').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!form.donorName || !form.donationAmount) throw new Error(bn ? 'দাতার নাম ও পরিমাণ আবশ্যক' : 'Donor name and amount required');
      if (paymentMethod === 'online' && !form.transactionId) throw new Error(bn ? 'ট্রানজেকশন আইডি আবশ্যক' : 'Transaction ID required');

      const payload = {
        name_bn: form.donorName,
        phone: form.donorPhone || null,
        address: form.donorAddress || null,
        donation_amount: parseFloat(form.donationAmount),
        donation_type: form.donationType || 'one-time',
        purpose: form.purpose || null,
        donation_date: form.donationDate || new Date().toISOString().split('T')[0],
        status: 'active',
        notes: paymentMethod === 'online' ? `TrxID: ${form.transactionId}${form.paymentGateway ? ` | Gateway: ${form.paymentGateway}` : ''}` : `পদ্ধতি: ক্যাশ`,
      };

      if (await checkApproval('add', payload, undefined, `দান: ৳${form.donationAmount}`)) return;

      const { error } = await supabase.from('donors').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      setForm({ donorName: '', donorPhone: '', donorAddress: '', donationAmount: '', donationType: '', purpose: '', donationDate: '', transactionId: '', paymentGateway: '' });
      toast.success(bn ? 'দান রেকর্ড সফল' : 'Donation recorded');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('donors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeDonations = donations.filter((d: any) => d.status === 'active');
  const totalAmount = activeDonations.reduce((sum: number, d: any) => sum + (d.donation_amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          {bn ? 'দান ব্যবস্থাপনা' : 'Donation Management'}
        </h1>

        {/* Payment Method Toggle */}
        <div className="flex gap-3">
          <button onClick={() => setPaymentMethod('cash')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${paymentMethod === 'cash' ? 'bg-success/10 border-success text-success' : 'bg-background border-border text-muted-foreground hover:border-success/50'}`}>
            <Banknote className="w-5 h-5" />
            {bn ? 'ক্যাশ পেমেন্ট' : 'Cash Payment'}
          </button>
          <button onClick={() => setPaymentMethod('online')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${paymentMethod === 'online' ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}>
            <Globe className="w-5 h-5" />
            {bn ? 'অনলাইন পেমেন্ট' : 'Online Payment'}
          </button>
        </div>

        {/* Payment Form */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            {bn ? 'দান রেকর্ড করুন' : 'Record Donation'}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${paymentMethod === 'cash' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
              {paymentMethod === 'cash' ? (bn ? 'ক্যাশ' : 'Cash') : (bn ? 'অনলাইন' : 'Online')}
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">{bn ? 'দাতার নাম' : 'Donor Name'} *</Label>
              <Input className="bg-background mt-1" value={form.donorName} onChange={(e) => updateField('donorName', e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">{bn ? 'মোবাইল' : 'Phone'}</Label>
              <Input className="bg-background mt-1" value={form.donorPhone} onChange={(e) => updateField('donorPhone', e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">{bn ? 'ঠিকানা' : 'Address'}</Label>
              <Input className="bg-background mt-1" value={form.donorAddress} onChange={(e) => updateField('donorAddress', e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">{bn ? 'দানের ধরন' : 'Donation Type'}</Label>
              <Select value={form.donationType} onValueChange={(v) => updateField('donationType', v)}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="নগদ">{bn ? 'নগদ' : 'Cash'}</SelectItem>
                  <SelectItem value="চেক">{bn ? 'চেক' : 'Cheque'}</SelectItem>
                  <SelectItem value="অনলাইন">{bn ? 'অনলাইন' : 'Online'}</SelectItem>
                  <SelectItem value="বস্তু/সামগ্রী">{bn ? 'বস্তু/সামগ্রী' : 'In-Kind'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">{bn ? 'উদ্দেশ্য / বাবদ' : 'Purpose'}</Label>
              <Input className="bg-background mt-1" value={form.purpose} onChange={(e) => updateField('purpose', e.target.value)} placeholder={bn ? 'মসজিদ নির্মাণ...' : 'Building fund...'} />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">{bn ? 'তারিখ' : 'Date'}</Label>
              <Input type="date" className="bg-background mt-1" value={form.donationDate} onChange={(e) => updateField('donationDate', e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">{bn ? 'টাকার পরিমাণ' : 'Amount'} *</Label>
              <Input type="number" className="bg-background mt-1" value={form.donationAmount} onChange={(e) => updateField('donationAmount', e.target.value)} placeholder="৳" />
            </div>
            {paymentMethod === 'online' && (
              <>
                <div>
                  <Label className="text-sm font-medium text-foreground">{bn ? 'ট্রানজেকশন আইডি' : 'Transaction ID'} *</Label>
                  <Input className="bg-background mt-1" value={form.transactionId} onChange={(e) => updateField('transactionId', e.target.value)} placeholder="TrxID" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">{bn ? 'গেটওয়ে / মাধ্যম' : 'Gateway'}</Label>
                  <Select value={form.paymentGateway} onValueChange={(v) => updateField('paymentGateway', v)}>
                    <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bKash">bKash</SelectItem>
                      <SelectItem value="Nagad">Nagad</SelectItem>
                      <SelectItem value="Rocket">Rocket</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="Other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <Button onClick={() => payMutation.mutate()} className="btn-primary-gradient mt-4" disabled={payMutation.isPending}>
            {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {paymentMethod === 'cash' ? (bn ? 'ক্যাশ রেকর্ড করুন' : 'Record Cash') : (bn ? 'অনলাইন রেকর্ড করুন' : 'Record Online')}
          </Button>
        </div>

        {/* Donation List */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h3 className="font-display font-bold text-foreground">{bn ? 'দান তালিকা' : 'Donation List'}</h3>
            <button onClick={() => { setListType('active'); setShowList(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'active' && showList ? 'bg-success text-success-foreground' : 'bg-success/10 text-success'}`}>
              <CheckCircle className="w-3 h-3 inline mr-1" /> {bn ? 'সক্রিয়' : 'Active'} ({activeDonations.length})
            </button>
            <button onClick={() => { setListType('all'); setShowList(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'all' && showList ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
              <Clock className="w-3 h-3 inline mr-1" /> {bn ? 'সকল' : 'All'} ({donations.length})
            </button>
            {showList && (
              <>
                <span className="text-sm font-bold text-foreground ml-auto">
                  {bn ? 'মোট:' : 'Total:'} ৳{totalAmount.toLocaleString()}
                </span>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1" /> {bn ? 'প্রিন্ট' : 'Print'}
                </Button>
              </>
            )}
          </div>

          {showList && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'দাতার নাম' : 'Donor'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'মোবাইল' : 'Phone'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'ধরন' : 'Type'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'উদ্দেশ্য' : 'Purpose'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'পরিমাণ' : 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'তারিখ' : 'Date'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(listType === 'active' ? activeDonations : donations).map((d: any) => (
                    <tr key={d.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">{d.name_bn || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.phone || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.donation_type || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.purpose || '-'}</td>
                      <td className="px-4 py-3 font-bold text-foreground">৳ {d.donation_amount || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.donation_date || '-'}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(d.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(listType === 'active' ? activeDonations : donations).length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো রেকর্ড নেই' : 'No records'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDonors;
