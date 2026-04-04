import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceiptSettings, DEFAULT_DESIGN, ReceiptDesignConfig, ReceiptElement } from '@/hooks/useReceiptSettings';
import DesignerCanvas from './DesignerCanvas';
import DesignerToolbar from './DesignerToolbar';
import { Save, Loader2, RotateCcw, FileDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

const ReceiptDesignerMain = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings, isLoading, saveMutation } = useReceiptSettings();

  const [selectedSettingId, setSelectedSettingId] = useState<string>('');
  const [name, setName] = useState('Default Receipt');
  const [nameBn, setNameBn] = useState('ডিফল্ট রিসিট');
  const [config, setConfig] = useState<ReceiptDesignConfig>({ ...DEFAULT_DESIGN });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);

  const loadSetting = useCallback((id: string) => {
    const s = settings?.find((s: any) => s.id === id);
    if (s) {
      setSelectedSettingId(s.id);
      setName(s.name);
      setNameBn(s.name_bn);
      setIsDefault(s.is_default || false);
      const dc = s.design_config as any;
      if (dc && dc.elements) {
        setConfig(dc as ReceiptDesignConfig);
      }
    }
  }, [settings]);

  const handleConfigChange = useCallback((updates: Partial<ReceiptDesignConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleUpdateElement = useCallback((id: string, updates: Partial<ReceiptElement>) => {
    setConfig(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el),
    }));
  }, []);

  const handleAddElement = useCallback((type: ReceiptElement['type'], extra?: Partial<ReceiptElement>) => {
    const id = `${type}_${Date.now()}`;
    const newEl: ReceiptElement = {
      id,
      type,
      x: 20,
      y: 20,
      width: type === 'line' ? 100 : type === 'qr' ? 50 : type === 'logo' ? 30 : type === 'field' ? 200 : 80,
      height: type === 'line' ? 2 : type === 'qr' ? 50 : type === 'logo' ? 30 : type === 'field' ? 16 : 14,
      content: type === 'text' ? (bn ? 'নতুন টেক্সট' : 'New Text') : '',
      fontSize: 10,
      color: '#000000',
      fontFamily: 'bengali',
      ...extra,
    };
    setConfig(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedId(id);
  }, [bn]);

  const handleDeleteElement = useCallback((id: string) => {
    setConfig(prev => ({ ...prev, elements: prev.elements.filter(el => el.id !== id) }));
    setSelectedId(null);
  }, []);

  const handleLoadPreset = useCallback((preset: ReceiptDesignConfig) => {
    setConfig({ ...preset, elements: preset.elements.map(el => ({ ...el })) });
    setSelectedId(null);
    toast.info(bn ? 'টেমপ্লেট লোড হয়েছে' : 'Template loaded');
  }, [bn]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        id: selectedSettingId || undefined,
        name,
        name_bn: nameBn,
        paper_size: config.paperSize,
        design_config: config,
        is_default: isDefault,
      });
      toast.success(bn ? 'রিসিট ডিজাইন সেভ হয়েছে' : 'Receipt design saved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_DESIGN });
    setSelectedId(null);
    toast.info(bn ? 'ডিফল্ট ডিজাইনে রিসেট হয়েছে' : 'Reset to default design');
  };

  const handleDownloadBlank = () => {
    const printHtml = generatePrintHtml(config, null, bn);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printHtml);
      win.document.close();
    }
  };

  const selectedElement = selectedId ? config.elements.find(el => el.id === selectedId) || null : null;

  return (
    <div className="space-y-3">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedSettingId} onValueChange={loadSetting}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={bn ? 'ডিজাইন নির্বাচন বা নতুন তৈরি' : 'Select design or create new'} />
            </SelectTrigger>
            <SelectContent>
              {(settings || []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}{s.is_default ? ' ⭐' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input className="h-9 w-40" placeholder={bn ? 'নাম (EN)' : 'Name (EN)'} value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="h-9 w-40" placeholder={bn ? 'নাম (বাংলা)' : 'Name (BN)'} value={nameBn} onChange={(e) => setNameBn(e.target.value)} />

        <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-1" />{bn ? 'রিসেট' : 'Reset'}</Button>
        <Button variant="outline" size="sm" onClick={handleDownloadBlank}><FileDown className="w-4 h-4 mr-1" />{bn ? 'ব্ল্যাংক প্রিন্ট' : 'Print Blank'}</Button>
        <Button variant="outline" size="sm" onClick={() => { setSelectedSettingId(''); setName(''); setNameBn(''); setConfig({ ...DEFAULT_DESIGN }); }}>
          <Plus className="w-4 h-4 mr-1" />{bn ? 'নতুন' : 'New'}
        </Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary-gradient">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          {bn ? 'সেভ করুন' : 'Save'}
        </Button>
      </div>

      {/* Designer Area */}
      <div className="flex border rounded-lg overflow-hidden bg-background" style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}>
        <DesignerToolbar
          config={config}
          selectedElement={selectedElement}
          onConfigChange={handleConfigChange}
          onUpdateElement={handleUpdateElement}
          onAddElement={handleAddElement}
          onDeleteElement={handleDeleteElement}
          onLoadPreset={handleLoadPreset}
        />
        <DesignerCanvas
          config={config}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateElement={handleUpdateElement}
        />
      </div>
    </div>
  );
};

function generatePrintHtml(config: ReceiptDesignConfig, data: any, bn: boolean): string {
  const scale = 2.5;
  const renderElements = (elements: ReceiptElement[], copyLabel: string) => {
    return elements.map(el => {
      const fontFam = el.fontFamily === 'bengali' ? "'Noto Sans Bengali',sans-serif" : el.fontFamily === 'monospace' ? 'monospace' : 'sans-serif';
      const baseStyle = `position:absolute;left:${el.x * scale}px;top:${el.y * scale}px;width:${el.width * scale}px;height:${el.height * scale}px;font-size:${(el.fontSize || 10) * scale}px;font-weight:${el.fontWeight || 'normal'};font-style:${el.fontStyle || 'normal'};text-align:${el.textAlign || 'left'};color:${el.color || '#000'};font-family:${fontFam};display:flex;align-items:center;overflow:hidden;line-height:1.2;opacity:${el.opacity ?? 1};`;

      let content = el.content || el.placeholder || '';
      if (data) {
        content = content.replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
      } else {
        content = content.replace(/\{(\w+)\}/g, '___________');
      }

      if (el.type === 'field') {
        const labelW = 28 * scale;
        let inputHtml = '';
        if (el.lineStyle === 'rounded-fill') {
          inputHtml = `<div style="flex:1;height:80%;background:#f0f0f0;border-radius:${10 * scale}px;border:${scale}px solid ${el.borderColor || '#ddd'};display:flex;align-items:center;padding:0 ${4 * scale}px;"><span style="color:#999;font-style:italic;font-size:0.85em;">${content}</span></div>`;
        } else {
          inputHtml = `<div style="flex:1;height:80%;border-bottom:${scale}px ${el.lineStyle || 'solid'} ${el.borderColor || '#333'};display:flex;align-items:center;"><span style="color:#999;font-style:italic;font-size:0.85em;">${content}</span></div>`;
        }
        return `<div style="${baseStyle}"><span style="width:${labelW}px;flex-shrink:0;font-weight:600;">${el.fieldLabel || ''}</span>${inputHtml}</div>`;
      }

      if (el.type === 'line') {
        return `<div style="${baseStyle}border-bottom:${(el.borderWidth || 1) * scale}px solid ${el.color || '#333'};"></div>`;
      }
      if (el.type === 'qr') {
        if (data) {
          const qrData = encodeURIComponent(`TXN:${data.transaction_id || ''}|AMT:${data.amount || ''}`);
          return `<div style="${baseStyle}"><img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}" style="width:100%;height:100%;" /></div>`;
        }
        return `<div style="${baseStyle}border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;"><span style="font-size:${8 * scale}px;color:#999">QR</span></div>`;
      }
      if (el.type === 'logo') {
        if (data?.logo_url) {
          return `<div style="${baseStyle}"><img src="${data.logo_url}" style="width:100%;height:100%;object-fit:contain;" /></div>`;
        }
        return `<div style="${baseStyle}border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;"><span style="font-size:${7 * scale}px;color:#999">Logo</span></div>`;
      }
      if (el.type === 'shape') {
        const br = el.shapeType === 'circle' ? '50%' : `${(el.borderRadius || 0) * scale}px`;
        return `<div style="${baseStyle}background:${el.bgColor || 'transparent'};border:${(el.borderWidth || 1) * scale}px solid ${el.borderColor || '#333'};border-radius:${br};"></div>`;
      }
      return `<div style="${baseStyle}">${content}</div>`;
    }).join('');
  };

  const w = config.receiptWidth * scale;
  const h = config.receiptHeight * scale;

  const buildReceipt = (label: string) => `
    <div style="position:relative;width:${w}px;height:${h}px;border:${config.borderWidth * scale}px solid ${config.borderColor};background:${config.bgColor};overflow:hidden;">
      <div style="position:absolute;top:${2 * scale}px;right:${3 * scale}px;font-size:${7 * scale}px;font-weight:700;color:#666;z-index:2;">${label}</div>
      ${renderElements(config.elements, label)}
    </div>`;

  const receiptsPerPage = config.receiptsPerPage || 3;
  const pairs: string[] = [];
  for (let i = 0; i < receiptsPerPage; i++) {
    const row = config.duplicateCopy
      ? `<div style="display:flex;"><div>${buildReceipt(bn ? 'অফিস কপি' : 'Office Copy')}</div><div style="border-left:1px dashed #aaa;margin:0 2px;"></div><div>${buildReceipt(bn ? 'ছাত্র কপি' : 'Student Copy')}</div></div>`
      : buildReceipt('');
    pairs.push(row);
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${bn ? 'ব্ল্যাংক রিসিট' : 'Blank Receipt'}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans Bengali',sans-serif}
.page{width:210mm;min-height:297mm;padding:5mm;display:flex;flex-direction:column;justify-content:flex-start;page-break-after:always}
.cut-h{border-top:1px dashed #aaa;margin:2px 0}
@media print{@page{size:A4;margin:0}.page{padding:5mm}}
@media screen{body{background:#f0f0f0;padding:20px}.page{background:white;margin:0 auto 20px;box-shadow:0 2px 10px rgba(0,0,0,.15)}}
</style></head><body>
<div class="page">${pairs.join('<div class="cut-h"></div>')}</div>
<script>document.fonts.ready.then(()=>{setTimeout(()=>window.print(),800)})</script>
</body></html>`;
}

export { generatePrintHtml };
export default ReceiptDesignerMain;
