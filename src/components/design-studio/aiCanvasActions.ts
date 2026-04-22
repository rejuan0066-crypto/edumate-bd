import { fabric } from 'fabric';
import type { AiChatMessage } from './DesignAiChatBar';

export type AiAction =
  | { type: 'add_shape'; shape: 'rect' | 'ellipse' | 'triangle' | 'line';
      left?: number; top?: number; width?: number; height?: number;
      fill?: string; stroke?: string; strokeWidth?: number; rx?: number;
      name?: string; sectionTag?: string }
  | { type: 'add_text'; text: string; left?: number; top?: number;
      fontSize?: number; fontFamily?: string; fontWeight?: string;
      fill?: string; textAlign?: 'left' | 'center' | 'right';
      name?: string; sectionTag?: string }
  | { type: 'update_object'; left?: number; top?: number; width?: number; height?: number;
      scaleX?: number; scaleY?: number; angle?: number; opacity?: number;
      fill?: string; stroke?: string; strokeWidth?: number;
      text?: string; fontSize?: number; fontWeight?: string }
  | { type: 'remove_object' }
  | { type: 'change_background'; color: string }
  | { type: 'add_image'; imageUrl: string; width?: number; height?: number; name?: string }
  | { type: 'replace_selected_image'; imageUrl: string }
  | { type: 'use_template'; templateId?: string; templateName?: string; left?: number; top?: number }
  | { type: 'resize_canvas'; width: number; height: number }
  | { type: 'error'; message: string };

export type DesignScope = 'any' | 'section' | 'card' | 'table' | 'chart' | 'text' | 'image' | 'shape';

const newId = () => `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const centerPos = (fc: fabric.Canvas, w: number, h: number) => ({
  left: Math.max(0, (fc.getWidth() - w) / 2),
  top: Math.max(0, (fc.getHeight() - h) / 2),
});

/** Find the best target for an `update_object`/`remove_object` action given the user's scope. */
export function resolveScopedTarget(
  fc: fabric.Canvas,
  scope: DesignScope,
  fallback: fabric.Object | null,
): fabric.Object | null {
  if (scope === 'any') return fallback ?? fc.getActiveObject();
  if (fallback) {
    const matches = (o: fabric.Object) => matchScope(o, scope);
    if (matches(fallback)) return fallback;
  }
  // Walk top-to-bottom for the first matching object
  const objs = fc.getObjects().slice().reverse();
  for (const o of objs) {
    if (matchScope(o, scope)) return o;
  }
  return fallback ?? fc.getActiveObject();
}

function matchScope(o: fabric.Object, scope: DesignScope): boolean {
  const name = String((o as any).layerName || '').toLowerCase();
  const tag = String((o as any).sectionTag || '').toLowerCase();
  if (scope === 'text') return o.type === 'i-text' || o.type === 'text' || o.type === 'textbox';
  if (scope === 'image') return o.type === 'image';
  if (scope === 'shape') return ['rect', 'ellipse', 'triangle', 'line', 'circle'].includes(o.type || '');
  if (scope === 'section') return !!tag;
  if (scope === 'card') return name.includes('card') || tag.includes('card');
  if (scope === 'table') return tag.includes('table') || name.includes('table');
  if (scope === 'chart') return tag.includes('chart') || tag.includes('dashboard') || tag.includes('stats') || name.includes('chart');
  return true;
}

/**
 * Apply a list of AI-produced actions to the live Fabric canvas.
 * Returns a human-readable summary for the chat transcript.
 */
export async function applyAiActions(
  fc: fabric.Canvas,
  actions: AiAction[],
  options: {
    onBackgroundChange?: (color: string) => void;
    scope?: DesignScope;
    selectedFallback?: fabric.Object | null;
    templateLoader?: (idOrName: { templateId?: string; templateName?: string }) => Promise<{
      canvas_json: any; width: number; height: number;
    } | null>;
  } = {},
): Promise<{ summary: string; errors: string[]; createdLayerIds: string[] }> {
  const summary: string[] = [];
  const errors: string[] = [];
  const createdLayerIds: string[] = [];
  const scope = options.scope ?? 'any';

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'add_shape': {
          const w = action.width ?? 200;
          const h = action.height ?? 200;
          const pos = action.left == null || action.top == null ? centerPos(fc, w, h) : null;
          const left = action.left ?? pos!.left;
          const top = action.top ?? pos!.top;
          const fill = action.fill ?? '#6366f1';
          let obj: fabric.Object;
          if (action.shape === 'rect') {
            obj = new fabric.Rect({
              left, top, width: w, height: h, fill,
              stroke: action.stroke, strokeWidth: action.strokeWidth,
              rx: action.rx, ry: action.rx,
            });
          } else if (action.shape === 'ellipse') {
            obj = new fabric.Ellipse({
              left, top, rx: w / 2, ry: h / 2, fill,
              stroke: action.stroke, strokeWidth: action.strokeWidth,
            });
          } else if (action.shape === 'triangle') {
            obj = new fabric.Triangle({
              left, top, width: w, height: h, fill,
              stroke: action.stroke, strokeWidth: action.strokeWidth,
            });
          } else {
            obj = new fabric.Line([left, top, left + w, top], {
              stroke: action.stroke ?? fill, strokeWidth: action.strokeWidth ?? 2,
            });
          }
          (obj as any).layerName = action.name || `${action.shape[0].toUpperCase()}${action.shape.slice(1)}`;
          (obj as any).layerId = newId();
          if (action.sectionTag) (obj as any).sectionTag = action.sectionTag;
          fc.add(obj);
          createdLayerIds.push((obj as any).layerId);
          summary.push(`+${action.shape}`);
          break;
        }
        case 'add_text': {
          const fontSize = action.fontSize ?? 48;
          const text = new fabric.IText(action.text, {
            left: action.left,
            top: action.top,
            fontSize,
            fontFamily: action.fontFamily || 'Inter',
            fontWeight: action.fontWeight || 'normal',
            fill: action.fill || '#111111',
            textAlign: action.textAlign || 'left',
          });
          if (action.left == null || action.top == null) {
            const w = (text.width || 200);
            const h = (text.height || fontSize);
            const pos = centerPos(fc, w, h);
            text.set({ left: action.left ?? pos.left, top: action.top ?? pos.top });
          }
          (text as any).layerName = action.name || 'Text';
          (text as any).layerId = newId();
          if (action.sectionTag) (text as any).sectionTag = action.sectionTag;
          fc.add(text);
          createdLayerIds.push((text as any).layerId);
          summary.push(`+text`);
          break;
        }
        case 'update_object': {
          const obj = resolveScopedTarget(fc, scope, options.selectedFallback ?? null);
          if (!obj) { errors.push('No target found for update.'); break; }
          fc.setActiveObject(obj);
          const { type: _t, ...changes } = action;
          if ('text' in changes && (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox')) {
            (obj as fabric.IText).set('text', String(changes.text));
            delete (changes as any).text;
          }
          obj.set(changes as any);
          obj.setCoords();
          summary.push('Updated');
          break;
        }
        case 'remove_object': {
          const obj = resolveScopedTarget(fc, scope, options.selectedFallback ?? null);
          if (!obj) { errors.push('No target to remove.'); break; }
          // If the target is part of a section, remove the whole section
          const tag = (obj as any).sectionTag;
          if (tag) {
            const all = fc.getObjects().filter((o) => (o as any).sectionTag === tag);
            all.forEach((o) => fc.remove(o));
            summary.push(`Removed section ${tag}`);
          } else {
            fc.remove(obj);
            summary.push('Removed');
          }
          fc.discardActiveObject();
          break;
        }
        case 'change_background': {
          fc.setBackgroundColor(action.color, () => fc.renderAll());
          options.onBackgroundChange?.(action.color);
          summary.push(`bg → ${action.color}`);
          break;
        }
        case 'add_image': {
          const layerId = await new Promise<string>((resolve) => {
            fabric.Image.fromURL(
              action.imageUrl,
              (img) => {
                const max = Math.min(fc.getWidth(), fc.getHeight()) * 0.7;
                const scale = Math.min(max / (img.width || 1), max / (img.height || 1), 1);
                img.set({ scaleX: scale, scaleY: scale });
                const w = (img.width || 0) * scale;
                const h = (img.height || 0) * scale;
                const pos = centerPos(fc, w, h);
                img.set({ left: pos.left, top: pos.top });
                (img as any).layerName = action.name || 'AI Image';
                const id = newId();
                (img as any).layerId = id;
                fc.add(img);
                resolve(id);
              },
              { crossOrigin: 'anonymous' },
            );
          });
          createdLayerIds.push(layerId);
          summary.push('+image');
          break;
        }
        case 'replace_selected_image': {
          const obj = resolveScopedTarget(fc, 'image', options.selectedFallback ?? null);
          if (!obj || obj.type !== 'image') {
            errors.push('Please select an image to edit.');
            break;
          }
          await new Promise<void>((resolve) => {
            (obj as fabric.Image).setSrc(
              action.imageUrl,
              () => { fc.requestRenderAll(); resolve(); },
              { crossOrigin: 'anonymous' },
            );
          });
          summary.push('Updated image');
          break;
        }
        case 'use_template': {
          if (!options.templateLoader) {
            errors.push('Template loading not available.');
            break;
          }
          const tpl = await options.templateLoader({
            templateId: action.templateId,
            templateName: action.templateName,
          });
          if (!tpl) { errors.push('Template not found.'); break; }
          const offsetLeft = action.left ?? 40;
          const offsetTop = action.top ?? 40;
          await new Promise<void>((resolve) => {
            // Load template objects and add them on top of current canvas (without clearing)
            fabric.util.enlivenObjects(
              tpl.canvas_json?.objects || [],
              (enlivened: fabric.Object[]) => {
                enlivened.forEach((o) => {
                  o.set({ left: (o.left || 0) + offsetLeft, top: (o.top || 0) + offsetTop });
                  (o as any).layerId = newId();
                  if (!(o as any).layerName) (o as any).layerName = 'Template';
                  fc.add(o);
                  createdLayerIds.push((o as any).layerId);
                });
                resolve();
              },
              'fabric',
            );
          });
          summary.push(`Inserted template`);
          break;
        }
        case 'error': {
          errors.push(action.message);
          break;
        }
      }
    } catch (e: any) {
      errors.push(e?.message || 'Action failed');
    }
  }

  fc.requestRenderAll();
  return { summary: summary.join(' · '), errors, createdLayerIds };
}

export function selectedImageToDataUrl(obj: fabric.Object | null): string | null {
  if (!obj || obj.type !== 'image') return null;
  try {
    return (obj as fabric.Image).toDataURL({ format: 'png' });
  } catch {
    return null;
  }
}

export function summarizeSelection(obj: fabric.Object | null): string | null {
  if (!obj) return null;
  const name = (obj as any).layerName || obj.type;
  const w = Math.round((obj.width || 0) * (obj.scaleX || 1));
  const h = Math.round((obj.height || 0) * (obj.scaleY || 1));
  return `${name} (${obj.type}, ${w}×${h})`;
}

export type { AiChatMessage };
