import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, Loader2, RotateCw, Trash2, Crop, Eraser, Maximize, Lock, Unlock, RulerIcon, MoveVertical, MoveHorizontal, ImageIcon, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ─── Processing Overlay ───
const ProcessingOverlay = ({ language }: { language: string }) => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-md rounded-2xl">
    <div className="relative flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-primary/20 animate-ping absolute" />
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center relative">
        <Sparkles className="w-7 h-7 text-primary animate-pulse" />
      </div>
    </div>
    <span className="mt-4 text-sm font-medium text-foreground/80 animate-pulse">
      {language === 'bn' ? 'প্রসেস হচ্ছে...' : 'Processing...'}
    </span>
  </div>
);

// ─── Image Upload Area ───
const ImageUploadArea = ({ onFile, language }: { onFile: (f: File, src: string) => void; language: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Only image files'); return; }
    const reader = new FileReader();
    reader.onload = () => onFile(file, reader.result as string);
    reader.readAsDataURL(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <label
        className={`flex flex-col items-center justify-center w-full max-w-xl py-20 px-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
            : 'border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:bg-card/80 hover:shadow-lg'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 shadow-inner">
          <Upload className="w-9 h-9 text-primary" />
        </div>
        <span className="text-lg font-semibold text-foreground">
          {language === 'bn' ? 'ছবি আপলোড করুন' : 'Upload an Image'}
        </span>
        <span className="text-sm text-muted-foreground mt-2">
          {language === 'bn' ? 'ড্র্যাগ করুন অথবা ক্লিক করুন' : 'Drag & drop or click to browse'}
        </span>
        <span className="text-xs text-muted-foreground/50 mt-1.5">JPG, PNG, WebP — Max 10MB</span>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
    </div>
  );
};

// ─── Glass Panel Wrapper ───
const GlassPanel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl shadow-sm p-4 ${className}`}>
    {children}
  </div>
);

// ─── Segmented Tab Button ───
const SegmentedTab = ({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-300 ${
      active
        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

// ─── Resize Controls ───
const ResizeControls = ({ originalInfo, language, onProcess, processing }: {
  originalInfo: { width: number; height: number; size: number };
  language: string;
  onProcess: (w: number, h: number, q: number, fmt: 'jpeg' | 'png' | 'webp') => void;
  processing: boolean;
}) => {
  const [width, setWidth] = useState(originalInfo.width);
  const [height, setHeight] = useState(originalInfo.height);
  const [keepRatio, setKeepRatio] = useState(true);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  const onW = (v: number) => { setWidth(v); if (keepRatio && originalInfo.width) setHeight(Math.round((v / originalInfo.width) * originalInfo.height)); };
  const onH = (v: number) => { setHeight(v); if (keepRatio && originalInfo.height) setWidth(Math.round((v / originalInfo.height) * originalInfo.width)); };

  const presets = [
    { l: '50%', f: .5 }, { l: '75%', f: .75 }, { l: '150%', f: 1.5 },
    { l: '256px', s: 256 }, { l: '512px', s: 512 }, { l: '1024px', s: 1024 },
  ];

  return (
    <div className="space-y-4">
      {/* Original Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="w-3.5 h-3.5" />
        <span>{originalInfo.width}×{originalInfo.height} • {formatSize(originalInfo.size)}</span>
      </div>

      {/* Dimensions */}
      <GlassPanel>
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          {language === 'bn' ? 'ডাইমেনশন' : 'Dimensions'}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <MoveHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input type="number" min={1} value={width} onChange={e => onW(+e.target.value)} className="h-9 text-sm pl-8 bg-background/50" placeholder="Width" />
          </div>
          <div className="relative">
            <MoveVertical className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input type="number" min={1} value={height} onChange={e => onH(+e.target.value)} className="h-9 text-sm pl-8 bg-background/50" placeholder="Height" />
          </div>
        </div>
        <button
          onClick={() => setKeepRatio(!keepRatio)}
          className={`mt-2 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all duration-200 ${keepRatio ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-muted/50 text-muted-foreground'}`}
        >
          {keepRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {language === 'bn' ? 'অনুপাত লক' : 'Lock aspect ratio'}
        </button>
      </GlassPanel>

      {/* Presets */}
      <GlassPanel>
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          {language === 'bn' ? 'প্রিসেট' : 'Quick Presets'}
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {presets.map(p => (
            <Button key={p.l} size="sm" variant="outline" className="h-8 text-xs rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200" onClick={() => {
              if ('f' in p) { const w = Math.round(originalInfo.width * p.f); const h = Math.round(originalInfo.height * p.f); setWidth(w); setHeight(h); }
              else { const r = originalInfo.width / originalInfo.height; if (r >= 1) { setWidth(p.s); setHeight(Math.round(p.s / r)); } else { setHeight(p.s); setWidth(Math.round(p.s * r)); } }
            }}>{p.l}</Button>
          ))}
        </div>
      </GlassPanel>

      {/* Quality */}
      <GlassPanel>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {language === 'bn' ? 'কোয়ালিটি' : 'Quality'}
          </Label>
          <span className="text-sm font-bold text-primary tabular-nums">{quality}%</span>
        </div>
        <Slider value={[quality]} min={10} max={100} step={5} onValueChange={([v]) => setQuality(v)} className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5" />
      </GlassPanel>

      {/* Format */}
      <GlassPanel>
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          {language === 'bn' ? 'ফরম্যাট' : 'Output Format'}
        </Label>
        <Select value={format} onValueChange={v => setFormat(v as any)}>
          <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="jpeg">JPEG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </GlassPanel>

      {/* Process Button */}
      <Button className="w-full h-10 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all duration-200" onClick={() => onProcess(width, height, quality, format)} disabled={processing}>
        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
        {language === 'bn' ? 'প্রসেস করুন' : 'Process Image'}
      </Button>
    </div>
  );
};

// ─── Crop Controls ───
const CropControls = ({ language, cropW, cropH, canCrop, onCrop }: {
  language: string; cropW: number; cropH: number; canCrop: boolean; onCrop: () => void;
}) => (
  <div className="space-y-4">
    <GlassPanel>
      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
        {language === 'bn' ? 'ক্রপ এরিয়া' : 'Crop Area'}
      </Label>
      <p className="text-xs text-muted-foreground mb-3">
        {language === 'bn' ? 'ছবির উপর ড্র্যাগ করে ক্রপ এরিয়া সিলেক্ট করুন' : 'Drag on the image to select crop area'}
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
        <RulerIcon className="w-3.5 h-3.5" />
        <span>{language === 'bn' ? 'সাইজ:' : 'Size:'} {cropW}×{cropH}px</span>
      </div>
    </GlassPanel>
    <Button className="w-full h-10 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={onCrop} disabled={!canCrop}>
      <Crop className="w-4 h-4 mr-2" />
      {language === 'bn' ? 'ক্রপ করুন' : 'Crop Image'}
    </Button>
  </div>
);

// ─── BG Remove Controls ───
const BgRemoveControls = ({ language, processing, onRemove }: {
  language: string; processing: boolean; onRemove: () => void;
}) => (
  <div className="space-y-4">
    <GlassPanel>
      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
        {language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ' : 'Background Removal'}
      </Label>
      <p className="text-xs text-muted-foreground">
        {language === 'bn' ? 'AI ব্যবহার করে ছবির ব্যাকগ্রাউন্ড মুছে ফেলুন। ট্রান্সপারেন্ট PNG তৈরি হবে।' : 'AI-powered background removal. Creates a transparent PNG output.'}
      </p>
    </GlassPanel>
    <Button className="w-full h-10 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={onRemove} disabled={processing}>
      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eraser className="w-4 h-4 mr-2" />}
      {language === 'bn' ? (processing ? 'AI প্রসেসিং... (১০-৩০s)' : 'ব্যাকগ্রাউন্ড রিমুভ') : (processing ? 'AI Processing...' : 'Remove Background')}
    </Button>
  </div>
);

// ─── Canvas Preview (with crop support) ───
const CanvasPreview = ({ preview, resultUrl, activeTab, language, onCropData }: {
  preview: string;
  resultUrl: string | null;
  activeTab: string;
  language: string;
  onCropData: (data: { x: number; y: number; w: number; h: number; scale: number }) => void;
}) => {
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [displayScale, setDisplayScale] = useState(1);

  const imgLoaded = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const natW = el.naturalWidth;
    const scale = el.width / natW;
    setDisplayScale(scale);
    setCropBox({ x: 0, y: 0, w: 0, h: 0 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== 'crop') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    setDragging(true);
    setDragStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || activeTab !== 'crop') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const newBox = { x: Math.min(dragStart.x, x), y: Math.min(dragStart.y, y), w: Math.abs(x - dragStart.x), h: Math.abs(y - dragStart.y) };
    setCropBox(newBox);
    onCropData({ ...newBox, scale: displayScale });
  };

  const handleMouseUp = () => {
    setDragging(false);
    if (displayScale > 0) {
      onCropData({ ...cropBox, scale: displayScale });
    }
  };

  const showResult = resultUrl && activeTab !== 'crop';
  const isCropMode = activeTab === 'crop';
  const displayUrl = showResult ? resultUrl : preview;

  return (
    <div className="relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden"
      style={{ background: 'repeating-conic-gradient(hsl(var(--muted)/0.5) 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}
    >
      <div
        className={`relative inline-block ${isCropMode ? 'cursor-crosshair' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setDragging(false)}
      >
        <img
          src={displayUrl}
          alt="Preview"
          onLoad={imgLoaded}
          className="max-w-full max-h-[30vh] lg:max-h-[38vh] object-contain select-none"
          draggable={false}
        />
        {isCropMode && cropBox.w > 0 && cropBox.h > 0 && (
          <>
            <div className="absolute inset-0 bg-black/40 pointer-events-none transition-opacity duration-200" />
            <div
              className="absolute border-2 border-white pointer-events-none rounded-sm"
              style={{
                left: cropBox.x, top: cropBox.y,
                width: cropBox.w, height: cropBox.h,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }}
            >
              {/* Corner handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───
export const PhotoToolsCore = ({ language, onReset: externalReset }: { language: string; onReset?: () => void }) => {
  const [preview, setPreview] = useState('');
  const [originalInfo, setOriginalInfo] = useState({ width: 0, height: 0, size: 0 });
  const [activeTab, setActiveTab] = useState<'resize' | 'crop' | 'bg-remove'>('resize');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; size: number; w: number; h: number } | null>(null);
  const [bgResult, setBgResult] = useState<string | null>(null);
  const [cropData, setCropData] = useState<{ x: number; y: number; w: number; h: number; scale: number } | null>(null);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);

  const handleFile = (f: File, src: string) => {
    setPreview(src);
    const img = new window.Image();
    img.onload = () => setOriginalInfo({ width: img.width, height: img.height, size: f.size });
    img.src = src;
  };

  const reset = () => {
    setPreview(''); setOriginalInfo({ width: 0, height: 0, size: 0 });
    setResult(null); setBgResult(null); setCropData(null);
    externalReset?.();
  };

  const handleCropData = (data: { x: number; y: number; w: number; h: number; scale: number }) => {
    setCropData(data);
    if (data.scale > 0) {
      setCropW(Math.round(data.w / data.scale));
      setCropH(Math.round(data.h / data.scale));
    }
  };

  // ── Resize logic (preserved) ──
  const processResize = (width: number, height: number, quality: number, format: 'jpeg' | 'png' | 'webp') => {
    setProcessing(true);
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      c.toBlob(blob => {
        if (blob) setResult({ url: URL.createObjectURL(blob), size: blob.size, w: width, h: height });
        setProcessing(false);
      }, `image/${format}`, format === 'png' ? undefined : quality / 100);
    };
    img.src = preview;
  };

  // ── Crop logic (preserved) ──
  const doCrop = () => {
    if (!cropData || cropData.w < 5 || cropData.h < 5) {
      toast.error(language === 'bn' ? 'ক্রপ এরিয়া সিলেক্ট করুন' : 'Select crop area'); return;
    }
    setProcessing(true);
    const sx = cropData.x / cropData.scale, sy = cropData.y / cropData.scale;
    const sw = cropData.w / cropData.scale, sh = cropData.h / cropData.scale;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw); canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d')!;
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) setResult({ url: URL.createObjectURL(blob), size: blob.size, w: canvas.width, h: canvas.height });
        setProcessing(false);
      }, 'image/png');
    };
    img.src = preview;
  };

  // ── BG Remove logic (preserved) ──
  const removeBg = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('remove-bg', { body: { image_base64: preview } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setProcessing(false); return; }
      if (data?.image) { setBgResult(data.image); toast.success(language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ সফল!' : 'Background removed!'); }
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setProcessing(false);
  };

  const download = () => {
    const url = activeTab === 'bg-remove' ? bgResult : result?.url;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'bg-remove' ? `no-bg-${Date.now()}.png` : activeTab === 'crop' ? 'cropped.png' : 'resized.jpg';
    a.click();
  };

  const currentResultUrl = activeTab === 'bg-remove' ? bgResult : result?.url || null;
  const hasResult = !!currentResultUrl;

  if (!preview) return <ImageUploadArea onFile={handleFile} language={language} />;

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[60vh]">
      {/* ─── Left: Canvas ─── */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="relative flex-1 min-h-[180px] max-h-[42vh] rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden lg:sticky lg:top-4">
          {processing && <ProcessingOverlay language={language} />}
          <CanvasPreview
            preview={preview}
            resultUrl={currentResultUrl}
            activeTab={activeTab}
            language={language}
            onCropData={handleCropData}
          />
        </div>

        {/* Result info bar */}
        {hasResult && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/30 bg-card/70 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-xs">
              {result && activeTab !== 'bg-remove' && (
                <>
                  <span className="text-muted-foreground">{result.w}×{result.h}px • {formatSize(result.size)}</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md ${result.size < originalInfo.size ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-500'}`}>
                    {result.size < originalInfo.size ? `↓ ${Math.round((1 - result.size / originalInfo.size) * 100)}%` : `↑ ${Math.round((result.size / originalInfo.size - 1) * 100)}%`}
                  </span>
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={download}
              className="h-8 px-4 text-xs font-semibold rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-md shadow-green-600/20 transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {language === 'bn' ? 'ডাউনলোড' : 'Download'}
            </Button>
          </div>
        )}
      </div>

      {/* ─── Right: Sidebar Controls ─── */}
      <div className="w-full lg:w-80 xl:w-[340px] flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{language === 'bn' ? 'টুলস' : 'Tools'}</h3>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={reset}>
            <RefreshCw className="w-3 h-3 mr-1" />
            {language === 'bn' ? 'রিসেট' : 'Reset'}
          </Button>
        </div>

        {/* Segmented Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl bg-muted/40 backdrop-blur-sm border border-border/20">
          <SegmentedTab active={activeTab === 'resize'} icon={Maximize} label={language === 'bn' ? 'রিসাইজ' : 'Resize'} onClick={() => setActiveTab('resize')} />
          <SegmentedTab active={activeTab === 'crop'} icon={Crop} label={language === 'bn' ? 'ক্রপ' : 'Crop'} onClick={() => setActiveTab('crop')} />
          <SegmentedTab active={activeTab === 'bg-remove'} icon={Eraser} label={language === 'bn' ? 'ব্যাকগ্রাউন্ড' : 'BG Remove'} onClick={() => setActiveTab('bg-remove')} />
        </div>

        {/* Controls (scrollable on desktop) */}
        <div className="flex-1 overflow-y-auto lg:max-h-[calc(50vh-60px)] pr-0.5 custom-scrollbar">
          {activeTab === 'resize' && (
            <ResizeControls originalInfo={originalInfo} language={language} onProcess={processResize} processing={processing} />
          )}
          {activeTab === 'crop' && (
            <CropControls language={language} cropW={cropW} cropH={cropH} canCrop={!!(cropData && cropData.w >= 5)} onCrop={doCrop} />
          )}
          {activeTab === 'bg-remove' && (
            <BgRemoveControls language={language} processing={processing} onRemove={removeBg} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoToolsCore;
