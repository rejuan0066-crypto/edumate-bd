import { fabric } from 'fabric';
import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface Props {
  selected: fabric.Object | null;
  canvasWidth: number;
  canvasHeight: number;
  canvasBackground: string;
  onCanvasResize: (w: number, h: number) => void;
  onCanvasBackground: (color: string) => void;
  onChange: () => void;
}

const FONT_FAMILIES = [
  'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Verdana', 'Roboto', 'Playfair Display', 'Montserrat',
];

const PropertiesPanel = ({
  selected,
  canvasWidth,
  canvasHeight,
  canvasBackground,
  onCanvasResize,
  onCanvasBackground,
  onChange,
}: Props) => {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  // Reflect external selection updates
  useEffect(() => {
    refresh();
  }, [selected]);

  const update = (fn: () => void) => {
    fn();
    onChange();
    refresh();
  };

  if (!selected) {
    return (
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Canvas</h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Width</Label>
              <Input
                type="number"
                value={canvasWidth}
                onChange={(e) => onCanvasResize(parseInt(e.target.value) || 100, canvasHeight)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Height</Label>
              <Input
                type="number"
                value={canvasHeight}
                onChange={(e) => onCanvasResize(canvasWidth, parseInt(e.target.value) || 100)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="mt-3">
            <Label className="text-[10px] text-muted-foreground">Background</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={canvasBackground}
                onChange={(e) => onCanvasBackground(e.target.value)}
                className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
              />
              <Input
                value={canvasBackground}
                onChange={(e) => onCanvasBackground(e.target.value)}
                className="h-8 text-xs flex-1"
              />
            </div>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-3">
          Select an object to edit its properties.
        </div>
      </div>
    );
  }

  const isText = selected.type === 'i-text' || selected.type === 'textbox' || selected.type === 'text';
  const isShape = !isText && selected.type !== 'image';
  const t = selected as any;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {((selected as any).layerName || selected.type || 'Object')}
      </h3>

      {/* Position & size */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">X</Label>
            <Input type="number" value={Math.round(selected.left || 0)}
              onChange={(e) => update(() => selected.set('left', parseFloat(e.target.value) || 0))}
              className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Y</Label>
            <Input type="number" value={Math.round(selected.top || 0)}
              onChange={(e) => update(() => selected.set('top', parseFloat(e.target.value) || 0))}
              className="h-8 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">W</Label>
            <Input type="number" value={Math.round((selected.width || 0) * (selected.scaleX || 1))}
              onChange={(e) => update(() => {
                const newW = parseFloat(e.target.value) || 1;
                selected.set('scaleX', newW / (selected.width || 1));
              })}
              className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">H</Label>
            <Input type="number" value={Math.round((selected.height || 0) * (selected.scaleY || 1))}
              onChange={(e) => update(() => {
                const newH = parseFloat(e.target.value) || 1;
                selected.set('scaleY', newH / (selected.height || 1));
              })}
              className="h-8 text-xs" />
          </div>
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground flex justify-between">
            <span>Rotation</span><span>{Math.round(selected.angle || 0)}°</span>
          </Label>
          <Slider min={-180} max={180} step={1}
            value={[selected.angle || 0]}
            onValueChange={(v) => update(() => selected.set('angle', v[0]))}
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground flex justify-between">
            <span>Opacity</span><span>{Math.round((selected.opacity ?? 1) * 100)}%</span>
          </Label>
          <Slider min={0} max={100} step={1}
            value={[(selected.opacity ?? 1) * 100]}
            onValueChange={(v) => update(() => selected.set('opacity', v[0] / 100))}
          />
        </div>
      </div>

      {/* Fill / stroke */}
      {(isShape || isText) && (
        <div className="space-y-2 pt-3 border-t border-border/50">
          <div>
            <Label className="text-[10px] text-muted-foreground">Fill</Label>
            <div className="flex gap-2 mt-1">
              <input type="color"
                value={(t.fill as string) || '#000000'}
                onChange={(e) => update(() => selected.set('fill', e.target.value))}
                className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
              />
              <Input value={(t.fill as string) || ''}
                onChange={(e) => update(() => selected.set('fill', e.target.value))}
                className="h-8 text-xs flex-1" />
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Stroke</Label>
            <div className="flex gap-2 mt-1">
              <input type="color"
                value={(t.stroke as string) || '#000000'}
                onChange={(e) => update(() => selected.set('stroke', e.target.value))}
                className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer"
              />
              <Input type="number" value={t.strokeWidth || 0} min={0}
                onChange={(e) => update(() => selected.set('strokeWidth', parseFloat(e.target.value) || 0))}
                className="h-8 text-xs flex-1" placeholder="Width" />
            </div>
          </div>
        </div>
      )}

      {/* Typography */}
      {isText && (() => {
        const tt = selected as any;
        return (
        <div className="space-y-2 pt-3 border-t border-border/50">
          <Label className="text-[10px] text-muted-foreground">Font</Label>
          <Select value={t.fontFamily || 'Inter'}
            onValueChange={(v) => update(() => tt.set('fontFamily', v))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Size</Label>
              <Input type="number" value={t.fontSize || 16}
                onChange={(e) => update(() => tt.set('fontSize', parseFloat(e.target.value) || 16))}
                className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Line H</Label>
              <Input type="number" step={0.1} value={t.lineHeight || 1.16}
                onChange={(e) => update(() => tt.set('lineHeight', parseFloat(e.target.value) || 1))}
                className="h-8 text-xs" />
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Letter spacing</Label>
            <Input type="number" value={t.charSpacing || 0}
              onChange={(e) => update(() => tt.set('charSpacing', parseFloat(e.target.value) || 0))}
              className="h-8 text-xs" />
          </div>

          <div className="flex gap-1">
            <Button size="sm" variant={t.fontWeight === 'bold' ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
              onClick={() => update(() => tt.set('fontWeight', t.fontWeight === 'bold' ? 'normal' : 'bold'))}>
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant={t.fontStyle === 'italic' ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
              onClick={() => update(() => tt.set('fontStyle', t.fontStyle === 'italic' ? 'normal' : 'italic'))}>
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant={t.underline ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
              onClick={() => update(() => tt.set('underline', !t.underline))}>
              <Underline className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px bg-border/50 mx-1" />
            <Button size="sm" variant={t.textAlign === 'left' ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
              onClick={() => update(() => tt.set('textAlign', 'left'))}>
              <AlignLeft className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant={t.textAlign === 'center' ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
              onClick={() => update(() => tt.set('textAlign', 'center'))}>
              <AlignCenter className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant={t.textAlign === 'right' ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
              onClick={() => update(() => tt.set('textAlign', 'right'))}>
              <AlignRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default PropertiesPanel;
