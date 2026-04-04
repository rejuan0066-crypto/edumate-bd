import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { Save, Loader2, RotateCcw, FileDown, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { downloadReceiptAsPdf } from '@/lib/receiptPdfDownload';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { buildSingleStudentPrintHtml, ReceiptData, ReceiptStyleConfig } from '@/components/fees/receiptPrintLayouts';

const DEFAULT_STYLE: ReceiptStyleConfig = {
  primaryColor: '#1a5c2e',
  fontSize: 100,
  receiptTitle: 'রশিদ বই',
  showWatermark: true,
  showQr: true,
};

const ReceiptDesignerMain = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings, isLoading, saveMutation, deleteMutation } = useReceiptSettings();

  const { data: institution } = useQuery({
    queryKey: ['institution_designer'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  const [selectedSettingId, setSelectedSettingId] = useState('');
  const [name, setName] = useState('রশিদ বই');
  const [nameBn, setNameBn] = useState('রশিদ বই');
  const [style, setStyle] = useState<ReceiptStyleConfig>({ ...DEFAULT_STYLE });
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadSetting = useCallback((id: string) => {
    const s = settings?.find((s: any) => s.id === id);
    if (s) {
      setSelectedSettingId(s.id);
      setName(s.name);
      setNameBn(s.name_bn);
      const dc = s.design_config as any;
      if (dc?.primaryColor !== undefined) {
        setStyle(dc as ReceiptStyleConfig);
      }
    }
  }, [settings]);

  const getSampleData = (): ReceiptData => ({
    studentName: '',
    studentId: '',
    rollNumber: '',
    className: '',
    sessionName: '',
    feeType: '',
    amount: '',
    transactionId: '______',
    receiptSerial: '',
    date: '',
    status: '',
    statusColor: '#22c55e',
    paymentMethod: '',
    collectorName: '',
    approverName: '',
    institutionName: institution?.name || 'মডেল মাদরাসা',
    institutionNameEn: institution?.name_en || 'MODEL MADRASA',
    institutionAddress: institution?.address || 'ঢাকা, বাংলাদেশ',
    institutionPhone: institution?.phone || '০১৭০০-০০০০০০',
    institutionEmail: institution?.email || '',
    institutionOtherInfo: institution?.other_info || '',
    logoUrl: institution?.logo_url || '',
    bn: true,
  });

  const getPreviewHtml = () => {
    const sampleData = getSampleData();
    return buildSingleStudentPrintHtml(sampleData, style);
  };

  const handlePreview = () => {
    const html = getPreviewHtml();
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const html = getPreviewHtml();
      await downloadReceiptAsPdf(html, `receipt-preview-${Date.now()}.pdf`);
      toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (e: any) {
      toast.error(e.message || 'PDF error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        id: selectedSettingId || undefined,
        name,
        name_bn: nameBn,
        paper_size: 'a4',
        design_config: style as any,
        is_default: true,
      });
      toast.success(bn ? 'রিসিট সেটিংস সেভ হয়েছে' : 'Receipt settings saved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReset = () => {
    setStyle({ ...DEFAULT_STYLE });
    toast.info(bn ? 'ডিফল্ট সেটিংসে রিসেট হয়েছে' : 'Reset to defaults');
  };

  // Generate live preview iframe
  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(getPreviewHtml().replace(/<script>.*?<\/script>/gs, ''))}`;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[180px]">
          <Select value={selectedSettingId} onValueChange={loadSetting}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={bn ? 'সেভ করা ডিজাইন নির্বাচন' : 'Select saved design'} />
            </SelectTrigger>
            <SelectContent>
              {(settings || []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}{s.is_default ? ' ⭐' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-1" />{bn ? 'রিসেট' : 'Reset'}</Button>
        <Button variant="outline" size="sm" onClick={handlePreview}><Eye className="w-4 h-4 mr-1" />{bn ? 'প্রিভিউ' : 'Preview'}</Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
          PDF
        </Button>
        {selectedSettingId && (
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              if (!confirm(bn ? 'ডিলিট করতে চান?' : 'Delete?')) return;
              try {
                await deleteMutation.mutateAsync(selectedSettingId);
                setSelectedSettingId('');
                setStyle({ ...DEFAULT_STYLE });
                toast.success(bn ? 'ডিলিট হয়েছে' : 'Deleted');
              } catch (e: any) { toast.error(e.message); }
            }}>
            <Trash2 className="w-4 h-4 mr-1" />{bn ? 'ডিলিট' : 'Delete'}
          </Button>
        )}
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary-gradient">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          {bn ? 'সেভ করুন' : 'Save'}
        </Button>
      </div>

      {/* Main layout: Settings + Preview */}
      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 'calc(100vh - 300px)' }}>
        {/* Settings Panel */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4 card-elevated p-4 rounded-lg">
          <h3 className="font-display font-semibold text-sm text-foreground">{bn ? 'কাস্টমাইজেশন' : 'Customization'}</h3>

          {/* Name */}
          <div className="space-y-1">
            <Label className="text-xs">{bn ? 'সেভের নাম' : 'Save Name'}</Label>
            <Input className="h-8 text-sm" value={nameBn} onChange={(e) => { setNameBn(e.target.value); setName(e.target.value); }} />
          </div>

          {/* Receipt Title */}
          <div className="space-y-1">
            <Label className="text-xs">{bn ? 'রিসিটের শিরোনাম' : 'Receipt Title'}</Label>
            <Input className="h-8 text-sm" value={style.receiptTitle} onChange={(e) => setStyle(p => ({ ...p, receiptTitle: e.target.value }))}
              placeholder="রশিদ বই / মাসিক ফি / ভর্তি রিসিট" />
          </div>

          {/* Primary Color */}
          <div className="space-y-1">
            <Label className="text-xs">{bn ? 'প্রাইমারি কালার' : 'Primary Color'}</Label>
            <div className="flex gap-2 items-center">
              <Input type="color" className="h-8 w-12 p-0.5 cursor-pointer" value={style.primaryColor}
                onChange={(e) => setStyle(p => ({ ...p, primaryColor: e.target.value }))} />
              <Input className="h-8 text-xs flex-1" value={style.primaryColor}
                onChange={(e) => setStyle(p => ({ ...p, primaryColor: e.target.value }))} />
            </div>
            <div className="flex gap-1 mt-1">
              {['#1a5c2e', '#1e3a5f', '#7c2d12', '#4a1d96', '#0f766e', '#1e293b'].map(c => (
                <button key={c} className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  style={{ backgroundColor: c, borderColor: c === style.primaryColor ? '#000' : 'transparent' }}
                  onClick={() => setStyle(p => ({ ...p, primaryColor: c }))} />
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <Label className="text-xs">{bn ? 'ফন্ট সাইজ' : 'Font Size'}: {style.fontSize}%</Label>
            <Slider value={[style.fontSize]} min={70} max={130} step={5}
              onValueChange={([v]) => setStyle(p => ({ ...p, fontSize: v }))} />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{bn ? 'ওয়াটারমার্ক লোগো' : 'Watermark Logo'}</Label>
              <Switch checked={style.showWatermark} onCheckedChange={(v) => setStyle(p => ({ ...p, showWatermark: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">{bn ? 'QR কোড' : 'QR Code'}</Label>
              <Switch checked={style.showQr} onCheckedChange={(v) => setStyle(p => ({ ...p, showQr: v }))} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground border-t pt-3">
            {bn ? 'লোগো পরিবর্তন করতে প্রতিষ্ঠানের প্রোফাইল থেকে আপলোড করুন। এই সেটিংস সেভ করলে রিসিট ডাউনলোডে স্বয়ংক্রিয় প্রয়োগ হবে।' : 'Upload logo from institution profile. Saved settings auto-apply to receipt downloads.'}
          </p>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-muted/30 rounded-lg overflow-hidden border" style={{ minHeight: 500 }}>
          <iframe
            key={JSON.stringify(style)}
            src={previewSrc}
            className="w-full h-full border-0"
            style={{ minHeight: 500 }}
            title="Receipt Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};

export default ReceiptDesignerMain;
