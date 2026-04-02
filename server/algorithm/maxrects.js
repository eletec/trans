/**
 * MaxRects Bin Packing Algorithm
 * Ported from Jukka Jylänki's C++ implementation (Public Domain)
 * Enhanced with contiguous grouping support
 */

class MaxRectsBinPack {
  constructor(width = 0, height = 0) {
    this.binWidth = 0;
    this.binHeight = 0;
    this.usedRectangles = [];
    this.freeRectangles = [];
    if (width > 0 && height > 0) this.init(width, height);
  }

  init(width, height) {
    this.binWidth = width;
    this.binHeight = height;
    this.usedRectangles = [];
    this.freeRectangles = [{ x: 0, y: 0, width, height }];
  }

  /**
   * Insert a single rectangle. Returns placed rect or null.
   */
  insert(width, height, method, allowRotation = true) {
    let newNode;
    let score1 = Infinity, score2 = Infinity;
    const scores = { s1: Infinity, s2: Infinity };

    switch (method) {
      case 'BestShortSideFit':
        newNode = this._findBestShortSideFit(width, height, scores, allowRotation);
        break;
      case 'BestLongSideFit':
        newNode = this._findBestLongSideFit(width, height, scores, allowRotation);
        break;
      case 'BestAreaFit':
        newNode = this._findBestAreaFit(width, height, scores, allowRotation);
        break;
      case 'BottomLeftRule':
        newNode = this._findBottomLeft(width, height, scores, allowRotation);
        break;
      case 'ContactPointRule':
        newNode = this._findContactPoint(width, height, scores, allowRotation);
        break;
      default:
        newNode = this._findBestShortSideFit(width, height, scores, allowRotation);
    }

    if (!newNode || newNode.height === 0) return null;

    this._placeRect(newNode);
    return newNode;
  }

  /**
   * Insert at a specific position (for drag & drop / manual placement)
   */
  insertAt(x, y, width, height) {
    const rect = { x, y, width, height };
    // Verify it fits within the bin
    if (x < 0 || y < 0 || x + width > this.binWidth || y + height > this.binHeight) {
      return null;
    }
    // Verify no overlap with used rectangles
    for (const used of this.usedRectangles) {
      if (!this._isDisjoint(rect, used)) return null;
    }
    this._placeRect(rect);
    return rect;
  }

  occupancy() {
    let usedArea = 0;
    for (const r of this.usedRectangles) {
      usedArea += r.width * r.height;
    }
    return usedArea / (this.binWidth * this.binHeight);
  }

  // --- Private methods ---

  _placeRect(node) {
    let i = 0;
    while (i < this.freeRectangles.length) {
      if (this._splitFreeNode(this.freeRectangles[i], node)) {
        this.freeRectangles.splice(i, 1);
      } else {
        i++;
      }
    }
    this._pruneFreeList();
    this.usedRectangles.push(node);
  }

  _splitFreeNode(freeNode, usedNode) {
    // Test SAT overlap
    if (usedNode.x >= freeNode.x + freeNode.width || usedNode.x + usedNode.width <= freeNode.x ||
        usedNode.y >= freeNode.y + freeNode.height || usedNode.y + usedNode.height <= freeNode.y) {
      return false;
    }

    if (usedNode.x < freeNode.x + freeNode.width && usedNode.x + usedNode.width > freeNode.x) {
      // Top
      if (usedNode.y > freeNode.y && usedNode.y < freeNode.y + freeNode.height) {
        const newNode = { ...freeNode, height: usedNode.y - freeNode.y };
        this.freeRectangles.push(newNode);
      }
      // Bottom
      if (usedNode.y + usedNode.height < freeNode.y + freeNode.height) {
        const newNode = {
          ...freeNode,
          y: usedNode.y + usedNode.height,
          height: freeNode.y + freeNode.height - (usedNode.y + usedNode.height)
        };
        this.freeRectangles.push(newNode);
      }
    }

    if (usedNode.y < freeNode.y + freeNode.height && usedNode.y + usedNode.height > freeNode.y) {
      // Left
      if (usedNode.x > freeNode.x && usedNode.x < freeNode.x + freeNode.width) {
        const newNode = { ...freeNode, width: usedNode.x - freeNode.x };
        this.freeRectangles.push(newNode);
      }
      // Right
      if (usedNode.x + usedNode.width < freeNode.x + freeNode.width) {
        const newNode = {
          ...freeNode,
          x: usedNode.x + usedNode.width,
          width: freeNode.x + freeNode.width - (usedNode.x + usedNode.width)
        };
        this.freeRectangles.push(newNode);
      }
    }

    return true;
  }

  _pruneFreeList() {
    for (let i = 0; i < this.freeRectangles.length; i++) {
      for (let j = i + 1; j < this.freeRectangles.length; j++) {
        if (this._isContainedIn(this.freeRectangles[i], this.freeRectangles[j])) {
          this.freeRectangles.splice(i, 1);
          i--;
          break;
        }
        if (this._isContainedIn(this.freeRectangles[j], this.freeRectangles[i])) {
          this.freeRectangles.splice(j, 1);
          j--;
        }
      }
    }
  }

  _isContainedIn(a, b) {
    return a.x >= b.x && a.y >= b.y &&
           a.x + a.width <= b.x + b.width &&
           a.y + a.height <= b.y + b.height;
  }

  _isDisjoint(a, b) {
    return a.x + a.width <= b.x || b.x + b.width <= a.x ||
           a.y + a.height <= b.y || b.y + b.height <= a.y;
  }

  _commonInterval(i1s, i1e, i2s, i2e) {
    if (i1e < i2s || i2e < i1s) return 0;
    return Math.min(i1e, i2e) - Math.max(i1s, i2s);
  }

  // --- Heuristics ---

  _findBottomLeft(width, height, scores, allowRotation) {
    let bestNode = { x: 0, y: 0, width: 0, height: 0 };
    let bestY = Infinity, bestX = Infinity;

    for (const fr of this.freeRectangles) {
      if (fr.width >= width && fr.height >= height) {
        const topY = fr.y + height;
        if (topY < bestY || (topY === bestY && fr.x < bestX)) {
          bestNode = { x: fr.x, y: fr.y, width, height };
          bestY = topY;
          bestX = fr.x;
        }
      }
      if (allowRotation && fr.width >= height && fr.height >= width) {
        const topY = fr.y + width;
        if (topY < bestY || (topY === bestY && fr.x < bestX)) {
          bestNode = { x: fr.x, y: fr.y, width: height, height: width };
          bestY = topY;
          bestX = fr.x;
        }
      }
    }
    scores.s1 = bestY;
    scores.s2 = bestX;
    return bestNode;
  }

  _findBestShortSideFit(width, height, scores, allowRotation) {
    let bestNode = { x: 0, y: 0, width: 0, height: 0 };
    let bestShort = Infinity, bestLong = Infinity;

    for (const fr of this.freeRectangles) {
      if (fr.width >= width && fr.height >= height) {
        const leftH = Math.abs(fr.width - width);
        const leftV = Math.abs(fr.height - height);
        const shortFit = Math.min(leftH, leftV);
        const longFit = Math.max(leftH, leftV);
        if (shortFit < bestShort || (shortFit === bestShort && longFit < bestLong)) {
          bestNode = { x: fr.x, y: fr.y, width, height };
          bestShort = shortFit;
          bestLong = longFit;
        }
      }
      if (allowRotation && fr.width >= height && fr.height >= width) {
        const leftH = Math.abs(fr.width - height);
        const leftV = Math.abs(fr.height - width);
        const shortFit = Math.min(leftH, leftV);
        const longFit = Math.max(leftH, leftV);
        if (shortFit < bestShort || (shortFit === bestShort && longFit < bestLong)) {
          bestNode = { x: fr.x, y: fr.y, width: height, height: width };
          bestShort = shortFit;
          bestLong = longFit;
        }
      }
    }
    scores.s1 = bestShort;
    scores.s2 = bestLong;
    return bestNode;
  }

  _findBestLongSideFit(width, height, scores, allowRotation) {
    let bestNode = { x: 0, y: 0, width: 0, height: 0 };
    let bestShort = Infinity, bestLong = Infinity;

    for (const fr of this.freeRectangles) {
      if (fr.width >= width && fr.height >= height) {
        const leftH = Math.abs(fr.width - width);
        const leftV = Math.abs(fr.height - height);
        const shortFit = Math.min(leftH, leftV);
        const longFit = Math.max(leftH, leftV);
        if (longFit < bestLong || (longFit === bestLong && shortFit < bestShort)) {
          bestNode = { x: fr.x, y: fr.y, width, height };
          bestShort = shortFit;
          bestLong = longFit;
        }
      }
      if (allowRotation && fr.width >= height && fr.height >= width) {
        const leftH = Math.abs(fr.width - height);
        const leftV = Math.abs(fr.height - width);
        const shortFit = Math.min(leftH, leftV);
        const longFit = Math.max(leftH, leftV);
        if (longFit < bestLong || (longFit === bestLong && shortFit < bestShort)) {
          bestNode = { x: fr.x, y: fr.y, width: height, height: width };
          bestShort = shortFit;
          bestLong = longFit;
        }
      }
    }
    scores.s1 = bestLong;
    scores.s2 = bestShort;
    return bestNode;
  }

  _findBestAreaFit(width, height, scores, allowRotation) {
    let bestNode = { x: 0, y: 0, width: 0, height: 0 };
    let bestArea = Infinity, bestShort = Infinity;

    for (const fr of this.freeRectangles) {
      const areaFit = fr.width * fr.height - width * height;

      if (fr.width >= width && fr.height >= height) {
        const leftH = Math.abs(fr.width - width);
        const leftV = Math.abs(fr.height - height);
        const shortFit = Math.min(leftH, leftV);
        if (areaFit < bestArea || (areaFit === bestArea && shortFit < bestShort)) {
          bestNode = { x: fr.x, y: fr.y, width, height };
          bestShort = shortFit;
          bestArea = areaFit;
        }
      }
      if (allowRotation && fr.width >= height && fr.height >= width) {
        const leftH = Math.abs(fr.width - height);
        const leftV = Math.abs(fr.height - width);
        const shortFit = Math.min(leftH, leftV);
        if (areaFit < bestArea || (areaFit === bestArea && shortFit < bestShort)) {
          bestNode = { x: fr.x, y: fr.y, width: height, height: width };
          bestShort = shortFit;
          bestArea = areaFit;
        }
      }
    }
    scores.s1 = bestArea;
    scores.s2 = bestShort;
    return bestNode;
  }

  _findContactPoint(width, height, scores, allowRotation) {
    let bestNode = { x: 0, y: 0, width: 0, height: 0 };
    let bestScore = -1;

    for (const fr of this.freeRectangles) {
      if (fr.width >= width && fr.height >= height) {
        const score = this._contactScore(fr.x, fr.y, width, height);
        if (score > bestScore) {
          bestNode = { x: fr.x, y: fr.y, width, height };
          bestScore = score;
        }
      }
      if (allowRotation && fr.width >= height && fr.height >= width) {
        const score = this._contactScore(fr.x, fr.y, height, width);
        if (score > bestScore) {
          bestNode = { x: fr.x, y: fr.y, width: height, height: width };
          bestScore = score;
        }
      }
    }
    scores.s1 = -bestScore;
    scores.s2 = 0;
    return bestNode;
  }

  _contactScore(x, y, width, height) {
    let score = 0;
    if (x === 0 || x + width === this.binWidth) score += height;
    if (y === 0 || y + height === this.binHeight) score += width;
    for (const r of this.usedRectangles) {
      if (r.x === x + width || r.x + r.width === x)
        score += this._commonInterval(r.y, r.y + r.height, y, y + height);
      if (r.y === y + height || r.y + r.height === y)
        score += this._commonInterval(r.x, r.x + r.width, x, x + width);
    }
    return score;
  }
}

module.exports = MaxRectsBinPack;
