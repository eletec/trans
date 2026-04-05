/**
 * Option B — Full 3D cuboid free-space solver.
 *
 * Goals:
 * - True 3D placement in free cuboids (x, y, z)
 * - Support constraints for stacked items
 * - Stackability business rule (stackable yes/no)
 * - Per-palette support load constraints (optional max_top_weight_kg)
 *
 * This solver is intentionally independent from MAXRECTS to keep 2D and
 * layered 3D modes backward compatible.
 */

const EPS = 1e-6;
const MIN_SUPPORT_RATIO = 0.78;
const MIN_SUPPORTED_CORNERS = 3;

function _almostEq(a, b) {
  return Math.abs(a - b) <= EPS;
}

function _intersects2D(a, b) {
  return a.x < b.x + b.w - EPS &&
    a.x + a.w > b.x + EPS &&
    a.y < b.y + b.d - EPS &&
    a.y + a.d > b.y + EPS;
}

function _overlapArea2D(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.d, b.y + b.d);
  if (x2 <= x1 + EPS || y2 <= y1 + EPS) return 0;
  return (x2 - x1) * (y2 - y1);
}

function _containsPoint2D(box, px, py) {
  return px >= box.x + EPS && px <= box.x + box.w - EPS &&
    py >= box.y + EPS && py <= box.y + box.d - EPS;
}

function _intersects3D(a, b) {
  return a.x < b.x + b.w - EPS &&
    a.x + a.w > b.x + EPS &&
    a.y < b.y + b.d - EPS &&
    a.y + a.d > b.y + EPS &&
    a.z < b.z + b.h - EPS &&
    a.z + a.h > b.z + EPS;
}

function _containsBox(a, b) {
  return b.x >= a.x - EPS && b.y >= a.y - EPS && b.z >= a.z - EPS &&
    b.x + b.w <= a.x + a.w + EPS &&
    b.y + b.d <= a.y + a.d + EPS &&
    b.z + b.h <= a.z + a.h + EPS;
}

function _isBetterGlobalScore(a, b) {
  return a.placed > b.placed ||
    (a.placed === b.placed && a.trucks < b.trucks) ||
    (a.placed === b.placed && a.trucks === b.trucks && a.sumFloor < b.sumFloor);
}

function _isBetterTruckCandidate(a, b) {
  if (!b) return true;
  const aPlaced = a.placements.length;
  const bPlaced = b.placements.length;
  if (aPlaced !== bPlaced) return aPlaced > bPlaced;
  if (!_almostEq(a.maxX, b.maxX)) return a.maxX < b.maxX;
  if (!_almostEq(a.usedVolume, b.usedVolume)) return a.usedVolume > b.usedVolume;
  return a.layers < b.layers;
}

function _deriveSupportCapacityKg(item) {
  if (item.stackable === false) return 0;
  if (Number.isFinite(item.max_top_weight_kg) && item.max_top_weight_kg >= 0) {
    return item.max_top_weight_kg;
  }
  const selfWeight = Math.max(0, Number(item.weight) || 0);
  return Math.max(1000, selfWeight * 2.5);
}

function _getOrientations(item, allowRotation) {
  const h = (item.height || 1500) / 10; // mm -> cm
  const base = [{ w: item.length, d: item.width, h, rotated: false }];
  if (allowRotation && Math.abs(item.length - item.width) > EPS) {
    base.push({ w: item.width, d: item.length, h, rotated: true });
  }
  return base;
}

function _isCenterAndCornersSupported(footprint, supporters) {
  const cx = footprint.x + footprint.w / 2;
  const cy = footprint.y + footprint.d / 2;

  const centerOk = supporters.some(s => _containsPoint2D(s.box, cx, cy));
  if (!centerOk) return false;

  const corners = [
    [footprint.x + EPS, footprint.y + EPS],
    [footprint.x + footprint.w - EPS, footprint.y + EPS],
    [footprint.x + EPS, footprint.y + footprint.d - EPS],
    [footprint.x + footprint.w - EPS, footprint.y + footprint.d - EPS],
  ];

  let supportedCorners = 0;
  for (const [x, y] of corners) {
    if (supporters.some(s => _containsPoint2D(s.box, x, y))) supportedCorners++;
  }

  return supportedCorners >= MIN_SUPPORTED_CORNERS;
}

function _evaluateSupport(feet, z, item, placements, blockedColumns) {
  // Stackability business rule is enforced only in 3D modes.
  if (z > EPS && item.stackable === false) {
    return { ok: false, reason: 'non-stackable-above-ground' };
  }

  // If a non-stackable item occupies a footprint, nothing can be placed above it.
  if (z > EPS) {
    for (const col of blockedColumns) {
      if (z + EPS < col.zTop) continue;
      if (_intersects2D(feet, col)) {
        return { ok: false, reason: 'blocked-footprint' };
      }
    }
  }

  if (z <= EPS) {
    const area = feet.w * feet.d;
    return {
      ok: true,
      supportArea: area,
      supportRatio: 1,
      supporters: [],
      contact: area
    };
  }

  const supporters = [];
  let supportArea = 0;

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const topZ = p.z + p.h;
    if (!_almostEq(topZ, z)) continue;

    const box2d = { x: p.x, y: p.y, w: p.w, d: p.d };
    const overlap = _overlapArea2D(feet, box2d);
    if (overlap > EPS) {
      supporters.push({ index: i, overlap, box: box2d });
      supportArea += overlap;
    }
  }

  if (supportArea <= EPS) {
    return { ok: false, reason: 'no-support' };
  }

  const area = feet.w * feet.d;
  const supportRatio = supportArea / area;
  if (supportRatio < MIN_SUPPORT_RATIO) {
    return { ok: false, reason: 'support-ratio' };
  }

  if (!_isCenterAndCornersSupported(feet, supporters)) {
    return { ok: false, reason: 'corner-or-center-support' };
  }

  const totalWeight = Math.max(0, Number(item.weight) || 0);
  const loadShares = supporters.map(s => ({
    index: s.index,
    overlap: s.overlap,
    shareKg: totalWeight * (s.overlap / supportArea)
  }));

  for (const ls of loadShares) {
    if ((placements[ls.index].remainingSupportKg || 0) + EPS < ls.shareKg) {
      return { ok: false, reason: 'support-load-limit' };
    }
  }

  return {
    ok: true,
    supportArea,
    supportRatio,
    supporters: loadShares,
    contact: supportArea
  };
}

function _contactWithContainer(truck, pos) {
  let contact = 0;
  if (pos.x <= EPS) contact += pos.d * pos.h;
  if (pos.y <= EPS) contact += pos.w * pos.h;
  if (pos.z <= EPS) contact += pos.w * pos.d;
  if (pos.x + pos.w >= truck.length_cm - EPS) contact += pos.d * pos.h;
  if (pos.y + pos.d >= truck.width_cm - EPS) contact += pos.w * pos.h;
  if (pos.z + pos.h >= truck.height_cm - EPS) contact += pos.w * pos.d;
  return contact;
}

function _candidateKey(c, method) {
  const leftX = c.box.w - c.w;
  const leftY = c.box.d - c.d;
  const leftZ = c.box.h - c.h;
  const shortFit = Math.min(leftX, leftY, leftZ);
  const longFit = Math.max(leftX, leftY, leftZ);
  const areaWaste = c.box.w * c.box.d - c.w * c.d;
  const volWaste = c.box.w * c.box.d * c.box.h - c.w * c.d * c.h;

  switch (method) {
    case 'BestShortSideFit':
      return [c.x + c.w, c.z, shortFit, longFit, c.y, volWaste, -c.contact];
    case 'BestLongSideFit':
      return [c.x + c.w, c.z, longFit, shortFit, c.y, volWaste, -c.contact];
    case 'BestAreaFit':
      return [c.x + c.w, c.z, areaWaste, volWaste, c.y, -c.supportRatio];
    case 'BottomLeftRule':
      return [c.x + c.w, c.z, c.y, c.x, areaWaste, volWaste, -c.supportRatio];
    case 'ContactPointRule':
      return [c.x + c.w, c.z, -c.contact, c.y, areaWaste, volWaste, -c.supportRatio];
    default:
      return [c.x + c.w, c.z, areaWaste, volWaste, c.y, -c.supportRatio];
  }
}

function _lexiLess(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv - EPS) return true;
    if (av > bv + EPS) return false;
  }
  return false;
}

function _findBestCandidate(item, freeBoxes, placements, blockedColumns, truck, method, allowRotation, currentWeight, maxWeight) {
  if (currentWeight + (item.weight || 0) > maxWeight) return null;

  let best = null;
  let bestKey = null;

  for (const box of freeBoxes) {
    for (const o of _getOrientations(item, allowRotation)) {
      if (o.w > box.w + EPS || o.d > box.d + EPS || o.h > box.h + EPS) continue;

      const candidate = {
        x: box.x,
        y: box.y,
        z: box.z,
        w: o.w,
        d: o.d,
        h: o.h,
        rotated: o.rotated,
        box,
      };

      if (candidate.x + candidate.w > truck.length_cm + EPS ||
          candidate.y + candidate.d > truck.width_cm + EPS ||
          candidate.z + candidate.h > truck.height_cm + EPS) {
        continue;
      }

      const cuboid = { x: candidate.x, y: candidate.y, z: candidate.z, w: candidate.w, d: candidate.d, h: candidate.h };
      let collides = false;
      for (const p of placements) {
        if (_intersects3D(cuboid, p)) { collides = true; break; }
      }
      if (collides) continue;

      const support = _evaluateSupport({ x: candidate.x, y: candidate.y, w: candidate.w, d: candidate.d }, candidate.z, item, placements, blockedColumns);
      if (!support.ok) continue;

      const contact = _contactWithContainer(truck, candidate) + support.contact;
      const enriched = {
        ...candidate,
        supportRatio: support.supportRatio,
        supportArea: support.supportArea,
        supporters: support.supporters,
        contact,
      };

      const key = _candidateKey(enriched, method);
      if (!best || _lexiLess(key, bestKey)) {
        best = enriched;
        bestKey = key;
      }
    }
  }

  return best;
}

function _splitFreeBox(f, p) {
  if (!_intersects3D(f, p)) return [f];

  const out = [];

  if (p.x > f.x + EPS) {
    out.push({ x: f.x, y: f.y, z: f.z, w: p.x - f.x, d: f.d, h: f.h });
  }
  if (p.x + p.w < f.x + f.w - EPS) {
    out.push({
      x: p.x + p.w,
      y: f.y,
      z: f.z,
      w: f.x + f.w - (p.x + p.w),
      d: f.d,
      h: f.h,
    });
  }

  const ix1 = Math.max(f.x, p.x);
  const ix2 = Math.min(f.x + f.w, p.x + p.w);
  if (ix2 > ix1 + EPS) {
    if (p.y > f.y + EPS) {
      out.push({ x: ix1, y: f.y, z: f.z, w: ix2 - ix1, d: p.y - f.y, h: f.h });
    }
    if (p.y + p.d < f.y + f.d - EPS) {
      out.push({
        x: ix1,
        y: p.y + p.d,
        z: f.z,
        w: ix2 - ix1,
        d: f.y + f.d - (p.y + p.d),
        h: f.h,
      });
    }
  }

  const iy1 = Math.max(f.y, p.y);
  const iy2 = Math.min(f.y + f.d, p.y + p.d);
  if (ix2 > ix1 + EPS && iy2 > iy1 + EPS) {
    if (p.z > f.z + EPS) {
      out.push({ x: ix1, y: iy1, z: f.z, w: ix2 - ix1, d: iy2 - iy1, h: p.z - f.z });
    }
    if (p.z + p.h < f.z + f.h - EPS) {
      out.push({
        x: ix1,
        y: iy1,
        z: p.z + p.h,
        w: ix2 - ix1,
        d: iy2 - iy1,
        h: f.z + f.h - (p.z + p.h),
      });
    }
  }

  return out.filter(b => b.w > 0.5 && b.d > 0.5 && b.h > 0.5);
}

function _pruneFreeBoxes(boxes) {
  const filtered = boxes.filter(b => b.w > 0.5 && b.d > 0.5 && b.h > 0.5);

  const unique = [];
  const seen = new Set();
  for (const b of filtered) {
    const key = `${b.x.toFixed(4)}|${b.y.toFixed(4)}|${b.z.toFixed(4)}|${b.w.toFixed(4)}|${b.d.toFixed(4)}|${b.h.toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(b);
    }
  }

  const keep = [];
  for (let i = 0; i < unique.length; i++) {
    let contained = false;
    for (let j = 0; j < unique.length; j++) {
      if (i === j) continue;
      if (_containsBox(unique[j], unique[i])) {
        contained = true;
        break;
      }
    }
    if (!contained) keep.push(unique[i]);
  }

  keep.sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y || a.w - b.w || a.d - b.d || a.h - b.h);
  return keep;
}

function _updateFreeBoxes(freeBoxes, placed) {
  const next = [];
  for (const f of freeBoxes) {
    const pieces = _splitFreeBox(f, placed);
    for (const p of pieces) next.push(p);
  }
  return _pruneFreeBoxes(next);
}

function _packSingleTruckCuboid(items, truck, method, allowRotation, lengthLimit) {
  const maxWeight = truck.max_weight_kg || Infinity;
  const effectiveLength = Math.max(1, Math.min(lengthLimit || truck.length_cm, truck.length_cm));
  const effectiveTruck = {
    ...truck,
    length_cm: effectiveLength,
  };

  let freeBoxes = [{
    x: 0,
    y: 0,
    z: 0,
    w: effectiveTruck.length_cm,
    d: effectiveTruck.width_cm,
    h: effectiveTruck.height_cm || 270,
  }];

  const placements = [];
  const blockedColumns = [];
  let currentWeight = 0;
  const remaining = [];

  for (const item of items) {
    const best = _findBestCandidate(item, freeBoxes, placements, blockedColumns, effectiveTruck, method, allowRotation, currentWeight, maxWeight);
    if (!best) {
      remaining.push(item);
      continue;
    }

    for (const s of best.supporters) {
      placements[s.index].remainingSupportKg -= s.shareKg;
    }

    const supportCap = _deriveSupportCapacityKg(item);
    const placed = {
      ...item,
      x: best.x,
      y: best.y,
      z: Number(best.z.toFixed(3)),
      w: best.w,
      d: best.d,
      h: best.h,
      placedWidth: best.w,
      placedHeight: best.d,
      rotated: best.rotated,
      supportRatio: best.supportRatio,
      supportArea: best.supportArea,
      maxTopLoadKg: supportCap,
      remainingSupportKg: supportCap,
      remainingPercent: 0,
    };

    placements.push(placed);
    currentWeight += item.weight || 0;

    if (item.stackable === false) {
      blockedColumns.push({
        x: placed.x,
        y: placed.y,
        w: placed.w,
        d: placed.d,
        zTop: placed.z + placed.h,
      });
    }

    freeBoxes = _updateFreeBoxes(freeBoxes, placed);
  }

  const maxX = placements.reduce((mx, p) => Math.max(mx, p.x + p.w), 0);
  const usedVolume = placements.reduce((s, p) => s + (p.w * p.d * p.h), 0);
  const truckVolume = Math.max(1, effectiveTruck.length_cm * effectiveTruck.width_cm * (effectiveTruck.height_cm || 270));
  const volumeOccupancy = usedVolume / truckVolume;

  const layers = new Set(placements.map(p => Number((p.z || 0).toFixed(3)))).size || 0;

  return {
    placements,
    remaining,
    maxX,
    floorMeters: maxX / 100,
    totalWeight: currentWeight,
    occupancy: volumeOccupancy,
    volumeOccupancy,
    layers,
    usedVolume,
    widthLimit: effectiveLength,
  };
}

function _optimizeTruckCuboidPlacement(items, truck, method, allowRotation) {
  let best = _packSingleTruckCuboid(items, truck, method, allowRotation, truck.length_cm);
  if (!best.placements || best.placements.length === 0) return best;

  const start = Math.max(1, Math.floor(best.maxX));
  const lowerBound = Math.max(100, Math.floor(start * 0.45));

  for (let limit = start - 10; limit >= lowerBound; limit -= 10) {
    const candidate = _packSingleTruckCuboid(items, truck, method, allowRotation, limit);
    if (_isBetterTruckCandidate(candidate, best)) best = candidate;
  }

  const fineStart = Math.max(lowerBound, Math.floor(best.maxX) - 20);
  const fineEnd = Math.max(lowerBound, Math.floor(best.maxX) - 1);
  for (let limit = fineEnd; limit >= fineStart; limit--) {
    const candidate = _packSingleTruckCuboid(items, truck, method, allowRotation, limit);
    if (_isBetterTruckCandidate(candidate, best)) best = candidate;
  }

  return best;
}

function _packMultiTruckCuboid(items, truck, method, allowRotation, maxTrucks) {
  const trucks = [];
  let remaining = [...items];
  let totalPlaced = 0;
  let globalIndex = 0;

  while (remaining.length > 0 && trucks.length < maxTrucks) {
    const t = _optimizeTruckCuboidPlacement(remaining, truck, method, allowRotation);
    if (!t.placements || t.placements.length === 0) break;

    const placements = t.placements.map((p, idx) => {
      const g = globalIndex + idx;
      return {
        ...p,
        globalIndex: g,
        num: g + 1,
        placedWidthMm: p.placedWidth * 10,
        placedHeightMm: p.placedHeight * 10,
      };
    });

    globalIndex += placements.length;
    totalPlaced += placements.length;

    trucks.push({
      index: trucks.length,
      placements,
      maxX: t.maxX,
      floorMeters: t.floorMeters,
      totalWeight: t.totalWeight,
      occupancy: t.occupancy,
      volumeOccupancy: t.volumeOccupancy,
      layers: t.layers,
      usedVolume: t.usedVolume,
      widthLimit: t.widthLimit,
    });

    remaining = t.remaining;
  }

  return { trucks, totalPlaced, unplaced: remaining };
}

function _generateLogCuboid(trucks, unplaced) {
  const lines = [];
  const totalPlaced = trucks.reduce((s, t) => s + t.placements.length, 0);

  for (const t of trucks) {
    if (trucks.length > 1) {
      lines.push(`=== Camion ${t.index + 1} ===`);
      lines.push('');
    }

    lines.push(`Mode 3D cuboid: ${t.layers} couche(s), occupation volume ${(t.volumeOccupancy * 100).toFixed(2)}%`);
    lines.push(`Metres plancher optimises: ${(t.maxX / 100).toFixed(2)} m`);
    lines.push('');

    for (const p of t.placements) {
      const ph = Math.round((p.height || 1500) / 10);
      lines.push(
        `Place 3D Cuboid : Ref ${p.ref} Num ${p.globalIndex} (x,y,z)=(${p.x},${p.y},${p.z}), [${p.placedWidth}X${p.placedHeight}X${ph}] Support ${(p.supportRatio * 100).toFixed(1)}%`
      );
      lines.push('');
    }

    lines.push('Placement termine');
    lines.push('');
    lines.push(`Mètres plancher : ${(t.maxX / 100).toFixed(6)} m`);
    lines.push('');
    lines.push(`Nombre de palettes placees : ${t.placements.length}`);
    lines.push('');
  }

  if (unplaced.length > 0) {
    lines.push('=== Palettes non placees ===');
    for (const p of unplaced) {
      const ph = Math.round((p.height || 1500) / 10);
      lines.push(`Placement 3D cuboid impossible : ${p.length}X${p.width}X${ph}`);
    }
    lines.push('');
  }

  lines.push('=== Resume ===');
  lines.push(`Total palettes placees : ${totalPlaced}/${totalPlaced + unplaced.length}`);
  lines.push(`Camions utilises : ${trucks.length}`);
  lines.push(`Poids total : ${trucks.reduce((s, t) => s + t.totalWeight, 0)} kg`);

  return lines;
}

function solve3DCuboid(params) {
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
    (a, b) => (b.length * b.width * ((b.height || 1500) / 10)) - (a.length * a.width * ((a.height || 1500) / 10)),
    (a, b) => (b.length * b.width) - (a.length * a.width),
    (a, b) => ((b.height || 1500) - (a.height || 1500)),
    (a, b) => (b.weight || 0) - (a.weight || 0),
    (a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width),
    (a, b) => Math.min(b.length, b.width) - Math.min(a.length, a.width),
  ];

  let bestResult = null;
  let bestScore = { placed: 0, trucks: Infinity, sumFloor: Infinity };
  let bestHeuristic = heuristicsToRun[0] || 'BestAreaFit';

  for (const h of heuristicsToRun) {
    for (const sortFn of sortStrategies) {
      const ordered = [...palettes].sort(sortFn);
      const result = _packMultiTruckCuboid(ordered, truck, h, allowRotation, maxTrucks);
      const score = {
        placed: result.totalPlaced,
        trucks: result.trucks.length,
        sumFloor: result.trucks.reduce((s, t) => s + t.maxX, 0),
      };

      if (!bestResult || _isBetterGlobalScore(score, bestScore)) {
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
  bestResult.log = _generateLogCuboid(bestResult.trucks, bestResult.unplaced || []);

  return bestResult;
}

module.exports = { solve3DCuboid };
