/**
 * Experimental 3D solver (layered packing).
 *
 * This is intentionally separated from the 2D MAXRECTS solver so the legacy
 * behavior stays stable. The algorithm fills each truck by horizontal layers:
 * - each layer uses 2D MAXRECTS on length x width
 * - z increases by the tallest item placed in the layer
 *
 * Note: this is a pragmatic 3D approach, not a full cuboid free-space solver.
 */
const MaxRectsBinPack = require('./maxrects');

function _isBetterScore(a, b) {
  return a.placed > b.placed ||
    (a.placed === b.placed && a.trucks < b.trucks) ||
    (a.placed === b.placed && a.trucks === b.trucks && a.maxX < b.maxX);
}

function _score(result) {
  return {
    placed: result.totalPlaced,
    trucks: result.trucks.length,
    maxX: result.trucks.reduce((mx, t) => Math.max(mx, t.maxX || 0), 0)
  };
}

function _isBetterTruckCandidate(a, b) {
  if (!b) return true;
  if (a.placedCount !== b.placedCount) return a.placedCount > b.placedCount;
  if (a.maxX !== b.maxX) return a.maxX < b.maxX;
  return a.layers < b.layers;
}

function _packSingleTruckLayered(palettes, truck, widthLimit, heuristic, allowRotation) {
  const binDepth = truck.width_cm;
  const truckHeightCm = truck.height_cm || 270;
  const maxWeight = truck.max_weight_kg || Infinity;
  const usableWidth = Math.max(1, Math.min(widthLimit, truck.length_cm));

  const truckResult = {
    placements: [],
    maxX: 0,
    totalWeight: 0,
    occupancy: 0,
    volumeOccupancy: 0,
    layers: 0,
    widthLimit: usableWidth,
    placedCount: 0,
    remaining: []
  };

  let zBaseCm = 0;
  let truckRemaining = [...palettes];
  const noStackZones = [];

  while (truckRemaining.length > 0 && zBaseCm < truckHeightCm) {
    const availableHeightCm = truckHeightCm - zBaseCm;
    if (availableHeightCm <= 0) break;

    const bin = new MaxRectsBinPack(usableWidth, binDepth);

    // In 3D mode, footprints of non-stackable palettes placed at layer 0 are
    // reserved in upper layers to prevent stacking above them.
    if (zBaseCm > 0 && noStackZones.length > 0) {
      for (const zone of noStackZones) {
        bin.insertAt(zone.x, zone.y, zone.width, zone.height);
      }
    }

    const stillRemaining = [];
    const layerPlacements = [];
    let layerMaxHeightCm = 0;

    for (const palette of truckRemaining) {
      const paletteHeightCm = (palette.height || 1500) / 10; // mm -> cm

      // Business rule: stackable is only applied in 3D mode.
      // If palette is not stackable, it must stay on ground layer (z = 0).
      if (zBaseCm > 0 && palette.stackable === false) {
        stillRemaining.push(palette);
        continue;
      }

      if (paletteHeightCm > availableHeightCm) {
        stillRemaining.push(palette);
        continue;
      }

      if (truckResult.totalWeight + (palette.weight || 0) > maxWeight) {
        stillRemaining.push(palette);
        continue;
      }

      const placed = bin.insert(palette.length, palette.width, heuristic, allowRotation);
      if (!placed) {
        stillRemaining.push(palette);
        continue;
      }

      layerPlacements.push({
        ...palette,
        x: placed.x,
        y: placed.y,
        z: Number(zBaseCm.toFixed(1)),
        placedWidth: placed.width,
        placedHeight: placed.height,
        rotated: placed.width !== palette.length,
        remainingPercent: 0
      });

      layerMaxHeightCm = Math.max(layerMaxHeightCm, paletteHeightCm);
      truckResult.totalWeight += palette.weight || 0;
      truckResult.maxX = Math.max(truckResult.maxX, placed.x + placed.width);

      if (zBaseCm === 0 && palette.stackable === false) {
        noStackZones.push({ x: placed.x, y: placed.y, width: placed.width, height: placed.height });
      }
    }

    if (layerPlacements.length === 0) break;

    const remainingPercent = 100 - bin.occupancy() * 100;
    for (const p of layerPlacements) p.remainingPercent = remainingPercent;

    truckResult.placements.push(...layerPlacements);
    truckResult.layers += 1;
    zBaseCm += layerMaxHeightCm;
    truckRemaining = stillRemaining;
  }

  truckResult.placedCount = truckResult.placements.length;
  truckResult.remaining = truckRemaining;

  const usedArea = truckResult.placements.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0);
  const floorArea = Math.max(1, usableWidth * binDepth);
  const normalizedLayers = Math.max(1, truckResult.layers);
  truckResult.occupancy = usedArea / (floorArea * normalizedLayers);

  const usedVolume = truckResult.placements.reduce((s, p) => {
    return s + p.placedWidth * p.placedHeight * ((p.height || 1500) / 10);
  }, 0);
  const truckVolume = Math.max(1, usableWidth * binDepth * truckHeightCm);
  truckResult.volumeOccupancy = usedVolume / truckVolume;
  truckResult.floorMeters = truckResult.maxX / 100;

  return truckResult;
}

// Reduce floor meters by tightening usable X-width and allowing overflow to
// upper layers when possible.
function _optimizeTruckPlacement(palettes, truck, heuristic, allowRotation) {
  let best = _packSingleTruckLayered(palettes, truck, truck.length_cm, heuristic, allowRotation);
  if (best.placedCount === 0) return best;

  const start = Math.max(1, Math.floor(best.maxX));
  const lowerBound = Math.max(100, Math.floor(start * 0.45));

  // Coarse sweep
  for (let limit = start - 10; limit >= lowerBound; limit -= 10) {
    const candidate = _packSingleTruckLayered(palettes, truck, limit, heuristic, allowRotation);
    if (_isBetterTruckCandidate(candidate, best)) best = candidate;
  }

  // Fine sweep near best candidate
  const fineStart = Math.max(lowerBound, Math.floor(best.maxX) - 20);
  const fineEnd = Math.max(lowerBound, Math.floor(best.maxX) - 1);
  for (let limit = fineEnd; limit >= fineStart; limit--) {
    const candidate = _packSingleTruckLayered(palettes, truck, limit, heuristic, allowRotation);
    if (_isBetterTruckCandidate(candidate, best)) best = candidate;
  }

  return best;
}

function _pack3DMultiTruck(palettes, truck, heuristic, allowRotation, maxTrucks) {
  const trucks = [];
  let remaining = [...palettes];
  let totalPlaced = 0;
  let globalIndex = 0;

  while (remaining.length > 0 && trucks.length < maxTrucks) {
      const candidate = _optimizeTruckPlacement(remaining, truck, heuristic, allowRotation);
      if (!candidate || candidate.placedCount === 0) break;

      const placements = candidate.placements.map((p, idx) => {
        const g = globalIndex + idx;
        return {
          ...p,
          globalIndex: g,
          num: g + 1,
          placedWidthMm: p.placedWidth * 10,
          placedHeightMm: p.placedHeight * 10
        };
      });

      globalIndex += placements.length;
      totalPlaced += placements.length;

      trucks.push({
        index: trucks.length,
        placements,
        maxX: candidate.maxX,
        totalWeight: candidate.totalWeight,
        occupancy: candidate.occupancy,
        volumeOccupancy: candidate.volumeOccupancy,
        layers: candidate.layers,
        floorMeters: candidate.floorMeters,
        widthLimit: candidate.widthLimit
      });

      remaining = candidate.remaining;
  }

  return {
    trucks,
    totalPlaced,
    unplaced: remaining
  };
}

function _generate3DLog(trucks, unplaced) {
  const lines = [];
  const totalAllPlaced = trucks.reduce((s, t) => s + t.placements.length, 0);

  for (const t of trucks) {
    if (trucks.length > 1) {
      lines.push(`=== Camion ${t.index + 1} ===`);
      lines.push('');
    }

    lines.push(`Mode 3D (empilage): ${t.layers} couche(s), occupation volume ${(t.volumeOccupancy * 100).toFixed(2)}%`);
    lines.push(`Largeur optimisee (X): ${(t.maxX / 100).toFixed(2)} m`);
    lines.push('');

    for (const p of t.placements) {
      const ph = Math.round((p.height || 1500) / 10);
      lines.push(
        `Place 3D : Ref ${p.ref} Num ${p.globalIndex} (x,y,z)=(${p.x},${p.y},${p.z}), [${p.placedWidth}X${p.placedHeight}X${ph}]`
      );
      lines.push('');
    }

    for (const p of unplaced) {
      lines.push(`Placement 3D impossible : ${p.length}X${p.width}X${Math.round((p.height || 1500) / 10)} !`);
      lines.push('');
    }

    lines.push('Placement termine');
    lines.push('');
    lines.push(`Metres plancher : ${(t.maxX / 100).toFixed(6)} m`);
    lines.push('');
    lines.push(`Nombre de palettes placees : ${t.placements.length}/${t.placements.length + (trucks.indexOf(t) === trucks.length - 1 ? unplaced.length : 0)}`);
    lines.push('');
  }

  if (trucks.length > 1) {
    lines.push('=== Resume ===');
    lines.push(`Total palettes placees : ${totalAllPlaced}/${totalAllPlaced + unplaced.length}`);
    lines.push(`Camions utilises : ${trucks.length}`);
    lines.push(`Poids total : ${trucks.reduce((s, t) => s + t.totalWeight, 0)} kg`);
  }

  return lines;
}

function solve3D(params) {
  const {
    palettes,
    truck,
    heuristic = 'auto',
    mode = 'calculate',
    allowRotation = true,
    maxTrucks = 10,
    heuristics = []
  } = params;

  const heuristicsToRun = heuristic === 'auto'
    ? (heuristics.length > 0 ? heuristics : ['BestAreaFit'])
    : [heuristic];

  const sortStrategies = [
    (a, b) => (b.length * b.width) - (a.length * a.width),
    (a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width),
    (a, b) => Math.min(b.length, b.width) - Math.min(a.length, a.width),
    (a, b) => (b.length + b.width) - (a.length + a.width),
    (a, b) => b.width - a.width || b.length - a.length,
    (a, b) => b.length - a.length || b.width - a.width,
    (a, b) => (a.length * a.width) - (b.length * b.width),
  ];

  let bestResult = null;
  let bestScore = { placed: 0, trucks: Infinity, maxX: Infinity };
  let bestHeuristic = heuristicsToRun[0] || 'BestAreaFit';

  for (const h of heuristicsToRun) {
    for (const sortFn of sortStrategies) {
      const ordered = [...palettes].sort(sortFn);
      const result = _pack3DMultiTruck(ordered, truck, h, allowRotation, maxTrucks);
      const score = _score(result);
      if (!bestResult || _isBetterScore(score, bestScore)) {
        bestResult = result;
        bestScore = score;
        bestHeuristic = h;
      }
    }
  }

  if (!bestResult) {
    bestResult = { trucks: [], totalPlaced: 0, unplaced: [...palettes] };
  }

  bestResult.heuristic = bestHeuristic;
  bestResult.mode = mode;
  bestResult.iterations = heuristicsToRun.length * sortStrategies.length;
  bestResult.log = _generate3DLog(bestResult.trucks, bestResult.unplaced);

  return bestResult;
}

module.exports = { solve3D };
