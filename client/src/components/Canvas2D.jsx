import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import { AppContext } from '../App';

export default function Canvas2D({ truck, result, truckIndex, onDragPalettes, onDropPalettes }) {
  const { marker } = useContext(AppContext);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { indices, offsets[], startPositions[] }
  const [selected, setSelected] = useState(new Set());
  const [hovered, setHovered] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 40, y: 40 });

  const binW = truck.length_cm;
  const binH = truck.width_cm;

  const rawPlacements = result?.trucks?.[truckIndex]?.placements || [];
  const placements = rawPlacements.map((p, i) => p.num ? p : { ...p, num: i + 1 });
  const truckData = result?.trucks?.[truckIndex];

  // Calculate scale to fit container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateScale = () => {
      const cw = container.clientWidth - 80;
      const s = Math.max(0.3, cw / binW);
      setScale(s);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(container);
    return () => ro.disconnect();
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
      const isSel = selected.has(i);

      // Fill
      ctx.fillStyle = p.color || '#94a3b8';
      ctx.globalAlpha = i === hovered || isSel ? 1 : 0.85;
      ctx.fillRect(px, py, pw, ph);

      // Border — selected = blue dashed, hovered = blue solid
      ctx.globalAlpha = 1;
      if (isSel) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
      } else if (i === hovered) {
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
      }
      ctx.strokeRect(px, py, pw, ph);
      ctx.setLineDash([]);

      // Text
      if (pw > 30 && ph > 15) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px sans-serif';
        const label = `${p.ref || '?'} #${p.num || (i + 1)}`;
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

  }, [placements, scale, offset, hovered, selected, truck, truckData, binW, binH, marker]);

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

  // Helper: dimension key for grouping same-sized palettes
  const dimKey = useCallback((p) => {
    const l = Math.max(p.placedWidth, p.placedHeight);
    const w = Math.min(p.placedWidth, p.placedHeight);
    return `${l}x${w}`;
  }, []);

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e);
    const idx = findPaletteAt(pos.x, pos.y);
    if (idx < 0) {
      // Click on empty area → clear selection
      setSelected(new Set());
      return;
    }

    const p = placements[idx];

    if (e.detail === 2) {
      // Double-click → select all same-sized palettes
      const key = dimKey(p);
      const sameGroup = new Set();
      placements.forEach((pp, i) => { if (dimKey(pp) === key) sameGroup.add(i); });
      setSelected(sameGroup);
      e.preventDefault();
      return;
    }

    // Build the set of indices to drag
    let dragSet;
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click toggles individual palette in selection
      const next = new Set(selected);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      setSelected(next);
      dragSet = next;
    } else if (selected.has(idx)) {
      // Click on already-selected palette → drag the whole selection
      dragSet = selected;
    } else {
      // Click without ctrl → select only this one
      const next = new Set([idx]);
      setSelected(next);
      dragSet = next;
    }

    // Build drag state for all selected palettes
    const indices = Array.from(dragSet);
    const offsets = indices.map(i => ({
      dx: pos.x - placements[i].x,
      dy: pos.y - placements[i].y
    }));
    const startPositions = indices.map(i => ({
      x: placements[i].x,
      y: placements[i].y
    }));

    setDragging({ indices, offsets, startPositions, anchorIdx: idx });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    const pos = getCanvasPos(e);
    if (dragging) {
      // Find anchor offset
      const anchorI = dragging.indices.indexOf(dragging.anchorIdx);
      const anchorOff = dragging.offsets[anchorI];
      // Calculate base position for anchor
      const baseX = pos.x - anchorOff.dx;
      const baseY = pos.y - anchorOff.dy;
      // Delta from anchor's start
      const deltaX = baseX - dragging.startPositions[anchorI].x;
      const deltaY = baseY - dragging.startPositions[anchorI].y;

      // Move all selected palettes by the same delta
      const moves = dragging.indices.map((palIdx, k) => {
        const newX = Math.max(0, Math.min(binW - placements[palIdx].placedWidth,
          dragging.startPositions[k].x + deltaX));
        const newY = Math.max(0, Math.min(binH - placements[palIdx].placedHeight,
          dragging.startPositions[k].y + deltaY));
        return { palIdx, x: newX, y: newY };
      });
      onDragPalettes(truckIndex, moves);
    } else {
      const idx = findPaletteAt(pos.x, pos.y);
      setHovered(idx >= 0 ? idx : null);
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      // Check if any palette actually moved
      let movedSignificantly = false;
      for (let k = 0; k < dragging.indices.length; k++) {
        const p = placements[dragging.indices[k]];
        if (Math.abs(p.x - dragging.startPositions[k].x) > 2 ||
            Math.abs(p.y - dragging.startPositions[k].y) > 2) {
          movedSignificantly = true;
          break;
        }
      }
      if (movedSignificantly && onDropPalettes) {
        onDropPalettes(truckIndex, dragging.indices);
      }
      setDragging(null);
    }
  };

  return (
    <div ref={containerRef} className="w-full overflow-auto p-2">
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
