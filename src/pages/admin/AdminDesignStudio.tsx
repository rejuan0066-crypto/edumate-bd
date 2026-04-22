import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fabric } from 'fabric';
import AdminLayout from '@/components/AdminLayout';
import DesignToolbar from '@/components/design-studio/DesignToolbar';
import DesignCanvas, { type DesignCanvasHandle } from '@/components/design-studio/DesignCanvas';
import LayersPanel from '@/components/design-studio/LayersPanel';
import PropertiesPanel from '@/components/design-studio/PropertiesPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Save, Download, FolderOpen, FilePlus2, Loader2, Palette, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { DesignTool, LayerInfo, DesignProject } from '@/components/design-studio/types';
import {
  exportSVG, exportPNG, exportJPG, exportLayeredPSD, exportFlatPSD, exportJSON,
} from '@/components/design-studio/exportUtils';
import DesignAiChatBar, { type AiChatMessage } from '@/components/design-studio/DesignAiChatBar';
import {
  applyAiActions, selectedImageToDataUrl, summarizeSelection,
  type AiAction, type DesignScope,
} from '@/components/design-studio/aiCanvasActions';
import TemplatesDialog, { type DesignTemplate } from '@/components/design-studio/TemplatesDialog';
import VersionHistoryDialog, { type VersionEntry } from '@/components/design-studio/VersionHistoryDialog';

const AUTO_SAVE_MS = 8000;
const GRID_SIZE = 20;

const AdminDesignStudio = () => {
  const { user } = useAuth();
  const canvasRef = useRef<DesignCanvasHandle>(null);
  const [fc, setFc] = useState<fabric.Canvas | null>(null);

  const [activeTool, setActiveTool] = useState<DesignTool>('select');
  const [selected, setSelected] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [snap, setSnap] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Project state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Untitled Design');
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [background, setBackground] = useState('#ffffff');
  const [saving, setSaving] = useState(false);
  const [openProjects, setOpenProjects] = useState<DesignProject[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);

  // AI chat state
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiScope, setAiScope] = useState<DesignScope>('any');

  // Preview / version-history state
  const [pendingSnapshot, setPendingSnapshot] = useState<string | null>(null);
  const [pendingLayerIds, setPendingLayerIds] = useState<string[]>([]);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Undo / redo
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const skipHistoryRef = useRef(false);
  const [, forceTick] = useState(0);

  const refreshLayers = useCallback(() => {
    if (!fc) return;
    // Top of layers panel = top of stack — fabric stacks last item on top, so reverse.
    const objs = fc.getObjects();
    const list: LayerInfo[] = objs
      .map((o, i) => {
        const id = (o as any).layerId || `obj-${i}-${Date.now()}`;
        (o as any).layerId = id;
        return {
          id,
          name: (o as any).layerName || `${(o.type || 'object')} ${i + 1}`,
          type: o.type || 'object',
          visible: o.visible !== false,
          locked: !!(o as any).locked,
          opacity: o.opacity ?? 1,
        };
      })
      .reverse();
    setLayers(list);
  }, [fc]);

  const pushHistory = useCallback(() => {
    if (!fc || skipHistoryRef.current) return;
    const snap = JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked']));
    historyRef.current.push(snap);
    if (historyRef.current.length > 50) historyRef.current.shift();
    futureRef.current = [];
    forceTick((n) => n + 1);
  }, [fc]);

  const handleObjectsChange = useCallback(() => {
    refreshLayers();
    pushHistory();
  }, [refreshLayers, pushHistory]);

  // Initial canvas ready
  const handleReady = useCallback((c: fabric.Canvas) => {
    setFc(c);
  }, []);

  useEffect(() => {
    if (fc) {
      // Seed initial history snapshot
      historyRef.current = [JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked']))];
      refreshLayers();
    }
  }, [fc, refreshLayers]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!fc) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const meta = e.ctrlKey || e.metaKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const a = fc.getActiveObject();
        if (a && !(a as any).locked) { fc.remove(a); fc.discardActiveObject(); fc.requestRenderAll(); }
      } else if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); undo();
      } else if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault(); redo();
      } else if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault(); duplicate();
      } else if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault(); saveProject();
      } else if (e.key === 'v') setActiveTool('select');
      else if (e.key === 'r') setActiveTool('rect');
      else if (e.key === 'o') setActiveTool('ellipse');
      else if (e.key === 't') setActiveTool('text');
      else if (e.key === 'p') setActiveTool('pen');
      else if (e.key === 'l') setActiveTool('line');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fc]);

  const undo = () => {
    if (!fc || historyRef.current.length <= 1) return;
    const current = historyRef.current.pop()!;
    futureRef.current.push(current);
    const prev = historyRef.current[historyRef.current.length - 1];
    skipHistoryRef.current = true;
    fc.loadFromJSON(prev, () => {
      fc.renderAll();
      skipHistoryRef.current = false;
      refreshLayers();
      forceTick((n) => n + 1);
    });
  };

  const redo = () => {
    if (!fc || futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(next);
    skipHistoryRef.current = true;
    fc.loadFromJSON(next, () => {
      fc.renderAll();
      skipHistoryRef.current = false;
      refreshLayers();
      forceTick((n) => n + 1);
    });
  };

  const duplicate = () => {
    if (!fc) return;
    const a = fc.getActiveObject();
    if (!a) return;
    a.clone((cloned: fabric.Object) => {
      cloned.set({ left: (a.left || 0) + 20, top: (a.top || 0) + 20 });
      (cloned as any).layerName = ((a as any).layerName || 'Layer') + ' copy';
      (cloned as any).layerId = `obj-${Date.now()}`;
      fc.add(cloned);
      fc.setActiveObject(cloned);
      fc.requestRenderAll();
    });
  };

  const deleteSel = () => {
    if (!fc) return;
    const a = fc.getActiveObject();
    if (a) { fc.remove(a); fc.discardActiveObject(); fc.requestRenderAll(); }
  };

  const align = (a: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);
    if (a === 'left') obj.set('left', 0);
    if (a === 'right') obj.set('left', fc.getWidth() - w);
    if (a === 'center-h') obj.set('left', (fc.getWidth() - w) / 2);
    if (a === 'top') obj.set('top', 0);
    if (a === 'bottom') obj.set('top', fc.getHeight() - h);
    if (a === 'center-v') obj.set('top', (fc.getHeight() - h) / 2);
    obj.setCoords();
    fc.requestRenderAll();
    pushHistory();
  };

  const uploadImage = (file: File) => {
    if (!fc) return;
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(reader.result as string, (img) => {
        const max = Math.min(fc.getWidth(), fc.getHeight()) * 0.6;
        const scale = Math.min(max / (img.width || 1), max / (img.height || 1), 1);
        img.set({ left: 50, top: 50, scaleX: scale, scaleY: scale });
        (img as any).layerName = file.name.replace(/\.[^.]+$/, '');
        fc.add(img);
        fc.setActiveObject(img);
        fc.requestRenderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  // Layer panel handlers (panel order is reversed from fabric stack)
  const findById = (id: string) => fc?.getObjects().find((o) => (o as any).layerId === id);

  const onSelectLayer = (id: string) => {
    const obj = findById(id);
    if (obj && fc) { fc.setActiveObject(obj); fc.requestRenderAll(); }
  };
  const onToggleVisible = (id: string) => {
    const obj = findById(id);
    if (obj && fc) { obj.visible = !obj.visible; fc.requestRenderAll(); refreshLayers(); }
  };
  const onToggleLocked = (id: string) => {
    const obj = findById(id);
    if (obj && fc) {
      const locked = !(obj as any).locked;
      (obj as any).locked = locked;
      obj.selectable = !locked;
      obj.evented = !locked;
      fc.requestRenderAll();
      refreshLayers();
    }
  };
  const onRename = (id: string, name: string) => {
    const obj = findById(id);
    if (obj) { (obj as any).layerName = name; refreshLayers(); }
  };
  const onReorder = (fromIdx: number, toIdx: number) => {
    if (!fc) return;
    const objs = fc.getObjects();
    // Panel idx is reversed
    const from = objs.length - 1 - fromIdx;
    const to = objs.length - 1 - toIdx;
    const [moved] = objs.splice(from, 1);
    objs.splice(to, 0, moved);
    // Re-add in new stacking order
    fc.clear();
    fc.setBackgroundColor(background, () => {});
    objs.forEach((o) => fc.add(o));
    fc.requestRenderAll();
    refreshLayers();
    pushHistory();
  };

  // ---------- Save / Load ----------
  const saveProject = useCallback(async () => {
    if (!fc || !user) return;
    setSaving(true);
    try {
      const canvas_json = fc.toJSON(['layerName', 'layerId', 'locked']) as any;
      const thumbnail = fc.toDataURL({ format: 'png', multiplier: 0.2, quality: 0.7 });
      if (projectId) {
        const { error } = await supabase
          .from('design_projects')
          .update({ name: projectName, width, height, background, canvas_json, thumbnail })
          .eq('id', projectId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('design_projects')
          .insert([{ user_id: user.id, name: projectName, width, height, background, canvas_json, thumbnail }])
          .select('id')
          .single();
        if (error) throw error;
        setProjectId(data.id);
      }
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fc, user, projectId, projectName, width, height, background]);

  // Auto-save
  useEffect(() => {
    if (!fc || !user) return;
    const id = setInterval(() => {
      if (historyRef.current.length > 1) saveProject();
    }, AUTO_SAVE_MS);
    return () => clearInterval(id);
  }, [fc, user, saveProject]);

  const openProjectDialog = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('design_projects')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setOpenProjects((data as any) || []);
    setOpenDialog(true);
  };

  const loadProject = (p: DesignProject) => {
    if (!fc) return;
    setProjectId(p.id);
    setProjectName(p.name);
    setWidth(p.width);
    setHeight(p.height);
    setBackground(p.background);
    skipHistoryRef.current = true;
    fc.loadFromJSON(p.canvas_json, () => {
      fc.setBackgroundColor(p.background, () => fc.renderAll());
      skipHistoryRef.current = false;
      historyRef.current = [JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked']))];
      futureRef.current = [];
      refreshLayers();
    });
    setOpenDialog(false);
  };

  const newProject = () => {
    if (!fc) return;
    if (!confirm('Start a new design? Unsaved changes will be lost.')) return;
    setProjectId(null);
    setProjectName('Untitled Design');
    setBackground('#ffffff');
    skipHistoryRef.current = true;
    fc.clear();
    fc.setBackgroundColor('#ffffff', () => fc.renderAll());
    skipHistoryRef.current = false;
    historyRef.current = [JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked']))];
    futureRef.current = [];
    refreshLayers();
  };

  const safeName = useMemo(() => projectName.replace(/[^\w\-]+/g, '_') || 'design', [projectName]);

  // ---------- AI command handler ----------
  const handleAiPrompt = useCallback(async (prompt: string) => {
    if (!fc) return;
    setAiMessages((m) => [...m, { role: 'user', text: prompt }]);
    setAiLoading(true);
    try {
      const selectedImage = selectedImageToDataUrl(selected);
      const { data, error } = await supabase.functions.invoke('design-ai', {
        body: {
          prompt,
          context: {
            canvasWidth: fc.getWidth(),
            canvasHeight: fc.getHeight(),
            background,
            selectedType: selected?.type ?? null,
            selectedSummary: summarizeSelection(selected),
          },
          selectedImage,
        },
      });
      if (error) throw error;
      const actions = (data?.actions || []) as AiAction[];
      if (actions.length === 0) {
        setAiMessages((m) => [...m, {
          role: 'assistant',
          text: data?.reply || "I couldn't translate that into a canvas action.",
          status: 'error',
        }]);
        return;
      }
      const { summary, errors } = await applyAiActions(fc, actions, setBackground);
      pushHistory();
      const text = [summary, ...errors].filter(Boolean).join(' · ') || 'Done';
      setAiMessages((m) => [...m, {
        role: 'assistant',
        text,
        status: errors.length ? 'error' : 'done',
      }]);
    } catch (e: any) {
      const msg = e?.message || 'AI request failed';
      setAiMessages((m) => [...m, { role: 'assistant', text: msg, status: 'error' }]);
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  }, [fc, selected, background, pushHistory]);


  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)] -mx-3 -my-3 bg-[#0d0d10] text-foreground rounded-2xl overflow-hidden border border-border/40">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border/50 bg-card/60 backdrop-blur-xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Palette className="w-3.5 h-3.5 text-primary" />
            </div>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="h-8 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-primary max-w-[260px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={newProject} className="h-8 gap-1.5">
              <FilePlus2 className="w-3.5 h-3.5" /> New
            </Button>
            <Button size="sm" variant="ghost" onClick={openProjectDialog} className="h-8 gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" /> Open
            </Button>
            <Button size="sm" variant="secondary" onClick={saveProject} disabled={saving} className="h-8 gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase">Vector</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => fc && exportSVG(fc, safeName)}>SVG (.svg) — Illustrator</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase">Photoshop</DropdownMenuLabel>
                <DropdownMenuItem onClick={async () => {
                  if (!fc) return;
                  toast.promise(exportLayeredPSD(fc, safeName, background),
                    { loading: 'Building layered PSD…', success: 'PSD exported', error: 'PSD export failed' });
                }}>
                  PSD — Layer by layer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (!fc) return;
                  toast.promise(exportFlatPSD(fc, safeName),
                    { loading: 'Building flat PSD…', success: 'PSD exported', error: 'PSD export failed' });
                }}>
                  PSD — Flat composite
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase">Raster</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => fc && exportPNG(fc, safeName)}>PNG @ 2x</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fc && exportJPG(fc, safeName)}>JPG @ 2x</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fc && exportJSON(fc, safeName)}>Canvas JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex flex-1 min-h-0">
          <DesignToolbar
            active={activeTool}
            setActive={setActiveTool}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyRef.current.length > 1}
            canRedo={futureRef.current.length > 0}
            onDelete={deleteSel}
            onDuplicate={duplicate}
            onAlign={align}
            onUploadImage={uploadImage}
            snap={snap}
            toggleSnap={() => setSnap((s) => !s)}
            showGrid={showGrid}
            toggleGrid={() => setShowGrid((s) => !s)}
          />

          {/* Canvas viewport */}
          <div className="relative flex-1 overflow-hidden bg-[#1a1a1f] flex flex-col">
            <div className="flex-1 overflow-auto flex items-center justify-center p-8">
              <DesignCanvas
                ref={canvasRef}
                width={width}
                height={height}
                background={background}
                activeTool={activeTool}
                showGrid={showGrid}
                snapToGrid={snap}
                gridSize={GRID_SIZE}
                onReady={handleReady}
                onSelectionChange={setSelected}
                onObjectsChange={handleObjectsChange}
              />
            </div>

            {/* Floating AI command bar */}
            <DesignAiChatBar
              messages={aiMessages}
              onSubmit={handleAiPrompt}
              isLoading={aiLoading}
              disabled={!fc}
              hasSelection={!!selected}
              selectionLabel={summarizeSelection(selected) ?? undefined}
            />
          </div>

          {/* Right column: Layers + Properties */}
          <div className="w-72 shrink-0 border-l border-border/50 bg-card/60 backdrop-blur-xl flex flex-col">
            <div className="h-1/2 min-h-0 border-b border-border/50">
              <LayersPanel
                layers={layers}
                activeId={selected ? (selected as any).layerId : null}
                onSelect={onSelectLayer}
                onToggleVisible={onToggleVisible}
                onToggleLocked={onToggleLocked}
                onRename={onRename}
                onReorder={onReorder}
              />
            </div>
            <div className="h-1/2 min-h-0">
              <PropertiesPanel
                selected={selected}
                canvasWidth={width}
                canvasHeight={height}
                canvasBackground={background}
                onCanvasResize={(w, h) => { setWidth(w); setHeight(h); }}
                onCanvasBackground={setBackground}
                onChange={() => { fc?.requestRenderAll(); pushHistory(); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Open project dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Open project</DialogTitle>
          </DialogHeader>
          {openProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No saved projects yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto py-2">
              {openProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadProject(p)}
                  className="text-left rounded-xl border border-border/60 hover:border-primary/60 transition-colors overflow-hidden bg-card"
                >
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {p.thumbnail
                      ? <img src={p.thumbnail} alt={p.name} className="w-full h-full object-contain" />
                      : <Palette className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.width}×{p.height}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDesignStudio;
