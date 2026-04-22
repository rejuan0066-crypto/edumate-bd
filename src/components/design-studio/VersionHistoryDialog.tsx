import { Clock, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface VersionEntry {
  id: string;
  label: string;
  timestamp: number;
  thumbnail: string;
  snapshot: string; // canvas JSON string
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  versions: VersionEntry[];
  currentId: string | null;
  onRestore: (v: VersionEntry) => void;
}

const fmt = (t: number) => {
  const d = new Date(t);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const VersionHistoryDialog = ({ open, onOpenChange, versions, currentId, onRestore }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Version History
          </DialogTitle>
        </DialogHeader>

        {versions.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No versions yet. Versions are captured automatically each time you apply an AI change or save.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {versions.map((v, i) => (
              <div
                key={v.id}
                className={cn(
                  'rounded-xl border overflow-hidden bg-card transition-colors',
                  v.id === currentId
                    ? 'border-emerald-500/60 ring-2 ring-emerald-500/20'
                    : 'border-border hover:border-primary/60',
                )}
              >
                <div className="aspect-video bg-muted overflow-hidden">
                  {v.thumbnail
                    ? <img src={v.thumbnail} alt={v.label} className="w-full h-full object-contain" />
                    : <div className="w-full h-full" />}
                </div>
                <div className="p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{v.label}</span>
                    <span className="text-[10px] text-muted-foreground">v{i + 1}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{fmt(v.timestamp)}</div>
                  <Button
                    size="sm"
                    variant={v.id === currentId ? 'secondary' : 'outline'}
                    onClick={() => onRestore(v)}
                    disabled={v.id === currentId}
                    className="w-full h-7 text-[11px] gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {v.id === currentId ? 'Current' : 'Restore'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistoryDialog;
