import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Loader2, RotateCw, Trash2, Crop, Eraser, Maximize, ImageIcon, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

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
    <div className="max-w-lg mx-auto">
      <label
        className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
          dragOver
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Upload className="w-7 h-7 text-primary" />
        </div>
        <span className="text-base font-semibold text-foreground">
          {language === 'bn' ? 'ছবি আপলোড করুন' : 'Upload an Image'}
        </span>
        <span className="text-xs text-muted-foreground mt-1.5">
          {language === 'bn' ? 'ড্র্যাগ করুন অথবা ক্লিক করুন' : 'Drag & drop or click to browse'}
        </span>
        <span className="text-[11px] text-muted-foreground/60 mt-1">JPG, PNG, WebP</span>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
    </div>
  );
};

// ─── Resize Tab ───
const ResizeTab = ({ preview, originalInfo, language, onReset }: { preview: string; originalInfo: { width: number; height: number; size: number }; language: string; onReset: () => void }) => {
  const [width, setWidth] = useState(originalInfo.width);
  const [height, setHeight] = useState(originalInfo.height);
  const [keepRatio, setKeepRatio] = useState(true);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; size: number; w: number; h: number } | null>(null);

  const onW = (v: number) => { setWidth(v); if (keepRatio && originalInfo.width) setHeight(Math.round((v / originalInfo.width) * originalInfo.height)); };
  const onH = (v: number) => { setHeight(v); if (keepRatio && originalInfo.height) setWidth(Math.round((v / originalInfo.height) * originalInfo.width)); };

  const process = () => {
    setProcessing(true);
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      c.toBlob(blob => { if (blob) setResult({ url: URL.createObjectURL(blob), size: blob.size, w: width, h: height }); setProcessing(false); }, `image/${format}`, format === 'png' ? undefined : quality / 100);
    };
    img.src = preview;
  };

  const download = () => { if (!result) return; const a = document.createElement('a'); a.href = result.url; a.download = `resized.${format}`; a.click(); };

  const presets = [
    { l: '50%', f: .5 }, { l: '75%', f: .75 }, { l: '150%', f: 1.5 },
    { l: '256px', s: 256 }, { l: '512px', s: 512 }, { l: '1024px', s: 1024 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Controls */}
      <div className="lg:col-span-2 space-y-3">
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{originalInfo.width}×{originalInfo.height} • {formatSize(originalInfo.size)}</span>
            </div>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={onReset}>
              <Trash2 className="w-3 h-3 mr-1" />{language === 'bn' ? 'নতুন' : 'New'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">{language === 'bn' ? 'প্রস্থ (px)' : 'Width (px)'}</Label>
              <Input type="number" min={1} value={width} onChange={e => onW(+e.target.value)} className="h-8 text-sm mt-0.5" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{language === 'bn' ? 'উচ্চতা (px)' : 'Height (px)'}</Label>
              <Input type="number" min={1} value={height} onChange={e => onH(+e.target.value)} className="h-8 text-sm mt-0.5" />
            </div>
          </div>

          <button
            onClick={() => setKeepRatio(!keepRatio)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${keepRatio ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
          >
            {keepRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {language === 'bn' ? 'অনুপাত লক' : 'Lock ratio'}
          </button>

          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <Button key={p.l} size="sm" variant="outline" className="h-6 px-2 text-[11px] rounded-md" onClick={() => {
                if ('f' in p) { setWidth(Math.round(originalInfo.width * p.f)); setHeight(Math.round(originalInfo.height * p.f)); }
                else { const r = originalInfo.width / originalInfo.height; if (r >= 1) { setWidth(p.s); setHeight(Math.round(p.s / r)); } else { setHeight(p.s); setWidth(Math.round(p.s * r)); } }
              }}>{p.l}</Button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs">{language === 'bn' ? 'কোয়ালিটি' : 'Quality'}</Label>
              <span className="text-xs font-mono text-primary">{quality}%</span>
            </div>
            <Slider value={[quality]} min={10} max={100} step={5} onValueChange={([v]) => setQuality(v)} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">{language === 'bn' ? 'ফরম্যাট' : 'Format'}</Label>
            <Select value={format} onValueChange={v => setFormat(v as any)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full h-9 text-sm font-medium bg-primary hover:bg-primary/90" onClick={process} disabled={processing}>
            {processing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5 mr-1.5" />}
            {language === 'bn' ? 'প্রসেস করুন' : 'Process'}
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</h3>
        <div className="rounded-lg overflow-hidden bg-muted/30 border border-border/30 flex items-center justify-center" style={{ minHeight: 180 }}>
          <img src={result?.url || preview} alt="" className="max-w-full max-h-[280px] object-contain" />
        </div>
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 text-xs">
              <span>{result.w}×{result.h}px • {formatSize(result.size)}</span>
              <span className={`font-semibold ${result.size < originalInfo.size ? 'text-green-600' : 'text-orange-500'}`}>
                {result.size < originalInfo.size ? `↓ ${Math.round((1 - result.size / originalInfo.size) * 100)}% ছোট` : `↑ ${Math.round((result.size / originalInfo.size - 1) * 100)}% বড়`}
              </span>
            </div>
            <Button className="w-full h-9 text-sm bg-primary hover:bg-primary/90" onClick={download}>
              <Download className="w-3.5 h-3.5 mr-1.5" />{language === 'bn' ? 'ডাউনলোড' : 'Download'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Crop Tab ───
const CropTab = ({ preview, originalInfo, language, onReset }: { preview: string; originalInfo: { width: number; height: number; size: number }; language: string; onReset: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [result, setResult] = useState<{ url: string; size: number; w: number; h: number } | null>(null);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);

  const imgLoaded = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    setImgEl(el);
    const scale = el.width / originalInfo.width;
    setDisplayScale(scale);
    setCropBox({ x: el.width * 0.1, y: el.height * 0.1, w: el.width * 0.8, h: el.height * 0.8 });
    setCropW(Math.round(originalInfo.width * 0.8));
    setCropH(Math.round(originalInfo.height * 0.8));
  }, [originalInfo]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragging(true);
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    setDragStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const newBox = { x: Math.min(dragStart.x, x), y: Math.min(dragStart.y, y), w: Math.abs(x - dragStart.x), h: Math.abs(y - dragStart.y) };
    setCropBox(newBox);
    if (displayScale > 0) { setCropW(Math.round(newBox.w / displayScale)); setCropH(Math.round(newBox.h / displayScale)); }
  };

  const handleMouseUp = () => setDragging(false);

  const doCrop = () => {
    if (!imgEl || cropBox.w < 5 || cropBox.h < 5) { toast.error(language === 'bn' ? 'ক্রপ এরিয়া সিলেক্ট করুন' : 'Select crop area'); return; }
    const sx = cropBox.x / displayScale, sy = cropBox.y / displayScale, sw = cropBox.w / displayScale, sh = cropBox.h / displayScale;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw); canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d')!;
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { if (blob) setResult({ url: URL.createObjectURL(blob), size: blob.size, w: canvas.width, h: canvas.height }); }, 'image/png');
    };
    img.src = preview;
  };

  const download = () => { if (!result) return; const a = document.createElement('a'); a.href = result.url; a.download = 'cropped.png'; a.click(); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">{language === 'bn' ? 'ক্রপ এরিয়া সিলেক্ট' : 'Select Crop Area'}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{language === 'bn' ? 'ছবির উপর ড্র্যাগ করুন' : 'Drag on image to select'}</p>
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={onReset}><Trash2 className="w-3 h-3" /></Button>
        </div>
        <div
          ref={containerRef}
          className="relative inline-block cursor-crosshair select-none rounded-lg overflow-hidden border border-border/30"
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
          <img src={preview} alt="" onLoad={imgLoaded} className="max-w-full max-h-[280px] block" draggable={false} />
          {cropBox.w > 0 && cropBox.h > 0 && (
            <>
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              <div className="absolute border-2 border-white/90 pointer-events-none rounded-sm" style={{ left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{language === 'bn' ? 'ক্রপ সাইজ:' : 'Crop:'} {cropW}×{cropH}px</span>
          <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={doCrop} disabled={cropBox.w < 5}>
            <Crop className="w-3 h-3 mr-1" /> {language === 'bn' ? 'ক্রপ' : 'Crop'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">{language === 'bn' ? 'ক্রপ রেজাল্ট' : 'Cropped Result'}</h3>
        {result ? (
          <>
            <div className="rounded-lg overflow-hidden bg-muted/30 border border-border/30 flex items-center justify-center" style={{ minHeight: 180 }}>
              <img src={result.url} alt="" className="max-w-full max-h-[280px] object-contain" />
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs">{result.w}×{result.h}px • {formatSize(result.size)}</div>
            <Button className="w-full h-9 text-sm bg-primary hover:bg-primary/90" onClick={download}><Download className="w-3.5 h-3.5 mr-1.5" />{language === 'bn' ? 'ডাউনলোড' : 'Download'}</Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Crop className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-xs">{language === 'bn' ? 'ক্রপ এরিয়া সিলেক্ট করে ক্রপ করুন' : 'Select area and crop'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Background Remove Tab ───
const BgRemoveTab = ({ preview, language, onReset }: { preview: string; language: string; onReset: () => void }) => {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const removeBg = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('remove-bg', { body: { image_base64: preview } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setProcessing(false); return; }
      if (data?.image) { setResult(data.image); toast.success(language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ সফল!' : 'Background removed!'); }
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setProcessing(false);
  };

  const download = () => { if (!result) return; const a = document.createElement('a'); a.href = result; a.download = `no-bg-${Date.now()}.png`; a.click(); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{language === 'bn' ? 'মূল ছবি' : 'Original'}</h3>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={onReset}><Trash2 className="w-3 h-3" /></Button>
        </div>
        <div className="rounded-lg overflow-hidden bg-muted/30 border border-border/30 flex items-center justify-center" style={{ minHeight: 180 }}>
          <img src={preview} alt="" className="max-w-full max-h-[280px] object-contain" />
        </div>
        <Button className="w-full h-9 text-sm bg-primary hover:bg-primary/90" onClick={removeBg} disabled={processing}>
          {processing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5 mr-1.5" />}
          {language === 'bn' ? (processing ? 'প্রসেসিং... (১০-৩০s)' : 'ব্যাকগ্রাউন্ড রিমুভ') : (processing ? 'Processing...' : 'Remove Background')}
        </Button>
      </div>
      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">{language === 'bn' ? 'রেজাল্ট' : 'Result'}</h3>
        {result ? (
          <>
            <div className="rounded-lg overflow-hidden flex items-center justify-center border border-border/30" style={{ minHeight: 180, background: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 16px 16px' }}>
              <img src={result} alt="" className="max-w-full max-h-[280px] object-contain" />
            </div>
            <Button className="w-full h-9 text-sm bg-primary hover:bg-primary/90" onClick={download}><Download className="w-3.5 h-3.5 mr-1.5" />{language === 'bn' ? 'ডাউনলোড (PNG)' : 'Download (PNG)'}</Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Eraser className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-xs">
              {processing ? (language === 'bn' ? 'AI প্রসেস করছে...' : 'AI processing...') : (language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ করতে ক্লিক করুন' : 'Click remove to start')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───
export const PhotoToolsCore = ({ language, onReset: externalReset }: { language: string; onReset?: () => void }) => {
  const [preview, setPreview] = useState('');
  const [originalInfo, setOriginalInfo] = useState({ width: 0, height: 0, size: 0 });

  const handleFile = (f: File, src: string) => {
    setPreview(src);
    const img = new window.Image();
    img.onload = () => setOriginalInfo({ width: img.width, height: img.height, size: f.size });
    img.src = src;
  };

  const reset = () => { setPreview(''); setOriginalInfo({ width: 0, height: 0, size: 0 }); externalReset?.(); };

  if (!preview) return <ImageUploadArea onFile={handleFile} language={language} />;

  return (
    <Tabs defaultValue="resize" className="space-y-3">
      <TabsList className="h-9 p-0.5 bg-muted/60 rounded-lg w-full max-w-sm">
        <TabsTrigger value="resize" className="text-xs h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
          <Maximize className="w-3.5 h-3.5" />{language === 'bn' ? 'রিসাইজ' : 'Resize'}
        </TabsTrigger>
        <TabsTrigger value="crop" className="text-xs h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
          <Crop className="w-3.5 h-3.5" />{language === 'bn' ? 'ক্রপ' : 'Crop'}
        </TabsTrigger>
        <TabsTrigger value="bg-remove" className="text-xs h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
          <Eraser className="w-3.5 h-3.5" />{language === 'bn' ? 'ব্যাকগ্রাউন্ড' : 'BG Remove'}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="resize"><ResizeTab preview={preview} originalInfo={originalInfo} language={language} onReset={reset} /></TabsContent>
      <TabsContent value="crop"><CropTab preview={preview} originalInfo={originalInfo} language={language} onReset={reset} /></TabsContent>
      <TabsContent value="bg-remove"><BgRemoveTab preview={preview} language={language} onReset={reset} /></TabsContent>
    </Tabs>
  );
};

export default PhotoToolsCore;
