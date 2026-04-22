import { useEffect, useState } from 'react';
import { Bookmark, Loader2, Plus, Trash2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface DesignTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  category: string;
  width: number;
  height: number;
  background: string;
  canvas_json: any;
  thumbnail: string | null;
  is_system: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInsert: (tpl: DesignTemplate) => void;
  /** Capture the current canvas as a new template (returns canvas_json + thumbnail). */
  onCapture: () => { canvas_json: any; thumbnail: string; width: number; height: number; background: string } | null;
}

const CATEGORIES = ['all', 'header', 'hero', 'form', 'table', 'dashboard', 'card', 'footer', 'sidebar', 'custom'];

const TemplatesDialog = ({ open, onOpenChange, onInsert, onCapture }: Props) => {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('design_templates')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    else setTemplates((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const filtered = templates.filter((t) =>
    (category === 'all' || t.category === category) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase())),
  );

  const handleSave = async () => {
    if (!newName.trim()) { toast.error('Name required'); return; }
    const captured = onCapture();
    if (!captured) { toast.error('Canvas not ready'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Not authenticated'); setSaving(false); return; }
    const { error } = await supabase.from('design_templates').insert([{
      user_id: user.id,
      name: newName.trim(),
      description: newDesc.trim() || null,
      category: newCategory,
      width: captured.width,
      height: captured.height,
      background: captured.background,
      canvas_json: captured.canvas_json,
      thumbnail: captured.thumbnail,
    }]);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Template saved');
    setCreating(false);
    setNewName(''); setNewDesc(''); setNewCategory('custom');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('design_templates').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            Design Templates
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition',
                  category === c
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setCreating((c) => !c)} className="gap-1.5 h-9">
            <Plus className="w-3.5 h-3.5" /> Save current
          </Button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Brand header" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-9 mt-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CATEGORIES.filter((c) => c !== 'all').map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className="mt-1 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Save template
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No templates yet. Save your current design as a template, or ask the AI to "create a header section" then save it.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto py-2">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="group text-left rounded-xl border border-border hover:border-primary/60 transition-colors overflow-hidden bg-card relative"
              >
                <button
                  onClick={() => { onInsert(t); onOpenChange(false); }}
                  className="block w-full"
                >
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {t.thumbnail
                      ? <img src={t.thumbnail} alt={t.name} className="w-full h-full object-contain" />
                      : <Bookmark className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-medium truncate">{t.name}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground capitalize">{t.category}</span>
                      <span className="text-[10px] text-muted-foreground">{t.width}×{t.height}</span>
                    </div>
                  </div>
                </button>
                {!t.is_system && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TemplatesDialog;
