import { fabric } from 'fabric';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { DesignTool } from './types';

export interface DesignCanvasHandle {
  getCanvas: () => fabric.Canvas | null;
}

interface Props {
  width: number;
  height: number;
  background: string;
  activeTool: DesignTool;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  fitToScreen?: boolean;
  onReady: (canvas: fabric.Canvas) => void;
  onSelectionChange: (obj: fabric.Object | null) => void;
  onObjectsChange: () => void;
}

const DesignCanvas = forwardRef<DesignCanvasHandle, Props>(
  ({ width, height, background, activeTool, showGrid, snapToGrid, gridSize, onReady, onSelectionChange, onObjectsChange }, ref) => {
    const canvasElRef = useRef<HTMLCanvasElement | null>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const toolRef = useRef<DesignTool>(activeTool);
    const snapRef = useRef(snapToGrid);
    const gridRef = useRef(gridSize);

    useImperativeHandle(ref, () => ({ getCanvas: () => fabricRef.current }));

    useEffect(() => { toolRef.current = activeTool; }, [activeTool]);
    useEffect(() => { snapRef.current = snapToGrid; }, [snapToGrid]);
    useEffect(() => { gridRef.current = gridSize; }, [gridSize]);

    // Initialize fabric canvas once
    useEffect(() => {
      if (!canvasElRef.current) return;
      const fc = new fabric.Canvas(canvasElRef.current, {
        width,
        height,
        backgroundColor: background,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      // Snap-to-grid on object move
      fc.on('object:moving', (e) => {
        if (!snapRef.current || !e.target) return;
        const g = gridRef.current;
        e.target.set({
          left: Math.round((e.target.left || 0) / g) * g,
          top: Math.round((e.target.top || 0) / g) * g,
        });
      });

      const fireSel = () => onSelectionChange(fc.getActiveObject() || null);
      fc.on('selection:created', fireSel);
      fc.on('selection:updated', fireSel);
      fc.on('selection:cleared', () => onSelectionChange(null));

      const fireChange = () => onObjectsChange();
      fc.on('object:added', fireChange);
      fc.on('object:removed', fireChange);
      fc.on('object:modified', fireChange);

      // Drawing logic for shape tools
      let isDrawing = false;
      let drawStart: { x: number; y: number } | null = null;
      let drawObj: fabric.Object | null = null;
      let penPoints: { x: number; y: number }[] = [];

      fc.on('mouse:down', (opt) => {
        const tool = toolRef.current;
        if (tool === 'select') return;

        const p = fc.getPointer(opt.e);

        if (tool === 'text') {
          const t = new fabric.IText('Type here', {
            left: p.x, top: p.y, fontSize: 32, fontFamily: 'Inter', fill: '#111111',
          });
          (t as any).layerName = 'Text';
          fc.add(t);
          fc.setActiveObject(t);
          toolRef.current = 'select';
          return;
        }

        if (tool === 'pen') {
          penPoints.push({ x: p.x, y: p.y });
          // Double-click finalizes — handled below
          return;
        }

        isDrawing = true;
        drawStart = { x: p.x, y: p.y };

        if (tool === 'rect') {
          drawObj = new fabric.Rect({ left: p.x, top: p.y, width: 1, height: 1, fill: '#6366f1' });
        } else if (tool === 'ellipse') {
          drawObj = new fabric.Ellipse({ left: p.x, top: p.y, rx: 1, ry: 1, fill: '#10b981' });
        } else if (tool === 'triangle') {
          drawObj = new fabric.Triangle({ left: p.x, top: p.y, width: 1, height: 1, fill: '#f59e0b' });
        } else if (tool === 'line') {
          drawObj = new fabric.Line([p.x, p.y, p.x, p.y], { stroke: '#111111', strokeWidth: 2 });
        }
        if (drawObj) fc.add(drawObj);
      });

      fc.on('mouse:move', (opt) => {
        if (!isDrawing || !drawObj || !drawStart) return;
        const p = fc.getPointer(opt.e);
        const w = p.x - drawStart.x;
        const h = p.y - drawStart.y;

        if (drawObj.type === 'rect' || drawObj.type === 'triangle') {
          drawObj.set({ width: Math.abs(w), height: Math.abs(h),
            left: w < 0 ? p.x : drawStart.x, top: h < 0 ? p.y : drawStart.y });
        } else if (drawObj.type === 'ellipse') {
          (drawObj as fabric.Ellipse).set({ rx: Math.abs(w) / 2, ry: Math.abs(h) / 2,
            left: w < 0 ? p.x : drawStart.x, top: h < 0 ? p.y : drawStart.y });
        } else if (drawObj.type === 'line') {
          (drawObj as fabric.Line).set({ x2: p.x, y2: p.y });
        }
        fc.requestRenderAll();
      });

      fc.on('mouse:up', () => {
        if (drawObj) {
          (drawObj as any).layerName =
            (drawObj.type || 'shape')[0].toUpperCase() + (drawObj.type || 'shape').slice(1);
          fc.setActiveObject(drawObj);
        }
        isDrawing = false;
        drawStart = null;
        drawObj = null;
        if (toolRef.current !== 'pen') toolRef.current = 'select';
      });

      // Pen tool: double-click finalizes a polygon path
      fc.on('mouse:dblclick', () => {
        if (toolRef.current === 'pen' && penPoints.length >= 2) {
          const path = new fabric.Polyline(penPoints, {
            stroke: '#111111', strokeWidth: 2, fill: 'transparent',
          });
          (path as any).layerName = 'Path';
          fc.add(path);
          fc.setActiveObject(path);
          penPoints = [];
          toolRef.current = 'select';
        }
      });

      onReady(fc);

      return () => {
        fc.dispose();
        fabricRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync size & background
    useEffect(() => {
      const fc = fabricRef.current;
      if (!fc) return;
      fc.setWidth(width);
      fc.setHeight(height);
      fc.renderAll();
    }, [width, height]);

    useEffect(() => {
      const fc = fabricRef.current;
      if (!fc) return;
      fc.setBackgroundColor(background, () => fc.renderAll());
    }, [background]);

    return (
      <div className="relative inline-block shadow-2xl shadow-black/40">
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(127,127,127,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(127,127,127,0.18) 1px, transparent 1px)',
              backgroundSize: `${gridSize}px ${gridSize}px`,
              zIndex: 1,
            }}
          />
        )}
        <canvas ref={canvasElRef} className="block" />
      </div>
    );
  },
);

DesignCanvas.displayName = 'DesignCanvas';
export default DesignCanvas;
