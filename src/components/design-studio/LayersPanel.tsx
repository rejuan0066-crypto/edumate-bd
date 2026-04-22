import { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, GripVertical, Type, Square, Circle, ImageIcon, PenTool, Triangle, Minus, Layers as LayersIcon } from 'lucide-react';
import type { LayerInfo } from './types';

interface Props {
  layers: LayerInfo[];
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
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayersIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/90">Layers</span>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded-full">{layers.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {layers.length === 0 && (
          <div className="px-4 py-10 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-foreground/5 flex items-center justify-center">
              <LayersIcon className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">No layers yet.<br />Add a shape, text, or image to begin.</p>
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
              className={`group flex items-center gap-2 px-2.5 py-2 my-0.5 rounded-xl cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-transparent shadow-sm'
                  : 'hover:bg-foreground/5'
              } ${layer.locked ? 'opacity-60' : ''}`}
            >
              <GripVertical className="w-3 h-3 text-muted-foreground/30 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isActive ? 'bg-primary/15 text-primary' : 'bg-foreground/5 text-foreground/60'
              }`}>
                <Icon className="w-3 h-3" strokeWidth={2.2} />
              </div>

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
                  className="flex-1 bg-background border border-primary/40 rounded-lg px-2 py-0.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`flex-1 text-xs truncate font-medium ${isActive ? 'text-foreground' : 'text-foreground/80'}`}
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
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-foreground/10 transition-all"
                title={layer.locked ? 'Unlock' : 'Lock'}
              >
                {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-foreground/10 ${
                  layer.visible ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 text-amber-500'
                }`}
                title={layer.visible ? 'Hide' : 'Show'}
              >
                {layer.visible ? <Eye className="w-3 h-3 text-muted-foreground" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayersPanel;
