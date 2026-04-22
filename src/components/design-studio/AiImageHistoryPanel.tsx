import { ImageIcon, RotateCcw, Sparkles, Wand2, Eraser, Replace } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiImageOpKind = 'generate' | 'edit' | 'replace' | 'remove_bg';

export interface AiImageOp {
  id: string;
  kind: AiImageOpKind;
  prompt: string;
  thumbnail?: string | null;
  timestamp: number;
}

interface Props {
  ops: AiImageOp[];
  onRerun: (op: AiImageOp) => void;
  onClear?: () => void;
}

const KIND_META: Record<AiImageOpKind, { label: string; icon: any; color: string }> = {
  generate: { label: 'Generated', icon: Sparkles, color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  edit: { label: 'Edited', icon: Wand2, color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  replace: { label: 'Replaced', icon: Replace, color: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  remove_bg: { label: 'BG Removed', icon: Eraser, color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
};

const fmt = (t: number) => {
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(t).toLocaleDateString();
};

const AiImageHistoryPanel = ({ ops, onRerun, onClear }: Props) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="w-3 h-3" />
          AI Image History
          <span className="ml-1 text-[10px] opacity-60">({ops.length})</span>
        </div>
        {ops.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-foreground transition"
          >
            Clear
          </button>
        )}
      </div>

      {ops.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6 text-muted-foreground">
          <ImageIcon className="w-6 h-6 mb-2 opacity-40" />
          <p className="text-[11px]">No AI image actions yet.</p>
          <p className="text-[10px] opacity-70 mt-1">
            Generate or edit an image from chat to see it here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
          {ops.map((op) => {
            const meta = KIND_META[op.kind];
            const Icon = meta.icon;
            return (
              <div
                key={op.id}
                className="group flex gap-2 p-1.5 rounded-xl bg-card/50 border border-border/40 hover:border-primary/40 transition"
              >
                <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
                  {op.thumbnail ? (
                    <img src={op.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border', meta.color)}>
                        <Icon className="w-2.5 h-2.5" />
                        {meta.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground shrink-0">{fmt(op.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-foreground/90 mt-0.5 line-clamp-2 leading-tight" title={op.prompt}>
                      {op.prompt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRerun(op)}
                  className="self-start shrink-0 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
                  title="Re-run this command"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Re-run
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AiImageHistoryPanel;
