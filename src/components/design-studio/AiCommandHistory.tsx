import { Undo2, Redo2, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AiCommandEntry {
  id: string;
  prompt: string;
  preSnapshot: string;
  postSnapshot: string;
  timestamp: number;
}

interface Props {
  history: AiCommandEntry[];
  cursor: number; // index of last applied entry; -1 = nothing applied
  onUndo: () => void;
  onRedo: () => void;
  onReplay: (entry: AiCommandEntry) => void;
}

const fmtTime = (t: number) => {
  const d = new Date(t);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AiCommandHistory = ({ history, cursor, onUndo, onRedo, onReplay }: Props) => {
  const canUndo = cursor >= 0;
  const canRedo = cursor < history.length - 1;

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-1 mr-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            'h-7 w-7 rounded-lg flex items-center justify-center border transition',
            canUndo
              ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
              : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed',
          )}
          title="Undo last AI command (Ctrl+Alt+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            'h-7 w-7 rounded-lg flex items-center justify-center border transition',
            canRedo
              ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
              : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed',
          )}
          title="Redo AI command (Ctrl+Alt+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-white/50 mr-1">
        <History className="w-2.5 h-2.5" />
        AI cmd
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {history.length === 0 ? (
          <span className="text-[10px] text-white/30 italic">No AI commands yet</span>
        ) : (
          history.map((h, i) => {
            const isCurrent = i === cursor;
            const isFuture = i > cursor;
            return (
              <button
                key={h.id}
                onClick={() => onReplay(h)}
                className={cn(
                  'shrink-0 group flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition',
                  isCurrent
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : isFuture
                      ? 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10',
                )}
                title={`${h.prompt}\nClick to replay this command`}
              >
                <span className="font-mono">{i + 1}.</span>
                <span className="truncate max-w-[120px]">{h.prompt}</span>
                <span className="opacity-50">· {fmtTime(h.timestamp)}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AiCommandHistory;
