/**
 * Solver — Orchestrates bin packing with multiple heuristics, grouping, multi-truck, weight
 */
const MaxRectsBinPack = require('./maxrects');
const { groupPalettes } = require('./grouping');

const HEURISTICS = [
  'BestShortSideFit',
  'BestLongSideFit',
  'BestAreaFit',
  'BottomLeftRule',
  'ContactPointRule'
];

/**
 * Main solver entry point.
 * @param {Object} params
 * @param {Array} params.palettes - [{id, ref, length, width, height, weight, color, comment, quantity}]
 * @param {Object} params.truck - {length_cm, width_cm, height_cm, max_weight_kg}
 * @param {string} params.heuristic - 'auto' or specific heuristic name
 * @param {boolean} params.allowRotation - allow 90° rotation (default true)
 * @param {boolean} params.groupContiguous - group identical palettes (default true)
 * @param {number} params.maxTrucks - max number of trucks (default 10)
 * @returns {Object} result
 */
function solve(params) {
  const {
    palettes,
    truck,
    heuristic = 'auto',
    allowRotation = true,
    groupContiguous = true,
    maxTrucks = 10
  } = params;

  // Convert mm to cm (÷10) for bin dimensions matching original code
  const binWidth = truck.length_cm;   // in cm
  const binHeight = truck.width_cm;   // in cm
  const truckMaxWeight = truck.max_weight_kg || Infinity;
  const truckHeight = truck.height_cm || 270;

  // Expand palettes by quantity
  let expandedPalettes = [];
  for (const p of palettes) {
    const qty = p.quantity || 1;
    for (let i = 0; i < qty; i++) {
      expandedPalettes.push({
        id: `${p.id || p.ref}_${i}`,
        ref: p.ref || '',
        length: p.length / 10,  // mm → cm
        width: p.width / 10,
        height: p.height || 1500,  // mm
        weight: p.weight || 0,
        color: p.color || '#cccccc',
        comment: p.comment || '',
        originalIndex: expandedPalettes.length
      });
    }
  }

  const totalPalettes = expandedPalettes.length;

  // Sort by area descending (Best-Fit Decreasing)
  expandedPalettes.sort((a, b) => (b.length * b.width) - (a.length * a.width));

  // If groupContiguous, reorder so identical palettes are adjacent
  if (groupContiguous) {
    const groups = groupPalettes(expandedPalettes);
    expandedPalettes = [];
    for (const g of groups) {
      for (const item of g.items) {
        expandedPalettes.push(item);
      }
    }
  }

  // Determine which heuristics to run
  const heuristicsToRun = heuristic === 'auto' ? HEURISTICS : [heuristic];

  let bestResult = null;
  let bestScore = { placed: 0, maxX: Infinity, trucks: Infinity };

  for (const h of heuristicsToRun) {
    const result = _packMultiTruck(expandedPalettes, binWidth, binHeight, truckMaxWeight, truckHeight, h, allowRotation, maxTrucks);
    const score = {
      placed: result.totalPlaced,
      maxX: result.trucks.length > 0 ? result.trucks[result.trucks.length - 1].maxX : 0,
      trucks: result.trucks.length
    };

    const isBetter =
      score.placed > bestScore.placed ||
      (score.placed === bestScore.placed && score.trucks < bestScore.trucks) ||
      (score.placed === bestScore.placed && score.trucks === bestScore.trucks && score.maxX < bestScore.maxX);

    if (isBetter) {
      bestResult = result;
      bestResult.heuristic = h;
      bestScore = score;
    }
  }

  bestResult.totalPalettes = totalPalettes;
  return bestResult;
}

/**
 * Pack palettes into multiple trucks
 */
function _packMultiTruck(palettes, binWidth, binHeight, maxWeight, truckHeight, heuristic, allowRotation, maxTrucks) {
  const trucks = [];
  let remaining = [...palettes];
  let totalPlaced = 0;

  while (remaining.length > 0 && trucks.length < maxTrucks) {
    const bin = new MaxRectsBinPack(binWidth, binHeight);
    const truckResult = {
      index: trucks.length,
      placements: [],
      maxX: 0,
      totalWeight: 0,
      occupancy: 0
    };

    const stillRemaining = [];

    for (const palette of remaining) {
      // Check weight constraint
      if (truckResult.totalWeight + palette.weight > maxWeight) {
        stillRemaining.push(palette);
        continue;
      }

      // Check height constraint for 3D
      if (palette.height > truckHeight * 10) { // palette height in mm, truck in cm
        stillRemaining.push(palette);
        continue;
      }

      const placed = bin.insert(palette.length, palette.width, heuristic, allowRotation);

      if (placed) {
        truckResult.placements.push({
          ...palette,
          x: placed.x,
          y: placed.y,
          placedWidth: placed.width,
          placedHeight: placed.height,
          rotated: placed.width !== palette.length
        });
        truckResult.totalWeight += palette.weight;
        if (placed.x + placed.width > truckResult.maxX) {
          truckResult.maxX = placed.x + placed.width;
        }
        totalPlaced++;
      } else {
        stillRemaining.push(palette);
      }
    }

    truckResult.occupancy = bin.occupancy();
    truckResult.floorMeters = truckResult.maxX / 100;
    trucks.push(truckResult);

    // If nothing was placed in this truck, stop (avoid infinite loop)
    if (truckResult.placements.length === 0) {
      break;
    }

    remaining = stillRemaining;
  }

  return {
    trucks,
    totalPlaced,
    unplaced: remaining,
    log: _generateLog(trucks, remaining)
  };
}

function _generateLog(trucks, unplaced) {
  const lines = [];
  for (const t of trucks) {
    lines.push(`=== Camion ${t.index + 1} ===`);
    for (let i = 0; i < t.placements.length; i++) {
      const p = t.placements[i];
      lines.push(`Placé : Ref ${p.ref} #${i + 1} (${p.x},${p.y}) [${p.placedWidth}x${p.placedHeight}] ${p.weight}kg`);
    }
    lines.push(`Mètres plancher : ${t.floorMeters.toFixed(2)} m`);
    lines.push(`Poids total : ${t.totalWeight} kg`);
    lines.push(`Occupation : ${(t.occupancy * 100).toFixed(1)}%`);
    lines.push(`Palettes placées : ${t.placements.length}`);
    lines.push('');
  }
  if (unplaced.length > 0) {
    lines.push(`*** ${unplaced.length} palette(s) non placée(s) ***`);
    for (const p of unplaced) {
      lines.push(`  Non placé : ${p.ref} [${p.length}x${p.width}] ${p.weight}kg`);
    }
  }
  return lines;
}

module.exports = { solve, HEURISTICS };
