import { fabric } from 'fabric';
import { saveAs } from 'file-saver';
import { writePsd, type Psd, type Layer as PsdLayer } from 'ag-psd';

/**
 * Export canvas as a vector-perfect SVG file (compatible with Adobe Illustrator).
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
