import { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, GripVertical, Type, Square, Circle, ImageIcon, PenTool, Triangle, Minus, Layers as LayersIcon } from 'lucide-react';
import type { LayerInfo } from './types';

interface Props {
  layers: LayerInfo[]; // order: top-of-stack first (visual top)
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

const iconFor = (type: string) => {
  switch (type) {
    case 'i-text':
    case 'text':
    case 'textbox':
      return Type;
    case 'rect':
      return Square;
    case 'circle':
    case 'ellipse':
      return Circle;
    case 'triangle':
      return Triangle;
    case 'line':
      return Minus;
    case 'image':
      return ImageIcon;
    case 'path':
    case 'polygon':
      return PenTool;
    default:
      return LayersIcon;
  }
};

const LayersPanel = ({
  layers,
  activeId,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRename,
  onReorder,
}: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayersIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Layers</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{layers.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {layers.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No layers yet. Add a shape, text, or image to begin.
          </div>
        )}

        {layers.map((layer, index) => {
          const Icon = iconFor(layer.type);
          const isActive = layer.id === activeId;

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) {
                  onReorder(dragIndex, index);
                }
                setDragIndex(null);
              }}
              onClick={() => !layer.locked && onSelect(layer.id)}
              className={`group flex items-center gap-1.5 px-2 py-1.5 mx-1 my-0.5 rounded-md cursor-pointer transition-colors border ${
                isActive
                  ? 'bg-primary/15 border-primary/40 text-foreground'
                  : 'border-transparent hover:bg-muted/60 text-foreground/80'
              } ${layer.locked ? 'opacity-70' : ''}`}
            >
              <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0 cursor-grab" />
              <Icon className="w-3.5 h-3.5 shrink-0 text-foreground/70" />

              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => {
                    onRename(layer.id, draftName.trim() || 'Layer');
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRename(layer.id, draftName.trim() || 'Layer');
                      setEditingId(null);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 bg-background border border-primary/40 rounded px-1.5 py-0.5 text-xs outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 text-xs truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(layer.id);
                    setDraftName(layer.name);
                  }}
                >
                  {layer.name}
                </span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLocked(layer.id);
                }}
                className="opacity-50 hover:opacity-100 transition-opacity"
                title={layer.locked ? 'Unlock' : 'Lock'}
              >
                {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
                className="opacity-50 hover:opacity-100 transition-opacity"
                title={layer.visible ? 'Hide' : 'Show'}
              >
                {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayersPanel;
