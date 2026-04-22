import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MousePointer2,
  PenTool,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  ImageIcon,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Grid3x3,
  Magnet,
} from 'lucide-react';
import type { DesignTool } from './types';

interface Props {
  active: DesignTool;
  setActive: (t: DesignTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onAlign: (a: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  onUploadImage: (file: File) => void;
  snap: boolean;
  toggleSnap: () => void;
  showGrid: boolean;
  toggleGrid: () => void;
}

const tools: Array<{ id: DesignTool; icon: any; label: string }> = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)' },
  { id: 'pen', icon: PenTool, label: 'Pen — Bezier curves (P)' },
  { id: 'rect', icon: Square, label: 'Rectangle (R)' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse (O)' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'line', icon: Minus, label: 'Line (L)' },
  { id: 'text', icon: Type, label: 'Text (T)' },
];

const ToolBtn = ({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        className={`relative h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          active
            ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/40 scale-105'
            : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground hover:scale-105'
        }`}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
        {active && (
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
        )}
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
  </Tooltip>
);

const Divider = () => (
  <div className="w-7 h-px bg-gradient-to-r from-transparent via-border to-transparent my-1.5" />
);

const DesignToolbar = ({
  active,
  setActive,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDelete,
  onDuplicate,
  onAlign,
  onUploadImage,
  snap,
  toggleSnap,
  showGrid,
  toggleGrid,
}: Props) => {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3 px-2 bg-card/40 backdrop-blur-2xl border-r border-border/30 w-[60px] shrink-0">
      {tools.map((t) => (
        <ToolBtn
          key={t.id}
          active={active === t.id}
          onClick={() => setActive(t.id)}
          icon={t.icon}
          label={t.label}
        />
      ))}

      {/* Image upload */}
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="h-10 w-10 rounded-2xl flex items-center justify-center cursor-pointer text-foreground/60 hover:bg-foreground/5 hover:text-foreground hover:scale-105 transition-all duration-300">
            <ImageIcon className="w-[18px] h-[18px]" strokeWidth={2} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadImage(f);
                e.target.value = '';
              }}
            />
          </label>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">Upload image</TooltipContent>
      </Tooltip>

      <Divider />

      <ToolBtn icon={Undo2} label="Undo (Ctrl+Z)" onClick={onUndo} />
      <ToolBtn icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={onRedo} />
      <ToolBtn icon={Copy} label="Duplicate (Ctrl+D)" onClick={onDuplicate} />
      <ToolBtn icon={Trash2} label="Delete (Del)" onClick={onDelete} />

      <Divider />

      <ToolBtn icon={AlignStartHorizontal} label="Align left" onClick={() => onAlign('left')} />
      <ToolBtn icon={AlignCenterHorizontal} label="Align center H" onClick={() => onAlign('center-h')} />
      <ToolBtn icon={AlignEndHorizontal} label="Align right" onClick={() => onAlign('right')} />
      <ToolBtn icon={AlignStartVertical} label="Align top" onClick={() => onAlign('top')} />
      <ToolBtn icon={AlignCenterVertical} label="Align center V" onClick={() => onAlign('center-v')} />
      <ToolBtn icon={AlignEndVertical} label="Align bottom" onClick={() => onAlign('bottom')} />

      <Divider />

      <ToolBtn active={showGrid} icon={Grid3x3} label="Toggle grid" onClick={toggleGrid} />
      <ToolBtn active={snap} icon={Magnet} label="Snap to grid" onClick={toggleSnap} />
    </div>
  );
};

export default DesignToolbar;
