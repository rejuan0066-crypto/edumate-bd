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
import { Save, Download, FolderOpen, FilePlus2, Loader2, Palette, ChevronDown, PanelRight, Layers as LayersIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { DesignTool, LayerInfo, DesignProject } from '@/components/design-studio/types';
import {
  exportSVG, exportLayeredSVG, exportLayeredPDF, exportPNG, exportJPG, exportLayeredPSD, exportFlatPSD, exportJSON,
} from '@/components/design-studio/exportUtils';
import DesignAiChatBar, { type AiChatMessage } from '@/components/design-studio/DesignAiChatBar';
import {
  applyAiActions, selectedImageToDataUrl, summarizeSelection,
  type AiAction, type DesignScope,
} from '@/components/design-studio/aiCanvasActions';
import TemplatesDialog, { type DesignTemplate } from '@/components/design-studio/TemplatesDialog';
import VersionHistoryDialog, { type VersionEntry } from '@/components/design-studio/VersionHistoryDialog';
import AiImageHistoryPanel, { type AiImageOp, type AiImageOpKind } from '@/components/design-studio/AiImageHistoryPanel';
import type { AiCommandEntry } from '@/components/design-studio/AiCommandHistory';
import { getPromptHints, getSelectionTypeLabel } from '@/components/design-studio/promptHints';

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
  const pendingCommandRef = useRef<{ prompt: string; imageOps: AiImageOp[] } | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // AI image operation history (for re-run)
  const [imageOps, setImageOps] = useState<AiImageOp[]>([]);

  // AI command undo/redo stack (separate from canvas-level undo)
  const [aiCommandStack, setAiCommandStack] = useState<AiCommandEntry[]>([]);
  const [aiCommandCursor, setAiCommandCursor] = useState(-1); // -1 = nothing applied

  // Undo / redo (canvas-level)
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
      } else if (meta && e.altKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); undoAiCommand();
      } else if (meta && e.altKey && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault(); redoAiCommand();
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

  // ---------- Version history helpers ----------
  const captureVersion = useCallback((label: string): VersionEntry | null => {
    if (!fc) return null;
    const snapshot = JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked', 'sectionTag']));
    const thumbnail = fc.toDataURL({ format: 'png', multiplier: 0.15, quality: 0.6 });
    const entry: VersionEntry = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      timestamp: Date.now(),
      thumbnail,
      snapshot,
    };
    setVersions((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      return next;
    });
    setCurrentVersionId(entry.id);
    return entry;
  }, [fc]);

  const restoreVersion = useCallback((v: VersionEntry) => {
    if (!fc) return;
    skipHistoryRef.current = true;
    fc.loadFromJSON(v.snapshot, () => {
      fc.renderAll();
      skipHistoryRef.current = false;
      refreshLayers();
      setCurrentVersionId(v.id);
      pushHistory();
    });
    setHistoryOpen(false);
    toast.success(`Restored "${v.label}"`);
  }, [fc, refreshLayers, pushHistory]);

  // Resolve a template by id or fuzzy name from the database
  const templateLoader = useCallback(async (q: { templateId?: string; templateName?: string }) => {
    let query = supabase.from('design_templates').select('*').limit(1);
    if (q.templateId) query = query.eq('id', q.templateId);
    else if (q.templateName) query = query.ilike('name', `%${q.templateName}%`);
    else return null;
    const { data } = await query.maybeSingle();
    if (!data) return null;
    return {
      canvas_json: (data as any).canvas_json,
      width: (data as any).width,
      height: (data as any).height,
    };
  }, []);

  // ---------- AI command handler (with preview/apply) ----------
  const handleAiPrompt = useCallback(async (prompt: string) => {
    if (!fc) return;
    setAiMessages((m) => [...m, { role: 'user', text: prompt }]);
    setAiLoading(true);
    try {
      // Capture pre-AI snapshot for revert
      const preSnapshot = JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked', 'sectionTag']));

      // Fetch user templates to make AI aware of them
      const { data: tplRows } = await supabase
        .from('design_templates')
        .select('id,name,category')
        .limit(30);

      const layersForAi = fc.getObjects().slice(-20).map((o, i) => ({
        id: (o as any).layerId || `l-${i}`,
        name: (o as any).layerName || (o.type ?? 'object'),
        type: o.type || 'object',
      }));

      const selectedImage = selectedImageToDataUrl(selected);
      const { data, error } = await supabase.functions.invoke('design-ai', {
        body: {
          prompt,
          context: {
            canvasWidth: fc.getWidth(),
            canvasHeight: fc.getHeight(),
            background,
            scope: aiScope,
            selectedType: selected?.type ?? null,
            selectedSummary: summarizeSelection(selected),
            layers: layersForAi,
          },
          selectedImage,
          templates: tplRows || [],
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
      const { summary, errors, createdLayerIds } = await applyAiActions(fc, actions, {
        onBackgroundChange: setBackground,
        onResize: (w, h) => { setWidth(w); setHeight(h); },
        scope: aiScope,
        selectedFallback: selected,
        templateLoader,
      });

      // Detect image-related actions and capture thumbnails from newly created layers
      const imageOpsFromActions: AiImageOp[] = [];
      const createdImageLayer = fc
        .getObjects()
        .reverse()
        .find(
          (o) =>
            o.type === 'image' &&
            createdLayerIds.includes((o as any).layerId),
        ) as fabric.Image | undefined;
      const createdThumb = createdImageLayer
        ? (() => {
            try {
              return createdImageLayer.toDataURL({ format: 'png', multiplier: 0.25 });
            } catch {
              return null;
            }
          })()
        : null;
      const selectedThumb = selectedImageToDataUrl(selected);

      const kindOfAction = (a: AiAction): AiImageOpKind | null => {
        if (a.type === 'add_image') return 'generate';
        if (a.type === 'replace_selected_image') {
          // Heuristic: if the prompt mentions background removal we tag it as remove_bg
          return /background|বিজি|bg|ব্যাকগ্রাউন্ড|রিমুভ|remove\s*bg/i.test(prompt) ? 'remove_bg' : 'edit';
        }
        return null;
      };
      for (const a of actions) {
        const kind = kindOfAction(a);
        if (!kind) continue;
        imageOpsFromActions.push({
          id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          kind,
          prompt,
          thumbnail: kind === 'generate' ? createdThumb : selectedThumb,
          timestamp: Date.now(),
        });
      }

      // Auto-apply: commit to history immediately so users see the live design
      const postSnapshot = JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked', 'sectionTag']));
      pushHistory();
      captureVersion(`AI · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      const entry: AiCommandEntry = {
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        prompt,
        preSnapshot,
        postSnapshot,
        timestamp: Date.now(),
      };
      setAiCommandStack((prev) => {
        const truncated = prev.slice(0, aiCommandCursor + 1);
        return [...truncated, entry].slice(-30);
      });
      setAiCommandCursor((c) => Math.min(c + 1, 29));
      if (imageOpsFromActions.length > 0) {
        setImageOps((prev) => [...imageOpsFromActions, ...prev].slice(0, 50));
      }
      pendingCommandRef.current = null;
      setPendingSnapshot(null);
      setPendingLayerIds([]);

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
  }, [fc, selected, background, aiScope, templateLoader, pushHistory, captureVersion, aiCommandCursor]);

  const applyPending = useCallback(() => {
    if (!fc || !pendingSnapshot) return;
    const postSnapshot = JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked', 'sectionTag']));
    const cmdInfo = pendingCommandRef.current;
    pushHistory();
    captureVersion(`AI change · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

    // Push to AI command stack (truncate any future entries)
    if (cmdInfo) {
      const entry: AiCommandEntry = {
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        prompt: cmdInfo.prompt,
        preSnapshot: pendingSnapshot,
        postSnapshot,
        timestamp: Date.now(),
      };
      setAiCommandStack((prev) => {
        const truncated = prev.slice(0, aiCommandCursor + 1);
        return [...truncated, entry].slice(-30);
      });
      setAiCommandCursor((c) => Math.min(c + 1, 29));
      // Commit image ops
      if (cmdInfo.imageOps.length > 0) {
        setImageOps((prev) => [...cmdInfo.imageOps, ...prev].slice(0, 50));
      }
    }

    pendingCommandRef.current = null;
    setPendingSnapshot(null);
    setPendingLayerIds([]);
    toast.success('Applied');
  }, [fc, pendingSnapshot, pushHistory, captureVersion, aiCommandCursor]);

  const revertPending = useCallback(() => {
    if (!fc || !pendingSnapshot) return;
    skipHistoryRef.current = true;
    fc.loadFromJSON(pendingSnapshot, () => {
      fc.renderAll();
      skipHistoryRef.current = false;
      refreshLayers();
      pendingCommandRef.current = null;
      setPendingSnapshot(null);
      setPendingLayerIds([]);
      toast.success('Reverted');
    });
  }, [fc, pendingSnapshot, refreshLayers]);

  // ---------- AI command undo / redo / replay ----------
  const loadSnapshot = useCallback(
    (snapshot: string, onDone?: () => void) => {
      if (!fc) return;
      skipHistoryRef.current = true;
      fc.loadFromJSON(snapshot, () => {
        fc.renderAll();
        skipHistoryRef.current = false;
        refreshLayers();
        pushHistory();
        onDone?.();
      });
    },
    [fc, refreshLayers, pushHistory],
  );

  const undoAiCommand = useCallback(() => {
    if (aiCommandCursor < 0) return;
    const entry = aiCommandStack[aiCommandCursor];
    if (!entry) return;
    loadSnapshot(entry.preSnapshot, () => {
      setAiCommandCursor((c) => c - 1);
      toast.success(`Undid: "${entry.prompt.slice(0, 40)}"`);
    });
  }, [aiCommandCursor, aiCommandStack, loadSnapshot]);

  const redoAiCommand = useCallback(() => {
    if (aiCommandCursor >= aiCommandStack.length - 1) return;
    const next = aiCommandStack[aiCommandCursor + 1];
    if (!next) return;
    loadSnapshot(next.postSnapshot, () => {
      setAiCommandCursor((c) => c + 1);
      toast.success(`Redid: "${next.prompt.slice(0, 40)}"`);
    });
  }, [aiCommandCursor, aiCommandStack, loadSnapshot]);

  const replayAiCommand = useCallback(
    (entry: AiCommandEntry) => {
      // Re-submit the same prompt as a fresh AI command on the current canvas
      handleAiPrompt(entry.prompt);
    },
    [handleAiPrompt],
  );

  const rerunImageOp = useCallback(
    (op: AiImageOp) => {
      handleAiPrompt(op.prompt);
    },
    [handleAiPrompt],
  );

  // Insert a saved template directly (from dialog)
  const insertTemplate = useCallback(async (tpl: DesignTemplate) => {
    if (!fc) return;
    const preSnapshot = JSON.stringify(fc.toJSON(['layerName', 'layerId', 'locked', 'sectionTag']));
    const { errors, createdLayerIds } = await applyAiActions(
      fc,
      [{ type: 'use_template', templateId: tpl.id, left: 40, top: 40 }],
      { templateLoader },
    );
    if (errors.length) { toast.error(errors.join(' · ')); return; }
    setPendingSnapshot(preSnapshot);
    setPendingLayerIds(createdLayerIds);
    setAiMessages((m) => [...m, {
      role: 'assistant',
      text: `Inserted template "${tpl.name}" — Apply to keep`,
      status: 'pending-review',
    }]);
  }, [fc, templateLoader]);

  // Capture current canvas for "Save as template"
  const captureForTemplate = useCallback(() => {
    if (!fc) return null;
    return {
      canvas_json: fc.toJSON(['layerName', 'layerId', 'locked', 'sectionTag']),
      thumbnail: fc.toDataURL({ format: 'png', multiplier: 0.25, quality: 0.7 }),
      width, height, background,
    };
  }, [fc, width, height, background]);


  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)] -mx-3 -my-3 bg-gradient-to-br from-[#0a0a0d] via-[#0d0d12] to-[#0a0a0d] text-foreground rounded-3xl overflow-hidden border border-border/30 shadow-2xl shadow-black/30">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border/30 bg-card/30 backdrop-blur-2xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <Palette className="w-4 h-4 text-primary-foreground" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Design Studio</span>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-6 text-sm font-bold bg-transparent border-transparent hover:border-border/50 focus:border-primary focus:bg-background/30 rounded-lg px-2 -ml-2 max-w-full sm:max-w-[280px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Button size="sm" variant="ghost" onClick={newProject} className="h-9 gap-1.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-foreground/5 px-2 sm:px-3">
              <FilePlus2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">New</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={openProjectDialog} className="h-9 gap-1.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-foreground/5 px-2 sm:px-3">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Open</span>
            </Button>
            <div className="hidden sm:block w-px h-5 bg-border/40 mx-1" />
            <Button size="sm" variant="secondary" onClick={saveProject} disabled={saving} className="h-9 gap-1.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border/40 px-2 sm:px-3">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Save</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary hover:to-primary/90 shadow-lg shadow-primary/30 border-0 px-2 sm:px-3">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Export</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-[10px] uppercase">Vector — Editable layers</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => fc && exportLayeredSVG(fc, safeName, background)}>
                  Layered SVG (.svg) — AI / Inkscape
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (!fc) return;
                  toast.promise(exportLayeredPDF(fc, safeName, background),
                    { loading: 'Building layered PDF…', success: 'PDF exported with editable text', error: 'PDF export failed' });
                }}>
                  Layered PDF (.pdf) — Live text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fc && exportSVG(fc, safeName)}>
                  Flat SVG (.svg)
                </DropdownMenuItem>
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

            {/* Mobile: Layers + Properties drawer trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl lg:hidden text-foreground/70 hover:text-foreground hover:bg-foreground/5">
                  <PanelRight className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm p-0 bg-card/95 backdrop-blur-2xl border-l border-border/30 flex flex-col">
                <div className="flex-1 min-h-0 border-b border-border/30">
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
                <div className="flex-1 min-h-0 border-b border-border/30">
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
                <div className="h-56 shrink-0 min-h-0">
                  <AiImageHistoryPanel
                    ops={imageOps}
                    onRerun={rerunImageOp}
                    onClear={() => setImageOps([])}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
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
          <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-[#16161c] via-[#1a1a22] to-[#16161c] flex flex-col">
            <div className="flex-1 overflow-auto flex items-center justify-center p-10">
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
              selectionTypeLabel={getSelectionTypeLabel(selected)}
              hints={getPromptHints(selected)}
              scope={aiScope}
              onScopeChange={setAiScope}
              pendingReview={!!pendingSnapshot}
              onApply={applyPending}
              onRevert={revertPending}
              onOpenTemplates={() => setTemplatesOpen(true)}
              onOpenHistory={() => setHistoryOpen(true)}
              commandHistory={aiCommandStack}
              commandCursor={aiCommandCursor}
              onUndoCommand={undoAiCommand}
              onRedoCommand={redoAiCommand}
              onReplayCommand={replayAiCommand}
            />
          </div>

          {/* Right column: Layers + Properties + AI Image History */}
          <div className="w-72 shrink-0 border-l border-border/30 bg-card/30 backdrop-blur-2xl flex flex-col">
            <div className="flex-1 min-h-0 border-b border-border/30">
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
            <div className="flex-1 min-h-0 border-b border-border/30">
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
            <div className="h-56 shrink-0 min-h-0">
              <AiImageHistoryPanel
                ops={imageOps}
                onRerun={rerunImageOp}
                onClear={() => setImageOps([])}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Templates dialog */}
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onInsert={(tpl) => { setTemplatesOpen(false); insertTemplate(tpl); }}
        onCapture={captureForTemplate}
      />

      {/* Version history dialog */}
      <VersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={versions}
        currentId={currentVersionId}
        onRestore={restoreVersion}
      />

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
