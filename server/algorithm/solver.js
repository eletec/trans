/**
 * Solver — Orchestrates bin packing with multiple heuristics, grouping, multi-truck, weight
 * Supports both simulation (random iterations) and deterministic calculation modes.
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

// --- Cache system ---
const cache = new Map();
const CACHE_MAX_SIZE = 200;

function _cacheKey(params) {
  const paletteSig = params.palettes.map(p =>
    `${p.ref}:${p.length}x${p.width}x${p.height || 0}:${p.weight || 0}:${p.quantity || 1}:${p.color || ''}`
  ).join('|');
  const truckSig = `${params.truck.length_cm}x${params.truck.width_cm}x${params.truck.height_cm || 0}:${params.truck.max_weight_kg || 0}`;
  return `${paletteSig}__${truckSig}__${params.heuristic}__${params.allowRotation}__${params.groupContiguous}__${params.maxTrucks}__${params.mode || 'calculate'}__${params.iterations || 0}`;
}

function _cacheGet(key) {
  if (cache.has(key)) {
    const entry = cache.get(key);
    entry.hits++;
    entry.lastAccess = Date.now();
    return entry.result;
  }
  return null;
}

function _cacheSet(key, result) {
  if (cache.size >= CACHE_MAX_SIZE) {
    let oldest = null, oldestKey = null;
    for (const [k, v] of cache) {
      if (!oldest || v.lastAccess < oldest.lastAccess) {
        oldest = v;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { result, hits: 0, lastAccess: Date.now() });
}

/**
 * Main solver entry point.
 * @param {Object} params
 * @param {Array} params.palettes - [{id, ref, length, width, height, weight, color, comment, quantity}]
 * @param {Object} params.truck - {length_cm, width_cm, height_cm, max_weight_kg}
 * @param {string} params.heuristic - 'auto' or specific heuristic name
 * @param {string} params.mode - 'preview' | 'calculate' | 'simulation'
 * @param {number} params.iterations - number of random iterations for simulation mode (default 0 = deterministic)
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
    mode = 'calculate',
    iterations = 0,
    allowRotation = true,
    groupContiguous = true,
    maxTrucks = 10
  } = params;

  // Check cache
  const cKey = _cacheKey(params);
  const cached = _cacheGet(cKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const binWidth = truck.length_cm;
  const binHeight = truck.width_cm;
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
        length: p.length / 10,  // mm -> cm
        width: p.width / 10,
        height: p.height || 1500,
        weight: p.weight || 0,
        color: p.color || '#cccccc',
        comment: p.comment || '',
        originalIndex: expandedPalettes.length,
        lengthMm: p.length,
        widthMm: p.width
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

  let bestResult = null;
  let bestScore = { placed: 0, maxX: Infinity, trucks: Infinity };

  // --- Auto-select best heuristic based on configuration ---
  // When heuristic is 'auto', quickly benchmark all 5 heuristics in a single
  // pass and pick the one that places the most palettes with the shortest floor.
  const _pickBestHeuristic = () => {
    let bestH = 'BestAreaFit';
    let bestS = { placed: 0, maxX: Infinity, trucks: Infinity };
    for (const h of HEURISTICS) {
      const r = _packMultiTruck(expandedPalettes, binWidth, binHeight, truckMaxWeight, truckHeight, h, allowRotation, maxTrucks);
      const s = { placed: r.totalPlaced, maxX: r.trucks.reduce((mx, t) => Math.max(mx, t.maxX), 0), trucks: r.trucks.length };
      if (s.placed > bestS.placed ||
          (s.placed === bestS.placed && s.trucks < bestS.trucks) ||
          (s.placed === bestS.placed && s.trucks === bestS.trucks && s.maxX < bestS.maxX)) {
        bestH = h;
        bestS = s;
      }
    }
    return bestH;
  };

  if (mode === 'preview') {
    // --- PREVIEW MODE: 1 single pass, auto picks best heuristic ---
    const h = heuristic === 'auto' ? _pickBestHeuristic() : heuristic;
    bestResult = _packMultiTruck(expandedPalettes, binWidth, binHeight, truckMaxWeight, truckHeight, h, allowRotation, maxTrucks);
    bestResult.heuristic = h;
    bestResult.mode = 'preview';
    bestResult.iterations = 1;

  } else if (mode === 'simulation' && iterations > 0) {
    // --- SIMULATION MODE: random shuffle iterations (like original brute force) ---
    const h = heuristic === 'auto' ? _pickBestHeuristic() : heuristic;

    // Build groups for group-level shuffling (contiguous placement)
    let groups = null;
    if (groupContiguous) {
      const gMap = new Map();
      for (const p of expandedPalettes) {
        const l = Math.max(p.length, p.width);
        const w = Math.min(p.length, p.width);
        const key = `${l}x${w}`;
        if (!gMap.has(key)) gMap.set(key, []);
        gMap.get(key).push(p);
      }
      groups = Array.from(gMap.values());
    }

    for (let iter = 0; iter < iterations; iter++) {
      let shuffled;
      if (groupContiguous && groups) {
        // Shuffle groups order, keep palettes within each group together
        const shuffledGroups = [...groups];
        for (let i = shuffledGroups.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledGroups[i], shuffledGroups[j]] = [shuffledGroups[j], shuffledGroups[i]];
        }
        shuffled = shuffledGroups.flat();
      } else {
        // Shuffle individual palettes
        shuffled = [...expandedPalettes];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
      }

      const result = _packMultiTruck(shuffled, binWidth, binHeight, truckMaxWeight, truckHeight, h, allowRotation, maxTrucks);
      const score = {
        placed: result.totalPlaced,
        maxX: result.trucks.reduce((mx, t) => Math.max(mx, t.maxX), 0),
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
    bestResult.mode = 'simulation';
    bestResult.iterations = iterations;

  } else {
    // --- CALCULATE MODE: deterministic multi-heuristic (default) ---
    const heuristicsToRun = heuristic === 'auto' ? HEURISTICS : [heuristic];

    for (const h of heuristicsToRun) {
      const result = _packMultiTruck(expandedPalettes, binWidth, binHeight, truckMaxWeight, truckHeight, h, allowRotation, maxTrucks);
      const score = {
        placed: result.totalPlaced,
        maxX: result.trucks.reduce((mx, t) => Math.max(mx, t.maxX), 0),
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
    bestResult.mode = 'calculate';
    bestResult.iterations = heuristicsToRun.length;
  }

  bestResult.totalPalettes = totalPalettes;
  bestResult.fromCache = false;

  _cacheSet(cKey, bestResult);

  return bestResult;
}

/**
 * Pack palettes into multiple trucks
 */
function _packMultiTruck(palettes, binWidth, binHeight, maxWeight, truckHeight, heuristic, allowRotation, maxTrucks) {
  const trucks = [];
  let remaining = [...palettes];
  let totalPlaced = 0;
  let globalIndex = 0;

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
      if (truckResult.totalWeight + palette.weight > maxWeight) {
        stillRemaining.push(palette);
        continue;
      }

      if (palette.height > truckHeight * 10) {
        stillRemaining.push(palette);
        continue;
      }

      const placed = bin.insert(palette.length, palette.width, heuristic, allowRotation);

      if (placed) {
        const placedWidthMm = placed.width * 10;
        const placedHeightMm = placed.height * 10;

        truckResult.placements.push({
          ...palette,
          x: placed.x,
          y: placed.y,
          placedWidth: placed.width,
          placedHeight: placed.height,
          placedWidthMm,
          placedHeightMm,
          rotated: placed.width !== palette.length,
          globalIndex: globalIndex,
          remainingPercent: (100 - bin.occupancy() * 100)
        });
        truckResult.totalWeight += palette.weight;
        if (placed.x + placed.width > truckResult.maxX) {
          truckResult.maxX = placed.x + placed.width;
        }
        totalPlaced++;
        globalIndex++;
      } else {
        stillRemaining.push(palette);
      }
    }

    truckResult.occupancy = bin.occupancy();
    truckResult.floorMeters = truckResult.maxX / 100;
    trucks.push(truckResult);

    if (truckResult.placements.length === 0) break;

    remaining = stillRemaining;
  }

  return {
    trucks,
    totalPlaced,
    unplaced: remaining,
    log: _generateLog(trucks, remaining)
  };
}

/**
 * Generate log in the exact same format as the original C++ application:
 * "Placé : Ref REF Num N (x,y)=(X,Y), [WXH] Espace restant : XX.XX%"
 */
function _generateLog(trucks, unplaced) {
  const lines = [];
  const totalAllPlaced = trucks.reduce((s, t) => s + t.placements.length, 0);

  for (const t of trucks) {
    if (trucks.length > 1) {
      lines.push(`=== Camion ${t.index + 1} ===`);
      lines.push('');
    }

    for (const p of t.placements) {
      lines.push(
        `Placé : Ref ${p.ref} Num ${p.globalIndex} (x,y)=(${p.x},${p.y}), [${p.placedWidth}X${p.placedHeight}] Espace restant : ${p.remainingPercent.toFixed(2)}%`
      );
      lines.push('');
    }

    for (const p of unplaced) {
      lines.push(`Placement impossible : ${p.length}X${p.width} !`);
      lines.push('');
    }

    lines.push(`Placement terminé`);
    lines.push('');
    lines.push(`Mètres plancher : ${(t.maxX / 100).toFixed(6)} m`);
    lines.push('');
    lines.push(`Nombre de palettes placées : ${t.placements.length}/${t.placements.length + (trucks.indexOf(t) === trucks.length - 1 ? unplaced.length : 0)}`);
    lines.push('');
  }

  if (trucks.length > 1) {
    lines.push(`=== Résumé ===`);
    lines.push(`Total palettes placées : ${totalAllPlaced}/${totalAllPlaced + unplaced.length}`);
    lines.push(`Camions utilisés : ${trucks.length}`);
    lines.push(`Poids total : ${trucks.reduce((s, t) => s + t.totalWeight, 0)} kg`);
  }

  return lines;
}

function clearCache() {
  cache.clear();
}

function getCacheStats() {
  return {
    size: cache.size,
    maxSize: CACHE_MAX_SIZE,
    entries: Array.from(cache.entries()).map(([key, val]) => ({
      key: key.substring(0, 60) + '...',
      hits: val.hits,
      lastAccess: new Date(val.lastAccess).toISOString()
    }))
  };
}

module.exports = { solve, HEURISTICS, clearCache, getCacheStats };
