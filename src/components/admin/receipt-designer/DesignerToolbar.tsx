import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ReceiptElement, ReceiptDesignConfig, PAPER_SIZES, PLACEHOLDERS } from '@/hooks/useReceiptSettings';
import { Type, Hash, Square, Circle, Minus, Image, QrCode, Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface Props {
  config: ReceiptDesignConfig;
  selectedElement: ReceiptElement | null;
  onConfigChange: (updates: Partial<ReceiptDesignConfig>) => void;
  onUpdateElement: (id: string, updates: Partial<ReceiptElement>) => void;
  onAddElement: (type: ReceiptElement['type'], extra?: Partial<ReceiptElement>) => void;
  onDeleteElement: (id: string) => void;
}

const DesignerToolbar = ({ config, selectedElement, onConfigChange, onUpdateElement, onAddElement, onDeleteElement }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  return (
    <ScrollArea className="w-72 border-r bg-card flex-shrink-0 h-full">
      <div className="p-3 space-y-3">
        {/* Paper Size */}
        <Accordion type="multiple" defaultValue={['paper', 'add', 'selected']}>
          <AccordionItem value="paper">
            <AccordionTrigger className="text-sm font-semibold py-2">{bn ? 'পেপার সাইজ' : 'Paper Size'}</AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1">
              <Select value={config.paperSize} onValueChange={(v) => {
                const ps = PAPER_SIZES[v];
                if (ps) onConfigChange({ paperSize: v, receiptWidth: ps.width, receiptHeight: ps.height, receiptsPerPage: ps.receiptsPerPage });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAPER_SIZES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{bn ? v.labelBn : v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{bn ? 'প্রস্থ' : 'Width'}</Label>
                  <Input type="number" className="h-7 text-xs" value={config.receiptWidth} onChange={(e) => onConfigChange({ receiptWidth: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'উচ্চতা' : 'Height'}</Label>
                  <Input type="number" className="h-7 text-xs" value={config.receiptHeight} onChange={(e) => onConfigChange({ receiptHeight: Number(e.target.value) })} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">{bn ? 'ডুপ্লিকেট কপি' : 'Duplicate Copy'}</Label>
                <Switch checked={config.duplicateCopy} onCheckedChange={(v) => onConfigChange({ duplicateCopy: v })} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">{bn ? 'কাটিং লাইন' : 'Cut Lines'}</Label>
                <Switch checked={config.showCutLines} onCheckedChange={(v) => onConfigChange({ showCutLines: v })} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{bn ? 'ব্যাকগ্রাউন্ড' : 'Background'}</Label>
                  <Input type="color" className="h-7 p-0.5" value={config.bgColor} onChange={(e) => onConfigChange({ bgColor: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'বর্ডার' : 'Border'}</Label>
                  <Input type="color" className="h-7 p-0.5" value={config.borderColor} onChange={(e) => onConfigChange({ borderColor: e.target.value })} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Add Elements */}
          <AccordionItem value="add">
            <AccordionTrigger className="text-sm font-semibold py-2">{bn ? 'এলিমেন্ট যোগ' : 'Add Elements'}</AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start gap-1" onClick={() => onAddElement('text')}>
                  <Type className="w-3 h-3" /> {bn ? 'টেক্সট' : 'Text'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start gap-1" onClick={() => onAddElement('shape', { shapeType: 'rect' })}>
                  <Square className="w-3 h-3" /> {bn ? 'বক্স' : 'Box'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start gap-1" onClick={() => onAddElement('shape', { shapeType: 'circle' })}>
                  <Circle className="w-3 h-3" /> {bn ? 'বৃত্ত' : 'Circle'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start gap-1" onClick={() => onAddElement('line')}>
                  <Minus className="w-3 h-3" /> {bn ? 'লাইন' : 'Line'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start gap-1" onClick={() => onAddElement('logo')}>
                  <Image className="w-3 h-3" /> {bn ? 'লোগো' : 'Logo'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start gap-1" onClick={() => onAddElement('qr')}>
                  <QrCode className="w-3 h-3" /> {bn ? 'QR কোড' : 'QR Code'}
                </Button>
              </div>

              <Separator />
              <p className="text-xs font-medium text-muted-foreground">{bn ? 'ডাটা ট্যাগ (ক্লিকে যোগ হবে)' : 'Data Tags (click to add)'}</p>
              <div className="flex flex-wrap gap-1">
                {PLACEHOLDERS.map(p => (
                  <button
                    key={p.tag}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    onClick={() => onAddElement('placeholder', { placeholder: p.tag, content: p.tag })}
                  >
                    {bn ? p.labelBn : p.label}
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Selected Element Properties */}
          {selectedElement && (
            <AccordionItem value="selected">
              <AccordionTrigger className="text-sm font-semibold py-2">{bn ? 'নির্বাচিত এলিমেন্ট' : 'Selected Element'}</AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1">
                {(selectedElement.type === 'text' || selectedElement.type === 'placeholder') && (
                  <div>
                    <Label className="text-xs">{bn ? 'কন্টেন্ট' : 'Content'}</Label>
                    <Input className="h-7 text-xs" value={selectedElement.content || selectedElement.placeholder || ''} onChange={(e) => {
                      const key = selectedElement.type === 'placeholder' ? 'placeholder' : 'content';
                      onUpdateElement(selectedElement.id, { [key]: e.target.value, content: e.target.value });
                    }} />
                  </div>
                )}

                <div className="grid grid-cols-4 gap-1">
                  <div>
                    <Label className="text-[10px]">X</Label>
                    <Input type="number" className="h-7 text-xs" value={selectedElement.x} onChange={(e) => onUpdateElement(selectedElement.id, { x: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">Y</Label>
                    <Input type="number" className="h-7 text-xs" value={selectedElement.y} onChange={(e) => onUpdateElement(selectedElement.id, { y: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">W</Label>
                    <Input type="number" className="h-7 text-xs" value={selectedElement.width} onChange={(e) => onUpdateElement(selectedElement.id, { width: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">H</Label>
                    <Input type="number" className="h-7 text-xs" value={selectedElement.height} onChange={(e) => onUpdateElement(selectedElement.id, { height: Number(e.target.value) })} />
                  </div>
                </div>

                {(selectedElement.type === 'text' || selectedElement.type === 'placeholder') && (
                  <>
                    <div>
                      <Label className="text-xs">{bn ? 'ফন্ট সাইজ' : 'Font Size'}</Label>
                      <Input type="number" className="h-7 text-xs" value={selectedElement.fontSize || 10} onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })} />
                    </div>

                    <div className="flex gap-1">
                      <Button variant={selectedElement.fontWeight === 'bold' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                        onClick={() => onUpdateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}>
                        <Bold className="w-3 h-3" />
                      </Button>
                      <Button variant={selectedElement.fontStyle === 'italic' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                        onClick={() => onUpdateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}>
                        <Italic className="w-3 h-3" />
                      </Button>
                      <Button variant={selectedElement.textAlign === 'left' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                        onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'left' })}>
                        <AlignLeft className="w-3 h-3" />
                      </Button>
                      <Button variant={selectedElement.textAlign === 'center' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                        onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'center' })}>
                        <AlignCenter className="w-3 h-3" />
                      </Button>
                      <Button variant={selectedElement.textAlign === 'right' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                        onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'right' })}>
                        <AlignRight className="w-3 h-3" />
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs">{bn ? 'ফন্ট' : 'Font'}</Label>
                      <Select value={selectedElement.fontFamily || 'sans-serif'} onValueChange={(v) => onUpdateElement(selectedElement.id, { fontFamily: v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sans-serif">Sans-serif</SelectItem>
                          <SelectItem value="bengali">বাংলা (Noto Sans Bengali)</SelectItem>
                          <SelectItem value="monospace">Monospace</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{bn ? 'টেক্সট কালার' : 'Color'}</Label>
                    <Input type="color" className="h-7 p-0.5" value={selectedElement.color || '#000000'} onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'ব্যাকগ্রাউন্ড' : 'BG Color'}</Label>
                    <Input type="color" className="h-7 p-0.5" value={selectedElement.bgColor || '#ffffff'} onChange={(e) => onUpdateElement(selectedElement.id, { bgColor: e.target.value })} />
                  </div>
                </div>

                {(selectedElement.type === 'shape' || selectedElement.type === 'line') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{bn ? 'বর্ডার কালার' : 'Border Color'}</Label>
                      <Input type="color" className="h-7 p-0.5" value={selectedElement.borderColor || '#333333'} onChange={(e) => onUpdateElement(selectedElement.id, { borderColor: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'বর্ডার পুরুত্ব' : 'Border Width'}</Label>
                      <Input type="number" className="h-7 text-xs" value={selectedElement.borderWidth || 1} onChange={(e) => onUpdateElement(selectedElement.id, { borderWidth: Number(e.target.value) })} />
                    </div>
                  </div>
                )}

                <Button variant="destructive" size="sm" className="w-full h-7 text-xs" onClick={() => onDeleteElement(selectedElement.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> {bn ? 'মুছে ফেলুন' : 'Delete'}
                </Button>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </ScrollArea>
  );
};

export default DesignerToolbar;
