import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import { AppContext } from '../App';

export default function Canvas2D({ truck, result, truckIndex, onDragPalette }) {
  const { marker } = useContext(AppContext);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 40, y: 40 });

  const binW = truck.length_cm;
  const binH = truck.width_cm;

  const placements = result?.trucks?.[truckIndex]?.placements || [];
  const truckData = result?.trucks?.[truckIndex];

  // Calculate scale to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth - 80;
    const ch = container.clientHeight - 80;
    const s = Math.min(cw / binW, ch / binH, 1.5);
    setScale(s);
  }, [binW, binH, truck]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = binW * scale + 80;
    const h = binH * scale + 80;
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const ox = offset.x;
    const oy = offset.y;

    // Truck outline
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, binW * scale, binH * scale);

    // Grid lines every 100cm (1m)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let x = 100; x < binW; x += 100) {
      ctx.beginPath();
      ctx.moveTo(ox + x * scale, oy);
      ctx.lineTo(ox + x * scale, oy + binH * scale);
      ctx.stroke();
    }

    // Marker line (configurable via preferences, e.g. 800cm = smaller truck reference)
    if (marker > 0 && marker < binW) {
      ctx.strokeStyle = '#dc262660';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ox + marker * scale, oy);
      ctx.lineTo(ox + marker * scale, oy + binH * scale);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#dc262690';
      ctx.font = '9px sans-serif';
      ctx.fillText(`${(marker / 100).toFixed(1)}m`, ox + marker * scale + 3, oy - 4);
    }

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    for (let x = 0; x <= binW; x += 200) {
      ctx.fillText(`${(x / 100).toFixed(0)}m`, ox + x * scale - 4, oy - 8);
    }

    // Draw palettes
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      const px = ox + p.x * scale;
      const py = oy + p.y * scale;
      const pw = p.placedWidth * scale;
      const ph = p.placedHeight * scale;

      // Fill
      ctx.fillStyle = p.color || '#94a3b8';
      ctx.globalAlpha = i === hovered ? 1 : 0.85;
      ctx.fillRect(px, py, pw, ph);

      // Border
      ctx.globalAlpha = 1;
      ctx.strokeStyle = i === hovered ? '#1e40af' : '#334155';
      ctx.lineWidth = i === hovered ? 2 : 1;
      ctx.strokeRect(px, py, pw, ph);

      // Text
      if (pw > 30 && ph > 15) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px sans-serif';
        const label = p.ref || `#${i + 1}`;
        ctx.fillText(label, px + 3, py + 12);

        if (ph > 30) {
          ctx.font = '9px sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText(`${p.placedWidth * 10}×${p.placedHeight * 10}`, px + 3, py + 24);
        }
        if (ph > 45 && p.weight) {
          ctx.fillText(`${p.weight}kg`, px + 3, py + 36);
        }
        if (ph > 58 && p.comment) {
          ctx.font = '8px sans-serif';
          ctx.fillText(p.comment, px + 3, py + 48);
        }
      }
    }

    // MaxX marker
    if (truckData && truckData.maxX > 0) {
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      const mx = ox + truckData.maxX * scale;
      ctx.moveTo(mx, oy);
      ctx.lineTo(mx, oy + binH * scale);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${truckData.floorMeters.toFixed(2)}m`, mx + 4, oy + 14);
    }

  }, [placements, scale, offset, hovered, truck, truckData, binW, binH, marker]);

  // Mouse interactions for drag & drop
  const getCanvasPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale
    };
  }, [scale, offset]);

  const findPaletteAt = useCallback((mx, my) => {
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      if (mx >= p.x && mx <= p.x + p.placedWidth &&
          my >= p.y && my <= p.y + p.placedHeight) {
        return i;
      }
    }
    return -1;
  }, [placements]);

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e);
    const idx = findPaletteAt(pos.x, pos.y);
    if (idx >= 0) {
      const p = placements[idx];
      setDragging({
        idx,
        offsetX: pos.x - p.x,
        offsetY: pos.y - p.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    const pos = getCanvasPos(e);
    if (dragging) {
      const newX = Math.max(0, Math.min(binW - placements[dragging.idx].placedWidth, pos.x - dragging.offsetX));
      const newY = Math.max(0, Math.min(binH - placements[dragging.idx].placedHeight, pos.y - dragging.offsetY));
      onDragPalette(truckIndex, dragging.idx, newX, newY);
    } else {
      const idx = findPaletteAt(pos.x, pos.y);
      setHovered(idx >= 0 ? idx : null);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto flex items-start justify-start p-2 cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={dragging ? 'cursor-grabbing' : 'cursor-crosshair'}
      />
      {!result && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-lg">Lancez un calcul pour afficher le résultat</p>
        </div>
      )}
    </div>
  );
}
