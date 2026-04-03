import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  shape?: 'square' | 'circle';
  outputSize?: number;
}

const ImageCropDialog = ({ open, onOpenChange, imageSrc, onCrop, shape = 'square', outputSize = 256 }: ImageCropDialogProps) => {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const CANVAS_SIZE = 250;

  useEffect(() => {
    if (!imageSrc || !open) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = imageSrc;
    return () => { setImgLoaded(false); };
  }, [imageSrc, open]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Fill bg
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate scaled dimensions to fit
    const minDim = Math.min(img.width, img.height);
    const fitScale = CANVAS_SIZE / minDim;
    const drawW = img.width * fitScale * scale;
    const drawH = img.height * fitScale * scale;
    const dx = (CANVAS_SIZE - drawW) / 2 + offset.x;
    const dy = (CANVAS_SIZE - drawH) / 2 + offset.y;

    ctx.drawImage(img, dx, dy, drawW, drawH);
  }, [scale, offset, imgLoaded]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  const handleCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outputSize;
    outCanvas.height = outputSize;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    const minDim = Math.min(img.width, img.height);
    const fitScale = CANVAS_SIZE / minDim;
    const ratio = outputSize / CANVAS_SIZE;
    const drawW = img.width * fitScale * scale * ratio;
    const drawH = img.height * fitScale * scale * ratio;
    const dx = (outputSize - drawW) / 2 + offset.x * ratio;
    const dy = (outputSize - drawH) / 2 + offset.y * ratio;

    ctx.drawImage(img, dx, dy, drawW, drawH);

    outCanvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/png');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{language === 'bn' ? 'ছবি ক্রপ করুন' : 'Crop Image'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden border-2 border-border bg-muted"
            style={{
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              borderRadius: shape === 'circle' ? '50%' : '8px',
              cursor: dragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="block" />
          </div>
          <div className="flex items-center gap-3 w-full max-w-[250px]">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[scale]}
              min={0.5}
              max={3}
              step={0.05}
              onValueChange={([v]) => setScale(v)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>
              <RotateCw className="w-3 h-3 mr-1" /> {language === 'bn' ? 'রিসেট' : 'Reset'}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button className="btn-primary-gradient" onClick={handleCrop}>
            <Check className="w-4 h-4 mr-1" /> {language === 'bn' ? 'ক্রপ করুন' : 'Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;
