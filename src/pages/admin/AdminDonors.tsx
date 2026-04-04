import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildDonationReceiptHtml, DonationReceiptData, ReceiptStyleConfig } from '@/components/fees/receiptPrintLayouts';
import { downloadReceiptAsPdf } from '@/lib/receiptPdfDownload';
import { Heart, Eye, Download, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_STYLE: ReceiptStyleConfig = {
  primaryColor: '#1a5c2e',
  fontSize: 100,
  receiptTitle: 'দানের রশিদ',
  showWatermark: true,
  showQr: true,
  showTrxId: true,
  showTimestamp: true,
};

const AdminDonors = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings } = useReceiptSettings();

  const { data: institution } = useQuery({
    queryKey: ['institution_donation'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  const [pdfLoading, setPdfLoading] = useState(false);
  const [form, setForm] = useState({
    donorName: '',
    donorPhone: '',
    donorAddress: '',
    donationAmount: '',
    donationType: '',
    purpose: '',
    receiptSerial: '',
    date: '',
    paymentMethod: '',
  });

  const updateField = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  const getStyle = (): ReceiptStyleConfig => {
    const defaultSetting = settings?.find((s: any) => s.is_default);
    if (defaultSetting) {
      const dc = defaultSetting.design_config as any;
      if (dc?.primaryColor) return { ...dc, receiptTitle: 'দানের রশিদ' } as ReceiptStyleConfig;
    }
    return DEFAULT_STYLE;
  };

  const getReceiptData = (): DonationReceiptData => ({
    ...form,
    transactionId: '',
    gatewayTrxId: '',
    paymentTimestamp: '',
    collectorName: '',
    approverName: '',
    institutionName: institution?.name || 'মডেল মাদরাসা',
    institutionNameEn: institution?.name_en || 'MODEL MADRASA',
    institutionAddress: institution?.address || 'ঢাকা, বাংলাদেশ',
    institutionPhone: institution?.phone || '',
    institutionEmail: institution?.email || '',
    institutionOtherInfo: institution?.other_info || '',
    logoUrl: institution?.logo_url || '',
    bn: true,
  });

  const getPreviewHtml = () => buildDonationReceiptHtml(getReceiptData(), getStyle());

  const handlePreview = () => {
    const html = getPreviewHtml();
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadReceiptAsPdf(getPreviewHtml(), `donation-receipt-${Date.now()}.pdf`);
      toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (e: any) {
      toast.error(e.message || 'PDF error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ donorName: '', donorPhone: '', donorAddress: '', donationAmount: '', donationType: '', purpose: '', receiptSerial: '', date: '', paymentMethod: '' });
    toast.info(bn ? 'ফর্ম রিসেট হয়েছে' : 'Form reset');
  };

  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(getPreviewHtml().replace(/<script>.*?<\/script>/gs, ''))}`;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">
            {bn ? 'দানের রশিদ' : 'Donation Receipt'}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {bn ? 'দাতার তথ্য পূরণ করুন এবং রশিদ প্রিভিউ বা ডাউনলোড করুন।' : 'Fill donor info and preview or download the receipt.'}
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-1" />{bn ? 'রিসেট' : 'Reset'}</Button>
          <Button variant="outline" size="sm" onClick={handlePreview}><Eye className="w-4 h-4 mr-1" />{bn ? 'প্রিভিউ' : 'Preview'}</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
            PDF
          </Button>
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 'calc(100vh - 300px)' }}>
          {/* Form Panel */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3 card-elevated p-4 rounded-lg">
            <h3 className="font-display font-semibold text-sm text-foreground">{bn ? 'দাতার তথ্য' : 'Donor Information'}</h3>

            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'ক্রমিক নং' : 'Serial No'}</Label>
              <Input className="h-8 text-sm" value={form.receiptSerial} onChange={(e) => updateField('receiptSerial', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'তারিখ' : 'Date'}</Label>
              <Input className="h-8 text-sm" type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'দাতার নাম' : 'Donor Name'}</Label>
              <Input className="h-8 text-sm" value={form.donorName} onChange={(e) => updateField('donorName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'মোবাইল' : 'Phone'}</Label>
              <Input className="h-8 text-sm" value={form.donorPhone} onChange={(e) => updateField('donorPhone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'ঠিকানা' : 'Address'}</Label>
              <Input className="h-8 text-sm" value={form.donorAddress} onChange={(e) => updateField('donorAddress', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'দানের ধরন' : 'Donation Type'}</Label>
              <Select value={form.donationType} onValueChange={(v) => updateField('donationType', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="নগদ">{bn ? 'নগদ' : 'Cash'}</SelectItem>
                  <SelectItem value="চেক">{bn ? 'চেক' : 'Cheque'}</SelectItem>
                  <SelectItem value="অনলাইন">{bn ? 'অনলাইন' : 'Online'}</SelectItem>
                  <SelectItem value="বস্তু/সামগ্রী">{bn ? 'বস্তু/সামগ্রী' : 'In-Kind'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'উদ্দেশ্য / বাবদ' : 'Purpose'}</Label>
              <Input className="h-8 text-sm" value={form.purpose} onChange={(e) => updateField('purpose', e.target.value)} placeholder={bn ? 'মসজিদ নির্মাণ, শিক্ষা তহবিল...' : 'Building fund, education...'} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'টাকার পরিমাণ' : 'Amount'}</Label>
              <Input className="h-8 text-sm" type="number" value={form.donationAmount} onChange={(e) => updateField('donationAmount', e.target.value)} placeholder="৳" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{bn ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}</Label>
              <Input className="h-8 text-sm" value={form.paymentMethod} onChange={(e) => updateField('paymentMethod', e.target.value)} placeholder={bn ? 'bKash / নগদ / ব্যাংক' : 'bKash / Cash / Bank'} />
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 bg-muted/30 rounded-lg overflow-hidden border" style={{ minHeight: 500 }}>
            <iframe
              key={JSON.stringify(form)}
              src={previewSrc}
              className="w-full h-full border-0"
              style={{ minHeight: 500 }}
              title="Donation Receipt Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDonors;
