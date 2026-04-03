import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Loader2, RotateCw, Trash2, Crop, Eraser, Maximize } from 'lucide-react';
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
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) { toast.error('Only image files'); return; }
    const reader = new FileReader();
    reader.onload = () => onFile(f, reader.result as string);
    reader.readAsDataURL(f);
  };
  return (
    <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-xl bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors">
      <Upload className="w-12 h-12 text-muted-foreground mb-3" />
      <span className="text-lg font-medium text-foreground">{language === 'bn' ? 'ছবি নির্বাচন করুন' : 'Select an Image'}</span>
      <span className="text-sm text-muted-foreground mt-1">JPG, PNG, WebP</span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </label>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{language === 'bn' ? 'রিসাইজ সেটিংস' : 'Resize Settings'}</h3>
          <Button size="sm" variant="ghost" onClick={onReset}><Trash2 className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন' : 'New'}</Button>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-sm">
          <p>{originalInfo.width} × {originalInfo.height}px • {formatSize(originalInfo.size)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">{language === 'bn' ? 'প্রস্থ' : 'W'}</Label><Input type="number" min={1} value={width} onChange={e => onW(+e.target.value)} className="bg-background mt-1" /></div>
          <div><Label className="text-xs">{language === 'bn' ? 'উচ্চতা' : 'H'}</Label><Input type="number" min={1} value={height} onChange={e => onH(+e.target.value)} className="bg-background mt-1" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={keepRatio} onChange={e => setKeepRatio(e.target.checked)} className="rounded" />{language === 'bn' ? 'অনুপাত বজায়' : 'Keep ratio'}</label>
        <div className="flex flex-wrap gap-2">
          {[{ l: '50%', f: .5 }, { l: '75%', f: .75 }, { l: '150%', f: 1.5 }, { l: '256px', s: 256 }, { l: '512px', s: 512 }, { l: '1024px', s: 1024 }].map(p => (
            <Button key={p.l} size="sm" variant="outline" className="text-xs" onClick={() => {
              if ('f' in p) { setWidth(Math.round(originalInfo.width * p.f)); setHeight(Math.round(originalInfo.height * p.f)); }
              else { const r = originalInfo.width / originalInfo.height; if (r >= 1) { setWidth(p.s); setHeight(Math.round(p.s / r)); } else { setHeight(p.s); setWidth(Math.round(p.s * r)); } }
            }}>{p.l}</Button>
          ))}
        </div>
        <div><Label>{language === 'bn' ? `কোয়ালিটি: ${quality}%` : `Quality: ${quality}%`}</Label><Slider value={[quality]} min={10} max={100} step={5} onValueChange={([v]) => setQuality(v)} className="mt-2" /></div>
        <Select value={format} onValueChange={v => setFormat(v as any)}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jpeg">JPEG</SelectItem><SelectItem value="png">PNG</SelectItem><SelectItem value="webp">WebP</SelectItem></SelectContent></Select>
        <Button className="btn-primary-gradient w-full" onClick={process} disabled={processing}>
          {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}{language === 'bn' ? 'প্রসেস' : 'Process'}
        </Button>
      </div>
      <div className="card-elevated p-5 space-y-4">
        <h3 className="font-semibold text-foreground">{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</h3>
        <div className="border border-border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center" style={{ minHeight: 200 }}>
          <img src={result?.url || preview} alt="" className="max-w-full max-h-[350px] object-contain" />
        </div>
        {result && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm space-y-1">
              <p>{result.w} × {result.h}px • {formatSize(result.size)}</p>
              <p className={result.size < originalInfo.size ? 'text-green-600' : 'text-orange-500'}>
                {result.size < originalInfo.size ? `↓ ${Math.round((1 - result.size / originalInfo.size) * 100)}%` : `↑ ${Math.round((result.size / originalInfo.size - 1) * 100)}%`}
              </p>
            </div>
            <Button className="btn-primary-gradient w-full" onClick={download}><Download className="w-4 h-4 mr-2" />{language === 'bn' ? 'ডাউনলোড' : 'Download'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Crop Tab ───
const CropTab = ({ preview, originalInfo, language, onReset }: { preview: string; originalInfo: { width: number; height: number; size: number }; language: string; onReset: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragging(true);
    setDragStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const newBox = {
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    };
    setCropBox(newBox);
    if (displayScale > 0) {
      setCropW(Math.round(newBox.w / displayScale));
      setCropH(Math.round(newBox.h / displayScale));
    }
  };

  const handleMouseUp = () => setDragging(false);

  const doCrop = () => {
    if (!imgEl || cropBox.w < 5 || cropBox.h < 5) { toast.error(language === 'bn' ? 'ক্রপ এরিয়া সিলেক্ট করুন' : 'Select crop area'); return; }
    const sx = cropBox.x / displayScale;
    const sy = cropBox.y / displayScale;
    const sw = cropBox.w / displayScale;
    const sh = cropBox.h / displayScale;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d')!;

    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) setResult({ url: URL.createObjectURL(blob), size: blob.size, w: canvas.width, h: canvas.height });
      }, 'image/png');
    };
    img.src = preview;
  };

  const download = () => { if (!result) return; const a = document.createElement('a'); a.href = result.url; a.download = `cropped.png`; a.click(); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{language === 'bn' ? 'ক্রপ এরিয়া' : 'Crop Area'}</h3>
          <Button size="sm" variant="ghost" onClick={onReset}><Trash2 className="w-4 h-4 mr-1" /></Button>
        </div>
        <p className="text-xs text-muted-foreground">{language === 'bn' ? 'ছবির উপর ড্র্যাগ করে ক্রপ এরিয়া সিলেক্ট করুন' : 'Drag on the image to select crop area'}</p>
        <div
          ref={containerRef}
          className="relative inline-block cursor-crosshair select-none border border-border rounded-lg overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img src={preview} alt="" onLoad={imgLoaded} className="max-w-full max-h-[350px] block" draggable={false} />
          {cropBox.w > 0 && cropBox.h > 0 && (
            <>
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              <div
                className="absolute border-2 border-white pointer-events-none"
                style={{ left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
              />
            </>
          )}
        </div>
        <div className="p-2 rounded bg-secondary/50 text-sm">
          {language === 'bn' ? 'ক্রপ সাইজ:' : 'Crop:'} {cropW} × {cropH}px
        </div>
        <Button className="btn-primary-gradient w-full" onClick={doCrop} disabled={cropBox.w < 5}>
          <Crop className="w-4 h-4 mr-2" /> {language === 'bn' ? 'ক্রপ করুন' : 'Crop'}
        </Button>
      </div>
      <div className="card-elevated p-5 space-y-4">
        <h3 className="font-semibold text-foreground">{language === 'bn' ? 'ক্রপ রেজাল্ট' : 'Cropped Result'}</h3>
        {result ? (
          <>
            <div className="border border-border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center" style={{ minHeight: 200 }}>
              <img src={result.url} alt="" className="max-w-full max-h-[350px] object-contain" />
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <p>{result.w} × {result.h}px • {formatSize(result.size)}</p>
            </div>
            <Button className="btn-primary-gradient w-full" onClick={download}><Download className="w-4 h-4 mr-2" />{language === 'bn' ? 'ডাউনলোড' : 'Download'}</Button>
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {language === 'bn' ? 'ক্রপ এরিয়া সিলেক্ট করে ক্রপ করুন' : 'Select area and crop'}
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
      const { data, error } = await supabase.functions.invoke('remove-bg', {
        body: { image_base64: preview },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setProcessing(false);
        return;
      }
      if (data?.image) {
        setResult(data.image);
        toast.success(language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ সফল!' : 'Background removed!');
      }
    } catch (err: any) {
      toast.error(err.message || (language === 'bn' ? 'ব্যর্থ হয়েছে' : 'Failed'));
    }
    setProcessing(false);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = `no-bg-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{language === 'bn' ? 'মূল ছবি' : 'Original'}</h3>
          <Button size="sm" variant="ghost" onClick={onReset}><Trash2 className="w-4 h-4 mr-1" /></Button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center" style={{ minHeight: 200 }}>
          <img src={preview} alt="" className="max-w-full max-h-[350px] object-contain" />
        </div>
        <Button className="btn-primary-gradient w-full" onClick={removeBg} disabled={processing}>
          {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eraser className="w-4 h-4 mr-2" />}
          {language === 'bn' ? (processing ? 'প্রসেসিং... (১০-৩০ সেকেন্ড)' : 'ব্যাকগ্রাউন্ড রিমুভ') : (processing ? 'Processing... (10-30s)' : 'Remove Background')}
        </Button>
      </div>
      <div className="card-elevated p-5 space-y-4">
        <h3 className="font-semibold text-foreground">{language === 'bn' ? 'রেজাল্ট' : 'Result'}</h3>
        {result ? (
          <>
            <div className="border border-border rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 200, background: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}>
              <img src={result} alt="" className="max-w-full max-h-[350px] object-contain" />
            </div>
            <Button className="btn-primary-gradient w-full" onClick={download}><Download className="w-4 h-4 mr-2" />{language === 'bn' ? 'ডাউনলোড (PNG)' : 'Download (PNG)'}</Button>
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {processing
              ? (language === 'bn' ? 'AI প্রসেস করছে...' : 'AI processing...')
              : (language === 'bn' ? 'ব্যাকগ্রাউন্ড রিমুভ করতে বাটনে ক্লিক করুন' : 'Click remove to start')}
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

  if (!preview) {
    return <ImageUploadArea onFile={handleFile} language={language} />;
  }

  return (
    <Tabs defaultValue="resize" className="space-y-4">
      <TabsList className="grid grid-cols-3 w-full max-w-md">
        <TabsTrigger value="resize" className="flex items-center gap-1.5"><Maximize className="w-3.5 h-3.5" />{language === 'bn' ? 'রিসাইজ' : 'Resize'}</TabsTrigger>
        <TabsTrigger value="crop" className="flex items-center gap-1.5"><Crop className="w-3.5 h-3.5" />{language === 'bn' ? 'ক্রপ' : 'Crop'}</TabsTrigger>
        <TabsTrigger value="bg-remove" className="flex items-center gap-1.5"><Eraser className="w-3.5 h-3.5" />{language === 'bn' ? 'ব্যাকগ্রাউন্ড' : 'BG Remove'}</TabsTrigger>
      </TabsList>
      <TabsContent value="resize"><ResizeTab preview={preview} originalInfo={originalInfo} language={language} onReset={reset} /></TabsContent>
      <TabsContent value="crop"><CropTab preview={preview} originalInfo={originalInfo} language={language} onReset={reset} /></TabsContent>
      <TabsContent value="bg-remove"><BgRemoveTab preview={preview} language={language} onReset={reset} /></TabsContent>
    </Tabs>
  );
};

export default PhotoToolsCore;
