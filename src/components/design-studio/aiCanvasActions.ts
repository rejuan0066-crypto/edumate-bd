import { fabric } from 'fabric';
import type { AiChatMessage } from './DesignAiChatBar';

export type AiAction =
  | { type: 'add_shape'; shape: 'rect' | 'ellipse' | 'triangle' | 'line';
      left?: number; top?: number; width?: number; height?: number;
      fill?: string; stroke?: string; strokeWidth?: number; name?: string }
  | { type: 'add_text'; text: string; left?: number; top?: number;
      fontSize?: number; fontFamily?: string; fontWeight?: string;
      fill?: string; textAlign?: 'left' | 'center' | 'right'; name?: string }
  | { type: 'update_object'; left?: number; top?: number; width?: number; height?: number;
      scaleX?: number; scaleY?: number; angle?: number; opacity?: number;
      fill?: string; stroke?: string; strokeWidth?: number;
      text?: string; fontSize?: number; fontWeight?: string }
  | { type: 'remove_object' }
  | { type: 'change_background'; color: string }
  | { type: 'add_image'; imageUrl: string; width?: number; height?: number; name?: string }
  | { type: 'replace_selected_image'; imageUrl: string }
  | { type: 'error'; message: string };

const newId = () => `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const centerPos = (fc: fabric.Canvas, w: number, h: number) => ({
  left: Math.max(0, (fc.getWidth() - w) / 2),
  top: Math.max(0, (fc.getHeight() - h) / 2),
});

/**
 * Apply a list of AI-produced actions to the live Fabric canvas.
 * Returns a human-readable summary for the chat transcript.
 */
export async function applyAiActions(
  fc: fabric.Canvas,
  actions: AiAction[],
  onBackgroundChange?: (color: string) => void,
): Promise<{ summary: string; errors: string[] }> {
  const summary: string[] = [];
  const errors: string[] = [];

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
            obj = new fabric.Rect({ left, top, width: w, height: h, fill,
              stroke: action.stroke, strokeWidth: action.strokeWidth });
          } else if (action.shape === 'ellipse') {
            obj = new fabric.Ellipse({ left, top, rx: w / 2, ry: h / 2, fill,
              stroke: action.stroke, strokeWidth: action.strokeWidth });
          } else if (action.shape === 'triangle') {
            obj = new fabric.Triangle({ left, top, width: w, height: h, fill,
              stroke: action.stroke, strokeWidth: action.strokeWidth });
          } else {
            obj = new fabric.Line([left, top, left + w, top], {
              stroke: action.stroke ?? fill, strokeWidth: action.strokeWidth ?? 2 });
          }
          (obj as any).layerName = action.name || `${action.shape[0].toUpperCase()}${action.shape.slice(1)}`;
          (obj as any).layerId = newId();
          fc.add(obj);
          fc.setActiveObject(obj);
          summary.push(`Added ${action.shape}`);
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
          fc.add(text);
          fc.setActiveObject(text);
          summary.push(`Added text "${action.text.slice(0, 24)}${action.text.length > 24 ? '…' : ''}"`);
          break;
        }
        case 'update_object': {
          const obj = fc.getActiveObject();
          if (!obj) {
            errors.push('No object selected to update.');
            break;
          }
          const { type: _t, ...changes } = action;
          // text-only props
          if ('text' in changes && (obj as any).set && (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox')) {
            (obj as fabric.IText).set('text', String(changes.text));
            delete (changes as any).text;
          }
          obj.set(changes as any);
          obj.setCoords();
          summary.push('Updated selection');
          break;
        }
        case 'remove_object': {
          const obj = fc.getActiveObject();
          if (!obj) { errors.push('No object selected to remove.'); break; }
          fc.remove(obj);
          fc.discardActiveObject();
          summary.push('Removed selection');
          break;
        }
        case 'change_background': {
          fc.setBackgroundColor(action.color, () => fc.renderAll());
          onBackgroundChange?.(action.color);
          summary.push(`Background → ${action.color}`);
          break;
        }
        case 'add_image': {
          await new Promise<void>((resolve) => {
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
                (img as any).layerId = newId();
                fc.add(img);
                fc.setActiveObject(img);
                resolve();
              },
              { crossOrigin: 'anonymous' },
            );
          });
          summary.push('Generated and placed image');
          break;
        }
        case 'replace_selected_image': {
          const obj = fc.getActiveObject();
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
          summary.push('Updated selected image');
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
  return { summary: summary.join(' · '), errors };
}

/** Convert a fabric image object to a base64 data URL for the AI to consume. */
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
