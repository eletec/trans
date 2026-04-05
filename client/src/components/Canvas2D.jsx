import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import { AppContext } from '../App';
import { useTheme } from '../ThemeContext';

export default function Canvas2D({ truck, result, truckIndex, onDragPalettes, onDropPalettes }) {
  const { marker } = useContext(AppContext);
  const { darkMode } = useTheme();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { indices, offsets[], startPositions[] }
  const [selected, setSelected] = useState(new Set());
  const [hovered, setHovered] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 16, y: 16 });

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
      const cw = container.clientWidth - 32;
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
    const w = binW * scale + 32;
    const h = binH * scale + 52; // extra bottom space for axle + CoG labels
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    // Background
    ctx.fillStyle = darkMode ? '#1e293b' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const ox = offset.x;
    const oy = offset.y;

    // Truck outline
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, binW * scale, binH * scale);

    // Grid lines every 100cm (1m)
    ctx.strokeStyle = darkMode ? '#334155' : '#e2e8f0';
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
    ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
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

    // ── Axles & Centre de Gravité ──────────────────────────────────
    const axleRear = truck.axle_rear_cm || Math.round(truck.length_cm * 0.855);
    const ty = oy + binH * scale;

    // Rear axle: dashed vertical line through cargo + small triangle tick below
    if (axleRear > 0 && axleRear <= binW) {
      const ax = ox + axleRear * scale;
      ctx.strokeStyle = darkMode ? '#fbbf2450' : '#f59e0b50';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, oy);
      ctx.lineTo(ax, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      // Tick triangle below truck
      ctx.fillStyle = darkMode ? '#fbbf24' : '#d97706';
      ctx.beginPath();
      ctx.moveTo(ax - 6, ty + 1);
      ctx.lineTo(ax + 6, ty + 1);
      ctx.lineTo(ax, ty + 11);
      ctx.closePath();
      ctx.fill();
    }
    // King pin tick (front of trailer at x = 0)
    ctx.fillStyle = darkMode ? '#fbbf24' : '#d97706';
    ctx.beginPath();
    ctx.moveTo(ox - 6, ty + 1);
    ctx.lineTo(ox + 6, ty + 1);
    ctx.lineTo(ox, ty + 11);
    ctx.closePath();
    ctx.fill();

    // Centre de gravité
    const cogPalettes = placements.filter(p => p.x >= 0 && p.x < 9999);
    const loadWeight = cogPalettes.reduce((s, p) => s + (p.weight || 0), 0);
    let cogX = null;
    if (cogPalettes.length > 0) {
      if (loadWeight > 0) {
        cogX = cogPalettes.reduce((s, p) => s + (p.weight || 0) * (p.x + p.placedWidth / 2), 0) / loadWeight;
      } else {
        cogX = cogPalettes.reduce((s, p) => s + (p.x + p.placedWidth / 2), 0) / cogPalettes.length;
      }
    }

    if (cogX !== null) {
      const cx = ox + cogX * scale;
      // Compute balance quality color
      const cogRatio = axleRear > 0 ? cogX / axleRear : 0.5;
      let cogColor, cogColorFaint;
      if (cogRatio >= 0.30 && cogRatio <= 0.55) {
        cogColor = darkMode ? '#4ade80' : '#16a34a';   // green — good balance
        cogColorFaint = '#16a34a28';
      } else if (cogRatio >= 0.20 && cogRatio <= 0.70) {
        cogColor = darkMode ? '#fb923c' : '#ea580c';   // orange — acceptable
        cogColorFaint = '#ea580c28';
      } else {
        cogColor = darkMode ? '#f87171' : '#dc2626';   // red — dangerous
        cogColorFaint = '#dc262628';
      }
      // Light dashed CdG guideline
      ctx.strokeStyle = cogColorFaint;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(cx, oy);
      ctx.lineTo(cx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      // CdG inverted triangle (pointing down)
      ctx.fillStyle = cogColor;
      ctx.beginPath();
      ctx.moveTo(cx - 8, ty + 1);
      ctx.lineTo(cx + 8, ty + 1);
      ctx.lineTo(cx, ty + 13);
      ctx.closePath();
      ctx.fill();
      // CdG position label
      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = cogColor;
      ctx.textAlign = 'center';
      ctx.fillText(`CdG ${(cogX / 100).toFixed(1)}m`, cx, ty + 26);
      ctx.textAlign = 'left';

      // Weight distribution (pivot / bogie)
      if (loadWeight > 0 && axleRear > 0) {
        const clampedCog = Math.max(0, Math.min(cogX, axleRear));
        const wRear = Math.round(loadWeight * clampedCog / axleRear);
        const wFront = loadWeight - wRear;
        const pFront = Math.round(wFront / loadWeight * 100);
        const pRear = 100 - pFront;
        const lblColor = cogColor;
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = lblColor;
        ctx.textAlign = 'left';
        ctx.fillText(`Pivot  ${(wFront / 1000).toFixed(2)}t (${pFront}%)`, ox + 2, ty + 44);
        if (axleRear <= binW) {
          ctx.textAlign = 'right';
          ctx.fillText(`Bogie  ${(wRear / 1000).toFixed(2)}t (${pRear}%)`, ox + axleRear * scale - 2, ty + 44);
        }
        ctx.textAlign = 'left';
      }
    }

  }, [placements, scale, offset, hovered, selected, truck, truckData, binW, binH, marker, darkMode]);

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
