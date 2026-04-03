import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, Loader2, RotateCw, Trash2, Crop, Eraser, Maximize, Lock, Unlock, RulerIcon, MoveVertical, MoveHorizontal, ImageIcon, RefreshCw, Sparkles, Eye, EyeOff } from 'lucide-react';
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
const ImageUploadArea = ({ onFile, language }: { onFile: (f: File) => void; language: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Only image files'); return; }
    onFile(file);
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
    <div className="flex items-center justify-center min-h-[40vh]">
      <label
        className={`flex flex-col items-center justify-center w-full max-w-xl py-12 px-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${
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
  const [unit, setUnit] = useState<'px' | 'inch' | 'cm'>('px');
  const [dpi, setDpi] = useState(72);
  const [width, setWidth] = useState(originalInfo.width);
  const [height, setHeight] = useState(originalInfo.height);
  const [keepRatio, setKeepRatio] = useState(true);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  // Unit conversion helpers
  const pxToUnit = (px: number) => {
    if (unit === 'inch') return +(px / dpi).toFixed(2);
    if (unit === 'cm') return +(px / dpi * 2.54).toFixed(2);
    return px;
  };
  const unitToPx = (val: number) => {
    if (unit === 'inch') return Math.round(val * dpi);
    if (unit === 'cm') return Math.round(val / 2.54 * dpi);
    return Math.round(val);
  };

  const displayW = pxToUnit(width);
  const displayH = pxToUnit(height);

  const onDisplayW = (v: number) => {
    const px = unitToPx(v);
    setWidth(px);
    if (keepRatio && originalInfo.width) setHeight(Math.round((px / originalInfo.width) * originalInfo.height));
  };
  const onDisplayH = (v: number) => {
    const px = unitToPx(v);
    setHeight(px);
    if (keepRatio && originalInfo.height) setWidth(Math.round((px / originalInfo.height) * originalInfo.width));
  };

  // Live estimated file size
  const pixelRatio = (width * height) / (originalInfo.width * originalInfo.height || 1);
  const qualityFactor = format === 'png' ? 1 : quality / 100;
  const formatFactor = format === 'webp' ? 0.65 : format === 'jpeg' ? 0.85 : 1.2;
  const estimatedSize = Math.round(originalInfo.size * pixelRatio * qualityFactor * formatFactor);
  const sizeDiff = originalInfo.size - estimatedSize;
  const sizePct = originalInfo.size > 0 ? Math.round((Math.abs(sizeDiff) / originalInfo.size) * 100) : 0;
  const isSizeSmaller = sizeDiff > 0;

  const presets = [
    { l: '50%', f: .5 }, { l: '75%', f: .75 }, { l: '150%', f: 1.5 },
    { l: '256px', s: 256 }, { l: '512px', s: 512 }, { l: '1024px', s: 1024 },
  ];

  const unitLabel = unit === 'px' ? 'px' : unit === 'inch' ? '"' : 'cm';
  const stepVal = unit === 'px' ? 1 : 0.01;

  return (
    <div className="space-y-4">
      {/* Original Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="w-3.5 h-3.5" />
        <span>{originalInfo.width}×{originalInfo.height}px • {formatSize(originalInfo.size)}</span>
      </div>

      {/* Live Size Estimation */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-300 ${
        isSizeSmaller
          ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
          : 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400'
      }`}>
        <div className="flex items-center gap-2">
          <span>{isSizeSmaller ? '📉' : '📈'}</span>
          <span>
            {language === 'bn' ? 'আনুমানিক:' : 'Est:'} <strong>{formatSize(estimatedSize)}</strong>
          </span>
        </div>
        <span className="font-bold">
          {isSizeSmaller
            ? `↓ ${sizePct}% ${language === 'bn' ? 'কমবে' : 'smaller'}`
            : `↑ ${sizePct}% ${language === 'bn' ? 'বাড়বে' : 'larger'}`}
        </span>
      </div>

      {/* Unit & DPI Selector */}
      <GlassPanel>
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          {language === 'bn' ? 'একক ও DPI' : 'Unit & DPI'}
        </Label>
        <div className="flex gap-1.5 mb-2">
          {(['px', 'inch', 'cm'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                unit === u
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {u === 'px' ? 'Pixel' : u === 'inch' ? 'Inch' : 'CM'}
            </button>
          ))}
        </div>
        {unit !== 'px' && (
          <div className="flex items-center gap-2 mt-2">
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">DPI:</Label>
            <div className="flex gap-1">
              {[72, 96, 150, 300].map(d => (
                <button
                  key={d}
                  onClick={() => setDpi(d)}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                    dpi === d ? 'bg-primary/15 text-primary ring-1 ring-primary/25' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Dimensions */}
      <GlassPanel>
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          {language === 'bn' ? 'ডাইমেনশন' : 'Dimensions'} <span className="text-primary">({unitLabel})</span>
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <MoveHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input type="number" min={stepVal} step={stepVal} value={displayW} onChange={e => onDisplayW(+e.target.value)} className="h-9 text-sm pl-8 bg-background/50" placeholder="Width" />
          </div>
          <div className="relative">
            <MoveVertical className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input type="number" min={stepVal} step={stepVal} value={displayH} onChange={e => onDisplayH(+e.target.value)} className="h-9 text-sm pl-8 bg-background/50" placeholder="Height" />
          </div>
        </div>
        {unit !== 'px' && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">{width}×{height} px @ {dpi} DPI</p>
        )}
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
const CropControls = ({ language, cropW, cropH, canCrop, onCrop, hasResult, onRecrop }: {
  language: string; cropW: number; cropH: number; canCrop: boolean; onCrop: () => void; hasResult: boolean; onRecrop: () => void;
}) => (
  <div className="space-y-4">
    <GlassPanel>
      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
        {language === 'bn' ? 'ক্রপ এরিয়া' : 'Crop Area'}
      </Label>
      {hasResult ? (
        <div className="space-y-2">
          <p className="text-xs text-green-600 font-medium">
            ✅ {language === 'bn' ? 'ক্রপ সফল হয়েছে!' : 'Crop successful!'}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' ? 'নতুন করে ক্রপ করতে নিচের বাটনে ক্লিক করুন' : 'Click below to crop again'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'bn' ? 'ছবির উপর ড্র্যাগ করে ক্রপ এরিয়া সিলেক্ট করুন' : 'Drag on the image to select crop area'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <RulerIcon className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'সাইজ:' : 'Size:'} {cropW}×{cropH}px</span>
          </div>
        </>
      )}
    </GlassPanel>
    {hasResult ? (
      <Button className="w-full h-10 text-sm font-semibold rounded-xl" variant="outline" onClick={onRecrop}>
        <RefreshCw className="w-4 h-4 mr-2" />
        {language === 'bn' ? 'আবার ক্রপ করুন' : 'Crop Again'}
      </Button>
    ) : (
      <Button className="w-full h-10 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={onCrop} disabled={!canCrop}>
        <Crop className="w-4 h-4 mr-2" />
        {language === 'bn' ? 'ক্রপ করুন' : 'Crop Image'}
      </Button>
    )}
  </div>
);

// ─── BG Remove Controls ───
const BG_MODES = [
  { key: 'auto', labelBn: 'অটো', labelEn: 'Auto', descBn: 'AI স্বয়ংক্রিয়ভাবে চিনবে', descEn: 'AI auto-detects subject' },
  { key: 'person', labelBn: 'ব্যক্তি', labelEn: 'Person', descBn: 'মানুষের ছবি থেকে BG রিমুভ', descEn: 'Person/portrait cutout' },
  { key: 'object', labelBn: 'অবজেক্ট', labelEn: 'Object', descBn: 'পণ্য/বস্তু থেকে BG রিমুভ', descEn: 'Product/object cutout' },
  { key: 'design', labelBn: 'ডিজাইন', labelEn: 'Design', descBn: 'ব্যানার/গ্রাফিক্সের BG রিমুভ', descEn: 'Banner/graphic BG remove' },
];

const BgRemoveControls = ({ language, processing, onRemove, downloadFormat, onFormatChange, bgResult, onDownload, mode, onModeChange }: {
  language: string; processing: boolean; onRemove: () => void;
  downloadFormat: string; onFormatChange: (f: string) => void;
  bgResult: string | null; onDownload: () => void;
  mode: string; onModeChange: (m: string) => void;
}) => (
  <div className="space-y-4">
    <GlassPanel>
      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
        {language === 'bn' ? 'রিমুভ মোড' : 'Removal Mode'}
      </Label>
      <div className="grid grid-cols-2 gap-1.5">
        {BG_MODES.map(m => (
          <button
            key={m.key}
            onClick={() => onModeChange(m.key)}
            className={`py-2 px-2 rounded-lg text-left transition-all duration-200 border ${
              mode === m.key
                ? 'bg-primary/10 border-primary/40 shadow-sm'
                : 'bg-muted/20 border-border/20 hover:bg-muted/40'
            }`}
          >
            <span className={`text-[11px] font-semibold block ${mode === m.key ? 'text-primary' : 'text-foreground'}`}>
              {language === 'bn' ? m.labelBn : m.labelEn}
            </span>
            <span className="text-[9px] text-muted-foreground leading-tight block">
              {language === 'bn' ? m.descBn : m.descEn}
            </span>
          </button>
        ))}
      </div>
    </GlassPanel>
    <Button className="w-full h-10 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={onRemove} disabled={processing}>
      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eraser className="w-4 h-4 mr-2" />}
      {language === 'bn' ? (processing ? 'AI প্রসেসিং... (১০-৩০s)' : 'ব্যাকগ্রাউন্ড রিমুভ') : (processing ? 'AI Processing...' : 'Remove Background')}
    </Button>
    {bgResult && (
      <GlassPanel>
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          {language === 'bn' ? 'ডাউনলোড ফরম্যাট' : 'Download Format'}
        </Label>
        <div className="flex gap-1.5 mb-3">
          {['png', 'jpeg', 'webp', 'svg'].map(fmt => (
            <button
              key={fmt}
              onClick={() => onFormatChange(fmt)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                downloadFormat === fmt
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
        <Button className="w-full h-9 text-xs font-semibold rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-md shadow-green-600/20" onClick={onDownload}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {language === 'bn' ? `${downloadFormat.toUpperCase()} ডাউনলোড` : `Download ${downloadFormat.toUpperCase()}`}
        </Button>
      </GlassPanel>
    )}
  </div>
);

// ─── Canvas Preview (with crop support) ───
const CanvasPreview = ({ preview, resultUrl, activeTab, language, onCropData, showOriginal }: {
  preview: string;
  resultUrl: string | null;
  activeTab: string;
  language: string;
  onCropData: (data: { x: number; y: number; w: number; h: number; scale: number }) => void;
  showOriginal: boolean;
}) => {
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [displayScale, setDisplayScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (resultUrl && !showOriginal) {
      setCropBox({ x: 0, y: 0, w: 0, h: 0 });
      setDragging(false);
    }
  }, [resultUrl, showOriginal]);

  const imgLoaded = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const natW = el.naturalWidth;
    const scale = el.width / natW;
    setDisplayScale(scale);
    setCropBox({ x: 0, y: 0, w: 0, h: 0 });
  }, []);

  const getImageRelativeCoords = (e: React.MouseEvent) => {
    // Use the wrapper div (e.currentTarget) since img has pointer-events-none
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== 'crop' || (resultUrl && !showOriginal)) return;
    e.preventDefault();
    const { x, y } = getImageRelativeCoords(e);
    setDragging(true);
    setDragStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || activeTab !== 'crop' || (resultUrl && !showOriginal)) return;
    e.preventDefault();
    const { x, y } = getImageRelativeCoords(e);
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

  const isShowingResult = !!resultUrl && !showOriginal;
  const isCropMode = activeTab === 'crop';
  const isInteractiveCropMode = isCropMode && !isShowingResult;
  const isBgRemoveResult = activeTab === 'bg-remove' && isShowingResult;
  const displayUrl = isShowingResult ? resultUrl : preview;
  const previewBackground = isBgRemoveResult
    ? 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.92) 100%), repeating-conic-gradient(hsl(var(--foreground) / 0.12) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 18px 18px'
    : 'repeating-conic-gradient(hsl(var(--muted) / 0.5) 0% 25%, transparent 0% 50%) 50% / 20px 20px';

  return (
    <div className="relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden"
      style={{ background: previewBackground }}
    >
      <div
        className={`relative ${isInteractiveCropMode ? 'cursor-crosshair' : ''}`}
        style={{ display: 'inline-block', userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (dragging) { setDragging(false); onCropData({ ...cropBox, scale: displayScale }); } }}
        onDragStart={e => e.preventDefault()}
      >
        <img
          ref={imgRef}
          src={displayUrl}
          alt="Preview"
          onLoad={imgLoaded}
          className="max-w-full max-h-[45vh] lg:max-h-[55vh] object-contain select-none pointer-events-none"
          style={isBgRemoveResult ? { filter: 'drop-shadow(0 1px 1px hsl(var(--foreground) / 0.18)) drop-shadow(0 0 10px hsl(var(--foreground) / 0.08))' } : undefined}
          draggable={false}
        />
        {isInteractiveCropMode && cropBox.w > 0 && cropBox.h > 0 && (
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
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white rounded-full shadow" />
            </div>
          </>
        )}
      </div>

      {/* Preview label */}
      {resultUrl && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-medium bg-background/80 backdrop-blur-sm border border-border/30 text-muted-foreground">
          {showOriginal ? (language === 'bn' ? '🔵 মূল ছবি' : '🔵 Original') : (language === 'bn' ? '🟢 ফলাফল' : '🟢 Result')}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───
export const PhotoToolsCore = ({ language, onReset: externalReset }: { language: string; onReset?: () => void }) => {
  const [preview, setPreview] = useState('');
  const [previewObjUrl, setPreviewObjUrl] = useState('');
  const [originalInfo, setOriginalInfo] = useState({ width: 0, height: 0, size: 0 });
  const [activeTab, setActiveTab] = useState<'resize' | 'crop' | 'bg-remove'>('resize');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; size: number; w: number; h: number; format?: 'jpeg' | 'png' | 'webp' } | null>(null);
  const [bgResult, setBgResult] = useState<string | null>(null);
  const [cropData, setCropData] = useState<{ x: number; y: number; w: number; h: number; scale: number } | null>(null);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [bgDownloadFormat, setBgDownloadFormat] = useState('png');
  const [bgMode, setBgMode] = useState('auto');

  const handleFile = (f: File) => {
    const objUrl = URL.createObjectURL(f);
    setPreview(objUrl);
    setPreviewObjUrl(objUrl);
    const img = new window.Image();
    img.onload = () => setOriginalInfo({ width: img.width, height: img.height, size: f.size });
    img.src = objUrl;
  };

  const reset = () => {
    setPreview(''); setOriginalInfo({ width: 0, height: 0, size: 0 });
    setResult(null); setBgResult(null); setCropData(null); setShowOriginal(false);
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
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const makeBlob = (q?: number) => new Promise<Blob | null>((resolve) => {
          c.toBlob(resolve, `image/${format}`, q);
        });

        let blob: Blob | null = null;

        if (format === 'png') {
          blob = await makeBlob();
        } else {
          // Try user-requested quality first, then progressively lower
          let q = quality / 100;
          blob = await makeBlob(q);
          
          // If still bigger than original, keep lowering quality
          while (blob && blob.size >= originalInfo.size && q > 0.1) {
            q -= 0.1;
            blob = await makeBlob(Math.max(0.05, q));
          }
        }

        if (blob) {
          setResult({ url: URL.createObjectURL(blob), size: blob.size, w: width, h: height, format });
          setShowOriginal(false);
          const saved = originalInfo.size - blob.size;
          const pct = Math.round((1 - blob.size / originalInfo.size) * 100);
          if (saved > 0) {
            toast.success(language === 'bn' 
              ? `✅ ${formatSize(originalInfo.size)} → ${formatSize(blob.size)} (${pct}% কমেছে)` 
              : `✅ ${formatSize(originalInfo.size)} → ${formatSize(blob.size)} (${pct}% smaller)`);
          } else {
            toast.info(language === 'bn'
              ? `আউটপুট: ${formatSize(blob.size)} — সাইজ বাড়তে পারে PNG বা বড় ডাইমেনশনে`
              : `Output: ${formatSize(blob.size)} — Size may increase with PNG or larger dimensions`);
          }
        } else {
          toast.error(language === 'bn' ? 'প্রসেস ব্যর্থ হয়েছে' : 'Processing failed');
        }
      } catch (err) {
        console.error('Resize error:', err);
        toast.error(language === 'bn' ? 'প্রসেস ব্যর্থ হয়েছে' : 'Processing failed');
      } finally {
        setProcessing(false);
      }
    };
    img.onerror = () => {
      toast.error(language === 'bn' ? 'ছবি লোড ব্যর্থ' : 'Image load failed');
      setProcessing(false);
    };
    // Use object URL instead of base64 for better canvas encoding
    img.src = previewObjUrl || preview;
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
        if (blob) {
          setResult({ url: URL.createObjectURL(blob), size: blob.size, w: canvas.width, h: canvas.height });
          setShowOriginal(false);
          setCropData(null);
          setCropW(0);
          setCropH(0);
        }
        setProcessing(false);
      }, 'image/png');
    };
    img.src = preview;
  };

  // ── BG Remove logic (preserved) ──
  const removeBg = async () => {
    setProcessing(true);
    try {
      // Convert blob URL to base64 for the edge function
      const resp = await fetch(preview);
      const blob = await resp.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const { data, error } = await supabase.functions.invoke('remove-bg', { body: { image_base64: base64, mode: bgMode } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setProcessing(false); return; }
      if (data?.image) { setBgResult(data.image); toast.success(language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ সফল!' : 'Background removed!'); }
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setProcessing(false);
  };

  const downloadBgResult = () => {
    if (!bgResult) return;
    const fmt = bgDownloadFormat;
    if (fmt === 'png') {
      const a = document.createElement('a'); a.href = bgResult; a.download = `no-bg-${Date.now()}.png`; a.click();
      return;
    }
    // Convert base64 PNG to other formats via canvas
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      if (fmt === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      if (fmt === 'svg') {
        const dataUrl = canvas.toDataURL('image/png');
        const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}"><image href="${dataUrl}" width="${img.width}" height="${img.height}"/></svg>`;
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `no-bg-${Date.now()}.svg`; a.click();
        URL.revokeObjectURL(url);
      } else {
        const mime = fmt === 'jpeg' ? 'image/jpeg' : 'image/webp';
        canvas.toBlob(blob => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `no-bg-${Date.now()}.${fmt === 'jpeg' ? 'jpg' : fmt}`; a.click();
          URL.revokeObjectURL(url);
        }, mime, 0.95);
      }
    };
    img.src = bgResult;
  };

  const download = () => {
    if (activeTab === 'bg-remove') { downloadBgResult(); return; }
    const url = result?.url;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'crop'
      ? 'cropped.png'
      : `resized.${result?.format || 'jpg'}`;
    a.click();
  };

  const currentResultUrl = activeTab === 'bg-remove' ? bgResult : result?.url || null;
  const hasResult = !!currentResultUrl;

  if (!preview) return <ImageUploadArea onFile={handleFile} language={language} />;

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[40vh]">
      {/* ─── Left: Canvas ─── */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="relative flex-1 min-h-[200px] rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden lg:sticky lg:top-4">
          {processing && <ProcessingOverlay language={language} />}
          <CanvasPreview
            preview={preview}
            resultUrl={currentResultUrl}
            activeTab={activeTab}
            language={language}
            onCropData={handleCropData}
            showOriginal={showOriginal}
          />
          {/* Preview toggle button */}
          {hasResult && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-background/80 backdrop-blur-sm border border-border/30 text-foreground hover:bg-background/95 transition-all duration-200 shadow-sm"
            >
              {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showOriginal ? (language === 'bn' ? 'ফলাফল দেখুন' : 'Show Result') : (language === 'bn' ? 'মূল ছবি দেখুন' : 'Show Original')}
            </button>
          )}
        </div>

        {/* File size info bar - always visible */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/30 bg-card/70 backdrop-blur-xl">
          <div className="flex flex-col gap-1 text-xs">
            {/* Original size */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <span>{language === 'bn' ? 'মূল:' : 'Original:'} {originalInfo.width}×{originalInfo.height}px • <strong>{formatSize(originalInfo.size)}</strong></span>
            </div>
            {/* Result size */}
            {result && activeTab !== 'bg-remove' && (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                <span className="text-foreground font-medium">
                  {language === 'bn' ? 'আউটপুট:' : 'Output:'} {result.w}×{result.h}px • <strong>{formatSize(result.size)}</strong>
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${result.size < originalInfo.size ? 'bg-green-500/15 text-green-600' : 'bg-orange-500/15 text-orange-500'}`}>
                  {result.size < originalInfo.size
                    ? `↓ ${Math.round((1 - result.size / originalInfo.size) * 100)}% ${language === 'bn' ? 'কমেছে' : 'smaller'}`
                    : `↑ ${Math.round((result.size / originalInfo.size - 1) * 100)}% ${language === 'bn' ? 'বেড়েছে' : 'larger'}`}
                </span>
              </div>
            )}
            {activeTab === 'bg-remove' && bgResult && (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                <span className="text-foreground font-medium">{language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ সম্পন্ন' : 'Background removed'}</span>
              </div>
            )}
          </div>
          {hasResult && (
            <Button
              size="sm"
              onClick={download}
              className="h-8 px-4 text-xs font-semibold rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-md shadow-green-600/20 transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {language === 'bn' ? 'ডাউনলোড' : 'Download'}
            </Button>
          )}
        </div>
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
        <div className="flex-1 overflow-y-auto lg:max-h-[calc(60vh-60px)] pr-0.5 custom-scrollbar">
          {activeTab === 'resize' && (
            <ResizeControls originalInfo={originalInfo} language={language} onProcess={processResize} processing={processing} />
          )}
          {activeTab === 'crop' && (
            <CropControls language={language} cropW={cropW} cropH={cropH} canCrop={!!(cropData && cropData.w >= 5)} onCrop={doCrop} hasResult={!!result} onRecrop={() => { setResult(null); setCropData(null); setCropW(0); setCropH(0); setShowOriginal(false); }} />
          )}
          {activeTab === 'bg-remove' && (
            <BgRemoveControls language={language} processing={processing} onRemove={removeBg} downloadFormat={bgDownloadFormat} onFormatChange={setBgDownloadFormat} bgResult={bgResult} onDownload={downloadBgResult} mode={bgMode} onModeChange={setBgMode} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoToolsCore;
