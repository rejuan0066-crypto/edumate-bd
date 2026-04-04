import { useRef, useState, useCallback } from 'react';
import { ReceiptElement, ReceiptDesignConfig } from '@/hooks/useReceiptSettings';

interface Props {
  config: ReceiptDesignConfig;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<ReceiptElement>) => void;
  scale?: number;
}

const DesignerCanvas = ({ config, selectedId, onSelect, onUpdateElement, scale = 2 }: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; elW: number; elH: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, el: ReceiptElement) => {
    e.stopPropagation();
    onSelect(el.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({ id: el.id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y });
  }, [onSelect]);

  const handleResizeDown = useCallback((e: React.MouseEvent, el: ReceiptElement) => {
    e.stopPropagation();
    setResizing({ id: el.id, startX: e.clientX, startY: e.clientY, elW: el.width, elH: el.height });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / scale;
      const dy = (e.clientY - dragging.startY) / scale;
      onUpdateElement(dragging.id, { x: Math.max(0, Math.round(dragging.elX + dx)), y: Math.max(0, Math.round(dragging.elY + dy)) });
    }
    if (resizing) {
      const dx = (e.clientX - resizing.startX) / scale;
      const dy = (e.clientY - resizing.startY) / scale;
      onUpdateElement(resizing.id, { width: Math.max(20, Math.round(resizing.elW + dx)), height: Math.max(8, Math.round(resizing.elH + dy)) });
    }
  }, [dragging, resizing, scale, onUpdateElement]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  const renderElement = (el: ReceiptElement) => {
    const isSelected = selectedId === el.id;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x * scale,
      top: el.y * scale,
      width: el.width * scale,
      height: el.height * scale,
      fontSize: (el.fontSize || 10) * scale,
      fontWeight: el.fontWeight || 'normal',
      fontStyle: el.fontStyle || 'normal',
      textAlign: (el.textAlign as any) || 'left',
      color: el.color || '#000',
      fontFamily: el.fontFamily === 'bengali' ? "'Noto Sans Bengali', sans-serif" : el.fontFamily === 'monospace' ? 'monospace' : 'sans-serif',
      lineHeight: 1.2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
      cursor: dragging?.id === el.id ? 'grabbing' : 'grab',
      outline: isSelected ? `${2}px solid hsl(var(--primary))` : 'none',
      outlineOffset: 1,
      borderRadius: el.borderRadius ? el.borderRadius * scale : 0,
      backgroundColor: el.bgColor || 'transparent',
      borderColor: el.borderColor,
      borderWidth: el.borderWidth ? el.borderWidth * scale : 0,
      borderStyle: el.borderWidth ? 'solid' : 'none',
      overflow: 'hidden',
      userSelect: 'none',
      zIndex: isSelected ? 10 : 1,
      opacity: el.opacity !== undefined ? el.opacity : 1,
    };

    let content: React.ReactNode = null;

    switch (el.type) {
      case 'text':
        content = <span className="whitespace-nowrap">{el.content}</span>;
        break;
      case 'placeholder':
        content = <span className="whitespace-nowrap text-primary/70 italic">{el.placeholder}</span>;
        break;
      case 'field': {
        const labelWidth = 28;
        const inputStyle: React.CSSProperties = el.lineStyle === 'rounded-fill'
          ? { background: '#f0f0f0', borderRadius: 10 * scale, height: '80%', flex: 1, border: `${scale}px solid ${el.borderColor || '#ddd'}` }
          : { borderBottom: `${scale}px ${el.lineStyle || 'solid'} ${el.borderColor || '#333'}`, flex: 1, height: '80%' };
        content = (
          <div className="flex items-center w-full h-full gap-1" style={{ fontSize: (el.fontSize || 8) * scale }}>
            <span className="whitespace-nowrap font-semibold" style={{ width: labelWidth * scale, flexShrink: 0 }}>{el.fieldLabel || ''}</span>
            <div style={inputStyle} className="flex items-center px-1">
              <span className="text-muted-foreground/60 italic text-[0.85em] whitespace-nowrap">{el.placeholder || ''}</span>
            </div>
          </div>
        );
        break;
      }
      case 'logo':
        content = (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center border border-dashed border-muted-foreground/30 rounded">
            <span style={{ fontSize: 8 * scale }} className="text-muted-foreground">Logo</span>
          </div>
        );
        break;
      case 'qr':
        content = (
          <div className="w-full h-full bg-muted/20 flex items-center justify-center border border-dashed border-muted-foreground/30">
            <span style={{ fontSize: 7 * scale }} className="text-muted-foreground">QR</span>
          </div>
        );
        break;
      case 'line':
        return (
          <div
            key={el.id}
            style={{
              ...baseStyle,
              borderBottom: `${(el.borderWidth || 1) * scale}px solid ${el.color || '#333'}`,
              backgroundColor: 'transparent',
            }}
            onMouseDown={(e) => handleMouseDown(e, el)}
          >
            {isSelected && (
              <div
                className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-se-resize"
                onMouseDown={(e) => handleResizeDown(e, el)}
              />
            )}
          </div>
        );
      case 'shape':
        content = null;
        if (el.shapeType === 'circle') {
          baseStyle.borderRadius = '50%';
        }
        baseStyle.backgroundColor = el.bgColor || 'transparent';
        baseStyle.border = `${(el.borderWidth || 1) * scale}px solid ${el.borderColor || '#333'}`;
        break;
    }

    return (
      <div
        key={el.id}
        style={baseStyle}
        onMouseDown={(e) => handleMouseDown(e, el)}
      >
        {content}
        {isSelected && (
          <div
            className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-se-resize z-20"
            onMouseDown={(e) => handleResizeDown(e, el)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-muted/30 p-4 flex items-start justify-center">
      <div
        ref={canvasRef}
        className="relative bg-white shadow-lg"
        style={{
          width: config.receiptWidth * scale,
          height: config.receiptHeight * scale,
          border: `${config.borderWidth * scale}px solid ${config.borderColor}`,
          backgroundColor: config.bgColor,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => onSelect(null)}
      >
        {config.elements.map(renderElement)}
      </div>
    </div>
  );
};

export default DesignerCanvas;
