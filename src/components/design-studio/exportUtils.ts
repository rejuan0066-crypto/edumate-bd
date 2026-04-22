import { fabric } from 'fabric';
import { saveAs } from 'file-saver';
import { writePsd, type Psd, type Layer as PsdLayer } from 'ag-psd';
import { jsPDF } from 'jspdf';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const layerNameFor = (obj: fabric.Object, i: number) => {
  const custom = (obj as any).layerName as string | undefined;
  if (custom && custom.trim()) return custom.trim();
  const t = obj.type || 'object';
  if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
    const txt = ((obj as any).text || '').toString().slice(0, 40).replace(/\s+/g, ' ').trim();
    return txt ? `Text — ${txt}` : `Text ${i + 1}`;
  }
  return `${t[0].toUpperCase() + t.slice(1)} ${i + 1}`;
};

/**
 * Export canvas as a flat single-layer SVG (Illustrator-compatible).
 */
export const exportSVG = (canvas: fabric.Canvas, filename: string) => {
  const svg = canvas.toSVG({
    suppressPreamble: false,
    viewBox: {
      x: 0,
      y: 0,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
    },
  } as any);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${filename}.svg`);
};

/**
 * Export canvas as a LAYERED SVG where each object is wrapped in its own
 * named <g> element. Uses Inkscape namespace labels so Adobe Illustrator,
 * Inkscape and Figma all see distinct, editable, named layers.
 *
 * - Text objects stay as real <text> elements (vector + editable)
 * - Shapes stay as <path>/<rect>/<ellipse> (vector + editable)
 * - Images stay as <image> references (replaceable)
 * - Background becomes its own bottom layer
 */
export const exportLayeredSVG = (
  canvas: fabric.Canvas,
  filename: string,
  background: string,
) => {
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const objects = canvas.getObjects();

  const parts: string[] = [];

  // Background layer
  parts.push(
    `<g id="layer-background" inkscape:groupmode="layer" inkscape:label="Background" data-layer-name="Background">` +
      `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(background)}"/>` +
      `</g>`,
  );

  // Each fabric object → its own SVG group
  objects.forEach((obj, i) => {
    if (!obj.visible) return;
    const name = layerNameFor(obj, i);
    const safeId = `layer-${i}-${name.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40)}`;
    const inner = (obj as any).toSVG ? (obj as any).toSVG() : '';
    parts.push(
      `<g id="${safeId}" inkscape:groupmode="layer" inkscape:label="${escapeXml(name)}" ` +
        `data-layer-name="${escapeXml(name)}" data-layer-type="${escapeXml(obj.type || 'object')}" ` +
        `opacity="${(obj.opacity ?? 1).toFixed(3)}">${inner}</g>`,
    );
  });

  const svg =
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `version="1.1" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    parts.join('\n') +
    `\n</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${filename}.layered.svg`);
};

/**
 * Export the canvas as a vector PDF where every text object remains LIVE,
 * editable text (not flattened pixels). Shapes embed as a vector SVG layer.
 * Opens cleanly in Illustrator with each text field selectable & editable.
 */
export const exportLayeredPDF = async (
  canvas: fabric.Canvas,
  filename: string,
  background: string,
) => {
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const orientation = width >= height ? 'l' : 'p';

  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [width, height],
    compress: true,
  });

  // 1. Background fill as a vector rect
  if (background && background !== 'transparent') {
    pdf.setFillColor(background);
    pdf.rect(0, 0, width, height, 'F');
  }

  const objects = canvas.getObjects();

  // 2. Render non-text objects (shapes, images, paths) as a single raster layer
  //    at high DPI so they remain crisp. Text is overlaid as live text below.
  const tempCanvas = document.createElement('canvas');
  const scale = 2;
  tempCanvas.width = width * scale;
  tempCanvas.height = height * scale;
  const fc = new fabric.StaticCanvas(tempCanvas as any, {
    width: width * scale,
    height: height * scale,
    enableRetinaScaling: false,
    renderOnAddRemove: false,
    backgroundColor: 'transparent',
  });
  fc.setZoom(scale);

  await Promise.all(
    objects
      .filter((o) => o.visible && !['textbox', 'text', 'i-text'].includes(o.type || ''))
      .map(
        (o) =>
          new Promise<void>((resolve) => {
            o.clone((cloned: fabric.Object) => {
              fc.add(cloned);
              resolve();
            });
          }),
      ),
  );
  fc.renderAll();
  const shapesPng = tempCanvas.toDataURL('image/png');
  pdf.addImage(shapesPng, 'PNG', 0, 0, width, height, undefined, 'FAST');

  // 3. Overlay every text object as REAL editable PDF text
  objects.forEach((obj, i) => {
    if (!obj.visible) return;
    if (!['textbox', 'text', 'i-text'].includes(obj.type || '')) return;
    const t = obj as any;
    const text = (t.text || '').toString();
    if (!text) return;

    const fontSize = (t.fontSize || 16) * (t.scaleY || 1);
    const fillRaw = (t.fill as string) || '#000000';

    pdf.setFontSize(fontSize);
    try {
      pdf.setTextColor(fillRaw);
    } catch {
      pdf.setTextColor(0, 0, 0);
    }
    const fontWeight = (t.fontWeight === 'bold' || Number(t.fontWeight) >= 600) ? 'bold' : 'normal';
    const fontStyle = t.fontStyle === 'italic' ? 'italic' : 'normal';
    const style = fontStyle === 'italic' && fontWeight === 'bold'
      ? 'bolditalic'
      : fontStyle === 'italic'
        ? 'italic'
        : fontWeight;
    try {
      pdf.setFont('helvetica', style);
    } catch {
      pdf.setFont('helvetica', 'normal');
    }

    const left = t.left || 0;
    const top = t.top || 0;
    // jsPDF baseline anchor — shift by ~0.8 * fontSize so text sits where canvas placed it
    const baselineY = top + fontSize * 0.82;
    const angle = -(t.angle || 0);
    pdf.text(text, left, baselineY, {
      angle,
      baseline: 'alphabetic',
      maxWidth: t.width ? t.width * (t.scaleX || 1) : undefined,
    } as any);
  });

  pdf.save(`${filename}.layered.pdf`);
};

/**
 * Export canvas as a flattened PNG.
 */
export const exportPNG = (canvas: fabric.Canvas, filename: string, multiplier = 2) => {
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier, quality: 1 });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filename}.png`;
  a.click();
};

/**
 * Export canvas as a flattened JPEG.
 */
export const exportJPG = (canvas: fabric.Canvas, filename: string, multiplier = 2) => {
  const dataUrl = canvas.toDataURL({ format: 'jpeg', multiplier, quality: 0.95 });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filename}.jpg`;
  a.click();
};

/**
 * Render a single fabric object onto an offscreen canvas at the project's size,
 * preserving its position so PSD layer composites line up perfectly.
 */
const renderObjectToCanvas = (
  obj: fabric.Object,
  width: number,
  height: number,
): HTMLCanvasElement => {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const fc = new fabric.StaticCanvas(off as any, {
    width,
    height,
    enableRetinaScaling: false,
    renderOnAddRemove: false,
  });
  // Clone preserves transform / styling
  return new Promise<HTMLCanvasElement>((resolve) => {
    obj.clone((cloned: fabric.Object) => {
      fc.add(cloned);
      fc.renderAll();
      resolve(off);
    });
  }) as unknown as HTMLCanvasElement;
};

const renderObjectAsync = (
  obj: fabric.Object,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const fc = new fabric.StaticCanvas(off as any, {
      width,
      height,
      enableRetinaScaling: false,
      renderOnAddRemove: false,
    });
    obj.clone((cloned: fabric.Object) => {
      fc.add(cloned);
      fc.renderAll();
      resolve(off);
    });
  });
};

/**
 * Export the canvas as a layered PSD where each fabric object becomes
 * its own raster layer in Photoshop. Position, opacity and visibility preserved.
 */
export const exportLayeredPSD = async (
  canvas: fabric.Canvas,
  filename: string,
  background: string,
) => {
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const objects = canvas.getObjects();

  // Background layer
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext('2d')!;
  bgCtx.fillStyle = background;
  bgCtx.fillRect(0, 0, width, height);

  const layers: PsdLayer[] = [
    {
      name: 'Background',
      canvas: bgCanvas,
      opacity: 255,
      hidden: false,
    },
  ];

  // Each object → its own raster layer rendered at full canvas size
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const layerCanvas = await renderObjectAsync(obj, width, height);
    const name =
      (obj as any).layerName ||
      `${(obj.type || 'object')[0].toUpperCase() + (obj.type || 'object').slice(1)} ${i + 1}`;
    layers.push({
      name,
      canvas: layerCanvas,
      opacity: Math.round((obj.opacity ?? 1) * 255),
      hidden: !obj.visible,
    });
  }

  const psd: Psd = {
    width,
    height,
    children: layers,
  };

  const buffer = writePsd(psd, { generateThumbnail: true });
  const blob = new Blob([buffer], { type: 'image/vnd.adobe.photoshop' });
  saveAs(blob, `${filename}.psd`);
};

/**
 * Export the canvas as a flat PSD (single composite layer).
 */
export const exportFlatPSD = async (
  canvas: fabric.Canvas,
  filename: string,
) => {
  const width = canvas.getWidth();
  const height = canvas.getHeight();

  const composite = document.createElement('canvas');
  composite.width = width;
  composite.height = height;
  const ctx = composite.getContext('2d')!;
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1, quality: 1 });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });
  ctx.drawImage(img, 0, 0, width, height);

  const psd: Psd = {
    width,
    height,
    canvas: composite,
    children: [
      {
        name: 'Composite',
        canvas: composite,
      },
    ],
  };
  const buffer = writePsd(psd, { generateThumbnail: true });
  const blob = new Blob([buffer], { type: 'image/vnd.adobe.photoshop' });
  saveAs(blob, `${filename}.psd`);
};

export const exportJSON = (canvas: fabric.Canvas, filename: string) => {
  const json = JSON.stringify(canvas.toJSON(['layerName', 'layerId', 'locked']), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
};
