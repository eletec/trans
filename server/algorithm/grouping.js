/**
 * Grouping module — groups identical palettes for contiguous placement
 */

/**
 * Groups palettes by their dimensions (length x width).
 * Returns an array of groups sorted by area descending.
 * Each group: { key, length, width, height, weight, color, ref, items: [...] }
 */
function groupPalettes(palettes) {
  const groups = new Map();

  for (const p of palettes) {
    // Normalize: always store with larger dimension first
    const l = Math.max(p.length, p.width);
    const w = Math.min(p.length, p.width);
    const key = `${l}x${w}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        length: l,
        width: w,
        height: p.height || 150,
        weight: p.weight || 0,
        color: p.color || '#cccccc',
        ref: p.ref || '',
        items: []
      });
    }
    groups.get(key).items.push(p);
  }

  // Sort groups by area descending (largest first)
  const sorted = Array.from(groups.values());
  sorted.sort((a, b) => (b.length * b.width) - (a.length * a.width));
  return sorted;
}

/**
 * Try to place a contiguous block of identical palettes.
 * Attempts to fit them in a grid pattern (rows x cols) within the bin.
 * Returns placed positions array or null if block placement fails.
 */
function tryPlaceContiguousBlock(bin, group, binWidth, binHeight) {
  const count = group.items.length;
  const l = group.length;
  const w = group.width;

  // Try different grid arrangements
  const arrangements = [];

  // Try both orientations
  for (const [pw, ph] of [[l, w], [w, l]]) {
    // How many fit in each direction?
    const maxCols = Math.floor(binWidth / pw);
    const maxRows = Math.floor(binHeight / ph);

    for (let cols = Math.min(maxCols, count); cols >= 1; cols--) {
      const rows = Math.min(Math.ceil(count / cols), maxRows);
      if (rows * cols >= count || rows * cols > 0) {
        arrangements.push({ pw, ph, cols, rows, total: Math.min(rows * cols, count) });
      }
    }
  }

  // Sort by total placed descending, then by compactness
  arrangements.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    // Prefer more compact (smaller bounding box)
    const areaA = a.cols * a.pw * a.rows * a.ph;
    const areaB = b.cols * b.pw * b.rows * b.ph;
    return areaA - areaB;
  });

  return arrangements.length > 0 ? arrangements[0] : null;
}

module.exports = { groupPalettes, tryPlaceContiguousBlock };
